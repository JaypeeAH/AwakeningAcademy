import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getSampleCourses } from '@/server/actions/samples'

/** The sample courses a teacher can add to their own courses */
export const GET = apiAuthHandler('courses.manage', async () => getJsonResponse(getSampleCourses()))
