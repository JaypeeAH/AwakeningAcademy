import { apiAuthHandler, readJsonBody, readQuery } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createUsernameAccounts, getUsers } from '@/server/actions/users'
import { CreateAccountsSchema, UsersQuerySchema } from '@/@types/users/UserAccount'

export const GET = apiAuthHandler('users.manage', async (req) =>
    getJsonResponse(await getUsers(UsersQuerySchema.parse(readQuery(req)))),
)

/** Username-only student accounts (a pasted class list), optionally enrolled in a course */
export const POST = apiAuthHandler('users.manage', async (req, _ctx, user) =>
    getJsonResponse(await createUsernameAccounts(user, CreateAccountsSchema.parse(await readJsonBody(req))), {
        status: 201,
    }),
)
