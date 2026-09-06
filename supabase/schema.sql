-- Ambiente de teste Supabase para o Controle de Embarque Smagalhães.
-- Execute este arquivo no SQL Editor do Supabase antes de integrar dados reais.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role text not null default 'consulta' check (role in ('desenvolvedor', 'administrador', 'gestor', 'operador', 'consulta')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  acronym text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.patios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  number text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  chapeira text not null unique,
  name text not null,
  cavalo text,
  reboque text,
  cpf text,
  cnh text,
  status text not null default 'disponivel' check (status in ('disponivel', 'bloqueado', 'gancho')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  terminal_id uuid references public.terminals(id),
  patio_id uuid references public.patios(id),
  terminal_name text not null,
  patio_name text not null,
  horario time not null,
  shipment_date date not null default current_date,
  destino text,
  imo boolean not null default false,
  status text not null default 'programado' check (status in ('programado', 'iniciado', 'concluido', 'cancelado')),
  created_by uuid references public.profiles(id),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_drivers (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  driver_id uuid not null references public.drivers(id),
  chapeira text not null,
  driver_name text not null,
  loaded boolean not null default false,
  loaded_at timestamptz,
  loaded_by uuid references public.profiles(id),
  unique (shipment_id, driver_id)
);

create table if not exists public.call_sessions (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada', 'cancelada')),
  started_by uuid references public.profiles(id),
  started_at timestamptz not null default now(),
  ended_by uuid references public.profiles(id),
  ended_at timestamptz
);

create table if not exists public.call_entries (
  id uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions(id) on delete cascade,
  driver_id uuid references public.drivers(id),
  chapeira text not null,
  driver_name text not null,
  ok boolean not null default false,
  substitute text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references public.profiles(id),
  user_email text,
  user_name text,
  role text,
  area text not null,
  action text not null,
  target text not null,
  before_value text,
  after_value text
);

create table if not exists public.mural_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'todos' check (audience in ('todos', 'transporte', 'expedicao')),
  important boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.terminals enable row level security;
alter table public.patios enable row level security;
alter table public.drivers enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_drivers enable row level security;
alter table public.call_sessions enable row level security;
alter table public.call_entries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.mural_notices enable row level security;

-- Política inicial liberada para teste controlado.
-- Antes de produção, substituir por RLS baseada em auth.uid() e role.
create policy "test_read_all" on public.profiles for select using (true);
create policy "test_write_all" on public.profiles for all using (true) with check (true);
create policy "test_read_terminals" on public.terminals for select using (true);
create policy "test_write_terminals" on public.terminals for all using (true) with check (true);
create policy "test_read_patios" on public.patios for select using (true);
create policy "test_write_patios" on public.patios for all using (true) with check (true);
create policy "test_read_drivers" on public.drivers for select using (true);
create policy "test_write_drivers" on public.drivers for all using (true) with check (true);
create policy "test_read_shipments" on public.shipments for select using (true);
create policy "test_write_shipments" on public.shipments for all using (true) with check (true);
create policy "test_read_shipment_drivers" on public.shipment_drivers for select using (true);
create policy "test_write_shipment_drivers" on public.shipment_drivers for all using (true) with check (true);
create policy "test_read_calls" on public.call_sessions for select using (true);
create policy "test_write_calls" on public.call_sessions for all using (true) with check (true);
create policy "test_read_call_entries" on public.call_entries for select using (true);
create policy "test_write_call_entries" on public.call_entries for all using (true) with check (true);
create policy "test_read_logs" on public.audit_logs for select using (true);
create policy "test_write_logs" on public.audit_logs for insert with check (true);
create policy "test_read_mural" on public.mural_notices for select using (true);
create policy "test_write_mural" on public.mural_notices for all using (true) with check (true);

insert into public.terminals (name, acronym) values
  ('Brasil Terminais', 'BTP'),
  ('DP World', 'DPW'),
  ('Santos Brasil', 'SB'),
  ('EcoPorto', 'ECO')
on conflict (name) do nothing;

insert into public.patios (name, number) values
  ('Pátio 1', '1'),
  ('Pátio 2', '2'),
  ('Pátio 3', '3'),
  ('Pátio 4', '4');
