import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { updateItemDefinition } from '@/server/actions/inventory'
import { ItemDefinitionSchema } from '@/@types/game/Inventory'

export const PUT = apiAuthHandler<{ itemId: string }>('progression.manage', async (req, ctx, user) => {
    const itemId = readId((await ctx.params).itemId, 'item')
    const input = ItemDefinitionSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateItemDefinition(user, itemId, input))
})
