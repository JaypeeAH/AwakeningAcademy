'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Table from '@/components/ui/Table'
import Alert from '@/components/ui/Alert'
import PageHeader from '@/components/shared/PageHeader'
import StatTile from '@/components/shared/StatTile'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import SystemPanel from '@/components/game/SystemPanel'
import { BarList, ScoreHistogram } from './charts'
import navigationIcon from '@/configs/icons.config'
import { getActivityResultsPath, getCoursePath } from '@/configs/app.config'
import { useSWRCourses } from '@/services/courses'
import { useSWRAnalytics } from '@/services/analytics'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import { formatDate } from '@/utils/dates'
import { tryGetErrorMessage } from '@/utils/errors'
import { xpSourceLabel } from '@/@types/progression/XpSourceOptions'
import type { AnalyticsFilters, CourseAnalytics } from '@/@types/reports/Analytics'

const { THead, TBody, Tr, Th, Td } = Table

/** Markdown-free one-liner of a question prompt */
const plainPrompt = (prompt: string) =>
    prompt
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[#*_`>]/g, '')
        .replace(/\s+/g, ' ')
        .trim()

const percent = (value: number | null) => (value === null ? '—' : `${Math.round(value)}%`)

function Section({
    eyebrow,
    title,
    description,
    children,
}: {
    eyebrow: string
    title: string
    description?: string
    children: ReactNode
}) {
    return (
        <SystemPanel eyebrow={eyebrow} title={title}>
            {description && <p className="-mt-1 mb-4 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            {children}
        </SystemPanel>
    )
}

/** Learning analytics for a teacher's course: academic signals first, engagement apart and last. */
export default function AnalyticsClientPage() {
    usePageBreadcrumbs([{ label: 'Analytics' }])
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()
    const courses = useSWRCourses()
    const teaching = useMemo(() => (courses.data ?? []).filter((c) => c.canManage), [courses.data])
    const courseId = params.get('course') ?? teaching[0]?.id ?? null

    const [filters, setFilters] = useState<Partial<AnalyticsFilters>>({})
    const [fromText, setFromText] = useState('')
    const [toText, setToText] = useState('')
    const analytics = useSWRAnalytics(courseId, filters)

    const selectCourse = (id: string) => {
        setFilters({})
        setFromText('')
        setToText('')
        router.replace(`${pathname}?course=${id}`, { scroll: false })
    }
    const setDate = (which: 'from' | 'to', value: string) => {
        if (which === 'from') setFromText(value)
        else setToText(value)
        setFilters((f) => ({ ...f, [which]: value ? new Date(`${value}T00:00:00Z`) : null }))
    }

    if (courses.isLoading) return <Loading loading message="Loading your courses…" />
    if (courses.error)
        return <ErrorState message={tryGetErrorMessage(courses.error)} onRetry={() => void courses.mutate()} />
    if (!teaching.length) {
        return (
            <>
                <PageHeader title="Analytics" />
                <EmptyState
                    icon={navigationIcon.analytics}
                    title="No courses to analyse yet"
                    description="Analytics appear for the courses you teach once students start handing in work."
                />
            </>
        )
    }

    const courseOptions = teaching.map((c) => ({ value: c.id, label: c.title }))
    const data = analytics.data
    const moduleOptions = [
        { value: '', label: 'All modules' },
        ...(data?.options.modules ?? []).map((m) => ({ value: m.id, label: m.title })),
    ]
    const studentOptions = [
        { value: '', label: 'All students' },
        ...(data?.options.students ?? []).map((s) => ({ value: s.id, label: s.displayName })),
    ]
    const filtered = !!(filters.moduleId || filters.studentId || filters.from || filters.to)

    return (
        <div>
            <PageHeader
                title="Analytics"
                description="How your students are learning. Scores and objectives come first; XP is engagement and is shown separately."
                actions={
                    courseId && (
                        <Link
                            href={getCoursePath(courseId, 'progress')}
                            className="text-sm font-semibold text-primary hover:underline"
                        >
                            Open the gradebook
                        </Link>
                    )
                }
            />

            {/* Filters: one row above the charts */}
            <div className="mb-6 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1.5fr_1fr_1fr_auto] lg:items-end dark:border-gray-700 dark:bg-gray-800">
                <div>
                    <label htmlFor="analytics-course" className="form-label mb-1 block">
                        Course
                    </label>
                    <Select
                        inputId="analytics-course"
                        options={courseOptions}
                        value={courseOptions.find((o) => o.value === courseId)}
                        onChange={(o) => o && selectCourse(o.value)}
                    />
                </div>
                <div>
                    <label htmlFor="analytics-module" className="form-label mb-1 block">
                        Module
                    </label>
                    <Select
                        inputId="analytics-module"
                        options={moduleOptions}
                        value={moduleOptions.find((o) => o.value === (filters.moduleId ?? ''))}
                        onChange={(o) => setFilters((f) => ({ ...f, moduleId: o?.value || null }))}
                        isSearchable={false}
                    />
                </div>
                <div>
                    <label htmlFor="analytics-student" className="form-label mb-1 block">
                        Student
                    </label>
                    <Select
                        inputId="analytics-student"
                        options={studentOptions}
                        value={studentOptions.find((o) => o.value === (filters.studentId ?? ''))}
                        onChange={(o) => setFilters((f) => ({ ...f, studentId: o?.value || null }))}
                    />
                </div>
                <div>
                    <label htmlFor="analytics-from" className="form-label mb-1 block">
                        From
                    </label>
                    <Input
                        id="analytics-from"
                        type="date"
                        value={fromText}
                        max={toText || undefined}
                        onChange={(e) => setDate('from', e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="analytics-to" className="form-label mb-1 block">
                        To
                    </label>
                    <Input
                        id="analytics-to"
                        type="date"
                        value={toText}
                        min={fromText || undefined}
                        onChange={(e) => setDate('to', e.target.value)}
                    />
                </div>
                <Button
                    disabled={!filtered}
                    onClick={() => {
                        setFilters({})
                        setFromText('')
                        setToText('')
                    }}
                >
                    Clear
                </Button>
            </div>

            {!data ? (
                analytics.error ? (
                    <ErrorState message={tryGetErrorMessage(analytics.error)} onRetry={() => void analytics.mutate()} />
                ) : (
                    <Loading loading message="Crunching the numbers…" />
                )
            ) : (
                <AnalyticsReport
                    data={data}
                    filtered={filtered}
                    courseId={courseId!}
                    refreshing={analytics.isValidating}
                />
            )}
        </div>
    )
}

function AnalyticsReport({
    data,
    filtered,
    courseId,
    refreshing,
}: {
    data: CourseAnalytics
    filtered: boolean
    courseId: string
    refreshing: boolean
}) {
    const { summary } = data
    if (!summary.totalStudents) {
        return (
            <EmptyState
                icon={navigationIcon.analytics}
                title="No students yet"
                description="Once students join this course and hand in work, their results appear here."
            />
        )
    }
    const noWork = summary.gradedAttempts === 0 && summary.awaitingMarking === 0 && !data.work.incomplete.length

    return (
        <div className={refreshing ? 'opacity-70 transition-opacity' : undefined} aria-busy={refreshing}>
            {noWork ? (
                <EmptyState
                    icon={navigationIcon.analytics}
                    title={filtered ? 'Nothing matches these filters' : 'No graded work yet'}
                    description={
                        filtered
                            ? 'Try a wider date range, or another module or student.'
                            : 'Results appear as students complete quizzes, exams and homework.'
                    }
                />
            ) : (
                <div className="space-y-6">
                    {/* ── Learning ── */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <StatTile
                            label="Graded attempts"
                            value={summary.gradedAttempts}
                            hint="Quizzes, exams, homework, boss battles"
                        />
                        <StatTile
                            label="Average score"
                            value={percent(summary.averagePercent)}
                            hint="Across graded attempts"
                        />
                        <StatTile
                            label="Pass rate"
                            value={percent(summary.passRate)}
                            hint="Attempts at or above the passing score"
                        />
                        <StatTile
                            label="Active students"
                            value={`${summary.activeStudents} / ${summary.totalStudents}`}
                            hint="Handed in at least once"
                        />
                        <StatTile
                            label="Awaiting marking"
                            value={summary.awaitingMarking}
                            hint={summary.awaitingMarking ? 'Open Grading to mark them' : 'All marked'}
                        />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            eyebrow="Learning"
                            title="Score distribution"
                            description="Graded attempts in each 10-point band."
                        >
                            {summary.gradedAttempts ? (
                                <ScoreHistogram buckets={data.scoreDistribution} />
                            ) : (
                                <p className="text-sm text-gray-500">No graded attempts yet.</p>
                            )}
                        </Section>
                        <Section
                            eyebrow="Learning"
                            title="Performance by learning objective"
                            description="Points earned out of points possible, weakest first. Link questions to objectives in the Quest Builder."
                        >
                            {data.objectives.length ? (
                                <BarList
                                    caption="Performance by learning objective"
                                    max={100}
                                    rows={data.objectives.map((o) => ({
                                        key: o.objective,
                                        label: o.objective,
                                        name: o.objective,
                                        value: o.percent,
                                        valueLabel: `${Math.round(o.percent)}%`,
                                        detail: `${o.responses} ${o.responses === 1 ? 'answer' : 'answers'}`,
                                    }))}
                                />
                            ) : (
                                <p className="text-sm text-gray-500">No marked answers yet.</p>
                            )}
                        </Section>
                    </div>

                    <Section
                        eyebrow="Learning gaps"
                        title="Most-missed questions"
                        description="Questions answered at least 3 times, by how often they're wrong (a partly right answer counts half). Easter Bunny skips are counted apart and never as wrong."
                    >
                        {data.missedQuestions.length ? (
                            <div className="overflow-x-auto">
                                <Table compact>
                                    <THead>
                                        <Tr>
                                            <Th>Question</Th>
                                            <Th>Activity</Th>
                                            <Th className="text-right">Wrong</Th>
                                            <Th className="text-right">Answered</Th>
                                            <Th className="text-right">Partly right</Th>
                                            <Th className="text-right">Skipped</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {data.missedQuestions.map((q) => (
                                            <Tr key={q.questionId}>
                                                <Td className="max-w-md">
                                                    <span className="line-clamp-2">{plainPrompt(q.prompt)}</span>
                                                </Td>
                                                <Td>
                                                    <Link
                                                        href={getActivityResultsPath(courseId, q.activityId)}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {q.activityTitle}
                                                    </Link>
                                                </Td>
                                                <Td className="text-right font-semibold tabular-nums">
                                                    {Math.round(q.incorrectRate)}%
                                                </Td>
                                                <Td className="text-right tabular-nums">{q.answered}</Td>
                                                <Td className="text-right tabular-nums">{q.partial}</Td>
                                                <Td className="text-right tabular-nums text-gray-500">{q.skipped}</Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No question is being missed often yet.</p>
                        )}
                    </Section>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <Section
                            eyebrow="Work"
                            title="Overdue"
                            description="Past the due date and not finished (graded work must be passed)."
                        >
                            {data.work.overdue.length ? (
                                <ul className="space-y-3">
                                    {data.work.overdue.map((o) => (
                                        <li
                                            key={o.activityId}
                                            className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
                                        >
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <span className="font-semibold text-gray-900 dark:text-gray-50">
                                                    {o.title}
                                                </span>
                                                <span className="text-xs text-warning">Due {formatDate(o.dueAt)}</span>
                                            </div>
                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                {o.students.map((s) => s.displayName).join(', ')}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">Nothing overdue. 🎉</p>
                            )}
                        </Section>
                        <Section
                            eyebrow="Work"
                            title="Not finished yet"
                            description="How many students have finished each activity, least-finished first."
                        >
                            {data.work.incomplete.length ? (
                                <BarList
                                    caption="Completion by activity"
                                    max={100}
                                    rows={data.work.incomplete.slice(0, 12).map((i) => ({
                                        key: i.activityId,
                                        label: i.title,
                                        name: i.title,
                                        value: i.total ? (i.completed / i.total) * 100 : 0,
                                        valueLabel: `${i.completed} / ${i.total}`,
                                        detail: i.dueAt ? `due ${formatDate(i.dueAt)}` : undefined,
                                    }))}
                                />
                            ) : (
                                <p className="text-sm text-gray-500">Everyone has finished everything.</p>
                            )}
                        </Section>
                    </div>

                    <Section
                        eyebrow="Practice"
                        title="Retries"
                        description="Activities students attempted more than once."
                    >
                        {data.retries.length ? (
                            <div className="overflow-x-auto">
                                <Table compact>
                                    <THead>
                                        <Tr>
                                            <Th>Activity</Th>
                                            <Th className="text-right">Students</Th>
                                            <Th className="text-right">Attempts</Th>
                                            <Th className="text-right">Average per student</Th>
                                            <Th className="text-right">Most by one student</Th>
                                        </Tr>
                                    </THead>
                                    <TBody>
                                        {data.retries.map((r) => (
                                            <Tr key={r.activityId}>
                                                <Td>{r.title}</Td>
                                                <Td className="text-right tabular-nums">{r.students}</Td>
                                                <Td className="text-right tabular-nums">{r.attempts}</Td>
                                                <Td className="text-right tabular-nums">{r.averageAttempts}</Td>
                                                <Td className="text-right tabular-nums">{r.maxAttempts}</Td>
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No retries in this period.</p>
                        )}
                    </Section>
                </div>
            )}

            {/* ── Engagement: secondary, last ── */}
            <div className="mt-10">
                <h2 className="mb-1 text-lg">Engagement</h2>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                    Game activity, kept apart from learning results: it shows motivation, not mastery.
                </p>
                <div className="grid gap-6 xl:grid-cols-2">
                    <Section
                        eyebrow="Engagement"
                        title="Skipped questions"
                        description="Questions skipped with an Easter Bunny (recorded as skipped, never correct)."
                    >
                        {data.skipped.total ? (
                            <BarList
                                muted
                                caption="Skipped questions by activity"
                                rows={data.skipped.byActivity.map((s) => ({
                                    key: s.activityId,
                                    label: s.title,
                                    name: s.title,
                                    value: s.count,
                                    valueLabel: `${s.count}`,
                                }))}
                            />
                        ) : (
                            <p className="text-sm text-gray-500">No skips.</p>
                        )}
                    </Section>
                    <Section eyebrow="Engagement" title="XP earned in this course">
                        <div className="mb-4 grid grid-cols-2 gap-3">
                            <StatTile
                                label="For finishing work"
                                value={data.xp.academic.toLocaleString()}
                                hint="Lessons, quizzes, exams, homework, boss battles"
                            />
                            <StatTile
                                label="Bonus XP"
                                value={data.xp.bonusTotal.toLocaleString()}
                                hint="High scores, secrets, streaks, skills, achievements, team quests"
                            />
                        </div>
                        {data.xp.bonus.length > 0 && (
                            <BarList
                                muted
                                caption="Bonus XP by source"
                                rows={data.xp.bonus.map((b) => ({
                                    key: b.source,
                                    label: xpSourceLabel[b.source],
                                    name: xpSourceLabel[b.source],
                                    value: b.amount,
                                    valueLabel: `${b.amount.toLocaleString()} XP`,
                                }))}
                            />
                        )}
                        {data.xp.adjustments !== 0 && (
                            <Alert type="info" showIcon className="mt-4">
                                Manual XP adjustments in this period: {data.xp.adjustments > 0 ? '+' : ''}
                                {data.xp.adjustments.toLocaleString()} XP (not counted above).
                            </Alert>
                        )}
                    </Section>
                </div>
            </div>
        </div>
    )
}
