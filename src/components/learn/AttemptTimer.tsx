'use client'

import { useEffect, useRef, useState } from 'react'
import { TimerIcon } from '@/configs/icons.config'
import { COUNTDOWN_ANNOUNCEMENTS, formatCountdown, secondsRemaining } from '@/utils/timing'
import classNames from '@/utils/classNames'

interface AttemptTimerProps {
    expiresAt: Date
    /** Server time when the attempt was sent — corrects a wrong device clock */
    serverNow: Date
    onExpire: () => void
}

/**
 * Countdown for a timed attempt. The server enforces the deadline; this display is corrected for the
 * device's clock, announces key moments to screen readers, and calls `onExpire` once at zero. No
 * flashing — the urgency is shown with colour and words (fine under reduced motion).
 */
export default function AttemptTimer({ expiresAt, serverNow, onExpire }: AttemptTimerProps) {
    // How far the device clock is from the server's, measured once when the attempt arrived
    const [offset] = useState(() => serverNow.getTime() - Date.now())
    const [left, setLeft] = useState(() => secondsRemaining(expiresAt, new Date(Date.now() + offset)) ?? 0)
    const [announcement, setAnnouncement] = useState('')
    const expired = useRef(false)

    useEffect(() => {
        const tick = () => {
            const remaining = secondsRemaining(expiresAt, new Date(Date.now() + offset)) ?? 0
            setLeft(remaining)
            const mark = COUNTDOWN_ANNOUNCEMENTS.find((s) => s === remaining)
            if (mark) setAnnouncement(mark >= 60 ? `${mark / 60} minutes left` : `${mark} seconds left`)
            if (remaining <= 0 && !expired.current) {
                expired.current = true
                setAnnouncement('Time is up. Handing in your answers.')
                onExpire()
            }
        }
        const timer = setInterval(tick, 1000)
        return () => clearInterval(timer)
    }, [expiresAt, offset, onExpire])

    const urgent = left <= 60
    const warning = left <= 300
    return (
        <div
            className={classNames(
                'flex items-center gap-2 rounded-xl border px-3 py-2 font-semibold tabular-nums',
                urgent
                    ? 'border-error bg-error-subtle text-error'
                    : warning
                      ? 'border-warning bg-warning-subtle text-warning'
                      : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200',
            )}
        >
            <TimerIcon aria-hidden />
            <span aria-hidden>{formatCountdown(left)}</span>
            <span className="sr-only" role="timer">
                {Math.ceil(left / 60)} minutes left
            </span>
            <span className="sr-only" aria-live="assertive">
                {announcement}
            </span>
        </div>
    )
}
