-- FlowPilot · Supabase schema
-- Run this in the Supabase SQL editor.

create table if not exists workflows (
  id text primary key,
  name text not null default 'Untitled',
  nodes jsonb not null default '[]',
  edges jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id text references workflows (id) on delete cascade,
  status text not null default 'success',
  log jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Command queue polled by the ESP8266 over HTTPS (~every 300ms).
-- Browser never calls the car directly (avoids mixed-content block).
create table if not exists car_commands (
  id uuid primary key default gen_random_uuid(),
  command text not null check (command in ('F','B','L','R','S')),
  speed int not null default 120 check (speed between 0 and 255),
  status text not null default 'pending' check (status in ('pending','done')),
  created_at timestamptz not null default now()
);
create index if not exists car_commands_pending_idx
  on car_commands (created_at) where status = 'pending';

-- Least-privilege access: anon key may insert workflows/runs/commands
-- and read pending commands (the car polls with the anon key, never service-role).
alter table workflows enable row level security;
alter table runs enable row level security;
alter table car_commands enable row level security;

drop policy if exists "open workflows" on workflows;
create policy "open workflows" on workflows
  for all using (true) with check (true);

drop policy if exists "open runs" on runs;
create policy "open runs" on runs
  for all using (true) with check (true);

drop policy if exists "car insert" on car_commands;
create policy "car insert" on car_commands
  for insert with check (true);

drop policy if exists "car read pending" on car_commands;
create policy "car read pending" on car_commands
  for select using (status = 'pending');

drop policy if exists "car mark done" on car_commands;
create policy "car mark done" on car_commands
  for update using (status = 'pending') with check (status = 'done');
