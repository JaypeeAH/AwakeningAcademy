import { NextResponse } from 'next/server'
import { apiAuthHandler, readId } from '@/server/routes/api'
import { getMediaViewUrl } from '@/server/actions/media'

/** A lesson image: the course's teachers and enrolled students are redirected to a short-lived link */
export const GET = apiAuthHandler<{ mediaId: string }>(null, async (_req, ctx, user) => {
    const mediaId = readId((await ctx.params).mediaId, 'image')
    return NextResponse.redirect(await getMediaViewUrl(user, mediaId), {
        status: 302,
        // The signed link lasts an hour; let this browser reuse the redirect for a few minutes
        headers: { 'Cache-Control': 'private, max-age=300' },
    })
})
