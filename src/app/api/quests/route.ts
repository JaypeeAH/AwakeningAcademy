import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getQuestBoard } from '@/server/actions/activities/quests'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) =>
    getJsonResponse((await getQuestBoard(user.id)).quests),
)
