import { AchievementConditionSchema, type AchievementCondition, type PlayerStats } from '@/@types/game/Achievements'

/*
 * Achievement decisions, pure and tested. The server gathers PlayerStats after a reward, asks which
 * conditions are now met, and grants each through public.grant_achievement (once per student).
 */

/** The stat a condition reads, and the threshold it needs */
export function achievementProgress(condition: AchievementCondition, stats: PlayerStats) {
    const pick = (): [number, number] => {
        switch (condition.type) {
            case 'lessons_completed':
                return [stats.lessonsCompleted, condition.min]
            case 'assessments_passed':
                return [stats.assessmentsPassed, condition.min]
            case 'perfect_scores':
                return [stats.perfectScores, condition.min]
            case 'bosses_defeated':
                return [stats.bossesDefeated, condition.min]
            case 'streak':
                return [stats.bestStreak, condition.days]
            case 'team_quests':
                return [stats.teamQuests, condition.min]
            case 'discoveries':
                return [stats.discoveries, condition.min]
            case 'level':
                return [stats.level, condition.min]
            case 'rank':
                return [stats.rankOrder, condition.min]
            case 'total_xp':
                return [stats.totalXp, condition.min]
            case 'courses_joined':
                return [stats.coursesJoined, condition.min]
        }
    }
    const [current, target] = pick()
    return { current: Math.min(current, target), target }
}

/** Whether a stored condition is met; an invalid stored condition is never met */
export function evaluateAchievement(rawCondition: unknown, stats: PlayerStats): boolean {
    const parsed = AchievementConditionSchema.safeParse(rawCondition)
    if (!parsed.success) return false
    const { current, target } = achievementProgress(parsed.data, stats)
    return current >= target
}

export const parseCondition = (raw: unknown): AchievementCondition | null => {
    const parsed = AchievementConditionSchema.safeParse(raw)
    return parsed.success ? parsed.data : null
}

export const achievementKey = (achievementId: string, studentId: string) => `achievement:${achievementId}:${studentId}`
