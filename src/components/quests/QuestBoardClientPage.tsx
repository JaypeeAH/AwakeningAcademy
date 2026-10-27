'use client'

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Segment from '@/components/ui/Segment'
import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import QuestCard from './QuestCard'
import navigationIcon, { SearchIcon } from '@/configs/icons.config'
import { coursesPath } from '@/configs/app.config'
import { useSWRQuests } from '@/services/activities'
import { getVisibleQuests, useQuestBoardStore, type QuestFilterState } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'

function QuestsSWRProvider() {
    const swr = useSWRQuests()
    const setData = useQuestBoardStore((s) => s.setData)
    const setLoading = useQuestBoardStore((s) => s.setLoading)
    const setError = useQuestBoardStore((s) => s.setError)
    const setRefresh = useQuestBoardStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

const STATE_FILTERS: { value: QuestFilterState; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_review', label: 'Being marked' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'locked', label: 'Locked' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
]

/** Every quest across the student's courses, filterable by state, course and text. */
export default function QuestBoardClientPage() {
    usePageBreadcrumbs([{ label: 'Quest Board' }])
    const searchParams = useSearchParams()
    const quests = useQuestBoardStore((s) => s.data)
    const error = useQuestBoardStore((s) => s.error)
    const refresh = useQuestBoardStore((s) => s.refresh)
    const filter = useQuestBoardStore((s) => s.filter)
    const setFilter = useQuestBoardStore((s) => s.setFilter)

    // The header search opens this page with ?q=
    const q = searchParams.get('q')
    useEffect(() => {
        if (q !== null) setFilter({ query: q, state: 'all' })
    }, [q, setFilter])

    const visible = useMemo(() => getVisibleQuests(quests, filter), [quests, filter])
    const courseOptions = useMemo(() => {
        const seen = new Map<string, string>()
        for (const quest of quests ?? []) seen.set(quest.course.id, quest.course.title)
        return [{ value: '', label: 'All courses' }, ...[...seen].map(([value, label]) => ({ value, label }))]
    }, [quests])
    const counts = useMemo(() => {
        const open = (quests ?? []).filter((x) => x.state === 'available' || x.state === 'in_progress').length
        return { open, completed: (quests ?? []).filter((x) => x.state === 'completed').length }
    }, [quests])

    return (
        <>
            <QuestsSWRProvider />
            <PageHeader
                eyebrow="Quest Board"
                title="Choose your next quest"
                description={
                    quests
                        ? `${counts.open} open · ${counts.completed} completed`
                        : 'Lessons, quizzes and exams from all your courses.'
                }
            />
            {!quests ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Gathering your quests…" />
                )
            ) : quests.length === 0 ? (
                <EmptyState
                    icon={navigationIcon.quests}
                    title="The board is empty"
                    description="Join a course with your teacher’s code — its published lessons and quizzes appear here as quests."
                    action={
                        <Link href={coursesPath}>
                            <Button variant="solid">Join a course</Button>
                        </Link>
                    }
                />
            ) : (
                <>
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
                        <Segment
                            value={filter.state}
                            onChange={(value) => setFilter({ state: value as QuestFilterState })}
                            size="sm"
                            className="overflow-x-auto"
                        >
                            {STATE_FILTERS.map((f) => (
                                <Segment.Item key={f.value} value={f.value}>
                                    {f.label}
                                </Segment.Item>
                            ))}
                        </Segment>
                        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                            <div className="sm:w-64">
                                <Select
                                    size="sm"
                                    aria-label="Course"
                                    options={courseOptions}
                                    value={courseOptions.find((o) => o.value === (filter.courseId ?? ''))}
                                    onChange={(option) => setFilter({ courseId: option?.value || null })}
                                    isSearchable={false}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="quest-search" className="sr-only">
                                    Search quests
                                </label>
                                <Input
                                    id="quest-search"
                                    size="sm"
                                    prefix={<SearchIcon className="text-lg" />}
                                    placeholder="Search quests"
                                    value={filter.query}
                                    onChange={(e) => setFilter({ query: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    {visible.length ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {visible.map((quest) => (
                                <QuestCard key={quest.id} quest={quest} />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            compact
                            icon={<SearchIcon />}
                            title="No quests match"
                            description="Try another filter, or show all quests."
                            action={
                                <Button onClick={() => setFilter({ state: 'all', courseId: null, query: '' })}>
                                    Show all quests
                                </Button>
                            }
                        />
                    )}
                </>
            )}
        </>
    )
}
