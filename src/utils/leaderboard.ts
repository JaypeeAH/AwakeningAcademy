import type { LeaderboardEntry, LeaderboardMode } from '@/@types/game/Guilds'

/*
 * Leaderboards put learners' privacy first: off by default; when on, only XP earned this week (never
 * scores or answers), shown with initials or display names as the teacher chooses. Students who hide
 * themselves aren't listed for anyone else. Other students' ids never leave the server.
 */

export interface LeaderboardRow {
    studentId: string
    displayName: string
    xp: number
    hidden: boolean
}

/** "Jordan Lee" → "J. L."; one word → "J." */
export const initialsOf = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((part) => `${part[0]!.toUpperCase()}.`)
        .join(' ') || '?'

/** Standard competition ranking: equal XP shares a position (1, 2, 2, 4) */
export function rankByXp<T extends { xp: number }>(rows: T[]): (T & { position: number })[] {
    const sorted = [...rows].sort((a, b) => b.xp - a.xp)
    let position = 0
    return sorted.map((row, i) => {
        if (i === 0 || sorted[i - 1].xp !== row.xp) position = i + 1
        return { ...row, position }
    })
}

export function buildLeaderboard(
    rows: LeaderboardRow[],
    mode: LeaderboardMode,
    viewerId: string,
    limit = 20,
): { entries: LeaderboardEntry[]; me: { xp: number; position: number | null; hidden: boolean } } {
    const mine = rows.find((r) => r.studentId === viewerId)
    const me = { xp: mine?.xp ?? 0, position: null as number | null, hidden: mine?.hidden ?? false }
    if (mode === 'off') return { entries: [], me }

    const visible = rankByXp(rows.filter((r) => r.xp > 0 && !r.hidden))
    me.position = visible.find((r) => r.studentId === viewerId)?.position ?? null
    const label = (row: LeaderboardRow) => (mode === 'names' ? row.displayName : initialsOf(row.displayName))
    const entries = visible.slice(0, limit).map((row, i) => ({
        key: `p${i}`,
        position: row.position,
        label: row.studentId === viewerId ? `${label(row)} (you)` : label(row),
        xp: row.xp,
        isYou: row.studentId === viewerId,
    }))
    return { entries, me }
}
