import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { updateCourseSocial } from '@/server/actions/guilds'
import { CourseSocialSettingsSchema } from '@/@types/game/Guilds'

/** Leaderboard visibility and whether students may found guilds */
export const PUT = apiAuthHandler<{ courseId: string }>('courses.manage', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const input = CourseSocialSettingsSchema.parse(await readJsonBody(req))
    return getJsonResponse(await updateCourseSocial(user, courseId, input))
})
