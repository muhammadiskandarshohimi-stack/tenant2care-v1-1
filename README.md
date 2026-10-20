# Tenant2Care v1.1 — Phase 3 integration overlay

## What this package does
- Email/password tenant account page (`/tenant/login`), using existing Supabase Auth. Email confirmation required.
- Authenticated tenant application form (`/tenant/apply`) showing available rooms.
- Landlord review (`/landlord/applications`): approve (reserves room) or reject.
- SQL migration with ownership checks and row locking to prevent concurrent approval of one room.
- Preserves existing dashboard and management components; adds separate routes.

## Important: review before deployment
**This is an integration overlay, not a verified full repository build.** It assumes `applications` has `id`, `owner_id`, `property_id`, `room_id`, `full_name`, `email`, `phone`, `requested_term_months`, `status`, `created_at`; `rooms` has `id`, `owner_id`, `property_id`, `name`, `monthly_rent`, `status`; `properties` has `id`, `owner_id`, `name`. It assumes `profiles.role='landlord'` for owner users. Check all columns and status constraints against your actual schema. Existing policies may permit other operations; audit them before public release.

1. Back up Supabase schema and data first. Run the migration in SQL Editor **after checking assumptions**.
2. Copy `components/` and `app/` contents into corresponding GitHub folders, keeping your existing files.
3. Append `docs/phase3.css` to `app/globals.css`.
4. Review `middleware.ts`: allow `/tenant/login` and `/tenant/apply` through routing middleware (tenant RPCs enforce auth). Keep landlord routes protected. Avoid redirect loops.
5. In Supabase Authentication URL configuration, add the deployed `/tenant/login` redirect URL. Keep Confirm Email enabled and signup enabled for tenants; if signup is currently disabled, users cannot create accounts.
6. Commit and deploy. Run `npm run build` and test tenant sign-up, confirmation, submission, landlord approval, duplicate applications, rejected applications and competing approvals.
7. Add links to `/landlord/applications` in your landlord navigation and `/tenant/login` on your public landing page.

## Security and limits
- No document uploads, identity/face verification, payment processing, receipts, contracts, or tenancy creation in this overlay.
- Tenant contact data is personal data: publish a privacy notice and define retention/deletion procedures before inviting real tenants.
- RPCs use SECURITY DEFINER with fixed search_path, explicit authentication checks and limited grants. Review any existing broad RLS policies and grants: adding restrictive tenant SELECT policy does not override other permissive policies.
- `phase3_available_rooms` exposes only public room listing fields to authenticated users. No address or owner email is exposed.
- Landlord approval sets room status `reserved`; the landlord must create a tenancy in a separate validated workflow later.
- Test existing database triggers (`enforce_owner_links`) against the migration. Do not disable RLS.
