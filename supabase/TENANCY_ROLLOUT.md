# Tenancy rollout

Do not enable `SCOUT_AUTH_ENABLED` until every step below succeeds.

1. Export or back up the hosted database.
2. Compare the hosted schema with `20260723000100_baseline.sql`.
3. Resolve any differences in a new compatibility migration; do not edit an
   already-applied migration.
4. Apply `20260723000200_tenancy_and_rls.sql` in a staging project first.
5. Create the initial advisor user in Supabase Auth and sign in at `/login`.
6. Complete `/onboarding` to create the first organization and owner membership.
7. Assign every existing client to that organization, then backfill descendants:

```sql
update public.trips t
set organization_id = c.organization_id
from public.clients c
where t.client_id = c.id and t.organization_id is null;

update public.booking_tasks x set organization_id = t.organization_id
from public.trips t where x.trip_id = t.id and x.organization_id is null;
update public.booking_payments x set organization_id = t.organization_id
from public.trips t where x.trip_id = t.id and x.organization_id is null;
update public.booking_commissions x set organization_id = t.organization_id
from public.trips t where x.trip_id = t.id and x.organization_id is null;
update public.booking_timeline_events x set organization_id = t.organization_id
from public.trips t where x.trip_id = t.id and x.organization_id is null;
```

8. Verify that no tenant-owned row has a null `organization_id`.
9. Add `NOT NULL` constraints in a new migration.
10. Test with two organizations: each user must receive zero rows when querying
    the other organization's IDs, including update and delete attempts.
11. Set `SCOUT_AUTH_ENABLED=true` only after those tests pass.

On 2026-07-23, the repository was linked through the Supabase CLI and the full
public catalog was inspected through read-only Management API queries. The live
database contains one client, three trips, four payments, one commission, no
tasks, no timeline events, and no Auth users. Aggregate checks found no orphans,
negative payments, invalid timeline statuses, or reversed trip dates.

The inspection also found unrestricted prototype RLS policies for anon/public,
random UUID defaults on three child foreign keys, a missing timeline foreign
key, and an incorrect default timeline status. The compatibility migration fixes
those schema issues; the tenancy migration removes every prototype policy before
installing organization policies.
