'use client'

import { useState } from 'react'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { toastError, toastSuccess } from '@/components/ui/toast/toast'
import { apiSetUserRole } from '@/services/users'
import { useUsersStore } from '@/stores/AdminStores'
import { roleLabel, type Role } from '@/@types/auth/Roles'
import type { UserAccount } from '@/@types/users/UserAccount'

interface ChangeRoleDialogProps {
    user: UserAccount | null
    role: Role | null
    onClose: () => void
}

const roleConsequence: Record<Role, string> = {
    student:
        'They will learn and earn XP like any student. They lose access to the courses they teach and to teacher reports. Their courses stay, managed by the other teachers.',
    teacher:
        'Teachers can create courses, author lessons and quizzes, and see the answers, scores and progress of the students in their courses.',
    admin: 'Administrators can manage every course, change anyone’s role, adjust XP and change the progression rules for the whole school. Only give this to people who run the platform.',
}

/** Confirms a role change, saying what the new role can do. Recorded in the audit log by the server. */
export default function ChangeRoleDialog({ user, role, onClose }: ChangeRoleDialogProps) {
    const refresh = useUsersStore((s) => s.refresh)
    const [saving, setSaving] = useState(false)
    if (!user || !role) return null

    const onConfirm = async () => {
        setSaving(true)
        try {
            await apiSetUserRole(user.id, { role })
            toastSuccess(
                `${user.displayName} is now ${role === 'admin' ? 'an' : 'a'} ${roleLabel[role].toLowerCase()}.`,
            )
            await refresh()
            onClose()
        } catch (error) {
            toastError(`Couldn’t change ${user.displayName}’s role.`, error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <ConfirmDialog
            isOpen
            onClose={onClose}
            type={role === 'admin' ? 'danger' : 'warning'}
            title={`Make ${user.displayName} ${role === 'admin' ? 'an' : 'a'} ${roleLabel[role].toLowerCase()}?`}
            confirmText={`Change to ${roleLabel[role]}`}
            onConfirm={onConfirm}
            loading={saving}
        >
            <p>{roleConsequence[role]}</p>
            {user.role === 'student' && role !== 'student' && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Their XP, rank and learning history are kept, but staff don’t take part in quests.
                </p>
            )}
        </ConfirmDialog>
    )
}
