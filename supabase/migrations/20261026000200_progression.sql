-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- Progression engine: XP ledger, levels, ranks, attempts.
--
-- Division of labour
--   • TypeScript (utils/progression.ts, utils/grading.ts) DECIDES: grades answers and works out which
--     rewards an attempt has earned, each with a deterministic idempotency key. Pure + unit tested.
--   • These functions APPLY: atomically, idempotently and serialised per student. The idempotency key's
--     unique index guarantees a reward is granted once even under concurrent requests; the student's
--     progress row is locked (FOR UPDATE) so totals, levels and ranks never interleave.
--
-- All functions here are SECURITY DEFINER and executable by service_role only (see the end of file).
-- ════════════════════════════════════════════════════════════════════════════════════════════════

-- ── Level formula ─────────────────────────────────────────────────────────────────────────────────
-- XP needed to go from level L to L+1: base + step × (L − 1)
-- Cumulative XP to reach level L:       (L − 1) × base + step × (L − 1)(L − 2) / 2
-- Mirrored by xpForLevel / levelForXp in src/utils/progression.ts (tests keep them in agreement).

create function public.xp_for_level(p_level integer, p_base integer, p_step integer) returns bigint
language sql immutable set search_path = '' as $$
    select (greatest(p_level, 1) - 1)::bigint * p_base
         + p_step::bigint * (greatest(p_level, 1) - 1) * (greatest(p_level, 1) - 2) / 2
$$;

create function public.level_for_xp(p_total bigint, p_base integer, p_step integer, p_max_level integer)
returns integer
language plpgsql immutable set search_path = '' as $$
declare
    v_level integer := 1;
begin
    while v_level < p_max_level and public.xp_for_level(v_level + 1, p_base, p_step) <= p_total loop
        v_level := v_level + 1;
    end loop;
    return v_level;
end $$;

-- ── Profile bootstrap ─────────────────────────────────────────────────────────────────────────────
-- Every new auth user becomes a STUDENT. The role is never read from user metadata (which the user
-- controls); teachers and admins are promoted by an admin.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    v_name text;
begin
    v_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                            split_part(new.email, '@', 1), 'Player'), 60);

    insert into public.profiles (id, email, display_name, role)
    values (new.id, coalesce(new.email, ''), v_name, 'student');

    insert into public.student_progress (student_id, rank_id)
    select new.id, r.id from public.ranks r order by r.sort_order limit 1;

    return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
    for each row execute function public.handle_new_user();

-- ── Internal helpers ──────────────────────────────────────────────────────────────────────────────

-- Locks (creating if needed) the student's progress row. Every function that changes a student's
-- game state calls this first, so all such changes for one student run one at a time.
create function public.lock_student_progress(p_student_id uuid) returns public.student_progress
language plpgsql security definer set search_path = '' as $$
declare
    v_progress public.student_progress;
begin
    insert into public.student_progress (student_id, rank_id)
    select p_student_id, r.id from public.ranks r order by r.sort_order limit 1
    on conflict (student_id) do nothing;

    select * into v_progress from public.student_progress where student_id = p_student_id for update;
    if not found then
        raise exception 'STUDENT_NOT_FOUND' using errcode = 'P0002';
    end if;
    return v_progress;
end $$;

create function public.progress_snapshot(p_student_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
    select jsonb_build_object(
        'totalXp', p.total_xp,
        'level', p.level,
        'rankId', r.id,
        'rankCode', r.code,
        'rankName', r.name
    )
    from public.student_progress p join public.ranks r on r.id = p.rank_id
    where p.student_id = p_student_id
$$;

-- The mastery numbers rank gates are measured against
create function public.mastery_stats(p_student_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
    select jsonb_build_object(
        'averageScore', coalesce(round(avg(c.best_percent) filter (
            where c.kind in ('quiz', 'exam', 'homework', 'boss_battle') and c.best_percent is not null), 2), 0),
        'passedAssessments', count(*) filter (
            where c.kind in ('quiz', 'exam', 'homework', 'boss_battle') and c.passed),
        'completedLessons', count(*) filter (where c.kind = 'lesson')
    )
    from public.activity_completions c
    where c.student_id = p_student_id
$$;

-- Promotes the student through every rank they now qualify for (never skips a rank, never demotes).
-- Caller must hold the progress row lock. Returns the promotions made, oldest first.
create function public.evaluate_rank(p_student_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_progress public.student_progress;
    v_current public.ranks;
    v_next public.ranks;
    v_stats jsonb;
    v_promotions jsonb := '[]'::jsonb;
begin
    select * into v_progress from public.student_progress where student_id = p_student_id;
    select * into v_current from public.ranks where id = v_progress.rank_id;
    v_stats := public.mastery_stats(p_student_id);

    loop
        select * into v_next from public.ranks where sort_order > v_current.sort_order order by sort_order limit 1;
        exit when not found;
        exit when v_progress.level < v_next.min_level
              or (v_stats ->> 'averageScore')::numeric < v_next.min_average_score
              or (v_stats ->> 'passedAssessments')::integer < v_next.min_passed_assessments
              or (v_stats ->> 'completedLessons')::integer < v_next.min_completed_lessons;

        update public.student_progress set rank_id = v_next.id, updated_at = now() where student_id = p_student_id;

        insert into public.rank_history (student_id, from_rank_id, to_rank_id, level_at_promotion)
        values (p_student_id, v_current.id, v_next.id, v_progress.level);

        insert into public.notifications (user_id, kind, title, body, data)
        values (p_student_id, 'rank_up', format('Promoted to %s-Rank', v_next.code),
                format('You have proven your mastery and ascended to %s.', v_next.name),
                jsonb_build_object('fromRank', v_current.code, 'toRank', v_next.code));

        v_promotions := v_promotions || jsonb_build_object('fromRank', v_current.code, 'toRank', v_next.code);
        v_current := v_next;
    end loop;

    return v_promotions;
end $$;

-- ── award_xp ──────────────────────────────────────────────────────────────────────────────────────
-- The only way XP changes. Exactly-once per idempotency key. Returns
--   { awarded, duplicate, amount, before, after, promotions, subject: {id, levelBefore, levelAfter} }

create function public.award_xp(
    p_student_id uuid,
    p_amount integer,
    p_source public.xp_source,
    p_idempotency_key text,
    p_reason text,
    p_activity_id uuid default null,
    p_course_id uuid default null,
    p_subject_id uuid default null,
    p_attempt_id uuid default null,
    p_awarded_by uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_settings public.progression_settings;
    v_progress public.student_progress;
    v_before jsonb;
    v_new_total bigint;
    v_new_level integer;
    v_ledger_id bigint;
    v_promotions jsonb;
    v_subject_before integer;
    v_subject_after integer;
begin
    if p_amount is null or p_amount = 0 then
        raise exception 'INVALID_XP_AMOUNT' using errcode = '22023';
    end if;
    if p_amount < 0 and p_source <> 'manual_adjustment' then
        raise exception 'NEGATIVE_XP_NOT_ALLOWED' using errcode = '22023';
    end if;

    v_progress := public.lock_student_progress(p_student_id);
    v_before := public.progress_snapshot(p_student_id);

    -- Duplicate claim? Checked after taking the lock, so a concurrent twin waits and then sees our row.
    if exists (select 1 from public.xp_ledger where idempotency_key = p_idempotency_key) then
        return jsonb_build_object('awarded', false, 'duplicate', true, 'amount', 0,
                                  'before', v_before, 'after', v_before, 'promotions', '[]'::jsonb);
    end if;

    v_new_total := v_progress.total_xp + p_amount;
    if v_new_total < 0 then
        raise exception 'XP_BALANCE_NEGATIVE' using errcode = '22023';
    end if;

    -- `on conflict do nothing` is the last line of defence if a twin slipped past the check above
    insert into public.xp_ledger (student_id, amount, source, reason, idempotency_key, activity_id, course_id,
                                  subject_id, attempt_id, awarded_by, balance_after)
    values (p_student_id, p_amount, p_source, p_reason, p_idempotency_key, p_activity_id, p_course_id,
            p_subject_id, p_attempt_id, p_awarded_by, v_new_total)
    on conflict (idempotency_key) do nothing
    returning id into v_ledger_id;

    if v_ledger_id is null then
        return jsonb_build_object('awarded', false, 'duplicate', true, 'amount', 0,
                                  'before', v_before, 'after', v_before, 'promotions', '[]'::jsonb);
    end if;

    select * into v_settings from public.progression_settings where id;
    v_new_level := public.level_for_xp(v_new_total, v_settings.base_xp, v_settings.xp_step, v_settings.max_level);

    update public.student_progress
    set total_xp = v_new_total, level = v_new_level, updated_at = now()
    where student_id = p_student_id;

    if v_new_level > v_progress.level then
        insert into public.level_events (student_id, from_level, to_level, total_xp)
        values (p_student_id, v_progress.level, v_new_level, v_new_total);

        insert into public.notifications (user_id, kind, title, body, data)
        values (p_student_id, 'level_up', format('Level %s reached', v_new_level),
                'Your power grows. Keep learning to climb further.',
                jsonb_build_object('fromLevel', v_progress.level, 'toLevel', v_new_level));
    end if;

    if p_subject_id is not null then
        insert into public.student_subject_progress (student_id, subject_id)
        values (p_student_id, p_subject_id)
        on conflict (student_id, subject_id) do nothing;

        select level into v_subject_before from public.student_subject_progress
        where student_id = p_student_id and subject_id = p_subject_id;

        update public.student_subject_progress
        set xp = greatest(xp + p_amount, 0),
            level = public.level_for_xp(greatest(xp + p_amount, 0), v_settings.base_xp, v_settings.xp_step,
                                        v_settings.max_level),
            updated_at = now()
        where student_id = p_student_id and subject_id = p_subject_id
        returning level into v_subject_after;
    end if;

    v_promotions := public.evaluate_rank(p_student_id);

    return jsonb_build_object(
        'awarded', true,
        'duplicate', false,
        'amount', p_amount,
        'before', v_before,
        'after', public.progress_snapshot(p_student_id),
        'promotions', v_promotions,
        'subject', case when p_subject_id is null then null else jsonb_build_object(
            'id', p_subject_id, 'levelBefore', v_subject_before, 'levelAfter', v_subject_after) end
    );
end $$;

-- ── Lessons ───────────────────────────────────────────────────────────────────────────────────────
-- Access (published, enrolled, open, prerequisites) is checked by the server action before calling.

create function public.complete_lesson(
    p_student_id uuid,
    p_activity_id uuid,
    p_awards jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_activity public.activities;
    v_subject_id uuid;
    v_before jsonb;
    v_first boolean;
    v_results jsonb;
begin
    select * into v_activity from public.activities where id = p_activity_id;
    if not found or v_activity.kind <> 'lesson' then
        raise exception 'NOT_A_LESSON' using errcode = '22023';
    end if;
    select subject_id into v_subject_id from public.courses where id = v_activity.course_id;

    perform public.lock_student_progress(p_student_id);
    v_before := public.progress_snapshot(p_student_id);

    insert into public.activity_completions (student_id, activity_id, course_id, kind, passed, attempts_count)
    values (p_student_id, p_activity_id, v_activity.course_id, 'lesson', true, 1)
    on conflict (student_id, activity_id) do update
        set last_completed_at = now(), attempts_count = public.activity_completions.attempts_count + 1
    returning (xmax = 0) into v_first;

    v_results := public.apply_awards(p_student_id, p_awards, p_activity_id, v_activity.course_id, v_subject_id, null);

    perform public.evaluate_rank(p_student_id);

    return jsonb_build_object(
        'firstCompletion', v_first,
        'awards', v_results,
        'before', v_before,
        'after', public.progress_snapshot(p_student_id)
    );
end $$;

-- Applies [{ amount, source, idempotencyKey, reason }] via award_xp; returns their results in order.
create function public.apply_awards(
    p_student_id uuid,
    p_awards jsonb,
    p_activity_id uuid,
    p_course_id uuid,
    p_subject_id uuid,
    p_attempt_id uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_award jsonb;
    v_results jsonb := '[]'::jsonb;
    v_result jsonb;
begin
    for v_award in select * from jsonb_array_elements(coalesce(p_awards, '[]'::jsonb)) loop
        v_result := public.award_xp(
            p_student_id,
            (v_award ->> 'amount')::integer,
            (v_award ->> 'source')::public.xp_source,
            v_award ->> 'idempotencyKey',
            v_award ->> 'reason',
            p_activity_id, p_course_id, p_subject_id, p_attempt_id, null
        );
        v_results := v_results || jsonb_build_object(
            'idempotencyKey', v_award ->> 'idempotencyKey',
            'source', v_award ->> 'source',
            'amount', (v_result ->> 'amount')::integer,
            'awarded', (v_result ->> 'awarded')::boolean,
            'promotions', v_result -> 'promotions',
            'subject', v_result -> 'subject'
        );
    end loop;
    return v_results;
end $$;

-- ── Attempts ──────────────────────────────────────────────────────────────────────────────────────

-- Returns the open attempt if there is one (a refresh resumes it), otherwise starts the next attempt.
-- Raises MAX_ATTEMPTS when the activity's limit is used up.
create function public.start_attempt(p_student_id uuid, p_activity_id uuid) returns public.attempts
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

    -- Serialise starts for this student + activity (two tabs clicking "Start" at once)
    perform pg_advisory_xact_lock(hashtextextended(p_activity_id::text || ':' || p_student_id::text, 0));

    select * into v_attempt from public.attempts
    where activity_id = p_activity_id and student_id = p_student_id and status = 'in_progress';
    if found then
        return v_attempt;
    end if;

    select count(*) into v_used from public.attempts where activity_id = p_activity_id and student_id = p_student_id;
    if v_activity.max_attempts is not null and v_used >= v_activity.max_attempts then
        raise exception 'MAX_ATTEMPTS' using errcode = 'P0001';
    end if;

    insert into public.attempts (activity_id, student_id, attempt_no)
    values (p_activity_id, p_student_id, v_used + 1)
    returning * into v_attempt;
    return v_attempt;
end $$;

-- Records a graded attempt and its rewards in one transaction. Only an in-progress attempt can be
-- finalised, so a double submit (two tabs, a retry, a refresh) is a no-op that reports the first result.
--   p_responses: [{ questionId, selectedOptionIds, textAnswer, outcome, pointsAwarded }]
--   p_awards:    [{ amount, source, idempotencyKey, reason }]
create function public.finalize_attempt(
    p_attempt_id uuid,
    p_student_id uuid,
    p_responses jsonb,
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
    v_before jsonb;
    v_results jsonb;
begin
    select * into v_attempt from public.attempts where id = p_attempt_id for update;
    if not found or v_attempt.student_id <> p_student_id then
        raise exception 'ATTEMPT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_attempt.status <> 'in_progress' then
        return jsonb_build_object('alreadySubmitted', true, 'attemptId', v_attempt.id);
    end if;

    select * into v_activity from public.activities where id = v_attempt.activity_id;
    select subject_id into v_subject_id from public.courses where id = v_activity.course_id;

    -- Lock order everywhere: attempt → progress
    perform public.lock_student_progress(p_student_id);
    v_before := public.progress_snapshot(p_student_id);

    update public.attempts
    set status = 'graded', submitted_at = now(), score = p_score, max_score = p_max_score,
        percent = p_percent, passed = p_passed
    where id = p_attempt_id;

    insert into public.attempt_responses (attempt_id, question_id, selected_option_ids, text_answer, outcome,
                                          points_awarded)
    select p_attempt_id, r."questionId", coalesce(r."selectedOptionIds", '{}'), r."textAnswer", r.outcome,
           coalesce(r."pointsAwarded", 0)
    from jsonb_to_recordset(coalesce(p_responses, '[]'::jsonb)) as r(
        "questionId" uuid, "selectedOptionIds" uuid[], "textAnswer" text,
        outcome public.response_outcome, "pointsAwarded" numeric);

    insert into public.activity_completions (student_id, activity_id, course_id, kind, best_percent, passed,
                                             attempts_count)
    values (p_student_id, v_activity.id, v_activity.course_id, v_activity.kind, p_percent, p_passed, 1)
    on conflict (student_id, activity_id) do update
        set best_percent = greatest(public.activity_completions.best_percent, excluded.best_percent),
            passed = public.activity_completions.passed or excluded.passed,
            attempts_count = public.activity_completions.attempts_count + 1,
            last_completed_at = now();

    v_results := public.apply_awards(p_student_id, p_awards, v_activity.id, v_activity.course_id, v_subject_id,
                                     p_attempt_id);

    -- A better score can satisfy a mastery gate even when no XP was due
    perform public.evaluate_rank(p_student_id);

    return jsonb_build_object(
        'alreadySubmitted', false,
        'attemptId', p_attempt_id,
        'awards', v_results,
        'before', v_before,
        'after', public.progress_snapshot(p_student_id)
    );
end $$;

-- ── Admin: re-derive levels after the formula changes ─────────────────────────────────────────────
-- Levels follow the formula; ranks already earned are kept (ranks are never taken away).

create function public.recalculate_levels() returns integer
language plpgsql security definer set search_path = '' as $$
declare
    v_settings public.progression_settings;
    v_count integer;
begin
    select * into v_settings from public.progression_settings where id;

    update public.student_progress
    set level = public.level_for_xp(total_xp, v_settings.base_xp, v_settings.xp_step, v_settings.max_level),
        updated_at = now()
    where level <> public.level_for_xp(total_xp, v_settings.base_xp, v_settings.xp_step, v_settings.max_level);
    get diagnostics v_count = row_count;

    update public.student_subject_progress
    set level = public.level_for_xp(xp, v_settings.base_xp, v_settings.xp_step, v_settings.max_level)
    where level <> public.level_for_xp(xp, v_settings.base_xp, v_settings.xp_step, v_settings.max_level);

    return v_count;
end $$;

-- ── Grants: game-state functions are server-only ──────────────────────────────────────────────────

revoke execute on function
    public.lock_student_progress(uuid),
    public.progress_snapshot(uuid),
    public.mastery_stats(uuid),
    public.evaluate_rank(uuid),
    public.award_xp(uuid, integer, public.xp_source, text, text, uuid, uuid, uuid, uuid, uuid),
    public.apply_awards(uuid, jsonb, uuid, uuid, uuid, uuid),
    public.complete_lesson(uuid, uuid, jsonb),
    public.start_attempt(uuid, uuid),
    public.finalize_attempt(uuid, uuid, jsonb, numeric, numeric, numeric, boolean, jsonb),
    public.recalculate_levels(),
    public.handle_new_user()
from public, anon, authenticated;

grant execute on function
    public.lock_student_progress(uuid),
    public.progress_snapshot(uuid),
    public.mastery_stats(uuid),
    public.evaluate_rank(uuid),
    public.award_xp(uuid, integer, public.xp_source, text, text, uuid, uuid, uuid, uuid, uuid),
    public.apply_awards(uuid, jsonb, uuid, uuid, uuid, uuid),
    public.complete_lesson(uuid, uuid, jsonb),
    public.start_attempt(uuid, uuid),
    public.finalize_attempt(uuid, uuid, jsonb, numeric, numeric, numeric, boolean, jsonb),
    public.recalculate_levels()
to service_role;
