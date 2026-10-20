# Tenant2Care v1.1 — Authentication patch

Merge these files into the root of your existing Next.js 15 GitHub repository, retaining its existing `package.json`, `app/layout.tsx`, `app/globals.css`, and PWA files. Replace the temporary `app/dashboard/page.tsx` with the supplied version.

## Vercel variables

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as **project-linked** variables for Production (and Preview if needed), then redeploy.

## Database prerequisites

Your Supabase Auth account must exist, have a confirmed email/password, and have a `public.profiles` row with matching `id` and `role = 'landlord'`. RLS must allow the signed-in user to select their own profile. Review all other RLS policies before storing real tenant data.

## Verification

1. Open `/dashboard` in a private browser window: it should redirect to `/login`.
2. Log in with the Supabase Auth email and password: it should display the private landlord dashboard.
3. Click Sign out: it should return to `/login`.
4. Refresh `/dashboard`: it should redirect to login again.
5. Test an authenticated user with `role = 'tenant'`: it must not access `/dashboard`.

This patch is an initial auth scaffold, not a finished rental management system. It does not implement payment processing, ID/face verification, receipt delivery, or document handling.
