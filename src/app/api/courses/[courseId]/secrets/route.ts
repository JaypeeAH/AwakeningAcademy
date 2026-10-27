import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { createSecret, getCourseSecrets } from '@/server/actions/secrets'
import { SaveEggSchema } from '@/@types/game/Secrets'

type Params = { courseId: string }

/** The course's Easter eggs (teachers only: students learn about them through their Codex) */
export const GET = apiAuthHandler<Params>('courses.manage', async (_req, ctx, user) =>
    getJsonResponse(await getCourseSecrets(user, readId((await ctx.params).courseId, 'course'))),
)

export const POST = apiAuthHandler<Params>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = SaveEggSchema.parse(await readJsonBody(req))
    return getJsonResponse(await createSecret(user, courseId, input), { status: 201 })
})
