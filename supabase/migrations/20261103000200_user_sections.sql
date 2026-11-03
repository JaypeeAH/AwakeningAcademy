-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- Sections: an optional class/group label on an account (e.g. "11-STEM A"), so administrators and
-- teachers can tell which section a student belongs to. Set only by administrators (Admin → Users), so
-- it is written by the server with the service role — RLS already denies every browser-role write.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column section text;

alter table public.profiles add constraint profiles_section_length
    check (section is null or (char_length(section) between 1 and 40 and section = btrim(section)));
create index profiles_section_idx on public.profiles (section) where section is not null;
