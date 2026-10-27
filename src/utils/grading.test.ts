import { describe, expect, it } from 'vitest'
import { gradeAttempt, normalizeAnswer } from './grading'
import type { KeyedQuestion } from '@/@types/activities/Question'

const key = (k: Partial<KeyedQuestion['key']>): KeyedQuestion['key'] => ({
    correctOptionIds: [],
    acceptedAnswers: [],
    caseSensitive: false,
    explanation: '',
    rubric: '',
    ...k,
})

const single: KeyedQuestion = {
    id: 'q1',
    kind: 'single_choice',
    prompt: '2 + 2?',
    points: 1,
    position: 0,
    options: [
        { id: 'a', label: '3', position: 0 },
        { id: 'b', label: '4', position: 1 },
    ],
    key: key({ correctOptionIds: ['b'] }),
}

const multi: KeyedQuestion = {
    id: 'q2',
    kind: 'multiple_choice',
    prompt: 'Primes?',
    points: 2,
    position: 1,
    options: [
        { id: 'p2', label: '2', position: 0 },
        { id: 'p3', label: '3', position: 1 },
        { id: 'p4', label: '4', position: 2 },
    ],
    key: key({ correctOptionIds: ['p2', 'p3'] }),
}

const short: KeyedQuestion = {
    id: 'q3',
    kind: 'short_answer',
    prompt: 'Capital of France?',
    points: 1,
    position: 2,
    options: [],
    key: key({ acceptedAnswers: ['Paris'] }),
}

const numeric: KeyedQuestion = {
    ...short,
    id: 'q4',
    prompt: 'Half as a decimal',
    key: key({ acceptedAnswers: ['0.5'] }),
}

const answer = (questionId: string, selectedOptionIds: string[] = [], textAnswer: string | null = null) => ({
    questionId,
    selectedOptionIds,
    textAnswer,
})

describe('gradeAttempt', () => {
    it('scores a perfect attempt', () => {
        const result = gradeAttempt(
            [single, multi, short],
            [answer('q1', ['b']), answer('q2', ['p3', 'p2']), answer('q3', [], ' paris ')],
            60,
        )
        expect(result).toMatchObject({ score: 4, maxScore: 4, percent: 100, passed: true, needsReview: false })
        expect(result.responses.map((r) => r.outcome)).toEqual(['correct', 'correct', 'correct'])
    })

    it('marks unanswered questions incorrect', () => {
        const result = gradeAttempt([single, multi], [], 60)
        expect(result).toMatchObject({ score: 0, maxScore: 3, percent: 0, passed: false })
        expect(result.responses.every((r) => r.outcome === 'incorrect')).toBe(true)
    })

    it('grades multiple select all-or-nothing', () => {
        expect(gradeAttempt([multi], [answer('q2', ['p2'])], 60).score).toBe(0)
        expect(gradeAttempt([multi], [answer('q2', ['p2', 'p3', 'p4'])], 60).score).toBe(0)
        expect(gradeAttempt([multi], [answer('q2', ['p2', 'p3'])], 60).score).toBe(2)
    })

    it('rejects a single-choice answer with several options picked', () => {
        expect(gradeAttempt([single], [answer('q1', ['a', 'b'])], 60).score).toBe(0)
    })

    it('ignores option ids that belong to another question (tampering)', () => {
        const result = gradeAttempt([single], [answer('q1', ['p2', 'b'])], 60)
        expect(result.score).toBe(1)
        expect(result.responses[0].selectedOptionIds).toEqual(['b'])
    })

    it('ignores answers to questions that are not in the activity', () => {
        const result = gradeAttempt([single], [answer('q1', ['b']), answer('ghost', ['x'])], 60)
        expect(result.responses).toHaveLength(1)
    })

    it('normalises short answers and compares numbers by value', () => {
        expect(gradeAttempt([short], [answer('q3', [], 'PARIS')], 60).score).toBe(1)
        expect(gradeAttempt([short], [answer('q3', [], 'Par is')], 60).score).toBe(0)
        expect(gradeAttempt([numeric], [answer('q4', [], '.5')], 60).score).toBe(1)
        expect(gradeAttempt([numeric], [answer('q4', [], '0.50')], 60).score).toBe(1)
        expect(gradeAttempt([numeric], [answer('q4', [], '5')], 60).score).toBe(0)
    })

    it('respects case-sensitive answers', () => {
        const symbol = { ...short, id: 'q5', key: key({ acceptedAnswers: ['NaCl'], caseSensitive: true }) }
        expect(gradeAttempt([symbol], [answer('q5', [], 'NaCl')], 60).score).toBe(1)
        expect(gradeAttempt([symbol], [answer('q5', [], 'nacl')], 60).score).toBe(0)
    })

    it('passes exactly at the passing score and rounds to two decimals', () => {
        const three = [single, { ...single, id: 'x' }, { ...single, id: 'y' }]
        const result = gradeAttempt(three, [answer('q1', ['b']), answer('x', ['b'])], 66.67)
        expect(result.percent).toBe(66.67)
        expect(result.passed).toBe(true)
    })

    it('sends essays for review without scoring them', () => {
        const essay: KeyedQuestion = { ...short, id: 'e', kind: 'essay', points: 5 }
        const result = gradeAttempt([single, essay], [answer('q1', ['b']), answer('e', [], 'My essay')], 60)
        expect(result).toMatchObject({ score: 1, maxScore: 6, needsReview: true })
        expect(result.responses[1]).toMatchObject({
            outcome: 'pending_review',
            textAnswer: 'My essay',
            pointsAwarded: 0,
        })
    })
})

describe('normalizeAnswer', () => {
    it('collapses whitespace and case', () => {
        expect(normalizeAnswer('  Hello   World ', false)).toBe('hello world')
        expect(normalizeAnswer('  Hello   World ', true)).toBe('Hello World')
    })
})
