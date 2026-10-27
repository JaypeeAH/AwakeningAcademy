'use client'

import Link from 'next/link'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import { FeedbackIcon } from '@/configs/icons.config'
import { getLearnPath } from '@/configs/app.config'
import { useSWRMyFeedback } from '@/services/attempts'
import { formatDateTime } from '@/utils/dates'
import { tryGetErrorMessage } from '@/utils/errors'
import classNames from '@/utils/classNames'

/** Every piece of marked work that came back with teacher comments, newest first. */
export default function FeedbackTab() {
    const { data, error, mutate } = useSWRMyFeedback()
    if (error && !data) return <ErrorState message={tryGetErrorMessage(error)} onRetry={() => void mutate()} />
    if (!data) return <Loading loading />
    if (!data.length) {
        return (
            <EmptyState
                icon={<FeedbackIcon />}
                title="No comments yet"
                description="When a teacher marks your homework or essays, their comments collect here so you can look back at them."
            />
        )
    }
    return (
        <ul className="space-y-3">
            {data.map((entry) => (
                <li key={entry.attemptId}>
                    <Link
                        href={getLearnPath(entry.activityId, entry.attemptId)}
                        className="block rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800"
                    >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="font-semibold text-gray-900 dark:text-gray-50">{entry.activityTitle}</span>
                            {entry.percent !== null && (
                                <span
                                    className={classNames(
                                        'font-semibold tabular-nums',
                                        entry.passed ? 'text-success' : 'text-warning',
                                    )}
                                >
                                    {Math.round(entry.percent)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500">
                            {entry.courseTitle} · marked {formatDateTime(entry.gradedAt)}
                            {entry.commentCount > 0 &&
                                ` · ${entry.commentCount} ${entry.commentCount === 1 ? 'comment' : 'comments'} on your answers`}
                        </p>
                        {entry.feedback && (
                            <p className="mt-2 line-clamp-3 whitespace-pre-wrap border-l border-gold pl-3 text-sm text-gray-700 dark:text-gray-200">
                                {entry.feedback}
                            </p>
                        )}
                    </Link>
                </li>
            ))}
        </ul>
    )
}
