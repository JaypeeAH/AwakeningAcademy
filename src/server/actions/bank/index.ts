import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { requireCourseTeacher } from '@/server/actions/courses/access'
import { asObject } from '@/server/actions/progression/mappers'
import { getQuestionIssues } from '@/utils/activityValidation'
import { DataError, NotFoundError } from '@/@types/errors'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type {
    BankQuery,
    BankQuestion,
    SaveBankQuestionInput,
    UpdateBankQuestionInput,
} from '@/@types/bank/BankQuestion'
import type { QuestionKind } from '@/@types/activities/Question'

type BankRow = Tables<'bank_questions'> & { author?: { display_name: string } | null }

const strings = (value: Json | undefined) =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

const mapBankQuestion = (row: BankRow): BankQuestion => {
    const key = asObject(row.answer_key)
    return {
        id: row.id,
        courseId: row.course_id,
        kind: row.kind,
        prompt: row.prompt,
        points: row.points,
        options: (Array.isArray(row.options) ? row.options : []).map((o) => {
            const option = asObject(o)
            return { id: String(option.id ?? ''), label: String(option.label ?? '') }
        }),
        key: {
            correctOptionIds: strings(key.correctOptionIds),
            acceptedAnswers: strings(key.acceptedAnswers),
            caseSensitive: key.caseSensitive === true,
            explanation: typeof key.explanation === 'string' ? key.explanation : '',
            rubric: typeof key.rubric === 'string' ? key.rubric : '',
        },
        tags: row.tags,
        objectives: row.objectives,
        difficulty: row.difficulty,
        createdByName: row.author?.display_name ?? null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    }
}

const BANK_SELECT = '*, author:profiles!bank_questions_created_by_fkey(display_name)'

/** A course's question bank (teachers of the course only), newest first, with optional filters */
export async function getBankQuestions(user: SessionUser, courseId: string, query: BankQuery): Promise<BankQuestion[]> {
    await requireCourseTeacher(user, courseId)
    let request = supabaseAdmin()
        .from('bank_questions')
        .select(BANK_SELECT)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(500)
    if (query.tag) request = request.contains('tags', [query.tag])
    if (query.kind) request = request.eq('kind', query.kind as QuestionKind)
    if (query.difficulty) request = request.eq('difficulty', query.difficulty)
    if (query.q) {
        const term = query.q.replace(/[%_,()\\]/g, ' ').trim()
        if (term) request = request.ilike('prompt', `%${term}%`)
    }
    return (unwrap(await request, 'load the question bank') as unknown as BankRow[]).map(mapBankQuestion)
}

/**
 * Saves a question to the bank (a copy — later edits to the activity question don't change it). Option
 * ids are regenerated so the bank never shares ids with a live question.
 */
export async function saveBankQuestion(
    user: SessionUser,
    courseId: string,
    input: SaveBankQuestionInput,
): Promise<BankQuestion> {
    await requireCourseTeacher(user, courseId)
    const { question } = input
    const issues = getQuestionIssues({ ...question, id: randomUUID() }, 0)
    if (issues.length) throw new DataError(issues[0].message.replace('Question 1', 'This question'), 'INVALID_QUESTION')

    const idMap = new Map(question.options.map((o) => [o.id, randomUUID()]))
    const row = unwrap(
        await supabaseAdmin()
            .from('bank_questions')
            .insert({
                course_id: courseId,
                kind: question.kind as QuestionKind,
                prompt: question.prompt,
                points: question.points,
                options: question.options.map((o) => ({ id: idMap.get(o.id), label: o.label })) as unknown as Json,
                answer_key: {
                    ...question.key,
                    correctOptionIds: question.key.correctOptionIds.map((id) => idMap.get(id)).filter(Boolean),
                } as unknown as Json,
                tags: input.tags,
                objectives: input.objectives,
                difficulty: input.difficulty,
                created_by: user.id,
            })
            .select(BANK_SELECT)
            .single(),
        'save the question to the bank',
    )
    return mapBankQuestion(row as unknown as BankRow)
}

async function requireBankQuestion(user: SessionUser, bankQuestionId: string) {
    const row = unwrapMaybe(
        await supabaseAdmin().from('bank_questions').select('id, course_id').eq('id', bankQuestionId).maybeSingle(),
        'find the question',
    )
    if (!row) throw new NotFoundError('That bank question doesn’t exist.', 'BANK_QUESTION_NOT_FOUND')
    await requireCourseTeacher(user, row.course_id)
    return row
}

export async function updateBankQuestion(
    user: SessionUser,
    bankQuestionId: string,
    input: UpdateBankQuestionInput,
): Promise<BankQuestion> {
    await requireBankQuestion(user, bankQuestionId)
    const row = unwrap(
        await supabaseAdmin()
            .from('bank_questions')
            .update({
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.objectives !== undefined && { objectives: input.objectives }),
                ...(input.difficulty !== undefined && { difficulty: input.difficulty }),
            })
            .eq('id', bankQuestionId)
            .select(BANK_SELECT)
            .single(),
        'update the question',
    )
    return mapBankQuestion(row as unknown as BankRow)
}

/** Removing a bank question never affects activities that already copied it */
export async function deleteBankQuestion(user: SessionUser, bankQuestionId: string) {
    await requireBankQuestion(user, bankQuestionId)
    check(await supabaseAdmin().from('bank_questions').delete().eq('id', bankQuestionId), 'delete the question')
}
