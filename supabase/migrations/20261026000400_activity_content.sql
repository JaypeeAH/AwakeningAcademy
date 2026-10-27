-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- Quest Builder: saves an activity's questions, options, answer keys and prerequisites atomically.
--
--   p_questions: [{ id, kind, prompt, points, options: [{ id, label }], key: { correctOptionIds,
--                   acceptedAnswers, caseSensitive, explanation } }]   — array order = position
--
-- Ids come from the editor (new items get fresh UUIDs there) so a save is an upsert. Guards:
--   • an id that already belongs to ANOTHER activity/question is rejected (no cross-activity writes)
--   • removing a question that students have answered is rejected (it would erase their responses);
--     teachers can still fix wording, options and keys
--   • correct option ids must belong to the question
-- Authorisation (course teacher) is checked by the server action before calling. Service role only.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

create function public.save_activity_content(
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

        insert into public.question_keys (question_id, correct_option_ids, accepted_answers, case_sensitive, explanation)
        values (
            v_question_id,
            v_correct,
            coalesce((select array_agg(value) from jsonb_array_elements_text(
                coalesce(v_question -> 'key' -> 'acceptedAnswers', '[]'::jsonb))), '{}'),
            coalesce((v_question -> 'key' ->> 'caseSensitive')::boolean, false),
            coalesce(v_question -> 'key' ->> 'explanation', '')
        )
        on conflict (question_id) do update
            set correct_option_ids = excluded.correct_option_ids, accepted_answers = excluded.accepted_answers,
                case_sensitive = excluded.case_sensitive, explanation = excluded.explanation;

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

revoke execute on function public.save_activity_content(uuid, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.save_activity_content(uuid, jsonb, uuid[]) to service_role;
