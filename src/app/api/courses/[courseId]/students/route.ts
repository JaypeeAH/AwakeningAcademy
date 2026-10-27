import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { addStudent, getRoster } from '@/server/actions/courses'
import { AddStudentSchema } from '@/@types/courses/CourseSchema'

type Params = { courseId: string }

export const GET = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    return getJsonResponse(await getRoster(user, courseId))
})

export const POST = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = AddStudentSchema.parse(await readJsonBody(req))
    return getJsonResponse(await addStudent(user, courseId, input), { status: 201 })
})
