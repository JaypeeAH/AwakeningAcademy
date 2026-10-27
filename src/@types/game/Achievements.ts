import { z } from 'zod'
import type { Rarity } from './Inventory'
import type { RewardSummary } from '@/@types/progression/Progression'

/**
 * What earns an achievement — data, not code. Admins pick a type and a threshold; the server checks
 * them with utils/achievements.evaluateAchievement after every reward.
 */
export const AchievementConditionSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('lessons_completed'), min: z.number().int().min(1).max(10000) }),
    z.object({ type: z.literal('assessments_passed'), min: z.number().int().min(1).max(10000) }),
    z.object({ type: z.literal('perfect_scores'), min: z.number().int().min(1).max(10000) }),
    z.object({ type: z.literal('bosses_defeated'), min: z.number().int().min(1).max(1000) }),
    z.object({ type: z.literal('streak'), days: z.number().int().min(2).max(1000) }),
    z.object({ type: z.literal('team_quests'), min: z.number().int().min(1).max(1000) }),
    z.object({ type: z.literal('discoveries'), min: z.number().int().min(1).max(1000) }),
    z.object({ type: z.literal('level'), min: z.number().int().min(2).max(500) }),
    z.object({ type: z.literal('rank'), min: z.number().int().min(2).max(20) }),
    z.object({ type: z.literal('total_xp'), min: z.number().int().min(1).max(10_000_000) }),
    z.object({ type: z.literal('courses_joined'), min: z.number().int().min(1).max(100) }),
])
export type AchievementCondition = z.infer<typeof AchievementConditionSchema>
export type AchievementConditionType = AchievementCondition['type']

export const achievementConditionLabel: Record<AchievementConditionType, string> = {
    lessons_completed: 'Lessons completed',
    assessments_passed: 'Graded activities passed',
    perfect_scores: '100% scores on graded activities',
    bosses_defeated: 'Boss battles won',
    streak: 'Learning streak (days in a row, best ever)',
    team_quests: 'Team quests completed',
    discoveries: 'Secrets discovered',
    level: 'Level reached',
    rank: 'Rank reached (1 = F, 2 = E, …)',
    total_xp: 'Total XP',
    courses_joined: 'Courses joined',
}

/** Facts about one student that conditions are checked against */
export interface PlayerStats {
    lessonsCompleted: number
    assessmentsPassed: number
    perfectScores: number
    bossesDefeated: number
    bestStreak: number
    teamQuests: number
    discoveries: number
    level: number
    rankOrder: number
    totalXp: number
    coursesJoined: number
}

export interface AchievementDefinition {
    id: string
    code: string
    name: string
    description: string
    /** A navigation icon key */
    icon: string
    rarity: Rarity
    condition: AchievementCondition
    xpReward: number
    secret: boolean
    active: boolean
    sortOrder: number
}

/** As one student sees it: earned, or locked with progress (secret ones show as ???) */
export interface PlayerAchievement {
    id: string
    name: string
    description: string
    icon: string
    rarity: Rarity
    xpReward: number
    earnedAt: Date | null
    secret: boolean
    progress: { current: number; target: number }
}

export interface AchievementBook {
    achievements: PlayerAchievement[]
    earned: number
    total: number
}

/** The moment one is earned */
export interface AchievementUnlock {
    id: string
    name: string
    description: string
    icon: string
    rarity: Rarity
    reward: RewardSummary | null
}

export const SaveAchievementSchema = z.object({
    code: z
        .string()
        .trim()
        .regex(/^[a-z0-9_]{2,40}$/, 'Use 2–40 lowercase letters, numbers or underscores'),
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(300).default(''),
    icon: z.string().trim().max(30).default('achievement'),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
    condition: AchievementConditionSchema,
    xpReward: z.number().int().min(0).max(10000).default(0),
    secret: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(1000).default(0),
})
export type SaveAchievementInput = z.infer<typeof SaveAchievementSchema>
