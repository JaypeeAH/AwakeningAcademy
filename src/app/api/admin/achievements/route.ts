import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createAchievement, getAchievementDefinitions } from '@/server/actions/achievements'
import { SaveAchievementSchema } from '@/@types/game/Achievements'

export const GET = apiAuthHandler('progression.manage', async () => getJsonResponse(await getAchievementDefinitions()))

export const POST = apiAuthHandler('progression.manage', async (req, _ctx, user) => {
    const input = SaveAchievementSchema.parse(await readJsonBody(req))
    return getJsonResponse(await createAchievement(user, input), { status: 201 })
})
