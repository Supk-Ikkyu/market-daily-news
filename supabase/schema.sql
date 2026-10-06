-- Market Daily News database schema
-- Run this file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.daily_news (
  id uuid primary key default gen_random_uuid(),
  publication_date date not null unique,
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 1000),
  content_markdown text not null check (char_length(content_markdown) >= 1),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_news_publication_date_idx
  on public.daily_news(publication_date desc);

create index if not exists daily_news_published_idx
  on public.daily_news(status, publication_date desc);

drop trigger if exists set_daily_news_updated_at on public.daily_news;
create trigger set_daily_news_updated_at before update on public.daily_news
for each row execute function public.set_updated_at();

alter table public.daily_news enable row level security;

drop policy if exists "Public can read published news" on public.daily_news;
create policy "Public can read published news"
on public.daily_news
for select
to anon, authenticated
using (status = 'published');

-- No public INSERT, UPDATE, or DELETE policies are created.
-- Editor changes are performed by the manage-news Edge Function after password verification.
