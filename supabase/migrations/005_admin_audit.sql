-- Moderation audit log, written by the database itself (cannot be skipped by the client)
create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor uuid, target_id uuid not null,
  old_status text not null, new_status text not null,
  created_at timestamptz not null default now());
alter table admin_audit_logs enable row level security;
create policy "admins read audit log" on admin_audit_logs for select using (is_admin());

create function log_request_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into admin_audit_logs (actor, target_id, old_status, new_status) values (auth.uid(), new.id, old.status::text, new.status::text);
  return new;
end $$;
create trigger trg_log_status after update on blood_requests for each row
  when (old.status is distinct from new.status) execute function log_request_status();

-- First admin (run once, replace the email):
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'YOU@example.com');
