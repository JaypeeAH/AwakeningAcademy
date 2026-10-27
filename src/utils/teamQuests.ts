import { TeamConfigSchema, type TeamConfig } from '@/@types/game/Guilds'

/*
 * Team quest decisions: a guild completes a team quest when enough of its active members have each
 * completed every target activity (graded ones must be passed). Pure and tested; the server then calls
 * public.complete_team_quest, which rewards every member once.
 */

export interface MemberCompletion {
    studentId: string
    activityId: string
    passed: boolean
    graded: boolean
}

export const parseTeamConfig = (raw: unknown): TeamConfig | null => {
    const parsed = TeamConfigSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
}

/** How many members must finish: everyone, or N (never more than the guild has) */
export const requiredMembers = (config: TeamConfig, memberCount: number) =>
    config.required === 'all' ? memberCount : Math.min(config.required, memberCount)

export function teamQuestProgress(config: TeamConfig, memberIds: string[], completions: MemberCompletion[]) {
    const counts = (c: MemberCompletion) => !c.graded || c.passed
    const members = memberIds.map((studentId) => {
        const done = config.activityIds.filter((activityId) =>
            completions.some((c) => c.studentId === studentId && c.activityId === activityId && counts(c)),
        ).length
        return { studentId, done, total: config.activityIds.length, complete: done === config.activityIds.length }
    })
    const required = requiredMembers(config, memberIds.length)
    const finished = members.filter((m) => m.complete).length
    // An empty guild never completes a quest
    return { members, required, finished, complete: memberIds.length > 0 && required > 0 && finished >= required }
}

export const teamQuestKey = (activityId: string, studentId: string) => `team:${activityId}:${studentId}`
