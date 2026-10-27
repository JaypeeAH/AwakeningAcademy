'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Switcher from '@/components/ui/Switcher'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import SystemPanel from '@/components/game/SystemPanel'
import SubjectPathList from './SubjectPathList'
import { CheckIcon, ClassIcon, EditIcon, FileIcon } from '@/configs/icons.config'
import { apiUpdateProfile, myDataExportUrl, useSWRProfile } from '@/services/users'
import { useProfileStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { DisplayNameSchema } from '@/@types/auth/AuthSchema'
import { UNCLASSED_TITLE } from '@/utils/classTitles'
import classNames from '@/utils/classNames'
import type { ClassTitle } from '@/@types/subjects/Subject'

function ProfileSWRProvider() {
    const swr = useSWRProfile()
    const setData = useProfileStore((s) => s.setData)
    const setLoading = useProfileStore((s) => s.setLoading)
    const setError = useProfileStore((s) => s.setError)
    const setRefresh = useProfileStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

function DisplayNameEditor({ name }: { name: string }) {
    const setData = useProfileStore((s) => s.setData)
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(name)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const save = async () => {
        const parsed = DisplayNameSchema.safeParse(value)
        if (!parsed.success) return setError(parsed.error.issues[0].message)
        setSaving(true)
        try {
            setData(await apiUpdateProfile({ displayName: parsed.data }))
            toastSuccess('Display name updated.')
            setEditing(false)
        } catch (e) {
            toastError('Couldn’t update your display name.', e)
        } finally {
            setSaving(false)
        }
    }

    if (!editing) {
        return (
            <Button
                size="xs"
                variant="plain"
                icon={<EditIcon />}
                onClick={() => (setValue(name), setError(null), setEditing(true))}
            >
                Change display name
            </Button>
        )
    }
    return (
        <form className="flex flex-wrap items-start gap-2" onSubmit={(e) => (e.preventDefault(), void save())}>
            <div>
                <label htmlFor="displayName" className="sr-only">
                    Display name
                </label>
                <Input
                    id="displayName"
                    size="sm"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    invalid={!!error}
                    autoFocus
                />
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
            </div>
            <Button size="sm" variant="solid" type="submit" loading={saving}>
                Save
            </Button>
            <Button size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
            </Button>
        </form>
    )
}

/** Player profile: class titles (equip one), subject paths, display name. */
export default function ProfileClientPage() {
    usePageBreadcrumbs([{ label: 'Player Profile' }])
    const profile = useProfileStore((s) => s.data)
    const error = useProfileStore((s) => s.error)
    const refresh = useProfileStore((s) => s.refresh)
    const setData = useProfileStore((s) => s.setData)
    const [equipping, setEquipping] = useState<string | null>(null)
    const [savingPrivacy, setSavingPrivacy] = useState(false)

    const setShownOnLeaderboards = async (shown: boolean) => {
        setSavingPrivacy(true)
        try {
            setData(await apiUpdateProfile({ leaderboardHidden: !shown }))
            toastSuccess(shown ? 'You’ll appear on course leaderboards.' : 'You’re hidden from every leaderboard.')
        } catch (e) {
            toastError('Couldn’t save your choice.', e)
        } finally {
            setSavingPrivacy(false)
        }
    }

    const equip = async (title: ClassTitle | null) => {
        setEquipping(title?.id ?? 'auto')
        try {
            setData(await apiUpdateProfile({ equippedTitleId: title?.id ?? null }))
            toastSuccess(title ? `You now go by “${title.title}”.` : 'Your title now follows your strongest subject.')
        } catch (e) {
            toastError('Couldn’t change your title.', e)
        } finally {
            setEquipping(null)
        }
    }

    return (
        <>
            <ProfileSWRProvider />
            {!profile ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Loading your profile…" />
                )
            ) : (
                <>
                    <PageHeader
                        eyebrow="Player profile"
                        title={profile.displayName}
                        description={
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1.5 font-medium text-primary">
                                    <ClassIcon aria-hidden /> {profile.playerClass.displayed?.title ?? UNCLASSED_TITLE}
                                </span>
                                <DisplayNameEditor name={profile.displayName} />
                            </span>
                        }
                    />
                    <div className="grid gap-6 lg:grid-cols-2">
                        <SystemPanel eyebrow="Paths" title="Your subjects">
                            {profile.paths.length ? (
                                <SubjectPathList paths={profile.paths} />
                            ) : (
                                <EmptyState
                                    compact
                                    title="No path chosen yet"
                                    description="Your class comes from what you study. Earn XP in a course to begin a path — and pass graded work to climb its titles."
                                />
                            )}
                        </SystemPanel>
                        <SystemPanel
                            eyebrow="Titles"
                            title="Choose your title"
                            tone="gold"
                            actions={
                                profile.playerClass.equippedTitleId && (
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        loading={equipping === 'auto'}
                                        onClick={() => void equip(null)}
                                    >
                                        Use strongest
                                    </Button>
                                )
                            }
                        >
                            {profile.playerClass.unlocked.length ? (
                                <ul className="space-y-2" aria-label="Unlocked titles">
                                    {profile.playerClass.unlocked.map((title) => {
                                        const active = profile.playerClass.displayed?.id === title.id
                                        return (
                                            <li key={title.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={active}
                                                    disabled={!!equipping}
                                                    onClick={() => void equip(title)}
                                                    className={classNames(
                                                        'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                                                        active
                                                            ? 'border-gold bg-gold-subtle'
                                                            : 'border-gray-200 hover:border-primary dark:border-gray-700',
                                                    )}
                                                >
                                                    <span className="min-w-0 flex-1">
                                                        <span className="font-display block font-semibold text-gray-900 dark:text-gray-50">
                                                            {title.title}
                                                        </span>
                                                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                            {title.description}
                                                        </span>
                                                    </span>
                                                    {active && (
                                                        <CheckIcon className="mt-1 text-gold" aria-label="Equipped" />
                                                    )}
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Titles unlock as your subject paths grow. Keep questing!
                                </p>
                            )}
                        </SystemPanel>
                        <SystemPanel eyebrow="Privacy" title="Leaderboards">
                            <label className="flex items-start gap-3 text-sm">
                                <Switcher
                                    checked={!profile.leaderboardHidden}
                                    isLoading={savingPrivacy}
                                    onChange={(checked) => void setShownOnLeaderboards(checked)}
                                />
                                <span>
                                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                                        Show me on leaderboards
                                    </span>
                                    <span className="block text-xs text-gray-500">
                                        When your teacher turns a course leaderboard on, it shows only the XP you earned
                                        that week — never your scores or answers. Turn this off to stay off every
                                        leaderboard; you’ll still see your own XP.
                                    </span>
                                </span>
                            </label>
                        </SystemPanel>
                        <SystemPanel eyebrow="Privacy" title="Your data">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Download a copy of everything The Awakening Academy stores about you: your profile,
                                progress, answers, rewards and more.
                            </p>
                            <a
                                href={myDataExportUrl}
                                download
                                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-100"
                            >
                                <FileIcon aria-hidden /> Download my data
                            </a>
                            <p className="mt-3 text-xs text-gray-500">
                                Want your account deleted? Ask your teacher or school administrator — they can remove it
                                and everything in it.
                            </p>
                        </SystemPanel>
                    </div>
                </>
            )}
        </>
    )
}
