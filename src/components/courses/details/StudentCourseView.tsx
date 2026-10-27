'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import MarkdownContent from '@/components/shared/MarkdownContent'
import XpBar from '@/components/game/XpBar'
import { SubjectTag } from '@/components/game/GameTags'
import QuestCard from '@/components/quests/QuestCard'
import GuildTab from './student/GuildTab'
import LeaderboardTab from './student/LeaderboardTab'
import navigationIcon from '@/configs/icons.config'
import { coursesPath, getCoursePath, type CourseTab } from '@/configs/app.config'
import { useCourseActivitiesStore, useCourseStore } from '@/stores/GameStores'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import type { Quest } from '@/@types/activities/Activity'

type StudentTab = Extract<CourseTab, 'content' | 'guilds' | 'leaderboard'>
const STUDENT_TABS: StudentTab[] = ['content', 'guilds', 'leaderboard']
const isStudentTab = (value: string | null): value is StudentTab =>
    !!value && (STUDENT_TABS as string[]).includes(value)

/**
 * A course as a student sees it: modules in order, each with its quests and the student's progress; their
 * guild; and the weekly leaderboard. Tab kept in ?tab=.
 */
export default function StudentCourseView({ courseId }: { courseId: string }) {
    const router = useRouter()
    const tabParam = useSearchParams().get('tab')
    const tab: StudentTab = isStudentTab(tabParam) ? tabParam : 'content'
    const detail = useCourseStore(courseId, (s) => s.data)
    const activities = useCourseActivitiesStore(courseId, (s) => s.data)
    const activitiesError = useCourseActivitiesStore(courseId, (s) => s.error)
    const refreshActivities = useCourseActivitiesStore(courseId, (s) => s.refresh)
    usePageBreadcrumbs([{ label: 'Courses', href: coursesPath }, { label: detail?.course.title ?? 'Course' }])

    const sections = useMemo(() => {
        const quests = activities?.quests ?? []
        const modules = [...(detail?.modules ?? [])].sort((a, b) => a.position - b.position)
        const grouped: { id: string; title: string; description: string; quests: Quest[] }[] = modules
            .map((m) => ({
                id: m.id,
                title: m.title,
                description: m.description,
                quests: quests.filter((q) => q.moduleId === m.id),
            }))
            .filter((g) => g.quests.length)
        const loose = quests.filter((q) => !q.moduleId || !modules.some((m) => m.id === q.moduleId))
        if (loose.length)
            grouped.push({
                id: 'none',
                title: modules.length ? 'More quests' : 'Quests',
                description: '',
                quests: loose,
            })
        return grouped
    }, [activities, detail])

    if (!detail) return null
    const { course } = detail
    const completed = course.stats.completedCount ?? 0

    return (
        <div className={`subject-theme-${course.subject.theme}`}>
            <PageHeader
                eyebrow={<SubjectTag subject={course.subject} />}
                title={course.title}
                description={course.teacherNames.length ? `Taught by ${course.teacherNames.join(', ')}` : undefined}
            />
            <div className="subject-bar mb-6 max-w-xl">
                <XpBar
                    value={completed}
                    max={Math.max(course.stats.activityCount, 1)}
                    label="Course progress"
                    valueText={`${completed} / ${course.stats.activityCount} quests completed`}
                />
            </div>
            <Tabs
                value={tab}
                onChange={(value) => router.replace(getCoursePath(courseId, value as CourseTab), { scroll: false })}
            >
                <Tabs.TabList className="mb-6 overflow-x-auto">
                    <Tabs.TabNav value="content" icon={navigationIcon.quests}>
                        Quests
                    </Tabs.TabNav>
                    <Tabs.TabNav value="guilds" icon={navigationIcon.guilds}>
                        Guild
                    </Tabs.TabNav>
                    <Tabs.TabNav value="leaderboard" icon={navigationIcon.leaderboard}>
                        Leaderboard
                    </Tabs.TabNav>
                </Tabs.TabList>
                <Tabs.TabContent value="content">
                    {course.description && (
                        <MarkdownContent className="mb-8 max-w-3xl">{course.description}</MarkdownContent>
                    )}

                    {!activities ? (
                        activitiesError ? (
                            <ErrorState message={activitiesError} onRetry={() => void refreshActivities()} />
                        ) : (
                            <Loading loading message="Loading quests…" />
                        )
                    ) : sections.length === 0 ? (
                        <EmptyState
                            icon={navigationIcon.quests}
                            title="No quests yet"
                            description="Your teacher hasn’t published anything yet. Check back soon."
                        />
                    ) : (
                        <div className="space-y-8">
                            {sections.map((section) => (
                                <section key={section.id} aria-labelledby={`module-${section.id}`}>
                                    <h2 id={`module-${section.id}`} className="text-lg">
                                        {section.title}
                                    </h2>
                                    {section.description && (
                                        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                                            {section.description}
                                        </p>
                                    )}
                                    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                        {section.quests.map((quest) => (
                                            <QuestCard key={quest.id} quest={quest} hideCourse />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </Tabs.TabContent>
                <Tabs.TabContent value="guilds">{tab === 'guilds' && <GuildTab courseId={courseId} />}</Tabs.TabContent>
                <Tabs.TabContent value="leaderboard">
                    {tab === 'leaderboard' && <LeaderboardTab courseId={courseId} />}
                </Tabs.TabContent>
            </Tabs>
        </div>
    )
}
