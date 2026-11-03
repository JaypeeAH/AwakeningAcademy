import { z } from 'zod'
import { DisplayNameSchema, NewPasswordSchema } from '@/@types/auth/AuthSchema'
import { ROLES, type Role } from '@/@types/auth/Roles'
import { USERNAME_PATTERN } from '@/constants/auth.constant'

export interface UserAccount {
    id: string
    /** A placeholder for username-only accounts (see utils/accounts) */
    email: string
    username: string | null
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

export const UsernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_PATTERN, 'Use 3–32 letters, digits, dots, dashes or underscores')

/** Most accounts one "Add accounts" request may create (each is a call to Supabase Auth) */
export const MAX_NEW_ACCOUNTS = 100

/** POST /api/admin/users — username-only student accounts, optionally enrolled in a course */
export const CreateAccountsSchema = z.object({
    accounts: z
        .array(z.object({ displayName: DisplayNameSchema, username: UsernameSchema, password: NewPasswordSchema }))
        .min(1, 'Add at least one account')
        .max(MAX_NEW_ACCOUNTS, `Add up to ${MAX_NEW_ACCOUNTS} accounts at a time`),
    courseId: z.string().uuid().nullable().default(null),
})
export type CreateAccountsInput = z.infer<typeof CreateAccountsSchema>

export interface CreateAccountsResult {
    created: { username: string; displayName: string }[]
    skipped: { username: string; displayName: string; reason: string }[]
    /** The course the new accounts joined */
    courseTitle: string | null
}

/** PATCH /api/admin/users/[userId]/login — set or clear the username, or set a new password */
export const UpdateLoginSchema = z
    .object({
        username: UsernameSchema.nullable().optional(),
        password: NewPasswordSchema.optional(),
    })
    .refine((input) => input.username !== undefined || input.password !== undefined, 'Nothing to change')
export type UpdateLoginInput = z.infer<typeof UpdateLoginSchema>
