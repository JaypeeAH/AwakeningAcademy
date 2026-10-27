import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { api, choiceQuestion, createActivity, createCourse, joinCourse, status, World, type Session } from './fixtures'
import { ledger } from './helpers'

/*
 * Acceptance workflow 13: people without the right role can't change grades, XP, inventory or rank —
 * and the browser never talks to Supabase directly.
 */

test.describe.serial('authorisation', () => {
    let world: World
    let teacher: Session
    let student: Session
    let classmate: Session
    let course: { id: string; joinCode: string }
    let quizId: string
    let attemptId: string
    const q = choiceQuestion('1 + 1 = ?', ['2', '3'], 0)

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        teacher = await world.signIn(await world.account('teacher', 'teacher'))
        student = await world.signIn(await world.account('student', 'student'))
        classmate = await world.signIn(await world.account('student', 'classmate'))
        course = await createCourse(world, teacher.page, 'ZZ E2E Security')
        quizId = await createActivity(teacher.page, course.id, 'quiz', {
            title: 'Check',
            xpReward: 30,
            passingScore: 50,
            questions: [q],
        })
        await joinCourse(student.page, course.joinCode)
        await joinCourse(classmate.page, course.joinCode)
        const started = await api<{ attempt: { id: string } }>(student.page, 'POST', `/activities/${quizId}/attempts`)
        attemptId = started.body.attempt.id
        await api(student.page, 'POST', `/attempts/${attemptId}/submit`, {
            responses: [{ questionId: q.id, selectedOptionIds: [q.options[1].id], textAnswer: null }],
        })
    })
    test.afterAll(async () => world?.cleanup())

    test('13 · students can’t change grades, XP, inventory or rank', async () => {
        const page = student.page
        const before = await status(page)
        const blocked: [string, string, unknown?][] = [
            [
                'POST',
                `/grading/${attemptId}`,
                { grades: [{ questionId: q.id, pointsAwarded: 1, feedback: '' }], feedback: '' },
            ],
            ['GET', `/grading/${attemptId}`],
            ['PUT', `/activities/${quizId}`, { title: 'Hacked' }],
            ['GET', `/activities/${quizId}/editor`],
            ['GET', `/activities/${quizId}/results`],
            [
                'POST',
                '/admin/xp-adjustments',
                { studentId: student.account.id, amount: 5000, reason: 'Free XP please', requestId: randomUUID() },
            ],
            ['PATCH', `/admin/users/${student.account.id}`, { role: 'admin' }],
            ['PUT', '/admin/progression', {}],
            ['POST', `/courses/${course.id}/secrets`, { title: 'Mine' }],
            ['POST', '/items', { code: 'free_bunny', name: 'Free bunny', kind: 'consumable', rarity: 'legendary' }],
            ['GET', `/courses/${course.id}/progress`],
            ['GET', `/courses/${course.id}/students`],
        ]
        for (const [method, path, body] of blocked) {
            const result = await api(page, method, path, body)
            expect([401, 403, 404], `${method} ${path} → ${result.status}`).toContain(result.status)
        }

        // A classmate can't see or hand in someone else's attempt
        expect((await api(classmate.page, 'GET', `/attempts/${attemptId}`)).status).toBe(404)
        expect((await api(classmate.page, 'POST', `/attempts/${attemptId}/submit`, { responses: [] })).status).toBe(404)
        expect(
            (await api(classmate.page, 'POST', `/attempts/${attemptId}/skip`, { questionId: q.id })).status,
        ).toBeGreaterThanOrEqual(400)

        // Extra fields are ignored: XP, level and rank can't be sent from the browser
        await api(page, 'PATCH', '/me/profile', {
            totalXp: 99999,
            level: 99,
            rankCode: 'SSS',
            displayName: 'ZZ E2E Student',
        })
        const after = await status(page)
        expect(after.progress.totalXp).toBe(before.progress.totalXp)
        expect(after.rank.code).toBe(before.rank.code)
        expect((await ledger(page)).some((e) => e.source === 'manual_adjustment')).toBe(false)

        // The grade is unchanged (failed with 0%)
        const result = await api<{ attempt: { percent: number; passed: boolean } }>(
            page,
            'GET',
            `/attempts/${attemptId}`,
        )
        expect(result.body.attempt).toMatchObject({ percent: 0, passed: false })
    })

    test('13 · signed-out requests and cross-site writes are refused', async ({ browser, baseURL }) => {
        const anonymous = await browser.newContext()
        const page = await anonymous.newPage()
        await page.goto('/login')
        expect((await api(page, 'GET', '/me/status')).status).toBe(401)
        expect((await api(page, 'POST', `/attempts/${attemptId}/submit`, { responses: [] })).status).toBe(401)
        await anonymous.close()

        // Another site posting with the student's cookies is blocked by the origin check
        const crossSite = await student.context.request.post(`${baseURL}/api/courses/join`, {
            headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
            data: { code: course.joinCode },
        })
        expect(crossSite.status()).toBe(403)
    })

    test('13 · the browser never calls Supabase directly', async () => {
        const supabaseHost = new URL(process.env.SUPABASE_URL!).host
        const calls: string[] = []
        student.page.on('request', (r) => {
            if (new URL(r.url()).host === supabaseHost) calls.push(r.url())
        })
        for (const path of ['/', '/quests', `/learn/${quizId}`, '/profile', '/history', '/inventory', '/codex']) {
            await student.page.goto(path)
            await student.page.waitForLoadState('networkidle')
        }
        expect(calls).toEqual([])
        const html = await student.page.content()
        expect(html).not.toContain(supabaseHost)
        expect(html).not.toContain('sb_secret_')
    })
})
