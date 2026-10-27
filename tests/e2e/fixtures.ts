import { randomUUID } from 'node:crypto'
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test'

/*
 * Shared helpers for the end-to-end specs. Test data is labelled (zz-e2e-…@example.com accounts and
 * "ZZ E2E" courses) and removed by World.cleanup(), which every spec runs in afterAll — even after a
 * failure. The Supabase admin key is only used here, server-side in the test runner, to create and
 * delete those accounts; the browser only ever talks to the app.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SECRET = process.env.SUPABASE_SECRET_KEY ?? ''

async function admin<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${SUPABASE_URL}${path}`, {
        ...init,
        headers: {
            apikey: SECRET,
            Authorization: `Bearer ${SECRET}`,
            'Content-Type': 'application/json',
            ...init.headers,
        },
    })
    const text = await response.text()
    if (!response.ok)
        throw new Error(`Supabase admin ${init.method ?? 'GET'} ${path} → ${response.status}: ${text.slice(0, 300)}`)
    return (text ? JSON.parse(text) : null) as T
}

export type Role = 'student' | 'teacher' | 'admin'

export interface Account {
    id: string
    email: string
    password: string
    name: string
    role: Role
}

export interface Session {
    account: Account
    context: BrowserContext
    page: Page
}

export interface ApiResult<T = Record<string, unknown>> {
    status: number
    body: T
}

/** Calls the app's own API from the signed-in page (same origin, the user's cookies) */
export async function api<T = Record<string, unknown>>(
    page: Page,
    method: string,
    path: string,
    body?: unknown,
): Promise<ApiResult<T>> {
    return page.evaluate(
        async ({ method, path, body }) => {
            const response = await fetch(`/api${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body === undefined ? undefined : JSON.stringify(body),
            })
            const text = await response.text()
            let parsed: unknown = null
            try {
                parsed = text ? JSON.parse(text) : null
            } catch {
                parsed = text
            }
            return { status: response.status, body: parsed }
        },
        { method, path, body },
    ) as Promise<ApiResult<T>>
}

/** Everything one spec creates, so it can all be removed afterwards */
export class World {
    readonly stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`
    private readonly users: string[] = []
    private readonly courses: string[] = []
    private readonly contexts: BrowserContext[] = []

    constructor(private readonly browser: Browser) {}

    async account(role: Role, label: string): Promise<Account> {
        const email = `zz-e2e-${label}-${this.stamp}@example.com`
        const password = `E2e-${randomUUID()}`
        const name = `ZZ E2E ${label[0].toUpperCase()}${label.slice(1)}`
        const user = await admin<{ id: string }>('/auth/v1/admin/users', {
            method: 'POST',
            body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { display_name: name } }),
        })
        this.users.push(user.id)
        if (role !== 'student') {
            await admin(`/rest/v1/profiles?id=eq.${user.id}`, { method: 'PATCH', body: JSON.stringify({ role }) })
        }
        return { id: user.id, email, password, name, role }
    }

    /** Signs in through the real login form */
    async signIn(account: Account, viewport = { width: 1280, height: 800 }): Promise<Session> {
        const context = await this.browser.newContext({ viewport })
        this.contexts.push(context)
        const page = await context.newPage()
        await page.goto('/login')
        await page.locator('#email').fill(account.email)
        await page.locator('#password').fill(account.password)
        await page.locator('button[type=submit]').click()
        await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 })
        return { account, context, page }
    }

    trackCourse(courseId: string) {
        this.courses.push(courseId)
    }

    async cleanup() {
        for (const context of this.contexts) await context.close().catch(() => undefined)
        for (const id of this.courses)
            await admin(`/rest/v1/courses?id=eq.${id}`, { method: 'DELETE' }).catch(() => undefined)
        for (const id of this.users) {
            await admin(`/rest/v1/audit_events?actor_id=eq.${id}`, { method: 'DELETE' }).catch(() => undefined)
            await admin(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }).catch((e) => console.warn(String(e)))
        }
    }
}

// ── Building courses through the app's API (the same routes the Quest Builder uses) ──

export async function createCourse(world: World, teacher: Page, title = 'ZZ E2E Algebra') {
    const subjects = (await api<{ id: string; slug: string }[]>(teacher, 'GET', '/subjects')).body
    const math = subjects.find((s) => s.slug === 'mathematics') ?? subjects[0]
    const created = await api<{ course: { id: string; joinCode: string } }>(teacher, 'POST', '/courses', {
        title,
        description: 'End-to-end test course',
        subjectId: math.id,
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    world.trackCourse(created.body.course.id)
    const published = await api(teacher, 'PATCH', `/courses/${created.body.course.id}`, { status: 'published' })
    expect(published.status).toBe(200)
    return created.body.course
}

export interface QuestionSpec {
    id: string
    kind: string
    prompt: string
    points: number
    options: { id: string; label: string }[]
    key: {
        correctOptionIds: string[]
        acceptedAnswers: string[]
        caseSensitive: boolean
        explanation: string
        rubric: string
    }
}

/** A single-choice question; `correct` is the index of the right option */
export function choiceQuestion(prompt: string, labels: string[], correct: number): QuestionSpec {
    const options = labels.map((label) => ({ id: randomUUID(), label }))
    return {
        id: randomUUID(),
        kind: 'single_choice',
        prompt,
        points: 1,
        options,
        key: {
            correctOptionIds: [options[correct].id],
            acceptedAnswers: [],
            caseSensitive: false,
            explanation: 'Because.',
            rubric: '',
        },
    }
}

export async function createActivity(
    teacher: Page,
    courseId: string,
    kind: string,
    details: {
        title: string
        body?: string
        xpReward: number
        passingScore?: number
        maxAttempts?: number | null
        questions?: QuestionSpec[]
        allowSkills?: boolean
        allowBunnySkips?: boolean
        feedbackMode?: 'immediate' | 'after_due' | 'score_only'
        publish?: boolean
    },
) {
    const created = await api<{ id: string }>(teacher, 'POST', `/courses/${courseId}/activities`, {
        kind,
        title: details.title,
        moduleId: null,
    })
    expect(created.status, JSON.stringify(created.body)).toBe(201)
    const saved = await api(teacher, 'PUT', `/activities/${created.body.id}`, {
        title: details.title,
        summary: '',
        body: details.body ?? '',
        objectives: [],
        moduleId: null,
        difficulty: 2,
        xpReward: details.xpReward,
        estimatedMinutes: 5,
        opensAt: null,
        dueAt: null,
        maxAttempts: details.maxAttempts ?? null,
        timeLimitMinutes: null,
        passingScore: details.passingScore ?? 0,
        feedbackMode: details.feedbackMode ?? 'immediate',
        allowSkills: details.allowSkills ?? false,
        allowBunnySkips: details.allowBunnySkips ?? false,
        xpRepeatable: false,
        prerequisiteIds: [],
        questions: details.questions ?? [],
    })
    expect(saved.status, JSON.stringify(saved.body)).toBe(200)
    if (details.publish !== false) {
        const published = await api(teacher, 'POST', `/activities/${created.body.id}/status`, { status: 'published' })
        expect(published.status, JSON.stringify(published.body)).toBe(200)
    }
    return created.body.id
}

export async function joinCourse(student: Page, joinCode: string) {
    const joined = await api(student, 'POST', '/courses/join', { code: joinCode })
    expect(joined.status, JSON.stringify(joined.body)).toBe(200)
}

export interface Status {
    progress: { level: number; totalXp: number }
    rank: { code: string }
    trial: { rank: { code: string }; eligible: boolean; requirements: { key: string; met: boolean }[] } | null
}

export const status = async (page: Page) => (await api<Status>(page, 'GET', '/me/status')).body

/** No horizontal page scroll (the layout fits the viewport) */
export async function expectNoHorizontalOverflow(page: Page, label: string) {
    const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
    }))
    expect(scroll, `${label}: page is ${scroll}px wide in a ${client}px viewport`).toBeLessThanOrEqual(client + 1)
}
