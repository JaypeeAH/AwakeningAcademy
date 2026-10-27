import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrapMaybe } from '@/server/data/supabase/errors'
import { ForbiddenError, NotFoundError } from '@/@types/errors'
import type { SessionUser } from '@/@types/auth/SessionUser'

/*
 * Course-level authorisation, used by every action that touches course content. These run with the
 * service-role client, so they ARE the access control for writes — keep them strict.
 */

export async function isCourseTeacher(user: SessionUser, courseId: string) {
    if (user.role === 'admin') return true
    if (user.role !== 'teacher') return false
    const { data } = await supabaseAdmin()
        .from('course_teachers')
        .select('course_id')
        .eq('course_id', courseId)
        .eq('teacher_id', user.id)
        .maybeSingle()
    return !!data
}

export async function isEnrolled(userId: string, courseId: string) {
    const { data } = await supabaseAdmin()
        .from('course_enrollments')
        .select('course_id')
        .eq('course_id', courseId)
        .eq('student_id', userId)
        .maybeSingle()
    return !!data
}

/** The course row, if it exists */
export async function findCourse(courseId: string) {
    return unwrapMaybe(
        await supabaseAdmin().from('courses').select('*').eq('id', courseId).maybeSingle(),
        'load the course',
    )
}

/** Teacher of this course (or admin) — otherwise 403/404 */
export async function requireCourseTeacher(user: SessionUser, courseId: string) {
    const course = await findCourse(courseId)
    if (!course) throw new NotFoundError('That course doesn’t exist.', 'COURSE_NOT_FOUND')
    if (!(await isCourseTeacher(user, courseId))) {
        throw new ForbiddenError('Only this course’s teachers can do that.', 'NOT_COURSE_TEACHER')
    }
    return course
}

/**
 * Teacher of the course, or a student enrolled in it while it's published. Students get a 404 (not
 * 403) for courses they can't see, so course ids can't be probed.
 */
export async function requireCourseAccess(user: SessionUser, courseId: string) {
    const course = await findCourse(courseId)
    if (!course) throw new NotFoundError('That course doesn’t exist.', 'COURSE_NOT_FOUND')
    if (await isCourseTeacher(user, courseId)) return { course, canManage: true }
    if (course.status === 'published' && (await isEnrolled(user.id, courseId))) return { course, canManage: false }
    throw new NotFoundError('That course doesn’t exist or you’re not enrolled in it.', 'COURSE_NOT_FOUND')
}
