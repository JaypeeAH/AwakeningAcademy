-- Phase 3 enum values. Kept in their own migration: Postgres can't use a newly added enum value in the
-- same transaction that adds it, and the next migration seeds an XP rule for it.

alter type public.xp_source add value if not exists 'skill_bonus';
