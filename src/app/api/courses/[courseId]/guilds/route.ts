import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createGuild, getCourseGuilds } from '@/server/actions/guilds'
import { SaveGuildSchema } from '@/@types/game/Guilds'

type Params = { courseId: string }

/** The course's guilds (teachers: everything incl. requests; students: active guilds and their own) */
export const GET = apiAuthHandler<Params>(null, async (_req, ctx, user) =>
    getJsonResponse(await getCourseGuilds(user, readId((await ctx.params).courseId, 'course'))),
)

export const POST = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = SaveGuildSchema.parse(await readJsonBody(req))
    return getJsonResponse(await createGuild(user, courseId, input), { status: 201 })
})
