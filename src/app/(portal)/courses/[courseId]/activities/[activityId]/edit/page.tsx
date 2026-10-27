import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ActivityEditorSWRProvider from '@/components/activities/editor/ActivityEditorSWRProvider'
import ActivityEditorClientPage from '@/components/activities/editor/ActivityEditorClientPage'
import { getActivityEditor } from '@/server/actions/activities'
import { requirePagePermission } from '@/server/actions/auth'
import { isNotFound } from '@/server/utils/errors'

export const metadata: Metadata = { title: 'Quest Builder' }

interface ActivityEditPageProps {
    params: Promise<{ courseId: string; activityId: string }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ActivityEditPage({ params }: ActivityEditPageProps) {
    const user = await requirePagePermission('courses.manage')
    const { courseId, activityId } = await params
    if (!UUID.test(courseId) || !UUID.test(activityId)) notFound()

    let editor
    try {
        editor = await getActivityEditor(user, activityId)
    } catch (error) {
        if (isNotFound(error)) notFound()
        throw error
    }
    if (editor.course.id !== courseId) notFound()

    return (
        <ActivityEditorSWRProvider activityId={activityId} editor={editor}>
            <ActivityEditorClientPage activityId={activityId} />
        </ActivityEditorSWRProvider>
    )
}
