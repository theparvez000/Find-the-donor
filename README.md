# Find the donor
## Supabase
1. Create a project at supabase.com. SQL Editor → paste `supabase/migrations/001_init.sql` → Run.
2. Settings → API: copy Project URL and anon/public key.
3. First admin: after signing up, run in SQL Editor: `update profiles set role='admin' where id='<your-user-id>';`
## Render (dashboard)
1. Render → New → Blueprint → pick this repo (uses render.yaml). Set the two env vars from `.env.example`.
2. Deploy, then add the Render URL to Supabase → Auth → URL Configuration.
## Local
`cp .env.example .env.local` then `npm install && npm run dev`
