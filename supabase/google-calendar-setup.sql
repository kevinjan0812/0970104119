-- Google Calendar OAuth connection storage.
-- Tokens are encrypted by the Edge Function before they reach this table.
create table if not exists public.google_calendar_connections (
  company_id uuid primary key references public.companies(id) on delete cascade,
  refresh_token_ciphertext text not null,
  scope text not null default 'https://www.googleapis.com/auth/calendar.events',
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each company owns its Google Cloud OAuth client. The client secret is
-- encrypted by the Edge Function before it reaches this table.
create table if not exists public.google_calendar_oauth_configs (
  company_id uuid primary key references public.companies(id) on delete cascade,
  client_id text not null,
  client_secret_ciphertext text not null,
  configured_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_oauth_configs enable row level security;

-- Browser clients never read OAuth credentials. Only service-role Edge Functions
-- can access this table, even when a signed-in user calls the function.
revoke all on table public.google_calendar_connections from anon, authenticated;
grant all on table public.google_calendar_connections to service_role;
revoke all on table public.google_calendar_oauth_configs from anon, authenticated;
grant all on table public.google_calendar_oauth_configs to service_role;
create policy "browser clients cannot access google calendar credentials"
on public.google_calendar_connections
for all
to anon, authenticated
using (false)
with check (false);

create policy "browser clients cannot access google oauth clients"
on public.google_calendar_oauth_configs
for all
to anon, authenticated
using (false)
with check (false);

create index if not exists google_calendar_connections_connected_by_idx
  on public.google_calendar_connections (connected_by);
create index if not exists google_calendar_oauth_configs_configured_by_idx
  on public.google_calendar_oauth_configs (configured_by);

comment on table public.google_calendar_connections is
  'Encrypted Google Calendar refresh tokens, scoped to one funeral company.';
comment on column public.google_calendar_connections.refresh_token_ciphertext is
  'AES-GCM encrypted refresh token. Decryption key exists only in Edge Function secrets.';
comment on table public.google_calendar_oauth_configs is
  'Per-company Google Cloud OAuth clients; browser users cannot read credentials directly.';
comment on column public.google_calendar_oauth_configs.client_secret_ciphertext is
  'AES-GCM encrypted Google OAuth client secret.';
