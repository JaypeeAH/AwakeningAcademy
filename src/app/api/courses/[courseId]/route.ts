import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getCourse, updateCourse } from '@/server/actions/courses'
import { UpdateCourseSchema } from '@/@types/courses/CourseSchema'

type Params = { courseId: string }

export const GET = apiAuthHandler<Params>(null, async (_req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    return getJsonResponse(await getCourse(user, courseId))
})

export const PATCH = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = UpdateCourseSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateCourse(user, courseId, input))
})
