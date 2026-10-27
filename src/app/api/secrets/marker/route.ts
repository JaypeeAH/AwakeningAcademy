import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { enforceRateLimit } from '@/server/security/rateLimit'
import { getJsonResponse } from '@/server/utils/response'
import { claimMarker } from '@/server/actions/secrets'
import { ClaimMarkerSchema } from '@/@types/game/Secrets'

/** A hidden object was clicked, or a hidden lesson section reached */
export const POST = apiAuthHandler('play', async (req, _ctx, user) => {
    const { key } = ClaimMarkerSchema.parse(await readJsonBody(req))
    await enforceRateLimit('markerPerUser', user.id)
    return getJsonResponse({ discovery: await claimMarker(user, key) })
})
