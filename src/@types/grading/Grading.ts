import { z } from 'zod'
import type { Attempt, AttemptResultQuestion } from '@/@types/attempts/Attempt'
import type { RewardSummary } from '@/@types/progression/Progression'

/** POST /api/grading/[attemptId] — the teacher's marks; totals and rewards are worked out on the server */
export const GradeAttemptSchema = z.object({
    grades: z
        .array(
            z.object({
                questionId: z.string().uuid(),
                pointsAwarded: z.number().min(0).max(100),
                feedback: z.string().trim().max(5000).default(''),
            }),
        )
        .max(200),
    feedback: z.string().trim().max(5000).default(''),
})
export type GradeAttemptInput = z.infer<typeof GradeAttemptSchema>

/** One attempt in the teacher's grading queue */
export interface GradingQueueItem {
    attemptId: string
    attemptNo: number
    activityId: string
    activityTitle: string
    activityKind: string
    courseId: string
    courseTitle: string
    studentId: string
    studentName: string
    submittedAt: Date | null
    dueAt: Date | null
    /** Answers still to grade */
    pendingCount: number
    status: 'pending_review' | 'graded'
    percent: number | null
}

export interface GradingQueue {
    pending: GradingQueueItem[]
    /** Recently graded (re-grade from here) */
    recent: GradingQueueItem[]
}

/** Everything the grader needs for one attempt: answers, keys and rubrics, files, existing marks */
export interface AttemptForGrading {
    attempt: Attempt
    activity: {
        id: string
        title: string
        kind: string
        passingScore: number
        dueAt: Date | null
        courseId: string
        courseTitle: string
    }
    student: { id: string; displayName: string }
    questions: AttemptResultQuestion[]
}

export interface GradeAttemptResult {
    status: 'pending_review' | 'graded'
    percent: number
    passed: boolean
    /** The student's rewards from this grading (first grade only — re-grades never pay twice) */
    reward: RewardSummary | null
}
