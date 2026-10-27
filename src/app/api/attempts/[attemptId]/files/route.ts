import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { confirmAttemptUpload } from '@/server/actions/attempts'
import { ConfirmUploadSchema } from '@/@types/attempts/AttemptSchema'

/** Step 2 of a homework upload: the server checks the uploaded bytes and attaches the file */
export const POST = apiAuthHandler<{ attemptId: string }>('play', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const input = ConfirmUploadSchema.parse(await readJsonBody(req))
    return getJsonResponse(await confirmAttemptUpload(user, attemptId, input), { status: 201 })
})
