'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Tabs from '@/components/ui/Tabs'
import ManageCourseHeader from './ManageCourseHeader'
import ContentTab from './ContentTab'
import RosterTab from './RosterTab'
import ProgressTab from './ProgressTab'
import BankTab from './BankTab'
import SecretsTab from './SecretsTab'
import GuildsTab from './GuildsTab'
import LeaderboardTab from './LeaderboardTab'
import { useCourseStore } from '@/stores/GameStores'
import { coursesPath, getCoursePath, type CourseTab } from '@/configs/app.config'
import navigationIcon, { BankIcon, StudentsIcon } from '@/configs/icons.config'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'

interface CourseManageViewProps {
    courseId: string
}

const TABS: CourseTab[] = ['content', 'roster', 'progress', 'bank', 'secrets', 'guilds', 'leaderboard']
const isTab = (value: string | null): value is CourseTab => !!value && (TABS as string[]).includes(value)

/** The teacher's view of a course: content, roster, progress, question bank, secrets, guilds and leaderboard. Tab kept in ?tab=. */
export default function CourseManageView({ courseId }: CourseManageViewProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const course = useCourseStore(courseId, (s) => s.data?.course)
    const tabParam = searchParams.get('tab')
    const tab: CourseTab = isTab(tabParam) ? tabParam : 'content'

    usePageBreadcrumbs([{ label: 'Courses', href: coursesPath }, { label: course?.title ?? 'Course' }])

    if (!course) return null

    return (
        <>
            <ManageCourseHeader course={course} />
            <Tabs
                value={tab}
                onChange={(value) => router.replace(getCoursePath(courseId, value as CourseTab), { scroll: false })}
            >
                <Tabs.TabList className="mb-6 overflow-x-auto">
                    <Tabs.TabNav value="content" icon={navigationIcon.route}>
                        Content
                    </Tabs.TabNav>
                    <Tabs.TabNav value="roster" icon={<StudentsIcon />}>
                        Roster{course.stats.studentCount !== null ? ` (${course.stats.studentCount})` : ''}
                    </Tabs.TabNav>
                    <Tabs.TabNav value="progress" icon={navigationIcon.progression}>
                        Progress
                    </Tabs.TabNav>
                    <Tabs.TabNav value="bank" icon={<BankIcon />}>
                        Question bank
                    </Tabs.TabNav>
                    <Tabs.TabNav value="secrets" icon={navigationIcon.easter}>
                        Secrets
                    </Tabs.TabNav>
                    <Tabs.TabNav value="guilds" icon={navigationIcon.guilds}>
                        Guilds
                    </Tabs.TabNav>
                    <Tabs.TabNav value="leaderboard" icon={navigationIcon.leaderboard}>
                        Leaderboard
                    </Tabs.TabNav>
                </Tabs.TabList>
                <Tabs.TabContent value="content">
                    <ContentTab courseId={courseId} />
                </Tabs.TabContent>
                <Tabs.TabContent value="roster">
                    <RosterTab courseId={courseId} />
                </Tabs.TabContent>
                <Tabs.TabContent value="progress">
                    <ProgressTab courseId={courseId} />
                </Tabs.TabContent>
                <Tabs.TabContent value="bank">{tab === 'bank' && <BankTab courseId={courseId} />}</Tabs.TabContent>
                <Tabs.TabContent value="secrets">
                    {tab === 'secrets' && <SecretsTab courseId={courseId} />}
                </Tabs.TabContent>
                <Tabs.TabContent value="guilds">
                    {tab === 'guilds' && <GuildsTab courseId={courseId} />}
                </Tabs.TabContent>
                <Tabs.TabContent value="leaderboard">
                    {tab === 'leaderboard' && <LeaderboardTab courseId={courseId} />}
                </Tabs.TabContent>
            </Tabs>
        </>
    )
}
