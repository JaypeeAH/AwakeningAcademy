import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { foundGuild } from '@/server/actions/guilds'
import { SaveGuildSchema } from '@/@types/game/Guilds'

/** A student with Guild Leader founds a guild (the teacher approves it) */
export const POST = apiAuthHandler<{ courseId: string }>('play', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = SaveGuildSchema.parse(await readJsonBody(req))
    return getJsonResponse(await foundGuild(user, courseId, input), { status: 201 })
})
