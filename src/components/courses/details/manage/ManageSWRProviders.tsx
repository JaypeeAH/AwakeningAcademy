'use client'

import { useSWRCourseProgress, useSWRRoster } from '@/services/courses'
import { useSWRCourseSecrets } from '@/services/game'
import { useSWRCourseGuilds, useSWRLeaderboard } from '@/services/social'
import {
    useCourseGuildsStore,
    useCourseProgressStore,
    useCourseSecretsStore,
    useLeaderboardStore,
    useRosterStore,
} from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'

interface CourseProviderProps extends ProviderProps {
    courseId: string
}

/** Course roster → useRosterStore(courseId) */
export function RosterSWRProvider({ courseId, children }: CourseProviderProps) {
    const swr = useSWRRoster(courseId)
    const setData = useRosterStore(courseId, (s) => s.setData)
    const setLoading = useRosterStore(courseId, (s) => s.setLoading)
    const setError = useRosterStore(courseId, (s) => s.setError)
    const setRefresh = useRosterStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** Gradebook → useCourseProgressStore(courseId) */
export function CourseProgressSWRProvider({ courseId, children }: CourseProviderProps) {
    const swr = useSWRCourseProgress(courseId)
    const setData = useCourseProgressStore(courseId, (s) => s.setData)
    const setLoading = useCourseProgressStore(courseId, (s) => s.setLoading)
    const setError = useCourseProgressStore(courseId, (s) => s.setError)
    const setRefresh = useCourseProgressStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** The course's Easter eggs → useCourseSecretsStore(courseId) */
export function CourseSecretsSWRProvider({ courseId, children }: CourseProviderProps) {
    const swr = useSWRCourseSecrets(courseId)
    const setData = useCourseSecretsStore(courseId, (s) => s.setData)
    const setLoading = useCourseSecretsStore(courseId, (s) => s.setLoading)
    const setError = useCourseSecretsStore(courseId, (s) => s.setError)
    const setRefresh = useCourseSecretsStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** The course's guilds (with members and requests) → useCourseGuildsStore(courseId) */
export function CourseGuildsSWRProvider({ courseId, children }: CourseProviderProps) {
    const swr = useSWRCourseGuilds(courseId)
    const setData = useCourseGuildsStore(courseId, (s) => s.setData)
    const setLoading = useCourseGuildsStore(courseId, (s) => s.setLoading)
    const setError = useCourseGuildsStore(courseId, (s) => s.setError)
    const setRefresh = useCourseGuildsStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

/** This week's leaderboard → useLeaderboardStore(courseId) */
export function LeaderboardSWRProvider({ courseId, children }: CourseProviderProps) {
    const swr = useSWRLeaderboard(courseId)
    const setData = useLeaderboardStore(courseId, (s) => s.setData)
    const setLoading = useLeaderboardStore(courseId, (s) => s.setLoading)
    const setError = useLeaderboardStore(courseId, (s) => s.setError)
    const setRefresh = useLeaderboardStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}
