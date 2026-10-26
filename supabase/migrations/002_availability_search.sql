-- Milestone 1: availability, privacy-safe location, distance search
alter table profiles
  add column availability_status text not null default 'unset' check (availability_status in ('available','unavailable','unset')),
  add column availability_updated_at timestamptz,
  add column unavailable_reason text check (unavailable_reason in ('busy','resting','unwell','personal')),
  add column contact_method text not null default 'in_app' check (contact_method in ('in_app','phone','email')),
  add column accepts_requests boolean not null default false,
  add column show_last_donation boolean not null default false,
  add column location_consent boolean not null default false,
  add column approx_lat numeric(6,2),
  add column approx_lng numeric(6,2);

create function profiles_before_write() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.availability_status is distinct from old.availability_status then
    new.availability_updated_at := now();
  end if;
  if new.availability_status <> 'unavailable' then new.unavailable_reason := null; end if;
  if not new.location_consent then new.approx_lat := null; new.approx_lng := null; end if;
  new.approx_lat := round(new.approx_lat, 2); new.approx_lng := round(new.approx_lng, 2);  -- ~1 km, never exact
  new.updated_at := now();
  return new;
end $$;
create trigger trg_profiles_write before insert or update on profiles for each row execute function profiles_before_write();

drop view if exists public_donors;

-- Public search: consented, minimal fields only. Distance is whole km from ~1km-rounded coords.
create function search_donors(p_group text, p_district text, p_lat double precision, p_lng double precision,
  p_radius_km int, p_limit int, p_offset int)
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
    where p.public_listing
      and (p_group is null or p.blood_group::text = p_group)
      and (p_district is null or p.district = p_district))
  select id, split_part(display_name,' ',1), blood_group::text, district, upazila,
    case when availability_status = 'available' and availability_updated_at < now() - interval '30 days'
         then 'stale' else availability_status end,
    availability_updated_at,
    case when show_last_donation then last_donation end,
    d
  from base
  where coalesce(p_radius_km,0) = 0 or (d is not null and d <= p_radius_km)
  order by d nulls last, (availability_status = 'available') desc, availability_updated_at desc nulls last
  limit least(coalesce(p_limit,12), 50) offset greatest(coalesce(p_offset,0),0)
$$;
grant execute on function search_donors to anon, authenticated;
