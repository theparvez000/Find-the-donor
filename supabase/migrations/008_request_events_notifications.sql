-- 008: APPLIED to production 2026-10-26 via apply_migration (verified absent beforehand).
-- Verified afterwards with a rolled-back test transaction: 3 history events + 2 notifications for
-- submitted->approved->fulfilled; duplicate blocked; 4th request/24h blocked; 81-char name rejected.

-- Field length limits enforced by the database (the request form now runs in the browser).
alter table blood_requests add constraint blood_requests_field_lengths check (
  char_length(patient_name) between 1 and 80 and char_length(hospital) between 1 and 120
  and char_length(contact) between 3 and 60 and (details is null or char_length(details) <= 300)
  and (upazila is null or char_length(upazila) <= 60));

-- Notifications (written only by triggers).
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('contact_request','donor_response','request_status')),
  ref_id uuid not null,
  title text not null, body text not null, link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id));
create index notifications_user_unread on notifications (user_id, created_at desc);
alter table notifications enable row level security;
revoke all on notifications from anon;
revoke insert, delete, update on notifications from authenticated;
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;
create policy "own notifications read" on notifications for select using (user_id = auth.uid());
create policy "own notifications mark read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Request status history (written only by trigger).
create table request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references blood_requests on delete cascade,
  status text not null check (status in ('submitted','approved','rejected','fulfilled','cancelled')),
  created_at timestamptz not null default now());
create index request_events_req on request_events (request_id, created_at);
alter table request_events enable row level security;
revoke all on request_events from anon;
revoke insert, update, delete on request_events from authenticated;
grant select on request_events to authenticated;
create policy "owner or admin reads events" on request_events for select using (
  is_admin() or exists (select 1 from blood_requests r where r.id = request_id and r.requester_id = auth.uid()));

create function log_request_event() returns trigger language plpgsql security definer set search_path = public as $$
declare eid uuid;
begin
  if tg_op = 'INSERT' then
    insert into request_events (request_id, status) values (new.id, 'submitted');
  elsif new.status is distinct from old.status and new.status <> 'pending' then
    insert into request_events (request_id, status) values (new.id, new.status::text) returning id into eid;
    if new.requester_id is not null and new.requester_id is distinct from auth.uid() then
      insert into notifications (user_id, kind, ref_id, title, body, link) values (
        new.requester_id, 'request_status', eid, 'Your blood request was updated',
        case new.status::text
          when 'approved' then 'A moderator approved your request. It now appears on the public requests page without your contact details.'
          when 'rejected' then 'A moderator did not approve your request.'
          when 'fulfilled' then 'Your request was marked fulfilled.'
          else 'Your request was cancelled.' end,
        '/track') on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
revoke execute on function log_request_event() from public, anon, authenticated;
create trigger trg_request_event after insert or update on blood_requests for each row execute function log_request_event();

create function notify_contact_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, ref_id, title, body, link) values (
    new.donor_id, 'contact_request', new.id, 'New blood request for you',
    'Someone needs ' || new.blood_group::text || ' blood and asked for your help. Open your inbox to answer. Answering does not share your contact details.', '/inbox')
  on conflict do nothing;
  return new;
end $$;
revoke execute on function notify_contact_request() from public, anon, authenticated;
create trigger trg_notify_contact after insert on donor_contact_requests for each row execute function notify_contact_request();

create function notify_donor_response() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, ref_id, title, body, link) values (
    new.requester_id, 'donor_response', new.id, 'A donor answered your request',
    case new.response when 'can_help' then 'A donor said they can help.' when 'need_details' then 'A donor needs more details.' else 'A donor cannot help right now.' end
    || ' Please confirm everything with the hospital or blood bank.', '/inbox')
  on conflict (user_id, kind, ref_id) do update set title = excluded.title, body = excluded.body, read_at = null, created_at = now();
  return new;
end $$;
revoke execute on function notify_donor_response() from public, anon, authenticated;
create trigger trg_notify_response after update on donor_contact_requests for each row
  when (new.response is not null and new.response is distinct from old.response) execute function notify_donor_response();
