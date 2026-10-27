'use client'

import { useSWRCourseGuilds, useSWRLeaderboard } from '@/services/social'
import { useCourseGuildsStore, useLeaderboardStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'

/** The course's guilds (the student's view) */
export function StudentGuildsSWRProvider({ courseId }: { courseId: string }) {
    const swr = useSWRCourseGuilds(courseId)
    const setData = useCourseGuildsStore(courseId, (s) => s.setData)
    const setLoading = useCourseGuildsStore(courseId, (s) => s.setLoading)
    const setError = useCourseGuildsStore(courseId, (s) => s.setError)
    const setRefresh = useCourseGuildsStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}

/** This week's leaderboard for the course */
export function LeaderboardSWRProvider({ courseId }: { courseId: string }) {
    const swr = useSWRLeaderboard(courseId)
    const setData = useLeaderboardStore(courseId, (s) => s.setData)
    const setLoading = useLeaderboardStore(courseId, (s) => s.setLoading)
    const setError = useLeaderboardStore(courseId, (s) => s.setError)
    const setRefresh = useLeaderboardStore(courseId, (s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return null
}
