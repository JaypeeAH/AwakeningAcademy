import { currentStreak } from './secrets'

/*
 * Learning streaks and weekly windows, in the school's time zone (progression_settings.timezone). A
 * "day" is a local calendar date (YYYY-MM-DD); weeks start on Monday at local midnight.
 */

export { currentStreak }

/** Whether the name is a time zone this runtime knows (Intl) */
export function isValidTimeZone(timeZone: string) {
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(0)
        return true
    } catch {
        return false
    }
}

/** The local calendar date of an instant, as YYYY-MM-DD */
export const localDay = (date: Date, timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

export function addDays(day: string, delta: number) {
    const d = new Date(`${day}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + delta)
    return d.toISOString().slice(0, 10)
}

/** Longest run of consecutive days ever */
export function bestStreak(days: string[]) {
    const sorted = [...new Set(days)].sort()
    let best = 0
    let run = 0
    sorted.forEach((day, i) => {
        run = i > 0 && addDays(sorted[i - 1], 1) === day ? run + 1 : 1
        best = Math.max(best, run)
    })
    return best
}

/** Milestones the current streak has reached (each is rewarded once, ever) */
export const reachedMilestones = (streak: number, milestones: number[]) =>
    [...new Set(milestones)].filter((m) => m > 0 && streak >= m).sort((a, b) => a - b)

export const nextMilestone = (streak: number, milestones: number[]) =>
    [...milestones].sort((a, b) => a - b).find((m) => m > streak) ?? null

/**
 * The missed day a Second Chance can fill: yesterday, when it's empty and the day before it was a
 * learning day (so filling it keeps the streak alive). null when there's nothing to protect.
 */
export function shieldableDay(days: string[], today: string): string | null {
    const set = new Set(days)
    const yesterday = addDays(today, -1)
    if (set.has(yesterday)) return null
    return set.has(addDays(today, -2)) ? yesterday : null
}

/** Minutes the zone is ahead of UTC at an instant */
function offsetMinutes(at: Date, timeZone: string) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-US', {
            timeZone,
            hourCycle: 'h23',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        })
            .formatToParts(at)
            .map((p) => [p.type, p.value]),
    )
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
    return Math.round((asUtc - at.getTime()) / 60000)
}

/** The instant local midnight starts on a day (correct across daylight-saving changes) */
export function startOfLocalDay(day: string, timeZone: string): Date {
    const guess = new Date(`${day}T00:00:00Z`)
    let instant = new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000)
    // The offset can differ at the actual instant (a DST change that day): correct once
    instant = new Date(guess.getTime() - offsetMinutes(instant, timeZone) * 60000)
    return instant
}

/** This week (Monday 00:00 → next Monday 00:00, local time) as instants */
export function weekWindow(now: Date, timeZone: string) {
    const today = localDay(now, timeZone)
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() // 0 = Sunday
    const monday = addDays(today, -((weekday + 6) % 7))
    return {
        startDay: monday,
        start: startOfLocalDay(monday, timeZone),
        end: startOfLocalDay(addDays(monday, 7), timeZone),
    }
}
