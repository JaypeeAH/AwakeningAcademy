import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse, getJsonResponse } from '@/server/utils/response'
import { deleteAchievement, updateAchievement } from '@/server/actions/achievements'
import { SaveAchievementSchema } from '@/@types/game/Achievements'

type Params = { achievementId: string }

export const PUT = apiAuthHandler<Params>('progression.manage', async (req, ctx, user) => {
    const id = readId((await ctx.params).achievementId, 'achievement')
    const input = SaveAchievementSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateAchievement(user, id, input))
})

export const DELETE = apiAuthHandler<Params>('progression.manage', async (_req, ctx, user) => {
    await deleteAchievement(user, readId((await ctx.params).achievementId, 'achievement'))
    return getEmptyResponse()
})
