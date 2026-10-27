import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createModule } from '@/server/actions/courses'
import { ModuleSchema } from '@/@types/courses/CourseSchema'

export const POST = apiAuthHandler<{ courseId: string }>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = ModuleSchema.parse(await readJsonBody(req))
    return getJsonResponse(await createModule(user, courseId, input), { status: 201 })
})
