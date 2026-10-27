import 'server-only'
import { DEFAULT_BOSS } from '@/utils/boss'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { getXpRules } from '@/server/actions/progression'
import { parseAppliedAwards, parseSnapshot, asObject } from '@/server/actions/progression/mappers'
import { isEnrolled, requireCourseAccess, requireCourseTeacher } from '@/server/actions/courses/access'
import { buildQuests } from './quests'
import { finalizeExpiredAttempts } from '@/server/actions/attempts/finalize'
import { KEYED_QUESTION_SELECT, mapActivity, mapActivitySummary, mapAttempt, mapKeyedQuestion } from './mappers'
import { computeLessonAwards, summarizeRewards } from '@/utils/progression'
import { getPublishIssues } from '@/utils/activityValidation'
import { FORMAL_KINDS } from '@/utils/skills'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import { activityKindXpSource, type ActivityKind, type PublishStatus } from '@/@types/activities/ActivityKindOptions'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Activity, ActivityPlayView, ActivitySummary, Quest } from '@/@types/activities/Activity'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'
import type { CreateActivityInput, QuestionInput, SaveActivityInput } from '@/@types/activities/ActivitySchema'
import type { QuestionKind } from '@/@types/activities/Question'
import type { RewardSummary } from '@/@types/progression/Progression'
import { EMPTY_OUTCOME, type LearningOutcome } from '@/@types/progression/Streak'
import { afterLearning } from '@/server/actions/progression/afterLearning'
import { isAssessment } from '@/@types/activities/ActivityKindOptions'
import { getQuestSkills } from '@/server/actions/skills'
import { getTeamQuestStatus } from '@/server/actions/teamQuests'

// ── Loading & access ──────────────────────────────────────────────────────────────────────────────

async function findActivity(activityId: string) {
    return unwrapMaybe(
        await supabaseAdmin().from('activities').select('*').eq('id', activityId).maybeSingle(),
        'load the activity',
    )
}

async function getActivityExtras(activityIds: string[]) {
    if (!activityIds.length)
        return { questionCounts: new Map<string, number>(), prerequisites: new Map<string, string[]>() }
    const db = supabaseAdmin()
    const [questions, prerequisites] = await Promise.all([
        db.from('questions').select('activity_id').in('activity_id', activityIds),
        db.from('activity_prerequisites').select('*').in('activity_id', activityIds),
    ])
    const questionCounts = new Map<string, number>()
    for (const q of unwrap(questions, 'count questions'))
        questionCounts.set(q.activity_id, (questionCounts.get(q.activity_id) ?? 0) + 1)
    const prereqs = new Map<string, string[]>()
    for (const p of unwrap(prerequisites, 'load prerequisites'))
        prereqs.set(p.activity_id, [...(prereqs.get(p.activity_id) ?? []), p.requires_activity_id])
    return { questionCounts, prerequisites: prereqs }
}

/** The activity, after checking the user teaches its course */
export async function requireActivityTeacher(user: SessionUser, activityId: string) {
    const activity = await findActivity(activityId)
    if (!activity) throw new NotFoundError('That activity doesn’t exist.', 'ACTIVITY_NOT_FOUND')
    const course = await requireCourseTeacher(user, activity.course_id)
    return { activity, course }
}

/**
 * The activity as a quest for this student, after checking they're enrolled and it's published.
 * 404 for anything they can't see (drafts, other courses), so ids can't be probed.
 */
export async function requireStudentQuest(
    user: SessionUser,
    activityId: string,
): Promise<{ row: Tables<'activities'>; quest: Quest }> {
    const row = await findActivity(activityId)
    if (!row || row.status !== 'published' || !(await isEnrolled(user.id, row.course_id))) {
        throw new NotFoundError('That quest doesn’t exist or isn’t open to you.', 'ACTIVITY_NOT_FOUND')
    }
    const { quests } = await buildQuests(user.id, [row.course_id], [row.id])
    const quest = quests[0]
    if (!quest) throw new NotFoundError('That quest doesn’t exist or isn’t open to you.', 'ACTIVITY_NOT_FOUND')
    return { row, quest }
}

/** Throws unless the student may complete/attempt the quest right now (opening date, prerequisites, attempts). */
export function assertPlayable(quest: Quest) {
    if (quest.state === 'upcoming')
        throw new ConflictError(`This quest isn’t open yet. ${quest.stateReason ?? ''}`.trim(), 'NOT_OPEN')
    if (quest.state === 'locked')
        throw new ConflictError(quest.stateReason ?? 'Complete the earlier quests first.', 'LOCKED')
    if (quest.attemptsLeft === 0 && quest.state !== 'in_progress') {
        throw new ConflictError('You have used all the attempts for this activity.', 'MAX_ATTEMPTS')
    }
}

// ── Lists ─────────────────────────────────────────────────────────────────────────────────────────

/** Teachers: every activity in the course (any status). Students: published quests with their state. */
export async function getCourseActivities(
    user: SessionUser,
    courseId: string,
): Promise<{ activities: ActivitySummary[]; quests: Quest[] | null }> {
    const { canManage } = await requireCourseAccess(user, courseId)
    if (!canManage) {
        const { quests } = await buildQuests(user.id, [courseId])
        return { activities: quests, quests }
    }
    const rows = unwrap(
        await supabaseAdmin().from('activities').select('*').eq('course_id', courseId).order('position'),
        'load activities',
    )
    const { questionCounts, prerequisites } = await getActivityExtras(rows.map((r) => r.id))
    return {
        activities: rows.map((r) =>
            mapActivitySummary(r, questionCounts.get(r.id) ?? 0, prerequisites.get(r.id) ?? []),
        ),
        quests: null,
    }
}

// ── Student: play ─────────────────────────────────────────────────────────────────────────────────

export async function getActivityForPlay(user: SessionUser, activityId: string): Promise<ActivityPlayView> {
    // A timed attempt that ran out while the student was away is graded from its autosave first
    await finalizeExpiredAttempts({ studentId: user.id, activityId })
    const { row, quest } = await requireStudentQuest(user, activityId)
    const attempts = unwrap(
        await supabaseAdmin()
            .from('attempts')
            .select('*')
            .eq('activity_id', activityId)
            .eq('student_id', user.id)
            .order('attempt_no', { ascending: false }),
        'load your attempts',
    )
    return {
        activity: mapActivity(row, quest.questionCount, quest.prerequisiteIds),
        quest,
        attempts: attempts.map(mapAttempt),
        skills: isAssessment(row.kind)
            ? await getQuestSkills(user.id, row, quest)
            : { overdrive: null, secondChance: null },
        team: row.kind === 'team_quest' ? await getTeamQuestStatus(user, row) : null,
    }
}

/**
 * Marks a lesson complete and grants its XP — once. Repeating the call (refresh, double click, two
 * tabs) returns `firstCompletion: false` and no XP: the ledger's idempotency key guarantees it.
 */
export async function completeLesson(
    user: SessionUser,
    activityId: string,
): Promise<{ firstCompletion: boolean; reward: RewardSummary } & LearningOutcome> {
    const { row, quest } = await requireStudentQuest(user, activityId)
    if (row.kind !== 'lesson') throw new DataError('Only lessons can be completed this way.', 'NOT_A_LESSON')
    assertPlayable(quest)

    const awards = computeLessonAwards(
        { id: row.id, kind: row.kind, title: row.title, xpReward: row.xp_reward, xpRepeatable: row.xp_repeatable },
        user.id,
        await getXpRules(),
    )
    const result = await supabaseAdmin().rpc('complete_lesson', {
        p_student_id: user.id,
        p_activity_id: activityId,
        p_awards: awards as unknown as Json,
    })
    if (result.error) throw toAppError(result.error, 'complete the lesson')
    const o = asObject(result.data)
    const firstCompletion = o.firstCompletion === true
    return {
        firstCompletion,
        reward: summarizeRewards(parseSnapshot(o.before), parseSnapshot(o.after), parseAppliedAwards(o.awards), awards),
        ...(firstCompletion ? await afterLearning(user.id, { learned: true }) : EMPTY_OUTCOME),
    }
}

// ── Teacher: Quest Builder ────────────────────────────────────────────────────────────────────────

const KIND_DEFAULTS: Record<ActivityKind, Partial<Tables<'activities'>>> = {
    lesson: { passing_score: 0, feedback_mode: 'immediate' },
    practice_quiz: {
        passing_score: 0,
        feedback_mode: 'immediate',
        max_attempts: null,
        allow_skills: true,
        allow_bunny_skips: true,
    },
    quiz: { passing_score: 60, feedback_mode: 'immediate', max_attempts: 3, allow_skills: true },
    exam: { passing_score: 60, feedback_mode: 'score_only', max_attempts: 1, difficulty: 3, time_limit_minutes: 45 },
    homework: { passing_score: 60, feedback_mode: 'immediate', max_attempts: 1, difficulty: 2 },
    boss_battle: { passing_score: 70, difficulty: 4, max_attempts: 3, feedback_mode: 'immediate', boss: DEFAULT_BOSS },
    team_quest: { passing_score: 0, feedback_mode: 'immediate' },
    secret_quest: {},
}

export async function createActivity(user: SessionUser, courseId: string, input: CreateActivityInput) {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const kind = input.kind as ActivityKind
    if (input.moduleId) {
        const moduleRow = unwrapMaybe(
            await db.from('modules').select('course_id').eq('id', input.moduleId).maybeSingle(),
            'check the module',
        )
        if (moduleRow?.course_id !== courseId)
            throw new DataError('That module isn’t in this course.', 'INVALID_MODULE')
    }
    const rule = (await getXpRules()).find((r) => r.source === activityKindXpSource[kind])
    const last = unwrap(
        await db
            .from('activities')
            .select('position')
            .eq('course_id', courseId)
            .order('position', { ascending: false })
            .limit(1),
        'create the activity',
    )
    const row = unwrap(
        await db
            .from('activities')
            .insert({
                course_id: courseId,
                module_id: input.moduleId,
                kind,
                title: input.title,
                xp_reward: rule?.defaultXp ?? 0,
                position: (last[0]?.position ?? -1) + 1,
                created_by: user.id,
                ...KIND_DEFAULTS[kind],
            })
            .select('*')
            .single(),
        'create the activity',
    )
    return mapActivitySummary(row, 0, [])
}

export async function getActivityEditor(user: SessionUser, activityId: string): Promise<ActivityEditorData> {
    const { activity: row, course } = await requireActivityTeacher(user, activityId)
    const db = supabaseAdmin()
    const [questions, prerequisites, modules, siblings, attempts, rules] = await Promise.all([
        db.from('questions').select(KEYED_QUESTION_SELECT).eq('activity_id', activityId).order('position'),
        db.from('activity_prerequisites').select('requires_activity_id').eq('activity_id', activityId),
        db.from('modules').select('*').eq('course_id', course.id).order('position'),
        db
            .from('activities')
            .select('id, title, kind')
            .eq('course_id', course.id)
            .neq('id', activityId)
            .neq('status', 'archived')
            .order('position'),
        db
            .from('attempts')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', activityId)
            .neq('status', 'in_progress'),
        getXpRules(),
    ])
    const keyed = unwrap(questions, 'load questions').map((q) =>
        mapKeyedQuestion(q as Parameters<typeof mapKeyedQuestion>[0]),
    )
    return {
        activity: mapActivity(
            row,
            keyed.length,
            unwrap(prerequisites, 'load prerequisites').map((p) => p.requires_activity_id),
        ),
        questions: keyed,
        course: { id: course.id, title: course.title },
        modules: unwrap(modules, 'load modules').map((m) => ({
            id: m.id,
            courseId: m.course_id,
            title: m.title,
            description: m.description,
            position: m.position,
        })),
        siblings: unwrap(siblings, 'load activities'),
        xpRule: rules.find((r) => r.source === activityKindXpSource[row.kind]) ?? null,
        attemptCount: attempts.count ?? 0,
    }
}

/** Normalises question input per kind (true/false always has exactly True/False options, etc.) */
function normalizeQuestion(q: QuestionInput): QuestionInput {
    const kind = q.kind as QuestionKind
    if (kind === 'short_answer') return { ...q, options: [], key: { ...q.key, correctOptionIds: [] } }
    return {
        ...q,
        key: {
            ...q.key,
            acceptedAnswers: [],
            caseSensitive: false,
            correctOptionIds: q.key.correctOptionIds.filter((id) => q.options.some((o) => o.id === id)),
        },
    }
}

/** A team quest's targets must be other non-team activities in the same course */
async function checkTeamConfig(row: Tables<'activities'>, input: SaveActivityInput) {
    if (!input.teamConfig) return null
    const ids = [...new Set(input.teamConfig.activityIds)]
    const targets = unwrap(
        await supabaseAdmin().from('activities').select('id, course_id, kind').in('id', ids),
        'check the team quest',
    )
    if (
        targets.length !== ids.length ||
        targets.some((t) => t.course_id !== row.course_id || t.kind === 'team_quest')
    ) {
        throw new DataError('A team quest’s activities must be other quests in this course.', 'INVALID_TEAM_QUEST')
    }
    return { ...input.teamConfig, activityIds: ids }
}

/**
 * Saves the Quest Builder: details first, then questions/options/keys/prerequisites in one database
 * transaction (save_activity_content). Published activities must stay publishable after the edit.
 */
export async function saveActivity(
    user: SessionUser,
    activityId: string,
    input: SaveActivityInput,
): Promise<ActivityEditorData> {
    const { activity: row } = await requireActivityTeacher(user, activityId)
    const db = supabaseAdmin()
    const rule = (await getXpRules()).find((r) => r.source === activityKindXpSource[row.kind]) ?? null
    const questions = input.questions.map(normalizeQuestion)

    if (rule && (input.xpReward < rule.minXp || input.xpReward > rule.maxXp)) {
        throw new DataError(
            `XP must be between ${rule.minXp} and ${rule.maxXp} (set by your administrator).`,
            'XP_OUT_OF_RANGE',
        )
    }
    if (row.status === 'published') {
        const issues = getPublishIssues({
            kind: row.kind,
            title: input.title,
            body: input.body,
            xpReward: input.xpReward,
            questions,
            xpRule: rule,
            feedbackMode: input.feedbackMode,
            dueAt: input.dueAt,
            boss: input.boss,
            teamConfig: input.teamConfig,
        })
        if (issues.length) {
            throw new DataError(
                `This activity is published, so it must stay complete: ${issues[0].message}`,
                'PUBLISH_ISSUES',
                { issues },
            )
        }
    }
    if (input.moduleId) {
        const moduleRow = unwrapMaybe(
            await db.from('modules').select('course_id').eq('id', input.moduleId).maybeSingle(),
            'check the module',
        )
        if (moduleRow?.course_id !== row.course_id)
            throw new DataError('That module isn’t in this course.', 'INVALID_MODULE')
    }

    check(
        await db
            .from('activities')
            .update({
                title: input.title,
                summary: input.summary,
                body: input.body,
                objectives: input.objectives,
                module_id: input.moduleId,
                difficulty: input.difficulty,
                xp_reward: input.xpReward,
                estimated_minutes: input.estimatedMinutes,
                opens_at: input.opensAt?.toISOString() ?? null,
                due_at: input.dueAt?.toISOString() ?? null,
                max_attempts: input.maxAttempts,
                // Lessons can't be timed (there's no attempt to time)
                time_limit_minutes: row.kind === 'lesson' ? null : input.timeLimitMinutes,
                passing_score: input.passingScore,
                feedback_mode: input.feedbackMode,
                // Skills and Easter Bunny skips never apply to formal assessments
                allow_skills: !FORMAL_KINDS.includes(row.kind) && input.allowSkills,
                allow_bunny_skips: !FORMAL_KINDS.includes(row.kind) && row.kind !== 'lesson' && input.allowBunnySkips,
                xp_repeatable: input.xpRepeatable,
                boss: row.kind === 'boss_battle' ? ((input.boss ?? DEFAULT_BOSS) as unknown as Json) : null,
                team_config:
                    row.kind === 'team_quest' ? ((await checkTeamConfig(row, input)) as unknown as Json) : null,
            })
            .eq('id', activityId),
        'save the activity',
    )

    const content = await db.rpc('save_activity_content', {
        p_activity_id: activityId,
        p_questions: questions as unknown as Json,
        p_prerequisite_ids: input.prerequisiteIds,
    })
    if (content.error) throw toAppError(content.error, 'save the questions')

    return getActivityEditor(user, activityId)
}

/** Publish (after the checklist passes), unpublish to draft, or archive. */
export async function setActivityStatus(
    user: SessionUser,
    activityId: string,
    status: PublishStatus,
): Promise<ActivityEditorData> {
    const editor = await getActivityEditor(user, activityId)
    const { activity, questions, xpRule } = editor
    if (status === activity.status) return editor

    if (status === 'published') {
        const issues = getPublishIssues({
            kind: activity.kind,
            title: activity.title,
            body: activity.body,
            xpReward: activity.xpReward,
            questions: questions.map((q) => ({ ...q, options: q.options.map((o) => ({ id: o.id, label: o.label })) })),
            xpRule,
            feedbackMode: activity.feedbackMode,
            dueAt: activity.dueAt,
            boss: activity.boss,
            teamConfig: activity.teamConfig,
        })
        if (issues.length) throw new DataError(issues[0].message, 'PUBLISH_ISSUES', { issues })
    }

    check(
        await supabaseAdmin()
            .from('activities')
            .update({
                status,
                ...(status === 'published' && !activity.publishedAt ? { published_at: new Date().toISOString() } : {}),
            })
            .eq('id', activityId),
        'change the activity status',
    )
    const action =
        status === 'published'
            ? 'activity.published'
            : status === 'archived'
              ? 'activity.archived'
              : 'activity.unpublished'
    await recordAudit(user.id, action, 'activity', activityId, { title: activity.title })
    return getActivityEditor(user, activityId)
}

/** Only activities no student has touched can be deleted; otherwise archive keeps their history. */
export async function deleteActivity(user: SessionUser, activityId: string) {
    const { activity } = await requireActivityTeacher(user, activityId)
    const db = supabaseAdmin()
    const [attempts, completions] = await Promise.all([
        db.from('attempts').select('id', { count: 'exact', head: true }).eq('activity_id', activityId),
        db
            .from('activity_completions')
            .select('activity_id', { count: 'exact', head: true })
            .eq('activity_id', activityId),
    ])
    if ((attempts.count ?? 0) + (completions.count ?? 0) > 0) {
        throw new ConflictError(
            'Students have already worked on this activity. Archive it instead to keep their results.',
            'HAS_STUDENT_WORK',
        )
    }
    check(await db.from('activities').delete().eq('id', activityId), 'delete the activity')
    await recordAudit(user.id, 'activity.deleted', 'activity', activityId, {
        title: activity.title,
        courseId: activity.course_id,
    })
}

/** Reorders a course's activities (ids in the new order; ids not listed keep their place after them). */
export async function reorderActivities(user: SessionUser, courseId: string, ids: string[]) {
    await requireCourseTeacher(user, courseId)
    const db = supabaseAdmin()
    const existing = unwrap(await db.from('activities').select('id').eq('course_id', courseId), 'reorder activities')
    if (ids.some((id) => !existing.some((a) => a.id === id)))
        throw new DataError('Some activities aren’t in this course.')
    await Promise.all(ids.map((id, position) => db.from('activities').update({ position }).eq('id', id)))
}

export type { Activity }
