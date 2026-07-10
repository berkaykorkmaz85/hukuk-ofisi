// Bu dosya index.html'den ayrildi (kod tasinmadan, sadece dosya sinirlari
// eklendi) — tek dosyanin git diff/inceleme/gezinme zorlugunu azaltmak icin.
// Yukleme sirasi index.html'deki eski calisma sirasiyla AYNIDIR, degistirmeyin.

function showGcalPrompt(task) {
  const el = document.getElementById('notification');
  el.innerHTML = `
    <div style="margin-bottom:8px;font-weight:500">✓ Görev kaydedildi!</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:10px">Google Takvim'e eklemek ister misiniz?</div>
    <div style="display:flex;gap:8px">
      <button onclick="openGcal('${task.id}');document.getElementById('notification').style.display='none'"
        style="background:var(--gold);color:#1a1600;border:none;padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;flex:1">
        📅 Google Takvime Ekle
      </button>
      <button onclick="document.getElementById('notification').style.display='none'"
        style="background:transparent;color:var(--text3);border:1px solid var(--border2);padding:6px 10px;border-radius:6px;font-size:12px;cursor:pointer">
        Geç
      </button>
    </div>
  `;
  el.style.display = 'block';
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.style.display = 'none', 8000);
}

function deleteTask(id) {
  showConfirmModal('Bu görevi silmek istediğinizden emin misiniz?', function() {
    DB.set('tasks', DB.get('tasks').filter(x=>x.id!==id));
    renderTasks();
    if (isCalendarVisible()) renderCalendar();
    notify('Görev silindi');
  });
}

function scheduleReminder(task) {
  const ms = new Date(task.hatirlatma) - Date.now();
  if (ms > 0 && ms < 86400000*7) {
    setTimeout(() => notify(`⏰ Hatırlatma: ${task.baslik}`), ms);
  }
}

// Açılışta: geçmişte kalan (kaçırılmış) hatırlatmaları kontrol et ve bildir.
// Hatırlatmalar yalnız sayfa açıkken çalışır (setTimeout), sayfa kapalıysa
// hiç tetiklenmez — bu fonksiyon en azından son 24 saatteki kaçırılmışları bildirir.
function _kacirilmisHatirlatmalariKontrolEt() {
  try {
    const simdi = Date.now();
    const bir_gun_once = simdi - 86400000;
    const tasks = DB.get('tasks') || [];
    const kacirilmislar = tasks.filter(function(t) {
      if (t.done || !t.hatirlatma) return false;
      const ms = new Date(t.hatirlatma).getTime();
      return ms > bir_gun_once && ms < simdi;
    });
    if (kacirilmislar.length === 1) {
      notify('⏰ Kaçırılmış hatırlatma: ' + kacirilmislar[0].baslik);
    } else if (kacirilmislar.length > 1) {
      notify('⏰ ' + kacirilmislar.length + ' kaçırılmış hatırlatma var');
    }
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════════
// 📨 UETS / e-TEBLIGAT KAYIT DEFTERİ
// ══════════════════════════════════════════════════════════════

window._uetsEditingId = null;

// 5 iş günü ekle (pazar + resmi tatil atlanır, dini bayramlar için sync değil basit kontrol)
function _uets5IsGunu(baslangicISO) {
  const tarih = new Date(baslangicISO);
  tarih.setHours(0, 0, 0, 0);
  let kalan = 5;
  while (kalan > 0) {
    tarih.setDate(tarih.getDate() + 1);
    const gun = tarih.getDay();
    const ay = tarih.getMonth();
    const d = tarih.getDate();
    const tatil = _RESMI_TATILLER_SABIT.some(t => t.ay === ay && t.gun === d);
    if (gun !== 0 && !tatil) kalan--;
  }
  return tarih.toISOString().slice(0, 10);
}

// Son başvuru tarihi = okunmuş sayılma + hukuki süre (takvim günü)
function _uetsSonBasvuruTarihi(okunmaSayilmaTarihi, hukukiSureGun) {
  if (!okunmaSayilmaTarihi || !hukukiSureGun) return null;
  const t = new Date(okunmaSayilmaTarihi);
  t.setDate(t.getDate() + hukukiSureGun);
  // Son gün pazar veya resmi tatilse ertesi iş gününe kaydır
  while (t.getDay() === 0 || _RESMI_TATILLER_SABIT.some(r => r.ay === t.getMonth() && r.gun === t.getDate())) {
    t.setDate(t.getDate() + 1);
  }
  return t.toISOString().slice(0, 10);
}

// Süre butonu seçilince
function _uetsSureSec(gun) {
  if (!gun || gun < 1) return;
  document.getElementById('uets-sure-gun').value = gun;
  // Buton görünümlerini güncelle
  document.querySelectorAll('.uets-sure-btn').forEach(function(btn) {
    const btnGun = parseInt(btn.textContent);
    const secili = btnGun === gun;
    btn.style.background = secili ? 'rgba(201,168,76,0.15)' : 'var(--bg3)';
    btn.style.borderColor = secili ? 'var(--gold)' : 'var(--border)';
    btn.style.color = secili ? 'var(--gold)' : 'var(--text2)';
    btn.style.fontWeight = secili ? '600' : '400';
  });
  _uetsModalHesapla();
}

// Tarih veya süre değişince hesapla ve göster
function _uetsModalHesapla() {
  const tarih = document.getElementById('uets-tarih').value;
  const sure = parseInt(document.getElementById('uets-sure-gun').value) || 14;
  const hesapEl = document.getElementById('uets-modal-hesap');
  if (!tarih) { if (hesapEl) hesapEl.style.display = 'none'; return; }
  const okunma = _uets5IsGunu(tarih);
  const sonBasv = _uetsSonBasvuruTarihi(okunma, sure);
  const okunmaEl = document.getElementById('uets-modal-okunma');
  const sonBasvEl = document.getElementById('uets-modal-sonbasv');
  if (okunmaEl) okunmaEl.textContent = fmtDate(okunma);
  if (sonBasvEl) sonBasvEl.textContent = sonBasv ? fmtDate(sonBasv) : '—';
  if (hesapEl) hesapEl.style.display = '';
}

function _pttSekme(sekme) {
  document.getElementById('ptt-bolum-sorgu').style.display = sekme === 'sorgu' ? '' : 'none';
  document.getElementById('ptt-bolum-uets').style.display = sekme === 'uets' ? '' : 'none';
  const s1 = document.getElementById('ptt-sekme-sorgu');
  const s2 = document.getElementById('ptt-sekme-uets');
  if (s1) { s1.style.borderBottomColor = sekme === 'sorgu' ? 'var(--gold)' : 'transparent'; s1.style.color = sekme === 'sorgu' ? 'var(--gold)' : 'var(--text3)'; }
  if (s2) { s2.style.borderBottomColor = sekme === 'uets' ? 'var(--gold)' : 'transparent'; s2.style.color = sekme === 'uets' ? 'var(--gold)' : 'var(--text3)'; }
  if (sekme === 'uets') _uetsRender();
}

function _uetsRender() {
  const kayitlar = (DB.get('uets_kayitlar') || []).slice().sort(function(a, b) {
    return new Date(b.tebligTarihi) - new Date(a.tebligTarihi);
  });
  const bugun = new Date(); bugun.setHours(0,0,0,0);

  // Otomatik durum güncelleme: süresi dolmuş ama hâlâ 'okunmadi' olanları işaretle
  let degisti = false;
  const guncellendi = kayitlar.map(function(k) {
    if (k.durum === 'okunmadi' && k.sonSureTarihi && new Date(k.sonSureTarihi) < bugun) {
      degisti = true;
      return Object.assign({}, k, { durum: 'sure_doldu' });
    }
    return k;
  });
  if (degisti) DB.set('uets_kayitlar', guncellendi);

  const liste = degisti ? guncellendi : kayitlar;

  // Özet
  const okunmadi = liste.filter(function(k) { return k.durum === 'okunmadi'; }).length;
  const sureDoldu = liste.filter(function(k) { return k.durum === 'sure_doldu'; }).length;
  const okundu = liste.filter(function(k) { return k.durum === 'okundu'; }).length;
  const ozet = document.getElementById('uets-ozet');
  if (ozet) {
    ozet.innerHTML =
      '<div style="background:var(--bg2);border:1px solid rgba(192,83,58,0.4);border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Okunmadı</div><div style="font-size:22px;font-weight:800;color:var(--red)">' + okunmadi + '</div></div>' +
      '<div style="background:var(--bg2);border:1px solid rgba(201,168,76,0.4);border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Süresi Doldu</div><div style="font-size:22px;font-weight:800;color:var(--gold)">' + sureDoldu + '</div></div>' +
      '<div style="background:var(--bg2);border:1px solid rgba(74,140,92,0.4);border-radius:10px;padding:12px 14px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Okundu</div><div style="font-size:22px;font-weight:800;color:var(--green)">' + okundu + '</div></div>';
  }

  const listeEl = document.getElementById('uets-liste');
  if (!listeEl) return;

  if (!liste.length) {
    listeEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">📨</div><div>Henüz tebligat kaydı yok</div><div style="font-size:12px;margin-top:6px">+ Tebligat Ekle butonunu kullanın</div></div>';
    return;
  }

  listeEl.innerHTML = liste.map(function(k) {
    const sure = k.sonSureTarihi ? new Date(k.sonSureTarihi) : null;
    const kalanGun = sure ? Math.ceil((sure - bugun) / 86400000) : null;
    const gecti = kalanGun !== null && kalanGun < 0;
    const yakin = kalanGun !== null && kalanGun >= 0 && kalanGun <= 2;

    const durumRenk = k.durum === 'okundu' ? 'var(--green)' : k.durum === 'sure_doldu' ? 'var(--red)' : yakin ? 'var(--gold)' : 'var(--text2)';
    const durumMetin = k.durum === 'okundu' ? '✅ Okundu' : k.durum === 'sure_doldu' ? '⚠️ Süre Doldu' : kalanGun === null ? '📨 Okunmadı' : kalanGun === 0 ? '🔴 BUGÜN SON GÜN' : gecti ? '🔴 Süre Doldu' : yakin ? `🟡 ${kalanGun} gün kaldı` : `📨 ${kalanGun} gün kaldı`;

    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;display:flex;gap:12px;align-items:start' + (k.durum === 'sure_doldu' ? ';border-left:3px solid var(--red)' : yakin && k.durum !== 'okundu' ? ';border-left:3px solid var(--gold)' : '') + '">' +
      '<div style="flex:1;min-width:0">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
          '<span style="font-size:13px;font-weight:600;color:var(--text)">' + escHtml(k.konu) + '</span>' +
          '<span style="font-size:11px;font-weight:700;color:' + durumRenk + ';background:rgba(255,255,255,0.06);padding:1px 7px;border-radius:10px">' + durumMetin + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--text3)">' +
          (k.gonderen ? '<span>🏛 ' + escHtml(k.gonderen) + '</span>' : '') +
          (k.tebligatNo ? '<span>📋 ' + escHtml(k.tebligatNo) + '</span>' : '') +
          '<span>📅 Tebliğ: ' + fmtDate(k.tebligTarihi) + '</span>' +
          (k.sonSureTarihi && k.durum !== 'okundu' ? '<span>👁 Okunmuş sayılma: ' + fmtDate(k.sonSureTarihi) + '</span>' : '') +
          (k.sonBasvuruTarihi ? '<span style="color:var(--gold);font-weight:600">⚖️ Son başvuru: ' + fmtDate(k.sonBasvuruTarihi) + (k.hukukiSureGun ? ' (' + k.hukukiSureGun + ' gün)' : '') + '</span>' : '') +
          (k.dosyaNo ? '<span>📁 ' + escHtml(k.dosyaNo) + '</span>' : '') +
        '</div>' +
        (k.notlar ? '<div style="font-size:11px;color:var(--text3);margin-top:4px">' + escHtml(k.notlar) + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:4px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end">' +
        (k.durum !== 'okundu' ? '<button onclick="_uetsOkundu(\'' + k.id + '\')" style="font-size:10px;background:rgba(74,140,92,0.15);border:1px solid rgba(74,140,92,0.3);border-radius:6px;color:var(--green);padding:4px 8px;cursor:pointer;font-family:inherit">✓ Okundu</button>' : '') +
        '<button onclick="_uetsDuzenle(\'' + k.id + '\')" class="btn btn-ghost" style="font-size:11px">✏</button>' +
        '<button onclick="_uetsSil(\'' + k.id + '\')" class="btn btn-ghost" style="font-size:11px;color:var(--red)">🗑</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

function _uetsYeniKayitAc() {
  window._uetsEditingId = null;
  document.getElementById('modal-uets-title').textContent = '📨 Tebligat Ekle';
  document.getElementById('uets-konu').value = '';
  document.getElementById('uets-no').value = '';
  document.getElementById('uets-gonderen').value = '';
  document.getElementById('uets-tarih').value = new Date().toISOString().slice(0, 10);
  document.getElementById('uets-notlar').value = '';
  document.getElementById('uets-sure-gun').value = '14';
  document.getElementById('uets-error').textContent = '';
  const ozelEl = document.getElementById('uets-sure-ozel');
  if (ozelEl) ozelEl.value = '';
  // Dosya listesini doldur
  const sel = document.getElementById('uets-dosya');
  const davalar = DB.get('davalar') || [];
  const icralar = DB.get('icralar') || [];
  sel.innerHTML = '<option value="">— Dosya seçin (opsiyonel) —</option>'
    + '<optgroup label="📁 Davalar">' + davalar.map(d => `<option value="${escAttr(d.no)}">${escHtml(d.no)} — ${escHtml(d.muvekkil||'')}</option>`).join('') + '</optgroup>'
    + '<optgroup label="⚡ İcralar">' + icralar.map(i => `<option value="${escAttr(i.no)}">${escHtml(i.no)} — ${escHtml(i.borclu||'')}</option>`).join('') + '</optgroup>';
  // 14 gün default seçili göster
  _uetsSureSec(14);
  openModal('modal-uets');
}

function _uetsDuzenle(id) {
  const k = (DB.get('uets_kayitlar') || []).find(function(x) { return x.id === id; });
  if (!k) return;
  window._uetsEditingId = id;
  document.getElementById('modal-uets-title').textContent = '📨 Tebligat Düzenle';
  document.getElementById('uets-konu').value = k.konu || '';
  document.getElementById('uets-no').value = k.tebligatNo || '';
  document.getElementById('uets-gonderen').value = k.gonderen || '';
  document.getElementById('uets-tarih').value = k.tebligTarihi || '';
  document.getElementById('uets-notlar').value = k.notlar || '';
  document.getElementById('uets-error').textContent = '';
  // Hukuki süreyi geri yükle
  const sure = k.hukukiSureGun || 14;
  document.getElementById('uets-sure-gun').value = sure;
  const ozelEl = document.getElementById('uets-sure-ozel');
  if (ozelEl) ozelEl.value = '';
  // Dosya listesi
  const sel = document.getElementById('uets-dosya');
  const davalar = DB.get('davalar') || [];
  const icralar = DB.get('icralar') || [];
  sel.innerHTML = '<option value="">— Dosya seçin (opsiyonel) —</option>'
    + '<optgroup label="📁 Davalar">' + davalar.map(d => `<option value="${escAttr(d.no)}"${d.no===k.dosyaNo?' selected':''}>${escHtml(d.no)} — ${escHtml(d.muvekkil||'')}</option>`).join('') + '</optgroup>'
    + '<optgroup label="⚡ İcralar">' + icralar.map(i => `<option value="${escAttr(i.no)}"${i.no===k.dosyaNo?' selected':''}>${escHtml(i.no)} — ${escHtml(i.borclu||'')}</option>`).join('') + '</optgroup>';
  _uetsSureSec(sure);
  openModal('modal-uets');
}

function _uetsKaydet() {
  const konu = document.getElementById('uets-konu').value.trim();
  const tarih = document.getElementById('uets-tarih').value;
  const hukukiSureGun = parseInt(document.getElementById('uets-sure-gun').value) || 14;
  const errEl = document.getElementById('uets-error');
  if (!konu) { errEl.textContent = 'Konu zorunludur!'; return; }
  if (!tarih) { errEl.textContent = 'Tebligat tarihi zorunludur!'; return; }

  const okunmaSayilma = _uets5IsGunu(tarih);
  const sonBasvuruTarihi = _uetsSonBasvuruTarihi(okunmaSayilma, hukukiSureGun);

  const mevcutDurum = window._uetsEditingId
    ? ((DB.get('uets_kayitlar') || []).find(function(x) { return x.id === window._uetsEditingId; }) || {}).durum || 'okunmadi'
    : 'okunmadi';

  const obj = {
    id: window._uetsEditingId || DB.genId(),
    konu,
    tebligatNo: document.getElementById('uets-no').value.trim(),
    gonderen: document.getElementById('uets-gonderen').value.trim(),
    tebligTarihi: tarih,
    sonSureTarihi: okunmaSayilma,       // 5 iş günü = okunmuş sayılma tarihi
    hukukiSureGun,                       // seçilen hukuki süre (gün)
    sonBasvuruTarihi,                    // okunmuş sayılma + hukuki süre
    dosyaNo: document.getElementById('uets-dosya').value || '',
    notlar: document.getElementById('uets-notlar').value.trim(),
    durum: mevcutDurum,
    created: new Date().toISOString()
  };

  let arr = DB.get('uets_kayitlar') || [];
  if (window._uetsEditingId) arr = arr.map(function(x) { return x.id === window._uetsEditingId ? obj : x; });
  else arr = [obj, ...arr];
  DB.set('uets_kayitlar', arr);
  closeModal('modal-uets');
  _uetsRender();

  // Son başvuru tarihine otomatik görev aç
  if (sonBasvuruTarihi) {
    _uetsGorevAc(obj);
  }

  notify(window._uetsEditingId ? 'Tebligat güncellendi ✓' : 'Tebligat kaydedildi ✓');
  window._uetsEditingId = null;
}

// Son başvuru tarihi için görev modalını aç (kullanıcı onaylayacak)
function _uetsGorevAc(k) {
  const dosyaNo = k.dosyaNo || '';
  document.getElementById('modal-task-title').textContent = 'Görev Ekle';
  document.getElementById('t-baslik').value = '⚖️ Son başvuru: ' + k.konu + (dosyaNo ? ' (' + dosyaNo + ')' : '');
  document.getElementById('t-tarih').value = k.sonBasvuruTarihi;
  document.getElementById('t-tip').value = 'gorev';
  setTaskTip('gorev');
  document.getElementById('t-oncelik').value = 'Acil';
  const sel = document.getElementById('t-ilgili');
  if (sel && dosyaNo) {
    const davalar2 = DB.get('davalar') || [];
    const icralar2 = DB.get('icralar') || [];
    sel.innerHTML = '<option value="">— Genel görev —</option>'
      + '<optgroup label="📁 Davalar">' + davalar2.map(d => `<option value="${d.no}"${d.no===dosyaNo?' selected':''}>${d.no} — ${escHtml(d.muvekkil||'')}</option>`).join('') + '</optgroup>'
      + '<optgroup label="⚡ İcralar">' + icralar2.map(i => `<option value="${i.no}"${i.no===dosyaNo?' selected':''}>${i.no} — ${escHtml(i.borclu||'')}</option>`).join('') + '</optgroup>';
    if (dosyaNo) sel.value = dosyaNo;
  }
  openModal('modal-task');
}

function _uetsOkundu(id) {
  let arr = DB.get('uets_kayitlar') || [];
  const bugun = new Date().toISOString().slice(0, 10);
  arr = arr.map(function(k) {
    return k.id === id ? Object.assign({}, k, { durum: 'okundu', okunmaTarihi: bugun }) : k;
  });
  DB.set('uets_kayitlar', arr);
  _uetsRender();
  notify('✅ Tebligat okundu olarak işaretlendi');
}

function _uetsSil(id) {
  showConfirmModal('Bu tebligat kaydını silmek istediğinizden emin misiniz?', function() {
    DB.set('uets_kayitlar', (DB.get('uets_kayitlar') || []).filter(function(k) { return k.id !== id; }));
    _uetsRender();
    notify('Tebligat silindi');
  });
}

// Giriş sonrası yaklaşan UETS sürelerini kontrol et
function _uetsSureUyariKontrol() {
  try {
    const bugun = new Date(); bugun.setHours(0,0,0,0);
    const kayitlar = DB.get('uets_kayitlar') || [];
    const kritik = kayitlar.filter(function(k) {
      if (k.durum === 'okundu') return false;
      if (!k.sonSureTarihi) return false;
      const kalanGun = Math.ceil((new Date(k.sonSureTarihi) - bugun) / 86400000);
      return kalanGun >= 0 && kalanGun <= 2;
    });
    if (kritik.length === 1) notify('📨 UETS: "' + kritik[0].konu + '" — ' + (Math.ceil((new Date(kritik[0].sonSureTarihi) - bugun) / 86400000) === 0 ? 'Bugün son gün!' : 'Son 2 günde!'), true);
    else if (kritik.length > 1) notify('📨 ' + kritik.length + ' tebligatın süresi dolmak üzere!', true);
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════════
// 🧾 SMM (Serbest Meslek Makbuzu) HESAPLAYICI
// KDV %20, Stopaj %20 (GVK 94/2-b) — 2026 genel oranları.
// Gerçek kişi müvekkillerden stopaj kesilmez (GVK m.94).
// Karşı vekalet ücreti (mahkeme kararıyla) genelde KDV DAHİL kabul
// edilir, iç yüzde ile ayrıştırılır (311 seri no'lu GV Tebliği).
// ══════════════════════════════════════════════════════════════

window._smmTur = 'brutten';

const _SMM_TUR_ACIKLAMA = {
  brutten: 'Sözleşmede/anlaşmada belirlenen <strong style="color:var(--text2)">KDV hariç brüt hizmet bedelini</strong> girin — stopaj ve KDV bu tutar üzerinden hesaplanır.',
  kdvdahil: 'Mahkeme kararında hükmedilen <strong style="color:var(--text2)">KDV dahil karşı vekalet ücretini</strong> girin — brüt (KDV hariç) matrah iç yüzde ile ayrıştırılır (tutar ÷ 1,20).',
  netten: 'Elinize geçmesini istediğiniz <strong style="color:var(--text2)">net tahsilat tutarını</strong> girin — brüt matrah buna göre geriye doğru hesaplanır.'
};

function _smmTurSec(tur) {
  window._smmTur = tur;
  document.querySelectorAll('.smm-tur-btn').forEach(function(btn) {
    const secili = btn.dataset.tur === tur;
    btn.style.background = secili ? 'rgba(201,168,76,0.12)' : 'var(--bg3)';
    btn.style.borderColor = secili ? 'var(--gold)' : 'var(--border)';
    btn.style.color = secili ? 'var(--gold)' : 'var(--text2)';
  });
  document.getElementById('smm-tur-aciklama').innerHTML = _SMM_TUR_ACIKLAMA[tur];
  const label = document.getElementById('smm-tutar-label');
  if (label) label.textContent = tur === 'brutten' ? 'Brüt Tutar (KDV Hariç) (₺)' : tur === 'kdvdahil' ? 'KDV Dahil Tutar (₺)' : 'Net Tahsilat Tutarı (₺)';
  _smmHesapla();
}

function _smmFormatVeHesapla(inp) {
  // Basit rakam formatlama (binlik ayraç olmadan, sade sayı girişi)
  _smmHesapla();
}

function _smmTevkifatToggle(cb) {
  const wrap = document.getElementById('smm-tevkifat-oran-wrap');
  if (wrap) wrap.style.display = cb.checked ? '' : 'none';
  _smmHesapla();
}

function _smmHesapla() {
  const tutarRaw = document.getElementById('smm-tutar')?.value || '';
  const tutar = parsePara(tutarRaw) || 0;
  const sonucEl = document.getElementById('smm-sonuc');
  if (!tutar || tutar <= 0) { if (sonucEl) sonucEl.style.display = 'none'; return; }

  const aliciTur = document.getElementById('smm-alici-tur').value;
  const kdvOran = (parseFloat(document.getElementById('smm-kdv-oran').value) || 20) / 100;
  const stopajOran = aliciTur === 'tuzel' ? 0.20 : 0;
  const tevkifatVar = document.getElementById('smm-kdv-tevkifat')?.checked;
  const tevkifatOran = tevkifatVar ? parseFloat(document.getElementById('smm-tevkifat-oran')?.value || 0.5) : 0;

  // Tevkifat alanının görünürlüğünü senkronize et
  const tevkifatWrap = document.getElementById('smm-tevkifat-oran-wrap');
  if (tevkifatWrap) tevkifatWrap.style.display = tevkifatVar ? '' : 'none';

  let brut;
  const tur = window._smmTur;

  if (tur === 'brutten') {
    brut = tutar;
  } else if (tur === 'kdvdahil') {
    // KDV dahil tutar → iç yüzde ile brüt (KDV hariç) matrah bulunur
    brut = tutar / (1 + kdvOran);
  } else {
    // netten: Net = Brüt - Stopaj  →  Brüt = Net / (1 - stopajOran)
    brut = stopajOran > 0 ? tutar / (1 - stopajOran) : tutar;
  }

  const stopajTutari = brut * stopajOran;
  const netUcret = brut - stopajTutari;
  const kdvTutari = brut * kdvOran;
  const kdvTevkifatTutari = kdvTutari * tevkifatOran;
  const odenecekKdv = kdvTutari - kdvTevkifatTutari; // avukata fiilen ödenen KDV kısmı
  const netTahsilat = netUcret + odenecekKdv;
  const belgeToplami = brut + kdvTutari; // KDV dahil toplam belge tutarı

  // 2026 eşiği: KDV dahil 12.000 TL altında tevkifat uygulanmaz uyarısı
  const esikAltinda = tevkifatVar && belgeToplami < 12000;

  const sonucGrid = document.getElementById('smm-sonuc-grid');
  const satir = function(label, deger, renk, buyuk) {
    return '<div style="background:var(--bg3);border-radius:8px;padding:10px 14px' + (buyuk ? ';grid-column:1/-1' : '') + '">' +
      '<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:4px">' + label + '</div>' +
      '<div style="font-size:' + (buyuk ? '20px' : '15px') + ';font-weight:800;color:' + (renk || 'var(--text)') + ';font-family:\'DM Mono\',monospace">₺' + fmt(deger) + '</div>' +
    '</div>';
  };

  let html = '';
  html += satir('Brüt Hizmet Bedeli (KDV Hariç Matrah)', brut, 'var(--text)');
  html += satir('Gelir Vergisi Stopajı' + (stopajOran > 0 ? ' (%20)' : ' (Uygulanmaz)'), stopajTutari, stopajOran > 0 ? 'var(--red)' : 'var(--text3)');
  html += satir('Net Ücret (Brüt − Stopaj)', netUcret, 'var(--text2)');
  html += satir('KDV Tutarı (%' + Math.round(kdvOran*100) + ')', kdvTutari, 'var(--green)');
  if (tevkifatVar && !esikAltinda) {
    html += satir('KDV Tevkifatı (Alıcı Öder — ' + (tevkifatOran===0.5?'5/10':'9/10') + ')', kdvTevkifatTutari, 'var(--text3)');
    html += satir('Size Ödenecek KDV', odenecekKdv, 'var(--green)');
  }
  html += satir('💰 Net Tahsilat (Ele Geçecek Toplam)', netTahsilat, 'var(--gold)', true);
  html += satir('📄 KDV Dahil Belge (Makbuz) Toplamı', belgeToplami, 'var(--text2)');

  if (sonucGrid) sonucGrid.innerHTML = html;
  if (sonucEl) sonucEl.style.display = '';

  // Uyarı kutusu
  const uyariEl = document.getElementById('smm-uyari-kutu');
  if (uyariEl) {
    let uyarilar = [];
    if (esikAltinda) uyarilar.push('⚠️ KDV dahil belge toplamı (₺' + fmt(belgeToplami) + ') 2026 eşiği olan 12.000₺\'nin altında — KDV tevkifatı uygulanmamalıdır.');
    if (stopajOran === 0) uyarilar.push('ℹ️ Gerçek kişi (vergi mükellefi olmayan) müvekkillerden gelir vergisi stopajı kesilmez, sadece KDV uygulanır.');
    if (tur === 'kdvdahil') uyarilar.push('ℹ️ Mahkeme kararında "KDV hariç" ifadesi yoksa, hükmedilen tutarın KDV dahil olduğu kabul edilir (311 seri no\'lu GV Tebliği m.25/5).');
    if (Math.abs(stopajOran - kdvOran) < 0.001 && stopajOran > 0 && !tevkifatVar) uyarilar.push('💡 Stopaj oranı KDV oranına eşit olduğu için brüt tutar ile net tahsilat tutarı birbirine eşit çıkar.');
    uyariEl.innerHTML = uyarilar.length ? uyarilar.map(u => '<div style="margin-bottom:4px">' + u + '</div>').join('') : '<div>Hesaplama tamamlandı.</div>';
  }
}




// ========== NOTLAR ==========
function renderNotes(filter='') {
  let notes = DB.get('notlar');
  if (filter) notes = notes.filter(n => n.baslik.toLowerCase().includes(filter.toLowerCase()) || n.icerik.toLowerCase().includes(filter.toLowerCase()));
  notes = notes.sort((a,b)=>new Date(b.tarih)-new Date(a.tarih));
  document.getElementById('notes-container').innerHTML = notes.length ? notes.map(n=>`
    <div class="note-card" onclick="showNoteDetail('${n.id}')">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="note-card-title">${escHtml(n.baslik)}</div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-ghost" onclick="event.stopPropagation();editNote('${n.id}')">✏</button>
          <button class="btn btn-ghost" style="color:var(--red)" onclick="event.stopPropagation();deleteNote('${n.id}')">🗑</button>
        </div>
      </div>
      ${n.ilgili ? `<div style="font-size:11px;color:var(--gold);margin-bottom:4px">📁 ${escHtml(n.ilgili)}</div>` : ''}
      <div class="note-card-preview">${escHtml(n.icerik.slice(0,120))}${n.icerik.length>120?'...':''}</div>
      <div class="note-card-date">${fmtDate(n.tarih)}</div>
    </div>
  `).join('') : `<div class="empty"><div class="empty-icon">📝</div><div class="empty-text">Henüz not yok</div></div>`;
}

function searchNotes(v) { renderNotes(v); }

function showNoteDetail(id) {
  const n = DB.get('notlar').find(x=>x.id===id);
  if (!n) return;
  document.getElementById('note-detail').innerHTML = `
    <button class="btn btn-outline" onclick="showSubpage('note-list'); renderNotes()">← Geri</button>
    <div style="margin-top:20px" class="card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:22px;color:var(--text)">${escHtml(n.baslik)}</div>
          ${n.ilgili ? `<div style="font-size:12px;color:var(--gold);margin-top:4px">📁 ${escHtml(n.ilgili)}</div>` : ''}
          <div style="font-size:11px;color:var(--text3);margin-top:4px">${fmtDate(n.tarih)}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-outline" onclick="editNote('${n.id}')">✏ Düzenle</button>
          <button class="btn btn-danger" onclick="deleteNote('${n.id}')">Sil</button>
        </div>
      </div>
      <div class="divider"></div>
      <div style="color:var(--text2);line-height:1.8;font-size:14px;white-space:pre-wrap">${escHtml(n.icerik)}</div>
    </div>
  `;
  showSubpage('note-detail');
}

function editNote(id) {
  const n = DB.get('notlar').find(x=>x.id===id);
  if (!n) return;
  editingId = id;
  document.getElementById('n-baslik').value = n.baslik;
  document.getElementById('n-ilgili').value = n.ilgili||'';
  document.getElementById('n-icerik').value = n.icerik;
  document.getElementById('modal-note-title').textContent = 'Notu Düzenle';
  openModal('modal-note');
}

function saveNote() { withSaveLock('saveNote', _saveNoteInner); }
function _saveNoteInner() {
  const baslik = document.getElementById('n-baslik').value.trim();
  const icerik = document.getElementById('n-icerik').value.trim();
  if (!baslik) return notify('Not başlığı zorunludur!');
  // Düzenlemede orijinal tarihi koru — not sıralaması bozulmasın
  const eskiNot = editingId ? DB.get('notlar').find(x => x.id === editingId) : null;
  const obj = {
    id: editingId || DB.genId(),
    baslik,
    ilgili: document.getElementById('n-ilgili').value,
    icerik,
    tarih: (eskiNot && eskiNot.tarih) || new Date().toISOString()
  };
  let arr = DB.get('notlar');
  if (editingId) arr = arr.map(x=>x.id===editingId?obj:x);
  else arr.push(obj);
  DB.set('notlar', arr);
  closeModal('modal-note');
  renderNotes();
  notify(editingId ? 'Not güncellendi' : 'Not eklendi ✓');
  editingId = null;
}

function deleteNote(id) {
  showConfirmModal('Bu notu silmek istediğinizden emin misiniz?', function() {
    DB.set('notlar', DB.get('notlar').filter(x=>x.id!==id));
    showSubpage('note-list');
    renderNotes();
    notify('Not silindi');
  });
}

// ========== CARİ HESAP ==========
let cariEditingId = null;

function populateCariMuvekkilSelect() {
  const mv = DB.get('muvekkiller');
  const sel = document.getElementById('cari-muvekkil-select');
  const cur = sel ? sel.value : '';
  if (sel) {
    sel.innerHTML = '<option value="">— Müvekkil seçin —</option>' +
      mv.map(m => `<option value="${m.id}">${escHtml(m.ad)}</option>`).join('');
    if (cur) sel.value = cur;
  }
  const cSel = document.getElementById('c-muvekkil');
  if (cSel) {
    cSel.innerHTML = '<option value="">Seçin...</option>' +
      mv.map(m => `<option value="${m.id}">${escHtml(m.ad)}</option>`).join('');
  }
}

function renderCari() {
  const muvekkilId = document.getElementById('cari-muvekkil-select').value;
  const summaryEl = document.getElementById('cari-summary');
  const emptyEl = document.getElementById('cari-empty');
  if (!muvekkilId) {
    summaryEl.style.display = 'none';
    emptyEl.style.display = '';
    return;
  }
  const m = DB.get('muvekkiller').find(x => x.id === muvekkilId);
  if (!m) return;
  summaryEl.style.display = '';
  emptyEl.style.display = 'none';
  document.getElementById('cari-muvekkil-baslik').textContent = `📒 ${m.ad} — Cari Hesap`;

  const kayitlar = (DB.get('cari') || []).filter(c => c.muvekkilId === muvekkilId);
  const sorted = [...kayitlar].sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

  let bakiye = 0;
  const toplamAlacak = sorted.filter(c => c.tur === 'Alacak').reduce((a, b) => a + Number(b.tutar), 0);
  const toplamBorc = sorted.filter(c => c.tur === 'Borç').reduce((a, b) => a + Number(b.tutar), 0);
  const netBakiye = toplamAlacak - toplamBorc;

  document.getElementById('cari-summary-boxes').innerHTML = `
    <div class="finance-box"><div class="finance-box-label">Toplam Alacak</div><div class="finance-box-val finance-green">₺${fmt(toplamAlacak)}</div></div>
    <div class="finance-box"><div class="finance-box-label">Toplam Borç</div><div class="finance-box-val finance-red">₺${fmt(toplamBorc)}</div></div>
    <div class="finance-box"><div class="finance-box-label">Net Bakiye</div><div class="finance-box-val ${netBakiye >= 0 ? 'finance-gold' : 'finance-red'}">₺${fmt(netBakiye)}</div></div>
  `;

  document.getElementById('cari-tbody').innerHTML = sorted.length ? sorted.map(c => {
    if (c.tur === 'Alacak') bakiye += Number(c.tutar);
    else bakiye -= Number(c.tutar);
    return `
    <tr class="cari-row">
      <td style="font-size:12px">${fmtDateShort(c.tarih)}</td>
      <td>${c.aciklama}${c.not ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${c.not}</div>` : ''}</td>
      <td><span class="tag tag-${c.tur === 'Alacak' ? 'aktif' : 'icra'}">${c.tur}</span></td>
      <td class="mono text-green">${c.tur === 'Alacak' ? fmt(c.tutar) : '—'}</td>
      <td class="mono text-red">${c.tur === 'Borç' ? fmt(c.tutar) : '—'}</td>
      <td class="mono ${bakiye >= 0 ? 'text-gold' : 'text-red'}" style="font-weight:600">₺${fmt(bakiye)}</td>
      <td>
        <button class="btn btn-ghost" onclick="editCari('${c.id}')">✏</button>
        <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteCari('${c.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📒</div><div class="empty-text">Bu müvekkil için cari kayıt yok</div></div></td></tr>`;
}

function openCariModal() {
  cariEditingId = null;
  populateCariMuvekkilSelect();
  const curId = document.getElementById('cari-muvekkil-select')?.value || '';
  if (curId) document.getElementById('c-muvekkil').value = curId;
  document.getElementById('c-tarih').value = new Date().toISOString().slice(0, 10);
  document.getElementById('c-tur').value = 'Alacak';
  document.getElementById('c-tutar').value = '';
  document.getElementById('c-aciklama').value = '';
  document.getElementById('c-not').value = '';
  document.getElementById('modal-cari-title').textContent = 'Cari İşlem Ekle';
  openModal('modal-cari');
}

function editCari(id) {
  const c = (DB.get('cari') || []).find(x => x.id === id);
  if (!c) return;
  cariEditingId = id;
  populateCariMuvekkilSelect();
  document.getElementById('c-muvekkil').value = c.muvekkilId;
  document.getElementById('c-tarih').value = c.tarih;
  document.getElementById('c-tur').value = c.tur;
  document.getElementById('c-tutar').value = c.tutar;
  document.getElementById('c-aciklama').value = c.aciklama;
  document.getElementById('c-not').value = c.not || '';
  document.getElementById('modal-cari-title').textContent = 'Cari İşlemi Düzenle';
  openModal('modal-cari');
}

function saveCari() {
  const muvekkilId = document.getElementById('c-muvekkil').value;
  const tutar = Number(document.getElementById('c-tutar').value);
  const aciklama = document.getElementById('c-aciklama').value.trim();
  if (!muvekkilId) return notify('Müvekkil seçilmelidir!');
  if (!tutar) return notify('Tutar giriniz!');
  if (tutar < 0) return notify('⚠️ Geçersiz tutar! Negatif değer girilemez.');
  const obj = {
    id: cariEditingId || DB.genId(),
    muvekkilId,
    tarih: document.getElementById('c-tarih').value || new Date().toISOString().slice(0, 10),
    tur: document.getElementById('c-tur').value,
    tutar,
    aciklama,
    not: document.getElementById('c-not').value,
    created: new Date().toISOString()
  };
  let arr = DB.get('cari') || [];
  if (cariEditingId) arr = arr.map(x => x.id === cariEditingId ? obj : x);
  else arr.push(obj);
  DB.set('cari', arr);
  const sel = document.getElementById('cari-muvekkil-select');
  if (sel && !sel.value) sel.value = muvekkilId;
  closeModal('modal-cari');
  if (typeof renderCari === 'function' && document.getElementById('cari-muvekkil-select')) renderCari();
  notify(cariEditingId ? 'Cari kayıt güncellendi ✓' : 'Cari kayıt eklendi ✓');
  cariEditingId = null;
}

function deleteCari(id) {
  showConfirmModal('Bu cari kaydını silmek istediğinizden emin misiniz?', function() {
    DB.set('cari', (DB.get('cari') || []).filter(x => x.id !== id));
    if (typeof renderCari === 'function' && document.getElementById('cari-muvekkil-select')) renderCari();
    notify('Cari kayıt silindi');
  });
}

function cariAra(q) {
  document.querySelectorAll('#cari-tbody tr.cari-row').forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function cariTurFiltrele(val) {
  document.querySelectorAll('#cari-tbody tr.cari-row').forEach(row => {
    row.style.display = !val || row.textContent.includes(val) ? '' : 'none';
  });
}

function cariExcel() {
  const muvekkilId = document.getElementById('cari-muvekkil-select').value;
  const m = DB.get('muvekkiller').find(x => x.id === muvekkilId);
  if (!m) return;
  const kayitlar = (DB.get('cari') || []).filter(c => c.muvekkilId === muvekkilId)
    .sort((a, b) => new Date(a.tarih) - new Date(b.tarih));
  let bakiye = 0;
  const rows = [['Tarih', 'Açıklama', 'Not', 'Tür', 'Alacak (₺)', 'Borç (₺)', 'Bakiye (₺)']];
  kayitlar.forEach(c => {
    if (c.tur === 'Alacak') bakiye += Number(c.tutar);
    else bakiye -= Number(c.tutar);
    rows.push([
      c.tarih,
      c.aciklama,
      c.not || '',
      c.tur,
      c.tur === 'Alacak' ? Number(c.tutar) : '',
      c.tur === 'Borç' ? Number(c.tutar) : '',
      bakiye
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cari Hesap');
  XLSX.writeFile(wb, `cari_${m.ad.replace(/\s+/g,'_')}.xlsx`);
}

// ========== İL/İLÇE VERİSİ ==========
// Türkiye il ve ilçe listesi (kısmi - önemli iller tam, diğerleri temsili)
const TR_ILCE_DATA = {
  'İstanbul': ['Adalar','Arnavutköy','Ataşehir','Avcılar','Bağcılar','Bahçelievler','Bakırköy','Başakşehir','Bayrampaşa','Beşiktaş','Beykoz','Beylikdüzü','Beyoğlu','Büyükçekmece','Çatalca','Çekmeköy','Esenler','Esenyurt','Eyüpsultan','Fatih','Gaziosmanpaşa','Güngören','Kadıköy','Kağıthane','Kartal','Küçükçekmece','Maltepe','Pendik','Sancaktepe','Sarıyer','Silivri','Sultanbeyli','Sultangazi','Şile','Şişli','Tuzla','Ümraniye','Üsküdar','Zeytinburnu'],
  'Ankara': ['Akyurt','Altındağ','Ayaş','Bala','Beypazarı','Çamlıdere','Çankaya','Çubuk','Elmadağ','Etimesgut','Evren','Gölbaşı','Güdül','Haymana','Kahramankazan','Kalecik','Keçiören','Kızılcahamam','Mamak','Nallıhan','Polatlı','Pursaklar','Sincan','Şereflikoçhisar','Yenimahalle'],
  'İzmir': ['Aliağa','Balçova','Bayındır','Bayraklı','Bergama','Beydağ','Bornova','Buca','Çeşme','Çiğli','Dikili','Foça','Gaziemir','Güzelbahçe','Karabağlar','Karaburun','Karşıyaka','Kemalpaşa','Kınık','Kiraz','Konak','Menderes','Menemen','Narlıdere','Ödemiş','Seferihisar','Selçuk','Tire','Torbalı','Urla'],
  'Bursa': ['Büyükorhan','Gemlik','Gürsu','Harmancık','İnegöl','İznik','Karacabey','Keles','Kestel','Mudanya','Mustafakemalpaşa','Nilüfer','Orhaneli','Orhangazi','Osmangazi','Yenişehir','Yıldırım'],
  'Antalya': ['Akseki','Aksu','Alanya','Demre','Döşemealtı','Elmalı','Finike','Gazipaşa','Gündoğmuş','İbradı','Kaş','Kemer','Kepez','Konyaaltı','Korkuteli','Kumluca','Manavgat','Muratpaşa','Serik'],
  'Adana': ['Aladağ','Ceyhan','Çukurova','Feke','İmamoğlu','Karaisalı','Karataş','Kozan','Pozantı','Saimbeyli','Sarıçam','Seyhan','Tufanbeyli','Yumurtalık','Yüreğir'],
  'Mersin': ['Akdeniz','Anamur','Aydıncık','Bozyazı','Çamlıyayla','Erdemli','Gülnar','Mezitli','Mut','Silifke','Tarsus','Toroslar','Yenişehir'],
  'Gaziantep': ['Araban','İslahiye','Karkamış','Nizip','Nurdağı','Oğuzeli','Şahinbey','Şehitkamil','Yavuzeli'],
  'Konya': ['Ahırlı','Akören','Akşehir','Altınekin','Beyşehir','Bozkır','Cihanbeyli','Çeltik','Çumra','Derbent','Derebucak','Doğanhisar','Emirgazi','Ereğli','Güneysınır','Hadim','Halkapınar','Hüyük','Ilgın','Kadınhanı','Karapınar','Karatay','Kulu','Meram','Sarayönü','Selçuklu','Seydişehir','Taşkent','Tuzlukçu','Yalıhüyük','Yunak'],
  'Kocaeli': ['Başiskele','Çayırova','Darıca','Derince','Dilovası','Gebze','Gölcük','İzmit','Kandıra','Karamürsel','Kartepe','Körfez'],
  'Hatay': ['Altınözü','Antakya','Arsuz','Belen','Defne','Dörtyol','Erzin','Hassa','İskenderun','Kırıkhan','Kumlu','Mehmetçik','Payas','Reyhanlı','Samandağ','Yayladağı'],
  'Diyarbakır': ['Bağlar','Bismil','Çermik','Çınar','Çüngüş','Dicle','Eğil','Ergani','Hani','Hazro','Kayapınar','Kocaköy','Kulp','Lice','Silvan','Sur','Yenişehir'],
  'Şanlıurfa': ['Akçakale','Birecik','Bozova','Ceylanpınar','Eyyübiye','Halfeti','Haliliye','Harran','Hilvan','Karaköprü','Siverek','Suruç','Viranşehir'],
  'Trabzon': ['Akçaabat','Araklı','Arsin','Beşikdüzü','Çarşıbaşı','Çaykara','Dernekpazarı','Düzköy','Hayrat','Köprübaşı','Maçka','Of','Ortahisar','Sürmene','Şalpazarı','Tonya','Vakfıkebir','Yomra'],
  'Sakarya': ['Adapazarı','Akyazı','Arifiye','Erenler','Ferizli','Geyve','Hendek','Karapürçek','Karasu','Kaynarca','Kocaali','Pamukova','Sapanca','Serdivan','Söğütlü','Taraklı'],
  'Tekirdağ': ['Çerkezköy','Çorlu','Ergene','Hayrabolu','Kapaklı','Malkara','Marmaraereğlisi','Muratlı','Saray','Süleymanpaşa','Şarköy'],
  'Eskişehir': ['Alpu','Beylikova','Çifteler','Günyüzü','Han','İnönü','Mahmudiye','Mihalgazi','Mihallıççık','Odunpazarı','Sarıcakaya','Seyitgazi','Sivrihisar','Tepebaşı'],
  'Balıkesir': ['Altıeylül','Ayvalık','Balya','Bandırma','Bigadiç','Burhaniye','Dursunbey','Edremit','Erdek','Gömeç','Gönen','Havran','İvrindi','Karesi','Kepsut','Manyas','Marmara','Savaştepe','Sındırgı','Susurluk'],
  'Muğla': ['Bodrum','Dalaman','Datça','Fethiye','Kavaklıdere','Köyceğiz','Manavgat','Marmaris','Menteşe','Milas','Ortaca','Seydikemer','Ula','Yatağan'],
  'Aydın': ['Bozdoğan','Buharkent','Çine','Didim','Efeler','Germencik','İncirliova','Karacasu','Karpuzlu','Koçarlı','Köşk','Kuşadası','Kuyucak','Nazilli','Söke','Sultanhisar','Yenipazar'],
  'Manisa': ['Ahmetli','Akhisar','Alaşehir','Demirci','Gölmarmara','Gördes','Kırkağaç','Köprübaşı','Kula','Salihli','Sarıgöl','Saruhanlı','Selendi','Soma','Şehzadeler','Turgutlu','Yunusemre'],
  'Denizli': ['Acıpayam','Babadağ','Baklan','Bekilli','Beyağaç','Bozkurt','Buldan','Çal','Çameli','Çardak','Çivril','Güney','Honaz','Kale','Merkezefendi','Pamukkale','Sarayköy','Serinhisar','Tavas'],
  'Samsun': ['Alaçam','Asarcık','Atakum','Ayvacık','Bafra','Canik','Çarşamba','Havza','İlkadım','Kavak','Ladik','Ondokuzmayıs','Salıpazarı','Tekkeköy','Terme','Vezirköprü','Yakakent'],
  'Kayseri': ['Akkışla','Bünyan','Develi','Felahiye','Hacılar','İncesu','Kocasinan','Melikgazi','Özvatan','Pınarbaşı','Sarıoğlan','Sarız','Talas','Tomarza','Yahyalı','Yeşilhisar'],
  'Kahramanmaraş': ['Afşin','Andırın','Çağlayancerit','Dulkadiroğlu','Ekinözü','Elbistan','Göksun','Nurhak','Onikişubat','Pazarcık','Türkoğlu'],
};

// Diğer iller için basit ilçe listesi
const TR_ILLER_LIST = Object.keys(TR_ILCE_DATA);

function tsPopulateIller() {
  const sel = document.getElementById('ts-il');
  if (!sel) return;
  sel.innerHTML = '<option value="">İl seçin...</option>' +
    TR_ILLER.map(il => `<option value="${il}">${il}</option>`).join('');
}

function tsIlChange() {
  const il = document.getElementById('ts-il').value;
  const ilceSel = document.getElementById('ts-ilce');
  const mahSel = document.getElementById('ts-mahalle');
  if (!ilceSel) return;
  mahSel.innerHTML = '<option value="">Önce ilçe seçin</option>';
  if (!il) { ilceSel.innerHTML = '<option value="">Önce il seçin</option>'; return; }
  const ilceler = TR_ILCE_DATA[il] || ['Merkez'];
  ilceSel.innerHTML = '<option value="">İlçe seçin...</option>' +
    ilceler.map(i => `<option value="${i}">${i}</option>`).join('');
}

function tsIlceChange() {
  const ilce = document.getElementById('ts-ilce').value;
  const mahSel = document.getElementById('ts-mahalle');
  if (!mahSel) return;
  // Mahalle verisi yok, serbest giriş
  mahSel.innerHTML = '<option value="">Mahalle/Köy seçin veya yazın</option>';
  mahSel.innerHTML += '<option value="__serbest__">+ Manuel giriş</option>';
  if (ilce) mahSel.innerHTML += `<option value="${escAttr(ilce)} Merkez Mahallesi">${escHtml(ilce)} Merkez Mahallesi</option>`;
}

function tsModeToggle() {
  const elle = document.getElementById('ts-elle-gir').checked;
  document.getElementById('ts-otomatik-form').style.display = elle ? 'none' : '';
  document.getElementById('ts-elle-form').style.display = elle ? '' : 'none';
}

let tsIcraId = null;
function openTasinmazModal(icraId) {
  tsIcraId = icraId;
  document.getElementById('modal-tasinmaz-title').textContent = 'Taşınmaz Ekle';
  document.getElementById('ts-elle-gir').checked = false;
  tsModeToggle();
  tsPopulateIller();
  document.getElementById('ts-il').value = '';
  document.getElementById('ts-ilce').innerHTML = '<option value="">Önce il seçin</option>';
  document.getElementById('ts-mahalle').innerHTML = '<option value="">Önce ilçe seçin</option>';
  document.getElementById('ts-sokak').value = '';
  document.getElementById('ts-ada').value = '';
  document.getElementById('ts-parsel').value = '';
  document.getElementById('ts-tur').value = 'Konut';
  document.getElementById('ts-tarih').value = '';
  document.getElementById('ts-aciklama').value = '';
  document.getElementById('ts-error').textContent = '';
  openModal('modal-tasinmaz');
}

function tsSave() {
  const elle = document.getElementById('ts-elle-gir').checked;
  let adres = '';
  if (elle) {
    adres = document.getElementById('ts-elle-metin').value.trim();
    if (!adres) { document.getElementById('ts-error').textContent = 'Adres zorunludur.'; return; }
  } else {
    const il = document.getElementById('ts-il').value;
    const ilce = document.getElementById('ts-ilce').value;
    if (!il) { document.getElementById('ts-error').textContent = 'İl seçiniz.'; return; }
    const mah = document.getElementById('ts-mahalle').value;
    const sokak = document.getElementById('ts-sokak').value;
    const ada = document.getElementById('ts-ada').value;
    const parsel = document.getElementById('ts-parsel').value;
    adres = [il, ilce, mah !== '__serbest__' ? mah : '', sokak].filter(Boolean).join(' / ');
    if (ada) adres += ` Ada:${ada}`;
    if (parsel) adres += ` Parsel:${parsel}`;
  }
  const tur = document.getElementById('ts-tur').value;
  const tarih = document.getElementById('ts-tarih').value;
  const aciklama = document.getElementById('ts-aciklama').value;

  const data = JSON.parse(localStorage.getItem('icra_haciz_' + tsIcraId) || '{}');
  if (!data.tasinmazlar_list) data.tasinmazlar_list = [];
  data.tasinmazlar_list.push({ id: Date.now().toString(36), adres, tur, tarih, aciklama });
  // Metin alanını da güncelle
  data.tasinmazlar = data.tasinmazlar_list.map(t => `[${t.tur}] ${t.adres}${t.tarih?' ('+t.tarih+')':''}`).join('\n');
  localStorage.setItem('icra_haciz_' + tsIcraId, JSON.stringify(data));
  closeModal('modal-tasinmaz');
  showIcraDetail(tsIcraId);
  notify('Taşınmaz eklendi ✓');
}

// Satış avansı
let saIcraId = null;
function openSatisAvansi(icraId) {
  saIcraId = icraId;
  document.getElementById('sa-tarih').value = new Date().toISOString().slice(0,10);
  document.getElementById('sa-tutar').value = '';
  document.getElementById('sa-arac-plaka').value = '';
  // Taşınmazları doldur
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  const tList = data.tasinmazlar_list || [];
  const sel = document.getElementById('sa-tasinmaz-sec');
  sel.innerHTML = '<option value="">— Seçin veya yeni —</option>' +
    tList.map(t => `<option value="${t.id}">[${t.tur}] ${t.adres}</option>`).join('');
  document.getElementById('sa-tasinmaz-wrap').style.display = 'none';
  document.getElementById('sa-arac-wrap').style.display = 'none';
  openModal('modal-satis-avansi');
}

function saVarlıkToggle() {
  const tur = document.querySelector('input[name="sa-tur"]:checked')?.value;
  document.getElementById('sa-tasinmaz-wrap').style.display = tur === 'tasinmaz' ? '' : 'none';
  document.getElementById('sa-arac-wrap').style.display = tur === 'arac' ? '' : 'none';
}

function saKaydet() {
  const tur = document.querySelector('input[name="sa-tur"]:checked')?.value;
  if (!tur) return notify('Tür seçiniz!');
  const tarih = document.getElementById('sa-tarih').value;
  const tutar = parsePara(document.getElementById('sa-tutar').value);
  let varlık = tur === 'tasinmaz'
    ? document.getElementById('sa-tasinmaz-sec').options[document.getElementById('sa-tasinmaz-sec').selectedIndex]?.text
    : document.getElementById('sa-arac-plaka').value;
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + saIcraId) || '{}');
  if (!data.satisAvanslari) data.satisAvanslari = [];
  data.satisAvanslari.push({ id: Date.now().toString(36), tur, varlık, tarih, tutar });
  localStorage.setItem('icra_haciz_' + saIcraId, JSON.stringify(data));
  closeModal('modal-satis-avansi');
  showIcraDetail(saIcraId);
  notify('Satış avansı kaydedildi ✓');
}

// ========== HELPERS ==========
function fmt(n) {
  const num = Number(n||0);
  // Her zaman 2 ondalık göster - Türk formatı: 1.250.000,50
  return num.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function parsePara(str) {
  if (!str && str !== 0) return 0;
  // "1.234,56" → 1234.56
  const s = String(str).replace(/\s/g,'').replace(/\./g,'').replace(',','.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatParaInput(val) {
  if (!val && val !== 0) return '';
  return Number(val).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function initParaInput(el) {
  if (!el || el._paraInited) return;
  el._paraInited = true;
  el.addEventListener('focus', function() {
    const val = parsePara(this.value);
    this.value = val ? String(val).replace('.',',') : '';
  });
  el.addEventListener('blur', function() {
    const val = parsePara(this.value);
    this.value = val ? formatParaInput(val) : '';
  });
  el.addEventListener('keydown', function(e) {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Enter',',','.'];
    if (!allowed.includes(e.key) && !('0123456789'.includes(e.key))) e.preventDefault();
  });
}


function fmtSade(n) {
  // Ondalık yoksa gösterme
  const num = Number(n||0);
  return num.toLocaleString('tr-TR', {minimumFractionDigits:0, maximumFractionDigits:2});
}
// Yerel tarih string'i (YYYY-MM-DD) — UTC kaymasını önler
function _localDateStr(dt) {
  var d = dt || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    // Date-only strings (YYYY-MM-DD): show date only, no time (avoids UTC→local shift showing wrong time)
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim())) {
      var parts = d.trim().split('-');
      var dt = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
      return dt.toLocaleDateString('tr-TR', {day:'2-digit',month:'short',year:'numeric'});
    }
    return new Date(d).toLocaleString('tr-TR', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(',','');
  }
  catch { return d; }
}
function fmtDateShort(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('tr-TR', {day:'2-digit',month:'short',year:'numeric'}); }
  catch { return d; }
}
function isUrgent(d) {
  if (!d) return false;
  // datetime-local "2026-03-20T14:30" formatını yerel saat olarak parse et
  const dt = d.includes('T') ? new Date(d.replace('T', 'T').length === 16 ? d + ':00' : d) : new Date(d);
  const diff = dt - Date.now();
  return diff < 86400000 * 3 && diff > 0;
}

function parseTarih(d) {
  // datetime-local veya date string'i yerel saat olarak güvenli parse et
  if (!d) return null;
  if (d.length === 10) return new Date(d + 'T00:00:00'); // sadece tarih
  return new Date(d); // datetime-local zaten yerel
}

function filterTable(tableId, q) {
  const rows = document.querySelectorAll('#'+tableId+' tbody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function filterByStatus(tableId, val) {
  const rows = document.querySelectorAll('#'+tableId+' tbody tr');
  rows.forEach(row => {
    row.style.display = !val || row.textContent.includes(val) ? '' : 'none';
  });
}

function filterByType(tableId, val) {
  const rows = document.querySelectorAll('#'+tableId+' tbody tr');
  rows.forEach(row => {
    row.style.display = !val || row.textContent.includes(val) ? '' : 'none';
  });
}

function populateMuvekkilSelects() {
  const mv = DB.get('muvekkiller');
  const ids = ['d-muvekkil','i-muvekkil','f-muvekkil'];
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Seçin...</option>' + mv.map(m=>`<option value="${escAttr(m.ad)}">${escHtml(m.ad)}</option>`).join('');
    sel.value = cur;
  });
}

function populateDavaSelect(curVal) {
  const sel = document.getElementById('t-ilgili');
  if (!sel) return;
  const davalar = DB.get('davalar');
  sel.innerHTML = '<option value="">— Seçin veya boş bırakın —</option>' +
    davalar.map(d => {
      const label = d.ad ? `${d.ad} (${d.no})` : `${d.no} — ${d.konu.slice(0,30)}${d.konu.length>30?'…':''}`;
      return `<option value="${d.ad||d.no}">${label}</option>`;
    }).join('');
  if (curVal) sel.value = curVal;
}

function populateTaskDosyaFilter() {
  const sel = document.getElementById('task-dosya-filter');
  if (!sel) return;
  const cur = sel.value;
  const davalar = DB.get('davalar');
  sel.innerHTML = '<option value="">— Tüm görevler —</option>' +
    davalar.map(d => {
      const label = d.ad ? `📌 ${d.ad}  (${d.no})` : `📁 ${d.no} — ${d.konu.slice(0,28)}${d.konu.length>28?'…':''}`;
      return `<option value="${d.ad||d.no}">${label}</option>`;
    }).join('');
  if (cur) sel.value = cur;
}

function onTaskDosyaChange() {
  const val = document.getElementById('task-dosya-filter').value;
  const davalar = DB.get('davalar');
  const dava = davalar.find(d => d.ad === val || d.no === val);
  const header = document.getElementById('task-dosya-header');

  if (dava) {
    header.style.display = '';
    header.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 16px">
        <div style="font-size:22px">📁</div>
        <div style="flex:1">
          <div style="font-weight:600;color:var(--text);font-size:14px">${dava.ad || dava.konu}</div>
          <div style="font-size:12px;color:var(--text3);margin-top:2px">
            <span class="mono text-gold">${dava.no}</span>
            · ${dava.muvekkil}
            · <span class="tag tag-${dava.durum==='Aktif'?'aktif':dava.durum==='Bekliyor'?'bekliyor':'kapali'}" style="font-size:10px">${dava.durum}</span>
          </div>
        </div>
        <button class="btn btn-gold" style="font-size:12px;padding:6px 12px" onclick="openTaskForDava('${dava.id}')">+ Görev Ekle</button>
        <button class="btn btn-outline" style="font-size:12px;padding:6px 10px" onclick="openDavaDetailPage('${dava.id}')">📄 Dosyayı Aç</button>
      </div>`;
  } else {
    header.style.display = 'none';
    header.innerHTML = '';
  }
  renderTasks();
}

function openTaskForDava(davaId) {
  const dava = DB.get('davalar').find(x => x.id === davaId);
  if (!dava) return;
  editingId = null;
  clearForms();
  document.getElementById('modal-task-title').textContent = `Yeni Görev — ${dava.ad || dava.no}`;
  openModal('modal-task');
  populateDavaSelect(dava.ad || dava.no); // modal açıldıktan sonra doldur
}

function clearForms() {
  document.querySelectorAll('.modal input, .modal textarea, .modal select').forEach(el => {
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  // Görev modal tipini sıfırla
  if (document.getElementById('t-tip')) setTaskTip('gorev');
  // İcra adliye seçiciyi gizle ve sıfırla
  const iAdliyeWrap = document.getElementById('i-adliye-wrap');
  if (iAdliyeWrap) iAdliyeWrap.style.display = 'none';
  const iAdliye = document.getElementById('i-adliye');
  if (iAdliye) iAdliye.innerHTML = '<option value="">Adliye seçin...</option>';
}


// ══ BELGE MODAL ══
var currentBelgeDavaId = null;
var _currentBelgeMode = 'dava'; // 'dava' veya 'icra'
var _currentBelgeIcraId = null;

var _ICRA_BELGE_TURLER = [
  {v:'Ödeme Emri', l:'📬 Ödeme Emri'},
  {v:'İcra Emri', l:'⚖️ İcra Emri'},
  {v:'Haciz Tutanağı', l:'📋 Haciz Tutanağı'},
  {v:'Kıymet Takdir', l:'📊 Kıymet Takdir Raporu'},
  {v:'Satış İlanı', l:'🏷️ Satış İlanı'},
  {v:'Sıra Cetveli', l:'📑 Sıra Cetveli'},
  {v:'Diğer', l:'📁 Diğer'}
];
var _DAVA_BELGE_TURLER = [
  {v:'Dilekçe', l:'📄 Dilekçe'},
  {v:'Karar', l:'⚖️ Mahkeme Kararı'},
  {v:'Vekaletname', l:'📜 Vekaletname'},
  {v:'Bilirkişi', l:'🔬 Bilirkişi Raporu'},
  {v:'Tebligat', l:'📬 Tebligat'},
  {v:'Sözleşme', l:'✍️ Sözleşme'},
  {v:'Diğer', l:'📁 Diğer'}
];

function _belgeTurSeceneklerGuncelle(mode, secilenTur) {
  var turSel = document.getElementById('belge-tur');
  if (!turSel) return;
  var liste = mode === 'icra' ? _ICRA_BELGE_TURLER : _DAVA_BELGE_TURLER;
  turSel.innerHTML = liste.map(function(t){ return '<option value="'+t.v+'">'+t.l+'</option>'; }).join('');
  if (secilenTur) turSel.value = secilenTur;
}

function _belgeTarafSeceneklerGuncelle(mode, secilenTaraf) {
  var tarafSel = document.getElementById('belge-taraf');
  if (!tarafSel) return;
  if (mode === 'icra') {
    tarafSel.innerHTML = '<option value="Alacaklı">Alacaklı</option><option value="Borçlu">Borçlu</option><option value="İcra Müdürlüğü">İcra Müdürlüğü</option>';
  } else {
    tarafSel.innerHTML = '<option value="Biz">Biz</option><option value="Karşı">Karşı</option><option value="Mahkeme">Mahkeme</option>';
  }
  if (secilenTaraf) tarafSel.value = secilenTaraf;
}

function openBelgeModal(davaId) {
  _currentBelgeMode = 'dava';
  _currentBelgeIcraId = null;
  currentBelgeDavaId = davaId;
  _saveBelgeLock = false;
  _belgeSelectedFile = null;
  document.getElementById('modal-belge-title').textContent = '📎 Belge Ekle';
  document.getElementById('belge-ad').value = '';
  _belgeTurSeceneklerGuncelle('dava', 'Dilekçe');
  document.getElementById('belge-tarih').value = _localDateStr();
  document.getElementById('belge-url').value = '';
  _belgeTarafSeceneklerGuncelle('dava', 'Biz');
  document.getElementById('belge-aciklama').value = '';
  document.getElementById('belge-edit-id').value = '';
  var fnEl = document.getElementById('belge-file-name');
  if(fnEl) fnEl.style.display = 'none';
  var fiEl = document.getElementById('belge-file-input');
  if(fiEl) fiEl.value = '';
  openModal('modal-belge');
}

function openIcraBelgeModal(icraId) {
  _currentBelgeMode = 'icra';
  _currentBelgeIcraId = icraId;
  currentBelgeDavaId = null;
  _saveBelgeLock = false;
  _belgeSelectedFile = null;
  document.getElementById('modal-belge-title').textContent = '📎 İcra Belgesi Ekle';
  document.getElementById('belge-ad').value = '';
  _belgeTurSeceneklerGuncelle('icra', 'Ödeme Emri');
  document.getElementById('belge-tarih').value = _localDateStr();
  document.getElementById('belge-url').value = '';
  _belgeTarafSeceneklerGuncelle('icra', 'Alacaklı');
  document.getElementById('belge-aciklama').value = '';
  document.getElementById('belge-edit-id').value = '';
  var fnEl = document.getElementById('belge-file-name');
  if(fnEl) fnEl.style.display = 'none';
  var fiEl = document.getElementById('belge-file-input');
  if(fiEl) fiEl.value = '';
  openModal('modal-belge');
}

function editIcraBelge(belgeId, icraId) {
  var b = (DB.get('icra_belgeler')||[]).find(function(x){ return x.id === belgeId; });
  if (!b) return;
  _currentBelgeMode = 'icra';
  _currentBelgeIcraId = icraId;
  currentBelgeDavaId = null;
  _saveBelgeLock = false;
  _belgeSelectedFile = null;
  document.getElementById('modal-belge-title').textContent = '📎 Belge Düzenle';
  document.getElementById('belge-ad').value = b.ad || '';
  _belgeTurSeceneklerGuncelle('icra', b.tur);
  document.getElementById('belge-tarih').value = b.tarih || _localDateStr();
  document.getElementById('belge-url').value = b.url || '';
  _belgeTarafSeceneklerGuncelle('icra', b.taraf);
  document.getElementById('belge-aciklama').value = b.aciklama || '';
  document.getElementById('belge-edit-id').value = belgeId;
  var fnEl = document.getElementById('belge-file-name');
  if(fnEl) fnEl.style.display = 'none';
  var fiEl = document.getElementById('belge-file-input');
  if(fiEl) fiEl.value = '';
  openModal('modal-belge');
}

var _saveBelgeLock = false;
function saveBelge() {
  if (_saveBelgeLock) return;
  var ad = document.getElementById('belge-ad').value.trim();
  if (!ad) { alert('Belge adı zorunludur.'); return; }
  _saveBelgeLock = true;
  var editId = document.getElementById('belge-edit-id').value;
  var isIcra = (_currentBelgeMode === 'icra');

  var belge = {
    id: editId || DB.genId(),
    ad: ad,
    tur: document.getElementById('belge-tur').value,
    tarih: document.getElementById('belge-tarih').value,
    url: document.getElementById('belge-url').value.trim(),
    taraf: document.getElementById('belge-taraf').value,
    aciklama: document.getElementById('belge-aciklama').value.trim(),
    olusturma: new Date().toISOString()
  };
  if (isIcra) { belge.icraId = _currentBelgeIcraId; }
  else { belge.davaId = currentBelgeDavaId; }

  // B5: If file selected, upload to Supabase storage
  if(_belgeSelectedFile && window._supabaseToken) {
    var dosya = _belgeSelectedFile;
    _belgeSelectedFile = null;
    var ts = Date.now();
    var temizAd = dosya.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var klasor = isIcra ? ('icra-belgeler/' + _currentBelgeIcraId) : ('belgeler/' + currentBelgeDavaId);
    var yol = klasor + '/' + ts + '_' + temizAd;
    fetch(SUPABASE_URL + '/storage/v1/object/chatter-files/' + yol, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + window._supabaseToken,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': dosya.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: dosya
    }).then(function(r){
      if (!r.ok) {
        return r.text().then(function(errText) { throw new Error(errText); });
      }
      return r.json();
    }).then(function(data){
      belge.url = SUPABASE_URL + '/storage/v1/object/public/chatter-files/' + yol;
      belge.yol = yol;
      _saveBelgeFinish(belge, editId);
    }).catch(function(err){
      console.warn('Belge yükleme hatası:', err);
      notify('⚠️ Dosya yüklenemedi: ' + (err.message||'bilinmeyen hata'));
      _saveBelgeLock = false;
    });
    return;
  }
  _belgeSelectedFile = null;
  _saveBelgeFinish(belge, editId);
}

function _saveBelgeFinish(belge, editId) {
  if (_currentBelgeMode === 'icra') {
    var icraBelgeler = DB.get('icra_belgeler') || [];
    if (editId) { icraBelgeler = icraBelgeler.map(function(b){ return b.id===editId ? belge : b; }); }
    else { icraBelgeler.push(belge); }
    DB.set('icra_belgeler', icraBelgeler);
    closeModal('modal-belge');
    document.getElementById('belge-edit-id').value = '';
    _saveBelgeLock = false;
    notify(editId ? 'Belge güncellendi' : 'Belge kaydedildi ✓');
    if (_currentBelgeIcraId && typeof renderIcraTab === 'function') {
      renderIcraTab(_currentBelgeIcraId, 'belge');
    }
    return;
  }

  var belgeler = DB.get('belgeler') || [];
  if(editId) { belgeler = belgeler.map(function(b){return b.id===editId?belge:b;}); }
  else { belgeler.push(belge); }
  DB.set('belgeler', belgeler);

  closeModal('modal-belge');
  document.getElementById('belge-edit-id').value = '';
  _saveBelgeLock = false;
  notify(editId ? 'Belge güncellendi' : 'Belge kaydedildi ✓');

  // Dava detay sayfası açıksa anında yenile
  if (currentBelgeDavaId) {
    const sekmeler = document.querySelectorAll('.ddp-sekme');
    sekmeler.forEach(s => {
      s.classList.remove('aktif');
      if (s.dataset.sekme === 'belge') s.classList.add('aktif');
    });
    renderDavaDetailPage(currentBelgeDavaId);
  }
}

function openModal(id) {
  var modalEl = document.getElementById(id);
  modalEl.classList.add('open');
  // Modal içeriğini en üste scroll et
  var modalBody = modalEl.querySelector('.modal-body, .modal');
  if (modalBody) { modalBody.scrollTop = 0; }
  // Modal içindeki para inputlarını başlat ve özel init
  setTimeout(() => {
    // Finans modalı: müvekkil dropdown'ı doldur
    if (id === 'modal-finans') {
      populateMuvekkilSelects();
      finansTurDegisti();
    }
    // Görev modalı: t-ilgili dropdown'ı doldur
    if (id === 'modal-task') {
      const sel = document.getElementById('t-ilgili');
      if (sel) {
        const curVal = sel.value;
        const davalar = DB.get('davalar') || [];
        const icralar = DB.get('icralar') || [];
        sel.innerHTML = '<option value="">— Genel görev (dosya bağlantısı yok) —</option>'
          + '<optgroup label="📁 Dava Dosyaları">'
          + davalar.map(d => `<option value="${d.no}"${d.no===curVal?' selected':''}>${d.no} — ${escHtml(d.muvekkil||'')}${d.karsi?' vs '+escHtml(d.karsi):''} (${d.durum})</option>`).join('')
          + '</optgroup>'
          + '<optgroup label="⚡ İcra Dosyaları">'
          + icralar.map(i => `<option value="${i.bki||i.no}"${(i.bki||i.no)===curVal?' selected':''}>${i.bki||i.no} — ${escHtml(i.borclu||'')} (${i.durum})</option>`).join('')
          + '</optgroup>';
        if (curVal) sel.value = curVal;
      }
    }
    // Ücret alanlarını YALNIZ yeni kayıt açılışında temizle. Düzenlemede
    // (editingId dolu) editMuvekkil bu alanları az önce doldurdu; burada
    // silinirse kullanıcı kaydettiğinde ücret anlaşmaları kalıcı olarak
    // kaybolur (gerçek bir veri kaybı hatasıydı).
    if (id === 'modal-muvekkil' && !editingId) {
      _mvUcretAnlasmalari = [];
      ['m-u-avukatlik','m-u-aylik','m-u-yillik','m-u-basari','m-u-saatlik','m-u-pesinat','m-u-diger'].forEach(id2 => {
        const el = document.getElementById(id2); if(el) el.value = '';
      });
    }
    const modal = document.getElementById(id);
    if (modal) {
      modal.querySelectorAll('[data-para]').forEach(el => initParaInput(el));
      // i-alacak her zaman para input
      const ialacak = modal.querySelector('#i-alacak');
      if (ialacak) initParaInput(ialacak);
    }
  }, 50);
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  editingId = null;
  const dd=document.getElementById('f-ilgili-dropdown');
  if(dd) dd.style.display='none';
  // Task modal temizle
  if (id === 'modal-task') {
    const fields = ['t-baslik','t-tarih','t-hatirlatma','t-aciklama','t-saat','t-mahkeme-durusma'];
    fields.forEach(function(f){ var el=document.getElementById(f); if(el) el.value=''; });
    var onc = document.getElementById('t-oncelik'); if(onc) onc.value='Normal';
    var tip = document.getElementById('t-tip'); if(tip) tip.value='gorev';
    setTaskTip('gorev');
  }
  if (id === 'modal-dava') {
    var davaFields = ['d-no','d-esas','d-karsi','d-hakim','d-savci','d-karsi-avukat','d-bilirkisi','d-istinaf-esas','d-temyiz-esas','d-akdi-ucret','d-tahsil-edilen','d-masraf'];
    davaFields.forEach(function(f){ var el=document.getElementById(f); if(el) el.value=''; });
  }
  if (id === 'modal-finans') {
    var fFields = ['f-tutar','f-aciklama'];
    fFields.forEach(function(f){ var el=document.getElementById(f); if(el) el.value=''; });
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay-bg').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay-bg').classList.remove('open');
}

// ══ MOBİL: Dava/İcra detayında chatter (Dosya Günlüğü) panelini aç/kapat ══
function mobilChatterAc(tip) {
  var el = document.getElementById(tip === 'dava' ? 'ddp-right' : 'idp-right');
  if (el) el.classList.add('mobil-acik');
}
function mobilChatterKapat(tip) {
  var el = document.getElementById(tip === 'dava' ? 'ddp-right' : 'idp-right');
  if (el) el.classList.remove('mobil-acik');
}


let notifTimer;
// kalici=true → süre 3 katına çıkar (bazı çağrılar — örn. UETS süre uyarısı —
// bu ikinci parametreyi bekliyordu ama fonksiyon onu hiç okumuyordu)
function notify(msg, kalici) {
  const el = document.getElementById('notification');
  el.textContent = msg;
  // Mesaj tipine göre renk: ❌/⚠️ → kırmızı/amber (daha uzun görünür), ✅/✓ → yeşil
  const m = String(msg);
  const hata = m.indexOf('❌') >= 0;
  const uyari = kalici || (!hata && m.indexOf('⚠') >= 0);
  const basari = !hata && !uyari && (m.indexOf('✅') >= 0 || m.indexOf('✓') >= 0);
  el.style.borderColor = hata ? 'rgba(192,83,58,0.6)' : uyari ? 'rgba(201,168,76,0.6)' : basari ? 'rgba(74,140,92,0.6)' : '';
  el.style.boxShadow = hata ? '0 8px 28px rgba(192,83,58,0.25)' : uyari ? '0 8px 28px rgba(201,168,76,0.2)' : '';
  el.style.display = 'block';
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.style.display = 'none', (hata || uyari) ? 5000 : 2800);
}

// Modal dışına tıklayınca kapanmaz — sadece × butonu ile kapatılır


// ========== FAİZ HESAPLAMA ==========
// Güncel oranlar: yasal-faiz.hesaplama.net, TCMB, Resmi Gazete
const FAIZ_TARIHLERI = [
  {bas:'1990-01-01',bit:'1999-12-31',kanuni:30,avans:60,reeskont:55},
  {bas:'2000-01-01',bit:'2001-12-31',kanuni:50,avans:75,reeskont:70},
  {bas:'2002-01-01',bit:'2004-12-31',kanuni:50,avans:55,reeskont:50},
  {bas:'2005-01-01',bit:'2005-12-31',kanuni:30,avans:33,reeskont:30},
  {bas:'2006-01-01',bit:'2009-12-31',kanuni:12,avans:27,reeskont:25},
  {bas:'2010-01-01',bit:'2010-12-31',kanuni:9, avans:14,reeskont:12},
  {bas:'2011-01-01',bit:'2017-12-31',kanuni:9, avans:14,reeskont:13.75},
  {bas:'2018-01-01',bit:'2018-12-31',kanuni:9, avans:20,reeskont:19},
  {bas:'2019-01-01',bit:'2019-12-31',kanuni:9, avans:22.75,reeskont:21.75},
  {bas:'2020-01-01',bit:'2020-12-31',kanuni:9, avans:11.75,reeskont:10.75},
  {bas:'2021-01-01',bit:'2021-12-31',kanuni:9, avans:16.25,reeskont:15.25},
  {bas:'2022-01-01',bit:'2022-12-31',kanuni:9, avans:14.75,reeskont:13.75},
  {bas:'2023-01-01',bit:'2023-12-31',kanuni:9, avans:40.50,reeskont:39.50},
  {bas:'2024-01-01',bit:'2024-05-31',kanuni:9, avans:42.00,reeskont:41.00},
  {bas:'2024-06-01',bit:'2024-09-16',kanuni:24,avans:53.25,reeskont:52.25},
  {bas:'2024-09-17',bit:'2024-12-19',kanuni:24,avans:50.00,reeskont:49.00},
  {bas:'2024-12-20',bit:'2025-09-16',kanuni:24,avans:46.00,reeskont:45.00},
  {bas:'2025-09-17',bit:'2025-12-19',kanuni:24,avans:42.25,reeskont:41.25},
  {bas:'2025-12-20',bit:null,         kanuni:24,avans:39.75,reeskont:38.75},
];
const TTK1530_TARIHLERI = [
  {bas:'2013-01-01',bit:'2016-12-31',oran:10.25},
  {bas:'2017-01-01',bit:'2017-12-31',oran:11.25},
  {bas:'2018-01-01',bit:'2020-12-31',oran:22.75},
  {bas:'2021-01-01',bit:'2022-12-31',oran:19.25},
  {bas:'2023-01-01',bit:'2023-12-31',oran:39.00},
  {bas:'2024-01-01',bit:'2026-01-01',oran:56.00},
  {bas:'2026-01-02',bit:null,         oran:43.00},
];
const GUNCEL_FAIZ = {kanuni:24, avans:39.75, reeskont:38.75, ticari:43};

function fhGetOran(tur, tarihStr) {
  const d = new Date(tarihStr);
  if (tur === 'ticari') {
    for (const r of TTK1530_TARIHLERI) {
      const bit = r.bit ? new Date(r.bit) : new Date('2099-12-31');
      if (d >= new Date(r.bas) && d <= bit) return r.oran;
    }
    return 43;
  }
  for (const r of FAIZ_TARIHLERI) {
    const bit = r.bit ? new Date(r.bit) : new Date('2099-12-31');
    if (d >= new Date(r.bas) && d <= bit) return r[tur==='kanuni'?'kanuni':tur==='avans'?'avans':'reeskont'];
  }
  return tur === 'kanuni' ? 24 : 39.75;
}

function fhYontemGuncelle() {
  var isBasit = document.getElementById('fh-basit').checked;
  var labels = [document.getElementById('fh-basit-label'), document.getElementById('fh-bilesik-label')];
  var dots = [document.getElementById('fh-basit-dot'), document.getElementById('fh-bilesik-dot')];
  if(!labels[0]) return;
  var active = isBasit ? 0 : 1, inactive = isBasit ? 1 : 0;
  labels[active].style.borderColor = 'var(--gold)';
  dots[active].style.cssText = 'width:16px;height:16px;border-radius:50%;border:2px solid var(--gold);background:var(--gold);flex-shrink:0;display:flex;align-items:center;justify-content:center';
  dots[active].innerHTML = '<div style="width:6px;height:6px;border-radius:50%;background:#1a1600"></div>';
  labels[active].querySelector('span').style.cssText = 'font-size:13px;color:var(--text);font-weight:600';
  labels[inactive].style.borderColor = 'var(--border)';
  dots[inactive].style.cssText = 'width:16px;height:16px;border-radius:50%;border:2px solid var(--border);background:transparent;flex-shrink:0';
  dots[inactive].innerHTML = '';
  labels[inactive].querySelector('span').style.cssText = 'font-size:13px;color:var(--text2);font-weight:400';
}

function fhTurDegisti() {
  const tur = document.getElementById('fh-tur')?.value;
  const g = document.getElementById('fh-ozel-wrap');
  if (g) g.style.display = tur === 'ozel' ? '' : 'none';
  fhHesapla();
}

function fhHesapla() {
  var anaparaRaw = document.getElementById('fh-anapara')?.value || '';
  var anapara = parsePara(anaparaRaw) || 0;
  var tur     = document.getElementById('fh-tur')?.value || 'kanuni';
  var bas     = getDateValue(document.getElementById('fh-baslangic'));
  var bit     = getDateValue(document.getElementById('fh-bitis'));
  var yontem  = document.getElementById('fh-basit')?.checked ? 'basit' : 'bilesik';
  var sonucEl = document.getElementById('fh-sonuc-wrap');
  if (!sonucEl) return;

  var ORANLAR = {
    kanuni:   Number(document.getElementById('oran-kanuni')?.dataset?.oran || '24'),
    ticari:   Number(document.getElementById('oran-ticari')?.dataset?.oran || '43'),
    avans:    Number(document.getElementById('oran-avans')?.dataset?.oran || '39.75'),
    reeskont: Number(document.getElementById('oran-reeskont')?.dataset?.oran || '38.75'),
    ozel:     Number(document.getElementById('fh-ozel-oran')?.value || 0)
  };
  var oran = ORANLAR[tur] || 0;

  if (!anapara || anapara <= 0 || !oran) {
    sonucEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:30px 0"><div style="font-size:40px;margin-bottom:12px">🧮</div><div>Anapara ve faiz oranı giriniz</div></div>';
    return;
  }
  if (!bas || !bit) {
    sonucEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:30px 0"><div style="font-size:32px;margin-bottom:12px">📅</div><div style="font-size:14px;font-weight:600;color:var(--text2);margin-bottom:6px">Tarih aralığı giriniz</div><div style="font-size:12px">Başlangıç ve bitiş tarihini seçin</div></div>';
    return;
  }

  var basDt = new Date(bas + 'T00:00:00');
  var bitDt = new Date(bit + 'T00:00:00');
  var gun = Math.round((bitDt - basDt) / 86400000);
  if (gun <= 0) {
    sonucEl.innerHTML = '<div style="text-align:center;color:var(--text3);padding:30px 0"><div style="font-size:32px;margin-bottom:12px">⚠️</div><div style="font-size:14px;font-weight:600;color:var(--red);margin-bottom:6px">'+(gun===0?'Vade farkı yok':'Geçersiz tarih aralığı')+'</div><div style="font-size:12px">'+(gun===0?'Başlangıç ve bitiş tarihleri aynı — faiz hesaplanamaz':'Bitiş tarihi başlangıçtan büyük olmalıdır')+'</div></div>';
    return;
  }
  var faizTutari = 0;

  if (gun > 0) {
    faizTutari = yontem === 'basit'
      ? anapara * (oran / 100) * (gun / 365)
      : anapara * (Math.pow(1 + oran / 100, gun / 365) - 1);
  }

  var toplam  = anapara + faizTutari;
  var LABELS  = {kanuni:'Adi Kanuni', ticari:'Ticari (TTK)', avans:'TCMB Avans', reeskont:'Reeskont', ozel:'Özel'};
  var turLabel = (LABELS[tur]||'') + ' (%' + oran + ')';
  var yillar  = Math.floor(gun / 365);
  var aylar   = Math.floor((gun % 365) / 30);
  var gunler  = gun % 30;
  var sureTxt = gun > 0 ? (yillar ? yillar + ' yıl ' : '') + (aylar ? aylar + ' ay ' : '') + (gunler ? gunler + ' gün' : '') + ' (' + gun + ' gün)' : '—';

  sonucEl.innerHTML =
    '<div style="display:flex;flex-direction:column;gap:12px">'
    + '<div style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:20px;text-align:center">'
    +   '<div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Faiz Tutarı</div>'
    +   '<div style="font-size:32px;font-weight:900;color:var(--gold);font-family:monospace">₺' + fmt(faizTutari) + '</div>'
    +   (gun > 0 ? '<div style="font-size:12px;color:var(--text3);margin-top:4px">' + sureTxt + ' · ' + yontem + ' faiz</div>' : '')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +   '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;text-align:center">'
    +     '<div style="font-size:10px;color:var(--text3);margin-bottom:4px">Anapara</div>'
    +     '<div style="font-size:18px;font-weight:700;color:var(--text);font-family:monospace">₺' + fmt(anapara) + '</div>'
    +   '</div>'
    +   '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;text-align:center">'
    +     '<div style="font-size:10px;color:var(--text3);margin-bottom:4px">Toplam Alacak</div>'
    +     '<div style="font-size:18px;font-weight:700;color:var(--green);font-family:monospace">₺' + fmt(toplam) + '</div>'
    +   '</div>'
    + '</div>'
    + '<div style="background:var(--bg3);border-radius:10px;padding:14px">'
    +   '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:var(--text3)">Faiz Türü</span><span style="font-weight:600">' + turLabel + '</span></div>'
    +   (gun > 0 ? '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:var(--text3)">Süre</span><span style="font-weight:600">' + sureTxt + '</span></div>' : '')
    +   '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="color:var(--text3)">Yöntem</span><span style="font-weight:600">' + (yontem === 'basit' ? 'Basit Faiz' : 'Bileşik Faiz') + '</span></div>'
    +   '<div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0"><span style="color:var(--text3)">Faiz / Anapara</span><span style="font-weight:600;color:var(--gold)">%' + (Math.round(faizTutari / anapara * 1000) / 10) + '</span></div>'
    + '</div>'
    + '<button id="fh-copy-btn" class="btn btn-outline" style="width:100%;justify-content:center;font-size:12px">📋 Sonucu Kopyala</button>'
    + '</div>';
  // Kopyala butonu
  setTimeout(function(){
    var copyBtn = document.getElementById('fh-copy-btn');
    if(copyBtn) {
      var txt = 'Anapara: ₺'+fmt(anapara)+' | Faiz: ₺'+fmt(faizTutari)+' | Toplam: ₺'+fmt(toplam);
      copyBtn.onclick = function(){ navigator.clipboard && navigator.clipboard.writeText(txt).then(function(){ notify('Panoya kopyalandı ✓'); }); };
    }
  }, 50);
}

// ===== DÖNEMSEL FAİZ HESAPLAMA =====
// fhGetDonemler: mevcut FAIZ_TARIHLERI array'ini kullanarak dönemsel hesaplama yapar
function fhGetDonemler(tur, basStr, bitStr) {
  var basDt = new Date(basStr + 'T00:00:00');
  var bitDt = new Date(bitStr + 'T00:00:00');
  var donemler = [];
  var turKey = tur === 'kanuni' ? 'kanuni' : tur === 'avans' ? 'avans' : 'reeskont';
  for (var i = 0; i < FAIZ_TARIHLERI.length; i++) {
    var r = FAIZ_TARIHLERI[i];
    var rBas = new Date(r.bas + 'T00:00:00');
    // r.bit dönemin DAHİL son günüdür — gün hesabı için hariç uca çevir (+1 gün).
    // Aksi halde her oran değişim sınırında 1 gün faiz kayboluyordu.
    var rBit = r.bit ? new Date(new Date(r.bit + 'T00:00:00').getTime() + 86400000) : new Date('2099-12-31T00:00:00');
    var dBas = basDt > rBas ? basDt : rBas;
    var dBit = bitDt < rBit ? bitDt : rBit;
    if (dBas < dBit) {
      var gun = Math.round((dBit - dBas) / 86400000);
      if (gun > 0) {
        donemler.push({
          bas: dBas.toISOString().slice(0,10),
          bit: dBit.toISOString().slice(0,10),
          oran: r[turKey],
          gun: gun
        });
      }
    }
  }
  return donemler;
}


var _fhDonemSayac = 0;

function fhdTurDegisti() {
  var tur = (document.getElementById('fhd-tur')||{}).value||'kanuni';
  var ozelWrap = document.getElementById('fhd-ozel-wrap');
  if (ozelWrap) ozelWrap.style.display = tur === 'ozel' ? '' : 'none';
}

function fhDonemEkle() {
  _fhDonemSayac++;
  var list = document.getElementById('fhd-ozel-donemler');
  if (!list) return;
  var div = document.createElement('div');
  div.id = 'fhd-row-' + _fhDonemSayac;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px';
  div.innerHTML =
    '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:4px">Baslangic</label><input type="date" class="fhd-bas" min="1900-01-01" max="2100-12-31" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-size:12px;color-scheme:dark"></div>'
    + '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:4px">Bitis</label><input type="date" class="fhd-bit" min="1900-01-01" max="2100-12-31" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-size:12px;color-scheme:dark"></div>'
    + '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:4px">Oran (%)</label><input type="number" class="fhd-oran" step="0.01" min="0" max="200" placeholder="24" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 8px;font-size:12px"></div>'
    + '<button onclick="this.parentElement.remove()" style="background:none;border:1px solid rgba(192,83,58,0.3);border-radius:6px;color:var(--red);padding:6px 10px;cursor:pointer;font-size:14px;line-height:1">x</button>';
  list.appendChild(div);
}

function fhDonemHesapla() {
  var anaparaEl = document.getElementById('fhd-anapara');
  var anapara = parsePara(anaparaEl ? anaparaEl.value : '') || 0;
  if (!anapara || anapara <= 0) { notify('Anapara tutari girin'); return; }

  var tur = (document.getElementById('fhd-tur')||{}).value||'kanuni';
  var sonucEl = document.getElementById('fh-donem-sonuc');
  if (!sonucEl) return;

  var donemler = [];

  if (tur === 'ozel') {
    // Manuel dönemler
    var rows = document.querySelectorAll('#fhd-ozel-donemler > div');
    if (!rows.length) { notify('En az bir donem ekleyin'); return; }
    for (var i = 0; i < rows.length; i++) {
      var bas = rows[i].querySelector('.fhd-bas')?.value||'';
      var bit = rows[i].querySelector('.fhd-bit')?.value||'';
      var oran = parseFloat(rows[i].querySelector('.fhd-oran')?.value)||0;
      if (!bas || !bit || !oran) { notify((i+1)+'. donemde eksik bilgi'); return; }
      var gun = Math.round((new Date(bit+'T00:00:00') - new Date(bas+'T00:00:00')) / 86400000);
      if (gun <= 0) { notify((i+1)+'. donemde gecersiz tarih'); return; }
      donemler.push({bas:bas, bit:bit, oran:oran, gun:gun});
    }
  } else {
    // Otomatik dönemler
    var basStr = (document.getElementById('fhd-bas')||{}).value||'';
    var bitStr = (document.getElementById('fhd-bit')||{}).value||'';
    if (!basStr || !bitStr) { notify('Baslangic ve bitis tarihi girin'); return; }
    if (new Date(bitStr) <= new Date(basStr)) { notify('Bitis tarihi baslangictan buyuk olmali'); return; }
    donemler = fhGetDonemler(tur, basStr, bitStr);
    if (!donemler.length) { notify('Secilen tarih araliginda faiz orani bulunamadi'); return; }
  }

  var LABELS = {kanuni:'Adi Kanuni Faiz', avans:'TCMB Avans Faizi', reeskont:'Reeskont Faizi', ozel:'Ozel Oran'};
  var toplamFaiz = 0;
  var toplamGun = 0;
  var satirHtml = '';

  donemler.forEach(function(d, idx) {
    var faiz = anapara * (d.oran / 100) * (d.gun / 365);
    toplamFaiz += faiz;
    toplamGun += d.gun;
    satirHtml += '<tr style="border-top:1px solid rgba(255,255,255,0.06)">'
      + '<td style="padding:8px 10px;font-size:12px;color:var(--text3)">' + (idx+1) + '</td>'
      + '<td style="padding:8px 6px;font-size:11px;font-family:monospace;color:var(--text2)">' + fmtDate(d.bas) + '</td>'
      + '<td style="padding:8px 6px;font-size:11px;font-family:monospace;color:var(--text2)">' + fmtDate(d.bit) + '</td>'
      + '<td style="padding:8px 6px;font-size:12px;text-align:center;color:var(--gold)">%' + d.oran + '</td>'
      + '<td style="padding:8px 6px;font-size:12px;text-align:center;color:var(--text2)">' + d.gun + '</td>'
      + '<td style="padding:8px 10px;font-size:12px;text-align:right;font-family:monospace;font-weight:600;color:var(--gold)">' + fmt(faiz) + ' TL</td>'
      + '</tr>';
  });

  var toplam = anapara + toplamFaiz;

  sonucEl.style.display = '';
  sonucEl.innerHTML =
    '<div style="background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:12px;padding:18px;text-align:center;margin-bottom:14px">'
    + '<div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Toplam Donemsel Faiz (' + (LABELS[tur]||tur) + ')</div>'
    + '<div style="font-size:28px;font-weight:900;color:var(--gold);font-family:monospace">' + fmt(toplamFaiz) + ' TL</div>'
    + '<div style="font-size:12px;color:var(--text3);margin-top:4px">' + donemler.length + ' donem \u00b7 ' + toplamGun + ' gun</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;text-align:center"><div style="font-size:10px;color:var(--text3);margin-bottom:4px">Anapara</div><div style="font-size:16px;font-weight:700;color:var(--text);font-family:monospace">' + fmt(anapara) + ' TL</div></div>'
    + '<div style="background:var(--bg3);border-radius:10px;padding:12px 14px;text-align:center"><div style="font-size:10px;color:var(--text3);margin-bottom:4px">Toplam Alacak</div><div style="font-size:16px;font-weight:700;color:var(--green);font-family:monospace">' + fmt(toplam) + ' TL</div></div>'
    + '</div>'
    + '<div class="card" style="overflow:hidden"><div class="table-wrap"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--bg3)"><th style="padding:8px 10px;text-align:left;font-size:11px;color:var(--text3)">#</th><th style="padding:8px 6px;text-align:left;font-size:11px;color:var(--text3)">Baslangic</th><th style="padding:8px 6px;text-align:left;font-size:11px;color:var(--text3)">Bitis</th><th style="padding:8px 6px;text-align:center;font-size:11px;color:var(--text3)">Oran</th><th style="padding:8px 6px;text-align:center;font-size:11px;color:var(--text3)">Gun</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--text3)">Faiz</th></tr></thead><tbody>' + satirHtml + '</tbody></table></div></div>';
}

function acikFaizGuncelle() { oranGuncelle('oran-kanuni', 'Adi Kanuni'); }

function oranGuncelle(elId, label) {
  var el = document.getElementById(elId);
  if (!el) return;
  var curOran = el.dataset.oran || el.textContent.replace('%','').replace(',','.');
  var yeni = prompt(label + ' faiz oranını girin (%):' , curOran);
  if (yeni === null) return;
  var num = parseFloat(yeni.replace(',','.'));
  if (isNaN(num) || num <= 0 || num > 200) {
    alert('Geçersiz oran. 0-200 arası bir değer girin.');
    return;
  }
  el.dataset.oran = num;
  // Kalıcı kaydet — initFaizPage sayfa açılışında geri yükler
  // (eskiden hiç kaydedilmediği için güncellenen oran yenilemede kayboluyordu)
  try {
    var kayitliOranlar = JSON.parse(localStorage.getItem('hukuk_faiz_oranlari') || '{}');
    kayitliOranlar[elId] = num;
    localStorage.setItem('hukuk_faiz_oranlari', JSON.stringify(kayitliOranlar));
  } catch(e) {}
  // Virgüllü gösterim
  var display = num % 1 === 0 ? num.toString() : num.toString().replace('.',',');
  el.textContent = '%' + display;
  // Güncelleme notu
  var notEl = el.nextElementSibling;
  if (notEl && notEl.style && notEl.textContent) {
    notEl.textContent = 'Güncellendi · ' + new Date().toLocaleDateString('tr-TR');
  }
  notify(label + ' oranı güncellendi: %' + display);
}


function initFaizPage() {
  // Elle güncellenmiş oranları geri yükle (oranGuncelle ile kaydedilir) —
  // fhHesapla oranı DOM'daki data-oran'dan okuduğu için oraya uygulanır
  try {
    const kayitli = JSON.parse(localStorage.getItem('hukuk_faiz_oranlari') || '{}');
    Object.keys(kayitli).forEach(elId => {
      const el = document.getElementById(elId);
      const num = Number(kayitli[elId]);
      if (el && num > 0) {
        el.dataset.oran = num;
        el.textContent = '%' + (num % 1 === 0 ? num.toString() : num.toString().replace('.', ','));
      }
    });
  } catch(e) {}
  const today = new Date().toISOString().slice(0,10);
  // Doğru id 'fh-bitis' (metin input, GG.AA.YYYY) — eski kod var olmayan
  // 'fh-bit'e yazdığı için varsayılan bitiş tarihi hiç atanmıyordu
  const bitEl = document.getElementById('fh-bitis');
  if (bitEl && !bitEl.value) setDateValue(bitEl, today);
  // Tarih tablosu
  const tbody = document.getElementById('fh-tarih-tbody');
  if (tbody) {
    tbody.innerHTML = [...FAIZ_TARIHLERI].reverse().map(r =>
      '<tr><td class="mono">' + r.bas + '</td><td class="mono">' + (r.bit||'Bugün') + '</td>'
      + '<td class="mono" style="color:var(--gold)">%' + r.kanuni + '</td>'
      + '<td class="mono" style="color:var(--gold2)">%' + String(r.avans).replace('.',',') + '</td>'
      + '<td class="mono">%' + String(r.reeskont).replace('.',',') + '</td></tr>'
    ).join('');
  }
  fhDosyaListesi();
}

function fhDosyaListesi() {
  const tur = document.getElementById('fh-dosya-tur')?.value || 'dava';
  const sel = document.getElementById('fh-dosya-sec');
  if (!sel) return;
  if (tur === 'dava') {
    const davalar = DB.get('davalar');
    sel.innerHTML = '<option value="">— Dosya seçin —</option>' +
      davalar.map(d => '<option value="dava_' + d.id + '">' + (d.no||'') + (d.muvekkil?' · '+d.muvekkil:'') + '</option>').join('');
  } else {
    const icralar = DB.get('icralar');
    sel.innerHTML = '<option value="">— Dosya seçin —</option>' +
      icralar.map(i => '<option value="icra_' + i.id + '">' + (i.no||'') + ' · ' + (i.borclu||'') + '</option>').join('');
  }
}

function fhDosyaDoldur() {
  const val = document.getElementById('fh-dosya-sec')?.value;
  if (!val) return;
  const [tur, id] = val.split('_');
  let alacak = 0;
  if (tur === 'dava') {
    const d = DB.get('davalar').find(x => x.id === id);
    if (d) alacak = Number(d.davaDegeri || d.akdiUcret || 0);
  } else {
    const i = DB.get('icralar').find(x => x.id === id);
    if (i) alacak = Number(i.alacak || 0);
  }
  if (alacak > 0) {
    document.getElementById('fh-anapara').value = alacak;
    fhHesapla();
    notify('Anapara alanı dolduruldu: ' + fmt(alacak) + ' ₺');
  } else {
    notify('Bu dosyada alacak tutarı bulunamadı');
  }
}

// ========== SEKME SİSTEMİ ==========
let _tabs = [];
let _activeTabId = null;
let _tabCtxTargetId = null;

// V1: Short label generator
function _tabShortLabel(t) {
  if (!t.subpage) return (pageTitles && pageTitles[t.page]) || t.label || 'Sayfa';
  if (t.subpage === 'dava-detail' && t.itemId) {
    var d = DB.get('davalar').find(function(x){return x.id===t.itemId;});
    if (d) {
      var soyad = (d.muvekkil||'').split(' ').pop();
      return d.no + (soyad ? ' · ' + soyad : '');
    }
  }
  if (t.subpage === 'icra-detail' && t.itemId) {
    var ic = DB.get('icralar').find(function(x){return x.id===t.itemId;});
    if (ic) return (ic.bki||ic.no) + (ic.borclu ? ' · ' + ic.borclu.split(' ').pop() : '');
  }
  if (t.subpage === 'muvekkil-detail' && t.itemId) {
    var mv = DB.get('muvekkiller').find(function(x){return x.id===t.itemId;});
    if (mv) return mv.ad.length > 20 ? mv.ad.slice(0,18)+'…' : mv.ad;
  }
  return t.label.length > 25 ? t.label.slice(0,23)+'…' : t.label;
}

// V1: Full label for tooltip
function _tabFullLabel(t) {
  if (!t.subpage) return (pageTitles && pageTitles[t.page]) || t.label;
  if (t.subpage === 'dava-detail' && t.itemId) {
    var d = DB.get('davalar').find(function(x){return x.id===t.itemId;});
    if (d) return d.no + ' — ' + (d.muvekkil||'') + (d.karsi?' vs '+d.karsi:'') + (d.mahkeme?' — '+d.mahkeme:'');
  }
  return t.label;
}

// V4: Type class
function _tabTypeClass(t) {
  if (t.subpage === 'dava-detail') return 'tab-type-dava';
  if (t.subpage === 'icra-detail') return 'tab-type-icra';
  if (t.subpage === 'muvekkil-detail') return 'tab-type-muvekkil';
  return 'tab-type-page';
}

function tabEkle(label, icon, page, subpage, itemId) {
  const existing = itemId
    ? _tabs.find(t => t.itemId === itemId && t.subpage === subpage)
    : _tabs.find(t => !t.itemId && t.page === page && !t.subpage);
  if (existing) { tabAktiflestir(existing.id); return; }
  const id = 'tab_' + Date.now();
  _tabs.push({id, label, icon: icon||'📌', page: page||'dashboard', subpage: subpage||null, itemId: itemId||null});
  tabRender();
  tabAktiflestir(id);
  _tabSaveSession();
}

function tabAktiflestir(tabId) {
  _activeTabId = tabId;
  const t = _tabs.find(x => x.id === tabId);
  if (!t) return;
  showPage(t.page);
  if (t.subpage === 'dava-detail' && t.itemId) openDavaDetailPage(t.itemId);
  else if (t.subpage === 'icra-detail' && t.itemId) showIcraDetail(t.itemId);
  else if (t.subpage === 'muvekkil-detail' && t.itemId) { showPage('kisiler'); setTimeout(()=>showMuvekkilDetail(t.itemId),50); }
  tabRender();
  _tabSaveSession();
  // F4: Scroll active tab into view
  setTimeout(function(){
    var bar = document.getElementById('tab-bar');
    var activeEl = bar && bar.querySelector('.tab-item.active');
    if (activeEl) activeEl.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
  }, 50);
}

function tabKapat(tabId, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  var wasActive = (_activeTabId === tabId);
  _tabs = _tabs.filter(t => t.id !== tabId);
  if (wasActive) {
    if (_tabs.length) {
      // En sondaki sekmeye geç
      _activeTabId = _tabs[_tabs.length - 1].id;
      tabAktiflestir(_activeTabId);
    } else {
      // Hiç sekme kalmadı → Gösterge Paneli'ne yönlendir
      _activeTabId = null;
      // Açık dava/icra detay sayfalarını kapat
      var ddp = document.getElementById('dava-detail-page');
      if (ddp && ddp.classList.contains('open')) {
        ddp.classList.remove('open');
        var ddpCtx = document.getElementById('ddp-topbar-context');
        if (ddpCtx) ddpCtx.style.display = 'none';
        currentDavaId = null;
      }
      var idp = document.getElementById('icra-detail-page');
      if (idp && idp.classList.contains('open')) {
        idp.classList.remove('open');
        currentIcraId = null;
      }
      showPage('dashboard');
      // Sidebar'da Gösterge Paneli nav öğesini aktif işaretle
      document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.remove('active');
      });
      var dashNav = document.querySelector('.nav-item[onclick*="dashboard"]');
      if (dashNav) dashNav.classList.add('active');
    }
  }
  tabRender();
  _tabSaveSession();
}

function tabRender() {
  const bar = document.getElementById('tab-bar');
  if (!bar) return;
  bar.innerHTML = _tabs.map(function(t) {
    var shortLabel = _tabShortLabel(t);
    var fullLabel = _tabFullLabel(t);
    var typeClass = _tabTypeClass(t);
    var isActive = t.id === _activeTabId;
    return '<div class="tab-item ' + typeClass + (isActive ? ' active' : '') + '" '
      + 'onclick="tabAktiflestir(\'' + t.id + '\')" '
      + 'onmousedown="_tabMiddleClick(event,\'' + t.id + '\')" '
      + 'oncontextmenu="_tabCtxOpen(event,\'' + t.id + '\')" '
      + 'draggable="true" ondragstart="_tabDragStart(event,\'' + t.id + '\')" ondragover="_tabDragOver(event)" ondrop="_tabDrop(event,\'' + t.id + '\')" ondragend="_tabDragEnd(event)" '
      + 'title="' + escAttr(fullLabel) + '" data-tab-id="' + t.id + '">'
      + '<span class="tab-item-icon">' + t.icon + '</span>'
      + '<span class="tab-label">' + escHtml(shortLabel) + '</span>'
      + '<span class="tab-x" onclick="tabKapat(\'' + t.id + '\',event)" title="Kapat">✕</span>'
      + '</div>';
  }).join('');
  // F4: Update scroll button visibility
  _tabUpdateScrollBtns();
}

// F1: Middle-click to close
function _tabMiddleClick(e, tabId) {
  if (e.button === 1) { e.preventDefault(); tabKapat(tabId); }
}

// F2: Drag and drop reordering
var _tabDragId = null;
function _tabDragStart(e, tabId) {
  _tabDragId = tabId;
  e.dataTransfer.effectAllowed = 'move';
  e.target.classList.add('dragging');
}
function _tabDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  var target = e.target.closest('.tab-item');
  document.querySelectorAll('.tab-item.drag-over').forEach(function(el){el.classList.remove('drag-over');});
  if (target && target.dataset.tabId !== _tabDragId) target.classList.add('drag-over');
}
function _tabDrop(e, targetId) {
  e.preventDefault();
  document.querySelectorAll('.tab-item.drag-over').forEach(function(el){el.classList.remove('drag-over');});
  if (!_tabDragId || _tabDragId === targetId) return;
  var fromIdx = _tabs.findIndex(function(t){return t.id===_tabDragId;});
  var toIdx = _tabs.findIndex(function(t){return t.id===targetId;});
  if (fromIdx < 0 || toIdx < 0) return;
  var item = _tabs.splice(fromIdx, 1)[0];
  _tabs.splice(toIdx, 0, item);
  tabRender();
  _tabSaveSession();
}
function _tabDragEnd(e) {
  _tabDragId = null;
  document.querySelectorAll('.tab-item.dragging,.tab-item.drag-over').forEach(function(el){el.classList.remove('dragging','drag-over');});
}

// F3: Context menu
function _tabCtxOpen(e, tabId) {
  e.preventDefault();
  e.stopPropagation();
  _tabCtxTargetId = tabId;
  var menu = document.getElementById('tab-ctx-menu');
  if (!menu) return;
  menu.style.display = 'block';
  menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 140) + 'px';
  setTimeout(function(){ document.addEventListener('click', _tabCtxClose, {once:true}); }, 10);
}
function _tabCtxClose() {
  var menu = document.getElementById('tab-ctx-menu');
  if (menu) menu.style.display = 'none';
  _tabCtxTargetId = null;
}
function _tabCtxAction(action) {
  var targetId = _tabCtxTargetId;
  _tabCtxClose();
  if (!targetId) return;
  var idx = _tabs.findIndex(function(t){return t.id===targetId;});
  if (action === 'close') { tabKapat(targetId); }
  else if (action === 'closeOthers') {
    _tabs = _tabs.filter(function(t){return t.id===targetId;});
    _activeTabId = targetId;
    tabAktiflestir(targetId);
  }
  else if (action === 'closeRight') {
    _tabs = _tabs.slice(0, idx + 1);
    if (!_tabs.find(function(t){return t.id===_activeTabId;})) {
      _activeTabId = _tabs.length ? _tabs[_tabs.length-1].id : null;
      if (_activeTabId) tabAktiflestir(_activeTabId);
    }
    tabRender();
  }
  else if (action === 'closeAll') {
    _tabs = [];
    _activeTabId = null;
    tabRender();
    showPage('dashboard');
  }
  _tabSaveSession();
}

// F4: Scroll buttons
function _tabScrollLeft() {
  var bar = document.getElementById('tab-bar');
  if (bar) bar.scrollBy({left:-150, behavior:'smooth'});
}
function _tabScrollRight() {
  var bar = document.getElementById('tab-bar');
  if (bar) bar.scrollBy({left:150, behavior:'smooth'});
}
function _tabUpdateScrollBtns() {
  var bar = document.getElementById('tab-bar');
  var left = document.getElementById('tab-scroll-left');
  var right = document.getElementById('tab-scroll-right');
  if (!bar || !left || !right) return;
  var hasOverflow = bar.scrollWidth > bar.clientWidth + 2;
  left.classList.toggle('visible', hasOverflow && bar.scrollLeft > 5);
  right.classList.toggle('visible', hasOverflow && bar.scrollLeft < bar.scrollWidth - bar.clientWidth - 5);
}
// Listen for scroll
setTimeout(function(){
  var bar = document.getElementById('tab-bar');
  if (bar) { bar.addEventListener('scroll', _tabUpdateScrollBtns); new ResizeObserver(_tabUpdateScrollBtns).observe(bar); }
}, 500);

// F5: Session storage - save/restore tabs
function _tabSaveSession() {
  try {
    sessionStorage.setItem('hukuk_tabs', JSON.stringify({tabs:_tabs, activeId:_activeTabId}));
  } catch(e){}
}
function _tabRestoreSession() {
  try {
    var data = JSON.parse(sessionStorage.getItem('hukuk_tabs'));
    if (data && data.tabs && data.tabs.length) {
      _tabs = data.tabs;
      _activeTabId = data.activeId;
      tabRender();
      if (_activeTabId) {
        var t = _tabs.find(function(x){return x.id===_activeTabId;});
        if (t) setTimeout(function(){ tabAktiflestir(_activeTabId); }, 200);
      }
    }
  } catch(e){}
}

// F7: Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  // Ctrl+W: close active tab
  if ((e.ctrlKey || e.metaKey) && e.key === 'w' && _activeTabId && _tabs.length > 0) {
    // Don't intercept browser's close-tab if only browser tab
    e.preventDefault();
    tabKapat(_activeTabId);
  }
  // Ctrl+Tab: next tab
  if (e.ctrlKey && e.key === 'Tab' && _tabs.length > 1) {
    e.preventDefault();
    var idx = _tabs.findIndex(function(t){return t.id===_activeTabId;});
    var nextIdx = e.shiftKey ? (idx - 1 + _tabs.length) % _tabs.length : (idx + 1) % _tabs.length;
    tabAktiflestir(_tabs[nextIdx].id);
  }
});

function tabDavaSec(davaId) {
  const d = DB.get('davalar').find(x => x.id === davaId);
  if (!d) return;
  // V1: Label will be generated dynamically by _tabShortLabel
  tabEkle(d.no + (d.ad ? ' · ' + d.ad : ''), '📁', 'davalar', 'dava-detail', davaId);
}

function tabIcraSec(icraId) {
  const i = DB.get('icralar').find(x => x.id === icraId);
  if (!i) return;
  tabEkle(i.no + (i.borclu ? ' · ' + i.borclu : ''), '⚡', 'icralar', 'icra-detail', icraId);
}

// F5: Restore tabs on page load
setTimeout(function(){ _tabRestoreSession(); }, 300);



// ========== SAĞ TIK CONTEXT MENU ==========
let _ncmPage = null, _ncmLabel = null, _ncmIcon = null;

function navContextMenu(e, page, label, icon) {
  e.preventDefault();
  e.stopPropagation();
  _ncmPage = page; _ncmLabel = label; _ncmIcon = icon || '📌';
  const menu = document.getElementById('nav-context-menu');
  const lbl = document.getElementById('ncm-label');
  if (lbl) lbl.textContent = (icon || '📌') + ' ' + label;
  if (!menu) return;
  // Pozisyon
  menu.style.display = 'block';
  const mx = Math.min(e.clientX, window.innerWidth - 200);
  const my = Math.min(e.clientY, window.innerHeight - 100);
  menu.style.left = mx + 'px';
  menu.style.top = my + 'px';
}

function ncmClose() {
  const menu = document.getElementById('nav-context-menu');
  if (menu) menu.style.display = 'none';
  _ncmPage = null;
}

function ncmGo() {
  if (_ncmPage) showPage(_ncmPage);
  ncmClose();
}

function ncmOpenTab() {
  if (_ncmPage) tabEkle(_ncmLabel || _ncmPage, _ncmIcon || '📌', _ncmPage);
  ncmClose();
}

// Herhangi bir tıklamada kapat
document.addEventListener('mousedown', (e) => {
  const dd = document.getElementById('f-ilgili-dropdown');
  const inp = document.getElementById('f-ilgili');
  if (dd && inp && !dd.contains(e.target) && e.target !== inp) dd.style.display = 'none';
  const menu = document.getElementById('nav-context-menu');
  if (menu && !menu.contains(e.target) && !e.target.closest('.nav-item')) ncmClose();
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') ncmClose(); });


function satisAvansEkle(icraId) {
  const tur = document.getElementById('sa-tur-' + icraId)?.value || 'tasinmaz';
  const varlikSel = document.getElementById('sa-varlik-' + icraId)?.value || '';
  const manuelEl = document.getElementById('sa-manuel-' + icraId);
  const tarih = document.getElementById('sa-tarih-' + icraId)?.value || new Date().toISOString().slice(0,10);
  const tutar = document.getElementById('sa-tutar-' + icraId)?.value || '';

  // Varlik belirleme: manuel mi, seçili mal mı?
  let varlikLabel = '';
  if (varlikSel === '__manuel__' || varlikSel === '') {
    varlikLabel = manuelEl?.value?.trim() || '';
    if (!varlikLabel) { notify('Lütfen mal bilgisi girin veya listeden seçin'); return; }
  } else if (varlikSel.startsWith('tsnmz:')) {
    varlikLabel = varlikSel.slice(6).split(':').filter(Boolean).join(' — ');
  } else if (varlikSel.startsWith('arac:')) {
    varlikLabel = varlikSel.slice(5).split(':').filter(Boolean).join(' — ');
  } else {
    varlikLabel = varlikSel;
  }

  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  if (!data.satisAvanslariList) data.satisAvanslariList = [];
  data.satisAvanslariList.push({ tur, varlik: varlikLabel, tarih, tutar });
  localStorage.setItem('icra_haciz_' + icraId, JSON.stringify(data));
  showIcraDetail(icraId);
  notify('Satış avansı eklendi ✓');
}

function saManuelGoster(icraId, val) {
  const el = document.getElementById('sa-manuel-wrap-' + icraId);
  const inp = document.getElementById('sa-manuel-' + icraId);
  if (!el) return;
  if (val === '__manuel__' || val === '') {
    el.style.display = 'block';
    el.focus();
  } else {
    el.style.display = 'none';
  }
}

function satisAvansKaldir(icraId, idx) {
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  if (!data.satisAvanslariList) return;
  data.satisAvanslariList.splice(idx, 1);
  localStorage.setItem('icra_haciz_' + icraId, JSON.stringify(data));
  showIcraDetail(icraId);
}

function saVarlikListesiDoldur(icraId) {
  const tur = document.getElementById('sa-tur-' + icraId)?.value || 'tasinmaz';
  const sel = document.getElementById('sa-varlik-' + icraId);
  if (!sel) return;
  const hacizData = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  sel.innerHTML = '<option value="">— Hacizli maldan seç —</option>';
  if (tur === 'tasinmaz') {
    (hacizData.tasinmazlarList || []).forEach(t => {
      const op = document.createElement('option');
      op.value = 'tsnmz:' + t.il + '/' + t.ilce + ':' + (t.adres||'');
      op.text = t.il + '/' + t.ilce + ' — ' + (t.adres || '—');
      sel.appendChild(op);
    });
  } else {
    (hacizData.araclarList || []).forEach(a => {
      const op = document.createElement('option');
      op.value = 'arac:' + a.plaka + ':' + a.marka;
      op.text = a.plaka + ' — ' + a.marka;
      sel.appendChild(op);
    });
  }
}


function finansModalMvDegisti() {
  finasModalMvCari();
  var mv = document.getElementById('f-muvekkil')?.value || '';
  var karsiDosya = document.getElementById('f-karsi-dosya');
  if (!karsiDosya) return;
  if (!mv) {
    karsiDosya.innerHTML = '<option value="">— Önce müvekkil seçin —</option>';
    return;
  }
  var davalar = (DB.get('davalar') || []).filter(function(d){ return d.muvekkil === mv; });
  var icralar = (DB.get('icralar') || []).filter(function(i){ return i.muvekkil === mv; });
  karsiDosya.innerHTML = '<option value="">— Dosya seçin —</option>'
    + (davalar.length ? '<optgroup label="📁 Dava Dosyaları">'
      + davalar.map(function(d){ return '<option value="'+escAttr(d.no)+'">'+escHtml(d.no)+' — '+escHtml(d.muvekkil)+(d.karsi?' vs '+escHtml(d.karsi):'')+'</option>'; }).join('')
      + '</optgroup>' : '')
    + (icralar.length ? '<optgroup label="⚡ İcra Dosyaları">'
      + icralar.map(function(i){ return '<option value="'+escAttr(i.bki||i.no)+'">'+escHtml(i.bki||i.no)+' — '+escHtml(i.borclu)+'</option>'; }).join('')
      + '</optgroup>' : '');
}

function finansTurDegisti() {
  finasModalMvCari();
  const tur = document.getElementById('f-tur').value;
  const karsiWrap = document.getElementById('f-karsi-vekalet-wrap');
  const taksitWrap = document.getElementById('f-taksit-wrap');
  const ofisNot = document.getElementById('f-ofis-not');
  const mvGroup = document.getElementById('f-muvekkil') && document.getElementById('f-muvekkil').closest('.form-group');
  const OFIS_TURLER = ['Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];
  if(karsiWrap) karsiWrap.style.display = tur==='Karşı Vekalet Ücreti' ? '' : 'none';
  if(taksitWrap) taksitWrap.style.display = tur==='Taksit Tahsilatı' ? '' : 'none';
  if(ofisNot) ofisNot.style.display = OFIS_TURLER.includes(tur) ? '' : 'none';
  // Ofis giderleri müvekkile bağlı değil — müvekkil alanını gizle ve sıfırla
  if(mvGroup) {
    mvGroup.style.display = OFIS_TURLER.includes(tur) ? 'none' : '';
    if (OFIS_TURLER.includes(tur)) document.getElementById('f-muvekkil').value = '';
  }
}

function finasModalMvCari() {
  const mv = document.getElementById('f-muvekkil')?.value;
  const cariDiv = document.getElementById('f-mv-cari');
  const cariBoxes = document.getElementById('f-mv-cari-boxes');
  if (!mv || !cariDiv || !cariBoxes) { if (cariDiv) cariDiv.style.display='none'; return; }

  const finans = DB.get('finans');
  const mvFinans = finans.filter(f => f.muvekkil === mv);
  const tahsilat = mvFinans.filter(f=>f.tur==='Tahsilat'||f.tur==='Vekalet Ücreti Tahsilatı'||f.tur==='İcra Vekalet Ücreti').reduce((a,b)=>a+Number(b.tutar),0);
  const masraf = mvFinans.filter(f=>['Masraf','Masraf (Ofis Avansı)','Masraf (Müvekkil Öder)','Dava Masrafı','Harç'].includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const net = tahsilat - masraf;

  // Dava vekalet
  const davalar = DB.get('davalar').filter(d=>d.muvekkil===mv);
  const toplamVekalet = davalar.reduce((a,b)=>a+Number(b.akdiUcret||0),0);
  const tahsilEdilen = davalar.reduce((a,b)=>a+Number(b.tahsilEdilen||0),0);
  const kalan = toplamVekalet - tahsilEdilen;

  cariBoxes.innerHTML = [
    {label:'Toplam Tahsilat', val:'₺'+fmt(tahsilat), color:'var(--green)'},
    {label:'Toplam Masraf', val:'₺'+fmt(masraf), color:'var(--red)'},
    {label:'Net Bakiye', val:'₺'+fmt(net), color: net>=0?'var(--gold)':'var(--red)'},
    {label:'Akdi Vekalet', val:'₺'+fmt(toplamVekalet), color:'var(--text2)'},
    {label:'Tahsil Edilen', val:'₺'+fmt(tahsilEdilen), color:'#7dc495'},
    {label:'Kalan Alacak', val:'₺'+fmt(kalan), color:kalan>0?'var(--gold2)':'var(--text3)'},
  ].map(b=>`
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:8px">
      <div style="font-size:10px;color:var(--text3);margin-bottom:3px">${b.label}</div>
      <div style="font-size:14px;font-weight:700;color:${b.color};font-family:'DM Mono',monospace">${b.val}</div>
    </div>`).join('');

  // Dosya listesini de doldur
  const sel = document.getElementById('dosya-list-dl');
  if (sel) {
    const icralar = DB.get('icralar');
    sel.innerHTML = [...davalar.map(d=>`<option value="${escAttr(d.ad||d.no)}">`), ...icralar.filter(i=>i.muvekkil===mv).map(i=>`<option value="${escAttr(i.no)}">`)].join('');
  }

  cariDiv.style.display = '';
}


function finansMvFiltrele() {
  const mv = document.getElementById('finans-mv-filter')?.value || '';
  const tbody = document.getElementById('finans-tbody');
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const rowMv = row.dataset.muvekkil || '';
    row.style.display = (!mv || rowMv === mv) ? '' : 'none';
  });
}

function finansMvCarisi() {
  const mv = document.getElementById('finans-mv-filter')?.value;
  const cariDiv = document.getElementById('finans-mv-cari');
  if (!cariDiv) return;
  if (!mv) { cariDiv.style.display='none'; return; }

  const finans = DB.get('finans').filter(f=>f.muvekkil===mv);
  const tahsilat = finans.filter(f=>['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'].includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const masraf = finans.filter(f=>['Masraf','Masraf (Ofis Avansı)','Masraf (Müvekkil Öder)','Dava Masrafı','Harç'].includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const net = tahsilat - masraf;

  const davalar = DB.get('davalar').filter(d=>d.muvekkil===mv);
  const icralar = DB.get('icralar').filter(i=>i.muvekkil===mv);
  const toplamVekalet = davalar.reduce((a,b)=>a+Number(b.akdiUcret||0),0);
  const tahsilEdilen = davalar.reduce((a,b)=>a+Number(b.tahsilEdilen||0),0);

  cariDiv.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="font-size:14px;font-weight:600;color:var(--text)">📊 ${mv} — Cari Hesap</div>
        <button onclick="document.getElementById('finans-mv-cari').style.display='none'" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px">×</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:12px">
        ${[
          {label:'Toplam Tahsilat', val:'₺'+fmt(tahsilat), color:'var(--green)'},
          {label:'Toplam Masraf', val:'₺'+fmt(masraf), color:'var(--red)'},
          {label:'Net Bakiye', val:'₺'+fmt(net), color:net>=0?'var(--gold)':'var(--red)'},
          {label:'Akdi Vekalet', val:'₺'+fmt(toplamVekalet), color:'var(--text2)'},
          {label:'Tahsil Edilen', val:'₺'+fmt(tahsilEdilen), color:'#7dc495'},
          {label:'Aktif Dava', val:davalar.filter(d=>d.durum==='Aktif').length+' dosya', color:'var(--gold)'},
          {label:'Aktif İcra', val:icralar.filter(i=>i.durum==='Aktif').length+' dosya', color:'#7ab5d4'},
        ].map(b=>`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px">
          <div style="font-size:10px;color:var(--text3);margin-bottom:4px">${b.label}</div>
          <div style="font-size:16px;font-weight:700;color:${b.color};font-family:'DM Mono',monospace">${b.val}</div>
        </div>`).join('')}
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:6px">Son İşlemler:</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${finans.slice(-5).reverse().map(f=>`
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:10px;color:var(--text3);width:80px;flex-shrink:0">${fmtDate(f.tarih)}</span>
            <span style="font-size:11px;color:${f.tur==='Tahsilat'||f.tur==='Vekalet Ücreti Tahsilatı'?'var(--green)':'var(--red)'}">${f.tur==='Tahsilat'||f.tur==='Vekalet Ücreti Tahsilatı'?'↗':'↘'} ${f.tur}</span>
            <span style="flex:1;font-size:12px;color:var(--text3)">${f.aciklama||'—'}</span>
            <span style="font-size:13px;font-weight:600;color:${['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'].includes(f.tur)?'var(--green)':'var(--red)'};font-family:'DM Mono',monospace">₺${fmt(f.tutar)}</span>
          </div>`).join('') || '<div style="color:var(--text3);font-size:12px">İşlem bulunamadı</div>'}
      </div>
    </div>`;
  cariDiv.style.display = '';
}


function yeniFinansEkle(muvekkil, dosya) {
  editingId = null;
  document.getElementById('modal-finans-title').textContent = 'Yeni Finansal İşlem';
  openModal('modal-finans');
  populateMuvekkilSelects();
  setTimeout(() => {
    const mvSel = document.getElementById('f-muvekkil');
    if (mvSel && muvekkil) {
      mvSel.value = muvekkil;
      if (typeof finasModalMvCari === 'function') finasModalMvCari();
    }
    const ilgili = document.getElementById('f-ilgili');
    if (ilgili && dosya) ilgili.value = dosya;
    const tarih = document.getElementById('f-tarih');
    if (tarih && !tarih.value) tarih.value = new Date().toISOString().slice(0,10);
    const tutarEl = document.getElementById('f-tutar');
    if (tutarEl) initParaInput(tutarEl);
  }, 120);
}

function saToggle(icraId, varMi) {
  const panel = document.getElementById('sa-panel-' + icraId);
  const yokBtn = document.getElementById('sa-yok-btn-' + icraId);
  const varBtn = document.getElementById('sa-var-btn-' + icraId);
  if (!panel) return;
  if (varMi) {
    panel.style.display = 'block';
    if (yokBtn) { yokBtn.style.background='var(--bg3)'; yokBtn.style.color='var(--text3)'; }
    if (varBtn) { varBtn.style.background='var(--green)'; varBtn.style.color='#fff'; }
  } else {
    panel.style.display = 'none';
    if (yokBtn) { yokBtn.style.background='var(--red)'; yokBtn.style.color='#fff'; }
    if (varBtn) { varBtn.style.background='var(--bg3)'; varBtn.style.color='var(--text3)'; }
  }
}

// ── MÜVEKKİL ÜCRET ANLAŞMALARI ──
let _mvUcretAnlasmalari = [];

function mvUcretListeYukle(mv) {
  _mvUcretAnlasmalari = mv.ucretAnlasmalari ? JSON.parse(JSON.stringify(mv.ucretAnlasmalari)) : [];
  if (_mvUcretAnlasmalari.length === 0 && mv.ucretTur && mv.ucretTutar > 0) {
    _mvUcretAnlasmalari.push({ tur: mv.ucretTur, tutar: mv.ucretTutar, periyot: mv.ucretPeriyot||'aylik', kdv: mv.ucretKdv||'dahil', not: '' });
  }
  mvUcretListeRender();
}

function mvUcretListeRender() {
  const el = document.getElementById('m-ucret-liste');
  if (!el) return;
  const TURLER = {'avukatlik':'⚖️ Avukatlık','aylik_danismanlik':'📅 Aylık Dan.','yillik_danismanlik':'📆 Yıllık Dan.','saatlik':'⏱ Saatlik','basari_primi':'🏆 Başarı Primi','karma':'🔀 Karma','pesinat':'💵 Peşinat','diger':'📝 Diğer'};
  if (!_mvUcretAnlasmalari.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);font-style:italic;padding:6px 0">Henüz anlaşma eklenmedi — tutarı girip + butonuna basın</div>';
    return;
  }
  el.innerHTML = _mvUcretAnlasmalari.map((a, i) => {
    const pLabel = a.periyot==='aylik'?'/ay':a.periyot==='yillik'?'/yıl':a.periyot==='uc_aylik'?'/3 ay':a.periyot==='alti_aylik'?'/6 ay':'';
    return '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:7px;margin-bottom:5px">'
      + '<span style="font-size:12px;flex-shrink:0">' + (TURLER[a.tur]||a.tur) + '</span>'
      + '<span style="font-size:14px;font-weight:700;color:var(--gold);font-family:monospace;flex:1">₺' + fmt(a.tutar) + (pLabel?'<span style="font-size:11px;color:var(--text3)">'+pLabel+'</span>':'') + '</span>'
      + (a.kdv==='haric'?'<span style="font-size:10px;color:var(--text3);background:var(--bg3);padding:2px 6px;border-radius:4px">+KDV</span>':'')
      + (a.not?'<span style="font-size:11px;color:var(--text3);font-style:italic">'+escHtml(a.not)+'</span>':'')
      + '<button onclick="_mvUcretAnlasmalari.splice('+i+',1);mvUcretListeRender()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:2px 4px">✕</button>'
      + '</div>';
  }).join('');
}

function mvUcretAnlasmaEkle() {
  const tur = document.getElementById('m-ucret-tur')?.value || 'avukatlik';
  const tutarRaw = document.getElementById('m-ucret-tutar')?.value || '';
  const tutar = parsePara(tutarRaw);
  if (!tutar || tutar <= 0) {
    const el = document.getElementById('m-ucret-tutar');
    if (el) { el.style.borderColor='var(--red)'; el.focus(); setTimeout(()=>el.style.borderColor='',1500); }
    notify('Tutar giriniz'); return;
  }
  const periyot = document.getElementById('m-ucret-periyot')?.value || '';
  const kdv = document.getElementById('m-ucret-kdv')?.value || 'dahil';
  const not2 = document.getElementById('m-ucret-not')?.value || '';
  _mvUcretAnlasmalari.push({ tur, tutar, periyot, kdv, not: not2 });
  mvUcretListeRender();
  const tutarEl = document.getElementById('m-ucret-tutar');
  if (tutarEl) { tutarEl.value = ''; tutarEl.focus(); }
  const notEl = document.getElementById('m-ucret-not');
  if (notEl) notEl.value = '';
}

function mvUcretTurDegisti() {
  const tur = document.getElementById('m-ucret-tur')?.value || '';
  const periyotWrap = document.getElementById('m-ucret-periyot-wrap');
  const label = document.getElementById('m-ucret-label');
  if (periyotWrap) periyotWrap.style.display = ['aylik_danismanlik','yillik_danismanlik','saatlik','karma'].includes(tur) ? '' : 'none';
  const labels = {'avukatlik':'Tutar (₺)','aylik_danismanlik':'Aylık Tutar (₺)','yillik_danismanlik':'Yıllık Tutar (₺)','saatlik':'Saatlik Ücret (₺)','basari_primi':'Oran (%)','karma':'Sabit Tutar (₺)','pesinat':'Peşinat (₺)','diger':'Tutar (₺)'};
  if (label) label.textContent = labels[tur] || 'Tutar (₺)';
  const el = document.getElementById('m-ucret-tutar');
  if (el) initParaInput(el);
}

function mvHizliTahsilat(mvId, mvAd) {
  const mv = DB.get('muvekkiller').find(m => m.id === mvId);
  const anls = mv?.ucretAnlasmalari || [];
  window._htAnlasmalari = anls;
  window._htMvId = mvId;
  window._htMvAd = mvAd;

  const existing = document.getElementById('hizli-tahsilat-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'hizli-tahsilat-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center';

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:22px;width:420px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:15px;font-weight:600;color:var(--text);margin-bottom:14px';
  title.textContent = '+ Tahsilat Ekle — ' + mvAd;
  box.appendChild(title);

  // Anlaşma hızlı seçim butonları
  if (anls.length > 0) {
    const TURLER = {'avukatlik':'⚖️ Avukatlık','aylik_danismanlik':'📅 Aylık Dan.','yillik_danismanlik':'📆 Yıllık Dan.','saatlik':'⏱ Saatlik','basari_primi':'🏆 Başarı Primi','pesinat':'💵 Peşinat','diger':'📝 Diğer'};
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--text3);margin-bottom:8px';
    hint.textContent = 'Hızlı seçim:';
    box.appendChild(hint);
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:14px';
    anls.forEach(function(a, i) {
      const btn = document.createElement('button');
      btn.style.cssText = 'background:var(--bg3);border:1px solid rgba(201,168,76,0.3);border-radius:8px;padding:8px 12px;color:var(--text2);font-size:12px;cursor:pointer;text-align:left';
      const turLabel = TURLER[a.tur]||a.tur;
      const tutarTxt = a.tutar > 0 ? '  ₺'+fmt(a.tutar)+(a.periyot==='aylik'?'/ay':a.periyot==='yillik'?'/yıl':'') : '';
      btn.innerHTML = '<span style="font-weight:600;color:var(--text)">' + escHtml(turLabel) + '</span>'
        + (tutarTxt ? '<span style="color:var(--gold);font-family:monospace;margin-left:8px">' + tutarTxt + '</span>' : '');
      btn.addEventListener('click', function() { htSecAnlasma(i); });
      btnRow.appendChild(btn);
    });
    box.appendChild(btnRow);
    const sep = document.createElement('div');
    sep.style.cssText = 'font-size:11px;color:var(--text3);margin-bottom:8px;border-top:1px solid var(--border);padding-top:10px';
    sep.textContent = 'veya manuel:';
    box.appendChild(sep);
  }

  // Input alanları
  const inputRow = document.createElement('div');
  inputRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px';
  const tutarInput = document.createElement('input');
  tutarInput.id = 'ht-tutar';
  tutarInput.type = 'text';
  tutarInput.inputMode = 'decimal';
  tutarInput.placeholder = 'Tutar (₺)';
  tutarInput.style.cssText = 'font-family:monospace;font-size:14px;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;color:var(--text);outline:none';
  const aciklamaInput = document.createElement('input');
  aciklamaInput.id = 'ht-aciklama';
  aciklamaInput.placeholder = 'Açıklama...';
  aciklamaInput.style.cssText = 'font-size:13px;padding:8px 10px;background:var(--bg3);border:1px solid var(--border);border-radius:7px;color:var(--text);outline:none';
  inputRow.appendChild(tutarInput);
  inputRow.appendChild(aciklamaInput);
  box.appendChild(inputRow);

  // Butonlar
  const btnDiv = document.createElement('div');
  btnDiv.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
  const iptalBtn = document.createElement('button');
  iptalBtn.textContent = 'İptal';
  iptalBtn.style.cssText = 'background:none;border:1px solid var(--border);border-radius:7px;color:var(--text2);padding:8px 16px;cursor:pointer';
  iptalBtn.addEventListener('click', function() { overlay.remove(); });
  const kaydetBtn = document.createElement('button');
  kaydetBtn.textContent = 'Kaydet ✓';
  kaydetBtn.style.cssText = 'background:var(--gold);border:none;border-radius:7px;color:#1a1600;padding:8px 20px;cursor:pointer;font-weight:600';
  kaydetBtn.addEventListener('click', function() { htKaydet(mvId, mvAd); });
  btnDiv.appendChild(iptalBtn);
  btnDiv.appendChild(kaydetBtn);
  box.appendChild(btnDiv);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  setTimeout(function() { tutarInput.focus(); }, 50);
  initParaInput(tutarInput);
}

function htSecAnlasma(idx) {
  const a = window._htAnlasmalari?.[idx];
  if (!a) return;
  const TURLER = {'avukatlik':'Avukatlık','aylik_danismanlik':'Aylık Danışmanlık','yillik_danismanlik':'Yıllık Danışmanlık','saatlik':'Saatlik','basari_primi':'Başarı Primi','pesinat':'Peşinat','diger':'Diğer'};
  if (a.tutar > 0) document.getElementById('ht-tutar').value = a.tutar.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const ay = new Date().toLocaleString('tr-TR',{month:'long',year:'numeric'});
  document.getElementById('ht-aciklama').value = (TURLER[a.tur]||a.tur) + (a.periyot==='aylik'?' — '+ay:'');
  document.getElementById('ht-tutar').focus();
}

function htKaydet(mvId, mvAd) {
  const tutar = parsePara(document.getElementById('ht-tutar')?.value);
  const aciklama = document.getElementById('ht-aciklama')?.value?.trim() || 'Ücret tahsilatı';
  if (!tutar || tutar <= 0) { notify('Tutar giriniz'); return; }
  mvTahsilatEkle(mvAd, tutar, aciklama);
  document.getElementById('hizli-tahsilat-modal')?.remove();
  notify('Tahsilat kaydedildi: ₺' + fmt(tutar) + ' ✓');
  showMuvekkilDetail(mvId);
}

function mvGeri(accountType, accountId) {
  if (accountType === 'muvekkil') {
    showPage('kisiler');
    setTimeout(() => { showSubpage('muvekkil-list'); renderMuvekkiller(); }, 50);
  } else {
    var kl = document.getElementById('kisi-list-view');
    var kd = document.getElementById('kisi-detail-view');
    if (kl) kl.style.display = '';
    if (kd) kd.style.display = 'none';
    renderKisiler();
  }
}

function mvGeriEdit(accountType, accountId) {
  if (accountType === 'muvekkil') editMuvekkil(accountId);
  else editKisi(accountId);
}

function tabMuvekkilAc(mvId) {
  const m = DB.get('muvekkiller').find(x => x.id === mvId);
  if (!m) return;
  tabEkle('👤 ' + m.ad, '👤', 'kisiler', 'muvekkil-detail', mvId);
  showMuvekkilDetail(mvId);
}

function mvFinansModalAc(mvAd, tip) {
  editingId = null;
  document.getElementById('modal-finans-title').textContent = 'Yeni Finansal İşlem';
  openModal('modal-finans');
  populateMuvekkilSelects();
  setTimeout(() => {
    const mvSel = document.getElementById('f-muvekkil');
    if (mvSel) { mvSel.value = mvAd; if (typeof finasModalMvCari === 'function') finasModalMvCari(); }
    const turSel = document.getElementById('f-tur');
    if (turSel) {
      if (tip === 'masraf') turSel.value = 'Masraf (Ofis Avansı)'; // Avukat kendi cebinden ödedi
      else if (tip === 'diger') turSel.value = 'Diğer';
    }
    const tarih = document.getElementById('f-tarih');
    if (tarih && !tarih.value) tarih.value = new Date().toISOString().slice(0,10);
    const tutarEl = document.getElementById('f-tutar');
    if (tutarEl) initParaInput(tutarEl);
    tutarEl?.focus();
  }, 120);
}

function mvTahsilatEkle(mvAd, tutar, aciklama) {
  const today = new Date().toISOString().slice(0,10);
  const obj = {
    id: DB.genId(),
    tur: 'Tahsilat',
    tarih: today,
    tutar: tutar,
    muvekkil: mvAd,
    aciklama: aciklama || 'Ücret tahsilatı',
    ilgili: '',
    created: new Date().toISOString()
  };
  const arr = DB.get('finans');
  arr.push(obj);
  DB.set('finans', arr);
  return obj;
}

function finansDosyaAra(q) {
  const dropdown = document.getElementById('f-ilgili-dropdown');
  if (!dropdown) return;
  const mvAd = document.getElementById('f-muvekkil')?.value || '';
  const davalar = DB.get('davalar') || [];
  const icralar = DB.get('icralar') || [];
  const filtD = mvAd ? davalar.filter(d => d.muvekkil === mvAd) : davalar;
  const filtI = mvAd ? icralar.filter(i => i.muvekkil === mvAd) : icralar;
  const qq = (q || '').toLowerCase().trim();
  const dItems = filtD.filter(d => !qq || (d.no||'').toLowerCase().includes(qq) || (d.ad||'').toLowerCase().includes(qq)).slice(0,6);
  const iItems = filtI.filter(i => !qq || (i.no||'').toLowerCase().includes(qq) || (i.borclu||'').toLowerCase().includes(qq) || (i.bki||'').toLowerCase().includes(qq)).slice(0,6);

  if (!dItems.length && !iItems.length) {
    dropdown.innerHTML = '<div style="padding:12px;color:var(--text3);font-size:13px;text-align:center">Dosya bulunamadı</div>';
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = '';

  function makeItem(icon, label, sub, val, id, tip) {
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer';
    div.onmouseover = function() { this.style.background = 'var(--bg3)'; };
    div.onmouseout = function() { this.style.background = ''; };
    div.onclick = function() { finansDosyaSec(val, id, tip); };
    div.innerHTML = '<span style="font-size:15px;flex-shrink:0">' + icon + '</span>'
      + '<div style="min-width:0"><div style="font-size:13px;font-weight:500;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(label) + '</div>'
      + (sub ? '<div style="font-size:11px;color:var(--text3)">' + escHtml(sub) + '</div>' : '') + '</div>';
    return div;
  }

  function makeHeader(txt) {
    const h = document.createElement('div');
    h.style.cssText = 'font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;padding:8px 12px 4px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.05)';
    h.textContent = txt;
    return h;
  }

  if (dItems.length) {
    dropdown.appendChild(makeHeader('📁 Dava Dosyaları'));
    dItems.forEach(function(d) {
      dropdown.appendChild(makeItem('📁', d.ad||d.no||'', (d.no||'')+(d.muvekkil?' · '+d.muvekkil:''), d.no||d.ad||'', d.id, 'dava'));
    });
  }
  if (iItems.length) {
    dropdown.appendChild(makeHeader('⚡ İcra Dosyaları'));
    iItems.forEach(function(i) {
      dropdown.appendChild(makeItem('⚡', i.bki||i.no||'', (i.no||'')+(i.borclu?' · '+i.borclu:'')+(i.muvekkil?' · '+i.muvekkil:''), i.no||i.bki||'', i.id, 'icra'));
    });
  }
  dropdown.style.display = 'block';
}

function finansDosyaSec(val, id, tip) {
  const input = document.getElementById('f-ilgili');
  const dropdown = document.getElementById('f-ilgili-dropdown');
  if (input) input.value = val;
  if (dropdown) dropdown.style.display = 'none';
  // Seçilen dosyanın ID'sini ve tipini gizli alana kaydet
  var hiddenId = document.getElementById('f-ilgili-id');
  var hiddenTip = document.getElementById('f-ilgili-tip');
  if (hiddenId) hiddenId.value = id || '';
  if (hiddenTip) hiddenTip.value = tip || '';
}



// ── İCRA DETAY OVERLAY ──────────────────────────────────
var currentIcraId = null;
var idpReplyToId = null;

function icraGeri() { closeIcraDetailPage(); }

function closeIcraDetailPage() {
  var idp = document.getElementById('icra-detail-page');
  if (idp) idp.classList.remove('open');
  document.getElementById('topbar-add-btn').textContent = '+ Yeni İcra';
  currentIcraId = null;
  idpReplyToId = null;
  // İcra detay sayfası kapanınca icra listesi sayfasına dön
  // (icra detay bir overlay olduğu için altta zaten icralar sayfası var)
}

function _renderIdpChatterFromCache(icraId) {
  var feed = document.getElementById('idp-chatter-feed');
  var countEl = document.getElementById('idp-post-count');
  if (!feed) return;
  var key = 'icra_chatter_' + icraId;
  var raw = DB.get(key) || [];
  var all = raw.slice().sort(function(a,b){return new Date(a.tarih||a.time)-new Date(b.tarih||b.time);});
  all = all.map(function(p){
    return {id:p.id, yazar:p.yazar||p.author||'Kullanıcı', metin:p.metin||p.text||'',
      tarih:p.tarih||p.time||new Date().toISOString(), parentId:p.parentId||null,
      parentYazar:p.parentYazar||null, parentMetin:p.parentMetin||null,
      tepkiler:p.tepkiler||{}, rol:p.rol||null, duzenlemeTarih:p.duzenlemeTarih||null,
      ekler:p.ekler||null};
  });
  if (countEl) countEl.textContent = all.length + ' mesaj';
  if (!all.length) {
    feed.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:28px;margin-bottom:8px">&#x1f4ac;</div><div style="font-size:13px">Henüz mesaj yok</div></div>';
    return;
  }
  var anaPosts = all.filter(function(p){
    if(!p.parentId) return true;
    return !all.find(function(x){return x.id===p.parentId;});
  });
  var rootReplies={};
  all.forEach(function(p){
    if(anaPosts.find(function(a){return a.id===p.id;})) return;
    var root=chGetRoot(p,all);
    if(!rootReplies[root.id]) rootReplies[root.id]=[];
    rootReplies[root.id].push(p);
  });
  var lastId = all[all.length-1].id;
  feed.innerHTML = anaPosts.map(function(post){
    var replies=rootReplies[post.id]||[];
    return idpBuildPost(post, all, icraId, post.id===lastId, replies);
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

async function renderIdpChatter(icraId) {
  var feed = document.getElementById('idp-chatter-feed');
  var countEl = document.getElementById('idp-post-count');
  if (!feed) return;
  await _sbYukleChatter('icra', icraId);
  var key = 'icra_chatter_' + icraId;
  var raw = DB.get(key) || [];
  var all = raw.slice().sort(function(a,b){return new Date(a.tarih||a.time)-new Date(b.tarih||b.time);});
  all = all.map(function(p){
    return {id:p.id, yazar:p.yazar||p.author||'Kullanıcı', metin:p.metin||p.text||'',
      tarih:p.tarih||p.time||new Date().toISOString(), parentId:p.parentId||null,
      parentYazar:p.parentYazar||null, parentMetin:p.parentMetin||null,
      tepkiler:p.tepkiler||{}, rol:p.rol||null, duzenlemeTarih:p.duzenlemeTarih||null,
      ekler:p.ekler||null};
  });
  if (countEl) countEl.textContent = all.length + ' mesaj';
  if (!all.length) {
    feed.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:28px;margin-bottom:8px">&#x1f4ac;</div><div style="font-size:13px">Henüz mesaj yok</div></div>';
    return;
  }
  var anaPosts = all.filter(function(p){
    if(!p.parentId) return true;
    return !all.find(function(x){return x.id===p.parentId;});
  });
  var rootReplies={};
  all.forEach(function(p){
    if(anaPosts.find(function(a){return a.id===p.id;})) return;
    var root=chGetRoot(p,all);
    if(!rootReplies[root.id]) rootReplies[root.id]=[];
    rootReplies[root.id].push(p);
  });
  var lastId = all[all.length-1].id;
  feed.innerHTML = anaPosts.map(function(post,idx){
    var replies=rootReplies[post.id]||[];
    return idpBuildPost(post, all, icraId, post.id===lastId, replies);
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

var _idpReplyVisible = {};

function idpBuildRepliesSection(replies, all, icraId, pid) {
  var total=replies.length;
  var shown=_idpReplyVisible[pid]||CH_REPLY_PAGE;
  shown=Math.min(shown,total);
  var hidden=total-shown;
  var visible=replies.slice(total-shown);
  var html='<div class="ch-replies" id="idp-replies-'+pid+'">';
  if(hidden>0){
    html+='<button class="ch-more-btn" data-pid="'+pid+'" data-icraid="'+icraId+'" onclick="idpShowMoreReplies(this.dataset.pid,this.dataset.icraid)">'
      +hidden+' yanıt daha gör'
      +'</button>';
  }
  visible.forEach(function(r){html+=idpBuildReply(r,all,icraId,false);});
  html+='</div>';
  return html;
}

function idpShowMoreReplies(pid, icraId) {
  var current=_idpReplyVisible[pid]||CH_REPLY_PAGE;
  _idpReplyVisible[pid]=current+CH_REPLY_PAGE;
  var key='icra_chatter_'+icraId;
  var raw=DB.get(key)||[];
  var all=raw.map(function(p){return {id:p.id,yazar:p.yazar||p.author||'Kullanıcı',metin:p.metin||p.text||'',tarih:p.tarih||p.time||'',parentId:p.parentId||null,parentYazar:p.parentYazar||null,parentMetin:p.parentMetin||null,tepkiler:p.tepkiler||{},rol:p.rol||null,ekler:p.ekler||null};});
  var postEl=document.getElementById('idp-post-'+pid);
  if(!postEl) return;
  var oldReplies=postEl.querySelector('#idp-replies-'+pid);
  if(!oldReplies) return;
  // Kök post'un tüm zincir yanıtlarını bul (chGetRoot ile)
  var replies=all.filter(function(r){
    if(r.id===pid) return false;
    var root=chGetRoot(r,all);
    return root.id===pid;
  });
  var tmp=document.createElement('div');
  tmp.innerHTML=idpBuildRepliesSection(replies,all,icraId,pid);
  oldReplies.replaceWith(tmp.firstChild);
}

function idpBuildReply(reply, all, icraId, isLast) {
  var y=reply.yazar||'Kullanıcı';
  var rid=reply.id;
  var rol=reply.rol?'<span class="ch-rr">'+escHtml(reply.rol)+'</span>':'';
  var tb=renderIcraTepkiBar(reply,icraId);
  // Sub-replies artık rootReplies flat listesinde zaten var, tekrar ekleme
  return '<div class="ch-rply" id="idp-post-'+rid+'">'
    +'<div class="ch-rhead">'
    +chAvatar(y,18)
    +'<span class="ch-rn">'+escHtml(y)+'</span>'+rol
    +'<span class="ch-rt">'+fmtDate(reply.tarih)+'</span>'
    +'</div>'
    +chReplyTo(reply.parentYazar,reply.parentMetin)
    +'<div class="ch-rbody" id="cbody-idp-'+rid+'">'+escHtml(reply.metin)+'</div>'
    +chRenderEkler(reply.ekler)
    +tb
    +'<div class="ch-ractions">'
    +'<button class="chatter-btn reply-btn" data-rid="'+rid+'" onclick="idpReply(this.dataset.rid)">&#x21a9; Yan&#x131;tla</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="chatter-btn del-btn" data-rid="'+rid+'" onclick="deleteIdpPost(this.dataset.rid)">&#x1f5d1; Sil</button>'
    +'</div>'
    +'</div>';
}

function idpBuildPost(post, all, icraId, isLast, repliesOverride) {
  var y=post.yazar||'Kullanıcı';
  var pid=post.id;
  var rol=post.rol?'<span class="ch-role">'+escHtml(post.rol)+'</span>':'';
  var lastBadge=isLast?'<span class="ch-last-badge">&#x1f514; Son mesaj</span>':'';
  var tb=renderIcraTepkiBar(post,icraId);
  var replies=repliesOverride!==undefined?repliesOverride:all.filter(function(r){return r.parentId===pid;});
  var repliesHtml=replies.length?idpBuildRepliesSection(replies,all,icraId,pid):'';
  return '<div class="ch-post'+(isLast?' ch-last':'')+'" id="idp-post-'+pid+'">'
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:6px">'
    +chAvatar(y,32)
    +'<div style="flex:1;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
    +'<span class="ch-name">'+escHtml(y)+'</span>'+rol
    +'<span class="ch-time">'+fmtDate(post.tarih)+'</span>'+lastBadge
    +'</div></div>'
    +chReplyTo(post.parentYazar,post.parentMetin)
    +'<div class="ch-body" id="cbody-idp-'+pid+'">'+(post.metin?escHtml(post.metin):'')+'</div>'
    +chRenderEkler(post.ekler)
    +tb
    +'<div class="ch-actions">'
    +'<button class="chatter-btn reply-btn" data-pid="'+pid+'" onclick="idpReply(this.dataset.pid)">&#x21a9; Yan&#x131;tla</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="chatter-btn del-btn" data-pid="'+pid+'" onclick="deleteIdpPost(this.dataset.pid)">&#x1f5d1; Sil</button>'
    +'</div>'+repliesHtml+'</div>';
}

async function sendIdpPost() {
  if (!currentIcraId) return;
  var input = document.getElementById('idp-chatter-input');
  if (!input) return;
  var metin = input.value.trim();
  var dosyalar = window._idpEkler.filter(function(e){ return !e.yukleniyor && e.url; });
  if (!metin && !dosyalar.length) return;

  // Dosyalar zaten yüklendi
  var ekler = dosyalar;

  var user = window.currentUser || {};
  var key = 'icra_chatter_' + currentIcraId;
  var posts = DB.get(key) || [];
  var parentYazar = null, parentMetin = null;
  if (idpReplyToId) {
    var parent = posts.find(function(p){ return p.id === idpReplyToId; });
    if (parent) {
      parentYazar = parent.yazar || parent.author || '';
      parentMetin = (parent.metin || parent.text || '').slice(0, 100);
    }
  }
  var yeniPost = {
    id: DB.genId(),
    yazar: user.adSoyad || user.username || 'Kullanıcı',
    metin: metin || '',
    ekler: ekler,
    tarih: new Date().toISOString(),
    parentId: idpReplyToId || null,
    parentYazar: parentYazar,
    parentMetin: parentMetin
  };
  // Önce yerel cache'e ekle ve hemen göster (Supabase'i bekleme)
  posts.push(yeniPost);
  DB.set(key, posts);
  input.value = '';
  chatterDosyaTemizle('icra');
  idpReplyToId = null;
  document.getElementById('idp-reply-banner').style.display = 'none';
  _renderIdpChatterFromCache(currentIcraId);

  // Arka planda Supabase'e yaz
  var icraIdSnapshot = currentIcraId;
  _supabaseClient.from('dosya_chatter').insert(_sbPostToChatterRow(yeniPost, 'icra', icraIdSnapshot))
    .then(function(res) {
      if (res.error) { console.error('Chatter Supabase yazma hatası:', res.error); notify('⚠️ Mesaj kaydedildi ama sunucuya gönderilemedi: ' + (res.error.message||'')); }
    });
}

function idpReply(postId) {
  if (!currentIcraId) return;
  var posts = DB.get('icra_chatter_' + currentIcraId) || [];
  var p = posts.find(function(x){return x.id===postId;});
  if (!p) return;
  idpReplyToId = postId;
  document.getElementById('idp-reply-banner').style.display = '';
  document.getElementById('idp-reply-who').textContent = '↩ ' + (p.yazar||p.author||'');
  document.getElementById('idp-reply-preview').textContent = p.metin||p.text||'';
  document.getElementById('idp-chatter-input').focus();
}

function cancelIdpReply() {
  idpReplyToId = null;
  document.getElementById('idp-reply-banner').style.display = 'none';
}

async function deleteIdpPost(postId) {
  if (!currentIcraId) return;
  showConfirmModal('Bu mesajı silmek istediğinizden emin misiniz?', async function() {
  var key = 'icra_chatter_' + currentIcraId;
  var posts = DB.get(key) || [];
  // Tüm alt zincirin (yanıtlar + torun yanıtlar) eklerini Storage'dan sil
  var silinecekIds = _chAltlariBul(postId, posts);
  var silinecekler = posts.filter(function(p){ return silinecekIds.indexOf(p.id) >= 0; });
  for (var i = 0; i < silinecekler.length; i++) {
    var post = silinecekler[i];
    if (post.ekler && post.ekler.length) {
      for (var j = 0; j < post.ekler.length; j++) {
        if (post.ekler[j].yol) await chatterSupabaseSil(post.ekler[j].yol);
      }
    }
  }
  var { error } = await _supabaseClient.from('dosya_chatter').delete().eq('id', postId);
  if (error) { console.error('Mesaj silinemedi:', error); notify('❌ Mesaj silinemedi: ' + (error.message||'bilinmeyen hata')); return; }
  posts = posts.filter(function(p){ return silinecekIds.indexOf(p.id) < 0; });
  DB.set(key, posts);
  renderIdpChatter(currentIcraId);
  });
}

// ── SIDEBAR COLLAPSE ────────────────────────────────────
function toggleSidebarCollapse() {
  var sb = document.getElementById('sidebar');
  var btn = document.getElementById('sidebar-collapse-btn');
  var main = document.getElementById('main');
  var ddp = document.getElementById('dava-detail-page');
  var idp2 = document.getElementById('icra-detail-page');
  sb.classList.toggle('collapsed');
  var collapsed = sb.classList.contains('collapsed');
  btn.textContent = collapsed ? '▶' : '◀';
  btn.style.left = collapsed ? '4px' : '224px';
  main.style.marginLeft = collapsed ? '0' : '220px';
  if (ddp) ddp.style.left = collapsed ? '0' : '220px';
  if (idp2) idp2.style.left = collapsed ? '0' : '220px';
}

// ── İÇERİK SAĞ TIK MENÜSÜ ─────────────────────────────
var _ctxItemType = null, _ctxItemId = null, _ctxItemLabel = null;

function itemContextMenu(e, type, id, label) {
  e.preventDefault();
  e.stopPropagation();
  _ctxItemType = type;
  _ctxItemId = id;
  _ctxItemLabel = label;
  var menu = document.getElementById('nav-context-menu');
  var ncmLabel = document.getElementById('ncm-label');
  if (!menu || !ncmLabel) return;
  ncmLabel.textContent = label || '';
  menu.innerHTML = '<div id="ncm-label" style="padding:7px 12px;font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);margin-bottom:3px">' + escHtml(label||'') + '</div>'
    + '<div class="ncm-item" onclick="ctxOpenItem()">→ Aç</div>'
    + '<div class="ncm-item" onclick="ctxOpenInTab()">⊕ Yeni Sekmede Aç</div>';
  menu.style.display = 'block';
  menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(e.clientY, window.innerHeight - 100) + 'px';
  setTimeout(function(){
    document.addEventListener('click', _ctxHide, {once:true});
  }, 10);
}

function _ctxHide() {
  document.getElementById('nav-context-menu').style.display = 'none';
}

function ctxOpenItem() {
  _ctxHide();
  if (_ctxItemType === 'dava') openDavaDetailPage(_ctxItemId);
  else if (_ctxItemType === 'icra') showIcraDetail(_ctxItemId);
  else if (_ctxItemType === 'muvekkil') { showPage('kisiler'); setTimeout(function(){ showMuvekkilDetail(_ctxItemId); }, 50); }
}

function ctxOpenInTab() {
  _ctxHide();
  if (_ctxItemType === 'dava') {
    var d = (DB.get('davalar')||[]).find(function(x){return x.id===_ctxItemId;});
    if (d) tabEkle((d.ad||d.no) + (d.muvekkil?' · '+d.muvekkil:''), '📁', 'davalar', 'dava-detail', _ctxItemId);
  } else if (_ctxItemType === 'icra') {
    var i = (DB.get('icralar')||[]).find(function(x){return x.id===_ctxItemId;});
    if (i) tabEkle((i.no||i.bki||'İcra') + (i.borclu?' · '+i.borclu:''), '⚡', 'icralar', 'icra-detail', _ctxItemId);
  } else if (_ctxItemType === 'muvekkil') {
    var m = (DB.get('muvekkiller')||[]).find(function(x){return x.id===_ctxItemId;});
    if (m) tabEkle('👤 ' + (m.ad||'Müvekkil'), '👤', 'kisiler', 'muvekkil-detail', _ctxItemId);
  } else if (_ctxItemType === 'task') {
    var t = (DB.get('tasks')||[]).find(function(x){return x.id===_ctxItemId;});
    if (t) tabEkle('✅ ' + (t.baslik||'Görev'), '✅', 'tasks', null, _ctxItemId);
  } else if (_ctxItemType === 'not') {
    var n = (DB.get('notlar')||[]).find(function(x){return x.id===_ctxItemId;});
    if (n) tabEkle('📝 ' + (n.baslik||'Not'), '📝', 'notlar', null, _ctxItemId);
  } else if (_ctxItemType === 'finans') {
    tabEkle('💰 Finans', '💰', 'finans', null, null);
  }
}

function gorevDetayAc(id) {
  const t = DB.get('tasks').find(x=>x.id===id);
  if (!t) return;
  const gecmis = t.gecmis || [];

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center';

  const box = document.createElement('div');
  box.style.cssText = 'background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:24px;width:480px;max-width:95vw;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5)';

  const durumClr = t.done?'var(--green)':t.oncelik==='Acil'?'var(--red)':t.oncelik==='Yüksek'?'var(--gold)':'var(--text3)';

  box.innerHTML = 
    '<div style="display:flex;align-items:start;justify-content:space-between;margin-bottom:16px">'
    +'<div><div style="font-size:16px;font-weight:700;color:var(--text)">'+escHtml(t.baslik)+'</div>'
    +'<div style="font-size:12px;color:'+durumClr+';margin-top:4px;font-weight:600">'+(t.done?'✓ Tamamlandı':t.oncelik)+'</div></div>'
    +'<button id="gdm-kapat" style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--text3);cursor:pointer;font-size:14px;padding:4px 12px">✕</button>'
    +'</div>'

    // Bilgiler
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">'
    +(t.tarih?'<div style="background:var(--bg3);border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">SON TARİH</div><div style="font-size:13px;color:var(--text)">📅 '+fmtDate(t.tarih.slice(0,10))+'</div></div>':'')
    +(t.tamamlanmaTarihi?'<div style="background:rgba(74,140,92,0.1);border:1px solid rgba(74,140,92,0.2);border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">TAMAMLANMA</div><div style="font-size:13px;color:var(--green)">✓ '+fmtDate(t.tamamlanmaTarihi.slice(0,10))+'</div></div>':'')
    +(t.ilgili?'<div style="background:var(--bg3);border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">İLGİLİ DOSYA</div><div style="font-size:13px;color:var(--gold)">📁 '+escHtml(t.ilgili)+'</div></div>':'')
    +(t.aciklama?'<div style="background:var(--bg3);border-radius:8px;padding:10px;grid-column:span 2"><div style="font-size:10px;color:var(--text3);margin-bottom:3px">AÇIKLAMA</div><div style="font-size:13px;color:var(--text2)">'+escHtml(t.aciklama)+'</div></div>':'')
    +'</div>'

    // Geçmiş / Aktivite
    +'<div style="border-top:1px solid var(--border);padding-top:14px">'
    +'<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:10px">📋 Aktivite Geçmişi</div>'

    // Oluşturulma her zaman var
    +'<div style="display:flex;gap:10px;align-items:start;margin-bottom:8px">'
    +'<div style="width:8px;height:8px;border-radius:50%;background:var(--text3);flex-shrink:0;margin-top:5px"></div>'
    +'<div><div style="font-size:12px;color:var(--text2)">Görev oluşturuldu</div>'
    +'<div style="font-size:11px;color:var(--text3)">'+fmtDate((t.created||'').slice(0,10))+'</div></div></div>'

    +gecmis.map(g=>{
      const clr = g.tip==='tamamlandi'?'var(--green)':g.tip==='erteleme'?'var(--gold)':'var(--text3)';
      const icon = g.tip==='tamamlandi'?'✓':g.tip==='erteleme'?'↻':'↩';
      let desc = '';
      if (g.tip==='erteleme') desc = fmtDate((g.eskiTarih||'').slice(0,10)) + ' → ' + fmtDate((g.yeniTarih||'').slice(0,10));
      else if (g.tip==='tamamlandi') desc = 'Görev tamamlandı';
      else if (g.tip==='yeniden_acildi') desc = 'Görev yeniden açıldı';
      return '<div style="display:flex;gap:10px;align-items:start;margin-bottom:8px">'
        +'<div style="width:8px;height:8px;border-radius:50%;background:'+clr+';flex-shrink:0;margin-top:5px"></div>'
        +'<div><div style="font-size:12px;color:var(--text2)">'+(g.aciklama||desc)+'</div>'
        +(desc&&g.aciklama?'<div style="font-size:11px;color:var(--text3)">'+desc+'</div>':'')
        +'<div style="font-size:11px;color:var(--text3)">'+fmtDate((g.tarih||'').slice(0,10))+'</div></div></div>';
    }).join('')
    +'</div>'

    // Alt butonlar
    +'<div style="display:flex;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">'
    +(t.done
      ? '<button data-chtid2="'+t.id+'" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text2);padding:8px 14px;cursor:pointer;font-size:13px">↩ Yeniden Aç</button>'
      : '<button data-chtid2="'+t.id+'" style="background:rgba(74,140,92,0.15);border:1px solid rgba(74,140,92,0.3);border-radius:8px;color:var(--green);padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600">✓ Tamamla</button>')
    +'<button data-geid="'+t.id+'" style="background:var(--gold-dim);border:1px solid rgba(201,168,76,0.3);border-radius:8px;color:var(--gold);padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600">✏ Düzenle / Ertele</button>'
    +'</div>';

  box.id = 'gorev-detay-modal';
  modal.appendChild(box);
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  box.querySelector('#gdm-kapat').addEventListener('click', ()=>modal.remove());
}


// ═══════════════════════════════════════════════════════════
// GLOBAL CLICK DELEGATION — data-attribute butonlar
// ═══════════════════════════════════════════════════════════
document.body.addEventListener('click', function(e) {
  // ── Confirm modal butonları — global delegation'dan muaf tut ──
  if (e.target.id === 'confirm-modal-ok' || e.target.id === 'confirm-modal-cancel') return;
  if (e.target.closest('#confirm-modal-box')) return;

  // ── Takvim modal kapat ──────────────────────────────────
  var closeEl = e.target.closest('[data-close-modal]');
  if (closeEl) {
    var m = document.getElementById(closeEl.dataset.closeModal);
    if (m) m.remove();
    return;
  }

  // ── Dava detay aç ──────────────────────────────────────
  var openDavaEl = e.target.closest('[data-open-dava]');
  if (openDavaEl && openDavaEl.dataset.openDava) {
    openDavaDetailPage(openDavaEl.dataset.openDava);
    return;
  }

  // ── Ödeme planı sil ────────────────────────────────────
  var delPlanEl = e.target.closest('[data-del-plan]');
  if (delPlanEl && delPlanEl.dataset.delPlan) {
    deletePlan(delPlanEl.dataset.delPlan);
    return;
  }

  // ── Taksit öde/geri al ─────────────────────────────────
  var takEl = e.target.closest('[data-taksit-plan]');
  if (takEl && takEl.dataset.taksitPlan) {
    taksitiOde(takEl.dataset.taksitPlan, parseInt(takEl.dataset.taksitIdx));
    return;
  }

  // ── Finans düzenle ─────────────────────────────────────
  var editFinansEl = e.target.closest('[data-edit-finans]');
  if (editFinansEl && editFinansEl.dataset.editFinans) {
    editFinans(editFinansEl.dataset.editFinans);
    return;
  }

  // ── Finans sil ─────────────────────────────────────────
  var delFinansEl = e.target.closest('[data-delete-finans]');
  if (delFinansEl && delFinansEl.dataset.deleteFinans) {
    deleteFinans(delFinansEl.dataset.deleteFinans);
    return;
  }
}, true); // capture=true: modal overlay'lerin altında da çalışır

// ========== INIT ==========
// ═══════════════════════════════════════════════════════
// CHATTER DOSYA YÜKLEME — Supabase Storage
// ═══════════════════════════════════════════════════════

// Yüklenmiş ekler (URL'si olan, gönderilmeye hazır)
window._chatterEkler = [];
window._idpEkler = [];
// Geriye dönük uyumluluk
window._chatterDosyalar = window._chatterEkler;
window._idpDosyalar = window._idpEkler;

// Dosya tipine göre ikon
function chDosyaIcon(ad, tip) {
  if (!ad && !tip) return '📎';
  var ext = (ad||'').toLowerCase().split('.').pop();
  var mime = (tip||'').toLowerCase();
  if (['png','jpg','jpeg','gif','webp'].includes(ext) || mime.startsWith('image/')) return '🖼️';
  if (ext === 'pdf' || mime === 'application/pdf') return '📄';
  if (['doc','docx'].includes(ext) || mime.includes('word')) return '📝';
  if (['xls','xlsx'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  return '📎';
}

// Dosya boyutu formatla
function chFmtBoyut(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1024/1024).toFixed(1) + ' MB';
}

// Dosya seçildiğinde çağrılır — anında Supabase'e yükler
async function chatterFileSec(input, mod) {
  var yeni = Array.from(input.files);
  input.value = '';
  if (!yeni.length) return;

  var dosyaId = mod === 'dava' ? currentDavaId : currentIcraId;
  if (!dosyaId) { notify('⚠️ Önce bir dosya açın'); return; }

  var ekListesi = mod === 'dava' ? window._chatterEkler : window._idpEkler;

  for (var i = 0; i < yeni.length; i++) {
    var f = yeni[i];
    if (f.size > 20 * 1024 * 1024) { notify('⚠️ ' + f.name + ' çok büyük (max 20MB)'); continue; }
    if (ekListesi.length >= 5) { notify('⚠️ En fazla 5 dosya ekleyebilirsiniz'); break; }

    // Yükleniyor chip'i göster
    var tempObj = { ad: f.name, tip: f.type, boyut: f.size, url: null, yukleniyor: true };
    ekListesi.push(tempObj);
    chatterPreviewGuncelle(mod);

    // Supabase'e yükle
    var sonuc = await chatterTekDosyaYukle(f, dosyaId);

    // Yükleniyor chip'ini güncelle
    var idx = ekListesi.indexOf(tempObj);
    if (idx >= 0) {
      if (sonuc) {
        ekListesi[idx] = sonuc; // URL'yi kaydet
      } else {
        ekListesi.splice(idx, 1); // Başarısız → kaldır
        notify('⚠️ ' + f.name + ' yüklenemedi');
      }
    }
    chatterPreviewGuncelle(mod);
  }
}

// Önizleme alanını güncelle
function chatterPreviewGuncelle(mod) {
  var ekler = mod === 'dava' ? window._chatterEkler : window._idpEkler;
  var previewEl = document.getElementById(mod === 'dava' ? 'chatter-files-preview' : 'idp-files-preview');
  var countEl   = document.getElementById(mod === 'dava' ? 'chatter-file-count' : 'idp-file-count');
  if (!previewEl) return;
  if (!ekler.length) {
    previewEl.style.display = 'none';
    if (countEl) countEl.style.display = 'none';
    return;
  }
  previewEl.style.display = 'flex';
  if (countEl) { countEl.style.display = ''; countEl.textContent = ekler.length + ' dosya'; }
  previewEl.innerHTML = ekler.map(function(ek, i) {
    var icon = chDosyaIcon(ek.ad, ek.tip);
    var boyut = chFmtBoyut(ek.boyut);
    var yukleniyor = !!ek.yukleniyor;
    var imgHtml = '';
    if (!yukleniyor && ek.url && ek.tip && ek.tip.startsWith('image/')) {
      imgHtml = '<img src="'+ek.url+'" style="width:32px;height:32px;object-fit:cover;border-radius:4px;flex-shrink:0;">';
    }
    return '<div class="ch-file-chip"' + (yukleniyor ? ' style="opacity:0.6"' : '') + '>'
      + (yukleniyor ? '<span class="ch-file-icon">⏳</span>' : (imgHtml || '<span class="ch-file-icon">'+icon+'</span>'))
      + '<div class="ch-file-name"><div style="font-size:11px;font-weight:500">'+escHtml((ek.ad||'').length>20?(ek.ad||'').slice(0,18)+'…':(ek.ad||''))+'</div>'
      + '<div style="font-size:9px;color:var(--text3)">'+(yukleniyor?'Yükleniyor…':boyut)+'</div></div>'
      + (yukleniyor ? '' : '<button class="ch-file-remove" onclick="chatterDosyaKaldir('+i+',\''+mod+'\')" title="Kaldır">×</button>')
      + '</div>';
  }).join('');
}

// Tekil dosya kaldır
function chatterDosyaKaldir(idx, mod) {
  var ekler = mod === 'dava' ? window._chatterEkler : window._idpEkler;
  ekler.splice(idx, 1);
  chatterPreviewGuncelle(mod);
}

// Gönderim sonrası temizle
function chatterDosyaTemizle(mod) {
  if (mod === 'dava') { window._chatterEkler.splice(0, window._chatterEkler.length); }
  else { window._idpEkler.splice(0, window._idpEkler.length); }
  chatterPreviewGuncelle(mod);
}

// Tek dosya yükle (anında yükleme için)
async function chatterTekDosyaYukle(dosya, dosyaId) {
  // Token yoksa sessionStorage'dan al
  if (!window._supabaseToken) {
    try {
      var sess = JSON.parse(sessionStorage.getItem('sb_session')||'{}');
      if (sess.access_token) window._supabaseToken = sess.access_token;
    } catch(e) {}
  }
  if (!window._supabaseToken) { notify('⚠️ Oturum bulunamadı, lütfen yeniden giriş yapın'); return null; }
  var ts = Date.now();
  var temizAd = dosya.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  var yol = 'chatter/' + dosyaId + '/' + ts + '_' + temizAd;
  try {
    var resp = await fetch(SUPABASE_URL + '/storage/v1/object/chatter-files/' + yol, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + window._supabaseToken,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': dosya.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: dosya
    });
    if (resp.ok) {
      return {
        ad: dosya.name, tip: dosya.type, boyut: dosya.size,
        url: SUPABASE_URL + '/storage/v1/object/public/chatter-files/' + yol,
        yol: yol
      };
    } else {
      var err = await resp.text();
      console.error('Yükleme hatası:', err);
      notify('⚠️ ' + dosya.name + ' yüklenemedi');
      return null;
    }
  } catch(e) {
    notify('⚠️ Bağlantı hatası');
    return null;
  }
}

// Supabase Storage'a yükle
async function chatterDosyaYukle(dosyalar, mod, dosyaId) {
  if (!dosyalar || !dosyalar.length) return [];
  if (!window._supabaseToken) { notify('⚠️ Oturum bulunamadı'); return []; }

  var progressId  = mod === 'dava' ? 'chatter-upload-progress' : 'idp-upload-progress';
  var progressBar = document.getElementById(mod === 'dava' ? 'chatter-upload-bar' : 'idp-upload-bar');
  var progressEl  = document.getElementById(progressId);

  if (progressEl) progressEl.style.display = '';
  if (progressBar) progressBar.style.width = '0%';

  var ekler = [];
  var toplam = dosyalar.length;

  for (var i = 0; i < toplam; i++) {
    var dosya = dosyalar[i];
    var ts = Date.now();
    var temizAd = dosya.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    var yol = 'chatter/' + dosyaId + '/' + ts + '_' + temizAd;

    try {
      var resp = await fetch(
        SUPABASE_URL + '/storage/v1/object/chatter-files/' + yol,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + window._supabaseToken,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': dosya.type || 'application/octet-stream',
            'x-upsert': 'true'
          },
          body: dosya
        }
      );

      if (resp.ok) {
        var publicUrl = SUPABASE_URL + '/storage/v1/object/public/chatter-files/' + yol;
        ekler.push({
          ad: dosya.name,
          tip: dosya.type,
          boyut: dosya.size,
          url: publicUrl,
          yol: yol
        });
      } else {
        var err = await resp.text();
        console.error('Dosya yükleme hatası:', err);
        notify('⚠️ ' + dosya.name + ' yüklenemedi');
      }
    } catch(e) {
      console.error('Upload error:', e);
      notify('⚠️ Bağlantı hatası: ' + dosya.name);
    }

    // Progress güncelle
    if (progressBar) progressBar.style.width = Math.round((i+1)/toplam*100) + '%';
  }

  // Progress gizle
  setTimeout(function() {
    if (progressEl) progressEl.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
  }, 600);

  return ekler;
}

// Ekler HTML'ini render et (mesaj içinde)
function _chGetExt(ad) {
  return (ad || '').toLowerCase().split('.').pop();
}
function _chGetBadge(ad, tip) {
  var ext = _chGetExt(ad);
  var mime = (tip || '').toLowerCase();
  if (['png','jpg','jpeg','gif','webp'].includes(ext) || mime.startsWith('image/'))
    return '<div class="ch-thumb-badge img-badge">&#x1f5bc;</div>';
  if (ext === 'pdf' || mime === 'application/pdf')
    return '<div class="ch-thumb-badge pdf-badge">PDF</div>';
  if (['xls','xlsx'].includes(ext) || mime.includes('excel') || mime.includes('spreadsheet'))
    return '<div class="ch-thumb-badge xls-badge">XLS</div>';
  if (['doc','docx'].includes(ext) || mime.includes('word'))
    return '<div class="ch-thumb-badge doc-badge">DOC</div>';
  return '<div class="ch-thumb-badge file-badge">&#x1f4ce;</div>';
}
function _chFooterHtml(ek, boyut) {
  return '<div class="ch-thumb-footer">'
    + _chGetBadge(ek.ad, ek.tip)
    + '<div class="ch-thumb-meta">'
    +   '<div class="ch-thumb-name">' + escHtml(ek.ad) + '</div>'
    +   (boyut ? '<div class="ch-thumb-size">' + boyut + '</div>' : '')
    + '</div>'
    + '</div>';
}

function chRenderEkler(ekler) {
  if (!ekler || !ekler.length) return '';
  var html = '<div class="ch-attachments">';
  ekler.forEach(function(ek) {
    var ext = _chGetExt(ek.ad);
    var mime = (ek.tip || '').toLowerCase();
    var isResim = ['png','jpg','jpeg','gif','webp'].includes(ext) || mime.startsWith('image/');
    var isPdf = ext === 'pdf' || mime === 'application/pdf';
    var boyut = chFmtBoyut(ek.boyut);
    var safeUrl = escHtml(ek.url || '');

    if (isResim) {
      // ── RESIM: gerçek thumbnail önizleme ──
      html += '<a href="' + safeUrl + '" target="_blank" class="ch-thumb-card" title="' + escAttr(ek.ad) + '">'
        + '<img src="' + safeUrl + '" class="ch-thumb-img" loading="lazy" onerror="this.style.display=\'none\'">'
        + _chFooterHtml(ek, boyut)
        + '</a>';
    } else if (isPdf) {
      // ── PDF: canvas ile ilk sayfa önizlemesi (PDF.js) ──
      var canvasId = 'pdf-thumb-' + Math.random().toString(36).slice(2, 8);
      html += '<a href="' + safeUrl + '" target="_blank" class="ch-thumb-card" title="' + escAttr(ek.ad) + '">'
        + '<canvas id="' + canvasId + '" class="ch-thumb-canvas"></canvas>'
        + _chFooterHtml(ek, boyut)
        + '</a>';
      // PDF.js render'ı DOM'a eklendikten sonra çalıştır
      setTimeout(function() { _chRenderPdfThumb(canvasId, ek.url); }, 50);
    } else {
      // ── DİĞER DOSYALAR: kompakt kart (önizleme yok) ──
      html += '<a href="' + safeUrl + '" target="_blank" class="ch-attach-item">'
        + _chGetBadge(ek.ad, ek.tip)
        + '<div class="ch-attach-info">'
        +   '<div class="ch-attach-name">' + escHtml(ek.ad) + '</div>'
        +   (boyut ? '<div class="ch-attach-size">' + boyut + '</div>' : '')
        + '</div>'
        + '</a>';
    }
  });
  html += '</div>';
  return html;
}

// PDF.js ile ilk sayfayı canvas'a render et
function _chRenderPdfThumb(canvasId, url) {
  if (!window.pdfjsLib || !url) return;
  var canvas = document.getElementById(canvasId);
  if (!canvas) return;
  pdfjsLib.getDocument(url).promise.then(function(pdf) {
    return pdf.getPage(1);
  }).then(function(page) {
    var vp = page.getViewport({ scale: 1 });
    var targetW = 200;
    var scale = targetW / vp.width;
    var scaledVp = page.getViewport({ scale: scale });
    canvas.width = scaledVp.width;
    canvas.height = scaledVp.height;
    var ctx = canvas.getContext('2d');
    page.render({ canvasContext: ctx, viewport: scaledVp });
  }).catch(function(err) {
    // PDF yüklenemezse canvas'ı gizle
    console.warn('PDF thumbnail hatası:', err);
    if (canvas) { canvas.style.display = 'none'; }
  });
}

// Ctrl+V ile clipboard'dan resim yapıştırma
document.addEventListener('paste', function(e) {
  // Sadece chatter odaklanmışken çalışsın
  var aktifEl = document.activeElement;
  if (!aktifEl) return;
  var isDava = aktifEl.id === 'chatter-input';
  var isIcra = aktifEl.id === 'idp-chatter-input';
  if (!isDava && !isIcra) return;

  var items = e.clipboardData && e.clipboardData.items;
  if (!items) return;

  for (var i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      var dosya = items[i].getAsFile();
      if (!dosya) continue;
      // Dosyaya isim ver
      var ext = items[i].type.split('/')[1] || 'png';
      Object.defineProperty(dosya, 'name', { value: 'yapistirilan_resim_' + Date.now() + '.' + ext });
      var mod = isDava ? 'dava' : 'icra';
      var dosyalar = isDava ? window._chatterEkler : window._idpEkler;
      if (dosyalar.length < 5) {
        // Paste ile eklenen resmi geçici olarak ekle, hemen yükle
        dosyalar.push({ ad: dosya.name, tip: dosya.type, boyut: dosya.size, url: null, yukleniyor: true, _file: dosya });
        chatterPreviewGuncelle(mod);
        notify('📋 Resim eklendi (yapıştır)');
      }
      e.preventDefault();
      break;
    }
  }
});


// ══ GİRİŞ SAYFASI DÖNEN ALINTILARI ══
var _loginQuotes = [
  { text: "Fiat iustitia, ruat caelum.", src: "Adalet yerini bulsun, gökler çökse de." },
  { text: "Audi alteram partem.", src: "Diğer tarafı da dinle." },
  { text: "Nullum crimen, nulla poena sine lege.", src: "Kanun olmadan suç ve ceza olmaz." },
  { text: "Iustitia est constans et perpetua voluntas.", src: "Adalet, herkese hakkını verme iradesidir. — Ulpianus" },
  { text: "In dubio pro reo.", src: "Şüphede sanık lehine." },
  { text: "Dura lex, sed lex.", src: "Sert kanun, ama kanundur." },
  { text: "Ve la yecrimenneküm şeneanü kavmin ella ta'dilu.", src: "Bir topluluğa kininiz sizi adaletsizliğe sürüklemesin. — Maide 8" },
  { text: "İnnallahe ye'muru bil-adli vel-ihsan.", src: "Allah adaleti ve iyiliği emreder. — Nahl 90" },
  { text: "Ve iza hakemtüm beynen-nasi en tahkümu bil-adl.", src: "İnsanlar arasında hükmettiğinizde adaletle hükmedin. — Nisa 58" },
  { text: "Ya eyyühellezine amenu künu kavvamine bil-kıst.", src: "Adaleti titizlikle ayakta tutun. — Nisa 135" },
  { text: "Hukuk, güçsüzlerin güçlülerden korunmasıdır.", src: "— Frederic Bastiat" },
  { text: "Adalet gecikirse adaletsizlik olur.", src: "— William Gladstone" },
  { text: "Kanunlar örümcek ağına benzer; büyük sinekler geçer, küçükler takılır.", src: "— Solon" },
  { text: "Hukuk en mükemmel akıldır.", src: "— Cicero" },
  { text: "Haktan güçlü bir şey yoktur.", src: "— Hz. Ömer bin Hattab" },
  { text: "Kendine yapılmasını istemediğin şeyi başkasına yapma.", src: "— Konfüçyüs" },
  { text: "Bir millet adaletten yoksun kalırsa yıkılmaya mahkumdur.", src: "— İbn Haldun" },
  { text: "Zulüm ile abad olunmaz.", src: "— Osmanlı Atasözü" },
  { text: "Bir hükümet ancak adalete dayanabilir. Bağımsızlık, gelecek, hürriyet; her şey adaletle ayaktadır.", src: "— Mustafa Kemal Atatürk" },
  { text: "Adalet gücü bağımsız olmayan bir milletin, devlet halinde varlığı kabul olunmaz.", src: "— Mustafa Kemal Atatürk, 1920" },
  { text: "Bu memlekette hükümsüz vatandaş öldürülmez. Vatandaş ancak mahkeme kararıyla cezalandırılır.", src: "— Mustafa Kemal Atatürk, 1919" },
  { text: "Bir memlekette adalet mevcut olmazsa, o memlekette anarşiden başka bir şey yoktur.", src: "— Mustafa Kemal Atatürk" },
  { text: "Zamanın değişmesiyle hükümlerin değişmesi inkâr olunamaz.", src: "— Mustafa Kemal Atatürk" },
  { text: "Her halde dünyada bir hak vardır. Ve hak kuvvetin üstündedir.", src: "— Mustafa Kemal Atatürk, 1919" },
  { text: "Adalet, bir devletin esası olduğuna göre, mahkemelerin gerçekten tarafsızlığını temin her işin başında gelmelidir.", src: "— Mustafa Kemal Atatürk" },
  { text: "Özgürlüğün de, eşitliğin de, adaletin de kaynağı ulusal egemenliktir.", src: "— Mustafa Kemal Atatürk" },
];
var _lqIdx = Math.floor(Math.random() * _loginQuotes.length);
function _loginQuoteRotate() {
  var q = _loginQuotes[_lqIdx % _loginQuotes.length];
  _lqIdx++;
  var tEl = document.getElementById('login-quote-text');
  var sEl = document.getElementById('login-quote-source');
  if (tEl) tEl.textContent = q.text;
  if (sEl) sEl.textContent = q.src;
}
window._lqInterval = setInterval(_loginQuoteRotate, 6000);




