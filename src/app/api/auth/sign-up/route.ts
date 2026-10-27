import { apiHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { signUp } from '@/server/actions/auth'
import { SignUpSchema } from '@/@types/auth/AuthSchema'

export const POST = apiHandler(async (req) => {
    const input = SignUpSchema.parse(await readJsonBody(req))
    return getJsonResponse(await signUp(input, req.nextUrl.origin), { status: 201 })
})
