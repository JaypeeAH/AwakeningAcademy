import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { manageGuildMember } from '@/server/actions/guilds'
import { GuildMemberActionSchema } from '@/@types/game/Guilds'

/** Teacher: add, approve, reject, remove or make leader */
export const POST = apiAuthHandler<{ guildId: string }>('courses.manage', async (req, ctx, user) => {
    const guildId = readId((await ctx.params).guildId, 'guild')
    const input = GuildMemberActionSchema.parse(await readJsonBody(req))
    return getJsonResponse(await manageGuildMember(user, guildId, input))
})
