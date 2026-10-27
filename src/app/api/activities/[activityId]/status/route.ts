import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { setActivityStatus } from '@/server/actions/activities'
import { ActivityStatusSchema } from '@/@types/activities/ActivitySchema'

export const POST = apiAuthHandler<{ activityId: string }>('courses.manage', async (req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'activity')
    const { status } = ActivityStatusSchema.parse(await readJsonBody(req))
    return getJsonResponse(await setActivityStatus(user, activityId, status))
})
