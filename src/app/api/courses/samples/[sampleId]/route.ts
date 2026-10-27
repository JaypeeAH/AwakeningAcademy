import { apiAuthHandler } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { addSampleCourse } from '@/server/actions/samples'
import { enforceRateLimit } from '@/server/security/rateLimit'

// Building a sample saves and publishes several activities in turn
export const maxDuration = 60

/** Adds a copy of the sample to the teacher's courses (published, with its own join code) */
export const POST = apiAuthHandler<{ sampleId: string }>('courses.manage', async (_req, ctx, user) => {
    await enforceRateLimit('samplesPerUser', user.id)
    return getJsonResponse(await addSampleCourse(user, (await ctx.params).sampleId), { status: 201 })
})
