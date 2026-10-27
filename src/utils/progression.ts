import { activityKindXpSource, type ActivityKind } from '@/@types/activities/ActivityKindOptions'
import type {
    AppliedAward,
    LevelProgress,
    MasteryStats,
    PendingAward,
    ProgressionSettings,
    ProgressSnapshot,
    Rank,
    RankRequirement,
    RankTrial,
    RewardSummary,
    XpRule,
    XpSource,
} from '@/@types/progression/Progression'

/*
 * Progression maths shared by the server (reward decisions) and the UI (XP bars, trials).
 * The SQL functions public.xp_for_level / public.level_for_xp implement the same formula;
 * tests/db/progression.test.ts and utils/progression.test.ts keep them in agreement.
 */

/** XP it costs to go from `level` to `level + 1` */
export const xpToNextLevel = (level: number, { baseXp, xpStep }: Pick<ProgressionSettings, 'baseXp' | 'xpStep'>) =>
    baseXp + xpStep * (Math.max(level, 1) - 1)

/** Cumulative XP needed to reach `level` */
export const xpForLevel = (level: number, { baseXp, xpStep }: Pick<ProgressionSettings, 'baseXp' | 'xpStep'>) => {
    const n = Math.max(level, 1) - 1
    return n * baseXp + (xpStep * n * (n - 1)) / 2
}

export const levelForXp = (totalXp: number, settings: ProgressionSettings) => {
    let level = 1
    while (level < settings.maxLevel && xpForLevel(level + 1, settings) <= totalXp) level++
    return level
}

export const getLevelProgress = (totalXp: number, settings: ProgressionSettings): LevelProgress => {
    const level = levelForXp(totalXp, settings)
    const isMaxLevel = level >= settings.maxLevel
    const xpForNextLevel = isMaxLevel ? 0 : xpToNextLevel(level, settings)
    const xpIntoLevel = totalXp - xpForLevel(level, settings)
    return {
        level,
        totalXp,
        xpIntoLevel,
        xpForNextLevel,
        percent: isMaxLevel ? 100 : Math.min(100, Math.floor((xpIntoLevel / xpForNextLevel) * 100)),
        isMaxLevel,
    }
}

/** The next rank's requirements and which are met. null when already at the top rank. */
export const getRankTrial = (
    currentRank: Pick<Rank, 'sortOrder'>,
    ranks: Rank[],
    level: number,
    mastery: MasteryStats,
): RankTrial | null => {
    const next = [...ranks].sort((a, b) => a.sortOrder - b.sortOrder).find((r) => r.sortOrder > currentRank.sortOrder)
    if (!next) return null
    const requirements: RankRequirement[] = [
        { key: 'level', label: `Reach level ${next.minLevel}`, current: level, required: next.minLevel },
        {
            key: 'averageScore',
            label: `Average ${next.minAverageScore}% or more on graded assessments`,
            current: mastery.averageScore,
            required: next.minAverageScore,
        },
        {
            key: 'passedAssessments',
            label: `Pass ${next.minPassedAssessments} graded ${next.minPassedAssessments === 1 ? 'assessment' : 'assessments'}`,
            current: mastery.passedAssessments,
            required: next.minPassedAssessments,
        },
        {
            key: 'completedLessons',
            label: `Complete ${next.minCompletedLessons} ${next.minCompletedLessons === 1 ? 'lesson' : 'lessons'}`,
            current: mastery.completedLessons,
            required: next.minCompletedLessons,
        },
    ]
        .filter((r) => r.key === 'level' || r.required > 0)
        .map((r) => ({ ...r, key: r.key as RankRequirement['key'], met: r.current >= r.required }))
    return { rank: next, requirements, eligible: requirements.every((r) => r.met) }
}

/** Problems with a rank ladder an admin is about to save (empty = valid). Ranks in display order. */
export const validateRankLadder = (ranks: Pick<Rank, 'code' | 'name' | 'minLevel'>[], maxLevel: number): string[] => {
    const errors: string[] = []
    if (ranks.length === 0) return ['There must be at least one rank.']
    if (ranks[0].minLevel !== 1)
        errors.push(`${ranks[0].code}-Rank is where everyone starts, so it must begin at level 1.`)
    for (let i = 1; i < ranks.length; i++) {
        if (ranks[i].minLevel <= ranks[i - 1].minLevel) {
            errors.push(`${ranks[i].code}-Rank must start at a higher level than ${ranks[i - 1].code}-Rank.`)
        }
    }
    const last = ranks[ranks.length - 1]
    if (last.minLevel > maxLevel) errors.push(`${last.code}-Rank starts above the maximum level (${maxLevel}).`)
    return errors
}

export const clampToRule = (amount: number, rule: Pick<XpRule, 'minXp' | 'maxXp'> | undefined) =>
    rule ? Math.min(rule.maxXp, Math.max(rule.minXp, Math.round(amount))) : Math.max(0, Math.round(amount))

/* ── Reward decisions ────────────────────────────────────────────────────────────────────────────
 * Idempotency keys are deterministic, so the same achievement always maps to the same ledger row:
 *   complete:<activity>:<student>              first completion / first pass (one-time XP)
 *   complete:<activity>:<student>:<attempt>    each passing attempt, only when XP is repeatable
 *   high-score:<activity>:<student>            high-score bonus, once per activity
 */

export const completionKey = (activityId: string, studentId: string, attemptId?: string) =>
    attemptId ? `complete:${activityId}:${studentId}:${attemptId}` : `complete:${activityId}:${studentId}`

export const highScoreKey = (activityId: string, studentId: string) => `high-score:${activityId}:${studentId}`

interface RewardActivity {
    id: string
    kind: ActivityKind
    title: string
    xpReward: number
    xpRepeatable: boolean
}

const ruleFor = (rules: XpRule[], source: XpSource) => rules.find((r) => r.source === source)

export const computeLessonAwards = (activity: RewardActivity, studentId: string, rules: XpRule[]): PendingAward[] => {
    const source = activityKindXpSource[activity.kind]
    const amount = clampToRule(activity.xpReward, ruleFor(rules, source))
    if (amount <= 0) return []
    return [
        {
            amount,
            source,
            idempotencyKey: completionKey(activity.id, studentId),
            reason: `Completed “${activity.title}”`,
        },
    ]
}

/**
 * Rewards due for a graded attempt. Completion XP needs a pass (score ≥ passing score); the high-score
 * bonus needs the configured threshold. Both are one-time per activity unless the activity's XP is
 * repeatable, in which case completion XP is earned on every passing attempt.
 */
export const computeAttemptAwards = (input: {
    activity: RewardActivity
    studentId: string
    attemptId: string
    percent: number
    passed: boolean
    rules: XpRule[]
    settings: Pick<ProgressionSettings, 'highScoreThreshold'>
}): PendingAward[] => {
    const { activity, studentId, attemptId, percent, passed, rules, settings } = input
    if (!passed) return []
    const awards: PendingAward[] = []
    const source = activityKindXpSource[activity.kind]
    const amount = clampToRule(activity.xpReward, ruleFor(rules, source))
    if (amount > 0) {
        awards.push({
            amount,
            source,
            idempotencyKey: completionKey(activity.id, studentId, activity.xpRepeatable ? attemptId : undefined),
            reason: `Passed “${activity.title}”`,
        })
    }
    const bonusRule = ruleFor(rules, 'high_score_bonus')
    if (percent >= settings.highScoreThreshold && bonusRule && bonusRule.defaultXp > 0) {
        awards.push({
            amount: bonusRule.defaultXp,
            source: 'high_score_bonus',
            idempotencyKey: highScoreKey(activity.id, studentId),
            reason: `Scored ${Math.round(percent)}% on “${activity.title}”`,
        })
    }
    return awards
}

/** Turns the database's before/after snapshots and applied awards into what the student sees. */
export const summarizeRewards = (
    before: ProgressSnapshot,
    after: ProgressSnapshot,
    applied: AppliedAward[],
    pending: PendingAward[] = [],
): RewardSummary => {
    const granted = applied.filter((a) => a.awarded)
    const subjects = granted.map((a) => a.subject).filter((s) => s !== null)
    return {
        xpGained: granted.reduce((sum, a) => sum + a.amount, 0),
        awards: granted.map((a) => ({
            source: a.source,
            amount: a.amount,
            reason: pending.find((p) => p.idempotencyKey === a.idempotencyKey)?.reason,
        })),
        before,
        after,
        leveledUp: after.level > before.level,
        promotions: applied.flatMap((a) => a.promotions ?? []),
        subjectLevel: subjects.length
            ? { before: subjects[0].levelBefore, after: subjects[subjects.length - 1].levelAfter }
            : null,
    }
}
