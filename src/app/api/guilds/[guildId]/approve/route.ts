import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { approveGuild } from '@/server/actions/guilds'

/** Approve a guild a student founded */
export const POST = apiAuthHandler<{ guildId: string }>('courses.manage', async (_req, ctx, user) =>
    getJsonResponse(await approveGuild(user, readId((await ctx.params).guildId, 'guild'))),
)
