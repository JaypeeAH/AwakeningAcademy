import { isAssessment, type ActivityKind } from '@/@types/activities/ActivityKindOptions'
import { parseTeamConfig } from './teamQuests'
import { getBossIssues } from './boss'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'
import type { XpRule } from '@/@types/progression/Progression'
import type { FeedbackMode } from '@/utils/feedback'

/*
 * Rules an activity must meet. Drafts may be incomplete (teachers save as they go); publishing requires
 * everything a student needs. The Quest Builder shows these as a checklist; the server enforces them.
 */

export interface ActivityIssue {
    /** Question id, or a field name for activity-level issues */
    target: string
    message: string
}

export function getQuestionIssues(question: QuestionInput, index: number): ActivityIssue[] {
    const n = `Question ${index + 1}`
    const issues: ActivityIssue[] = []
    if (!question.prompt.trim()) issues.push({ target: question.id, message: `${n} has no question text.` })

    switch (question.kind) {
        case 'single_choice':
        case 'multiple_choice':
        case 'true_false': {
            if (question.options.length < 2)
                issues.push({ target: question.id, message: `${n} needs at least two options.` })
            if (question.options.some((o) => !o.label.trim()))
                issues.push({ target: question.id, message: `${n} has an empty option.` })
            const correct = question.key.correctOptionIds.filter((id) => question.options.some((o) => o.id === id))
            if (correct.length === 0)
                issues.push({ target: question.id, message: `${n} has no correct answer marked.` })
            else if (question.kind !== 'multiple_choice' && correct.length > 1) {
                issues.push({ target: question.id, message: `${n} can only have one correct answer.` })
            }
            break
        }
        case 'short_answer':
            if (question.key.acceptedAnswers.filter((a) => a.trim()).length === 0) {
                issues.push({ target: question.id, message: `${n} needs at least one accepted answer.` })
            }
            break
        // essay / file_upload: graded by the teacher; a rubric is recommended but optional
    }
    return issues
}

export function getPublishIssues(input: {
    kind: ActivityKind
    title: string
    body: string
    xpReward: number
    questions: QuestionInput[]
    xpRule: Pick<XpRule, 'minXp' | 'maxXp'> | null
    feedbackMode?: FeedbackMode
    dueAt?: Date | null
    boss?: unknown
    teamConfig?: unknown
}): ActivityIssue[] {
    const issues: ActivityIssue[] = []
    if (input.title.trim().length < 2) issues.push({ target: 'title', message: 'Give the activity a title.' })
    if (input.kind === 'lesson' && !input.body.trim())
        issues.push({ target: 'body', message: 'Write the lesson content.' })
    if (isAssessment(input.kind)) {
        if (input.questions.length === 0) issues.push({ target: 'questions', message: 'Add at least one question.' })
        input.questions.forEach((q, i) => issues.push(...getQuestionIssues(q, i)))
        input.questions.forEach((q, i) => {
            if (q.aiDraft) {
                issues.push({
                    target: q.id,
                    message: `Question ${i + 1} is an AI draft — check it and mark it reviewed.`,
                })
            }
        })
    }
    if (input.kind === 'boss_battle') {
        issues.push(...getBossIssues(input.boss, input.questions).map((message) => ({ target: 'boss', message })))
    }
    if (input.kind === 'team_quest' && !parseTeamConfig(input.teamConfig)) {
        issues.push({ target: 'teamConfig', message: 'Choose the activities the guild must complete.' })
    }
    if (input.feedbackMode === 'after_due' && !input.dueAt) {
        issues.push({ target: 'dueAt', message: 'Set a due date — answers are revealed after it.' })
    }
    if (input.xpRule && (input.xpReward < input.xpRule.minXp || input.xpReward > input.xpRule.maxXp)) {
        issues.push({
            target: 'xpReward',
            message: `XP must be between ${input.xpRule.minXp} and ${input.xpRule.maxXp} (set by your administrator).`,
        })
    }
    return issues
}
