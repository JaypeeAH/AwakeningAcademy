import type { RewardSummary } from './Progression'
import type { Discovery } from '@/@types/game/Secrets'
import type { AchievementUnlock } from '@/@types/game/Achievements'
import type { TeamQuestReward } from '@/@types/game/Guilds'

/** The student's learning streak (days are local dates in the school's time zone) */
export interface StreakStatus {
    current: number
    best: number
    today: string
    learnedToday: boolean
    /** A missed day a Second Chance can fill to save the streak */
    shieldableDay: string | null
    /** Second Chance is unlocked and charged */
    canShield: boolean
    nextMilestone: number | null
    milestones: number[]
    /** The last 14 days, oldest first */
    recent: { day: string; learned: boolean; shielded: boolean }[]
}

export interface StreakUpdate {
    current: number
    best: number
    /** First learning today */
    isNewDay: boolean
    milestoneRewards: { days: number; reward: RewardSummary }[]
}

/** Everything a piece of learning set off besides its own XP (shown after the reward dialog) */
export interface LearningOutcome {
    discoveries: Discovery[]
    achievements: AchievementUnlock[]
    teamQuests: TeamQuestReward[]
    streak: StreakUpdate | null
}

export const EMPTY_OUTCOME: LearningOutcome = { discoveries: [], achievements: [], teamQuests: [], streak: null }
