# Scout Travel

Scout is an operations platform for travel advisors. The current application
manages clients, trips, booking tasks, payment schedules, commissions, and trip
timeline events.

## Local setup

1. Install dependencies with `npm install`.
2. Copy the required Supabase values into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SCOUT_AUTH_ENABLED=false` until the tenancy rollout is complete
3. Start the application with `npm run dev`.

Do not commit `.env.local` or any service-role key. Service-role credentials must
never use the `NEXT_PUBLIC_` prefix.

## Subscription billing

Scout's Stripe integration uses one recurring subscription line item for members
with the `advisor` role. Clients are never billable seats. Billing stays
disabled until all of these server-side values are configured:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ADVISOR_PRICE_ID`
- `SUPABASE_SERVICE_ROLE_KEY` (required only by the signed Stripe webhook)
- `NEXT_PUBLIC_APP_URL` (the canonical HTTPS application URL)

Never place Stripe secret or webhook keys in a `NEXT_PUBLIC_` variable. Configure
the Stripe webhook endpoint as `/api/billing/webhook` and subscribe it to Checkout
Session completion and customer subscription create, update, and delete events.
The current starter pricing is $49 per advisor seat, mapped to the Stripe Price
ID you provide in the environment.

## Client communications

Apply `supabase/migrations/20260730000400_communications.sql` before opening the
Communications page. It adds client mobile numbers and consent status, advisor
message drafts, scheduled delivery state, and SMS delivery auditing.

Email uses the existing Resend settings:

- `RESEND_API_KEY`
- `SCOUT_EMAIL_FROM`

Text delivery remains disabled until all Twilio values are configured:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

Scheduled messages are processed by `POST /api/automations/process`. Protect the
route with `CRON_SECRET`, configure the same value in the scheduler's
`Authorization: Bearer ...` header, and keep `SUPABASE_SERVICE_ROLE_KEY`
server-only. The endpoint processes up to 25 due messages per call and uses an
atomic status claim to prevent duplicate sends.

Scout blocks text messages unless explicit client SMS consent is recorded. The
consent control must remain optional, and US application-to-person messaging
must be registered with the chosen provider before production use.

AI drafting uses the server-only `OPENAI_API_KEY` and defaults to the current
Scout-approved model in `OPENAI_MODEL` when that optional override is set.
Never expose either server credential through a `NEXT_PUBLIC_` variable. Scout
queries only ordinary trip, payment-schedule, and itinerary context for drafts;
it never queries payment credentials, card aliases, or security codes. Drafts
remain editable and require advisor review before they can be saved or sent.
The OpenAI Platform project must also have active API billing or credits; a
ChatGPT subscription does not supply API quota.

## Checks

- `npm run typecheck` — TypeScript
- `npm run lint` — Next.js and ESLint rules
- `npm test` — unit tests
- `npm run check` — all three checks
- `npm run build` — production build

## Architecture

- `app/` contains Next.js App Router pages, components, and Server Actions.
- `lib/supabase/server.ts` creates the cookie-aware server client.
- `lib/supabase/client.ts` creates the browser client.
- `lib/supabase/database.types.ts` describes the checked-in database contract.
- `lib/validation.ts` is the shared untrusted-input validation boundary.
- `supabase/migrations/` is the versioned database source of truth for new
  environments.

The checked-in baseline migration was reconstructed from the existing app. Diff
it against the current hosted Supabase schema before applying it there.

## Security status

Authentication, organization membership, tenant RLS, and role-based permissions
are implemented as a staged rollout. Follow
`supabase/TENANCY_ROLLOUT.md` before setting `SCOUT_AUTH_ENABLED=true`. Until the
migration is deployed and cross-tenant policies are tested, this application
must not be treated as production-ready or used for unrelated organizations.
