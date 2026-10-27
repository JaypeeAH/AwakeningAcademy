import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { removeSubmissions } from '@/server/data/supabase/storage'
import { recordAudit } from '@/server/actions/audit'
import { ConflictError, NotFoundError, ServiceUnavailableError } from '@/@types/errors'
import type { SessionUser } from '@/@types/auth/SessionUser'

/*
 * Privacy requests: a copy of everything stored about a person (they can download their own; an admin
 * can download anyone's), and deleting an account with everything that belongs to it. Shared course
 * content they created stays, with the creator cleared.
 */

/** Tables holding a person's own records, by the column that points at them */
const PERSONAL_TABLES = [
    ['student_progress', 'student_id'],
    ['student_subject_progress', 'student_id'],
    ['xp_ledger', 'student_id'],
    ['level_events', 'student_id'],
    ['rank_history', 'student_id'],
    ['course_enrollments', 'student_id'],
    ['activity_completions', 'student_id'],
    ['attempts', 'student_id'],
    ['attempt_files', 'student_id'],
    ['attempt_allowances', 'student_id'],
    ['learning_days', 'student_id'],
    ['inventory_items', 'student_id'],
    ['inventory_transactions', 'student_id'],
    ['student_skills', 'student_id'],
    ['skill_usages', 'student_id'],
    ['egg_discoveries', 'student_id'],
    ['student_achievements', 'student_id'],
    ['guild_members', 'student_id'],
    ['notifications', 'user_id'],
] as const

export interface PersonalDataExport {
    exportedAt: string
    note: string
    profile: Record<string, unknown>
    records: Record<string, unknown[]>
}

export async function exportPersonalData(userId: string): Promise<PersonalDataExport> {
    const db = supabaseAdmin()
    const profile = unwrapMaybe(
        await db
            .from('profiles')
            .select('id, email, display_name, role, leaderboard_hidden, created_at')
            .eq('id', userId)
            .maybeSingle(),
        'load the profile',
    )
    if (!profile) throw new NotFoundError('That account doesn’t exist.', 'USER_NOT_FOUND')

    const records: Record<string, unknown[]> = {}
    for (const [table, column] of PERSONAL_TABLES) {
        records[table] = unwrap(
            await db
                .from(table)
                .select('*')
                .eq(column as never, userId)
                .limit(10000),
            `load ${table}`,
        )
    }
    const attemptIds = (records.attempts as { id: string }[]).map((a) => a.id)
    records.attempt_responses = attemptIds.length
        ? unwrap(await db.from('attempt_responses').select('*').in('attempt_id', attemptIds), 'load answers')
        : []
    // Teachers: their AI drafting log
    records.ai_draft_requests = unwrap(
        await db.from('ai_draft_requests').select('*').eq('teacher_id', userId),
        'load AI requests',
    )
    return {
        exportedAt: new Date().toISOString(),
        note: 'Everything The Awakening Academy stores about this account. Uploaded homework files are listed in attempt_files; download them from the app.',
        profile,
        records,
    }
}

/** Admin: export someone's data (audited) */
export async function exportUserData(admin: SessionUser, userId: string) {
    const data = await exportPersonalData(userId)
    await recordAudit(admin.id, 'user.exported', 'user', userId, {})
    return data
}

/**
 * Admin: delete an account and everything personal to it (progress, work, uploads, rewards). Courses
 * and activities a teacher created stay, without a creator. Can't be undone.
 */
export async function deleteUserAccount(admin: SessionUser, userId: string) {
    if (admin.id === userId) throw new ConflictError('You can’t delete your own account here.', 'CANNOT_DELETE_SELF')
    const db = supabaseAdmin()
    const profile = unwrapMaybe(
        await db.from('profiles').select('id, role').eq('id', userId).maybeSingle(),
        'load the profile',
    )
    if (!profile) throw new NotFoundError('That account doesn’t exist.', 'USER_NOT_FOUND')

    // Uploaded homework lives in storage, outside the database cascade
    const files = unwrap(await db.from('attempt_files').select('storage_path').eq('student_id', userId), 'list uploads')
    await removeSubmissions(files.map((f) => f.storage_path))

    const { error } = await db.auth.admin.deleteUser(userId)
    if (error) {
        console.error('[privacy] delete user', error)
        throw new ServiceUnavailableError(
            'The account couldn’t be deleted right now. Please try again.',
            'DELETE_FAILED',
        )
    }
    await recordAudit(admin.id, 'user.deleted', 'user', userId, { role: profile.role })
}
