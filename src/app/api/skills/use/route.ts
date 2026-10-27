import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { useSkill } from '@/server/actions/skills'
import { UseSkillSchema } from '@/@types/game/Inventory'

/** Activates a skill: the server decides its effect and spends one charge (once per action) */
export const POST = apiAuthHandler('play', async (req, _ctx, user) => {
    const input = UseSkillSchema.parse(await readJsonBody(req))
    return getJsonResponse(await useSkill(user, input))
})
