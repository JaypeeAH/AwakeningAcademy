import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import { NOTIFICATIONS_REFRESH_MS } from '@/configs/swr.config'
import type { Subject } from '@/@types/subjects/Subject'
import type { MarkNotificationsReadInput, NotificationFeed } from '@/@types/notifications/Notification'
import type { EmailOnlyInput, ResetPasswordInput, SignInInput, SignUpInput } from '@/@types/auth/AuthSchema'
import type { TeacherOverview, AdminOverview } from '@/@types/reports/Reports'

/* Small services that don't warrant their own folder: auth, subjects, notifications, overviews. */

// ── Auth ──

export const apiSignIn = (input: SignInInput) =>
    api.fetchJson<void>({ method: 'post', url: '/auth/sign-in', data: input })

export const apiSignUp = (input: SignUpInput) =>
    api.fetchJson<{ needsConfirmation: boolean }>({ method: 'post', url: '/auth/sign-up', data: input })

export const apiResendConfirmation = (input: EmailOnlyInput) =>
    api.fetchJson<void>({ method: 'post', url: '/auth/resend', data: input })

export const apiForgotPassword = (input: EmailOnlyInput) =>
    api.fetchJson<void>({ method: 'post', url: '/auth/forgot-password', data: input })

export const apiResetPassword = (input: ResetPasswordInput) =>
    api.fetchJson<void>({ method: 'post', url: '/auth/reset-password', data: input })

// ── Subjects ──

export const subjectsUrl = '/subjects'
export const apiGetSubjects = () => api.fetchJson<Subject[]>({ method: 'get', url: subjectsUrl })
export const useSWRSubjects = (config?: SWRConfiguration<Subject[]>) => useSWR(subjectsUrl, apiGetSubjects, config)

// ── Notifications ──

export const notificationsUrl = '/notifications'

const ensureFeed = (feed: NotificationFeed): NotificationFeed => ({
    ...feed,
    records: feed.records.map((n) => ({
        ...n,
        readAt: tryParseDate(n.readAt),
        createdAt: tryParseDate(n.createdAt) as Date,
    })),
})

export const apiGetNotifications = async () =>
    ensureFeed(await api.fetchJson<NotificationFeed>({ method: 'get', url: notificationsUrl }))

export const useSWRNotifications = (config?: SWRConfiguration<NotificationFeed>) =>
    useSWR(notificationsUrl, apiGetNotifications, { refreshInterval: NOTIFICATIONS_REFRESH_MS, ...config })

export const apiMarkNotificationsRead = async (input: MarkNotificationsReadInput) =>
    ensureFeed(await api.fetchJson<NotificationFeed>({ method: 'post', url: `${notificationsUrl}/read`, data: input }))

// ── Dashboards ──

export const teacherOverviewUrl = '/teacher/overview'
export const apiGetTeacherOverview = async () => {
    const overview = await api.fetchJson<TeacherOverview>({ method: 'get', url: teacherOverviewUrl })
    return {
        recentSubmissions: overview.recentSubmissions.map((s) => ({
            ...s,
            submittedAt: tryParseDate(s.submittedAt) as Date,
        })),
    }
}
export const useSWRTeacherOverview = (config?: SWRConfiguration<TeacherOverview>) =>
    useSWR(teacherOverviewUrl, apiGetTeacherOverview, config)

export const adminOverviewUrl = '/admin/overview'
export const apiGetAdminOverview = () => api.fetchJson<AdminOverview>({ method: 'get', url: adminOverviewUrl })
export const useSWRAdminOverview = (config?: SWRConfiguration<AdminOverview>) =>
    useSWR(adminOverviewUrl, apiGetAdminOverview, config)
