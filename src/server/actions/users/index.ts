import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { getStudentClass } from '@/server/actions/subjects'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Collection } from '@/@types/common'
import type {
    CreateAccountsInput,
    CreateAccountsResult,
    SetRoleInput,
    UpdateLoginInput,
    UpdateProfileInput,
    UserAccount,
    UsersQuery,
} from '@/@types/users/UserAccount'
import type { PlayerClass, SubjectPath } from '@/@types/subjects/Subject'
import { USERS_PAGE_SIZE } from '@/constants/app.constant'
import { isPlaceholderEmail, placeholderEmail } from '@/utils/accounts'

export async function getUsers({ q, role, page }: UsersQuery): Promise<Collection<UserAccount>> {
    let query = supabaseAdmin()
        .from('profiles')
        .select(
            'id, email, username, display_name, role, created_at, progress:student_progress(total_xp, level, rank:ranks(code))',
            { count: 'exact' },
        )
        .order('display_name')
        .range((page - 1) * USERS_PAGE_SIZE, page * USERS_PAGE_SIZE - 1)
    if (role) query = query.eq('role', role)
    if (q) {
        // Escape PostgREST filter syntax characters before building the or() filter
        const term = q.replace(/[%_,()\\]/g, ' ').trim()
        if (term) query = query.or(`display_name.ilike.%${term}%,email.ilike.%${term}%,username.ilike.%${term}%`)
    }
    const result = await query
    return {
        total: result.count ?? 0,
        records: unwrap(result, 'load users').map((row) => {
            const progress = Array.isArray(row.progress) ? row.progress[0] : row.progress
            return {
                id: row.id,
                email: row.email,
                username: row.username,
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

// ── Usernames and username-only accounts ──────────────────────────────────────────────────────────

const USERNAME_TAKEN = 'That username is already taken.'

/** Supabase Auth admin errors → a short reason for the person adding accounts */
function accountErrorReason(error: { code?: string; message: string }) {
    if (error.code === 'email_exists' || error.code === 'user_already_exists') return USERNAME_TAKEN
    if (error.code === 'weak_password') return 'That password is too easy to guess.'
    console.error('[users] create account', error.code ?? error.message)
    return 'Couldn’t create this account. Try again.'
}

/**
 * Administrators: student accounts that sign in with a username and password (no email), for classes
 * whose students don't have school email addresses. Each gets a placeholder address (Supabase Auth
 * signs in by email) and is confirmed straight away, so no email is ever sent. Optionally enrols them in
 * a course. Accounts whose username is taken are skipped and reported; the rest are still created.
 */
export async function createUsernameAccounts(
    admin: SessionUser,
    { accounts, courseId }: CreateAccountsInput,
): Promise<CreateAccountsResult> {
    const db = supabaseAdmin()
    let course: { id: string; title: string } | null = null
    if (courseId) {
        course = unwrapMaybe(
            await db.from('courses').select('id, title').eq('id', courseId).maybeSingle(),
            'find the course',
        )
        if (!course) throw new NotFoundError('That course doesn’t exist.', 'COURSE_NOT_FOUND')
    }

    const existing = unwrap(
        await db
            .from('profiles')
            .select('username')
            .in(
                'username',
                accounts.map((a) => a.username),
            ),
        'check the usernames',
    )
    const taken = new Set(existing.map((p) => p.username))

    const result: CreateAccountsResult = { created: [], skipped: [], courseTitle: course?.title ?? null }
    const createdIds: string[] = []
    for (const { username, displayName, password } of accounts) {
        if (taken.has(username)) {
            result.skipped.push({ username, displayName, reason: USERNAME_TAKEN })
            continue
        }
        taken.add(username) // a repeat further down the list is skipped too
        const { data, error } = await db.auth.admin.createUser({
            email: placeholderEmail(username),
            password,
            email_confirm: true,
            user_metadata: { display_name: displayName },
        })
        if (error || !data.user) {
            result.skipped.push({ username, displayName, reason: error ? accountErrorReason(error) : 'Not created.' })
            continue
        }
        // handle_new_user made the profile; the username is written here, by the server
        const named = await db.from('profiles').update({ username }).eq('id', data.user.id)
        if (named.error) {
            await db.auth.admin.deleteUser(data.user.id)
            result.skipped.push({
                username,
                displayName,
                reason: named.error.code === '23505' ? USERNAME_TAKEN : 'Couldn’t save the username.',
            })
            continue
        }
        createdIds.push(data.user.id)
        result.created.push({ username, displayName })
    }

    if (course && createdIds.length) {
        const courseId = course.id
        check(
            await db.from('course_enrollments').upsert(
                createdIds.map((studentId) => ({ course_id: courseId, student_id: studentId })),
                { onConflict: 'course_id,student_id', ignoreDuplicates: true },
            ),
            'add the students to the course',
        )
    }
    if (createdIds.length) {
        await recordAudit(admin.id, 'user.accounts_created', 'user', null, {
            count: createdIds.length,
            courseId: course?.id ?? null,
        })
    }
    return result
}

/**
 * Administrators: set or clear an account's username, or give it a new password (username-only accounts
 * have no inbox for a reset link). A username-only account always keeps a username, and its placeholder
 * address follows the username so the old one is free for someone else.
 */
export async function updateUserLogin(admin: SessionUser, userId: string, input: UpdateLoginInput) {
    const db = supabaseAdmin()
    const profile = unwrapMaybe(
        await db.from('profiles').select('id, email, username, display_name').eq('id', userId).maybeSingle(),
        'find the user',
    )
    if (!profile) throw new NotFoundError('That user doesn’t exist.', 'USER_NOT_FOUND')
    const usernameOnly = isPlaceholderEmail(profile.email)

    const changeUsername = input.username !== undefined && input.username !== profile.username
    if (changeUsername) {
        const username = input.username ?? null
        if (!username && usernameOnly) {
            throw new DataError('This account has no email, so it needs a username to sign in.', 'USERNAME_REQUIRED')
        }
        if (username) {
            const owner = unwrapMaybe(
                await db.from('profiles').select('id').eq('username', username).maybeSingle(),
                'check the username',
            )
            if (owner && owner.id !== userId) throw new ConflictError(USERNAME_TAKEN, 'USERNAME_TAKEN')
        }
        const update: { username: string | null; email?: string } = { username }
        if (usernameOnly && username) {
            update.email = placeholderEmail(username)
            const { error } = await db.auth.admin.updateUserById(userId, { email: update.email, email_confirm: true })
            if (error) throw new ConflictError(accountErrorReason(error), 'USERNAME_TAKEN')
        }
        const saved = await db.from('profiles').update(update).eq('id', userId)
        if (saved.error?.code === '23505') throw new ConflictError(USERNAME_TAKEN, 'USERNAME_TAKEN')
        check(saved, 'save the username')
    }

    if (input.password) {
        const { error } = await db.auth.admin.updateUserById(userId, { password: input.password })
        if (error) {
            throw error.code === 'weak_password'
                ? new DataError('That password is too easy to guess. Try a longer one.', 'WEAK_PASSWORD')
                : new DataError('Couldn’t set the password. Try again.', 'PASSWORD_NOT_SET')
        }
    }

    await recordAudit(admin.id, 'user.login_updated', 'user', userId, {
        name: profile.display_name,
        ...(changeUsername ? { username: input.username ?? null } : {}),
        passwordSet: !!input.password,
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
