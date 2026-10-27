import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getGradingQueue } from '@/server/actions/grading'

export const GET = apiAuthHandler('results.view', async (_req, _ctx, user) =>
    getJsonResponse(await getGradingQueue(user)),
)
