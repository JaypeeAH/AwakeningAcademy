import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { getStudentClass } from '@/server/actions/subjects'
import { mapRank, mapSettings, mapXpRule, parseAppliedAwards, parseSnapshot, asObject } from './mappers'
import { getLevelProgress, getRankTrial, summarizeRewards, validateRankLadder } from '@/utils/progression'
import { DataError, NotFoundError } from '@/@types/errors'
import {
    DEFAULT_PROGRESSION_SETTINGS,
    type MasteryStats,
    type ProgressionSettings,
    type Rank,
    type RankHistoryEntry,
    type RewardSummary,
    type XpLedgerEntry,
    type XpRule,
} from '@/@types/progression/Progression'
import type { PlayerStatus } from '@/@types/progression/PlayerStatus'
import type { SaveProgressionConfigInput, XpAdjustmentInput } from '@/@types/progression/ProgressionSchema'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Collection } from '@/@types/common'
import type { Quest } from '@/@types/activities/Activity'
import { XP_HISTORY_PAGE_SIZE } from '@/constants/app.constant'

// ── Configuration ─────────────────────────────────────────────────────────────────────────────────

export async function getProgressionSettings(): Promise<ProgressionSettings> {
    const row = unwrapMaybe(
        await supabaseAdmin().from('progression_settings').select('*').maybeSingle(),
        'load progression settings',
    )
    return row ? mapSettings(row) : DEFAULT_PROGRESSION_SETTINGS
}

export async function getRanks(): Promise<Rank[]> {
    return unwrap(await supabaseAdmin().from('ranks').select('*').order('sort_order'), 'load ranks').map(mapRank)
}

export async function getXpRules(): Promise<XpRule[]> {
    return unwrap(await supabaseAdmin().from('xp_rules').select('*'), 'load XP rules').map(mapXpRule)
}

export async function getProgressionConfig() {
    const [settings, ranks, xpRules] = await Promise.all([getProgressionSettings(), getRanks(), getXpRules()])
    return { settings, ranks, xpRules }
}

/**
 * Saves the level formula, rank ladder and XP limits together. Rank codes and order are fixed (they
 * are the F→SSS identity); names, level thresholds and mastery gates are editable. When the formula
 * changes every student's level is re-derived from their XP — ranks already earned are never removed.
 */
export async function saveProgressionConfig(user: SessionUser, input: SaveProgressionConfigInput) {
    const db = supabaseAdmin()
    const current = await getProgressionConfig()

    const ordered = current.ranks.map((rank) => {
        const edit = input.ranks.find((r) => r.id === rank.id)
        if (!edit) throw new DataError(`${rank.code}-Rank is missing from the save.`, 'INVALID_RANKS')
        return { ...rank, ...edit, code: rank.code }
    })
    const ladderErrors = validateRankLadder(ordered, input.settings.maxLevel)
    if (ladderErrors.length) throw new DataError(ladderErrors[0], 'INVALID_RANKS', { issues: ladderErrors })

    check(
        await db
            .from('progression_settings')
            .update({
                base_xp: input.settings.baseXp,
                xp_step: input.settings.xpStep,
                max_level: input.settings.maxLevel,
                high_score_threshold: input.settings.highScoreThreshold,
                timezone: input.settings.timezone,
                streak_milestones: [...new Set(input.settings.streakMilestones)].sort((a, b) => a - b),
                updated_at: new Date().toISOString(),
                updated_by: user.id,
            })
            .eq('id', true),
        'save the level formula',
    )

    for (const rank of ordered) {
        check(
            await db
                .from('ranks')
                .update({
                    name: rank.name,
                    description: rank.description,
                    min_level: rank.minLevel,
                    min_average_score: rank.minAverageScore,
                    min_passed_assessments: rank.minPassedAssessments,
                    min_completed_lessons: rank.minCompletedLessons,
                })
                .eq('id', rank.id),
            `save ${rank.code}-Rank`,
        )
    }

    for (const rule of input.xpRules) {
        check(
            await db
                .from('xp_rules')
                .update({ default_xp: rule.defaultXp, min_xp: rule.minXp, max_xp: rule.maxXp })
                .eq('source', rule.source as XpRule['source']),
            'save XP limits',
        )
    }

    const formulaChanged =
        current.settings.baseXp !== input.settings.baseXp ||
        current.settings.xpStep !== input.settings.xpStep ||
        current.settings.maxLevel !== input.settings.maxLevel
    let recalculated = 0
    if (formulaChanged) {
        const result = await db.rpc('recalculate_levels')
        if (result.error) throw toAppError(result.error, 'recalculate levels')
        recalculated = result.data
    }

    await recordAudit(user.id, 'progression.updated', 'progression', null, {
        before: current.settings,
        after: input.settings,
        formulaChanged,
        studentsRecalculated: recalculated,
    })
    return { ...(await getProgressionConfig()), recalculated }
}

// ── Player status ─────────────────────────────────────────────────────────────────────────────────

async function getMasteryStats(studentId: string): Promise<MasteryStats> {
    const result = await supabaseAdmin().rpc('mastery_stats', { p_student_id: studentId })
    if (result.error) throw toAppError(result.error, 'load mastery')
    const o = asObject(result.data)
    return {
        averageScore: Number(o.averageScore ?? 0),
        passedAssessments: Number(o.passedAssessments ?? 0),
        completedLessons: Number(o.completedLessons ?? 0),
    }
}

const mapLedgerEntry = (row: {
    id: number
    amount: number
    source: XpLedgerEntry['source']
    reason: string
    balance_after: number
    activity_id: string | null
    course_id: string | null
    created_at: string
    awarder?: { display_name: string } | null
}): XpLedgerEntry => ({
    id: row.id,
    amount: row.amount,
    source: row.source,
    reason: row.reason,
    balanceAfter: Number(row.balance_after),
    activityId: row.activity_id,
    courseId: row.course_id,
    awardedByName: row.awarder?.display_name ?? null,
    createdAt: new Date(row.created_at),
})

const LEDGER_SELECT =
    'id, amount, source, reason, balance_after, activity_id, course_id, created_at, awarder:profiles!xp_ledger_awarded_by_fkey(display_name)'

/** The dashboard in one call. `recommended` and `activeCourses` come from the quest board. */
export async function getPlayerStatus(
    user: SessionUser,
    questBoard: { quests: Quest[]; courses: PlayerStatus['activeCourses'] },
): Promise<PlayerStatus> {
    const db = supabaseAdmin()
    const [progressRow, profile, ranks, settings, mastery, ledger] = await Promise.all([
        db.from('student_progress').select('total_xp, rank_id').eq('student_id', user.id).maybeSingle(),
        db.from('profiles').select('display_name, equipped_title_id').eq('id', user.id).single(),
        getRanks(),
        getProgressionSettings(),
        getMasteryStats(user.id),
        db
            .from('xp_ledger')
            .select(LEDGER_SELECT)
            .eq('student_id', user.id)
            .order('created_at', { ascending: false })
            .limit(6),
    ])
    const progress = unwrapMaybe(progressRow, 'load your progress')
    const player = unwrap(profile, 'load your profile')
    const rank = ranks.find((r) => r.id === progress?.rank_id) ?? ranks[0]
    if (!rank) throw new NotFoundError('No ranks are configured. Ask an administrator to check the progression rules.')

    const levelProgress = getLevelProgress(Number(progress?.total_xp ?? 0), settings)
    const { playerClass, paths } = await getStudentClass(user.id, player.equipped_title_id)
    const { quests, courses } = questBoard
    const recommended =
        quests.find((q) => q.state === 'in_progress') ??
        quests
            .filter((q) => q.state === 'available')
            .sort(
                (a, b) =>
                    (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) || a.position - b.position,
            )[0] ??
        null

    return {
        player: { id: user.id, displayName: player.display_name },
        progress: levelProgress,
        rank,
        trial: getRankTrial(rank, ranks, levelProgress.level, mastery),
        mastery,
        playerClass,
        paths,
        recentRewards: unwrap(ledger, 'load recent rewards').map(mapLedgerEntry),
        recommended,
        activeCourses: courses,
        settings,
    }
}

export async function getXpHistory(studentId: string, page: number): Promise<Collection<XpLedgerEntry>> {
    const result = await supabaseAdmin()
        .from('xp_ledger')
        .select(LEDGER_SELECT, { count: 'exact' })
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .range((page - 1) * XP_HISTORY_PAGE_SIZE, page * XP_HISTORY_PAGE_SIZE - 1)
    return { records: unwrap(result, 'load XP history').map(mapLedgerEntry), total: result.count ?? 0 }
}

export async function getRankHistory(studentId: string): Promise<RankHistoryEntry[]> {
    const rows = unwrap(
        await supabaseAdmin()
            .from('rank_history')
            .select(
                'id, level_at_promotion, created_at, from:ranks!rank_history_from_rank_id_fkey(code), to:ranks!rank_history_to_rank_id_fkey(code, name)',
            )
            .eq('student_id', studentId)
            .order('created_at', { ascending: false }),
        'load rank history',
    )
    return rows.map((row) => ({
        id: row.id,
        fromRankCode: row.from?.code ?? null,
        toRankCode: row.to?.code ?? '',
        toRankName: row.to?.name ?? '',
        levelAtPromotion: row.level_at_promotion,
        createdAt: new Date(row.created_at),
    }))
}

// ── Manual adjustments (administrators) ───────────────────────────────────────────────────────────

/**
 * Corrects a student's XP (e.g. a reward lost to an outage, or one granted by mistake). Goes through the
 * same ledger as every other award, can't take the balance below zero, and is audited and shown to the
 * student with the reason.
 */
export async function adjustXp(user: SessionUser, input: XpAdjustmentInput, requestId: string): Promise<RewardSummary> {
    const db = supabaseAdmin()
    const student = unwrapMaybe(
        await db.from('profiles').select('id, role').eq('id', input.studentId).maybeSingle(),
        'find the student',
    )
    if (!student || student.role !== 'student')
        throw new NotFoundError('That student doesn’t exist.', 'STUDENT_NOT_FOUND')

    const result = await db.rpc('award_xp', {
        p_student_id: input.studentId,
        p_amount: input.amount,
        p_source: 'manual_adjustment',
        // The browser sends a request id so a double-click or retry applies the adjustment once
        p_idempotency_key: `adjust:${user.id}:${requestId}`,
        p_reason: input.reason,
        p_awarded_by: user.id,
    })
    if (result.error) throw toAppError(result.error, 'adjust XP')
    const o = asObject(result.data)
    if (o.awarded === true) {
        await recordAudit(user.id, 'xp.adjusted', 'student', input.studentId, {
            amount: input.amount,
            reason: input.reason,
        })
        check(
            await db.from('notifications').insert({
                user_id: input.studentId,
                kind: 'xp_adjusted',
                title: `${input.amount > 0 ? '+' : ''}${input.amount} XP adjustment`,
                body: input.reason,
            }),
            'notify the student',
        )
    }
    return summarizeRewards(
        parseSnapshot(o.before),
        parseSnapshot(o.after),
        parseAppliedAwards([
            {
                idempotencyKey: '',
                source: 'manual_adjustment',
                amount: Number(o.amount ?? 0),
                awarded: o.awarded === true,
                promotions: o.promotions ?? [],
                subject: null,
            },
        ]),
    )
}
