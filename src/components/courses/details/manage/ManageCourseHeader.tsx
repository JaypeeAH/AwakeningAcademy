'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import Dropdown from '@/components/ui/Dropdown'
import Alert from '@/components/ui/Alert'
import PageHeader from '@/components/shared/PageHeader'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { PublishStatusTag, SubjectTag } from '@/components/game/GameTags'
import EditCourseDialog from '@/components/courses/dialogs/EditCourseDialog'
import { apiResetJoinCode, apiUpdateCourse } from '@/services/courses'
import { useCourseStore, useCoursesStore } from '@/stores/GameStores'
import { CopyIcon, EditIcon, ExpandIcon, LinkIcon, RefreshIcon } from '@/configs/icons.config'
import { getSignUpWithCodePath } from '@/configs/app.config'
import type { Course } from '@/@types/courses/Course'
import type { PublishStatus } from '@/@types/activities/ActivityKindOptions'

interface ManageCourseHeaderProps {
    course: Course
}

const STATUS_CHANGE: Record<PublishStatus, { title: string; body: string; confirm: string }> = {
    published: {
        title: 'Publish this course?',
        body: 'Students can join with the code and see its published activities. Draft activities stay hidden until you publish them.',
        confirm: 'Publish course',
    },
    draft: {
        title: 'Move the course back to draft?',
        body: 'Enrolled students will no longer see it and new students can’t join. Their progress and XP are kept.',
        confirm: 'Unpublish',
    },
    archived: {
        title: 'Archive this course?',
        body: 'It disappears from students’ and your course lists. Results, XP and history are kept. You can restore it later from here.',
        confirm: 'Archive',
    },
}

/** Course title, subject, status and the join code students use, with edit / publish / archive actions */
export default function ManageCourseHeader({ course }: ManageCourseHeaderProps) {
    const setData = useCourseStore(course.id, (s) => s.setData)
    const refreshCourses = useCoursesStore((s) => s.refresh)
    const [editing, setEditing] = useState(false)
    const [confirmReset, setConfirmReset] = useState(false)
    const [pendingStatus, setPendingStatus] = useState<PublishStatus | null>(null)
    const [busy, setBusy] = useState(false)

    const copy = async (text: string, what: string) => {
        try {
            await navigator.clipboard.writeText(text)
            toastSuccess(`${what} copied.`, { duration: 3000 })
        } catch {
            toastError('Couldn’t copy — select it and copy it manually.')
        }
    }
    const copyCode = () => course.joinCode && void copy(course.joinCode, 'Join code')
    // One link does everything: new students sign up and join; signed-in students go straight to joining
    const copySignUpLink = () =>
        course.joinCode && void copy(`${window.location.origin}${getSignUpWithCodePath(course.joinCode)}`, 'Class link')

    const resetCode = async () => {
        setBusy(true)
        try {
            setData(await apiResetJoinCode(course.id))
            toastSuccess('New join code created. The old one no longer works.')
            setConfirmReset(false)
        } catch (error) {
            toastError('Couldn’t reset the join code.', error)
        } finally {
            setBusy(false)
        }
    }

    const changeStatus = async () => {
        if (!pendingStatus) return
        setBusy(true)
        try {
            setData(await apiUpdateCourse(course.id, { status: pendingStatus }))
            void refreshCourses()
            toastSuccess(
                pendingStatus === 'published'
                    ? 'Course published.'
                    : pendingStatus === 'archived'
                      ? 'Course archived.'
                      : 'Course moved to draft.',
            )
            setPendingStatus(null)
        } catch (error) {
            toastError('Couldn’t change the course status.', error)
        } finally {
            setBusy(false)
        }
    }

    return (
        <>
            <PageHeader
                eyebrow="Course"
                title={course.title}
                description={
                    <span className="flex flex-wrap items-center gap-2">
                        <SubjectTag subject={course.subject} />
                        <PublishStatusTag status={course.status} />
                        {course.description && <span className="w-full">{course.description}</span>}
                    </span>
                }
                actions={
                    <>
                        <Button size="sm" icon={<EditIcon />} onClick={() => setEditing(true)}>
                            Edit
                        </Button>
                        {course.status === 'published' ? (
                            <Dropdown
                                placement="bottom-end"
                                renderTitle={
                                    <Button size="sm" icon={<ExpandIcon />} iconAlignment="end">
                                        Published
                                    </Button>
                                }
                            >
                                <Dropdown.Item eventKey="draft" onClick={() => setPendingStatus('draft')}>
                                    Move back to draft
                                </Dropdown.Item>
                                <Dropdown.Item eventKey="archive" onClick={() => setPendingStatus('archived')}>
                                    Archive course
                                </Dropdown.Item>
                            </Dropdown>
                        ) : (
                            <Button size="sm" variant="solid" onClick={() => setPendingStatus('published')}>
                                {course.status === 'archived' ? 'Restore & publish' : 'Publish course'}
                            </Button>
                        )}
                    </>
                }
            />

            {course.status !== 'published' && (
                <Alert showIcon type="info" className="mb-6">
                    {course.status === 'archived'
                        ? 'This course is archived. Students can’t see it.'
                        : 'This course is a draft — students can’t join or see it yet. Add content, then publish the course.'}
                </Alert>
            )}

            {course.joinCode && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700 dark:bg-gray-800">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Join code</div>
                        <div className="font-mono text-2xl font-bold tracking-[0.25em] text-gray-900 dark:text-gray-50">
                            {course.joinCode}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Share the class link — new students sign up and join in one step. Students with an account
                            can type the code on their Courses page. You can also add them by email on the Roster tab.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="solid" icon={<LinkIcon />} onClick={copySignUpLink}>
                            Copy class link
                        </Button>
                        <Button size="sm" icon={<CopyIcon />} onClick={copyCode}>
                            Copy code
                        </Button>
                        <Button size="sm" icon={<RefreshIcon />} onClick={() => setConfirmReset(true)}>
                            Reset code
                        </Button>
                    </div>
                </div>
            )}

            <EditCourseDialog course={course} isOpen={editing} onClose={() => setEditing(false)} />

            <ConfirmDialog
                isOpen={confirmReset}
                onClose={() => setConfirmReset(false)}
                type="warning"
                title="Reset the join code?"
                confirmText="Reset code"
                onConfirm={resetCode}
                loading={busy}
            >
                The current code stops working immediately. Students already enrolled stay enrolled.
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={!!pendingStatus}
                onClose={() => setPendingStatus(null)}
                type={pendingStatus === 'published' ? 'info' : 'warning'}
                title={pendingStatus ? STATUS_CHANGE[pendingStatus].title : ''}
                confirmText={pendingStatus ? STATUS_CHANGE[pendingStatus].confirm : 'Confirm'}
                onConfirm={changeStatus}
                loading={busy}
            >
                {pendingStatus && STATUS_CHANGE[pendingStatus].body}
            </ConfirmDialog>
        </>
    )
}
