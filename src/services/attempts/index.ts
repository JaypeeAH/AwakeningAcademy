import useSWR, { type SWRConfiguration } from 'swr'
import api, { ApiError } from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import type { AttemptFile } from '@/@types/activities/Question'
import type { Attempt, AttemptResult, AttemptSession, FeedbackEntry } from '@/@types/attempts/Attempt'
import type { ResponseInput, SubmitAttemptInput } from '@/@types/attempts/AttemptSchema'

export const getAttemptUrl = (attemptId: string) => `/attempts/${attemptId}`
export const myFeedbackUrl = '/me/feedback'

/** Opens an uploaded file (the server checks access, then redirects to a one-minute link) */
export const getFileUrl = (fileId: string) => `/api/files/${fileId}`

export const ensureAttempt = (a: Attempt): Attempt => ({
    ...a,
    startedAt: tryParseDate(a.startedAt) as Date,
    submittedAt: tryParseDate(a.submittedAt),
    expiresAt: tryParseDate(a.expiresAt),
    gradedAt: tryParseDate(a.gradedAt),
})

export const ensureAttemptFile = (f: AttemptFile): AttemptFile => ({
    ...f,
    createdAt: tryParseDate(f.createdAt) as Date,
})

export const ensureResult = (r: AttemptResult): AttemptResult => ({
    ...r,
    attempt: ensureAttempt(r.attempt),
    activity: { ...r.activity, dueAt: tryParseDate(r.activity.dueAt) },
    questions: r.questions.map((q) => ({ ...q, files: q.files.map(ensureAttemptFile) })),
})

/** Starts an attempt — or resumes the open one (with its autosaved answers), so a refresh never burns an attempt */
export const apiStartAttempt = async (activityId: string): Promise<AttemptSession> => {
    const session = await api.fetchJson<AttemptSession>({ method: 'post', url: `/activities/${activityId}/attempts` })
    return {
        ...session,
        attempt: ensureAttempt(session.attempt),
        files: session.files.map(ensureAttemptFile),
        serverNow: tryParseDate(session.serverNow) ?? new Date(),
    }
}

/** Autosave of the current answers (the server keeps them in case time runs out) */
export const apiSaveDraft = async (attemptId: string, responses: ResponseInput[]) => {
    const result = await api.fetchJson<{ savedAt: string }>({
        method: 'put',
        url: `${getAttemptUrl(attemptId)}/draft`,
        data: { responses },
    })
    return tryParseDate(result.savedAt) as Date
}

/** Only the choices are sent; the score and rewards are decided by the server */
export const apiSubmitAttempt = async (attemptId: string, input: SubmitAttemptInput) =>
    ensureResult(
        await api.fetchJson<AttemptResult>({ method: 'post', url: `${getAttemptUrl(attemptId)}/submit`, data: input }),
    )

export const apiGetAttemptResult = async (attemptId: string) =>
    ensureResult(await api.fetchJson<AttemptResult>({ method: 'get', url: getAttemptUrl(attemptId) }))

export const useSWRAttemptResult = (attemptId: string | null, config?: SWRConfiguration<AttemptResult>) =>
    useSWR(attemptId ? getAttemptUrl(attemptId) : null, () => apiGetAttemptResult(attemptId!), config)

// ── Homework uploads ──

/**
 * Uploads a file to a file-upload question: the server checks it and hands out a one-time URL, the file
 * goes straight to storage (no size limit from our functions), then the server checks the stored bytes
 * and attaches it. This is the one place the browser sends data somewhere other than our API — only to
 * the signed URL the server just issued.
 */
export async function uploadAttemptFile(attemptId: string, questionId: string, file: File): Promise<AttemptFile> {
    const prepared = await api.fetchJson<{ path: string; uploadUrl: string; contentType: string }>({
        method: 'post',
        url: `${getAttemptUrl(attemptId)}/files/prepare`,
        data: { questionId, fileName: file.name, sizeBytes: file.size },
    })
    const upload = await fetch(prepared.uploadUrl, {
        method: 'PUT',
        headers: { 'content-type': prepared.contentType, 'x-upsert': 'false' },
        body: file,
    })
    if (!upload.ok)
        throw new ApiError(
            'The upload didn’t finish. Check your connection and try again.',
            upload.status,
            'UPLOAD_FAILED',
            null,
        )
    return ensureAttemptFile(
        await api.fetchJson<AttemptFile>({
            method: 'post',
            url: `${getAttemptUrl(attemptId)}/files`,
            data: { questionId, path: prepared.path, fileName: file.name },
        }),
    )
}

export const apiDeleteAttemptFile = (attemptId: string, fileId: string) =>
    api.fetchJson<void>({ method: 'delete', url: `${getAttemptUrl(attemptId)}/files/${fileId}` })

// ── Feedback (Chronicle) ──

export const apiGetMyFeedback = async () =>
    (await api.fetchJson<FeedbackEntry[]>({ method: 'get', url: myFeedbackUrl })).map((f) => ({
        ...f,
        gradedAt: tryParseDate(f.gradedAt),
    }))

export const useSWRMyFeedback = (config?: SWRConfiguration<FeedbackEntry[]>) =>
    useSWR(myFeedbackUrl, apiGetMyFeedback, config)
