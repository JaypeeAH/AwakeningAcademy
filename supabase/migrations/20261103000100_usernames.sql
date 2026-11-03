-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- Usernames: a second way to sign in. Email stays the main one; a username is optional and only an
-- administrator sets it (Admin → Users: "Add accounts", or "Sign-in details" on an existing account), so
-- it is written by the server with the service role — RLS already denies every browser-role write.
--
-- Accounts made with a username only get a placeholder address (<username>@no-email.invalid) because
-- Supabase Auth signs in by email: the app looks the username up on the server and signs in with it.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column username text;

-- Stored lower-case, so signing in is case-insensitive; 3–32 letters, digits, dots, dashes or underscores
alter table public.profiles add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9][a-z0-9._-]{2,31}$');
create unique index profiles_username_key on public.profiles (username);
