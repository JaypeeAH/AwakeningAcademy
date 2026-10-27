import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { updateSkillDefinition } from '@/server/actions/skills'
import { UpdateSkillDefinitionSchema } from '@/@types/game/Inventory'

export const PUT = apiAuthHandler<{ skillId: string }>('progression.manage', async (req, ctx, user) => {
    const skillId = readId((await ctx.params).skillId, 'skill')
    const input = UpdateSkillDefinitionSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateSkillDefinition(user, skillId, input))
})
