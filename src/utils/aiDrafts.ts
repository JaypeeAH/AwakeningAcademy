import { getQuestionIssues } from './activityValidation'
import { TRUE_FALSE_LABELS } from '@/@types/activities/Question'
import type { QuestionInput } from '@/@types/activities/ActivitySchema'
import type { AiDraftedQuestion } from '@/@types/ai/QuestionDrafts'

/*
 * Turning model output into Quest Builder questions. The model's output is never trusted: each draft is
 * normalised (fresh ids, clamped points, valid answer indexes, only the requested objectives) and any
 * that still fails the builder's own checks is dropped. Every kept question is flagged `aiDraft`, so it
 * can't be published until a teacher reviews it.
 */

const clean = (value: string, max: number) => value.replace(/\s+\n/g, '\n').trim().slice(0, max)

export function aiDraftToQuestion(
    draft: AiDraftedQuestion,
    allowedObjectives: string[],
    newId: () => string,
): QuestionInput | null {
    const prompt = clean(draft.prompt, 5000)
    if (!prompt) return null
    const isEssay = draft.kind === 'essay'
    const points = Math.min(Math.max(Math.round(draft.points) || 1, 1), isEssay ? 20 : 10)

    let labels: string[] = []
    if (draft.kind === 'true_false') labels = [...TRUE_FALSE_LABELS]
    else if (draft.kind === 'single_choice' || draft.kind === 'multiple_choice') {
        labels = [...new Set(draft.options.map((o) => clean(o, 1000)).filter(Boolean))].slice(0, 12)
    }
    const options = labels.map((label) => ({ id: newId(), label }))

    // Correct answers by position; for true/false, map the model's own option order onto True/False
    let correctIndexes = [...new Set(draft.correctOptionIndexes)].filter((i) => i >= 0 && i < draft.options.length)
    if (draft.kind === 'true_false') {
        const correctLabel = draft.options[correctIndexes[0] ?? -1]?.trim().toLowerCase()
        correctIndexes = correctLabel === 'false' ? [1] : correctLabel === 'true' ? [0] : []
    } else if (draft.kind !== 'single_choice' && draft.kind !== 'multiple_choice') {
        correctIndexes = []
    } else {
        // Indexes refer to the model's list; re-point them at the de-duplicated labels
        correctIndexes = [
            ...new Set(correctIndexes.map((i) => labels.indexOf(clean(draft.options[i], 1000))).filter((i) => i >= 0)),
        ]
    }
    if (draft.kind === 'single_choice') correctIndexes = correctIndexes.slice(0, 1)

    const objective =
        allowedObjectives.find((o) => o.trim().toLowerCase() === draft.objective.trim().toLowerCase()) ?? ''

    const question: QuestionInput = {
        id: newId(),
        kind: draft.kind,
        prompt,
        points,
        objective,
        aiDraft: true,
        options,
        key: {
            correctOptionIds: correctIndexes.map((i) => options[i].id),
            acceptedAnswers:
                draft.kind === 'short_answer'
                    ? [...new Set(draft.acceptedAnswers.map((a) => clean(a, 500)).filter(Boolean))].slice(0, 20)
                    : [],
            caseSensitive: false,
            explanation: clean(draft.explanation, 5000),
            rubric: isEssay ? clean(draft.rubric, 5000) : '',
        },
    }
    // Anything the builder would flag as broken (no correct answer, too few options…) is dropped
    return getQuestionIssues(question, 0).length ? null : question
}

export function aiDraftsToQuestions(
    drafts: AiDraftedQuestion[],
    allowedObjectives: string[],
    limit: number,
    newId: () => string,
) {
    return drafts
        .map((d) => aiDraftToQuestion(d, allowedObjectives, newId))
        .filter((q): q is QuestionInput => !!q)
        .slice(0, limit)
}

/** Lesson Markdown as plain text to draft from (images, videos and secret markers removed) */
export function markdownToSourceText(markdown: string) {
    return markdown
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)\]\((?:secret|secret-seen):[^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^>\s*\[!(?:note|tip|important|warning)\]\s*$/gim, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}
