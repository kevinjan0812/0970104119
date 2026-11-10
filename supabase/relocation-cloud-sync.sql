-- 遷葬服務案件雲端儲存、軟刪除與版本紀錄。
-- 已於 2026-11-10 套用至 Supabase 專案 ydiuzewutkfxbrcnsvdx。

create schema if not exists private;

create table if not exists public.relocation_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  case_no text not null,
  case_name text not null default '未命名案件',
  relocation_date text,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id) on delete set null,
  constraint relocation_cases_company_case_no_key unique (company_id, case_no),
  constraint relocation_cases_case_no_not_blank check (length(btrim(case_no)) > 0)
);

comment on table public.relocation_cases is
  'Relocation service cases, stored independently from funeral service cases.';
comment on column public.relocation_cases.payload is
  'Complete relocation form payload used by the browser application.';
comment on column public.relocation_cases.deleted_at is
  'Soft-delete timestamp; null rows are active.';

create index if not exists relocation_cases_active_company_idx
  on public.relocation_cases (company_id, updated_at desc)
  where deleted_at is null;
create index if not exists relocation_cases_created_by_idx
  on public.relocation_cases (created_by);
create index if not exists relocation_cases_updated_by_idx
  on public.relocation_cases (updated_by);
create index if not exists relocation_cases_deleted_by_idx
  on public.relocation_cases (deleted_by);

alter table public.relocation_cases enable row level security;

drop policy if exists "members can view relocation cases" on public.relocation_cases;
create policy "members can view relocation cases"
  on public.relocation_cases for select
  to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "editors can create relocation cases" on public.relocation_cases;
create policy "editors can create relocation cases"
  on public.relocation_cases for insert
  to authenticated
  with check (
    public.can_edit_company(company_id)
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
    and deleted_at is null
    and deleted_by is null
  );

drop policy if exists "editors can update relocation cases" on public.relocation_cases;
create policy "editors can update relocation cases"
  on public.relocation_cases for update
  to authenticated
  using (public.can_edit_company(company_id))
  with check (
    public.can_edit_company(company_id)
    and updated_by = (select auth.uid())
    and (
      (deleted_at is null and deleted_by is null)
      or (deleted_at is not null and deleted_by = (select auth.uid()))
    )
  );

revoke all on table public.relocation_cases from anon;
revoke all on table public.relocation_cases from authenticated;
grant select, insert, update on table public.relocation_cases to authenticated;

create or replace function private.set_relocation_case_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function private.set_relocation_case_updated_at() from public;
revoke all on function private.set_relocation_case_updated_at() from anon;
revoke all on function private.set_relocation_case_updated_at() from authenticated;

drop trigger if exists relocation_cases_set_updated_at on public.relocation_cases;
create trigger relocation_cases_set_updated_at
before update on public.relocation_cases
for each row execute function private.set_relocation_case_updated_at();

create table if not exists public.relocation_case_versions (
  id bigint generated always as identity primary key,
  relocation_case_id uuid not null references public.relocation_cases(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  case_no text not null,
  operation text not null check (operation in ('insert', 'update', 'delete', 'restore')),
  snapshot jsonb not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

comment on table public.relocation_case_versions is
  'Immutable version history for relocation service cases.';

create index if not exists relocation_case_versions_case_idx
  on public.relocation_case_versions (relocation_case_id, changed_at desc);
create index if not exists relocation_case_versions_company_idx
  on public.relocation_case_versions (company_id, changed_at desc);
create index if not exists relocation_case_versions_changed_by_idx
  on public.relocation_case_versions (changed_by);

alter table public.relocation_case_versions enable row level security;

drop policy if exists "members can view relocation case versions"
  on public.relocation_case_versions;
create policy "members can view relocation case versions"
  on public.relocation_case_versions for select
  to authenticated
  using (public.is_company_member(company_id));

revoke all on table public.relocation_case_versions from anon;
revoke all on table public.relocation_case_versions from authenticated;
grant select on table public.relocation_case_versions to authenticated;

create or replace function private.archive_relocation_case_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  action text;
begin
  if tg_op = 'INSERT' then
    action := 'insert';
  elsif old.deleted_at is null and new.deleted_at is not null then
    action := 'delete';
  elsif old.deleted_at is not null and new.deleted_at is null then
    action := 'restore';
  else
    action := 'update';
  end if;

  insert into public.relocation_case_versions (
    relocation_case_id,
    company_id,
    case_no,
    operation,
    snapshot,
    changed_by
  ) values (
    new.id,
    new.company_id,
    new.case_no,
    action,
    to_jsonb(new),
    coalesce(new.updated_by, new.deleted_by, new.created_by, (select auth.uid()))
  );
  return new;
end;
$function$;

revoke all on function private.archive_relocation_case_version() from public;
revoke all on function private.archive_relocation_case_version() from anon;
revoke all on function private.archive_relocation_case_version() from authenticated;

drop trigger if exists relocation_cases_archive_version on public.relocation_cases;
create trigger relocation_cases_archive_version
after insert or update on public.relocation_cases
for each row execute function private.archive_relocation_case_version();
