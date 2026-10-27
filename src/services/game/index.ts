import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import type {
    Inventory,
    ItemDefinition,
    ItemDefinitionInput,
    SkillBook,
    SkillDefinition,
    SkillEffect,
    UpdateSkillDefinitionInput,
    UseSkillInput,
} from '@/@types/game/Inventory'
import type { Codex, Discovery, EasterEgg, SaveEggInput } from '@/@types/game/Secrets'

/*
 * Inventory, skills and secrets. Every effect is decided by the server — these calls only say what the
 * student is trying to do (use a skill, spend an Easter Bunny, claim a marker, speak a phrase).
 */

export const inventoryUrl = '/me/inventory'
export const skillBookUrl = '/me/skills'
export const codexUrl = '/me/codex'
export const itemDefinitionsUrl = '/items'
export const skillDefinitionsUrl = '/admin/skills'
export const getCourseSecretsUrl = (courseId: string) => `/courses/${courseId}/secrets`

// ── Inventory ──

export const apiGetInventory = async (): Promise<Inventory> => {
    const inventory = await api.fetchJson<Inventory>({ method: 'get', url: inventoryUrl })
    return {
        ...inventory,
        history: inventory.history.map((h) => ({ ...h, createdAt: tryParseDate(h.createdAt) as Date })),
    }
}

export const useSWRInventory = (config?: SWRConfiguration<Inventory>) => useSWR(inventoryUrl, apiGetInventory, config)

/** Spends one Easter Bunny on a question of the open attempt; returns the charges left */
export const apiBunnySkip = (attemptId: string, questionId: string) =>
    api.fetchJson<{ charges: number; alreadySkipped: boolean }>({
        method: 'post',
        url: `/attempts/${attemptId}/skip`,
        data: { questionId },
    })

// ── Skills ──

export const apiGetSkillBook = async (): Promise<SkillBook> => {
    const book = await api.fetchJson<SkillBook>({ method: 'get', url: skillBookUrl })
    return {
        skills: book.skills.map((s) => ({
            ...s,
            unlockedAt: tryParseDate(s.unlockedAt),
            nextChargeAt: tryParseDate(s.nextChargeAt),
            recentUses: s.recentUses.map((u) => ({ ...u, createdAt: tryParseDate(u.createdAt) as Date })),
        })),
    }
}

export const useSWRSkillBook = (config?: SWRConfiguration<SkillBook>) => useSWR(skillBookUrl, apiGetSkillBook, config)

export const apiUseSkill = async (input: UseSkillInput): Promise<SkillEffect> => {
    const effect = await api.fetchJson<SkillEffect>({ method: 'post', url: '/skills/use', data: input })
    return effect.kind === 'time_dilation' ? { ...effect, expiresAt: tryParseDate(effect.expiresAt) as Date } : effect
}

// ── Secrets ──

const ensureCodex = (codex: Codex): Codex => ({
    ...codex,
    courses: codex.courses.map((c) => ({
        ...c,
        discovered: c.discovered.map((d) => ({ ...d, discoveredAt: tryParseDate(d.discoveredAt) as Date })),
    })),
})

export const apiGetCodex = async () => ensureCodex(await api.fetchJson<Codex>({ method: 'get', url: codexUrl }))

export const useSWRCodex = (config?: SWRConfiguration<Codex>) => useSWR(codexUrl, apiGetCodex, config)

/** A hidden object clicked (or a hidden section reached) in a lesson. null if already found. */
export const apiClaimMarker = async (key: string) =>
    (await api.fetchJson<{ discovery: Discovery | null }>({ method: 'post', url: '/secrets/marker', data: { key } }))
        .discovery

export const apiSpeakPhrase = async (phrase: string) =>
    (await api.fetchJson<{ discoveries: Discovery[] }>({ method: 'post', url: '/secrets/phrase', data: { phrase } }))
        .discoveries

// ── Teacher: Easter egg editor ──

const ensureEgg = (egg: EasterEgg): EasterEgg => ({ ...egg, createdAt: tryParseDate(egg.createdAt) as Date })

export const apiGetCourseSecrets = async (courseId: string) =>
    (await api.fetchJson<EasterEgg[]>({ method: 'get', url: getCourseSecretsUrl(courseId) })).map(ensureEgg)

export const useSWRCourseSecrets = (courseId: string | null, config?: SWRConfiguration<EasterEgg[]>) =>
    useSWR(courseId ? getCourseSecretsUrl(courseId) : null, () => apiGetCourseSecrets(courseId!), config)

export const apiCreateSecret = async (courseId: string, input: SaveEggInput) =>
    ensureEgg(await api.fetchJson<EasterEgg>({ method: 'post', url: getCourseSecretsUrl(courseId), data: input }))

export const apiUpdateSecret = async (eggId: string, input: SaveEggInput) =>
    ensureEgg(await api.fetchJson<EasterEgg>({ method: 'put', url: `/secrets/${eggId}`, data: input }))

export const apiDeleteSecret = (eggId: string) => api.fetchJson<void>({ method: 'delete', url: `/secrets/${eggId}` })

// ── Item & skill definitions ──

export const apiGetItemDefinitions = () => api.fetchJson<ItemDefinition[]>({ method: 'get', url: itemDefinitionsUrl })

export const useSWRItemDefinitions = (config?: SWRConfiguration<ItemDefinition[]>) =>
    useSWR(itemDefinitionsUrl, apiGetItemDefinitions, config)

export const apiCreateItem = (input: ItemDefinitionInput) =>
    api.fetchJson<ItemDefinition>({ method: 'post', url: itemDefinitionsUrl, data: input })

export const apiUpdateItem = (itemId: string, input: ItemDefinitionInput) =>
    api.fetchJson<ItemDefinition>({ method: 'put', url: `${itemDefinitionsUrl}/${itemId}`, data: input })

export const apiGetSkillDefinitions = () =>
    api.fetchJson<SkillDefinition[]>({ method: 'get', url: skillDefinitionsUrl })

export const useSWRSkillDefinitions = (config?: SWRConfiguration<SkillDefinition[]>) =>
    useSWR(skillDefinitionsUrl, apiGetSkillDefinitions, config)

export const apiUpdateSkill = (skillId: string, input: UpdateSkillDefinitionInput) =>
    api.fetchJson<SkillDefinition>({ method: 'put', url: `${skillDefinitionsUrl}/${skillId}`, data: input })
