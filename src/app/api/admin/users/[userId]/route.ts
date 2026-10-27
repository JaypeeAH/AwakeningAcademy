import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { setUserRole } from '@/server/actions/users'
import { SetRoleSchema } from '@/@types/users/UserAccount'

export const PATCH = apiAuthHandler<{ userId: string }>('users.manage', async (req, ctx, user) => {
    const userId = readId((await ctx.params).userId, 'user')
    await setUserRole(user, userId, SetRoleSchema.parse(await readJsonBody(req)))
    return getEmptyResponse()
})
