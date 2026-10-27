'use client'

import { useSWRInventory, useSWRSkillBook } from '@/services/game'
import { useInventoryStore, useSkillBookStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'

/** The student's items and inventory history → useInventoryStore */
export function InventorySWRProvider({ children }: ProviderProps) {
    const swr = useSWRInventory()
    const setData = useInventoryStore((s) => s.setData)
    const setLoading = useInventoryStore((s) => s.setLoading)
    const setError = useInventoryStore((s) => s.setError)
    const setRefresh = useInventoryStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** Every skill as this student sees it (unlocked, requirements, charges) → useSkillBookStore */
export function SkillBookSWRProvider({ children }: ProviderProps) {
    const swr = useSWRSkillBook()
    const setData = useSkillBookStore((s) => s.setData)
    const setLoading = useSkillBookStore((s) => s.setLoading)
    const setError = useSkillBookStore((s) => s.setError)
    const setRefresh = useSkillBookStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
