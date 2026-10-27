export const ROLES = ['student', 'teacher', 'admin'] as const
export type Role = (typeof ROLES)[number]

/**
 * What each role may do. API routes check these with `apiAuthHandler(permission, …)`; the UI hides
 * actions with `useSession().can(permission)` — the server check is the one that counts.
 */
export const PERMISSIONS = [
    'play', // learn: join courses, complete lessons, attempt quizzes, earn XP
    'courses.manage', // create courses, author content, manage rosters (own courses; admins: all)
    'results.view', // view attempts, grades and progress of students in their courses
    'users.manage', // change roles, adjust XP
    'progression.manage', // level formula, ranks, XP limits
    'audit.view',
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const rolePermissions: Record<Role, readonly Permission[]> = {
    student: ['play'],
    teacher: ['courses.manage', 'results.view'],
    admin: ['courses.manage', 'results.view', 'users.manage', 'progression.manage', 'audit.view'],
}

export const roleLabel: Record<Role, string> = {
    student: 'Student',
    teacher: 'Teacher',
    admin: 'Administrator',
}

export const roleTagClass: Record<Role, string> = {
    student: 'bg-primary-subtle text-primary border-transparent',
    teacher: 'bg-success-subtle text-success border-transparent',
    admin: 'bg-gold-subtle text-gold border-transparent',
}

export const hasPermission = (role: Role, permission: Permission) => rolePermissions[role].includes(permission)
