-- Phase 2 hardening: run after the original schema. Review in a staging project first.
-- Existing profiles_self_update policy must not permit role escalation.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.role is distinct from old.role then
  raise exception 'Profile role cannot be changed by client updates';
 end if;
 return new;
end $$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before update on public.profiles
for each row execute function public.protect_profile_role();
-- Restrict owner table access to authenticated landlords, not arbitrary authenticated users.
-- Existing *_owner_only policies may be present from initial schema.
do $$ declare t text;begin
 foreach t in array array['properties','rooms','applications','tenancies','payments','maintenance_tickets','expenses','agreements','receipts'] loop
 execute format('drop policy if exists %I on public.%I',t||'_owner_only',t);
 execute format('create policy %I on public.%I for all to authenticated using(owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=''landlord'')) with check(owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role=''landlord''))',t||'_landlord_only',t);
 end loop;
end $$;
-- Note: existing owner-link triggers and payment-status protections remain in place.
