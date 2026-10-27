import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { deleteGuild, updateGuild } from '@/server/actions/guilds'
import { SaveGuildSchema } from '@/@types/game/Guilds'

type Params = { guildId: string }

export const PUT = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const guildId = readId((await ctx.params).guildId, 'guild')
    const input = SaveGuildSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateGuild(user, guildId, input))
})

export const DELETE = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) =>
    getJsonResponse(await deleteGuild(user, readId((await ctx.params).guildId, 'guild'))),
)
