import { beforeEach, describe, expect, it } from 'vitest'
import { asUser, createActivity, createCourse, createTestDb, createUser, progressOf, type TestDb } from './testDb'

/*
 * Phase 2: manual grading, re-grading, timed attempts, uploads and the question bank — at the database
 * level (the TypeScript side computes totals/awards; these functions must apply them exactly once).
 */

describe('manual grading', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    let homework: string
    let mcq: string
    let essay: string

    const completionKey = () => `complete:${homework}:${student}`
    const award = (amount = 50) => [
        { amount, source: 'homework_completion', idempotencyKey: completionKey(), reason: 'Homework' },
    ]

    const startAndSubmit = async () => {
        const { rows } = await db.query<{ id: string }>(`select id from public.start_attempt($1, $2)`, [
            student,
            homework,
        ])
        const attemptId = rows[0].id
        const responses = [
            { questionId: mcq, selectedOptionIds: [], textAnswer: null, outcome: 'correct', pointsAwarded: 2 },
            {
                questionId: essay,
                selectedOptionIds: [],
                textAnswer: 'My essay',
                outcome: 'pending_review',
                pointsAwarded: 0,
            },
        ]
        const r = await db.query<{ r: { status: string } }>(
            `select public.finalize_attempt($1, $2, $3::jsonb, 2, 10, 20, false, '[]'::jsonb, 'pending_review') as r`,
            [attemptId, student, JSON.stringify(responses)],
        )
        return { attemptId, result: r.rows[0].r }
    }

    const grade = (attemptId: string, essayPoints: number, percent: number, passed: boolean, feedback = 'Nice work') =>
        db.query<{ r: { status: string; awards: { awarded: boolean }[] } }>(
            `select public.grade_attempt($1, $2, $3::jsonb, $4, $5, 10, $6, $7, $8::jsonb) as r`,
            [
                attemptId,
                teacher,
                JSON.stringify([{ questionId: essay, pointsAwarded: essayPoints, feedback: 'Strong conclusion' }]),
                feedback,
                2 + essayPoints,
                percent,
                passed,
                JSON.stringify(passed ? award() : []),
            ],
        )

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
        homework = await createActivity(db, courseId, teacher, 'homework', { xp: 50 })
        const q = await db.query<{ id: string }>(
            `insert into public.questions (activity_id, kind, prompt, points, position) values
             ($1, 'single_choice', 'Pick', 2, 0), ($1, 'essay', 'Explain', 8, 1) returning id`,
            [homework],
        )
        ;[mcq, essay] = q.rows.map((r) => r.id)
    })

    it('a submission with essays waits for review with no completion and no XP', async () => {
        const { attemptId, result } = await startAndSubmit()
        expect(result.status).toBe('pending_review')
        const attempt = await db.query<{ status: string; passed: boolean | null }>(
            `select status, passed from public.attempts where id = $1`,
            [attemptId],
        )
        expect(attempt.rows[0]).toEqual({ status: 'pending_review', passed: null })
        expect((await db.query(`select 1 from public.activity_completions`)).rows).toHaveLength(0)
        expect((await progressOf(db, student)).totalXp).toBe(0)
    })

    it('no new attempt can start while one is awaiting review', async () => {
        await startAndSubmit()
        await expect(db.query(`select * from public.start_attempt($1, $2)`, [student, homework])).rejects.toThrow(
            /AWAITING_REVIEW/,
        )
    })

    it('grading completes the attempt, rewards once, notifies and audits', async () => {
        const { attemptId } = await startAndSubmit()
        const { rows } = await grade(attemptId, 6, 80, true)
        expect(rows[0].r.status).toBe('graded')
        expect(rows[0].r.awards[0].awarded).toBe(true)

        const attempt = await db.query<{
            status: string
            score: number
            percent: number
            passed: boolean
            feedback: string
        }>(`select status, score, percent, passed, feedback from public.attempts where id = $1`, [attemptId])
        expect(attempt.rows[0]).toMatchObject({ status: 'graded', passed: true, feedback: 'Nice work' })
        expect(Number(attempt.rows[0].score)).toBe(8)
        const essayRow = await db.query<{ outcome: string; feedback: string }>(
            `select outcome, feedback from public.attempt_responses where question_id = $1`,
            [essay],
        )
        expect(essayRow.rows[0]).toEqual({ outcome: 'partial', feedback: 'Strong conclusion' })
        expect((await progressOf(db, student)).totalXp).toBe(50)
        const notes = await db.query<{ kind: string }>(`select kind from public.notifications where user_id = $1`, [
            student,
        ])
        expect(notes.rows.map((n) => n.kind)).toContain('graded')
        const audit = await db.query<{ action: string }>(
            `select action from public.audit_events where entity_id = $1`,
            [attemptId],
        )
        expect(audit.rows).toEqual([{ action: 'grade.recorded' }])
    })

    it('re-grading changes the score but never pays XP twice', async () => {
        const { attemptId } = await startAndSubmit()
        await grade(attemptId, 6, 80, true)
        const regrade = await grade(attemptId, 8, 100, true, 'Even better on review')
        expect(regrade.rows[0].r.awards[0].awarded).toBe(false)
        expect((await progressOf(db, student)).totalXp).toBe(50)
        const completion = await db.query<{ best_percent: number }>(
            `select best_percent from public.activity_completions`,
        )
        expect(Number(completion.rows[0].best_percent)).toBe(100)
        const audit = await db.query<{ action: string }>(
            `select action from public.audit_events where entity_id = $1 order by id`,
            [attemptId],
        )
        expect(audit.rows.map((a) => a.action)).toEqual(['grade.recorded', 'grade.changed'])
    })

    it('a lower re-grade lowers the best score (no stale mastery)', async () => {
        const { attemptId } = await startAndSubmit()
        await grade(attemptId, 8, 100, true)
        await grade(attemptId, 0, 20, false)
        const completion = await db.query<{ best_percent: number; passed: boolean }>(
            `select best_percent, passed from public.activity_completions`,
        )
        expect(Number(completion.rows[0].best_percent)).toBe(20)
        expect(completion.rows[0].passed).toBe(false)
    })

    it('rejects totals that disagree with the answers, marks out of range, and other activities’ questions', async () => {
        const { attemptId } = await startAndSubmit()
        await expect(
            db.query(`select public.grade_attempt($1, $2, $3::jsonb, '', 99, 10, 80, true, '[]'::jsonb)`, [
                attemptId,
                teacher,
                JSON.stringify([{ questionId: essay, pointsAwarded: 6, feedback: '' }]),
            ]),
        ).rejects.toThrow(/GRADE_MISMATCH/)
        await expect(
            db.query(`select public.grade_attempt($1, $2, $3::jsonb, '', 11, 10, 100, true, '[]'::jsonb)`, [
                attemptId,
                teacher,
                JSON.stringify([{ questionId: essay, pointsAwarded: 9, feedback: '' }]),
            ]),
        ).rejects.toThrow(/POINTS_OUT_OF_RANGE/)
        const other = await createActivity(db, courseId, teacher, 'quiz')
        const foreign = await db.query<{ id: string }>(
            `insert into public.questions (activity_id, kind, prompt) values ($1, 'essay', 'x') returning id`,
            [other],
        )
        await expect(
            db.query(`select public.grade_attempt($1, $2, $3::jsonb, '', 2, 10, 20, false, '[]'::jsonb)`, [
                attemptId,
                teacher,
                JSON.stringify([{ questionId: foreign.rows[0].id, pointsAwarded: 0, feedback: '' }]),
            ]),
        ).rejects.toThrow(/QUESTION_NOT_IN_ATTEMPT/)
    })

    it('grading can reach a rank promotion', async () => {
        await db.query(
            `update public.ranks set min_level = 2, min_average_score = 50, min_passed_assessments = 1, min_completed_lessons = 0 where code = 'E'`,
        )
        await db.query(`select public.award_xp($1, 100, 'quiz_completion', 'pre-level', 'warm up')`, [student]) // level 2
        expect((await progressOf(db, student)).rankCode).toBe('F')
        const { attemptId } = await startAndSubmit()
        await grade(attemptId, 6, 80, true)
        expect((await progressOf(db, student)).rankCode).toBe('E')
    })

    it('students can only read their own uploads; nobody can write them directly', async () => {
        const { attemptId } = await startAndSubmit()
        await db.query(
            `insert into public.attempt_files (attempt_id, question_id, student_id, storage_path, file_name, content_type, size_bytes)
             values ($1, $2, $3, 'p/1', 'essay.pdf', 'application/pdf', 100)`,
            [attemptId, essay, student],
        )
        const other = await createUser(db, 'other@school.test')
        await asUser(db, other, async () => {
            expect((await db.query(`select * from public.attempt_files`)).rows).toHaveLength(0)
        })
        await asUser(db, student, async () => {
            expect((await db.query(`select * from public.attempt_files`)).rows).toHaveLength(1)
            await expect(db.query(`delete from public.attempt_files`)).rejects.toThrow(/permission denied/)
        })
        await asUser(db, teacher, async () => {
            expect((await db.query(`select * from public.attempt_files`)).rows).toHaveLength(1)
        })
    })

    it('answer keys and rubrics stay hidden from students', async () => {
        await db.query(`insert into public.question_keys (question_id, rubric) values ($1, 'Must mention X')`, [essay])
        await asUser(db, student, async () => {
            expect((await db.query(`select * from public.question_keys`)).rows).toHaveLength(0)
        })
    })

    it('the question bank is visible to the course’s teachers only', async () => {
        await db.query(`insert into public.bank_questions (course_id, kind, prompt) values ($1, 'essay', 'Bank Q')`, [
            courseId,
        ])
        await asUser(db, student, async () => {
            expect((await db.query(`select * from public.bank_questions`)).rows).toHaveLength(0)
        })
        await asUser(db, teacher, async () => {
            expect((await db.query(`select * from public.bank_questions`)).rows).toHaveLength(1)
        })
    })
})

describe('timed attempts', () => {
    let db: TestDb
    let student: string
    let exam: string

    beforeEach(async () => {
        db = await createTestDb()
        const teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        const courseId = await createCourse(db, teacher, [student])
        exam = await createActivity(db, courseId, teacher, 'exam')
        await db.query(`update public.activities set time_limit_minutes = 30 where id = $1`, [exam])
    })

    const start = async () =>
        (
            await db.query<{ id: string; expires_at: string }>(
                `select id, expires_at from public.start_attempt($1, $2)`,
                [student, exam],
            )
        ).rows[0]

    it('sets the expiry from the server clock', async () => {
        const attempt = await start()
        const minutes = (new Date(attempt.expires_at).getTime() - Date.now()) / 60000
        expect(minutes).toBeGreaterThan(29)
        expect(minutes).toBeLessThanOrEqual(30.1)
    })

    it('autosaves while time remains and refuses after time + grace', async () => {
        const attempt = await start()
        const draft = JSON.stringify([{ questionId: attempt.id, selectedOptionIds: [], textAnswer: 'x' }])
        await db.query(`select public.save_attempt_draft($1, $2, $3::jsonb)`, [attempt.id, student, draft])
        const saved = await db.query<{ draft_responses: unknown[] }>(
            `select draft_responses from public.attempts where id = $1`,
            [attempt.id],
        )
        expect(saved.rows[0].draft_responses).toHaveLength(1)

        await db.query(`update public.attempts set expires_at = now() - interval '31 seconds' where id = $1`, [
            attempt.id,
        ])
        await expect(
            db.query(`select public.save_attempt_draft($1, $2, $3::jsonb)`, [attempt.id, student, draft]),
        ).rejects.toThrow(/TIME_UP/)
        await expect(db.query(`select * from public.start_attempt($1, $2)`, [student, exam])).rejects.toThrow(/TIME_UP/)
    })

    it('still accepts a save inside the grace period', async () => {
        const attempt = await start()
        await db.query(`update public.attempts set expires_at = now() - interval '10 seconds' where id = $1`, [
            attempt.id,
        ])
        await expect(
            db.query(`select public.save_attempt_draft($1, $2, '[]'::jsonb)`, [attempt.id, student]),
        ).resolves.toBeTruthy()
    })

    it('only the owner can autosave', async () => {
        const attempt = await start()
        const other = await createUser(db, 'other@school.test')
        await expect(
            db.query(`select public.save_attempt_draft($1, $2, '[]'::jsonb)`, [attempt.id, other]),
        ).rejects.toThrow(/ATTEMPT_NOT_FOUND/)
    })
})
