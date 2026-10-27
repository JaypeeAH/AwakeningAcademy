import { describe, expect, it } from 'vitest'
import { currentStreak, evaluateTrigger, normalizePhrase, parseEggConfig, type TriggerContext } from './secrets'
import { pickInsightOption, skillAllowedOn, skillCharges, skillRequirements } from './skills'
import { gradeAttempt } from './grading'
import { applyManualGrades, GradeError } from './manualGrading'
import type { KeyedQuestion } from '@/@types/activities/Question'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'
const C = '00000000-0000-4000-8000-00000000000c'
const ITEM = '00000000-0000-4000-8000-0000000000f1'

const ctx = (over: Partial<TriggerContext> = {}): TriggerContext => ({
    completions: [],
    activeDays: [],
    today: '2026-10-28',
    inventory: {},
    classCompletions: {},
    ...over,
})
const done = (activityId: string, at: string, extra: Partial<TriggerContext['completions'][number]> = {}) => ({
    activityId,
    courseId: 'course-1',
    completedAt: new Date(at),
    bestPercent: null,
    passed: true,
    graded: false,
    ...extra,
})

describe('secret triggers', () => {
    it('never fires manual triggers automatically', () => {
        expect(evaluateTrigger('hidden_object', { activityId: A }, ctx())).toBe(false)
        expect(evaluateTrigger('secret_phrase', {}, ctx())).toBe(false)
    })

    it('activity sequence needs every step, in order', () => {
        const config = { activityIds: [A, B] }
        expect(evaluateTrigger('activity_sequence', config, ctx({ completions: [done(A, '2026-10-01')] }))).toBe(false)
        expect(
            evaluateTrigger(
                'activity_sequence',
                config,
                ctx({ completions: [done(A, '2026-10-01'), done(B, '2026-10-02')] }),
            ),
        ).toBe(true)
        expect(
            evaluateTrigger(
                'activity_sequence',
                config,
                ctx({ completions: [done(A, '2026-10-03'), done(B, '2026-10-02')] }),
            ),
        ).toBe(false)
    })

    it('a failed graded step does not count', () => {
        const config = { activityIds: [A, B] }
        const completions = [
            done(A, '2026-10-01'),
            done(B, '2026-10-02', { graded: true, passed: false, bestPercent: 30 }),
        ]
        expect(evaluateTrigger('activity_sequence', config, ctx({ completions }))).toBe(false)
    })

    it('score milestones on one activity or across graded work', () => {
        const one = { activityId: A, minPercent: 90, count: 1 }
        expect(
            evaluateTrigger(
                'score_milestone',
                one,
                ctx({ completions: [done(A, '2026-10-01', { bestPercent: 89.5, graded: true })] }),
            ),
        ).toBe(false)
        expect(
            evaluateTrigger(
                'score_milestone',
                one,
                ctx({ completions: [done(A, '2026-10-01', { bestPercent: 95, graded: true })] }),
            ),
        ).toBe(true)
        const many = { activityId: null, minPercent: 80, count: 2 }
        const completions = [
            done(A, '2026-10-01', { bestPercent: 85, graded: true }),
            done(B, '2026-10-02', { bestPercent: 81, graded: true }),
        ]
        expect(evaluateTrigger('score_milestone', many, ctx({ completions }))).toBe(true)
        expect(evaluateTrigger('score_milestone', { ...many, count: 3 }, ctx({ completions }))).toBe(false)
    })

    it('streaks count consecutive days ending today or yesterday', () => {
        expect(currentStreak(['2026-10-26', '2026-10-27', '2026-10-28'], '2026-10-28')).toBe(3)
        expect(currentStreak(['2026-10-26', '2026-10-27'], '2026-10-28')).toBe(2)
        expect(currentStreak(['2026-10-25', '2026-10-27'], '2026-10-28')).toBe(1)
        expect(currentStreak(['2026-10-20'], '2026-10-28')).toBe(0)
        expect(
            evaluateTrigger(
                'streak_milestone',
                { days: 3 },
                ctx({ activeDays: ['2026-10-26', '2026-10-27', '2026-10-28'] }),
            ),
        ).toBe(true)
    })

    it('item combinations need every item held (not used up)', () => {
        const config = { items: [{ itemId: ITEM, count: 2 }] }
        expect(evaluateTrigger('item_combination', config, ctx({ inventory: { [ITEM]: 1 } }))).toBe(false)
        expect(evaluateTrigger('item_combination', config, ctx({ inventory: { [ITEM]: 2 } }))).toBe(true)
    })

    it('cross-course challenges need two or more courses', () => {
        const config = { activityIds: [A, B] }
        const sameCourse = [done(A, '2026-10-01'), done(B, '2026-10-02')]
        expect(evaluateTrigger('cross_course', config, ctx({ completions: sameCourse }))).toBe(false)
        const twoCourses = [done(A, '2026-10-01'), done(B, '2026-10-02', { courseId: 'course-2' })]
        expect(evaluateTrigger('cross_course', config, ctx({ completions: twoCourses }))).toBe(true)
    })

    it('class goals reward contributors once the class reaches the target', () => {
        const config = { activityId: C, students: 3 }
        expect(
            evaluateTrigger(
                'class_goal',
                config,
                ctx({ completions: [done(C, '2026-10-01')], classCompletions: { [C]: 2 } }),
            ),
        ).toBe(false)
        expect(
            evaluateTrigger(
                'class_goal',
                config,
                ctx({ completions: [done(C, '2026-10-01')], classCompletions: { [C]: 3 } }),
            ),
        ).toBe(true)
        expect(evaluateTrigger('class_goal', config, ctx({ completions: [], classCompletions: { [C]: 30 } }))).toBe(
            false,
        )
    })

    it('invalid configs never fire', () => {
        expect(parseEggConfig('activity_sequence', { activityIds: [A] })).toBeNull()
        expect(evaluateTrigger('streak_milestone', { days: 'lots' }, ctx())).toBe(false)
    })

    it('phrases ignore case, spacing and punctuation', () => {
        expect(normalizePhrase('  Open,   Sesame! ')).toBe('open sesame')
        expect(normalizePhrase('Café')).toBe(normalizePhrase('café'))
    })
})

describe('skills', () => {
    const skill = {
        minLevel: 5,
        minRankOrder: 2,
        minDiscoveries: 1,
        charges: 2,
        rechargeHours: 24,
        eligibleKinds: ['practice_quiz' as const],
        allowedInFormal: false,
        requiresTeacherPermission: true,
        passive: false,
        enabled: true,
    }

    it('lists unlock requirements and which are met', () => {
        const reqs = skillRequirements(skill, { level: 6, rankOrder: 1, rankCodeFor: () => 'E', discoveries: 1 })
        expect(reqs.map((r) => [r.label, r.met])).toEqual([
            ['Reach level 5', true],
            ['Reach E-Rank', false],
            ['Discover 1 secret', true],
        ])
    })

    it('counts charges in a rolling window', () => {
        const now = new Date('2026-10-28T12:00:00Z')
        const used = [new Date('2026-10-28T10:00:00Z'), new Date('2026-10-27T13:00:00Z')] // 2 h and 23 h ago
        expect(skillCharges(skill, used, now).chargesLeft).toBe(0)
        expect(skillCharges(skill, used, now).nextChargeAt?.toISOString()).toBe('2026-10-28T13:00:00.000Z')
        expect(skillCharges(skill, [new Date('2026-10-26T10:00:00Z')], now)).toEqual({
            chargesLeft: 2,
            nextChargeAt: null,
        })
    })

    it('never applies to exams or activities that don’t allow skills', () => {
        expect(skillAllowedOn(skill, { kind: 'practice_quiz', allowSkills: true })).toBe(true)
        expect(skillAllowedOn(skill, { kind: 'practice_quiz', allowSkills: false })).toBe(false)
        expect(skillAllowedOn({ ...skill, eligibleKinds: ['exam'] }, { kind: 'exam', allowSkills: true })).toBe(false)
        expect(skillAllowedOn({ ...skill, passive: true }, { kind: 'practice_quiz', allowSkills: true })).toBe(false)
    })

    it('Insight removes a wrong option only, never below two options', () => {
        const key = { correctOptionIds: ['b'], acceptedAnswers: [], caseSensitive: false, explanation: '', rubric: '' }
        const q: KeyedQuestion = {
            id: 'q',
            kind: 'single_choice',
            prompt: '?',
            points: 1,
            position: 0,
            options: ['a', 'b', 'c', 'd'].map((id, position) => ({ id, label: id, position })),
            key,
        }
        const first = pickInsightOption(q)
        expect(first).not.toBe('b')
        const second = pickInsightOption(q, [first!])
        expect(second).not.toBe('b')
        expect(second).not.toBe(first)
        expect(pickInsightOption(q, [first!, second!])).toBeNull()
        expect(pickInsightOption({ ...q, kind: 'true_false' })).toBeNull()
    })
})

describe('Easter Bunny skips in grading', () => {
    const key = { correctOptionIds: ['b'], acceptedAnswers: [], caseSensitive: false, explanation: '', rubric: '' }
    const q = (id: string): KeyedQuestion => ({
        id,
        kind: 'single_choice',
        prompt: '?',
        points: 1,
        position: 0,
        options: [
            { id: 'a', label: 'a', position: 0 },
            { id: 'b', label: 'b', position: 1 },
        ],
        key,
    })

    it('a skipped question is skipped (never correct) and left out of the maximum', () => {
        const result = gradeAttempt(
            [q('q1'), q('q2')],
            [
                { questionId: 'q1', selectedOptionIds: ['b'], textAnswer: null },
                { questionId: 'q2', selectedOptionIds: ['b'], textAnswer: null }, // the browser can't un-skip it
            ],
            60,
            ['q2'],
        )
        expect(result.responses.map((r) => r.outcome)).toEqual(['correct', 'skipped'])
        expect(result).toMatchObject({ score: 1, maxScore: 1, percent: 100 })
    })

    it('teachers can’t mark a skipped question, and it stays out of the total', () => {
        const responses = [
            {
                questionId: 'q1',
                selectedOptionIds: [],
                textAnswer: null,
                outcome: 'pending_review' as const,
                pointsAwarded: 0,
                feedback: '',
            },
            {
                questionId: 'q2',
                selectedOptionIds: [],
                textAnswer: null,
                outcome: 'skipped' as const,
                pointsAwarded: 0,
                feedback: '',
            },
        ]
        const questions = [
            { id: 'q1', points: 4 },
            { id: 'q2', points: 6 },
        ]
        expect(() =>
            applyManualGrades({
                questions,
                responses,
                grades: [{ questionId: 'q2', pointsAwarded: 6, feedback: '' }],
                passingScore: 50,
            }),
        ).toThrow(GradeError)
        const graded = applyManualGrades({
            questions,
            responses,
            grades: [{ questionId: 'q1', pointsAwarded: 3, feedback: '' }],
            passingScore: 50,
        })
        expect(graded).toMatchObject({ score: 3, maxScore: 4, percent: 75 })
    })
})
