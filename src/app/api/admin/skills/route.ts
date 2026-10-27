import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getSkillDefinitions } from '@/server/actions/skills'

export const GET = apiAuthHandler('progression.manage', async () => getJsonResponse(await getSkillDefinitions()))
