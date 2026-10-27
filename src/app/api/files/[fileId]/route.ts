import { NextResponse } from 'next/server'
import { apiAuthHandler, readId } from '@/server/routes/api'
import { getFileDownloadUrl } from '@/server/actions/attempts'

/** Opens an uploaded homework file (the student who uploaded it, or a teacher of the course) */
export const GET = apiAuthHandler<{ fileId: string }>(null, async (_req, ctx, user) => {
    const fileId = readId((await ctx.params).fileId, 'file')
    return NextResponse.redirect(await getFileDownloadUrl(user, fileId), {
        status: 302,
        headers: { 'Cache-Control': 'no-store' },
    })
})
