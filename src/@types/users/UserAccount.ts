import { z } from 'zod'
import { DisplayNameSchema } from '@/@types/auth/AuthSchema'
import { ROLES, type Role } from '@/@types/auth/Roles'

export interface UserAccount {
    id: string
    email: string
    displayName: string
    role: Role
    createdAt: Date
    level: number | null
    rankCode: string | null
    totalXp: number | null
}

export const UsersQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    role: z.enum(ROLES).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
})
export type UsersQuery = z.infer<typeof UsersQuerySchema>

export const SetRoleSchema = z.object({ role: z.enum(ROLES) })
export type SetRoleInput = z.infer<typeof SetRoleSchema>

/** PATCH /api/me/profile */
export const UpdateProfileSchema = z.object({
    displayName: DisplayNameSchema.optional(),
    equippedTitleId: z.string().uuid().nullable().optional(),
    /** Stay off every leaderboard */
    leaderboardHidden: z.boolean().optional(),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
