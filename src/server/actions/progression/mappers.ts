import 'server-only'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type {
    AppliedAward,
    ProgressionSettings,
    ProgressSnapshot,
    Rank,
    XpRule,
} from '@/@types/progression/Progression'

export const mapRank = (row: Tables<'ranks'>): Rank => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    minLevel: row.min_level,
    minAverageScore: Number(row.min_average_score),
    minPassedAssessments: row.min_passed_assessments,
    minCompletedLessons: row.min_completed_lessons,
})

export const mapSettings = (row: Tables<'progression_settings'>): ProgressionSettings => ({
    baseXp: row.base_xp,
    xpStep: row.xp_step,
    maxLevel: row.max_level,
    highScoreThreshold: row.high_score_threshold,
    timezone: row.timezone,
    streakMilestones: row.streak_milestones,
})

export const mapXpRule = (row: Tables<'xp_rules'>): XpRule => ({
    source: row.source,
    defaultXp: row.default_xp,
    minXp: row.min_xp,
    maxXp: row.max_xp,
})

type JsonObject = { [key: string]: Json | undefined }

const asObject = (value: Json | undefined): JsonObject =>
    value && typeof value === 'object' && !Array.isArray(value) ? value : {}

export const parseSnapshot = (value: Json | undefined): ProgressSnapshot => {
    const o = asObject(value)
    return {
        totalXp: Number(o.totalXp ?? 0),
        level: Number(o.level ?? 1),
        rankId: String(o.rankId ?? ''),
        rankCode: String(o.rankCode ?? ''),
        rankName: String(o.rankName ?? ''),
    }
}

/** The `awards` array returned by complete_lesson / finalize_attempt (see apply_awards in SQL) */
export const parseAppliedAwards = (value: Json | undefined): AppliedAward[] =>
    (Array.isArray(value) ? value : []).map((item) => {
        const o = asObject(item)
        const subject = o.subject ? asObject(o.subject) : null
        return {
            idempotencyKey: String(o.idempotencyKey ?? ''),
            source: String(o.source ?? 'quiz_completion') as AppliedAward['source'],
            amount: Number(o.amount ?? 0),
            awarded: o.awarded === true,
            promotions: (Array.isArray(o.promotions) ? o.promotions : []).map((p) => {
                const promotion = asObject(p)
                return { fromRank: String(promotion.fromRank ?? ''), toRank: String(promotion.toRank ?? '') }
            }),
            subject: subject
                ? {
                      id: String(subject.id ?? ''),
                      levelBefore: Number(subject.levelBefore ?? 1),
                      levelAfter: Number(subject.levelAfter ?? 1),
                  }
                : null,
        }
    })

export { asObject }
