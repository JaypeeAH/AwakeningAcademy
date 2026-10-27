import { beforeEach, describe, expect, it } from 'vitest'
import { asUser, createActivity, createCourse, createTestDb, createUser, progressOf, type TestDb } from './testDb'

/*
 * Phase 3 at the database level: inventory (grant_item), discoveries (claim_discovery), the Easter Bunny
 * (use_bunny_skip) and skills (use_skill / unlock_skills).
 */

async function bunnyId(db: TestDb) {
    return (await db.query<{ id: string }>(`select id from public.item_definitions where code = 'easter_bunny'`))
        .rows[0].id
}

async function charges(db: TestDb, student: string, itemId: string) {
    const { rows } = await db.query<{ charges: number }>(
        `select charges from public.inventory_items where student_id = $1 and item_id = $2`,
        [student, itemId],
    )
    return rows[0]?.charges ?? 0
}

async function createEgg(db: TestDb, courseId: string, teacher: string, rewards: object[] = []) {
    const { rows } = await db.query<{ id: string }>(
        `insert into public.easter_eggs (course_id, title, trigger, config, rewards, created_by)
         values ($1, 'The hidden library', 'streak_milestone', '{"days": 3}', $2, $3) returning id`,
        [courseId, JSON.stringify(rewards), teacher],
    )
    return rows[0].id
}

describe('inventory, discoveries and the Easter Bunny', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    let bunny: string

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
        bunny = await bunnyId(db)
    })

    const claim = (eggId: string, awards: object[] = [], items: object[] = []) =>
        db.query<{ r: { claimed: boolean; alreadyFound: boolean; awards: { awarded: boolean }[] } }>(
            `select public.claim_discovery($1, $2, $3::jsonb, $4::jsonb) as r`,
            [student, eggId, JSON.stringify(awards), JSON.stringify(items)],
        )

    it('grant_item applies once per key and never goes below zero', async () => {
        await db.query(`select public.grant_item($1, $2, 2, 'gift-1', 'Gift')`, [student, bunny])
        await db.query(`select public.grant_item($1, $2, 2, 'gift-1', 'Gift')`, [student, bunny])
        expect(await charges(db, student, bunny)).toBe(2)
        await expect(
            db.query(`select public.grant_item($1, $2, -3, 'take', 'Too many')`, [student, bunny]),
        ).rejects.toThrow(/NOT_ENOUGH_CHARGES/)
        expect(await charges(db, student, bunny)).toBe(2)
    })

    it('a discovery is claimed once: XP and exactly one Easter Bunny charge', async () => {
        const egg = await createEgg(db, courseId, teacher)
        const awards = [
            { amount: 40, source: 'secret_quest', idempotencyKey: `egg:${egg}:${student}`, reason: 'Secret' },
        ]
        const items = [{ itemId: bunny, charges: 1 }]
        const first = await claim(egg, awards, items)
        const second = await claim(egg, awards, items)
        expect(first.rows[0].r.claimed).toBe(true)
        expect(second.rows[0].r).toMatchObject({ claimed: false, alreadyFound: true })
        expect(await charges(db, student, bunny)).toBe(1)
        expect((await progressOf(db, student)).totalXp).toBe(40)
        const notes = await db.query<{ kind: string }>(`select kind from public.notifications where user_id = $1`, [
            student,
        ])
        expect(notes.rows.map((n) => n.kind)).toContain('discovery')
    })

    it('inactive secrets can’t be claimed', async () => {
        const egg = await createEgg(db, courseId, teacher)
        await db.query(`update public.easter_eggs set active = false where id = $1`, [egg])
        await expect(claim(egg)).rejects.toThrow(/SECRET_NOT_FOUND/)
    })

    describe('use_bunny_skip', () => {
        let quiz: string
        let q1: string
        let q2: string
        let attemptId: string

        beforeEach(async () => {
            quiz = await createActivity(db, courseId, teacher, 'practice_quiz')
            await db.query(`update public.activities set allow_bunny_skips = true where id = $1`, [quiz])
            const q = await db.query<{ id: string }>(
                `insert into public.questions (activity_id, kind, prompt, position) values ($1, 'single_choice', 'A', 0), ($1, 'single_choice', 'B', 1) returning id`,
                [quiz],
            )
            ;[q1, q2] = q.rows.map((r) => r.id)
            attemptId = (await db.query<{ id: string }>(`select id from public.start_attempt($1, $2)`, [student, quiz]))
                .rows[0].id
            await db.query(`select public.grant_item($1, $2, 1, 'found-one', 'Found')`, [student, bunny])
        })

        const skip = (questionId: string, who = student) =>
            db.query<{ r: { alreadySkipped: boolean; charges: number } }>(
                `select public.use_bunny_skip($1, $2, $3) as r`,
                [attemptId, who, questionId],
            )

        it('spends exactly one charge and records the skip on the attempt', async () => {
            const result = await skip(q1)
            expect(result.rows[0].r).toEqual({ alreadySkipped: false, charges: 0 })
            const again = await skip(q1)
            expect(again.rows[0].r.alreadySkipped).toBe(true)
            expect(await charges(db, student, bunny)).toBe(0)
            const attempt = await db.query<{ skipped_question_ids: string[] }>(
                `select skipped_question_ids from public.attempts where id = $1`,
                [attemptId],
            )
            expect(attempt.rows[0].skipped_question_ids).toEqual([q1])
            const history = await db.query(`select 1 from public.inventory_transactions where idempotency_key = $1`, [
                `bunny:${attemptId}:${q1}`,
            ])
            expect(history.rows).toHaveLength(1)
        })

        it('the last charge can only be spent once (a second question is refused)', async () => {
            await skip(q1)
            await expect(skip(q2)).rejects.toThrow(/NOT_ENOUGH_CHARGES/)
        })

        it('only on activities that allow it, never on exams', async () => {
            await db.query(`update public.activities set allow_bunny_skips = false where id = $1`, [quiz])
            await expect(skip(q1)).rejects.toThrow(/SKIPS_NOT_ALLOWED/)
            const exam = await createActivity(db, courseId, teacher, 'exam')
            await expect(
                db.query(`update public.activities set allow_bunny_skips = true where id = $1`, [exam]),
            ).rejects.toThrow(/activities_no_formal_skips/)
        })

        it('only the attempt’s owner, only while it’s open, only its own questions', async () => {
            const other = await createUser(db, 'other@school.test')
            await expect(skip(q1, other)).rejects.toThrow(/ATTEMPT_NOT_FOUND/)
            const foreignQuiz = await createActivity(db, courseId, teacher, 'practice_quiz')
            const foreign = await db.query<{ id: string }>(
                `insert into public.questions (activity_id, kind, prompt) values ($1, 'true_false', 'x') returning id`,
                [foreignQuiz],
            )
            await expect(skip(foreign.rows[0].id)).rejects.toThrow(/QUESTION_NOT_IN_ATTEMPT/)
            await db.query(`update public.attempts set status = 'graded' where id = $1`, [attemptId])
            await expect(skip(q1)).rejects.toThrow(/ATTEMPT_CLOSED/)
        })

        it('a skipped question can’t be graded into a score', async () => {
            await skip(q1)
            await db.query(
                `select public.finalize_attempt($1, $2, $3::jsonb, 0, 1, 0, false, '[]'::jsonb, 'pending_review')`,
                [
                    attemptId,
                    student,
                    JSON.stringify([
                        {
                            questionId: q1,
                            selectedOptionIds: [],
                            textAnswer: null,
                            outcome: 'skipped',
                            pointsAwarded: 0,
                        },
                        {
                            questionId: q2,
                            selectedOptionIds: [],
                            textAnswer: 'x',
                            outcome: 'pending_review',
                            pointsAwarded: 0,
                        },
                    ]),
                ],
            )
            await expect(
                db.query(`select public.grade_attempt($1, $2, $3::jsonb, '', 1, 1, 100, true, '[]'::jsonb)`, [
                    attemptId,
                    teacher,
                    JSON.stringify([{ questionId: q1, pointsAwarded: 1, feedback: '' }]),
                ]),
            ).rejects.toThrow(/QUESTION_SKIPPED/)
            // Marking the other question works, and the skipped one stays out of the maximum
            const graded = await db.query<{ r: { status: string } }>(
                `select public.grade_attempt($1, $2, $3::jsonb, '', 1, 1, 100, true, '[]'::jsonb) as r`,
                [attemptId, teacher, JSON.stringify([{ questionId: q2, pointsAwarded: 1, feedback: '' }])],
            )
            expect(graded.rows[0].r.status).toBe('graded')
        })
    })

    it('students can’t change inventory, discoveries or skills, and can’t read secrets', async () => {
        const egg = await createEgg(db, courseId, teacher)
        await asUser(db, student, async () => {
            await expect(
                db.query(`insert into public.inventory_items (student_id, item_id, charges) values ($1, $2, 99)`, [
                    student,
                    bunny,
                ]),
            ).rejects.toThrow(/permission denied/)
            await expect(db.query(`update public.inventory_items set charges = 99`)).rejects.toThrow(
                /permission denied/,
            )
            await expect(
                db.query(`insert into public.egg_discoveries (student_id, egg_id) values ($1, $2)`, [student, egg]),
            ).rejects.toThrow(/permission denied/)
            await expect(
                db.query(`select public.grant_item($1, $2, 5, 'cheat', 'cheat')`, [student, bunny]),
            ).rejects.toThrow(/permission denied/)
            expect((await db.query(`select * from public.easter_eggs`)).rows).toHaveLength(0)
        })
        await asUser(db, teacher, async () => {
            expect((await db.query(`select * from public.easter_eggs`)).rows).toHaveLength(1)
        })
    })
})

describe('skills', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    let practice: string

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
        practice = await createActivity(db, courseId, teacher, 'practice_quiz', { maxAttempts: 1 })
        await db.query(`update public.activities set allow_skills = true where id = $1`, [practice])
        // Make every skill reachable at level 1 for these tests
        await db.query(`update public.skill_definitions set min_level = 1, min_rank_order = 1, min_discoveries = 0`)
    })

    const useSkill = (code: string, key: string, args: { activity?: string; attempt?: string } = {}) =>
        db.query<{ r: { used: boolean; duplicate: boolean; effect: Record<string, unknown> } }>(
            `select public.use_skill($1, $2, $3, $4, $5) as r`,
            [student, code, key, args.activity ?? null, args.attempt ?? null],
        )

    it('a skill must be unlocked first; unlocking notifies once', async () => {
        await expect(useSkill('insight', 'k1', { activity: practice })).rejects.toThrow(/SKILL_LOCKED/)
        const unlocked = await db.query<{ r: string[] }>(`select public.unlock_skills($1) as r`, [student])
        expect(unlocked.rows[0].r).toContain('insight')
        const again = await db.query<{ r: string[] }>(`select public.unlock_skills($1) as r`, [student])
        expect(again.rows[0].r).toEqual([])
    })

    it('uses charges once per key, then runs out until recharge', async () => {
        await db.query(`select public.unlock_skills($1)`, [student])
        await db.query(`update public.skill_definitions set charges = 1 where code = 'insight'`)
        expect((await useSkill('insight', 'insight:a', { activity: practice })).rows[0].r.used).toBe(true)
        expect((await useSkill('insight', 'insight:a', { activity: practice })).rows[0].r.duplicate).toBe(true)
        await expect(useSkill('insight', 'insight:b', { activity: practice })).rejects.toThrow(/NO_CHARGES/)
        await db.query(`update public.skill_usages set created_at = now() - interval '25 hours'`)
        expect((await useSkill('insight', 'insight:c', { activity: practice })).rows[0].r.used).toBe(true)
    })

    it('never on exams, and only where the teacher allows skills', async () => {
        await db.query(`select public.unlock_skills($1)`, [student])
        await db.query(
            `update public.skill_definitions set eligible_kinds = '{practice_quiz,exam}' where code = 'insight'`,
        )
        const exam = await createActivity(db, courseId, teacher, 'exam')
        await db.query(`update public.activities set allow_skills = true where id = $1`, [exam])
        await expect(useSkill('insight', 'e1', { activity: exam })).rejects.toThrow(/SKILL_NOT_ELIGIBLE/)
        await db.query(`update public.activities set allow_skills = false where id = $1`, [practice])
        await expect(useSkill('insight', 'p1', { activity: practice })).rejects.toThrow(/SKILLS_NOT_ALLOWED/)
    })

    it('Time Dilation extends a timed attempt; Second Chance grants one more attempt', async () => {
        await db.query(`select public.unlock_skills($1)`, [student])
        await db.query(`update public.activities set time_limit_minutes = 10 where id = $1`, [practice])
        const attempt = (
            await db.query<{ id: string; expires_at: string }>(
                `select id, expires_at from public.start_attempt($1, $2)`,
                [student, practice],
            )
        ).rows[0]
        await useSkill('time_dilation', `td:${attempt.id}`, { attempt: attempt.id })
        const after = await db.query<{ expires_at: string }>(`select expires_at from public.attempts where id = $1`, [
            attempt.id,
        ])
        expect(new Date(after.rows[0].expires_at).getTime() - new Date(attempt.expires_at).getTime()).toBe(5 * 60_000)

        await db.query(`select public.finalize_attempt($1, $2, '[]'::jsonb, 0, 1, 0, false)`, [attempt.id, student])
        await expect(db.query(`select * from public.start_attempt($1, $2)`, [student, practice])).rejects.toThrow(
            /MAX_ATTEMPTS/,
        )
        await useSkill('second_chance', `sc:${practice}:1`, { activity: practice })
        const next = await db.query<{ attempt_no: number }>(`select attempt_no from public.start_attempt($1, $2)`, [
            student,
            practice,
        ])
        expect(next.rows[0].attempt_no).toBe(2)
    })

    it('passive skills can’t be activated', async () => {
        await db.query(`select public.unlock_skills($1)`, [student])
        await expect(useSkill('guild_leader', 'g1')).rejects.toThrow(/SKILL_NOT_AVAILABLE/)
    })
})
