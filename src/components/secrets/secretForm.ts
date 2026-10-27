import { z } from 'zod'
import type { EasterEgg, EggTrigger, SaveEggInput } from '@/@types/game/Secrets'

/*
 * The Easter egg editor's form. Every trigger's settings live side by side as flat fields (so switching
 * trigger doesn't lose what was typed); toSaveEggInput builds the one `config` the chosen trigger needs.
 * The server validates everything again (activities in the course, items exist, XP limits).
 */

const TRIGGERS = [
    'hidden_object',
    'lesson_section',
    'secret_phrase',
    'activity_sequence',
    'score_milestone',
    'streak_milestone',
    'item_combination',
    'cross_course',
    'class_goal',
] as const satisfies readonly EggTrigger[]

export const SecretFormSchema = z
    .object({
        title: z.string().trim().min(2, 'Give the secret a name').max(120),
        clue: z.string().trim().max(500),
        clueVisible: z.boolean(),
        reveal: z.string().trim().max(5000),
        rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary']),
        active: z.boolean(),
        trigger: z.enum(TRIGGERS),
        /** Blank when editing keeps the current phrase */
        phrase: z.string().trim().max(100),
        hasPhrase: z.boolean(),
        /** hidden_object, lesson_section, class_goal; optional for score_milestone */
        activityId: z.string().nullable(),
        /** activity_sequence (in order) and cross_course */
        activityIds: z.array(z.string()),
        minPercent: z.number().int().min(1, '1–100').max(100, '1–100'),
        count: z.number().int().min(1, 'At least 1').max(50, 'At most 50'),
        days: z.number().int().min(2, 'At least 2 days').max(365, 'At most 365 days'),
        students: z.number().int().min(2, 'At least 2 students').max(500, 'At most 500'),
        items: z.array(
            z.object({ itemId: z.string().min(1, 'Choose an item'), count: z.number().int().min(1).max(99) }),
        ),
        xp: z.number().int().min(0, 'No negative XP').max(100000).nullable(),
        itemRewards: z.array(
            z.object({ itemId: z.string().min(1, 'Choose an item'), charges: z.number().int().min(1).max(10) }),
        ),
    })
    .superRefine((form, ctx) => {
        const need = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
        switch (form.trigger) {
            case 'hidden_object':
            case 'lesson_section':
                if (!form.activityId) need('activityId', 'Choose the lesson the marker goes in')
                break
            case 'class_goal':
                if (!form.activityId) need('activityId', 'Choose the activity the class completes')
                break
            case 'secret_phrase':
                // Blank keeps an existing phrase; a new secret needs one
                if (form.phrase ? form.phrase.length < 3 : !form.hasPhrase) {
                    need('phrase', 'Use at least 3 characters')
                }
                break
            case 'activity_sequence':
                if (form.activityIds.length < 2 || form.activityIds.length > 10)
                    need('activityIds', 'Choose 2–10 activities')
                break
            case 'cross_course':
                if (form.activityIds.length < 2 || form.activityIds.length > 10)
                    need('activityIds', 'Choose 2–10 activities')
                break
            case 'item_combination':
                if (!form.items.length || form.items.length > 6) need('items', 'Choose 1–6 items')
                break
        }
    })

export type SecretFormData = z.infer<typeof SecretFormSchema>

export const emptySecretForm = (): SecretFormData => ({
    title: '',
    clue: '',
    clueVisible: true,
    reveal: '',
    rarity: 'rare',
    active: true,
    trigger: 'hidden_object',
    phrase: '',
    hasPhrase: false,
    activityId: null,
    activityIds: [],
    minPercent: 90,
    count: 1,
    days: 5,
    students: 10,
    items: [],
    xp: 50,
    itemRewards: [],
})

const str = (v: unknown) => (typeof v === 'string' ? v : null)
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)

export function secretToForm(egg: EasterEgg): SecretFormData {
    const c = egg.config
    const base = emptySecretForm()
    const xp = egg.rewards.reduce((sum, r) => sum + (r.type === 'xp' ? r.amount : 0), 0)
    return {
        ...base,
        title: egg.title,
        clue: egg.clue,
        clueVisible: egg.clueVisible,
        reveal: egg.reveal,
        rarity: egg.rarity,
        active: egg.active,
        trigger: egg.trigger,
        hasPhrase: egg.hasPhrase,
        activityId: str(c.activityId),
        activityIds: Array.isArray(c.activityIds)
            ? c.activityIds.filter((id): id is string => typeof id === 'string')
            : [],
        minPercent: num(c.minPercent, base.minPercent),
        count: num(c.count, base.count),
        days: num(c.days, base.days),
        students: num(c.students, base.students),
        items: Array.isArray(c.items)
            ? c.items.flatMap((i) =>
                  i && typeof i === 'object' && typeof (i as { itemId?: unknown }).itemId === 'string'
                      ? [{ itemId: (i as { itemId: string }).itemId, count: num((i as { count?: unknown }).count, 1) }]
                      : [],
              )
            : [],
        xp: xp || null,
        itemRewards: egg.rewards.flatMap((r) => (r.type === 'item' ? [{ itemId: r.itemId, charges: r.charges }] : [])),
    }
}

function buildConfig(form: SecretFormData): Record<string, unknown> {
    switch (form.trigger) {
        case 'hidden_object':
        case 'lesson_section':
            return { activityId: form.activityId }
        case 'secret_phrase':
            return {}
        case 'activity_sequence':
        case 'cross_course':
            return { activityIds: form.activityIds }
        case 'score_milestone':
            return { activityId: form.activityId, minPercent: form.minPercent, count: form.activityId ? 1 : form.count }
        case 'streak_milestone':
            return { days: form.days }
        case 'item_combination':
            return { items: form.items }
        case 'class_goal':
            return { activityId: form.activityId, students: form.students }
    }
}

export function toSaveEggInput(form: SecretFormData): SaveEggInput {
    return {
        title: form.title,
        clue: form.clue,
        clueVisible: form.clueVisible,
        reveal: form.reveal,
        trigger: form.trigger,
        config: buildConfig(form),
        phrase: form.trigger === 'secret_phrase' && form.phrase ? form.phrase : undefined,
        rarity: form.rarity,
        active: form.active,
        rewards: [
            ...(form.xp ? [{ type: 'xp' as const, amount: form.xp }] : []),
            ...form.itemRewards.map((r) => ({ type: 'item' as const, itemId: r.itemId, charges: r.charges })),
        ],
    }
}
