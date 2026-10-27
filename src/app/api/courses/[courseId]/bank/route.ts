import { apiAuthHandler, readId, readJsonBody, readQuery } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getBankQuestions, saveBankQuestion } from '@/server/actions/bank'
import { BankQuerySchema, SaveBankQuestionSchema } from '@/@types/bank/BankQuestion'

type Params = { courseId: string }

export const GET = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    return getJsonResponse(await getBankQuestions(user, courseId, BankQuerySchema.parse(readQuery(req))))
})

export const POST = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = SaveBankQuestionSchema.parse(await readJsonBody(req))
    return getJsonResponse(await saveBankQuestion(user, courseId, input), { status: 201 })
})
