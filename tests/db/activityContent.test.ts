import { randomUUID } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createActivity, createCourse, createTestDb, createUser, type TestDb } from './testDb'

const question = (overrides: Record<string, unknown> = {}) => {
    const a = randomUUID()
    const b = randomUUID()
    return {
        id: randomUUID(),
        kind: 'single_choice',
        prompt: 'Pick b',
        points: 1,
        options: [
            { id: a, label: 'a' },
            { id: b, label: 'b' },
        ],
        key: { correctOptionIds: [b], acceptedAnswers: [], caseSensitive: false, explanation: 'Because b.' },
        ...overrides,
    }
}

describe('save_activity_content', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    let quiz: string

    const save = (activityId: string, questions: object[], prerequisites: string[] = []) =>
        db.query<{ n: number }>(`select public.save_activity_content($1, $2::jsonb, $3::uuid[]) as n`, [
            activityId,
            JSON.stringify(questions),
            prerequisites,
        ])

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
        quiz = await createActivity(db, courseId, teacher, 'quiz', { status: 'draft' })
    })

    it('creates questions, options and keys in order', async () => {
        const q1 = question({ prompt: 'First' })
        const q2 = question({ prompt: 'Second' })
        await save(quiz, [q1, q2])
        const { rows } = await db.query<{ prompt: string; position: number }>(
            `select prompt, position from public.questions where activity_id = $1 order by position`,
            [quiz],
        )
        expect(rows).toEqual([
            { prompt: 'First', position: 0 },
            { prompt: 'Second', position: 1 },
        ])
        const keys = await db.query<{ explanation: string }>(`select explanation from public.question_keys`)
        expect(keys.rows).toHaveLength(2)
    })

    it('reorders and edits in place on a second save', async () => {
        const q1 = question({ prompt: 'First' })
        const q2 = question({ prompt: 'Second' })
        await save(quiz, [q1, q2])
        await save(quiz, [{ ...q2, prompt: 'Second (edited)' }, q1])
        const { rows } = await db.query<{ id: string; prompt: string }>(
            `select id, prompt from public.questions where activity_id = $1 order by position`,
            [quiz],
        )
        expect(rows).toEqual([
            { id: q2.id, prompt: 'Second (edited)' },
            { id: q1.id, prompt: 'First' },
        ])
    })

    it('removes questions and options left out of the save', async () => {
        const q1 = question()
        const q2 = question()
        await save(quiz, [q1, q2])
        await save(quiz, [{ ...q1, options: [q1.options[1]], key: { ...q1.key } }])
        expect((await db.query(`select 1 from public.questions`)).rows).toHaveLength(1)
        expect((await db.query(`select 1 from public.question_options`)).rows).toHaveLength(1)
    })

    it('refuses to remove a question students have answered', async () => {
        const q1 = question()
        await save(quiz, [q1])
        const { rows } = await db.query<{ id: string }>(`select id from public.start_attempt($1, $2)`, [student, quiz])
        await db.query(
            `insert into public.attempt_responses (attempt_id, question_id, outcome) values ($1, $2, 'correct')`,
            [rows[0].id, q1.id],
        )
        await expect(save(quiz, [])).rejects.toThrow(/QUESTION_HAS_RESPONSES/)
        // …but fixing a typo is fine
        await expect(save(quiz, [{ ...q1, prompt: 'Pick b (fixed)' }])).resolves.toBeTruthy()
    })

    it('refuses ids that belong to another activity', async () => {
        const other = await createActivity(db, courseId, teacher, 'quiz', { status: 'draft' })
        const q1 = question()
        await save(other, [q1])
        await expect(save(quiz, [q1])).rejects.toThrow(/QUESTION_BELONGS_ELSEWHERE/)
    })

    it('refuses a correct answer that is not one of the options', async () => {
        const q1 = question()
        await expect(save(quiz, [{ ...q1, key: { ...q1.key, correctOptionIds: [randomUUID()] } }])).rejects.toThrow(
            /CORRECT_OPTION_UNKNOWN/,
        )
    })

    it('saves prerequisites from the same course only', async () => {
        const lesson = await createActivity(db, courseId, teacher, 'lesson')
        await save(quiz, [], [lesson])
        const { rows } = await db.query(`select requires_activity_id from public.activity_prerequisites`)
        expect(rows).toEqual([{ requires_activity_id: lesson }])

        const otherCourse = await createCourse(db, teacher)
        const foreign = await createActivity(db, otherCourse, teacher, 'lesson')
        await expect(save(quiz, [], [foreign])).rejects.toThrow(/INVALID_PREREQUISITE/)
        await expect(save(quiz, [], [quiz])).rejects.toThrow(/INVALID_PREREQUISITE/)
    })
})
