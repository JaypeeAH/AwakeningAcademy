'use client'

import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import SystemPanel from '@/components/game/SystemPanel'
import XpBar from '@/components/game/XpBar'
import AchievementCard from './AchievementCard'
import navigationIcon from '@/configs/icons.config'
import { homePath } from '@/configs/app.config'
import { useSWRAchievements } from '@/services/social'
import { useAchievementsStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'

function AchievementsSWRProvider() {
    const swr = useSWRAchievements()
    const setData = useAchievementsStore((s) => s.setData)
    const setLoading = useAchievementsStore((s) => s.setLoading)
    const setError = useAchievementsStore((s) => s.setError)
    const setRefresh = useAchievementsStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

/** Every achievement: earned ones with their date, the rest with progress (hidden ones as ???) */
export default function AchievementsClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Achievements' }])
    const book = useAchievementsStore((s) => s.data)
    const error = useAchievementsStore((s) => s.error)
    const refresh = useAchievementsStore((s) => s.refresh)

    // Earned first (newest first), then the closest to being earned
    const sorted = [...(book?.achievements ?? [])].sort((a, b) => {
        if (a.earnedAt && b.earnedAt) return b.earnedAt.getTime() - a.earnedAt.getTime()
        if (a.earnedAt || b.earnedAt) return a.earnedAt ? -1 : 1
        return b.progress.current / b.progress.target - a.progress.current / a.progress.target
    })

    return (
        <>
            <AchievementsSWRProvider />
            <PageHeader
                eyebrow="Hall of deeds"
                title="Achievements"
                description="Milestones on your journey. They unlock by themselves as you learn — some are hidden until you earn them."
            />
            {!book ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Loading your achievements…" />
                )
            ) : book.total === 0 ? (
                <EmptyState
                    icon={navigationIcon.achievements}
                    title="No achievements yet"
                    description="Your administrator hasn’t set any up."
                />
            ) : (
                <div className="space-y-6">
                    <SystemPanel eyebrow="Earned" title={`${book.earned} of ${book.total}`} className="max-w-xl">
                        <XpBar
                            value={book.earned}
                            max={Math.max(book.total, 1)}
                            label="Achievements"
                            valueText={`${Math.round((book.earned / Math.max(book.total, 1)) * 100)}%`}
                        />
                    </SystemPanel>
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {sorted.map((achievement) => (
                            <li key={achievement.id}>
                                <AchievementCard achievement={achievement} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    )
}
