import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import type { AiStatus, DraftQuestionsInput } from '@/@types/ai/QuestionDrafts'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'

export const aiStatusUrl = '/ai/status'

export const apiGetAiStatus = () => api.fetchJson<AiStatus>({ method: 'get', url: aiStatusUrl })

export const useSWRAiStatus = (config?: SWRConfiguration<AiStatus>) => useSWR(aiStatusUrl, apiGetAiStatus, config)

/** Drafts come back unsaved and flagged aiDraft; the teacher reviews them in the Quest Builder */
export const apiDraftQuestions = (activityId: string, input: DraftQuestionsInput) =>
    api.fetchJson<{ questions: QuestionInput[]; requested: number }>({
        method: 'post',
        url: `/activities/${activityId}/ai-drafts`,
        data: input,
        // Drafting can take a while
        timeout: 150_000,
    })
