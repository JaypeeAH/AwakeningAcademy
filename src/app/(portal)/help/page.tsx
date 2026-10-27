import type { Metadata } from 'next'
import { Suspense } from 'react'
import HelpCenterClientPage from '@/components/help/HelpCenterClientPage'
import Loading from '@/components/shared/Loading'
import { requireUser } from '@/server/actions/auth'
import { getHelpCenter } from '@/server/actions/help'

export const metadata: Metadata = { title: 'Help Center' }

export default async function HelpPage() {
    // Only the articles and FAQs written for this role are sent to the browser
    const data = getHelpCenter(await requireUser())
    return (
        <Suspense fallback={<Loading loading />}>
            <HelpCenterClientPage data={data} />
        </Suspense>
    )
}
