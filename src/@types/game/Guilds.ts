import { z } from 'zod'

// ── Guilds ──

export const GUILD_EMBLEMS = ['shield', 'flame', 'star', 'moon', 'leaf', 'wave', 'bolt', 'crown'] as const
export type GuildEmblem = (typeof GUILD_EMBLEMS)[number]

export type GuildMemberStatus = 'active' | 'pending'
export type GuildRole = 'leader' | 'member'

export interface GuildMember {
    studentId: string
    displayName: string
    role: GuildRole
    status: GuildMemberStatus
    joinedAt: Date
}

export interface Guild {
    id: string
    courseId: string
    name: string
    motto: string
    emblem: GuildEmblem
    open: boolean
    status: 'active' | 'pending'
    maxMembers: number
    /** Active members (and, for teachers, pending requests) */
    members: GuildMember[]
    memberCount: number
}

/** A course's guilds as one viewer sees them */
export interface CourseGuilds {
    guilds: Guild[]
    /** Students: their guild (or pending request) in this course */
    myGuildId: string | null
    myStatus: GuildMemberStatus | null
    /** Students: may found a guild (course allows it and they've unlocked Guild Leader) */
    canFound: boolean
    studentGuilds: boolean
}

export const SaveGuildSchema = z.object({
    name: z.string().trim().min(2, 'Give the guild a name').max(40),
    motto: z.string().trim().max(120).default(''),
    emblem: z.enum(GUILD_EMBLEMS).default('shield'),
    open: z.boolean().default(true),
    maxMembers: z.number().int().min(2).max(30).default(6),
})
export type SaveGuildInput = z.infer<typeof SaveGuildSchema>

export const GuildMemberActionSchema = z.object({
    studentId: z.string().uuid(),
    action: z.enum(['add', 'approve', 'reject', 'remove', 'make_leader']),
})
export type GuildMemberActionInput = z.infer<typeof GuildMemberActionSchema>

export const CourseSocialSettingsSchema = z.object({
    leaderboardMode: z.enum(['off', 'initials', 'names']),
    studentGuilds: z.boolean(),
})
export type CourseSocialSettingsInput = z.infer<typeof CourseSocialSettingsSchema>

// ── Team quests ──

export const TeamConfigSchema = z.object({
    /** Activities in the course every counted member must complete (graded ones: passed) */
    activityIds: z.array(z.string().uuid()).min(1, 'Choose at least one activity').max(10),
    /** Everyone in the guild, or at least this many members */
    required: z.union([z.literal('all'), z.number().int().min(1).max(30)]),
})
export type TeamConfig = z.infer<typeof TeamConfigSchema>

export interface TeamQuestStatus {
    guild: { id: string; name: string; emblem: GuildEmblem } | null
    required: number
    targets: { id: string; title: string }[]
    members: { displayName: string; isYou: boolean; done: number; total: number; complete: boolean }[]
    completedAt: Date | null
}

/** A team quest the student's guild just completed (level changes arrive with the usual notifications) */
export interface TeamQuestReward {
    activityId: string
    title: string
    guildName: string
    xpGained: number
}

// ── Leaderboards ──

export type LeaderboardMode = 'off' | 'initials' | 'names'

export const leaderboardModeLabel: Record<LeaderboardMode, string> = {
    off: 'Off',
    initials: 'Initials only',
    names: 'Display names',
}

export interface LeaderboardEntry {
    /** Position-based key: other students' ids are never sent */
    key: string
    position: number
    label: string
    xp: number
    isYou: boolean
}

export interface Leaderboard {
    mode: LeaderboardMode
    weekStart: Date
    weekEnd: Date
    entries: LeaderboardEntry[]
    guilds: { key: string; position: number; name: string; emblem: GuildEmblem; xp: number; isYours: boolean }[]
    me: { xp: number; position: number | null; hidden: boolean; bestWeek: { weekStart: string; xp: number } | null }
}
