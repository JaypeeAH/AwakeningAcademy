import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { confirmMediaUpload, getCourseMedia } from '@/server/actions/media'
import { ConfirmMediaUploadSchema } from '@/@types/media/CourseMedia'

type Params = { courseId: string }

/** The course's uploaded lesson images (newest first) */
export const GET = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) =>
    getJsonResponse(await getCourseMedia(user, readId((await ctx.params).courseId, 'course'))),
)

/** Keeps an uploaded image once its bytes check out */
export const POST = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = ConfirmMediaUploadSchema.parse(await readJsonBody(req))
    return getJsonResponse(await confirmMediaUpload(user, courseId, input), { status: 201 })
})
