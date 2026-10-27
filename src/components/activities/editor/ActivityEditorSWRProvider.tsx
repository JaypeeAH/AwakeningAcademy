'use client'

import { useSWRActivityEditor } from '@/services/activities'
import { useActivityEditorStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'
import type { ProviderProps } from '@/@types/common'

interface ActivityEditorSWRProviderProps extends ProviderProps {
    activityId: string
    /** Server-rendered first load */
    editor?: ActivityEditorData
}

/** Quest Builder data (activity, keyed questions, modules, siblings, XP rule) → useActivityEditorStore(activityId) */
export default function ActivityEditorSWRProvider({ activityId, editor, children }: ActivityEditorSWRProviderProps) {
    // No refetch on focus: the form is the working copy; the store is refreshed explicitly after saves
    const swr = useSWRActivityEditor(activityId, { fallbackData: editor, revalidateOnFocus: false })
    const setData = useActivityEditorStore(activityId, (s) => s.setData)
    const setLoading = useActivityEditorStore(activityId, (s) => s.setLoading)
    const setError = useActivityEditorStore(activityId, (s) => s.setError)
    const setRefresh = useActivityEditorStore(activityId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
