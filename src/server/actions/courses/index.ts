import 'server-only'
import { randomInt } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { mapSubjectMeta } from '@/server/actions/subjects'
import { findCourse, requireCourseAccess, requireCourseTeacher } from './access'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import { GRADED_KINDS } from '@/@types/activities/ActivityKindOptions'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Course, CourseModule, RosterStudent } from '@/@types/courses/Course'
import type {
    AddStudentInput,
    CreateCourseInput,
    JoinCourseInput,
    ModuleInput,
    UpdateCourseInput,
} from '@/@types/courses/CourseSchema'
import type { Tables } from '@/@types/supabase/database.types'

// No 0/O or 1/I — join codes get read aloud and copied from whiteboards
const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newJoinCode = () =>
    Array.from({ length: 8 }, () => JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)]).join('')

const COURSE_SELECT =
    '*, subject:subjects(id, slug, name, theme), teachers:course_teachers(teacher:profiles(display_name))'

type CourseRow = Tables<'courses'> & {
    subject: Pick<Tables<'subjects'>, 'id' | 'slug' | 'name' | 'theme'> | null
    teachers: { teacher: { display_name: string } | null }[]
}

function mapCourse(row: CourseRow, canManage: boolean, stats: Course['stats']): Course {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        subject: row.subject
            ? mapSubjectMeta(row.subject)
            : { id: row.subject_id, slug: '', name: 'Unknown', theme: 'arcane' },
        status: row.status,
        joinCode: canManage ? row.join_code : null,
        leaderboardMode:
            row.leaderboard_mode === 'initials' || row.leaderboard_mode === 'names' ? row.leaderboard_mode : 'off',
        studentGuilds: row.student_guilds,
        teacherNames: row.teachers.map((t) => t.teacher?.display_name).filter((n): n is string => !!n),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        stats,
        canManage,
    }
}

const mapModule = (row: Tables<'modules'>): CourseModule => ({
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    position: row.position,
})

/** Activity counts per course (all / published) */
async function getActivityCounts(courseIds: string[]) {
    if (!courseIds.length) return new Map<string, { total: number; published: number }>()
    const rows = unwrap(
        await supabaseAdmin()
            .from('activities')
            .select('course_id, status')
            .in('course_id', courseIds)
            .neq('status', 'archived'),
        'count activities',
    )
    const counts = new Map<string, { total: number; published: number }>()
    for (const row of rows) {
        const c = counts.get(row.course_id) ?? { total: 0, published: 0 }
        c.total++
        if (row.status === 'published') c.published++
        counts.set(row.course_id, c)
    }
    return counts
}

/**
 * Courses for the current user: students see the published courses they're enrolled in (with their own
 * completion); teachers see the courses they teach; administrators see every course.
 */
export async function getCoursesForUser(user: SessionUser): Promise<Course[]> {
    const db = supabaseAdmin()

    if (user.role === 'student') {
        const enrollments = unwrap(
            await db.from('course_enrollments').select('course_id').eq('student_id', user.id),
            'load your courses',
        )
        const ids = enrollments.map((e) => e.course_id)
        if (!ids.length) return []
        const rows = unwrap(
            await db.from('courses').select(COURSE_SELECT).in('id', ids).eq('status', 'published').order('title'),
            'load your courses',
        ) as unknown as CourseRow[]
        const [counts, completions] = await Promise.all([
            getActivityCounts(ids),
            db
                .from('activity_completions')
                .select('course_id, activity:activities(status)')
                .eq('student_id', user.id)
                .in('course_id', ids),
        ])
        const done = unwrap(completions, 'load your progress')
        return rows.map((row) =>
            mapCourse(row, false, {
                studentCount: null,
                activityCount: counts.get(row.id)?.published ?? 0,
                publishedCount: counts.get(row.id)?.published ?? 0,
                completedCount: done.filter((c) => c.course_id === row.id && c.activity?.status === 'published').length,
            }),
        )
    }

    let query = db
        .from('courses')
        .select(COURSE_SELECT)
        .neq('status', 'archived')
        .order('updated_at', { ascending: false })
    if (user.role === 'teacher') {
        const taught = unwrap(
            await db.from('course_teachers').select('course_id').eq('teacher_id', user.id),
            'load your courses',
        )
        if (!taught.length) return []
        query = query.in(
            'id',
            taught.map((t) => t.course_id),
        )
    }
    const rows = unwrap(await query, 'load courses') as unknown as CourseRow[]
    const ids = rows.map((r) => r.id)
    const [counts, enrollments] = await Promise.all([
        getActivityCounts(ids),
        ids.length
            ? db.from('course_enrollments').select('course_id').in('course_id', ids)
            : Promise.resolve({ data: [], error: null }),
    ])
    const roster = unwrap(enrollments, 'count students')
    return rows.map((row) =>
        mapCourse(row, true, {
            studentCount: roster.filter((e) => e.course_id === row.id).length,
            activityCount: counts.get(row.id)?.total ?? 0,
            publishedCount: counts.get(row.id)?.published ?? 0,
            completedCount: null,
        }),
    )
}

export async function getCourse(
    user: SessionUser,
    courseId: string,
): Promise<{ course: Course; modules: CourseModule[] }> {
    const { canManage } = await requireCourseAccess(user, courseId)
    const db = supabaseAdmin()
    const [row, modules, counts, roster, completions] = await Promise.all([
        db.from('courses').select(COURSE_SELECT).eq('id', courseId).single(),
        db.from('modules').select('*').eq('course_id', courseId).order('position'),
        getActivityCounts([courseId]),
        canManage
            ? db.from('course_enrollments').select('student_id').eq('course_id', courseId)
            : Promise.resolve({ data: [], error: null }),
        canManage
            ? Promise.resolve({ data: [], error: null })
            : db
                  .from('activity_completions')
                  .select('activity_id, activity:activities(status)')
                  .eq('course_id', courseId)
                  .eq('student_id', user.id),
    ])
    const courseRow = unwrap(row, 'load the course') as unknown as CourseRow
    const count = counts.get(courseId)
    return {
        course: mapCourse(courseRow, canManage, {
            studentCount: canManage ? unwrap(roster, 'count students').length : null,
            activityCount: canManage ? (count?.total ?? 0) : (count?.published ?? 0),
            publishedCount: count?.published ?? 0,
            completedCount: canManage
                ? null
                : unwrap(completions, 'load your progress').filter((c) => c.activity?.status === 'published').length,
        }),
        modules: unwrap(modules, 'load modules').map(mapModule),
    }
}

export async function createCourse(user: SessionUser, input: CreateCourseInput) {
    const db = supabaseAdmin()
    const subject = unwrapMaybe(
        await db.from('subjects').select('id').eq('id', input.subjectId).maybeSingle(),
        'check the subject',
    )
    if (!subject) throw new DataError('Choose one of the listed subjects.', 'INVALID_SUBJECT')

    // Join codes are unique; retry on the (very unlikely) collision
    for (let attempt = 0; attempt < 5; attempt++) {
        const result = await db
            .from('courses')
            .insert({
                title: input.title,
                description: input.description,
                subject_id: input.subjectId,
                join_code: newJoinCode(),
                created_by: user.id,
            })
            .select('id')
            .single()
        if (result.error?.code === '23505') continue
        const course = unwrap(result, 'create the course')
        check(
            await db.from('course_teachers').insert({ course_id: course.id, teacher_id: user.id }),
            'add you as teacher',
        )
        await recordAudit(user.id, 'course.created', 'course', course.id, { title: input.title })
        return getCourse(user, course.id)
    }
    throw new ConflictError('Couldn’t generate a unique join code. Please try again.')
}

export async function updateCourse(user: SessionUser, courseId: string, input: UpdateCourseInput) {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    if (input.subjectId) {
        const subject = unwrapMaybe(
            await db.from('subjects').select('id').eq('id', input.subjectId).maybeSingle(),
            'check the subject',
        )
        if (!subject) throw new DataError('Choose one of the listed subjects.', 'INVALID_SUBJECT')
    }
    check(
        await db
            .from('courses')
            .update({
                ...(input.title !== undefined && { title: input.title }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.subjectId !== undefined && { subject_id: input.subjectId }),
                ...(input.status !== undefined && { status: input.status }),
            })
            .eq('id', courseId),
        'update the course',
    )
    await recordAudit(user.id, 'course.updated', 'course', courseId, { ...input })
    return getCourse(user, courseId)
}

export async function resetJoinCode(user: SessionUser, courseId: string) {
    await requireCourseTeacher(user, courseId)
    for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabaseAdmin().from('courses').update({ join_code: newJoinCode() }).eq('id', courseId)
        if (error?.code === '23505') continue
        check({ error }, 'reset the join code')
        await recordAudit(user.id, 'course.join_code_reset', 'course', courseId)
        return getCourse(user, courseId)
    }
    throw new ConflictError('Couldn’t generate a unique join code. Please try again.')
}

/** A student joins with the code their teacher shared. Joining twice is harmless. */
export async function joinCourse(user: SessionUser, { code }: JoinCourseInput) {
    const db = supabaseAdmin()
    const course = unwrapMaybe(
        await db.from('courses').select('id, status, title').eq('join_code', code).maybeSingle(),
        'find the course',
    )
    if (!course || course.status !== 'published') {
        throw new NotFoundError('No open course uses that code. Check it with your teacher.', 'INVALID_JOIN_CODE')
    }
    check(
        await db
            .from('course_enrollments')
            .upsert(
                { course_id: course.id, student_id: user.id },
                { onConflict: 'course_id,student_id', ignoreDuplicates: true },
            ),
        'join the course',
    )
    return { courseId: course.id, title: course.title }
}

// ── Roster ────────────────────────────────────────────────────────────────────────────────────────

export async function getRoster(user: SessionUser, courseId: string): Promise<RosterStudent[]> {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const enrollments = unwrap(
        await db
            .from('course_enrollments')
            .select(
                'enrolled_at, student:profiles(id, display_name, email, progress:student_progress(total_xp, level, rank:ranks(code)))',
            )
            .eq('course_id', courseId),
        'load the roster',
    )
    const completions = unwrap(
        await db
            .from('activity_completions')
            .select('student_id, kind, best_percent, last_completed_at')
            .eq('course_id', courseId),
        'load progress',
    )
    return enrollments
        .filter((e) => e.student)
        .map((e) => {
            const s = e.student!
            const progress = Array.isArray(s.progress) ? s.progress[0] : s.progress
            const mine = completions.filter((c) => c.student_id === s.id)
            const graded = mine.filter((c) => GRADED_KINDS.includes(c.kind) && c.best_percent !== null)
            const last = mine
                .map((c) => c.last_completed_at)
                .sort()
                .pop()
            return {
                id: s.id,
                displayName: s.display_name,
                email: s.email,
                enrolledAt: new Date(e.enrolled_at),
                level: progress?.level ?? 1,
                rankCode: progress?.rank?.code ?? 'F',
                totalXp: Number(progress?.total_xp ?? 0),
                completedCount: mine.length,
                averageScore: graded.length
                    ? Math.round(graded.reduce((sum, c) => sum + Number(c.best_percent), 0) / graded.length)
                    : null,
                lastActiveAt: last ? new Date(last) : null,
            }
        })
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export async function addStudent(user: SessionUser, courseId: string, { email }: AddStudentInput) {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const profile = unwrapMaybe(
        await db.from('profiles').select('id, role, display_name').ilike('email', email).maybeSingle(),
        'find the student',
    )
    if (!profile) {
        throw new NotFoundError(
            'No account uses that email. Ask the student to sign up first, or share the course join code.',
            'STUDENT_NOT_FOUND',
        )
    }
    if (profile.role !== 'student')
        throw new DataError('That account is a teacher or administrator, not a student.', 'NOT_A_STUDENT')
    check(
        await db
            .from('course_enrollments')
            .upsert(
                { course_id: courseId, student_id: profile.id },
                { onConflict: 'course_id,student_id', ignoreDuplicates: true },
            ),
        'add the student',
    )
    await recordAudit(user.id, 'course.student_added', 'course', courseId, { studentId: profile.id })
    return getRoster(user, courseId)
}

/** Removes the student from the roster. Their attempts, XP and history are kept. */
export async function removeStudent(user: SessionUser, courseId: string, studentId: string) {
    await requireCourseTeacher(user, courseId)
    check(
        await supabaseAdmin().from('course_enrollments').delete().eq('course_id', courseId).eq('student_id', studentId),
        'remove the student',
    )
    await recordAudit(user.id, 'course.student_removed', 'course', courseId, { studentId })
}

// ── Modules ───────────────────────────────────────────────────────────────────────────────────────

export async function createModule(user: SessionUser, courseId: string, input: ModuleInput) {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const last = unwrap(
        await db
            .from('modules')
            .select('position')
            .eq('course_id', courseId)
            .order('position', { ascending: false })
            .limit(1),
        'create the module',
    )
    const row = unwrap(
        await db
            .from('modules')
            .insert({
                course_id: courseId,
                title: input.title,
                description: input.description,
                position: (last[0]?.position ?? -1) + 1,
            })
            .select('*')
            .single(),
        'create the module',
    )
    return mapModule(row)
}

async function requireModuleTeacher(user: SessionUser, moduleId: string) {
    const row = unwrap(
        await supabaseAdmin().from('modules').select('*').eq('id', moduleId).maybeSingle(),
        'load the module',
    )
    if (!row) throw new NotFoundError('That module doesn’t exist.', 'MODULE_NOT_FOUND')
    await requireCourseTeacher(user, row.course_id)
    return row
}

export async function updateModule(user: SessionUser, moduleId: string, input: ModuleInput) {
    await requireModuleTeacher(user, moduleId)
    const row = unwrap(
        await supabaseAdmin()
            .from('modules')
            .update({ title: input.title, description: input.description })
            .eq('id', moduleId)
            .select('*')
            .single(),
        'update the module',
    )
    return mapModule(row)
}

/** Deleting a module keeps its activities (they move to "No module"). */
export async function deleteModule(user: SessionUser, moduleId: string) {
    await requireModuleTeacher(user, moduleId)
    check(await supabaseAdmin().from('modules').delete().eq('id', moduleId), 'delete the module')
}

export async function reorderModules(user: SessionUser, courseId: string, ids: string[]) {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const existing = unwrap(await db.from('modules').select('id').eq('course_id', courseId), 'reorder modules')
    if (ids.some((id) => !existing.some((m) => m.id === id))) throw new DataError('Some modules aren’t in this course.')
    await Promise.all(ids.map((id, position) => db.from('modules').update({ position }).eq('id', id)))
}

export { findCourse }
