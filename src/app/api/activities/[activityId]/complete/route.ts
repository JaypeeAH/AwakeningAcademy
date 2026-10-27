import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { completeLesson } from '@/server/actions/activities'

/** Completes a lesson. Safe to repeat: XP is granted once (idempotent on the server). */
export const POST = apiAuthHandler<{ activityId: string }>('play', async (_req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'quest')
    return getJsonResponse(await completeLesson(user, activityId))
})
