import type { Metadata } from 'next'
import AchievementsClientPage from '@/components/achievements/AchievementsClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Achievements' }

export default async function AchievementsPage() {
    await requirePagePermission('play')
    return <AchievementsClientPage />
}
