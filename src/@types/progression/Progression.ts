import type { Enums } from '@/@types/supabase/database.types'

export type XpSource = Enums<'xp_source'>

/** Level formula and reward thresholds (admin-configurable, one row in `progression_settings`). */
export interface ProgressionSettings {
    /** XP to go from level 1 to 2 */
    baseXp: number
    /** Extra XP each further level costs: XP for L → L+1 = baseXp + xpStep × (L − 1) */
    xpStep: number
    maxLevel: number
    /** Percentage at or above which a quiz earns the high-score bonus */
    highScoreThreshold: number
    /** IANA time zone for learning days, streaks and weekly leaderboards */
    timezone: string
    /** Streak lengths (days) that earn streak XP, once each */
    streakMilestones: number[]
}

export const DEFAULT_PROGRESSION_SETTINGS: ProgressionSettings = {
    baseXp: 100,
    xpStep: 25,
    maxLevel: 100,
    highScoreThreshold: 90,
    timezone: 'UTC',
    streakMilestones: [3, 7, 14, 30, 60, 100],
}

/** Default XP for a kind of reward, and the range teachers may pick from. */
export interface XpRule {
    source: XpSource
    defaultXp: number
    minXp: number
    maxXp: number
}

export interface Rank {
    id: string
    code: string
    name: string
    description: string
    sortOrder: number
    minLevel: number
    minAverageScore: number
    minPassedAssessments: number
    minCompletedLessons: number
}

/** What rank gates are measured against (graded assessments = quiz, exam, homework, boss battle). */
export interface MasteryStats {
    averageScore: number
    passedAssessments: number
    completedLessons: number
}

export interface LevelProgress {
    level: number
    totalXp: number
    /** XP earned since reaching the current level */
    xpIntoLevel: number
    /** XP the current level costs in total (0 at max level) */
    xpForNextLevel: number
    /** 0–100 */
    percent: number
    isMaxLevel: boolean
}

export interface RankRequirement {
    key: 'level' | 'averageScore' | 'passedAssessments' | 'completedLessons'
    label: string
    current: number
    required: number
    met: boolean
}

/** The next rank and how close the student is to it — the "promotion trial". */
export interface RankTrial {
    rank: Rank
    requirements: RankRequirement[]
    eligible: boolean
}

/** A reward the server has decided is due, before it is applied (idempotently) by the database. */
export interface PendingAward {
    amount: number
    source: XpSource
    idempotencyKey: string
    reason: string
}

/** Snapshot returned by the progression functions before/after a change */
export interface ProgressSnapshot {
    totalXp: number
    level: number
    rankId: string
    rankCode: string
    rankName: string
}

export interface RankPromotion {
    fromRank: string
    toRank: string
}

/** Applied award as reported back by the database */
export interface AppliedAward {
    idempotencyKey: string
    source: XpSource
    amount: number
    awarded: boolean
    promotions: RankPromotion[]
    subject: { id: string; levelBefore: number; levelAfter: number } | null
}

/** What the student sees after finishing something: XP gained, level ups, promotions. */
export interface RewardSummary {
    xpGained: number
    awards: { source: XpSource; amount: number; reason?: string }[]
    before: ProgressSnapshot
    after: ProgressSnapshot
    leveledUp: boolean
    promotions: RankPromotion[]
    subjectLevel: { before: number; after: number } | null
}

export interface XpLedgerEntry {
    id: number
    amount: number
    source: XpSource
    reason: string
    balanceAfter: number
    activityId: string | null
    courseId: string | null
    awardedByName: string | null
    createdAt: Date
}

export interface RankHistoryEntry {
    id: number
    fromRankCode: string | null
    toRankCode: string
    toRankName: string
    levelAtPromotion: number
    createdAt: Date
}
