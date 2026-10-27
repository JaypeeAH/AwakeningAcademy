import { apiAuthHandler, readId, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { draftQuestions } from '@/server/actions/aiDrafts'
import { DraftQuestionsSchema } from '@/@types/ai/QuestionDrafts'

/** AI-drafted questions for the Quest Builder (returned unsaved, flagged for the teacher's review) */
export const POST = apiAuthHandler<{ activityId: string }>('courses.manage', async (req, ctx, user) => {
    const activityId = readId((await ctx.params).activityId, 'activity')
    const input = DraftQuestionsSchema.parse(await readJsonBody(req))
    return getJsonResponse(await draftQuestions(user, activityId, input))
})
