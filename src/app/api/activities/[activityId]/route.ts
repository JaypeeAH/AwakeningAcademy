import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse, getJsonResponse } from '@/server/utils/response'
import { deleteActivity, getActivityForPlay, saveActivity } from '@/server/actions/activities'
import { SaveActivitySchema } from '@/@types/activities/ActivitySchema'

type Params = { activityId: string }

/** The student's view of a quest (no answer keys) */
export const GET = apiAuthHandler<Params>('play', async (_req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'quest')
    return getJsonResponse(await getActivityForPlay(user, activityId))
})

/** Quest Builder save (details + questions) */
export const PUT = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'activity')
    const input = SaveActivitySchema.parse(await readJsonBody(req))
    return getJsonResponse(await saveActivity(user, activityId, input))
})

export const DELETE = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) => {
    await deleteActivity(user, readId((await ctx.params).activityId, 'activity'))
    return getEmptyResponse()
})
