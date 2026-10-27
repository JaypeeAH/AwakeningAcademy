import { EggConfigSchemas, MANUAL_TRIGGERS, type EggConfig, type EggTrigger } from '@/@types/game/Secrets'

/*
 * The Easter egg engine's decisions, kept pure so every trigger type is unit-tested. The server gathers
 * the student's facts (completions, active days, inventory, class progress), asks evaluateTrigger whether
 * a secret is now found, and only then calls public.claim_discovery (once per student per egg).
 */

export const MANUAL_TRIGGERS_SET: ReadonlySet<EggTrigger> = new Set(MANUAL_TRIGGERS)

export interface CompletionFact {
    activityId: string
    courseId: string
    completedAt: Date
    bestPercent: number | null
    passed: boolean
    graded: boolean
}

export interface TriggerContext {
    completions: CompletionFact[]
    /** Local calendar days (YYYY-MM-DD) the student learned on, any order */
    activeDays: string[]
    today: string
    /** item id → charges held */
    inventory: Record<string, number>
    /** activity id → number of students in the course who completed it (class goals) */
    classCompletions: Record<string, number>
}

/** Parses a stored config for its trigger; null if it no longer validates (the secret then never fires) */
export function parseEggConfig<T extends EggTrigger>(trigger: T, config: unknown): EggConfig<T> | null {
    const result = EggConfigSchemas[trigger].safeParse(config)
    return result.success ? (result.data as EggConfig<T>) : null
}

/** Days in a row ending today (or yesterday, so a streak isn't lost before today's learning) */
export function currentStreak(activeDays: string[], today: string): number {
    const days = new Set(activeDays)
    const step = (day: string, delta: number) => {
        const d = new Date(`${day}T00:00:00Z`)
        d.setUTCDate(d.getUTCDate() + delta)
        return d.toISOString().slice(0, 10)
    }
    let cursor = days.has(today) ? today : step(today, -1)
    let streak = 0
    while (days.has(cursor)) {
        streak++
        cursor = step(cursor, -1)
    }
    return streak
}

/**
 * Whether an automatically-checked secret is now found. Manual triggers (hidden objects, lesson
 * sections, phrases) are never satisfied here — they need the student's own action.
 */
export function evaluateTrigger(trigger: EggTrigger, rawConfig: unknown, ctx: TriggerContext): boolean {
    if (MANUAL_TRIGGERS.includes(trigger)) return false
    const done = (id: string) => ctx.completions.find((c) => c.activityId === id)
    const completedOk = (c: CompletionFact | undefined) => !!c && (!c.graded || c.passed)

    switch (trigger) {
        case 'activity_sequence': {
            const config = parseEggConfig('activity_sequence', rawConfig)
            if (!config) return false
            const steps = config.activityIds.map(done)
            if (!steps.every(completedOk)) return false
            // Each step completed no earlier than the one before it
            return steps.every((c, i) => i === 0 || c!.completedAt.getTime() >= steps[i - 1]!.completedAt.getTime())
        }
        case 'score_milestone': {
            const config = parseEggConfig('score_milestone', rawConfig)
            if (!config) return false
            const scored = ctx.completions.filter(
                (c) =>
                    (config.activityId ? c.activityId === config.activityId : c.graded) &&
                    c.bestPercent !== null &&
                    c.bestPercent >= config.minPercent,
            )
            return scored.length >= (config.activityId ? 1 : config.count)
        }
        case 'streak_milestone': {
            const config = parseEggConfig('streak_milestone', rawConfig)
            return !!config && currentStreak(ctx.activeDays, ctx.today) >= config.days
        }
        case 'item_combination': {
            const config = parseEggConfig('item_combination', rawConfig)
            return !!config && config.items.every((i) => (ctx.inventory[i.itemId] ?? 0) >= i.count)
        }
        case 'cross_course': {
            const config = parseEggConfig('cross_course', rawConfig)
            if (!config) return false
            const steps = config.activityIds.map(done)
            return steps.every(completedOk) && new Set(steps.map((c) => c!.courseId)).size >= 2
        }
        case 'class_goal': {
            const config = parseEggConfig('class_goal', rawConfig)
            // Only students who contributed (completed it themselves) share the discovery
            return (
                !!config &&
                completedOk(done(config.activityId)) &&
                (ctx.classCompletions[config.activityId] ?? 0) >= config.students
            )
        }
        default:
            return false
    }
}

/** Phrases match regardless of case, spacing and punctuation ("Open, Sesame!" = "open sesame") */
export const normalizePhrase = (phrase: string) =>
    phrase
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()

/** What a phrase is hashed from (the server hashes it with SHA-256; the egg id salts it) */
export const phraseHashInput = (eggId: string, phrase: string) => `${eggId}:${normalizePhrase(phrase)}`

/** Markdown teachers paste into a lesson for hidden objects and lesson sections */
export const markerSnippet = (trigger: EggTrigger, key: string) =>
    trigger === 'lesson_section' ? `[](secret-seen:${key})` : `[✦](secret:${key})`

/** Secret markers in lesson Markdown: `secret:KEY` (click) and `secret-seen:KEY` (reached) */
export const SECRET_LINK = /^secret(-seen)?:([A-Za-z0-9]{8,32})$/
