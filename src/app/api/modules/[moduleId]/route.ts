import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse, getJsonResponse } from '@/server/utils/response'
import { deleteModule, updateModule } from '@/server/actions/courses'
import { ModuleSchema } from '@/@types/courses/CourseSchema'

type Params = { moduleId: string }

export const PATCH = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const moduleId = readId((await ctx.params).moduleId, 'module')
    const input = ModuleSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateModule(user, moduleId, input))
})

export const DELETE = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) => {
    await deleteModule(user, readId((await ctx.params).moduleId, 'module'))
    return getEmptyResponse()
})
