import { NextResponse } from 'next/server'
import { apiAuthHandler, readId } from '@/server/routes/api'
import { exportUserData } from '@/server/actions/privacy'

const download = (data: unknown, name: string) =>
    new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${name}"`,
            'Cache-Control': 'no-store',
        },
    })

/** Admin: everything stored about an account, as a JSON download (audited) */
export const GET = apiAuthHandler<{ userId: string }>('users.manage', async (_req, ctx, user) => {
    const userId = readId((await ctx.params).userId, 'user')
    return download(await exportUserData(user, userId), `account-${userId}.json`)
})
