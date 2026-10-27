import { beforeEach, describe, expect, it } from 'vitest'
import { asUser, createActivity, createCourse, createTestDb, createUser, progressOf, type TestDb } from './testDb'

/*
 * Phase 4 at the database level: learning days and the streak shield, achievements, guild team quests,
 * leaderboards (and what students can read), and boss phases in the Quest Builder save.
 */

describe('streaks, achievements, team quests and leaderboards', () => {
    let db: TestDb
    let teacher: string
    let ava: string
    let ben: string
    let outsider: string
    let courseId: string

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        ava = await createUser(db, 'ava@school.test')
        ben = await createUser(db, 'ben@school.test')
        outsider = await createUser(db, 'outsider@school.test')
        courseId = await createCourse(db, teacher, [ava, ben])
    })

    describe('learning days and the streak shield', () => {
        const unlockSecondChance = async (student: string) => {
            await db.query(
                `insert into public.student_skills (student_id, skill_id)
                 select $1, id from public.skill_definitions where code = 'second_chance'`,
                [student],
            )
        }

        it('records each local day once', async () => {
            const day = (d: string) =>
                db.query<{ r: boolean }>(`select public.record_learning_day($1, $2::date) as r`, [ava, d])
            expect((await day('2026-11-02')).rows[0].r).toBe(true)
            expect((await day('2026-11-02')).rows[0].r).toBe(false)
            const { rows } = await db.query(`select * from public.learning_days where student_id = $1`, [ava])
            expect(rows).toHaveLength(1)
        })

        it('a Second Chance fills one empty day, once per key, and needs the skill and a charge', async () => {
            const shield = (key: string, day = '2026-11-02') =>
                db.query<{ r: { shielded: boolean; duplicate: boolean } }>(
                    `select public.shield_streak($1, $2::date, $3) as r`,
                    [ava, day, key],
                )
            await expect(shield('shield-1')).rejects.toThrow(/SKILL_LOCKED/)
            await unlockSecondChance(ava)
            expect((await shield('shield-1')).rows[0].r).toMatchObject({ shielded: true })
            expect((await shield('shield-1')).rows[0].r).toMatchObject({ shielded: false, duplicate: true })
            // Seeded Second Chance has one charge per 72 hours
            await expect(shield('shield-2', '2026-11-05')).rejects.toThrow(/NO_CHARGES/)
            await db.query(
                `update public.skill_usages set created_at = now() - interval '4 days' where student_id = $1`,
                [ava],
            )
            await expect(shield('shield-3', '2026-11-02')).rejects.toThrow(/NOTHING_TO_SHIELD/)
            const { rows } = await db.query<{ shielded: boolean }>(
                `select shielded from public.learning_days where student_id = $1`,
                [ava],
            )
            expect(rows).toEqual([{ shielded: true }])
        })
    })

    describe('achievements', () => {
        const achievement = async (code: string) =>
            (await db.query<{ id: string }>(`select id from public.achievement_definitions where code = $1`, [code]))
                .rows[0].id
        const grant = (student: string, id: string, amount = 10) =>
            db.query<{ r: { granted: boolean } }>(`select public.grant_achievement($1, $2, $3::jsonb) as r`, [
                student,
                id,
                JSON.stringify([
                    { amount, source: 'achievement', idempotencyKey: `achievement:${id}:${student}`, reason: 'Test' },
                ]),
            ])

        it('is granted once, with its XP once, and a notification', async () => {
            const id = await achievement('first_steps')
            expect((await grant(ava, id)).rows[0].r.granted).toBe(true)
            expect((await grant(ava, id)).rows[0].r.granted).toBe(false)
            expect((await progressOf(db, ava)).totalXp).toBe(10)
            const notes = await db.query(
                `select 1 from public.notifications where user_id = $1 and kind = 'achievement'`,
                [ava],
            )
            expect(notes.rows).toHaveLength(1)
        })

        it('inactive achievements can’t be granted', async () => {
            const id = await achievement('bookworm')
            await db.query(`update public.achievement_definitions set active = false where id = $1`, [id])
            await expect(grant(ava, id)).rejects.toThrow(/ACHIEVEMENT_NOT_FOUND/)
        })

        it('students see their own achievements and visible definitions, never secret ones', async () => {
            await grant(ava, await achievement('first_steps'))
            await asUser(db, ben, async () => {
                expect((await db.query(`select * from public.student_achievements`)).rows).toHaveLength(0)
                const defs = await db.query<{ code: string }>(`select code from public.achievement_definitions`)
                expect(defs.rows.map((d) => d.code)).not.toContain('lorekeeper')
                await expect(
                    db.query(
                        `insert into public.student_achievements (student_id, achievement_id)
                              select $1, id from public.achievement_definitions limit 1`,
                        [ben],
                    ),
                ).rejects.toThrow()
            })
        })
    })

    describe('guilds and team quests', () => {
        let guild: string
        let quest: string

        beforeEach(async () => {
            guild = (
                await db.query<{ id: string }>(
                    `insert into public.guilds (course_id, name, created_by) values ($1, 'Owls', $2) returning id`,
                    [courseId, teacher],
                )
            ).rows[0].id
            for (const s of [ava, ben]) {
                await db.query(
                    `insert into public.guild_members (guild_id, course_id, student_id) values ($1, $2, $3)`,
                    [guild, courseId, s],
                )
            }
            quest = await createActivity(db, courseId, teacher, 'team_quest', { xp: 75 })
        })

        const complete = (members: string[]) =>
            db.query<{ r: { completed: boolean; results: { studentId: string }[] } }>(
                `select public.complete_team_quest($1, $2, $3::jsonb) as r`,
                [
                    guild,
                    quest,
                    JSON.stringify(
                        members.map((studentId) => ({
                            studentId,
                            awards: [
                                {
                                    amount: 75,
                                    source: 'team_quest',
                                    idempotencyKey: `team:${quest}:${studentId}`,
                                    reason: 'Team',
                                },
                            ],
                        })),
                    ),
                ],
            )

        it('rewards every active member once and marks the quest complete for each', async () => {
            const first = await complete([ava, ben])
            expect(first.rows[0].r.completed).toBe(true)
            expect((await complete([ava, ben])).rows[0].r.completed).toBe(false)
            expect((await progressOf(db, ava)).totalXp).toBe(75)
            expect((await progressOf(db, ben)).totalXp).toBe(75)
            const done = await db.query(`select student_id from public.activity_completions where activity_id = $1`, [
                quest,
            ])
            expect(done.rows).toHaveLength(2)
        })

        it('people who aren’t active members get nothing', async () => {
            await db.query(`update public.guild_members set status = 'pending' where student_id = $1`, [ben])
            await complete([ava, ben, outsider])
            expect((await progressOf(db, ben)).totalXp).toBe(0)
            expect((await progressOf(db, outsider)).totalXp).toBe(0)
            expect((await progressOf(db, ava)).totalXp).toBe(75)
        })

        it('one guild per student per course; outsiders can’t read the course’s guilds', async () => {
            const other = (
                await db.query<{ id: string }>(
                    `insert into public.guilds (course_id, name) values ($1, 'Foxes') returning id`,
                    [courseId],
                )
            ).rows[0].id
            await expect(
                db.query(`insert into public.guild_members (guild_id, course_id, student_id) values ($1, $2, $3)`, [
                    other,
                    courseId,
                    ava,
                ]),
            ).rejects.toThrow()
            await asUser(db, outsider, async () => {
                expect((await db.query(`select * from public.guilds`)).rows).toHaveLength(0)
                expect((await db.query(`select * from public.guild_members`)).rows).toHaveLength(0)
            })
            await asUser(db, ava, async () => {
                expect((await db.query(`select * from public.guilds`)).rows).toHaveLength(2)
                await expect(
                    db.query(`update public.guilds set name = 'Mine' where id = $1`, [guild]),
                ).rejects.toThrow()
            })
        })
    })

    describe('leaderboards', () => {
        /** XP earned in the course; `when` back-dates it (the ledger is immutable, so only tests can) */
        const xpIn = async (
            student: string,
            amount: number,
            key: string,
            source = 'quiz_completion',
            when?: string,
        ) => {
            await db.query(`select public.award_xp($1, $2, $3::public.xp_source, $4, 'test', null, $5)`, [
                student,
                amount,
                source,
                `lb-${key}`,
                courseId,
            ])
            if (when) {
                await db.exec(`alter table public.xp_ledger disable trigger xp_ledger_immutable`)
                await db.query(`update public.xp_ledger set created_at = ${when} where idempotency_key = $1`, [
                    `lb-${key}`,
                ])
                await db.exec(`alter table public.xp_ledger enable trigger xp_ledger_immutable`)
            }
        }

        it('counts only XP earned in the course within the window, never manual adjustments', async () => {
            await xpIn(ava, 30, 'a1')
            await xpIn(ava, 20, 'a2')
            await xpIn(ben, 50, 'b1', 'manual_adjustment')
            await xpIn(ben, 10, 'b-old', 'quiz_completion', `now() - interval '10 days'`)
            const { rows } = await db.query<{ student_id: string; xp: string }>(
                `select * from public.course_leaderboard($1, now() - interval '7 days', now() + interval '1 minute')`,
                [courseId],
            )
            expect(rows.map((r) => [r.student_id, Number(r.xp)])).toEqual([[ava, 50]])
        })

        it('finds a student’s best week', async () => {
            await xpIn(ava, 30, 'w1', 'quiz_completion', `'2026-10-06T10:00:00Z'`)
            await xpIn(ava, 40, 'w2', 'quiz_completion', `'2026-10-13T10:00:00Z'`)
            await xpIn(ava, 15, 'w3', 'quiz_completion', `'2026-10-14T10:00:00Z'`)
            const { rows } = await db.query<{ week_start: string | Date; xp: string }>(
                `select * from public.personal_best_week($1, $2, 'UTC')`,
                [ava, courseId],
            )
            expect(Number(rows[0].xp)).toBe(55)
        })

        it('students can’t run the leaderboard functions or read others’ XP', async () => {
            await xpIn(ben, 30, 'b2')
            await asUser(db, ava, async () => {
                await expect(
                    db.query(`select * from public.course_leaderboard($1, now() - interval '7 days', now())`, [
                        courseId,
                    ]),
                ).rejects.toThrow()
                expect(
                    (await db.query(`select * from public.xp_ledger where student_id = $1`, [ben])).rows,
                ).toHaveLength(0)
            })
        })
    })

    it('the Quest Builder save stores each question’s boss phase (clamped to 1–5)', async () => {
        const boss = await createActivity(db, courseId, teacher, 'boss_battle')
        const q = (id: string, phase: number) => ({
            id,
            kind: 'true_false',
            prompt: 'Q',
            points: 1,
            phase,
            options: [
                { id: crypto.randomUUID(), label: 'True' },
                { id: crypto.randomUUID(), label: 'False' },
            ],
            key: { correctOptionIds: [], acceptedAnswers: [] },
        })
        const ids = [crypto.randomUUID(), crypto.randomUUID()]
        await db.query(`select public.save_activity_content($1, $2::jsonb, '{}')`, [
            boss,
            JSON.stringify([q(ids[0], 2), q(ids[1], 9)]),
        ])
        const { rows } = await db.query<{ phase: number }>(
            `select phase from public.questions where activity_id = $1 order by position`,
            [boss],
        )
        expect(rows.map((r) => r.phase)).toEqual([2, 5])
    })
})
