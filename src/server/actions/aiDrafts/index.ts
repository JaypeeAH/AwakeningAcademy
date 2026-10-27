import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { requireActivityTeacher } from '@/server/actions/activities'
import { getDraftProvider } from '@/server/ai'
import { enforceRateLimit, peekRemaining } from '@/server/security/rateLimit'
import { aiDraftsToQuestions, markdownToSourceText } from '@/utils/aiDrafts'
import { ConflictError, DataError, NotFoundError, ServiceUnavailableError } from '@/@types/errors'
import { MAX_DRAFT_SOURCE_CHARS, type AiStatus, type DraftQuestionsInput } from '@/@types/ai/QuestionDrafts'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'
import type { SessionUser } from '@/@types/auth/SessionUser'

/*
 * AI question drafts for the Quest Builder. Drafts come back to the editor unsaved and flagged
 * `aiDraft`: nothing is saved or published without the teacher, and publishing is blocked until each
 * draft is reviewed. Every request is rate-limited per teacher and logged (ai_draft_requests).
 */

export async function getAiStatus(user: SessionUser): Promise<AiStatus> {
    const provider = getDraftProvider()
    return {
        enabled: !!provider,
        provider: provider?.name ?? null,
        model: provider?.model ?? null,
        remaining: provider ? await peekRemaining('aiDraftsPerHour', user.id) : null,
    }
}

async function logRequest(row: {
    teacherId: string
    courseId: string
    activityId: string
    provider: string
    model: string
    requested: number
    drafted: number
    inputTokens: number | null
    outputTokens: number | null
    status: 'ok' | 'error' | 'refused' | 'invalid'
    error?: string
}) {
    const { error } = await supabaseAdmin()
        .from('ai_draft_requests')
        .insert({
            teacher_id: row.teacherId,
            course_id: row.courseId,
            activity_id: row.activityId,
            provider: row.provider,
            model: row.model,
            requested_count: row.requested,
            drafted_count: row.drafted,
            input_tokens: row.inputTokens,
            output_tokens: row.outputTokens,
            status: row.status,
            error: row.error?.slice(0, 500) ?? null,
        })
    if (error) console.error('[ai] could not log the request', error)
}

export async function draftQuestions(
    user: SessionUser,
    activityId: string,
    input: DraftQuestionsInput,
): Promise<{ questions: QuestionInput[]; requested: number }> {
    const { activity, course } = await requireActivityTeacher(user, activityId)
    const provider = getDraftProvider()
    if (!provider) {
        throw new ServiceUnavailableError(
            'AI drafting isn’t set up for this school yet. An administrator can turn it on by adding an AI key to the server settings — you can still write questions yourself.',
            'AI_NOT_CONFIGURED',
        )
    }

    let source = input.text.trim()
    if (input.lessonId) {
        const lesson = unwrapMaybe(
            await supabaseAdmin()
                .from('activities')
                .select('course_id, kind, body, title')
                .eq('id', input.lessonId)
                .maybeSingle(),
            'load the lesson',
        )
        if (!lesson || lesson.course_id !== activity.course_id || lesson.kind !== 'lesson') {
            throw new NotFoundError('Choose a lesson from this course.', 'LESSON_NOT_FOUND')
        }
        source = `# ${lesson.title}\n\n${markdownToSourceText(lesson.body)}`
    }
    if (source.length < 40) throw new DataError('There isn’t enough text to draft questions from.', 'SOURCE_TOO_SHORT')
    if (source.length > MAX_DRAFT_SOURCE_CHARS) {
        throw new DataError(
            'That lesson is too long to draft from in one go. Paste the section you want questions about instead.',
            'SOURCE_TOO_LONG',
        )
    }

    await enforceRateLimit('aiDraftsPerHour', user.id)
    await enforceRateLimit('aiDraftsPerDay', user.id)

    const subject = unwrapMaybe(
        await supabaseAdmin().from('subjects').select('name').eq('id', course.subject_id).maybeSingle(),
        'load the subject',
    )
    const base = {
        teacherId: user.id,
        courseId: activity.course_id,
        activityId,
        provider: provider.name,
        model: provider.model,
        requested: input.count,
    }

    let response
    try {
        response = await provider.draft({
            sourceText: source,
            activityTitle: activity.title,
            subjectName: subject?.name ?? '',
            count: input.count,
            kinds: input.kinds,
            difficulty: input.difficulty,
            objectives: input.objectives,
        })
    } catch (error) {
        console.error('[ai] drafting failed', error)
        await logRequest({
            ...base,
            drafted: 0,
            inputTokens: null,
            outputTokens: null,
            status: 'error',
            error: String(error),
        })
        throw new ServiceUnavailableError(
            'The AI couldn’t draft questions just now. Please try again in a minute.',
            'AI_UNAVAILABLE',
        )
    }

    const usage = { inputTokens: response.usage.inputTokens, outputTokens: response.usage.outputTokens }
    if (response.refused) {
        await logRequest({ ...base, ...usage, drafted: 0, status: 'refused' })
        throw new ConflictError(
            'The AI declined to draft questions from that text. Try a different section of the lesson.',
            'AI_REFUSED',
        )
    }

    const questions = aiDraftsToQuestions(response.questions, input.objectives, input.count, randomUUID)
    await logRequest({ ...base, ...usage, drafted: questions.length, status: questions.length ? 'ok' : 'invalid' })
    if (!questions.length) {
        throw new DataError('The AI’s drafts weren’t usable this time. Please try again.', 'AI_DRAFTS_INVALID')
    }
    await recordAudit(user.id, 'ai.drafted', 'activity', activityId, {
        requested: input.count,
        drafted: questions.length,
        model: provider.model,
    })
    return { questions, requested: input.count }
}
