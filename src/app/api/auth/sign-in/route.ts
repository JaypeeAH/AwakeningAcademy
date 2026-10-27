import { apiHandler, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { signIn } from '@/server/actions/auth'
import { SignInSchema } from '@/@types/auth/AuthSchema'

export const POST = apiHandler(async (req) => {
    await signIn(SignInSchema.parse(await readJsonBody(req)))
    return getEmptyResponse()
})
