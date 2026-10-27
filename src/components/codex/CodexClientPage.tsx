'use client'

import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import EmptyState from '@/components/shared/EmptyState'
import SystemPanel from '@/components/game/SystemPanel'
import XpBar from '@/components/game/XpBar'
import navigationIcon from '@/configs/icons.config'
import { homePath } from '@/configs/app.config'
import { useSWRCodex } from '@/services/game'
import { useCodexStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import CodexCourseSection from './CodexCourseSection'
import SpeakPhraseForm from './SpeakPhraseForm'

function CodexSWRProvider() {
    const swr = useSWRCodex()
    const setData = useCodexStore((s) => s.setData)
    const setLoading = useCodexStore((s) => s.setLoading)
    const setError = useCodexStore((s) => s.setError)
    const setRefresh = useCodexStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

/** The collection book: every secret found so far, and silhouettes of those still hidden */
export default function CodexClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Codex' }])
    const codex = useCodexStore((s) => s.data)
    const error = useCodexStore((s) => s.error)
    const refresh = useCodexStore((s) => s.refresh)

    return (
        <>
            <CodexSWRProvider />
            <PageHeader
                eyebrow="Collection"
                title="Codex"
                description="Secrets hidden across your courses. Look closely in lessons, listen for phrases, and keep learning — some only appear when you do."
            />
            {!codex ? (
                error ? (
                    <ErrorState message={error} onRetry={() => void refresh()} />
                ) : (
                    <Loading loading message="Opening the Codex…" />
                )
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <SystemPanel eyebrow="Discovered" title={`${codex.totalDiscovered} of ${codex.totalSecrets}`}>
                            <XpBar
                                value={codex.totalDiscovered}
                                max={Math.max(codex.totalSecrets, 1)}
                                label="Secrets found"
                                valueText={
                                    codex.totalSecrets
                                        ? `${Math.round((codex.totalDiscovered / codex.totalSecrets) * 100)}%`
                                        : '—'
                                }
                                tone="gold"
                            />
                        </SystemPanel>
                        <div className="lg:col-span-2">
                            <SpeakPhraseForm />
                        </div>
                    </div>

                    {codex.courses.length === 0 ? (
                        <EmptyState
                            icon={navigationIcon.codex}
                            title="No secrets… yet"
                            description="When your teachers hide secrets in your courses, they appear here as silhouettes waiting to be found."
                        />
                    ) : (
                        codex.courses.map((course) => <CodexCourseSection key={course.courseId} course={course} />)
                    )}
                </div>
            )}
        </>
    )
}
