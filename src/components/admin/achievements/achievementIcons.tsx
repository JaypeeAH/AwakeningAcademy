export { ACHIEVEMENT_ICONS, achievementIcon } from '@/components/game/achievementIcons'
import type { AchievementCondition, AchievementConditionType } from '@/@types/game/Achievements'

/** "Complete 10 lessons"-style summary of a condition */
export function conditionSummary(condition: AchievementCondition): string {
    switch (condition.type) {
        case 'streak':
            return `Learn ${condition.days} days in a row`
        case 'level':
            return `Reach level ${condition.min}`
        case 'rank':
            return `Reach rank #${condition.min} on the ladder`
        case 'total_xp':
            return `Earn ${condition.min.toLocaleString()} XP in total`
        default:
            return `${CONDITION_NOUNS[condition.type]}: ${condition.min}`
    }
}

const CONDITION_NOUNS: Record<AchievementConditionType, string> = {
    lessons_completed: 'Lessons completed',
    assessments_passed: 'Graded activities passed',
    perfect_scores: '100% scores',
    bosses_defeated: 'Boss battles won',
    streak: 'Streak',
    team_quests: 'Team quests completed',
    discoveries: 'Secrets discovered',
    level: 'Level',
    rank: 'Rank',
    total_xp: 'Total XP',
    courses_joined: 'Courses joined',
}
