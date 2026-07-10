-- ============================================================
-- HUKUK OFİSİ — Supabase Schema (tam kurulum)
-- Tüm tablolar, RLS politikaları ve indeksler
-- ============================================================

-- UUID uzantısı
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. MÜVEKKILLER
-- ────────────────────────────────────────────────────────────
create table if not exists muvekkiller (
  id        text primary key,
  ad        text not null,
  tur       text not null default 'bireysel', -- bireysel | kurumsal
  tc        text,
  vergi     text,
  tel       text,
  email     text,
  adres     text,
  sektor    text,
  notlar    text,
  detaylar  jsonb default '{}'::jsonb,
  user_id   uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table muvekkiller enable row level security;
create policy "Kendi müvekkilleri" on muvekkiller
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_muvekkiller_user on muvekkiller(user_id);


-- ────────────────────────────────────────────────────────────
-- 2. KİŞİLER (üçüncü taraflar)
-- ────────────────────────────────────────────────────────────
create table if not exists kisiler (
  id        text primary key,
  ad        text not null,
  rol       text,
  dosya     text,
  tel       text,
  email     text,
  detaylar  jsonb default '{}'::jsonb,
  user_id   uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table kisiler enable row level security;
create policy "Kendi kişileri" on kisiler
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_kisiler_user on kisiler(user_id);


-- ────────────────────────────────────────────────────────────
-- 3. CONTACTS (müvekkil/kişi bağlantılı irtibat kişileri)
-- ────────────────────────────────────────────────────────────
create table if not exists contacts (
  id           text primary key,
  account_id   text not null,   -- muvekkil.id veya kisi.id
  account_type text not null,   -- 'muvekkil' | 'kisi'
  ad           text not null,
  unvan        text,
  departman    text,
  tel          text,
  email        text,
  notlar       text,
  user_id      uuid references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

alter table contacts enable row level security;
create policy "Kendi contactları" on contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_contacts_user       on contacts(user_id);
create index if not exists idx_contacts_account    on contacts(account_id, account_type);


-- ────────────────────────────────────────────────────────────
-- 4. DAVALAR
-- ────────────────────────────────────────────────────────────
create table if not exists davalar (
  id         text primary key,
  no         text,
  ad         text,
  konu       text,
  cesit      text,
  muvekkil   text,
  karsi      text,
  mahkeme    text,
  durum      text default 'Aktif',
  durusma    date,
  sonraki    date,
  detaylar   jsonb default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table davalar enable row level security;
create policy "Kendi davaları" on davalar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_davalar_user     on davalar(user_id);
create index if not exists idx_davalar_muvekkil on davalar(muvekkil);
create index if not exists idx_davalar_durum    on davalar(durum);


-- ────────────────────────────────────────────────────────────
-- 5. İCRALAR
-- ────────────────────────────────────────────────────────────
create table if not exists icralar (
  id         text primary key,
  no         text,
  borclu     text,
  muvekkil   text,
  alacak     numeric(15,2) default 0,
  faiz       numeric(8,4) default 0,
  durum      text default 'Aktif',
  detaylar   jsonb default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table icralar enable row level security;
create policy "Kendi icraları" on icralar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_icralar_user     on icralar(user_id);
create index if not exists idx_icralar_muvekkil on icralar(muvekkil);


-- ────────────────────────────────────────────────────────────
-- 6. FİNANS (tahsilat, masraf, gider kayıtları)
-- ────────────────────────────────────────────────────────────
create table if not exists finans (
  id         text primary key,
  tur        text not null,
  tutar      numeric(15,2) not null default 0,
  muvekkil   text,
  tarih      date,
  dava_id    text,
  icra_id    text,
  aciklama   text,
  detaylar   jsonb default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table finans enable row level security;
create policy "Kendi finans kayıtları" on finans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_finans_user     on finans(user_id);
create index if not exists idx_finans_muvekkil on finans(muvekkil);
create index if not exists idx_finans_tur      on finans(tur);
create index if not exists idx_finans_tarih    on finans(tarih);


-- ────────────────────────────────────────────────────────────
-- 7. DAVA MASRAFLAR (dava detay masraf takibi)
-- ────────────────────────────────────────────────────────────
create table if not exists dava_masraflar (
  id          text primary key,
  dava_id     text not null,
  muvekkil    text,          -- muvekkilAd
  tur         text,
  tutar       numeric(15,2) not null default 0,
  tarih       date,
  aciklama    text,
  user_id     uuid references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table dava_masraflar enable row level security;
create policy "Kendi dava masrafları" on dava_masraflar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_dava_masraflar_user     on dava_masraflar(user_id);
create index if not exists idx_dava_masraflar_dava_id  on dava_masraflar(dava_id);
create index if not exists idx_dava_masraflar_muvekkil on dava_masraflar(muvekkil);


-- ────────────────────────────────────────────────────────────
-- 8. İCRA MASRAFLAR
-- ────────────────────────────────────────────────────────────
create table if not exists icra_masraflar (
  id         text primary key,
  icra_id    text,
  tur        text,
  tutar      numeric(15,2) not null default 0,
  tarih      date,
  aciklama   text,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table icra_masraflar enable row level security;
create policy "Kendi icra masrafları" on icra_masraflar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_icra_masraflar_user    on icra_masraflar(user_id);
create index if not exists idx_icra_masraflar_icra_id on icra_masraflar(icra_id);


-- ────────────────────────────────────────────────────────────
-- 9. ÖDEME PLANLARI
-- ────────────────────────────────────────────────────────────
create table if not exists odeme_planlari (
  id         text primary key,
  muvekkil   text,
  dosya      text,
  toplam     numeric(15,2) default 0,
  aciklama   text,
  periyot    text default 'aylik',
  taksitler  jsonb default '[]'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table odeme_planlari enable row level security;
create policy "Kendi ödeme planları" on odeme_planlari
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_odeme_planlari_user     on odeme_planlari(user_id);
create index if not exists idx_odeme_planlari_muvekkil on odeme_planlari(muvekkil);


-- ────────────────────────────────────────────────────────────
-- 10. TASKS (görevler ve duruşmalar)
-- ────────────────────────────────────────────────────────────
create table if not exists tasks (
  id         text primary key,
  tip        text default 'gorev',  -- gorev | durusma | haticirlatici
  baslik     text not null,
  tarih      text,
  oncelik    text,
  ilgili     text,
  done       boolean default false,
  detaylar   jsonb default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;
create policy "Kendi görevler" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_tasks_user  on tasks(user_id);
create index if not exists idx_tasks_tarih on tasks(tarih);
create index if not exists idx_tasks_done  on tasks(done);


-- ────────────────────────────────────────────────────────────
-- 11. BELGELER (dava belgeleri)
-- ────────────────────────────────────────────────────────────
create table if not exists belgeler (
  id         text primary key,
  ad         text,
  tur        text,
  tarih      text,
  url        text,
  yol        text,
  dava_id    text,
  detaylar   jsonb default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table belgeler enable row level security;
create policy "Kendi belgeleri" on belgeler
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_belgeler_user    on belgeler(user_id);
create index if not exists idx_belgeler_dava_id on belgeler(dava_id);


-- ────────────────────────────────────────────────────────────
-- 12. İCRA BELGELER
-- ────────────────────────────────────────────────────────────
create table if not exists icra_belgeler (
  id         text primary key,
  ad         text,
  tur        text,
  tarih      text,
  url        text,
  icra_id    text,
  detaylar   jsonb default '{}'::jsonb,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table icra_belgeler enable row level security;
create policy "Kendi icra belgeleri" on icra_belgeler
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_icra_belgeler_user    on icra_belgeler(user_id);
create index if not exists idx_icra_belgeler_icra_id on icra_belgeler(icra_id);


-- ────────────────────────────────────────────────────────────
-- 13. NOTLAR
-- ────────────────────────────────────────────────────────────
create table if not exists notlar (
  id         text primary key,
  baslik     text,
  ilgili     text,
  icerik     text,
  user_id    uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table notlar enable row level security;
create policy "Kendi notları" on notlar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_notlar_user on notlar(user_id);


-- ────────────────────────────────────────────────────────────
-- 14. CARİ (genel cari hareketler)
-- ────────────────────────────────────────────────────────────
create table if not exists cari (
  id           text primary key,
  tarih        text,
  tur          text,
  tutar        numeric(15,2) default 0,
  aciklama     text,
  muvekkil_id  text,
  not_         text,
  user_id      uuid references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

alter table cari enable row level security;
create policy "Kendi cari kayıtları" on cari
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_cari_user       on cari(user_id);
create index if not exists idx_cari_muvekkil   on cari(muvekkil_id);


-- ────────────────────────────────────────────────────────────
-- 15. UETS KAYITLAR (elektronik tebligat)
-- ────────────────────────────────────────────────────────────
create table if not exists uets_kayitlar (
  id                  text primary key,
  tebligat_no         text,
  gonderen            text,
  konu                text,
  dosya_no            text,
  teblig_tarihi       text,
  notlar              text,
  dava_id             text,
  okunma_tarihi       date,
  son_sure_tarihi     date,
  son_basvuru_tarihi  date,
  durum               text default 'okunmadi',
  hukuki_sure_gun     numeric,
  user_id             uuid references auth.users(id) on delete cascade,
  created_at          timestamptz not null default now()
);

alter table uets_kayitlar enable row level security;
create policy "Kendi UETS kayıtları" on uets_kayitlar
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_uets_user    on uets_kayitlar(user_id);
create index if not exists idx_uets_dava_id on uets_kayitlar(dava_id);
create index if not exists idx_uets_durum   on uets_kayitlar(durum);


-- ────────────────────────────────────────────────────────────
-- 16. DOSYA CHATTER (dosya içi mesajlaşma / not akışı)
-- ────────────────────────────────────────────────────────────
create table if not exists dosya_chatter (
  id               text primary key,
  dosya_tipi       text not null,  -- 'dava' | 'icra'
  dosya_id         text not null,
  parent_id        text,
  yazar            text,
  metin            text,
  ekler            jsonb default '[]'::jsonb,
  tepkiler         jsonb default '{}'::jsonb,
  duzenleme_tarih  timestamptz,
  user_id          uuid references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now()
);

alter table dosya_chatter enable row level security;
create policy "Kendi chatter mesajları" on dosya_chatter
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_chatter_user     on dosya_chatter(user_id);
create index if not exists idx_chatter_dosya    on dosya_chatter(dosya_id, dosya_tipi);
create index if not exists idx_chatter_parent   on dosya_chatter(parent_id);
create index if not exists idx_chatter_created  on dosya_chatter(created_at);
