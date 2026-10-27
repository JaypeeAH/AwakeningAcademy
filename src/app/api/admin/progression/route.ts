import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getProgressionConfig, saveProgressionConfig } from '@/server/actions/progression'
import { SaveProgressionConfigSchema } from '@/@types/progression/ProgressionSchema'

export const GET = apiAuthHandler('progression.manage', async () => getJsonResponse(await getProgressionConfig()))

export const PUT = apiAuthHandler('progression.manage', async (req, _ctx, user) => {
    const input = SaveProgressionConfigSchema.parse(await readJsonBody(req))
    return getJsonResponse(await saveProgressionConfig(user, input))
})
