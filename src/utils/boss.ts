import { z } from 'zod'

/*
 * Boss battles: a graded assessment whose questions are grouped into phases, presented as a fight. The
 * boss's HP is driven only by the server-graded score, shown after hand-in — never during the attempt,
 * so it can't reveal which answers are right.
 */

export const MAX_BOSS_PHASES = 5

export const BossConfigSchema = z.object({
    name: z.string().trim().min(2, 'Name the boss').max(60),
    /** One title per phase; question.phase indexes into it (1-based) */
    phases: z.array(z.string().trim().min(1).max(60)).min(1).max(MAX_BOSS_PHASES),
})
export type BossConfig = z.infer<typeof BossConfigSchema>

export const DEFAULT_BOSS: BossConfig = { name: 'The Guardian', phases: ['Phase 1', 'Phase 2'] }

export const parseBossConfig = (raw: unknown): BossConfig | null => {
    const parsed = BossConfigSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
}

/** Boss HP left after a graded attempt (0 = defeated) */
export const bossHpLeft = (percent: number | null) => Math.max(0, Math.min(100, Math.round(100 - (percent ?? 0))))

/** Questions grouped by phase, in phase order (empty phases dropped; out-of-range phases clamp) */
export function groupByPhase<T extends { phase?: number }>(questions: T[], phaseCount: number) {
    const groups = new Map<number, T[]>()
    for (const q of questions) {
        const phase = Math.min(Math.max(q.phase ?? 1, 1), Math.max(phaseCount, 1))
        groups.set(phase, [...(groups.get(phase) ?? []), q])
    }
    return [...groups.entries()].sort(([a], [b]) => a - b).map(([phase, items]) => ({ phase, questions: items }))
}

/** Publish checks for a boss battle */
export function getBossIssues(boss: unknown, questions: { phase?: number }[]): string[] {
    const config = parseBossConfig(boss)
    if (!config) return ['Name the boss and its phases.']
    const issues: string[] = []
    if (questions.length < 2) issues.push('A boss battle needs at least two questions.')
    const used = new Set(questions.map((q) => q.phase ?? 1))
    config.phases.forEach((title, i) => {
        if (!used.has(i + 1)) issues.push(`“${title}” has no questions.`)
    })
    if (questions.some((q) => (q.phase ?? 1) > config.phases.length))
        issues.push('A question is in a phase that no longer exists.')
    return issues
}
