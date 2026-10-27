import { defineConfig, devices } from '@playwright/test'

/*
 * End-to-end tests for the acceptance workflows, run against an already-running app (normally your dev
 * server on :3000 — these tests never start or stop one) and its real Supabase project. Each spec creates
 * labelled zz-e2e-…@example.com accounts and its own course, and deletes them afterwards.
 *
 *   npm run test:e2e                      (reads .env.local for the Supabase admin key)
 *   E2E_BASE_URL=https://… npm run test:e2e
 *
 * Uses the installed Google Chrome (no Playwright browser download).
 */
export default defineConfig({
    testDir: 'tests/e2e',
    testMatch: '**/*.spec.ts',
    globalSetup: './tests/e2e/global-setup.ts',
    fullyParallel: false,
    workers: 1,
    retries: 1,
    timeout: 120_000,
    expect: { timeout: 15_000 },
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        actionTimeout: 20_000,
        navigationTimeout: 60_000,
    },
    projects: [
        {
            name: 'desktop',
            use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1280, height: 800 } },
        },
    ],
})
