import useSWR, { type SWRConfiguration } from 'swr'
import api, { ApiError } from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import type { CourseMedia } from '@/@types/media/CourseMedia'

export const getCourseMediaUrl = (courseId: string) => `/courses/${courseId}/media`

const ensureMedia = (m: CourseMedia): CourseMedia => ({ ...m, createdAt: tryParseDate(m.createdAt) as Date })

export const apiGetCourseMedia = async (courseId: string) =>
    (await api.fetchJson<CourseMedia[]>({ method: 'get', url: getCourseMediaUrl(courseId) })).map(ensureMedia)

export const useSWRCourseMedia = (courseId: string | null, config?: SWRConfiguration<CourseMedia[]>) =>
    useSWR(courseId ? getCourseMediaUrl(courseId) : null, () => apiGetCourseMedia(courseId!), config)

/**
 * Uploads a lesson image: the server checks the name and size and hands out a one-time URL, the file goes
 * straight to storage, then the server checks the stored bytes and keeps it. The only other place the
 * browser sends data is the signed URL the server just issued.
 */
export async function uploadCourseImage(courseId: string, file: File): Promise<CourseMedia> {
    const prepared = await api.fetchJson<{ path: string; uploadUrl: string; contentType: string }>({
        method: 'post',
        url: `${getCourseMediaUrl(courseId)}/prepare`,
        data: { fileName: file.name, sizeBytes: file.size },
    })
    const response = await fetch(prepared.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': prepared.contentType, 'x-upsert': 'false' },
        body: file,
    })
    if (!response.ok) {
        throw new ApiError(
            'The image didn’t upload. Check your connection and try again.',
            response.status,
            'UPLOAD_FAILED',
            null,
        )
    }
    return ensureMedia(
        await api.fetchJson<CourseMedia>({
            method: 'post',
            url: getCourseMediaUrl(courseId),
            data: { path: prepared.path, fileName: file.name },
        }),
    )
}
