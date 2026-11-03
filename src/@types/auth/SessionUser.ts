import type { Permission, Role } from './Roles'

/** The signed-in user, resolved on the server from the Supabase session + profile. */
export interface SessionUser {
    id: string
    email: string
    /** Set by an administrator; a second way to sign in (the only one if the email is a placeholder) */
    username: string | null
    name: string
    role: Role
    permissions: Permission[]
}
