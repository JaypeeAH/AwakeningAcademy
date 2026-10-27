import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getCodex } from '@/server/actions/secrets'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) => getJsonResponse(await getCodex(user)))
