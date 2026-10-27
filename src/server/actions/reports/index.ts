import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrap } from '@/server/data/supabase/errors'
import { requireCourseTeacher } from '@/server/actions/courses/access'
import { getSupportReasons } from '@/utils/reports'
import { GRADED_KINDS } from '@/@types/activities/ActivityKindOptions'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { AdminOverview, CourseProgressReport, TeacherOverview } from '@/@types/reports/Reports'

/** Students × published activities, with plain-language "may need support" flags. */
export async function getCourseProgress(user: SessionUser, courseId: string): Promise<CourseProgressReport> {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const [activitiesResult, enrollmentsResult, completionsResult] = await Promise.all([
        db
            .from('activities')
            .select('id, title, kind, due_at, passing_score, position')
            .eq('course_id', courseId)
            .eq('status', 'published')
            .order('position'),
        db
            .from('course_enrollments')
            .select('student:profiles(id, display_name, progress:student_progress(level, rank:ranks(code)))')
            .eq('course_id', courseId),
        db
            .from('activity_completions')
            .select('student_id, activity_id, best_percent, passed')
            .eq('course_id', courseId),
    ])
    const activities = unwrap(activitiesResult, 'load activities')
    const completions = unwrap(completionsResult, 'load progress')
    const now = new Date()

    const students = unwrap(enrollmentsResult, 'load the roster')
        .map((e) => e.student)
        .filter((s) => !!s)
        .map((s) => {
            const progress = Array.isArray(s!.progress) ? s!.progress[0] : s!.progress
            const cells: CourseProgressReport['students'][number]['cells'] = {}
            for (const a of activities) {
                const c = completions.find((x) => x.student_id === s!.id && x.activity_id === a.id)
                cells[a.id] = {
                    completed: !!c,
                    bestPercent: c?.best_percent == null ? null : Number(c.best_percent),
                    passed: c?.passed ?? false,
                }
            }
            const graded = activities.filter((a) => GRADED_KINDS.includes(a.kind) && cells[a.id].bestPercent !== null)
            const averageScore = graded.length
                ? Math.round(graded.reduce((sum, a) => sum + (cells[a.id].bestPercent ?? 0), 0) / graded.length)
                : null
            const overdue = activities.filter(
                (a) => a.due_at && new Date(a.due_at) < now && !cells[a.id].completed,
            ).length
            const failed = activities.filter(
                (a) => GRADED_KINDS.includes(a.kind) && cells[a.id].completed && !cells[a.id].passed,
            ).length
            return {
                id: s!.id,
                displayName: s!.display_name,
                level: progress?.level ?? 1,
                rankCode: progress?.rank?.code ?? 'F',
                cells,
                completed: Object.values(cells).filter((c) => c.completed).length,
                averageScore,
                overdue,
                supportReasons: getSupportReasons({ averageScore, overdue, failedAssessments: failed }),
            }
        })
        .sort((a, b) => b.supportReasons.length - a.supportReasons.length || a.displayName.localeCompare(b.displayName))

    const possible = students.length * activities.length
    const averages = students.map((s) => s.averageScore).filter((a): a is number => a !== null)
    return {
        activities: activities.map((a) => ({
            id: a.id,
            title: a.title,
            kind: a.kind,
            dueAt: a.due_at ? new Date(a.due_at) : null,
            passingScore: a.passing_score,
        })),
        students,
        summary: {
            completionRate: possible
                ? Math.round((students.reduce((sum, s) => sum + s.completed, 0) / possible) * 100)
                : null,
            averageScore: averages.length ? Math.round(averages.reduce((a, b) => a + b, 0) / averages.length) : null,
            needsSupport: students.filter((s) => s.supportReasons.length > 0).length,
        },
    }
}

/** Latest graded attempts across the courses this teacher teaches */
export async function getTeacherOverview(user: SessionUser): Promise<TeacherOverview> {
    const db = supabaseAdmin()
    let activityQuery = db.from('activities').select('id, title, course_id, course:courses(title)')
    if (user.role !== 'admin') {
        const taught = unwrap(
            await db.from('course_teachers').select('course_id').eq('teacher_id', user.id),
            'load your courses',
        )
        if (!taught.length) return { recentSubmissions: [] }
        activityQuery = activityQuery.in(
            'course_id',
            taught.map((t) => t.course_id),
        )
    }
    const activities = unwrap(await activityQuery, 'load activities')
    if (!activities.length) return { recentSubmissions: [] }
    const attempts = unwrap(
        await db
            .from('attempts')
            .select(
                'id, activity_id, percent, passed, submitted_at, student:profiles!attempts_student_id_fkey(display_name)',
            )
            .in(
                'activity_id',
                activities.map((a) => a.id),
            )
            .neq('status', 'in_progress')
            .order('submitted_at', { ascending: false })
            .limit(10),
        'load recent submissions',
    )
    return {
        recentSubmissions: attempts.map((a) => {
            const activity = activities.find((x) => x.id === a.activity_id)!
            return {
                attemptId: a.id,
                activityId: a.activity_id,
                activityTitle: activity.title,
                courseId: activity.course_id,
                courseTitle: activity.course?.title ?? '',
                studentName: a.student?.display_name ?? 'Student',
                percent: a.percent === null ? null : Number(a.percent),
                passed: a.passed,
                submittedAt: new Date(a.submitted_at ?? Date.now()),
            }
        }),
    }
}

export async function getAdminOverview(): Promise<AdminOverview> {
    const db = supabaseAdmin()
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const count = (role: 'student' | 'teacher' | 'admin') =>
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', role)
    const [students, teachers, admins, courses, activities, ledger] = await Promise.all([
        count('student'),
        count('teacher'),
        count('admin'),
        db.from('courses').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
        db.from('activities').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        db.from('xp_ledger').select('amount').gte('created_at', weekAgo).gt('amount', 0),
    ])
    return {
        users: { student: students.count ?? 0, teacher: teachers.count ?? 0, admin: admins.count ?? 0 },
        courses: courses.count ?? 0,
        publishedActivities: activities.count ?? 0,
        xpAwardedThisWeek: unwrap(ledger, 'load XP totals').reduce((sum, row) => sum + row.amount, 0),
    }
}
