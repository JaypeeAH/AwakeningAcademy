import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { requestToJoin } from '@/server/actions/guilds'

/** Student: ask to join (the teacher approves) */
export const POST = apiAuthHandler<{ guildId: string }>('play', async (_req, ctx, user) =>
    getJsonResponse(await requestToJoin(user, readId((await ctx.params).guildId, 'guild'))),
)
