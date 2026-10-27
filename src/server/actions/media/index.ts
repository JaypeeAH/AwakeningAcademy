import 'server-only'
import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import {
    createLessonMediaUploadUrl,
    downloadLessonMedia,
    getLessonMediaUrl,
    removeLessonMedia,
} from '@/server/data/supabase/storage'
import { findCourse, isCourseTeacher, isEnrolled, requireCourseTeacher } from '@/server/actions/courses/access'
import {
    ALLOWED_FILE_TYPES,
    checkImageUpload,
    fileExtension,
    IMAGE_EXTENSIONS,
    MAX_IMAGE_BYTES,
    safeFileName,
} from '@/utils/fileTypes'
import { getMediaUrl } from '@/utils/media'
import { DataError, NotFoundError } from '@/@types/errors'
import type { Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { ConfirmMediaUploadInput, CourseMedia, PrepareMediaUploadInput } from '@/@types/media/CourseMedia'

/*
 * Lesson images: uploaded straight to private storage through a one-time URL (Vercel's body limit),
 * then checked by their bytes before they're kept. Viewing goes through /api/media/[id], which lets in
 * the course's teachers and enrolled students only.
 */

const mapMedia = (row: Tables<'course_media'>): CourseMedia => ({
    id: row.id,
    courseId: row.course_id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    url: getMediaUrl(row.id),
    createdAt: new Date(row.created_at),
})

const folder = (courseId: string) => `${courseId}/`

export async function getCourseMedia(user: SessionUser, courseId: string): Promise<CourseMedia[]> {
    await requireCourseTeacher(user, courseId)
    return unwrap(
        await supabaseAdmin()
            .from('course_media')
            .select('*')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false })
            .limit(100),
        'load images',
    ).map(mapMedia)
}

/** Step 1: checks the name and size, returns a one-time upload URL for a path the server chooses */
export async function prepareMediaUpload(user: SessionUser, courseId: string, input: PrepareMediaUploadInput) {
    await requireCourseTeacher(user, courseId)
    const extension = fileExtension(input.fileName)
    if (!IMAGE_EXTENSIONS.includes(extension)) {
        throw new DataError('Only PNG, JPEG, GIF or WebP images can be added to lessons.', 'INVALID_FILE')
    }
    if (input.sizeBytes > MAX_IMAGE_BYTES)
        throw new DataError('That image is too big. The limit is 5 MB.', 'FILE_TOO_BIG')
    const path = `${folder(courseId)}${randomUUID()}.${extension}`
    return {
        path,
        uploadUrl: await createLessonMediaUploadUrl(path),
        contentType: ALLOWED_FILE_TYPES[extension].contentType,
    }
}

/** Step 2: reads the stored bytes back, keeps the image only if it really is one */
export async function confirmMediaUpload(
    user: SessionUser,
    courseId: string,
    input: ConfirmMediaUploadInput,
): Promise<CourseMedia> {
    await requireCourseTeacher(user, courseId)
    if (!input.path.startsWith(folder(courseId)) || input.path.includes('..')) {
        throw new DataError('That upload doesn’t belong to this course.', 'INVALID_FILE')
    }
    const bytes = await downloadLessonMedia(input.path)
    if (!bytes) throw new DataError('The upload didn’t arrive. Please try again.', 'UPLOAD_MISSING')
    const fileName = safeFileName(input.fileName)
    const checked = checkImageUpload(fileName, bytes)
    if (!checked.ok) {
        await removeLessonMedia([input.path])
        throw new DataError(checked.reason, 'INVALID_FILE')
    }
    const inserted = await supabaseAdmin()
        .from('course_media')
        .insert({
            course_id: courseId,
            storage_path: input.path,
            file_name: fileName,
            content_type: checked.contentType,
            size_bytes: bytes.length,
            uploaded_by: user.id,
        })
        .select('*')
        .single()
    if (inserted.error) {
        if (inserted.error.code !== '23505') await removeLessonMedia([input.path])
        throw toAppError(inserted.error, 'save the image')
    }
    return mapMedia(inserted.data)
}

/** A short-lived link to the image, for the course's teachers and its enrolled students */
export async function getMediaViewUrl(user: SessionUser, mediaId: string) {
    const media = unwrapMaybe(
        await supabaseAdmin().from('course_media').select('*').eq('id', mediaId).maybeSingle(),
        'find the image',
    )
    const notFound = () => new NotFoundError('That image doesn’t exist.', 'MEDIA_NOT_FOUND')
    if (!media) throw notFound()
    if (!(await isCourseTeacher(user, media.course_id))) {
        const course = await findCourse(media.course_id)
        if (course?.status !== 'published' || !(await isEnrolled(user.id, media.course_id))) throw notFound()
    }
    return getLessonMediaUrl(media.storage_path)
}
