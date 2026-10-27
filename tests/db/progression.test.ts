import { beforeEach, describe, expect, it } from 'vitest'
import {
    asUser,
    awardXp,
    createActivity,
    createCourse,
    createTestDb,
    createUser,
    progressOf,
    subjectId,
    type TestDb,
} from './testDb'

/** Adds a completion row directly (what finalize_attempt / complete_lesson would leave behind). */
async function addCompletion(
    db: TestDb,
    studentId: string,
    activityId: string,
    courseId: string,
    kind: string,
    percent: number | null,
    passed: boolean,
) {
    await db.query(
        `insert into public.activity_completions (student_id, activity_id, course_id, kind, best_percent, passed, attempts_count)
         values ($1, $2, $3, $4, $5, $6, 1)`,
        [studentId, activityId, courseId, kind, percent, passed],
    )
}

describe('level formula (SQL)', () => {
    let db: TestDb
    beforeEach(async () => {
        db = await createTestDb()
    })

    it('matches the cumulative thresholds of the default formula (100 + 25 × (L − 1))', async () => {
        const { rows } = await db.query<{ l2: number; l3: number; l10: number }>(
            `select public.xp_for_level(2, 100, 25) as l2, public.xp_for_level(3, 100, 25) as l3,
                    public.xp_for_level(10, 100, 25) as l10`,
        )
        // L2: 100. L3: 100 + 125. L10: 9×100 + 25×(9×8/2)
        expect(rows[0]).toEqual({ l2: 100, l3: 225, l10: 1800 })
    })

    it('puts boundary totals on the right level and caps at max level', async () => {
        const { rows } = await db.query<Record<string, number>>(
            `select public.level_for_xp(0, 100, 25, 100) as a, public.level_for_xp(99, 100, 25, 100) as b,
                    public.level_for_xp(100, 100, 25, 100) as c, public.level_for_xp(224, 100, 25, 100) as d,
                    public.level_for_xp(225, 100, 25, 100) as e, public.level_for_xp(999999999, 100, 25, 100) as f`,
        )
        expect(rows[0]).toEqual({ a: 1, b: 1, c: 2, d: 2, e: 3, f: 100 })
    })
})

describe('award_xp', () => {
    let db: TestDb
    let student: string
    beforeEach(async () => {
        db = await createTestDb()
        student = await createUser(db, 'student@school.test')
    })

    it('new students start at level 1, F-Rank, 0 XP', async () => {
        expect(await progressOf(db, student)).toEqual({ totalXp: 0, level: 1, rankCode: 'F' })
    })

    it('records the award in the ledger with the running balance', async () => {
        const result = await awardXp(db, student, 30, 'quiz:a:1')
        expect(result).toMatchObject({ awarded: true, duplicate: false, amount: 30 })
        const { rows } = await db.query<{ amount: number; balance_after: number; source: string }>(
            `select amount, balance_after, source from public.xp_ledger where student_id = $1`,
            [student],
        )
        expect(rows).toEqual([{ amount: 30, balance_after: 30, source: 'quiz_completion' }])
    })

    it('grants each idempotency key exactly once (duplicate submissions, refreshes)', async () => {
        await awardXp(db, student, 30, 'complete:quiz-1:student')
        const second = await awardXp(db, student, 30, 'complete:quiz-1:student')
        const third = await awardXp(db, student, 30, 'complete:quiz-1:student')
        expect(second).toMatchObject({ awarded: false, duplicate: true, amount: 0 })
        expect(third).toMatchObject({ awarded: false, duplicate: true })
        expect((await progressOf(db, student)).totalXp).toBe(30)
        const { rows } = await db.query(`select 1 from public.xp_ledger where student_id = $1`, [student])
        expect(rows).toHaveLength(1)
    })

    it('handles a burst of identical claims fired together', async () => {
        const results = await Promise.all(Array.from({ length: 5 }, () => awardXp(db, student, 50, 'burst-key')))
        expect(results.filter((r) => r.awarded)).toHaveLength(1)
        expect((await progressOf(db, student)).totalXp).toBe(50)
    })

    it('levels up exactly at the threshold and records a level event + notification', async () => {
        await awardXp(db, student, 99, 'key-1')
        expect((await progressOf(db, student)).level).toBe(1)
        const result = await awardXp(db, student, 1, 'key-2')
        expect(result.before.level).toBe(1)
        expect(result.after.level).toBe(2)
        const events = await db.query(`select from_level, to_level from public.level_events where student_id = $1`, [
            student,
        ])
        expect(events.rows).toEqual([{ from_level: 1, to_level: 2 }])
        const notes = await db.query(`select kind from public.notifications where user_id = $1`, [student])
        expect(notes.rows).toEqual([{ kind: 'level_up' }])
    })

    it('can jump several levels in one award', async () => {
        const result = await awardXp(db, student, 1800, 'big')
        expect(result.after.level).toBe(10)
    })

    it('rejects zero and negative amounts (except manual adjustments)', async () => {
        await expect(awardXp(db, student, 0, 'zero')).rejects.toThrow(/INVALID_XP_AMOUNT/)
        await expect(awardXp(db, student, -10, 'neg')).rejects.toThrow(/NEGATIVE_XP_NOT_ALLOWED/)
    })

    it('never lets a manual adjustment take the balance below zero', async () => {
        await awardXp(db, student, 40, 'earned')
        await expect(awardXp(db, student, -50, 'fix-1', 'manual_adjustment')).rejects.toThrow(/XP_BALANCE_NEGATIVE/)
        const ok = await awardXp(db, student, -15, 'fix-2', 'manual_adjustment')
        expect(ok.after.totalXp).toBe(25)
    })

    it('grows the subject path alongside the total', async () => {
        const math = await subjectId(db, 'mathematics')
        const result = await awardXp(db, student, 225, 'math-1', 'quiz_completion', math)
        expect(result.subject).toMatchObject({ levelBefore: 1, levelAfter: 3 })
        const { rows } = await db.query<{ xp: number; level: number }>(
            `select xp, level from public.student_subject_progress where student_id = $1 and subject_id = $2`,
            [student, math],
        )
        expect(rows[0]).toEqual({ xp: 225, level: 3 })
    })

    it('keeps ledger rows immutable', async () => {
        await awardXp(db, student, 30, 'immutable')
        await expect(db.query(`update public.xp_ledger set amount = 9999`)).rejects.toThrow(/immutable/)
    })
})

describe('rank promotion (mastery gates)', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
    })

    it('holds the rank at F when the level is reached but mastery is not', async () => {
        // Level 10 needs 1800 XP. E-Rank also needs avg ≥ 50, 1 passed assessment, 3 lessons.
        const result = await awardXp(db, student, 1800, 'grind')
        expect(result.after.level).toBe(10)
        expect(result.after.rankCode).toBe('F')
        expect(result.promotions).toEqual([])
    })

    it('promotes once the missing mastery is demonstrated', async () => {
        await awardXp(db, student, 1800, 'grind')
        for (let i = 0; i < 3; i++) {
            const lesson = await createActivity(db, courseId, teacher, 'lesson')
            await addCompletion(db, student, lesson, courseId, 'lesson', null, true)
        }
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        await addCompletion(db, student, quiz, courseId, 'quiz', 80, true)

        const result = await awardXp(db, student, 10, 'next')
        expect(result.promotions).toEqual([{ fromRank: 'F', toRank: 'E' }])
        expect(result.after.rankCode).toBe('E')
        const history = await db.query(`select level_at_promotion from public.rank_history where student_id = $1`, [
            student,
        ])
        expect(history.rows).toEqual([{ level_at_promotion: 10 }])
    })

    it('does not promote when the average score is below the gate', async () => {
        for (let i = 0; i < 3; i++) {
            const lesson = await createActivity(db, courseId, teacher, 'lesson')
            await addCompletion(db, student, lesson, courseId, 'lesson', null, true)
        }
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        await addCompletion(db, student, quiz, courseId, 'quiz', 45, true) // passed, but avg 45 < 50
        const result = await awardXp(db, student, 1800, 'grind')
        expect(result.after.rankCode).toBe('F')
    })

    it('ignores practice quizzes when measuring mastery', async () => {
        for (let i = 0; i < 3; i++) {
            const lesson = await createActivity(db, courseId, teacher, 'lesson')
            await addCompletion(db, student, lesson, courseId, 'lesson', null, true)
        }
        const practice = await createActivity(db, courseId, teacher, 'practice_quiz')
        await addCompletion(db, student, practice, courseId, 'practice_quiz', 100, true)
        const result = await awardXp(db, student, 1800, 'grind')
        expect(result.after.rankCode).toBe('F')
    })

    it('promotes through several ranks in order when everything is already met', async () => {
        await db.query(
            `update public.ranks set min_average_score = 0, min_passed_assessments = 0, min_completed_lessons = 0`,
        )
        const result = await awardXp(db, student, 100000, 'huge') // well past level 30
        expect(result.promotions.map((p) => p.toRank).slice(0, 3)).toEqual(['E', 'D', 'C'])
        const history = await db.query(`select count(*)::int as n from public.rank_history where student_id = $1`, [
            student,
        ])
        expect(history.rows[0]).toEqual({ n: result.promotions.length })
    })

    it('never demotes when a manual adjustment lowers the level', async () => {
        await db.query(
            `update public.ranks set min_average_score = 0, min_passed_assessments = 0, min_completed_lessons = 0`,
        )
        await awardXp(db, student, 1800, 'level-up')
        expect((await progressOf(db, student)).rankCode).toBe('E')
        const result = await awardXp(db, student, -1000, 'correction', 'manual_adjustment')
        expect(result.after.level).toBeLessThan(10)
        expect(result.after.rankCode).toBe('E')
    })
})

describe('attempts', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
    })

    const start = async (activityId: string) =>
        (
            await db.query<{ id: string; attempt_no: number }>(`select * from public.start_attempt($1, $2)`, [
                student,
                activityId,
            ])
        ).rows[0]

    const finalize = async (attemptId: string, percent: number, awards: object[] = []) =>
        (
            await db.query<{ r: Record<string, unknown> }>(
                `select public.finalize_attempt($1, $2, '[]'::jsonb, $3, 100, $3, $4, $5::jsonb) as r`,
                [attemptId, student, percent, percent >= 60, JSON.stringify(awards)],
            )
        ).rows[0].r

    it('resumes the open attempt instead of starting another (refresh-safe)', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        const a = await start(quiz)
        const b = await start(quiz)
        expect(b.id).toBe(a.id)
    })

    it('enforces the attempt limit', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz', { maxAttempts: 1 })
        const a = await start(quiz)
        await finalize(a.id, 50)
        await expect(start(quiz)).rejects.toThrow(/MAX_ATTEMPTS/)
    })

    it('treats a second submit of the same attempt as a no-op', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        const a = await start(quiz)
        const award = [
            { amount: 30, source: 'quiz_completion', idempotencyKey: `complete:${quiz}:${student}`, reason: 'Quiz' },
        ]
        const first = await finalize(a.id, 90, award)
        const second = await finalize(a.id, 90, award)
        expect(first).toMatchObject({ alreadySubmitted: false })
        expect(second).toMatchObject({ alreadySubmitted: true })
        expect((await progressOf(db, student)).totalXp).toBe(30)
    })

    it('keeps the best score and remembers a pass across attempts', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        await finalize((await start(quiz)).id, 70)
        await finalize((await start(quiz)).id, 40)
        const { rows } = await db.query<{ best_percent: string; passed: boolean; attempts_count: number }>(
            `select best_percent, passed, attempts_count from public.activity_completions where student_id = $1`,
            [student],
        )
        expect(rows[0]).toEqual({ best_percent: '70.00', passed: true, attempts_count: 2 })
    })

    it('awards completion XP once even when a later attempt passes again', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        const key = `complete:${quiz}:${student}`
        await finalize((await start(quiz)).id, 80, [
            { amount: 30, source: 'quiz_completion', idempotencyKey: key, reason: 'Quiz' },
        ])
        const again = await finalize((await start(quiz)).id, 95, [
            { amount: 30, source: 'quiz_completion', idempotencyKey: key, reason: 'Quiz' },
        ])
        expect((again.awards as { awarded: boolean }[])[0].awarded).toBe(false)
        expect((await progressOf(db, student)).totalXp).toBe(30)
    })

    it("rejects finalising another student's attempt", async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        const a = await start(quiz)
        const other = await createUser(db, 'other@school.test')
        await expect(
            db.query(`select public.finalize_attempt($1, $2, '[]'::jsonb, 1, 1, 100, true, '[]'::jsonb)`, [
                a.id,
                other,
            ]),
        ).rejects.toThrow(/ATTEMPT_NOT_FOUND/)
    })

    it('completes a lesson once, but counts revisits', async () => {
        const lesson = await createActivity(db, courseId, teacher, 'lesson', { xp: 20 })
        const awards = JSON.stringify([
            {
                amount: 20,
                source: 'lesson_completion',
                idempotencyKey: `complete:${lesson}:${student}`,
                reason: 'Lesson',
            },
        ])
        const first = (
            await db.query<{ r: { firstCompletion: boolean } }>(
                `select public.complete_lesson($1, $2, $3::jsonb) as r`,
                [student, lesson, awards],
            )
        ).rows[0].r
        const second = (
            await db.query<{ r: { firstCompletion: boolean } }>(
                `select public.complete_lesson($1, $2, $3::jsonb) as r`,
                [student, lesson, awards],
            )
        ).rows[0].r
        expect(first.firstCompletion).toBe(true)
        expect(second.firstCompletion).toBe(false)
        expect((await progressOf(db, student)).totalXp).toBe(20)
    })
})

describe('row level security', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let outsider: string
    let courseId: string
    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        outsider = await createUser(db, 'outsider@school.test')
        courseId = await createCourse(db, teacher, [student])
    })

    it('students cannot write XP, progress or ranks, or call the game functions', async () => {
        await asUser(db, student, async () => {
            await expect(db.query(`update public.student_progress set total_xp = 99999`)).rejects.toThrow(
                /permission denied/,
            )
            await expect(
                db.query(
                    `insert into public.xp_ledger (student_id, amount, source, reason, idempotency_key, balance_after)
                          values ($1, 999, 'quiz_completion', 'hack', 'hack-key', 999)`,
                    [student],
                ),
            ).rejects.toThrow(/permission denied/)
            await expect(
                db.query(`update public.profiles set role = 'admin' where id = $1`, [student]),
            ).rejects.toThrow(/permission denied/)
            await expect(
                db.query(`select public.award_xp($1, 1000, 'quiz_completion', 'k', 'r')`, [student]),
            ).rejects.toThrow(/permission denied/)
        })
        expect(await progressOf(db, student)).toEqual({ totalXp: 0, level: 1, rankCode: 'F' })
    })

    it('students never see answer keys or draft activities', async () => {
        const quiz = await createActivity(db, courseId, teacher, 'quiz')
        const draft = await createActivity(db, courseId, teacher, 'quiz', { status: 'draft' })
        const { rows: q } = await db.query<{ id: string }>(
            `insert into public.questions (activity_id, kind, prompt) values ($1, 'true_false', 'Sky is blue?') returning id`,
            [quiz],
        )
        await db.query(`insert into public.question_keys (question_id, accepted_answers) values ($1, '{true}')`, [
            q[0].id,
        ])

        await asUser(db, student, async () => {
            const keys = await db.query(`select * from public.question_keys`)
            expect(keys.rows).toHaveLength(0)
            const questions = await db.query(`select id from public.questions`)
            expect(questions.rows).toHaveLength(1)
            const activities = await db.query<{ id: string }>(`select id from public.activities`)
            expect(activities.rows.map((r) => r.id)).toEqual([quiz])
            expect(activities.rows.map((r) => r.id)).not.toContain(draft)
        })
        await asUser(db, teacher, async () => {
            const keys = await db.query(`select * from public.question_keys`)
            expect(keys.rows).toHaveLength(1)
        })
    })

    it('students outside a course see none of it', async () => {
        await createActivity(db, courseId, teacher, 'lesson')
        await asUser(db, outsider, async () => {
            expect((await db.query(`select * from public.courses`)).rows).toHaveLength(0)
            expect((await db.query(`select * from public.activities`)).rows).toHaveLength(0)
        })
    })

    it('students see only their own progress and ledger; teachers see their students', async () => {
        await awardXp(db, student, 30, 'student-award')
        await awardXp(db, outsider, 30, 'outsider-award')
        await asUser(db, student, async () => {
            const ledger = await db.query<{ student_id: string }>(`select student_id from public.xp_ledger`)
            expect(ledger.rows.map((r) => r.student_id)).toEqual([student])
            const others = await db.query(`select * from public.profiles where id = $1`, [outsider])
            expect(others.rows).toHaveLength(0)
        })
        await asUser(db, teacher, async () => {
            const progress = await db.query<{ student_id: string }>(
                `select student_id from public.student_progress order by student_id`,
            )
            const ids = progress.rows.map((r) => r.student_id)
            expect(ids).toContain(student)
            expect(ids).not.toContain(outsider)
        })
    })

    it('new users are always students, whatever their sign-up metadata says', async () => {
        const { rows } = await db.query<{ id: string }>(
            `insert into auth.users (email, raw_user_meta_data) values ('sneaky@x.test', '{"role":"admin","display_name":"Sneaky"}') returning id`,
        )
        const profile = await db.query<{ role: string; display_name: string }>(
            `select role, display_name from public.profiles where id = $1`,
            [rows[0].id],
        )
        expect(profile.rows[0]).toEqual({ role: 'student', display_name: 'Sneaky' })
    })
})
