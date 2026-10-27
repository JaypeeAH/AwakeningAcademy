import { apiAuthHandler, readId } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { deleteAttemptFile } from '@/server/actions/attempts'

export const DELETE = apiAuthHandler<{ attemptId: string; fileId: string }>('play', async (_req, ctx, user) => {
    const params = await ctx.params
    await deleteAttemptFile(user, readId(params.attemptId, 'attempt'), readId(params.fileId, 'file'))
    return getEmptyResponse()
})
