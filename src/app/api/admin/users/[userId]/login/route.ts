import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { updateUserLogin } from '@/server/actions/users'
import { UpdateLoginSchema } from '@/@types/users/UserAccount'

/** Sets or clears the account's username, or sets a new password. Audited. */
export const PATCH = apiAuthHandler<{ userId: string }>('users.manage', async (req, ctx, user) => {
    const userId = readId((await ctx.params).userId, 'user')
    await updateUserLogin(user, userId, UpdateLoginSchema.parse(await readJsonBody(req)))
    return getEmptyResponse()
})
