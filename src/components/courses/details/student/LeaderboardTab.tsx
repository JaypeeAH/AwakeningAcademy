'use client'

import Link from 'next/link'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import StatTile from '@/components/shared/StatTile'
import SystemPanel from '@/components/game/SystemPanel'
import { XpReward } from '@/components/game/GameTags'
import { LeaderboardSWRProvider } from './StudentSocialSWRProviders'
import navigationIcon, { guildEmblemIcon } from '@/configs/icons.config'
import { profilePath } from '@/configs/app.config'
import { useLeaderboardStore } from '@/stores/GameStores'
import { formatDate } from '@/utils/dates'
import classNames from '@/utils/classNames'

const ROW = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm'

/**
 * This week's leaderboard: only XP earned in this course this week — never scores or answers — shown
 * as the teacher chose (initials or display names). Off unless the teacher turns it on.
 */
export default function LeaderboardTab({ courseId }: { courseId: string }) {
    const board = useLeaderboardStore(courseId, (s) => s.data)
    const error = useLeaderboardStore(courseId, (s) => s.error)
    const refresh = useLeaderboardStore(courseId, (s) => s.refresh)

    const content = () => {
        if (!board) {
            return error ? (
                <ErrorState message={error} onRetry={() => void refresh()} />
            ) : (
                <Loading loading message="Loading the leaderboard…" />
            )
        }
        // The window ends at next Monday 00:00 (exclusive): show Sunday as the last day
        const week = `${formatDate(board.weekStart)} – ${formatDate(new Date(board.weekEnd.getTime() - 1))}`
        const privacyNote = (
            <p className="text-xs text-gray-500">
                Only XP earned in this course this week is shown — never scores or answers. Prefer not to appear? Change
                it in your{' '}
                <Link href={profilePath} className="text-primary underline">
                    profile
                </Link>
                .
            </p>
        )

        if (board.mode === 'off') {
            return (
                <EmptyState
                    icon={navigationIcon.leaderboard}
                    title="The leaderboard is off"
                    description="Your teacher hasn’t turned on the leaderboard for this course."
                />
            )
        }

        return (
            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                    <StatTile label="Your XP this week" value={board.me.xp.toLocaleString()} />
                    <StatTile
                        label="Your position"
                        value={board.me.hidden ? 'Hidden' : board.me.position ? `#${board.me.position}` : '—'}
                    />
                    <StatTile
                        label="Your best week"
                        value={board.me.bestWeek ? `${board.me.bestWeek.xp.toLocaleString()} XP` : '—'}
                        hint={board.me.bestWeek ? `Week of ${formatDate(board.me.bestWeek.weekStart)}` : undefined}
                    />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <SystemPanel eyebrow={week} title="This week’s top learners">
                        {board.entries.length === 0 ? (
                            <p className="text-sm text-gray-500">No XP earned yet this week. Be the first!</p>
                        ) : (
                            <ol className="space-y-1">
                                {board.entries.map((entry) => (
                                    <li
                                        key={entry.key}
                                        className={classNames(
                                            ROW,
                                            entry.isYou
                                                ? 'bg-primary-subtle font-semibold text-primary'
                                                : 'bg-gray-50 dark:bg-gray-900',
                                        )}
                                        aria-current={entry.isYou ? 'true' : undefined}
                                    >
                                        <span className="w-8 shrink-0 font-display font-bold tabular-nums">
                                            #{entry.position}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                                        <XpReward amount={entry.xp} className="shrink-0" />
                                    </li>
                                ))}
                            </ol>
                        )}
                        {board.me.hidden && (
                            <p className="mt-3 text-xs text-gray-500">
                                You’ve chosen to stay off leaderboards, so you’re not listed.
                            </p>
                        )}
                    </SystemPanel>

                    <SystemPanel eyebrow={week} title="Guilds">
                        {board.guilds.length === 0 ? (
                            <p className="text-sm text-gray-500">No guild has earned XP yet this week.</p>
                        ) : (
                            <ol className="space-y-1">
                                {board.guilds.map((guild) => (
                                    <li
                                        key={guild.key}
                                        className={classNames(
                                            ROW,
                                            guild.isYours
                                                ? 'bg-primary-subtle font-semibold text-primary'
                                                : 'bg-gray-50 dark:bg-gray-900',
                                        )}
                                    >
                                        <span className="w-8 shrink-0 font-display font-bold tabular-nums">
                                            #{guild.position}
                                        </span>
                                        <span className="text-lg text-primary" aria-hidden>
                                            {guildEmblemIcon[guild.emblem] ?? guildEmblemIcon.shield}
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                            {guild.name}
                                            {guild.isYours && ' (yours)'}
                                        </span>
                                        <XpReward amount={guild.xp} className="shrink-0" />
                                    </li>
                                ))}
                            </ol>
                        )}
                    </SystemPanel>
                </div>
                {privacyNote}
            </div>
        )
    }

    return (
        <>
            <LeaderboardSWRProvider courseId={courseId} />
            {content()}
        </>
    )
}
