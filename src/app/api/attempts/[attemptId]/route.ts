import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getAttemptResult } from '@/server/actions/attempts'

/** A graded attempt — the student's own, or one in a course the user teaches */
export const GET = apiAuthHandler<{ attemptId: string }>(null, async (_req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    return getJsonResponse(await getAttemptResult(user, attemptId))
})
