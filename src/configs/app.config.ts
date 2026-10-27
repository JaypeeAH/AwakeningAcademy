/** App-wide names and every route path. Components never hard-code URLs — they use these. */

export const portalName = 'The Awakening Academy'
export const portalShortName = 'Awakening Academy'
export const portalTagline = 'Learn. Quest. Awaken.'

// ── Public ──
export const signInPath = '/login'
export const signUpPath = '/signup'
export const forgotPasswordPath = '/forgot-password'
export const resetPasswordPath = '/reset-password'

/** A link teachers share: opens sign-up with their class code filled in */
export const getSignUpWithCodePath = (joinCode: string) => `${signUpPath}?code=${encodeURIComponent(joinCode)}`
export const privacyPath = '/privacy'
export const privacyPolicyUrl = privacyPath
export const termsOfUseUrl = `${privacyPath}#terms`

// ── Auth API (full page loads / form posts) ──
export const signOutUrl = '/api/auth/sign-out'

// ── Portal ──
export const homePath = '/'
export const questsPath = '/quests'
/** HeaderSearch searches the Quest Board */
export const searchPath = questsPath
export const coursesPath = '/courses'
export const profilePath = '/profile'
export const historyPath = '/history'
export const inventoryPath = '/inventory'
export const codexPath = '/codex'
export const achievementsPath = '/achievements'

/** The Help Center: articles and FAQs for the signed-in role */
export const helpPath = '/help'
export const getHelpArticlePath = (slug: string) => `${helpPath}/${encodeURIComponent(slug)}`
export const getHelpTopicPath = (topicKey: string) => `${helpPath}?topic=${encodeURIComponent(topicKey)}`

export type CourseTab = 'content' | 'roster' | 'progress' | 'bank' | 'secrets' | 'guilds' | 'leaderboard'

export const getCoursePath = (courseId: string, tab?: CourseTab) =>
    tab && tab !== 'content' ? `${coursesPath}/${courseId}?tab=${tab}` : `${coursesPath}/${courseId}`

export const getActivityEditPath = (courseId: string, activityId: string) =>
    `${coursesPath}/${courseId}/activities/${activityId}/edit`

export const getActivityResultsPath = (courseId: string, activityId: string) =>
    `${coursesPath}/${courseId}/activities/${activityId}/results`

/** The Learning Dungeon for one activity; `attemptId` re-opens a graded attempt's result */
export const getLearnPath = (activityId: string, attemptId?: string) =>
    attemptId ? `/learn/${activityId}?attempt=${attemptId}` : `/learn/${activityId}`

/** Teachers' marking: the queue, and one attempt in the grader */
export const gradingPath = '/grading'
export const analyticsPath = '/analytics'
export const getAnalyticsPath = (courseId: string) => `${analyticsPath}?course=${courseId}`
export const getGradingPath = (attemptId: string) => `${gradingPath}/${attemptId}`

// ── Admin ──
export const adminUsersPath = '/admin/users'
export const adminProgressionPath = '/admin/progression'
export const adminAuditPath = '/admin/audit'
export const adminItemsPath = '/admin/items'
export const adminAchievementsPath = '/admin/achievements'
export const rolesPath = adminUsersPath
