import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, unwrap } from '@/server/data/supabase/errors'
import type { AppNotification, MarkNotificationsReadInput, NotificationFeed } from '@/@types/notifications/Notification'

export async function getNotifications(userId: string, limit = 20): Promise<NotificationFeed> {
    const db = supabaseAdmin()
    const [rows, unread] = await Promise.all([
        db
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit),
        db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null),
    ])
    return {
        records: unwrap(rows, 'load notifications').map((row): AppNotification => ({
            id: row.id,
            kind: row.kind,
            title: row.title,
            body: row.body,
            data: (row.data ?? {}) as Record<string, unknown>,
            readAt: row.read_at ? new Date(row.read_at) : null,
            createdAt: new Date(row.created_at),
        })),
        unread: unread.count ?? 0,
    }
}

/** Only ever touches the caller's own notifications */
export async function markNotificationsRead(userId: string, input: MarkNotificationsReadInput) {
    let query = supabaseAdmin()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
    if ('ids' in input) query = query.in('id', input.ids)
    check(await query, 'mark notifications as read')
    return getNotifications(userId)
}
