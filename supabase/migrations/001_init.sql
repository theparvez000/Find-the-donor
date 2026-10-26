create type blood_group as enum ('A+','A-','B+','B-','O+','O-','AB+','AB-');
create type request_status as enum ('pending','approved','fulfilled','rejected','cancelled');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  blood_group blood_group not null,
  district text not null, upazila text,
  available boolean not null default true,
  public_listing boolean not null default false,  -- explicit opt-in
  last_donation date,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now(), updated_at timestamptz default now());
create index on profiles (blood_group, district) where public_listing and available;

create table blood_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid references auth.users on delete set null,
  patient_name text not null, blood_group blood_group not null,
  units int not null check (units between 1 and 10),
  hospital text not null, district text not null, upazila text,
  contact text not null, details text,
  status request_status not null default 'pending',
  created_at timestamptz default now());
create index on blood_requests (status, district, created_at desc);

create table reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references blood_requests on delete cascade,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz default now());

create function is_admin() returns boolean language sql security definer stable as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- block role self-escalation
create function protect_role() returns trigger language plpgsql as
$$ begin if new.role <> old.role and coalesce(auth.role(),'') <> 'service_role' then new.role := old.role; end if; return new; end $$;
create trigger trg_protect_role before update on profiles for each row execute function protect_role();

alter table profiles enable row level security;
alter table blood_requests enable row level security;
alter table reports enable row level security;

create policy "own profile read" on profiles for select using (id = auth.uid() or is_admin());
create policy "own profile insert" on profiles for insert with check (id = auth.uid() and role = 'user');
create policy "own profile update" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile delete" on profiles for delete using (id = auth.uid());

-- anyone may submit, but only as 'pending'
create policy "submit request" on blood_requests for insert with check (status = 'pending');
create policy "read own or admin" on blood_requests for select using (requester_id = auth.uid() or is_admin());
create policy "cancel own" on blood_requests for update using (requester_id = auth.uid()) with check (requester_id = auth.uid() and status = 'cancelled');
create policy "admin moderate" on blood_requests for update using (is_admin());
create policy "submit report" on reports for insert with check (true);
create policy "admin reads reports" on reports for select using (is_admin());

-- minimal public data only: no phone, no exact address, no DOB
create view public_donors as
  select id, split_part(display_name,' ',1) as display_name, blood_group::text as blood_group, district, upazila
  from profiles where public_listing and available;
grant select on public_donors to anon, authenticated;

create view public_requests as
  select id, blood_group::text as blood_group, units, hospital, district, created_at
  from blood_requests where status = 'approved';
grant select on public_requests to anon, authenticated;
