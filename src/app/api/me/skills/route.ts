import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getSkillBook } from '@/server/actions/skills'

export const GET = apiAuthHandler('play', async (_req, _ctx, user) => getJsonResponse(await getSkillBook(user.id)))
