import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { useBunnySkip } from '@/server/actions/inventory'
import { BunnySkipSchema } from '@/@types/game/Inventory'

/** Spends one Easter Bunny to skip a question (never on exams; a skip is never counted as correct) */
export const POST = apiAuthHandler<{ attemptId: string }>('play', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const { questionId } = BunnySkipSchema.parse(await readJsonBody(req))
    return getJsonResponse(await useBunnySkip(user, attemptId, questionId))
})
