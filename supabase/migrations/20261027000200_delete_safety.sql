-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- Deleting things without losing history
--
-- 1. The XP ledger is immutable, but its links to activities/courses/attempts are `on delete set null`.
--    The immutability trigger used to block that automatic SET NULL, so deleting a course or activity
--    that had awarded XP failed. Now only the history itself (who, how much, why, when, the key and the
--    running balance) is frozen; references may be cleared when what they point at is deleted.
-- 2. Courses and activities remember their creator, but that must not stop an administrator from
--    deleting a teacher's account (e.g. a privacy request). The creator becomes null instead.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.prevent_ledger_update() returns trigger
language plpgsql set search_path = '' as $$
begin
    if new.id is distinct from old.id
       or new.student_id is distinct from old.student_id
       or new.amount is distinct from old.amount
       or new.source is distinct from old.source
       or new.reason is distinct from old.reason
       or new.idempotency_key is distinct from old.idempotency_key
       or new.balance_after is distinct from old.balance_after
       or new.created_at is distinct from old.created_at
       -- references may only be cleared (by ON DELETE SET NULL), never re-pointed
       or (new.activity_id is not null and new.activity_id is distinct from old.activity_id)
       or (new.course_id is not null and new.course_id is distinct from old.course_id)
       or (new.subject_id is not null and new.subject_id is distinct from old.subject_id)
       or (new.attempt_id is not null and new.attempt_id is distinct from old.attempt_id)
       or (new.awarded_by is not null and new.awarded_by is distinct from old.awarded_by) then
        raise exception 'XP ledger entries are immutable; record a manual adjustment instead'
            using errcode = '42501';
    end if;
    return new;
end $$;

alter table public.courses alter column created_by drop not null;
alter table public.courses drop constraint courses_created_by_fkey;
alter table public.courses add constraint courses_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.activities alter column created_by drop not null;
alter table public.activities drop constraint activities_created_by_fkey;
alter table public.activities add constraint activities_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;
