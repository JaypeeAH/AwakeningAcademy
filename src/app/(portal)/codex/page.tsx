import type { Metadata } from 'next'
import CodexClientPage from '@/components/codex/CodexClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Codex' }

export default async function CodexPage() {
    await requirePagePermission('play')
    return <CodexClientPage />
}
