-- Allow admins to remove team members from the DB (delete their profile row).
-- Without this policy RLS blocks DELETE on profiles and "eliminar miembro" fails.
-- An admin cannot delete their own profile (avoids self lock-out).

drop policy if exists "admin_delete_profiles" on public.profiles;
create policy "admin_delete_profiles"
  on public.profiles for delete to authenticated
  using (private.is_admin() and user_id <> auth.uid());
