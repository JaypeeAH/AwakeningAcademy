import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import type { AnalyticsFilters, CourseAnalytics } from '@/@types/reports/Analytics'

export const getAnalyticsUrl = (courseId: string, filters: Partial<AnalyticsFilters>) => {
    const params = new URLSearchParams()
    if (filters.moduleId) params.set('moduleId', filters.moduleId)
    if (filters.studentId) params.set('studentId', filters.studentId)
    if (filters.from) params.set('from', filters.from.toISOString().slice(0, 10))
    if (filters.to) params.set('to', filters.to.toISOString().slice(0, 10))
    const query = params.toString()
    return `/courses/${courseId}/analytics${query ? `?${query}` : ''}`
}

export const apiGetAnalytics = async (
    courseId: string,
    filters: Partial<AnalyticsFilters>,
): Promise<CourseAnalytics> => {
    const data = await api.fetchJson<CourseAnalytics>({ method: 'get', url: getAnalyticsUrl(courseId, filters) })
    return {
        ...data,
        work: {
            overdue: data.work.overdue.map((o) => ({ ...o, dueAt: tryParseDate(o.dueAt) as Date })),
            incomplete: data.work.incomplete.map((i) => ({ ...i, dueAt: tryParseDate(i.dueAt) })),
        },
    }
}

export const useSWRAnalytics = (
    courseId: string | null,
    filters: Partial<AnalyticsFilters>,
    config?: SWRConfiguration<CourseAnalytics>,
) =>
    useSWR(courseId ? getAnalyticsUrl(courseId, filters) : null, () => apiGetAnalytics(courseId!, filters), {
        keepPreviousData: true,
        ...config,
    })
