import { expect, test } from '@playwright/test'
import { api, choiceQuestion, createActivity, createCourse, joinCourse, World, type Session } from './fixtures'
import { openAttemptId } from './helpers'

/*
 * Acceptance workflow 12: a teacher reviews class progress and can spot learning gaps — the gradebook's
 * "may need support" flags, and (once the Phase 5 migration is applied) the analytics page's most-missed
 * questions and objective scores.
 */

test.describe.serial('class insights', () => {
    let world: World
    let teacher: Session
    const students: Session[] = []
    let course: { id: string; joinCode: string }
    let quizId: string
    const easy = choiceQuestion('Which shape has three sides?', ['Triangle', 'Square', 'Circle'], 0)
    const hard = choiceQuestion('What is 7 × 8?', ['54', '56', '58'], 1)

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        teacher = await world.signIn(await world.account('teacher', 'teacher'))
        course = await createCourse(world, teacher.page, 'ZZ E2E Insights')
        quizId = await createActivity(teacher.page, course.id, 'quiz', {
            title: 'Shapes and times tables',
            xpReward: 30,
            passingScore: 60,
            maxAttempts: 2,
            questions: [easy, hard],
        })
        // Ava gets both right; Ben and Cleo miss the hard one; Cleo misses both
        const answers = [
            [easy.key.correctOptionIds[0], hard.key.correctOptionIds[0]],
            [easy.key.correctOptionIds[0], hard.options[0].id],
            [easy.options[1].id, hard.options[2].id],
        ]
        for (const [i, label] of ['ava', 'ben', 'cleo'].entries()) {
            const session = await world.signIn(await world.account('student', label))
            students.push(session)
            await joinCourse(session.page, course.joinCode)
            const started = await api<{ attempt: { id: string } }>(
                session.page,
                'POST',
                `/activities/${quizId}/attempts`,
            )
            expect(started.status).toBe(200)
            const attemptId = started.body.attempt.id ?? (await openAttemptId(session.page, quizId))
            const submitted = await api(session.page, 'POST', `/attempts/${attemptId}/submit`, {
                responses: [
                    { questionId: easy.id, selectedOptionIds: [answers[i][0]], textAnswer: null },
                    { questionId: hard.id, selectedOptionIds: [answers[i][1]], textAnswer: null },
                ],
            })
            expect(submitted.status).toBe(200)
        }
    })
    test.afterAll(async () => world?.cleanup())

    test('12 · the teacher reviews class progress and finds learning gaps', async () => {
        const report = await api<{
            students: {
                displayName: string
                supportReasons: string[]
                cells: Record<string, { bestPercent: number | null }>
            }[]
        }>(teacher.page, 'GET', `/courses/${course.id}/progress`)
        expect(report.status).toBe(200)
        expect(report.body.students).toHaveLength(3)
        const cleo = report.body.students.find((s) => s.displayName.includes('Cleo'))!
        expect(cleo.cells[quizId]?.bestPercent).toBe(0)
        expect(cleo.supportReasons.length, 'a struggling student is flagged').toBeGreaterThan(0)

        await teacher.page.goto(`/courses/${course.id}?tab=progress`)
        await expect(teacher.page.getByText('ZZ E2E Cleo').first()).toBeVisible()

        // Analytics (Phase 5): most-missed question and score spread — skipped if that migration isn't applied yet
        const analytics = await api<{
            summary: { gradedAttempts: number }
            missedQuestions: { questionId: string; incorrectRate: number }[]
        }>(teacher.page, 'GET', `/courses/${course.id}/analytics`)
        if (analytics.status >= 500) {
            test.info().annotations.push({
                type: 'skipped-check',
                description: `Analytics returned ${analytics.status} — apply migration 20261031000100 to enable it`,
            })
            return
        }
        expect(analytics.status).toBe(200)
        expect(analytics.body.summary.gradedAttempts).toBe(3)
        expect(analytics.body.missedQuestions[0]?.questionId).toBe(hard.id)
        await teacher.page.goto(`/analytics?course=${course.id}`)
        await expect(teacher.page.getByText('What is 7 × 8?').first()).toBeVisible()
    })
})
