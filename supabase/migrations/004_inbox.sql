-- Donor inbox: donors may answer requests sent to them (and only change the response)
alter table donor_contact_requests
  add column response text check (response in ('can_help','cannot_help','need_details')),
  add column responded_at timestamptz;

revoke update on donor_contact_requests from anon, authenticated;
grant update (response) on donor_contact_requests to authenticated;

create policy "donor responds" on donor_contact_requests for update
  using (donor_id = auth.uid()) with check (donor_id = auth.uid());

create function set_responded_at() returns trigger language plpgsql as $$
begin new.responded_at := now(); return new; end $$;
create trigger trg_responded before update on donor_contact_requests for each row
  when (new.response is distinct from old.response) execute function set_responded_at();

-- Requesters see donor first name + response only (no contact details)
create function my_sent_requests() returns table (id uuid, donor_name text, blood_group text, created_at timestamptz, response text, responded_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, split_part(p.display_name,' ',1), r.blood_group::text, r.created_at, r.response, r.responded_at
  from donor_contact_requests r join profiles p on p.id = r.donor_id
  where r.requester_id = auth.uid() order by r.created_at desc limit 50
$$;
grant execute on function my_sent_requests to authenticated;
