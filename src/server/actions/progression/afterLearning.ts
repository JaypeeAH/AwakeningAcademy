import 'server-only'
import { recordLearning } from '@/server/actions/streaks'
import { checkTeamQuests } from '@/server/actions/teamQuests'
import { checkDiscoveries } from '@/server/actions/secrets'
import { checkAchievements } from '@/server/actions/achievements'
import type { LearningOutcome, StreakUpdate } from '@/@types/progression/Streak'

/**
 * Everything that follows a reward, in order: the learning day and streak (when the student actually
 * learned — not when a teacher grades later), team quests, secrets (which also unlocks skills) and
 * achievements last, so they see everything before them. Nothing here may break the action that
 * triggered it: each step logs and carries on.
 */
export async function afterLearning(studentId: string, { learned }: { learned: boolean }): Promise<LearningOutcome> {
    let streak: StreakUpdate | null = null
    if (learned) {
        try {
            streak = await recordLearning(studentId)
        } catch (error) {
            console.error('[streaks] could not record learning', studentId, error)
        }
    }
    const teamQuests = await checkTeamQuests(studentId)
    const discoveries = await checkDiscoveries(studentId)
    const achievements = await checkAchievements(studentId)
    return { discoveries, achievements, teamQuests, streak }
}
