import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations')

/**
 * The parts of Supabase the migrations rely on: the API roles, `auth.users` and `auth.uid()`
 * (which reads the JWT subject the way Supabase does, from `request.jwt.claim.sub`).
 */
const SUPABASE_SHIM = `
    do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    end $$;
    create schema auth;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
    create table auth.users (
        id uuid primary key default gen_random_uuid(),
        email text,
        raw_user_meta_data jsonb not null default '{}'
    );
    create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant select on tables to anon, authenticated;
    alter default privileges in schema public grant all on tables to service_role;
    alter default privileges in schema public grant all on sequences to service_role;
`

/** A fresh in-memory Postgres with every migration applied. */
export async function createTestDb() {
    const db = new PGlite()
    await db.exec(SUPABASE_SHIM)
    for (const file of readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort()) {
        try {
            await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
        } catch (error) {
            throw new Error(`Migration ${file} failed: ${(error as Error).message}`)
        }
    }
    return db
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>

/** Creates an auth user (the trigger makes the profile + progress rows); returns its id. */
export async function createUser(db: TestDb, email: string, role: 'student' | 'teacher' | 'admin' = 'student') {
    const { rows } = await db.query<{ id: string }>(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
        [email, JSON.stringify({ display_name: email.split('@')[0] })],
    )
    const id = rows[0].id
    if (role !== 'student') await db.query(`update public.profiles set role = $1 where id = $2`, [role, id])
    return id
}

/** Runs `fn` as a signed-in user through the `authenticated` role, so RLS applies. */
export async function asUser<T>(db: TestDb, userId: string, fn: () => Promise<T>): Promise<T> {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`)
    try {
        return await fn()
    } finally {
        await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
    }
}

export async function subjectId(db: TestDb, slug = 'mathematics') {
    const { rows } = await db.query<{ id: string }>(`select id from public.subjects where slug = $1`, [slug])
    return rows[0].id
}

/** A course (with a teacher and enrolled students) to hang activities off. */
export async function createCourse(db: TestDb, teacherId: string, studentIds: string[] = [], slug = 'mathematics') {
    const { rows } = await db.query<{ id: string }>(
        `insert into public.courses (subject_id, title, join_code, status, created_by)
         values ($1, 'Algebra I', upper(substr(md5(random()::text), 1, 8)), 'published', $2) returning id`,
        [await subjectId(db, slug), teacherId],
    )
    const courseId = rows[0].id
    await db.query(`insert into public.course_teachers (course_id, teacher_id) values ($1, $2)`, [courseId, teacherId])
    for (const studentId of studentIds) {
        await db.query(`insert into public.course_enrollments (course_id, student_id) values ($1, $2)`, [
            courseId,
            studentId,
        ])
    }
    return courseId
}

export async function createActivity(
    db: TestDb,
    courseId: string,
    teacherId: string,
    kind: string,
    overrides: { status?: string; maxAttempts?: number | null; xp?: number } = {},
) {
    const { rows } = await db.query<{ id: string }>(
        `insert into public.activities (course_id, kind, title, xp_reward, status, max_attempts, created_by)
         values ($1, $2, $3, $4, $5, $6, $7) returning id`,
        [
            courseId,
            kind,
            `Test ${kind}`,
            overrides.xp ?? 30,
            overrides.status ?? 'published',
            overrides.maxAttempts ?? null,
            teacherId,
        ],
    )
    return rows[0].id
}

export async function progressOf(db: TestDb, studentId: string) {
    const { rows } = await db.query<{ total_xp: number | string; level: number; rank_code: string }>(
        `select p.total_xp, p.level, r.code as rank_code
         from public.student_progress p join public.ranks r on r.id = p.rank_id where p.student_id = $1`,
        [studentId],
    )
    return { totalXp: Number(rows[0].total_xp), level: rows[0].level, rankCode: rows[0].rank_code }
}

export async function awardXp(
    db: TestDb,
    studentId: string,
    amount: number,
    key: string,
    source = 'quiz_completion',
    subject: string | null = null,
) {
    const { rows } = await db.query<{ result: Record<string, unknown> }>(
        `select public.award_xp($1, $2, $3::public.xp_source, $4, 'test award', null, null, $5) as result`,
        [studentId, amount, source, key, subject],
    )
    return rows[0].result as {
        awarded: boolean
        duplicate: boolean
        amount: number
        before: { level: number; rankCode: string; totalXp: number }
        after: { level: number; rankCode: string; totalXp: number }
        promotions: { fromRank: string; toRank: string }[]
        subject: { levelBefore: number; levelAfter: number } | null
    }
}
