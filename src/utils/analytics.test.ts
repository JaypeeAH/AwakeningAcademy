import { describe, expect, it } from 'vitest'
import {
    missedQuestions,
    objectivePerformance,
    retryStats,
    scoreDistribution,
    UNTAGGED_OBJECTIVE,
    workStatus,
    xpBreakdown,
    type ResponseFact,
} from './analytics'

const r = (questionId: string, outcome: string, points: number, max = 2, objective = 'Fractions'): ResponseFact => ({
    questionId,
    activityId: 'quiz',
    objective,
    outcome,
    pointsAwarded: points,
    maxPoints: max,
})

describe('teacher analytics', () => {
    it('buckets scores into tens, with 100% in the top bucket', () => {
        const buckets = scoreDistribution([0, 9.9, 10, 55, 90, 100, NaN])
        expect(buckets.map((b) => b.count)).toEqual([2, 1, 0, 0, 0, 1, 0, 0, 0, 2])
        expect(buckets[9].label).toBe('90–100%')
    })

    it('scores objectives from marked answers only (skips and unmarked work never count as wrong)', () => {
        const result = objectivePerformance([
            r('q1', 'correct', 2),
            r('q1', 'incorrect', 0),
            r('q2', 'skipped', 0),
            r('q2', 'pending_review', 0),
            r('q3', 'partial', 1, 2, 'Decimals'),
            r('q4', 'correct', 3, 2, ''), // points can't exceed the maximum
        ])
        expect(result).toEqual([
            { objective: 'Fractions', earned: 2, possible: 4, percent: 50, responses: 2 },
            { objective: 'Decimals', earned: 1, possible: 2, percent: 50, responses: 1 },
            { objective: UNTAGGED_OBJECTIVE, earned: 2, possible: 2, percent: 100, responses: 1 },
        ])
    })

    it('lists the most-missed questions, counting skips separately and needing enough answers', () => {
        const questions = new Map([
            ['q1', { prompt: 'Q1', activityId: 'quiz', activityTitle: 'Quiz' }],
            ['q2', { prompt: 'Q2', activityId: 'quiz', activityTitle: 'Quiz' }],
            ['q3', { prompt: 'Q3', activityId: 'quiz', activityTitle: 'Quiz' }],
        ])
        const responses = [
            ...['incorrect', 'incorrect', 'correct', 'skipped'].map((o) => r('q1', o, 0)),
            ...['partial', 'partial', 'correct', 'correct'].map((o) => r('q2', o, 1)),
            ...['incorrect', 'incorrect'].map((o) => r('q3', o, 0)), // only 2 answers
        ]
        const missed = missedQuestions(responses, questions)
        expect(missed.map((m) => [m.questionId, m.incorrectRate, m.skipped])).toEqual([
            ['q1', 66.7, 1],
            ['q2', 25, 0],
        ])
    })

    it('finds overdue and incomplete work (graded work must be passed)', () => {
        const now = new Date('2026-11-10T00:00:00Z')
        const students = [
            { id: 'a', displayName: 'Ava' },
            { id: 'b', displayName: 'Ben' },
        ]
        const activities = [
            { id: 'hw', title: 'Homework', dueAt: new Date('2026-11-01T00:00:00Z'), graded: true },
            { id: 'lesson', title: 'Lesson', dueAt: new Date('2026-12-01T00:00:00Z'), graded: false },
        ]
        const { overdue, incomplete } = workStatus(
            activities,
            students,
            [
                { studentId: 'a', activityId: 'hw', passed: true },
                { studentId: 'b', activityId: 'hw', passed: false },
                { studentId: 'a', activityId: 'lesson', passed: false },
            ],
            now,
        )
        expect(overdue).toEqual([
            { activityId: 'hw', title: 'Homework', dueAt: activities[0].dueAt, students: [students[1]] },
        ])
        expect(incomplete.map((i) => [i.activityId, i.completed, i.total])).toEqual([
            ['hw', 1, 2],
            ['lesson', 1, 2],
        ])
    })

    it('reports retries only where someone tried more than once', () => {
        const stats = retryStats(
            [
                { studentId: 'a', activityId: 'q' },
                { studentId: 'a', activityId: 'q' },
                { studentId: 'a', activityId: 'q' },
                { studentId: 'b', activityId: 'q' },
                { studentId: 'a', activityId: 'once' },
            ],
            new Map([['q', 'Quiz']]),
        )
        expect(stats).toEqual([
            { activityId: 'q', title: 'Quiz', students: 2, attempts: 4, averageAttempts: 2, maxAttempts: 3 },
        ])
    })

    it('keeps bonus XP and adjustments apart from XP for finishing work', () => {
        expect(
            xpBreakdown([
                { source: 'quiz_completion', amount: 30 },
                { source: 'lesson_completion', amount: 20 },
                { source: 'high_score_bonus', amount: 20 },
                { source: 'secret_quest', amount: 50 },
                { source: 'streak', amount: 10 },
                { source: 'manual_adjustment', amount: -5 },
            ]),
        ).toEqual({
            academic: 50,
            bonus: [
                { source: 'secret_quest', amount: 50 },
                { source: 'high_score_bonus', amount: 20 },
                { source: 'streak', amount: 10 },
            ],
            bonusTotal: 80,
            adjustments: -5,
        })
    })
})
