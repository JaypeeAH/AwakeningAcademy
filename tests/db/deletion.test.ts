import { beforeEach, describe, expect, it } from 'vitest'
import { awardXp, createActivity, createCourse, createTestDb, createUser, type TestDb } from './testDb'

describe('deleting without losing history', () => {
    let db: TestDb
    let teacher: string
    let student: string
    let courseId: string
    let lesson: string

    beforeEach(async () => {
        db = await createTestDb()
        teacher = await createUser(db, 'teacher@school.test', 'teacher')
        student = await createUser(db, 'student@school.test')
        courseId = await createCourse(db, teacher, [student])
        lesson = await createActivity(db, courseId, teacher, 'lesson', { xp: 20 })
        const awards = JSON.stringify([
            {
                amount: 20,
                source: 'lesson_completion',
                idempotencyKey: `complete:${lesson}:${student}`,
                reason: 'Lesson',
            },
        ])
        await db.query(`select public.complete_lesson($1, $2, $3::jsonb)`, [student, lesson, awards])
    })

    it('deleting a course keeps the student’s XP history (links cleared)', async () => {
        await db.query(`delete from public.courses where id = $1`, [courseId])
        const { rows } = await db.query<{ amount: number; activity_id: string | null; course_id: string | null }>(
            `select amount, activity_id, course_id from public.xp_ledger where student_id = $1`,
            [student],
        )
        expect(rows).toEqual([{ amount: 20, activity_id: null, course_id: null }])
        const progress = await db.query<{ total_xp: number }>(
            `select total_xp from public.student_progress where student_id = $1`,
            [student],
        )
        expect(Number(progress.rows[0].total_xp)).toBe(20)
    })

    it('still refuses real edits to ledger entries', async () => {
        await expect(db.query(`update public.xp_ledger set amount = 999`)).rejects.toThrow(/immutable/)
        await expect(db.query(`update public.xp_ledger set reason = 'changed'`)).rejects.toThrow(/immutable/)
        const other = await createActivity(db, courseId, teacher, 'lesson')
        await expect(db.query(`update public.xp_ledger set activity_id = $1`, [other])).rejects.toThrow(/immutable/)
    })

    it('deleting a teacher account keeps their courses', async () => {
        await db.query(`delete from public.audit_events where actor_id = $1`, [teacher])
        await db.query(`delete from auth.users where id = $1`, [teacher])
        const { rows } = await db.query<{ created_by: string | null }>(
            `select created_by from public.courses where id = $1`,
            [courseId],
        )
        expect(rows).toEqual([{ created_by: null }])
    })

    it('a ledger award can still be applied normally', async () => {
        const result = await awardXp(db, student, 10, 'after-fix')
        expect(result.awarded).toBe(true)
    })
})
