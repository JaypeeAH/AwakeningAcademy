import type { Metadata } from 'next'
import HistoryClientPage from '@/components/history/HistoryClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Chronicle' }

export default async function HistoryPage() {
    await requirePagePermission('play')
    return <HistoryClientPage />
}
