import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { getStudentClass } from '@/server/actions/subjects'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Collection } from '@/@types/common'
import type { SetRoleInput, UpdateProfileInput, UserAccount, UsersQuery } from '@/@types/users/UserAccount'
import type { PlayerClass, SubjectPath } from '@/@types/subjects/Subject'
import { USERS_PAGE_SIZE } from '@/constants/app.constant'

export async function getUsers({ q, role, page }: UsersQuery): Promise<Collection<UserAccount>> {
    let query = supabaseAdmin()
        .from('profiles')
        .select(
            'id, email, display_name, role, created_at, progress:student_progress(total_xp, level, rank:ranks(code))',
            { count: 'exact' },
        )
        .order('display_name')
        .range((page - 1) * USERS_PAGE_SIZE, page * USERS_PAGE_SIZE - 1)
    if (role) query = query.eq('role', role)
    if (q) {
        // Escape PostgREST filter syntax characters before building the or() filter
        const term = q.replace(/[%_,()\\]/g, ' ').trim()
        if (term) query = query.or(`display_name.ilike.%${term}%,email.ilike.%${term}%`)
    }
    const result = await query
    return {
        total: result.count ?? 0,
        records: unwrap(result, 'load users').map((row) => {
            const progress = Array.isArray(row.progress) ? row.progress[0] : row.progress
            return {
                id: row.id,
                email: row.email,
                displayName: row.display_name,
                role: row.role,
                createdAt: new Date(row.created_at),
                level: row.role === 'student' ? (progress?.level ?? 1) : null,
                rankCode: row.role === 'student' ? (progress?.rank?.code ?? 'F') : null,
                totalXp: row.role === 'student' ? Number(progress?.total_xp ?? 0) : null,
            }
        }),
    }
}

/** Administrators assign roles. You can't change your own role (so an admin can't lock everyone out). */
export async function setUserRole(admin: SessionUser, userId: string, { role }: SetRoleInput) {
    if (userId === admin.id)
        throw new ConflictError('You can’t change your own role. Ask another administrator.', 'OWN_ROLE')
    const db = supabaseAdmin()
    const profile = unwrapMaybe(
        await db.from('profiles').select('id, role, display_name').eq('id', userId).maybeSingle(),
        'find the user',
    )
    if (!profile) throw new NotFoundError('That user doesn’t exist.', 'USER_NOT_FOUND')
    if (profile.role === role) return
    check(await db.from('profiles').update({ role }).eq('id', userId), 'change the role')
    await recordAudit(admin.id, 'user.role_changed', 'user', userId, {
        name: profile.display_name,
        from: profile.role,
        to: role,
    })
}

// ── The signed-in user's own profile ──────────────────────────────────────────────────────────────

export interface PlayerProfile {
    displayName: string
    email: string
    playerClass: PlayerClass
    paths: SubjectPath[]
    /** Kept off every leaderboard */
    leaderboardHidden: boolean
}

export async function getPlayerProfile(user: SessionUser): Promise<PlayerProfile> {
    const profile = unwrap(
        await supabaseAdmin()
            .from('profiles')
            .select('display_name, email, equipped_title_id, leaderboard_hidden')
            .eq('id', user.id)
            .single(),
        'load your profile',
    )
    const { playerClass, paths } = await getStudentClass(user.id, profile.equipped_title_id)
    return {
        displayName: profile.display_name,
        email: profile.email,
        playerClass,
        paths,
        leaderboardHidden: profile.leaderboard_hidden,
    }
}

/** Display name and equipped class title. A title can only be equipped once it's unlocked. */
export async function updateProfile(user: SessionUser, input: UpdateProfileInput): Promise<PlayerProfile> {
    const update: { display_name?: string; equipped_title_id?: string | null; leaderboard_hidden?: boolean } = {}
    if (input.displayName !== undefined) update.display_name = input.displayName
    if (input.leaderboardHidden !== undefined) update.leaderboard_hidden = input.leaderboardHidden
    if (input.equippedTitleId !== undefined) {
        if (input.equippedTitleId !== null) {
            const { playerClass } = await getStudentClass(user.id, null)
            if (!playerClass.unlocked.some((t) => t.id === input.equippedTitleId)) {
                throw new DataError('You haven’t unlocked that title yet.', 'TITLE_LOCKED')
            }
        }
        update.equipped_title_id = input.equippedTitleId
    }
    if (Object.keys(update).length)
        check(await supabaseAdmin().from('profiles').update(update).eq('id', user.id), 'update your profile')
    return getPlayerProfile(user)
}
