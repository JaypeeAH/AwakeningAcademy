import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { reorderActivities } from '@/server/actions/activities'
import { ReorderSchema } from '@/@types/courses/CourseSchema'

export const PUT = apiAuthHandler<{ courseId: string }>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const { ids } = ReorderSchema.parse(await readJsonBody(req))
    await reorderActivities(user, courseId, ids)
    return getEmptyResponse()
})
