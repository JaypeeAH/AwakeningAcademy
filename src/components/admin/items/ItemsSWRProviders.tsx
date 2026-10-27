'use client'

import { useSWRItemDefinitions, useSWRSkillDefinitions } from '@/services/game'
import { useItemDefinitionsStore, useSkillDefinitionsStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'

/** The item catalogue → useItemDefinitionsStore (admins edit it; teachers pick rewards and item sets from it) */
export function ItemDefinitionsSWRProvider({ children }: ProviderProps) {
    const swr = useSWRItemDefinitions({ revalidateOnFocus: false })
    const setData = useItemDefinitionsStore((s) => s.setData)
    const setLoading = useItemDefinitionsStore((s) => s.setLoading)
    const setError = useItemDefinitionsStore((s) => s.setError)
    const setRefresh = useItemDefinitionsStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** Skill definitions → useSkillDefinitionsStore (administrators only) */
export function SkillDefinitionsSWRProvider({ children }: ProviderProps) {
    const swr = useSWRSkillDefinitions({ revalidateOnFocus: false })
    const setData = useSkillDefinitionsStore((s) => s.setData)
    const setLoading = useSkillDefinitionsStore((s) => s.setLoading)
    const setError = useSkillDefinitionsStore((s) => s.setError)
    const setRefresh = useSkillDefinitionsStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
