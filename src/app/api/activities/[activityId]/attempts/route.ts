import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { startAttempt } from '@/server/actions/attempts'

/** Starts an attempt, or resumes the open one */
export const POST = apiAuthHandler<{ activityId: string }>('play', async (_req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'quest')
    return getJsonResponse(await startAttempt(user, activityId))
})
