'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import XpBar from '@/components/game/XpBar'
import { PublishStatusTag, SubjectTag } from '@/components/game/GameTags'
import JoinCourseDialog from './dialogs/JoinCourseDialog'
import CreateCourseDialog from './dialogs/CreateCourseDialog'
import navigationIcon, { AddIcon, StudentsIcon } from '@/configs/icons.config'
import { getCoursePath } from '@/configs/app.config'
import { useCoursesStore } from '@/stores/GameStores'
import useSession from '@/utils/hooks/useSession'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import type { Course } from '@/@types/courses/Course'

function CourseCard({ course }: { course: Course }) {
    return (
        <Link
            href={getCoursePath(course.id)}
            className={`subject-theme-${course.subject.theme} subject-bar block h-full rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800`}
        >
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <SubjectTag subject={course.subject} />
                {course.canManage && <PublishStatusTag status={course.status} />}
            </div>
            <h3 className="text-lg font-semibold">{course.title}</h3>
            {course.description && (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{course.description}</p>
            )}
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {course.canManage ? (
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                            <StudentsIcon aria-hidden /> {course.stats.studentCount ?? 0} students
                        </span>
                        <span>
                            {course.stats.publishedCount} / {course.stats.activityCount} activities published
                        </span>
                        {course.joinCode && <span className="font-mono">Code {course.joinCode}</span>}
                    </span>
                ) : (
                    <XpBar
                        size="sm"
                        value={course.stats.completedCount ?? 0}
                        max={Math.max(course.stats.activityCount, 1)}
                        label="Progress"
                        valueText={`${course.stats.completedCount ?? 0} / ${course.stats.activityCount} quests`}
                    />
                )}
            </div>
            {course.teacherNames.length > 0 && !course.canManage && (
                <p className="mt-3 text-xs text-gray-500">Taught by {course.teacherNames.join(', ')}</p>
            )}
        </Link>
    )
}

/** Students: their enrolled courses + join by code. Teachers: their courses + create. Admins: every course. */
export default function CoursesClientPage() {
    usePageBreadcrumbs([{ label: 'Courses' }])
    const { can } = useSession()
    const courses = useCoursesStore((s) => s.data)
    const error = useCoursesStore((s) => s.error)
    const refresh = useCoursesStore((s) => s.refresh)
    // A teacher's shared sign-up link opens here as ?join=CODE for students who are already signed in
    const sharedCode = useSearchParams().get('join')?.toUpperCase() ?? ''
    const [joinOpen, setJoinOpen] = useState(!!sharedCode)
    const [createOpen, setCreateOpen] = useState(false)
    const manages = can('courses.manage')

    const action = manages ? (
        <Button variant="solid" icon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New course
        </Button>
    ) : (
        <Button variant="solid" icon={<AddIcon />} onClick={() => setJoinOpen(true)}>
            Join a course
        </Button>
    )

    return (
        <>
            <PageHeader
                eyebrow="Courses"
                title={manages ? 'Your courses' : 'Your guild halls'}
                description={
                    manages
                        ? 'Create courses, publish lessons and quizzes, and follow your students’ learning.'
                        : 'The courses you’ve joined.'
                }
                actions={action}
            />
            {!courses ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Loading courses…" />
                )
            ) : courses.length === 0 ? (
                <EmptyState
                    icon={navigationIcon.courses}
                    title={manages ? 'No courses yet' : 'You haven’t joined a course'}
                    description={
                        manages
                            ? 'Create your first course, add a lesson, then share the join code with your class.'
                            : 'Your teacher will give you a join code. Enter it to see the course’s quests.'
                    }
                    action={action}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => (
                        <CourseCard key={course.id} course={course} />
                    ))}
                </div>
            )}
            {manages ? (
                <CreateCourseDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} />
            ) : (
                <JoinCourseDialog isOpen={joinOpen} onClose={() => setJoinOpen(false)} initialCode={sharedCode} />
            )}
        </>
    )
}
