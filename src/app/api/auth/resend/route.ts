import { apiHandler, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { resendConfirmation } from '@/server/actions/auth'
import { EmailOnlySchema } from '@/@types/auth/AuthSchema'

/** Sends the sign-up confirmation email again (same response whether or not the email has an account) */
export const POST = apiHandler(async (req) => {
    await resendConfirmation(EmailOnlySchema.parse(await readJsonBody(req)), req.nextUrl.origin)
    return getEmptyResponse()
})
