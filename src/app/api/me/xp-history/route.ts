import { z } from 'zod'
import { apiAuthHandler, readQuery } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getXpHistory } from '@/server/actions/progression'

const QuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) })

export const GET = apiAuthHandler('play', async (req, _ctx, user) => {
    const { page } = QuerySchema.parse(readQuery(req))
    return getJsonResponse(await getXpHistory(user.id, page))
})
