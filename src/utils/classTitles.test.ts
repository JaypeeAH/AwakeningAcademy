import { describe, expect, it } from 'vitest'
import { getNextSubjectTitle, getPlayerClass, getSubjectTitle, getUnlockedTitles } from './classTitles'
import type { ClassTitle } from '@/@types/subjects/Subject'

const title = (
    id: string,
    subjectId: string | null,
    tier: number,
    minSubjectLevel: number,
    minMastery = 0,
    minSubjectCount = 1,
): ClassTitle => ({
    id,
    subjectId,
    tier,
    title: id,
    description: '',
    minSubjectLevel,
    minMastery,
    minSubjectCount,
})

const titles = [
    title('Numeral Initiate', 'math', 1, 1),
    title('Apprentice Mathematician', 'math', 2, 5),
    title('Mathematician', 'math', 3, 12, 60),
    title('Advanced Mathematician', 'math', 4, 20, 70),
    title('Lab Initiate', 'sci', 1, 1),
    title('Apprentice Scientist', 'sci', 2, 5),
    title('Wordsmith', 'eng', 3, 12, 60),
    title('Polymath', null, 1, 12, 60, 3),
]

describe('class titles', () => {
    it('gives the highest tier whose level and mastery are both met', () => {
        expect(getSubjectTitle({ subjectId: 'math', level: 25, mastery: 75 }, titles)?.id).toBe(
            'Advanced Mathematician',
        )
        // Level is there but mastery isn't: stays a Mathematician
        expect(getSubjectTitle({ subjectId: 'math', level: 25, mastery: 65 }, titles)?.id).toBe('Mathematician')
        // Mastery gate on tier 3: stays an apprentice despite the level
        expect(getSubjectTitle({ subjectId: 'math', level: 15, mastery: 40 }, titles)?.id).toBe(
            'Apprentice Mathematician',
        )
    })

    it('points to the next title to work toward', () => {
        expect(getNextSubjectTitle({ subjectId: 'math', level: 15, mastery: 40 }, titles)?.id).toBe('Mathematician')
        expect(getNextSubjectTitle({ subjectId: 'math', level: 99, mastery: 99 }, titles)).toBeNull()
    })

    it('unlocks a hybrid title only with enough qualifying subjects', () => {
        const two = [
            { subjectId: 'math', level: 12, mastery: 60 },
            { subjectId: 'eng', level: 12, mastery: 60 },
        ]
        expect(getUnlockedTitles(two, titles).map((t) => t.id)).not.toContain('Polymath')
        const three = [...two, { subjectId: 'sci', level: 12, mastery: 61 }]
        expect(getUnlockedTitles(three, titles)[0].id).toBe('Polymath')
    })

    it('shows the best title of the strongest subject by default', () => {
        const paths = [
            { subjectId: 'sci', level: 6, mastery: 90 },
            { subjectId: 'math', level: 21, mastery: 72 },
        ]
        expect(getPlayerClass(paths, titles, null).displayed?.id).toBe('Advanced Mathematician')
    })

    it('shows an equipped title while it is unlocked, and falls back if it is not', () => {
        const paths = [
            { subjectId: 'sci', level: 6, mastery: 90 },
            { subjectId: 'math', level: 21, mastery: 72 },
        ]
        expect(getPlayerClass(paths, titles, 'Apprentice Scientist').displayed?.id).toBe('Apprentice Scientist')
        const locked = getPlayerClass(paths, titles, 'Wordsmith')
        expect(locked.displayed?.id).toBe('Advanced Mathematician')
        expect(locked.equippedTitleId).toBeNull()
    })

    it('has no class before any subject XP', () => {
        expect(getPlayerClass([], titles, null)).toEqual({ displayed: null, equippedTitleId: null, unlocked: [] })
    })
})
