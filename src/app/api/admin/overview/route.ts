import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getAdminOverview } from '@/server/actions/reports'

export const GET = apiAuthHandler('users.manage', async () => getJsonResponse(await getAdminOverview()))
