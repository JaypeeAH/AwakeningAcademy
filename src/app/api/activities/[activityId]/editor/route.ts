import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getActivityEditor } from '@/server/actions/activities'

export const GET = apiAuthHandler<{ activityId: string }>('courses.manage', async (_req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'activity')
    return getJsonResponse(await getActivityEditor(user, activityId))
})
