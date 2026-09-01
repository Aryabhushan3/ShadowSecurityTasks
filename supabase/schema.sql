-- ============================================================
-- Shadow Security COO OS - Supabase schema (with real logins)
--
-- Run this FIRST:  Supabase -> SQL Editor -> New query -> paste -> Run
-- Then run seed.sql to load the team and demo data.
--
-- How access works
--   * Every person signs in with their own email + password (Supabase Auth).
--   * Access is INVITE-ONLY: signing up only works if an admin has already
--     added that email to the team. Any other signup gets an account with
--     zero access to this workspace.
--   * Two roles: 'admin' sees and changes everything; 'member' sees the shared
--     workspace and edits their own work.
--   * The browser only ever uses the PUBLIC anon key. Never put the
--     service_role key in the app - it would bypass every rule below.
-- ============================================================

-- ---------- Tables ----------

create table if not exists profiles (
  id           text primary key,
  user_id      uuid unique references auth.users(id) on delete set null,
  name         text not null,
  role         text not null,                     -- job title, e.g. 'Frontend Engineer'
  access_role  text not null default 'member'
               check (access_role in ('admin','member')),
  department   text not null default '',
  email        text not null unique,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists projects (
  id          text primary key,
  name        text not null,
  description text not null default '',
  owner_id    text references profiles(id) on delete set null,
  team        text[] not null default '{}',
  status      text not null default 'planning'
              check (status in ('planning','active','at_risk','on_hold','completed')),
  deadline    date,
  progress    integer not null default 0 check (progress between 0 and 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists tasks (
  id              text primary key,
  title           text not null,
  description     text not null default '',
  assignee_id     text references profiles(id) on delete set null,
  project_id      text references projects(id) on delete set null,
  status          text not null default 'backlog'
                  check (status in ('backlog','todo','in_progress','review','blocked','done')),
  priority        text not null default 'medium'
                  check (priority in ('low','medium','high','urgent')),
  due_date        date,
  start_date      date,
  follow_up_date  date,
  blocked_reason  text,
  archived        boolean not null default false,
  position        integer not null default 0,
  recurrence      text not null default 'none'
                  check (recurrence in ('none','daily','weekly','monthly')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Adds the recurrence column to a database created before this feature existed.
alter table tasks add column if not exists recurrence text not null default 'none';
alter table tasks drop constraint if exists tasks_recurrence_check;
alter table tasks add constraint tasks_recurrence_check check (recurrence in ('none','daily','weekly','monthly'));

create table if not exists checklist_items (
  id         text primary key,
  task_id    text not null references tasks(id) on delete cascade,
  text       text not null,
  completed  boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists comments (
  id         text primary key,
  task_id    text not null references tasks(id) on delete cascade,
  profile_id text references profiles(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);

create table if not exists platforms (
  id     text primary key,
  name   text not null unique,
  active boolean not null default true
);

create table if not exists content_items (
  id              text primary key,
  title           text not null,
  platform_id     text references platforms(id) on delete set null,
  content_type    text not null default '',
  owner_id        text references profiles(id) on delete set null,
  writer_id       text references profiles(id) on delete set null,
  designer_id     text references profiles(id) on delete set null,
  reviewer_id     text references profiles(id) on delete set null,
  campaign        text not null default '',
  publish_date    date,
  stage           text not null default 'idea'
                  check (stage in ('idea','planned','research','writing','design','review','approved','scheduled','published')),
  approval_status text not null default 'draft'
                  check (approval_status in ('draft','in_review','changes_requested','approved','scheduled','published')),
  brief           text not null default '',
  caption         text not null default '',
  asset           text not null default '',
  published_url   text not null default '',
  notes           text not null default '',
  views           integer not null default 0,
  reach           integer not null default 0,
  likes           integer not null default 0,
  comments_count  integer not null default 0,
  shares          integer not null default 0,
  saves           integer not null default 0,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists milestones (
  id         text primary key,
  project_id text not null references projects(id) on delete cascade,
  title      text not null,
  due_date   date,
  completed  boolean not null default false
);

create table if not exists meeting_notes (
  id           text primary key,
  title        text not null,
  meeting_date date not null,
  participants text[] not null default '{}',
  notes        text not null default '',
  decisions    text not null default '',
  action_items jsonb not null default '[]'::jsonb,
  created_by   text references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists notes (
  id         text primary key,
  title      text not null,
  body       text not null default '',
  created_by text references profiles(id) on delete set null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity (
  id          text primary key,
  profile_id  text references profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  created_at  timestamptz not null default now()
);

create table if not exists notifications (
  id         text primary key,
  profile_id text references profiles(id) on delete cascade,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key   text primary key,
  value text not null
);

create table if not exists attachments (
  id          text primary key,
  task_id     text not null references tasks(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,
  file_size   integer not null default 0,
  uploaded_by text references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_attachments_task on attachments(task_id);

-- ---------- Indexes ----------

create index if not exists idx_profiles_user     on profiles(user_id);
create index if not exists idx_tasks_status      on tasks(status);
create index if not exists idx_tasks_due         on tasks(due_date);
create index if not exists idx_tasks_assignee    on tasks(assignee_id);
create index if not exists idx_tasks_project     on tasks(project_id);
create index if not exists idx_tasks_archived    on tasks(archived);
create index if not exists idx_checklist_task    on checklist_items(task_id);
create index if not exists idx_comments_task     on comments(task_id);
create index if not exists idx_content_publish   on content_items(publish_date);
create index if not exists idx_content_stage     on content_items(stage);
create index if not exists idx_activity_created  on activity(created_at desc);

-- ============================================================
-- Identity helpers
-- ============================================================

-- Which profile row is the signed-in person?
create or replace function public.current_profile_id()
returns text language sql stable security definer set search_path = public as $$
  select id from profiles where user_id = auth.uid() and active limit 1;
$$;

-- Is the signed-in person an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select access_role = 'admin' from profiles where user_id = auth.uid() and active limit 1),
    false
  );
$$;

-- Does the signed-in person belong to this workspace at all?
create or replace function public.has_access()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and active);
$$;

-- ============================================================
-- Invite gate
-- When someone signs up, they are linked to a team row ONLY if an admin
-- already added their email. No matching row = an account with no access.
-- ============================================================

create or replace function public.link_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles
     set user_id = new.id, updated_at = now()
   where lower(email) = lower(new.email)
     and user_id is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_auth_user();

-- ============================================================
-- Row level security
-- Everyone in the workspace can READ the shared workspace (that is the point
-- of a shared team workspace). WRITES are role-scoped: admins do anything,
-- members change their own work.
-- ============================================================

alter table profiles        enable row level security;
alter table projects        enable row level security;
alter table tasks           enable row level security;
alter table checklist_items enable row level security;
alter table comments        enable row level security;
alter table platforms       enable row level security;
alter table content_items   enable row level security;
alter table milestones      enable row level security;
alter table meeting_notes   enable row level security;
alter table notes           enable row level security;
alter table activity        enable row level security;
alter table notifications   enable row level security;
alter table settings        enable row level security;
alter table attachments     enable row level security;

-- Shared read for every signed-in workspace member
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','projects','tasks','checklist_items','comments','platforms',
    'content_items','milestones','meeting_notes','notes','activity','settings'
  ])
  loop
    execute format('drop policy if exists read_workspace on %I', t);
    execute format(
      'create policy read_workspace on %I for select to authenticated using (public.has_access())', t);
  end loop;
end $$;

-- Admin-only writes on structural tables
do $$
declare t text;
begin
  for t in select unnest(array['profiles','projects','platforms','milestones','settings'])
  loop
    execute format('drop policy if exists admin_write on %I', t);
    execute format(
      'create policy admin_write on %I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Tasks: admins anything; members may update only what is assigned to them.
drop policy if exists tasks_admin      on tasks;
drop policy if exists tasks_member_upd on tasks;
drop policy if exists tasks_member_ins on tasks;
create policy tasks_admin on tasks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tasks_member_upd on tasks for update to authenticated
  using (assignee_id = public.current_profile_id())
  with check (assignee_id = public.current_profile_id());
create policy tasks_member_ins on tasks for insert to authenticated
  with check (public.has_access());

-- Checklists: admins anything; members on their own tasks.
drop policy if exists checklist_admin  on checklist_items;
drop policy if exists checklist_member on checklist_items;
create policy checklist_admin on checklist_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy checklist_member on checklist_items for all to authenticated
  using (exists (select 1 from tasks t where t.id = task_id and t.assignee_id = public.current_profile_id()))
  with check (exists (select 1 from tasks t where t.id = task_id and t.assignee_id = public.current_profile_id()));

-- Comments: anyone in the workspace may comment as themselves; admins moderate.
drop policy if exists comments_admin  on comments;
drop policy if exists comments_insert on comments;
create policy comments_admin on comments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy comments_insert on comments for insert to authenticated
  with check (profile_id = public.current_profile_id());

-- Content: admins anything; members may create and edit content they are on.
drop policy if exists content_admin  on content_items;
drop policy if exists content_member on content_items;
drop policy if exists content_insert on content_items;
create policy content_admin on content_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy content_member on content_items for update to authenticated
  using (public.current_profile_id() in (owner_id, writer_id, designer_id, reviewer_id))
  with check (public.current_profile_id() in (owner_id, writer_id, designer_id, reviewer_id));
create policy content_insert on content_items for insert to authenticated
  with check (public.has_access());

-- Meeting notes & notes: admins anything; members manage what they created.
do $$
declare t text;
begin
  for t in select unnest(array['meeting_notes','notes'])
  loop
    execute format('drop policy if exists doc_admin on %I', t);
    execute format('drop policy if exists doc_owner on %I', t);
    execute format('drop policy if exists doc_insert on %I', t);
    execute format(
      'create policy doc_admin on %I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format(
      'create policy doc_owner on %I for all to authenticated using (created_by = public.current_profile_id()) with check (created_by = public.current_profile_id())', t);
    execute format(
      'create policy doc_insert on %I for insert to authenticated with check (created_by = public.current_profile_id())', t);
  end loop;
end $$;

-- Activity: append-only for members, full control for admins.
drop policy if exists activity_admin  on activity;
drop policy if exists activity_insert on activity;
create policy activity_admin on activity for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy activity_insert on activity for insert to authenticated
  with check (public.has_access());

-- Notifications: you only ever see and clear your own; admins see all.
drop policy if exists notif_admin on notifications;
drop policy if exists notif_own   on notifications;
drop policy if exists notif_ins   on notifications;
create policy notif_admin on notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy notif_own on notifications for all to authenticated
  using (profile_id = public.current_profile_id())
  with check (profile_id = public.current_profile_id());
create policy notif_ins on notifications for insert to authenticated
  with check (public.has_access());

-- Attachments: anyone in the workspace can attach/see files on a task they can see.
-- Admins can remove any attachment; members can remove ones they uploaded.
drop policy if exists attach_read   on attachments;
drop policy if exists attach_insert on attachments;
drop policy if exists attach_delete on attachments;
create policy attach_read on attachments for select to authenticated
  using (public.has_access());
create policy attach_insert on attachments for insert to authenticated
  with check (uploaded_by = public.current_profile_id());
create policy attach_delete on attachments for delete to authenticated
  using (public.is_admin() or uploaded_by = public.current_profile_id());

-- ============================================================
-- File storage for task attachments
-- Run this once. Creates a private bucket; access is controlled entirely by
-- the policies below (same "workspace members only" rule as the tables).
-- ============================================================

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

drop policy if exists attach_storage_read   on storage.objects;
drop policy if exists attach_storage_write  on storage.objects;
drop policy if exists attach_storage_delete on storage.objects;

create policy attach_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'task-attachments' and public.has_access());
create policy attach_storage_write on storage.objects for insert to authenticated
  with check (bucket_id = 'task-attachments' and public.has_access());
create policy attach_storage_delete on storage.objects for delete to authenticated
  using (bucket_id = 'task-attachments' and (public.is_admin() or owner = auth.uid()));
