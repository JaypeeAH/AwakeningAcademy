import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getAiStatus } from '@/server/actions/aiDrafts'

/** Whether AI drafting is set up (and how many requests this teacher has left this hour) */
export const GET = apiAuthHandler('courses.manage', async (_req, _ctx, user) =>
    getJsonResponse(await getAiStatus(user)),
)
