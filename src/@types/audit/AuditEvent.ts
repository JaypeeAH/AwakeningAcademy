import { z } from 'zod'
import type { Role } from '@/@types/auth/Roles'

export interface AuditEvent {
    id: number
    action: string
    entityType: string
    entityId: string | null
    details: Record<string, unknown>
    actorName: string | null
    actorRole: Role | null
    createdAt: Date
}

export const AuditQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    entityType: z.string().max(40).optional(),
})
export type AuditQuery = z.infer<typeof AuditQuerySchema>

/** Human wording for audit actions */
export const auditActionLabel: Record<string, string> = {
    'user.role_changed': 'Changed a role',
    'xp.adjusted': 'Adjusted XP',
    'progression.updated': 'Updated progression rules',
    'course.created': 'Created a course',
    'course.updated': 'Updated a course',
    'course.join_code_reset': 'Reset a join code',
    'course.student_added': 'Added a student',
    'course.student_removed': 'Removed a student',
    'activity.published': 'Published an activity',
    'activity.unpublished': 'Unpublished an activity',
    'activity.archived': 'Archived an activity',
    'activity.deleted': 'Deleted an activity',
}
