# Project status

## Live (main; latest feature deploy dep-dbfmhkijnfac73f01ig0, commit 163526e, 2026-10-26)
Render build compiled. Fetched live: `/request` (new form: urgency, required-by, sign-in note, My Requests link) and `/track` (renders; signed-out shows the loading/sign-in state). `/notifications` was built by the same deploy but could not be fetched directly by the checking tool.

### Features
- Availability dashboard, login, filtered donor list `/donors` (001, 002).
- Scan for Donors `/scan` (003): real RPC search, consent + Available only, optional rounded location; radar runs exactly as long as the real query (no invented delay); retry, results radar with real donor dots, schematic distance map, contact requests.
- Inbox `/inbox` (004), Admin `/admin` (005, RLS via `is_admin()`), public `/requests` (approved only, no contact).
- Design system + responsive header (alerts link and unread count when signed in); homepage with live counts from `public_stats()`.
- Request form `/request`: urgency, required-by, consent, emergency notice (999), signed-in requests are bound to the account, clear duplicate / rate-limit messages.
- `/track` My Requests: real status timeline from `request_events`, cancel (pending/approved).
- `/notifications`: all/unread, mark read / all read. Notifications are created only by database triggers (contact request received, donor answered, request status changed), deduplicated per event.

## Database (Supabase project Find-the-donor, kzkhtvxylqvzosnklaet)
Migration history table is empty (001-005 were run by hand); state verified by inspecting tables/functions. 006, 007, 008 applied via apply_migration on 2026-10-26.
- 007: request rate limit (3/contact/24 h) + duplicate block, requester_id bound to auth.uid(), `urgency`/`required_by`, reports need sign-in (one per request per reporter), availability timestamp not directly editable (`confirm_availability()` exists but no UI calls it yet), search_path fixes.
- 008: `request_events`, `notifications`, field-length CHECK on blood_requests, triggers. Verified with a rolled-back test transaction (3 events + 2 notifications for submitted->approved->fulfilled; duplicate and 4th-request limits fire; 81-char name rejected). No rows left behind.
- NOT yet exercised through the live UI: submitting a request, tracking, notifications badge, reports.

## Known gaps / risks
- A requester can cancel their own request even after it is fulfilled (RLS only checks the new status). Low impact; fix with a policy/trigger.
- Anonymous requests cannot be tracked (by design: no account).
- Anon-callable `scan_donors`, `search_donors`, `public_stats`: scraping needs edge rate limiting. `public_requests` security-definer view is intentional.
- Leaked-password protection is not available in the current Supabase plan UI; set minimum password length 8+.
- Compile checks: Render build only (sandbox is offline; local tsc can only check syntax). No automated tests exist.

## First admin (once, Supabase SQL Editor)
`update profiles set role='admin' where id=(select id from auth.users where email='YOU@example.com');`

## Next milestones
- Donor dashboard polish: "still available" one-click (`confirm_availability`), donation history table + page, achievements from real data only.
- Reports UI on public requests; admin: verification workflow, user list, request filters/stats.
- Hospital search (needs a hospital dataset), real map, Bengali, PWA, tests, account deletion.
