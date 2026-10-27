-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- Sign up with a class code: a student who enters their teacher's join code while creating an account
-- is enrolled as soon as the account exists. The code is the same one they could type on the Courses
-- page, so nothing new is trusted: unknown or unpublished codes are simply ignored. The role is still
-- always 'student' — never read from user metadata.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
    v_name text;
    v_code text;
begin
    v_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                            split_part(new.email, '@', 1), 'Player'), 60);

    insert into public.profiles (id, email, display_name, role)
    values (new.id, coalesce(new.email, ''), v_name, 'student');

    insert into public.student_progress (student_id, rank_id)
    select new.id, r.id from public.ranks r order by r.sort_order limit 1;

    v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'join_code', '')));
    if v_code ~ '^[A-Z0-9]{6,10}$' then
        insert into public.course_enrollments (course_id, student_id)
        select c.id, new.id from public.courses c where c.join_code = v_code and c.status = 'published'
        on conflict do nothing;
    end if;

    return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
