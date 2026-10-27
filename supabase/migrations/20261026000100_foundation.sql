-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- The Awakening Academy — foundation schema (Phase 1)
--
-- Security model
--   • The browser never writes to the database. Every write goes through a Next.js API route, which
--     authorises the user and then uses the service-role client (server/data/supabase/admin.ts).
--   • RLS is still enabled on every table: it scopes what a signed-in user can READ through the public
--     anon key, and denies all writes (no insert/update/delete policies exist for `authenticated`).
--   • Game state (XP, levels, ranks, attempts) only changes inside the SECURITY DEFINER functions in
--     20261026000200_progression.sql, which are executable by service_role only.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

-- ── Enums ─────────────────────────────────────────────────────────────────────────────────────────

create type public.app_role as enum ('student', 'teacher', 'admin');

create type public.publish_status as enum ('draft', 'published', 'archived');

-- Every planned kind is listed so later phases don't need enum migrations; the builder only offers
-- the kinds that are implemented (see @types/activities/ActivityKindOptions.ts).
create type public.activity_kind as enum (
    'lesson', 'practice_quiz', 'quiz', 'exam', 'homework', 'boss_battle', 'team_quest', 'secret_quest'
);

create type public.question_kind as enum ('single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay');

create type public.attempt_status as enum ('in_progress', 'graded', 'pending_review');

-- 'skipped' is reserved for consumables (Easter Bunny, Phase 3) and is never counted as correct.
create type public.response_outcome as enum ('correct', 'incorrect', 'skipped', 'pending_review');

create type public.xp_source as enum (
    'lesson_completion', 'quiz_completion', 'exam_completion', 'high_score_bonus', 'homework_completion',
    'boss_battle', 'secret_quest', 'streak', 'manual_adjustment'
);

-- ── Shared trigger: updated_at ────────────────────────────────────────────────────────────────────

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.updated_at := now();
    return new;
end $$;

-- ── Subjects & player classes ─────────────────────────────────────────────────────────────────────
-- Every course belongs to a subject. XP earned in a subject's courses grows the student's "path" in
-- that subject, which unlocks class titles (Apprentice Mathematician → Advanced Mathematician …).

create table public.subjects (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
    name text not null check (char_length(name) between 2 and 60),
    description text not null default '',
    -- A key into SubjectOptions.ts (colour + icon), not a colour value
    theme text not null default 'arcane',
    sort_order smallint not null default 0,
    created_at timestamptz not null default now()
);

-- A title is unlocked when the student meets every condition. subject_id null = a cross-subject
-- ("hybrid") title such as Polymath, which needs `min_subject_count` subjects at the level/mastery bar.
create table public.class_titles (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid references public.subjects (id) on delete cascade,
    tier smallint not null check (tier between 1 and 10),
    title text not null check (char_length(title) between 2 and 60),
    description text not null default '',
    min_subject_level integer not null default 1 check (min_subject_level >= 1),
    min_mastery numeric(5, 2) not null default 0 check (min_mastery between 0 and 100),
    min_subject_count smallint not null default 1 check (min_subject_count >= 1),
    unique nulls not distinct (subject_id, tier)
);

-- ── Profiles ──────────────────────────────────────────────────────────────────────────────────────
-- Minimal personal data (the platform may be used by minors): a display name and the sign-in email.

create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null,
    display_name text not null check (char_length(display_name) between 1 and 60),
    role public.app_role not null default 'student',
    equipped_title_id uuid references public.class_titles (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));

create trigger profiles_updated_at before update on public.profiles
    for each row execute function public.set_updated_at();

-- ── Courses, rosters, modules ─────────────────────────────────────────────────────────────────────

create table public.courses (
    id uuid primary key default gen_random_uuid(),
    subject_id uuid not null references public.subjects (id),
    title text not null check (char_length(title) between 2 and 120),
    description text not null default '',
    -- Students join with this code; regenerated by the teacher if it leaks
    join_code text not null unique check (join_code ~ '^[A-Z0-9]{6,10}$'),
    status public.publish_status not null default 'draft',
    created_by uuid not null references public.profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger courses_updated_at before update on public.courses
    for each row execute function public.set_updated_at();

create table public.course_teachers (
    course_id uuid not null references public.courses (id) on delete cascade,
    teacher_id uuid not null references public.profiles (id) on delete cascade,
    added_at timestamptz not null default now(),
    primary key (course_id, teacher_id)
);

create index course_teachers_teacher_idx on public.course_teachers (teacher_id);

create table public.course_enrollments (
    course_id uuid not null references public.courses (id) on delete cascade,
    student_id uuid not null references public.profiles (id) on delete cascade,
    enrolled_at timestamptz not null default now(),
    primary key (course_id, student_id)
);

create index course_enrollments_student_idx on public.course_enrollments (student_id);

create table public.modules (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses (id) on delete cascade,
    title text not null check (char_length(title) between 1 and 120),
    description text not null default '',
    position integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index modules_course_idx on public.modules (course_id, position);

create trigger modules_updated_at before update on public.modules
    for each row execute function public.set_updated_at();

-- ── Activities (lessons, quizzes, exams … "quests") ───────────────────────────────────────────────

create table public.activities (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses (id) on delete cascade,
    module_id uuid references public.modules (id) on delete set null,
    kind public.activity_kind not null,
    title text not null check (char_length(title) between 2 and 160),
    summary text not null default '',
    -- Lesson content / quiz briefing, Markdown (rendered without raw HTML)
    body text not null default '' check (char_length(body) <= 100000),
    objectives text[] not null default '{}',
    difficulty smallint not null default 1 check (difficulty between 1 and 5),
    xp_reward integer not null default 0 check (xp_reward >= 0),
    estimated_minutes integer check (estimated_minutes between 1 and 600),
    opens_at timestamptz,
    due_at timestamptz,
    max_attempts integer check (max_attempts between 1 and 100),
    passing_score smallint not null default 60 check (passing_score between 0 and 100),
    -- Show correct answers + explanations after an attempt is graded (off by default for exams)
    reveal_answers boolean not null default true,
    xp_repeatable boolean not null default false,
    status public.publish_status not null default 'draft',
    position integer not null default 0,
    published_at timestamptz,
    created_by uuid not null references public.profiles (id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (due_at is null or opens_at is null or due_at > opens_at)
);

create index activities_course_idx on public.activities (course_id, status, position);
create index activities_module_idx on public.activities (module_id);

create trigger activities_updated_at before update on public.activities
    for each row execute function public.set_updated_at();

create table public.activity_prerequisites (
    activity_id uuid not null references public.activities (id) on delete cascade,
    requires_activity_id uuid not null references public.activities (id) on delete cascade,
    primary key (activity_id, requires_activity_id),
    check (activity_id <> requires_activity_id)
);

-- ── Questions ─────────────────────────────────────────────────────────────────────────────────────
-- Prompts and options are readable by enrolled students; the answer key lives in its own table that
-- only course teachers can read, so it can never leak through a student query.

create table public.questions (
    id uuid primary key default gen_random_uuid(),
    activity_id uuid not null references public.activities (id) on delete cascade,
    kind public.question_kind not null,
    prompt text not null check (char_length(prompt) between 1 and 5000),
    points smallint not null default 1 check (points between 1 and 100),
    position integer not null default 0,
    created_at timestamptz not null default now()
);

create index questions_activity_idx on public.questions (activity_id, position);

create table public.question_options (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references public.questions (id) on delete cascade,
    label text not null check (char_length(label) between 1 and 1000),
    position integer not null default 0
);

create index question_options_question_idx on public.question_options (question_id, position);

create table public.question_keys (
    question_id uuid primary key references public.questions (id) on delete cascade,
    correct_option_ids uuid[] not null default '{}',
    accepted_answers text[] not null default '{}',
    case_sensitive boolean not null default false,
    explanation text not null default ''
);

-- ── Attempts & responses ──────────────────────────────────────────────────────────────────────────

create table public.attempts (
    id uuid primary key default gen_random_uuid(),
    activity_id uuid not null references public.activities (id) on delete cascade,
    student_id uuid not null references public.profiles (id) on delete cascade,
    attempt_no integer not null check (attempt_no >= 1),
    status public.attempt_status not null default 'in_progress',
    started_at timestamptz not null default now(),
    submitted_at timestamptz,
    score numeric(8, 2),
    max_score numeric(8, 2),
    percent numeric(5, 2) check (percent between 0 and 100),
    passed boolean,
    unique (activity_id, student_id, attempt_no)
);

create index attempts_student_idx on public.attempts (student_id, started_at desc);
-- At most one open attempt per student per activity (a refresh resumes it instead of starting another)
create unique index attempts_one_open_idx on public.attempts (activity_id, student_id) where status = 'in_progress';

create table public.attempt_responses (
    attempt_id uuid not null references public.attempts (id) on delete cascade,
    question_id uuid not null references public.questions (id) on delete cascade,
    selected_option_ids uuid[] not null default '{}',
    text_answer text check (char_length(text_answer) <= 20000),
    outcome public.response_outcome not null,
    points_awarded numeric(8, 2) not null default 0 check (points_awarded >= 0),
    primary key (attempt_id, question_id)
);

-- One row per student per activity once they have finished it at least once. Mastery gates read this.
create table public.activity_completions (
    student_id uuid not null references public.profiles (id) on delete cascade,
    activity_id uuid not null references public.activities (id) on delete cascade,
    course_id uuid not null references public.courses (id) on delete cascade,
    kind public.activity_kind not null,
    best_percent numeric(5, 2) check (best_percent between 0 and 100),
    passed boolean not null default false,
    attempts_count integer not null default 0,
    first_completed_at timestamptz not null default now(),
    last_completed_at timestamptz not null default now(),
    primary key (student_id, activity_id)
);

create index activity_completions_course_idx on public.activity_completions (course_id);

-- ── Progression configuration (admin) ─────────────────────────────────────────────────────────────

-- Single row. XP to go from level L to L+1 = base_xp + xp_step × (L − 1). Levels are derived from
-- the student's cumulative XP total (see public.level_for_xp).
create table public.progression_settings (
    id boolean primary key default true check (id),
    base_xp integer not null default 100 check (base_xp between 10 and 10000),
    xp_step integer not null default 25 check (xp_step between 0 and 1000),
    max_level integer not null default 100 check (max_level between 10 and 500),
    high_score_threshold smallint not null default 90 check (high_score_threshold between 50 and 100),
    updated_at timestamptz not null default now(),
    updated_by uuid references public.profiles (id) on delete set null
);

-- Admin-defined defaults and the range teachers may choose from for each kind of reward.
create table public.xp_rules (
    source public.xp_source primary key,
    default_xp integer not null check (default_xp >= 0),
    min_xp integer not null check (min_xp >= 0),
    max_xp integer not null check (max_xp <= 100000),
    check (min_xp <= default_xp and default_xp <= max_xp)
);

-- F → SSS. A student is promoted when their level reaches min_level AND every mastery gate is met.
create table public.ranks (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (code ~ '^[A-Z]{1,4}$'),
    name text not null check (char_length(name) between 2 and 60),
    description text not null default '',
    sort_order smallint not null unique,
    min_level integer not null check (min_level >= 1),
    -- Average best score across graded assessments (quiz, exam, homework, boss battle)
    min_average_score numeric(5, 2) not null default 0 check (min_average_score between 0 and 100),
    min_passed_assessments integer not null default 0 check (min_passed_assessments >= 0),
    min_completed_lessons integer not null default 0 check (min_completed_lessons >= 0)
);

-- ── Player state (written only by the progression functions) ──────────────────────────────────────

create table public.student_progress (
    student_id uuid primary key references public.profiles (id) on delete cascade,
    total_xp bigint not null default 0 check (total_xp >= 0),
    level integer not null default 1 check (level >= 1),
    rank_id uuid not null references public.ranks (id),
    updated_at timestamptz not null default now()
);

create table public.student_subject_progress (
    student_id uuid not null references public.profiles (id) on delete cascade,
    subject_id uuid not null references public.subjects (id) on delete cascade,
    xp bigint not null default 0 check (xp >= 0),
    level integer not null default 1 check (level >= 1),
    updated_at timestamptz not null default now(),
    primary key (student_id, subject_id)
);

-- Append-only. The unique idempotency key is what makes every reward claim exactly-once.
create table public.xp_ledger (
    id bigint generated always as identity primary key,
    student_id uuid not null references public.profiles (id) on delete cascade,
    amount integer not null check (amount <> 0),
    source public.xp_source not null,
    reason text not null check (char_length(reason) between 1 and 300),
    idempotency_key text not null unique check (char_length(idempotency_key) between 3 and 200),
    activity_id uuid references public.activities (id) on delete set null,
    course_id uuid references public.courses (id) on delete set null,
    subject_id uuid references public.subjects (id) on delete set null,
    attempt_id uuid references public.attempts (id) on delete set null,
    awarded_by uuid references public.profiles (id) on delete set null,
    balance_after bigint not null check (balance_after >= 0),
    created_at timestamptz not null default now()
);

create index xp_ledger_student_idx on public.xp_ledger (student_id, created_at desc);

create function public.prevent_ledger_update() returns trigger
language plpgsql set search_path = '' as $$
begin
    raise exception 'XP ledger entries are immutable; record a manual adjustment instead'
        using errcode = '42501';
end $$;

create trigger xp_ledger_immutable before update on public.xp_ledger
    for each row execute function public.prevent_ledger_update();

create table public.level_events (
    id bigint generated always as identity primary key,
    student_id uuid not null references public.profiles (id) on delete cascade,
    from_level integer not null,
    to_level integer not null,
    total_xp bigint not null,
    created_at timestamptz not null default now()
);

create index level_events_student_idx on public.level_events (student_id, created_at desc);

create table public.rank_history (
    id bigint generated always as identity primary key,
    student_id uuid not null references public.profiles (id) on delete cascade,
    from_rank_id uuid references public.ranks (id),
    to_rank_id uuid not null references public.ranks (id),
    level_at_promotion integer not null,
    created_at timestamptz not null default now()
);

create index rank_history_student_idx on public.rank_history (student_id, created_at desc);

-- ── Notifications & audit ─────────────────────────────────────────────────────────────────────────

create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    kind text not null check (kind ~ '^[a-z_]{2,40}$'),
    title text not null,
    body text not null default '',
    data jsonb not null default '{}',
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.audit_events (
    id bigint generated always as identity primary key,
    actor_id uuid references public.profiles (id) on delete set null,
    action text not null check (action ~ '^[a-z_.]{3,60}$'),
    entity_type text not null,
    entity_id text,
    details jsonb not null default '{}',
    created_at timestamptz not null default now()
);

create index audit_events_created_idx on public.audit_events (created_at desc);
create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);

-- ── RLS helpers (SECURITY DEFINER so policies don't recurse into each other's RLS) ────────────────

create function public.user_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
    select role from public.profiles where id = auth.uid()
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
    select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

create function public.is_course_teacher(p_course_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select public.is_admin() or exists (
        select 1 from public.course_teachers where course_id = p_course_id and teacher_id = auth.uid()
    )
$$;

create function public.is_enrolled(p_course_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.course_enrollments where course_id = p_course_id and student_id = auth.uid()
    )
$$;

-- True when the current user teaches a course the student is enrolled in (or is an admin)
create function public.teaches_student(p_student_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select public.is_admin() or exists (
        select 1
        from public.course_enrollments e
        join public.course_teachers t on t.course_id = e.course_id
        where e.student_id = p_student_id and t.teacher_id = auth.uid()
    )
$$;

create function public.can_view_activity(p_activity_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
    select exists (
        select 1 from public.activities a
        where a.id = p_activity_id
          and (public.is_course_teacher(a.course_id) or (a.status = 'published' and public.is_enrolled(a.course_id)))
    )
$$;

-- ── Row level security ────────────────────────────────────────────────────────────────────────────

alter table public.subjects enable row level security;
alter table public.class_titles enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_teachers enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.modules enable row level security;
alter table public.activities enable row level security;
alter table public.activity_prerequisites enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_keys enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_responses enable row level security;
alter table public.activity_completions enable row level security;
alter table public.progression_settings enable row level security;
alter table public.xp_rules enable row level security;
alter table public.ranks enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_subject_progress enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.level_events enable row level security;
alter table public.rank_history enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

-- Reference data: any signed-in user
create policy "read subjects" on public.subjects for select to authenticated using (true);
create policy "read class titles" on public.class_titles for select to authenticated using (true);
create policy "read progression settings" on public.progression_settings for select to authenticated using (true);
create policy "read xp rules" on public.xp_rules for select to authenticated using (true);
create policy "read ranks" on public.ranks for select to authenticated using (true);

create policy "read own or taught profiles" on public.profiles for select to authenticated
    using (id = auth.uid() or public.teaches_student(id) or public.user_role() in ('teacher', 'admin') and role <> 'student');

create policy "read visible courses" on public.courses for select to authenticated
    using (public.is_course_teacher(id) or (status = 'published' and public.is_enrolled(id)));

create policy "read course teachers" on public.course_teachers for select to authenticated
    using (teacher_id = auth.uid() or public.is_course_teacher(course_id) or public.is_enrolled(course_id));

create policy "read enrollments" on public.course_enrollments for select to authenticated
    using (student_id = auth.uid() or public.is_course_teacher(course_id));

create policy "read modules" on public.modules for select to authenticated
    using (public.is_course_teacher(course_id) or public.is_enrolled(course_id));

create policy "read activities" on public.activities for select to authenticated
    using (public.is_course_teacher(course_id) or (status = 'published' and public.is_enrolled(course_id)));

create policy "read prerequisites" on public.activity_prerequisites for select to authenticated
    using (public.can_view_activity(activity_id));

create policy "read questions" on public.questions for select to authenticated
    using (public.can_view_activity(activity_id));

create policy "read question options" on public.question_options for select to authenticated
    using (exists (select 1 from public.questions q where q.id = question_id and public.can_view_activity(q.activity_id)));

-- Answer keys: course teachers only
create policy "teachers read answer keys" on public.question_keys for select to authenticated
    using (exists (
        select 1 from public.questions q join public.activities a on a.id = q.activity_id
        where q.id = question_id and public.is_course_teacher(a.course_id)
    ));

create policy "read own or taught attempts" on public.attempts for select to authenticated
    using (student_id = auth.uid() or exists (
        select 1 from public.activities a where a.id = activity_id and public.is_course_teacher(a.course_id)
    ));

create policy "read own or taught responses" on public.attempt_responses for select to authenticated
    using (exists (
        select 1 from public.attempts t join public.activities a on a.id = t.activity_id
        where t.id = attempt_id and (t.student_id = auth.uid() or public.is_course_teacher(a.course_id))
    ));

create policy "read own or taught completions" on public.activity_completions for select to authenticated
    using (student_id = auth.uid() or public.is_course_teacher(course_id));

create policy "read own or taught progress" on public.student_progress for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));

create policy "read own or taught subject progress" on public.student_subject_progress for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));

create policy "read own or taught ledger" on public.xp_ledger for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));

create policy "read own or taught level events" on public.level_events for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));

create policy "read own or taught rank history" on public.rank_history for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));

create policy "read own notifications" on public.notifications for select to authenticated
    using (user_id = auth.uid());

create policy "admins read audit" on public.audit_events for select to authenticated
    using (public.is_admin());

-- Belt and braces: the browser roles may only read. (RLS already denies writes without policies.)
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on all tables in schema public from anon;
