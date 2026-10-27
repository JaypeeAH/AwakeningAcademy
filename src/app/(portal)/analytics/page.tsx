import type { Metadata } from 'next'
import { Suspense } from 'react'
import AnalyticsClientPage from '@/components/analytics/AnalyticsClientPage'
import Loading from '@/components/shared/Loading'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
    await requirePagePermission('results.view')
    return (
        <Suspense fallback={<Loading loading />}>
            <AnalyticsClientPage />
        </Suspense>
    )
}
