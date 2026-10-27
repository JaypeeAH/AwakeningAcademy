import { expect, test } from '@playwright/test'
import { api, choiceQuestion, createActivity, createCourse, joinCourse, status, World, type Session } from './fixtures'
import { dismissDialogs, ledger } from './helpers'

/*
 * Acceptance workflows 1–4 and 14: a teacher builds a course with a lesson and a quiz; a student completes
 * both and is rewarded exactly once, however often they refresh or resubmit.
 */

test.describe.serial('core learning loop', () => {
    let world: World
    let teacher: Session
    let student: Session
    let course: { id: string; joinCode: string }
    let lessonId: string
    let quizId: string
    const q1 = choiceQuestion('Which is one half?', ['1/3', '1/2', '1/4'], 1)
    const q2 = choiceQuestion('Which is one quarter?', ['1/4', '1/5', '1/6'], 0)

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        teacher = await world.signIn(await world.account('teacher', 'teacher'))
        student = await world.signIn(await world.account('student', 'student'))
    })
    test.afterAll(async () => world?.cleanup())

    test('1 · a teacher creates a course and publishes a lesson', async () => {
        course = await createCourse(world, teacher.page, 'ZZ E2E Core loop')
        lessonId = await createActivity(teacher.page, course.id, 'lesson', {
            title: 'What is a fraction?',
            body: '## Fractions\n\nA fraction is **part of a whole**.',
            xpReward: 20,
        })
        await teacher.page.goto(`/courses/${course.id}`)
        await expect(teacher.page.getByText('What is a fraction?').first()).toBeVisible()
        await teacher.page.goto(`/courses/${course.id}/activities/${lessonId}/edit`)
        await expect(teacher.page.getByText('Published').first()).toBeVisible()
    })

    test('2 · a teacher creates a quiz and assigns XP', async () => {
        quizId = await createActivity(teacher.page, course.id, 'quiz', {
            title: 'Fractions check',
            xpReward: 30,
            passingScore: 50,
            maxAttempts: 3,
            questions: [q1, q2],
        })
        await teacher.page.goto(`/courses/${course.id}/activities/${quizId}/edit`)
        await expect(teacher.page.locator('#activity-xp')).toHaveValue('30')
        const editor = await api<{ activity: { xpReward: number; status: string } }>(
            teacher.page,
            'GET',
            `/activities/${quizId}/editor`,
        )
        expect(editor.body.activity).toMatchObject({ xpReward: 30, status: 'published' })
    })

    test('3 · a student completes the lesson and receives its XP once', async () => {
        await joinCourse(student.page, course.joinCode)
        await student.page.goto(`/learn/${lessonId}`)
        await student.page.getByRole('button', { name: 'Complete lesson', exact: true }).click()
        await expect(student.page.getByRole('dialog').first()).toBeVisible()
        await dismissDialogs(student.page)
        await expect(student.page.getByText('Lesson complete').first()).toBeVisible()

        const lessonXp = (await ledger(student.page)).filter((e) => e.source === 'lesson_completion')
        expect(lessonXp).toHaveLength(1)
        expect(lessonXp[0].amount).toBe(20)
    })

    test('4 · a student completes a quiz and gets the right score and reward', async () => {
        const page = student.page
        await page.goto(`/learn/${quizId}`)
        await page.getByRole('button', { name: 'Begin', exact: true }).click()
        await page.getByRole('radio', { name: '1/2' }).check()
        await page.getByRole('button', { name: 'Next', exact: true }).click()
        await page.getByRole('radio', { name: '1/5' }).check() // wrong on purpose: 1 of 2 = 50%, a pass
        await page.getByRole('button', { name: 'Hand in', exact: true }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Hand in', exact: true }).click()
        await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 30_000 })
        await dismissDialogs(page)

        await expect(page).toHaveURL(/attempt=/)
        const attemptId = new URL(page.url()).searchParams.get('attempt')!
        const result = await api<{ attempt: { score: number; maxScore: number; percent: number; passed: boolean } }>(
            page,
            'GET',
            `/attempts/${attemptId}`,
        )
        expect(result.body.attempt).toMatchObject({ score: 1, maxScore: 2, percent: 50, passed: true })
        const quizXp = (await ledger(page)).filter((e) => e.source === 'quiz_completion')
        expect(quizXp).toHaveLength(1)
        expect(quizXp[0].amount).toBe(30)
        // 50% is below the high-score threshold: no bonus
        expect((await ledger(page)).some((e) => e.source === 'high_score_bonus')).toBe(false)
    })

    test('14 · refreshing or resubmitting never duplicates rewards', async () => {
        const page = student.page
        const attemptId = new URL(page.url()).searchParams.get('attempt')!
        const before = (await status(page)).progress.totalXp

        const [a, b] = await Promise.all([
            api<{ alreadySubmitted?: boolean }>(page, 'POST', `/attempts/${attemptId}/submit`, { responses: [] }),
            api<{ alreadySubmitted?: boolean }>(page, 'POST', `/attempts/${attemptId}/submit`, { responses: [] }),
        ])
        expect(a.body.alreadySubmitted).toBe(true)
        expect(b.body.alreadySubmitted).toBe(true)

        const again = await Promise.all(
            [1, 2, 3].map(() => api<{ firstCompletion: boolean }>(page, 'POST', `/activities/${lessonId}/complete`)),
        )
        expect(again.every((r) => r.status === 200 && r.body.firstCompletion === false)).toBe(true)

        await page.reload()
        await page.goto(`/learn/${lessonId}`)
        await page.reload()

        expect((await status(page)).progress.totalXp).toBe(before)
        const entries = await ledger(page)
        expect(entries.filter((e) => e.source === 'lesson_completion')).toHaveLength(1)
        expect(entries.filter((e) => e.source === 'quiz_completion')).toHaveLength(1)
    })
})
