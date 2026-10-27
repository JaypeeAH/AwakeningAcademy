import useSWR, { type SWRConfiguration } from 'swr'
import api, { type ApiOptions } from '@/services/api'
import { ensureAttempt } from '@/services/attempts'
import { tryParseDate } from '@/utils/parse'
import type { Activity, ActivityPlayView, ActivityResults, ActivitySummary, Quest } from '@/@types/activities/Activity'
import type { LearningOutcome } from '@/@types/progression/Streak'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'
import type { CreateActivityInput, SaveActivityInput } from '@/@types/activities/ActivitySchema'
import type { PublishStatus } from '@/@types/activities/ActivityKindOptions'
import type { RewardSummary } from '@/@types/progression/Progression'

export const questsUrl = '/quests'
export const getCourseActivitiesUrl = (courseId: string) => `/courses/${courseId}/activities`
export const getActivityUrl = (activityId: string) => `/activities/${activityId}`
export const getActivityEditorUrl = (activityId: string) => `/activities/${activityId}/editor`
export const getActivityResultsUrl = (activityId: string) => `/activities/${activityId}/results`

export const ensureActivitySummary = <T extends ActivitySummary>(a: T): T => ({
    ...a,
    opensAt: tryParseDate(a.opensAt),
    dueAt: tryParseDate(a.dueAt),
    publishedAt: tryParseDate(a.publishedAt),
})

export const ensureActivity = (a: Activity): Activity => ({
    ...ensureActivitySummary(a),
    createdAt: tryParseDate(a.createdAt) as Date,
    updatedAt: tryParseDate(a.updatedAt) as Date,
})

export const ensureQuest = (q: Quest): Quest => ({
    ...ensureActivitySummary(q),
    completedAt: tryParseDate(q.completedAt),
})

// ── Student ──

export const apiGetQuests = async (apiOptions?: ApiOptions) =>
    (await api.fetchJson<Quest[]>({ ...apiOptions, method: 'get', url: questsUrl })).map(ensureQuest)

export const useSWRQuests = (config?: SWRConfiguration<Quest[]>) => useSWR(questsUrl, () => apiGetQuests(), config)

export const apiGetActivityForPlay = async (activityId: string) => {
    const view = await api.fetchJson<ActivityPlayView>({ method: 'get', url: getActivityUrl(activityId) })
    return {
        activity: ensureActivity(view.activity),
        quest: ensureQuest(view.quest),
        attempts: view.attempts.map(ensureAttempt),
        skills: view.skills,
        team: view.team ? { ...view.team, completedAt: tryParseDate(view.team.completedAt) } : null,
    }
}

export const useSWRActivityForPlay = (activityId: string | null, config?: SWRConfiguration<ActivityPlayView>) =>
    useSWR(activityId ? getActivityUrl(activityId) : null, () => apiGetActivityForPlay(activityId!), config)

export const apiCompleteLesson = (activityId: string) =>
    api.fetchJson<{ firstCompletion: boolean; reward: RewardSummary } & LearningOutcome>({
        method: 'post',
        url: `${getActivityUrl(activityId)}/complete`,
    })

// ── Course content (teachers get every activity, students their quests) ──

export interface CourseActivities {
    activities: ActivitySummary[]
    quests: Quest[] | null
}

export const apiGetCourseActivities = async (courseId: string) => {
    const result = await api.fetchJson<CourseActivities>({ method: 'get', url: getCourseActivitiesUrl(courseId) })
    return { activities: result.activities.map(ensureActivitySummary), quests: result.quests?.map(ensureQuest) ?? null }
}

export const useSWRCourseActivities = (courseId: string | null, config?: SWRConfiguration<CourseActivities>) =>
    useSWR(courseId ? getCourseActivitiesUrl(courseId) : null, () => apiGetCourseActivities(courseId!), config)

// ── Quest Builder ──

export const ensureEditorData = (data: ActivityEditorData): ActivityEditorData => ({
    ...data,
    activity: ensureActivity(data.activity),
})

export const apiCreateActivity = async (courseId: string, input: CreateActivityInput) =>
    ensureActivitySummary(
        await api.fetchJson<ActivitySummary>({ method: 'post', url: getCourseActivitiesUrl(courseId), data: input }),
    )

export const apiGetActivityEditor = async (activityId: string) =>
    ensureEditorData(await api.fetchJson<ActivityEditorData>({ method: 'get', url: getActivityEditorUrl(activityId) }))

export const useSWRActivityEditor = (activityId: string | null, config?: SWRConfiguration<ActivityEditorData>) =>
    useSWR(activityId ? getActivityEditorUrl(activityId) : null, () => apiGetActivityEditor(activityId!), config)

export const apiSaveActivity = async (activityId: string, input: SaveActivityInput) =>
    ensureEditorData(
        await api.fetchJson<ActivityEditorData>({ method: 'put', url: getActivityUrl(activityId), data: input }),
    )

export const apiSetActivityStatus = async (activityId: string, status: PublishStatus) =>
    ensureEditorData(
        await api.fetchJson<ActivityEditorData>({
            method: 'post',
            url: `${getActivityUrl(activityId)}/status`,
            data: { status },
        }),
    )

export const apiDeleteActivity = (activityId: string) =>
    api.fetchJson<void>({ method: 'delete', url: getActivityUrl(activityId) })

export const apiReorderActivities = (courseId: string, ids: string[]) =>
    api.fetchJson<void>({ method: 'put', url: `${getCourseActivitiesUrl(courseId)}/order`, data: { ids } })

// ── Results ──

export const apiGetActivityResults = async (activityId: string) => {
    const r = await api.fetchJson<ActivityResults>({ method: 'get', url: getActivityResultsUrl(activityId) })
    return {
        ...r,
        activity: ensureActivity(r.activity),
        students: r.students.map((s) => ({
            ...s,
            completedAt: tryParseDate(s.completedAt),
            attempts: s.attempts.map((a) => ({ ...a, submittedAt: tryParseDate(a.submittedAt) })),
        })),
    }
}

export const useSWRActivityResults = (activityId: string | null, config?: SWRConfiguration<ActivityResults>) =>
    useSWR(activityId ? getActivityResultsUrl(activityId) : null, () => apiGetActivityResults(activityId!), config)
