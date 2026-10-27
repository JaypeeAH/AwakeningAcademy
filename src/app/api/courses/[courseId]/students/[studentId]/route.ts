import { apiAuthHandler, readId } from '@/server/routes/api'
import { getEmptyResponse } from '@/server/utils/response'
import { removeStudent } from '@/server/actions/courses'

export const DELETE = apiAuthHandler<{ courseId: string; studentId: string }>(
    'courses.manage',
    async (_req, ctx, user) => {
        const params = await ctx.params
        await removeStudent(user, readId(params.courseId, 'course'), readId(params.studentId, 'student'))
        return getEmptyResponse()
    },
)
