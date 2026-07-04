# Gece Otomatik Bulut Yedeği — Kurulum

Bu klasördeki dosyalar, Supabase veritabanınızdaki tüm verileri her gece
otomatik olarak `backups` adlı bir Storage bucket'ına JSON olarak yedekler.
Uygulamadaki "JSON İndir" (manuel, tarayıcıdan) özelliğinden bağımsızdır —
bu, sunucu tarafında, siz hiçbir şey yapmadan çalışan bir güvenlik ağıdır.

Aşağıdaki adımları **bir kez** yapmanız yeterli. Hepsi ~10-15 dakika sürer.

## 1) Supabase CLI'yi kurun (yoksa)

```bash
brew install supabase/tap/supabase
```

## 2) Giriş yapın ve projeyi bağlayın

Terminalde bu proje klasörünün İÇİNDE (`hukuk-ofisi/`) çalıştırın:

```bash
cd ~/Desktop/hukuk-ofisi
supabase login
supabase link --project-ref cbxgdnwunvjndiwwzcfn
```

`login` sizi tarayıcıya yönlendirip Supabase hesabınızla giriş yaptıracak.
`link` işleminde proje veritabanı şifrenizi (Dashboard'da oluşturduğunuz)
isteyebilir.

## 3) "backups" adında bir Storage bucket'ı oluşturun

Supabase Dashboard → **Storage** → **New bucket**
- İsim: `backups`
- **Public bucket** kutucuğunu İŞARETLEMEYİN (özel/private kalsın — yedekler
  hassas veri içerir).

## 4) Edge Function'ı deploy edin

```bash
supabase functions deploy nightly-backup
```

Bu komut `supabase/functions/nightly-backup/index.ts` dosyasını Supabase'e
yükler. `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` gibi gerekli ortam
değişkenlerini Supabase otomatik sağlar — elle bir şey ayarlamanıza gerek yok.

## 5) Servis anahtarını Vault'a ekleyin (zamanlama için gerekli)

Supabase Dashboard → **Project Settings** → **Vault** → **New Secret**
- Name: `service_role_key`
- Value: Project Settings → **API** sayfasındaki **service_role** anahtarı
  (⚠️ bu anahtarı asla paylaşmayın, koda/repoya koymayın — sadece Vault'a).

## 6) Gece zamanlamasını kurun

Supabase Dashboard → **SQL Editor** → yeni sorgu → içine
[`nightly-backup-cron.sql`](nightly-backup-cron.sql) dosyasının **tamamını**
yapıştırıp çalıştırın. Bu, her gece TSİ 02:00'de fonksiyonu otomatik
tetikleyecek zamanlamayı (`pg_cron` + `pg_net`) kurar.

## Test edin

Kurulumdan hemen sonra elle bir kez tetikleyip çalıştığını doğrulayın:

```bash
supabase functions invoke nightly-backup
```

veya Dashboard → **Edge Functions** → `nightly-backup` → **Invoke**.
Ardından Dashboard → **Storage** → `backups` içinde `yedek-2026-07-05.json`
gibi bir dosya oluştuğunu görmelisiniz. İçini açıp verilerinizin gerçekten
dolu geldiğini kontrol edin.

## Nasıl çalışıyor / neyi kapsıyor

- Her gece, `davalar`, `icralar`, `muvekkiller`, `kisiler`, `contacts`,
  `finans`, `odeme_planlari`, `tasks`, `belgeler`, `icra_belgeler`,
  `icra_masraflar`, `notlar`, `cari`, `uets_kayitlar`, `dosya_chatter`
  tablolarının tamamı tek bir JSON dosyasına yazılır.
- Dosya adı o günün tarihini taşır (`yedek-YYYY-MM-DD.json`); aynı gün
  tekrar çalışırsa üzerine yazar (çift kayıt birikmez).
- **30 günden eski yedekler otomatik silinir** (depolama şişmesin diye) —
  bu süreyi değiştirmek isterseniz `index.ts` içindeki `SAKLAMA_GUN`
  sabitini güncelleyip yeniden `supabase functions deploy nightly-backup`
  yapmanız yeterli.
- Yeni bir Supabase tablosu eklerseniz (örn. gelecekte "cari" gibi başka bir
  modül), `index.ts` içindeki `YEDEKLENECEK_TABLOLAR` listesine de eklemeyi
  unutmayın — aksi halde o tablo yedeğe girmez.
- Yüklenen dosyaların (Storage `chatter-files` bucket'ındaki belgeler,
  fotoğraflar) kendisi bu yedeğe dahil DEĞİLDİR — onlar zaten Supabase
  Storage'da kalıcı olarak durur, ayrıca kopyalamaya gerek yoktur.

## Sorun giderme

- **Fonksiyon "Bearer token" hatası veriyorsa:** Vault'a eklediğiniz
  `service_role_key` değerinin doğru kopyalandığından emin olun (baş/son
  boşluk olmasın).
- **Zamanlamanın çalışıp çalışmadığını görmek için:**
  ```sql
  select * from cron.job_run_details
  where jobid = (select jobid from cron.job where jobname = 'gece-bulut-yedegi')
  order by start_time desc limit 20;
  ```
- **Bucket adını değiştirdiyseniz:** `index.ts` içindeki `BACKUP_BUCKET`
  sabitini de güncelleyip yeniden deploy edin.
