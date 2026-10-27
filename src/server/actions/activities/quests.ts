import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { unwrap } from '@/server/data/supabase/errors'
import { mapSubjectMeta } from '@/server/actions/subjects'
import { mapActivitySummary } from './mappers'
import { finalizeExpiredAttempts } from '@/server/actions/attempts/finalize'
import { getQuestState } from '@/utils/quests'
import { isAssessment } from '@/@types/activities/ActivityKindOptions'
import type { Tables } from '@/@types/supabase/database.types'
import type { Quest } from '@/@types/activities/Activity'
import type { PlayerStatus } from '@/@types/progression/PlayerStatus'

/*
 * Quests = published activities seen through one student's progress. The same function backs the Quest
 * Board, a course page, the dashboard recommendation and — importantly — the server-side "can this
 * student play this now?" check before a lesson completion or attempt.
 */

type CourseRow = Pick<Tables<'courses'>, 'id' | 'title'> & {
    subject: Pick<Tables<'subjects'>, 'id' | 'slug' | 'name' | 'theme'> | null
}

export async function buildQuests(
    studentId: string,
    courseIds: string[],
    activityIds?: string[],
): Promise<{
    quests: Quest[]
    courses: CourseRow[]
}> {
    if (!courseIds.length) return { quests: [], courses: [] }
    const db = supabaseAdmin()

    let activityQuery = db.from('activities').select('*').in('course_id', courseIds).eq('status', 'published')
    if (activityIds) activityQuery = activityQuery.in('id', activityIds)

    const [coursesResult, activitiesResult, modulesResult] = await Promise.all([
        db
            .from('courses')
            .select('id, title, subject:subjects(id, slug, name, theme)')
            .in('id', courseIds)
            .eq('status', 'published'),
        activityQuery.order('position'),
        db.from('modules').select('id, title, position').in('course_id', courseIds),
    ])
    const courses = unwrap(coursesResult, 'load courses') as unknown as CourseRow[]
    const activities = unwrap(activitiesResult, 'load quests').filter((a) => courses.some((c) => c.id === a.course_id))
    const modules = unwrap(modulesResult, 'load modules')
    const ids = activities.map((a) => a.id)
    if (!ids.length) return { quests: [], courses }

    const [completionsResult, attemptsResult, prerequisitesResult, questionsResult, allowancesResult] =
        await Promise.all([
            db.from('activity_completions').select('*').eq('student_id', studentId).in('course_id', courseIds),
            db.from('attempts').select('activity_id, status').eq('student_id', studentId).in('activity_id', ids),
            db.from('activity_prerequisites').select('*').in('activity_id', ids),
            db.from('questions').select('activity_id').in('activity_id', ids),
            // Second Chance: extra attempts granted by a skill
            db
                .from('attempt_allowances')
                .select('activity_id, extra_attempts')
                .eq('student_id', studentId)
                .in('activity_id', ids),
        ])
    const completions = unwrap(completionsResult, 'load your progress')
    const attempts = unwrap(attemptsResult, 'load your attempts')
    const prerequisites = unwrap(prerequisitesResult, 'load prerequisites')
    const questions = unwrap(questionsResult, 'count questions')
    const allowances = unwrap(allowancesResult, 'load extra attempts')

    // Prerequisite titles may be outside `activities` when filtered by id
    const prereqIds = [...new Set(prerequisites.map((p) => p.requires_activity_id))]
    const prereqActivities = prereqIds.length
        ? unwrap(await db.from('activities').select('id, title, kind').in('id', prereqIds), 'load prerequisites')
        : []

    const now = new Date()
    const quests = activities.map((row): Quest => {
        const course = courses.find((c) => c.id === row.course_id)!
        const completion = completions.find((c) => c.activity_id === row.id)
        const mine = attempts.filter((a) => a.activity_id === row.id)
        const requires = prerequisites.filter((p) => p.activity_id === row.id).map((p) => p.requires_activity_id)
        const unmet = requires
            .map((id) => prereqActivities.find((a) => a.id === id))
            .filter((a): a is { id: string; title: string; kind: Tables<'activities'>['kind'] } => !!a)
            .filter((a) => {
                const done = completions.find((c) => c.activity_id === a.id)
                return !done || (isAssessment(a.kind) && !done.passed)
            })
            .map((a) => a.title)
        const state = getQuestState(
            {
                kind: row.kind,
                opensAt: row.opens_at ? new Date(row.opens_at) : null,
                maxAttempts:
                    row.max_attempts === null
                        ? null
                        : row.max_attempts + (allowances.find((a) => a.activity_id === row.id)?.extra_attempts ?? 0),
                unmetPrerequisites: unmet,
                completed: !!completion,
                passed: completion?.passed ?? false,
                attemptsUsed: mine.length,
                hasOpenAttempt: mine.some((a) => a.status === 'in_progress'),
                hasPendingReview: mine.some((a) => a.status === 'pending_review'),
            },
            now,
        )
        return {
            ...mapActivitySummary(row, questions.filter((q) => q.activity_id === row.id).length, requires),
            course: {
                id: course.id,
                title: course.title,
                subject: course.subject
                    ? mapSubjectMeta(course.subject)
                    : { id: '', slug: '', name: '', theme: 'arcane' },
            },
            moduleTitle: modules.find((m) => m.id === row.module_id)?.title ?? null,
            state: state.state,
            stateReason: state.reason,
            bestPercent:
                completion?.best_percent === null || completion?.best_percent === undefined
                    ? null
                    : Number(completion.best_percent),
            passed: completion?.passed ?? false,
            attemptsUsed: mine.length,
            attemptsLeft: state.attemptsLeft,
            completedAt: completion ? new Date(completion.first_completed_at) : null,
        }
    })

    // Module order, then activity order
    const modulePosition = (id: string | null) => modules.find((m) => m.id === id)?.position ?? Number.MAX_SAFE_INTEGER
    quests.sort((a, b) => modulePosition(a.moduleId) - modulePosition(b.moduleId) || a.position - b.position)
    return { quests, courses }
}

/** Every quest across the student's enrolled courses, plus per-course completion for the dashboard. */
export async function getQuestBoard(
    studentId: string,
): Promise<{ quests: Quest[]; courses: PlayerStatus['activeCourses'] }> {
    // Timed attempts that ran out while the student was away are graded from their autosave first
    await finalizeExpiredAttempts({ studentId })
    const enrollments = unwrap(
        await supabaseAdmin().from('course_enrollments').select('course_id').eq('student_id', studentId),
        'load your courses',
    )
    const { quests, courses } = await buildQuests(
        studentId,
        enrollments.map((e) => e.course_id),
    )
    return {
        quests,
        courses: courses.map((c) => {
            const mine = quests.filter((q) => q.course.id === c.id)
            return {
                id: c.id,
                title: c.title,
                subjectTheme: c.subject?.theme ?? 'arcane',
                subjectName: c.subject?.name ?? '',
                completed: mine.filter((q) => q.state === 'completed').length,
                total: mine.length,
            }
        }),
    }
}
