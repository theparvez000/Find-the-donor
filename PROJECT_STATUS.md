# Project status

## Done in code
- M1: availability dashboard, login, filtered donor list `/donors` (migrations 001, 002).
- Scan for Donors `/scan` (migration 003): real `scan_donors()` RPC, exact blood-group match, consent + Available only, optional rounded location/radius, nearest first, radar animation tied to the real query (stops on result/cancel), list + schematic distance map, contact requests (1/donor/day, 10/day cap). Tested by the owner on the live site.
- Inbox `/inbox` (migration 004): donors answer received requests (I can help / Cannot help right now / Need more details); requesters see donor first name + answer. Donors cannot see who asked; no contact details are shared.

## Known limits
- No push/email notifications: donors must open /inbox to see requests.
- Sharing contact details after "I can help" is not built.
- "Map" is a schematic distance diagram, not a geographic map. No hospital dataset.
- Not built: request dashboard/status history, admin/moderation, reports UI, Bengali, PWA, tests, full account deletion.

## Not run
No local install/tsc/lint/tests (no network in sandbox). Render's build is the only compile check.
