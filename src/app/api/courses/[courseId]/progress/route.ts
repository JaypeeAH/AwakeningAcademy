import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getCourseProgress } from '@/server/actions/reports'

export const GET = apiAuthHandler<{ courseId: string }>('results.view', async (_req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    return getJsonResponse(await getCourseProgress(user, courseId))
})
