'use client'

import { useSWRAttemptForGrading, useSWRGradingQueue } from '@/services/grading'
import { useGradingAttemptStore, useGradingQueueStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'
import type { AttemptForGrading } from '@/@types/grading/Grading'

/** Work waiting to be marked across the teacher's courses → useGradingQueueStore */
export function GradingQueueSWRProvider({ children }: ProviderProps) {
    const swr = useSWRGradingQueue()
    const setData = useGradingQueueStore((s) => s.setData)
    const setLoading = useGradingQueueStore((s) => s.setLoading)
    const setError = useGradingQueueStore((s) => s.setError)
    const setRefresh = useGradingQueueStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

interface GradingAttemptSWRProviderProps extends ProviderProps {
    attemptId: string
    /** Server-rendered first load (no loading flash) */
    attempt?: AttemptForGrading
}

/** One attempt in the grader → useGradingAttemptStore(attemptId) */
export function GradingAttemptSWRProvider({ attemptId, attempt, children }: GradingAttemptSWRProviderProps) {
    // No refetch on focus: it would replace marks the teacher is typing (the form resets on new data)
    const swr = useSWRAttemptForGrading(attemptId, { fallbackData: attempt, revalidateOnFocus: false })
    const setData = useGradingAttemptStore(attemptId, (s) => s.setData)
    const setLoading = useGradingAttemptStore(attemptId, (s) => s.setLoading)
    const setError = useGradingAttemptStore(attemptId, (s) => s.setError)
    const setRefresh = useGradingAttemptStore(attemptId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
