-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- Phase 5: AI-assisted drafting, analytics by learning objective, and hardening.
--   • questions.objective: which of the activity's learning objectives a question checks (analytics).
--   • questions.ai_draft: drafted by AI and not yet reviewed by the teacher (blocks publishing).
--   • ai_draft_requests: a log of every AI drafting request (who, which model, tokens, outcome).
--   • rate_limit_hits + hit_rate_limit(): fixed-window rate limits shared by every server instance
--     (sign-in, sign-up, password emails, submissions, secret phrases, AI drafts, error reports).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

alter table public.questions
    add column objective text not null default '' check (char_length(objective) <= 300),
    add column ai_draft boolean not null default false;

create table public.ai_draft_requests (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid references public.profiles (id) on delete set null,
    course_id uuid references public.courses (id) on delete set null,
    activity_id uuid references public.activities (id) on delete set null,
    provider text not null,
    model text not null,
    requested_count smallint not null check (requested_count between 1 and 20),
    drafted_count smallint not null default 0,
    input_tokens integer,
    output_tokens integer,
    status text not null check (status in ('ok', 'error', 'refused', 'invalid')),
    error text,
    created_at timestamptz not null default now()
);

create index ai_draft_requests_teacher_idx on public.ai_draft_requests (teacher_id, created_at desc);

create table public.rate_limit_hits (
    key text not null check (char_length(key) between 3 and 200),
    window_start timestamptz not null,
    hits integer not null default 0,
    primary key (key, window_start)
);

alter table public.ai_draft_requests enable row level security;
alter table public.rate_limit_hits enable row level security;

create policy "admins read AI usage" on public.ai_draft_requests for select to authenticated
    using (public.is_admin() or teacher_id = auth.uid());
-- rate_limit_hits: no policies — only the server touches it

revoke insert, update, delete, truncate on public.ai_draft_requests, public.rate_limit_hits from anon, authenticated;
revoke all on public.ai_draft_requests, public.rate_limit_hits from anon;
revoke select on public.rate_limit_hits from authenticated;

-- ── hit_rate_limit ────────────────────────────────────────────────────────────────────────────────
-- Counts one hit for `key` in the current fixed window and says whether it's allowed. Atomic
-- (insert … on conflict … returning), so concurrent requests can't slip past the limit together.

create function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
    v_hits integer;
begin
    insert into public.rate_limit_hits (key, window_start, hits) values (p_key, v_window, 1)
    on conflict (key, window_start) do update set hits = public.rate_limit_hits.hits + 1
    returning hits into v_hits;

    -- Old windows for this key are no longer needed
    delete from public.rate_limit_hits where key = p_key and window_start < v_window;

    return jsonb_build_object(
        'allowed', v_hits <= p_max,
        'remaining', greatest(p_max - v_hits, 0),
        'retryAfter', ceil(extract(epoch from (v_window + make_interval(secs => p_window_seconds) - now())))::integer
    );
end $$;

-- ── Quest Builder save: also stores each question's objective and AI-draft flag ───────────────────

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

    for v_question in select * from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) loop
        v_question_id := (v_question ->> 'id')::uuid;

        if exists (select 1 from public.questions where id = v_question_id and activity_id <> p_activity_id) then
            raise exception 'QUESTION_BELONGS_ELSEWHERE' using errcode = '22023';
        end if;

        insert into public.questions (id, activity_id, kind, prompt, points, position, phase, objective, ai_draft)
        values (v_question_id, p_activity_id, (v_question ->> 'kind')::public.question_kind,
                v_question ->> 'prompt', coalesce((v_question ->> 'points')::smallint, 1), v_position,
                least(greatest(coalesce((v_question ->> 'phase')::smallint, 1), 1), 5),
                left(coalesce(v_question ->> 'objective', ''), 300),
                coalesce((v_question ->> 'aiDraft')::boolean, false))
        on conflict (id) do update
            set kind = excluded.kind, prompt = excluded.prompt, points = excluded.points,
                position = excluded.position, phase = excluded.phase, objective = excluded.objective,
                ai_draft = excluded.ai_draft;

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

    if exists (
        select 1 from public.attempt_responses r join public.questions q on q.id = r.question_id
        where q.activity_id = p_activity_id and not (q.id = any (v_kept_question_ids))
    ) then
        raise exception 'QUESTION_HAS_RESPONSES' using errcode = 'P0001';
    end if;
    delete from public.questions where activity_id = p_activity_id and not (id = any (v_kept_question_ids));

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

revoke execute on function
    public.hit_rate_limit(text, integer, integer),
    public.save_activity_content(uuid, jsonb, uuid[])
from public, anon, authenticated;

grant execute on function
    public.hit_rate_limit(text, integer, integer),
    public.save_activity_content(uuid, jsonb, uuid[])
to service_role;
