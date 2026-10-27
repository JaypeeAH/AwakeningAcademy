import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ActivityResultsSWRProvider from '@/components/activities/results/ActivityResultsSWRProvider'
import ActivityResultsClientPage from '@/components/activities/results/ActivityResultsClientPage'
import { requireActivityTeacher } from '@/server/actions/activities'
import { requirePagePermission } from '@/server/actions/auth'
import { isNotFound } from '@/server/utils/errors'

export const metadata: Metadata = { title: 'Results' }

interface ActivityResultsPageProps {
    params: Promise<{ courseId: string; activityId: string }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ActivityResultsPage({ params }: ActivityResultsPageProps) {
    const user = await requirePagePermission('results.view')
    const { courseId, activityId } = await params
    if (!UUID.test(courseId) || !UUID.test(activityId)) notFound()

    // Only the course's teachers (and admins); the activity must belong to the course in the URL
    try {
        const { activity } = await requireActivityTeacher(user, activityId)
        if (activity.course_id !== courseId) notFound()
    } catch (error) {
        if (isNotFound(error)) notFound()
        throw error
    }

    return (
        <ActivityResultsSWRProvider activityId={activityId}>
            <ActivityResultsClientPage activityId={activityId} />
        </ActivityResultsSWRProvider>
    )
}
