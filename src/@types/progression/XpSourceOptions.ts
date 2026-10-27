import type { XpSource } from './Progression'

export const xpSourceLabel: Record<XpSource, string> = {
    lesson_completion: 'Lesson completed',
    quiz_completion: 'Quiz passed',
    exam_completion: 'Exam passed',
    high_score_bonus: 'High-score bonus',
    homework_completion: 'Homework completed',
    boss_battle: 'Boss battle won',
    secret_quest: 'Secret quest',
    streak: 'Learning streak',
    manual_adjustment: 'Adjustment',
    skill_bonus: 'Skill bonus',
    achievement: 'Achievement',
    team_quest: 'Team quest',
}

/** Sources an administrator can tune on the Progression page, in display order */
export const configurableXpSources: XpSource[] = [
    'lesson_completion',
    'quiz_completion',
    'exam_completion',
    'high_score_bonus',
    'homework_completion',
    'boss_battle',
    'secret_quest',
    'streak',
    'skill_bonus',
    'achievement',
    'team_quest',
]
