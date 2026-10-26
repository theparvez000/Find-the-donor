-- 007_hardening.sql  --  NOT YET APPLIED. Review, then apply once, after 006.
-- Verified against live project before writing: tables profiles, blood_requests (0 rows), reports (0 rows),
-- donor_contact_requests, admin_audit_logs exist; functions from 001-005 exist; supabase_migrations history is empty
-- (earlier SQL was run by hand), so check each object below before running.

-- 1. Fixed search_path on helper/trigger functions (Supabase advisor 0011).
alter function is_admin() set search_path = public;
alter function protect_role() set search_path = public;
alter function limit_contact_requests() set search_path = public;
alter function set_responded_at() set search_path = public;

-- 2. Availability freshness cannot be faked by editing the timestamp. Timestamp changes only when the status
--    changes, or through confirm_availability() below. (Replaces the 002 function; same behaviour otherwise.)
create or replace function profiles_before_write() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.availability_status is distinct from old.availability_status then
    new.availability_updated_at := now();
  else
    new.availability_updated_at := old.availability_updated_at;
  end if;
  if new.availability_status <> 'unavailable' then new.unavailable_reason := null; end if;
  if not new.location_consent then new.approx_lat := null; new.approx_lng := null; end if;
  new.approx_lat := round(new.approx_lat, 2); new.approx_lng := round(new.approx_lng, 2);
  new.updated_at := now();
  return new;
end $$;

-- One-click "I am still available": refreshes freshness without changing status. Only for the caller's own profile.
create or replace function confirm_availability() returns void language sql security definer set search_path = public as $$
  update profiles set availability_updated_at = now() where id = auth.uid() and availability_status = 'available';
$$;
revoke execute on function confirm_availability() from public, anon;
grant execute on function confirm_availability() to authenticated;

-- NOTE: the trigger above overwrites availability_updated_at on every update, including confirm_availability().
-- To let the RPC through, it sets a transaction-local flag that the trigger honours:
create or replace function profiles_before_write() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.availability_status is distinct from old.availability_status
     or current_setting('app.confirm_availability', true) = 'on' then
    new.availability_updated_at := now();
  else
    new.availability_updated_at := old.availability_updated_at;
  end if;
  if new.availability_status <> 'unavailable' then new.unavailable_reason := null; end if;
  if not new.location_consent then new.approx_lat := null; new.approx_lng := null; end if;
  new.approx_lat := round(new.approx_lat, 2); new.approx_lng := round(new.approx_lng, 2);
  new.updated_at := now();
  return new;
end $$;
create or replace function confirm_availability() returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.confirm_availability', 'on', true);
  update profiles set updated_at = now() where id = auth.uid() and availability_status = 'available';
  perform set_config('app.confirm_availability', 'off', true);
end $$;
revoke execute on function confirm_availability() from public, anon;
grant execute on function confirm_availability() to authenticated;

-- 3. Trigger-only security-definer function must not be callable as an RPC (advisor 0028/0029).
revoke execute on function log_request_status() from public, anon, authenticated;
-- Requester view of own sent requests needs a signed-in user.
revoke execute on function my_sent_requests() from public, anon;
grant execute on function my_sent_requests() to authenticated;
-- Deliberately left executable by anon: scan_donors, search_donors (public search), is_admin and can_contact (used inside RLS policies).

-- 4. Blood requests: urgency + required-by, requester binding, spam and duplicate limits.
alter table blood_requests
  add column if not exists urgency text not null default 'normal' check (urgency in ('normal','urgent','emergency')),
  add column if not exists required_by timestamptz;

drop policy if exists "submit request" on blood_requests;
create policy "submit request" on blood_requests for insert
  with check (status = 'pending' and (requester_id is null or requester_id = auth.uid()));

-- security definer so the checks can see all rows despite RLS (anon cannot read blood_requests).
create or replace function limit_requests() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from blood_requests where lower(contact) = lower(new.contact) and created_at > now() - interval '24 hours') >= 3 then
    raise exception 'request limit reached for this contact';
  end if;
  if exists (select 1 from blood_requests where lower(contact) = lower(new.contact) and blood_group = new.blood_group
             and lower(hospital) = lower(new.hospital) and status in ('pending','approved') and created_at > now() - interval '24 hours') then
    raise exception 'duplicate request';
  end if;
  return new;
end $$;
revoke execute on function limit_requests() from public, anon, authenticated;
drop trigger if exists trg_limit_requests on blood_requests;
create trigger trg_limit_requests before insert on blood_requests for each row execute function limit_requests();

-- 5. Reports: signed-in reporters only, one report per request per reporter.
alter table reports add column if not exists reporter_id uuid references auth.users on delete set null default auth.uid();
alter table reports alter column request_id set not null;  -- table had 0 rows when audited
create unique index if not exists reports_one_per_reporter on reports (request_id, reporter_id);
drop policy if exists "submit report" on reports;
create policy "submit report" on reports for insert to authenticated with check (reporter_id = auth.uid());
