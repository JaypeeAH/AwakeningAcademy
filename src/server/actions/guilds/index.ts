import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { isCourseTeacher, isEnrolled, requireCourseAccess, requireCourseTeacher } from '@/server/actions/courses/access'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import {
    GUILD_EMBLEMS,
    type CourseGuilds,
    type CourseSocialSettingsInput,
    type Guild,
    type GuildEmblem,
    type GuildMemberActionInput,
    type SaveGuildInput,
} from '@/@types/game/Guilds'
import type { Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'

/*
 * Guilds: small teams inside a course. Teachers form them and manage members; students may ask to join
 * an open guild (the teacher approves), and — where the course allows it — students who've unlocked
 * Guild Leader may found one (also approved by the teacher). One guild per student per course.
 */

type GuildRow = Tables<'guilds'>
type MemberRow = Tables<'guild_members'> & { profile: { display_name: string } | null }

const emblemOf = (value: string): GuildEmblem =>
    (GUILD_EMBLEMS as readonly string[]).includes(value) ? (value as GuildEmblem) : 'shield'

const mapGuild = (row: GuildRow, members: MemberRow[], includePending: boolean): Guild => {
    const mine = members.filter((m) => m.guild_id === row.id)
    const active = mine.filter((m) => m.status === 'active')
    return {
        id: row.id,
        courseId: row.course_id,
        name: row.name,
        motto: row.motto,
        emblem: emblemOf(row.emblem),
        open: row.open,
        status: row.status === 'pending' ? 'pending' : 'active',
        maxMembers: row.max_members,
        memberCount: active.length,
        members: (includePending ? mine : active)
            .map((m) => ({
                studentId: m.student_id,
                displayName: m.profile?.display_name ?? 'Student',
                role: m.role === 'leader' ? ('leader' as const) : ('member' as const),
                status: m.status === 'pending' ? ('pending' as const) : ('active' as const),
                joinedAt: new Date(m.joined_at),
            }))
            .sort((a, b) =>
                a.role === b.role ? a.displayName.localeCompare(b.displayName) : a.role === 'leader' ? -1 : 1,
            ),
    }
}

async function loadGuildRows(courseId: string) {
    const db = supabaseAdmin()
    const [guilds, members] = await Promise.all([
        db.from('guilds').select('*').eq('course_id', courseId).order('name'),
        db
            .from('guild_members')
            .select('*, profile:profiles!guild_members_student_id_fkey(display_name)')
            .eq('course_id', courseId),
    ])
    return {
        guilds: unwrap(guilds, 'load guilds'),
        members: unwrap(members, 'load guild members') as unknown as MemberRow[],
    }
}

async function hasGuildLeaderSkill(studentId: string) {
    const { data } = await supabaseAdmin()
        .from('student_skills')
        .select('skill_id, skill:skill_definitions!inner(code, enabled)')
        .eq('student_id', studentId)
        .eq('skill.code', 'guild_leader')
        .eq('skill.enabled', true)
        .maybeSingle()
    return !!data
}

export async function getCourseGuilds(user: SessionUser, courseId: string): Promise<CourseGuilds> {
    const { course, canManage } = await requireCourseAccess(user, courseId)
    const { guilds, members } = await loadGuildRows(courseId)
    if (canManage) {
        return {
            guilds: guilds.map((g) => mapGuild(g, members, true)),
            myGuildId: null,
            myStatus: null,
            canFound: false,
            studentGuilds: course.student_guilds,
        }
    }
    const mine = members.find((m) => m.student_id === user.id) ?? null
    const myGuildId = mine?.guild_id ?? null
    return {
        // Students see active guilds, plus a pending one they founded
        guilds: guilds
            .filter((g) => g.status === 'active' || g.id === myGuildId)
            .map((g) => mapGuild(g, members, false)),
        myGuildId,
        myStatus: mine ? (mine.status === 'pending' ? 'pending' : 'active') : null,
        canFound: course.student_guilds && !mine && (await hasGuildLeaderSkill(user.id)),
        studentGuilds: course.student_guilds,
    }
}

async function requireGuild(guildId: string) {
    const guild = unwrapMaybe(
        await supabaseAdmin().from('guilds').select('*').eq('id', guildId).maybeSingle(),
        'load the guild',
    )
    if (!guild) throw new NotFoundError('That guild doesn’t exist.', 'GUILD_NOT_FOUND')
    return guild
}

const duplicateName = () => new ConflictError('A guild in this course already has that name.', 'DUPLICATE_GUILD')

async function activeCount(guildId: string) {
    const { count } = await supabaseAdmin()
        .from('guild_members')
        .select('student_id', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('status', 'active')
    return count ?? 0
}

// ── Teachers ──────────────────────────────────────────────────────────────────────────────────────

export async function createGuild(user: SessionUser, courseId: string, input: SaveGuildInput) {
    await requireCourseTeacher(user, courseId)
    const result = await supabaseAdmin()
        .from('guilds')
        .insert({ course_id: courseId, ...toGuildRow(input), created_by: user.id })
        .select('id')
        .single()
    if (result.error?.code === '23505') throw duplicateName()
    const row = unwrap(result, 'create the guild')
    await recordAudit(user.id, 'guild.created', 'guild', row.id, { courseId, name: input.name })
    return getCourseGuilds(user, courseId)
}

const toGuildRow = (input: SaveGuildInput) => ({
    name: input.name,
    motto: input.motto,
    emblem: input.emblem,
    open: input.open,
    max_members: input.maxMembers,
})

export async function updateGuild(user: SessionUser, guildId: string, input: SaveGuildInput) {
    const guild = await requireGuild(guildId)
    await requireCourseTeacher(user, guild.course_id)
    if (input.maxMembers < (await activeCount(guildId))) {
        throw new DataError('The guild already has more members than that.', 'GUILD_TOO_SMALL')
    }
    const result = await supabaseAdmin().from('guilds').update(toGuildRow(input)).eq('id', guildId)
    if (result.error?.code === '23505') throw duplicateName()
    check(result, 'update the guild')
    return getCourseGuilds(user, guild.course_id)
}

/** Approves a guild a student founded */
export async function approveGuild(user: SessionUser, guildId: string) {
    const guild = await requireGuild(guildId)
    await requireCourseTeacher(user, guild.course_id)
    check(await supabaseAdmin().from('guilds').update({ status: 'active' }).eq('id', guildId), 'approve the guild')
    await recordAudit(user.id, 'guild.approved', 'guild', guildId, { name: guild.name })
    return getCourseGuilds(user, guild.course_id)
}

export async function deleteGuild(user: SessionUser, guildId: string) {
    const guild = await requireGuild(guildId)
    await requireCourseTeacher(user, guild.course_id)
    check(await supabaseAdmin().from('guilds').delete().eq('id', guildId), 'delete the guild')
    await recordAudit(user.id, 'guild.deleted', 'guild', guildId, { name: guild.name })
    return getCourseGuilds(user, guild.course_id)
}

export async function manageGuildMember(user: SessionUser, guildId: string, input: GuildMemberActionInput) {
    const guild = await requireGuild(guildId)
    await requireCourseTeacher(user, guild.course_id)
    const db = supabaseAdmin()
    const member = unwrapMaybe(
        await db
            .from('guild_members')
            .select('*')
            .eq('guild_id', guildId)
            .eq('student_id', input.studentId)
            .maybeSingle(),
        'load the member',
    )

    switch (input.action) {
        case 'add': {
            if (!(await isEnrolled(input.studentId, guild.course_id))) {
                throw new DataError('That student isn’t enrolled in this course.', 'NOT_ENROLLED')
            }
            if ((await activeCount(guildId)) >= guild.max_members)
                throw new ConflictError('The guild is full.', 'GUILD_FULL')
            const result = await db
                .from('guild_members')
                .insert({ guild_id: guildId, course_id: guild.course_id, student_id: input.studentId })
            if (result.error?.code === '23505') {
                throw new ConflictError(
                    'That student is already in a guild (or has asked to join one) in this course.',
                    'ALREADY_IN_GUILD',
                )
            }
            check(result, 'add the student')
            break
        }
        case 'approve': {
            if (member?.status !== 'pending')
                throw new NotFoundError('There’s no request from that student.', 'NO_REQUEST')
            if ((await activeCount(guildId)) >= guild.max_members)
                throw new ConflictError('The guild is full.', 'GUILD_FULL')
            check(
                await db
                    .from('guild_members')
                    .update({ status: 'active', joined_at: new Date().toISOString() })
                    .eq('guild_id', guildId)
                    .eq('student_id', input.studentId),
                'approve the request',
            )
            await notify(input.studentId, `You joined ${guild.name}`, 'Your teacher approved your request.', guild)
            break
        }
        case 'reject':
        case 'remove': {
            if (!member) throw new NotFoundError('That student isn’t in this guild.', 'NOT_A_MEMBER')
            check(
                await db.from('guild_members').delete().eq('guild_id', guildId).eq('student_id', input.studentId),
                'remove the student',
            )
            break
        }
        case 'make_leader': {
            if (member?.status !== 'active')
                throw new NotFoundError('That student isn’t in this guild.', 'NOT_A_MEMBER')
            check(
                await db.from('guild_members').update({ role: 'member' }).eq('guild_id', guildId),
                'change the leader',
            )
            check(
                await db
                    .from('guild_members')
                    .update({ role: 'leader' })
                    .eq('guild_id', guildId)
                    .eq('student_id', input.studentId),
                'change the leader',
            )
            break
        }
    }
    await recordAudit(user.id, `guild.member.${input.action}`, 'guild', guildId, { studentId: input.studentId })
    return getCourseGuilds(user, guild.course_id)
}

async function notify(userId: string, title: string, body: string, guild: GuildRow) {
    await supabaseAdmin()
        .from('notifications')
        .insert({ user_id: userId, kind: 'guild', title, body, data: { guildId: guild.id, courseId: guild.course_id } })
}

export async function updateCourseSocial(user: SessionUser, courseId: string, input: CourseSocialSettingsInput) {
    await requireCourseTeacher(user, courseId)
    check(
        await supabaseAdmin()
            .from('courses')
            .update({ leaderboard_mode: input.leaderboardMode, student_guilds: input.studentGuilds })
            .eq('id', courseId),
        'save the course settings',
    )
    await recordAudit(user.id, 'course.social_updated', 'course', courseId, { ...input })
    return getCourseGuilds(user, courseId)
}

// ── Students ──────────────────────────────────────────────────────────────────────────────────────

async function requireStudentInCourse(user: SessionUser, courseId: string) {
    const { canManage } = await requireCourseAccess(user, courseId)
    if (canManage) throw new ConflictError('Guilds are for students in the course.', 'NOT_A_STUDENT')
}

/** Asks to join an open guild; the teacher approves */
export async function requestToJoin(user: SessionUser, guildId: string) {
    const guild = await requireGuild(guildId)
    await requireStudentInCourse(user, guild.course_id)
    if (guild.status !== 'active' || !guild.open) {
        throw new ConflictError('This guild isn’t taking requests. Ask your teacher.', 'GUILD_CLOSED')
    }
    if ((await activeCount(guildId)) >= guild.max_members) throw new ConflictError('The guild is full.', 'GUILD_FULL')
    const result = await supabaseAdmin()
        .from('guild_members')
        .insert({ guild_id: guildId, course_id: guild.course_id, student_id: user.id, status: 'pending' })
    if (result.error?.code === '23505') {
        throw new ConflictError(
            'You’re already in a guild (or waiting to join one) in this course.',
            'ALREADY_IN_GUILD',
        )
    }
    check(result, 'ask to join')
    return getCourseGuilds(user, guild.course_id)
}

/** Leaves the guild, or withdraws a request (founders of a pending guild withdraw it entirely) */
export async function leaveGuild(user: SessionUser, courseId: string) {
    await requireStudentInCourse(user, courseId)
    const db = supabaseAdmin()
    const mine = unwrapMaybe(
        await db
            .from('guild_members')
            .select('guild_id')
            .eq('course_id', courseId)
            .eq('student_id', user.id)
            .maybeSingle(),
        'load your guild',
    )
    if (!mine) throw new NotFoundError('You’re not in a guild in this course.', 'NOT_A_MEMBER')
    const guild = await requireGuild(mine.guild_id)
    if (guild.status === 'pending' && guild.created_by === user.id) {
        check(await db.from('guilds').delete().eq('id', guild.id), 'withdraw the guild')
    } else {
        check(
            await db.from('guild_members').delete().eq('guild_id', guild.id).eq('student_id', user.id),
            'leave the guild',
        )
    }
    return getCourseGuilds(user, courseId)
}

/** A Guild Leader founds a guild (pending until the teacher approves); they lead it */
export async function foundGuild(user: SessionUser, courseId: string, input: SaveGuildInput) {
    await requireStudentInCourse(user, courseId)
    const course = unwrap(
        await supabaseAdmin().from('courses').select('student_guilds').eq('id', courseId).single(),
        'load the course',
    )
    if (!course.student_guilds)
        throw new ConflictError('Your teacher forms the guilds in this course.', 'STUDENT_GUILDS_OFF')
    if (!(await hasGuildLeaderSkill(user.id))) {
        throw new ConflictError('Unlock the Guild Leader skill to found a guild.', 'SKILL_LOCKED')
    }
    const db = supabaseAdmin()
    const already = unwrapMaybe(
        await db
            .from('guild_members')
            .select('guild_id')
            .eq('course_id', courseId)
            .eq('student_id', user.id)
            .maybeSingle(),
        'check your guild',
    )
    if (already) throw new ConflictError('Leave your current guild first.', 'ALREADY_IN_GUILD')
    const created = await db
        .from('guilds')
        .insert({ course_id: courseId, ...toGuildRow(input), status: 'pending', created_by: user.id })
        .select('id')
        .single()
    if (created.error?.code === '23505') throw duplicateName()
    const guild = unwrap(created, 'found the guild')
    check(
        await db
            .from('guild_members')
            .insert({ guild_id: guild.id, course_id: courseId, student_id: user.id, role: 'leader' }),
        'join your guild',
    )
    return getCourseGuilds(user, courseId)
}

/** Whether the user may see a course's guild data (teachers of it, or enrolled students) */
export async function canSeeCourseGuilds(user: SessionUser, courseId: string) {
    return (await isCourseTeacher(user, courseId)) || (await isEnrolled(user.id, courseId))
}
