import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { supabaseAdmin } from '@/server/data/supabase/admin'
import { check, toAppError, unwrap, unwrapMaybe } from '@/server/data/supabase/errors'
import { recordAudit } from '@/server/actions/audit'
import { getProgressionSettings, getXpRules } from '@/server/actions/progression'
import { getLearningDays } from '@/server/actions/streaks'
import { localDay } from '@/utils/streaks'
import { asObject, parseAppliedAwards, parseSnapshot } from '@/server/actions/progression/mappers'
import { isCourseTeacher, isEnrolled, requireCourseTeacher } from '@/server/actions/courses/access'
import { unlockSkills } from '@/server/actions/skills'
import { clampToRule, summarizeRewards } from '@/utils/progression'
import {
    evaluateTrigger,
    MANUAL_TRIGGERS_SET,
    phraseHashInput,
    type CompletionFact,
    type TriggerContext,
} from '@/utils/secrets'
import { DataError, NotFoundError } from '@/@types/errors'
import {
    EggConfigSchemas,
    EggRewardSchema,
    type Codex,
    type Discovery,
    type EasterEgg,
    type EggReward,
    type SaveEggInput,
} from '@/@types/game/Secrets'
import type { Json, Tables } from '@/@types/supabase/database.types'
import type { SessionUser } from '@/@types/auth/SessionUser'
import type { PendingAward } from '@/@types/progression/Progression'

/*
 * Easter eggs: teachers hide secrets in their courses without code changes; students discover them.
 * Automatic triggers are decided by utils/secrets.evaluateTrigger from facts gathered here; manual ones
 * (a marker click, reaching a lesson section, a phrase) by the student's own request. Either way the
 * claim goes through public.claim_discovery — once per student per egg, XP via apply_awards.
 */

type EggRow = Tables<'easter_eggs'>

const hashPhrase = (eggId: string, phrase: string) =>
    createHash('sha256').update(phraseHashInput(eggId, phrase)).digest('hex')

function newMarkerKey() {
    return randomBytes(24)
        .toString('base64')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 16)
}

const parseRewards = (value: Json): EggReward[] =>
    Array.isArray(value)
        ? value.flatMap((r) => {
              const parsed = EggRewardSchema.safeParse(r)
              return parsed.success ? [parsed.data] : []
          })
        : []

const mapEgg = (row: EggRow, discoveredCount: number): EasterEgg => ({
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    clue: row.clue,
    clueVisible: row.clue_visible,
    reveal: row.reveal,
    trigger: row.trigger,
    config: asObject(row.config) as Record<string, unknown>,
    hasPhrase: !!row.phrase_hash,
    markerKey: row.marker_key,
    rarity: row.rarity,
    rewards: parseRewards(row.rewards),
    active: row.active,
    discoveredCount,
    createdAt: new Date(row.created_at),
})

// ── Claiming ──────────────────────────────────────────────────────────────────────────────────────

/** Claims one egg for a student. null when they had already found it. */
async function claimEgg(studentId: string, egg: EggRow): Promise<Discovery | null> {
    const rewards = parseRewards(egg.rewards)
    const xp = rewards.reduce((sum, r) => sum + (r.type === 'xp' ? r.amount : 0), 0)
    const rule = (await getXpRules()).find((r) => r.source === 'secret_quest')
    const amount = xp > 0 ? clampToRule(xp, rule) : 0
    const awards: PendingAward[] = amount
        ? [
              {
                  amount,
                  source: 'secret_quest',
                  idempotencyKey: `egg:${egg.id}:${studentId}`,
                  reason: `Discovered “${egg.title}”`,
              },
          ]
        : []
    const items = rewards.flatMap((r) => (r.type === 'item' ? [{ itemId: r.itemId, charges: r.charges }] : []))

    const result = await supabaseAdmin().rpc('claim_discovery', {
        p_student_id: studentId,
        p_egg_id: egg.id,
        p_awards: awards as unknown as Json,
        p_items: items as unknown as Json,
    })
    if (result.error) throw toAppError(result.error, 'claim the secret')
    const o = asObject(result.data)
    if (o.claimed !== true) return null

    const names = items.length
        ? unwrap(
              await supabaseAdmin()
                  .from('item_definitions')
                  .select('id, name')
                  .in(
                      'id',
                      items.map((i) => i.itemId),
                  ),
              'load items',
          )
        : []
    return {
        eggId: egg.id,
        title: egg.title,
        reveal: egg.reveal,
        rarity: egg.rarity,
        items: items.map((i) => ({ name: names.find((n) => n.id === i.itemId)?.name ?? 'Item', charges: i.charges })),
        reward: awards.length
            ? summarizeRewards(parseSnapshot(o.before), parseSnapshot(o.after), parseAppliedAwards(o.awards), awards)
            : null,
    }
}

async function enrolledCourseIds(studentId: string) {
    const rows = unwrap(
        await supabaseAdmin()
            .from('course_enrollments')
            .select('course_id, course:courses!inner(status)')
            .eq('student_id', studentId)
            .eq('course.status', 'published'),
        'load your courses',
    )
    return rows.map((r) => r.course_id)
}

async function buildTriggerContext(studentId: string, eggs: EggRow[]): Promise<TriggerContext> {
    const db = supabaseAdmin()
    const needs = new Set(eggs.map((e) => e.trigger))
    const classGoalActivities = eggs
        .flatMap((e) => (e.trigger === 'class_goal' ? [String(asObject(e.config).activityId ?? '')] : []))
        .filter(Boolean)

    const [completions, inventory, days, settings, classRows] = await Promise.all([
        db
            .from('activity_completions')
            .select('activity_id, course_id, kind, best_percent, passed, first_completed_at')
            .eq('student_id', studentId),
        needs.has('item_combination')
            ? db.from('inventory_items').select('item_id, charges').eq('student_id', studentId)
            : null,
        // Learning days are recorded (in the school's time zone) by afterLearning
        needs.has('streak_milestone') ? getLearningDays(studentId) : [],
        getProgressionSettings(),
        classGoalActivities.length
            ? db.from('activity_completions').select('activity_id, kind, passed').in('activity_id', classGoalActivities)
            : null,
    ])

    const facts: CompletionFact[] = unwrap(completions, 'load your progress').map((c) => ({
        activityId: c.activity_id,
        courseId: c.course_id,
        completedAt: new Date(c.first_completed_at),
        bestPercent: c.best_percent,
        passed: c.passed,
        graded: c.kind !== 'lesson',
    }))
    const classCompletions: Record<string, number> = {}
    for (const row of classRows ? unwrap(classRows, 'load class progress') : []) {
        if (row.kind !== 'lesson' && !row.passed) continue
        classCompletions[row.activity_id] = (classCompletions[row.activity_id] ?? 0) + 1
    }
    return {
        completions: facts,
        activeDays: days.map((d) => d.day),
        today: localDay(new Date(), settings.timezone),
        inventory: Object.fromEntries(
            (inventory ? unwrap(inventory, 'load your inventory') : []).map((i) => [i.item_id, i.charges]),
        ),
        classCompletions,
    }
}

/**
 * Checks the student's automatic secrets (sequences, scores, streaks, item sets, cross-course and class
 * goals) and claims any now found. Runs after anything that changes those facts: completing a lesson,
 * submitting or being graded, gaining items. Never throws — a discovery must not break the action that
 * triggered it. Item rewards can complete an item set, so it re-checks (a few rounds at most).
 */
export async function checkDiscoveries(studentId: string): Promise<Discovery[]> {
    const found: Discovery[] = []
    try {
        for (let round = 0; round < 3; round++) {
            const courseIds = await enrolledCourseIds(studentId)
            if (!courseIds.length) break
            const db = supabaseAdmin()
            const [eggs, discovered] = await Promise.all([
                db.from('easter_eggs').select('*').in('course_id', courseIds).eq('active', true),
                db.from('egg_discoveries').select('egg_id').eq('student_id', studentId),
            ])
            const known = new Set(unwrap(discovered, 'load your discoveries').map((d) => d.egg_id))
            const candidates = unwrap(eggs, 'load secrets').filter(
                (e) => !known.has(e.id) && !MANUAL_TRIGGERS_SET.has(e.trigger),
            )
            if (!candidates.length) break

            const ctx = await buildTriggerContext(studentId, candidates)
            const due = candidates.filter((e) => evaluateTrigger(e.trigger, e.config, ctx))
            if (!due.length) break
            let gainedItems = false
            for (const egg of due) {
                const discovery = await claimEgg(studentId, egg)
                if (discovery) {
                    found.push(discovery)
                    gainedItems ||= discovery.items.length > 0
                }
            }
            if (!gainedItems) break
        }
        // Level, rank or discovery count may have changed: unlock any skills now earned
        await unlockSkills(studentId)
    } catch (error) {
        console.error('[secrets] discovery check failed', studentId, error)
    }
    return found
}

/** A student clicked a hidden object (`secret:KEY`) or reached a lesson section (`secret-seen:KEY`) */
export async function claimMarker(user: SessionUser, key: string): Promise<Discovery | null> {
    const db = supabaseAdmin()
    const egg = unwrapMaybe(
        await db.from('easter_eggs').select('*').eq('marker_key', key).eq('active', true).maybeSingle(),
        'look for the secret',
    )
    const notHere = () => new NotFoundError('Nothing here… this time.', 'SECRET_NOT_FOUND')
    if (!egg || !MANUAL_TRIGGERS_SET.has(egg.trigger) || egg.trigger === 'secret_phrase') throw notHere()

    // The marker must really be in a published lesson of a course the student is enrolled in
    const activityId = String(asObject(egg.config).activityId ?? '')
    const lesson = activityId
        ? unwrapMaybe(
              await db.from('activities').select('course_id, status, body').eq('id', activityId).maybeSingle(),
              'check the lesson',
          )
        : null
    if (
        !lesson ||
        lesson.status !== 'published' ||
        lesson.course_id !== egg.course_id ||
        !lesson.body.includes(key) ||
        !(await isEnrolled(user.id, egg.course_id))
    ) {
        throw notHere()
    }
    const discovery = await claimEgg(user.id, egg)
    if (discovery) {
        await unlockSkills(user.id)
        return discovery
    }
    return null
}

/** A student typed a phrase in their Codex. Every matching secret in their courses is found. */
export async function speakPhrase(user: SessionUser, phrase: string): Promise<Discovery[]> {
    const courseIds = await enrolledCourseIds(user.id)
    if (!courseIds.length) return []
    const eggs = unwrap(
        await supabaseAdmin()
            .from('easter_eggs')
            .select('*')
            .in('course_id', courseIds)
            .eq('active', true)
            .eq('trigger', 'secret_phrase'),
        'listen for secrets',
    )
    const matches = eggs.filter((e) => e.phrase_hash && e.phrase_hash === hashPhrase(e.id, phrase))
    const found: Discovery[] = []
    for (const egg of matches) {
        const discovery = await claimEgg(user.id, egg)
        if (discovery) found.push(discovery)
    }
    if (found.length) {
        await unlockSkills(user.id)
        found.push(...(await checkDiscoveries(user.id)))
    }
    return found
}

// ── Codex (the student's collection book) ─────────────────────────────────────────────────────────

export async function getCodex(user: SessionUser): Promise<Codex> {
    const db = supabaseAdmin()
    const courseIds = await enrolledCourseIds(user.id)
    const [courses, eggs, discoveries, items] = await Promise.all([
        courseIds.length ? db.from('courses').select('id, title').in('id', courseIds).order('title') : null,
        courseIds.length ? db.from('easter_eggs').select('*').in('course_id', courseIds) : null,
        db.from('egg_discoveries').select('egg_id, discovered_at').eq('student_id', user.id),
        db.from('item_definitions').select('id, name'),
    ])
    const found = new Map(
        unwrap(discoveries, 'load your discoveries').map((d) => [d.egg_id, new Date(d.discovered_at)]),
    )
    const itemNames = new Map(unwrap(items, 'load items').map((i) => [i.id, i.name]))
    const allEggs = eggs ? unwrap(eggs, 'load secrets') : []
    const rewardLabel = (r: EggReward) =>
        r.type === 'xp' ? `${r.amount} XP` : `${r.charges} × ${itemNames.get(r.itemId) ?? 'item'}`

    const result: Codex = { courses: [], totalDiscovered: 0, totalSecrets: 0 }
    for (const course of courses ? unwrap(courses, 'load your courses') : []) {
        // Inactive secrets stay in the book once found, and disappear from it otherwise
        const inCourse = allEggs.filter((e) => e.course_id === course.id && (e.active || found.has(e.id)))
        const discovered = inCourse
            .filter((e) => found.has(e.id))
            .map((e) => ({
                eggId: e.id,
                title: e.title,
                reveal: e.reveal,
                rarity: e.rarity,
                rewards: parseRewards(e.rewards).map((r) => ({ label: rewardLabel(r) })),
                discoveredAt: found.get(e.id)!,
            }))
            .sort((a, b) => b.discoveredAt.getTime() - a.discoveredAt.getTime())
        const undiscovered = inCourse
            .filter((e) => !found.has(e.id))
            .map((e) => ({ eggId: e.id, rarity: e.rarity, clue: e.clue_visible && e.clue ? e.clue : null }))
        if (!inCourse.length) continue
        result.courses.push({ courseId: course.id, courseTitle: course.title, discovered, undiscovered })
        result.totalDiscovered += discovered.length
        result.totalSecrets += inCourse.length
    }
    return result
}

// ── Teacher: the Easter egg editor ────────────────────────────────────────────────────────────────

const configActivityIds = (config: Record<string, unknown>): string[] => [
    ...(typeof config.activityId === 'string' ? [config.activityId] : []),
    ...(Array.isArray(config.activityIds) ? config.activityIds.map(String) : []),
]

/** Validates a secret's trigger settings and rewards against the course, items and XP rules */
async function validateEgg(user: SessionUser, courseId: string, input: SaveEggInput, existing: EggRow | null) {
    const parsed = EggConfigSchemas[input.trigger].safeParse(input.config)
    if (!parsed.success) {
        throw new DataError('Some of the trigger settings are missing or invalid.', 'INVALID_TRIGGER', {
            issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        })
    }
    const config = parsed.data as Record<string, unknown>
    const db = supabaseAdmin()

    const activityIds = [...new Set(configActivityIds(config))]
    if (activityIds.length) {
        const rows = unwrap(
            await db.from('activities').select('id, course_id, kind').in('id', activityIds),
            'check activities',
        )
        if (rows.length !== activityIds.length)
            throw new DataError('One of the chosen activities no longer exists.', 'INVALID_ACTIVITY')
        if (input.trigger === 'cross_course') {
            const courses = [...new Set(rows.map((r) => r.course_id))]
            const teaches = await Promise.all(courses.map((c) => isCourseTeacher(user, c)))
            if (teaches.includes(false))
                throw new DataError('Choose activities from courses you teach.', 'INVALID_ACTIVITY')
            if (courses.length < 2)
                throw new DataError(
                    'A cross-course challenge needs activities from at least two courses.',
                    'INVALID_ACTIVITY',
                )
            if (!courses.includes(courseId))
                throw new DataError('Include at least one activity from this course.', 'INVALID_ACTIVITY')
        } else if (rows.some((r) => r.course_id !== courseId)) {
            throw new DataError('Choose activities from this course.', 'INVALID_ACTIVITY')
        }
        if ((input.trigger === 'hidden_object' || input.trigger === 'lesson_section') && rows[0].kind !== 'lesson') {
            throw new DataError('Hidden markers go inside a lesson.', 'INVALID_ACTIVITY')
        }
    }

    const itemIds = [
        ...input.rewards.flatMap((r) => (r.type === 'item' ? [r.itemId] : [])),
        ...(input.trigger === 'item_combination' ? (config.items as { itemId: string }[]).map((i) => i.itemId) : []),
    ]
    const items = itemIds.length
        ? unwrap(
              await db
                  .from('item_definitions')
                  .select('id, effect')
                  .in('id', [...new Set(itemIds)]),
              'check items',
          )
        : []
    if (items.length !== new Set(itemIds).size)
        throw new DataError('One of the chosen items no longer exists.', 'INVALID_ITEM')
    for (const reward of input.rewards) {
        if (
            reward.type === 'item' &&
            items.find((i) => i.id === reward.itemId)?.effect === 'bunny_skip' &&
            reward.charges !== 1
        ) {
            throw new DataError('A secret can give one Easter Bunny at most.', 'INVALID_REWARD')
        }
    }

    const xp = input.rewards.reduce((sum, r) => sum + (r.type === 'xp' ? r.amount : 0), 0)
    const rule = (await getXpRules()).find((r) => r.source === 'secret_quest')
    if (xp && rule && (xp < rule.minXp || xp > rule.maxXp)) {
        throw new DataError(`Secret XP must be between ${rule.minXp} and ${rule.maxXp}.`, 'INVALID_REWARD')
    }

    if (input.trigger === 'secret_phrase' && !input.phrase && !existing?.phrase_hash) {
        throw new DataError('Choose the secret phrase students will type.', 'PHRASE_REQUIRED')
    }
    return config
}

async function requireEgg(user: SessionUser, eggId: string) {
    const egg = unwrapMaybe(
        await supabaseAdmin().from('easter_eggs').select('*').eq('id', eggId).maybeSingle(),
        'load the secret',
    )
    if (!egg) throw new NotFoundError('That secret doesn’t exist.', 'SECRET_NOT_FOUND')
    await requireCourseTeacher(user, egg.course_id)
    return egg
}

async function discoveryCounts(eggIds: string[]) {
    const counts = new Map<string, number>()
    if (!eggIds.length) return counts
    for (const row of unwrap(
        await supabaseAdmin().from('egg_discoveries').select('egg_id').in('egg_id', eggIds),
        'count discoveries',
    )) {
        counts.set(row.egg_id, (counts.get(row.egg_id) ?? 0) + 1)
    }
    return counts
}

export async function getCourseSecrets(user: SessionUser, courseId: string): Promise<EasterEgg[]> {
    await requireCourseTeacher(user, courseId)
    const rows = unwrap(
        await supabaseAdmin().from('easter_eggs').select('*').eq('course_id', courseId).order('created_at'),
        'load secrets',
    )
    const counts = await discoveryCounts(rows.map((r) => r.id))
    return rows.map((r) => mapEgg(r, counts.get(r.id) ?? 0))
}

const needsMarker = (trigger: SaveEggInput['trigger']) => trigger === 'hidden_object' || trigger === 'lesson_section'

export async function createSecret(user: SessionUser, courseId: string, input: SaveEggInput): Promise<EasterEgg> {
    await requireCourseTeacher(user, courseId)
    const config = await validateEgg(user, courseId, input, null)
    const db = supabaseAdmin()
    const row = unwrap(
        await db
            .from('easter_eggs')
            .insert({
                course_id: courseId,
                title: input.title,
                clue: input.clue,
                clue_visible: input.clueVisible,
                reveal: input.reveal,
                trigger: input.trigger,
                config: config as Json,
                rarity: input.rarity,
                rewards: input.rewards as unknown as Json,
                active: input.active,
                marker_key: needsMarker(input.trigger) ? newMarkerKey() : null,
                created_by: user.id,
            })
            .select('*')
            .single(),
        'create the secret',
    )
    // The phrase hash is salted with the egg's id, so it's written once the id exists
    if (input.trigger === 'secret_phrase' && input.phrase) {
        check(
            await db
                .from('easter_eggs')
                .update({ phrase_hash: hashPhrase(row.id, input.phrase) })
                .eq('id', row.id),
            'save the phrase',
        )
        row.phrase_hash = 'set'
    }
    await recordAudit(user.id, 'secret.created', 'easter_egg', row.id, { courseId, trigger: row.trigger })
    return mapEgg(row, 0)
}

export async function updateSecret(user: SessionUser, eggId: string, input: SaveEggInput): Promise<EasterEgg> {
    const existing = await requireEgg(user, eggId)
    const config = await validateEgg(
        user,
        existing.course_id,
        input,
        input.trigger === existing.trigger ? existing : null,
    )
    const row = unwrap(
        await supabaseAdmin()
            .from('easter_eggs')
            .update({
                title: input.title,
                clue: input.clue,
                clue_visible: input.clueVisible,
                reveal: input.reveal,
                trigger: input.trigger,
                config: config as Json,
                rarity: input.rarity,
                rewards: input.rewards as unknown as Json,
                active: input.active,
                // Keep the marker (it's already pasted into a lesson) unless the trigger no longer uses one
                marker_key: needsMarker(input.trigger) ? (existing.marker_key ?? newMarkerKey()) : null,
                phrase_hash:
                    input.trigger !== 'secret_phrase'
                        ? null
                        : input.phrase
                          ? hashPhrase(eggId, input.phrase)
                          : existing.phrase_hash,
            })
            .eq('id', eggId)
            .select('*')
            .single(),
        'update the secret',
    )
    await recordAudit(user.id, 'secret.updated', 'easter_egg', eggId, { trigger: row.trigger, active: row.active })
    return mapEgg(row, (await discoveryCounts([eggId])).get(eggId) ?? 0)
}

/** Deleting removes it from everyone's Codex; XP already earned stays in the ledger */
export async function deleteSecret(user: SessionUser, eggId: string) {
    const egg = await requireEgg(user, eggId)
    check(await supabaseAdmin().from('easter_eggs').delete().eq('id', eggId), 'delete the secret')
    await recordAudit(user.id, 'secret.deleted', 'easter_egg', eggId, { title: egg.title })
}
