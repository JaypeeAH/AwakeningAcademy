import { z } from 'zod'
import type { Enums } from '@/@types/supabase/database.types'
import type { ActivityKind } from '@/@types/activities/ActivityKindOptions'

export type Rarity = Enums<'rarity'>
export type ItemKind = Enums<'item_kind'>

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

export const rarityLabel: Record<Rarity, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
}

/** Tag classes per rarity (gold is kept for the rarest) */
export const rarityTagClass: Record<Rarity, string> = {
    common: 'bg-gray-100 text-gray-600 border-transparent dark:bg-gray-700 dark:text-gray-200',
    uncommon: 'bg-success-subtle text-success border-transparent',
    rare: 'bg-primary-subtle text-primary border-transparent',
    epic: 'bg-error-subtle text-error border-transparent',
    legendary: 'bg-gold-subtle text-gold border-transparent',
}

export interface ItemDefinition {
    id: string
    code: string
    name: string
    description: string
    kind: ItemKind
    rarity: Rarity
    /** What using it does (only the Easter Bunny's skip today) */
    effect: 'bunny_skip' | null
    sortOrder: number
}

export interface InventoryEntry {
    item: ItemDefinition
    charges: number
}

export interface InventoryTransaction {
    id: number
    itemName: string
    delta: number
    balanceAfter: number
    reason: string
    createdAt: Date
}

export interface Inventory {
    items: InventoryEntry[]
    history: InventoryTransaction[]
}

// ── Skills ──

export interface SkillDefinition {
    id: string
    code: string
    name: string
    description: string
    rarity: Rarity
    minLevel: number
    minRankOrder: number
    minDiscoveries: number
    charges: number
    rechargeHours: number
    eligibleKinds: ActivityKind[]
    allowedInFormal: boolean
    requiresTeacherPermission: boolean
    affectsScore: boolean
    affectsXp: boolean
    passive: boolean
    config: Record<string, unknown>
    enabled: boolean
    sortOrder: number
}

export interface SkillRequirement {
    label: string
    met: boolean
}

/** A skill as one student sees it */
export interface PlayerSkill {
    skill: SkillDefinition
    unlocked: boolean
    unlockedAt: Date | null
    requirements: SkillRequirement[]
    chargesLeft: number
    /** When the next charge comes back (null when full) */
    nextChargeAt: Date | null
    recentUses: { id: number; createdAt: Date; context: string | null }[]
}

export interface SkillBook {
    skills: PlayerSkill[]
}

/** What an activated skill revealed or changed */
export type SkillEffect =
    | { kind: 'insight'; removedOptionId: string }
    | { kind: 'knowledge_echo'; activityId: string; title: string; summary: string }
    | { kind: 'time_dilation'; minutes: number; expiresAt: Date }
    | { kind: 'second_chance'; activityId: string }
    | { kind: 'overdrive'; bonusXp: number }
    | { kind: 'dungeon_sense'; eggTitle: string; clue: string; courseTitle: string }

// ── Requests ──

/** Skills that act inside an open attempt */
export type AttemptSkillCode = 'insight' | 'knowledge_echo' | 'time_dilation'

/** What the student can bring to an attempt: Easter Bunnies and in-attempt skills, and what's been used */
export interface AttemptPowers {
    allowBunnySkips: boolean
    bunnyCharges: number
    skippedQuestionIds: string[]
    /** Insight: question id → option ids removed */
    removedOptions: Record<string, string[]>
    /** Knowledge Echo: question id → the lesson it points back to */
    echoes: Record<string, { activityId: string; title: string; summary: string }>
    /** Unlocked skills usable on this attempt, with charges left (0 = recharging) */
    skills: { code: AttemptSkillCode; name: string; description: string; chargesLeft: number }[]
}

/** Skills offered on a quest's briefing page (null when locked or not allowed there) */
export interface QuestSkills {
    /** Arm before a quest you haven't completed: bonus XP when you pass it */
    overdrive: { armed: boolean; bonusXp: number; chargesLeft: number } | null
    /** Offered once every attempt is used: one extra attempt */
    secondChance: { chargesLeft: number } | null
}

export const UseSkillSchema = z.object({
    skill: z.enum(['insight', 'knowledge_echo', 'time_dilation', 'second_chance', 'overdrive', 'dungeon_sense']),
    activityId: z.string().uuid().optional(),
    attemptId: z.string().uuid().optional(),
    questionId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
})
export type UseSkillInput = z.infer<typeof UseSkillSchema>

export const BunnySkipSchema = z.object({ questionId: z.string().uuid() })

// ── Administration ──

export const ItemDefinitionSchema = z.object({
    code: z
        .string()
        .trim()
        .regex(/^[a-z0-9_]{2,40}$/, 'Use 2–40 lowercase letters, numbers or underscores'),
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(500).default(''),
    kind: z.enum(['consumable', 'collectible']),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
    sortOrder: z.number().int().min(0).max(1000).default(0),
})
export type ItemDefinitionInput = z.infer<typeof ItemDefinitionSchema>

export const UpdateSkillDefinitionSchema = z.object({
    name: z.string().trim().min(2).max(60),
    description: z.string().trim().max(500),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
    minLevel: z.number().int().min(1).max(500),
    minRankOrder: z.number().int().min(1).max(20),
    minDiscoveries: z.number().int().min(0).max(1000),
    charges: z.number().int().min(1).max(20),
    rechargeHours: z.number().int().min(1).max(720),
    enabled: z.boolean(),
    /** Numbers only (minutes for Time Dilation, bonus XP for Overdrive) */
    config: z.record(z.string(), z.number().int().min(0).max(1000)).default({}),
})
export type UpdateSkillDefinitionInput = z.infer<typeof UpdateSkillDefinitionSchema>
