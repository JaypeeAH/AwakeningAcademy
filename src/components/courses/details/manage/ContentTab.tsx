'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import LinkButton from '@/components/ui/LinkButton'
import Switcher from '@/components/ui/Switcher'
import Tooltip from '@/components/ui/Tooltip'
import EmptyState from '@/components/shared/EmptyState'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { ActivityKindTag, PublishStatusTag, XpReward } from '@/components/game/GameTags'
import ModuleDialog from './ModuleDialog'
import NewActivityDialog from './NewActivityDialog'
import navigationIcon, { AddIcon, DeleteIcon, EditIcon, MoveDownIcon, MoveUpIcon } from '@/configs/icons.config'
import { apiDeleteActivity, apiReorderActivities } from '@/services/activities'
import { apiDeleteModule, apiReorderModules } from '@/services/courses'
import { getCourseActivitiesState, getCourseState, useCourseActivitiesStore, useCourseStore } from '@/stores/GameStores'
import { getActivityEditPath, getActivityResultsPath } from '@/configs/app.config'
import { isAssessment } from '@/@types/activities/ActivityKindOptions'
import { formatDate } from '@/utils/dates'
import { getErrorCode } from '@/utils/errors'
import type { ActivitySummary } from '@/@types/activities/Activity'
import type { CourseModule } from '@/@types/courses/Course'

interface ContentTabProps {
    courseId: string
}

interface Section {
    module: CourseModule | null
    activities: ActivitySummary[]
}

const NO_MODULE = '__none__'

/** Modules and the activities in them: add, edit, reorder, publish status at a glance */
export default function ContentTab({ courseId }: ContentTabProps) {
    const modules = useCourseStore(courseId, (s) => s.data?.modules)
    const activityData = useCourseActivitiesStore(courseId, (s) => s.data)
    const loading = useCourseActivitiesStore(courseId, (s) => s.loading)
    const error = useCourseActivitiesStore(courseId, (s) => s.error)
    const refreshActivities = useCourseActivitiesStore(courseId, (s) => s.refresh)

    const [showArchived, setShowArchived] = useState(false)
    const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module: CourseModule | null }>({
        open: false,
        module: null,
    })
    const [newActivity, setNewActivity] = useState<{ open: boolean; moduleId: string | null }>({
        open: false,
        moduleId: null,
    })
    const [deleting, setDeleting] = useState<
        { kind: 'module'; item: CourseModule } | { kind: 'activity'; item: ActivitySummary } | null
    >(null)
    const [busy, setBusy] = useState(false)

    const allActivities = useMemo(
        () => [...(activityData?.activities ?? [])].sort((a, b) => a.position - b.position),
        [activityData],
    )
    const archivedCount = allActivities.filter((a) => a.status === 'archived').length

    const sections = useMemo<Section[]>(() => {
        const visible = allActivities.filter((a) => showArchived || a.status !== 'archived')
        const sorted = [...(modules ?? [])].sort((a, b) => a.position - b.position)
        const result: Section[] = sorted.map((m) => ({
            module: m,
            activities: visible.filter((a) => a.moduleId === m.id),
        }))
        const loose = visible.filter((a) => !a.moduleId || !sorted.some((m) => m.id === a.moduleId))
        if (loose.length || !sorted.length) result.push({ module: null, activities: loose })
        return result
    }, [allActivities, modules, showArchived])

    const run = async (action: () => Promise<unknown>, failure: string) => {
        setBusy(true)
        try {
            await action()
        } catch (e) {
            toastError(failure, e)
        } finally {
            setBusy(false)
        }
    }

    /** Swap an activity with its neighbour in the same section, then save the whole course order */
    const moveActivity = (section: Section, index: number, delta: -1 | 1) => {
        const target = section.activities[index + delta]
        if (!target) return
        const current = section.activities[index]
        const order = allActivities.map((a) => a.id)
        const i = order.indexOf(current.id)
        const j = order.indexOf(target.id)
        ;[order[i], order[j]] = [order[j], order[i]]
        void run(async () => {
            await apiReorderActivities(courseId, order)
            await refreshActivities()
        }, 'Couldn’t reorder the activities.')
    }

    const moveModule = (index: number, delta: -1 | 1) => {
        const ordered = [...(modules ?? [])].sort((a, b) => a.position - b.position).map((m) => m.id)
        const j = index + delta
        if (j < 0 || j >= ordered.length) return
        ;[ordered[index], ordered[j]] = [ordered[j], ordered[index]]
        void run(async () => {
            await apiReorderModules(courseId, ordered)
            await getCourseState(courseId).refresh()
        }, 'Couldn’t reorder the modules.')
    }

    const confirmDelete = async () => {
        if (!deleting) return
        setBusy(true)
        try {
            if (deleting.kind === 'module') {
                await apiDeleteModule(deleting.item.id)
                await Promise.all([getCourseState(courseId).refresh(), getCourseActivitiesState(courseId).refresh()])
                toastSuccess('Module deleted. Its activities moved to “No module”.')
            } else {
                await apiDeleteActivity(deleting.item.id)
                await refreshActivities()
                toastSuccess('Activity deleted.')
            }
            setDeleting(null)
        } catch (e) {
            toastError(
                getErrorCode(e) === 'HAS_STUDENT_WORK'
                    ? 'Students have already worked on this activity, so it can’t be deleted. Open it and archive it instead — their results are kept.'
                    : 'Couldn’t delete it.',
                getErrorCode(e) === 'HAS_STUDENT_WORK' ? undefined : e,
            )
            setDeleting(null)
        } finally {
            setBusy(false)
        }
    }

    if (!activityData) {
        return error ? (
            <ErrorState message={error} onRetry={() => void refreshActivities()} />
        ) : (
            <Loading loading={loading} message="Loading content…" />
        )
    }

    const sortedModules = [...(modules ?? [])].sort((a, b) => a.position - b.position)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<AddIcon />}
                        onClick={() => setNewActivity({ open: true, moduleId: null })}
                    >
                        New activity
                    </Button>
                    <Button size="sm" icon={<AddIcon />} onClick={() => setModuleDialog({ open: true, module: null })}>
                        New module
                    </Button>
                </div>
                {archivedCount > 0 && (
                    <label className="flex items-center gap-2 text-sm text-gray-500">
                        <Switcher checked={showArchived} onChange={setShowArchived} />
                        Show archived ({archivedCount})
                    </label>
                )}
            </div>

            {allActivities.length === 0 && sortedModules.length === 0 ? (
                <EmptyState
                    icon={navigationIcon.route}
                    title="No content yet"
                    description="Start with a lesson, then add a quiz to check understanding. Group them into modules (chapters) when the course grows."
                    action={
                        <Button
                            variant="solid"
                            icon={<AddIcon />}
                            onClick={() => setNewActivity({ open: true, moduleId: null })}
                        >
                            Create the first activity
                        </Button>
                    }
                />
            ) : (
                sections.map((section) => {
                    const moduleIndex = section.module
                        ? sortedModules.findIndex((m) => m.id === section.module!.id)
                        : -1
                    return (
                        <section
                            key={section.module?.id ?? NO_MODULE}
                            className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                        >
                            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                                <div className="min-w-0">
                                    <h3 className="text-base">{section.module?.title ?? 'No module'}</h3>
                                    {section.module?.description && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {section.module.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        icon={<AddIcon />}
                                        onClick={() =>
                                            setNewActivity({ open: true, moduleId: section.module?.id ?? null })
                                        }
                                    >
                                        Add
                                    </Button>
                                    {section.module && (
                                        <>
                                            <Button
                                                size="xs"
                                                variant="plain"
                                                icon={<MoveUpIcon />}
                                                aria-label="Move module up"
                                                disabled={busy || moduleIndex === 0}
                                                onClick={() => moveModule(moduleIndex, -1)}
                                            />
                                            <Button
                                                size="xs"
                                                variant="plain"
                                                icon={<MoveDownIcon />}
                                                aria-label="Move module down"
                                                disabled={busy || moduleIndex === sortedModules.length - 1}
                                                onClick={() => moveModule(moduleIndex, 1)}
                                            />
                                            <Button
                                                size="xs"
                                                variant="plain"
                                                icon={<EditIcon />}
                                                aria-label="Edit module"
                                                onClick={() => setModuleDialog({ open: true, module: section.module })}
                                            />
                                            <Button
                                                size="xs"
                                                variant="plain"
                                                icon={<DeleteIcon />}
                                                aria-label="Delete module"
                                                onClick={() => setDeleting({ kind: 'module', item: section.module! })}
                                            />
                                        </>
                                    )}
                                </div>
                            </header>
                            {section.activities.length === 0 ? (
                                <p className="px-4 py-5 text-sm text-gray-500 dark:text-gray-400">
                                    No activities in this module yet.
                                </p>
                            ) : (
                                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {section.activities.map((activity, index) => (
                                        <li
                                            key={activity.id}
                                            className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <Link
                                                    href={getActivityEditPath(courseId, activity.id)}
                                                    className="font-semibold text-gray-900 hover:text-primary dark:text-gray-50"
                                                >
                                                    {activity.title}
                                                </Link>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <ActivityKindTag kind={activity.kind} />
                                                    <PublishStatusTag status={activity.status} />
                                                    <XpReward amount={activity.xpReward} />
                                                    {isAssessment(activity.kind) && (
                                                        <span>
                                                            {activity.questionCount}{' '}
                                                            {activity.questionCount === 1 ? 'question' : 'questions'}
                                                        </span>
                                                    )}
                                                    {activity.dueAt && <span>Due {formatDate(activity.dueAt)}</span>}
                                                    {activity.prerequisiteIds.length > 0 && (
                                                        <span>Has prerequisites</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-1">
                                                <LinkButton
                                                    size="xs"
                                                    href={getActivityEditPath(courseId, activity.id)}
                                                    icon={<EditIcon />}
                                                >
                                                    Edit
                                                </LinkButton>
                                                {isAssessment(activity.kind) && (
                                                    <LinkButton
                                                        size="xs"
                                                        href={getActivityResultsPath(courseId, activity.id)}
                                                        icon={navigationIcon.clipboard}
                                                    >
                                                        Results
                                                    </LinkButton>
                                                )}
                                                <Button
                                                    size="xs"
                                                    variant="plain"
                                                    icon={<MoveUpIcon />}
                                                    aria-label={`Move “${activity.title}” up`}
                                                    disabled={busy || index === 0}
                                                    onClick={() => moveActivity(section, index, -1)}
                                                />
                                                <Button
                                                    size="xs"
                                                    variant="plain"
                                                    icon={<MoveDownIcon />}
                                                    aria-label={`Move “${activity.title}” down`}
                                                    disabled={busy || index === section.activities.length - 1}
                                                    onClick={() => moveActivity(section, index, 1)}
                                                />
                                                <Tooltip title="Delete (only before students have started it)">
                                                    <Button
                                                        size="xs"
                                                        variant="plain"
                                                        icon={<DeleteIcon />}
                                                        aria-label={`Delete “${activity.title}”`}
                                                        onClick={() =>
                                                            setDeleting({ kind: 'activity', item: activity })
                                                        }
                                                    />
                                                </Tooltip>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    )
                })
            )}

            <ModuleDialog
                courseId={courseId}
                module={moduleDialog.module}
                isOpen={moduleDialog.open}
                onClose={() => setModuleDialog({ open: false, module: null })}
            />
            <NewActivityDialog
                courseId={courseId}
                modules={sortedModules}
                moduleId={newActivity.moduleId}
                isOpen={newActivity.open}
                onClose={() => setNewActivity({ open: false, moduleId: null })}
            />
            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                type="danger"
                title={
                    deleting?.kind === 'module'
                        ? `Delete the module “${deleting.item.title}”?`
                        : `Delete “${deleting?.item.title}”?`
                }
                confirmText="Delete"
                onConfirm={confirmDelete}
                loading={busy}
            >
                {deleting?.kind === 'module'
                    ? 'Its activities are kept and move to “No module”. This can’t be undone.'
                    : 'The activity and its questions are removed. This can’t be undone. (Activities students have worked on can only be archived.)'}
            </ConfirmDialog>
        </div>
    )
}
