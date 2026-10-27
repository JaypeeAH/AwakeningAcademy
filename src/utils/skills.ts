import type { ActivityKind } from '@/@types/activities/ActivityKindOptions'
import type { KeyedQuestion } from '@/@types/activities/Question'
import type { SkillDefinition, SkillRequirement } from '@/@types/game/Inventory'

/*
 * Skill decisions, pure and tested. The database (public.use_skill) re-checks eligibility and charges
 * under a lock; these give the UI the same answers and pick what a skill reveals.
 */

/** Kinds no skill may touch unless the skill is explicitly allowed in formal assessments */
export const FORMAL_KINDS: ActivityKind[] = ['exam', 'homework', 'boss_battle']

export function skillRequirements(
    skill: Pick<SkillDefinition, 'minLevel' | 'minRankOrder' | 'minDiscoveries'>,
    player: { level: number; rankOrder: number; rankCodeFor: (order: number) => string; discoveries: number },
): SkillRequirement[] {
    const list: SkillRequirement[] = [{ label: `Reach level ${skill.minLevel}`, met: player.level >= skill.minLevel }]
    if (skill.minRankOrder > 1) {
        list.push({
            label: `Reach ${player.rankCodeFor(skill.minRankOrder)}-Rank`,
            met: player.rankOrder >= skill.minRankOrder,
        })
    }
    if (skill.minDiscoveries > 0) {
        list.push({
            label: `Discover ${skill.minDiscoveries} ${skill.minDiscoveries === 1 ? 'secret' : 'secrets'}`,
            met: player.discoveries >= skill.minDiscoveries,
        })
    }
    return list
}

/** Charges left in the rolling window, and when the oldest use in it recharges */
export function skillCharges(
    skill: Pick<SkillDefinition, 'charges' | 'rechargeHours'>,
    usedAt: Date[],
    now: Date = new Date(),
): { chargesLeft: number; nextChargeAt: Date | null } {
    const windowMs = skill.rechargeHours * 3600_000
    const inWindow = usedAt
        .filter((d) => now.getTime() - d.getTime() < windowMs)
        .sort((a, b) => a.getTime() - b.getTime())
    const chargesLeft = Math.max(0, skill.charges - inWindow.length)
    return {
        chargesLeft,
        nextChargeAt: inWindow.length ? new Date(inWindow[0].getTime() + windowMs) : null,
    }
}

/** Can this skill be used on this activity at all (before charges)? Mirrors public.use_skill. */
export function skillAllowedOn(
    skill: Pick<
        SkillDefinition,
        'eligibleKinds' | 'allowedInFormal' | 'requiresTeacherPermission' | 'passive' | 'enabled'
    >,
    activity: { kind: ActivityKind; allowSkills: boolean },
): boolean {
    if (!skill.enabled || skill.passive) return false
    if (!skill.eligibleKinds.includes(activity.kind)) return false
    if (FORMAL_KINDS.includes(activity.kind) && !skill.allowedInFormal) return false
    if (skill.requiresTeacherPermission && !activity.allowSkills) return false
    return true
}

/**
 * Insight: one WRONG option to remove from a single/multiple-choice question (never a correct one, never
 * one already removed). Deterministic, so a retried request removes the same option. Null when nothing
 * can be removed (e.g. true/false, or only correct options left).
 */
export function pickInsightOption(question: KeyedQuestion, alreadyRemoved: string[] = []): string | null {
    if (question.kind !== 'single_choice' && question.kind !== 'multiple_choice') return null
    const wrong = question.options
        .filter((o) => !question.key.correctOptionIds.includes(o.id) && !alreadyRemoved.includes(o.id))
        .sort((a, b) => a.position - b.position)
    // Always leave at least two options standing
    const remaining = question.options.length - alreadyRemoved.length
    if (!wrong.length || remaining <= 2) return null
    return wrong[wrong.length - 1].id
}
