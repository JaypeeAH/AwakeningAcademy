import { beforeEach, describe, expect, it } from 'vitest'
import { asUser, awardXp, createActivity, createCourse, createTestDb, createUser, type TestDb } from './testDb'

/*
 * Phase 5 at the database level: the shared rate limiter, deleting an account with everything that
 * belongs to it (privacy requests), who can read what analytics is built from, and the Quest Builder
 * storing objectives and AI-draft flags.
 */

describe('hardening', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let classmate: string
    let otherTeacher: string
    let courseId: string

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        otherTeacher = await createUser(db, 'other@school.test', 'teacher')
        student = await createUser(db, 'ava@school.test')
        classmate = await createUser(db, 'ben@school.test')
        courseId = await createCourse(db, teacher, [student, classmate])
    })

    describe('hit_rate_limit', () => {
        const hit = (key = 'signIn:abc', max = 3) =>
            db.query<{ r: { allowed: boolean; remaining: number; retryAfter: number } }>(
                `select public.hit_rate_limit($1, 60, $2) as r`,
                [key, max],
            )

        it('allows up to the limit in a window, then refuses with a retry time', async () => {
            const results = []
            for (let i = 0; i < 4; i++) results.push((await hit()).rows[0].r)
            expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
            expect(results[2].remaining).toBe(0)
            expect(results[3].retryAfter).toBeGreaterThan(0)
            expect(results[3].retryAfter).toBeLessThanOrEqual(60)
        })

        it('counts each key separately', async () => {
            for (let i = 0; i < 3; i++) await hit('signIn:one')
            expect((await hit('signIn:two')).rows[0].r.allowed).toBe(true)
        })

        it('browser roles can’t call it or read the counters', async () => {
            await hit()
            await asUser(db, student, async () => {
                await expect(hit()).rejects.toThrow()
                await expect(db.query(`select * from public.rate_limit_hits`)).rejects.toThrow()
            })
        })
    })

    it('deleting an account removes everything personal to it, and keeps the course', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        await awardXp(db, student, 40, 'priv-1')
        const attempt = (await db.query<{ id: string }>(`select id from public.start_attempt($1, $2)`, [student, quiz]))
            .rows[0].id
        await db.query(`select public.record_learning_day($1, '2026-11-02')`, [student])
        await db.query(
            `insert into public.student_achievements (student_id, achievement_id)
             select $1, id from public.achievement_definitions limit 1`,
            [student],
        )
        await db.query(
            `insert into public.ai_draft_requests (teacher_id, course_id, provider, model, requested_count, status)
             values ($1, $2, 'anthropic', 'claude-opus-5-5', 3, 'ok')`,
            [teacher, courseId],
        )

        await db.query(`delete from auth.users where id = $1`, [student])

        for (const [table, column] of [
            ['profiles', 'id'],
            ['student_progress', 'student_id'],
            ['xp_ledger', 'student_id'],
            ['attempts', 'student_id'],
            ['learning_days', 'student_id'],
            ['student_achievements', 'student_id'],
            ['course_enrollments', 'student_id'],
        ]) {
            const { rows } = await db.query(`select 1 from public.${table} where ${column} = $1`, [student])
            expect(rows, table).toHaveLength(0)
        }
        expect((await db.query(`select 1 from public.attempts where id = $1`, [attempt])).rows).toHaveLength(0)
        expect((await db.query(`select 1 from public.courses where id = $1`, [courseId])).rows).toHaveLength(1)

        // A teacher's deletion keeps their course (creator cleared) and their AI log (teacher cleared)
        await db.query(`delete from auth.users where id = $1`, [teacher])
        const course = await db.query<{ created_by: string | null }>(
            `select created_by from public.courses where id = $1`,
            [courseId],
        )
        expect(course.rows[0].created_by).toBeNull()
        const log = await db.query<{ teacher_id: string | null }>(`select teacher_id from public.ai_draft_requests`)
        expect(log.rows[0].teacher_id).toBeNull()
    })

    it('analytics sources: other teachers and classmates can’t read a student’s work', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        await db.query(`select id from public.start_attempt($1, $2)`, [student, quiz])
        await awardXp(db, student, 25, 'priv-2')

        await asUser(db, otherTeacher, async () => {
            expect((await db.query(`select * from public.attempts`)).rows).toHaveLength(0)
            expect((await db.query(`select * from public.xp_ledger`)).rows).toHaveLength(0)
            expect((await db.query(`select * from public.ai_draft_requests`)).rows).toHaveLength(0)
        })
        await asUser(db, classmate, async () => {
            expect(
                (await db.query(`select * from public.attempts where student_id = $1`, [student])).rows,
            ).toHaveLength(0)
            expect(
                (await db.query(`select * from public.xp_ledger where student_id = $1`, [student])).rows,
            ).toHaveLength(0)
        })
        await asUser(db, teacher, async () => {
            expect(
                (await db.query(`select * from public.attempts where student_id = $1`, [student])).rows,
            ).toHaveLength(1)
        })
    })

    it('the Quest Builder save stores each question’s objective and AI-draft flag', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        const question = (id: string, extra: object) => ({
            id,
            kind: 'true_false',
            prompt: 'Q',
            points: 1,
            options: [
                { id: crypto.randomUUID(), label: 'True' },
                { id: crypto.randomUUID(), label: 'False' },
            ],
            key: { correctOptionIds: [], acceptedAnswers: [] },
            ...extra,
        })
        await db.query(`select public.save_activity_content($1, $2::jsonb, '{}')`, [
            quiz,
            JSON.stringify([
                question(crypto.randomUUID(), { objective: 'Add fractions', aiDraft: true }),
                question(crypto.randomUUID(), {}),
            ]),
        ])
        const { rows } = await db.query<{ objective: string; ai_draft: boolean }>(
            `select objective, ai_draft from public.questions where activity_id = $1 order by position`,
            [quiz],
        )
        expect(rows).toEqual([
            { objective: 'Add fractions', ai_draft: true },
            { objective: '', ai_draft: false },
        ])
    })
})
