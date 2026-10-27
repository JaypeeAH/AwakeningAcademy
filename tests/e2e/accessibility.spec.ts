import fs from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { choiceQuestion, createActivity, createCourse, joinCourse, World, type Session } from './fixtures'
import { dismissDialogs } from './helpers'

/*
 * Accessibility pass: axe (WCAG 2 A + AA) on the main screens, a keyboard walk with a visible focus
 * indicator, and reduced-motion emulation on the reward moment. Every violation is appended to
 * test-results/a11y-findings.jsonl; the checks fail (softly) so they show up in the report.
 */

interface Finding {
    page: string
    rule: string
    impact: string | null | undefined
    description: string
    targets: string[]
}

const REPORT = path.join('test-results', 'a11y-findings.jsonl')

/** Appends a finding to test-results/a11y-findings.jsonl (one JSON object per line) */
function record(finding: Finding) {
    fs.mkdirSync(path.dirname(REPORT), { recursive: true })
    fs.appendFileSync(REPORT, JSON.stringify(finding) + '\n')
}

async function audit(page: Page, label: string) {
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        // The Next.js dev-tools badge only exists in development
        .exclude('nextjs-portal')
        .analyze()
    for (const v of results.violations) {
        record({
            page: label,
            rule: v.id,
            impact: v.impact,
            description: v.help,
            targets: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
        })
    }
    expect
        .soft(
            results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} element(s)`),
            `axe on ${label}`,
        )
        .toEqual([])
}

// Not serial: one page's violations mustn't stop the other checks from running
test.describe('accessibility', () => {
    let world: World
    let teacher: Session
    let student: Session
    let course: { id: string; joinCode: string }
    let lessonId: string
    let quizId: string

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        teacher = await world.signIn(await world.account('teacher', 'teacher'))
        student = await world.signIn(await world.account('student', 'student'))
        course = await createCourse(world, teacher.page, 'ZZ E2E Accessibility')
        lessonId = await createActivity(teacher.page, course.id, 'lesson', {
            title: 'Fractions on a pizza',
            body: '## Pizza fractions\n\nCut a pizza into **4** equal slices: each is one quarter.\n\n> [!TIP]\n> Equal slices matter.',
            xpReward: 20,
        })
        quizId = await createActivity(teacher.page, course.id, 'quiz', {
            title: 'Pizza check',
            xpReward: 30,
            passingScore: 50,
            questions: [
                choiceQuestion('One slice of a pizza cut into 4 is…', ['one half', 'one quarter', 'one third'], 1),
            ],
        })
        await joinCourse(student.page, course.joinCode)
    })
    test.afterAll(async () => world?.cleanup())

    test('axe: sign-in and sign-up', async ({ browser }) => {
        fs.rmSync(REPORT, { force: true })
        const context = await browser.newContext()
        const page = await context.newPage()
        await page.goto('/login')
        await audit(page, 'login')
        await page.goto('/signup')
        await audit(page, 'signup')
        await context.close()
    })

    test('axe: student screens', async () => {
        const page = student.page
        await page.goto('/')
        await audit(page, 'student dashboard')
        await page.goto('/quests')
        await audit(page, 'quest board')
        await page.goto(`/learn/${lessonId}`)
        await audit(page, 'lesson')
        await page.goto(`/learn/${quizId}`)
        await audit(page, 'quiz briefing')
        await page.getByRole('button', { name: 'Begin', exact: true }).click()
        await expect(page.getByText('One slice of a pizza cut into 4 is…')).toBeVisible()
        await audit(page, 'quiz in progress')
    })

    test('axe: teacher screens', async () => {
        const page = teacher.page
        await page.goto(`/courses/${course.id}/activities/${quizId}/edit`)
        await expect(page.locator('#activity-title')).toBeVisible()
        await audit(page, 'quest builder (quiz)')
        await page.goto(`/courses/${course.id}/activities/${lessonId}/edit`)
        await expect(page.locator('#activity-title')).toBeVisible()
        await audit(page, 'quest builder (lesson)')
        await page.goto(`/courses/${course.id}`)
        await audit(page, 'course manage view')
    })

    test('keyboard: Tab reaches the navigation and main actions, with a visible focus ring', async () => {
        const page = student.page
        await page.goto(`/learn/${lessonId}`)
        await page.waitForLoadState('networkidle')
        const seen: { text: string; inNav: boolean; visibleFocus: boolean }[] = []
        for (let i = 0; i < 60; i++) {
            await page.keyboard.press('Tab')
            seen.push(
                await page.evaluate(() => {
                    const el = document.activeElement as HTMLElement | null
                    if (!el || el === document.body) return { text: '', inNav: false, visibleFocus: false }
                    const style = getComputedStyle(el)
                    const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
                    const ring = style.boxShadow && style.boxShadow !== 'none'
                    return {
                        text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
                        inNav: !!el.closest('nav, aside, [role=navigation]'),
                        visibleFocus: outline || !!ring,
                    }
                }),
            )
            if (seen.at(-1)?.text === 'Complete lesson') break
        }
        expect(
            seen.some((s) => s.inNav),
            'Tab reaches the side navigation',
        ).toBe(true)
        const action = seen.find((s) => s.text === 'Complete lesson')
        expect(action, 'Tab reaches “Complete lesson”').toBeTruthy()
        const invisible = seen.filter((s) => s.text && !s.visibleFocus).map((s) => s.text)
        if (invisible.length) {
            record({
                page: 'lesson (keyboard)',
                rule: 'focus-visible',
                impact: 'serious',
                description: 'Focused element shows no outline or ring',
                targets: [...new Set(invisible)].slice(0, 10),
            })
        }
        expect.soft(invisible, 'every focused element shows a focus indicator').toEqual([])
    })

    test('reduced motion: the reward moment still appears and closes', async () => {
        const page = student.page
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`/learn/${lessonId}`)
        await page.getByRole('button', { name: 'Complete lesson', exact: true }).click()
        const dialog = page.getByRole('dialog').first()
        await expect(dialog).toBeVisible()
        await expect(dialog.getByRole('button', { name: /continue/i }).first()).toBeVisible()
        await audit(page, 'reward dialog (reduced motion)')
        await dismissDialogs(page)
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await page.emulateMedia({ reducedMotion: null })
    })
})
