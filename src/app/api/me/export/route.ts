import { NextResponse } from 'next/server'
import { apiAuthHandler } from '@/server/routes/api'
import { exportPersonalData } from '@/server/actions/privacy'
import { enforceRateLimit } from '@/server/security/rateLimit'

const download = (data: unknown, name: string) =>
    new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${name}"`,
            'Cache-Control': 'no-store',
        },
    })

/** Everything stored about the signed-in person, as a JSON download */
export const GET = apiAuthHandler(null, async (_req, _ctx, user) => {
    await enforceRateLimit('exportPerUser', user.id)
    return download(await exportPersonalData(user.id), 'my-awakening-academy-data.json')
})
