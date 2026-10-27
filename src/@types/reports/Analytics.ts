import { z } from 'zod'
import type { XpSource } from '@/@types/progression/Progression'

/** GET /api/courses/[courseId]/analytics?moduleId=&studentId=&from=&to= */
export const AnalyticsFiltersSchema = z.object({
    moduleId: z.string().uuid().nullable().default(null),
    studentId: z.string().uuid().nullable().default(null),
    from: z.coerce.date().nullable().default(null),
    to: z.coerce.date().nullable().default(null),
})
export type AnalyticsFilters = z.infer<typeof AnalyticsFiltersSchema>

export interface ScoreBucket {
    label: string
    from: number
    to: number
    count: number
}

export interface ObjectivePerformance {
    objective: string
    /** Points earned / possible across marked answers */
    earned: number
    possible: number
    percent: number
    responses: number
}

export interface MissedQuestion {
    questionId: string
    activityId: string
    activityTitle: string
    prompt: string
    answered: number
    incorrect: number
    partial: number
    /** Skipped with an Easter Bunny — counted apart, never as wrong */
    skipped: number
    incorrectRate: number
}

export interface OverdueItem {
    activityId: string
    title: string
    dueAt: Date
    students: { id: string; displayName: string }[]
}

export interface IncompleteItem {
    activityId: string
    title: string
    dueAt: Date | null
    completed: number
    total: number
}

export interface RetryStat {
    activityId: string
    title: string
    students: number
    attempts: number
    averageAttempts: number
    maxAttempts: number
}

export interface CourseAnalytics {
    options: { modules: { id: string; title: string }[]; students: { id: string; displayName: string }[] }
    summary: {
        gradedAttempts: number
        averagePercent: number | null
        passRate: number | null
        activeStudents: number
        totalStudents: number
        awaitingMarking: number
    }
    scoreDistribution: ScoreBucket[]
    /** Weakest first */
    objectives: ObjectivePerformance[]
    missedQuestions: MissedQuestion[]
    work: { overdue: OverdueItem[]; incomplete: IncompleteItem[] }
    retries: RetryStat[]
    skipped: { total: number; byActivity: { activityId: string; title: string; count: number }[] }
    /** Engagement, shown apart from learning: completion XP vs bonus XP */
    xp: { academic: number; bonus: { source: XpSource; amount: number }[]; bonusTotal: number; adjustments: number }
}
