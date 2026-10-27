import { Suspense, cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Loading from '@/components/shared/Loading'
import EmptyState from '@/components/shared/EmptyState'
import LinkButton from '@/components/ui/LinkButton'
import { GradingAttemptSWRProvider, GradingQueueSWRProvider } from '@/components/grading/GradingSWRProviders'
import GraderClientPage from '@/components/grading/GraderClientPage'
import { getAttemptForGrading } from '@/server/actions/grading'
import { requirePagePermission } from '@/server/actions/auth'
import { isNotFound } from '@/server/utils/errors'
import { gradingPath } from '@/configs/app.config'
import { AppError } from '@/@types/errors'

interface GraderPageProps {
    params: Promise<{ attemptId: string }>
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The attempt for the grader, or null while it hasn't been handed in. Shared by metadata and the page. */
const loadAttempt = cache(async (attemptId: string) => {
    if (!UUID.test(attemptId)) notFound()
    const user = await requirePagePermission('results.view')
    try {
        return await getAttemptForGrading(user, attemptId)
    } catch (error) {
        if (isNotFound(error)) notFound()
        if (error instanceof AppError && error.code === 'ATTEMPT_IN_PROGRESS') return null
        throw error
    }
})

export async function generateMetadata({ params }: GraderPageProps): Promise<Metadata> {
    const data = await loadAttempt((await params).attemptId)
    return { title: data ? `Marking · ${data.student.displayName}` : 'Grading' }
}

const PageProvider = async ({ params }: GraderPageProps) => {
    const { attemptId } = await params
    const attempt = await loadAttempt(attemptId)
    if (!attempt) {
        return (
            <EmptyState
                title="Not handed in yet"
                description="The student is still working on this attempt. It will appear in your queue when they hand it in — or when its time runs out."
                action={<LinkButton href={gradingPath}>Back to the queue</LinkButton>}
            />
        )
    }
    return (
        <GradingQueueSWRProvider>
            <GradingAttemptSWRProvider attemptId={attemptId} attempt={attempt}>
                <GraderClientPage attemptId={attemptId} />
            </GradingAttemptSWRProvider>
        </GradingQueueSWRProvider>
    )
}

/** Marks one submitted attempt: essays and uploads, overrides of auto-graded answers, and comments */
export default function GraderPage(props: GraderPageProps) {
    return (
        <Suspense fallback={<Loading loading message="Opening the attempt…" />}>
            <PageProvider {...props} />
        </Suspense>
    )
}
