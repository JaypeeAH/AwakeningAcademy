'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import SystemPanel from '@/components/game/SystemPanel'
import PlayerIdentity from '@/components/game/PlayerIdentity'
import RankTrialPanel from '@/components/game/RankTrialPanel'
import StreakPanel from './StreakPanel'
import XpBar from '@/components/game/XpBar'
import { XpReward } from '@/components/game/GameTags'
import QuestCard from '@/components/quests/QuestCard'
import SubjectPathList from '@/components/profile/SubjectPathList'
import { useSWRPlayerStatus } from '@/services/progression'
import { usePlayerStatusStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import useSession from '@/utils/hooks/useSession'
import { coursesPath, getCoursePath, historyPath, profilePath, questsPath } from '@/configs/app.config'
import navigationIcon, { ForwardIcon } from '@/configs/icons.config'
import { xpSourceLabel } from '@/@types/progression/XpSourceOptions'
import { fromNow } from '@/utils/dates'

function PlayerStatusSWRProvider() {
    const { can } = useSession()
    const swr = useSWRPlayerStatus(can('play'))
    const setData = usePlayerStatusStore((s) => s.setData)
    const setLoading = usePlayerStatusStore((s) => s.setLoading)
    const setError = usePlayerStatusStore((s) => s.setError)
    const setRefresh = usePlayerStatusStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

/** The student's "Status Window": who they are, how far they've come, and what to do next. */
export default function StudentDashboardClientPage() {
    const status = usePlayerStatusStore((s) => s.data)
    const error = usePlayerStatusStore((s) => s.error)
    const refresh = usePlayerStatusStore((s) => s.refresh)

    return (
        <>
            <PlayerStatusSWRProvider />
            {!status ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Opening your status window…" />
                )
            ) : (
                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <SystemPanel eyebrow="Status window">
                            <PlayerIdentity
                                name={status.player.displayName}
                                rank={status.rank}
                                progress={status.progress}
                                classTitle={status.playerClass.displayed}
                            />
                        </SystemPanel>

                        <SystemPanel
                            eyebrow="Next quest"
                            title={status.recommended ? 'Your recommended next step' : 'No open quests'}
                            actions={
                                <Link href={questsPath}>
                                    <Button size="sm" variant="plain" icon={<ForwardIcon />} iconAlignment="end">
                                        Quest Board
                                    </Button>
                                </Link>
                            }
                        >
                            {status.recommended ? (
                                <QuestCard quest={status.recommended} />
                            ) : status.activeCourses.length === 0 ? (
                                <EmptyState
                                    compact
                                    icon={navigationIcon.courses}
                                    title="Join your first course"
                                    description="Ask your teacher for the course join code, then enter it on the Courses page."
                                    action={
                                        <Link href={coursesPath}>
                                            <Button variant="solid">Go to Courses</Button>
                                        </Link>
                                    }
                                />
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    You’ve cleared everything that’s open. New quests appear here as your teachers
                                    publish them.
                                </p>
                            )}
                        </SystemPanel>

                        {status.activeCourses.length > 0 && (
                            <SystemPanel eyebrow="Courses" title="Your progress">
                                <ul className="space-y-4">
                                    {status.activeCourses.map((course) => (
                                        <li
                                            key={course.id}
                                            className={`subject-theme-${course.subjectTheme} subject-bar`}
                                        >
                                            <Link href={getCoursePath(course.id)} className="group block">
                                                <XpBar
                                                    value={course.completed}
                                                    max={Math.max(course.total, 1)}
                                                    label={
                                                        <span className="group-hover:text-primary">{course.title}</span>
                                                    }
                                                    valueText={`${course.completed} / ${course.total} quests · ${course.subjectName}`}
                                                />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </SystemPanel>
                        )}
                    </div>

                    <div className="space-y-6">
                        <RankTrialPanel trial={status.trial} />

                        <StreakPanel />

                        <SystemPanel
                            eyebrow="Class"
                            title={status.playerClass.displayed?.title ?? 'Awakened Novice'}
                            actions={
                                <Link href={profilePath}>
                                    <Button size="xs" variant="plain">
                                        Titles
                                    </Button>
                                </Link>
                            }
                        >
                            {status.paths.length ? (
                                <SubjectPathList paths={status.paths.slice(0, 3)} compact />
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Earn XP in a subject to choose your path — mathematics makes Mathematicians, science
                                    makes Scientists.
                                </p>
                            )}
                        </SystemPanel>

                        <SystemPanel
                            eyebrow="Chronicle"
                            title="Recent rewards"
                            actions={
                                <Link href={historyPath}>
                                    <Button size="xs" variant="plain" icon={navigationIcon.history}>
                                        All
                                    </Button>
                                </Link>
                            }
                        >
                            {status.recentRewards.length ? (
                                <ul className="space-y-2 text-sm">
                                    {status.recentRewards.map((entry) => (
                                        <li key={entry.id} className="flex items-start justify-between gap-3">
                                            <span className="min-w-0">
                                                <span className="block truncate">{entry.reason}</span>
                                                <span className="block text-xs text-gray-500">
                                                    {xpSourceLabel[entry.source]} · {fromNow(entry.createdAt)}
                                                </span>
                                            </span>
                                            <XpReward amount={entry.amount} className="shrink-0" />
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Complete a lesson to earn your first XP.
                                </p>
                            )}
                        </SystemPanel>
                    </div>
                </div>
            )}
        </>
    )
}
