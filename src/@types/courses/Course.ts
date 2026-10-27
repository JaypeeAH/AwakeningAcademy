import type { LeaderboardMode } from '@/@types/game/Guilds'
import type { PublishStatus } from '@/@types/activities/ActivityKindOptions'
import type { SubjectMeta } from '@/@types/subjects/Subject'

export interface Course {
    id: string
    title: string
    description: string
    subject: SubjectMeta
    status: PublishStatus
    /** Only sent to the course's teachers */
    joinCode: string | null
    teacherNames: string[]
    createdAt: Date
    updatedAt: Date
    /** Teachers: roster size and activity count. Students: their own completion. */
    stats: CourseStats
    /** True when the current user teaches this course (or is an admin) */
    canManage: boolean
    /** Weekly leaderboard visibility (off by default) */
    leaderboardMode: LeaderboardMode
    /** Students with Guild Leader may found guilds */
    studentGuilds: boolean
}

export interface CourseStats {
    studentCount: number | null
    activityCount: number
    publishedCount: number
    completedCount: number | null
}

export interface CourseModule {
    id: string
    courseId: string
    title: string
    description: string
    position: number
}

export interface RosterStudent {
    id: string
    displayName: string
    email: string
    enrolledAt: Date
    level: number
    rankCode: string
    totalXp: number
    completedCount: number
    averageScore: number | null
    lastActiveAt: Date | null
}
