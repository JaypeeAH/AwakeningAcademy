import type { Metadata } from 'next'
import ProfileClientPage from '@/components/profile/ProfileClientPage'
import { requirePagePermission } from '@/server/actions/auth'

export const metadata: Metadata = { title: 'Player Profile' }

export default async function ProfilePage() {
    await requirePagePermission('play')
    return <ProfileClientPage />
}
