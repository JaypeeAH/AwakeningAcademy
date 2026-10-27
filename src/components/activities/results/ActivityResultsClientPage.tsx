'use client'

import { useMemo, useState } from 'react'
import Table from '@/components/ui/Table'
import Tag from '@/components/ui/Tag'
import LinkButton from '@/components/ui/LinkButton'
import StatTile from '@/components/shared/StatTile'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import PageHeader from '@/components/shared/PageHeader'
import MarkdownContent from '@/components/shared/MarkdownContent'
import { ActivityKindTag, PublishStatusTag } from '@/components/game/GameTags'
import AttemptReviewDialog from './AttemptReviewDialog'
import Link from 'next/link'
import { EditIcon, GradingIcon, StudentsIcon, SuccessIcon, TrialIcon } from '@/configs/icons.config'
import { useActivityResultsStore } from '@/stores/GameStores'
import { coursesPath, getActivityEditPath, getCoursePath, gradingPath } from '@/configs/app.config'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { formatDateTime } from '@/utils/dates'
import classNames from '@/utils/classNames'
import type { QuestionStat } from '@/@types/activities/Activity'

const { THead, TBody, Tr, Th, Td } = Table

interface ActivityResultsClientPageProps {
    activityId: string
}

/** How the class did on one activity: who's done, who passed, and which questions/concepts were missed */
export default function ActivityResultsClientPage({ activityId }: ActivityResultsClientPageProps) {
    const results = useActivityResultsStore(activityId, (s) => s.data)
    const loading = useActivityResultsStore(activityId, (s) => s.loading)
    const error = useActivityResultsStore(activityId, (s) => s.error)
    const refresh = useActivityResultsStore(activityId, (s) => s.refresh)
    const [review, setReview] = useState<{ attemptId: string; studentName: string } | null>(null)

    usePageBreadcrumbs([
        { label: 'Courses', href: coursesPath },
        ...(results ? [{ label: results.course.title, href: getCoursePath(results.course.id, 'progress') }] : []),
        { label: results ? `${results.activity.title} · results` : 'Results' },
    ])

    const hardest = useMemo(
        () =>
            [...(results?.questions ?? [])].sort(
                (a, b) => (a.correctRate ?? 101) - (b.correctRate ?? 101) || a.position - b.position,
            ),
        [results],
    )

    if (!results)
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading={loading} message="Loading results…" />
        )

    const { activity, summary, students, course } = results
    const started = students.filter((s) => s.attempts.length > 0)
    const notStarted = students.filter((s) => s.attempts.length === 0)

    return (
        <>
            <PageHeader
                eyebrow={`Results · ${course.title}`}
                title={activity.title}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <ActivityKindTag kind={activity.kind} />
                        <PublishStatusTag status={activity.status} />
                        <span className="text-sm">Passing score {activity.passingScore}%</span>
                    </span>
                }
                actions={
                    <LinkButton size="sm" href={getActivityEditPath(course.id, activity.id)} icon={<EditIcon />}>
                        Edit activity
                    </LinkButton>
                }
            />

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatTile label="Enrolled" value={summary.enrolled} icon={<StudentsIcon />} />
                <StatTile label="Completed" value={summary.completed} hint={`${notStarted.length} not started`} />
                <StatTile label="Passed" value={summary.passed} icon={<SuccessIcon />} />
                <StatTile
                    label="Average best score"
                    value={summary.averageBest === null ? '—' : `${summary.averageBest}%`}
                    icon={<TrialIcon />}
                />
                <Link
                    href={gradingPath}
                    className="rounded-2xl focus-visible:outline-2"
                    aria-label={`${summary.awaitingReview} awaiting review — open the marking queue`}
                >
                    <StatTile
                        label="Awaiting review"
                        value={summary.awaitingReview}
                        icon={<GradingIcon />}
                        hint={summary.awaitingReview > 0 ? 'Open the marking queue →' : 'Nothing to mark'}
                        className={classNames(
                            'h-full transition-colors hover:border-primary',
                            summary.awaitingReview > 0 && 'border-info',
                        )}
                    />
                </Link>
            </div>

            <section className="mb-8">
                <h2 className="mb-1 text-lg">Questions the class is missing</h2>
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    Hardest first, across every marked attempt (partly correct answers count half). Skipped answers are
                    counted separately and never as correct.
                </p>
                {hardest.length === 0 ? (
                    <EmptyState compact title="No questions" description="This activity has no questions yet." />
                ) : (
                    <ol className="space-y-3">
                        {hardest.map((q) => (
                            <QuestionStatRow key={q.questionId} stat={q} />
                        ))}
                    </ol>
                )}
            </section>

            <section>
                <h2 className="mb-3 text-lg">Students</h2>
                {students.length === 0 ? (
                    <EmptyState
                        icon={<StudentsIcon />}
                        title="No students enrolled"
                        description="Students appear here once they join the course."
                    />
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                        <Table hoverable>
                            <THead>
                                <Tr>
                                    <Th>Student</Th>
                                    <Th className="text-right">Best</Th>
                                    <Th>Status</Th>
                                    <Th>Attempts (select to review)</Th>
                                </Tr>
                            </THead>
                            <TBody>
                                {[...started, ...notStarted].map((s) => (
                                    <Tr key={s.studentId}>
                                        <Td className="font-semibold text-gray-900 dark:text-gray-50">
                                            {s.displayName}
                                        </Td>
                                        <Td className="text-right tabular-nums">
                                            {s.bestPercent === null ? '—' : `${Math.round(s.bestPercent)}%`}
                                        </Td>
                                        <Td>
                                            {s.attempts.length === 0 ? (
                                                <span className="text-gray-400">Not started</span>
                                            ) : s.attempts.some((a) => a.status === 'pending_review') ? (
                                                <Tag className="border-transparent bg-info-subtle text-info">
                                                    Awaiting review
                                                </Tag>
                                            ) : s.passed ? (
                                                <Tag className="border-transparent bg-success-subtle text-success">
                                                    Passed
                                                </Tag>
                                            ) : s.attempts.some((a) => a.status !== 'in_progress') ? (
                                                <Tag className="border-transparent bg-error-subtle text-error">
                                                    Not yet passed
                                                </Tag>
                                            ) : (
                                                <Tag className="border-transparent bg-warning-subtle text-warning">
                                                    In progress
                                                </Tag>
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="flex flex-wrap gap-1.5">
                                                {s.attempts.map((a) =>
                                                    a.status === 'in_progress' ? (
                                                        <span
                                                            key={a.id}
                                                            className="rounded-lg px-2 py-0.5 text-xs text-gray-400"
                                                            title="Not submitted yet"
                                                        >
                                                            #{a.attemptNo} open
                                                        </span>
                                                    ) : (
                                                        <button
                                                            key={a.id}
                                                            type="button"
                                                            onClick={() =>
                                                                setReview({
                                                                    attemptId: a.id,
                                                                    studentName: s.displayName,
                                                                })
                                                            }
                                                            title={`Submitted ${formatDateTime(a.submittedAt)}`}
                                                            className={classNames(
                                                                'rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums hover:ring-1 hover:ring-primary',
                                                                a.status === 'pending_review'
                                                                    ? 'bg-info-subtle text-info'
                                                                    : a.passed
                                                                      ? 'bg-success-subtle text-success'
                                                                      : 'bg-error-subtle text-error',
                                                            )}
                                                        >
                                                            #{a.attemptNo} ·{' '}
                                                            {a.status === 'pending_review'
                                                                ? 'awaiting review'
                                                                : a.percent === null
                                                                  ? '—'
                                                                  : `${Math.round(a.percent)}%`}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        </Td>
                                    </Tr>
                                ))}
                            </TBody>
                        </Table>
                    </div>
                )}
            </section>

            <AttemptReviewDialog
                attemptId={review?.attemptId ?? null}
                studentName={review?.studentName ?? ''}
                onClose={() => setReview(null)}
            />
        </>
    )
}

function QuestionStatRow({ stat }: { stat: QuestionStat }) {
    const total = stat.correct + stat.partial + stat.incorrect + stat.skipped + stat.pending
    const segment = (count: number) => `${total ? (count / total) * 100 : 0}%`
    return (
        <li className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="system-eyebrow mb-1">Question {stat.position + 1}</div>
                    <MarkdownContent className="line-clamp-3 text-sm">{stat.prompt}</MarkdownContent>
                </div>
                <div
                    className={classNames(
                        'shrink-0 text-right text-2xl font-bold tabular-nums',
                        stat.correctRate === null
                            ? 'text-gray-400'
                            : stat.correctRate < 60
                              ? 'text-error'
                              : 'text-success',
                    )}
                >
                    {stat.correctRate === null ? '—' : `${stat.correctRate}%`}
                    <div className="text-xs font-normal text-gray-500">correct</div>
                </div>
            </div>
            {total > 0 && (
                <>
                    <div
                        className="mt-3 flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                        aria-hidden
                    >
                        <span className="bg-success" style={{ width: segment(stat.correct) }} />
                        <span className="bg-warning" style={{ width: segment(stat.partial) }} />
                        <span className="bg-error" style={{ width: segment(stat.incorrect) }} />
                        <span className="bg-gold" style={{ width: segment(stat.skipped) }} />
                        <span className="bg-info" style={{ width: segment(stat.pending) }} />
                    </div>
                    <p className="mt-2 flex flex-wrap gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="text-success">{stat.correct} correct</span>
                        {stat.partial > 0 && <span className="text-warning">{stat.partial} partly correct</span>}
                        <span className="text-error">{stat.incorrect} incorrect</span>
                        {stat.skipped > 0 && <span className="text-gold">{stat.skipped} skipped</span>}
                        {stat.pending > 0 && <span className="text-info">{stat.pending} awaiting review</span>}
                    </p>
                </>
            )}
        </li>
    )
}
