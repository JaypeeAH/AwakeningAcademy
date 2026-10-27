import type { Enums } from '@/@types/supabase/database.types'
import type { NavigationIconKey } from '@/configs/icons.config'
import type { XpSource } from '@/@types/progression/Progression'

export type ActivityKind = Enums<'activity_kind'>
export type PublishStatus = Enums<'publish_status'>

export const activityKindLabel: Record<ActivityKind, string> = {
    lesson: 'Lesson',
    practice_quiz: 'Practice quiz',
    quiz: 'Quiz',
    exam: 'Exam',
    homework: 'Homework',
    boss_battle: 'Boss battle',
    team_quest: 'Team quest',
    secret_quest: 'Secret quest',
}

export const activityKindDescription: Partial<Record<ActivityKind, string>> = {
    lesson: 'Reading and media. Completing it earns XP once.',
    practice_quiz: 'Low-stakes practice: unlimited attempts, answers shown, doesn’t count toward mastery.',
    quiz: 'Graded quiz that counts toward mastery and rank promotion.',
    exam: 'Formal assessment: limited attempts, can be timed, answers hidden by default, counts toward mastery.',
    homework: 'Work students hand in — written answers and file uploads that you grade. Counts toward mastery.',
    boss_battle: 'A big multi-topic challenge in phases, presented as a fight. High XP; counts toward mastery.',
    team_quest:
        'A guild goal: completes when enough guild members finish the activities you choose. Everyone shares the XP.',
}

/** The kinds the Quest Builder offers (secret quests are made in the Secrets tab instead) */
export const AUTHORABLE_KINDS: ActivityKind[] = [
    'lesson',
    'practice_quiz',
    'quiz',
    'exam',
    'homework',
    'boss_battle',
    'team_quest',
]

/** Kinds that have questions and attempts */
export const ASSESSMENT_KINDS: ActivityKind[] = ['practice_quiz', 'quiz', 'exam', 'homework', 'boss_battle']

/** Kinds that count toward mastery (rank gates, class titles). Must match public.mastery_stats(). */
export const GRADED_KINDS: ActivityKind[] = ['quiz', 'exam', 'homework', 'boss_battle']

export const isAssessment = (kind: ActivityKind) => ASSESSMENT_KINDS.includes(kind)

export const activityKindXpSource: Record<ActivityKind, XpSource> = {
    lesson: 'lesson_completion',
    practice_quiz: 'quiz_completion',
    quiz: 'quiz_completion',
    exam: 'exam_completion',
    homework: 'homework_completion',
    boss_battle: 'boss_battle',
    team_quest: 'team_quest',
    secret_quest: 'secret_quest',
}

export const activityKindIcon: Record<ActivityKind, NavigationIconKey> = {
    lesson: 'lesson',
    practice_quiz: 'practice',
    quiz: 'quiz',
    exam: 'exam',
    homework: 'homework',
    boss_battle: 'boss',
    team_quest: 'team',
    secret_quest: 'secret',
}

export const activityKindTagClass: Record<ActivityKind, string> = {
    lesson: 'bg-info-subtle text-info border-transparent',
    practice_quiz: 'bg-gray-100 text-gray-600 border-transparent dark:bg-gray-700 dark:text-gray-200',
    quiz: 'bg-primary-subtle text-primary border-transparent',
    exam: 'bg-warning-subtle text-warning border-transparent',
    homework: 'bg-success-subtle text-success border-transparent',
    boss_battle: 'bg-error-subtle text-error border-transparent',
    team_quest: 'bg-success-subtle text-success border-transparent',
    secret_quest: 'bg-gold-subtle text-gold border-transparent',
}

export const publishStatusLabel: Record<PublishStatus, string> = {
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
}

export const publishStatusTagClass: Record<PublishStatus, string> = {
    draft: 'bg-gray-100 text-gray-600 border-transparent dark:bg-gray-700 dark:text-gray-200',
    published: 'bg-success-subtle text-success border-transparent',
    archived: 'bg-warning-subtle text-warning border-transparent',
}

export const DIFFICULTY_LABELS = ['Novice', 'Apprentice', 'Adept', 'Expert', 'Legendary'] as const
