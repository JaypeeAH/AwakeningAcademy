import { beforeEach, describe, expect, it } from 'vitest'
import { createCourse, createTestDb, createUser, type TestDb } from './testDb'

describe('sign up with a class code', () => {
    let db: TestDb
    let courseId: string
    let joinCode: string

    const signUp = async (email: string, meta: Record<string, string>) =>
        (
            await db.query<{ id: string }>(
                `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
                [email, JSON.stringify(meta)],
            )
        ).rows[0].id

    const enrolled = async (studentId: string) =>
        (
            await db.query(`select 1 from public.course_enrollments where course_id = $1 and student_id = $2`, [
                courseId,
                studentId,
            ])
        ).rows.length === 1

    beforeEach(async () => {
        db = await createTestDb()
        const teacher = await createUser(db, 'teacher@school.test', 'teacher')
        courseId = await createCourse(db, teacher)
        joinCode = (
            await db.query<{ join_code: string }>(`select join_code from public.courses where id = $1`, [courseId])
        ).rows[0].join_code
    })

    it('joins the course when the code matches a published course (any letter case)', async () => {
        const id = await signUp('a@school.test', { display_name: 'Ana', join_code: ` ${joinCode.toLowerCase()} ` })
        expect(await enrolled(id)).toBe(true)
    })

    it('ignores unknown codes and unpublished courses, and still creates a student', async () => {
        const unknown = await signUp('b@school.test', { join_code: 'ZZZZZZZZ' })
        expect(await enrolled(unknown)).toBe(false)

        await db.query(`update public.courses set status = 'draft' where id = $1`, [courseId])
        const draft = await signUp('c@school.test', { join_code: joinCode })
        expect(await enrolled(draft)).toBe(false)
        const role = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [draft])
        expect(role.rows[0].role).toBe('student')
    })

    it('ignores malformed codes', async () => {
        const id = await signUp('d@school.test', { join_code: "x'; drop table courses; --" })
        expect(await enrolled(id)).toBe(false)
        expect((await db.query(`select 1 from public.courses`)).rows).toHaveLength(1)
    })
})
