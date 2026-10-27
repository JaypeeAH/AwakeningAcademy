import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrap } from '@/server/data/supabase/errors'
import { requireCourseTeacher } from '@/server/actions/courses/access'
import {
    missedQuestions,
    objectivePerformance,
    retryStats,
    scoreDistribution,
    workStatus,
    xpBreakdown,
    type ResponseFact,
} from '@/utils/analytics'
import { GRADED_KINDS } from '@/@types/activities/ActivityKindOptions'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { AnalyticsFilters, CourseAnalytics } from '@/@types/reports/Analytics'

/*
 * Course analytics for its teachers (and admins). Read with the service role after the teacher check;
 * every calculation is in utils/analytics. Filters: module, one student, and a date range on when work
 * was handed in (and XP earned).
 */

const PAGE = 1000

/** Supabase returns at most 1000 rows per request: page through bigger results */
async function fetchAll<T>(
    build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
    what: string,
) {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE) {
        const page = unwrap((await build(from, from + PAGE - 1)) as never, what) as T[]
        rows.push(...page)
        if (page.length < PAGE) return rows
    }
}

/** Splits long id lists so request URLs stay short */
async function inChunks<T>(ids: string[], run: (chunk: string[]) => Promise<T[]>) {
    const out: T[] = []
    for (let i = 0; i < ids.length; i += 150) out.push(...(await run(ids.slice(i, i + 150))))
    return out
}

export async function getCourseAnalytics(
    user: SessionUser,
    courseId: string,
    filters: AnalyticsFilters,
): Promise<CourseAnalytics> {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()

    const [moduleRows, rosterRows, activityRows] = await Promise.all([
        db.from('modules').select('id, title, position').eq('course_id', courseId).order('position'),
        db
            .from('course_enrollments')
            .select('student_id, profile:profiles(display_name, role)')
            .eq('course_id', courseId),
        db
            .from('activities')
            .select('id, title, kind, module_id, due_at, status')
            .eq('course_id', courseId)
            .eq('status', 'published'),
    ])
    const roster = (
        unwrap(rosterRows, 'load the roster') as unknown as {
            student_id: string
            profile: { display_name: string; role: string } | null
        }[]
    )
        .filter((r) => r.profile?.role === 'student')
        .map((r) => ({ id: r.student_id, displayName: r.profile?.display_name ?? 'Student' }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
    const students = filters.studentId ? roster.filter((s) => s.id === filters.studentId) : roster
    const studentIds = students.map((s) => s.id)

    const activities = unwrap(activityRows, 'load activities').filter(
        (a) => !filters.moduleId || a.module_id === filters.moduleId,
    )
    const activityIds = activities.map((a) => a.id)
    const titles = new Map(activities.map((a) => [a.id, a.title]))

    const empty: CourseAnalytics = {
        options: {
            modules: unwrap(moduleRows, 'load modules').map((m) => ({ id: m.id, title: m.title })),
            students: roster,
        },
        summary: {
            gradedAttempts: 0,
            averagePercent: null,
            passRate: null,
            activeStudents: 0,
            totalStudents: students.length,
            awaitingMarking: 0,
        },
        scoreDistribution: scoreDistribution([]),
        objectives: [],
        missedQuestions: [],
        work: { overdue: [], incomplete: [] },
        retries: [],
        skipped: { total: 0, byActivity: [] },
        xp: { academic: 0, bonus: [], bonusTotal: 0, adjustments: 0 },
    }
    if (!activityIds.length || !studentIds.length) return empty

    const from = filters.from?.toISOString()
    // "to" is a date: include that whole day
    const to = filters.to ? new Date(filters.to.getTime() + 24 * 3600_000).toISOString() : undefined

    const attempts = await inChunks(activityIds, (chunk) =>
        fetchAll((a, b) => {
            let q = db
                .from('attempts')
                .select('id, activity_id, student_id, status, percent, passed, submitted_at, skipped_question_ids')
                .in('activity_id', chunk)
                .in('status', ['graded', 'pending_review'])
                .order('id')
                .range(a, b)
            if (from) q = q.gte('submitted_at', from)
            if (to) q = q.lt('submitted_at', to)
            return q
        }, 'load attempts'),
    )
    const mine = attempts.filter((a) => studentIds.includes(a.student_id))
    const graded = mine.filter((a) => a.status === 'graded')
    const gradedKinds = new Map(activities.map((a) => [a.id, GRADED_KINDS.includes(a.kind)]))
    const scored = graded.filter((a) => gradedKinds.get(a.activity_id) && a.percent !== null)

    const [questionRows, responseRows, completionRows, ledgerRows] = await Promise.all([
        inChunks(activityIds, (chunk) =>
            fetchAll(
                (a, b) =>
                    db
                        .from('questions')
                        .select('id, activity_id, prompt, points, objective')
                        .in('activity_id', chunk)
                        .order('id')
                        .range(a, b),
                'load questions',
            ),
        ),
        inChunks(
            mine.map((a) => a.id),
            (chunk) =>
                fetchAll(
                    (a, b) =>
                        db
                            .from('attempt_responses')
                            .select('attempt_id, question_id, outcome, points_awarded')
                            .in('attempt_id', chunk)
                            .order('attempt_id')
                            .order('question_id')
                            .range(a, b),
                    'load answers',
                ),
        ),
        fetchAll(
            (a, b) =>
                db
                    .from('activity_completions')
                    .select('student_id, activity_id, passed')
                    .eq('course_id', courseId)
                    .order('student_id')
                    .order('activity_id')
                    .range(a, b),
            'load completions',
        ),
        fetchAll((a, b) => {
            let q = db
                .from('xp_ledger')
                .select('student_id, source, amount')
                .eq('course_id', courseId)
                .order('id')
                .range(a, b)
            if (from) q = q.gte('created_at', from)
            if (to) q = q.lt('created_at', to)
            return q
        }, 'load XP'),
    ])

    const questions = new Map(questionRows.map((q) => [q.id, q]))
    const attemptActivity = new Map(mine.map((a) => [a.id, a.activity_id]))
    const responses: ResponseFact[] = responseRows.flatMap((r) => {
        const q = questions.get(r.question_id)
        if (!q) return []
        return [
            {
                questionId: r.question_id,
                activityId: attemptActivity.get(r.attempt_id) ?? q.activity_id,
                objective: q.objective,
                outcome: r.outcome,
                pointsAwarded: Number(r.points_awarded),
                maxPoints: q.points,
            },
        ]
    })

    const skippedByActivity = new Map<string, number>()
    for (const r of responses) {
        if (r.outcome === 'skipped') skippedByActivity.set(r.activityId, (skippedByActivity.get(r.activityId) ?? 0) + 1)
    }
    const percents = scored.map((a) => Number(a.percent))

    return {
        ...empty,
        summary: {
            gradedAttempts: scored.length,
            averagePercent: percents.length
                ? Math.round((percents.reduce((s, p) => s + p, 0) / percents.length) * 10) / 10
                : null,
            passRate: scored.length
                ? Math.round((scored.filter((a) => a.passed).length / scored.length) * 1000) / 10
                : null,
            activeStudents: new Set(mine.map((a) => a.student_id)).size,
            totalStudents: students.length,
            awaitingMarking: mine.filter((a) => a.status === 'pending_review').length,
        },
        scoreDistribution: scoreDistribution(percents),
        objectives: objectivePerformance(responses),
        missedQuestions: missedQuestions(
            responses,
            new Map(
                questionRows.map((q) => [
                    q.id,
                    { prompt: q.prompt, activityId: q.activity_id, activityTitle: titles.get(q.activity_id) ?? '' },
                ]),
            ),
        ),
        work: workStatus(
            activities
                .filter((a) => a.kind !== 'team_quest')
                .map((a) => ({
                    id: a.id,
                    title: a.title,
                    dueAt: a.due_at ? new Date(a.due_at) : null,
                    graded: GRADED_KINDS.includes(a.kind),
                })),
            students,
            completionRows
                .filter((c) => studentIds.includes(c.student_id))
                .map((c) => ({ studentId: c.student_id, activityId: c.activity_id, passed: c.passed })),
            new Date(),
        ),
        retries: retryStats(
            mine.map((a) => ({ studentId: a.student_id, activityId: a.activity_id })),
            titles,
        ),
        skipped: {
            total: [...skippedByActivity.values()].reduce((s, n) => s + n, 0),
            byActivity: [...skippedByActivity.entries()]
                .map(([activityId, count]) => ({ activityId, title: titles.get(activityId) ?? '', count }))
                .sort((a, b) => b.count - a.count),
        },
        xp: xpBreakdown(
            ledgerRows
                .filter((l) => studentIds.includes(l.student_id))
                .map((l) => ({ source: l.source, amount: l.amount })),
        ),
    }
}
