import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { getAttemptForGrading, gradeAttempt } from '@/server/actions/grading'
import { GradeAttemptSchema } from '@/@types/grading/Grading'

type Params = { attemptId: string }

export const GET = apiAuthHandler<Params>('results.view', async (_req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    return getJsonResponse(await getAttemptForGrading(user, attemptId))
})

/** Records the teacher's marks (first grade or re-grade — rewards are never paid twice) */
export const POST = apiAuthHandler<Params>('results.view', async (req, ctx, user) => {
    const attemptId = readId((await ctx.params).attemptId, 'attempt')
    const input = GradeAttemptSchema.parse(await readJsonBody(req))
    return getJsonResponse(await gradeAttempt(user, attemptId, input))
})
