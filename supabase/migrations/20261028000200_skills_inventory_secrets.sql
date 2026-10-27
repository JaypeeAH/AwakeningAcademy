-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- Phase 3 — inventory, skills and the Easter egg engine
--
--   • Items (consumables like the Easter Bunny, collectibles) live in an inventory whose every change is
--     an append-only transaction with a unique idempotency key (grant_item) — same model as the XP ledger.
--   • Skills are data (unlock requirements, charges, recharge, eligible activities). Every activation goes
--     through use_skill, which validates eligibility and records the usage exactly once.
--   • Easter eggs ("secrets") are data a teacher creates: a trigger + config, a clue, rewards. Claiming
--     goes through claim_discovery (once per student per egg), which pays XP through apply_awards and
--     items through grant_item — no second reward system.
--   • The Easter Bunny skips one question on an activity that allows it (never an exam). The skip is
--     recorded on the attempt by the server; grading scores it 'skipped' (0 points, left out of the
--     maximum) — never correct.
-- TypeScript decides (utils/secrets.ts, utils/skills.ts); these functions apply, atomically.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

create type public.item_kind as enum ('consumable', 'collectible');
create type public.rarity as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');
create type public.egg_trigger as enum (
    'hidden_object', 'lesson_section', 'secret_phrase', 'activity_sequence', 'score_milestone',
    'streak_milestone', 'item_combination', 'cross_course', 'class_goal'
);

-- ── XP for skills (Overdrive) ─────────────────────────────────────────────────────────────────────

insert into public.xp_rules (source, default_xp, min_xp, max_xp) values ('skill_bonus', 15, 5, 50)
on conflict (source) do nothing;

-- ── Items & inventory ─────────────────────────────────────────────────────────────────────────────

create table public.item_definitions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
    name text not null check (char_length(name) between 2 and 60),
    description text not null default '' check (char_length(description) <= 500),
    kind public.item_kind not null,
    rarity public.rarity not null default 'common',
    -- What using it does (handled in code). Only consumables have one.
    effect text check (effect in ('bunny_skip')),
    sort_order smallint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (effect is null or kind = 'consumable')
);

create trigger item_definitions_updated_at before update on public.item_definitions
    for each row execute function public.set_updated_at();

create table public.inventory_items (
    student_id uuid not null references public.profiles (id) on delete cascade,
    item_id uuid not null references public.item_definitions (id) on delete cascade,
    charges integer not null default 0 check (charges >= 0),
    updated_at timestamptz not null default now(),
    primary key (student_id, item_id)
);

-- Append-only, like the XP ledger: every gain or use, exactly once per idempotency key
create table public.inventory_transactions (
    id bigint generated always as identity primary key,
    student_id uuid not null references public.profiles (id) on delete cascade,
    item_id uuid not null references public.item_definitions (id) on delete cascade,
    delta integer not null check (delta <> 0),
    balance_after integer not null check (balance_after >= 0),
    reason text not null check (char_length(reason) between 1 and 300),
    idempotency_key text not null unique check (char_length(idempotency_key) between 3 and 200),
    egg_id uuid,
    attempt_id uuid references public.attempts (id) on delete set null,
    question_id uuid references public.questions (id) on delete set null,
    actor_id uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
);

create index inventory_transactions_student_idx on public.inventory_transactions (student_id, created_at desc);

create function public.prevent_inventory_update() returns trigger
language plpgsql set search_path = '' as $$
begin
    if new.id is distinct from old.id or new.student_id is distinct from old.student_id
       or new.item_id is distinct from old.item_id or new.delta is distinct from old.delta
       or new.balance_after is distinct from old.balance_after or new.reason is distinct from old.reason
       or new.idempotency_key is distinct from old.idempotency_key or new.created_at is distinct from old.created_at
       or (new.egg_id is not null and new.egg_id is distinct from old.egg_id)
       or (new.attempt_id is not null and new.attempt_id is distinct from old.attempt_id)
       or (new.question_id is not null and new.question_id is distinct from old.question_id)
       or (new.actor_id is not null and new.actor_id is distinct from old.actor_id) then
        raise exception 'Inventory history is immutable' using errcode = '42501';
    end if;
    return new;
end $$;

create trigger inventory_transactions_immutable before update on public.inventory_transactions
    for each row execute function public.prevent_inventory_update();

-- ── Skills ────────────────────────────────────────────────────────────────────────────────────────

create table public.skill_definitions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
    name text not null check (char_length(name) between 2 and 60),
    description text not null default '' check (char_length(description) <= 500),
    rarity public.rarity not null default 'common',
    -- Unlock requirements (all must be met)
    min_level integer not null default 1 check (min_level >= 1),
    min_rank_order smallint not null default 1 check (min_rank_order >= 1),
    min_discoveries integer not null default 0 check (min_discoveries >= 0),
    -- Uses: `charges` per rolling `recharge_hours` window
    charges smallint not null default 1 check (charges between 1 and 20),
    recharge_hours integer not null default 24 check (recharge_hours between 1 and 720),
    eligible_kinds public.activity_kind[] not null default '{practice_quiz}',
    -- Formal assessments: exams, homework, boss battles. No skill may touch them unless explicitly allowed.
    allowed_in_formal boolean not null default false,
    requires_teacher_permission boolean not null default true,
    affects_score boolean not null default false,
    affects_xp boolean not null default false,
    -- Passive skills have no activation (e.g. Guild Leader, used by team quests in Phase 4)
    passive boolean not null default false,
    config jsonb not null default '{}',
    enabled boolean not null default true,
    sort_order smallint not null default 0,
    updated_at timestamptz not null default now()
);

create trigger skill_definitions_updated_at before update on public.skill_definitions
    for each row execute function public.set_updated_at();

create table public.student_skills (
    student_id uuid not null references public.profiles (id) on delete cascade,
    skill_id uuid not null references public.skill_definitions (id) on delete cascade,
    unlocked_at timestamptz not null default now(),
    primary key (student_id, skill_id)
);

create table public.skill_usages (
    id bigint generated always as identity primary key,
    student_id uuid not null references public.profiles (id) on delete cascade,
    skill_id uuid not null references public.skill_definitions (id) on delete cascade,
    activity_id uuid references public.activities (id) on delete set null,
    attempt_id uuid references public.attempts (id) on delete set null,
    question_id uuid references public.questions (id) on delete set null,
    idempotency_key text not null unique check (char_length(idempotency_key) between 3 and 200),
    effect jsonb not null default '{}',
    created_at timestamptz not null default now()
);

create index skill_usages_student_idx on public.skill_usages (student_id, skill_id, created_at desc);
create index skill_usages_attempt_idx on public.skill_usages (attempt_id);

-- Second Chance: extra attempts granted to one student on one activity
create table public.attempt_allowances (
    student_id uuid not null references public.profiles (id) on delete cascade,
    activity_id uuid not null references public.activities (id) on delete cascade,
    extra_attempts integer not null default 0 check (extra_attempts between 0 and 20),
    primary key (student_id, activity_id)
);

-- ── Activity settings and skipped questions ───────────────────────────────────────────────────────

alter table public.activities
    add column allow_skills boolean not null default false,
    add column allow_bunny_skips boolean not null default false;

update public.activities set allow_skills = true, allow_bunny_skips = true where kind = 'practice_quiz';
update public.activities set allow_skills = true where kind = 'quiz';

-- Easter Bunny skips are never allowed on formal assessments
alter table public.activities add constraint activities_no_formal_skips
    check (not allow_bunny_skips or kind not in ('exam', 'homework', 'boss_battle'));

-- Questions skipped with an Easter Bunny on this attempt (set only by use_bunny_skip)
alter table public.attempts add column skipped_question_ids uuid[] not null default '{}';

-- ── Easter eggs ───────────────────────────────────────────────────────────────────────────────────

create table public.easter_eggs (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses (id) on delete cascade,
    title text not null check (char_length(title) between 2 and 120),
    -- Shown before discovery (when clue_visible) — a hint, never the answer
    clue text not null default '' check (char_length(clue) <= 500),
    clue_visible boolean not null default true,
    -- Lore / message revealed on discovery
    reveal text not null default '' check (char_length(reveal) <= 5000),
    trigger public.egg_trigger not null,
    -- Trigger settings, validated by zod in utils/secrets.ts (never sent to students)
    config jsonb not null default '{}',
    -- secret_phrase: sha256(egg id + ':' + normalised phrase). The phrase itself is never stored.
    phrase_hash text,
    -- hidden_object / lesson_section: the token placed in lesson content as [✦](secret:KEY)
    marker_key text unique check (marker_key ~ '^[A-Za-z0-9]{8,32}$'),
    rarity public.rarity not null default 'rare',
    -- [{ type: 'xp', amount } | { type: 'item', itemId, charges }]
    rewards jsonb not null default '[]',
    active boolean not null default true,
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index easter_eggs_course_idx on public.easter_eggs (course_id) where active;

create trigger easter_eggs_updated_at before update on public.easter_eggs
    for each row execute function public.set_updated_at();

alter table public.inventory_transactions add constraint inventory_transactions_egg_id_fkey
    foreign key (egg_id) references public.easter_eggs (id) on delete set null;

create table public.egg_discoveries (
    student_id uuid not null references public.profiles (id) on delete cascade,
    egg_id uuid not null references public.easter_eggs (id) on delete cascade,
    discovered_at timestamptz not null default now(),
    primary key (student_id, egg_id)
);

create index egg_discoveries_egg_idx on public.egg_discoveries (egg_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────────────────────────

alter table public.item_definitions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.skill_definitions enable row level security;
alter table public.student_skills enable row level security;
alter table public.skill_usages enable row level security;
alter table public.attempt_allowances enable row level security;
alter table public.easter_eggs enable row level security;
alter table public.egg_discoveries enable row level security;

create policy "read item definitions" on public.item_definitions for select to authenticated using (true);
create policy "read skill definitions" on public.skill_definitions for select to authenticated using (true);

create policy "read own or taught inventory" on public.inventory_items for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read own or taught inventory history" on public.inventory_transactions for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read own or taught skills" on public.student_skills for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read own or taught skill usage" on public.skill_usages for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read own or taught allowances" on public.attempt_allowances for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read own or taught discoveries" on public.egg_discoveries for select to authenticated
    using (student_id = auth.uid() or exists (
        select 1 from public.easter_eggs e where e.id = egg_id and public.is_course_teacher(e.course_id)
    ));
-- Secrets themselves: course teachers only. Students learn about eggs only through the server's codex.
create policy "teachers read their secrets" on public.easter_eggs for select to authenticated
    using (public.is_course_teacher(course_id));

revoke insert, update, delete, truncate on
    public.item_definitions, public.inventory_items, public.inventory_transactions, public.skill_definitions,
    public.student_skills, public.skill_usages, public.attempt_allowances, public.easter_eggs, public.egg_discoveries
from anon, authenticated;
revoke all on
    public.item_definitions, public.inventory_items, public.inventory_transactions, public.skill_definitions,
    public.student_skills, public.skill_usages, public.attempt_allowances, public.easter_eggs, public.egg_discoveries
from anon;

-- ── grant_item ────────────────────────────────────────────────────────────────────────────────────
-- The only way inventory changes. Locks the row, applies once per key, never below zero.

create function public.grant_item(
    p_student_id uuid,
    p_item_id uuid,
    p_delta integer,
    p_idempotency_key text,
    p_reason text,
    p_egg_id uuid default null,
    p_attempt_id uuid default null,
    p_question_id uuid default null,
    p_actor_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_row public.inventory_items;
    v_new integer;
begin
    if p_delta is null or p_delta = 0 then
        raise exception 'INVALID_ITEM_AMOUNT' using errcode = '22023';
    end if;

    insert into public.inventory_items (student_id, item_id) values (p_student_id, p_item_id)
    on conflict (student_id, item_id) do nothing;
    select * into v_row from public.inventory_items
    where student_id = p_student_id and item_id = p_item_id for update;

    if exists (select 1 from public.inventory_transactions where idempotency_key = p_idempotency_key) then
        return jsonb_build_object('applied', false, 'duplicate', true, 'charges', v_row.charges);
    end if;

    v_new := v_row.charges + p_delta;
    if v_new < 0 then
        raise exception 'NOT_ENOUGH_CHARGES' using errcode = 'P0001';
    end if;

    insert into public.inventory_transactions (student_id, item_id, delta, balance_after, reason, idempotency_key,
                                               egg_id, attempt_id, question_id, actor_id)
    values (p_student_id, p_item_id, p_delta, v_new, p_reason, p_idempotency_key, p_egg_id, p_attempt_id,
            p_question_id, p_actor_id);

    update public.inventory_items set charges = v_new, updated_at = now()
    where student_id = p_student_id and item_id = p_item_id;

    return jsonb_build_object('applied', true, 'duplicate', false, 'charges', v_new);
end $$;

-- ── claim_discovery ───────────────────────────────────────────────────────────────────────────────
-- The trigger has already been checked by the server (utils/secrets.ts). Records the discovery once,
-- then pays the rewards: XP via apply_awards (source secret_quest), items via grant_item.
--   p_awards: [{ amount, source, idempotencyKey, reason }]     p_items: [{ itemId, charges }]

create function public.claim_discovery(
    p_student_id uuid,
    p_egg_id uuid,
    p_awards jsonb default '[]'::jsonb,
    p_items jsonb default '[]'::jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_egg public.easter_eggs;
    v_subject_id uuid;
    v_before jsonb;
    v_inserted boolean;
    v_awards jsonb := '[]'::jsonb;
    v_item jsonb;
    v_items jsonb := '[]'::jsonb;
    v_result jsonb;
begin
    select * into v_egg from public.easter_eggs where id = p_egg_id;
    if not found or not v_egg.active then
        raise exception 'SECRET_NOT_FOUND' using errcode = 'P0002';
    end if;
    select subject_id into v_subject_id from public.courses where id = v_egg.course_id;

    perform public.lock_student_progress(p_student_id);
    v_before := public.progress_snapshot(p_student_id);

    insert into public.egg_discoveries (student_id, egg_id) values (p_student_id, p_egg_id)
    on conflict do nothing
    returning true into v_inserted;

    if v_inserted is null then
        return jsonb_build_object('claimed', false, 'alreadyFound', true,
                                  'before', v_before, 'after', v_before, 'awards', '[]'::jsonb, 'items', '[]'::jsonb);
    end if;

    v_awards := public.apply_awards(p_student_id, p_awards, null, v_egg.course_id, v_subject_id, null);

    for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        v_result := public.grant_item(
            p_student_id, (v_item ->> 'itemId')::uuid, (v_item ->> 'charges')::integer,
            format('egg:%s:%s:%s', p_egg_id, p_student_id, v_item ->> 'itemId'),
            format('Discovered “%s”', v_egg.title), p_egg_id);
        v_items := v_items || jsonb_build_object('itemId', v_item ->> 'itemId', 'charges', (v_item ->> 'charges')::integer,
                                                 'balance', v_result -> 'charges');
    end loop;

    insert into public.notifications (user_id, kind, title, body, data)
    values (p_student_id, 'discovery', format('Secret discovered: %s', v_egg.title),
            'Open your Codex to read what you found.',
            jsonb_build_object('eggId', p_egg_id, 'courseId', v_egg.course_id));

    perform public.evaluate_rank(p_student_id);

    return jsonb_build_object('claimed', true, 'alreadyFound', false, 'before', v_before,
                              'after', public.progress_snapshot(p_student_id), 'awards', v_awards, 'items', v_items);
end $$;

-- ── use_bunny_skip ────────────────────────────────────────────────────────────────────────────────
-- Spends one Easter Bunny charge to skip one question on the student's open attempt. Exactly once per
-- attempt+question (a double click or second tab can't spend two). Exams and other formal assessments
-- can never be skipped, whatever the activity flag says.

create function public.use_bunny_skip(p_attempt_id uuid, p_student_id uuid, p_question_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_attempt public.attempts;
    v_activity public.activities;
    v_item_id uuid;
    v_result jsonb;
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

    select * into v_activity from public.activities where id = v_attempt.activity_id;
    if not v_activity.allow_bunny_skips or v_activity.kind in ('exam', 'homework', 'boss_battle') then
        raise exception 'SKIPS_NOT_ALLOWED' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.questions where id = p_question_id and activity_id = v_activity.id) then
        raise exception 'QUESTION_NOT_IN_ATTEMPT' using errcode = '22023';
    end if;

    select id into v_item_id from public.item_definitions where effect = 'bunny_skip' order by sort_order limit 1;
    if v_item_id is null then
        raise exception 'NOT_ENOUGH_CHARGES' using errcode = 'P0001';
    end if;

    if p_question_id = any (v_attempt.skipped_question_ids) then
        select jsonb_build_object('charges', coalesce(charges, 0)) into v_result from public.inventory_items
        where student_id = p_student_id and item_id = v_item_id;
        return jsonb_build_object('alreadySkipped', true, 'charges', coalesce(v_result ->> 'charges', '0')::integer);
    end if;

    v_result := public.grant_item(p_student_id, v_item_id, -1, format('bunny:%s:%s', p_attempt_id, p_question_id),
                                  'Easter Bunny skip', null, p_attempt_id, p_question_id);

    update public.attempts set skipped_question_ids = array_append(skipped_question_ids, p_question_id)
    where id = p_attempt_id;

    return jsonb_build_object('alreadySkipped', false, 'charges', (v_result ->> 'charges')::integer);
end $$;

-- ── unlock_skills ─────────────────────────────────────────────────────────────────────────────────
-- Unlocks every enabled skill whose requirements the student now meets. Returns the newly unlocked codes.

create function public.unlock_skills(p_student_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_level integer;
    v_rank_order smallint;
    v_discoveries integer;
    v_new jsonb := '[]'::jsonb;
    v_skill public.skill_definitions;
begin
    select p.level, r.sort_order into v_level, v_rank_order
    from public.student_progress p join public.ranks r on r.id = p.rank_id where p.student_id = p_student_id;
    if not found then
        return v_new;
    end if;
    select count(*) into v_discoveries from public.egg_discoveries where student_id = p_student_id;

    for v_skill in
        select s.* from public.skill_definitions s
        where s.enabled and s.min_level <= v_level and s.min_rank_order <= v_rank_order
          and s.min_discoveries <= v_discoveries
          and not exists (select 1 from public.student_skills x where x.student_id = p_student_id and x.skill_id = s.id)
        order by s.sort_order
    loop
        insert into public.student_skills (student_id, skill_id) values (p_student_id, v_skill.id)
        on conflict do nothing;
        insert into public.notifications (user_id, kind, title, body, data)
        values (p_student_id, 'skill_unlocked', format('Skill unlocked: %s', v_skill.name), v_skill.description,
                jsonb_build_object('skill', v_skill.code));
        v_new := v_new || to_jsonb(v_skill.code);
    end loop;
    return v_new;
end $$;

-- ── use_skill ─────────────────────────────────────────────────────────────────────────────────────
-- Validates and records one activation (exactly once per key). The effect payload is worked out by the
-- server (utils/skills.ts) — e.g. which wrong option Insight removes. Side effects applied here:
--   time_dilation → extends the open attempt's expiry by config.minutes
--   second_chance → one extra attempt on the activity
-- (Overdrive is read when the attempt is graded; Insight / Knowledge Echo / Dungeon Sense only reveal.)

create function public.use_skill(
    p_student_id uuid,
    p_skill_code text,
    p_idempotency_key text,
    p_activity_id uuid default null,
    p_attempt_id uuid default null,
    p_question_id uuid default null,
    p_effect jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_skill public.skill_definitions;
    v_activity public.activities;
    v_attempt public.attempts;
    v_used integer;
    v_existing public.skill_usages;
    v_minutes integer;
begin
    select * into v_skill from public.skill_definitions where code = p_skill_code;
    if not found or not v_skill.enabled or v_skill.passive then
        raise exception 'SKILL_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.student_skills where student_id = p_student_id and skill_id = v_skill.id) then
        raise exception 'SKILL_LOCKED' using errcode = 'P0001';
    end if;

    -- Serialise this student's activations of this skill (charges are counted, then spent)
    perform pg_advisory_xact_lock(hashtextextended(p_student_id::text || ':skill:' || v_skill.id::text, 0));

    select * into v_existing from public.skill_usages where idempotency_key = p_idempotency_key;
    if found then
        return jsonb_build_object('used', false, 'duplicate', true, 'effect', v_existing.effect);
    end if;

    if p_attempt_id is not null then
        select * into v_attempt from public.attempts where id = p_attempt_id for update;
        if not found or v_attempt.student_id <> p_student_id then
            raise exception 'ATTEMPT_NOT_FOUND' using errcode = 'P0002';
        end if;
        if v_attempt.status <> 'in_progress' then
            raise exception 'ATTEMPT_CLOSED' using errcode = 'P0001';
        end if;
        p_activity_id := v_attempt.activity_id;
    end if;

    if p_activity_id is not null then
        select * into v_activity from public.activities where id = p_activity_id;
        if not found then
            raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002';
        end if;
        if not (v_activity.kind = any (v_skill.eligible_kinds)) then
            raise exception 'SKILL_NOT_ELIGIBLE' using errcode = 'P0001';
        end if;
        if v_activity.kind in ('exam', 'homework', 'boss_battle') and not v_skill.allowed_in_formal then
            raise exception 'SKILL_NOT_ELIGIBLE' using errcode = 'P0001';
        end if;
        if v_skill.requires_teacher_permission and not v_activity.allow_skills then
            raise exception 'SKILLS_NOT_ALLOWED' using errcode = 'P0001';
        end if;
    end if;

    select count(*) into v_used from public.skill_usages
    where student_id = p_student_id and skill_id = v_skill.id
      and created_at > now() - make_interval(hours => v_skill.recharge_hours);
    if v_used >= v_skill.charges then
        raise exception 'NO_CHARGES' using errcode = 'P0001';
    end if;

    if p_skill_code = 'time_dilation' then
        if v_attempt.id is null or v_attempt.expires_at is null then
            raise exception 'SKILL_NOT_ELIGIBLE' using errcode = 'P0001';
        end if;
        v_minutes := least(greatest(coalesce((v_skill.config ->> 'minutes')::integer, 5), 1), 30);
        update public.attempts set expires_at = expires_at + make_interval(mins => v_minutes) where id = v_attempt.id;
        p_effect := jsonb_build_object('minutes', v_minutes);
    elsif p_skill_code = 'second_chance' then
        if p_activity_id is null then
            raise exception 'SKILL_NOT_ELIGIBLE' using errcode = 'P0001';
        end if;
        insert into public.attempt_allowances (student_id, activity_id, extra_attempts) values (p_student_id, p_activity_id, 1)
        on conflict (student_id, activity_id) do update set extra_attempts = public.attempt_allowances.extra_attempts + 1;
    end if;

    insert into public.skill_usages (student_id, skill_id, activity_id, attempt_id, question_id, idempotency_key, effect)
    values (p_student_id, v_skill.id, p_activity_id, p_attempt_id, p_question_id, p_idempotency_key, coalesce(p_effect, '{}'));

    return jsonb_build_object('used', true, 'duplicate', false, 'effect', coalesce(p_effect, '{}'),
                              'chargesLeft', v_skill.charges - v_used - 1);
end $$;

-- ── start_attempt: counts Second Chance allowances ────────────────────────────────────────────────

create or replace function public.start_attempt(p_student_id uuid, p_activity_id uuid) returns public.attempts
language plpgsql security definer set search_path = '' as $$
declare
    v_activity public.activities;
    v_attempt public.attempts;
    v_used integer;
    v_extra integer;
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
    select coalesce(extra_attempts, 0) into v_extra from public.attempt_allowances
    where student_id = p_student_id and activity_id = p_activity_id;
    if v_activity.max_attempts is not null and v_used >= v_activity.max_attempts + coalesce(v_extra, 0) then
        raise exception 'MAX_ATTEMPTS' using errcode = 'P0001';
    end if;

    insert into public.attempts (activity_id, student_id, attempt_no, expires_at)
    values (p_activity_id, p_student_id, v_used + 1,
            case when v_activity.time_limit_minutes is null then null
                 else now() + make_interval(mins => v_activity.time_limit_minutes) end)
    returning * into v_attempt;
    return v_attempt;
end $$;

-- ── grade_attempt: skipped questions are left out of the maximum ──────────────────────────────────

create or replace function public.grade_attempt(
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
        -- A skipped question stays skipped: it can't be graded into a score
        if v_question.id = any (v_attempt.skipped_question_ids) then
            raise exception 'QUESTION_SKIPPED' using errcode = '22023';
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

    select coalesce(sum(r.points_awarded), 0),
           coalesce(sum(q.points) filter (where r.outcome <> 'skipped'), 0),
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

-- ── Reference data ────────────────────────────────────────────────────────────────────────────────

insert into public.item_definitions (code, name, description, kind, rarity, effect, sort_order) values
    ('easter_bunny', 'Easter Bunny', 'A rare, quick-footed companion. Spend one to skip a single question on practice that allows it — the question won’t count for or against you.', 'consumable', 'rare', 'bunny_skip', 1),
    ('moonstone_shard', 'Moonstone Shard', 'A pale stone that glows when knowledge is near.', 'collectible', 'uncommon', null, 10),
    ('ancient_sigil', 'Ancient Sigil', 'A mark left by scholars long ago. Some say several of them open hidden paths.', 'collectible', 'rare', null, 11),
    ('phoenix_feather', 'Phoenix Feather', 'Proof of rising again after a hard trial.', 'collectible', 'epic', null, 12),
    ('starlit_compass', 'Starlit Compass', 'It always points to the next discovery.', 'collectible', 'legendary', null, 13);

insert into public.skill_definitions (code, name, description, rarity, min_level, min_rank_order, min_discoveries, charges,
                                      recharge_hours, eligible_kinds, affects_score, affects_xp, passive, config, sort_order) values
    ('insight', 'Insight', 'Removes one wrong option from a multiple-choice practice question.', 'common', 3, 1, 0, 3, 24,
     '{practice_quiz}', false, false, false, '{}', 1),
    ('knowledge_echo', 'Knowledge Echo', 'Points you back to a lesson you’ve completed that can help with this question.', 'common', 5, 1, 0, 3, 24,
     '{practice_quiz,quiz}', false, false, false, '{}', 2),
    ('time_dilation', 'Time Dilation', 'Adds extra minutes to a timed practice challenge.', 'uncommon', 8, 1, 0, 1, 24,
     '{practice_quiz}', false, false, false, '{"minutes": 5}', 3),
    ('second_chance', 'Second Chance', 'Grants one more attempt at a practice quiz after you’ve used them all.', 'rare', 12, 2, 0, 1, 72,
     '{practice_quiz}', false, false, false, '{}', 4),
    ('overdrive', 'Overdrive', 'Arm it before a quest you haven’t completed yet: pass it to earn bonus XP.', 'rare', 15, 2, 0, 1, 48,
     '{practice_quiz,quiz}', false, true, false, '{"bonus": 15}', 5),
    ('dungeon_sense', 'Dungeon Sense', 'Reveals a clue to one undiscovered secret in a course.', 'epic', 10, 1, 1, 1, 72,
     '{}', false, false, false, '{}', 6),
    ('guild_leader', 'Guild Leader', 'Marks you as ready to lead. Team quest coordination arrives with guilds.', 'legendary', 30, 4, 3, 1, 24,
     '{}', false, false, true, '{}', 7);

-- ── Grants ────────────────────────────────────────────────────────────────────────────────────────

revoke execute on function
    public.grant_item(uuid, uuid, integer, text, text, uuid, uuid, uuid, uuid),
    public.claim_discovery(uuid, uuid, jsonb, jsonb),
    public.use_bunny_skip(uuid, uuid, uuid),
    public.unlock_skills(uuid),
    public.use_skill(uuid, text, text, uuid, uuid, uuid, jsonb),
    public.start_attempt(uuid, uuid),
    public.grade_attempt(uuid, uuid, jsonb, text, numeric, numeric, numeric, boolean, jsonb)
from public, anon, authenticated;

grant execute on function
    public.grant_item(uuid, uuid, integer, text, text, uuid, uuid, uuid, uuid),
    public.claim_discovery(uuid, uuid, jsonb, jsonb),
    public.use_bunny_skip(uuid, uuid, uuid),
    public.unlock_skills(uuid),
    public.use_skill(uuid, text, text, uuid, uuid, uuid, jsonb),
    public.start_attempt(uuid, uuid),
    public.grade_attempt(uuid, uuid, jsonb, text, numeric, numeric, numeric, boolean, jsonb)
to service_role;
