'use client'

import { useSWRAchievementDefinitions } from '@/services/social'
import { useAchievementDefinitionsStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'

/** Achievement definitions → useAchievementDefinitionsStore (administrators only) */
export function AchievementDefinitionsSWRProvider({ children }: ProviderProps) {
    const swr = useSWRAchievementDefinitions({ revalidateOnFocus: false })
    const setData = useAchievementDefinitionsStore((s) => s.setData)
    const setLoading = useAchievementDefinitionsStore((s) => s.setLoading)
    const setError = useAchievementDefinitionsStore((s) => s.setError)
    const setRefresh = useAchievementDefinitionsStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
