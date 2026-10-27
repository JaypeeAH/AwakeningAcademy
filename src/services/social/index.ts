import useSWR, { type SWRConfiguration } from 'swr'
import api from '@/services/api'
import { tryParseDate } from '@/utils/parse'
import type { StreakStatus } from '@/@types/progression/Streak'
import type { AchievementBook, AchievementDefinition, SaveAchievementInput } from '@/@types/game/Achievements'
import type {
    CourseGuilds,
    CourseSocialSettingsInput,
    GuildMemberActionInput,
    Leaderboard,
    SaveGuildInput,
} from '@/@types/game/Guilds'

/* Streaks, achievements, guilds and leaderboards (Phase 4). Rewards are decided by the server. */

export const streakUrl = '/me/streak'
export const achievementsUrl = '/me/achievements'
export const adminAchievementsUrl = '/admin/achievements'
export const getCourseGuildsUrl = (courseId: string) => `/courses/${courseId}/guilds`
export const getLeaderboardUrl = (courseId: string) => `/courses/${courseId}/leaderboard`

// ── Streak ──

export const apiGetStreak = () => api.fetchJson<StreakStatus>({ method: 'get', url: streakUrl })

export const useSWRStreak = (enabled = true, config?: SWRConfiguration<StreakStatus>) =>
    useSWR(enabled ? streakUrl : null, apiGetStreak, config)

export const apiShieldStreak = () => api.fetchJson<StreakStatus>({ method: 'post', url: `${streakUrl}/shield` })

// ── Achievements ──

export const apiGetAchievements = async (): Promise<AchievementBook> => {
    const book = await api.fetchJson<AchievementBook>({ method: 'get', url: achievementsUrl })
    return { ...book, achievements: book.achievements.map((a) => ({ ...a, earnedAt: tryParseDate(a.earnedAt) })) }
}

export const useSWRAchievements = (config?: SWRConfiguration<AchievementBook>) =>
    useSWR(achievementsUrl, apiGetAchievements, config)

export const apiGetAchievementDefinitions = () =>
    api.fetchJson<AchievementDefinition[]>({ method: 'get', url: adminAchievementsUrl })

export const useSWRAchievementDefinitions = (config?: SWRConfiguration<AchievementDefinition[]>) =>
    useSWR(adminAchievementsUrl, apiGetAchievementDefinitions, config)

export const apiCreateAchievement = (input: SaveAchievementInput) =>
    api.fetchJson<AchievementDefinition>({ method: 'post', url: adminAchievementsUrl, data: input })

export const apiUpdateAchievement = (id: string, input: SaveAchievementInput) =>
    api.fetchJson<AchievementDefinition>({ method: 'put', url: `${adminAchievementsUrl}/${id}`, data: input })

export const apiDeleteAchievement = (id: string) =>
    api.fetchJson<void>({ method: 'delete', url: `${adminAchievementsUrl}/${id}` })

// ── Guilds ──

const ensureGuilds = (data: CourseGuilds): CourseGuilds => ({
    ...data,
    guilds: data.guilds.map((g) => ({
        ...g,
        members: g.members.map((m) => ({ ...m, joinedAt: tryParseDate(m.joinedAt) as Date })),
    })),
})

const guildsCall = async (method: 'get' | 'post' | 'put' | 'delete', url: string, data?: unknown) =>
    ensureGuilds(await api.fetchJson<CourseGuilds>({ method, url, data }))

export const apiGetCourseGuilds = (courseId: string) => guildsCall('get', getCourseGuildsUrl(courseId))

export const useSWRCourseGuilds = (courseId: string | null, config?: SWRConfiguration<CourseGuilds>) =>
    useSWR(courseId ? getCourseGuildsUrl(courseId) : null, () => apiGetCourseGuilds(courseId!), config)

export const apiCreateGuild = (courseId: string, input: SaveGuildInput) =>
    guildsCall('post', getCourseGuildsUrl(courseId), input)
export const apiUpdateGuild = (guildId: string, input: SaveGuildInput) => guildsCall('put', `/guilds/${guildId}`, input)
export const apiDeleteGuild = (guildId: string) => guildsCall('delete', `/guilds/${guildId}`)
export const apiApproveGuild = (guildId: string) => guildsCall('post', `/guilds/${guildId}/approve`)
export const apiManageGuildMember = (guildId: string, input: GuildMemberActionInput) =>
    guildsCall('post', `/guilds/${guildId}/members`, input)
export const apiUpdateCourseSocial = (courseId: string, input: CourseSocialSettingsInput) =>
    guildsCall('put', `/courses/${courseId}/social`, input)

/** Student actions */
export const apiRequestToJoin = (guildId: string) => guildsCall('post', `/guilds/${guildId}/join`)
export const apiLeaveGuild = (courseId: string) => guildsCall('post', `${getCourseGuildsUrl(courseId)}/leave`)
export const apiFoundGuild = (courseId: string, input: SaveGuildInput) =>
    guildsCall('post', `${getCourseGuildsUrl(courseId)}/found`, input)

// ── Leaderboard ──

export const apiGetLeaderboard = async (courseId: string): Promise<Leaderboard> => {
    const board = await api.fetchJson<Leaderboard>({ method: 'get', url: getLeaderboardUrl(courseId) })
    return { ...board, weekStart: tryParseDate(board.weekStart) as Date, weekEnd: tryParseDate(board.weekEnd) as Date }
}

export const useSWRLeaderboard = (courseId: string | null, config?: SWRConfiguration<Leaderboard>) =>
    useSWR(courseId ? getLeaderboardUrl(courseId) : null, () => apiGetLeaderboard(courseId!), config)
