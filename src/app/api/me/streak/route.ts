import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getStreak } from '@/server/actions/streaks'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) => getJsonResponse(await getStreak(user.id)))
