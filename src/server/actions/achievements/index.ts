import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { getXpRules } from '@/server/actions/progression'
import { asObject, parseAppliedAwards, parseSnapshot } from '@/server/actions/progression/mappers'
import { achievementKey, achievementProgress, evaluateAchievement, parseCondition } from '@/utils/achievements'
import { bestStreak } from '@/utils/streaks'
import { clampToRule, summarizeRewards } from '@/utils/progression'
import { ConflictError, NotFoundError } from '@/@types/errors'
import { GRADED_KINDS } from '@/@types/activities/ActivityKindOptions'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { PendingAward } from '@/@types/progression/Progression'
import type {
    AchievementBook,
    AchievementDefinition,
    AchievementUnlock,
    PlayerStats,
    SaveAchievementInput,
} from '@/@types/game/Achievements'

/*
 * Achievements are data: admins define a condition (utils/achievements) and optional XP. After each
 * reward the server gathers the student's stats and grants whatever is newly met through
 * public.grant_achievement — once per student, XP key achievement:<id>:<student>.
 */

const mapDefinition = (row: Tables<'achievement_definitions'>): AchievementDefinition => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon,
    rarity: row.rarity,
    // Stored conditions were validated on save; an unreadable one is shown as unreachable
    condition: parseCondition(row.condition) ?? { type: 'level', min: 500 },
    xpReward: row.xp_reward,
    secret: row.secret,
    active: row.active,
    sortOrder: row.sort_order,
})

export async function getAchievementDefinitions(): Promise<AchievementDefinition[]> {
    return unwrap(
        await supabaseAdmin().from('achievement_definitions').select('*').order('sort_order').order('name'),
        'load achievements',
    ).map(mapDefinition)
}

/** Everything conditions can read about a student */
export async function getPlayerStats(studentId: string): Promise<PlayerStats> {
    const db = supabaseAdmin()
    const [completions, days, discoveries, progress, courses] = await Promise.all([
        db.from('activity_completions').select('kind, passed, best_percent').eq('student_id', studentId),
        db.from('learning_days').select('day').eq('student_id', studentId),
        db.from('egg_discoveries').select('egg_id', { count: 'exact', head: true }).eq('student_id', studentId),
        db
            .from('student_progress')
            .select('level, total_xp, rank:ranks(sort_order)')
            .eq('student_id', studentId)
            .maybeSingle(),
        db.from('course_enrollments').select('course_id', { count: 'exact', head: true }).eq('student_id', studentId),
    ])
    const rows = unwrap(completions, 'load your progress')
    const graded = rows.filter((r) => GRADED_KINDS.includes(r.kind) && r.passed)
    const player = unwrapMaybe(progress, 'load your progress')
    return {
        lessonsCompleted: rows.filter((r) => r.kind === 'lesson').length,
        assessmentsPassed: graded.length,
        perfectScores: graded.filter((r) => Number(r.best_percent ?? 0) >= 100).length,
        bossesDefeated: graded.filter((r) => r.kind === 'boss_battle').length,
        bestStreak: bestStreak(unwrap(days, 'load your streak').map((d) => d.day)),
        teamQuests: rows.filter((r) => r.kind === 'team_quest').length,
        discoveries: discoveries.count ?? 0,
        level: player?.level ?? 1,
        rankOrder: player?.rank?.sort_order ?? 1,
        totalXp: Number(player?.total_xp ?? 0),
        coursesJoined: courses.count ?? 0,
    }
}

/** Grants every achievement the student now qualifies for. Never throws (it follows other actions). */
export async function checkAchievements(studentId: string): Promise<AchievementUnlock[]> {
    const unlocked: AchievementUnlock[] = []
    try {
        const db = supabaseAdmin()
        const [definitions, earned] = await Promise.all([
            db.from('achievement_definitions').select('*').eq('active', true),
            db.from('student_achievements').select('achievement_id').eq('student_id', studentId),
        ])
        const have = new Set(unwrap(earned, 'load your achievements').map((e) => e.achievement_id))
        const candidates = unwrap(definitions, 'load achievements').filter((d) => !have.has(d.id))
        if (!candidates.length) return unlocked
        const stats = await getPlayerStats(studentId)
        const due = candidates.filter((d) => evaluateAchievement(d.condition, stats))
        if (!due.length) return unlocked
        const rule = (await getXpRules()).find((r) => r.source === 'achievement')

        for (const definition of due.sort((a, b) => a.sort_order - b.sort_order)) {
            const amount = definition.xp_reward > 0 ? clampToRule(definition.xp_reward, rule) : 0
            const awards: PendingAward[] = amount
                ? [
                      {
                          amount,
                          source: 'achievement',
                          idempotencyKey: achievementKey(definition.id, studentId),
                          reason: `Achievement: ${definition.name}`,
                      },
                  ]
                : []
            const result = await db.rpc('grant_achievement', {
                p_student_id: studentId,
                p_achievement_id: definition.id,
                p_awards: awards as unknown as Json,
            })
            if (result.error) throw toAppError(result.error, 'grant the achievement')
            const o = asObject(result.data)
            if (o.granted !== true) continue
            unlocked.push({
                id: definition.id,
                name: definition.name,
                description: definition.description,
                icon: definition.icon,
                rarity: definition.rarity,
                reward: awards.length
                    ? summarizeRewards(
                          parseSnapshot(o.before),
                          parseSnapshot(o.after),
                          parseAppliedAwards(o.awards),
                          awards,
                      )
                    : null,
            })
        }
    } catch (error) {
        console.error('[achievements] check failed', studentId, error)
    }
    return unlocked
}

/** Every active achievement as this student sees it; hidden ones stay ??? until earned */
export async function getAchievementBook(studentId: string): Promise<AchievementBook> {
    const db = supabaseAdmin()
    const [definitions, earned, stats] = await Promise.all([
        db.from('achievement_definitions').select('*').eq('active', true).order('sort_order'),
        db.from('student_achievements').select('achievement_id, earned_at').eq('student_id', studentId),
        getPlayerStats(studentId),
    ])
    const earnedAt = new Map(
        unwrap(earned, 'load your achievements').map((e) => [e.achievement_id, new Date(e.earned_at)]),
    )
    const achievements = unwrap(definitions, 'load achievements').map((row) => {
        const def = mapDefinition(row)
        const when = earnedAt.get(def.id) ?? null
        const hidden = def.secret && !when
        return {
            id: def.id,
            name: hidden ? '???' : def.name,
            description: hidden ? 'A hidden achievement. Keep exploring.' : def.description,
            icon: hidden ? 'secret' : def.icon,
            rarity: def.rarity,
            xpReward: def.xpReward,
            earnedAt: when,
            secret: def.secret,
            progress: hidden ? { current: 0, target: 1 } : achievementProgress(def.condition, stats),
        }
    })
    return { achievements, earned: earnedAt.size, total: achievements.length }
}

// ── Administration ────────────────────────────────────────────────────────────────────────────────

const toRow = (input: SaveAchievementInput) => ({
    code: input.code,
    name: input.name,
    description: input.description,
    icon: input.icon,
    rarity: input.rarity,
    condition: input.condition as unknown as Json,
    xp_reward: input.xpReward,
    secret: input.secret,
    active: input.active,
    sort_order: input.sortOrder,
})

export async function createAchievement(user: SessionUser, input: SaveAchievementInput) {
    const result = await supabaseAdmin().from('achievement_definitions').insert(toRow(input)).select('*').single()
    if (result.error?.code === '23505')
        throw new ConflictError('An achievement already uses that code.', 'DUPLICATE_CODE')
    const row = unwrap(result, 'create the achievement')
    await recordAudit(user.id, 'achievement.created', 'achievement', row.id, { code: row.code })
    return mapDefinition(row)
}

/** Editing keeps what students have already earned (the code is fixed once created) */
export async function updateAchievement(user: SessionUser, achievementId: string, input: SaveAchievementInput) {
    const existing = unwrapMaybe(
        await supabaseAdmin().from('achievement_definitions').select('code').eq('id', achievementId).maybeSingle(),
        'load the achievement',
    )
    if (!existing) throw new NotFoundError('That achievement doesn’t exist.', 'ACHIEVEMENT_NOT_FOUND')
    const row = unwrap(
        await supabaseAdmin()
            .from('achievement_definitions')
            .update({ ...toRow(input), code: existing.code })
            .eq('id', achievementId)
            .select('*')
            .single(),
        'update the achievement',
    )
    await recordAudit(user.id, 'achievement.updated', 'achievement', achievementId, { code: row.code })
    return mapDefinition(row)
}

export async function deleteAchievement(user: SessionUser, achievementId: string) {
    check(
        await supabaseAdmin().from('achievement_definitions').delete().eq('id', achievementId),
        'delete the achievement',
    )
    await recordAudit(user.id, 'achievement.deleted', 'achievement', achievementId, {})
}
