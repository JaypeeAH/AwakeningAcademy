import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import type { Course, CourseModule, RosterStudent } from '@/@types/courses/Course'
import type {
    AddStudentInput,
    CreateCourseInput,
    JoinCourseInput,
    ModuleInput,
    UpdateCourseInput,
} from '@/@types/courses/CourseSchema'
import type { CourseProgressReport } from '@/@types/reports/Reports'
import type { SampleCourseAdded, SampleCourseSummary } from '@/@types/courses/SampleCourse'

export const coursesUrl = '/courses'
export const getCourseUrl = (courseId: string) => `/courses/${courseId}`
export const getRosterUrl = (courseId: string) => `/courses/${courseId}/students`
export const getCourseProgressUrl = (courseId: string) => `/courses/${courseId}/progress`

export interface CourseDetail {
    course: Course
    modules: CourseModule[]
}

export const ensureCourse = (c: Course): Course => ({
    ...c,
    createdAt: tryParseDate(c.createdAt) as Date,
    updatedAt: tryParseDate(c.updatedAt) as Date,
})

const ensureDetail = (d: CourseDetail): CourseDetail => ({ ...d, course: ensureCourse(d.course) })

export const apiGetCourses = async () =>
    (await api.fetchJson<Course[]>({ method: 'get', url: coursesUrl })).map(ensureCourse)

export const useSWRCourses = (config?: SWRConfiguration<Course[]>) => useSWR(coursesUrl, apiGetCourses, config)

export const apiGetCourse = async (courseId: string) =>
    ensureDetail(await api.fetchJson<CourseDetail>({ method: 'get', url: getCourseUrl(courseId) }))

export const useSWRCourse = (courseId: string | null, config?: SWRConfiguration<CourseDetail>) =>
    useSWR(courseId ? getCourseUrl(courseId) : null, () => apiGetCourse(courseId!), config)

export const apiCreateCourse = async (input: CreateCourseInput) =>
    ensureDetail(await api.fetchJson<CourseDetail>({ method: 'post', url: coursesUrl, data: input }))

export const apiUpdateCourse = async (courseId: string, input: UpdateCourseInput) =>
    ensureDetail(await api.fetchJson<CourseDetail>({ method: 'patch', url: getCourseUrl(courseId), data: input }))

export const apiResetJoinCode = async (courseId: string) =>
    ensureDetail(await api.fetchJson<CourseDetail>({ method: 'post', url: `${getCourseUrl(courseId)}/join-code` }))

export const apiJoinCourse = (input: JoinCourseInput) =>
    api.fetchJson<{ courseId: string; title: string }>({ method: 'post', url: `${coursesUrl}/join`, data: input })

// ── Sample courses ──

export const sampleCoursesUrl = `${coursesUrl}/samples`

export const apiGetSampleCourses = () => api.fetchJson<SampleCourseSummary[]>({ method: 'get', url: sampleCoursesUrl })

export const useSWRSampleCourses = (enabled: boolean, config?: SWRConfiguration<SampleCourseSummary[]>) =>
    useSWR(enabled ? sampleCoursesUrl : null, apiGetSampleCourses, config)

/** Builds and publishes a whole course, so it gets longer than the usual timeout */
export const apiAddSampleCourse = (sampleId: string) =>
    api.fetchJson<SampleCourseAdded>({
        method: 'post',
        url: `${sampleCoursesUrl}/${encodeURIComponent(sampleId)}`,
        timeout: 90_000,
    })

// ── Roster ──

const ensureRosterStudent = (s: RosterStudent): RosterStudent => ({
    ...s,
    enrolledAt: tryParseDate(s.enrolledAt) as Date,
    lastActiveAt: tryParseDate(s.lastActiveAt),
})

export const apiGetRoster = async (courseId: string) =>
    (await api.fetchJson<RosterStudent[]>({ method: 'get', url: getRosterUrl(courseId) })).map(ensureRosterStudent)

export const useSWRRoster = (courseId: string | null, config?: SWRConfiguration<RosterStudent[]>) =>
    useSWR(courseId ? getRosterUrl(courseId) : null, () => apiGetRoster(courseId!), config)

export const apiAddStudent = async (courseId: string, input: AddStudentInput) =>
    (await api.fetchJson<RosterStudent[]>({ method: 'post', url: getRosterUrl(courseId), data: input })).map(
        ensureRosterStudent,
    )

export const apiRemoveStudent = (courseId: string, studentId: string) =>
    api.fetchJson<void>({ method: 'delete', url: `${getRosterUrl(courseId)}/${studentId}` })

// ── Modules ──

export const apiCreateModule = (courseId: string, input: ModuleInput) =>
    api.fetchJson<CourseModule>({ method: 'post', url: `${getCourseUrl(courseId)}/modules`, data: input })

export const apiUpdateModule = (moduleId: string, input: ModuleInput) =>
    api.fetchJson<CourseModule>({ method: 'patch', url: `/modules/${moduleId}`, data: input })

export const apiDeleteModule = (moduleId: string) =>
    api.fetchJson<void>({ method: 'delete', url: `/modules/${moduleId}` })

export const apiReorderModules = (courseId: string, ids: string[]) =>
    api.fetchJson<void>({ method: 'put', url: `${getCourseUrl(courseId)}/modules/order`, data: { ids } })

// ── Progress report ──

export const apiGetCourseProgress = async (courseId: string) => {
    const report = await api.fetchJson<CourseProgressReport>({ method: 'get', url: getCourseProgressUrl(courseId) })
    return { ...report, activities: report.activities.map((a) => ({ ...a, dueAt: tryParseDate(a.dueAt) })) }
}

export const useSWRCourseProgress = (courseId: string | null, config?: SWRConfiguration<CourseProgressReport>) =>
    useSWR(courseId ? getCourseProgressUrl(courseId) : null, () => apiGetCourseProgress(courseId!), config)
