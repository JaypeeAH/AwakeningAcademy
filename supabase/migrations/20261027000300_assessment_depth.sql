-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- Phase 2 — assessment depth
--   • Essay and file-upload questions (rubrics), homework activities
--   • Manual grading: attempts with answers that need a teacher wait in 'pending_review' with NO
--     rewards; grade_attempt applies the teacher's grades, then rewards with the SAME idempotency keys
--     as auto-graded work (so re-grading never pays twice)
--   • Timed attempts: expires_at set by the server; answers autosave to the attempt; an attempt that
--     runs out of time is graded from what was saved (the server is the clock)
--   • Feedback modes: answers immediately / after the due date / score only
--   • Per-answer and overall teacher feedback
--   • Course question bank (copied into activities, so editing never changes graded history)
--   • Homework uploads: private storage bucket + attempt_files (served through signed URLs)
-- ════════════════════════════════════════════════════════════════════════════════════════════════

alter type public.question_kind add value if not exists 'file_upload';
alter type public.response_outcome add value if not exists 'partial';

create type public.feedback_mode as enum ('immediate', 'after_due', 'score_only');

-- ── Activities ────────────────────────────────────────────────────────────────────────────────────

alter table public.activities
    add column time_limit_minutes integer check (time_limit_minutes between 1 and 600),
    add column feedback_mode public.feedback_mode not null default 'immediate';

update public.activities
set feedback_mode = case when reveal_answers then 'immediate' else 'score_only' end::public.feedback_mode;

alter table public.activities drop column reveal_answers;

-- ── Questions ─────────────────────────────────────────────────────────────────────────────────────

-- What a full-marks answer looks like (essays / uploads). It can describe the model answer, so it lives
-- with the answer key (teacher-only under RLS); students see it only when the feedback mode reveals answers.
alter table public.question_keys add column rubric text not null default '' check (char_length(rubric) <= 5000);

-- ── Attempts & responses ──────────────────────────────────────────────────────────────────────────

alter table public.attempts
    add column expires_at timestamptz,
    add column draft_responses jsonb not null default '[]',
    add column draft_saved_at timestamptz,
    add column graded_at timestamptz,
    add column graded_by uuid references public.profiles (id) on delete set null,
    add column feedback text not null default '' check (char_length(feedback) <= 5000);

create index attempts_pending_idx on public.attempts (activity_id) where status = 'pending_review';
create index attempts_expiring_idx on public.attempts (expires_at) where status = 'in_progress' and expires_at is not null;

alter table public.attempt_responses
    add column feedback text not null default '' check (char_length(feedback) <= 5000),
    add column graded_by uuid references public.profiles (id) on delete set null,
    add column graded_at timestamptz;

-- ── Homework uploads ──────────────────────────────────────────────────────────────────────────────
-- Files live in the private 'submissions' bucket. Only the server (service role) reads or writes it;
-- people download through short-lived signed URLs after an ownership / teacher check.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submissions', 'submissions', false, 10485760, array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text'
])
on conflict (id) do nothing;

create table public.attempt_files (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid not null references public.attempts (id) on delete cascade,
    question_id uuid not null references public.questions (id) on delete cascade,
    student_id uuid not null references public.profiles (id) on delete cascade,
    storage_path text not null unique,
    file_name text not null check (char_length(file_name) between 1 and 200),
    content_type text not null,
    size_bytes integer not null check (size_bytes between 1 and 10485760),
    created_at timestamptz not null default now()
);

create index attempt_files_attempt_idx on public.attempt_files (attempt_id, question_id);

alter table public.attempt_files enable row level security;

create policy "read own or taught files" on public.attempt_files for select to authenticated
    using (student_id = auth.uid() or exists (
        select 1 from public.attempts t join public.activities a on a.id = t.activity_id
        where t.id = attempt_id and public.is_course_teacher(a.course_id)
    ));

-- ── Question bank ─────────────────────────────────────────────────────────────────────────────────

create table public.bank_questions (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses (id) on delete cascade,
    kind public.question_kind not null,
    prompt text not null check (char_length(prompt) between 1 and 5000),
    points smallint not null default 1 check (points between 1 and 100),
    rubric text not null default '' check (char_length(rubric) <= 5000),
    -- [{ id, label }] and { correctOptionIds, acceptedAnswers, caseSensitive, explanation }; copies get new ids
    options jsonb not null default '[]',
    answer_key jsonb not null default '{}',
    tags text[] not null default '{}',
    objectives text[] not null default '{}',
    difficulty smallint not null default 1 check (difficulty between 1 and 5),
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index bank_questions_course_idx on public.bank_questions (course_id, created_at desc);

create trigger bank_questions_updated_at before update on public.bank_questions
    for each row execute function public.set_updated_at();

alter table public.bank_questions enable row level security;

create policy "teachers read their bank" on public.bank_questions for select to authenticated
    using (public.is_course_teacher(course_id));

revoke insert, update, delete, truncate on public.attempt_files, public.bank_questions from anon, authenticated;
revoke all on public.attempt_files, public.bank_questions from anon;

-- ── Timing ────────────────────────────────────────────────────────────────────────────────────────

-- Allowance for network delay on a timed attempt. Mirrored by ATTEMPT_GRACE_SECONDS in utils/timing.ts.
create function public.attempt_grace() returns interval
language sql immutable set search_path = '' as $$ select interval '30 seconds' $$;

-- Starts (or resumes) an attempt. Timed activities get an expiry set by the server clock.
-- An open attempt whose time is up must be graded first (the server does that before calling).
create or replace function public.start_attempt(p_student_id uuid, p_activity_id uuid) returns public.attempts
language plpgsql security definer set search_path = '' as $$
declare
    v_activity public.activities;
    v_attempt public.attempts;
    v_used integer;
begin
    select * into v_activity from public.activities where id = p_activity_id;
    if not found or v_activity.kind = 'lesson' then
        raise exception 'NOT_AN_ASSESSMENT' using errcode = '22023';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_activity_id::text || ':' || p_student_id::text, 0));

    select * into v_attempt from public.attempts
    where activity_id = p_activity_id and student_id = p_student_id and status = 'in_progress';
    if found then
        if v_attempt.expires_at is not null and now() > v_attempt.expires_at + public.attempt_grace() then
            raise exception 'TIME_UP' using errcode = 'P0001';
        end if;
        return v_attempt;
    end if;

    if exists (select 1 from public.attempts where activity_id = p_activity_id and student_id = p_student_id
               and status = 'pending_review') then
        raise exception 'AWAITING_REVIEW' using errcode = 'P0001';
    end if;

    select count(*) into v_used from public.attempts where activity_id = p_activity_id and student_id = p_student_id;
    if v_activity.max_attempts is not null and v_used >= v_activity.max_attempts then
        raise exception 'MAX_ATTEMPTS' using errcode = 'P0001';
    end if;

    insert into public.attempts (activity_id, student_id, attempt_no, expires_at)
    values (p_activity_id, p_student_id, v_used + 1,
            case when v_activity.time_limit_minutes is null then null
                 else now() + make_interval(mins => v_activity.time_limit_minutes) end)
    returning * into v_attempt;
    return v_attempt;
end $$;

-- Autosaves the student's answers on an open attempt (refresh-, device- and time-out-safe).
-- [{ questionId, selectedOptionIds, textAnswer }]. Returns the save time.
create function public.save_attempt_draft(p_attempt_id uuid, p_student_id uuid, p_responses jsonb) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
    v_attempt public.attempts;
begin
    select * into v_attempt from public.attempts where id = p_attempt_id for update;
    if not found or v_attempt.student_id <> p_student_id then
        raise exception 'ATTEMPT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_attempt.status <> 'in_progress' then
        raise exception 'ATTEMPT_CLOSED' using errcode = 'P0001';
    end if;
    if v_attempt.expires_at is not null and now() > v_attempt.expires_at + public.attempt_grace() then
        raise exception 'TIME_UP' using errcode = 'P0001';
    end if;
    if jsonb_typeof(p_responses) <> 'array' or octet_length(p_responses::text) > 500000 then
        raise exception 'INVALID_DRAFT' using errcode = '22023';
    end if;

    update public.attempts set draft_responses = p_responses, draft_saved_at = now() where id = p_attempt_id;
    return now();
end $$;

-- ── Completions ───────────────────────────────────────────────────────────────────────────────────

-- Re-derives a student's completion of an activity from all their graded attempts (so a re-grade can
-- lower as well as raise the best score). Removes the row if nothing is graded any more.
create function public.refresh_completion(p_student_id uuid, p_activity_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
    v_activity public.activities;
    v_best numeric;
    v_passed boolean;
    v_count integer;
    v_last timestamptz;
begin
    select * into v_activity from public.activities where id = p_activity_id;
    select max(percent), coalesce(bool_or(passed), false), count(*), max(coalesce(graded_at, submitted_at))
    into v_best, v_passed, v_count, v_last
    from public.attempts
    where activity_id = p_activity_id and student_id = p_student_id and status = 'graded';

    if v_count = 0 then
        delete from public.activity_completions where student_id = p_student_id and activity_id = p_activity_id;
        return;
    end if;

    insert into public.activity_completions (student_id, activity_id, course_id, kind, best_percent, passed,
                                             attempts_count, first_completed_at, last_completed_at)
    values (p_student_id, p_activity_id, v_activity.course_id, v_activity.kind, v_best, v_passed, v_count,
            coalesce(v_last, now()), coalesce(v_last, now()))
    on conflict (student_id, activity_id) do update
        set best_percent = excluded.best_percent, passed = excluded.passed,
            attempts_count = excluded.attempts_count, last_completed_at = excluded.last_completed_at;
end $$;

-- ── finalize_attempt: now also used for answers that need a teacher ───────────────────────────────

drop function public.finalize_attempt(uuid, uuid, jsonb, numeric, numeric, numeric, boolean, jsonb);

-- p_status 'pending_review': responses are stored, but the score is provisional — no completion,
-- no rewards and no rank change until grade_attempt.
create function public.finalize_attempt(
    p_attempt_id uuid,
    p_student_id uuid,
    p_responses jsonb,
    p_score numeric,
    p_max_score numeric,
    p_percent numeric,
    p_passed boolean,
    p_awards jsonb default '[]'::jsonb,
    p_status public.attempt_status default 'graded'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_attempt public.attempts;
    v_activity public.activities;
    v_subject_id uuid;
    v_before jsonb;
    v_results jsonb := '[]'::jsonb;
begin
    if p_status = 'in_progress' then
        raise exception 'INVALID_STATUS' using errcode = '22023';
    end if;

    select * into v_attempt from public.attempts where id = p_attempt_id for update;
    if not found or v_attempt.student_id <> p_student_id then
        raise exception 'ATTEMPT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_attempt.status <> 'in_progress' then
        return jsonb_build_object('alreadySubmitted', true, 'attemptId', v_attempt.id);
    end if;

    select * into v_activity from public.activities where id = v_attempt.activity_id;
    select subject_id into v_subject_id from public.courses where id = v_activity.course_id;

    perform public.lock_student_progress(p_student_id);
    v_before := public.progress_snapshot(p_student_id);

    update public.attempts
    set status = p_status, submitted_at = now(), score = p_score, max_score = p_max_score,
        percent = p_percent, passed = case when p_status = 'graded' then p_passed else null end,
        graded_at = case when p_status = 'graded' then now() else null end,
        draft_responses = '[]'::jsonb
    where id = p_attempt_id;

    insert into public.attempt_responses (attempt_id, question_id, selected_option_ids, text_answer, outcome,
                                          points_awarded)
    select p_attempt_id, r."questionId", coalesce(r."selectedOptionIds", '{}'), r."textAnswer", r.outcome,
           coalesce(r."pointsAwarded", 0)
    from jsonb_to_recordset(coalesce(p_responses, '[]'::jsonb)) as r(
        "questionId" uuid, "selectedOptionIds" uuid[], "textAnswer" text,
        outcome public.response_outcome, "pointsAwarded" numeric);

    if p_status = 'graded' then
        perform public.refresh_completion(p_student_id, v_activity.id);
        v_results := public.apply_awards(p_student_id, p_awards, v_activity.id, v_activity.course_id, v_subject_id,
                                         p_attempt_id);
        perform public.evaluate_rank(p_student_id);
    end if;

    return jsonb_build_object(
        'alreadySubmitted', false,
        'attemptId', p_attempt_id,
        'status', p_status,
        'awards', v_results,
        'before', v_before,
        'after', public.progress_snapshot(p_student_id)
    );
end $$;

-- ── grade_attempt ─────────────────────────────────────────────────────────────────────────────────
-- Applies a teacher's grades: p_grades = [{ questionId, pointsAwarded, feedback }] (any question,
-- so an auto-grade can be overridden). The TypeScript side works out the new totals and rewards
-- (utils/manualGrading.ts); this function applies them atomically and checks the totals agree with
-- the stored responses. While any answer still awaits review the attempt stays 'pending_review'
-- (grades are saved as progress, nothing is rewarded). Once complete: the attempt is graded, the
-- completion re-derived, rewards applied with their usual idempotency keys, rank re-evaluated, the
-- student notified, and the change audited.

create function public.grade_attempt(
    p_attempt_id uuid,
    p_grader_id uuid,
    p_grades jsonb,
    p_feedback text,
    p_score numeric,
    p_max_score numeric,
    p_percent numeric,
    p_passed boolean,
    p_awards jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_attempt public.attempts;
    v_activity public.activities;
    v_subject_id uuid;
    v_grade jsonb;
    v_question public.questions;
    v_points numeric;
    v_score numeric;
    v_max numeric;
    v_pending boolean;
    v_before jsonb;
    v_results jsonb := '[]'::jsonb;
    v_regrade boolean;
begin
    select * into v_attempt from public.attempts where id = p_attempt_id for update;
    if not found then
        raise exception 'ATTEMPT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_attempt.status not in ('pending_review', 'graded') then
        raise exception 'ATTEMPT_NOT_GRADABLE' using errcode = 'P0001';
    end if;
    v_regrade := v_attempt.status = 'graded';

    select * into v_activity from public.activities where id = v_attempt.activity_id;
    select subject_id into v_subject_id from public.courses where id = v_activity.course_id;

    perform public.lock_student_progress(v_attempt.student_id);
    v_before := public.progress_snapshot(v_attempt.student_id);

    for v_grade in select * from jsonb_array_elements(coalesce(p_grades, '[]'::jsonb)) loop
        select * into v_question from public.questions
        where id = (v_grade ->> 'questionId')::uuid and activity_id = v_activity.id;
        if not found then
            raise exception 'QUESTION_NOT_IN_ATTEMPT' using errcode = '22023';
        end if;
        v_points := (v_grade ->> 'pointsAwarded')::numeric;
        if v_points is null or v_points < 0 or v_points > v_question.points then
            raise exception 'POINTS_OUT_OF_RANGE' using errcode = '22023';
        end if;

        insert into public.attempt_responses (attempt_id, question_id, outcome, points_awarded, feedback,
                                              graded_by, graded_at)
        values (p_attempt_id, v_question.id,
                (case when v_points = 0 then 'incorrect' when v_points = v_question.points then 'correct'
                      else 'partial' end)::public.response_outcome,
                v_points, left(coalesce(v_grade ->> 'feedback', ''), 5000), p_grader_id, now())
        on conflict (attempt_id, question_id) do update
            set outcome = excluded.outcome, points_awarded = excluded.points_awarded, feedback = excluded.feedback,
                graded_by = excluded.graded_by, graded_at = excluded.graded_at;
    end loop;

    select coalesce(sum(r.points_awarded), 0), coalesce(sum(q.points), 0),
           coalesce(bool_or(r.outcome = 'pending_review'), false)
    into v_score, v_max, v_pending
    from public.attempt_responses r join public.questions q on q.id = r.question_id
    where r.attempt_id = p_attempt_id;

    if abs(v_score - p_score) > 0.01 or abs(v_max - p_max_score) > 0.01 then
        raise exception 'GRADE_MISMATCH' using errcode = 'P0001';
    end if;

    update public.attempts
    set score = v_score, max_score = v_max, percent = p_percent, feedback = left(coalesce(p_feedback, ''), 5000),
        status = case when v_pending then 'pending_review' else 'graded' end::public.attempt_status,
        passed = case when v_pending then null else p_passed end,
        graded_at = case when v_pending then null else now() end,
        graded_by = case when v_pending then null else p_grader_id end
    where id = p_attempt_id;

    if not v_pending then
        perform public.refresh_completion(v_attempt.student_id, v_activity.id);
        v_results := public.apply_awards(v_attempt.student_id, p_awards, v_activity.id, v_activity.course_id,
                                         v_subject_id, p_attempt_id);
        perform public.evaluate_rank(v_attempt.student_id);

        insert into public.notifications (user_id, kind, title, body, data)
        values (v_attempt.student_id, 'graded',
                format('%s “%s” %s', case when v_regrade then 'Updated grade:' else 'Graded:' end,
                       v_activity.title, round(p_percent) || '%'),
                case when p_passed then 'Your teacher has marked your work. Open it to read their feedback.'
                     else 'Your teacher has marked your work. Read their feedback to see what to work on.' end,
                jsonb_build_object('activityId', v_activity.id, 'attemptId', p_attempt_id));

        insert into public.audit_events (actor_id, action, entity_type, entity_id, details)
        values (p_grader_id, case when v_regrade then 'grade.changed' else 'grade.recorded' end, 'attempt',
                p_attempt_id::text,
                jsonb_build_object('activityId', v_activity.id, 'studentId', v_attempt.student_id,
                                   'beforePercent', v_attempt.percent, 'afterPercent', p_percent,
                                   'passed', p_passed));
    end if;

    return jsonb_build_object(
        'status', case when v_pending then 'pending_review' else 'graded' end,
        'awards', v_results,
        'before', v_before,
        'after', public.progress_snapshot(v_attempt.student_id)
    );
end $$;

-- ── Quest Builder save: now stores rubrics with the key (see 20261026000400 for the rest of the rules) ──────────

create or replace function public.save_activity_content(
    p_activity_id uuid,
    p_questions jsonb,
    p_prerequisite_ids uuid[]
) returns integer
language plpgsql security definer set search_path = '' as $$
declare
    v_activity public.activities;
    v_question jsonb;
    v_option jsonb;
    v_position integer := 0;
    v_option_position integer;
    v_question_id uuid;
    v_option_ids uuid[];
    v_kept_question_ids uuid[] := '{}';
    v_correct uuid[];
begin
    select * into v_activity from public.activities where id = p_activity_id for update;
    if not found then
        raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002';
    end if;

    -- ── Questions ────────────────────────────────────────────────────────────────────────────────
    for v_question in select * from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
        v_question_id := (v_question ->> 'id')::uuid;

        if exists (select 1 from public.questions where id = v_question_id and activity_id <> p_activity_id) then
            raise exception 'QUESTION_BELONGS_ELSEWHERE' using errcode = '22023';
        end if;

        insert into public.questions (id, activity_id, kind, prompt, points, position)
        values (v_question_id, p_activity_id, (v_question ->> 'kind')::public.question_kind,
                v_question ->> 'prompt', coalesce((v_question ->> 'points')::smallint, 1), v_position)
        on conflict (id) do update
            set kind = excluded.kind, prompt = excluded.prompt, points = excluded.points, position = excluded.position;

        -- Options (array order = position)
        v_option_ids := '{}';
        v_option_position := 0;
        for v_option in select * from jsonb_array_elements(coalesce(v_question -> 'options', '[]'::jsonb)) loop
            if exists (select 1 from public.question_options
                       where id = (v_option ->> 'id')::uuid and question_id <> v_question_id) then
                raise exception 'OPTION_BELONGS_ELSEWHERE' using errcode = '22023';
            end if;
            insert into public.question_options (id, question_id, label, position)
            values ((v_option ->> 'id')::uuid, v_question_id, v_option ->> 'label', v_option_position)
            on conflict (id) do update set label = excluded.label, position = excluded.position;
            v_option_ids := v_option_ids || (v_option ->> 'id')::uuid;
            v_option_position := v_option_position + 1;
        end loop;
        delete from public.question_options where question_id = v_question_id and not (id = any (v_option_ids));

        -- Answer key
        select coalesce(array_agg(value::uuid), '{}') into v_correct
        from jsonb_array_elements_text(coalesce(v_question -> 'key' -> 'correctOptionIds', '[]'::jsonb));
        if not (v_correct <@ v_option_ids) then
            raise exception 'CORRECT_OPTION_UNKNOWN' using errcode = '22023';
        end if;

        insert into public.question_keys (question_id, correct_option_ids, accepted_answers, case_sensitive, explanation,
                                          rubric)
        values (
            v_question_id,
            v_correct,
            coalesce((select array_agg(value) from jsonb_array_elements_text(
                coalesce(v_question -> 'key' -> 'acceptedAnswers', '[]'::jsonb))), '{}'),
            coalesce((v_question -> 'key' ->> 'caseSensitive')::boolean, false),
            coalesce(v_question -> 'key' ->> 'explanation', ''),
            coalesce(v_question -> 'key' ->> 'rubric', '')
        )
        on conflict (question_id) do update
            set correct_option_ids = excluded.correct_option_ids, accepted_answers = excluded.accepted_answers,
                case_sensitive = excluded.case_sensitive, explanation = excluded.explanation, rubric = excluded.rubric;

        v_kept_question_ids := v_kept_question_ids || v_question_id;
        v_position := v_position + 1;
    end loop;

    -- Removed questions: refuse if any student has answered them
    if exists (
        select 1 from public.attempt_responses r join public.questions q on q.id = r.question_id
        where q.activity_id = p_activity_id and not (q.id = any (v_kept_question_ids))
    ) then
        raise exception 'QUESTION_HAS_RESPONSES' using errcode = 'P0001';
    end if;
    delete from public.questions where activity_id = p_activity_id and not (id = any (v_kept_question_ids));

    -- ── Prerequisites (same course only, never itself) ───────────────────────────────────────────
    if exists (
        select 1 from unnest(coalesce(p_prerequisite_ids, '{}')) as p(id)
        left join public.activities a on a.id = p.id
        where a.id is null or a.course_id <> v_activity.course_id or a.id = p_activity_id
    ) then
        raise exception 'INVALID_PREREQUISITE' using errcode = '22023';
    end if;
    delete from public.activity_prerequisites where activity_id = p_activity_id;
    insert into public.activity_prerequisites (activity_id, requires_activity_id)
    select p_activity_id, id from unnest(coalesce(p_prerequisite_ids, '{}')) as p(id);

    update public.activities set updated_at = now() where id = p_activity_id;
    return v_position;
end $$;

-- ── Grants ────────────────────────────────────────────────────────────────────────────────────────

revoke execute on function
    public.start_attempt(uuid, uuid),
    public.save_attempt_draft(uuid, uuid, jsonb),
    public.refresh_completion(uuid, uuid),
    public.finalize_attempt(uuid, uuid, jsonb, numeric, numeric, numeric, boolean, jsonb, public.attempt_status),
    public.grade_attempt(uuid, uuid, jsonb, text, numeric, numeric, numeric, boolean, jsonb)
from public, anon, authenticated;

grant execute on function
    public.start_attempt(uuid, uuid),
    public.save_attempt_draft(uuid, uuid, jsonb),
    public.refresh_completion(uuid, uuid),
    public.finalize_attempt(uuid, uuid, jsonb, numeric, numeric, numeric, boolean, jsonb, public.attempt_status),
    public.grade_attempt(uuid, uuid, jsonb, text, numeric, numeric, numeric, boolean, jsonb)
to service_role;
