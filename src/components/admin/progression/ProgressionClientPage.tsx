'use client'

import PageHeader from '@/components/shared/PageHeader'
import Loading from '@/components/shared/Loading'
import ErrorState from '@/components/shared/ErrorState'
import ProgressionForm from './ProgressionForm'
import { homePath } from '@/configs/app.config'
import { useSWRProgressionConfig } from '@/services/progression'
import { useProgressionConfigStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import { usePageBreadcrumbs } from '@/utils/hooks/useBreadcrumbs'
import type { ProviderProps } from '@/@types/common'

/** Progression configuration → useProgressionConfigStore */
export function ProgressionSWRProvider({ children }: ProviderProps) {
    // Don't refetch on focus: the form is initialised once and would otherwise look out of date mid-edit
    const swr = useSWRProgressionConfig({ revalidateOnFocus: false })
    const setData = useProgressionConfigStore((s) => s.setData)
    const setLoading = useProgressionConfigStore((s) => s.setLoading)
    const setError = useProgressionConfigStore((s) => s.setError)
    const setRefresh = useProgressionConfigStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** Administrators tune how XP turns into levels, what each rank demands, and the XP teachers may award. */
export default function ProgressionClientPage() {
    usePageBreadcrumbs([{ label: 'Dashboard', href: homePath }, { label: 'Progression rules' }])
    const config = useProgressionConfigStore((s) => s.data)
    const error = useProgressionConfigStore((s) => s.error)
    const refresh = useProgressionConfigStore((s) => s.refresh)

    return (
        <>
            <PageHeader
                eyebrow="Administration"
                title="Progression rules"
                description="How XP becomes levels, what mastery each rank requires, and how much XP activities can award. These apply to the whole school."
            />
            {config ? (
                // Mounted once with the loaded rules; after a save the form resets itself to what was saved
                <ProgressionForm config={config} />
            ) : error ? (
                <ErrorState message={error} onRetry={() => void refresh()} />
            ) : (
                <Loading loading message="Loading the progression rules…" />
            )}
        </>
    )
}
