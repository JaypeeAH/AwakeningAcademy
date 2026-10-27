import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { prepareAttemptUpload } from '@/server/actions/attempts'
import { PrepareUploadSchema } from '@/@types/attempts/AttemptSchema'

/** Step 1 of a homework upload: checks, then a one-time URL to upload the file to */
export const POST = apiAuthHandler<{ attemptId: string }>('play', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const input = PrepareUploadSchema.parse(await readJsonBody(req))
    return getJsonResponse(await prepareAttemptUpload(user, attemptId, input))
})
