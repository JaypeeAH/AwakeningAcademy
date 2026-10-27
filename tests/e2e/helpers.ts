import { expect, type Page } from '@playwright/test'
import { api } from './fixtures'

/** Closes reward / discovery / achievement dialogs one after another until none is left */
export async function dismissDialogs(page: Page, max = 8) {
    for (let i = 0; i < max; i++) {
        const dialog = page.getByRole('dialog').last()
        if (!(await dialog.isVisible().catch(() => false))) return
        const button = dialog.getByRole('button', { name: /^(continue|next|done|close|got it|nice|awesome)/i }).last()
        if (await button.isVisible().catch(() => false)) await button.click()
        else await page.keyboard.press('Escape')
        await page.waitForTimeout(400)
    }
}

export interface LedgerEntry {
    source: string
    amount: number
    reason: string
}

/** The student's XP ledger (newest first) */
export async function ledger(page: Page): Promise<LedgerEntry[]> {
    const result = await api<{ records: LedgerEntry[] }>(page, 'GET', '/me/xp-history?page=1')
    expect(result.status).toBe(200)
    return result.body.records
}

/** The id of the student's open attempt on an activity */
export async function openAttemptId(page: Page, activityId: string) {
    const view = await api<{ attempts: { id: string; status: string }[] }>(page, 'GET', `/activities/${activityId}`)
    return view.body.attempts.find((a) => a.status === 'in_progress')?.id ?? null
}
