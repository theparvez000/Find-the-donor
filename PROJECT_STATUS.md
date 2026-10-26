# Project status

## Done in code (main)
- M1: availability dashboard, login, filtered donor list `/donors` (migrations 001, 002).
- Scan for Donors `/scan` (003): real RPC search, consent + Available only, optional rounded location, radar tied to the real query, list + schematic distance map, contact requests.
- Inbox `/inbox` (004): donors answer requests; requesters see first name + answer only.
- Admin `/admin` (005): approve/reject, then fulfilled/cancelled, private contact, counts, moderation log via DB trigger. Access enforced by RLS (`is_admin()`).
- Public `/requests`: approved requests only, no contact details.

## Branch `redesign/m1-scan-home` (not merged, not built, not deployed)
- `/scan`: removed the invented 1.5-2.2 s minimum delay and fake progress bar. Radar runs exactly as long as the Supabase RPC. Added Retry, results radar with real donor dots, corrected contact message.
- Design system: `components/Drop.tsx`, responsive `components/Header.tsx`, `.btn-outline`, `.card`, brand tokens.
- Homepage redesign; live counts from `public_stats()`, hidden if unavailable.

## Database (Supabase project Find-the-donor, kzkhtvxylqvzosnklaet)
The project's migration history was empty (001-005 were run by hand); verified against live schema/functions.
- 001-005: applied (verified by table/function inspection).
- 006_public_stats: APPLIED 2026-10-26 via apply_migration. Verified: `select * from public_stats()` returns real counts (1 listed, 1 available, 0 requests).
- 007_hardening: APPLIED 2026-10-26. Advisor re-run confirms search_path warnings cleared, `log_request_status` no longer RPC-callable, `my_sent_requests`/`confirm_availability` not callable by anon.
  - Request rate limit (3/contact/24 h) + duplicate block, requester_id bound to auth.uid(), `urgency`/`required_by` columns, reports need sign-in (one per request per reporter), availability timestamp can't be edited directly (use `confirm_availability()`).
  - NOT yet exercised end-to-end through the app (no test inserts were made on production).
  - The live app (main) still works with these: the old request form omits the new columns, which have defaults.

## Remaining advisor items
- `public_requests` security-definer view: intentional (approved requests only, no contact).
- Public/anon-callable functions `scan_donors`, `search_donors`, `public_stats`, `is_admin`, `can_contact`: intentional. Scraping needs edge rate limiting.
- Leaked-password protection is OFF: enable in Supabase Dashboard > Auth > Passwords (not a migration).

## First admin (once, Supabase SQL Editor)
`update profiles set role='admin' where id=(select id from auth.users where email='YOU@example.com');`

## Next milestones
- Request form: urgency, required-by, sign-in; requester tracking timeline (status history table); notification center; donation history; reports UI; verification workflow; real map.
- Hospital search (no hospital dataset).

## Not run
No local install/tsc/lint/tests (sandbox has no network). Render's build is the only compile check. Nothing from this branch has been deployed or verified live.
