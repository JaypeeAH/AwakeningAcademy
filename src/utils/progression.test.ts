import { describe, expect, it } from 'vitest'
import {
    clampToRule,
    computeAttemptAwards,
    computeLessonAwards,
    getLevelProgress,
    getRankTrial,
    levelForXp,
    summarizeRewards,
    validateRankLadder,
    xpForLevel,
    xpToNextLevel,
} from './progression'
import { DEFAULT_PROGRESSION_SETTINGS, type Rank, type XpRule } from '@/@types/progression/Progression'

const settings = DEFAULT_PROGRESSION_SETTINGS

const rules: XpRule[] = [
    { source: 'lesson_completion', defaultXp: 20, minXp: 5, maxXp: 100 },
    { source: 'quiz_completion', defaultXp: 30, minXp: 10, maxXp: 150 },
    { source: 'exam_completion', defaultXp: 100, minXp: 25, maxXp: 400 },
    { source: 'high_score_bonus', defaultXp: 20, minXp: 0, maxXp: 100 },
]

const rank = (code: string, sortOrder: number, minLevel: number, gates: Partial<Rank> = {}): Rank => ({
    id: code,
    code,
    name: code,
    description: '',
    sortOrder,
    minLevel,
    minAverageScore: 0,
    minPassedAssessments: 0,
    minCompletedLessons: 0,
    ...gates,
})

const ladder = [
    rank('F', 1, 1),
    rank('E', 2, 10, { minAverageScore: 50, minPassedAssessments: 1, minCompletedLessons: 3 }),
    rank('D', 3, 20, { minAverageScore: 55, minPassedAssessments: 3, minCompletedLessons: 6 }),
]

describe('level formula', () => {
    it('costs 100 + 25 × (L − 1) XP per level', () => {
        expect(xpToNextLevel(1, settings)).toBe(100)
        expect(xpToNextLevel(2, settings)).toBe(125)
        expect(xpToNextLevel(10, settings)).toBe(325)
    })

    it('agrees with the SQL cumulative thresholds', () => {
        // Same numbers as tests/db/progression.test.ts
        expect(xpForLevel(1, settings)).toBe(0)
        expect(xpForLevel(2, settings)).toBe(100)
        expect(xpForLevel(3, settings)).toBe(225)
        expect(xpForLevel(10, settings)).toBe(1800)
    })

    it('is the sum of the per-level costs for every level', () => {
        let cumulative = 0
        for (let level = 1; level <= 100; level++) {
            expect(xpForLevel(level, settings)).toBe(cumulative)
            cumulative += xpToNextLevel(level, settings)
        }
    })

    it('places boundary totals on the right level', () => {
        expect(levelForXp(0, settings)).toBe(1)
        expect(levelForXp(99, settings)).toBe(1)
        expect(levelForXp(100, settings)).toBe(2)
        expect(levelForXp(224, settings)).toBe(2)
        expect(levelForXp(225, settings)).toBe(3)
        expect(levelForXp(1799, settings)).toBe(9)
        expect(levelForXp(1800, settings)).toBe(10)
    })

    it('caps at the maximum level', () => {
        expect(levelForXp(Number.MAX_SAFE_INTEGER, settings)).toBe(100)
        expect(getLevelProgress(10_000_000, settings)).toMatchObject({ level: 100, isMaxLevel: true, percent: 100 })
    })

    it('works with a flat formula (step 0)', () => {
        const flat = { ...settings, xpStep: 0 }
        expect(levelForXp(500, flat)).toBe(6)
    })

    it('reports progress within the current level', () => {
        expect(getLevelProgress(150, settings)).toEqual({
            level: 2,
            totalXp: 150,
            xpIntoLevel: 50,
            xpForNextLevel: 125,
            percent: 40,
            isMaxLevel: false,
        })
    })
})

describe('rank trial', () => {
    const noMastery = { averageScore: 0, passedAssessments: 0, completedLessons: 0 }

    it('lists every requirement of the next rank and which are met', () => {
        const trial = getRankTrial(ladder[0], ladder, 10, {
            averageScore: 40,
            passedAssessments: 1,
            completedLessons: 5,
        })
        expect(trial?.rank.code).toBe('E')
        expect(trial?.eligible).toBe(false)
        expect(trial?.requirements.map((r) => [r.key, r.met])).toEqual([
            ['level', true],
            ['averageScore', false],
            ['passedAssessments', true],
            ['completedLessons', true],
        ])
    })

    it('is eligible only when level and all mastery gates are met', () => {
        const mastery = { averageScore: 50, passedAssessments: 1, completedLessons: 3 }
        expect(getRankTrial(ladder[0], ladder, 9, mastery)?.eligible).toBe(false)
        expect(getRankTrial(ladder[0], ladder, 10, mastery)?.eligible).toBe(true)
    })

    it('omits gates set to zero', () => {
        const trial = getRankTrial({ sortOrder: 0 }, ladder, 1, noMastery)
        expect(trial?.rank.code).toBe('F')
        expect(trial?.requirements.map((r) => r.key)).toEqual(['level'])
    })

    it('returns null at the top rank', () => {
        expect(getRankTrial(ladder[2], ladder, 99, noMastery)).toBeNull()
    })
})

describe('rank ladder validation', () => {
    it('accepts the default ladder', () => {
        expect(validateRankLadder(ladder, 100)).toEqual([])
    })

    it('requires the first rank at level 1 and strictly rising levels', () => {
        expect(validateRankLadder([rank('F', 1, 2), rank('E', 2, 10)], 100)).toHaveLength(1)
        expect(validateRankLadder([rank('F', 1, 1), rank('E', 2, 10), rank('D', 3, 10)], 100)).toEqual([
            'D-Rank must start at a higher level than E-Rank.',
        ])
    })

    it('rejects a rank beyond the maximum level', () => {
        expect(validateRankLadder([rank('F', 1, 1), rank('E', 2, 120)], 100)).toHaveLength(1)
    })
})

describe('reward decisions', () => {
    const quiz = { id: 'quiz-1', kind: 'quiz' as const, title: 'Fractions', xpReward: 30, xpRepeatable: false }

    it('clamps teacher XP to the administrator’s range', () => {
        expect(clampToRule(1000, rules[1])).toBe(150)
        expect(clampToRule(1, rules[1])).toBe(10)
        expect(clampToRule(42, rules[1])).toBe(42)
    })

    it('awards lesson XP with a one-time key', () => {
        const lesson = { ...quiz, id: 'lesson-1', kind: 'lesson' as const, xpReward: 20 }
        expect(computeLessonAwards(lesson, 'stu', rules)).toEqual([
            {
                amount: 20,
                source: 'lesson_completion',
                idempotencyKey: 'complete:lesson-1:stu',
                reason: 'Completed “Fractions”',
            },
        ])
    })

    it('gives nothing for a failed attempt', () => {
        expect(
            computeAttemptAwards({
                activity: quiz,
                studentId: 's',
                attemptId: 'a',
                percent: 40,
                passed: false,
                rules,
                settings,
            }),
        ).toEqual([])
    })

    it('awards completion on a pass with a key that is the same for every attempt', () => {
        const first = computeAttemptAwards({
            activity: quiz,
            studentId: 's',
            attemptId: 'a1',
            percent: 70,
            passed: true,
            rules,
            settings,
        })
        const second = computeAttemptAwards({
            activity: quiz,
            studentId: 's',
            attemptId: 'a2',
            percent: 75,
            passed: true,
            rules,
            settings,
        })
        expect(first).toHaveLength(1)
        expect(first[0]).toMatchObject({ amount: 30, source: 'quiz_completion', idempotencyKey: 'complete:quiz-1:s' })
        expect(second[0].idempotencyKey).toBe(first[0].idempotencyKey)
    })

    it('adds the high-score bonus at the threshold, once per activity', () => {
        const awards = computeAttemptAwards({
            activity: quiz,
            studentId: 's',
            attemptId: 'a',
            percent: 90,
            passed: true,
            rules,
            settings,
        })
        expect(awards.map((a) => [a.source, a.amount, a.idempotencyKey])).toEqual([
            ['quiz_completion', 30, 'complete:quiz-1:s'],
            ['high_score_bonus', 20, 'high-score:quiz-1:s'],
        ])
        const below = computeAttemptAwards({
            activity: quiz,
            studentId: 's',
            attemptId: 'a',
            percent: 89.99,
            passed: true,
            rules,
            settings,
        })
        expect(below).toHaveLength(1)
    })

    it('uses a per-attempt key when the teacher made XP repeatable', () => {
        const repeatable = { ...quiz, xpRepeatable: true }
        const [award] = computeAttemptAwards({
            activity: repeatable,
            studentId: 's',
            attemptId: 'a9',
            percent: 60,
            passed: true,
            rules,
            settings,
        })
        expect(award.idempotencyKey).toBe('complete:quiz-1:s:a9')
    })

    it('uses the exam source for exams', () => {
        const exam = { ...quiz, kind: 'exam' as const, xpReward: 100 }
        const [award] = computeAttemptAwards({
            activity: exam,
            studentId: 's',
            attemptId: 'a',
            percent: 60,
            passed: true,
            rules,
            settings,
        })
        expect(award).toMatchObject({ source: 'exam_completion', amount: 100 })
    })

    it('summarises only the awards that were actually granted', () => {
        const before = { totalXp: 90, level: 1, rankId: 'f', rankCode: 'F', rankName: 'Unawakened' }
        const after = { ...before, totalXp: 120, level: 2 }
        const summary = summarizeRewards(before, after, [
            {
                idempotencyKey: 'k1',
                source: 'quiz_completion',
                amount: 30,
                awarded: true,
                promotions: [],
                subject: { id: 'm', levelBefore: 1, levelAfter: 1 },
            },
            {
                idempotencyKey: 'k2',
                source: 'high_score_bonus',
                amount: 0,
                awarded: false,
                promotions: [],
                subject: null,
            },
        ])
        expect(summary).toMatchObject({
            xpGained: 30,
            leveledUp: true,
            promotions: [],
            subjectLevel: { before: 1, after: 1 },
        })
        expect(summary.awards).toHaveLength(1)
    })
})
