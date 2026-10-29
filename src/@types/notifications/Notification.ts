import { z } from 'zod'
import type { NavigationIconKey } from '@/configs/icons.config'
import {
    achievementsPath,
    codexPath,
    coursesPath,
    getCoursePath,
    getLearnPath,
    historyPath,
    inventoryPath,
    profilePath,
    questsPath,
} from '@/configs/app.config'

export interface AppNotification {
    id: string
    kind: string
    title: string
    body: string
    data: Record<string, unknown>
    readAt: Date | null
    createdAt: Date
}

export interface NotificationFeed {
    records: AppNotification[]
    unread: number
}

export const MarkNotificationsReadSchema = z.union([
    z.object({ ids: z.array(z.string().uuid()).min(1).max(100) }),
    z.object({ all: z.literal(true) }),
])
export type MarkNotificationsReadInput = z.infer<typeof MarkNotificationsReadSchema>

export const notificationIcon: Record<string, NavigationIconKey> = {
    level_up: 'progression',
    rank_up: 'progression',
    xp_adjusted: 'history',
    course_joined: 'courses',
    graded: 'grading',
    discovery: 'easter',
    skill_unlocked: 'skills',
    achievement: 'achievements',
    team_quest: 'team',
    guild: 'team',
}

const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

/** Where clicking a notification takes the user, from its kind and the ids stored in `data`. */
export function notificationLink({ kind, data }: Pick<AppNotification, 'kind' | 'data'>): string | undefined {
    const courseId = str(data.courseId)
    const activityId = str(data.activityId)
    switch (kind) {
        case 'level_up':
        case 'rank_up':
            return profilePath
        case 'xp_adjusted':
            return historyPath
        case 'course_joined':
            return courseId ? getCoursePath(courseId) : coursesPath
        case 'graded':
            return activityId ? getLearnPath(activityId, str(data.attemptId)) : undefined
        case 'discovery':
            return codexPath
        case 'skill_unlocked':
            return inventoryPath
        case 'achievement':
            return achievementsPath
        case 'team_quest':
            return activityId ? getLearnPath(activityId) : questsPath
        case 'guild':
            return courseId ? getCoursePath(courseId, 'guilds') : coursesPath
        default:
            return undefined
    }
}
