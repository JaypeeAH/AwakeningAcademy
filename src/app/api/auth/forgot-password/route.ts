import { apiHandler, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { requestPasswordReset } from '@/server/actions/auth'
import { EmailOnlySchema } from '@/@types/auth/AuthSchema'

/** Emails a reset link (same response whether or not the email has an account) */
export const POST = apiHandler(async (req) => {
    await requestPasswordReset(EmailOnlySchema.parse(await readJsonBody(req)), req.nextUrl.origin)
    return getEmptyResponse()
})
