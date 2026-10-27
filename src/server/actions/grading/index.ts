import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { getProgressionSettings, getXpRules } from '@/server/actions/progression'
import { parseAppliedAwards, parseSnapshot, asObject } from '@/server/actions/progression/mappers'
import { requireActivityTeacher } from '@/server/actions/activities'
import { finalizeExpiredAttempts, loadQuestions } from '@/server/actions/attempts/finalize'
import {
    mapAttempt,
    mapAttemptFile,
    mapKeyedQuestion,
    mapQuestion,
    mapResponse,
} from '@/server/actions/activities/mappers'
import { applyManualGrades, GradeError } from '@/utils/manualGrading'
import { computeAttemptAwards, summarizeRewards } from '@/utils/progression'
import { overdriveAwards } from '@/server/actions/skills'
import { afterLearning } from '@/server/actions/progression/afterLearning'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import type { Json } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type {
    AttemptForGrading,
    GradeAttemptInput,
    GradeAttemptResult,
    GradingQueue,
    GradingQueueItem,
} from '@/@types/grading/Grading'

/** Courses the user grades for (all of them for administrators) */
async function gradableCourseIds(user: SessionUser): Promise<string[] | 'all'> {
    if (user.role === 'admin') return 'all'
    const rows = unwrap(
        await supabaseAdmin().from('course_teachers').select('course_id').eq('teacher_id', user.id),
        'load your courses',
    )
    return rows.map((r) => r.course_id)
}

const QUEUE_SELECT =
    'id, attempt_no, status, submitted_at, graded_at, percent, student:profiles!attempts_student_id_fkey(id, display_name), activity:activities!inner(id, title, kind, due_at, course_id, course:courses(title)), responses:attempt_responses(outcome)'

/** Work waiting for the teacher (oldest first) and recently graded work (to revisit / re-grade) */
export async function getGradingQueue(user: SessionUser): Promise<GradingQueue> {
    const courses = await gradableCourseIds(user)
    if (courses !== 'all' && !courses.length) return { pending: [], recent: [] }
    await finalizeExpiredAttempts({})

    const base = () => {
        const query = supabaseAdmin().from('attempts').select(QUEUE_SELECT)
        return courses === 'all' ? query : query.in('activity.course_id', courses)
    }
    const [pending, recent] = await Promise.all([
        base().eq('status', 'pending_review').order('submitted_at', { ascending: true }).limit(200),
        base().eq('status', 'graded').not('graded_by', 'is', null).order('graded_at', { ascending: false }).limit(25),
    ])

    const map = (row: (typeof pendingRows)[number]): GradingQueueItem => ({
        attemptId: row.id,
        attemptNo: row.attempt_no,
        activityId: row.activity.id,
        activityTitle: row.activity.title,
        activityKind: row.activity.kind,
        courseId: row.activity.course_id,
        courseTitle: row.activity.course?.title ?? '',
        studentId: row.student?.id ?? '',
        studentName: row.student?.display_name ?? 'Student',
        submittedAt: row.submitted_at ? new Date(row.submitted_at) : null,
        dueAt: row.activity.due_at ? new Date(row.activity.due_at) : null,
        pendingCount: row.responses.filter((r) => r.outcome === 'pending_review').length,
        status: row.status === 'graded' ? 'graded' : 'pending_review',
        percent: row.percent === null ? null : Number(row.percent),
    })
    const pendingRows = unwrap(pending, 'load the grading queue')
    return { pending: pendingRows.map(map), recent: unwrap(recent, 'load recent grades').map(map) }
}

async function requireGradableAttempt(user: SessionUser, attemptId: string) {
    const attempt = unwrapMaybe(
        await supabaseAdmin().from('attempts').select('*').eq('id', attemptId).maybeSingle(),
        'load the attempt',
    )
    if (!attempt) throw new NotFoundError('That attempt doesn’t exist.', 'ATTEMPT_NOT_FOUND')
    const { activity, course } = await requireActivityTeacher(user, attempt.activity_id)
    if (attempt.status === 'in_progress') {
        throw new ConflictError('The student hasn’t handed this in yet.', 'ATTEMPT_IN_PROGRESS')
    }
    return { attempt, activity, course }
}

/** One attempt for the grader: every answer with the key and rubric, uploaded files and existing marks */
export async function getAttemptForGrading(user: SessionUser, attemptId: string): Promise<AttemptForGrading> {
    const { attempt, activity, course } = await requireGradableAttempt(user, attemptId)
    const db = supabaseAdmin()
    const [questions, responses, files, student] = await Promise.all([
        loadQuestions(activity.id, true),
        db.from('attempt_responses').select('*').eq('attempt_id', attemptId),
        db.from('attempt_files').select('*').eq('attempt_id', attemptId).order('created_at'),
        db.from('profiles').select('id, display_name').eq('id', attempt.student_id).single(),
    ])
    const responseRows = unwrap(responses, 'load the answers')
    const fileRows = unwrap(files, 'load uploaded files').map(mapAttemptFile)
    const answered = questions.filter((q) => responseRows.some((r) => r.question_id === q.id))
    const studentRow = unwrap(student, 'load the student')

    return {
        attempt: mapAttempt(attempt),
        activity: {
            id: activity.id,
            title: activity.title,
            kind: activity.kind,
            passingScore: activity.passing_score,
            dueAt: activity.due_at ? new Date(activity.due_at) : null,
            courseId: course.id,
            courseTitle: course.title,
        },
        student: { id: studentRow.id, displayName: studentRow.display_name },
        questions: (answered.length ? answered : questions).map((q) => {
            const response = responseRows.find((r) => r.question_id === q.id)
            const key = mapKeyedQuestion(q).key
            return {
                question: mapQuestion(q),
                response: response ? mapResponse(response) : null,
                key: {
                    correctOptionIds: key.correctOptionIds,
                    acceptedAnswers: key.acceptedAnswers,
                    explanation: key.explanation,
                    rubric: key.rubric,
                },
                files: fileRows.filter((f) => f.questionId === q.id),
            }
        }),
    }
}

/**
 * Records a teacher's marks. Works for first grading and re-grading: totals are re-derived from every
 * answer, and rewards use the same idempotency keys as auto-graded work, so a re-grade can change the
 * score but never pays XP twice. While answers are still unmarked the attempt stays "awaiting review".
 */
export async function gradeAttempt(
    user: SessionUser,
    attemptId: string,
    input: GradeAttemptInput,
): Promise<GradeAttemptResult> {
    const { attempt, activity } = await requireGradableAttempt(user, attemptId)
    const db = supabaseAdmin()
    const [questions, responses] = await Promise.all([
        db.from('questions').select('id, points').eq('activity_id', activity.id),
        db.from('attempt_responses').select('*').eq('attempt_id', attemptId),
    ])

    let applied
    try {
        applied = applyManualGrades({
            questions: unwrap(questions, 'load questions'),
            responses: unwrap(responses, 'load the answers').map(mapResponse),
            grades: input.grades,
            passingScore: activity.passing_score,
        })
    } catch (error) {
        if (error instanceof GradeError) throw new DataError(error.message, 'INVALID_GRADE')
        throw error
    }

    const [rules, settings] = await Promise.all([getXpRules(), getProgressionSettings()])
    const awards =
        applied.pending > 0
            ? []
            : [
                  ...computeAttemptAwards({
                      activity: {
                          id: activity.id,
                          kind: activity.kind,
                          title: activity.title,
                          xpReward: activity.xp_reward,
                          xpRepeatable: activity.xp_repeatable,
                      },
                      studentId: attempt.student_id,
                      attemptId,
                      percent: applied.percent,
                      passed: applied.passed,
                      rules,
                      settings,
                  }),
                  ...(applied.passed ? await overdriveAwards(activity, attempt.student_id, rules) : []),
              ]

    const result = await db.rpc('grade_attempt', {
        p_attempt_id: attemptId,
        p_grader_id: user.id,
        p_grades: input.grades as unknown as Json,
        p_feedback: input.feedback,
        p_score: applied.score,
        p_max_score: applied.maxScore,
        p_percent: applied.percent,
        p_passed: applied.passed,
        p_awards: awards as unknown as Json,
    })
    if (result.error) throw toAppError(result.error, 'save the grades')
    const o = asObject(result.data)
    const status = o.status === 'graded' ? 'graded' : 'pending_review'
    // The student may have completed a secret sequence or score milestone (they're notified)
    if (status === 'graded') await afterLearning(attempt.student_id, { learned: false })
    return {
        status,
        percent: applied.percent,
        passed: applied.passed,
        reward:
            status === 'graded'
                ? summarizeRewards(
                      parseSnapshot(o.before),
                      parseSnapshot(o.after),
                      parseAppliedAwards(o.awards),
                      awards,
                  )
                : null,
    }
}
