import { apiHandler, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { updatePassword } from '@/server/actions/auth'
import { ResetPasswordSchema } from '@/@types/auth/AuthSchema'

/** Sets a new password for the person signed in by their reset link */
export const POST = apiHandler(async (req) => {
    await updatePassword(ResetPasswordSchema.parse(await readJsonBody(req)))
    return getEmptyResponse()
})
