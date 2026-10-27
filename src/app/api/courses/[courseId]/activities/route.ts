import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createActivity, getCourseActivities } from '@/server/actions/activities'
import { CreateActivitySchema } from '@/@types/activities/ActivitySchema'

type Params = { courseId: string }

export const GET = apiAuthHandler<Params>(null, async (_req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    return getJsonResponse(await getCourseActivities(user, courseId))
})

export const POST = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = CreateActivitySchema.parse(await readJsonBody(req))
    return getJsonResponse(await createActivity(user, courseId, input), { status: 201 })
})
