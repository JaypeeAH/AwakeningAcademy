import type { KeyedQuestion } from '@/@types/activities/Question'
import type { ResponseRecord } from '@/@types/attempts/Attempt'
import type { ResponseInput } from '@/@types/attempts/AttemptSchema'

/*
 * Automatic grading, run on the server only (the browser never sees answer keys).
 *   single_choice / true_false  — correct when exactly the right option is chosen
 *   multiple_choice             — all-or-nothing: every correct option and no incorrect one
 *   short_answer                — matches any accepted answer after normalising case/spacing;
 *                                 numeric answers compare by value ("0.5" = ".5" = "0.50"; fractions are not evaluated)
 *   essay / file_upload         — left for the teacher (pending_review, 0 points until graded)
 * Unanswered questions are incorrect. Options that don't belong to the question are ignored. Questions
 * skipped with an Easter Bunny score 'skipped' and are left out of the maximum.
 */

export interface GradeResult {
    responses: ResponseRecord[]
    score: number
    maxScore: number
    /** 0–100, two decimals */
    percent: number
    passed: boolean
    /** true when some answers need a teacher (essays) before the grade is final */
    needsReview: boolean
}

export const normalizeAnswer = (value: string, caseSensitive: boolean) => {
    const collapsed = value.normalize('NFKC').trim().replace(/\s+/g, ' ')
    return caseSensitive ? collapsed : collapsed.toLowerCase()
}

const NUMERIC = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i

const answersMatch = (given: string, accepted: string, caseSensitive: boolean) => {
    const a = normalizeAnswer(given, caseSensitive)
    const b = normalizeAnswer(accepted, caseSensitive)
    if (a === b) return true
    const plainA = a.replace(/,/g, '')
    const plainB = b.replace(/,/g, '')
    return NUMERIC.test(plainA) && NUMERIC.test(plainB) && Number(plainA) === Number(plainB)
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id))

export function gradeAttempt(
    questions: KeyedQuestion[],
    inputs: ResponseInput[],
    passingScore: number,
    /** Questions the student skipped with an Easter Bunny (read from the attempt on the server) */
    skippedQuestionIds: string[] = [],
): GradeResult {
    const byQuestion = new Map(inputs.map((r) => [r.questionId, r]))
    let score = 0
    let maxScore = 0
    let needsReview = false

    const responses = questions.map((question): ResponseRecord => {
        // Skipped: 0 points, left out of the maximum, never correct — whatever the browser sent
        if (skippedQuestionIds.includes(question.id)) {
            return {
                questionId: question.id,
                selectedOptionIds: [],
                textAnswer: null,
                outcome: 'skipped',
                pointsAwarded: 0,
                feedback: '',
            }
        }
        maxScore += question.points
        const input = byQuestion.get(question.id)
        const validOptionIds = new Set(question.options.map((o) => o.id))
        const selected = [...new Set((input?.selectedOptionIds ?? []).filter((id) => validOptionIds.has(id)))]
        const text = input?.textAnswer?.trim() ? input.textAnswer.trim() : null

        let correct = false
        switch (question.kind) {
            case 'single_choice':
            case 'true_false':
                correct = selected.length === 1 && question.key.correctOptionIds.includes(selected[0])
                break
            case 'multiple_choice':
                correct = selected.length > 0 && sameSet(selected, question.key.correctOptionIds)
                break
            case 'short_answer':
                correct =
                    text !== null &&
                    question.key.acceptedAnswers.some((accepted) =>
                        answersMatch(text, accepted, question.key.caseSensitive),
                    )
                break
            case 'essay':
            case 'file_upload':
                // A teacher grades these (files are attached to the attempt separately; text is an optional note)
                needsReview = true
                return {
                    questionId: question.id,
                    selectedOptionIds: [],
                    textAnswer: text,
                    outcome: 'pending_review',
                    pointsAwarded: 0,
                    feedback: '',
                }
        }

        if (correct) score += question.points
        return {
            questionId: question.id,
            selectedOptionIds: selected,
            textAnswer: question.kind === 'short_answer' ? text : null,
            outcome: correct ? 'correct' : 'incorrect',
            pointsAwarded: correct ? question.points : 0,
            feedback: '',
        }
    })

    const percent = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0
    return { responses, score, maxScore, percent, passed: percent >= passingScore, needsReview }
}
