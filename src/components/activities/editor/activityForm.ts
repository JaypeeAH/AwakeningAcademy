import { toDateTimeLocalValue } from '@/utils/dates'
import { DEFAULT_BOSS } from '@/utils/boss'
import { TRUE_FALSE_LABELS, isManuallyGraded, type QuestionKind } from '@/@types/activities/Question'
import type { ActivityEditorData } from '@/@types/activities/ActivityEditor'
import type { SaveActivityInput, QuestionInput } from '@/@types/activities/ActivitySchema'
import type { ActivityFormData, QuestionFormData } from '@/@types/activities/forms/ActivityFormData'

/* Conversions between the editor's server data, the form, and the save request. */

export const toFormData = ({ activity, questions }: ActivityEditorData): ActivityFormData => ({
    title: activity.title,
    summary: activity.summary,
    body: activity.body,
    objectives: activity.objectives.map((text) => ({ text })),
    moduleId: activity.moduleId ?? '',
    difficulty: activity.difficulty,
    xpReward: activity.xpReward,
    estimatedMinutes: activity.estimatedMinutes,
    opensAt: toDateTimeLocalValue(activity.opensAt),
    dueAt: toDateTimeLocalValue(activity.dueAt),
    maxAttempts: activity.maxAttempts,
    timeLimitMinutes: activity.timeLimitMinutes,
    passingScore: activity.passingScore,
    feedbackMode: activity.feedbackMode,
    allowSkills: activity.allowSkills,
    allowBunnySkips: activity.allowBunnySkips,
    xpRepeatable: activity.xpRepeatable,
    prerequisiteIds: activity.prerequisiteIds,
    boss: activity.boss ?? DEFAULT_BOSS,
    teamConfig: activity.teamConfig ?? { activityIds: [], required: 'all' },
    questions: questions.map((q) => ({
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        points: q.points,
        phase: q.phase ?? 1,
        options: q.options.map((o) => ({ id: o.id, label: o.label })),
        key: {
            correctOptionIds: q.key.correctOptionIds,
            acceptedAnswers:
                q.kind === 'short_answer' && q.key.acceptedAnswers.length === 0 ? [''] : q.key.acceptedAnswers,
            caseSensitive: q.key.caseSensitive,
            explanation: q.key.explanation,
            rubric: q.key.rubric,
        },
    })),
})

/** Form question → request question (blank accepted answers dropped; teacher-graded kinds carry no answers) */
export const toQuestionInput = (q: QuestionFormData): QuestionInput => {
    const manual = isManuallyGraded(q.kind)
    return {
        ...q,
        options: manual ? [] : q.options,
        key: {
            ...q.key,
            correctOptionIds: manual ? [] : q.key.correctOptionIds,
            acceptedAnswers: manual ? [] : q.key.acceptedAnswers.map((a) => a.trim()).filter(Boolean),
        },
    }
}

/** A question (e.g. copied from the bank) as a form row */
export const questionInputToForm = (q: QuestionInput): QuestionFormData => ({
    id: q.id,
    kind: q.kind as QuestionKind,
    prompt: q.prompt,
    points: q.points,
    phase: q.phase ?? 1,
    options: q.options.map((o) => ({ id: o.id, label: o.label })),
    key: {
        correctOptionIds: q.key.correctOptionIds,
        acceptedAnswers: q.kind === 'short_answer' && q.key.acceptedAnswers.length === 0 ? [''] : q.key.acceptedAnswers,
        caseSensitive: q.key.caseSensitive,
        explanation: q.key.explanation,
        rubric: q.key.rubric,
    },
})

export const toSaveInput = (form: ActivityFormData): SaveActivityInput => ({
    title: form.title,
    summary: form.summary,
    body: form.body,
    objectives: form.objectives.map((o) => o.text.trim()).filter(Boolean),
    moduleId: form.moduleId || null,
    difficulty: form.difficulty,
    xpReward: form.xpReward,
    estimatedMinutes: form.estimatedMinutes,
    opensAt: form.opensAt ? new Date(form.opensAt) : null,
    dueAt: form.dueAt ? new Date(form.dueAt) : null,
    maxAttempts: form.maxAttempts,
    timeLimitMinutes: form.timeLimitMinutes,
    passingScore: form.passingScore,
    feedbackMode: form.feedbackMode,
    allowSkills: form.allowSkills,
    allowBunnySkips: form.allowBunnySkips,
    xpRepeatable: form.xpRepeatable,
    prerequisiteIds: form.prerequisiteIds,
    questions: form.questions.map(toQuestionInput),
    boss: form.boss,
    // An empty selection is saved as "not set yet" (the publish checklist asks for it)
    teamConfig: form.teamConfig.activityIds.length ? form.teamConfig : null,
})

const newId = () => crypto.randomUUID()

/** A fresh question of a kind, ready to edit */
export function newQuestion(kind: QuestionKind): QuestionFormData {
    const base = {
        id: newId(),
        kind,
        prompt: '',
        points: 1,
        phase: 1,
        key: { correctOptionIds: [], acceptedAnswers: [], caseSensitive: false, explanation: '', rubric: '' },
    }
    switch (kind) {
        case 'essay':
            return { ...base, points: 5, options: [] }
        case 'file_upload':
            return { ...base, points: 5, options: [] }
        case 'true_false':
            return { ...base, options: TRUE_FALSE_LABELS.map((label) => ({ id: newId(), label })) }
        case 'short_answer':
            return { ...base, options: [], key: { ...base.key, acceptedAnswers: [''] } }
        case 'multiple_choice':
            return { ...base, options: [0, 1, 2].map(() => ({ id: newId(), label: '' })) }
        default:
            return { ...base, options: [0, 1].map(() => ({ id: newId(), label: '' })) }
    }
}

/**
 * Switch a question's kind, keeping what still makes sense: prompt, points, explanation and rubric always;
 * choice options between choice kinds. Teacher-graded kinds (essay, file upload) have no options or answers.
 */
export function convertQuestion(q: QuestionFormData, kind: QuestionKind): QuestionFormData {
    if (q.kind === kind) return q
    const fresh = newQuestion(kind)
    const keep = { id: q.id, prompt: q.prompt, points: q.points }
    const { explanation, rubric } = q.key
    if ((kind === 'single_choice' || kind === 'multiple_choice') && q.options.length && q.kind !== 'true_false') {
        const correct = kind === 'single_choice' ? q.key.correctOptionIds.slice(0, 1) : q.key.correctOptionIds
        return { ...q, ...keep, kind, key: { ...q.key, correctOptionIds: correct, explanation, rubric } }
    }
    return { ...fresh, ...keep, key: { ...fresh.key, explanation, rubric } }
}

/** A copy with new ids (correct answers re-pointed at the copied options) */
export function duplicateQuestion(q: QuestionFormData): QuestionFormData {
    const idMap = new Map(q.options.map((o) => [o.id, newId()]))
    return {
        ...q,
        id: newId(),
        options: q.options.map((o) => ({ ...o, id: idMap.get(o.id)! })),
        key: {
            ...q.key,
            correctOptionIds: q.key.correctOptionIds.map((id) => idMap.get(id)).filter((id): id is string => !!id),
        },
    }
}

/** DOM id of the element to focus for a publish-checklist target */
export const issueTargetElementId = (target: string) =>
    (
        ({
            title: 'activity-title',
            body: 'activity-body',
            xpReward: 'activity-xp',
            dueAt: 'activity-due',
            questions: 'questions-section',
            boss: 'boss-section',
            teamConfig: 'team-section',
        }) as Record<string, string>
    )[target] ?? `question-${target}`
