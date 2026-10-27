import { isAssessment, type ActivityKind } from '@/@types/activities/ActivityKindOptions'
import { formatDateTime } from '@/utils/dates'
import type { QuestState } from '@/@types/activities/Activity'

/*
 * Whether a student can take an activity right now, and why not. Used by the Quest Board and — the part
 * that matters — by the server before completing a lesson or starting an attempt.
 */

export interface QuestStateInput {
    kind: ActivityKind
    opensAt: Date | null
    maxAttempts: number | null
    /** Titles of prerequisites not yet completed (passed, for assessments) */
    unmetPrerequisites: string[]
    completed: boolean
    passed: boolean
    attemptsUsed: number
    hasOpenAttempt: boolean
    /** A submitted attempt is waiting for the teacher to grade it */
    hasPendingReview?: boolean
}

export interface QuestStateResult {
    state: QuestState
    reason: string | null
    attemptsLeft: number | null
    /** Can a new lesson completion / attempt be started? */
    playable: boolean
}

export function getQuestState(input: QuestStateInput, now: Date = new Date()): QuestStateResult {
    const attemptsLeft = input.maxAttempts === null ? null : Math.max(0, input.maxAttempts - input.attemptsUsed)

    if (input.opensAt && input.opensAt > now) {
        return { state: 'upcoming', reason: `Opens ${formatDateTime(input.opensAt)}`, attemptsLeft, playable: false }
    }
    if (input.unmetPrerequisites.length > 0) {
        return {
            state: 'locked',
            reason: `Complete ${input.unmetPrerequisites.map((t) => `“${t}”`).join(', ')} first`,
            attemptsLeft,
            playable: false,
        }
    }
    if (input.hasOpenAttempt) {
        return { state: 'in_progress', reason: null, attemptsLeft, playable: true }
    }
    if (input.hasPendingReview) {
        return { state: 'in_review', reason: 'Your teacher is marking your work', attemptsLeft, playable: false }
    }

    const done = isAssessment(input.kind) ? input.passed || (input.completed && attemptsLeft === 0) : input.completed
    if (done) {
        // Finished quests stay replayable (practice / revision) while attempts remain
        const canRetry = isAssessment(input.kind) ? attemptsLeft !== 0 : true
        return { state: 'completed', reason: null, attemptsLeft, playable: canRetry }
    }
    if (attemptsLeft === 0) {
        return { state: 'completed', reason: 'No attempts left', attemptsLeft, playable: false }
    }
    return { state: 'available', reason: null, attemptsLeft, playable: true }
}
