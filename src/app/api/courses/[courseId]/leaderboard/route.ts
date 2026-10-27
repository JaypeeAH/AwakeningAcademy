import { apiAuthHandler, readId } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getCourseLeaderboard } from '@/server/actions/leaderboards'

/** This week's leaderboard (only XP; names or initials as the teacher set; off by default) */
export const GET = apiAuthHandler<{ courseId: string }>(null, async (_req, ctx, user) =>
    getJsonResponse(await getCourseLeaderboard(user, readId((await ctx.params).courseId, 'course'))),
)
