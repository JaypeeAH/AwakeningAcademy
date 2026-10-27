import type { Metadata } from 'next'
import { getCurrentUser } from '@/server/actions/auth'
import StudentDashboardClientPage from '@/components/dashboard/StudentDashboardClientPage'
import TeacherDashboardClientPage from '@/components/dashboard/TeacherDashboardClientPage'
import AdminDashboardClientPage from '@/components/dashboard/AdminDashboardClientPage'

export const metadata: Metadata = { title: 'Dashboard' }

/** Each role has its own dashboard: students their status window, teachers their classes, admins the platform. */
export default async function DashboardPage() {
    const user = await getCurrentUser()
    if (user?.role === 'admin') return <AdminDashboardClientPage />
    if (user?.role === 'teacher') return <TeacherDashboardClientPage />
    return <StudentDashboardClientPage />
}
