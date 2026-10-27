'use client'

import Link from 'next/link'
import Table from '@/components/ui/Table'
import Tooltip from '@/components/ui/Tooltip'
import Alert from '@/components/ui/Alert'
import StatTile from '@/components/shared/StatTile'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import { RankTag } from '@/components/game/GameTags'
import { CourseProgressSWRProvider } from './ManageSWRProviders'
import navigationIcon, { CheckIcon, WarningIcon } from '@/configs/icons.config'
import { useCourseProgressStore } from '@/stores/GameStores'
import { getActivityResultsPath, getAnalyticsPath } from '@/configs/app.config'
import { activityKindLabel, isAssessment } from '@/@types/activities/ActivityKindOptions'
import { formatDate } from '@/utils/dates'
import classNames from '@/utils/classNames'
import type { CourseProgressReport } from '@/@types/reports/Reports'

const { THead, TBody, Tr, Th, Td } = Table

interface ProgressTabProps {
    courseId: string
}

export default function ProgressTab({ courseId }: ProgressTabProps) {
    return (
        <CourseProgressSWRProvider courseId={courseId}>
            <Progress courseId={courseId} />
        </CourseProgressSWRProvider>
    )
}

function Progress({ courseId }: ProgressTabProps) {
    const report = useCourseProgressStore(courseId, (s) => s.data)
    const loading = useCourseProgressStore(courseId, (s) => s.loading)
    const error = useCourseProgressStore(courseId, (s) => s.error)
    const refresh = useCourseProgressStore(courseId, (s) => s.refresh)

    if (!report)
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading={loading} message="Building the gradebook…" />
        )
    if (!report.students.length || !report.activities.length) {
        return (
            <EmptyState
                icon={navigationIcon.progression}
                title="Nothing to report yet"
                description={
                    report.students.length
                        ? 'Publish an activity and student progress will appear here.'
                        : 'Once students join and start working, their progress appears here.'
                }
            />
        )
    }

    const needSupport = report.students.filter((s) => s.supportReasons.length > 0)

    return (
        <div className="space-y-6">
            <Alert showIcon type="info">
                Scores measure learning; XP and rank measure engagement. Students are flagged on scores and missed work
                only.{' '}
                <Link href={getAnalyticsPath(courseId)} className="font-semibold underline">
                    See detailed analytics
                </Link>{' '}
                — objectives, most-missed questions, overdue work and more.
            </Alert>

            <div className="grid gap-4 sm:grid-cols-3">
                <StatTile
                    label="Completion"
                    value={report.summary.completionRate === null ? '—' : `${report.summary.completionRate}%`}
                    hint="Published activities finished, across all students"
                />
                <StatTile
                    label="Average score"
                    value={report.summary.averageScore === null ? '—' : `${report.summary.averageScore}%`}
                    hint="Best scores on graded quizzes and exams"
                />
                <StatTile
                    label="May need support"
                    value={report.summary.needsSupport}
                    hint={`of ${report.students.length} students`}
                    icon={<WarningIcon />}
                />
            </div>

            {needSupport.length > 0 && (
                <section className="rounded-2xl border border-warning/40 bg-warning-subtle p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-base">
                        <WarningIcon className="text-warning" aria-hidden /> Students who may need support
                    </h3>
                    <ul className="grid gap-2 md:grid-cols-2">
                        {needSupport.map((s) => (
                            <li key={s.id} className="rounded-xl bg-white px-3 py-2 dark:bg-gray-800">
                                <div className="font-semibold text-gray-900 dark:text-gray-50">{s.displayName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {s.supportReasons.join(' · ')}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <Gradebook courseId={courseId} report={report} />
        </div>
    )
}

function Gradebook({ courseId, report }: { courseId: string; report: CourseProgressReport }) {
    return (
        <section>
            <h3 className="mb-2 text-base">Gradebook</h3>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Best score per activity (green = passed, red = not yet passed). ✓ = lesson completed, — = not started.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                <Table compact>
                    <THead>
                        <Tr>
                            <Th className="sticky left-0 z-10 bg-white dark:bg-gray-800">Student</Th>
                            {report.activities.map((a) => (
                                <Th key={a.id} className="min-w-28 align-bottom normal-case">
                                    {isAssessment(a.kind) ? (
                                        <Link
                                            href={getActivityResultsPath(courseId, a.id)}
                                            className="hover:text-primary"
                                        >
                                            {a.title}
                                        </Link>
                                    ) : (
                                        a.title
                                    )}
                                    <div className="font-normal text-gray-400">
                                        {activityKindLabel[a.kind]}
                                        {a.dueAt && ` · due ${formatDate(a.dueAt)}`}
                                    </div>
                                </Th>
                            ))}
                            <Th className="text-right">Avg</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {report.students.map((s) => (
                            <Tr key={s.id}>
                                <Td className="sticky left-0 z-10 bg-white dark:bg-gray-800">
                                    <div className="whitespace-nowrap font-semibold text-gray-900 dark:text-gray-50">
                                        {s.displayName}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        Lv {s.level} <RankTag code={s.rankCode} />
                                        {s.overdue > 0 && <span className="text-warning">· {s.overdue} overdue</span>}
                                    </div>
                                </Td>
                                {report.activities.map((a) => {
                                    const cell = s.cells[a.id]
                                    return (
                                        <Td key={a.id} className="text-center tabular-nums">
                                            {!cell?.completed ? (
                                                <span className="text-gray-400">—</span>
                                            ) : cell.bestPercent === null ? (
                                                <Tooltip title="Completed">
                                                    <CheckIcon className="inline text-success" aria-label="Completed" />
                                                </Tooltip>
                                            ) : (
                                                <span
                                                    className={classNames(
                                                        'inline-block rounded-lg px-2 py-0.5 text-xs font-semibold',
                                                        cell.passed
                                                            ? 'bg-success-subtle text-success'
                                                            : 'bg-error-subtle text-error',
                                                    )}
                                                >
                                                    {Math.round(cell.bestPercent)}%
                                                </span>
                                            )}
                                        </Td>
                                    )
                                })}
                                <Td className="text-right font-semibold tabular-nums">
                                    {s.averageScore === null ? '—' : `${s.averageScore}%`}
                                </Td>
                            </Tr>
                        ))}
                    </TBody>
                </Table>
            </div>
        </section>
    )
}
