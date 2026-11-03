import { beforeEach, describe, expect, it } from 'vitest'
import { asUser, createTestDb, createUser, type TestDb } from './testDb'

/*
 * Usernames (20261103000100_usernames.sql): an optional second sign-in name, written only by the server.
 */
describe('usernames', () => {
    let db: TestDb
    let student: string

    const setUsername = (id: string, username: string | null) =>
        db.query(`update public.profiles set username = $1 where id = $2`, [username, id])

    beforeEach(async () => {
        db = await createTestDb()
        student = await createUser(db, 'aquinoeury@no-email.invalid')
    })

    it('starts empty and accepts lower-case names of 3–32 letters, digits, dots, dashes and underscores', async () => {
        const row = await db.query<{ username: string | null }>(`select username from public.profiles where id = $1`, [
            student,
        ])
        expect(row.rows[0].username).toBeNull()
        await setUsername(student, 'aquino.eury_01')
        await expect(setUsername(student, 'AquinoEury')).rejects.toThrow(/profiles_username_format/)
        await expect(setUsername(student, 'ab')).rejects.toThrow(/profiles_username_format/)
        await expect(setUsername(student, 'has space')).rejects.toThrow(/profiles_username_format/)
        await setUsername(student, null)
    })

    it('is unique, while any number of accounts may have none', async () => {
        const other = await createUser(db, 'ben@school.test')
        await createUser(db, 'cy@school.test')
        await setUsername(student, 'aquinoeury')
        await expect(setUsername(other, 'aquinoeury')).rejects.toThrow(/profiles_username_key/)
    })

    it('can’t be changed by the signed-in student', async () => {
        await expect(
            asUser(db, student, () =>
                db.query(`update public.profiles set username = 'mine' where id = $1`, [student]),
            ),
        ).rejects.toThrow(/permission denied/)
    })
})

describe('sections', () => {
    let db: TestDb
    let student: string

    const setSection = (section: string | null) =>
        db.query(`update public.profiles set section = $1 where id = $2`, [section, student])

    beforeEach(async () => {
        db = await createTestDb()
        student = await createUser(db, 'ava@school.test')
    })

    it('holds a trimmed label of up to 40 characters, shared by any number of students', async () => {
        await setSection('11-STEM A')
        await db.query(`update public.profiles set section = '11-STEM A' where id = $1`, [
            await createUser(db, 'ben@school.test'),
        ])
        await expect(setSection(' 11-STEM A')).rejects.toThrow(/profiles_section_length/)
        await expect(setSection('')).rejects.toThrow(/profiles_section_length/)
        await expect(setSection('x'.repeat(41))).rejects.toThrow(/profiles_section_length/)
        await setSection(null)
    })

    it('can’t be changed by the signed-in student', async () => {
        await expect(
            asUser(db, student, () => db.query(`update public.profiles set section = 'mine' where id = $1`, [student])),
        ).rejects.toThrow(/permission denied/)
    })
})
