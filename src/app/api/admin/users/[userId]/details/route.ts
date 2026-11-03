import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { updateAccountDetails } from '@/server/actions/users'
import { UpdateAccountDetailsSchema } from '@/@types/users/UserAccount'

/** Sets or clears the account's username or section, or sets a new password. Audited. */
export const PATCH = apiAuthHandler<{ userId: string }>('users.manage', async (req, ctx, user) => {
    const userId = readId((await ctx.params).userId, 'user')
    await updateAccountDetails(user, userId, UpdateAccountDetailsSchema.parse(await readJsonBody(req)))
    return getEmptyResponse()
})
