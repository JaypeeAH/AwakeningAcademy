'use client'

import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Skeleton from '@/components/ui/Skeleton'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import { PublishStatusTag, SubjectTag } from '@/components/game/GameTags'
import CreateCourseDialog from '@/components/courses/dialogs/CreateCourseDialog'
import { CoursesSWRProvider } from '@/components/courses/CourseSWRProviders'
import { GradingQueueSWRProvider } from '@/components/grading/GradingSWRProviders'
import LinkButton from '@/components/ui/LinkButton'
import navigationIcon, { AddIcon, ForwardIcon, GradingIcon, StudentsIcon } from '@/configs/icons.config'
import { useSWRTeacherOverview } from '@/services/misc'
import { useCoursesStore, useGradingQueueStore, useTeacherOverviewStore } from '@/stores/GameStores'
import { getActivityResultsPath, getCoursePath, gradingPath } from '@/configs/app.config'
import useSession from '@/utils/hooks/useSession'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { fromNow } from '@/utils/dates'
import type { ProviderProps } from '@/@types/common'

/** Latest graded attempts across the teacher's courses → useTeacherOverviewStore */
function TeacherOverviewSWRProvider({ children }: ProviderProps) {
    const swr = useSWRTeacherOverview()
    const setData = useTeacherOverviewStore((s) => s.setData)
    const setLoading = useTeacherOverviewStore((s) => s.setLoading)
    const setError = useTeacherOverviewStore((s) => s.setError)
    const setRefresh = useTeacherOverviewStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** The teacher's home: their courses, the latest submissions, and first steps for a new teacher */
export default function TeacherDashboardClientPage() {
    return (
        <CoursesSWRProvider>
            <TeacherOverviewSWRProvider>
                <GradingQueueSWRProvider>
                    <TeacherDashboard />
                </GradingQueueSWRProvider>
            </TeacherOverviewSWRProvider>
        </CoursesSWRProvider>
    )
}

function TeacherDashboard() {
    const { user } = useSession()
    const courses = useCoursesStore((s) => s.data)
    const coursesError = useCoursesStore((s) => s.error)
    const refreshCourses = useCoursesStore((s) => s.refresh)
    const overview = useTeacherOverviewStore((s) => s.data)
    const [creating, setCreating] = useState(false)

    return (
        <>
            <PageHeader
                eyebrow="Teacher dashboard"
                title={`Welcome back${user ? `, ${user.name}` : ''}`}
                description="Your classes at a glance. Scores show learning; XP and ranks show engagement."
                actions={
                    <Button variant="solid" icon={<AddIcon />} onClick={() => setCreating(true)}>
                        New course
                    </Button>
                }
            />

            <NeedsMarkingCard />

            <section className="mb-8">
                <h2 className="mb-3 text-lg">Your courses</h2>
                {!courses ? (
                    coursesError ? (
                        <ErrorState message={coursesError} onRetry={() => void refreshCourses()} />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {[0, 1, 2].map((i) => (
                                <Skeleton key={i} height={150} className="rounded-2xl" />
                            ))}
                        </div>
                    )
                ) : courses.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
                        <EmptyState
                            icon={navigationIcon.courses}
                            title="Set up your first course"
                            description={
                                <ol className="mt-1 list-inside list-decimal space-y-1 text-left">
                                    <li>Create a course and choose its subject.</li>
                                    <li>Add a lesson, then a quiz to check understanding — and publish them.</li>
                                    <li>Publish the course and share its join code with your class.</li>
                                </ol>
                            }
                            action={
                                <Button variant="solid" icon={<AddIcon />} onClick={() => setCreating(true)}>
                                    Create a course
                                </Button>
                            }
                        />
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course) => (
                            <Link
                                key={course.id}
                                href={getCoursePath(course.id)}
                                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800"
                            >
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <SubjectTag subject={course.subject} />
                                    <PublishStatusTag status={course.status} />
                                </div>
                                <h3 className="text-base group-hover:text-primary">{course.title}</h3>
                                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                        <StudentsIcon aria-hidden /> {course.stats.studentCount ?? 0} students
                                    </span>
                                    <span>
                                        {course.stats.publishedCount}/{course.stats.activityCount} activities published
                                    </span>
                                    {course.joinCode && course.status === 'published' && (
                                        <span>
                                            Code{' '}
                                            <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">
                                                {course.joinCode}
                                            </span>
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-3 text-lg">Recent submissions</h2>
                {!overview ? (
                    <Skeleton height={120} className="rounded-2xl" />
                ) : overview.recentSubmissions.length === 0 ? (
                    <EmptyState
                        compact
                        icon={navigationIcon.clipboard}
                        title="No submissions yet"
                        description="Graded quiz and exam attempts from your students will appear here."
                    />
                ) : (
                    <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
                        {overview.recentSubmissions.map((s) => (
                            <li key={s.attemptId}>
                                <Link
                                    href={getActivityResultsPath(s.courseId, s.activityId)}
                                    className="flex flex-col gap-1 px-4 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-gray-700/40"
                                >
                                    <span className="min-w-0">
                                        <span className="font-semibold text-gray-900 dark:text-gray-50">
                                            {s.studentName}
                                        </span>
                                        <span className="text-gray-500"> · {s.activityTitle}</span>
                                        <span className="block text-xs text-gray-500">
                                            {s.courseTitle} · {fromNow(s.submittedAt)}
                                        </span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <span className="font-semibold tabular-nums">
                                            {s.percent === null ? '—' : `${Math.round(s.percent)}%`}
                                        </span>
                                        <Tag
                                            className={
                                                s.passed
                                                    ? 'border-transparent bg-success-subtle text-success'
                                                    : 'border-transparent bg-error-subtle text-error'
                                            }
                                        >
                                            {s.passed ? 'Passed' : 'Not passed'}
                                        </Tag>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <CreateCourseDialog isOpen={creating} onClose={() => setCreating(false)} />
        </>
    )
}

/** How much essay / upload work is waiting to be marked (hidden until the queue has loaded) */
function NeedsMarkingCard() {
    const queue = useGradingQueueStore((s) => s.data)
    if (!queue) return null
    const waiting = queue.pending.length
    const oldest = queue.pending[0]
    return (
        <section
            aria-label="Needs marking"
            className={
                waiting > 0
                    ? 'mb-8 flex flex-col gap-3 rounded-2xl border border-info bg-info-subtle p-5 sm:flex-row sm:items-center sm:justify-between'
                    : 'mb-8 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }
        >
            {waiting > 0 ? (
                <>
                    <div className="flex items-start gap-3">
                        <GradingIcon className="mt-0.5 shrink-0 text-2xl text-info" aria-hidden />
                        <div>
                            <h2 className="text-base">
                                {waiting} {waiting === 1 ? 'submission needs' : 'submissions need'} marking
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Students get their XP and your comments as soon as you mark their work.
                                {oldest &&
                                    ` Oldest: ${oldest.studentName} · ${oldest.activityTitle}, ${fromNow(oldest.submittedAt)}.`}
                            </p>
                        </div>
                    </div>
                    <LinkButton
                        variant="solid"
                        href={gradingPath}
                        icon={<ForwardIcon />}
                        iconAlignment="end"
                        className="shrink-0"
                    >
                        Start marking
                    </LinkButton>
                </>
            ) : (
                <>
                    <GradingIcon className="shrink-0 text-xl" aria-hidden />
                    <span>Nothing waiting to be marked — you’re all caught up.</span>
                </>
            )}
        </section>
    )
}
