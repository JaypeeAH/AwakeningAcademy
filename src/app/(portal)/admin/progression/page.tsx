import type { Metadata } from 'next'
import { requirePagePermission } from '@/server/actions/auth'
import ProgressionClientPage, { ProgressionSWRProvider } from '@/components/admin/progression/ProgressionClientPage'

export const metadata: Metadata = { title: 'Progression rules' }

export default async function ProgressionPage() {
    await requirePagePermission('progression.manage')
    return (
        <ProgressionSWRProvider>
            <ProgressionClientPage />
        </ProgressionSWRProvider>
    )
}
