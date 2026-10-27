import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createCourse, getCoursesForUser } from '@/server/actions/courses'
import { CreateCourseSchema } from '@/@types/courses/CourseSchema'

export const GET = apiAuthHandler(null, async (_req, _ctx, user) => getJsonResponse(await getCoursesForUser(user)))

export const POST = apiAuthHandler('courses.manage', async (req, _ctx, user) => {
    const input = CreateCourseSchema.parse(await readJsonBody(req))
    return getJsonResponse(await createCourse(user, input), { status: 201 })
})
