import 'server-only'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { asObject } from '@/server/actions/progression/mappers'
import { isEnrolled } from '@/server/actions/courses/access'
import { KEYED_QUESTION_SELECT, mapKeyedQuestion } from '@/server/actions/activities/mappers'
import { FORMAL_KINDS, pickInsightOption, skillAllowedOn, skillCharges, skillRequirements } from '@/utils/skills'
import { getBunnyCharges } from '@/server/actions/inventory'
import { clampToRule } from '@/utils/progression'
import type { PendingAward, XpRule } from '@/@types/progression/Progression'
import { ConflictError, DataError, NotFoundError } from '@/@types/errors'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { Quest } from '@/@types/activities/Activity'
import type {
    AttemptPowers,
    AttemptSkillCode,
    PlayerSkill,
    QuestSkills,
    SkillBook,
    SkillDefinition,
    SkillEffect,
    UpdateSkillDefinitionInput,
    UseSkillInput,
} from '@/@types/game/Inventory'

export const mapSkillDefinition = (row: Tables<'skill_definitions'>): SkillDefinition => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    rarity: row.rarity,
    minLevel: row.min_level,
    minRankOrder: row.min_rank_order,
    minDiscoveries: row.min_discoveries,
    charges: row.charges,
    rechargeHours: row.recharge_hours,
    eligibleKinds: row.eligible_kinds,
    allowedInFormal: row.allowed_in_formal,
    requiresTeacherPermission: row.requires_teacher_permission,
    affectsScore: row.affects_score,
    affectsXp: row.affects_xp,
    passive: row.passive,
    config: asObject(row.config) as Record<string, unknown>,
    enabled: row.enabled,
    sortOrder: row.sort_order,
})

export async function getSkillDefinitions(): Promise<SkillDefinition[]> {
    return unwrap(await supabaseAdmin().from('skill_definitions').select('*').order('sort_order'), 'load skills').map(
        mapSkillDefinition,
    )
}

/** Unlocks any skills the student now qualifies for (idempotent; notifies once). Returns new codes. */
export async function unlockSkills(studentId: string): Promise<string[]> {
    const result = await supabaseAdmin().rpc('unlock_skills', { p_student_id: studentId })
    if (result.error) {
        console.error('[skills] unlock', result.error)
        return []
    }
    return Array.isArray(result.data) ? result.data.filter((c): c is string => typeof c === 'string') : []
}

/** Every skill as this student sees it: unlocked or what it needs, charges and recharge time */
export async function getSkillBook(studentId: string): Promise<SkillBook> {
    await unlockSkills(studentId)
    const db = supabaseAdmin()
    const [definitions, owned, usages, progress, ranks, discoveries] = await Promise.all([
        getSkillDefinitions(),
        db.from('student_skills').select('skill_id, unlocked_at').eq('student_id', studentId),
        db
            .from('skill_usages')
            .select('id, skill_id, created_at, activity:activities(title)')
            .eq('student_id', studentId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 3600_000).toISOString())
            .order('created_at', { ascending: false }),
        db.from('student_progress').select('level, rank:ranks(sort_order)').eq('student_id', studentId).maybeSingle(),
        db.from('ranks').select('code, sort_order'),
        db.from('egg_discoveries').select('egg_id', { count: 'exact', head: true }).eq('student_id', studentId),
    ])
    const ownedRows = unwrap(owned, 'load your skills')
    const usageRows = unwrap(usages, 'load skill history')
    const progressRow = unwrapMaybe(progress, 'load your progress')
    const rankRows = unwrap(ranks, 'load ranks')
    const player = {
        level: progressRow?.level ?? 1,
        rankOrder: progressRow?.rank?.sort_order ?? 1,
        rankCodeFor: (order: number) => rankRows.find((r) => r.sort_order === order)?.code ?? '?',
        discoveries: discoveries.count ?? 0,
    }

    const skills: PlayerSkill[] = definitions
        .filter((s) => s.enabled)
        .map((skill) => {
            const unlocked = ownedRows.find((o) => o.skill_id === skill.id)
            const mine = usageRows.filter((u) => u.skill_id === skill.id)
            const charges = skillCharges(
                skill,
                mine.map((u) => new Date(u.created_at)),
            )
            return {
                skill,
                unlocked: !!unlocked,
                unlockedAt: unlocked ? new Date(unlocked.unlocked_at) : null,
                requirements: skillRequirements(skill, player),
                chargesLeft: skill.passive ? 0 : charges.chargesLeft,
                nextChargeAt: charges.nextChargeAt,
                recentUses: mine
                    .slice(0, 5)
                    .map((u) => ({ id: u.id, createdAt: new Date(u.created_at), context: u.activity?.title ?? null })),
            }
        })
    return { skills }
}

async function loadAttempt(attemptId: string, studentId: string) {
    const attempt = unwrapMaybe(
        await supabaseAdmin().from('attempts').select('*').eq('id', attemptId).maybeSingle(),
        'load the attempt',
    )
    if (!attempt || attempt.student_id !== studentId)
        throw new NotFoundError('That attempt doesn’t exist or isn’t yours.', 'ATTEMPT_NOT_FOUND')
    if (attempt.status !== 'in_progress')
        throw new ConflictError('This attempt has already been handed in.', 'ATTEMPT_CLOSED')
    return attempt
}

async function requireQuestion(activityId: string, questionId: string | undefined) {
    if (!questionId) throw new DataError('Choose a question first.', 'QUESTION_REQUIRED')
    const row = unwrapMaybe(
        await supabaseAdmin()
            .from('questions')
            .select(KEYED_QUESTION_SELECT)
            .eq('id', questionId)
            .eq('activity_id', activityId)
            .maybeSingle(),
        'load the question',
    )
    if (!row) throw new NotFoundError('That question isn’t in this attempt.', 'QUESTION_NOT_IN_ATTEMPT')
    return mapKeyedQuestion(row as unknown as Parameters<typeof mapKeyedQuestion>[0])
}

async function applySkill(
    studentId: string,
    skill: string,
    key: string,
    args: { activityId?: string | null; attemptId?: string | null; questionId?: string | null; effect?: object },
) {
    const result = await supabaseAdmin().rpc('use_skill', {
        p_student_id: studentId,
        p_skill_code: skill,
        p_idempotency_key: key,
        p_activity_id: args.activityId ?? undefined,
        p_attempt_id: args.attemptId ?? undefined,
        p_question_id: args.questionId ?? undefined,
        p_effect: (args.effect ?? {}) as Json,
    })
    if (result.error) throw toAppError(result.error, 'use the skill')
    return asObject(asObject(result.data).effect)
}

/**
 * Activates a skill. Each skill works out its effect on the server (it may need the answer key, which
 * never leaves the server — Insight returns only the id of a WRONG option). public.use_skill then checks
 * eligibility and charges under a lock and records the use exactly once per idempotency key, so a
 * double click spends one charge.
 */
export async function useSkill(user: SessionUser, input: UseSkillInput): Promise<SkillEffect> {
    const db = supabaseAdmin()
    switch (input.skill) {
        case 'insight': {
            if (!input.attemptId) throw new DataError('Insight works during an attempt.', 'ATTEMPT_REQUIRED')
            const attempt = await loadAttempt(input.attemptId, user.id)
            const question = await requireQuestion(attempt.activity_id, input.questionId)
            const used = unwrap(
                await db
                    .from('skill_usages')
                    .select('effect')
                    .eq('attempt_id', attempt.id)
                    .eq('question_id', question.id)
                    .like('idempotency_key', 'insight:%'),
                'check earlier hints',
            )
            const removed = used.map((u) => String(asObject(u.effect).removedOptionId ?? '')).filter(Boolean)
            const optionId = pickInsightOption(question, removed)
            if (!optionId)
                throw new ConflictError(
                    'Insight can’t remove any more options from this question.',
                    'NOTHING_TO_REMOVE',
                )
            const effect = await applySkill(
                user.id,
                'insight',
                `insight:${attempt.id}:${question.id}:${removed.length}`,
                {
                    attemptId: attempt.id,
                    questionId: question.id,
                    effect: { removedOptionId: optionId },
                },
            )
            return { kind: 'insight', removedOptionId: String(effect.removedOptionId ?? optionId) }
        }
        case 'knowledge_echo': {
            if (!input.attemptId) throw new DataError('Knowledge Echo works during an attempt.', 'ATTEMPT_REQUIRED')
            const attempt = await loadAttempt(input.attemptId, user.id)
            const question = await requireQuestion(attempt.activity_id, input.questionId)
            const activity = unwrap(
                await db.from('activities').select('course_id').eq('id', attempt.activity_id).single(),
                'load the activity',
            )
            const [prereqs, lessons] = await Promise.all([
                db.from('activity_prerequisites').select('requires_activity_id').eq('activity_id', attempt.activity_id),
                db
                    .from('activity_completions')
                    .select('activity_id, last_completed_at, activity:activities!inner(id, title, summary, status)')
                    .eq('student_id', user.id)
                    .eq('course_id', activity.course_id)
                    .eq('kind', 'lesson')
                    .eq('activity.status', 'published')
                    .order('last_completed_at', { ascending: false }),
            ])
            const prereqIds = unwrap(prereqs, 'load prerequisites').map((p) => p.requires_activity_id)
            const completed = unwrap(lessons, 'load your lessons')
            const pick = completed.find((l) => prereqIds.includes(l.activity_id)) ?? completed[0]
            if (!pick?.activity) {
                throw new ConflictError(
                    'Complete a lesson in this course first — Knowledge Echo points you back to one.',
                    'NO_LESSONS',
                )
            }
            const effect = { activityId: pick.activity.id, title: pick.activity.title, summary: pick.activity.summary }
            await applySkill(user.id, 'knowledge_echo', `echo:${attempt.id}:${question.id}`, {
                attemptId: attempt.id,
                questionId: question.id,
                effect,
            })
            return { kind: 'knowledge_echo', ...effect }
        }
        case 'time_dilation': {
            if (!input.attemptId) throw new DataError('Time Dilation works during a timed attempt.', 'ATTEMPT_REQUIRED')
            const attempt = await loadAttempt(input.attemptId, user.id)
            const effect = await applySkill(user.id, 'time_dilation', `td:${attempt.id}`, { attemptId: attempt.id })
            const updated = unwrap(
                await db.from('attempts').select('expires_at').eq('id', attempt.id).single(),
                'load the attempt',
            )
            return {
                kind: 'time_dilation',
                minutes: Number(effect.minutes ?? 0),
                expiresAt: new Date(updated.expires_at!),
            }
        }
        case 'second_chance': {
            if (!input.activityId) throw new DataError('Choose the practice quiz to retry.', 'ACTIVITY_REQUIRED')
            const [activity, used, allowance] = await Promise.all([
                db
                    .from('activities')
                    .select('max_attempts, status, course_id')
                    .eq('id', input.activityId)
                    .maybeSingle(),
                db
                    .from('attempts')
                    .select('id', { count: 'exact', head: true })
                    .eq('activity_id', input.activityId)
                    .eq('student_id', user.id),
                db
                    .from('attempt_allowances')
                    .select('extra_attempts')
                    .eq('activity_id', input.activityId)
                    .eq('student_id', user.id)
                    .maybeSingle(),
            ])
            const row = unwrapMaybe(activity, 'load the activity')
            if (!row || row.status !== 'published' || !(await isEnrolled(user.id, row.course_id))) {
                throw new NotFoundError('That quest doesn’t exist or isn’t open to you.', 'ACTIVITY_NOT_FOUND')
            }
            const allowed =
                row.max_attempts === null
                    ? null
                    : row.max_attempts + (unwrapMaybe(allowance, 'load extra attempts')?.extra_attempts ?? 0)
            if (allowed === null || (used.count ?? 0) < allowed) {
                throw new ConflictError(
                    'You still have attempts left — save Second Chance for when you run out.',
                    'ATTEMPTS_LEFT',
                )
            }
            // Keyed to how many attempts exist, so a double click grants one extra attempt
            await applySkill(user.id, 'second_chance', `sc:${input.activityId}:${user.id}:${used.count ?? 0}`, {
                activityId: input.activityId,
            })
            return { kind: 'second_chance', activityId: input.activityId }
        }
        case 'overdrive': {
            if (!input.activityId) throw new DataError('Choose the quest to arm Overdrive for.', 'ACTIVITY_REQUIRED')
            const completed = unwrapMaybe(
                await db
                    .from('activity_completions')
                    .select('activity_id')
                    .eq('student_id', user.id)
                    .eq('activity_id', input.activityId)
                    .maybeSingle(),
                'check the quest',
            )
            if (completed) throw new ConflictError('Overdrive is for quests you haven’t completed yet.', 'NOT_NEW')
            const skill = unwrap(
                await db.from('skill_definitions').select('config').eq('code', 'overdrive').single(),
                'load the skill',
            )
            const bonusXp = Number(asObject(skill.config).bonus ?? 15)
            // Once per quest: the bonus is paid with the first pass (see attempts/finalize.ts)
            await applySkill(user.id, 'overdrive', `od:${input.activityId}:${user.id}`, {
                activityId: input.activityId,
                effect: { bonusXp },
            })
            return { kind: 'overdrive', bonusXp }
        }
        case 'dungeon_sense': {
            if (!input.courseId || !(await isEnrolled(user.id, input.courseId))) {
                throw new NotFoundError('Choose one of your courses.', 'COURSE_NOT_FOUND')
            }
            const [eggs, found, course] = await Promise.all([
                db
                    .from('easter_eggs')
                    .select('id, title, clue, trigger')
                    .eq('course_id', input.courseId)
                    .eq('active', true)
                    .order('created_at'),
                db.from('egg_discoveries').select('egg_id').eq('student_id', user.id),
                db.from('courses').select('title').eq('id', input.courseId).single(),
            ])
            const foundIds = new Set(unwrap(found, 'load your discoveries').map((d) => d.egg_id))
            const active = unwrap(eggs, 'load secrets')
            if (!active.length)
                throw new ConflictError('This course has no hidden secrets yet. Try another course.', 'NO_SECRETS')
            const hidden = active.filter((e) => !foundIds.has(e.id))
            if (!hidden.length) throw new ConflictError('You’ve found every secret in this course!', 'NO_SECRETS_LEFT')
            const target = hidden[0]
            // The clue, or a nudge about where to look — never the answer itself
            const clue = target.clue || DUNGEON_SENSE_NUDGE[target.trigger]
            await applySkill(user.id, 'dungeon_sense', `ds:${input.courseId}:${target.id}:${user.id}`, {
                effect: { eggId: target.id },
            })
            return {
                kind: 'dungeon_sense',
                eggTitle: target.title,
                clue,
                courseTitle: unwrap(course, 'load the course').title,
            }
        }
    }
}

const DUNGEON_SENSE_NUDGE: Record<Tables<'easter_eggs'>['trigger'], string> = {
    hidden_object: 'Something small is hidden inside one of this course’s lessons. Look closely.',
    lesson_section: 'Read every lesson to the very end.',
    secret_phrase: 'A phrase unlocks it. Listen carefully in class and in the lessons.',
    activity_sequence: 'Completing certain quests in the right order reveals it.',
    score_milestone: 'Excellent scores are rewarded here.',
    streak_milestone: 'Learn a little every day.',
    item_combination: 'Collect the right treasures.',
    cross_course: 'The answer lies across more than one course.',
    class_goal: 'Your whole class can uncover this together.',
}

const ATTEMPT_SKILLS: AttemptSkillCode[] = ['insight', 'knowledge_echo', 'time_dilation']

/** Easter Bunny charges, skills and what's already been used on this attempt (restored on refresh) */
export async function getAttemptPowers(
    studentId: string,
    attempt: Tables<'attempts'>,
    activity: Pick<Tables<'activities'>, 'kind' | 'allow_skills' | 'allow_bunny_skips'>,
): Promise<AttemptPowers> {
    const db = supabaseAdmin()
    const [bunnyCharges, definitions, owned, recent, used] = await Promise.all([
        getBunnyCharges(studentId),
        getSkillDefinitions(),
        db.from('student_skills').select('skill_id').eq('student_id', studentId),
        db
            .from('skill_usages')
            .select('skill_id, created_at')
            .eq('student_id', studentId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 3600_000).toISOString()),
        db
            .from('skill_usages')
            .select('question_id, effect, skill:skill_definitions(code)')
            .eq('attempt_id', attempt.id),
    ])
    const ownedIds = new Set(unwrap(owned, 'load your skills').map((o) => o.skill_id))
    const recentRows = unwrap(recent, 'load skill history')
    const kind = { kind: activity.kind, allowSkills: activity.allow_skills }

    const removedOptions: AttemptPowers['removedOptions'] = {}
    const echoes: AttemptPowers['echoes'] = {}
    const usedRows = unwrap(used, 'load skills used on this attempt')
    const dilated = usedRows.some((u) => u.skill?.code === 'time_dilation')
    for (const use of usedRows) {
        const effect = asObject(use.effect)
        if (!use.question_id) continue
        if (use.skill?.code === 'insight' && typeof effect.removedOptionId === 'string') {
            removedOptions[use.question_id] = [...(removedOptions[use.question_id] ?? []), effect.removedOptionId]
        }
        if (use.skill?.code === 'knowledge_echo') {
            echoes[use.question_id] = {
                activityId: String(effect.activityId ?? ''),
                title: String(effect.title ?? ''),
                summary: String(effect.summary ?? ''),
            }
        }
    }

    return {
        allowBunnySkips: activity.allow_bunny_skips && !FORMAL_KINDS.includes(activity.kind),
        bunnyCharges,
        skippedQuestionIds: attempt.skipped_question_ids ?? [],
        removedOptions,
        echoes,
        skills: definitions
            .filter(
                (s) =>
                    ATTEMPT_SKILLS.includes(s.code as AttemptSkillCode) &&
                    ownedIds.has(s.id) &&
                    skillAllowedOn(s, kind),
            )
            // Time Dilation: timed attempts only, once per attempt
            .filter((s) => s.code !== 'time_dilation' || (!!attempt.expires_at && !dilated))
            .map((s) => ({
                code: s.code as AttemptSkillCode,
                name: s.name,
                description: s.description,
                chargesLeft: skillCharges(
                    s,
                    recentRows.filter((r) => r.skill_id === s.id).map((r) => new Date(r.created_at)),
                ).chargesLeft,
            })),
    }
}

/** Overdrive and Second Chance as offered on a quest's briefing */
export async function getQuestSkills(
    studentId: string,
    activity: Tables<'activities'>,
    quest: Pick<Quest, 'state' | 'attemptsLeft' | 'completedAt'>,
): Promise<QuestSkills> {
    const db = supabaseAdmin()
    const [definitions, owned, recent, armed] = await Promise.all([
        getSkillDefinitions(),
        db.from('student_skills').select('skill_id').eq('student_id', studentId),
        db
            .from('skill_usages')
            .select('skill_id, created_at')
            .eq('student_id', studentId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 3600_000).toISOString()),
        db.from('skill_usages').select('effect').eq('idempotency_key', `od:${activity.id}:${studentId}`).maybeSingle(),
    ])
    const ownedIds = new Set(unwrap(owned, 'load your skills').map((o) => o.skill_id))
    const recentRows = unwrap(recent, 'load skill history')
    const usable = (code: string) => {
        const skill = definitions.find((s) => s.code === code)
        if (!skill || !ownedIds.has(skill.id)) return null
        if (!skillAllowedOn(skill, { kind: activity.kind, allowSkills: activity.allow_skills })) return null
        const uses = recentRows.filter((r) => r.skill_id === skill.id).map((r) => new Date(r.created_at))
        return { skill, chargesLeft: skillCharges(skill, uses).chargesLeft }
    }
    const armedRow = unwrapMaybe(armed, 'check Overdrive')
    const overdrive = usable('overdrive')
    const secondChance = usable('second_chance')
    return {
        overdrive:
            armedRow || (overdrive && !quest.completedAt)
                ? {
                      armed: !!armedRow,
                      bonusXp: Number(
                          asObject((armedRow ?? { effect: {} }).effect).bonusXp ?? overdrive?.skill.config.bonus ?? 0,
                      ),
                      chargesLeft: overdrive?.chargesLeft ?? 0,
                  }
                : null,
        secondChance:
            secondChance && quest.attemptsLeft === 0 && quest.state !== 'in_progress' && quest.state !== 'in_review'
                ? { chargesLeft: secondChance.chargesLeft }
                : null,
    }
}

/**
 * The Overdrive bonus for a passed activity, if the student armed it before starting. Paid once per
 * activity (its own idempotency key) through the same award path as completion XP.
 */
export async function overdriveAwards(
    activity: Pick<Tables<'activities'>, 'id' | 'title'>,
    studentId: string,
    rules: XpRule[],
): Promise<PendingAward[]> {
    const armed = unwrapMaybe(
        await supabaseAdmin()
            .from('skill_usages')
            .select('effect')
            .eq('idempotency_key', `od:${activity.id}:${studentId}`)
            .maybeSingle(),
        'check Overdrive',
    )
    if (!armed) return []
    const amount = clampToRule(
        Number(asObject(armed.effect).bonusXp ?? 0),
        rules.find((r) => r.source === 'skill_bonus'),
    )
    if (amount <= 0) return []
    return [
        {
            amount,
            source: 'skill_bonus',
            idempotencyKey: `overdrive:${activity.id}:${studentId}`,
            reason: `Overdrive on “${activity.title}”`,
        },
    ]
}

// ── Administration ────────────────────────────────────────────────────────────────────────────────

export async function updateSkillDefinition(user: SessionUser, skillId: string, input: UpdateSkillDefinitionInput) {
    const existing = unwrapMaybe(
        await supabaseAdmin().from('skill_definitions').select('*').eq('id', skillId).maybeSingle(),
        'load the skill',
    )
    if (!existing) throw new NotFoundError('That skill doesn’t exist.', 'SKILL_NOT_FOUND')
    check(
        await supabaseAdmin()
            .from('skill_definitions')
            .update({
                name: input.name,
                description: input.description,
                rarity: input.rarity,
                min_level: input.minLevel,
                min_rank_order: input.minRankOrder,
                min_discoveries: input.minDiscoveries,
                charges: input.charges,
                recharge_hours: input.rechargeHours,
                enabled: input.enabled,
                config: { ...(asObject(existing.config) as object), ...input.config } as Json,
            })
            .eq('id', skillId),
        'update the skill',
    )
    await recordAudit(user.id, 'skill.updated', 'skill', skillId, { code: existing.code, ...input })
    return (await getSkillDefinitions()).find((s) => s.id === skillId)!
}
