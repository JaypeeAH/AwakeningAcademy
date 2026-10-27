import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createItemDefinition, getItemDefinitions } from '@/server/actions/inventory'
import { ItemDefinitionSchema } from '@/@types/game/Inventory'

/** The item catalogue (teachers use it for Easter egg rewards and item sets) */
export const GET = apiAuthHandler(null, async () => getJsonResponse(await getItemDefinitions()))

export const POST = apiAuthHandler('progression.manage', async (req, _ctx, user) => {
    const input = ItemDefinitionSchema.parse(await readJsonBody(req))
    return getJsonResponse(await createItemDefinition(user, input), { status: 201 })
})
