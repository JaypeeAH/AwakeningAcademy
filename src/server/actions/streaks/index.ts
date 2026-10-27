import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { getProgressionSettings, getXpRules } from '@/server/actions/progression'
import { asObject, parseAppliedAwards, parseSnapshot } from '@/server/actions/progression/mappers'
import { summarizeRewards } from '@/utils/progression'
import { skillCharges } from '@/utils/skills'
import {
    addDays,
    bestStreak,
    currentStreak,
    localDay,
    nextMilestone,
    reachedMilestones,
    shieldableDay,
} from '@/utils/streaks'
import { ConflictError } from '@/@types/errors'
import type { Json } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { PendingAward } from '@/@types/progression/Progression'
import type { StreakStatus, StreakUpdate } from '@/@types/progression/Streak'

/*
 * Learning streaks: a day counts when the student completes a lesson or hands in an attempt, in the
 * school's time zone. Each milestone (3, 7, 14… days, set by the admin) pays streak XP once, ever
 * (key streak:<student>:<days>). Second Chance can fill one missed day.
 */

/** The student's learning days (YYYY-MM-DD), newest first, for the last ~13 months */
export async function getLearningDays(studentId: string) {
    const since = new Date(Date.now() - 400 * 24 * 3600_000).toISOString().slice(0, 10)
    return unwrap(
        await supabaseAdmin()
            .from('learning_days')
            .select('day, shielded')
            .eq('student_id', studentId)
            .gte('day', since)
            .order('day', { ascending: false }),
        'load your learning days',
    )
}

export const streakKey = (studentId: string, days: number) => `streak:${studentId}:${days}`

/** Records today as a learning day and pays any streak milestone reached for the first time */
export async function recordLearning(studentId: string): Promise<StreakUpdate> {
    const settings = await getProgressionSettings()
    const today = localDay(new Date(), settings.timezone)
    const db = supabaseAdmin()
    const recorded = await db.rpc('record_learning_day', { p_student_id: studentId, p_day: today })
    if (recorded.error) throw toAppError(recorded.error, 'record your learning day')

    const days = (await getLearningDays(studentId)).map((d) => d.day)
    const current = currentStreak(days, today)
    const update: StreakUpdate = {
        current,
        best: bestStreak(days),
        isNewDay: recorded.data === true,
        milestoneRewards: [],
    }
    const reached = reachedMilestones(current, settings.streakMilestones)
    if (!reached.length) return update

    const paid = new Set(
        unwrap(
            await db
                .from('xp_ledger')
                .select('idempotency_key')
                .eq('student_id', studentId)
                .like('idempotency_key', `streak:${studentId}:%`),
            'check streak rewards',
        ).map((r) => r.idempotency_key),
    )
    const rule = (await getXpRules()).find((r) => r.source === 'streak')
    if (!rule || rule.defaultXp <= 0) return update
    for (const milestone of reached.filter((m) => !paid.has(streakKey(studentId, m)))) {
        const award: PendingAward = {
            amount: rule.defaultXp,
            source: 'streak',
            idempotencyKey: streakKey(studentId, milestone),
            reason: `${milestone}-day learning streak`,
        }
        const result = await db.rpc('award_xp', {
            p_student_id: studentId,
            p_amount: award.amount,
            p_source: award.source,
            p_idempotency_key: award.idempotencyKey,
            p_reason: award.reason,
        })
        if (result.error) throw toAppError(result.error, 'award the streak')
        const o = asObject(result.data)
        if (o.awarded !== true) continue
        const applied = parseAppliedAwards([
            { ...o, idempotencyKey: award.idempotencyKey, source: award.source },
        ] as Json)
        update.milestoneRewards.push({
            days: milestone,
            reward: summarizeRewards(parseSnapshot(o.before), parseSnapshot(o.after), applied, [award]),
        })
    }
    return update
}

async function secondChanceCharged(studentId: string) {
    const db = supabaseAdmin()
    const skill = unwrapMaybe(
        await db
            .from('skill_definitions')
            .select('id, charges, recharge_hours, enabled')
            .eq('code', 'second_chance')
            .maybeSingle(),
        'load Second Chance',
    )
    if (!skill?.enabled) return false
    const [owned, uses] = await Promise.all([
        db.from('student_skills').select('skill_id').eq('student_id', studentId).eq('skill_id', skill.id).maybeSingle(),
        db
            .from('skill_usages')
            .select('created_at')
            .eq('student_id', studentId)
            .eq('skill_id', skill.id)
            .gte('created_at', new Date(Date.now() - skill.recharge_hours * 3600_000).toISOString()),
    ])
    if (!unwrapMaybe(owned, 'check your skills')) return false
    const used = unwrap(uses, 'check Second Chance').map((u) => new Date(u.created_at))
    return skillCharges({ charges: skill.charges, rechargeHours: skill.recharge_hours }, used).chargesLeft > 0
}

export async function getStreak(studentId: string): Promise<StreakStatus> {
    const settings = await getProgressionSettings()
    const today = localDay(new Date(), settings.timezone)
    const rows = await getLearningDays(studentId)
    const days = rows.map((r) => r.day)
    const current = currentStreak(days, today)
    const shieldable = shieldableDay(days, today)
    return {
        current,
        best: bestStreak(days),
        today,
        learnedToday: days.includes(today),
        shieldableDay: shieldable,
        canShield: !!shieldable && (await secondChanceCharged(studentId)),
        nextMilestone: nextMilestone(current, settings.streakMilestones),
        milestones: settings.streakMilestones,
        recent: Array.from({ length: 14 }, (_, i) => {
            const day = addDays(today, i - 13)
            const row = rows.find((r) => r.day === day)
            return { day, learned: !!row && !row.shielded, shielded: !!row?.shielded }
        }),
    }
}

/** Spends a Second Chance to fill yesterday, keeping the streak alive */
export async function shieldStreak(user: SessionUser): Promise<StreakStatus> {
    const settings = await getProgressionSettings()
    const today = localDay(new Date(), settings.timezone)
    const day = shieldableDay(
        (await getLearningDays(user.id)).map((d) => d.day),
        today,
    )
    if (!day) throw new ConflictError('There’s no missed day to protect right now.', 'NOTHING_TO_SHIELD')
    const result = await supabaseAdmin().rpc('shield_streak', {
        p_student_id: user.id,
        p_day: day,
        p_idempotency_key: `shield:${user.id}:${day}`,
    })
    if (result.error) throw toAppError(result.error, 'protect your streak')
    return getStreak(user.id)
}
