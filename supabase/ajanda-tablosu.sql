-- ═══════════════════════════════════════════════════════════════
--  AJANDA (Kişisel Plan) tablosu — Hukuk Asistanı
--  Supabase → SQL Editor'de bir kez çalıştırın.
--  Diğer tablolarla aynı desen: her kullanıcı yalnız kendi
--  kayıtlarını görür/değiştirir (RLS: auth.uid() = user_id).
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.ajanda (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  baslik      text not null default '',
  not_        text default '',
  tarih       text,            -- 'YYYY-MM-DD' (boş olabilir)
  saat        text default '', -- 'HH:MM' (isteğe bağlı)
  renk        text default 'kisisel', -- kisisel | is | acil | diger
  done        boolean default false,
  created_at  timestamptz default now()
);

-- Satır düzeyi güvenlik
alter table public.ajanda enable row level security;

-- Aynı ada sahip eski policy varsa temizle (idempotent)
drop policy if exists "ajanda_select_own" on public.ajanda;
drop policy if exists "ajanda_insert_own" on public.ajanda;
drop policy if exists "ajanda_update_own" on public.ajanda;
drop policy if exists "ajanda_delete_own" on public.ajanda;

create policy "ajanda_select_own" on public.ajanda
  for select using (auth.uid() = user_id);

create policy "ajanda_insert_own" on public.ajanda
  for insert with check (auth.uid() = user_id);

create policy "ajanda_update_own" on public.ajanda
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "ajanda_delete_own" on public.ajanda
  for delete using (auth.uid() = user_id);

-- Kullanıcıya göre hızlı listeleme
create index if not exists ajanda_user_tarih_idx on public.ajanda (user_id, tarih);
