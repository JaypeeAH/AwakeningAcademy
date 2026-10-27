import type { Enums } from '@/@types/supabase/database.types'
import type { AttemptFile, Question, QuestionKey, ResponseOutcome } from '@/@types/activities/Question'
import type { RewardSummary } from '@/@types/progression/Progression'
import type { Discovery } from '@/@types/game/Secrets'
import type { AchievementUnlock } from '@/@types/game/Achievements'
import type { TeamQuestReward } from '@/@types/game/Guilds'
import type { StreakUpdate } from '@/@types/progression/Streak'
import type { AttemptPowers } from '@/@types/game/Inventory'
import type { FeedbackMode } from '@/utils/feedback'
import type { ResponseInput } from './AttemptSchema'

export type AttemptStatus = Enums<'attempt_status'>

export interface Attempt {
    id: string
    activityId: string
    studentId: string
    attemptNo: number
    status: AttemptStatus
    startedAt: Date
    submittedAt: Date | null
    /** Timed attempts: when the server stops accepting answers (plus a short grace period) */
    expiresAt: Date | null
    score: number | null
    maxScore: number | null
    percent: number | null
    passed: boolean | null
    gradedAt: Date | null
    /** The teacher's overall comment */
    feedback: string
}

export interface ResponseRecord {
    questionId: string
    selectedOptionIds: string[]
    textAnswer: string | null
    outcome: ResponseOutcome
    pointsAwarded: number
    /** The teacher's comment on this answer */
    feedback: string
}

/** An open attempt plus the questions to answer (no answer keys) */
export interface AttemptSession {
    attempt: Attempt
    questions: Question[]
    attemptsLeft: number | null
    /** Answers autosaved on the server (restores across refreshes and devices) */
    draft: ResponseInput[]
    /** Files already uploaded to this attempt */
    files: AttemptFile[]
    /** Server time when this was sent — the countdown corrects the device clock with it */
    serverNow: Date
    /** Easter Bunny skips and skills for this attempt */
    powers: AttemptPowers
}

export interface AttemptResultQuestion {
    question: Question
    response: ResponseRecord | null
    /** Only when the feedback mode reveals answers (always for teachers) */
    key: Pick<QuestionKey, 'correctOptionIds' | 'acceptedAnswers' | 'explanation' | 'rubric'> | null
    files: AttemptFile[]
}

export interface AttemptResult {
    attempt: Attempt
    activity: {
        id: string
        title: string
        kind: string
        passingScore: number
        feedbackMode: FeedbackMode
        dueAt: Date | null
        courseId: string
    }
    questions: AttemptResultQuestion[]
    /** Whether answer keys are included (see utils/feedback.canRevealAnswers) */
    answersRevealed: boolean
    /** Present on the response to a submit; absent when a result is re-opened later */
    reward: RewardSummary | null
    alreadySubmitted?: boolean
    /** The attempt ran out of time: what was autosaved was graded */
    submittedLate?: boolean
    /** Secrets found because of this submission */
    discoveries?: Discovery[]
    achievements?: AchievementUnlock[]
    teamQuests?: TeamQuestReward[]
    streak?: StreakUpdate | null
}

/** A marked attempt with teacher feedback, for the student's Chronicle */
export interface FeedbackEntry {
    attemptId: string
    activityId: string
    activityTitle: string
    courseTitle: string
    percent: number | null
    passed: boolean | null
    gradedAt: Date | null
    feedback: string
    /** Number of answers with a comment */
    commentCount: number
}
