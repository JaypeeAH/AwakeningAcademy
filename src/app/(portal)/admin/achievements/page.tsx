import type { Metadata } from 'next'
import { requirePagePermission } from '@/server/actions/auth'
import AchievementsClientPage from '@/components/admin/achievements/AchievementsClientPage'
import { AchievementDefinitionsSWRProvider } from '@/components/admin/achievements/AchievementsSWRProvider'

export const metadata: Metadata = { title: 'Achievements' }

export default async function AdminAchievementsPage() {
    await requirePagePermission('progression.manage')
    return (
        <AchievementDefinitionsSWRProvider>
            <AchievementsClientPage />
        </AchievementDefinitionsSWRProvider>
    )
}
