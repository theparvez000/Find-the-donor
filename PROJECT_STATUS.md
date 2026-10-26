# Project status

## Done in code (not browser-tested by me)
- M1: availability dashboard, login, filtered donor list `/donors` (migrations 001, 002).
- Scan for Donors `/scan` (migration 003): real `scan_donors()` RPC; matches exact blood group, listed, accepts requests, set Available, district/upazila, optional rounded location + radius; nearest first. Radar animation runs only while the query runs and stops on result/cancel (AbortController). Results: list + schematic distance map, freshness, contact request.
- `donor_contact_requests` table with RLS, one request per donor per day, 10/day cap.

## Known limits
- Contact requests are stored, but donors have no inbox yet, so nobody is notified.
- "Map" is a schematic distance diagram, not a geographic map. No hospital dataset, so no hospital picker.
- Matching never infers compatibility.
- Not built: request dashboard/status history, admin/moderation, notifications, donor responses, Bengali, PWA, tests, full account deletion.

## Not run
No local install/tsc/lint/tests (no network in sandbox). Render's build is the only compile check so far.
