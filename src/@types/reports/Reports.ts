import type { ActivityKind } from '@/@types/activities/ActivityKindOptions'
import type { Role } from '@/@types/auth/Roles'

/** Gradebook for one course: learning first, game stats second */
export interface CourseProgressReport {
    activities: { id: string; title: string; kind: ActivityKind; dueAt: Date | null; passingScore: number }[]
    students: CourseProgressStudent[]
    summary: {
        completionRate: number | null
        averageScore: number | null
        needsSupport: number
    }
}

export interface CourseProgressStudent {
    id: string
    displayName: string
    level: number
    rankCode: string
    /** By activity id */
    cells: Record<string, { completed: boolean; bestPercent: number | null; passed: boolean }>
    completed: number
    averageScore: number | null
    overdue: number
    /** Plain-language reasons this student may need help (empty = on track) */
    supportReasons: string[]
}

export interface TeacherOverview {
    recentSubmissions: {
        attemptId: string
        activityId: string
        activityTitle: string
        courseId: string
        courseTitle: string
        studentName: string
        percent: number | null
        passed: boolean | null
        submittedAt: Date
    }[]
}

export interface AdminOverview {
    users: Record<Role, number>
    courses: number
    publishedActivities: number
    xpAwardedThisWeek: number
}
