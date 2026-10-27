import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getNotifications } from '@/server/actions/notifications'

export const GET = apiAuthHandler(null, async (_req, _ctx, user) => getJsonResponse(await getNotifications(user.id)))
