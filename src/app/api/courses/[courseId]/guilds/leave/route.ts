import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { leaveGuild } from '@/server/actions/guilds'

/** Leave the guild, or withdraw a request */
export const POST = apiAuthHandler<{ courseId: string }>('play', async (_req, ctx, user) =>
    getJsonResponse(await leaveGuild(user, readId((await ctx.params).courseId, 'course'))),
)
