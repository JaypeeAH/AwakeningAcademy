'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Switcher from '@/components/ui/Switcher'
import Tag from '@/components/ui/Tag'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import UserAvatar from '@/components/shared/UserAvatar'
import GuildDialog from './GuildDialog'
import { CourseGuildsSWRProvider, RosterSWRProvider } from './ManageSWRProviders'
import navigationIcon, {
    AddIcon,
    ApproveIcon,
    CloseIcon,
    DeleteIcon,
    EditIcon,
    RankIcon,
    guildEmblemIcon,
} from '@/configs/icons.config'
import { apiApproveGuild, apiDeleteGuild, apiManageGuildMember, apiUpdateCourseSocial } from '@/services/social'
import { getCourseState, useCourseGuildsStore, useCourseStore, useRosterStore } from '@/stores/GameStores'
import { tryGetErrorMessage } from '@/utils/errors'
import {
    leaderboardModeLabel,
    type CourseGuilds,
    type Guild,
    type GuildMemberActionInput,
    type LeaderboardMode,
} from '@/@types/game/Guilds'

const LEADERBOARD_OPTIONS = (['off', 'initials', 'names'] as LeaderboardMode[]).map((value) => ({
    value,
    label: leaderboardModeLabel[value],
}))

/** Guilds in a course: form teams, approve requests and student-founded guilds, and set leaderboard privacy */
export default function GuildsTab({ courseId }: { courseId: string }) {
    return (
        <CourseGuildsSWRProvider courseId={courseId}>
            <RosterSWRProvider courseId={courseId}>
                <Guilds courseId={courseId} />
            </RosterSWRProvider>
        </CourseGuildsSWRProvider>
    )
}

function Guilds({ courseId }: { courseId: string }) {
    const data = useCourseGuildsStore(courseId, (s) => s.data)
    const error = useCourseGuildsStore(courseId, (s) => s.error)
    const refresh = useCourseGuildsStore(courseId, (s) => s.refresh)
    const setData = useCourseGuildsStore(courseId, (s) => s.setData)
    const [editor, setEditor] = useState<{ open: boolean; guild: Guild | null }>({ open: false, guild: null })
    const [deleting, setDeleting] = useState<Guild | null>(null)
    const [busy, setBusy] = useState<string | null>(null)

    /** Runs a guild change; every endpoint returns the course's guilds as they now are */
    const run = async (key: string, action: () => Promise<CourseGuilds>, success: string) => {
        setBusy(key)
        try {
            setData(await action())
            toastSuccess(success)
            return true
        } catch (err) {
            toastError(tryGetErrorMessage(err), err)
            return false
        } finally {
            setBusy(null)
        }
    }

    if (!data) {
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading message="Gathering the guilds…" />
        )
    }

    const pendingGuilds = data.guilds.filter((g) => g.status === 'pending').length
    const requests = data.guilds.reduce((n, g) => n + g.members.filter((m) => m.status === 'pending').length, 0)
    const placed = new Set(data.guilds.flatMap((g) => g.members.map((m) => m.studentId)))
    const addButton = (
        <Button variant="solid" icon={<AddIcon />} onClick={() => setEditor({ open: true, guild: null })}>
            New guild
        </Button>
    )

    return (
        <div className="space-y-6">
            <SocialSettings courseId={courseId} onSaved={setData} />

            {data.guilds.length ? (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {data.guilds.length} {data.guilds.length === 1 ? 'guild' : 'guilds'}
                            {pendingGuilds > 0 && ` · ${pendingGuilds} waiting for approval`}
                            {requests > 0 && ` · ${requests} join ${requests === 1 ? 'request' : 'requests'}`}. Each
                            student can be in one guild per course.
                        </p>
                        {addButton}
                    </div>
                    <ul className="grid gap-4 xl:grid-cols-2">
                        {data.guilds.map((guild) => (
                            <li key={guild.id}>
                                <GuildCard
                                    courseId={courseId}
                                    guild={guild}
                                    placed={placed}
                                    busy={busy}
                                    onEdit={() => setEditor({ open: true, guild })}
                                    onDelete={() => setDeleting(guild)}
                                    onApprove={() =>
                                        void run(
                                            `approve:${guild.id}`,
                                            () => apiApproveGuild(guild.id),
                                            `${guild.name} approved.`,
                                        )
                                    }
                                    onMember={(input, success) =>
                                        void run(
                                            `${input.action}:${guild.id}:${input.studentId}`,
                                            () => apiManageGuildMember(guild.id, input),
                                            success,
                                        )
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <EmptyState
                    icon={navigationIcon.guilds}
                    title="No guilds yet"
                    description="Guilds are small teams inside the course. Team quests complete when enough of a guild’s members finish them, and everyone shares the XP."
                    action={addButton}
                />
            )}

            <GuildDialog
                courseId={courseId}
                guild={editor.guild}
                isOpen={editor.open}
                onClose={() => setEditor({ open: false, guild: null })}
            />
            <ConfirmDialog
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                type="danger"
                title={`Delete “${deleting?.name ?? ''}”?`}
                confirmText="Delete"
                loading={busy === 'delete'}
                onConfirm={async () => {
                    if (deleting && (await run('delete', () => apiDeleteGuild(deleting.id), 'Guild deleted.'))) {
                        setDeleting(null)
                    }
                }}
            >
                Its members leave the guild. XP they already earned from team quests is kept. This can’t be undone.
            </ConfirmDialog>
        </div>
    )
}

/** Leaderboard visibility and student-founded guilds for this course */
function SocialSettings({ courseId, onSaved }: { courseId: string; onSaved: (data: CourseGuilds) => void }) {
    const course = useCourseStore(courseId, (s) => s.data?.course)
    const [mode, setMode] = useState<LeaderboardMode>(course?.leaderboardMode ?? 'off')
    const [studentGuilds, setStudentGuilds] = useState(course?.studentGuilds ?? false)
    const [saving, setSaving] = useState(false)
    const dirty = mode !== (course?.leaderboardMode ?? 'off') || studentGuilds !== (course?.studentGuilds ?? false)

    const save = async () => {
        setSaving(true)
        try {
            onSaved(await apiUpdateCourseSocial(courseId, { leaderboardMode: mode, studentGuilds }))
            await getCourseState(courseId).refresh()
            toastSuccess('Course settings saved.')
        } catch (err) {
            toastError('Couldn’t save the settings.', err)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card header={{ content: <h4>Guilds & leaderboard</h4> }}>
            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label htmlFor="leaderboard-mode" className="form-label mb-1 block">
                        Weekly leaderboard
                    </label>
                    <Select
                        inputId="leaderboard-mode"
                        options={LEADERBOARD_OPTIONS}
                        value={LEADERBOARD_OPTIONS.find((o) => o.value === mode)}
                        onChange={(option) => option && setMode(option.value)}
                        isSearchable={false}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        Off by default. When on, students see only the XP earned in this course this week — never scores
                        or answers — shown as initials or display names. Any student can hide themselves in their
                        profile.
                    </p>
                </div>
                <label className="flex items-start gap-3 text-sm md:pt-6">
                    <Switcher checked={studentGuilds} onChange={setStudentGuilds} />
                    <span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                            Let Guild Leaders found guilds
                        </span>
                        <span className="block text-xs text-gray-500">
                            Students who have unlocked the Guild Leader skill can start a guild. You approve it before
                            anyone else can join.
                        </span>
                    </span>
                </label>
            </div>
            <div className="mt-4 flex justify-end">
                <Button size="sm" variant="solid" disabled={!dirty} loading={saving} onClick={() => void save()}>
                    Save settings
                </Button>
            </div>
        </Card>
    )
}

interface GuildCardProps {
    courseId: string
    guild: Guild
    /** Students already in (or asking to join) any guild in the course */
    placed: Set<string>
    busy: string | null
    onEdit: () => void
    onDelete: () => void
    onApprove: () => void
    onMember: (input: GuildMemberActionInput, success: string) => void
}

function GuildCard({ courseId, guild, placed, busy, onEdit, onDelete, onApprove, onMember }: GuildCardProps) {
    const roster = useRosterStore(courseId, (s) => s.data) ?? []
    const active = guild.members.filter((m) => m.status === 'active')
    const pending = guild.members.filter((m) => m.status === 'pending')
    const full = active.length >= guild.maxMembers
    const addOptions = roster.filter((s) => !placed.has(s.id)).map((s) => ({ value: s.id, label: s.displayName }))
    const isBusy = (action: string, studentId = '') => busy === `${action}:${guild.id}:${studentId}`.replace(/:$/, '')

    return (
        <article className="h-full rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-xl text-primary"
                        aria-hidden
                    >
                        {guildEmblemIcon[guild.emblem]}
                    </span>
                    <div className="min-w-0">
                        <h5 className="truncate">{guild.name}</h5>
                        {guild.motto && <p className="text-sm italic text-gray-500">“{guild.motto}”</p>}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                            {guild.status === 'pending' && (
                                <Tag className="border-transparent bg-warning-subtle text-warning">
                                    Founded by a student · waiting for you
                                </Tag>
                            )}
                            <Tag>{guild.open ? 'Open to requests' : 'Closed'}</Tag>
                            <span className="text-gray-500">
                                {active.length}/{guild.maxMembers} members
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 gap-1">
                    {guild.status === 'pending' && (
                        <Button
                            size="xs"
                            variant="solid"
                            icon={<ApproveIcon />}
                            loading={busy === `approve:${guild.id}`}
                            onClick={onApprove}
                        >
                            Approve
                        </Button>
                    )}
                    <Button
                        size="xs"
                        variant="plain"
                        icon={<EditIcon />}
                        aria-label={`Edit ${guild.name}`}
                        onClick={onEdit}
                    />
                    <Button
                        size="xs"
                        variant="plain"
                        icon={<DeleteIcon />}
                        aria-label={`Delete ${guild.name}`}
                        onClick={onDelete}
                    />
                </div>
            </header>

            {pending.length > 0 && (
                <section className="mt-4 rounded-xl bg-warning-subtle p-3" aria-label="Join requests">
                    <h6 className="mb-2 text-sm">Asking to join</h6>
                    <ul className="space-y-2">
                        {pending.map((m) => (
                            <li key={m.studentId} className="flex items-center gap-2 text-sm">
                                <UserAvatar userId={m.studentId} name={m.displayName} size={28} />
                                <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                                <Button
                                    size="xs"
                                    variant="solid"
                                    icon={<ApproveIcon />}
                                    disabled={full}
                                    title={full ? 'The guild is full' : undefined}
                                    loading={isBusy('approve', m.studentId)}
                                    onClick={() =>
                                        onMember(
                                            { studentId: m.studentId, action: 'approve' },
                                            `${m.displayName} joined.`,
                                        )
                                    }
                                >
                                    Approve
                                </Button>
                                <Button
                                    size="xs"
                                    icon={<CloseIcon />}
                                    loading={isBusy('reject', m.studentId)}
                                    onClick={() =>
                                        onMember({ studentId: m.studentId, action: 'reject' }, 'Request declined.')
                                    }
                                >
                                    Decline
                                </Button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mt-4" aria-label="Members">
                {active.length ? (
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                        {active.map((m) => (
                            <li key={m.studentId} className="flex items-center gap-2 py-2 text-sm">
                                <UserAvatar userId={m.studentId} name={m.displayName} size={28} />
                                <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
                                {m.role === 'leader' ? (
                                    <Tag
                                        className="border-transparent bg-gold-subtle text-gold"
                                        prefix={<RankIcon className="mr-1" />}
                                    >
                                        Leader
                                    </Tag>
                                ) : (
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        loading={isBusy('make_leader', m.studentId)}
                                        onClick={() =>
                                            onMember(
                                                { studentId: m.studentId, action: 'make_leader' },
                                                `${m.displayName} now leads ${guild.name}.`,
                                            )
                                        }
                                    >
                                        Make leader
                                    </Button>
                                )}
                                <Button
                                    size="xs"
                                    variant="plain"
                                    icon={<DeleteIcon />}
                                    aria-label={`Remove ${m.displayName}`}
                                    loading={isBusy('remove', m.studentId)}
                                    onClick={() =>
                                        onMember(
                                            { studentId: m.studentId, action: 'remove' },
                                            `${m.displayName} removed.`,
                                        )
                                    }
                                />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">No members yet.</p>
                )}
            </section>

            <div className="mt-3">
                <label htmlFor={`guild-add-${guild.id}`} className="sr-only">
                    Add a student to {guild.name}
                </label>
                <Select
                    inputId={`guild-add-${guild.id}`}
                    size="sm"
                    options={addOptions}
                    value={null}
                    onChange={(option) =>
                        option &&
                        onMember({ studentId: option.value, action: 'add' }, `${option.label} added to ${guild.name}.`)
                    }
                    isDisabled={full || !addOptions.length}
                    placeholder={
                        full
                            ? 'The guild is full'
                            : addOptions.length
                              ? 'Add a student…'
                              : 'Every student is already in a guild'
                    }
                />
            </div>
        </article>
    )
}
