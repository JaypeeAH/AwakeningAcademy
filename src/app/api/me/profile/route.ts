import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getPlayerProfile, updateProfile } from '@/server/actions/users'
import { UpdateProfileSchema } from '@/@types/users/UserAccount'

export const GET = apiAuthHandler(null, async (_req, _ctx, user) => getJsonResponse(await getPlayerProfile(user)))

export const PATCH = apiAuthHandler(null, async (req, _ctx, user) => {
    const input = UpdateProfileSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateProfile(user, input))
})
