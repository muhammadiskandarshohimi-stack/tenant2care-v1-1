# Shared rooms rollout

This update gives each room capacity 1 or 2. All existing rooms default to 1;
no property, tenant identity, rent, deposit, agreement or payment is changed.
Rent and deposit on the room are defaults **per tenant**, not combined totals.

## Required order

1. Inspect production schema, indexes, existing triggers and RPC definitions;
   this repository does not include the complete original schema. Take a backup.
2. Apply `supabase/shared_room_capacity.sql` to the Tenant2Care Supabase project.
   This replaces the Phase 3 room/application RPCs, Phase 4 creation RPC and
   Phase 5 activation RPC, removes the two known single-room unique indexes,
   and adds capacity guards for direct allocation writes. Unknown unique
   constraints/triggers must be checked; do not blindly drop them.
3. Deploy the matching app code.
4. In Rooms, edit only Room 1 (MASTER) and Room 2 of SCIENTEX KLEBANG SEROJA:
   set Tenant capacity to **2 tenants (sharing)**. Keep Room 3 and other
   properties at 1. Verify the actual property/room IDs before applying any SQL
   data change. Do not change existing tenant assignments to make them fit.
5. Verify second approved applicant appears, third reservation fails, both
   tenants can activate independently and see only their own records.

Approved applications without a tenancy reserve one place. Draft and active
 tenancies consume one place each. An application converted to tenancy is not
 counted twice. Ended/cancelled tenancies release their place; their historical
 approved application does not reserve it again. Room status is occupied if
 any active tenancy remains, reserved if only reservations/drafts remain, and
 available when none remain. An occupied shared room may still have a vacancy.
 Inactive rooms are not listed for tenant applications.

## Checks

- `npx tsc --noEmit`
- `node tenancy-tests.cjs`
- `npm install --no-save --package-lock=false @electric-sql/pglite`
- `node shared-room-db-tests.cjs` (disposable PostgreSQL-compatible database)

SQL tests cover applying twice, 2-place approval limit, separate tenancy
creation and activation, duplicate application guard, capacity reduction,
ending one tenancy, inactive rooms and unauthorized creation. Production RLS,
existing-schema compatibility and concurrent multi-session writes still need
verification against a staging copy before production rollout.
