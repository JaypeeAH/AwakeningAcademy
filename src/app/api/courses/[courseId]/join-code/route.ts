import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { resetJoinCode } from '@/server/actions/courses'

export const POST = apiAuthHandler<{ courseId: string }>('courses.manage', async (_req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    return getJsonResponse(await resetJoinCode(user, courseId))
})
