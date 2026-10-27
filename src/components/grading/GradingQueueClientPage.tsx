'use client'

import { useMemo, useState } from 'react'
import Tag from '@/components/ui/Tag'
import Select from '@/components/ui/Select'
import LinkButton from '@/components/ui/LinkButton'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import { ActivityKindTag } from '@/components/game/GameTags'
import { GradingIcon, SparkleIcon } from '@/configs/icons.config'
import { getGradingPath } from '@/configs/app.config'
import { useGradingQueueStore } from '@/stores/GameStores'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { formatDateTime, fromNow } from '@/utils/dates'
import type { ActivityKind } from '@/@types/activities/ActivityKindOptions'
import type { GradingQueueItem } from '@/@types/grading/Grading'

export const isLate = (item: Pick<GradingQueueItem, 'submittedAt' | 'dueAt'>) =>
    !!item.submittedAt && !!item.dueAt && item.submittedAt.getTime() > item.dueAt.getTime()

export function LateTag() {
    return <Tag className="border-transparent bg-warning-subtle text-warning">Late</Tag>
}

function QueueRow({ item, action }: { item: GradingQueueItem; action: 'mark' | 'regrade' }) {
    return (
        <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-50">{item.studentName}</span>
                    <ActivityKindTag kind={item.activityKind as ActivityKind} />
                    {isLate(item) && <LateTag />}
                </div>
                <div className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-300">
                    {item.activityTitle}
                    <span className="text-gray-400"> · attempt {item.attemptNo}</span>
                </div>
                <div className="text-xs text-gray-500" title={formatDateTime(item.submittedAt)}>
                    {item.courseTitle} · handed in {fromNow(item.submittedAt)}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
                {action === 'mark' ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {item.pendingCount} {item.pendingCount === 1 ? 'answer' : 'answers'} to mark
                    </span>
                ) : (
                    <span className="font-semibold tabular-nums">
                        {item.percent === null ? '—' : `${Math.round(item.percent)}%`}
                    </span>
                )}
                <LinkButton
                    size="sm"
                    variant={action === 'mark' ? 'solid' : 'default'}
                    href={getGradingPath(item.attemptId)}
                    aria-label={`${action === 'mark' ? 'Mark' : 'Re-grade'} ${item.studentName}’s ${item.activityTitle}`}
                >
                    {action === 'mark' ? 'Mark' : 'Re-grade'}
                </LinkButton>
            </div>
        </li>
    )
}

const ALL_COURSES = { value: '', label: 'All courses' }

/** Work waiting for the teacher (oldest first) and recently marked work they can revisit */
export default function GradingQueueClientPage() {
    usePageBreadcrumbs([{ label: 'Grading' }])
    const queue = useGradingQueueStore((s) => s.data)
    const loading = useGradingQueueStore((s) => s.loading)
    const error = useGradingQueueStore((s) => s.error)
    const refresh = useGradingQueueStore((s) => s.refresh)
    const [courseId, setCourseId] = useState('')

    const courseOptions = useMemo(() => {
        const courses = new Map<string, string>()
        for (const item of [...(queue?.pending ?? []), ...(queue?.recent ?? [])])
            courses.set(item.courseId, item.courseTitle)
        return [ALL_COURSES, ...[...courses].map(([value, label]) => ({ value, label }))]
    }, [queue])
    const pending = useMemo(
        () => (queue?.pending ?? []).filter((i) => !courseId || i.courseId === courseId),
        [queue, courseId],
    )
    const recent = useMemo(
        () => (queue?.recent ?? []).filter((i) => !courseId || i.courseId === courseId),
        [queue, courseId],
    )

    return (
        <>
            <PageHeader
                eyebrow="Grading"
                title="Marking queue"
                description="Essays and uploads wait here until you mark them. Students get their XP — and your comments — as soon as you do."
                actions={
                    courseOptions.length > 2 && (
                        <div className="w-60">
                            <Select
                                size="sm"
                                aria-label="Course"
                                options={courseOptions}
                                value={courseOptions.find((o) => o.value === courseId) ?? ALL_COURSES}
                                onChange={(option) => setCourseId(option?.value ?? '')}
                                isSearchable={false}
                            />
                        </div>
                    )
                }
            />
            {!queue ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading={loading} message="Loading the marking queue…" />
                )
            ) : (
                <>
                    <section className="mb-8" aria-labelledby="waiting-heading">
                        <h2 id="waiting-heading" className="mb-3 text-lg">
                            Waiting for you
                            {pending.length > 0 && <span className="text-gray-500"> ({pending.length})</span>}
                        </h2>
                        {pending.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                                <EmptyState
                                    icon={<SparkleIcon />}
                                    title="All caught up!"
                                    description="Nothing is waiting to be marked. New essays and uploads will appear here as students hand them in."
                                />
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                                {pending.map((item) => (
                                    <QueueRow key={item.attemptId} item={item} action="mark" />
                                ))}
                            </ul>
                        )}
                    </section>
                    <section aria-labelledby="recent-heading">
                        <h2 id="recent-heading" className="mb-1 text-lg">
                            Recently marked
                        </h2>
                        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                            Re-grade if you change your mind — XP the student already earned is never paid twice or
                            taken away.
                        </p>
                        {recent.length === 0 ? (
                            <EmptyState compact icon={<GradingIcon />} title="Nothing marked yet" />
                        ) : (
                            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                                {recent.map((item) => (
                                    <QueueRow key={item.attemptId} item={item} action="regrade" />
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </>
    )
}
