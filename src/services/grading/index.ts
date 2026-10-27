import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import { ensureAttempt, ensureAttemptFile } from '@/services/attempts'
import { tryParseDate } from '@/utils/parse'
import type {
    AttemptForGrading,
    GradeAttemptInput,
    GradeAttemptResult,
    GradingQueue,
    GradingQueueItem,
} from '@/@types/grading/Grading'
import type {
    BankQuery,
    BankQuestion,
    SaveBankQuestionInput,
    UpdateBankQuestionInput,
} from '@/@types/bank/BankQuestion'

// ── Grading ──

export const gradingQueueUrl = '/grading'
export const getGradingUrl = (attemptId: string) => `/grading/${attemptId}`

const ensureQueueItem = (i: GradingQueueItem): GradingQueueItem => ({
    ...i,
    submittedAt: tryParseDate(i.submittedAt),
    dueAt: tryParseDate(i.dueAt),
})

export const apiGetGradingQueue = async () => {
    const queue = await api.fetchJson<GradingQueue>({ method: 'get', url: gradingQueueUrl })
    return { pending: queue.pending.map(ensureQueueItem), recent: queue.recent.map(ensureQueueItem) }
}

export const useSWRGradingQueue = (config?: SWRConfiguration<GradingQueue>) =>
    useSWR(gradingQueueUrl, apiGetGradingQueue, config)

export const apiGetAttemptForGrading = async (attemptId: string): Promise<AttemptForGrading> => {
    const data = await api.fetchJson<AttemptForGrading>({ method: 'get', url: getGradingUrl(attemptId) })
    return {
        ...data,
        attempt: ensureAttempt(data.attempt),
        activity: { ...data.activity, dueAt: tryParseDate(data.activity.dueAt) },
        questions: data.questions.map((q) => ({ ...q, files: q.files.map(ensureAttemptFile) })),
    }
}

export const useSWRAttemptForGrading = (attemptId: string | null, config?: SWRConfiguration<AttemptForGrading>) =>
    useSWR(attemptId ? getGradingUrl(attemptId) : null, () => apiGetAttemptForGrading(attemptId!), config)

/** Sends the teacher's marks; totals and rewards are worked out on the server */
export const apiGradeAttempt = (attemptId: string, input: GradeAttemptInput) =>
    api.fetchJson<GradeAttemptResult>({ method: 'post', url: getGradingUrl(attemptId), data: input })

// ── Question bank ──

export const getBankUrl = (courseId: string, query: BankQuery = {}) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query))
        if (value !== undefined && value !== '') params.set(key, String(value))
    return `/courses/${courseId}/bank${params.size ? `?${params}` : ''}`
}

const ensureBankQuestion = (b: BankQuestion): BankQuestion => ({
    ...b,
    createdAt: tryParseDate(b.createdAt) as Date,
    updatedAt: tryParseDate(b.updatedAt) as Date,
})

export const apiGetBank = async (courseId: string, query: BankQuery = {}) =>
    (await api.fetchJson<BankQuestion[]>({ method: 'get', url: getBankUrl(courseId, query) })).map(ensureBankQuestion)

export const useSWRBank = (courseId: string | null, query: BankQuery = {}, config?: SWRConfiguration<BankQuestion[]>) =>
    useSWR(courseId ? getBankUrl(courseId, query) : null, () => apiGetBank(courseId!, query), {
        keepPreviousData: true,
        ...config,
    })

export const apiSaveToBank = async (courseId: string, input: SaveBankQuestionInput) =>
    ensureBankQuestion(await api.fetchJson<BankQuestion>({ method: 'post', url: getBankUrl(courseId), data: input }))

export const apiUpdateBankQuestion = async (bankQuestionId: string, input: UpdateBankQuestionInput) =>
    ensureBankQuestion(
        await api.fetchJson<BankQuestion>({ method: 'patch', url: `/bank/${bankQuestionId}`, data: input }),
    )

export const apiDeleteBankQuestion = (bankQuestionId: string) =>
    api.fetchJson<void>({ method: 'delete', url: `/bank/${bankQuestionId}` })
