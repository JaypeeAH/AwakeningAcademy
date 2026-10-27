import { describe, expect, it } from 'vitest'
import { SAMPLE_COURSES, findSampleCourse } from '@/configs/sampleCourses'
import {
    SAMPLE_IMAGE_HOSTS,
    commonsImage,
    lessonMedia,
    sampleActivityToSaveInput,
    sampleQuestionToInput,
    summarizeSampleCourse,
} from './sampleCourses'
import { getPublishIssues } from './activityValidation'
import { docToMarkdown, markdownToDoc } from './lessonDoc'
import { parseVideoUrl } from './media'
import { activityKindXpSource } from '@/@types/activities/ActivityKindOptions'

// The seeded XP rules (reference data migration): what a new activity starts with, and the allowed range
const XP_RULES = {
    lesson_completion: { defaultXp: 20, minXp: 5, maxXp: 100 },
    quiz_completion: { defaultXp: 30, minXp: 10, maxXp: 150 },
    boss_battle: { defaultXp: 200, minXp: 50, maxXp: 800 },
} as Record<string, { defaultXp: number; minXp: number; maxXp: number }>

const SEEDED_SUBJECTS = ['mathematics', 'science', 'english', 'history', 'technology', 'arts', 'languages', 'health']

let counter = 0
const newId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`

describe('sample courses', () => {
    it('have unique ids and use seeded subjects', () => {
        expect(new Set(SAMPLE_COURSES.map((s) => s.id)).size).toBe(SAMPLE_COURSES.length)
        for (const sample of SAMPLE_COURSES) expect(SEEDED_SUBJECTS).toContain(sample.subjectSlug)
        expect(findSampleCourse('pythagoras')?.subjectSlug).toBe('mathematics')
        expect(findSampleCourse('nope')).toBeNull()
    })

    describe.each(SAMPLE_COURSES.map((s) => [s.title, s] as const))('%s', (_title, sample) => {
        it('has lessons with pictures and a video, and a quiz', () => {
            const summary = summarizeSampleCourse(sample)
            expect(summary.lessonCount).toBeGreaterThanOrEqual(2)
            expect(summary.quizCount).toBeGreaterThanOrEqual(1)
            expect(summary.imageCount).toBeGreaterThanOrEqual(2)
            expect(summary.videoCount).toBeGreaterThanOrEqual(1)
        })

        it('links only to YouTube videos and credited, openly licensed images', () => {
            for (const activity of sample.activities.filter((a) => a.kind === 'lesson')) {
                const { images, videos } = lessonMedia(activity.body ?? '')
                for (const video of videos) expect(parseVideoUrl(video)?.provider).toBe('youtube')
                for (const image of images) {
                    const url = new URL(image)
                    expect(url.protocol).toBe('https:')
                    expect(SAMPLE_IMAGE_HOSTS).toContain(url.hostname)
                }
                // Every picture's caption credits its author and licence
                const captions = [...(activity.body ?? '').matchAll(/!\[[^\]]*\]\(\S+ "([^"]+)"\)/g)].map((m) => m[1])
                expect(captions).toHaveLength(images.length)
                for (const caption of captions) expect(caption).toMatch(/via Wikimedia Commons$/)
            }
        })

        it('has prerequisites that point at earlier activities', () => {
            const seen = new Set<string>()
            for (const activity of sample.activities) {
                for (const key of activity.requires ?? []) expect(seen.has(key), `${activity.key} → ${key}`).toBe(true)
                seen.add(activity.key)
            }
        })

        it('passes the publish checklist with the default XP', () => {
            for (const activity of sample.activities) {
                const rule = XP_RULES[activityKindXpSource[activity.kind]]
                const input = sampleActivityToSaveInput(activity, {
                    xpReward: rule.defaultXp,
                    moduleId: null,
                    prerequisiteIds: [],
                    newId,
                })
                const issues = getPublishIssues({
                    kind: activity.kind,
                    title: input.title,
                    body: input.body,
                    xpReward: input.xpReward,
                    questions: input.questions,
                    xpRule: rule,
                    feedbackMode: input.feedbackMode,
                    dueAt: input.dueAt,
                    boss: input.boss,
                    teamConfig: input.teamConfig,
                })
                expect(issues, activity.title).toEqual([])
            }
        })

        it('tags every question with one of its activity’s objectives, and explains it', () => {
            for (const activity of sample.activities) {
                for (const question of activity.questions ?? []) {
                    expect(activity.objectives).toContain(question.objective)
                    expect(question.explanation.trim()).not.toBe('')
                }
            }
        })

        it('lessons survive the visual editor round trip with their media intact', () => {
            for (const activity of sample.activities.filter((a) => a.kind === 'lesson')) {
                const body = activity.body ?? ''
                const again = docToMarkdown(markdownToDoc(body))
                expect(lessonMedia(again)).toEqual(lessonMedia(body))
            }
        })
    })
})

describe('sample question conversion', () => {
    it('makes fresh ids and marks the right options', () => {
        const question = {
            kind: 'multiple_choice' as const,
            prompt: 'Pick the primes',
            objective: 'Primes',
            options: [{ label: '2', correct: true }, { label: '4' }, { label: '5', correct: true }],
            explanation: '2 and 5 have exactly two factors.',
        }
        const a = sampleQuestionToInput(question, newId)
        const b = sampleQuestionToInput(question, newId)
        expect(a.id).not.toBe(b.id)
        expect(a.options.map((o) => o.id)).not.toEqual(b.options.map((o) => o.id))
        expect(a.key.correctOptionIds).toEqual([a.options[0].id, a.options[2].id])
    })

    it('gives true/false questions True and False when no options are written', () => {
        const input = sampleQuestionToInput(
            { kind: 'true_false', prompt: 'The Sun is a star.', objective: 'Stars', explanation: 'It is.' },
            newId,
        )
        expect(input.options.map((o) => o.label)).toEqual(['True', 'False'])
    })

    it('short answers keep accepted answers and no options', () => {
        const input = sampleQuestionToInput(
            {
                kind: 'short_answer',
                prompt: 'Largest planet?',
                objective: 'Planets',
                acceptedAnswers: ['Jupiter'],
                explanation: 'Jupiter.',
            },
            newId,
        )
        expect(input.options).toEqual([])
        expect(input.key.acceptedAnswers).toEqual(['Jupiter'])
    })
})

it('commonsImage links to a resized Commons file', () => {
    expect(commonsImage('Rosetta_Stone.JPG')).toBe(
        'https://commons.wikimedia.org/wiki/Special:FilePath/Rosetta_Stone.JPG?width=800',
    )
})
