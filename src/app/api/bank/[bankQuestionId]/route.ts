import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse, getJsonResponse } from '@/server/utils/response'
import { deleteBankQuestion, updateBankQuestion } from '@/server/actions/bank'
import { UpdateBankQuestionSchema } from '@/@types/bank/BankQuestion'

type Params = { bankQuestionId: string }

export const PATCH = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const id = readId((await ctx.params).bankQuestionId, 'question')
    const input = UpdateBankQuestionSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateBankQuestion(user, id, input))
})

export const DELETE = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) => {
    await deleteBankQuestion(user, readId((await ctx.params).bankQuestionId, 'question'))
    return getEmptyResponse()
})
