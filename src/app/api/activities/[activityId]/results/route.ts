import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getActivityResults } from '@/server/actions/attempts'

export const GET = apiAuthHandler<{ activityId: string }>('results.view', async (_req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'activity')
    return getJsonResponse(await getActivityResults(user, activityId))
})
