// ══════════════════════════════════════════════════════════════
// GECE OTOMATİK BULUT YEDEĞİ — Supabase Edge Function
// ══════════════════════════════════════════════════════════════
// Ne yapar: Veritabanındaki tüm uygulama tablolarını JSON olarak
// dışa aktarır ve Supabase Storage'daki "backups" bucket'ına yazar.
// Kim çağırır: pg_cron + pg_net ile her gece otomatik (bkz. ../nightly-backup-cron.sql)
// Manuel test: Supabase Dashboard > Edge Functions > nightly-backup > Invoke
//
// SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri Supabase
// tarafından her Edge Function'a OTOMATİK enjekte edilir — elle secret
// tanımlamanıza gerek yok. Service role anahtarı RLS'i atlar, bu yüzden
// bu fonksiyon TÜM kullanıcıların tüm verisini eksiksiz yedekler.
// ══════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// index.html'deki _YEDEK_SB_KEYS listesiyle aynı tutulmalı — yeni bir
// modül/tablo eklenirse (örn. yeni bir Supabase tablosu) buraya da ekleyin.
const YEDEKLENECEK_TABLOLAR = [
  'muvekkiller', 'davalar', 'icralar', 'kisiler', 'contacts',
  'finans', 'odeme_planlari', 'tasks', 'belgeler', 'icra_belgeler',
  'icra_masraflar', 'notlar', 'cari', 'uets_kayitlar', 'dosya_chatter',
];

const BACKUP_BUCKET = 'backups';
// Bu süreden eski yedekler otomatik silinir (depolama şişmesin diye)
const SAKLAMA_GUN = 30;

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const backup: Record<string, unknown> = {
      version: 1,
      tarih: new Date().toISOString(),
      data: {} as Record<string, unknown[]>,
    };
    const ozet: Record<string, number | string> = {};

    for (const tablo of YEDEKLENECEK_TABLOLAR) {
      const { data, error } = await admin.from(tablo).select('*');
      if (error) {
        console.error(`[${tablo}] okunamadı:`, error.message);
        ozet[tablo] = `HATA: ${error.message}`;
        continue;
      }
      (backup.data as Record<string, unknown[]>)[tablo] = data ?? [];
      ozet[tablo] = (data ?? []).length;
    }

    const dosyaAdi = `yedek-${new Date().toISOString().slice(0, 10)}.json`;
    const icerik = JSON.stringify(backup, null, 2);

    const { error: uploadErr } = await admin.storage
      .from(BACKUP_BUCKET)
      .upload(dosyaAdi, new Blob([icerik], { type: 'application/json' }), {
        upsert: true, // aynı gün tekrar çalışırsa üzerine yazsın
      });

    if (uploadErr) {
      throw new Error(`Storage yükleme hatası: ${uploadErr.message}`);
    }

    // Eski yedekleri temizle (SAKLAMA_GUN'dan eski olanlar)
    let silinenSayisi = 0;
    try {
      const { data: dosyalar } = await admin.storage.from(BACKUP_BUCKET).list();
      const sinirTarih = Date.now() - SAKLAMA_GUN * 86400000;
      const silinecekler = (dosyalar ?? [])
        .filter((f) => {
          const m = f.name.match(/^yedek-(\d{4}-\d{2}-\d{2})\.json$/);
          if (!m) return false;
          return new Date(m[1] + 'T00:00:00Z').getTime() < sinirTarih;
        })
        .map((f) => f.name);
      if (silinecekler.length) {
        await admin.storage.from(BACKUP_BUCKET).remove(silinecekler);
        silinenSayisi = silinecekler.length;
      }
    } catch (e) {
      console.warn('Eski yedek temizleme hatası (kritik değil):', e);
    }

    return new Response(
      JSON.stringify({ basarili: true, dosyaAdi, ozet, eskiYedekSilindi: silinenSayisi }, null, 2),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('Yedekleme hatası:', e);
    return new Response(
      JSON.stringify({ basarili: false, hata: String(e) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
