import { expect, test } from '@playwright/test'
import {
    choiceQuestion,
    createActivity,
    createCourse,
    expectNoHorizontalOverflow,
    joinCourse,
    World,
    type Session,
} from './fixtures'

/*
 * Acceptance workflow 15: the main screens work on a phone (360), a tablet (768) and a desktop (1280):
 * they render, have no sideways scrolling, and keep their primary action reachable. Screenshots are
 * attached to the report.
 */

const VIEWPORTS = [
    { name: 'mobile', width: 360, height: 740 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
]

test.describe.serial('works on desktop, tablet and mobile', () => {
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
        course = await createCourse(world, teacher.page, 'ZZ E2E Responsive')
        lessonId = await createActivity(teacher.page, course.id, 'lesson', {
            title: 'Reading a number line',
            body: '## Number lines\n\nA number line shows numbers **in order**.\n\n| Number | Position |\n| --- | --- |\n| 0 | start |\n| 10 | end |\n\n> [!TIP]\n> Count the marks.',
            xpReward: 20,
        })
        quizId = await createActivity(teacher.page, course.id, 'quiz', {
            title: 'Number line check',
            xpReward: 30,
            passingScore: 50,
            questions: [choiceQuestion('Which number comes after 4 on a number line?', ['3', '5', '7'], 1)],
        })
        await joinCourse(student.page, course.joinCode)
    })
    test.afterAll(async () => world?.cleanup())

    for (const viewport of VIEWPORTS) {
        test(`15 · ${viewport.name} (${viewport.width}px)`, async ({}, testInfo) => {
            const screens: [Session, string, string, () => Promise<void>][] = [
                [student, 'student dashboard', '/', async () => {}],
                [student, 'quest board', '/quests', async () => {}],
                [
                    student,
                    'lesson',
                    `/learn/${lessonId}`,
                    async () => {
                        await expect(
                            student.page.getByRole('button', { name: 'Complete lesson', exact: true }),
                        ).toBeVisible()
                    },
                ],
                [
                    student,
                    'quiz briefing',
                    `/learn/${quizId}`,
                    async () => {
                        await expect(student.page.getByRole('button', { name: /Begin|Resume attempt/ })).toBeVisible()
                    },
                ],
                [
                    teacher,
                    'quest builder',
                    `/courses/${course.id}/activities/${quizId}/edit`,
                    async () => {
                        await expect(teacher.page.locator('#activity-title')).toBeVisible()
                    },
                ],
                [teacher, 'course manage view', `/courses/${course.id}`, async () => {}],
            ]
            for (const [session, label, path, check] of screens) {
                await session.page.setViewportSize({ width: viewport.width, height: viewport.height })
                await session.page.goto(path)
                await session.page.waitForLoadState('networkidle')
                await check()
                const file = testInfo.outputPath(`${viewport.name}-${label.replace(/\s+/g, '-')}.png`)
                await session.page.screenshot({ path: file, fullPage: true })
                await testInfo.attach(`${viewport.name} · ${label}`, { path: file, contentType: 'image/png' })
                await expectNoHorizontalOverflow(session.page, `${viewport.name} ${label}`)
            }
        })
    }
})
