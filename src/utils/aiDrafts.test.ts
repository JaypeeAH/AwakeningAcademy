import { describe, expect, it } from 'vitest'
import { aiDraftToQuestion, aiDraftsToQuestions, markdownToSourceText } from './aiDrafts'
import type { AiDraftedQuestion } from '@/@types/ai/QuestionDrafts'

let n = 0
const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`

const base: AiDraftedQuestion = {
    kind: 'single_choice',
    prompt: 'What do plants need for photosynthesis?',
    points: 1,
    options: ['Light', 'Darkness', 'Salt'],
    correctOptionIndexes: [0],
    acceptedAnswers: [],
    explanation: 'Plants use light energy.',
    rubric: '',
    objective: 'Explain photosynthesis',
}

describe('AI drafts → builder questions', () => {
    it('keeps a valid draft, flags it for review and keeps only the requested objective', () => {
        const q = aiDraftToQuestion(base, ['Explain photosynthesis'], newId)!
        expect(q.aiDraft).toBe(true)
        expect(q.objective).toBe('Explain photosynthesis')
        expect(q.key.correctOptionIds).toEqual([q.options[0].id])
        expect(aiDraftToQuestion(base, ['Something else'], newId)!.objective).toBe('')
    })

    it('drops drafts the builder would reject (no correct answer, too few options, empty prompt)', () => {
        expect(aiDraftToQuestion({ ...base, correctOptionIndexes: [7] }, [], newId)).toBeNull()
        expect(aiDraftToQuestion({ ...base, options: ['Only one'] }, [], newId)).toBeNull()
        expect(aiDraftToQuestion({ ...base, prompt: '   ' }, [], newId)).toBeNull()
    })

    it('normalises true/false to the builder’s own options, whatever order the model used', () => {
        const q = aiDraftToQuestion(
            { ...base, kind: 'true_false', options: ['False', 'True'], correctOptionIndexes: [0] },
            [],
            newId,
        )!
        expect(q.options.map((o) => o.label)).toEqual(['True', 'False'])
        expect(q.key.correctOptionIds).toEqual([q.options[1].id])
    })

    it('de-duplicates options and keeps single choice to one answer; clamps points', () => {
        const q = aiDraftToQuestion(
            { ...base, options: ['Light', 'Light', 'Water', 'Soil'], correctOptionIndexes: [1, 2], points: 99 },
            [],
            newId,
        )!
        expect(q.options.map((o) => o.label)).toEqual(['Light', 'Water', 'Soil'])
        expect(q.key.correctOptionIds).toEqual([q.options[0].id])
        expect(q.points).toBe(10)
    })

    it('short answers keep accepted answers; essays keep a rubric and no options', () => {
        const short = aiDraftToQuestion(
            { ...base, kind: 'short_answer', options: ['x'], acceptedAnswers: ['chlorophyll', ' chlorophyll ', ''] },
            [],
            newId,
        )!
        expect(short.options).toEqual([])
        expect(short.key.acceptedAnswers).toEqual(['chlorophyll'])
        const essay = aiDraftToQuestion(
            { ...base, kind: 'essay', options: ['x'], correctOptionIndexes: [0], rubric: 'Mentions light.', points: 6 },
            [],
            newId,
        )!
        expect(essay).toMatchObject({
            options: [],
            points: 6,
            key: { rubric: 'Mentions light.', correctOptionIds: [] },
        })
    })

    it('never returns more than asked for', () => {
        expect(aiDraftsToQuestions([base, base, base], [], 2, newId)).toHaveLength(2)
    })

    it('drafts from the lesson’s words, not its images, videos or secret markers', () => {
        const text = markdownToSourceText(
            '## Leaves\n\n![leaf](/api/media/x)\n\n> [!TIP]\n> Look closely [✦](secret:Abcdefgh12345678).\n\nSee [the guide](https://x.y).',
        )
        expect(text).not.toContain('api/media')
        expect(text).not.toContain('secret')
        expect(text).toContain('See the guide.')
    })
})
