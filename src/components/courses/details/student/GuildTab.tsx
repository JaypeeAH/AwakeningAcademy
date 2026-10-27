'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import SystemPanel from '@/components/game/SystemPanel'
import FoundGuildDialog from './FoundGuildDialog'
import { StudentGuildsSWRProvider } from './StudentSocialSWRProviders'
import navigationIcon, { AddIcon, guildEmblemIcon, RankIcon } from '@/configs/icons.config'
import { apiLeaveGuild, apiRequestToJoin } from '@/services/social'
import { useCourseGuildsStore } from '@/stores/GameStores'
import classNames from '@/utils/classNames'
import type { Guild } from '@/@types/game/Guilds'

const Emblem = ({ guild, className }: { guild: Pick<Guild, 'emblem'>; className?: string }) => (
    <span
        className={classNames(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-subtle text-2xl text-primary',
            className,
        )}
        aria-hidden
    >
        {guildEmblemIcon[guild.emblem] ?? guildEmblemIcon.shield}
    </span>
)

/** The student's guild in this course: their own (or request), the others to join, or founding one */
export default function GuildTab({ courseId }: { courseId: string }) {
    const data = useCourseGuildsStore(courseId, (s) => s.data)
    const error = useCourseGuildsStore(courseId, (s) => s.error)
    const refresh = useCourseGuildsStore(courseId, (s) => s.refresh)
    const setData = useCourseGuildsStore(courseId, (s) => s.setData)
    const [busy, setBusy] = useState<string | null>(null)
    const [confirmingLeave, setConfirmingLeave] = useState(false)
    const [founding, setFounding] = useState(false)

    const run = async (key: string, action: () => Promise<Parameters<typeof setData>[0]>, done: string) => {
        setBusy(key)
        try {
            setData(await action())
            toastSuccess(done)
        } catch (err) {
            toastError('That didn’t work.', err)
        } finally {
            setBusy(null)
            setConfirmingLeave(false)
        }
    }

    const content = () => {
        if (!data) {
            return error ? (
                <ErrorState message={error} onRetry={() => void refresh()} />
            ) : (
                <Loading loading message="Loading guilds…" />
            )
        }
        const mine = data.guilds.find((g) => g.id === data.myGuildId) ?? null
        const pendingGuild = mine?.status === 'pending'
        const others = data.guilds.filter((g) => g.id !== data.myGuildId && g.status === 'active')

        return (
            <div className="space-y-6">
                {mine && (
                    <SystemPanel
                        eyebrow={
                            pendingGuild
                                ? 'Your guild · waiting for your teacher'
                                : data.myStatus === 'pending'
                                  ? 'Your request · waiting for your teacher'
                                  : 'Your guild'
                        }
                        actions={
                            <Button size="sm" loading={busy === 'leave'} onClick={() => setConfirmingLeave(true)}>
                                {data.myStatus === 'pending'
                                    ? 'Withdraw request'
                                    : pendingGuild
                                      ? 'Withdraw guild'
                                      : 'Leave guild'}
                            </Button>
                        }
                    >
                        <div className="flex items-center gap-4">
                            <Emblem guild={mine} />
                            <div className="min-w-0">
                                <p className="font-display text-xl font-semibold text-gray-900 dark:text-gray-50">
                                    {mine.name}
                                </p>
                                {mine.motto && <p className="text-sm italic text-gray-500">“{mine.motto}”</p>}
                            </div>
                        </div>
                        {data.myStatus === 'active' && (
                            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                                {mine.members.map((member) => (
                                    <li
                                        key={member.studentId}
                                        className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"
                                    >
                                        <span>{member.displayName}</span>
                                        {member.role === 'leader' && (
                                            <Tag
                                                className="border-transparent bg-gold-subtle text-gold"
                                                prefix={<RankIcon className="mr-1" aria-hidden />}
                                            >
                                                Leader
                                            </Tag>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {data.myStatus === 'pending' && (
                            <p className="mt-3 text-sm text-gray-500">
                                Your teacher will approve your request soon. You’ll get a notification.
                            </p>
                        )}
                    </SystemPanel>
                )}

                {!mine && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Guilds are small teams in this course. Together you take on team quests and climb the guild
                        leaderboard. Ask to join one below — your teacher approves requests.
                    </p>
                )}

                {data.canFound && (
                    <SystemPanel eyebrow="Guild Leader" title="Start your own guild">
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                            You’ve unlocked Guild Leader, so you can found a guild here. Your teacher approves it first.
                        </p>
                        <Button variant="solid" icon={<AddIcon />} onClick={() => setFounding(true)}>
                            Found a guild
                        </Button>
                    </SystemPanel>
                )}

                {others.length > 0 ? (
                    <section aria-labelledby="other-guilds">
                        <h2 id="other-guilds" className="mb-3 text-lg">
                            {mine ? 'Other guilds' : 'Guilds in this course'}
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {others.map((guild) => {
                                const full = guild.memberCount >= guild.maxMembers
                                const canAsk = !mine && guild.open && !full
                                return (
                                    <div
                                        key={guild.id}
                                        className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Emblem guild={guild} className="h-10 w-10 text-xl" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-gray-900 dark:text-gray-50">
                                                    {guild.name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {guild.memberCount} / {guild.maxMembers} members
                                                    {!guild.open && ' · invite only'}
                                                </p>
                                            </div>
                                        </div>
                                        {guild.motto && <p className="text-sm italic text-gray-500">“{guild.motto}”</p>}
                                        {!mine && (
                                            <Button
                                                size="sm"
                                                disabled={!canAsk}
                                                loading={busy === guild.id}
                                                onClick={() =>
                                                    void run(
                                                        guild.id,
                                                        () => apiRequestToJoin(guild.id),
                                                        `Request sent to join ${guild.name}.`,
                                                    )
                                                }
                                            >
                                                {full
                                                    ? 'Full'
                                                    : guild.open
                                                      ? 'Ask to join'
                                                      : 'Your teacher adds members'}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                ) : (
                    !mine && (
                        <EmptyState
                            icon={navigationIcon.guilds}
                            title="No guilds yet"
                            description="Your teacher hasn’t formed any guilds in this course yet."
                        />
                    )
                )}

                <ConfirmDialog
                    isOpen={confirmingLeave}
                    onClose={() => setConfirmingLeave(false)}
                    type="warning"
                    title={
                        data.myStatus === 'pending'
                            ? 'Withdraw your request?'
                            : pendingGuild
                              ? 'Withdraw your guild?'
                              : `Leave ${mine?.name ?? 'your guild'}?`
                    }
                    confirmText={data.myStatus === 'pending' || pendingGuild ? 'Withdraw' : 'Leave guild'}
                    loading={busy === 'leave'}
                    onConfirm={() => void run('leave', () => apiLeaveGuild(courseId), 'Done.')}
                >
                    <p>
                        {data.myStatus === 'pending'
                            ? 'You can ask to join another guild afterwards.'
                            : pendingGuild
                              ? 'The guild you founded will be removed before it’s approved.'
                              : 'You’ll stop sharing in its team quests. XP you’ve already earned stays yours.'}
                    </p>
                </ConfirmDialog>
                <FoundGuildDialog courseId={courseId} isOpen={founding} onClose={() => setFounding(false)} />
            </div>
        )
    }

    return (
        <>
            <StudentGuildsSWRProvider courseId={courseId} />
            {content()}
        </>
    )
}
