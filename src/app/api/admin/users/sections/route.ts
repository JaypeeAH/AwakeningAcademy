import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getSections } from '@/server/actions/users'

/** The sections in use (suggestions for the account dialogs) */
export const GET = apiAuthHandler('users.manage', async () => getJsonResponse(await getSections()))
