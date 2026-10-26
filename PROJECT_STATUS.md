# Project status

## Audit (start of Milestone 1)
Existing: home, donor search, request form (inserts `pending`), schema 001 with RLS, render.yaml, live on Render.
Missing: everything else in the spec.

## Milestone 1 — done in code, NOT build-verified
- Migration `002_availability_search.sql`: availability, reason, contact prefs, consents, ~1 km rounded optional location, `search_donors()` RPC (consented fields only, distance in whole km, stale after 30 days).
- `/login` (email+password), `/dashboard` (one-click availability, profile, consents, hide, delete profile data).
- `/donors`: blood group, district, radius (1/3/5/10/25 km), opt-in geolocation, nearest-first, status badges, pagination, empty/error states.

## Not built yet
Map view, upazila/hospital pickers, contact requests, donor responses, notifications, request dashboard/status history/moderation, reports UI, admin panel, audit log, donation history, Google login, Bengali, PWA, rate limiting, tests, full account deletion.

## Not run
No install/tsc/lint/build/tests were run (no network in the build sandbox). Render's build is the first real compile.
