# Tenant2Care v1.1 — Phase 2 deployment overlay

This archive is an **overlay**, not a full replacement for your existing GitHub repository. It contains complete Phase 2 modules and preserves your working `app/login/page.tsx`, `middleware.ts`, `utils/supabase/server.ts`, `app/layout.tsx`, `package.json`, and PWA files.

## Install into your existing GitHub repository
1. Download and extract this ZIP. Copy its **contents** into the repository root, preserving paths (do not upload the enclosing `tenant2care-phase2-overlay` folder).
2. Add `import './phase2.css';` to your existing `app/layout.tsx` alongside the existing `globals.css` import. **Do not replace the layout**.
3. Ensure `utils/supabase/server.ts` exports `createClient()` as in your working login deployment, and `app/auth/signout/route.ts` supports POST (the navigation sign-out form uses POST).
4. The existing Supabase database must already contain `profiles`, `properties`, `rooms`, `applications`, and `tenancies` from your original schema.
5. In Supabase SQL Editor, inspect and run `supabase/phase2_security.sql` after confirming that the existing landlord account's `profiles.role` is `landlord`. This strengthens RLS and prevents client role changes. **Never run this SQL before verifying the schema and backing up important data.**
6. Commit to `main`. Vercel builds with `npm run build` and should deploy automatically. Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set for Production.
7. Verify `/login`, `/dashboard`, `/properties`, `/rooms`, `/tenants` and logout on desktop and mobile. Verify an incognito visitor cannot access the landlord pages.

## Features
- Dashboard counts from live Supabase queries.
- Create, list, update and delete properties.
- Create, list, update and delete rooms; choose a property and room status.
- Register and manage **landlord-entered tenant applications**, including term preference. This is not a tenant self-service onboarding portal or identity verification.
- Responsive sidebar and mobile bottom navigation.
- Server-side role guard on every Phase 2 page; database RLS is still the primary data security boundary.

## Deliberate exclusions
- No real facial verification, tenant self-registration, payment collection, automatic receipts, tenancy agreements, repair upload, or WhatsApp delivery in this phase.
- No direct `profiles` creation or editing by the landlord. Supabase Auth creates identities; applications store applicants before an account is created.
- Existing `applications` table has `status` and `verification_status`, but Phase 2 does not assert or perform verification.

## Troubleshooting
- `Module not found: utils/supabase/server`: ensure your existing utility file is still present.
- `404`: check `app/<route>/page.tsx` locations and Vercel's deployed commit.
- `permission denied`: confirm `profiles.role='landlord'`, SQL policies and owner_id.
- Missing styles: confirm `app/layout.tsx` imports `./phase2.css`.
- Logout fails: ensure your existing signout route supports POST; do not replace it without inspecting its cookie handling.

## Architecture
Next.js App Router UI → Supabase SSR browser client for CRUD; server-side `requireLandlord` guard using Supabase Auth and `profiles`; PostgreSQL RLS controls row access. No service-role secret is exposed to browsers.
