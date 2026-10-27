import { apiAuthHandler, readJsonBody } from '@/server/routes/api'
import { getJsonResponse } from '@/server/utils/response'
import { markNotificationsRead } from '@/server/actions/notifications'
import { MarkNotificationsReadSchema } from '@/@types/notifications/Notification'

export const POST = apiAuthHandler(null, async (req, _ctx, user) => {
    const input = MarkNotificationsReadSchema.parse(await readJsonBody(req))
    return getJsonResponse(await markNotificationsRead(user.id, input))
})
