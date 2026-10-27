import 'server-only'
import { supabaseAdmin } from './admin'
import { ServiceUnavailableError } from '@/@types/errors'

/**
 * Homework files in the private 'submissions' bucket (created by migration 20261027000300). The server
 * decides every path and checks access; browsers upload and download only through short-lived signed URLs.
 */
export const SUBMISSIONS_BUCKET = 'submissions'
const SIGNED_URL_SECONDS = 60

/**
 * A one-time URL the browser uploads the file to directly (large files never pass through our
 * functions, which have a small body limit on Vercel). The path is chosen by the server.
 */
export async function createSubmissionUploadUrl(path: string) {
    const { data, error } = await supabaseAdmin().storage.from(SUBMISSIONS_BUCKET).createSignedUploadUrl(path)
    if (error || !data) {
        console.error('[storage] signed upload url', error)
        throw new ServiceUnavailableError('Uploads aren’t available right now. Please try again.', 'UPLOAD_FAILED')
    }
    return data.signedUrl
}

/** The uploaded bytes (to check the file really is what its name says), or null if it isn't there */
export async function downloadSubmission(path: string): Promise<Uint8Array | null> {
    const { data, error } = await supabaseAdmin().storage.from(SUBMISSIONS_BUCKET).download(path)
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
}

export async function removeSubmissions(paths: string[]) {
    if (!paths.length) return
    const { error } = await supabaseAdmin().storage.from(SUBMISSIONS_BUCKET).remove(paths)
    if (error) console.error('[storage] remove', error)
}

/** A download link valid for one minute, saved under the original file name */
export async function getSubmissionUrl(path: string, fileName: string) {
    const { data, error } = await supabaseAdmin()
        .storage.from(SUBMISSIONS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_SECONDS, { download: fileName })
    if (error || !data) {
        console.error('[storage] signed url', error)
        throw new ServiceUnavailableError('The file couldn’t be opened right now. Please try again.', 'DOWNLOAD_FAILED')
    }
    return data.signedUrl
}

// ── Lesson images (private 'lesson-media' bucket, migration 20261029000100) ──

export const LESSON_MEDIA_BUCKET = 'lesson-media'
/** Lesson images are viewed for a whole lesson, so their links last longer than downloads */
const MEDIA_URL_SECONDS = 60 * 60

export async function createLessonMediaUploadUrl(path: string) {
    const { data, error } = await supabaseAdmin().storage.from(LESSON_MEDIA_BUCKET).createSignedUploadUrl(path)
    if (error || !data) {
        console.error('[storage] media upload url', error)
        throw new ServiceUnavailableError('Uploads aren’t available right now. Please try again.', 'UPLOAD_FAILED')
    }
    return data.signedUrl
}

export async function downloadLessonMedia(path: string): Promise<Uint8Array | null> {
    const { data, error } = await supabaseAdmin().storage.from(LESSON_MEDIA_BUCKET).download(path)
    if (error || !data) return null
    return new Uint8Array(await data.arrayBuffer())
}

export async function removeLessonMedia(paths: string[]) {
    if (!paths.length) return
    const { error } = await supabaseAdmin().storage.from(LESSON_MEDIA_BUCKET).remove(paths)
    if (error) console.error('[storage] remove media', error)
}

export async function getLessonMediaUrl(path: string) {
    const { data, error } = await supabaseAdmin()
        .storage.from(LESSON_MEDIA_BUCKET)
        .createSignedUrl(path, MEDIA_URL_SECONDS)
    if (error || !data) {
        console.error('[storage] media url', error)
        throw new ServiceUnavailableError('The image couldn’t be loaded right now.', 'MEDIA_FAILED')
    }
    return data.signedUrl
}
