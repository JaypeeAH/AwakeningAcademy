import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { shieldStreak } from '@/server/actions/streaks'

/** Spends a Second Chance to fill yesterday and keep the streak */
export const POST = apiAuthHandler('play', async (_req, _ctx, user) => getJsonResponse(await shieldStreak(user)))
