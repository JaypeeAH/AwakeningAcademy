import { describe, expect, it } from 'vitest'
import { getQuestState, type QuestStateInput } from './quests'
import { getPublishIssues } from './activityValidation'

const base: QuestStateInput = {
    kind: 'quiz',
    opensAt: null,
    maxAttempts: null,
    unmetPrerequisites: [],
    completed: false,
    passed: false,
    attemptsUsed: 0,
    hasOpenAttempt: false,
}
const now = new Date('2026-10-26T10:00:00Z')

describe('quest state', () => {
    it('is available by default', () => {
        expect(getQuestState(base, now)).toMatchObject({ state: 'available', playable: true, attemptsLeft: null })
    })

    it('is upcoming before it opens', () => {
        const result = getQuestState({ ...base, opensAt: new Date('2026-10-27T10:00:00Z') }, now)
        expect(result).toMatchObject({ state: 'upcoming', playable: false })
    })

    it('is locked until prerequisites are done, and says which', () => {
        const result = getQuestState({ ...base, unmetPrerequisites: ['Intro to fractions'] }, now)
        expect(result).toMatchObject({
            state: 'locked',
            playable: false,
            reason: 'Complete “Intro to fractions” first',
        })
    })

    it('resumes an open attempt', () => {
        expect(getQuestState({ ...base, hasOpenAttempt: true, attemptsUsed: 1 }, now).state).toBe('in_progress')
    })

    it('stays available after a failed attempt while attempts remain', () => {
        const result = getQuestState({ ...base, completed: true, attemptsUsed: 1, maxAttempts: 3 }, now)
        expect(result).toMatchObject({ state: 'available', attemptsLeft: 2, playable: true })
    })

    it('is completed when passed, and still retryable if attempts remain', () => {
        expect(getQuestState({ ...base, completed: true, passed: true, attemptsUsed: 1 }, now)).toMatchObject({
            state: 'completed',
            playable: true,
        })
        expect(
            getQuestState({ ...base, completed: true, passed: true, attemptsUsed: 2, maxAttempts: 2 }, now),
        ).toMatchObject({ state: 'completed', playable: false })
    })

    it('is closed when attempts run out without a pass', () => {
        expect(getQuestState({ ...base, completed: true, attemptsUsed: 2, maxAttempts: 2 }, now)).toMatchObject({
            state: 'completed',
            playable: false,
            attemptsLeft: 0,
        })
    })

    it('treats a lesson as completed once, but lets it be re-read', () => {
        expect(getQuestState({ ...base, kind: 'lesson', completed: true }, now)).toMatchObject({
            state: 'completed',
            playable: true,
        })
    })
})

describe('publish validation', () => {
    const q = (overrides: object = {}) => ({
        id: '00000000-0000-4000-8000-000000000001',
        kind: 'single_choice' as const,
        prompt: 'Q',
        points: 1,
        options: [
            { id: '00000000-0000-4000-8000-0000000000a1', label: 'A' },
            { id: '00000000-0000-4000-8000-0000000000b1', label: 'B' },
        ],
        key: {
            correctOptionIds: ['00000000-0000-4000-8000-0000000000b1'],
            acceptedAnswers: [],
            caseSensitive: false,
            explanation: '',
            rubric: '',
        },
        ...overrides,
    })
    const quiz = {
        kind: 'quiz' as const,
        title: 'Quiz',
        body: '',
        xpReward: 30,
        questions: [q()],
        xpRule: { minXp: 10, maxXp: 150 },
    }

    it('accepts a complete quiz', () => {
        expect(getPublishIssues(quiz)).toEqual([])
    })

    it('needs questions with a correct answer', () => {
        expect(getPublishIssues({ ...quiz, questions: [] }).map((i) => i.target)).toEqual(['questions'])
        const noKey = q({
            key: { correctOptionIds: [], acceptedAnswers: [], caseSensitive: false, explanation: '', rubric: '' },
        })
        expect(getPublishIssues({ ...quiz, questions: [noKey] })[0].message).toBe(
            'Question 1 has no correct answer marked.',
        )
    })

    it('needs accepted answers for short answers', () => {
        const short = q({
            kind: 'short_answer',
            options: [],
            key: { correctOptionIds: [], acceptedAnswers: [' '], caseSensitive: false, explanation: '', rubric: '' },
        })
        expect(getPublishIssues({ ...quiz, questions: [short] })).toHaveLength(1)
    })

    it('keeps XP within the administrator’s range', () => {
        expect(getPublishIssues({ ...quiz, xpReward: 500 })[0].target).toBe('xpReward')
    })

    it('needs content for a lesson', () => {
        expect(getPublishIssues({ ...quiz, kind: 'lesson', questions: [] }).map((i) => i.target)).toEqual(['body'])
    })
})
