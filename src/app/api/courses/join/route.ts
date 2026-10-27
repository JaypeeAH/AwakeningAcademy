import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { joinCourse } from '@/server/actions/courses'
import { JoinCourseSchema } from '@/@types/courses/CourseSchema'

export const POST = apiAuthHandler('play', async (req, _ctx, user) => {
    const input = JoinCourseSchema.parse(await readJsonBody(req))
    return getJsonResponse(await joinCourse(user, input))
})
