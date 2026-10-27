import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { getXpRules } from '@/server/actions/progression'
import { asObject, parseAppliedAwards } from '@/server/actions/progression/mappers'
import { clampToRule } from '@/utils/progression'
import { parseTeamConfig, teamQuestKey, teamQuestProgress, type MemberCompletion } from '@/utils/teamQuests'
import { GRADED_KINDS } from '@/@types/activities/ActivityKindOptions'
import type { Json } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { PendingAward } from '@/@types/progression/Progression'
import type { GuildEmblem, TeamQuestReward, TeamQuestStatus } from '@/@types/game/Guilds'

/*
 * Team quests: a guild goal over other activities in the course. After a member's progress changes the
 * server checks their guilds' team quests (utils/teamQuests) and completes any now met through
 * public.complete_team_quest, which rewards every active member once.
 */

async function memberCompletions(memberIds: string[], activityIds: string[]): Promise<MemberCompletion[]> {
    if (!memberIds.length || !activityIds.length) return []
    return unwrap(
        await supabaseAdmin()
            .from('activity_completions')
            .select('student_id, activity_id, kind, passed')
            .in('student_id', memberIds)
            .in('activity_id', activityIds),
        'load guild progress',
    ).map((c) => ({
        studentId: c.student_id,
        activityId: c.activity_id,
        passed: c.passed,
        graded: GRADED_KINDS.includes(c.kind),
    }))
}

/** Completes any team quest the student's guilds have now achieved. Never throws. */
export async function checkTeamQuests(studentId: string): Promise<TeamQuestReward[]> {
    const rewards: TeamQuestReward[] = []
    try {
        const db = supabaseAdmin()
        const memberships = unwrap(
            await db
                .from('guild_members')
                .select('guild_id, course_id, guild:guilds!inner(name, status)')
                .eq('student_id', studentId)
                .eq('status', 'active')
                .eq('guild.status', 'active'),
            'load your guilds',
        )
        if (!memberships.length) return rewards
        const rule = (await getXpRules()).find((r) => r.source === 'team_quest')

        for (const membership of memberships) {
            const [quests, done, members] = await Promise.all([
                db
                    .from('activities')
                    .select('id, title, xp_reward, team_config')
                    .eq('course_id', membership.course_id)
                    .eq('kind', 'team_quest')
                    .eq('status', 'published'),
                db.from('team_quest_completions').select('activity_id').eq('guild_id', membership.guild_id),
                db
                    .from('guild_members')
                    .select('student_id')
                    .eq('guild_id', membership.guild_id)
                    .eq('status', 'active'),
            ])
            const finished = new Set(unwrap(done, 'load team quests').map((d) => d.activity_id))
            const memberIds = unwrap(members, 'load guild members').map((m) => m.student_id)
            for (const quest of unwrap(quests, 'load team quests').filter((q) => !finished.has(q.id))) {
                const config = parseTeamConfig(quest.team_config)
                if (!config) continue
                const progress = teamQuestProgress(
                    config,
                    memberIds,
                    await memberCompletions(memberIds, config.activityIds),
                )
                if (!progress.complete) continue

                const amount = clampToRule(quest.xp_reward, rule)
                const awardsFor = (id: string): PendingAward[] =>
                    amount > 0
                        ? [
                              {
                                  amount,
                                  source: 'team_quest',
                                  idempotencyKey: teamQuestKey(quest.id, id),
                                  reason: `Team quest “${quest.title}”`,
                              },
                          ]
                        : []
                const result = await db.rpc('complete_team_quest', {
                    p_guild_id: membership.guild_id,
                    p_activity_id: quest.id,
                    p_members: memberIds.map((id) => ({ studentId: id, awards: awardsFor(id) })) as unknown as Json,
                })
                if (result.error) throw toAppError(result.error, 'complete the team quest')
                const o = asObject(result.data)
                if (o.completed !== true) continue
                const mine = (Array.isArray(o.results) ? o.results : [])
                    .map(asObject)
                    .find((r) => r.studentId === studentId)
                rewards.push({
                    activityId: quest.id,
                    title: quest.title,
                    guildName: membership.guild?.name ?? 'Your guild',
                    xpGained: parseAppliedAwards(mine?.awards)
                        .filter((a) => a.awarded)
                        .reduce((sum, a) => sum + a.amount, 0),
                })
            }
        }
    } catch (error) {
        console.error('[team quests] check failed', studentId, error)
    }
    return rewards
}

/** A team quest's progress for the student's guild (the play view) */
export async function getTeamQuestStatus(
    user: SessionUser,
    activity: { id: string; course_id: string; team_config: Json | null },
): Promise<TeamQuestStatus> {
    const db = supabaseAdmin()
    const config = parseTeamConfig(activity.team_config)
    const targets = config
        ? unwrap(await db.from('activities').select('id, title').in('id', config.activityIds), 'load the team quest')
        : []
    const membership = unwrapMaybe(
        await db
            .from('guild_members')
            .select('guild_id, guild:guilds!inner(id, name, emblem, status)')
            .eq('course_id', activity.course_id)
            .eq('student_id', user.id)
            .eq('status', 'active')
            .eq('guild.status', 'active')
            .maybeSingle(),
        'load your guild',
    )
    const base = {
        targets: (config?.activityIds ?? []).map((id) => ({
            id,
            title: targets.find((t) => t.id === id)?.title ?? 'Activity',
        })),
    }
    if (!membership?.guild || !config) return { ...base, guild: null, required: 0, members: [], completedAt: null }

    const [members, completion] = await Promise.all([
        db
            .from('guild_members')
            .select('student_id, profile:profiles!guild_members_student_id_fkey(display_name)')
            .eq('guild_id', membership.guild_id)
            .eq('status', 'active'),
        db
            .from('team_quest_completions')
            .select('completed_at')
            .eq('guild_id', membership.guild_id)
            .eq('activity_id', activity.id)
            .maybeSingle(),
    ])
    const memberRows = unwrap(members, 'load guild members') as unknown as {
        student_id: string
        profile: { display_name: string } | null
    }[]
    const progress = teamQuestProgress(
        config,
        memberRows.map((m) => m.student_id),
        await memberCompletions(
            memberRows.map((m) => m.student_id),
            config.activityIds,
        ),
    )
    const done = unwrapMaybe(completion, 'load the team quest')
    return {
        ...base,
        guild: { id: membership.guild.id, name: membership.guild.name, emblem: membership.guild.emblem as GuildEmblem },
        required: progress.required,
        members: progress.members.map((m) => ({
            displayName: memberRows.find((r) => r.student_id === m.studentId)?.profile?.display_name ?? 'Student',
            isYou: m.studentId === user.id,
            done: m.done,
            total: m.total,
            complete: m.complete,
        })),
        completedAt: done ? new Date(done.completed_at) : null,
    }
}
