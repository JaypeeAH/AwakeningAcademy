import { describe, expect, it } from 'vitest'
import { applyManualGrades, GradeError, outcomeForPoints } from './manualGrading'
import { checkUpload, safeFileName, sniffFileFamily } from './fileTypes'
import { canRevealAnswers } from './feedback'
import { ATTEMPT_GRACE_SECONDS, formatCountdown, isPastGrace, secondsRemaining } from './timing'
import { copyBankQuestion } from './questionBank'
import { gradeAttempt } from './grading'
import type { ResponseRecord } from '@/@types/attempts/Attempt'
import type { KeyedQuestion } from '@/@types/activities/Question'

const response = (questionId: string, outcome: ResponseRecord['outcome'], pointsAwarded = 0): ResponseRecord => ({
    questionId,
    selectedOptionIds: [],
    textAnswer: null,
    outcome,
    pointsAwarded,
    feedback: '',
})

describe('manual grading', () => {
    const questions = [
        { id: 'mc', points: 2 },
        { id: 'essay', points: 6 },
        { id: 'upload', points: 2 },
    ]
    const submitted = [
        response('mc', 'correct', 2),
        response('essay', 'pending_review'),
        response('upload', 'pending_review'),
    ]

    it('keeps the attempt pending until every answer is marked', () => {
        const result = applyManualGrades({
            questions,
            responses: submitted,
            grades: [{ questionId: 'essay', pointsAwarded: 4, feedback: ' Good argument ' }],
            passingScore: 60,
        })
        expect(result.pending).toBe(1)
        expect(result.responses.find((r) => r.questionId === 'essay')).toMatchObject({
            outcome: 'partial',
            pointsAwarded: 4,
            feedback: 'Good argument',
        })
    })

    it('totals marks across auto- and teacher-graded answers', () => {
        const result = applyManualGrades({
            questions,
            responses: submitted,
            grades: [
                { questionId: 'essay', pointsAwarded: 4, feedback: '' },
                { questionId: 'upload', pointsAwarded: 2, feedback: '' },
            ],
            passingScore: 60,
        })
        expect(result).toMatchObject({ score: 8, maxScore: 10, percent: 80, passed: true, pending: 0 })
    })

    it('lets a teacher override an auto-graded answer (re-grade can go down)', () => {
        const result = applyManualGrades({
            questions,
            responses: [
                response('mc', 'correct', 2),
                response('essay', 'correct', 6),
                response('upload', 'correct', 2),
            ],
            grades: [{ questionId: 'mc', pointsAwarded: 0, feedback: 'Read the question again' }],
            passingScore: 90,
        })
        expect(result).toMatchObject({ score: 8, percent: 80, passed: false })
    })

    it('rejects marks out of range or for other questions', () => {
        const run = (questionId: string, pointsAwarded: number) => () =>
            applyManualGrades({
                questions,
                responses: submitted,
                grades: [{ questionId, pointsAwarded, feedback: '' }],
                passingScore: 60,
            })
        expect(run('essay', 7)).toThrow(GradeError)
        expect(run('essay', -1)).toThrow(GradeError)
        expect(run('ghost', 1)).toThrow(GradeError)
    })

    it('maps points to outcomes', () => {
        expect([outcomeForPoints(0, 5), outcomeForPoints(3, 5), outcomeForPoints(5, 5)]).toEqual([
            'incorrect',
            'partial',
            'correct',
        ])
    })

    it('auto-grading sends essays and uploads for review with no points', () => {
        const key = {
            correctOptionIds: [],
            acceptedAnswers: [],
            caseSensitive: false,
            explanation: '',
            rubric: 'Mentions photosynthesis',
        }
        const essay: KeyedQuestion = {
            id: 'e',
            kind: 'essay',
            prompt: 'Explain',
            points: 5,
            position: 0,
            options: [],
            key,
        }
        const upload: KeyedQuestion = { ...essay, id: 'u', kind: 'file_upload' }
        const result = gradeAttempt(
            [essay, upload],
            [{ questionId: 'e', selectedOptionIds: [], textAnswer: 'Plants…' }],
            60,
        )
        expect(result.needsReview).toBe(true)
        expect(result.responses.map((r) => r.outcome)).toEqual(['pending_review', 'pending_review'])
        expect(result.score).toBe(0)
    })
})

describe('file uploads', () => {
    const bytes = (...values: number[]) => new Uint8Array(values)
    const text = (s: string) => new TextEncoder().encode(s)
    const PDF = text('%PDF-1.7\n...')
    const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0)
    const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0)

    it('recognises real files by their bytes', () => {
        expect(sniffFileFamily(PDF)).toBe('pdf')
        expect(sniffFileFamily(PNG)).toBe('png')
        expect(sniffFileFamily(ZIP)).toBe('zip')
        expect(sniffFileFamily(text('My essay notes'))).toBe('text')
    })

    it('accepts allowed files whose bytes match the extension', () => {
        expect(checkUpload('report.pdf', PDF, 1000)).toEqual({
            ok: true,
            contentType: 'application/pdf',
            extension: 'pdf',
        })
        expect(checkUpload('essay.docx', ZIP, 1000)).toMatchObject({ ok: true })
    })

    it('rejects disguised, dangerous, empty and oversized files', () => {
        expect(checkUpload('photo.png', PDF, 1000)).toMatchObject({ ok: false })
        expect(checkUpload('page.txt', text('<html><script>alert(1)</script>'), 1000)).toMatchObject({ ok: false })
        expect(checkUpload('drawing.svg', text('<svg/>'), 1000)).toMatchObject({ ok: false })
        expect(checkUpload('virus.exe', bytes(0x4d, 0x5a), 1000)).toMatchObject({ ok: false })
        expect(checkUpload('empty.pdf', new Uint8Array(), 1000)).toMatchObject({ ok: false })
        expect(checkUpload('big.pdf', PDF, 5)).toMatchObject({ ok: false })
    })

    it('makes safe storage names', () => {
        expect(safeFileName('../../My Essay (final)!.PDF')).toBe('My-Essay-final.pdf')
        expect(safeFileName('.pdf')).toBe('file.pdf')
    })
})

describe('feedback modes', () => {
    const due = new Date('2026-11-01T00:00:00Z')
    it('reveals answers according to the mode', () => {
        expect(canRevealAnswers('immediate', null)).toBe(true)
        expect(canRevealAnswers('score_only', null)).toBe(false)
        expect(canRevealAnswers('after_due', due, { now: new Date('2026-10-31T23:59:00Z') })).toBe(false)
        expect(canRevealAnswers('after_due', due, { now: new Date('2026-11-01T00:00:01Z') })).toBe(true)
        expect(canRevealAnswers('after_due', null)).toBe(false)
    })
    it('always shows teachers', () => {
        expect(canRevealAnswers('score_only', null, { isTeacher: true })).toBe(true)
    })
})

describe('timing', () => {
    const expires = new Date('2026-10-27T10:00:00Z')
    it('allows the grace period after the deadline', () => {
        expect(isPastGrace(expires, new Date(expires.getTime() + (ATTEMPT_GRACE_SECONDS - 1) * 1000))).toBe(false)
        expect(isPastGrace(expires, new Date(expires.getTime() + (ATTEMPT_GRACE_SECONDS + 1) * 1000))).toBe(true)
        expect(isPastGrace(null)).toBe(false)
    })
    it('counts down in whole seconds', () => {
        expect(secondsRemaining(expires, new Date('2026-10-27T09:58:30.200Z'))).toBe(90)
        expect(secondsRemaining(expires, new Date('2026-10-27T10:05:00Z'))).toBe(0)
        expect(formatCountdown(90)).toBe('01:30')
        expect(formatCountdown(3725)).toBe('1:02:05')
    })
})

describe('question bank', () => {
    it('copies with fresh ids and remapped correct answers', () => {
        let n = 0
        const copy = copyBankQuestion(
            {
                kind: 'single_choice',
                prompt: 'Pick b',
                points: 1,
                options: [
                    { id: 'a', label: 'A' },
                    { id: 'b', label: 'B' },
                ],
                key: {
                    correctOptionIds: ['b'],
                    acceptedAnswers: [],
                    caseSensitive: false,
                    explanation: 'B!',
                    rubric: '',
                },
            },
            () => `new-${++n}`,
        )
        expect(copy.options.map((o) => o.id)).toEqual(['new-1', 'new-2'])
        expect(copy.key.correctOptionIds).toEqual(['new-2'])
        expect(copy.id).toBe('new-3')
    })
})
