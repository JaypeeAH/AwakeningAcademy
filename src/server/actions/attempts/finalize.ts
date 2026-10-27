import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { toAppError, unwrap } from '@/server/data/supabase/errors'
import { getProgressionSettings, getXpRules } from '@/server/actions/progression'
import { parseAppliedAwards, parseSnapshot, asObject } from '@/server/actions/progression/mappers'
import { KEYED_QUESTION_SELECT, QUESTION_SELECT, mapKeyedQuestion } from '@/server/actions/activities/mappers'
import { gradeAttempt } from '@/utils/grading'
import { computeAttemptAwards, summarizeRewards } from '@/utils/progression'
import { ATTEMPT_GRACE_SECONDS } from '@/utils/timing'
import { overdriveAwards } from '@/server/actions/skills'
import { ResponseInputSchema, type ResponseInput } from '@/@types/attempts/AttemptSchema'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { RewardSummary } from '@/@types/progression/Progression'

/*
 * Turning an open attempt into a submitted one — shared by a student's submit and by the expiry sweep
 * that grades timed attempts nobody submitted (from their autosaved answers).
 */

export type QuestionRow = Parameters<typeof mapKeyedQuestion>[0]

export async function loadQuestions(activityId: string, withKeys: boolean) {
    return unwrap(
        await supabaseAdmin()
            .from('questions')
            .select(withKeys ? KEYED_QUESTION_SELECT : QUESTION_SELECT)
            .eq('activity_id', activityId)
            .order('position'),
        'load questions',
    ) as unknown as QuestionRow[]
}

/** Autosaved answers stored on the attempt (validated — they came from the browser) */
export function readDraft(draft: Json): ResponseInput[] {
    if (!Array.isArray(draft)) return []
    return draft.flatMap((item) => {
        const parsed = ResponseInputSchema.safeParse(item)
        return parsed.success ? [parsed.data] : []
    })
}

export interface FinalizeOutcome {
    alreadySubmitted: boolean
    status: 'graded' | 'pending_review'
    reward: RewardSummary | null
}

/**
 * Grades the answers on the server and records them in one transaction (finalize_attempt). Answers a
 * teacher must mark leave the attempt "awaiting review" with no rewards yet; otherwise rewards are
 * applied with their usual idempotency keys.
 */
export async function finalizeAttempt(
    attempt: Pick<Tables<'attempts'>, 'id' | 'student_id' | 'skipped_question_ids'>,
    activity: Tables<'activities'>,
    responses: ResponseInput[],
): Promise<FinalizeOutcome> {
    const questions = (await loadQuestions(activity.id, true)).map(mapKeyedQuestion)
    // Questions skipped with an Easter Bunny are recorded as skipped (never correct) and left out of the total
    const grade = gradeAttempt(questions, responses, activity.passing_score, attempt.skipped_question_ids ?? [])
    const [rules, settings] = await Promise.all([getXpRules(), getProgressionSettings()])
    const awards = grade.needsReview
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
                  attemptId: attempt.id,
                  percent: grade.percent,
                  passed: grade.passed,
                  rules,
                  settings,
              }),
              ...(grade.passed ? await overdriveAwards(activity, attempt.student_id, rules) : []),
          ]

    const result = await supabaseAdmin().rpc('finalize_attempt', {
        p_attempt_id: attempt.id,
        p_student_id: attempt.student_id,
        p_responses: grade.responses.map((r) => ({
            questionId: r.questionId,
            selectedOptionIds: r.selectedOptionIds,
            textAnswer: r.textAnswer,
            outcome: r.outcome,
            pointsAwarded: r.pointsAwarded,
        })) as unknown as Json,
        p_score: grade.score,
        p_max_score: grade.maxScore,
        p_percent: grade.percent,
        p_passed: grade.passed,
        p_awards: awards as unknown as Json,
        p_status: grade.needsReview ? 'pending_review' : 'graded',
    })
    if (result.error) throw toAppError(result.error, 'submit the answers')
    const o = asObject(result.data)
    if (o.alreadySubmitted === true) return { alreadySubmitted: true, status: 'graded', reward: null }
    return {
        alreadySubmitted: false,
        status: grade.needsReview ? 'pending_review' : 'graded',
        reward: grade.needsReview
            ? null
            : summarizeRewards(parseSnapshot(o.before), parseSnapshot(o.after), parseAppliedAwards(o.awards), awards),
    }
}

/**
 * Grades timed attempts whose time (plus grace) ran out without a submit, using their autosaved
 * answers. Runs lazily wherever attempts are read (quest board, play view, results, grading queue), so
 * no background job is needed. Safe to run concurrently: finalize_attempt locks and checks the status.
 */
export async function finalizeExpiredAttempts(filter: { studentId?: string; activityId?: string }) {
    const cutoff = new Date(Date.now() - ATTEMPT_GRACE_SECONDS * 1000).toISOString()
    let query = supabaseAdmin()
        .from('attempts')
        .select('id, student_id, activity_id, draft_responses, skipped_question_ids')
        .eq('status', 'in_progress')
        .not('expires_at', 'is', null)
        .lt('expires_at', cutoff)
        .limit(200)
    if (filter.studentId) query = query.eq('student_id', filter.studentId)
    if (filter.activityId) query = query.eq('activity_id', filter.activityId)
    const expired = unwrap(await query, 'check timed attempts')
    if (!expired.length) return 0

    const activityIds = [...new Set(expired.map((a) => a.activity_id))]
    const activities = unwrap(
        await supabaseAdmin().from('activities').select('*').in('id', activityIds),
        'load activities',
    )
    for (const attempt of expired) {
        const activity = activities.find((a) => a.id === attempt.activity_id)
        if (!activity) continue
        try {
            await finalizeAttempt(attempt, activity, readDraft(attempt.draft_responses))
        } catch (error) {
            console.error('[attempts] could not finalise expired attempt', attempt.id, error)
        }
    }
    return expired.length
}
