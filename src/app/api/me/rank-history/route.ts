import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getRankHistory } from '@/server/actions/progression'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) => getJsonResponse(await getRankHistory(user.id)))
