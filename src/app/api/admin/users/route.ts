import { apiAuthHandler, readQuery } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getUsers } from '@/server/actions/users'
import { UsersQuerySchema } from '@/@types/users/UserAccount'

export const GET = apiAuthHandler('users.manage', async (req) =>
    getJsonResponse(await getUsers(UsersQuerySchema.parse(readQuery(req)))),
)
