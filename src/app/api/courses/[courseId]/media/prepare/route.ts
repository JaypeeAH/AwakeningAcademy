import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { prepareMediaUpload } from '@/server/actions/media'
import { PrepareMediaUploadSchema } from '@/@types/media/CourseMedia'

/** A one-time URL to upload a lesson image to (the browser sends the file straight to storage) */
export const POST = apiAuthHandler<{ courseId: string }>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = PrepareMediaUploadSchema.parse(await readJsonBody(req))
    return getJsonResponse(await prepareMediaUpload(user, courseId, input))
})
