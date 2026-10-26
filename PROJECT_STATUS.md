# Project status

## Live (main, deployed 2026-10-26, deploy dep-dbfceh3bc2fs739279u0, commit f9b8d88)
Verified by fetching the live site: homepage (new header/hero, live stats 1/1/0/0 matching the database), `/scan` form, `/request` form all render.
- Availability dashboard, login, filtered donor list `/donors` (001, 002).
- Scan for Donors `/scan` (003): real RPC search, consent + Available only, optional rounded location. The invented minimum delay and fake progress bar were removed: the radar runs exactly as long as the Supabase RPC. Retry, results radar with real donor dots, corrected contact message.
- Inbox `/inbox` (004), Admin `/admin` (005, RLS via `is_admin()`), public `/requests` (approved only, no contact).
- Design system: `components/Drop.tsx`, responsive `components/Header.tsx`, `.btn-outline`, `.card`, brand tokens. Homepage redesign with live counts from `public_stats()`.

## Database (Supabase project Find-the-donor, kzkhtvxylqvzosnklaet)
Migration history table is empty (001-005 were run by hand); state verified by inspecting tables/functions.
- 001-005 applied. 006_public_stats and 007_hardening applied 2026-10-26 via apply_migration.
- 007: request rate limit (3/contact/24 h) + duplicate block, requester_id bound to auth.uid(), `urgency`/`required_by` columns, reports need sign-in (one per request per reporter), availability timestamp not directly editable (use `confirm_availability()`), search_path fixes, trigger fn not RPC-callable.
- NOT yet exercised end-to-end: submitting a request through the live form, rate-limit/duplicate behaviour, reports, `confirm_availability()` (no test rows were written to production).

## Remaining advisor items
- `public_requests` security-definer view: intentional (approved only, no contact).
- Anon-callable `scan_donors`, `search_donors`, `public_stats`, `is_admin`, `can_contact`: intentional. Scraping needs edge rate limiting.
- Leaked-password protection OFF; the toggle is not visible on the current Supabase plan (likely Pro-only). Set minimum password length to 8+ in Auth > Email.

## First admin (once, Supabase SQL Editor)
`update profiles set role='admin' where id=(select id from auth.users where email='YOU@example.com');`

## Next milestones
- Request form: urgency, required-by, sign-in, show rate-limit/duplicate errors clearly; requester tracking timeline (status history); notification center; donation history; reports UI; verification workflow; real map.
- Hospital search (no hospital dataset).
- Tests (none exist).

## Not run
No local install/tsc/lint/tests (authoring sandbox has no network). Render's build compiled this commit successfully; no automated tests exist.
