-- NOT YET APPLIED. Verify before running: select proname from pg_proc where proname = 'public_stats';
-- Aggregate counts only (no rows, no personal data) for the homepage. Idempotent via create or replace.
create or replace function public_stats()
returns table (listed_donors bigint, available_donors bigint, approved_requests bigint, fulfilled_requests bigint)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from profiles where public_listing),
    (select count(*) from profiles where public_listing and accepts_requests
       and availability_status = 'available' and availability_updated_at >= now() - interval '30 days'),
    (select count(*) from blood_requests where status in ('approved','fulfilled')),
    (select count(*) from blood_requests where status = 'fulfilled')
$$;
grant execute on function public_stats() to anon, authenticated;
