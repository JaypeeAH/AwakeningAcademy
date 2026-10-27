'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dropdown from '@/components/ui/Dropdown'
import LinkButton from '@/components/ui/LinkButton'
import Tabs from '@/components/ui/Tabs'
import Tooltip from '@/components/ui/Tooltip'
import { Form } from '@/components/ui/Form'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import ErrorState from '@/components/shared/ErrorState'
import Loading from '@/components/shared/Loading'
import PageHeader from '@/components/shared/PageHeader'
import { ActivityKindTag, PublishStatusTag } from '@/components/game/GameTags'
import ActivityDetailsFields from './ActivityDetailsFields'
import ActivitySettingsFields from './ActivitySettingsFields'
import LessonBodyEditor from './LessonBodyEditor'
import ObjectivesEditor from './ObjectivesEditor'
import QuestionListEditor from './QuestionListEditor'
import BossEditor from './BossEditor'
import TeamGoalEditor from './TeamGoalEditor'
import PublishChecklist from './PublishChecklist'
import StudentPreview from './StudentPreview'
import { toFormData, toQuestionInput, toSaveInput } from './activityForm'
import navigationIcon, { ExpandIcon, PreviewIcon, SaveIcon } from '@/configs/icons.config'
import { apiSaveActivity, apiSetActivityStatus } from '@/services/activities'
import { getCourseActivitiesState, useActivityEditorStore } from '@/stores/GameStores'
import { coursesPath, getActivityResultsPath, getCoursePath } from '@/configs/app.config'
import { activityKindLabel, isAssessment, type PublishStatus } from '@/@types/activities/ActivityKindOptions'
import { getActivityFormSchema, type ActivityFormData } from '@/@types/activities/forms/ActivityFormData'
import { getPublishIssues } from '@/utils/activityValidation'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import useUnsavedChangesGuard from '@/utils/hooks/useUnsavedChangesGuard'
import { tryGetErrorMessage } from '@/utils/errors'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'

const FORM_ID = 'activity-editor-form'

interface ActivityEditorClientPageProps {
    activityId: string
}

/** The Quest Builder: edit, preview, save drafts and publish one activity */
export default function ActivityEditorClientPage({ activityId }: ActivityEditorClientPageProps) {
    const data = useActivityEditorStore(activityId, (s) => s.data)
    const error = useActivityEditorStore(activityId, (s) => s.error)
    const refresh = useActivityEditorStore(activityId, (s) => s.refresh)

    if (!data)
        return error ? (
            <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
            <Loading loading message="Opening the Quest Builder…" />
        )
    // The form is created once from the loaded data and reset only after our own saves
    return <ActivityEditor key={activityId} data={data} />
}

const STATUS_CONFIRM: Partial<Record<PublishStatus, { title: string; body: string; confirm: string }>> = {
    draft: {
        title: 'Unpublish this activity?',
        body: 'Students will no longer see it. Their attempts, scores and XP are kept.',
        confirm: 'Unpublish',
    },
    archived: {
        title: 'Archive this activity?',
        body: 'It’s hidden from students and from your content list (unless you show archived). Results and XP are kept.',
        confirm: 'Archive',
    },
}

function ActivityEditor({ data }: { data: ActivityEditorData }) {
    const { activity, course, xpRule } = data
    const activityId = activity.id
    const setData = useActivityEditorStore(activityId, (s) => s.setData)
    const [tab, setTab] = useState('build')
    const [busy, setBusy] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<PublishStatus | null>(null)

    const schema = useMemo(() => getActivityFormSchema(xpRule), [xpRule])
    const form = useForm<ActivityFormData>({
        resolver: zodResolver(schema),
        defaultValues: toFormData(data),
        mode: 'onBlur',
    })
    const {
        control,
        formState: { isDirty, isSubmitting },
    } = form
    const values = useWatch({ control }) as ActivityFormData
    const assessment = isAssessment(activity.kind)
    const boss = activity.kind === 'boss_battle'
    const teamQuest = activity.kind === 'team_quest'

    usePageBreadcrumbs([
        { label: 'Courses', href: coursesPath },
        { label: course.title, href: getCoursePath(course.id) },
        { label: activity.title },
    ])

    const issues = useMemo(
        () =>
            getPublishIssues({
                kind: activity.kind,
                title: values.title ?? '',
                body: values.body ?? '',
                xpReward: values.xpReward ?? 0,
                questions: (values.questions ?? []).map(toQuestionInput),
                xpRule,
                feedbackMode: isAssessment(activity.kind) ? values.feedbackMode : undefined,
                dueAt: values.dueAt ? new Date(values.dueAt) : null,
                boss: values.boss,
                teamConfig: values.teamConfig?.activityIds?.length ? values.teamConfig : null,
            }),
        [activity.kind, values, xpRule],
    )

    const applySaved = useCallback(
        (saved: ActivityEditorData) => {
            setData(saved)
            form.reset(toFormData(saved))
            void getCourseActivitiesState(course.id).refresh()
        },
        [setData, form, course.id],
    )

    const save = useCallback(
        async (formValues: ActivityFormData) => {
            try {
                applySaved(await apiSaveActivity(activityId, toSaveInput(formValues)))
                toastSuccess('Saved.', { duration: 3000 })
                return true
            } catch (e) {
                toastError(`Couldn’t save. ${tryGetErrorMessage(e)}`)
                return false
            }
        },
        [activityId, applySaved],
    )

    /** Validates and saves; resolves false (with the fields highlighted) when the form is invalid */
    const saveNow = useCallback(
        () =>
            new Promise<boolean>((resolve) => {
                void form.handleSubmit(
                    async (formValues) => resolve(await save(formValues)),
                    () => {
                        setTab('build')
                        toastError('Some fields need attention — they’re highlighted in the form.')
                        resolve(false)
                    },
                )()
            }),
        [form, save],
    )

    // Ctrl/Cmd+S saves
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                void saveNow()
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [saveNow])

    // Warn before closing the tab or following an in-app link with unsaved work
    const guard = useUnsavedChangesGuard(() => form.formState.isDirty)

    const changeStatus = async (status: PublishStatus) => {
        setBusy(true)
        try {
            if (form.formState.isDirty && !(await saveNow())) return
            applySaved(await apiSetActivityStatus(activityId, status))
            toastSuccess(
                status === 'published'
                    ? 'Published — enrolled students can see it now (in a published course).'
                    : status === 'archived'
                      ? 'Archived.'
                      : 'Moved back to draft.',
            )
            setPendingStatus(null)
        } catch (e) {
            toastError(`Couldn’t change the status. ${tryGetErrorMessage(e)}`)
        } finally {
            setBusy(false)
        }
    }

    const publishBlocked = issues.length > 0
    const publishButton = (
        <Button
            size="sm"
            variant="solid"
            disabled={publishBlocked || busy}
            loading={busy && !pendingStatus}
            onClick={() => void changeStatus('published')}
        >
            {activity.status === 'archived' ? 'Restore & publish' : 'Publish'}
        </Button>
    )

    return (
        <FormProvider {...form}>
            <PageHeader
                eyebrow={`Quest Builder · ${course.title}`}
                title={values.title || activity.title}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <ActivityKindTag kind={activity.kind} />
                        <PublishStatusTag status={activity.status} />
                        <span className="text-sm" aria-live="polite">
                            {isDirty ? (
                                <span className="font-semibold text-warning">Unsaved changes</span>
                            ) : (
                                'All changes saved'
                            )}
                        </span>
                    </span>
                }
                actions={
                    <>
                        {assessment && activity.status !== 'draft' && (
                            <LinkButton
                                size="sm"
                                href={getActivityResultsPath(course.id, activityId)}
                                icon={navigationIcon.clipboard}
                            >
                                Results
                            </LinkButton>
                        )}
                        <Button
                            size="sm"
                            type="submit"
                            form={FORM_ID}
                            icon={<SaveIcon />}
                            loading={isSubmitting}
                            disabled={!isDirty}
                        >
                            Save
                        </Button>
                        {activity.status === 'published' ? (
                            <Dropdown
                                placement="bottom-end"
                                renderTitle={
                                    <Button size="sm" variant="solid" icon={<ExpandIcon />} iconAlignment="end">
                                        Published
                                    </Button>
                                }
                            >
                                <Dropdown.Item eventKey="draft" onClick={() => setPendingStatus('draft')}>
                                    Unpublish (back to draft)
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="archive" onClick={() => setPendingStatus('archived')}>
                                    Archive
                                </Dropdown.Item>
                            </Dropdown>
                        ) : publishBlocked ? (
                            <Tooltip title={`Can’t publish yet: ${issues[0].message}`}>{publishButton}</Tooltip>
                        ) : (
                            publishButton
                        )}
                        {activity.status === 'draft' && (
                            <Button size="sm" variant="plain" onClick={() => setPendingStatus('archived')}>
                                Archive
                            </Button>
                        )}
                    </>
                }
            />

            {data.attemptCount > 0 && (
                <Alert showIcon type="warning" className="mb-4">
                    Students have submitted {data.attemptCount} {data.attemptCount === 1 ? 'attempt' : 'attempts'}. You
                    can fix wording, options and answers, but questions they answered can’t be removed. Changing an
                    answer key doesn’t re-grade past attempts.
                </Alert>
            )}

            <Tabs value={tab} onChange={setTab}>
                <Tabs.TabList className="mb-6">
                    <Tabs.TabNav value="build" icon={navigationIcon.route}>
                        Build
                    </Tabs.TabNav>
                    <Tabs.TabNav value="preview" icon={<PreviewIcon />}>
                        Student preview
                    </Tabs.TabNav>
                </Tabs.TabList>
                <Tabs.TabContent value="build">
                    <Form id={FORM_ID} onSubmit={form.handleSubmit(save)} noValidate>
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="space-y-6 lg:col-span-2">
                                <Card header={{ content: 'Details' }}>
                                    <ActivityDetailsFields modules={data.modules} />
                                    <ObjectivesEditor />
                                </Card>
                                {teamQuest && <TeamGoalEditor siblings={data.siblings} />}
                                <Card header={{ content: assessment || teamQuest ? 'Briefing' : 'Lesson content' }}>
                                    <LessonBodyEditor
                                        label={assessment || teamQuest ? 'Introduction (optional)' : 'Content'}
                                        hint={
                                            assessment
                                                ? 'Shown before the questions'
                                                : teamQuest
                                                  ? 'Tell the guild what they are doing together, and why'
                                                  : 'Text, images, videos, callouts and tables'
                                        }
                                        courseId={course.id}
                                        activityId={activityId}
                                        allowSecrets={activity.kind === 'lesson'}
                                    />
                                </Card>
                                {boss && <BossEditor />}
                                {assessment && (
                                    <QuestionListEditor
                                        courseId={course.id}
                                        attemptCount={data.attemptCount}
                                        issues={issues}
                                        phases={boss ? (values.boss?.phases ?? []) : undefined}
                                    />
                                )}
                            </div>
                            <aside className="space-y-6">
                                <Card
                                    header={{
                                        content: activity.status === 'published' ? 'Checklist' : 'Publish checklist',
                                    }}
                                >
                                    <PublishChecklist issues={issues} published={activity.status === 'published'} />
                                </Card>
                                <Card header={{ content: `${activityKindLabel[activity.kind]} settings` }}>
                                    <ActivitySettingsFields
                                        kind={activity.kind}
                                        xpRule={xpRule}
                                        siblings={data.siblings}
                                    />
                                </Card>
                            </aside>
                        </div>
                    </Form>
                </Tabs.TabContent>
                <Tabs.TabContent value="preview">
                    <StudentPreview kind={activity.kind} values={values} />
                </Tabs.TabContent>
            </Tabs>

            <ConfirmDialog
                isOpen={!!pendingStatus}
                onClose={() => setPendingStatus(null)}
                type="warning"
                title={pendingStatus ? STATUS_CONFIRM[pendingStatus]?.title : ''}
                confirmText={pendingStatus ? STATUS_CONFIRM[pendingStatus]?.confirm : 'Confirm'}
                onConfirm={() => pendingStatus && void changeStatus(pendingStatus)}
                loading={busy}
            >
                {pendingStatus && STATUS_CONFIRM[pendingStatus]?.body}
            </ConfirmDialog>
            <ConfirmDialog
                isOpen={!!guard.pendingHref}
                onClose={guard.stay}
                type="warning"
                title="Leave without saving?"
                confirmText="Leave"
                cancelText="Stay and save"
                onConfirm={guard.leave}
            >
                You have unsaved changes. If you leave now, they’ll be lost.
            </ConfirmDialog>
        </FormProvider>
    )
}
