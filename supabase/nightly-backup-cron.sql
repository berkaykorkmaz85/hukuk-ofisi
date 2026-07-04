-- ══════════════════════════════════════════════════════════════
-- GECE OTOMATİK BULUT YEDEĞİ — Zamanlama Kurulumu
-- ══════════════════════════════════════════════════════════════
-- Bu SQL'i Supabase Dashboard > SQL Editor içinde BİR KEZ çalıştırın.
-- Önce nightly-backup Edge Function'ının deploy edilmiş olması gerekir
-- (bkz. ../YEDEKLEME_KURULUM.md).
--
-- Servis rolü anahtarını doğrudan bu SQL'e YAZMAYIN — Supabase Vault'a
-- güvenli şekilde saklanır (SQL Editor geçmişinde düz metin olarak
-- kalmaz). Adım adım: Dashboard > Project Settings > Vault > New Secret
--   Name:  service_role_key
--   Value: (Project Settings > API sayfasındaki "service_role" anahtarı)
-- Kaydettikten sonra aşağıdaki SQL'i çalıştırın.
-- ══════════════════════════════════════════════════════════════

-- 1) Gerekli eklentileri aç (Supabase projelerinde genelde hazır gelir)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- 2) Varsa eski zamanlamayı kaldır (yeniden çalıştırılabilir olsun diye)
select cron.unschedule('gece-bulut-yedegi') where exists (
  select 1 from cron.job where jobname = 'gece-bulut-yedegi'
);

-- 3) Her gece TSİ 02:00'de çalışacak şekilde zamanla
--    (Supabase Postgres UTC kullanır; TSİ = UTC+3 → 02:00 TSİ = 23:00 UTC bir önceki gün)
--    Proje referansı (cbxgdnwunvjndiwwzcfn) index.html'deki _HUKUK_CONFIG'ten
--    alınmıştır — başka bir projeye taşırsanız burayı güncelleyin.
select cron.schedule(
  'gece-bulut-yedegi',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://cbxgdnwunvjndiwwzcfn.supabase.co/functions/v1/nightly-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4) Kontrol: zamanlama kayıtlı mı?
select jobid, jobname, schedule, active from cron.job where jobname = 'gece-bulut-yedegi';

-- 5) (Opsiyonel) Geçmiş çalıştırmaların loglarını görmek için:
-- select * from cron.job_run_details
-- where jobid = (select jobid from cron.job where jobname = 'gece-bulut-yedegi')
-- order by start_time desc limit 20;
