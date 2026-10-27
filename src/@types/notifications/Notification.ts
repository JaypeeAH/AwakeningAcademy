import { z } from 'zod'
import type { NavigationIconKey } from '@/configs/icons.config'

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
