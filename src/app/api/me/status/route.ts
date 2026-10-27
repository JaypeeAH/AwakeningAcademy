import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getPlayerStatus } from '@/server/actions/progression'
import { getQuestBoard } from '@/server/actions/activities/quests'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) =>
    getJsonResponse(await getPlayerStatus(user, await getQuestBoard(user.id))),
)
