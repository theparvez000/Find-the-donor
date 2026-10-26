-- Scan for Donors: strict matching + consent-based contact requests
create function scan_donors(p_group text, p_district text, p_upazila text, p_lat double precision, p_lng double precision,
  p_radius_km int, p_limit int)
returns table (id uuid, display_name text, blood_group text, district text, upazila text, status text,
  availability_updated_at timestamptz, last_donation date, distance_km int)
language sql stable security definer set search_path = public as $$
  with base as (
    select p.*,
      case when p_lat is not null and p_lng is not null and p.location_consent and p.approx_lat is not null
        then ceil(6371 * acos(least(1, greatest(-1,
          cos(radians(p_lat)) * cos(radians(p.approx_lat)) * cos(radians(p.approx_lng) - radians(p_lng))
          + sin(radians(p_lat)) * sin(radians(p.approx_lat))))))::int end as d
    from profiles p
    where p.public_listing and p.accepts_requests and p.availability_status = 'available'
      and (p_group is null or p.blood_group::text = p_group)
      and (p_district is null or p.district = p_district)
      and (coalesce(p_upazila,'') = '' or position(lower(p_upazila) in lower(coalesce(p.upazila,''))) > 0))
  select id, split_part(display_name,' ',1), blood_group::text, district, upazila,
    case when availability_updated_at < now() - interval '30 days' then 'stale' else 'available' end,
    availability_updated_at, case when show_last_donation then last_donation end, d
  from base
  where coalesce(p_radius_km,0) = 0 or (d is not null and d <= p_radius_km)
  order by d nulls last, availability_updated_at desc nulls last
  limit least(coalesce(p_limit,30), 50)
$$;
grant execute on function scan_donors to anon, authenticated;

create table donor_contact_requests (
  id uuid primary key default gen_random_uuid(),
  donor_id uuid not null references profiles on delete cascade,
  requester_id uuid not null references auth.users on delete cascade,
  blood_group blood_group not null,
  status text not null default 'sent' check (status in ('sent','cancelled')),
  day date not null default current_date,
  created_at timestamptz not null default now(),
  unique (donor_id, requester_id, day),
  check (donor_id <> requester_id));

create function can_contact(p uuid) returns boolean language sql security definer stable set search_path = public as
$$ select exists(select 1 from profiles where id = p and public_listing and accepts_requests and availability_status = 'available') $$;

create function limit_contact_requests() returns trigger language plpgsql as $$
begin
  if (select count(*) from donor_contact_requests where requester_id = new.requester_id and day = current_date) >= 10
  then raise exception 'daily contact request limit reached'; end if;
  return new;
end $$;
create trigger trg_limit_contact before insert on donor_contact_requests for each row execute function limit_contact_requests();

alter table donor_contact_requests enable row level security;
create policy "send contact request" on donor_contact_requests for insert with check (requester_id = auth.uid() and can_contact(donor_id));
create policy "see own sent or received" on donor_contact_requests for select using (requester_id = auth.uid() or donor_id = auth.uid() or is_admin());
