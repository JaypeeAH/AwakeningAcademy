import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getInventory } from '@/server/actions/inventory'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) => getJsonResponse(await getInventory(user.id)))
