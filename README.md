# Tenant2Care v1.1 — Private Mobile Web Preview

A **mobile-responsive, login-protected landlord preview**, not a finished tenant/payment/biometric system. Built with Next.js 15 and Supabase Auth + PostgreSQL Row Level Security. Theme: pink/magenta.

## Deploy to view on iPhone (Vercel + Supabase)

1. Create a private Supabase project at https://supabase.com. Open SQL Editor and execute `supabase/schema.sql` on a **new/empty project**.
2. In Supabase **Authentication → Users**, create your landlord user manually (use a strong unique password). **Disable public sign-ups** in Authentication settings (wording may vary). Ensure email confirmation is completed if required. There is no signup button in this app.
3. Supabase **Project Settings → API**: copy the project URL and **anon/publishable key**. Never use the service-role/secret key in browser environment variables.
4. Locally copy `.env.example` to `.env.local`, enter the values, then run `npm install` and `npm run dev` (Node.js 20.9+). Open http://localhost:3000/login.
5. To deploy: push this folder to a **private GitHub repository**, import it at https://vercel.com/new, configure environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, deploy.
6. In Supabase Auth URL Configuration, set the Vercel domain as Site URL and allow its callback/redirect URLs as appropriate. Open `https://YOUR-PROJECT.vercel.app/login` in iPhone Safari and sign in.
7. In Safari, Share → **Add to Home Screen** for app-like access.

**Important:** Private means login + owner-only database policies, not an unguessable website URL. The login page is public; the management data requires authentication. The dashboard is client-side protected, so use RLS as the actual data security boundary. Review policies and security before real personal information is entered. For additional edge protection consider Vercel Deployment Protection (plan availability varies).

## Available now
- Password login (no public registration UI); Supabase owner-isolated records
- Responsive landlord dashboard, property/room records, booking/application records, tenancies, pending payment requests, maintenance, expenses and agreement metadata
- Database schema and developer documentation

## Not implemented / do not represent as live
- Tenant-facing accounts, public listings and bookings, face/liveness KYC, document uploads, online rent/deposit collection, verified payment reconciliation, PDF agreement/signing/stamping, auto-generated receipts, WhatsApp/email sending, tenant repair submission, backup/restore UI. Payments are requests only and cannot be marked paid from the client. This preview is **not** appropriate for live tenant ID images or sensitive information until security review.
- A production release needs role approvals, server-side authorization, privacy notices, secure private document storage, KYC/payment providers, validated webhook events, retention rules, audit logging and testing.

## Files
- `app/` routes and screens
- `components/` mobile navigation, auth guard and basic forms
- `supabase/schema.sql` database schema + RLS
- `docs/` architecture, data dictionary, workflow and developer notes
- `.env.example` deployment configuration

## Troubleshooting
- Login fails: verify user exists in Supabase Auth, email confirmed, and URL/anon key match project.
- Empty dashboard: expected until records created.
- Room form needs property UUID: create property first; copy ID from Supabase Table Editor. This will be replaced by a property dropdown in the next iteration.


## iOS & Android
See `docs/IOS_ANDROID_DEPLOY.md` for install and deployment steps.
