-- ═══════════════════════════════════════════════════════════════════════════════════════════════════
-- Lesson images uploaded by teachers.
--   • A private 'lesson-media' bucket: images only (no SVG — it can carry scripts), 5 MB each.
--   • course_media rows record each checked upload. Lessons reference /api/media/<id>, which checks the
--     viewer teaches or is enrolled in the course, then redirects to a short-lived signed URL.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-media', 'lesson-media', false, 5242880, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

create table public.course_media (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses (id) on delete cascade,
    storage_path text not null unique,
    file_name text not null check (char_length(file_name) between 1 and 120),
    content_type text not null,
    size_bytes integer not null check (size_bytes > 0),
    uploaded_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
);

create index course_media_course_idx on public.course_media (course_id, created_at desc);

alter table public.course_media enable row level security;

create policy "teachers read their course media" on public.course_media for select to authenticated
    using (public.is_course_teacher(course_id));

revoke insert, update, delete, truncate on public.course_media from anon, authenticated;
revoke all on public.course_media from anon;
