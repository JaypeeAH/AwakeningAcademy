import type { Enums } from '@/@types/supabase/database.types'

export type FeedbackMode = Enums<'feedback_mode'>

export const feedbackModeLabel: Record<FeedbackMode, string> = {
    immediate: 'Show answers straight after submitting',
    after_due: 'Show answers after the due date',
    score_only: 'Show the score only',
}

export const feedbackModeDescription: Record<FeedbackMode, string> = {
    immediate: 'Students see correct answers, explanations and rubrics as soon as their attempt is marked.',
    after_due:
        'Answers stay hidden until the due date passes, so students can’t share them with classmates who haven’t finished.',
    score_only: 'Students see their score and your feedback, but never the answers. Good for exams you reuse.',
}

/**
 * Whether a student may see the answer key (correct options, accepted answers, explanations, rubrics)
 * for a marked attempt. Teachers always can. Teacher feedback is always shown regardless of mode.
 */
export function canRevealAnswers(
    mode: FeedbackMode,
    dueAt: Date | null,
    { isTeacher = false, now = new Date() }: { isTeacher?: boolean; now?: Date } = {},
) {
    if (isTeacher) return true
    if (mode === 'immediate') return true
    if (mode === 'after_due') return !!dueAt && now.getTime() >= dueAt.getTime()
    return false
}
