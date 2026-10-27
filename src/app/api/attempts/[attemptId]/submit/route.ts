import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { enforceRateLimit } from '@/server/security/rateLimit'
import { getJsonResponse } from '@/server/utils/response'
import { submitAttempt } from '@/server/actions/attempts'
import { SubmitAttemptSchema } from '@/@types/attempts/AttemptSchema'

/** Submits answers. Scores and rewards are computed on the server; a repeat submit changes nothing. */
export const POST = apiAuthHandler<{ attemptId: string }>('play', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const input = SubmitAttemptSchema.parse(await readJsonBody(req))
    await enforceRateLimit('submitPerUser', user.id)
    return getJsonResponse(await submitAttempt(user, attemptId, input))
})
