'use client'

import { useSearchParams } from 'next/navigation'
import PageHeader from '@/components/shared/PageHeader'
import ErrorState from '@/components/shared/ErrorState'
import { ActivityKindTag, DifficultyStars, QuestStateTag, SubjectTag, XpReward } from '@/components/game/GameTags'
import LessonView from './LessonView'
import AssessmentView from './AssessmentView'
import TeamQuestView from './TeamQuestView'
import { getCoursePath, getLearnPath, questsPath } from '@/configs/app.config'
import { useSWRActivityForPlay } from '@/services/activities'
import { usePlayViewStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import useRecordRecentItem from '@/utils/hooks/useRecordRecentItem'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import type { ActivityPlayView } from '@/@types/activities/Activity'

function PlayViewSWRProvider({ activityId, fallback }: { activityId: string; fallback: ActivityPlayView }) {
    const swr = useSWRActivityForPlay(activityId, { fallbackData: fallback })
    const setData = usePlayViewStore(activityId, (s) => s.setData)
    const setLoading = usePlayViewStore(activityId, (s) => s.setLoading)
    const setError = usePlayViewStore(activityId, (s) => s.setError)
    const setRefresh = usePlayViewStore(activityId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

/** The Learning Dungeon: one quest — a lesson to read or an assessment to attempt. */
export default function LearnClientPage({ activityId, initial }: { activityId: string; initial: ActivityPlayView }) {
    const attemptId = useSearchParams().get('attempt')
    const view = usePlayViewStore(activityId, (s) => s.data) ?? initial
    const error = usePlayViewStore(activityId, (s) => s.error)
    const refresh = usePlayViewStore(activityId, (s) => s.refresh)
    const { activity, quest } = view

    usePageBreadcrumbs([
        { label: 'Quest Board', href: questsPath },
        { label: quest.course.title, href: getCoursePath(quest.course.id) },
        { label: activity.title },
    ])
    useRecordRecentItem({
        id: activityId,
        kind: 'activity',
        title: activity.title,
        subtitle: quest.course.title,
        href: getLearnPath(activityId),
    })

    return (
        <div className={`mx-auto max-w-4xl subject-theme-${quest.course.subject.theme}`}>
            <PlayViewSWRProvider activityId={activityId} fallback={initial} />
            <PageHeader
                eyebrow={
                    <span className="flex flex-wrap items-center gap-2 normal-case tracking-normal">
                        <ActivityKindTag kind={activity.kind} />
                        <SubjectTag subject={quest.course.subject} />
                        <QuestStateTag state={quest.state} />
                    </span>
                }
                title={activity.title}
                description={
                    <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {activity.summary && <span>{activity.summary}</span>}
                        <DifficultyStars difficulty={activity.difficulty} />
                        <XpReward amount={activity.xpReward} />
                    </span>
                }
            />
            {error && (
                <ErrorState
                    className="py-4"
                    title="Couldn’t refresh this quest"
                    message={error}
                    onRetry={() => void refresh()}
                />
            )}
            {activity.kind === 'lesson' ? (
                <LessonView activityId={activityId} />
            ) : activity.kind === 'team_quest' ? (
                <TeamQuestView activityId={activityId} />
            ) : (
                <AssessmentView activityId={activityId} attemptId={attemptId} />
            )}
        </div>
    )
}
