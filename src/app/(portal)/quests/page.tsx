import { Suspense } from 'react'
import type { Metadata } from 'next'
import Loading from '@/components/shared/Loading'
import QuestBoardClientPage from '@/components/quests/QuestBoardClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Quest Board' }

export default async function QuestsPage() {
    await requirePagePermission('play')
    return (
        <Suspense fallback={<Loading loading message="Gathering your quests…" />}>
            <QuestBoardClientPage />
        </Suspense>
    )
}
