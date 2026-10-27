import { z } from 'zod'
import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { adjustXp } from '@/server/actions/progression'
import { XpAdjustmentSchema } from '@/@types/progression/ProgressionSchema'

const BodySchema = XpAdjustmentSchema.extend({ requestId: z.string().uuid() })

/** `requestId` (generated when the dialog opens) makes a retried request apply the adjustment once */
export const POST = apiAuthHandler('users.manage', async (req, _ctx, user) => {
    const { requestId, ...input } = BodySchema.parse(await readJsonBody(req))
    return getJsonResponse(await adjustXp(user, input, requestId))
})
