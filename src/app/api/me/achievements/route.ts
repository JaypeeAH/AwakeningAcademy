import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getAchievementBook } from '@/server/actions/achievements'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) =>
    getJsonResponse(await getAchievementBook(user.id)),
)
