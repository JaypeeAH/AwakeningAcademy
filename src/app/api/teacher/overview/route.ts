import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getTeacherOverview } from '@/server/actions/reports'

export const GET = apiAuthHandler('results.view', async (_req, _ctx, user) =>
    getJsonResponse(await getTeacherOverview(user)),
)
