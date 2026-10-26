# Project status

## Done in code (main)
- M1: availability dashboard, login, filtered donor list `/donors` (migrations 001, 002).
- Scan for Donors `/scan` (003): real RPC search, consent + Available only, optional rounded location, radar tied to the real query, list + schematic distance map, contact requests.
- Inbox `/inbox` (004): donors answer requests; requesters see first name + answer only.
- Admin `/admin` (005): approve/reject, then fulfilled/cancelled, private contact, counts, moderation log via DB trigger. Access enforced by RLS (`is_admin()`).
- Public `/requests`: approved requests only, no contact details.

## Branch `redesign/m1-scan-home` (not merged, not deployed, not compiled)
- `/scan`: removed the invented 1.5-2.2 s minimum delay and the fake progress bar. The radar now runs exactly as long as the Supabase RPC; results appear when it returns. Added Retry, results radar with real donor dots, corrected the contact message (inbox exists).
- Design system: `components/Drop.tsx`, responsive `components/Header.tsx` (mobile menu), `.btn-outline`, `.card`, brand-100/500 tokens, Tailwind scans `components/`.
- Homepage redesign. Live counts come from `public_stats()`; if the function is missing or the DB is unreachable the stat cards are simply not shown (no placeholders).
- Migration `006_public_stats.sql` is written but NOT applied. Check `pg_proc` for `public_stats` first, then apply once approved.

## First admin (once, Supabase SQL Editor)
`update profiles set role='admin' where id=(select id from auth.users where email='YOU@example.com');`

## Audit findings, not yet fixed (need migration 007, approval required)
1. `blood_requests` insert policy only checks `status='pending'`: anonymous, unlimited, `requester_id` can be set to any user id. No rate limit, no duplicate detection.
2. `reports` insert is `with check (true)`: anyone can spam reports; `request_id` is nullable. No report UI exists.
3. `scan_donors` / `search_donors` are callable by anon with no throttling: first names + district can be scraped.
4. Users can set `availability_updated_at` directly (trigger only stamps it on status change), so freshness can be faked.
5. Request form has no urgency, required-by date, or requester account, so requesters cannot track requests.

## Known limits / not built
- No push/email notifications; contact-detail sharing after "I can help" not built.
- Request tracking timeline, notification center, donation history table, achievements, verification workflow, user management, Bengali, PWA, tests, account deletion.
- Hospital search (no hospital dataset; scan_donors has no hospital filter).
- "Map" is a schematic diagram, not a real map.

## Not run
No local install/tsc/lint/tests (sandbox has no network). Render's build is the only compile check. Nothing from this branch has been deployed or verified live.
