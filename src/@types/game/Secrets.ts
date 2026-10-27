import { z } from 'zod'
import type { Enums } from '@/@types/supabase/database.types'
import type { Rarity } from './Inventory'
import type { RewardSummary } from '@/@types/progression/Progression'

export type EggTrigger = Enums<'egg_trigger'>

export const eggTriggerLabel: Record<EggTrigger, string> = {
    hidden_object: 'Hidden object in a lesson (click to find)',
    lesson_section: 'Reach a section of a lesson',
    secret_phrase: 'Secret phrase',
    activity_sequence: 'Complete activities in order',
    score_milestone: 'Score milestone',
    streak_milestone: 'Learning streak',
    item_combination: 'Collect a set of items',
    cross_course: 'Cross-course challenge',
    class_goal: 'Class-wide goal',
}

export const eggTriggerHelp: Record<EggTrigger, string> = {
    hidden_object: 'A small glowing mark hidden in a lesson. Students who notice it and click it find the secret.',
    lesson_section: 'An invisible mark in a lesson. Students find the secret when they read far enough to reach it.',
    secret_phrase:
        'Students type a phrase in their Codex. Only its fingerprint is stored — not even teachers can read it back.',
    activity_sequence: 'Found by completing the chosen activities in this order.',
    score_milestone: 'Found by scoring at least this much on an activity (or on several graded ones).',
    streak_milestone: 'Found by learning on this many days in a row.',
    item_combination: 'Found by holding these items at the same time (they are not used up).',
    cross_course: 'Found by completing activities across two or more of your courses.',
    class_goal: 'Unlocks for everyone who helped once enough of the class completes an activity.',
}

/** Triggers found by a student action (a click, scrolling, a phrase) rather than checked automatically */
export const MANUAL_TRIGGERS: EggTrigger[] = ['hidden_object', 'lesson_section', 'secret_phrase']

// ── Trigger settings (validated on save; never sent to students) ──

const uuid = z.string().uuid()

export const EggConfigSchemas = {
    hidden_object: z.object({ activityId: uuid }),
    lesson_section: z.object({ activityId: uuid }),
    secret_phrase: z.object({}),
    activity_sequence: z.object({ activityIds: z.array(uuid).min(2).max(10) }),
    score_milestone: z.object({
        /** One activity, or any graded activities in the course when omitted */
        activityId: uuid.nullable().default(null),
        minPercent: z.number().int().min(1).max(100),
        count: z.number().int().min(1).max(50).default(1),
    }),
    streak_milestone: z.object({ days: z.number().int().min(2).max(365) }),
    item_combination: z.object({
        items: z
            .array(z.object({ itemId: uuid, count: z.number().int().min(1).max(99) }))
            .min(1)
            .max(6),
    }),
    cross_course: z.object({ activityIds: z.array(uuid).min(2).max(10) }),
    class_goal: z.object({ activityId: uuid, students: z.number().int().min(2).max(500) }),
} satisfies Record<EggTrigger, z.ZodTypeAny>

export type EggConfig<T extends EggTrigger = EggTrigger> = z.infer<(typeof EggConfigSchemas)[T]>

export const EggRewardSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('xp'), amount: z.number().int().min(1).max(100000) }),
    z.object({ type: z.literal('item'), itemId: uuid, charges: z.number().int().min(1).max(10) }),
])
export type EggReward = z.infer<typeof EggRewardSchema>

/** POST/PUT /api/courses/[courseId]/secrets — the teacher's Easter egg editor */
export const SaveEggSchema = z.object({
    title: z.string().trim().min(2, 'Give the secret a name').max(120),
    clue: z.string().trim().max(500).default(''),
    clueVisible: z.boolean().default(true),
    reveal: z.string().trim().max(5000).default(''),
    trigger: z.enum([
        'hidden_object',
        'lesson_section',
        'secret_phrase',
        'activity_sequence',
        'score_milestone',
        'streak_milestone',
        'item_combination',
        'cross_course',
        'class_goal',
    ]),
    config: z.record(z.string(), z.unknown()).default({}),
    /** secret_phrase only; omit when editing to keep the current phrase */
    phrase: z.string().trim().min(3, 'Use at least 3 characters').max(100).optional(),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']).default('rare'),
    rewards: z.array(EggRewardSchema).max(5).default([]),
    active: z.boolean().default(true),
})
export type SaveEggInput = z.infer<typeof SaveEggSchema>

/** A secret as its teacher sees it */
export interface EasterEgg {
    id: string
    courseId: string
    title: string
    clue: string
    clueVisible: boolean
    reveal: string
    trigger: EggTrigger
    config: Record<string, unknown>
    hasPhrase: boolean
    /** hidden_object / lesson_section: paste `[✦](secret:KEY)` into the lesson */
    markerKey: string | null
    rarity: Rarity
    rewards: EggReward[]
    active: boolean
    discoveredCount: number
    createdAt: Date
}

// ── Student side ──

/** A discovery the student has made — everything is revealed */
export interface CodexEntry {
    eggId: string
    title: string
    reveal: string
    rarity: Rarity
    rewards: { label: string }[]
    discoveredAt: Date
}

/** A secret not yet found — no title, trigger or reward; the clue only if the teacher shows it */
export interface CodexSilhouette {
    eggId: string
    rarity: Rarity
    clue: string | null
}

export interface CodexCourse {
    courseId: string
    courseTitle: string
    discovered: CodexEntry[]
    undiscovered: CodexSilhouette[]
}

export interface Codex {
    courses: CodexCourse[]
    totalDiscovered: number
    totalSecrets: number
}

/** What a student sees the moment they find something */
export interface Discovery {
    eggId: string
    title: string
    reveal: string
    rarity: Rarity
    items: { name: string; charges: number }[]
    reward: RewardSummary | null
}

export const ClaimMarkerSchema = z.object({ key: z.string().regex(/^[A-Za-z0-9]{8,32}$/) })
export const SpeakPhraseSchema = z.object({ phrase: z.string().trim().min(1).max(100) })
