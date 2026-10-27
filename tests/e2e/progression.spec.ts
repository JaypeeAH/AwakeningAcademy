import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { api, status, World, type Session } from './fixtures'

/*
 * Acceptance workflows 5–6: levels follow XP, and a rank promotion needs the level AND the mastery gates
 * (average score, passed assessments, completed lessons). XP alone never promotes.
 */

test.describe.serial('progression', () => {
    let world: World
    let admin: Session
    let student: Session

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        admin = await world.signIn(await world.account('admin', 'admin'))
        student = await world.signIn(await world.account('student', 'student'))
    })
    test.afterAll(async () => world?.cleanup())

    const adjust = (amount: number, requestId = randomUUID()) =>
        api(admin.page, 'POST', '/admin/xp-adjustments', {
            studentId: student.account.id,
            amount,
            reason: 'End-to-end test adjustment',
            requestId,
        })

    test('5 · level progression updates as XP is earned (and an adjustment applies once)', async () => {
        const start = await status(student.page)
        expect(start.progress).toMatchObject({ level: 1, totalXp: 0 })

        // Level 1 → 2 costs 100 XP (default formula); the same request id applied twice counts once
        const requestId = randomUUID()
        expect((await adjust(150, requestId)).status).toBe(200)
        expect((await adjust(150, requestId)).status).toBe(200)
        const after = await status(student.page)
        expect(after.progress.totalXp).toBe(150)
        expect(after.progress.level).toBe(2)

        await student.page.goto('/')
        await expect(student.page.getByText(/Lv\s*2\b/).first()).toBeVisible()
    })

    test('6 · rank promotion checks mastery, not just level', async () => {
        // Enough XP for level 10 (E-Rank's level), but no lessons or passed assessments yet
        expect((await adjust(1700)).status).toBe(200)
        const now = await status(student.page)
        expect(now.progress.level).toBeGreaterThanOrEqual(10)
        expect(now.rank.code).toBe('F')
        expect(now.trial?.rank.code).toBe('E')
        expect(now.trial?.eligible).toBe(false)
        const requirements = Object.fromEntries((now.trial?.requirements ?? []).map((r) => [r.key, r.met]))
        expect(requirements.level).toBe(true)
        expect(requirements.passedAssessments).toBe(false)
        expect(requirements.completedLessons).toBe(false)

        await student.page.goto('/')
        await expect(student.page.getByText(/E-Rank/).first()).toBeVisible()
    })
})
