'use client'

import { useSWRCourse, useSWRCourses } from '@/services/courses'
import { useSWRCourseActivities } from '@/services/activities'
import { useCourseActivitiesStore, useCourseStore, useCoursesStore } from '@/stores/GameStores'
import useSyncResource from '@/utils/hooks/useSyncResource'
import type { ProviderProps } from '@/@types/common'
import type { CourseDetail } from '@/services/courses'

/** The user's courses (students: enrolled; teachers: taught; admins: all) → useCoursesStore */
export function CoursesSWRProvider({ children }: ProviderProps) {
    const swr = useSWRCourses()
    const setData = useCoursesStore((s) => s.setData)
    const setLoading = useCoursesStore((s) => s.setLoading)
    const setError = useCoursesStore((s) => s.setError)
    const setRefresh = useCoursesStore((s) => s.setRefresh)
    useSyncResource(swr, { setData, setLoading, setError, setRefresh })
    return <>{children}</>
}

interface CourseSWRProviderProps extends ProviderProps {
    courseId: string
    /** Server-rendered first load (no loading flash) */
    course?: CourseDetail
}

/** One course + its activities (teachers: all; students: their quests) → useCourseStore / useCourseActivitiesStore */
export function CourseSWRProvider({ courseId, course, children }: CourseSWRProviderProps) {
    const detail = useSWRCourse(courseId, { fallbackData: course })
    const setData = useCourseStore(courseId, (s) => s.setData)
    const setLoading = useCourseStore(courseId, (s) => s.setLoading)
    const setError = useCourseStore(courseId, (s) => s.setError)
    const setRefresh = useCourseStore(courseId, (s) => s.setRefresh)
    useSyncResource(detail, { setData, setLoading, setError, setRefresh })

    const activities = useSWRCourseActivities(courseId)
    const setActivities = useCourseActivitiesStore(courseId, (s) => s.setData)
    const setActivitiesLoading = useCourseActivitiesStore(courseId, (s) => s.setLoading)
    const setActivitiesError = useCourseActivitiesStore(courseId, (s) => s.setError)
    const setActivitiesRefresh = useCourseActivitiesStore(courseId, (s) => s.setRefresh)
    useSyncResource(activities, {
        setData: setActivities,
        setLoading: setActivitiesLoading,
        setError: setActivitiesError,
        setRefresh: setActivitiesRefresh,
    })
    return <>{children}</>
}
