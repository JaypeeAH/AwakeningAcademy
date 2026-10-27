import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap } from '@/server/data/supabase/errors'
import { getProgressionSettings } from '@/server/actions/progression'
import { requireCourseAccess } from '@/server/actions/courses/access'
import { buildLeaderboard, rankByXp } from '@/utils/leaderboard'
import { weekWindow } from '@/utils/streaks'
import { GUILD_EMBLEMS, type GuildEmblem, type Leaderboard, type LeaderboardMode } from '@/@types/game/Guilds'
import type { SessionUser } from '@/@types/auth/SessionUser'

/*
 * Weekly course leaderboards. Off unless the teacher turns them on; then only XP earned in the course this
 * week (never scores or answers), labelled with initials or display names. Students can hide themselves.
 * Ranked on the server; other students' ids never reach the browser.
 */

const modeOf = (value: string): LeaderboardMode => (value === 'initials' || value === 'names' ? value : 'off')

export async function getCourseLeaderboard(user: SessionUser, courseId: string): Promise<Leaderboard> {
    const { course } = await requireCourseAccess(user, courseId)
    const mode = modeOf(course.leaderboard_mode)
    const { timezone } = await getProgressionSettings()
    const week = weekWindow(new Date(), timezone)
    const db = supabaseAdmin()

    const window = await db.rpc('course_leaderboard', {
        p_course_id: courseId,
        p_from: week.start.toISOString(),
        p_to: week.end.toISOString(),
    })
    if (window.error) throw toAppError(window.error, 'load the leaderboard')
    // Set-returning functions aren't described by the generated types
    const xpRows = (window.data ?? []) as unknown as { student_id: string; xp: number | string }[]
    const ids = [...new Set([...xpRows.map((r) => r.student_id), user.id])]
    const [profiles, best, guilds, members] = await Promise.all([
        db.from('profiles').select('id, display_name, leaderboard_hidden').in('id', ids),
        db.rpc('personal_best_week', { p_student_id: user.id, p_course_id: courseId, p_timezone: timezone }),
        mode === 'off'
            ? null
            : db.from('guilds').select('id, name, emblem').eq('course_id', courseId).eq('status', 'active'),
        mode === 'off'
            ? null
            : db.from('guild_members').select('guild_id, student_id').eq('course_id', courseId).eq('status', 'active'),
    ])
    const people = unwrap(profiles, 'load the leaderboard')
    const rows = ids.map((id) => {
        const person = people.find((p) => p.id === id)
        return {
            studentId: id,
            displayName: person?.display_name ?? 'Student',
            hidden: person?.leaderboard_hidden ?? false,
            xp: Number(xpRows.find((r) => r.student_id === id)?.xp ?? 0),
        }
    })
    const board = buildLeaderboard(rows, mode, user.id)
    if (best.error) throw toAppError(best.error, 'load your best week')
    const bestRow = ((best.data ?? []) as unknown as { week_start: string; xp: number | string }[])[0]

    // Guild totals: every active member's XP this week (guild names are shown; members aren't)
    const memberRows = members ? unwrap(members, 'load guilds') : []
    const guildTotals = (guilds ? unwrap(guilds, 'load guilds') : []).map((g) => ({
        id: g.id,
        name: g.name,
        emblem: ((GUILD_EMBLEMS as readonly string[]).includes(g.emblem) ? g.emblem : 'shield') as GuildEmblem,
        xp: memberRows
            .filter((m) => m.guild_id === g.id)
            .reduce((sum, m) => sum + Number(xpRows.find((r) => r.student_id === m.student_id)?.xp ?? 0), 0),
        isYours: memberRows.some((m) => m.guild_id === g.id && m.student_id === user.id),
    }))

    return {
        mode,
        weekStart: week.start,
        weekEnd: week.end,
        entries: board.entries,
        guilds: rankByXp(guildTotals.filter((g) => g.xp > 0)).map((g, i) => ({
            key: `g${i}`,
            position: g.position,
            name: g.name,
            emblem: g.emblem,
            xp: g.xp,
            isYours: g.isYours,
        })),
        me: {
            ...board.me,
            bestWeek: bestRow ? { weekStart: String(bestRow.week_start).slice(0, 10), xp: Number(bestRow.xp) } : null,
        },
    }
}

/** A student's choice to stay off every leaderboard */
export async function setLeaderboardHidden(user: SessionUser, hidden: boolean) {
    check(
        await supabaseAdmin().from('profiles').update({ leaderboard_hidden: hidden }).eq('id', user.id),
        'save your choice',
    )
    return { hidden }
}
