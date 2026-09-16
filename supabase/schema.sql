-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Creates a tiny key/value settings table that the extension reads with the
-- public anon key. Only SELECT is allowed for anonymous clients; you edit the
-- values from the Supabase dashboard (Table Editor).

create table if not exists public.settings (
  key        text primary key,
  value      text not null,
  note       text,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "anon can read settings" on public.settings;
create policy "anon can read settings"
  on public.settings for select
  to anon, authenticated
  using (true);

-- keep updated_at fresh
create or replace function public.settings_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.settings_touch_updated_at();

insert into public.settings (key, value, note) values
  ('register_url',
   'https://ind.nl/en/public-register-recognised-sponsors/public-register-work',
   'IND page with the sponsor table. Shown to users as the link, and downloaded + parsed by the extension.'),
  ('refresh_hours', '24',
   'How often (hours) the extension re-downloads the register. Min 1, max 720.'),
  ('sponsors_json_url', '',
   'Optional. If set to an https URL returning JSON ([{"name","kvk"}] or {"sponsors":[...]}), the extension uses it instead of parsing register_url. Leave empty to parse the IND page.')
on conflict (key) do update
  set value = excluded.value,
      note  = excluded.note;
