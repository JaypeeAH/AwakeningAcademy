'use client'

import { useSWRActivityResults } from '@/services/activities'
import { useActivityResultsStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'

interface ActivityResultsSWRProviderProps extends ProviderProps {
    activityId: string
}

/** One activity's results (students, attempts, question stats) → useActivityResultsStore(activityId) */
export default function ActivityResultsSWRProvider({ activityId, children }: ActivityResultsSWRProviderProps) {
    const swr = useSWRActivityResults(activityId)
    const setData = useActivityResultsStore(activityId, (s) => s.setData)
    const setLoading = useActivityResultsStore(activityId, (s) => s.setLoading)
    const setError = useActivityResultsStore(activityId, (s) => s.setError)
    const setRefresh = useActivityResultsStore(activityId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
