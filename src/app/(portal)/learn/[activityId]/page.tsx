import { Suspense, cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Loading from '@/components/shared/Loading'
import LearnClientPage from '@/components/learn/LearnClientPage'
import { requirePagePermission } from '@/server/actions/auth'
import { getActivityForPlay } from '@/server/actions/activities'
import { isNotFound } from '@/server/utils/errors'

interface LearnPageProps {
    params: Promise<{ activityId: string }>
}

const UUID = /^[0-9a-f-]{36}$/i

const loadQuest = cache(async (activityId: string) => {
    if (!UUID.test(activityId)) notFound()
    const user = await requirePagePermission('play')
    try {
        return await getActivityForPlay(user, activityId)
    } catch (error) {
        if (isNotFound(error)) notFound()
        throw error
    }
})

export async function generateMetadata({ params }: LearnPageProps): Promise<Metadata> {
    const { activity } = await loadQuest((await params).activityId)
    return { title: activity.title }
}

const PageProvider = async ({ params }: LearnPageProps) => {
    const { activityId } = await params
    const view = await loadQuest(activityId)
    return <LearnClientPage activityId={activityId} initial={view} />
}

export default function LearnPage(props: LearnPageProps) {
    return (
        <Suspense fallback={<Loading loading message="Entering the dungeon…" />}>
            <PageProvider {...props} />
        </Suspense>
    )
}
