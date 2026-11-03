import { describe, expect, it } from 'vitest'
import { SEEDED_COURSES } from '@/configs/courses'
import { SAMPLE_IMAGE_HOSTS, lessonMedia, sampleActivityToSaveInput } from './sampleCourses'
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

describe.each(SEEDED_COURSES.map((c) => [c.title, c] as const))('%s', (_title, course) => {
    const activities = course.modules.flatMap((m) => m.activities)

    it('uses a seeded subject, a valid join code and an owner email', () => {
        expect(SEEDED_SUBJECTS).toContain(course.subjectSlug)
        expect(course.joinCode).toMatch(/^[A-Z0-9]{6,10}$/)
        expect(course.ownerEmail).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)
    })

    it('has unique activity keys and prerequisites that point at earlier activities', () => {
        expect(new Set(activities.map((a) => a.key)).size).toBe(activities.length)
        const seen = new Set<string>()
        for (const activity of activities) {
            for (const key of activity.requires ?? []) expect(seen.has(key), `${activity.key} → ${key}`).toBe(true)
            seen.add(activity.key)
        }
    })

    describe.each(course.modules.map((m, i) => [`unit ${i + 1} `, m] as const))('%s', (_unit, module) => {
        it('has a title, lessons and a quiz for each lesson', () => {
            expect(module.title.trim().length).toBeGreaterThan(2)
            const lessons = module.activities.filter((a) => a.kind === 'lesson')
            const quizzes = module.activities.filter((a) => a.kind === 'quiz')
            expect(lessons.length).toBeGreaterThanOrEqual(1)
            expect(quizzes.length).toBe(lessons.length)
        })

        it('passes the publish checklist with the default XP', () => {
            for (const activity of module.activities) {
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
            for (const activity of module.activities) {
                for (const question of activity.questions ?? []) {
                    expect(activity.objectives, `${activity.key}: ${question.prompt}`).toContain(question.objective)
                    expect(question.explanation.trim(), question.prompt).not.toBe('')
                }
            }
        })

        it('links only to YouTube videos and openly licensed images, and survives the visual editor', () => {
            for (const activity of module.activities.filter((a) => a.kind === 'lesson')) {
                const body = activity.body ?? ''
                const { images, videos } = lessonMedia(body)
                for (const video of videos) expect(parseVideoUrl(video)?.provider, video).toBe('youtube')
                for (const image of images) expect(SAMPLE_IMAGE_HOSTS).toContain(new URL(image).hostname)
                expect(lessonMedia(docToMarkdown(markdownToDoc(body)))).toEqual(lessonMedia(body))
            }
        })
    })
})
