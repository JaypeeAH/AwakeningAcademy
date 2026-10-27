import { describe, expect, it } from 'vitest'
import {
    addDays,
    bestStreak,
    currentStreak,
    localDay,
    nextMilestone,
    reachedMilestones,
    shieldableDay,
    startOfLocalDay,
    weekWindow,
} from './streaks'
import { achievementProgress, evaluateAchievement } from './achievements'
import { teamQuestProgress } from './teamQuests'
import { buildLeaderboard, initialsOf, rankByXp } from './leaderboard'
import { bossHpLeft, getBossIssues, groupByPhase } from './boss'
import type { PlayerStats } from '@/@types/game/Achievements'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'

describe('streaks and local days', () => {
    it('counts the day in the school’s time zone, not UTC', () => {
        // 23:30 UTC on 1 Nov is already 2 Nov in Sydney (UTC+11 in summer) and still 1 Nov in Los Angeles
        const instant = new Date('2026-11-01T23:30:00Z')
        expect(localDay(instant, 'UTC')).toBe('2026-11-01')
        expect(localDay(instant, 'Australia/Sydney')).toBe('2026-11-02')
        expect(localDay(instant, 'America/Los_Angeles')).toBe('2026-11-01')
    })

    it('a streak survives midnight: yesterday + today, or ending yesterday', () => {
        expect(currentStreak(['2026-11-01', '2026-11-02'], '2026-11-02')).toBe(2)
        expect(currentStreak(['2026-11-01', '2026-11-02'], '2026-11-03')).toBe(2)
        expect(currentStreak(['2026-11-01', '2026-11-02'], '2026-11-04')).toBe(0)
    })

    it('finds the best streak ever and the milestones reached', () => {
        expect(bestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-11'])).toBe(3)
        expect(bestStreak([])).toBe(0)
        expect(reachedMilestones(8, [14, 3, 7, 3])).toEqual([3, 7])
        expect(nextMilestone(8, [3, 7, 14])).toBe(14)
        expect(nextMilestone(200, [3, 7])).toBeNull()
    })

    it('a Second Chance can only fill yesterday, and only when it saves a streak', () => {
        expect(shieldableDay(['2026-11-01'], '2026-11-03')).toBe('2026-11-02')
        expect(shieldableDay(['2026-11-02'], '2026-11-03')).toBeNull() // nothing missed
        expect(shieldableDay(['2026-10-20'], '2026-11-03')).toBeNull() // no streak to save
    })

    it('weeks start Monday at local midnight, including across daylight saving', () => {
        // Sydney: daylight saving starts Sunday 4 Oct 2026 (UTC+10 → UTC+11)
        const week = weekWindow(new Date('2026-10-07T02:00:00Z'), 'Australia/Sydney')
        expect(week.startDay).toBe('2026-10-05')
        expect(week.start.toISOString()).toBe('2026-10-04T13:00:00.000Z') // Mon 00:00 AEDT
        expect(week.end.toISOString()).toBe('2026-10-11T13:00:00.000Z')
        const before = weekWindow(new Date('2026-10-01T02:00:00Z'), 'Australia/Sydney')
        expect(before.start.toISOString()).toBe('2026-09-27T14:00:00.000Z') // Mon 28 Sep 00:00 AEST
        expect(before.end.toISOString()).toBe('2026-10-04T13:00:00.000Z') // a 167-hour week
        expect(startOfLocalDay('2026-11-02', 'UTC').toISOString()).toBe('2026-11-02T00:00:00.000Z')
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    })
})

describe('achievements', () => {
    const stats: PlayerStats = {
        lessonsCompleted: 3,
        assessmentsPassed: 1,
        perfectScores: 0,
        bossesDefeated: 0,
        bestStreak: 4,
        teamQuests: 0,
        discoveries: 2,
        level: 9,
        rankOrder: 2,
        totalXp: 900,
        coursesJoined: 1,
    }

    it('checks each condition type against the right stat', () => {
        expect(evaluateAchievement({ type: 'lessons_completed', min: 3 }, stats)).toBe(true)
        expect(evaluateAchievement({ type: 'lessons_completed', min: 4 }, stats)).toBe(false)
        expect(evaluateAchievement({ type: 'streak', days: 3 }, stats)).toBe(true)
        expect(evaluateAchievement({ type: 'level', min: 10 }, stats)).toBe(false)
        expect(evaluateAchievement({ type: 'rank', min: 2 }, stats)).toBe(true)
        expect(evaluateAchievement({ type: 'perfect_scores', min: 1 }, stats)).toBe(false)
    })

    it('reports progress capped at the target', () => {
        expect(achievementProgress({ type: 'discoveries', min: 5 }, stats)).toEqual({ current: 2, target: 5 })
        expect(achievementProgress({ type: 'total_xp', min: 500 }, stats)).toEqual({ current: 500, target: 500 })
    })

    it('never grants an invalid stored condition', () => {
        expect(evaluateAchievement({ type: 'level', min: 'lots' }, stats)).toBe(false)
        expect(evaluateAchievement({ type: 'unknown', min: 1 }, stats)).toBe(false)
        expect(evaluateAchievement(null, stats)).toBe(false)
    })
})

describe('team quests', () => {
    const done = (studentId: string, activityId: string, extra: { passed?: boolean; graded?: boolean } = {}) => ({
        studentId,
        activityId,
        passed: extra.passed ?? true,
        graded: extra.graded ?? false,
    })

    it('completes when every member finishes every target', () => {
        const config = { activityIds: [A, B], required: 'all' as const }
        const partial = teamQuestProgress(config, ['s1', 's2'], [done('s1', A), done('s1', B), done('s2', A)])
        expect(partial).toMatchObject({ required: 2, finished: 1, complete: false })
        const full = teamQuestProgress(
            config,
            ['s1', 's2'],
            [done('s1', A), done('s1', B), done('s2', A), done('s2', B)],
        )
        expect(full.complete).toBe(true)
    })

    it('or when N members finish (never more than the guild has)', () => {
        const config = { activityIds: [A], required: 3 }
        expect(teamQuestProgress(config, ['s1', 's2'], [done('s1', A), done('s2', A)])).toMatchObject({
            required: 2,
            complete: true,
        })
        expect(teamQuestProgress(config, ['s1', 's2', 's3', 's4'], [done('s1', A), done('s2', A)]).complete).toBe(false)
    })

    it('a failed graded target doesn’t count, and an empty guild never completes', () => {
        const config = { activityIds: [A], required: 'all' as const }
        expect(teamQuestProgress(config, ['s1'], [done('s1', A, { graded: true, passed: false })]).complete).toBe(false)
        expect(teamQuestProgress(config, [], []).complete).toBe(false)
    })
})

describe('leaderboards', () => {
    const rows = [
        { studentId: 'me', displayName: 'Ava Stone', xp: 120, hidden: false },
        { studentId: 's2', displayName: 'Ben Cruz', xp: 200, hidden: false },
        { studentId: 's3', displayName: 'Cleo Park', xp: 120, hidden: false },
        { studentId: 's4', displayName: 'Dev Rao', xp: 300, hidden: true },
        { studentId: 's5', displayName: 'Eli', xp: 0, hidden: false },
    ]

    it('off shows nothing (but still tells you your own XP)', () => {
        expect(buildLeaderboard(rows, 'off', 'me')).toEqual({
            entries: [],
            me: { xp: 120, position: null, hidden: false },
        })
    })

    it('initials mode never sends names or ids', () => {
        const board = buildLeaderboard(rows, 'initials', 'me')
        expect(board.entries.map((e) => e.label)).toEqual(['B. C.', 'A. S. (you)', 'C. P.'])
        const json = JSON.stringify(board)
        for (const secret of ['Ben', 'Cleo', 's2', 's3', 'Dev', 's4']) expect(json).not.toContain(secret)
    })

    it('hidden students and zero XP are left out; ties share a position', () => {
        const board = buildLeaderboard(rows, 'names', 'me')
        expect(board.entries.map((e) => [e.position, e.label])).toEqual([
            [1, 'Ben Cruz'],
            [2, 'Ava Stone (you)'],
            [2, 'Cleo Park'],
        ])
        expect(board.me).toEqual({ xp: 120, position: 2, hidden: false })
        const hiddenMe = buildLeaderboard(rows, 'names', 's4')
        expect(hiddenMe.me).toEqual({ xp: 300, position: null, hidden: true })
        expect(hiddenMe.entries.some((e) => e.isYou)).toBe(false)
    })

    it('ranks with shared positions', () => {
        expect(rankByXp([{ xp: 5 }, { xp: 9 }, { xp: 5 }, { xp: 1 }]).map((r) => r.position)).toEqual([1, 2, 2, 4])
        expect(initialsOf('  maria  de la cruz ')).toBe('M. D. L.')
    })
})

describe('boss battles', () => {
    it('HP comes only from the graded score', () => {
        expect(bossHpLeft(72.4)).toBe(28)
        expect(bossHpLeft(100)).toBe(0)
        expect(bossHpLeft(null)).toBe(100)
    })

    it('groups questions by phase and checks the battle can be published', () => {
        const qs = [{ phase: 2 }, { phase: 1 }, { phase: 2 }]
        expect(groupByPhase(qs, 2).map((g) => [g.phase, g.questions.length])).toEqual([
            [1, 1],
            [2, 2],
        ])
        expect(getBossIssues({ name: 'Hydra', phases: ['Heads', 'Tail'] }, qs)).toEqual([])
        expect(getBossIssues({ name: 'Hydra', phases: ['Heads', 'Tail', 'Core'] }, qs)).toEqual([
            '“Core” has no questions.',
        ])
        expect(getBossIssues(null, qs)).toEqual(['Name the boss and its phases.'])
    })
})
