import type { Metadata } from 'next'
import { GradingQueueSWRProvider } from '@/components/grading/GradingSWRProviders'
import GradingQueueClientPage from '@/components/grading/GradingQueueClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Grading' }

export default async function GradingPage() {
    await requirePagePermission('results.view')
    return (
        <GradingQueueSWRProvider>
            <GradingQueueClientPage />
        </GradingQueueSWRProvider>
    )
}
