import type { ResponseOutcome } from '@/@types/activities/Question'
import type { ResponseRecord } from '@/@types/attempts/Attempt'

/*
 * Applying a teacher's grades to a submitted attempt. Pure, so it is unit-tested and the totals sent to
 * public.grade_attempt (which re-checks them against the stored responses) are computed in one place.
 */

export interface TeacherGrade {
    questionId: string
    pointsAwarded: number
    feedback: string
}

export interface ManualGradeResult {
    responses: ResponseRecord[]
    score: number
    maxScore: number
    /** 0–100, two decimals */
    percent: number
    passed: boolean
    /** Answers still waiting for a teacher — the attempt stays "awaiting review", unrewarded */
    pending: number
}

export const outcomeForPoints = (points: number, max: number): ResponseOutcome =>
    points <= 0 ? 'incorrect' : points >= max ? 'correct' : 'partial'

export class GradeError extends Error {}

export function applyManualGrades(input: {
    questions: { id: string; points: number }[]
    responses: ResponseRecord[]
    grades: TeacherGrade[]
    passingScore: number
}): ManualGradeResult {
    const { questions, responses, grades, passingScore } = input
    const byQuestion = new Map(responses.map((r) => [r.questionId, r]))

    for (const grade of grades) {
        const question = questions.find((q) => q.id === grade.questionId)
        if (!question) throw new GradeError('A grade is for a question that isn’t in this attempt.')
        if (byQuestion.get(grade.questionId)?.outcome === 'skipped') {
            throw new GradeError('That question was skipped with an Easter Bunny, so it can’t be marked.')
        }
        if (!Number.isFinite(grade.pointsAwarded) || grade.pointsAwarded < 0 || grade.pointsAwarded > question.points) {
            throw new GradeError(`Points must be between 0 and ${question.points}.`)
        }
        const existing = byQuestion.get(grade.questionId)
        byQuestion.set(grade.questionId, {
            questionId: grade.questionId,
            selectedOptionIds: existing?.selectedOptionIds ?? [],
            textAnswer: existing?.textAnswer ?? null,
            outcome: outcomeForPoints(grade.pointsAwarded, question.points),
            pointsAwarded: grade.pointsAwarded,
            feedback: grade.feedback.trim(),
        })
    }

    // Totals follow the questions the attempt has responses for (questions added later don't count)
    const answered = questions.filter((q) => byQuestion.has(q.id))
    const merged = answered.map((q) => byQuestion.get(q.id)!)
    const score = Math.round(merged.reduce((sum, r) => sum + r.pointsAwarded, 0) * 100) / 100
    // Skipped questions (Easter Bunny) are left out of the maximum
    const maxScore = answered
        .filter((q) => byQuestion.get(q.id)?.outcome !== 'skipped')
        .reduce((sum, q) => sum + q.points, 0)
    const percent = maxScore > 0 ? Math.round((score / maxScore) * 10000) / 100 : 0
    return {
        responses: merged,
        score,
        maxScore,
        percent,
        passed: percent >= passingScore,
        pending: merged.filter((r) => r.outcome === 'pending_review').length,
    }
}
