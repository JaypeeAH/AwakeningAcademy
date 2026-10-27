'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import PageHeader from '@/components/shared/PageHeader'
import StatTile from '@/components/shared/StatTile'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import Loading from '@/components/shared/Loading'
import Skeleton from '@/components/ui/Skeleton'
import { RecentAuditSWRProvider } from '@/components/admin/audit/AuditSWRProviders'
import { getAuditActionLabel } from '@/components/admin/audit/AuditDetails'
import navigationIcon, { AuditIcon, CheckIcon, ForwardIcon, StudentsIcon, XpIcon } from '@/configs/icons.config'
import { adminAuditPath, adminProgressionPath, adminUsersPath, coursesPath } from '@/configs/app.config'
import { useSWRAdminOverview } from '@/services/misc'
import { useAdminOverviewStore } from '@/stores/GameStores'
import { useRecentAuditStore } from '@/stores/AdminStores'
import { roleLabel } from '@/@types/auth/Roles'
import useSession from '@/utils/hooks/useSession'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { fromNow } from '@/utils/dates'
import type { ProviderProps } from '@/@types/common'
import type { ReactNode } from 'react'

function AdminOverviewSWRProvider({ children }: ProviderProps) {
    const swr = useSWRAdminOverview()
    const setData = useAdminOverviewStore((s) => s.setData)
    const setLoading = useAdminOverviewStore((s) => s.setLoading)
    const setError = useAdminOverviewStore((s) => s.setError)
    const setRefresh = useAdminOverviewStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

const QUICK_LINKS: { href: string; title: string; description: string; icon: ReactNode }[] = [
    {
        href: adminUsersPath,
        title: 'Users & roles',
        description: 'Promote teachers, find students, correct XP.',
        icon: navigationIcon.users,
    },
    {
        href: adminProgressionPath,
        title: 'Progression rules',
        description: 'Level formula, rank gates and XP limits.',
        icon: navigationIcon.progression,
    },
    {
        href: adminAuditPath,
        title: 'Audit log',
        description: 'Who changed roles, rules, XP and content.',
        icon: navigationIcon.audit,
    },
    {
        href: coursesPath,
        title: 'Courses',
        description: 'Administrators can open and manage every course.',
        icon: navigationIcon.courses,
    },
]

function OverviewTiles() {
    const overview = useAdminOverviewStore((s) => s.data)
    const error = useAdminOverviewStore((s) => s.error)
    const refresh = useAdminOverviewStore((s) => s.refresh)

    if (error && !overview) return <ErrorState message={error} onRetry={() => void refresh()} />
    if (!overview) {
        return (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} height={92} className="rounded-2xl" />
                ))}
            </div>
        )
    }
    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Students" value={overview.users.student.toLocaleString()} icon={<StudentsIcon />} />
            <StatTile label="Teachers" value={overview.users.teacher.toLocaleString()} icon={navigationIcon.teaching} />
            <StatTile
                label="Administrators"
                value={overview.users.admin.toLocaleString()}
                icon={navigationIcon.users}
            />
            <StatTile label="Active courses" value={overview.courses.toLocaleString()} icon={navigationIcon.courses} />
            <StatTile
                label="Published activities"
                value={overview.publishedActivities.toLocaleString()}
                icon={navigationIcon.quests}
            />
            <StatTile
                label="XP awarded"
                value={overview.xpAwardedThisWeek.toLocaleString()}
                hint="In the last 7 days"
                icon={<XpIcon />}
            />
        </div>
    )
}

function RecentActivity() {
    const feed = useRecentAuditStore((s) => s.data)
    const loading = useRecentAuditStore((s) => s.loading)
    const error = useRecentAuditStore((s) => s.error)
    const refresh = useRecentAuditStore((s) => s.refresh)
    const events = feed?.records.slice(0, 8) ?? []

    return (
        <Card
            header={{
                content: <h4>Recent changes</h4>,
                extra: (
                    <Link
                        href={adminAuditPath}
                        className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                        Full audit log <ForwardIcon aria-hidden />
                    </Link>
                ),
            }}
        >
            {error && !feed ? (
                <ErrorState message={error} onRetry={() => void refresh()} className="py-6" />
            ) : (
                <Loading loading={loading && !feed} message="Loading recent changes…">
                    {events.length === 0 ? (
                        <EmptyState
                            compact
                            icon={<AuditIcon />}
                            title="Nothing recorded yet"
                            description="Role changes, rule updates, XP adjustments and publishing will be listed here."
                        />
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {events.map((event) => (
                                <li key={event.id} className="flex items-start justify-between gap-3 py-2.5">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {getAuditActionLabel(event.action)}
                                        </div>
                                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                            {event.actorName ?? 'System'}
                                            {event.actorRole && ` · ${roleLabel[event.actorRole]}`}
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                        {fromNow(event.createdAt)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Loading>
            )}
        </Card>
    )
}

function GettingStarted() {
    const steps = [
        {
            title: 'Give teachers their role',
            body: 'Everyone signs up as a student. Open Users & roles and change your teachers to Teacher.',
            href: adminUsersPath,
        },
        {
            title: 'Review the progression rules',
            body: 'Check the level formula, the mastery each rank needs, and the XP range teachers may award.',
            href: adminProgressionPath,
        },
        {
            title: 'Teachers create courses',
            body: 'Teachers create a course, add lessons and quizzes, and share its join code with their class.',
            href: coursesPath,
        },
    ]
    return (
        <Card header={{ content: <h4>Getting started</h4> }}>
            <ol className="space-y-4">
                {steps.map((step, i) => (
                    <li key={step.title} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary">
                            {i + 1}
                        </span>
                        <div>
                            <Link
                                href={step.href}
                                className="font-semibold text-gray-900 hover:text-primary dark:text-gray-100"
                            >
                                {step.title}
                            </Link>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{step.body}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <CheckIcon aria-hidden /> Every change here is recorded in the audit log.
            </p>
        </Card>
    )
}

/** The administrator's home: platform numbers, where to go, and what changed recently. */
export default function AdminDashboardClientPage() {
    const { user } = useSession()
    return (
        <AdminOverviewSWRProvider>
            <RecentAuditSWRProvider>
                <PageHeader
                    eyebrow="Administration"
                    title={`Welcome, ${user?.name ?? 'Administrator'}`}
                    description="Run the Academy: people, rules and records. You can also open and manage any course."
                />
                <OverviewTiles />
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {QUICK_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800"
                        >
                            <span className="text-2xl text-primary">{link.icon}</span>
                            <div className="mt-2 font-semibold text-gray-900 group-hover:text-primary dark:text-gray-100">
                                {link.title}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{link.description}</p>
                        </Link>
                    ))}
                </div>
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <RecentActivity />
                    </div>
                    <GettingStarted />
                </div>
            </RecentAuditSWRProvider>
        </AdminOverviewSWRProvider>
    )
}
