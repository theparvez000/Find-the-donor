# Project status

## Done in code
- M1: availability dashboard, login, filtered donor list `/donors` (migrations 001, 002).
- Scan for Donors `/scan` (003): real RPC search, consent + Available only, optional rounded location, radar tied to the real query, list + schematic distance map, contact requests. Owner-tested live.
- Inbox `/inbox` (004): donors answer requests; requesters see first name + answer only.
- Admin `/admin` (005): admins review requests by status (approve/reject, then fulfilled/cancelled), see private contact, counts, and a moderation log written by a database trigger. Access enforced by RLS (`is_admin()`), page check is only UI.
- Public `/requests`: approved requests only, no contact details.

## First admin (once, Supabase SQL Editor)
`update profiles set role='admin' where id=(select id from auth.users where email='YOU@example.com');`

## Known limits
- No push/email notifications. Contact-detail sharing after "I can help" not built.
- Requesters cannot yet track their own requests (anonymous form, no requester_id); no status history page for them.
- Reports UI, duplicate warnings, user management, Bengali, PWA, tests, full account deletion not built.
- "Map" is a schematic diagram; no hospital dataset.

## Not run
No local install/tsc/lint/tests (no network in sandbox). Render's build is the only compile check.
