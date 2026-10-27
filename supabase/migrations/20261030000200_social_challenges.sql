-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- Phase 4: boss battles, learning streaks, achievements, guilds, team quests and leaderboards.
--   • Boss battles: questions grouped into phases (questions.phase) and a boss (activities.boss).
--   • Streaks: learning_days, one row per student per local day (settings.timezone). Milestone XP
--     uses award_xp with key streak:<student>:<days>. Second Chance can shield one missed day.
--   • Achievements: data-driven definitions (condition JSON validated by zod in utils/achievements.ts),
--     granted once through grant_achievement (XP key achievement:<id>:<student>).
--   • Guilds inside a course; team quests complete when enough members finish the target activities
--     (complete_team_quest pays every member once).
--   • Leaderboards: per course, weekly, only XP earned in the window; visibility set per course
--     (off / initials / names) and students can hide themselves.
-- Decide in TypeScript, apply here. Every function is service-role only.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

insert into public.xp_rules (source, default_xp, min_xp, max_xp) values
    ('achievement', 25, 5, 500),
    ('team_quest', 75, 10, 400)
on conflict (source) do nothing;

-- ── Settings ──────────────────────────────────────────────────────────────────────────────────────

alter table public.progression_settings
    add column timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
    add column streak_milestones integer[] not null default '{3,7,14,30,60,100}'
        check (cardinality(streak_milestones) between 0 and 12);

alter table public.courses
    add column leaderboard_mode text not null default 'off' check (leaderboard_mode in ('off', 'initials', 'names')),
    -- Students who have unlocked Guild Leader may found a guild (the teacher approves it)
    add column student_guilds boolean not null default false;

-- A student can keep themselves off every leaderboard
alter table public.profiles add column leaderboard_hidden boolean not null default false;

-- ── Boss battles and team quests (content) ────────────────────────────────────────────────────────

alter table public.questions add column phase smallint not null default 1 check (phase between 1 and 5);

alter table public.activities
    -- boss_battle: { name, phases: [title…] } (validated by utils/boss.ts)
    add column boss jsonb,
    -- team_quest: { activityIds: [...], required: 'all' | n } (validated by utils/teamQuests.ts)
    add column team_config jsonb;

-- ── Learning streaks ──────────────────────────────────────────────────────────────────────────────

create table public.learning_days (
    student_id uuid not null references public.profiles (id) on delete cascade,
    day date not null,
    -- Filled by a Second Chance streak shield rather than learning
    shielded boolean not null default false,
    created_at timestamptz not null default now(),
    primary key (student_id, day)
);

-- ── Achievements ──────────────────────────────────────────────────────────────────────────────────

create table public.achievement_definitions (
    id uuid primary key default gen_random_uuid(),
    code text not null unique check (code ~ '^[a-z0-9_]{2,40}$'),
    name text not null check (char_length(name) between 2 and 60),
    description text not null default '' check (char_length(description) <= 300),
    icon text not null default 'achievement' check (char_length(icon) <= 30),
    rarity public.rarity not null default 'common',
    condition jsonb not null,
    xp_reward integer not null default 0 check (xp_reward between 0 and 10000),
    -- Hidden achievements show as ??? until earned
    secret boolean not null default false,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger achievement_definitions_updated_at before update on public.achievement_definitions
    for each row execute function public.set_updated_at();

create table public.student_achievements (
    student_id uuid not null references public.profiles (id) on delete cascade,
    achievement_id uuid not null references public.achievement_definitions (id) on delete cascade,
    earned_at timestamptz not null default now(),
    primary key (student_id, achievement_id)
);

-- ── Guilds ────────────────────────────────────────────────────────────────────────────────────────

create table public.guilds (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses (id) on delete cascade,
    name text not null check (char_length(name) between 2 and 40),
    motto text not null default '' check (char_length(motto) <= 120),
    emblem text not null default 'shield' check (char_length(emblem) <= 20),
    -- Students may ask to join (the teacher approves)
    open boolean not null default true,
    -- 'pending': founded by a student, waiting for the teacher
    status text not null default 'active' check (status in ('active', 'pending')),
    max_members smallint not null default 6 check (max_members between 2 and 30),
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index guilds_course_name_idx on public.guilds (course_id, lower(name));

create trigger guilds_updated_at before update on public.guilds
    for each row execute function public.set_updated_at();

create table public.guild_members (
    guild_id uuid not null references public.guilds (id) on delete cascade,
    course_id uuid not null references public.courses (id) on delete cascade,
    student_id uuid not null references public.profiles (id) on delete cascade,
    role text not null default 'member' check (role in ('leader', 'member')),
    -- 'pending': asked to join, waiting for the teacher
    status text not null default 'active' check (status in ('active', 'pending')),
    joined_at timestamptz not null default now(),
    primary key (guild_id, student_id),
    -- One guild (or one request) per student per course
    unique (course_id, student_id)
);

create index guild_members_student_idx on public.guild_members (student_id);

create table public.team_quest_completions (
    guild_id uuid not null references public.guilds (id) on delete cascade,
    activity_id uuid not null references public.activities (id) on delete cascade,
    members uuid[] not null default '{}',
    completed_at timestamptz not null default now(),
    primary key (guild_id, activity_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────────────────────────

alter table public.learning_days enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.student_achievements enable row level security;
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.team_quest_completions enable row level security;

create policy "read own or taught learning days" on public.learning_days for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read active achievements" on public.achievement_definitions for select to authenticated
    using (active and not secret or public.is_admin());
create policy "read own or taught achievements" on public.student_achievements for select to authenticated
    using (student_id = auth.uid() or public.teaches_student(student_id));
create policy "read course guilds" on public.guilds for select to authenticated
    using (public.is_course_teacher(course_id) or public.is_enrolled(course_id));
create policy "read course guild members" on public.guild_members for select to authenticated
    using (public.is_course_teacher(course_id) or public.is_enrolled(course_id));
create policy "read course team completions" on public.team_quest_completions for select to authenticated
    using (exists (select 1 from public.guilds g where g.id = guild_id
                   and (public.is_course_teacher(g.course_id) or public.is_enrolled(g.course_id))));

revoke insert, update, delete, truncate on
    public.learning_days, public.achievement_definitions, public.student_achievements, public.guilds,
    public.guild_members, public.team_quest_completions
from anon, authenticated;
revoke all on
    public.learning_days, public.achievement_definitions, public.student_achievements, public.guilds,
    public.guild_members, public.team_quest_completions
from anon;

-- ── record_learning_day ───────────────────────────────────────────────────────────────────────────
-- The day (in the school's time zone) is worked out by the server. True when the day is new.

create function public.record_learning_day(p_student_id uuid, p_day date) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
    v_inserted boolean;
begin
    insert into public.learning_days (student_id, day) values (p_student_id, p_day)
    on conflict (student_id, day) do nothing
    returning true into v_inserted;
    return coalesce(v_inserted, false);
end $$;

-- ── shield_streak ─────────────────────────────────────────────────────────────────────────────────
-- Spends one Second Chance charge to fill one missed day. The server has checked the day really is a
-- gap that keeps a streak alive; here: the skill is unlocked, a charge is left (same rolling window as
-- use_skill, under the same lock) and the day is still empty. Once per key.

create function public.shield_streak(p_student_id uuid, p_day date, p_idempotency_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_skill public.skill_definitions;
    v_used integer;
begin
    select * into v_skill from public.skill_definitions where code = 'second_chance';
    if not found or not v_skill.enabled then
        raise exception 'SKILL_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if not exists (select 1 from public.student_skills where student_id = p_student_id and skill_id = v_skill.id) then
        raise exception 'SKILL_LOCKED' using errcode = 'P0001';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_student_id::text || ':skill:' || v_skill.id::text, 0));

    if exists (select 1 from public.skill_usages where idempotency_key = p_idempotency_key) then
        return jsonb_build_object('shielded', false, 'duplicate', true);
    end if;
    if exists (select 1 from public.learning_days where student_id = p_student_id and day = p_day) then
        raise exception 'NOTHING_TO_SHIELD' using errcode = 'P0001';
    end if;

    select count(*) into v_used from public.skill_usages
    where student_id = p_student_id and skill_id = v_skill.id
      and created_at > now() - make_interval(hours => v_skill.recharge_hours);
    if v_used >= v_skill.charges then
        raise exception 'NO_CHARGES' using errcode = 'P0001';
    end if;

    insert into public.skill_usages (student_id, skill_id, idempotency_key, effect)
    values (p_student_id, v_skill.id, p_idempotency_key, jsonb_build_object('shieldDay', p_day));
    insert into public.learning_days (student_id, day, shielded) values (p_student_id, p_day, true);

    return jsonb_build_object('shielded', true, 'duplicate', false, 'day', p_day);
end $$;

-- ── grant_achievement ─────────────────────────────────────────────────────────────────────────────
-- The condition was checked by the server (utils/achievements.ts). Records it once, then pays XP via
-- apply_awards (key achievement:<id>:<student>), notifies and checks the rank.

create function public.grant_achievement(p_student_id uuid, p_achievement_id uuid, p_awards jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_achievement public.achievement_definitions;
    v_before jsonb;
    v_inserted boolean;
    v_awards jsonb;
begin
    select * into v_achievement from public.achievement_definitions where id = p_achievement_id;
    if not found or not v_achievement.active then
        raise exception 'ACHIEVEMENT_NOT_FOUND' using errcode = 'P0002';
    end if;

    perform public.lock_student_progress(p_student_id);
    v_before := public.progress_snapshot(p_student_id);

    insert into public.student_achievements (student_id, achievement_id) values (p_student_id, p_achievement_id)
    on conflict do nothing
    returning true into v_inserted;
    if v_inserted is null then
        return jsonb_build_object('granted', false, 'before', v_before, 'after', v_before, 'awards', '[]'::jsonb);
    end if;

    v_awards := public.apply_awards(p_student_id, p_awards, null, null, null, null);

    insert into public.notifications (user_id, kind, title, body, data)
    values (p_student_id, 'achievement', format('Achievement unlocked: %s', v_achievement.name),
            v_achievement.description, jsonb_build_object('achievementId', p_achievement_id));

    perform public.evaluate_rank(p_student_id);

    return jsonb_build_object('granted', true, 'before', v_before, 'after', public.progress_snapshot(p_student_id),
                              'awards', v_awards);
end $$;

-- ── complete_team_quest ───────────────────────────────────────────────────────────────────────────
-- The server has checked enough members finished the target activities (utils/teamQuests.ts).
-- Records the guild's completion once; every active member gets the quest marked complete and their
-- awards (each with its own key team:<activity>:<student>). Members are locked in id order.
--   p_members: [{ studentId, awards: [{ amount, source, idempotencyKey, reason }] }]

create function public.complete_team_quest(p_guild_id uuid, p_activity_id uuid, p_members jsonb)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
    v_guild public.guilds;
    v_activity public.activities;
    v_subject_id uuid;
    v_member jsonb;
    v_student uuid;
    v_ids uuid[];
    v_inserted boolean;
    v_results jsonb := '[]'::jsonb;
begin
    select * into v_guild from public.guilds where id = p_guild_id for update;
    if not found or v_guild.status <> 'active' then
        raise exception 'GUILD_NOT_FOUND' using errcode = 'P0002';
    end if;
    select * into v_activity from public.activities where id = p_activity_id;
    if not found or v_activity.kind <> 'team_quest' or v_activity.course_id <> v_guild.course_id then
        raise exception 'ACTIVITY_NOT_FOUND' using errcode = 'P0002';
    end if;
    select subject_id into v_subject_id from public.courses where id = v_guild.course_id;

    -- Only current active members are rewarded
    select coalesce(array_agg(m.sid order by m.sid), '{}') into v_ids
    from (select (e ->> 'studentId')::uuid as sid from jsonb_array_elements(coalesce(p_members, '[]'::jsonb)) e) m
    where exists (select 1 from public.guild_members gm
                  where gm.guild_id = p_guild_id and gm.student_id = m.sid and gm.status = 'active');

    insert into public.team_quest_completions (guild_id, activity_id, members) values (p_guild_id, p_activity_id, v_ids)
    on conflict do nothing
    returning true into v_inserted;
    if v_inserted is null then
        return jsonb_build_object('completed', false, 'results', '[]'::jsonb);
    end if;

    foreach v_student in array v_ids loop
        select e into v_member from jsonb_array_elements(p_members) e where (e ->> 'studentId')::uuid = v_student limit 1;
        perform public.lock_student_progress(v_student);

        insert into public.activity_completions (student_id, activity_id, course_id, kind, passed, attempts_count)
        values (v_student, p_activity_id, v_guild.course_id, 'team_quest', true, 0)
        on conflict (student_id, activity_id) do nothing;

        v_results := v_results || jsonb_build_object(
            'studentId', v_student,
            'awards', public.apply_awards(v_student, coalesce(v_member -> 'awards', '[]'::jsonb), p_activity_id,
                                          v_guild.course_id, v_subject_id, null));

        insert into public.notifications (user_id, kind, title, body, data)
        values (v_student, 'team_quest', format('Team quest complete: %s', v_activity.title),
                format('%s finished it together.', v_guild.name),
                jsonb_build_object('activityId', p_activity_id, 'guildId', p_guild_id));

        perform public.evaluate_rank(v_student);
    end loop;

    return jsonb_build_object('completed', true, 'results', v_results);
end $$;

-- ── Leaderboards ──────────────────────────────────────────────────────────────────────────────────
-- XP earned in a course during [from, to) by currently enrolled students. Manual adjustments don't count.

create function public.course_leaderboard(p_course_id uuid, p_from timestamptz, p_to timestamptz)
returns table (student_id uuid, xp bigint)
language sql stable security definer set search_path = '' as $$
    select l.student_id, sum(l.amount)::bigint as xp
    from public.xp_ledger l
    join public.course_enrollments e on e.course_id = l.course_id and e.student_id = l.student_id
    where l.course_id = p_course_id and l.created_at >= p_from and l.created_at < p_to
      and l.amount > 0 and l.source <> 'manual_adjustment'
    group by l.student_id
$$;

-- The student's best week in the course (weeks start on Monday in the school's time zone)
create function public.personal_best_week(p_student_id uuid, p_course_id uuid, p_timezone text)
returns table (week_start date, xp bigint)
language sql stable security definer set search_path = '' as $$
    select date_trunc('week', l.created_at at time zone p_timezone)::date as week_start, sum(l.amount)::bigint as xp
    from public.xp_ledger l
    where l.student_id = p_student_id and l.course_id = p_course_id and l.amount > 0
      and l.source <> 'manual_adjustment'
    group by 1
    order by 2 desc, 1 desc
    limit 1
$$;

-- ── Quest Builder save: also stores each question's boss phase ────────────────────────────────────

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

        insert into public.questions (id, activity_id, kind, prompt, points, position, phase)
        values (v_question_id, p_activity_id, (v_question ->> 'kind')::public.question_kind,
                v_question ->> 'prompt', coalesce((v_question ->> 'points')::smallint, 1), v_position,
                least(greatest(coalesce((v_question ->> 'phase')::smallint, 1), 1), 5))
        on conflict (id) do update
            set kind = excluded.kind, prompt = excluded.prompt, points = excluded.points,
                position = excluded.position, phase = excluded.phase;

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

-- ── Seed achievements (admins can edit or add more on the Achievements page) ──────────────────────

insert into public.achievement_definitions (code, name, description, icon, rarity, condition, xp_reward, secret, sort_order) values
    ('first_steps', 'First Steps', 'Complete your first lesson.', 'lesson', 'common',
     '{"type": "lessons_completed", "min": 1}', 10, false, 1),
    ('bookworm', 'Bookworm', 'Complete 10 lessons.', 'lesson', 'uncommon',
     '{"type": "lessons_completed", "min": 10}', 40, false, 2),
    ('proven', 'Proven', 'Pass your first graded quiz, exam or homework.', 'quiz', 'common',
     '{"type": "assessments_passed", "min": 1}', 15, false, 3),
    ('flawless', 'Flawless', 'Score 100% on a graded activity.', 'progression', 'rare',
     '{"type": "perfect_scores", "min": 1}', 50, false, 4),
    ('giant_slayer', 'Giant Slayer', 'Defeat a boss battle.', 'boss', 'epic',
     '{"type": "bosses_defeated", "min": 1}', 100, false, 5),
    ('kindling', 'Kindling', 'Learn three days in a row.', 'streak', 'common',
     '{"type": "streak", "days": 3}', 15, false, 6),
    ('unbroken', 'Unbroken', 'Learn fourteen days in a row.', 'streak', 'epic',
     '{"type": "streak", "days": 14}', 100, false, 7),
    ('stronger_together', 'Stronger Together', 'Complete a team quest with your guild.', 'team', 'rare',
     '{"type": "team_quests", "min": 1}', 50, false, 8),
    ('curious_mind', 'Curious Mind', 'Discover your first secret.', 'easter', 'uncommon',
     '{"type": "discoveries", "min": 1}', 25, false, 9),
    ('awakened', 'Awakened', 'Reach level 10.', 'progression', 'rare',
     '{"type": "level", "min": 10}', 50, false, 10),
    ('rising_hunter', 'Rising Hunter', 'Reach C-Rank.', 'progression', 'epic',
     '{"type": "rank", "min": 4}', 100, false, 11),
    ('lorekeeper', 'Lorekeeper', 'Discover five secrets.', 'secret', 'legendary',
     '{"type": "discoveries", "min": 5}', 150, true, 12);

-- ── Grants ────────────────────────────────────────────────────────────────────────────────────────

revoke execute on function
    public.record_learning_day(uuid, date),
    public.shield_streak(uuid, date, text),
    public.grant_achievement(uuid, uuid, jsonb),
    public.complete_team_quest(uuid, uuid, jsonb),
    public.course_leaderboard(uuid, timestamptz, timestamptz),
    public.personal_best_week(uuid, uuid, text),
    public.save_activity_content(uuid, jsonb, uuid[])
from public, anon, authenticated;

grant execute on function
    public.record_learning_day(uuid, date),
    public.shield_streak(uuid, date, text),
    public.grant_achievement(uuid, uuid, jsonb),
    public.complete_team_quest(uuid, uuid, jsonb),
    public.course_leaderboard(uuid, timestamptz, timestamptz),
    public.personal_best_week(uuid, uuid, text),
    public.save_activity_content(uuid, jsonb, uuid[])
to service_role;
