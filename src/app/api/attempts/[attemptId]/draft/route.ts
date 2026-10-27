import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { saveAttemptDraft } from '@/server/actions/attempts'
import { SaveDraftSchema } from '@/@types/attempts/AttemptSchema'

/** Autosave of the student's answers on an open attempt */
export const PUT = apiAuthHandler<{ attemptId: string }>('play', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const { responses } = SaveDraftSchema.parse(await readJsonBody(req))
    return getJsonResponse(await saveAttemptDraft(user, attemptId, responses))
})
