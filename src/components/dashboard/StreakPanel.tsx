'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Tooltip from '@/components/ui/Tooltip'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import SystemPanel from '@/components/game/SystemPanel'
import { SecondChanceIcon, StreakIcon } from '@/configs/icons.config'
import { apiShieldStreak, useSWRStreak } from '@/services/social'
import { useStreakStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { formatDate } from '@/utils/dates'
import classNames from '@/utils/classNames'

function StreakSWRProvider() {
    const swr = useSWRStreak()
    const setData = useStreakStore((s) => s.setData)
    const setLoading = useStreakStore((s) => s.setLoading)
    const setError = useStreakStore((s) => s.setError)
    const setRefresh = useStreakStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

const weekday = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' })

/** Days in a row of learning, the last two weeks, and a Second Chance to save a broken streak */
export default function StreakPanel() {
    const streak = useStreakStore((s) => s.data)
    const setData = useStreakStore((s) => s.setData)
    const [confirming, setConfirming] = useState(false)
    const [shielding, setShielding] = useState(false)

    const shield = async () => {
        setShielding(true)
        try {
            setData(await apiShieldStreak())
            toastSuccess('Streak protected! Learn today to keep it growing.')
            setConfirming(false)
        } catch (error) {
            toastError('Couldn’t protect your streak.', error)
        } finally {
            setShielding(false)
        }
    }

    return (
        <>
            <StreakSWRProvider />
            {streak && (
                <SystemPanel
                    eyebrow="Learning streak"
                    title={
                        <span className="flex items-center gap-2">
                            <StreakIcon aria-hidden className={streak.current > 0 ? 'text-warning' : 'text-gray-400'} />
                            {streak.current} {streak.current === 1 ? 'day' : 'days'}
                        </span>
                    }
                >
                    <ol className="grid grid-cols-7 gap-1.5" aria-label="The last 14 days">
                        {streak.recent.map((d) => (
                            <li key={d.day}>
                                <Tooltip
                                    title={`${formatDate(`${d.day}T12:00:00Z`)}: ${d.learned ? 'learned' : d.shielded ? 'protected by Second Chance' : 'no learning'}`}
                                >
                                    <span
                                        className={classNames(
                                            'flex h-8 items-center justify-center rounded-md text-[11px] font-semibold',
                                            d.learned
                                                ? 'bg-warning text-neutral'
                                                : d.shielded
                                                  ? 'border border-dashed border-warning bg-warning-subtle text-warning'
                                                  : 'bg-gray-100 text-gray-400 dark:bg-gray-700',
                                            d.day === streak.today && 'ring-2 ring-primary',
                                        )}
                                    >
                                        {weekday(d.day)}
                                        <span className="sr-only">
                                            {d.learned ? ' learned' : d.shielded ? ' protected' : ' no learning'}
                                        </span>
                                    </span>
                                </Tooltip>
                            </li>
                        ))}
                    </ol>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                        {streak.learnedToday
                            ? 'You’ve learned today — nice!'
                            : streak.current > 0
                              ? 'Complete a lesson or quiz today to keep your streak going.'
                              : 'Complete a lesson or quiz today to start a streak.'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Best: {streak.best} {streak.best === 1 ? 'day' : 'days'}
                        {streak.nextMilestone !== null &&
                            ` · ${streak.nextMilestone - streak.current} more to the ${streak.nextMilestone}-day reward`}
                    </p>
                    {streak.shieldableDay && streak.canShield && (
                        <Button
                            className="mt-4"
                            size="sm"
                            icon={<SecondChanceIcon />}
                            onClick={() => setConfirming(true)}
                        >
                            Protect your streak
                        </Button>
                    )}
                </SystemPanel>
            )}
            <ConfirmDialog
                isOpen={confirming}
                onClose={() => setConfirming(false)}
                title="Protect your streak?"
                confirmText="Use Second Chance"
                onConfirm={shield}
                loading={shielding}
            >
                <p>
                    You missed {streak?.shieldableDay ? formatDate(`${streak.shieldableDay}T12:00:00Z`) : 'yesterday'}.
                    This uses one Second Chance charge to fill that day, so your streak carries on. The charge recharges
                    over time.
                </p>
            </ConfirmDialog>
        </>
    )
}
