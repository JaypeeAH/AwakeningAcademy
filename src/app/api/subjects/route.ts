import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getSubjects } from '@/server/actions/subjects'

export const GET = apiAuthHandler(null, async () => getJsonResponse(await getSubjects()))
