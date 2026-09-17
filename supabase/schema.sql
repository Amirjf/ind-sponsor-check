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
returns trigger
language plpgsql
set search_path = ''
as $$
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

-- Sites where the generic "company website" check stays quiet (search engines,
-- social networks, tools people keep open). Registrable domains without `www.`;
-- every subdomain is covered. The extension bundles a default list and merges
-- these rows on top of it, so only additions need to live here.

create table if not exists public.ignored_hosts (
  host       text primary key check (host = lower(host) and host !~ '^www\.' and host !~ '\s'),
  -- Grouping so a whole set can be managed at once: 'everyday', 'government', ...
  category   text not null default 'other',
  note       text,
  created_at timestamptz not null default now()
);

alter table public.ignored_hosts add column if not exists category text not null default 'other';
create index if not exists ignored_hosts_category_idx on public.ignored_hosts (category);

alter table public.ignored_hosts enable row level security;

drop policy if exists "anon can read ignored hosts" on public.ignored_hosts;
create policy "anon can read ignored hosts"
  on public.ignored_hosts for select
  to anon, authenticated
  using (true);

insert into public.ignored_hosts (host, category, note) values
  ('google.com', 'everyday', 'search'), ('google.nl', 'everyday', 'search'), ('gmail.com', 'everyday', 'mail'), ('bing.com', 'everyday', 'search'),
  ('duckduckgo.com', 'everyday', 'search'), ('yahoo.com', 'everyday', 'search'), ('live.com', 'everyday', 'mail'), ('outlook.com', 'everyday', 'mail'),
  ('office.com', 'everyday', 'tools'),
  ('youtube.com', 'everyday', 'social'), ('facebook.com', 'everyday', 'social'), ('instagram.com', 'everyday', 'social'), ('whatsapp.com', 'everyday', 'social'),
  ('x.com', 'everyday', 'social'), ('twitter.com', 'everyday', 'social'), ('tiktok.com', 'everyday', 'social'), ('reddit.com', 'everyday', 'social'),
  ('discord.com', 'everyday', 'chat'), ('slack.com', 'everyday', 'chat'), ('zoom.us', 'everyday', 'chat'), ('twitch.tv', 'everyday', 'video'),
  ('netflix.com', 'everyday', 'video'), ('spotify.com', 'everyday', 'music'),
  ('wikipedia.org', 'everyday', 'reference'), ('github.com', 'everyday', 'dev'), ('gitlab.com', 'everyday', 'dev'), ('stackoverflow.com', 'everyday', 'dev'),
  ('notion.so', 'everyday', 'tools'), ('chatgpt.com', 'everyday', 'ai'), ('openai.com', 'everyday', 'ai'), ('claude.ai', 'everyday', 'ai'), ('anthropic.com', 'everyday', 'ai'),
  ('supabase.com', 'everyday', 'dev'), ('localhost', 'everyday', 'dev'),
  ('amazon.com', 'everyday', 'shopping'), ('amazon.nl', 'everyday', 'shopping'), ('bol.com', 'everyday', 'shopping'), ('marktplaats.nl', 'everyday', 'shopping'),
  ('ebay.com', 'everyday', 'shopping'), ('aliexpress.com', 'everyday', 'shopping'),
  ('linkedin.com', 'everyday', 'job site, own adapter'), ('indeed.com', 'everyday', 'job site, own adapter'),
  ('glassdoor.com', 'everyday', 'job site'), ('glassdoor.nl', 'everyday', 'job site'), ('nu.nl', 'everyday', 'news'), ('ind.nl', 'everyday', 'the register itself')
on conflict (host) do nothing;

-- Messages sent from the contact form on the extension's website: feature
-- requests, wrong results, general notes. The extension itself only links to
-- that page and never writes here.
--
-- The anon key is public wherever it is used, so this table is write-only:
-- there is an INSERT policy and deliberately no SELECT policy, meaning nobody
-- can read other people's messages through the API. You read them in the
-- Dashboard -> Table Editor.

create table if not exists public.feedback (
  id                uuid primary key default gen_random_uuid(),
  message           text not null check (length(btrim(message)) between 5 and 2000),
  -- Optional: left null when the sender wants to stay anonymous.
  email             text check (email is null or (length(email) <= 200 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  -- Optional: which build the sender was on, e.g. '0.2.0'.
  extension_version text check (extension_version is null or length(extension_version) <= 20),
  -- Set by you while triaging; the contact form never writes it.
  handled           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "anon can send feedback" on public.feedback;
create policy "anon can send feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies on purpose: with RLS on, that makes the
-- table invisible to the anon key in every direction except INSERT.

-- The ~2000 Dutch government domains (ministries, agencies, municipalities,
-- provinces, water boards) are a separate file because of their size:
--   \i supabase/seed-government-hosts.sql
-- or paste that file into the SQL editor after running this one.
