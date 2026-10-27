import { apiAuthHandler, readId, readQuery } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getCourseAnalytics } from '@/server/actions/analytics'
import { AnalyticsFiltersSchema } from '@/@types/reports/Analytics'

/** Learning analytics for the course's teachers: ?moduleId=&studentId=&from=&to= */
export const GET = apiAuthHandler<{ courseId: string }>('results.view', async (req, ctx, user) => {
    const courseId = readId((await ctx.params).courseId, 'course')
    const query = readQuery(req)
    const filters = AnalyticsFiltersSchema.parse({
        moduleId: query.moduleId || null,
        studentId: query.studentId || null,
        from: query.from || null,
        to: query.to || null,
    })
    return getJsonResponse(await getCourseAnalytics(user, courseId, filters))
})
