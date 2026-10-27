import { expect, test } from '@playwright/test'
import { api, choiceQuestion, createActivity, createCourse, joinCourse, World, type Session } from './fixtures'
import { openAttemptId } from './helpers'

/*
 * Acceptance workflows 7–11: a teacher hides a secret (no code changes) that rewards an Easter Bunny; a
 * student discovers it and gets exactly one charge; spends it on a practice question exactly once; can't
 * use it on an exam; and the teacher sees the skip separately in the results.
 */

interface Inventory {
    items: { item: { code: string; effect: string | null }; charges: number }[]
    history: { delta: number; itemName: string }[]
}

test.describe.serial('secrets and the Easter Bunny', () => {
    let world: World
    let teacher: Session
    let student: Session
    let course: { id: string; joinCode: string }
    let practiceId: string
    let examId: string
    const phrase = 'Open the hidden library'
    const p1 = choiceQuestion('2 + 2 = ?', ['3', '4', '5'], 1)
    const p2 = choiceQuestion('3 + 3 = ?', ['6', '7', '8'], 0)
    const e1 = choiceQuestion('5 × 2 = ?', ['10', '12', '7'], 0)
    const e2 = choiceQuestion('9 − 4 = ?', ['3', '5', '6'], 1)

    const bunnies = async () => {
        const inventory = (await api<Inventory>(student.page, 'GET', '/me/inventory')).body
        return inventory.items.find((i) => i.item.effect === 'bunny_skip')?.charges ?? 0
    }

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        teacher = await world.signIn(await world.account('teacher', 'teacher'))
        student = await world.signIn(await world.account('student', 'student'))
        course = await createCourse(world, teacher.page, 'ZZ E2E Secrets')
        practiceId = await createActivity(teacher.page, course.id, 'practice_quiz', {
            title: 'Warm-up practice',
            xpReward: 20,
            questions: [p1, p2],
            allowSkills: true,
            allowBunnySkips: true,
        })
        examId = await createActivity(teacher.page, course.id, 'exam', {
            title: 'Unit exam',
            xpReward: 100,
            passingScore: 50,
            maxAttempts: 1,
            feedbackMode: 'score_only',
            questions: [e1, e2],
        })
        await joinCourse(student.page, course.joinCode)
    })
    test.afterAll(async () => world?.cleanup())

    test('11 · a teacher creates a secret quest without changing code', async () => {
        const items = (await api<{ id: string; code: string }[]>(teacher.page, 'GET', '/items')).body
        const bunny = items.find((i) => i.code === 'easter_bunny')
        expect(bunny, 'the Easter Bunny item exists').toBeTruthy()
        // The same request the Secrets tab's editor sends
        const created = await api<{ id: string; title: string }>(
            teacher.page,
            'POST',
            `/courses/${course.id}/secrets`,
            {
                title: 'The hidden library',
                clue: 'Some doors open with words.',
                clueVisible: true,
                reveal: 'You found the **hidden library**!',
                trigger: 'secret_phrase',
                config: {},
                phrase,
                rarity: 'rare',
                rewards: [
                    { type: 'xp', amount: 30 },
                    { type: 'item', itemId: bunny!.id, charges: 1 },
                ],
                active: true,
            },
        )
        expect(created.status, JSON.stringify(created.body)).toBe(201)
        await teacher.page.goto(`/courses/${course.id}?tab=secrets`)
        await expect(teacher.page.getByText('The hidden library').first()).toBeVisible()
        // The phrase itself is never sent back, not even to the teacher
        const list = await api(teacher.page, 'GET', `/courses/${course.id}/secrets`)
        expect(JSON.stringify(list.body)).not.toContain(phrase)
    })

    test('7 · a student discovers the Easter Bunny and receives exactly one charge', async () => {
        expect(await bunnies()).toBe(0)
        const found = await api<{ discoveries: { title: string }[] }>(student.page, 'POST', '/secrets/phrase', {
            phrase: '  open, the HIDDEN library! ',
        })
        expect(found.status).toBe(200)
        expect(found.body.discoveries.map((d) => d.title)).toEqual(['The hidden library'])
        expect(await bunnies()).toBe(1)

        // Saying it again finds nothing new and gives no second charge
        const again = await api<{ discoveries: unknown[] }>(student.page, 'POST', '/secrets/phrase', { phrase })
        expect(again.body.discoveries).toEqual([])
        expect(await bunnies()).toBe(1)

        await student.page.goto('/codex')
        await expect(student.page.getByText('The hidden library').first()).toBeVisible()
    })

    test('8 · the student spends it on a practice question, and the charge is used exactly once', async () => {
        const page = student.page
        await page.goto(`/learn/${practiceId}`)
        await page.getByRole('button', { name: 'Begin', exact: true }).click()
        await page.getByRole('button', { name: /Easter Bunny \(1\)/ }).click()
        await page.getByRole('dialog').getByRole('button', { name: 'Skip this question' }).click()
        await expect(page.getByText(/Easter Bunny hopped you past this one/)).toBeVisible()

        const attemptId = (await openAttemptId(page, practiceId))!
        // A double click / second tab / replay: the same skip again never spends a second charge
        const replays = await Promise.all(
            [1, 2].map(() =>
                api<{ charges: number; alreadySkipped: boolean }>(page, 'POST', `/attempts/${attemptId}/skip`, {
                    questionId: p1.id,
                }),
            ),
        )
        for (const r of replays) expect(r.body).toMatchObject({ charges: 0, alreadySkipped: true })
        // No charge left for a second question
        const second = await api<{ code: string }>(page, 'POST', `/attempts/${attemptId}/skip`, { questionId: p2.id })
        expect(second.status).toBe(409)
        expect(second.body.code).toBe('NOT_ENOUGH_CHARGES')
        expect(await bunnies()).toBe(0)
        const inventory = (await api<Inventory>(page, 'GET', '/me/inventory')).body
        expect(inventory.history.filter((h) => h.delta < 0)).toHaveLength(1)

        // Even "answering" the skipped question can't make it count as correct
        const result = await api<{
            questions: { question: { id: string }; response: { outcome: string; pointsAwarded: number } | null }[]
        }>(page, 'POST', `/attempts/${attemptId}/submit`, {
            responses: [
                { questionId: p1.id, selectedOptionIds: [p1.key.correctOptionIds[0]], textAnswer: null },
                { questionId: p2.id, selectedOptionIds: [p2.key.correctOptionIds[0]], textAnswer: null },
            ],
        })
        expect(result.status).toBe(200)
        const skipped = result.body.questions.find((q) => q.question.id === p1.id)?.response
        expect(skipped).toMatchObject({ outcome: 'skipped', pointsAwarded: 0 })
    })

    test('9 · it can’t be used on an exam', async () => {
        const page = student.page
        await page.goto(`/learn/${examId}`)
        await page.getByRole('button', { name: 'Begin', exact: true }).click()
        await expect(page.getByText('5 × 2 = ?')).toBeVisible()
        await expect(page.getByRole('button', { name: /Easter Bunny/ })).toHaveCount(0)

        const attemptId = (await openAttemptId(page, examId))!
        const attempt = await api<{ code: string }>(page, 'POST', `/attempts/${attemptId}/skip`, { questionId: e1.id })
        expect(attempt.status).toBe(409)
        expect(attempt.body.code).toBe('SKIPS_NOT_ALLOWED')
        const submitted = await api(page, 'POST', `/attempts/${attemptId}/submit`, {
            responses: [
                { questionId: e1.id, selectedOptionIds: [e1.key.correctOptionIds[0]], textAnswer: null },
                { questionId: e2.id, selectedOptionIds: [e2.options[0].id], textAnswer: null },
            ],
        })
        expect(submitted.status).toBe(200)
    })

    test('10 · the teacher sees the skipped question and every result', async () => {
        const results = await api<{
            questions: { questionId: string; skipped: number; correct: number; incorrect: number }[]
            students: { displayName: string; attempts: unknown[] }[]
        }>(teacher.page, 'GET', `/activities/${practiceId}/results`)
        expect(results.status).toBe(200)
        expect(results.body.questions.find((q) => q.questionId === p1.id)).toMatchObject({
            skipped: 1,
            correct: 0,
            incorrect: 0,
        })
        expect(results.body.questions.find((q) => q.questionId === p2.id)).toMatchObject({ skipped: 0, correct: 1 })
        expect(results.body.students.find((s) => s.displayName === student.account.name)?.attempts).toHaveLength(1)

        const exam = await api<{ students: { displayName: string; attempts: unknown[] }[] }>(
            teacher.page,
            'GET',
            `/activities/${examId}/results`,
        )
        expect(exam.body.students.find((s) => s.displayName === student.account.name)?.attempts).toHaveLength(1)

        await teacher.page.goto(`/courses/${course.id}/activities/${practiceId}/results`)
        await expect(teacher.page.getByText('2 + 2 = ?').first()).toBeVisible()
        await expect(teacher.page.getByText(/skipped/i).first()).toBeVisible()
    })
})
