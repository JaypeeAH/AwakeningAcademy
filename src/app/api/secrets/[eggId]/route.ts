import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getEmptyResponse, getJsonResponse } from '@/server/utils/response'
import { deleteSecret, updateSecret } from '@/server/actions/secrets'
import { SaveEggSchema } from '@/@types/game/Secrets'

type Params = { eggId: string }

export const PUT = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const eggId = readId((await ctx.params).eggId, 'secret')
    const input = SaveEggSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateSecret(user, eggId, input))
})

export const DELETE = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) => {
    await deleteSecret(user, readId((await ctx.params).eggId, 'secret'))
    return getEmptyResponse()
})
