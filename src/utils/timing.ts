/*
 * Timed attempts. The server is the clock: it sets `expiresAt` when the attempt starts and refuses
 * answers after expiry + grace. The browser only displays a countdown, corrected for clock skew.
 * ATTEMPT_GRACE_SECONDS mirrors public.attempt_grace() in SQL.
 */

export const ATTEMPT_GRACE_SECONDS = 30

/** True once the attempt can no longer accept answers (expiry + grace has passed) */
export const isPastGrace = (expiresAt: Date | null, now: Date = new Date()) =>
    !!expiresAt && now.getTime() > expiresAt.getTime() + ATTEMPT_GRACE_SECONDS * 1000

/** Whole seconds left on the visible timer (0 when time is up; null when untimed) */
export const secondsRemaining = (expiresAt: Date | null, now: Date = new Date()) =>
    expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)) : null

/** "mm:ss" (or "h:mm:ss" past an hour) */
export function formatCountdown(totalSeconds: number) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Moments a screen reader should announce the time left (seconds) */
export const COUNTDOWN_ANNOUNCEMENTS = [600, 300, 60, 30] as const
