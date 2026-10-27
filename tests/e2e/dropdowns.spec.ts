import { expect, test, type Locator, type Page } from '@playwright/test'
import { createCourse, World, type Session } from './fixtures'

/*
 * Dropdown menus after the accessibility fix that moved the menu props onto the trigger button: the
 * header user menu and the course "Published" status menu open by mouse and by keyboard (Enter and
 * Space), arrow keys move between items, and Escape closes the menu and returns focus to the trigger.
 */

async function expectKeyboardMenu(page: Page, trigger: Locator, key: 'Enter' | ' ') {
    await trigger.focus()
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await page.keyboard.press(key === ' ' ? 'Space' : key)
    const menu = page.getByRole('menu')
    await expect(menu).toBeVisible()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    const items = menu.getByRole('menuitem')
    expect(await items.count(), 'the menu has items').toBeGreaterThan(1)
    // Focus lands inside the menu; ArrowDown moves it to another item
    const focusedText = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? '')
    await page.keyboard.press('ArrowDown')
    const first = await focusedText()
    await page.keyboard.press('ArrowDown')
    const second = await focusedText()
    expect(second, 'ArrowDown moves to the next item').not.toBe(first)
    expect(await menu.evaluate((el) => el.contains(document.activeElement)), 'focus stays in the menu').toBe(true)

    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
}

test.describe.serial('dropdown menus', () => {
    let world: World
    let teacher: Session
    let course: { id: string; joinCode: string }

    test.beforeAll(async ({ browser }) => {
        world = new World(browser)
        teacher = await world.signIn(await world.account('teacher', 'teacher'))
        course = await createCourse(world, teacher.page, 'ZZ E2E Dropdowns')
    })
    test.afterAll(async () => world?.cleanup())

    test('header user menu: mouse opens it and shows Sign out', async () => {
        const page = teacher.page
        await page.goto('/')
        const trigger = page.getByRole('button', { name: /^Signed in as / })
        await trigger.click()
        const menu = page.getByRole('menu')
        await expect(menu).toBeVisible()
        await expect(menu.getByRole('button', { name: 'Sign out' })).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(menu).toBeHidden()
    })

    test('header user menu: Enter and Space open it, arrows move, Escape returns focus', async () => {
        const page = teacher.page
        await page.goto('/')
        const trigger = page.getByRole('button', { name: /^Signed in as / })
        await expectKeyboardMenu(page, trigger, 'Enter')
        await expectKeyboardMenu(page, trigger, ' ')
    })

    test('course “Published” menu: mouse and keyboard', async () => {
        const page = teacher.page
        await page.goto(`/courses/${course.id}`)
        const trigger = page.getByRole('button', { name: 'Published', exact: true })
        await trigger.click()
        const menu = page.getByRole('menu')
        await expect(menu.getByRole('menuitem', { name: 'Move back to draft' })).toBeVisible()
        await expect(menu.getByRole('menuitem', { name: 'Archive course' })).toBeVisible()
        await page.keyboard.press('Escape')
        await expect(menu).toBeHidden()
        await expectKeyboardMenu(page, trigger, 'Enter')
    })
})
