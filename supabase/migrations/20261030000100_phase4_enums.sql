-- Phase 4 XP sources. Kept apart from 20261030000200 because a new enum value can't be used in the same
-- transaction that adds it.
alter type public.xp_source add value if not exists 'achievement';
alter type public.xp_source add value if not exists 'team_quest';
