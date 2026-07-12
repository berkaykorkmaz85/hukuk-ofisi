// Bu dosya index.html'den ayrildi (kod tasinmadan, sadece dosya sinirlari
// eklendi) — tek dosyanin git diff/inceleme/gezinme zorlugunu azaltmak icin.
// Yukleme sirasi index.html'deki eski calisma sirasiyla AYNIDIR, degistirmeyin.



// ============================================================
// CONFIRM MODAL
// ============================================================
var _cmCb = null;
function showConfirmModal(msg, onConfirm, opts) {
  opts = opts || {};
  var m = document.getElementById('confirm-modal');
  if (!m) { if (onConfirm && window.confirm(msg)) onConfirm(); return; }
  document.getElementById('confirm-modal-msg').innerHTML = msg;
  var ok = document.getElementById('confirm-modal-ok');
  var cancel = document.getElementById('confirm-modal-cancel');
  var icon = document.getElementById('confirm-modal-icon');
  ok.textContent = opts.okLabel || 'Evet, Sil';
  ok.style.background = opts.okBg || 'rgba(192,83,58,0.85)';
  ok.style.borderColor = opts.okBorder || 'rgba(192,83,58,0.4)';
  if (icon) {
    icon.textContent = opts.icon || '🗑';
    icon.style.background = opts.iconBg || 'rgba(192,83,58,0.15)';
    icon.style.borderColor = opts.iconBorder || 'rgba(192,83,58,0.3)';
  }
  // Her açılışta onclick doğrudan ata (addEventListener birikimini önler)
  ok.onclick = function() { var cb = _cmCb; _cmClose(); if (cb) cb(); };
  cancel.onclick = _cmClose;
  _cmCb = onConfirm;
  m.classList.add('cm-open');
  setTimeout(function() { ok.focus(); }, 40);
  function outside(e) { if (e.target === m) _cmClose(); }
  if (m._outside) m.removeEventListener('click', m._outside);
  m._outside = outside;
  m.addEventListener('click', outside);
}
function _cmClose() {
  var m = document.getElementById('confirm-modal');
  if (!m) return;
  m.classList.remove('cm-open');
  if (m._outside) { m.removeEventListener('click', m._outside); m._outside = null; }
  _cmCb = null;
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var m = document.getElementById('confirm-modal');
    if (m && m.classList.contains('cm-open')) _cmClose();
  }
});
// DOMContentLoaded fallback — script body sonunda çalışırsa butonları bağla
(function() {
  function _bindCmBtns() {
    var ok = document.getElementById('confirm-modal-ok');
    var cancel = document.getElementById('confirm-modal-cancel');
    if (ok && !ok._cmBound) {
      ok._cmBound = true;
      // onclick showConfirmModal'de her seferinde set edildiği için burada sadece fallback
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _bindCmBtns);
  } else {
    _bindCmBtns();
  }
})();
// ============================================================

// Tarih elle giriş yardımcıları
function parseDateInput(val) {
  // GG.AA.YYYY veya GG/AA/YYYY → YYYY-MM-DD
  if (!val) return '';
  val = val.trim();
  // Zaten YYYY-MM-DD formatında mı?
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // GG.AA.YYYY
  var m = val.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2,'0') + '-' + m[1].padStart(2,'0');
  // GGAAYYYY (8 rakam)
  var m2 = val.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m2) return m2[3] + '-' + m2[2] + '-' + m2[1];
  return '';
}

function formatDateForDisplay(yyyymmdd) {
  // YYYY-MM-DD → GG.AA.YYYY
  if (!yyyymmdd) return '';
  var m = yyyymmdd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return m[3] + '.' + m[2] + '.' + m[1];
  return yyyymmdd;
}

function getDateValue(el) {
  // Input'tan DB formatında değer al
  if (!el) return '';
  var val = el.value;
  if (el.type === 'text') return parseDateInput(val);
  return val; // type=date zaten YYYY-MM-DD
}

function setDateValue(el, yyyymmdd) {
  // Input'a değer set et
  if (!el) return;
  if (el.type === 'text') el.value = formatDateForDisplay(yyyymmdd);
  else el.value = yyyymmdd || '';
}

function autoFormatDateInput(el) {
  // Yazarken otomatik nokta ekle: 22 → 22. → 22.03. → 22.03.2026
  var val = el.value.replace(/[^\d.]/g, '');
  var digits = val.replace(/\./g, '');
  var formatted = '';
  if (digits.length <= 2) formatted = digits;
  else if (digits.length <= 4) formatted = digits.slice(0,2) + '.' + digits.slice(2);
  else formatted = digits.slice(0,2) + '.' + digits.slice(2,4) + '.' + digits.slice(4,8);
  el.value = formatted;
}

// ⚠️ GÜVENLİK NOTU: Supabase anon key, client-side kullanım için tasarlanmıştır.
// Ancak TÜM tablolarda Row Level Security (RLS) politikalarının aktif olduğundan emin olun.
// Hassas işlemler için Supabase Edge Functions kullanılması önerilir.
// Bu anahtarları .env dosyasına veya derleme zamanı ortam değişkenlerine taşımayı değerlendirin.
const _HUKUK_CONFIG = Object.freeze({
  supabaseUrl: 'https://cbxgdnwunvjndiwwzcfn.supabase.co',
  supabaseAnonKey: 'sb_publishable_VIs6hBcJMFYONt-VrILUrA_t8bxfKXv',
  // Giriş ekranında '@' içermeyen kısa kullanıcı adı yazılırsa bu e-posta
  // kullanılır (tek kullanıcılı kurulum kolaylığı). Yeni kuruluma taşırken
  // burayı güncelleyin.
  varsayilanEposta: 'berkaykorkmaz853@gmail.com'
});
const SUPABASE_URL = _HUKUK_CONFIG.supabaseUrl;
const SUPABASE_ANON_KEY = _HUKUK_CONFIG.supabaseAnonKey;
const _supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window._supabaseToken = null;
window._currentUserId = null;

function checkSession() {
  const s = sessionStorage.getItem('sb_session');
  if (!s) return false;
  try {
    const d = JSON.parse(s);
    if (d.expires_at && Date.now()/1000 > d.expires_at) { sessionStorage.removeItem('sb_session'); return false; }
    window._supabaseToken = d.access_token;
    window._currentUserId = d.user_id;
    return d;
  } catch { return false; }
}

// ══ OTURUM GERİ YÜKLEME ══
// supabase-js oturumu localStorage'da saklar ve süresi dolunca kendisi tazeler.
// Sayfa yenilendiğinde geçerli oturum varsa login ekranını atlayıp veriyi yükle.
// (Eskiden bu akış yoktu; her yenilemede tekrar giriş gerekiyordu.)
async function _oturumGeriYukle() {
  // "Beni hatırla" e-postasını login formuna her durumda doldur
  try {
    const hatirla = localStorage.getItem('hukuk_remember_user');
    const userEl = document.getElementById('login-user');
    if (hatirla && userEl && !userEl.value) {
      userEl.value = hatirla;
      const rmEl = document.getElementById('remember-me');
      if (rmEl) rmEl.checked = true;
    }
  } catch(e) {}
  // "Beni hatırla" seçilmemişse ve aynı tarayıcı oturumunda değilsek otomatik giriş yapma
  try {
    const persistLogin = localStorage.getItem('hukuk_persist_login');
    const sessionCached = sessionStorage.getItem('sb_session');
    if (!persistLogin && !sessionCached) {
      await _supabaseClient.auth.signOut();
      return false;
    }
  } catch(e) {}
  // Önce önbelleği kontrol et: oturum muhtemelen açıksa login ekranını gizle
  try {
    const cachedSb = sessionStorage.getItem('sb_session');
    if (cachedSb) {
      const ls = document.getElementById('login-screen');
      const pl = document.getElementById('post-login-loading');
      if (ls) { ls.classList.add('hidden'); ls.style.display = 'none'; }
      if (pl) pl.style.display = 'flex';
    }
  } catch(e) {}
  let session = null;
  try {
    const { data } = await _supabaseClient.auth.getSession();
    session = data && data.session;
  } catch(e) { console.warn('Oturum sorgulanamadı:', e); }
  if (!session) {
    // Geçersiz önbellek varsa temizle ve login ekranını göster
    try { sessionStorage.removeItem('sb_session'); } catch(e) {}
    const ls = document.getElementById('login-screen');
    const pl = document.getElementById('post-login-loading');
    if (ls) { ls.classList.remove('hidden'); ls.style.display = ''; }
    if (pl) pl.style.display = 'none';
    return false;
  }
  window._supabaseToken = session.access_token;
  window._currentUserId = session.user.id;
  try { sessionStorage.setItem('sb_session', JSON.stringify({ access_token: session.access_token, user_id: session.user.id, email: session.user.email, expires_at: session.expires_at })); } catch(e) {}
  const user = { username: session.user.email, adSoyad: (session.user.email || '').split('@')[0], rol: 'admin' };
  window.currentUser = user;
  try { updateSidebarUser(user); } catch(e) {}
  const plLoading = document.getElementById('post-login-loading');
  const plText = document.getElementById('post-login-loading-text');
  if (plText) plText.textContent = 'Veriler yükleniyor...';
  if (plLoading) plLoading.style.display = 'flex';
  try {
    await _sbYukleDavalarIcralar();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const dash = document.getElementById('page-dashboard');
    if (dash) dash.classList.add('active');
    try { renderDashboard(); } catch(e) { console.warn('renderDashboard:', e.message); }
    try { _kacirilmisHatirlatmalariKontrolEt(); } catch(e) {}
    try { _uetsSureUyariKontrol(); } catch(e) {}
    const ls = document.getElementById('login-screen');
    if (ls) { ls.classList.add('hidden'); ls.style.display = 'none'; }
    // Login ekranı kapandı — alıntı döngüsü artık gereksiz, durdur
    if (window._lqInterval) { clearInterval(window._lqInterval); window._lqInterval = null; }
    try { tabEkle("Gösterge Paneli","📊","dashboard"); } catch(e) {}
    window._appStarted = true;
  } finally {
    if (plLoading) plLoading.style.display = 'none';
  }
  return true;
}
// Token tazelenince, ham fetch ile yapılan Storage çağrılarının kullandığı
// window._supabaseToken da güncel kalsın
try {
  _supabaseClient.auth.onAuthStateChange(function(_event, session) {
    if (!session) return;
    window._supabaseToken = session.access_token;
    window._currentUserId = session.user.id;
    try { sessionStorage.setItem('sb_session', JSON.stringify({ access_token: session.access_token, user_id: session.user.id, email: session.user.email, expires_at: session.expires_at })); } catch(e) {}
  });
} catch(e) {}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ _oturumGeriYukle(); });
} else {
  _oturumGeriYukle();
}

// ══ SUPABASE'E TAŞINAN TABLOLAR — bellek içi cache ══
// "davalar" ve "icralar" artık localStorage'da değil, Supabase'de tutuluyor.
// DB.get/DB.set bu key'ler için cache'i okur/günceller; gerçek senkronizasyon
// (Supabase'e yazma) ilgili kaydet/sil fonksiyonlarında ayrıca yapılır.
window._sbCache = { davalar: [], icralar: [], muvekkiller: [], kisiler: [], contacts: [], finans: [], odeme_planlari: [], tasks: [], belgeler: [], icra_belgeler: [], icra_masraflar: [], dava_masraflar: [], notlar: [], cari: [], uets_kayitlar: [], chatter: {} };  // chatter: { [dosyaId]: [post,...] }
const _SB_TABLES = { davalar: 'davalar', icralar: 'icralar', muvekkiller: 'muvekkiller', kisiler: 'kisiler', contacts: 'contacts' };
const _SB_DIFF_TABLES = { finans: 'finans', odeme_planlari: 'odeme_planlari', tasks: 'tasks', belgeler: 'belgeler', icra_belgeler: 'icra_belgeler', icra_masraflar: 'icra_masraflar', dava_masraflar: 'dava_masraflar', notlar: 'notlar', cari: 'cari', uets_kayitlar: 'uets_kayitlar' };  // Bu key'ler DB.set çağrıldığında otomatik diff-sync edilir

// Bir chatter key'inin ('chatter_xxx' veya 'icra_chatter_xxx') dosya tipini ve id'sini çöz
function _sbChatterKeyParse(key) {
  if (key.indexOf('icra_chatter_') === 0) return { tip: 'icra', dosyaId: key.slice('icra_chatter_'.length) };
  if (key.indexOf('chatter_') === 0) return { tip: 'dava', dosyaId: key.slice('chatter_'.length) };
  return null;
}

// Supabase satırını eski localStorage obje formatına çevir (detaylar jsonb'sini düzleştir)
function _sbRowToObj(row) {
  if (!row) return row;
  const detaylar = row.detaylar || {};
  return Object.assign({}, detaylar, row, { detaylar: undefined });
}
// Eski localStorage obje formatını Supabase satırına çevir (sabit sütunlar + detaylar jsonb)
function _sbDavaToRow(obj) {
  const { id, no, ad, konu, cesit, muvekkil, mahkeme, durum, durusma, sonraki, ...rest } = obj;
  return {
    id, no, ad, konu, cesit, muvekkil, mahkeme, durum,
    durusma: durusma || null, sonraki: sonraki || null,
    detaylar: rest, user_id: window._currentUserId
  };
}
function _sbIcraToRow(obj) {
  const { id, no, borclu, muvekkil, alacak, faiz, durum, ...rest } = obj;
  return {
    id, no, borclu, muvekkil,
    alacak: Number(alacak) || 0, faiz: Number(faiz) || 0, durum,
    detaylar: rest, user_id: window._currentUserId
  };
}
// Davacı/Davalı isimlerini üretir. Yeni kayıtlarda d.davaci/d.davali doğrudan
// kullanılır; eski kayıtlarda (bu alanlar yokken) d.muvekkil her zaman davacı
// tarafı temsil ediyordu, bu yüzden geriye dönük varsayılan taraf 'davaci'dir.
function _davaTarafPair(d) {
  var taraf = d.taraf || 'davaci';
  var davaci = d.davaci !== undefined ? d.davaci : ((taraf === 'davali' ? d.karsi : d.muvekkil) || '');
  var davali = d.davali !== undefined ? d.davali : ((taraf === 'davali' ? d.muvekkil : d.karsi) || '');
  return { davaci: davaci, davali: davali };
}

// Alacaklı/Borçlu isimlerini üretir. Eski icra kayıtlarında i.muvekkil her
// zaman alacaklı tarafı temsil ediyordu (form her zaman öyle çalışıyordu),
// bu yüzden geriye dönük varsayılan taraf 'alacakli'dir.
function _icraTarafPair(i) {
  var taraf = i.taraf || 'alacakli';
  var alacakli = i.alacakli !== undefined ? i.alacakli : ((taraf === 'borclu' ? i.borclu : i.muvekkil) || '');
  return { alacakli: alacakli, borclu: i.borclu || '' };
}

function _sbMuvekkilToRow(obj) {
  const { id, ad, tur, tc, vergi, tel, email, ...rest } = obj;
  return {
    id, ad, tur: tur || 'bireysel', tc, vergi, tel, email,
    detaylar: rest, user_id: window._currentUserId
  };
}
function _sbKisiToRow(obj) {
  const { id, ad, rol, dosya, tel, email, ...rest } = obj;
  return {
    id, ad, rol, dosya, tel, email,
    detaylar: rest, user_id: window._currentUserId
  };
}
function _sbContactToRow(obj) {
  return {
    id: obj.id, account_id: obj.accountId, account_type: obj.accountType,
    ad: obj.ad, unvan: obj.unvan, departman: obj.departman,
    tel: obj.tel, email: obj.email, notlar: obj.notlar,
    user_id: window._currentUserId
  };
}
function _sbContactRowToObj(row) {
  return {
    id: row.id, accountId: row.account_id, accountType: row.account_type,
    muvekkilId: row.account_type === 'muvekkil' ? row.account_id : null,
    ad: row.ad, unvan: row.unvan, departman: row.departman,
    tel: row.tel, email: row.email, notlar: row.notlar,
    tarih: row.created_at
  };
}
// finans satırı ⇄ eski finans objesi dönüşümleri
function _sbFinansToRow(obj) {
  const { id, tur, tarih, tutar, muvekkil, davaId, icraId, aciklama, ...rest } = obj;
  return {
    id, tur, tarih: tarih || null, tutar: Number(tutar) || 0, muvekkil,
    dava_id: davaId || null, icra_id: icraId || null, aciklama,
    detaylar: rest, user_id: window._currentUserId
  };
}
function _sbFinansRowToObj(row) {
  const detaylar = row.detaylar || {};
  return Object.assign({}, detaylar, {
    id: row.id, tur: row.tur, tarih: row.tarih, tutar: row.tutar,
    muvekkil: row.muvekkil, davaId: row.dava_id, icraId: row.icra_id,
    aciklama: row.aciklama
  });
}
// odeme_planlari satırı ⇄ eski plan objesi dönüşümleri
function _sbOdemePlaniToRow(obj) {
  const { id, muvekkil, dosya, toplam, aciklama, periyot, taksitler } = obj;
  return {
    id, muvekkil, dosya, toplam: Number(toplam) || 0, aciklama,
    periyot: periyot || 'aylik', taksitler: taksitler || [],
    user_id: window._currentUserId
  };
}
function _sbOdemePlaniRowToObj(row) {
  return {
    id: row.id, muvekkil: row.muvekkil, dosya: row.dosya,
    toplam: row.toplam, aciklama: row.aciklama, periyot: row.periyot,
    taksitler: row.taksitler || [], created: row.created_at
  };
}
// tasks satırı ⇄ eski task objesi dönüşümleri
function _sbTaskToRow(obj) {
  const { id, tip, baslik, tarih, oncelik, ilgili, done, ...rest } = obj;
  return {
    id, tip: tip || 'gorev', baslik, tarih, oncelik, ilgili,
    done: !!done, detaylar: rest, user_id: window._currentUserId
  };
}
function _sbTaskRowToObj(row) {
  const detaylar = row.detaylar || {};
  return Object.assign({}, detaylar, {
    id: row.id, tip: row.tip, baslik: row.baslik, tarih: row.tarih,
    oncelik: row.oncelik, ilgili: row.ilgili, done: row.done
  });
}
// belgeler satırı ⇄ eski belge objesi dönüşümleri
function _sbBelgeToRow(obj) {
  const { id, davaId, ad, tur, tarih, url, yol, ...rest } = obj;
  return {
    id, dava_id: davaId || null, ad, tur, tarih, url, yol,
    detaylar: rest, user_id: window._currentUserId
  };
}
function _sbBelgeRowToObj(row) {
  const detaylar = row.detaylar || {};
  return Object.assign({}, detaylar, {
    id: row.id, davaId: row.dava_id, ad: row.ad, tur: row.tur,
    tarih: row.tarih, url: row.url, yol: row.yol
  });
}
// icra_belgeler satırı ⇄ eski icra belge objesi dönüşümleri
function _sbIcraBelgeToRow(obj) {
  const { id, icraId, ad, tur, tarih, url, ...rest } = obj;
  return {
    id, icra_id: icraId || null, ad, tur, tarih, url,
    detaylar: rest, user_id: window._currentUserId
  };
}
function _sbIcraBelgeRowToObj(row) {
  const detaylar = row.detaylar || {};
  return Object.assign({}, detaylar, {
    id: row.id, icraId: row.icra_id, ad: row.ad, tur: row.tur,
    tarih: row.tarih, url: row.url
  });
}
// icra_masraflar satırı ⇄ eski icra masraf objesi dönüşümleri
function _sbIcraMasrafToRow(obj) {
  return {
    id: obj.id, icra_id: obj.icraId || null, tur: obj.tur,
    tutar: Number(obj.tutar) || 0, tarih: obj.tarih, aciklama: obj.aciklama,
    user_id: window._currentUserId
  };
}
function _sbIcraMasrafRowToObj(row) {
  return {
    id: row.id, icraId: row.icra_id, tur: row.tur,
    tutar: row.tutar, tarih: row.tarih, aciklama: row.aciklama,
    created: row.created_at
  };
}
// dava_masraflar satırı ⇄ dava masraf objesi dönüşümleri
function _sbDavaMasrafToRow(obj) {
  return {
    id: obj.id, dava_id: obj.davaId || null, muvekkil: obj.muvekkilAd || null,
    tur: obj.tur, tutar: Number(obj.tutar) || 0, tarih: obj.tarih,
    aciklama: obj.aciklama, user_id: window._currentUserId
  };
}
function _sbDavaMasrafRowToObj(row) {
  return {
    id: row.id, davaId: row.dava_id, muvekkilAd: row.muvekkil,
    tur: row.tur, tutar: row.tutar, tarih: row.tarih,
    aciklama: row.aciklama, created: row.created_at
  };
}
// notlar satırı ⇄ eski not objesi dönüşümleri
function _sbNotToRow(obj) {
  return {
    id: obj.id, baslik: obj.baslik, ilgili: obj.ilgili, icerik: obj.icerik,
    user_id: window._currentUserId
  };
}
function _sbNotRowToObj(row) {
  return {
    id: row.id, baslik: row.baslik, ilgili: row.ilgili, icerik: row.icerik,
    tarih: row.created_at
  };
}
// cari satırı ⇄ eski cari objesi dönüşümleri
function _sbCariToRow(obj) {
  return {
    id: obj.id, muvekkil_id: obj.muvekkilId || null, tarih: obj.tarih,
    tur: obj.tur, tutar: Number(obj.tutar) || 0, aciklama: obj.aciklama,
    not_: obj.not, user_id: window._currentUserId
  };
}
function _sbCariRowToObj(row) {
  return {
    id: row.id, muvekkilId: row.muvekkil_id, tarih: row.tarih,
    tur: row.tur, tutar: row.tutar, aciklama: row.aciklama,
    not: row.not_, created: row.created_at
  };
}
// uets_kayitlar satırı ⇄ eski obje dönüşümleri
function _sbUetsToRow(obj) {
  return {
    id: obj.id, tebligat_no: obj.tebligatNo, gonderen: obj.gonderen,
    konu: obj.konu, dava_id: obj.davaId || null, dosya_no: obj.dosyaNo,
    teblig_tarihi: obj.tebligTarihi, okunma_tarihi: obj.okunmaTarihi || null,
    son_sure_tarihi: obj.sonSureTarihi || null, durum: obj.durum || 'okunmadi',
    hukuki_sure_gun: obj.hukukiSureGun || null,
    son_basvuru_tarihi: obj.sonBasvuruTarihi || null,
    notlar: obj.notlar, user_id: window._currentUserId
  };
}
function _sbUetsRowToObj(row) {
  return {
    id: row.id, tebligatNo: row.tebligat_no, gonderen: row.gonderen,
    konu: row.konu, davaId: row.dava_id, dosyaNo: row.dosya_no,
    tebligTarihi: row.teblig_tarihi, okunmaTarihi: row.okunma_tarihi,
    sonSureTarihi: row.son_sure_tarihi, durum: row.durum || 'okunmadi',
    hukukiSureGun: row.hukuki_sure_gun, sonBasvuruTarihi: row.son_basvuru_tarihi,
    notlar: row.notlar, created: row.created_at
  };
}

// ══ DIFF-BASED SUPABASE SENKRONU (kuyruk tabanlı, race-condition güvenli) ══
// "finans" gibi, çok sayıda farklı yerden DB.set ile değiştirilen key'ler için:
// her key için senkronlar bir kuyrukta sırayla işlenir. Böylece art arda hızlı
// eklenen kayıtlarda (örn. kullanıcı saniyeler içinde birden fazla kayıt eklerse)
// eskiArr her zaman "son işlenmiş gerçek durum" olur, asla stale (bayat) olmaz.
window._sbDiffQueue = {};      // { [key]: Promise } — o key için kuyruktaki son işin promise'i
window._sbDiffLastSynced = {}; // { [key]: array } — Supabase'e son BAŞARIYLA yansıtılan durum (DERİN kopya — cache ile obje referansı paylaşmaz)
window._sbDiffBekleyen = 0;    // kuyrukta bekleyen/yürüyen senkron işi sayısı (beforeunload uyarısı için)
window._sbDiffRetryTimers = {}; // { [key]: timerId } — başarısız senkron için kurulu yeniden deneme
async function _sbDiffSync(key, yeniArr) {
  if (!window._currentUserId) return;
  window._sbDiffBekleyen++;
  const onceki = window._sbDiffQueue[key] || Promise.resolve();
  const guncelIs = onceki.then(() => _sbDiffSyncCalistir(key, yeniArr)).catch(e => {
    console.error('[' + key + '] kuyruk senkron hatası:', e);
  }).finally(() => { window._sbDiffBekleyen = Math.max(0, window._sbDiffBekleyen - 1); });
  window._sbDiffQueue[key] = guncelIs;
  return guncelIs;
}
// Senkron gönderilemediyse (ağ/RLS hatası) 20 sn sonra cache'teki EN GÜNCEL
// durumla yeniden kuyruğa al. Timer zaten kuruluysa üst üste ekleme.
function _sbDiffYenidenDene(key) {
  if (window._sbDiffRetryTimers[key]) return;
  window._sbDiffRetryTimers[key] = setTimeout(function() {
    window._sbDiffRetryTimers[key] = null;
    _sbDiffSync(key, (window._sbCache[key] || []).slice());
  }, 20000);
}
// Sekme kapanırken gönderilmemiş değişiklik varsa kullanıcıyı uyar
window.addEventListener('beforeunload', function(e) {
  if (window._sbDiffBekleyen > 0) { e.preventDefault(); e.returnValue = ''; }
});
async function _sbDiffSyncCalistir(key, yeniArr) {
  try {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Eski demo veri veya bozuk kayıtlar (UUID olmayan id) Supabase'e hiç gönderilmez —
    // bunlar sessizce yerel cache'de kalır, hata üretmez.
    // eskiArr: bu key için en son BAŞARIYLA senkronize edilmiş durum (kuyruktaki önceki
    // iş tamamlandıktan sonra güncellenir) — window._sbCache[key] DEĞİL, çünkü o anlık
    // olarak DB.set tarafından çok daha önce güncellenmiş olabilir (stale karşılaştırma riski).
    // NOT: yeniArr burada HEMEN bir kopyaya (slice) alınır — çağıran taraf (DB.set) artık
    // her zaman zaten kopya gönderiyor olsa da, bu ekstra güvenlik bir referans paylaşımı
    // hatasının gelecekte tekrar oluşmasını önler.
    const eskiArrTum = (window._sbDiffLastSynced[key] || []).slice();
    const yeniArrTum = (yeniArr || []).slice();
    const eskiArr = eskiArrTum.filter(x => UUID_RE.test(x.id));
    const yeniArrGecerli = yeniArrTum.filter(x => UUID_RE.test(x.id));
    const yeniIds = new Set(yeniArrGecerli.map(x => x.id));
    const silinenler = eskiArr.filter(x => !yeniIds.has(x.id));
    // Eklenen veya değişen (basit JSON karşılaştırması ile) kayıtlar
    const eskiById = {}; eskiArr.forEach(x => { eskiById[x.id] = x; });
    const upsertListe = yeniArrGecerli.filter(x => {
      const eski = eskiById[x.id];
      if (!eski) return true; // yeni eklenen
      return JSON.stringify(eski) !== JSON.stringify(x); // değişen
    });
    const _TO_ROW_MAP = {
      finans: _sbFinansToRow, odeme_planlari: _sbOdemePlaniToRow,
      tasks: _sbTaskToRow, belgeler: _sbBelgeToRow,
      icra_belgeler: _sbIcraBelgeToRow, icra_masraflar: _sbIcraMasrafToRow, dava_masraflar: _sbDavaMasrafToRow,
      notlar: _sbNotToRow, cari: _sbCariToRow, uets_kayitlar: _sbUetsToRow
    };
    const toRow = _TO_ROW_MAP[key] || null;
    if (!toRow) return;  // Sadece bilinen key'ler için senkron yapılır
    let basarili = true;
    if (upsertListe.length) {
      const { error } = await _supabaseClient.from(key).upsert(upsertListe.map(toRow));
      if (error) { console.error('[' + key + '] upsert hatası:', error); basarili = false; }
    }
    if (silinenler.length) {
      const { error } = await _supabaseClient.from(key).delete().in('id', silinenler.map(x => x.id));
      if (error) { console.error('[' + key + '] delete hatası:', error); basarili = false; }
    }
    if (!basarili) {
      // lastSynced GÜNCELLENMEZ — bir sonraki senkron (veya 20 sn sonraki
      // otomatik deneme) aynı farkı yeniden gönderir. Eskiden hata durumunda da
      // güncelleniyordu; geçici bir ağ hatası kalıcı veri kaybına dönüşüyordu.
      try { notify('⚠️ Değişiklikler buluta gönderilemedi — otomatik yeniden denenecek'); } catch(e2) {}
      _sbDiffYenidenDene(key);
      return;
    }
    // Bu senkron başarıyla tamamlandı — "son senkronize durum"u güncelle.
    // DERİN kopya şart: cache'teki objelerle referans paylaşılırsa, yerinde
    // (in-place) yapılan mutasyonlar diff karşılaştırmasında görünmez olur ve
    // Supabase'e hiç yazılmaz (taksit ödeme kaybı bu yüzden yaşanmıştı).
    window._sbDiffLastSynced[key] = JSON.parse(JSON.stringify(yeniArrTum));
  } catch (e) {
    console.error('[' + key + '] diff-sync hatası:', e);
    try { notify('⚠️ Değişiklikler buluta gönderilemedi — otomatik yeniden denenecek'); } catch(e2) {}
    _sbDiffYenidenDene(key);
  }
}

// Tek bir dava/icra kaydını Supabase'e yaz — modal DIŞINDAKİ hızlı/inline
// düzenlemeler için (durum rozeti, sol panel ✏ alanları, not kartları).
// davalar/icralar diff-sync kapsamında OLMADIĞINDAN DB.set tek başına yalnız
// bellek cache'ini günceller; bu yardımcı çağrılmazsa değişiklik sayfa
// yenilenince kaybolur.
async function _sbTekKayitYaz(tablo, obj) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!window._currentUserId || !obj || !UUID_RE.test(obj.id)) return;
  const toRow = tablo === 'davalar' ? _sbDavaToRow : tablo === 'icralar' ? _sbIcraToRow : null;
  if (!toRow) return;
  const { error } = await _supabaseClient.from(tablo).upsert(toRow(obj));
  if (error) {
    console.error('[' + tablo + '] kayıt yazılamadı:', error);
    try { notify('⚠️ Değişiklik buluta kaydedilemedi — bağlantınızı kontrol edin'); } catch(e) {}
  }
}

// dosya_chatter satırı ⇄ eski chatter post objesi dönüşümleri
function _sbChatterRowToPost(row) {
  return {
    id: row.id, parentId: row.parent_id,
    parentYazar: (row.ekler && row.ekler._parentYazar) || null,
    parentMetin: (row.ekler && row.ekler._parentMetin) || null,
    yazar: row.yazar, metin: row.metin,
    ekler: Array.isArray(row.ekler) ? row.ekler : (row.ekler && row.ekler._ekler) || [],
    tepkiler: row.tepkiler || {},
    duzenlemeTarih: row.duzenleme_tarih,
    tarih: row.created_at
  };
}
function _sbPostToChatterRow(post, dosyaTipi, dosyaId) {
  return {
    id: post.id, dosya_tipi: dosyaTipi, dosya_id: dosyaId,
    parent_id: post.parentId || null,
    yazar: post.yazar, metin: post.metin || '',
    ekler: { _ekler: post.ekler || [], _parentYazar: post.parentYazar || null, _parentMetin: post.parentMetin || null },
    tepkiler: post.tepkiler || {},
    duzenleme_tarih: post.duzenlemeTarih || null,
    user_id: window._currentUserId
  };
}

// Sayfa açılışında Supabase'den davalar + icralar çek, cache'i doldur
async function _sbYukleDavalarIcralar() {
  if (!window._currentUserId) return;
  try {
    const [
      { data: dData, error: dErr },
      { data: iData, error: iErr },
      { data: mvData, error: mvErr },
      { data: kData, error: kErr },
      { data: ctData, error: ctErr },
      { data: fData, error: fErr },
      { data: opData, error: opErr }
    ] = await Promise.all([
      _supabaseClient.from('davalar').select('*').order('created_at', { ascending: false }),
      _supabaseClient.from('icralar').select('*').order('created_at', { ascending: false }),
      _supabaseClient.from('muvekkiller').select('*').order('created_at', { ascending: false }),
      _supabaseClient.from('kisiler').select('*').order('created_at', { ascending: false }),
      _supabaseClient.from('contacts').select('*').order('created_at', { ascending: false }),
      _supabaseClient.from('finans').select('*').order('created_at', { ascending: false }),
      _supabaseClient.from('odeme_planlari').select('*').order('created_at', { ascending: false })
    ]);
    if (dErr) console.error('Davalar yüklenemedi:', dErr);
    if (iErr) console.error('İcralar yüklenemedi:', iErr);
    if (mvErr) console.error('Müvekkiller yüklenemedi:', mvErr);
    if (kErr) console.error('Kişiler yüklenemedi:', kErr);
    if (ctErr) console.error('Contacts yüklenemedi:', ctErr);
    if (fErr) console.error('Finans yüklenemedi:', fErr);
    if (opErr) console.error('Ödeme planları yüklenemedi:', opErr);
    window._sbCache.davalar = (dData || []).map(_sbRowToObj);
    window._sbCache.icralar = (iData || []).map(_sbRowToObj);
    window._sbCache.muvekkiller = (mvData || []).map(_sbRowToObj);
    window._sbCache.kisiler = (kData || []).map(_sbRowToObj);
    window._sbCache.contacts = (ctData || []).map(_sbContactRowToObj);
    window._sbCache.finans = (fData || []).map(_sbFinansRowToObj);
    window._sbCache.odeme_planlari = (opData || []).map(_sbOdemePlaniRowToObj);
    // diff-sync'in "son senkronize durum" referansını da Supabase'den gelen
    // gerçek veriyle başlat — aksi halde ilk DB.set çağrısı tüm kayıtları
    // "yeni eklenmiş" sanıp gereksiz yere tekrar upsert eder.
    // DERİN kopya: cache objeleriyle referans paylaşılırsa yerinde mutasyonlar
    // diff'te görünmez olur (bkz. _sbDiffSyncCalistir'daki not).
    window._sbDiffLastSynced.finans = JSON.parse(JSON.stringify(window._sbCache.finans));
    window._sbDiffLastSynced.odeme_planlari = JSON.parse(JSON.stringify(window._sbCache.odeme_planlari));

    // 4. Aşama tabloları — jenerik döngü ile yükleme (kod tekrarını azaltmak için)
    const _ASAMA4_TABLOLAR = {
      tasks:          _sbTaskRowToObj,
      belgeler:       _sbBelgeRowToObj,
      icra_belgeler:  _sbIcraBelgeRowToObj,
      icra_masraflar: _sbIcraMasrafRowToObj,
      dava_masraflar: _sbDavaMasrafRowToObj,
      notlar:         _sbNotRowToObj,
      cari:           _sbCariRowToObj,
      uets_kayitlar:  _sbUetsRowToObj
    };
    const _asama4Anahtarlar = Object.keys(_ASAMA4_TABLOLAR);
    const _asama4Sonuclar = await Promise.all(
      _asama4Anahtarlar.map(tbl => _supabaseClient.from(tbl).select('*').order('created_at', { ascending: false }))
    );
    _asama4Anahtarlar.forEach((tbl, idx) => {
      const { data, error } = _asama4Sonuclar[idx];
      if (error) { console.error(tbl + ' yüklenemedi:', error); return; }
      const rowToObj = _ASAMA4_TABLOLAR[tbl];
      window._sbCache[tbl] = (data || []).map(rowToObj);
      window._sbDiffLastSynced[tbl] = JSON.parse(JSON.stringify(window._sbCache[tbl]));
    });
    // İcra haciz verilerini Supabase'den localStorage'a kopyala
    // (haciz verileri icra kaydının detaylar.haciz alanında saklanır;
    //  okuma tarafı değişmeden localStorage'dan okumaya devam eder)
    try { _hacizSbToLocal(); } catch(e) {}
  } catch (e) {
    console.error('Supabase veri yükleme hatası:', e);
    try { notify('⚠️ Veriler yüklenirken bir hata oluştu. İnternet bağlantınızı kontrol edin.'); } catch(e2) {}
  }
}

// Bir dosyanın (dava/icra) chatter mesajlarını Supabase'den çekip cache'e koy
async function _sbYukleChatter(dosyaTipi, dosyaId) {
  if (!window._currentUserId || !dosyaId) return [];
  try {
    const { data, error } = await _supabaseClient.from('dosya_chatter')
      .select('*').eq('dosya_tipi', dosyaTipi).eq('dosya_id', dosyaId)
      .order('created_at', { ascending: true });
    if (error) { console.error('Dosya günlüğü yüklenemedi:', error); return []; }
    const posts = (data || []).map(_sbChatterRowToPost);
    const cacheKey = (dosyaTipi === 'icra' ? 'icra_chatter_' : 'chatter_') + dosyaId;
    window._sbCache.chatter[cacheKey] = posts;
    return posts;
  } catch (e) {
    console.error('Dosya günlüğü yükleme hatası:', e);
    return [];
  }
}

window.DB = {
  genId: () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2,5)),
  get: (key) => {
    // KRİTİK: array'in bir KOPYASI döndürülür, referansı değil. Aksi halde
    // çağıran kod (örn. arr.push(...)) cache'in kendisini de mutasyona uğratır;
    // bu da art arda hızlı DB.set çağrılarında bekleyen senkron işlerinin
    // "yeniArr" parametresinin retroaktif olarak değişmesine, dolayısıyla
    // ara adımların kaybolmasına yol açar (gerçek bir prod hatasıydı).
    if (_SB_TABLES[key]) return (window._sbCache[key] || []).slice();
    if (_SB_DIFF_TABLES[key]) return (window._sbCache[key] || []).slice();
    const chatterInfo = _sbChatterKeyParse(key);
    if (chatterInfo) return (window._sbCache.chatter[key] || []).slice();
    const r = localStorage.getItem('hukuk_' + key);
    if (!r) return [];
    return JSON.parse(r);
  },
  set: (key, val) => {
    if (_SB_TABLES[key]) { window._sbCache[key] = (val || []).slice(); return; }  // Supabase senkronu kaydet fonksiyonlarında yapılır
    if (_SB_DIFF_TABLES[key]) {
      // Cache'i hemen güncelle (senkron okuma davranışı korunur),
      // Supabase senkronunu arka planda, kuyruğa girerek (fire-and-forget) başlat.
      // _sbDiffSync kendi içinde sıralamayı ve "son senkronize durum" karşılaştırmasını yönetir.
      // KOPYA: cache'e val'in referansı değil kopyası yazılır — çağıran kodun elindeki
      // array daha sonra mutasyona uğrarsa (push vs.) cache/kuyruktaki bekleyen işler bundan etkilenmesin.
      const valKopya = (val || []).slice();
      window._sbCache[key] = valKopya;
      _sbDiffSync(key, valKopya).catch(e => console.error('[' + key + '] arka plan senkron hatası:', e));
      return;
    }
    const chatterInfo = _sbChatterKeyParse(key);
    if (chatterInfo) { window._sbCache.chatter[key] = val; return; }  // Supabase senkronu post fonksiyonlarında yapılır
    localStorage.setItem('hukuk_' + key, JSON.stringify(val));
  }
};

// ══ ÇİFT TIKLA KORUMASI (Double-Submit Prevention) ══
window._saveLocks = {};
function withSaveLock(lockName, fn) {
  if (window._saveLocks[lockName]) return;
  window._saveLocks[lockName] = true;
  // İşlem bittikten 800ms sonra kilidi aç
  const kilidiAc = () => setTimeout(() => { window._saveLocks[lockName] = false; }, 800);
  try {
    const sonuc = fn();
    // Async kaydetme fonksiyonları (örn. Supabase upsert bekleyenler) promise
    // döner — kilit, işlem GERÇEKTEN bitince açılmalı; eskiden sabit 800ms
    // sonra açıldığı için uzun süren kayıtta çift gönderim mümkündü.
    if (sonuc && typeof sonuc.finally === 'function') { sonuc.finally(kilidiAc); return; }
  } catch(e) {
    kilidiAc();
    throw e;
  }
  kilidiAc();
}

// ══ GİRİŞ HIZI SINIRLAMASI (Rate Limiting) ══
window._loginAttempts = { count: 0, lockedUntil: 0, timerId: null };
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_SECONDS = 30;

function _loginIsLocked() {
  return Date.now() < window._loginAttempts.lockedUntil;
}

function _loginRecordFail() {
  window._loginAttempts.count++;
  if (window._loginAttempts.count >= LOGIN_MAX_ATTEMPTS) {
    window._loginAttempts.lockedUntil = Date.now() + LOGIN_LOCK_SECONDS * 1000;
    const errEl = document.getElementById('login-error');
    const btn = document.querySelector('.login-btn');
    if (btn) btn.disabled = true;
    let remaining = LOGIN_LOCK_SECONDS;
    if (window._loginAttempts.timerId) clearInterval(window._loginAttempts.timerId);
    window._loginAttempts.timerId = setInterval(() => {
      remaining--;
      if (errEl) errEl.textContent = '🔒 Çok fazla deneme. ' + remaining + ' saniye bekleyin...';
      if (remaining <= 0) {
        clearInterval(window._loginAttempts.timerId);
        window._loginAttempts.timerId = null;
        window._loginAttempts.count = 0;
        window._loginAttempts.lockedUntil = 0;
        if (btn) btn.disabled = false;
        if (errEl) errEl.textContent = '';
      }
    }, 1000);
    if (errEl) errEl.textContent = '🔒 Çok fazla deneme. ' + LOGIN_LOCK_SECONDS + ' saniye bekleyin...';
  }
}

function _loginResetAttempts() {
  window._loginAttempts.count = 0;
  window._loginAttempts.lockedUntil = 0;
  if (window._loginAttempts.timerId) { clearInterval(window._loginAttempts.timerId); window._loginAttempts.timerId = null; }
}

async function doLogin() {
  // Rate limit kontrolü
  if (_loginIsLocked()) {
    const remaining = Math.ceil((window._loginAttempts.lockedUntil - Date.now()) / 1000);
    document.getElementById('login-error').textContent = '🔒 Çok fazla deneme. ' + remaining + ' saniye bekleyin...';
    return;
  }
  const emailOrUser = (document.getElementById('login-user')?.value || '').trim();
  const pw = document.getElementById('login-pw').value;
  const errEl = document.getElementById('login-error');
  if (!emailOrUser || !pw) { errEl.textContent = 'E-posta ve şifre gereklidir.'; return; }
  // Giriş işlemi sürerken (Supabase auth + veri yükleme) butonu devre dışı bırak,
  // kullanıcı uygulamanın donmadığını, işlemin sürdüğünü görsün.
  const loginBtn = document.getElementById('login-btn');
  const loginBtnOrijinalMetin = loginBtn ? loginBtn.textContent : '';
  if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Giriş yapılıyor...'; }
  const plLoading = document.getElementById('post-login-loading');
  const plLoadingText = document.getElementById('post-login-loading-text');
  let plLoadingGosterildi = false;
  try {
    const email = emailOrUser.includes('@') ? emailOrUser : _HUKUK_CONFIG.varsayilanEposta;
        const { data, error } = await _supabaseClient.auth.signInWithPassword({ email, password: pw });
    if (error) { _loginRecordFail(); errEl.textContent = '❌ Hatalı e-posta veya şifre.' + (window._loginAttempts.count >= 3 ? ' (' + (LOGIN_MAX_ATTEMPTS - window._loginAttempts.count) + ' deneme kaldı)' : ''); document.getElementById('login-pw').value = ''; return; }
    _loginResetAttempts();
    window._supabaseToken = data.session.access_token;
    window._currentUserId = data.user.id;
    sessionStorage.setItem('sb_session', JSON.stringify({ access_token: data.session.access_token, user_id: data.user.id, email: data.user.email, expires_at: data.session.expires_at }));
    // Beni hatırla
    if (document.getElementById('remember-me')?.checked) {
      localStorage.setItem('hukuk_remember_user', emailOrUser);
      localStorage.setItem('hukuk_persist_login', '1');
    } else {
      localStorage.removeItem('hukuk_remember_user');
      localStorage.removeItem('hukuk_persist_login');
    }
    // Auth doğrulandı, ama login ekranını HENÜZ kapatmıyoruz — önce tam ekran
    // yükleme katmanını login ekranının ÜSTÜNE gösteriyoruz, ki kullanıcı "boş/donuk
    // ekran" görmesin. Login ekranı ve bu katman, veriler tamamen yüklendikten
    // sonra BİRLİKTE kapanacak (aşağıda, finally'den önce).
    if (plLoading) { plLoading.style.display = 'flex'; plLoadingGosterildi = true; }
    errEl.textContent = '';
    const user = { username: data.user.email, adSoyad: data.user.email.split('@')[0], rol: 'admin' };
    try { updateSidebarUser(user); } catch(e3) {}
    window.currentUser = user;
    const hint = document.getElementById('login-hint'); if (hint) hint.style.display = 'none';

    // Eski hatalı KV Tahsilat kayıtlarını temizle (kaynakKVId olan Tahsilat türü)
    try {
      var finansAll = DB.get('finans') || [];
      var finansTemiz = finansAll.filter(function(f) {
        return !(f.kaynakKVId && f.tur === 'Tahsilat');
      });
      if (finansTemiz.length !== finansAll.length) {
        DB.set('finans', finansTemiz);
      }
    } catch(eCl) {}

    // Tüm sayfaları gizle, dashboard'u göster (henüz görünmüyor, login ekranı/yükleme
    // katmanı üstte duruyor — kullanıcı bu geçişi görmeyecek)
    try {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const dash = document.getElementById('page-dashboard');
      if (dash) dash.classList.add('active');
      if (plLoadingText) plLoadingText.textContent = 'Veriler yükleniyor...';
      await _sbYukleDavalarIcralar();
      try { renderDashboard(); } catch(e4) { console.warn('renderDashboard:', e4.message); }
      try { _kacirilmisHatirlatmalariKontrolEt(); } catch(e) {}
      try { _uetsSureUyariKontrol(); } catch(e) {}
      try { tabEkle("Gösterge Paneli","📊","dashboard"); } catch(e) {}
      window._appStarted = true;
    } catch(e2) { console.warn('dashboard açma hatası:', e2.message); }
    // Veriler hazır — şimdi login ekranını VE yükleme katmanını birlikte kapat.
    const ls = document.getElementById('login-screen'); ls.classList.add('hidden'); ls.style.display = 'none';
    // Login ekranı kapandı — alıntı döngüsü artık gereksiz, durdur
    if (window._lqInterval) { clearInterval(window._lqInterval); window._lqInterval = null; }
    if (plLoading) { plLoading.style.display = 'none'; plLoadingGosterildi = false; }
  } catch(e) {
    errEl.textContent = '❌ Bağlantı hatası: ' + e.message;
  } finally {
    // Giriş ekranı kapanmış olsa da olmasa da butonu eski haline getir
    // (sonraki bir giriş denemesinde buton kullanılabilir kalsın)
    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = loginBtnOrijinalMetin; }
    // Hata durumunda yükleme katmanı açık kalmış olabilir — login ekranına geri dönülsün
    if (plLoadingGosterildi && plLoading) { plLoading.style.display = 'none'; }
  }
}

// ========== TAKVİM GÜN POPUP ==========
function calGunAc(anahtar) {
  const gorevler = DB.get('tasks').filter(g => g.tarih && g.tarih.slice(0,10) === anahtar);
  if (!gorevler.length) return;

  const [yil, ay, gun] = anahtar.split('-');
  const AY = ['','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const baslik = `${parseInt(gun)} ${AY[parseInt(ay)]} ${yil}`;

  const aktif = gorevler.filter(g => !g.done);
  const tamam = gorevler.filter(g => g.done);

  document.getElementById('modal-cal-day-title').innerHTML =
    `📅 ${baslik} <span style="font-size:13px;color:var(--text3);font-weight:400">— ${gorevler.length} görev</span>`;

  document.getElementById('modal-cal-day-body').innerHTML = `
    ${aktif.length ? `<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Bekleyen (${aktif.length})</div>
    ${aktif.map(g => `
      <div class="task-item" style="margin-bottom:8px">
        <div class="task-check" onclick="toggleTask('${g.id}',()=>{closeModal('modal-cal-day');renderCalendar()})"></div>
        <div class="task-content">
          <div class="task-title">${escHtml(g.baslik)}</div>
          <div class="task-meta">
            ${g.ilgili ? `<span>📁 ${escHtml(g.ilgili)}</span>` : ''}
            <span class="tag tag-${g.oncelik==='Acil'?'icra':g.oncelik==='Yüksek'?'dava':'bekliyor'}">${g.oncelik}</span>
          </div>
        </div>
        <button class="btn btn-ghost" style="font-size:11px" onclick="closeModal('modal-cal-day');editTask('${g.id}')">✏</button>
      </div>`).join('')}` : ''}
    ${tamam.length ? `<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-top:12px;margin-bottom:8px">Tamamlanan (${tamam.length})</div>
    ${tamam.map(g => `
      <div class="task-item" style="margin-bottom:8px;opacity:0.6">
        <div class="task-check done" onclick="toggleTask('${g.id}',()=>{closeModal('modal-cal-day');renderCalendar()})"></div>
        <div class="task-content">
          <div class="task-title done">${escHtml(g.baslik)}</div>
          ${g.ilgili ? `<div class="task-meta"><span>📁 ${escHtml(g.ilgili)}</span></div>` : ''}
        </div>
      </div>`).join('')}` : ''}
  `;
  openModal('modal-cal-day');
}

// ========== DOSYAYA GÖRE GÖREV GÖRÜNÜMÜ ==========
function renderTasksByPerson() {
  const el = document.getElementById('task-person-list');
  if (!el) return;

  let tasks = DB.get('tasks') || [];
  const davalar = DB.get('davalar') || [];
  const icralar = DB.get('icralar') || [];

  const dosyaFilter = document.getElementById('task-dosya-filter')?.value || '';
  if (dosyaFilter) tasks = tasks.filter(t => t.ilgili === dosyaFilter);

  if (taskFilter === 'pending') tasks = tasks.filter(t => !t.done);
  else if (taskFilter === 'urgent') tasks = tasks.filter(t => !t.done && (t.oncelik==='Acil'||isUrgent(t.tarih)));
  else if (taskFilter === 'done') tasks = tasks.filter(t => t.done);

  // Dosyaya göre grupla
  const gruplar = {};
  tasks.forEach(t => {
    const key = t.ilgili || '__genel__';
    if (!gruplar[key]) gruplar[key] = [];
    gruplar[key].push(t);
  });

  // Sırala: önce dosya bağlantılı, sonra genel
  const sirali = Object.keys(gruplar).sort((a, b) => {
    if (a === '__genel__') return 1;
    if (b === '__genel__') return -1;
    return a.localeCompare(b, 'tr');
  });

  if (!sirali.length) {
    el.innerHTML = `<div class="card"><div class="empty"><div class="empty-icon">✅</div><div class="empty-text">Bu filtrede görev yok</div></div></div>`;
    return;
  }

  el.innerHTML = sirali.map(key => {
    const grup = gruplar[key];
    const dava = davalar.find(d => d.ad === key || d.no === key);
    const icra = !dava ? icralar.find(i => i.no === key || i.bki === key) : null;
    let icraAdi = '';
    if (icra) {
      const itp = (typeof _icraTarafPair === 'function') ? _icraTarafPair(icra) : { alacakli: icra.muvekkil, borclu: icra.borclu };
      icraAdi = (itp.alacakli || itp.borclu) ? `${itp.alacakli || '—'} vs ${itp.borclu || '—'}` : icra.no;
    }
    const baslik = key === '__genel__' ? '📋 Genel Görevler'
      : dava ? `📁 ${dava.ad || dava.no} <span style="font-size:12px;color:var(--text3);font-weight:400">${dava.muvekkil ? '· ' + dava.muvekkil : ''}</span>`
      : icra ? `⚡ ${icraAdi} <span style="font-size:12px;color:var(--text3);font-weight:400">(${icra.no})${icra.muvekkil ? ' · ' + icra.muvekkil : ''}</span>`
      : `📁 ${key}`;

    const aktif = grup.filter(t => !t.done).length;
    const tamam = grup.filter(t => t.done).length;

    return `<div class="card" style="margin-bottom:0;display:flex;flex-direction:column">
      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid var(--border)">
        <div style="font-size:14px;font-weight:600;color:var(--text)">${baslik}</div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          ${aktif > 0 ? `<span style="background:rgba(28,26,23,0.15);color:var(--gold2);font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600">${aktif} bekleyen</span>` : ''}
          ${tamam > 0 ? `<span style="background:rgba(74,140,92,0.1);color:#7dc495;font-size:11px;padding:2px 8px;border-radius:10px">${tamam} tamamlanan</span>` : ''}
          ${dava ? `<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="openTaskForDava('${dava.id}')">+ Görev</button>` : ''}
        </div>
      </div>
      ${grup.sort((a,b) => a.done - b.done).map(t => `
        <div class="task-item">
          <div class="task-check ${t.done?'done':''}" onclick="toggleTask('${t.id}',renderTasksByPerson)"></div>
          <div class="task-content">
            <div class="task-title ${t.done?'done':''}">${escHtml(t.baslik)}</div>
            <div class="task-meta">
              ${t.tarih ? `<span ${isUrgent(t.tarih)&&!t.done?'class="task-urgent"':''}>📅 ${fmtDate(t.tarih)}</span>` : ''}
              <span class="tag tag-${t.oncelik==='Acil'?'icra':t.oncelik==='Yüksek'?'dava':'bekliyor'}">${t.oncelik}</span>
              ${t.aciklama ? `<span style="color:var(--text3)">${escHtml(t.aciklama.slice(0,40))}${t.aciklama.length>40?'…':''}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            ${t.tarih ? `<button class="btn btn-ghost" style="color:var(--blue)" onclick="openGcal('${t.id}')">📅</button>` : ''}
            <button class="btn btn-ghost" onclick="editTask('${t.id}')">✏</button>
            <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteTask('${t.id}')">🗑</button>
          </div>
        </div>`).join('')}
    </div>`;
  }).join('');
}

// ========== RAPORLAR ==========
function openRaporModal(tur) {
  const titles = {
    davalar: '📁 Dava Dosyaları Raporu',
    icralar: '⚡ İcra Dosyaları Raporu',
    muvekkiller: '👤 Müvekkiller Raporu',
    finans: '💰 Finans Raporu',
    gorevler: '✅ Görevler Raporu',
    genel: '📊 Genel Özet Raporu'
  };
  document.getElementById('modal-rapor-title').textContent = titles[tur] || 'Rapor';

  const muvekkiller = DB.get('muvekkiller').map(m => m.ad);
  const davalar = DB.get('davalar');

  const formlar = {
    davalar: `
      <div class="form-grid">
        <div class="form-group"><label>Durum</label>
          <select id="rm-dava-durum"><option value="">Tümü</option><option>Aktif</option><option>Bekliyor</option><option>Kapalı</option></select>
        </div>
        <div class="form-group"><label>Müvekkil</label>
          <select id="rm-dava-muvekkil"><option value="">Tümü</option>${muvekkiller.map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Başlangıç Tarihi</label><input id="rm-dava-bas" type="date" min="1900-01-01" max="2100-12-31"></div>
        <div class="form-group"><label>Bitiş Tarihi</label><input id="rm-dava-bit" type="date" min="1900-01-01" max="2100-12-31"></div>
        <div class="form-group full"><label>Dahil Edilecek Sütunlar</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-top:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px">
            ${['Dosya No','Dosya Adı','Müvekkil','Karşı Taraf','Mahkeme','Esas No','Durum','Son Duruşma','Sonraki Duruşma','Dava Çeşidi','Vekâlet Ücreti','Tahsilat','Kalan','Masraf','Notlar'].map(s=>
              `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:400;text-transform:none;padding:5px 8px;border-radius:6px;cursor:pointer;transition:background 0.1s;color:var(--text2)" onmouseover="this.style.background='rgba(28,26,23,0.08)';this.style.color='var(--text)'" onmouseout="this.style.background='transparent';this.style.color='var(--text2)'">
                ${s}<input type="checkbox" checked value="${s}" class="r-col-dava" style="accent-color:var(--gold);width:15px;height:15px;flex-shrink:0;cursor:pointer">
              </label>`).join('')}
          </div>
        </div>
      </div>`,
    icralar: `
      <div class="form-grid">
        <div class="form-group"><label>Durum</label>
          <select id="rm-icra-durum"><option value="">Tümü</option><option>Aktif</option><option>Kapalı</option></select>
        </div>
        <div class="form-group"><label>Müvekkil</label>
          <select id="rm-icra-muvekkil"><option value="">Tümü</option>${muvekkiller.map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group full"><label>Dahil Edilecek Sütunlar</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-top:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px">
            ${['Dosya No','Borçlu','Müvekkil','Müdürlük','Esas No','Alacak Tutarı','Durum','Notlar'].map(s=>
              `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:400;text-transform:none;padding:5px 8px;border-radius:6px;cursor:pointer;transition:background 0.1s;color:var(--text2)" onmouseover="this.style.background='rgba(28,26,23,0.08)';this.style.color='var(--text)'" onmouseout="this.style.background='transparent';this.style.color='var(--text2)'">
                ${s}<input type="checkbox" checked value="${s}" class="r-col-icra" style="accent-color:var(--gold);width:15px;height:15px;flex-shrink:0;cursor:pointer">
              </label>`).join('')}
          </div>
        </div>
      </div>`,
    muvekkiller: `
      <div class="form-grid">
        <div class="form-group"><label>Tür</label>
          <select id="rm-mv-tur"><option value="">Tümü</option><option>Bireysel</option><option>Kurumsal</option></select>
        </div>
        <div class="form-group full"><label>Dahil Edilecek Sütunlar</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;margin-top:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px">
            ${['Ad','Tür','TC/Vergi No','Telefon','E-posta','Adres','Sektör','Toplam Dava','Notlar'].map(s=>
              `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:400;text-transform:none;padding:5px 8px;border-radius:6px;cursor:pointer;transition:background 0.1s;color:var(--text2)" onmouseover="this.style.background='rgba(28,26,23,0.08)';this.style.color='var(--text)'" onmouseout="this.style.background='transparent';this.style.color='var(--text2)'">
                ${s}<input type="checkbox" checked value="${s}" class="r-col-mv" style="accent-color:var(--gold);width:15px;height:15px;flex-shrink:0;cursor:pointer">
              </label>`).join('')}
          </div>
        </div>
      </div>`,
    finans: `
      <div class="form-grid">
        <div class="form-group"><label>Tür</label>
          <select id="rm-finans-tur"><option value="">Tümü</option><option>Tahsilat</option><option>Masraf</option></select>
        </div>
        <div class="form-group"><label>Müvekkil</label>
          <select id="rm-finans-muvekkil"><option value="">Tümü</option>${muvekkiller.map(m=>`<option>${m}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Başlangıç Tarihi</label><input id="rm-finans-bas" type="date" min="1900-01-01" max="2100-12-31"></div>
        <div class="form-group"><label>Bitiş Tarihi</label><input id="rm-finans-bit" type="date" min="1900-01-01" max="2100-12-31"></div>
      </div>`,
    gorevler: `
      <div class="form-grid">
        <div class="form-group"><label>Durum</label>
          <select id="r-gorev-durum"><option value="">Tümü</option><option value="bekleyen">Bekleyen</option><option value="tamam">Tamamlanan</option></select>
        </div>
        <div class="form-group"><label>Öncelik</label>
          <select id="r-gorev-oncelik"><option value="">Tümü</option><option>Normal</option><option>Yüksek</option><option>Acil</option></select>
        </div>
        <div class="form-group"><label>İlgili Dosya</label>
          <select id="r-gorev-dosya"><option value="">Tümü</option>${davalar.map(d=>`<option value="${d.ad||d.no}">${d.ad||d.no}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Tarih Aralığı Başlangıç</label><input id="r-gorev-bas" type="date" min="1900-01-01" max="2100-12-31"></div>
        <div class="form-group"><label>Tarih Aralığı Bitiş</label><input id="r-gorev-bit" type="date" min="1900-01-01" max="2100-12-31"></div>
      </div>`,
    genel: `<p style="color:var(--text2);font-size:13px">Tüm veriler tek Excel dosyasında — her kategori ayrı sekme olarak çıkacak.</p>
      <p style="color:var(--text3);font-size:12px">Davalar, İcralar, Müvekkiller, Finans ve Görevler sekmelerini içerir.</p>`
  };

  document.getElementById('modal-rapor-body').innerHTML = `
    ${formlar[tur] || ''}
    <div class="form-actions" style="margin-top:16px">
      <button class="btn btn-outline" onclick="closeModal('modal-rapor')">İptal</button>
      <button class="btn btn-gold" onclick="raporIndir('${tur}')">📥 Excel İndir</button>
    </div>`;

  openModal('modal-rapor');
}

function renderRaporlarPage() {
  const muvekkiller = DB.get('muvekkiller') || [];
  const davalar = DB.get('davalar') || [];
  const icralar = DB.get('icralar') || [];
  const finans  = DB.get('finans') || [];
  const tasks   = DB.get('tasks') || [];
  const today   = new Date(); today.setHours(0,0,0,0);

  const GELIR_T = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
  const topTah  = finans.filter(f=>GELIR_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const topMas  = finans.filter(f=>['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç','Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'].includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const mvOpts  = muvekkiller.map(m=>`<option value="${escAttr(m.ad)}">${escHtml(m.ad)}</option>`).join('');

  const el = document.getElementById('raporlar-grid');
  el.innerHTML = `
  <!-- Özet KPI -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px">
    ${[
      {icon:'📁', l:'Aktif Dava',   v:davalar.filter(d=>d.durum==='Aktif').length,  c:'var(--gold)'},
      {icon:'⚡', l:'Aktif İcra',   v:icralar.filter(i=>i.durum==='Aktif').length,  c:'#7ab5d4'},
      {icon:'👤', l:'Müvekkil',     v:muvekkiller.length,                            c:'#9c968d'},
      {icon:'✅', l:'Bekleyen Görev',v:tasks.filter(t=>!t.done&&t.tip!=='durusma').length,              c:'#7dc495'},
      {icon:'💰', l:'Toplam Tahsilat',v:'₺'+fmt(topTah),                            c:'var(--green)'},
      {icon:'📊', l:'Net Bakiye',   v:'₺'+fmt(topTah-topMas),                       c:'var(--gold2)'},
    ].map(s=>`
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">${s.icon} ${s.l}</div>
        <div style="font-size:20px;font-weight:700;color:${s.c};font-family:'DM Mono',monospace">${s.v}</div>
      </div>`).join('')}
  </div>

  <!-- Rapor Kartları -->
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:14px">

  <!-- DAVA RAPORU -->
  <div class="card" style="border-top:3px solid var(--gold)">
    <div class="card-title" style="font-size:14px;margin-bottom:14px">📁 Dava Dosyaları Raporu</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="form-group" style="margin:0"><label>Durum</label>
        <select id="r-dava-durum" onchange="raporSayiGuncelle('davalar')"><option value="">Tümü</option><option>Aktif</option><option>Bekliyor</option><option>Kapalı</option></select>
      </div>
      <div class="form-group" style="margin:0"><label>Müvekkil</label>
        <select id="r-dava-muvekkil" onchange="raporSayiGuncelle('davalar')"><option value="">Tümü</option>${mvOpts}</select>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Dahil Edilecek Sütunlar</span><button onclick="raporSutunToggle(this)" style="font-size:10px;color:var(--gold);background:none;border:none;cursor:pointer;text-decoration:underline">Tümünü Kaldır</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px;max-height:220px;overflow-y:auto">
        ${['Dosya No','Müvekkil','Karşı Taraf','Mahkeme','Esas No','Durum','Tür','Çeşit','Hâkim','Karşı Avukat','Sonraki Duruşma','Son Duruşma','Akdi Ücret','Notlar'].map(s=>
          '<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;cursor:pointer;color:var(--text2);padding:5px 8px;border-radius:6px;transition:background 0.1s" onmouseover="this.style.background=\'rgba(28,26,23,0.08)\'" onmouseout="this.style.background=\'transparent\'">'+s+'<input type="checkbox" checked value="'+s+'" class="rc-dava" style="accent-color:var(--gold);width:15px;height:15px;flex-shrink:0;cursor:pointer"></label>').join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="r-dava-sayi" style="font-size:12px;color:var(--text3)">${davalar.length} dosya</span>
      <button class="btn btn-gold" style="flex:1;justify-content:center" onclick="raporIndir('davalar')">📥 CSV İndir</button>
    </div>
  </div>

  <!-- İCRA RAPORU -->
  <div class="card" style="border-top:3px solid #7ab5d4">
    <div class="card-title" style="font-size:14px;margin-bottom:14px">⚡ İcra Dosyaları Raporu</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="form-group" style="margin:0"><label>Durum</label>
        <select id="r-icra-durum" onchange="raporSayiGuncelle('icralar')"><option value="">Tümü</option><option>Aktif</option><option>Bekliyor</option><option>Kapalı</option></select>
      </div>
      <div class="form-group" style="margin:0"><label>Müvekkil</label>
        <select id="r-icra-muvekkil" onchange="raporSayiGuncelle('icralar')"><option value="">Tümü</option>${mvOpts}</select>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Dahil Edilecek Sütunlar</span><button onclick="raporSutunToggle(this)" style="font-size:10px;color:var(--gold);background:none;border:none;cursor:pointer;text-decoration:underline">Tümünü Kaldır</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px;max-height:220px;overflow-y:auto">
        ${['Dosya No','BKİ','Alacaklı','Borçlu','Müdürlük','Esas No','Alacak','Durum','Tür','Borçlu Avukat','Notlar'].map(s=>
          '<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;cursor:pointer;color:var(--text2);padding:5px 8px;border-radius:6px;transition:background 0.1s" onmouseover="this.style.background=\'rgba(28,26,23,0.08)\'" onmouseout="this.style.background=\'transparent\'">'+s+'<input type="checkbox" checked value="'+s+'" class="rc-icra" style="accent-color:#7ab5d4;width:15px;height:15px;flex-shrink:0;cursor:pointer"></label>').join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="r-icra-sayi" style="font-size:12px;color:var(--text3)">${icralar.length} dosya</span>
      <button class="btn btn-gold" style="flex:1;justify-content:center" onclick="raporIndir('icralar')">📥 CSV İndir</button>
    </div>
  </div>

  <!-- FİNANS RAPORU -->
  <div class="card" style="border-top:3px solid var(--green)">
    <div class="card-title" style="font-size:14px;margin-bottom:14px">💰 Finans Raporu</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div class="form-group" style="margin:0"><label>Tür (çoklu seçim)</label>
        <div id="r-finans-tur-wrap" style="background:var(--bg3);border:1px solid var(--border);border-radius:7px;padding:6px;max-height:180px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:0">
          ${[
            {g:'Gelirler', items:['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı']},
            {g:'Dosya Masrafları', items:['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç','Masraf Ödemesi']},
            {g:'Ofis Giderleri', items:['Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri']},
            {g:'Diğer', items:['Karşı Vekalet Ücreti','Taksit Planı']}
          ].map(grp => grp.items.map(t =>
            '<label style="display:flex;align-items:center;gap:6px;font-size:11px;cursor:pointer;color:var(--text2);padding:3px 6px;border-radius:4px" onmouseover="this.style.background=\'rgba(28,26,23,0.08)\'" onmouseout="this.style.background=\'transparent\'"><input type="checkbox" value="'+t+'" class="rft-cb" onchange="raporSayiGuncelle(\'finans\')" style="accent-color:var(--gold);width:13px;height:13px;flex-shrink:0;cursor:pointer">'+t+'</label>'
          ).join('')).join('')}
        </div>
        <div style="display:flex;gap:6px;margin-top:4px"><button onclick="document.querySelectorAll('.rft-cb').forEach(c=>c.checked=true);raporSayiGuncelle('finans')" style="font-size:10px;color:var(--gold);background:none;border:none;cursor:pointer;text-decoration:underline">Tümünü Seç</button><button onclick="document.querySelectorAll('.rft-cb').forEach(c=>c.checked=false);raporSayiGuncelle('finans')" style="font-size:10px;color:var(--text3);background:none;border:none;cursor:pointer;text-decoration:underline">Temizle</button></div>
      </div>
      <div class="form-group" style="margin:0"><label>Ödeme Durumu</label>
        <select id="r-finans-durum" onchange="raporSayiGuncelle('finans')"><option value="">Tümü</option><option value="odendi">✅ Ödendi / Tahsil Edildi</option><option value="bekliyor">⏳ Bekliyor / Ödenmedi</option></select>
      </div>
      <div class="form-group" style="margin:0"><label>Müvekkil</label>
        <select id="r-finans-muvekkil" onchange="raporSayiGuncelle('finans')"><option value="">Tümü</option>${mvOpts}</select>
      </div>
      <div class="form-group" style="margin:0"><label>Başlangıç</label><input id="r-finans-bas" type="date" min="1900-01-01" max="2100-12-31" onchange="raporSayiGuncelle('finans')"></div>
      <div class="form-group" style="margin:0"><label>Bitiş</label><input id="r-finans-bit" type="date" min="1900-01-01" max="2100-12-31" onchange="raporSayiGuncelle('finans')"></div>
    </div>
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Dahil Edilecek Sütunlar</span><button onclick="raporSutunToggle(this)" style="font-size:10px;color:var(--gold);background:none;border:none;cursor:pointer;text-decoration:underline">Tümünü Kaldır</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px;max-height:220px;overflow-y:auto">
        ${['Tarih','Tür','Müvekkil','İlgili Dosya','Tutar','Açıklama','Ödeme Durumu'].map(s=>
          '<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;cursor:pointer;color:var(--text2);padding:5px 8px;border-radius:6px;transition:background 0.1s" onmouseover="this.style.background=\'rgba(28,26,23,0.08)\'" onmouseout="this.style.background=\'transparent\'">'+s+'<input type="checkbox" checked value="'+s+'" class="rc-finans" style="accent-color:var(--green);width:15px;height:15px;flex-shrink:0;cursor:pointer"></label>').join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="r-finans-sayi" style="font-size:12px;color:var(--text3)">${finans.length} kayıt</span>
      <button class="btn btn-gold" style="flex:1;justify-content:center" onclick="raporIndir('finans')">📥 CSV İndir</button>
    </div>
  </div>

  <!-- MÜVEKKİL RAPORU -->
  <div class="card" style="border-top:3px solid #9c968d">
    <div class="card-title" style="font-size:14px;margin-bottom:14px">👤 Müvekkil Raporu</div>
    <div style="margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px"><span style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.05em">Dahil Edilecek Sütunlar</span><button onclick="raporSutunToggle(this)" style="font-size:10px;color:var(--gold);background:none;border:none;cursor:pointer;text-decoration:underline">Tümünü Kaldır</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px;max-height:220px;overflow-y:auto">
        ${['Ad','Tür','TC/VKN','Telefon','E-posta','Adres','Dava Sayısı','İcra Sayısı'].map(s=>
          '<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;cursor:pointer;color:var(--text2);padding:5px 8px;border-radius:6px;transition:background 0.1s" onmouseover="this.style.background=\'rgba(28,26,23,0.08)\'" onmouseout="this.style.background=\'transparent\'">'+s+'<input type="checkbox" checked value="'+s+'" class="rc-mv" style="accent-color:#9c968d;width:15px;height:15px;flex-shrink:0;cursor:pointer"></label>').join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <span id="r-mv-sayi" style="font-size:12px;color:var(--text3)">${muvekkiller.length} kişi</span>
      <button class="btn btn-gold" style="flex:1;justify-content:center" onclick="raporIndir('muvekkiller')">📥 CSV İndir</button>
    </div>
  </div>

  </div>`;

  // Sayıları güncelle
  raporSayiGuncelle('davalar');
  raporSayiGuncelle('icralar');
  raporSayiGuncelle('finans');
}

function raporSayiGuncelle(tur) {
  if (tur === 'davalar') {
    var durum = (document.getElementById('r-dava-durum')||{}).value||'';
    var mv = (document.getElementById('r-dava-muvekkil')||{}).value||'';
    var liste = DB.get('davalar')||[];
    if (durum) liste = liste.filter(function(d){return d.durum===durum;});
    if (mv) liste = liste.filter(function(d){return d.muvekkil===mv;});
    var el = document.getElementById('r-dava-sayi');
    if (el) el.textContent = liste.length + ' dosya';
  } else if (tur === 'icralar') {
    var durum = (document.getElementById('r-icra-durum')||{}).value||'';
    var mv = (document.getElementById('r-icra-muvekkil')||{}).value||'';
    var liste = DB.get('icralar')||[];
    if (durum) liste = liste.filter(function(i){return i.durum===durum;});
    if (mv) liste = liste.filter(function(i){return i.muvekkil===mv;});
    var el = document.getElementById('r-icra-sayi');
    if (el) el.textContent = liste.length + ' dosya';
  } else if (tur === 'finans') {
    var seciliTurler = []; document.querySelectorAll('.rft-cb:checked').forEach(function(cb){seciliTurler.push(cb.value);});
    var mv = (document.getElementById('r-finans-muvekkil')||{}).value||'';
    var bas = (document.getElementById('r-finans-bas')||{}).value||'';
    var bit = (document.getElementById('r-finans-bit')||{}).value||'';
    var durumVal = (document.getElementById('r-finans-durum')||{}).value||'';
    var liste = DB.get('finans')||[];
    if (seciliTurler.length) liste = liste.filter(function(f){return seciliTurler.includes(f.tur);});
    if (mv) liste = liste.filter(function(f){return f.muvekkil===mv;});
    if (bas) liste = liste.filter(function(f){return f.tarih>=bas;});
    if (bit) liste = liste.filter(function(f){return f.tarih<=bit;});
    if (durumVal === 'odendi') liste = liste.filter(function(f){return f.taksitDurumu==='odendi'||f.karsiVekaletDurum==='tamam'||(!f.taksitDurumu&&!f.karsiVekaletDurum);});
    if (durumVal === 'bekliyor') liste = liste.filter(function(f){return f.taksitDurumu==='bekliyor'||f.karsiVekaletDurum==='bekliyor'||f.karsiVekaletDurum==='kismen';});
    var el = document.getElementById('r-finans-sayi');
    if (el) el.textContent = liste.length + ' kayit';
  }
}

function raporSutunToggle(btn) {
  var container = btn.closest('div[style*="margin-bottom"]');
  if (!container) return;
  var checkboxes = container.querySelectorAll('input[type="checkbox"]');
  var allChecked = Array.from(checkboxes).every(function(cb){return cb.checked;});
  checkboxes.forEach(function(cb){cb.checked = !allChecked;});
  btn.textContent = allChecked ? 'Tümünü Seç' : 'Tümünü Kaldır';
}

function raporIndir(tur) {
  var rows = [];
  var filename = 'rapor';
  var sep = ';';
  function csvVal(v) {
    if (v === null || v === undefined) return '';
    var s = String(v).replace(/"/g, '""');
    return '"' + s + '"';
  }
  function getChecked(cls) {
    var checked = [];
    document.querySelectorAll('.'+cls+':checked').forEach(function(cb){checked.push(cb.value);});
    return checked;
  }

  if (tur === 'davalar') {
    var durum = (document.getElementById('r-dava-durum')||{}).value||'';
    var mv = (document.getElementById('r-dava-muvekkil')||{}).value||'';
    var liste = DB.get('davalar')||[];
    if (durum) liste = liste.filter(function(d){return d.durum===durum;});
    if (mv) liste = liste.filter(function(d){return d.muvekkil===mv;});
    var cols = getChecked('rc-dava');
    if (!cols.length) { notify('En az bir sütun seçin'); return; }
    var colMap = {
      'Dosya No':function(d){return d.no;}, 'Müvekkil':function(d){return d.muvekkil;},
      'Karşı Taraf':function(d){return d.karsi;}, 'Mahkeme':function(d){return d.mahkeme;},
      'Esas No':function(d){return d.esas;}, 'Durum':function(d){return d.durum;},
      'Tür':function(d){return d.tur;}, 'Çeşit':function(d){return d.cesit;},
      'Hâkim':function(d){return d.hakim;}, 'Karşı Avukat':function(d){return d.karsiAvukat;},
      'Sonraki Duruşma':function(d){return d.sonraki;}, 'Son Duruşma':function(d){return d.durusma;},
      'Akdi Ücret':function(d){return d.akdiUcret;}, 'Notlar':function(d){return d.notlar;}
    };
    rows.push(cols.map(csvVal).join(sep));
    liste.forEach(function(d){
      rows.push(cols.map(function(c){return csvVal(colMap[c]?colMap[c](d):'');}).join(sep));
    });
    filename = 'dava_raporu';

  } else if (tur === 'icralar') {
    var durum = (document.getElementById('r-icra-durum')||{}).value||'';
    var mv = (document.getElementById('r-icra-muvekkil')||{}).value||'';
    var liste = DB.get('icralar')||[];
    if (durum) liste = liste.filter(function(i){return i.durum===durum;});
    if (mv) liste = liste.filter(function(i){return i.muvekkil===mv;});
    var cols = getChecked('rc-icra');
    if (!cols.length) { notify('En az bir sütun seçin'); return; }
    var colMap = {
      'Dosya No':function(i){return i.no;}, 'BKİ':function(i){return i.bki;},
      'Alacaklı':function(i){return i.muvekkil;}, 'Borçlu':function(i){return i.borclu;},
      'Müdürlük':function(i){return i.mudurluk;}, 'Esas No':function(i){return i.esas;},
      'Alacak':function(i){return i.alacak;}, 'Durum':function(i){return i.durum;},
      'Tür':function(i){return i.tur;}, 'Borçlu Avukat':function(i){return i.borcluAvukat;},
      'Notlar':function(i){return i.notlar;}
    };
    rows.push(cols.map(csvVal).join(sep));
    liste.forEach(function(i){
      rows.push(cols.map(function(c){return csvVal(colMap[c]?colMap[c](i):'');}).join(sep));
    });
    filename = 'icra_raporu';

  } else if (tur === 'finans') {
    var seciliTurler = []; document.querySelectorAll('.rft-cb:checked').forEach(function(cb){seciliTurler.push(cb.value);});
    var mv = (document.getElementById('r-finans-muvekkil')||{}).value||'';
    var bas = (document.getElementById('r-finans-bas')||{}).value||'';
    var bit = (document.getElementById('r-finans-bit')||{}).value||'';
    var durumVal = (document.getElementById('r-finans-durum')||{}).value||'';
    var liste = DB.get('finans')||[];
    if (seciliTurler.length) liste = liste.filter(function(f){return seciliTurler.includes(f.tur);});
    if (mv) liste = liste.filter(function(f){return f.muvekkil===mv;});
    if (bas) liste = liste.filter(function(f){return f.tarih>=bas;});
    if (bit) liste = liste.filter(function(f){return f.tarih<=bit;});
    if (durumVal === 'odendi') liste = liste.filter(function(f){return f.taksitDurumu==='odendi'||f.karsiVekaletDurum==='tamam'||(!f.taksitDurumu&&!f.karsiVekaletDurum);});
    if (durumVal === 'bekliyor') liste = liste.filter(function(f){return f.taksitDurumu==='bekliyor'||f.karsiVekaletDurum==='bekliyor'||f.karsiVekaletDurum==='kismen';});
    liste.sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);});
    var cols = getChecked('rc-finans');
    if (!cols.length) { notify('En az bir sütun seçin'); return; }
    // DD/MM/YYYY tarih formatı
    function fmtTarihCSV(t) { if(!t) return ''; var p=t.split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : t; }
    var colMap = {
      'Tarih':function(f){return fmtTarihCSV(f.tarih);}, 'Tür':function(f){return f.tur;},
      'Müvekkil':function(f){return f.muvekkil;}, 'İlgili Dosya':function(f){return f.ilgili;},
      'Tutar':function(f){return f.tutar;}, 'Açıklama':function(f){return f.aciklama;},
      'Ödeme Durumu':function(f){
        if(f.taksitDurumu==='odendi') return 'Ödendi';
        if(f.taksitDurumu==='bekliyor') return 'Bekliyor';
        if(f.karsiVekaletDurum==='tamam') return 'Tahsil Edildi';
        if(f.karsiVekaletDurum==='bekliyor'||f.karsiVekaletDurum==='kismen') return 'Bekliyor';
        return '';
      }
    };
    rows.push(cols.map(csvVal).join(sep));
    liste.forEach(function(f){
      rows.push(cols.map(function(c){return csvVal(colMap[c]?colMap[c](f):'');}).join(sep));
    });
    filename = 'finans_raporu';

  } else if (tur === 'muvekkiller') {
    var liste = DB.get('muvekkiller')||[];
    var davalar = DB.get('davalar')||[];
    var icralar = DB.get('icralar')||[];
    var cols = getChecked('rc-mv');
    if (!cols.length) { notify('En az bir sütun seçin'); return; }
    var colMap = {
      'Ad':function(m){return m.ad;}, 'Tür':function(m){return m.tur;},
      'TC/VKN':function(m){return m.tc;}, 'Telefon':function(m){return m.tel;},
      'E-posta':function(m){return m.email;}, 'Adres':function(m){return m.adres;},
      'Dava Sayısı':function(m){return davalar.filter(function(d){return d.muvekkil===m.ad;}).length;},
      'İcra Sayısı':function(m){return icralar.filter(function(i){return i.muvekkil===m.ad;}).length;}
    };
    rows.push(cols.map(csvVal).join(sep));
    liste.forEach(function(m){
      rows.push(cols.map(function(c){return csvVal(colMap[c]?colMap[c](m):'');}).join(sep));
    });
    filename = 'muvekkil_raporu';
  }
  if (rows.length <= 1) { notify('İndirilecek veri bulunamadı'); return; }
  var bom = '\uFEFF';
  var csv = bom + rows.join('\n');
  var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename + '_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  notify('Rapor indirildi ✓');
}


// ========== TEBLİGAT (eski fonksiyonlar temizlendi) ==========
function sorgulaTebligat() {
  // Barkod yalnız harf/rakam içerir — HTML ve onclick içine gömüldüğü için
  // diğer karakterler temizlenir (XSS koruması)
  const kod = document.getElementById('tebligat-kod').value.trim().replace(/[^a-zA-Z0-9]/g, '');
  if (!kod) {
    document.getElementById('tebligat-kod').style.borderColor = 'var(--red)';
    return;
  }

  // Geçmişe kaydet
  const gecmis = JSON.parse(localStorage.getItem('hukuk_tebligat_gecmis') || '[]');
  const kayit = { kod, tarih: new Date().toISOString() };
  const yeni = [kayit, ...gecmis.filter(g => g.kod !== kod)].slice(0, 20);
  localStorage.setItem('hukuk_tebligat_gecmis', JSON.stringify(yeni));

  // Kodu panoya kopyala
  navigator.clipboard?.writeText(kod).catch(() => {});

  // Sonuç kutusunu göster
  const res = document.getElementById('tebligat-result');
  res.style.display = '';
  res.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--gold);border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:12px">
      <div style="font-size:22px">📋</div>
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text2);margin-bottom:4px">
          <span style="font-family:'DM Mono',monospace;color:var(--gold);font-size:14px;font-weight:600">${kod}</span> kopyalandı
        </div>
        <div style="font-size:12px;color:var(--text3)">PTT sayfası açılıyor — kodu arama kutusuna yapıştırın</div>
      </div>
      <button class="btn btn-gold" style="font-size:12px;padding:7px 14px;white-space:nowrap" onclick="window.open('https://www.ptt.gov.tr/#/','_blank')">
        PTT'yi Aç →
      </button>
    </div>`;

  // PTT sayfasını aç
  window.open('https://www.ptt.gov.tr/#/', '_blank');

  renderTebligatGecmis();
}

function renderTebligatGecmis() {
  const el = document.getElementById('tebligat-gecmis');
  if (!el) return;
  const gecmis = JSON.parse(localStorage.getItem('hukuk_tebligat_gecmis') || '[]');
  if (!gecmis.length) {
    el.innerHTML = '<div style="color:var(--text3);font-size:12px">Henüz sorgu yapılmadı</div>';
    return;
  }
  el.innerHTML = gecmis.map(g => {
    // Eski kayıtlarda temizlenmemiş kod olabilir — render öncesi süz
    const kodTemiz = String(g.kod || '').replace(/[^a-zA-Z0-9]/g, '');
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text);flex:1">${kodTemiz}</span>
      <span style="font-size:11px;color:var(--text3)">${fmtDate(g.tarih)}</span>
      <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="tekrarSorgula('${kodTemiz}')">Tekrar Sorgula</button>
      <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="navigator.clipboard?.writeText('${kodTemiz}');notify('Kopyalandı ✓')">📋</button>
    </div>`;
  }).join('');
}

function tekrarSorgula(kod) {
  document.getElementById('tebligat-kod').value = kod;
  sorgulaTebligat();
}

// ========== PTT TEBLİGAT TAKİP MODÜLü ==========
(function() {
  'use strict';

  var PTT_GECMIS_KEY = 'hukuk_ptt_takip_gecmis';
  var PTT_GECMIS_MAX = 25;

  // --- Yardımcı: durum sınıfı ---
  function pttDurumClass(durum) {
    if (!durum) return 'ptt-status-diger';
    var d = durum.toLowerCase();
    if (d.includes('teslim') || d.includes('delivered')) return 'ptt-status-teslim';
    if (d.includes('iade') || d.includes('returned')) return 'ptt-status-iade';
    if (d.includes('yolda') || d.includes('transfer') || d.includes('kabul') || d.includes('çıktı') || d.includes('dağıtım')) return 'ptt-status-yolda';
    if (d.includes('bekli') || d.includes('wait')) return 'ptt-status-bekliyor';
    return 'ptt-status-diger';
  }

  function pttDurumIcon(durum) {
    if (!durum) return '📦';
    var d = durum.toLowerCase();
    if (d.includes('teslim') || d.includes('delivered')) return '✅';
    if (d.includes('iade') || d.includes('returned')) return '↩️';
    if (d.includes('dağıtım')) return '🛵';
    if (d.includes('transfer') || d.includes('yolda')) return '🚚';
    if (d.includes('kabul')) return '📥';
    if (d.includes('çıktı') || d.includes('merkez')) return '🏭';
    return '📦';
  }

  function pttTlClass(hareket, idx) {
    if (idx === 0) return 'first';
    var d = (hareket.durum || hareket.aciklama || '').toLowerCase();
    if (d.includes('teslim')) return 'teslim';
    if (d.includes('iade')) return 'iade';
    return '';
  }

  // --- Input formatlayıcı ---
  window.pttInputFormat = function(el) {
    el.classList.remove('error');
    // Sadece rakam ve harflere izin ver, boşlukları temizle
    el.value = el.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  };

  // --- Geçmiş ---
  function pttGecmisYukle() {
    try { return JSON.parse(localStorage.getItem(PTT_GECMIS_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function pttGecmisKaydet(no) {
    var list = pttGecmisYukle();
    list = [{ no: no, tarih: new Date().toISOString() }].concat(list.filter(function(g){ return g.no !== no; })).slice(0, PTT_GECMIS_MAX);
    localStorage.setItem(PTT_GECMIS_KEY, JSON.stringify(list));
  }

  window.pttGecmisSil = function() {
    localStorage.removeItem(PTT_GECMIS_KEY);
    pttGecmisRender();
  };

  function pttGecmisRender() {
    var list = pttGecmisYukle();
    var card = document.getElementById('ptt-history-card');
    var el = document.getElementById('ptt-history-list');
    if (!card || !el) return;
    if (!list.length) { card.style.display = 'none'; return; }
    card.style.display = '';
    el.innerHTML = list.map(function(g) {
      return '<div class="ptt-history-item" onclick="pttSorgulaNo(\'' + g.no + '\')">' +
        '<span style="font-size:14px">📬</span>' +
        '<span class="ptt-history-no">' + g.no + '</span>' +
        '<span class="ptt-history-date">' + pttFmtDate(g.tarih) + '</span>' +
        '<div class="ptt-history-actions">' +
          '<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="event.stopPropagation();pttSorgulaNo(\'' + g.no + '\')">🔍 Sorgula</button>' +
          '<button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" onclick="event.stopPropagation();pttKopyala(\'' + g.no + '\')">📋</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function pttFmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    } catch(e) { return iso || ''; }
  }

  window.pttKopyala = function(no) {
    if (navigator.clipboard) navigator.clipboard.writeText(no).catch(function(){});
    if (typeof notify === 'function') notify('Kopyalandı ✓');
  };

  // --- Ana sorgula fonksiyonu ---
  window.pttSorgula = function() {
    var inp = document.getElementById('ptt-takip-no');
    if (!inp) return;
    var no = inp.value.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!no) {
      inp.classList.add('error');
      inp.focus();
      return;
    }
    pttSorgulaNo(no);
  };

  window.pttSorgulaNo = function(no) {
    var inp = document.getElementById('ptt-takip-no');
    if (inp) inp.value = no;

    pttGecmisKaydet(no);
    pttGecmisRender();

    var wrap = document.getElementById('ptt-result-wrap');
    if (!wrap) return;
    wrap.style.display = '';

    // Yükleniyor göster
    wrap.innerHTML = '<div class="ptt-loading"><div class="ptt-spinner"></div><span>PTT sorgulanıyor...</span></div>';

    // Btn disable
    var btn = document.getElementById('ptt-btn');
    if (btn) btn.disabled = true;

    // Önce API'yi dene, hata alırsa fallback
    pttApiSorgula(no, function(err, data) {
      if (btn) btn.disabled = false;
      if (!err && data) {
        pttRenderSonuc(no, data, wrap);
      } else {
        // Fallback: PTT iframe + yeni sekme
        pttFallback(no, wrap);
      }
    });
  };

  // --- PTT API sorgusu (CORS proxy üzerinden deneme) ---
  function pttApiSorgula(no, cb) {
    // Supabase proxy → api.ptt.gov.tr/api/ShipmentTracking POST
    var proxyUrl = 'https://cbxgdnwunvjndiwwzcfn.supabase.co/functions/v1/quick-endpoint?barkod=' + no;
    var timeout = setTimeout(function() { cb(new Error('Zaman aşımı'), null); }, 10000);
    fetch(proxyUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, mode: 'cors' })
      .then(function(resp) {
        clearTimeout(timeout);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function(json) {
        if (json && json.error) throw new Error(json.error);
        var normalized = pttNormalizeJson(json, no);
        if (normalized) { cb(null, normalized); }
        else { cb(new Error('Veri parse edilemedi'), null); }
      })
      .catch(function(err) { clearTimeout(timeout); cb(err, null); });
  }

  // Supabase proxy yanıtını iç formata çevir
  function pttNormalizeJson(json, no) {
    if (!json || !json.hareketler) return null;
    return {
      barkod: json.barkod || no,
      durum: json.durum || '—',
      sonGuncelleme: json.sonGuncelleme || '',
      gonderici: json.gonderici || '—',
      gonderici_adres: json.gonderici_adres || '',
      alici: json.alici || '—',
      gonderiTipi: json.gonderi_tipi || '—',
      kabulMerkezi: json.kabul_yeri || '—',
      kabul_tarihi: json.kabul_tarihi || '',
      teslimTarihi: json.teslim_tarihi || null,
      teslim_saati: json.teslim_saati || null,
      teslim_yeri: json.teslim_yeri || null,
      teslim_alan: json.teslim_alan || null,
      hareketler: json.hareketler.map(function(h) {
        return {
          tarih: h.tarih || '',
          saat: h.saat || '',
          durum: h.aciklama || '',
          lokasyon: [h.isyeri, h.il, h.ilce].filter(Boolean).join(' · '),
          icon_id: h.icon_id
        };
      })
    };
  }

  // --- Sonuç render ---
  function pttRenderSonuc(no, data, wrap) {
    var sonDurum = data.durum || '—';
    var durumClass = pttDurumClass(sonDurum);
    var durumIcon  = pttDurumIcon(sonDurum);

    var hareketlerHtml = '';
    if (data.hareketler && data.hareketler.length) {
      var siralanmis = data.hareketler.slice().reverse();
      hareketlerHtml = '<div class="ptt-timeline-header">\u{1F4CD} Hareket Ge\u{00E7}mi\u{015F}i (' + data.hareketler.length + ' kay\u{0131}t)</div><div class="ptt-timeline">' +
        siralanmis.map(function(h, i) {
          var isLast   = i === siralanmis.length - 1;
          var isTeslim = (h.durum||'').indexOf('TESL') !== -1;
          var isIade   = (h.durum||'').indexOf('ADE') !== -1;
          var tlClass  = isLast ? 'first' : isTeslim ? 'teslim' : isIade ? 'iade' : '';
          var icon     = pttDurumIcon(h.durum);
          // Harici API'den gelen tüm alanlar escape edilir (XSS koruması)
          return '<div class="ptt-tl-item">' +
            '<div class="ptt-tl-dot ' + tlClass + '">' + icon + '</div>' +
            '<div class="ptt-tl-body">' +
              '<div class="ptt-tl-desc" style="' + (isTeslim ? 'color:#7dc495;font-weight:600' : isLast ? 'color:var(--gold)' : '') + '">' + escHtml(h.durum || '—') + '</div>' +
              '<div class="ptt-tl-meta">' +
                (h.tarih ? '<span>\u{1F4C5} ' + escHtml(h.tarih + (h.saat ? ' ' + h.saat : '')) + '</span>' : '') +
                (h.lokasyon ? '<span>\u{1F4CD} ' + escHtml(h.lokasyon) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('') + '</div>';
    }

    var teslimBox = '';
    if (data.teslimTarihi || data.teslim_yeri || data.teslim_alan) {
      teslimBox =
        '<div style="margin:0 22px 16px;padding:12px 16px;background:rgba(74,140,92,0.12);border:1px solid rgba(74,140,92,0.3);border-radius:10px;display:flex;align-items:center;gap:12px">' +
          '<span style="font-size:24px">\u2705</span>' +
          '<div>' +
            '<div style="font-size:13px;font-weight:700;color:#7dc495;margin-bottom:4px">Teslim Edildi</div>' +
            (data.teslimTarihi ? '<div style="font-size:12px;color:var(--text2)">\u{1F4C5} ' + escHtml(data.teslimTarihi + (data.teslim_saati ? ' ' + data.teslim_saati : '')) + '</div>' : '') +
            (data.teslim_yeri  ? '<div style="font-size:12px;color:var(--text2)">\u{1F4CD} ' + escHtml(data.teslim_yeri) + '</div>' : '') +
            (data.teslim_alan  ? '<div style="font-size:12px;color:var(--text2)">\u{1F464} ' + escHtml(data.teslim_alan) + '</div>' : '') +
          '</div>' +
        '</div>';
    }

    wrap.innerHTML =
      '<div class="ptt-result-card">' +
        '<div class="ptt-result-header">' +
          '<div class="ptt-result-no">' + no + '</div>' +
          '<span class="ptt-status-badge ' + durumClass + '">' + durumIcon + ' ' + escHtml(sonDurum) + '</span>' +
          (data.sonGuncelleme ? '<span style="font-size:11px;color:var(--text3);margin-left:6px">\u00B7 ' + escHtml(data.sonGuncelleme) + '</span>' : '') +
          '<button class="btn btn-ghost" style="font-size:12px;padding:5px 10px;margin-left:auto" onclick="pttKopyala(\'' + no + '\')">\u{1F4CB} Kopyala</button>' +
        '</div>' +
        '<div class="ptt-info-grid">' +
          '<div class="ptt-info-item"><div class="ptt-info-label">G\u00F6nderici</div><div class="ptt-info-value">' + escHtml(data.gonderici||'—') + '</div></div>' +
          '<div class="ptt-info-item"><div class="ptt-info-label">Al\u0131c\u0131</div><div class="ptt-info-value">' + escHtml(data.alici||'—') + '</div></div>' +
          '<div class="ptt-info-item"><div class="ptt-info-label">Kabul Merkezi</div><div class="ptt-info-value">' + escHtml(data.kabulMerkezi||'—') + '</div></div>' +
          '<div class="ptt-info-item"><div class="ptt-info-label">Kabul Tarihi</div><div class="ptt-info-value">' + escHtml(data.kabul_tarihi||'—') + '</div></div>' +
        '</div>' +
        teslimBox +
        hareketlerHtml +
      '</div>';
  }
  // --- Fallback: iframe + yeni sekme ---
  function pttFallback(no, wrap) {
    // Kodu panoya kopyala
    if (navigator.clipboard) navigator.clipboard.writeText(no).catch(function(){});

    // PTT'nin iframe'e izin vermediği durum için iki seçenek sun
    wrap.innerHTML =
      '<div class="ptt-fallback">' +
        '<div class="ptt-fallback-header">' +
          '<span style="font-size:16px">ℹ️</span>' +
          '<div style="flex:1">' +
            '<div style="font-size:13px;color:var(--text);font-weight:600">PTT API doğrudan erişilemiyor — CORS kısıtlaması</div>' +
            '<div style="font-size:12px;color:var(--text3);margin-top:2px">Takip numarası <strong style="font-family:\'DM Mono\',monospace;color:var(--gold)">' + no + '</strong> panoya kopyalandı</div>' +
          '</div>' +
          '<button class="btn btn-gold" style="font-size:12px;padding:7px 14px;white-space:nowrap" onclick="window.open(\'https://www.ptt.gov.tr/#/\',\'_blank\')">' +
            '🌐 PTT\'yi Aç →' +
          '</button>' +
        '</div>' +
        '<div style="padding:16px 18px">' +
          '<div style="font-size:12px;color:var(--text3);margin-bottom:12px">PTT sitesi güvenlik nedeniyle iframe içinde açılmıyor. Aşağıdaki adımları izleyin:</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px">' +
              '<div style="width:24px;height:24px;border-radius:50%;background:var(--gold-dim);border:1px solid rgba(28,26,23,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold);flex-shrink:0">1</div>' +
              '<div style="font-size:13px;color:var(--text2)">Yukarıdaki <strong style="color:var(--gold)">PTT\'yi Aç</strong> butonuna tıklayın</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px">' +
              '<div style="width:24px;height:24px;border-radius:50%;background:var(--gold-dim);border:1px solid rgba(28,26,23,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold);flex-shrink:0">2</div>' +
              '<div style="font-size:13px;color:var(--text2)">PTT sayfasında <strong>Ctrl+V</strong> ile takip numarasını yapıştırın</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px">' +
              '<div style="width:24px;height:24px;border-radius:50%;background:var(--gold-dim);border:1px solid rgba(28,26,23,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gold);flex-shrink:0">3</div>' +
              '<div style="font-size:13px;color:var(--text2)">Sorgula butonuna basın, sonuçları görüntüleyin</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:14px;padding:10px 14px;background:rgba(28,26,23,0.08);border:1px solid rgba(28,26,23,0.2);border-radius:8px;display:flex;align-items:center;gap:10px">' +
            '<span style="font-size:18px">📋</span>' +
            '<div>' +
              '<div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:2px">Panoya kopyalanan numara</div>' +
              '<div style="font-family:\'DM Mono\',monospace;font-size:16px;font-weight:700;color:var(--gold);letter-spacing:0.08em">' + no + '</div>' +
            '</div>' +
            '<button class="btn btn-outline" style="margin-left:auto;font-size:12px;padding:5px 12px" onclick="pttKopyala(\'' + no + '\')">' +
              '📋 Tekrar Kopyala' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    // PTT'yi otomatik aç
    window.open('https://www.ptt.gov.tr/#/', '_blank');
  }

  // Sayfa başında geçmişi render et
  document.addEventListener('DOMContentLoaded', function() {
  initMobileTopbar();
    pttGecmisRender();
  });

  // Global erişim için export
  window.pttGecmisRender = pttGecmisRender;

})();

// ========== KULLANICI SİSTEMİ ==========
window.currentUser = null;

// Kimlik doğrulama tamamen Supabase Auth üzerinden yürür (doLogin /
// _oturumGeriYukle). Eski localStorage tabanlı kullanıcı sistemi (zayıf hash,
// yerel kullanıcı listesi, sahte oturum imzası) kaldırıldı — hiçbir gerçek
// koruma sağlamıyordu ve Supabase girişiyle çelişiyordu.
const AUTH = {
  SESSION_KEY: 'hukuk_session_v2',
  logout: () => {
    sessionStorage.removeItem(AUTH.SESSION_KEY);
    sessionStorage.removeItem('sb_session');
    // Supabase oturumunu da kapat — kapatılmazsa sayfa yenilenince
    // _oturumGeriYukle otomatik olarak tekrar giriş yapar
    try { _supabaseClient.auth.signOut().finally(() => location.reload()); }
    catch(e) { location.reload(); }
  }
};



function updateSidebarUser(user) {
  if (!user) return;
  const av = document.getElementById('sidebar-user-avatar');
  const nm = document.getElementById('sidebar-user-name');
  const rl = document.getElementById('sidebar-user-role');
  if (av) av.textContent = (user.adSoyad || user.username).slice(0,2).toUpperCase();
  if (nm) nm.textContent = user.adSoyad || user.username;
  if (rl) rl.textContent = user.rol === 'admin' ? '👑 Admin' : '👤 Kullanıcı';
  const navKul = document.getElementById('nav-kullanicilar');
  if (navKul) navKul.style.display = user.rol === 'admin' ? '' : 'none';
}

// ========== KULLANICI YÖNETİMİ ==========
// Kullanıcılar Supabase Auth panelinden yönetilir; bu sayfa yalnız aktif
// oturum bilgisini ve şifre değiştirme formunu gösterir. (Eski yerel
// kullanıcı tablosu/CRUD'u kaldırıldı — DOM'da karşılığı yoktu ve
// renderKullanicilar her açılışta hata fırlatıyordu.)
function renderKullanicilar() {
  renderSbSessionInfo();
}

function doLogout() {
  showConfirmModal('Çıkış yapmak istediğinizden emin misiniz?', function(){ AUTH.logout(); }, {okLabel:'Evet, Çık', okBg:'rgba(58,107,140,0.85)', okBorder:'rgba(58,107,140,0.4)', icon:'🚪', iconBg:'rgba(58,107,140,0.15)', iconBorder:'rgba(58,107,140,0.3)'});
}


// ── Supabase şifre değiştir ──────────────────────────────────────────
async function sbSifreDegistir() {
  const pw1 = document.getElementById('sb-pw-new')?.value || '';
  const pw2 = document.getElementById('sb-pw-confirm')?.value || '';
  const errEl = document.getElementById('sb-pw-error');
  if (!pw1 || pw1.length < 6) { if(errEl) errEl.textContent = 'Şifre en az 6 karakter olmalı'; return; }
  if (pw1 !== pw2) { if(errEl) errEl.textContent = 'Şifreler eşleşmiyor'; return; }
  if (!window._supabaseToken) { if(errEl) errEl.textContent = 'Oturum bulunamadı, lütfen yeniden giriş yapın'; return; }

  try {
    const res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + window._supabaseToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: pw1 })
    });
    if (res.ok) {
      if(errEl) errEl.style.color = 'var(--green)';
      if(errEl) errEl.textContent = '✓ Şifre başarıyla güncellendi';
      document.getElementById('sb-pw-new').value = '';
      document.getElementById('sb-pw-confirm').value = '';
      setTimeout(() => { if(errEl) { errEl.textContent=''; errEl.style.color='var(--red)'; }}, 3000);
    } else {
      const d = await res.json();
      if(errEl) errEl.textContent = '❌ ' + (d.message || d.error_description || 'Hata oluştu');
    }
  } catch(e) {
    if(errEl) errEl.textContent = '❌ Bağlantı hatası: ' + e.message;
  }
}

// ── Kullanıcı sayfası oturum bilgisini göster ─────────────────────────
function renderSbSessionInfo() {
  const el = document.getElementById('sb-session-info');
  if (!el) return;
  const s = sessionStorage.getItem('sb_session');
  if (!s) { el.textContent = 'Oturum bulunamadı'; return; }
  try {
    const d = JSON.parse(s);
    const exp = d.expires_at ? new Date(d.expires_at * 1000).toLocaleString('tr-TR') : '—';
    el.innerHTML = '<div style="display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:13px">'
      + '<span style="color:var(--text3)">E-posta:</span><span style="color:var(--text)">'+escHtml(d.email||'—')+'</span>'
      + '<span style="color:var(--text3)">Oturum:</span><span style="color:var(--green)">Aktif ✓</span>'
      + '<span style="color:var(--text3)">Bitiş:</span><span style="color:var(--text3)">'+exp+'</span>'
      + '</div>';
  } catch { el.textContent = 'Oturum bilgisi okunamadı'; }
}



// ========== BACKUP / RESTORE ==========
// Veriler artık Supabase'de tutulduğundan yedek, localStorage'dan DEĞİL
// bellek içi cache'ten (DB.get) toplanır. Cihaz-yerel icra haciz verileri
// (localStorage 'icra_haciz_*') de yedeğe dahil edilir.
// NOT: Dosya günlüğü (chatter) mesajları tembel yüklendiği için yedeğe girmez.
const _YEDEK_SB_KEYS = ['muvekkiller','davalar','icralar','kisiler','contacts','finans','odeme_planlari','tasks','belgeler','icra_belgeler','icra_masraflar','dava_masraflar','notlar','cari','uets_kayitlar'];

function _yedekVerisiTopla() {
  const backup = { version: 2, tarih: new Date().toISOString(), data: {} };
  _YEDEK_SB_KEYS.forEach(k => { backup.data[k] = DB.get(k) || []; });
  backup.data._icraHaciz = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.indexOf('icra_haciz_') === 0) {
      try { backup.data._icraHaciz[k] = JSON.parse(localStorage.getItem(k)); } catch(e) {}
    }
  }
  return backup;
}

// Yedeği Supabase'e geri yükle (upsert — mevcut kayıtları günceller, olmayanları ekler).
// UUID olmayan id'li kayıtlar (eski demo verisi vb.) atlanır.
const _YEDEK_TO_ROW = {
  muvekkiller: _sbMuvekkilToRow, davalar: _sbDavaToRow, icralar: _sbIcraToRow,
  kisiler: _sbKisiToRow, contacts: _sbContactToRow,
  finans: _sbFinansToRow, odeme_planlari: _sbOdemePlaniToRow, tasks: _sbTaskToRow,
  belgeler: _sbBelgeToRow, icra_belgeler: _sbIcraBelgeToRow, icra_masraflar: _sbIcraMasrafToRow, dava_masraflar: _sbDavaMasrafToRow,
  notlar: _sbNotToRow, cari: _sbCariToRow, uets_kayitlar: _sbUetsToRow
};
async function _yedekGeriYukle(backup) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const data = backup.data || {};
  let toplam = 0;
  const hatali = [];
  // _YEDEK_TO_ROW anahtar sırası önemli: önce ana kayıtlar (müvekkil/dava/icra),
  // sonra onlara bağlı kayıtlar — olası FK kısıtlarında sorun çıkmasın.
  for (const k of Object.keys(_YEDEK_TO_ROW)) {
    const arr = data[k];
    if (!Array.isArray(arr) || !arr.length) continue;
    const toRow = _YEDEK_TO_ROW[k];
    const rows = arr.filter(x => x && UUID_RE.test(x.id)).map(toRow);
    for (let i = 0; i < rows.length; i += 200) {
      const parca = rows.slice(i, i + 200);
      const { error } = await _supabaseClient.from(k).upsert(parca);
      if (error) { console.error('[yedek] ' + k + ' yüklenemedi:', error); hatali.push(k); break; }
      toplam += parca.length;
    }
  }
  // Cihaz-yerel icra haciz verileri
  if (data._icraHaciz && typeof data._icraHaciz === 'object') {
    Object.keys(data._icraHaciz).forEach(k => {
      if (k.indexOf('icra_haciz_') !== 0) return;
      try { localStorage.setItem(k, JSON.stringify(data._icraHaciz[k])); toplam++; } catch(e) {}
    });
  }
  return { toplam, hatali };
}

function exportData() {
  if (!window._currentUserId) return notify('⚠️ Yedek almak için önce giriş yapın');
  const backup = _yedekVerisiTopla();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date();
  a.href = url;
  a.download = `hukuk-yedek-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  notify('✅ Yedek dosyası indiriliyor...');
}

// ══ ŞİFRELİ YEDEKLEME (AES-GCM, Web Crypto API) ══
async function _deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt','decrypt']);
}

async function exportDataEncrypted() {
  if (!window._currentUserId) return notify('⚠️ Yedek almak için önce giriş yapın');
  const pw = prompt('Yedek şifresi belirleyin (en az 6 karakter):');
  if (!pw || pw.length < 6) return notify('⚠️ Şifre en az 6 karakter olmalıdır!');
  const pw2 = prompt('Şifreyi tekrar girin:');
  if (pw !== pw2) return notify('⚠️ Şifreler eşleşmiyor!');
  try {
    const backup = _yedekVerisiTopla();
    const plainText = JSON.stringify(backup);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await _deriveKey(pw, salt);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plainText));
    const payload = { encrypted: true, version: 1, salt: btoa(String.fromCharCode(...salt)), iv: btoa(String.fromCharCode(...iv)), data: btoa(String.fromCharCode(...new Uint8Array(encrypted))) };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url;
    a.download = `hukuk-yedek-sifreli-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('🔐 Şifreli yedek dosyası indiriliyor...');
  } catch(e) { notify('❌ Şifreleme hatası: ' + e.message); }
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const statusEl = document.getElementById('import-status');
  const durum = (msg, hata) => { if (statusEl) { statusEl.style.color = hata ? '#e08060' : ''; statusEl.textContent = msg; } };
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      let backup = JSON.parse(e.target.result);
      // Şifreli yedek ise önce çöz
      if (backup.encrypted) {
        const pw = prompt('Bu yedek şifrelidir. Şifresini girin:');
        if (!pw) { durum('⚠️ Şifre girilmedi, işlem iptal edildi.'); return; }
        try {
          const salt = new Uint8Array(atob(backup.salt).split('').map(c=>c.charCodeAt(0)));
          const iv = new Uint8Array(atob(backup.iv).split('').map(c=>c.charCodeAt(0)));
          const encData = new Uint8Array(atob(backup.data).split('').map(c=>c.charCodeAt(0)));
          const key = await _deriveKey(pw, salt);
          const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encData);
          backup = JSON.parse(new TextDecoder().decode(decrypted));
        } catch(decErr) {
          durum('❌ Şifre çözme hatası: Şifre yanlış veya dosya bozuk.', true);
          return;
        }
      }
      if (!backup.data) throw new Error('Geçersiz yedek dosyası');
      // Veriler Supabase'de tutulduğu için geri yükleme buluta upsert ile yapılır
      if (!window._currentUserId) { durum('⚠️ Geri yükleme için önce giriş yapmalısınız.', true); return; }
      durum('⏳ Yedek buluta geri yükleniyor...');
      const sonuc = await _yedekGeriYukle(backup);
      if (sonuc.hatali.length) {
        durum('⚠️ ' + sonuc.toplam + ' kayıt yüklendi; şu tablolarda hata oluştu: ' + sonuc.hatali.join(', '), true);
      } else if (sonuc.toplam === 0) {
        durum('⚠️ Yedekte geri yüklenecek kayıt bulunamadı (eski/boş bir yedek olabilir).', true);
      } else {
        durum('✅ ' + sonuc.toplam + ' kayıt geri yüklendi! Sayfa yenileniyor...');
        setTimeout(() => location.reload(), 1500);
      }
    } catch(err) {
      durum('❌ Geçersiz dosya: ' + err.message, true);
    }
  };
  reader.readAsText(file);
  input.value = '';
}

function resetAllData() {
  showConfirmModal('⚠️ Bulut dahil TÜM veriler kalıcı olarak silinecek! Bu işlem geri alınamaz.<br><br>Silmeden önce yedek almanız şiddetle önerilir.', async function() {
    if (!window._currentUserId) { alert('Önce giriş yapmalısınız.'); return; }
    // Eski AUTH.check (localStorage kullanıcı sistemi) Supabase girişiyle
    // çalışmıyordu — onay artık Supabase şifresiyle yeniden doğrulanır.
    const pw = prompt('Onaylamak için hesap şifrenizi girin:');
    if (!pw) return;
    let email = '';
    try { email = JSON.parse(sessionStorage.getItem('sb_session') || '{}').email || ''; } catch(e) {}
    if (!email) email = (window.currentUser && window.currentUser.username) || '';
    const { error: authErr } = await _supabaseClient.auth.signInWithPassword({ email, password: pw });
    if (authErr) { alert('Hatalı şifre. İşlem iptal edildi.'); return; }
    notify('🗑 Veriler siliniyor...');
    // Önce bağlı kayıtlar, sonra ana kayıtlar (olası FK kısıtları için sıra önemli).
    // RLS sayesinde yalnız bu kullanıcının satırları silinir.
    // NOT: Storage'daki (chatter-files) dosyalar burada silinmez.
    const tablolar = ['dosya_chatter','uets_kayitlar','cari','notlar','icra_masraflar','icra_belgeler','belgeler','tasks','odeme_planlari','finans','contacts','kisiler','icralar','davalar','muvekkiller'];
    const hatali = [];
    for (const t of tablolar) {
      const { error } = await _supabaseClient.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) { console.error(t + ' silinemedi:', error); hatali.push(t); }
    }
    // Cihaz-yerel veriler (icra haciz, geçmişler, ayarlar)
    const silinecek = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.indexOf('hukuk_') === 0 || k.indexOf('icra_haciz_') === 0)) silinecek.push(k);
    }
    silinecek.forEach(k => localStorage.removeItem(k));
    closeModal('modal-backup');
    if (hatali.length) { alert('⚠️ Şu tablolar silinemedi: ' + hatali.join(', ') + '\nDiğer veriler silindi.'); }
    notify('🗑 Tüm veriler silindi. Sayfa yenileniyor...');
    setTimeout(() => location.reload(), 1200);
  });
}

// ========== DAVA ÇEŞİTLERİ VERİSİ ==========
const DAVA_CESITLERI = {
  'Asliye Hukuk': [
    // Alacak & Borç
    'Alacak Davası', 'Tazminat Davası (Genel)', 'Menfi Tespit Davası', 'İstirdat Davası',
    'Rücuen Tazminat Davası', 'Borçtan Kurtulma Davası',
    // Taşınmaz
    'Tapu İptali ve Tescil Davası', 'El Atmanın Önlenmesi (Müdahalenin Men\'i)',
    'Ecrimisil Davası', 'Ortaklığın Giderilmesi (İzale-i Şuyu)', 'Ön Alım (Şuf\'a) Davası',
    'Taşınmaz Satış Vaadi Sözleşmesine Dayalı Dava',
    // Sözleşme
    'Sözleşmenin Feshi Davası', 'Sözleşmenin İptali Davası', 'Sözleşmeye Aykırılık – Tazminat',
    'Sebepsiz Zenginleşme Davası',
    // Haksız Fiil
    'Haksız Fiil Tazminatı', 'Trafik Kazası Tazminat Davası',
    'İş Kazası Tazminatı (Genel Hükümler)',
    // Kişilik Hakları
    'Kişilik Haklarına Saldırı – Manevi Tazminat', 'Hakaret ve İftira – Tazminat',
    // Miras
    'Miras Taksim Davası', 'Tenkis Davası', 'Mirasa İştiraki Sağlama',
    // Diğer
    'Tespit Davası', 'İtirazın İptali Davası', 'Haksız El Atma',
    'Diğer / Manuel Giriş'
  ],
  'Sulh Hukuk': [
    'Kira Tespit Davası', 'Kira Bedelinin Uyarlanması',
    'Kiracının Tahliyesi – Kira Bedelini Ödememesi',
    'Kiracının Tahliyesi – Tahliye Taahhüdü',
    'Kiracının Tahliyesi – İhtiyaç Nedeniyle',
    'Kiracının Tahliyesi – Yeniden İnşa/Esaslı Onarım',
    'Kiracının Tahliyesi – 10 Yıl Sonra',
    'Kiralananın İadesi', 'Kira Sözleşmesinin Feshi',
    'Mirasçılık Belgesi (Veraset İlamı)',
    'Miras Taksimi – Sulh Yolu', 'Vasiyetnamenin Açılması',
    'Kayyım Atanması', 'Vasi Atanması', 'Kısıtlılık Kararı',
    'Ziyarete Elkoyma ve Muhafaza', 'Paylı Mülkiyet Yönetimi',
    'İstihkak Davası (Küçük Değerli)', 'Ödeme Emrine İtiraz',
    'Diğer / Manuel Giriş'
  ],
  'Aile': [
    // Boşanma
    'Anlaşmalı Boşanma', 'Çekişmeli Boşanma – Genel Sebepler',
    'Boşanma – Zina', 'Boşanma – Hayata Kast / Kötü Muamele',
    'Boşanma – Suç İşleme ve Haysiyetsiz Hayat Sürme',
    'Boşanma – Terk', 'Boşanma – Akıl Hastalığı',
    'Boşanma – Evlilik Birliğinin Temelinden Sarsılması',
    // Boşanmanın Sonuçları
    'Boşanmada Maddi Tazminat', 'Boşanmada Manevi Tazminat',
    'Nafaka – Tedbir Nafakası', 'Nafaka – İştirak Nafakası',
    'Nafaka – Yoksulluk Nafakası', 'Nafaka Artırımı / Azaltımı / Kaldırılması',
    'Velayet Davası', 'Velayet Değiştirilmesi',
    'Kişisel İlişki (Görüş) Davası',
    // Mal Rejimi
    'Edinilmiş Mallara Katılım – Tasfiye',
    'Mal Ayrılığı / Paylaşmalı Mal Ayrılığı',
    'Ziynet ve Çeyiz Eşyası Davası',
    // Soybağı
    'Babalık Davası', 'Soybağının Reddi', 'Soybağının Kurulması',
    'Evlat Edinme',
    // Diğer Aile
    'Aile Konutu Şerhi', 'Aile Mahkemesinde Tedbir Kararı',
    'Diğer / Manuel Giriş'
  ],
  'İş': [
    'İşe İade Davası', 'İşe İade – Feshin Geçersizliği',
    'Kıdem Tazminatı Davası', 'İhbar Tazminatı Davası',
    'Kıdem + İhbar Tazminatı (Birleşik)',
    'Fazla Mesai Ücreti Davası', 'Yıllık İzin Ücreti Davası',
    'Ücret Alacağı Davası', 'Prim / İkramiye Alacağı',
    'Asgari Geçim İndirimi Farkı',
    'İş Kazası Tazminatı', 'Meslek Hastalığı Tazminatı',
    'İş Kazası – Maddi Tazminat', 'İş Kazası – Manevi Tazminat',
    'SGK Rücu Davası',
    'Hizmet Tespiti Davası (Sigortalılık)',
    'Mobbing – Psikolojik Taciz Tazminatı',
    'Cinsel Taciz – İş Hukuku',
    'Rekabet Yasağı İhlali', 'Sır Saklama Yükümlülüğü İhlali',
    'Eşit İşlem İlkesi İhlali',
    'Toplu İş Sözleşmesinden Kaynaklı Alacak',
    'Diğer / Manuel Giriş'
  ],
  'Ticaret': [
    // Şirket Hukuku
    'Genel Kurul Kararının İptali', 'Genel Kurul Kararının Butlanı',
    'Yönetim Kurulu Kararının İptali',
    'Ortaklıktan Çıkarma / Çıkma Davası',
    'Ortaklığın Feshi ve Tasfiyesi',
    'Şirket Müdürü Sorumluluğu Davası',
    'Pay Devri Tescili', 'Esas Sözleşme Değişikliğine İtiraz',
    // Alacak & Sözleşme
    'Ticari Alacak Davası', 'Menfi Tespit Davası (Ticari)',
    'İtirazın İptali Davası (Ticari)', 'Haksız Rekabet Davası',
    'Acente Sözleşmesinden Kaynaklı Alacak',
    'Franchise Sözleşmesi Uyuşmazlığı',
    'Bayilik Sözleşmesi Uyuşmazlığı',
    // İflas & Konkordato
    'İflas Davası (Adi İflas)', 'İflas Davası (Kambiyo Senetlerine Özgü)',
    'Konkordato Talep',
    'İflasın Ertelenmesi', 'Sermaye Tamamlama Davası',
    // Kıymetli Evrak
    'Çek Bedeli Alacağı', 'Senet – Bono Alacağı',
    'Poliçe Alacağı', 'Kambiyo Senedi İptal Davası',
    // Taşımacılık & Sigorta
    'Taşıma Sözleşmesi Uyuşmazlığı', 'Deniz Ticareti Uyuşmazlığı',
    'Sigorta Tazminatı Davası', 'Rücu Davası (Sigorta)',
    // Fikri Mülkiyet (Asliye Ticaret'te de görülebilir)
    'Marka İhlali Tazminatı', 'Patent İhlali',
    // Diğer
    'Ticari Defterlerin Delil Sayılması',
    'Diğer / Manuel Giriş'
  ],
  'Kira': [
    'Kira Tespit Davası', 'Kira Uyarlama Davası',
    'Kiracının Tahliyesi – Kira Bedelini Ödememesi',
    'Kiracının Tahliyesi – Tahliye Taahhüdü',
    'Kiracının Tahliyesi – İhtiyaç (Kiraya Veren/Yakını)',
    'Kiracının Tahliyesi – Yeniden İnşa / Esaslı Onarım',
    'Kiracının Tahliyesi – 10 Yıl Sonra Fesih',
    'Kiralananın Tahliyesi – Kira Sözleşmesinin Sona Ermesi',
    'Kira Sözleşmesinin Feshi – Kiracı Talebi',
    'Depozito İadesi', 'Kira Zararı – Tazminat',
    'İşyeri Kira Uyuşmazlığı',
    'Diğer / Manuel Giriş'
  ],
  'Tüketici': [
    'Ayıplı Mal – İade / Bedel İadesi', 'Ayıplı Mal – Onarım Talebi',
    'Ayıplı Mal – Bedel İndirimi', 'Ayıplı Mal – Yenisiyle Değişim',
    'Ayıplı Hizmet Davası',
    'Tüketici Kredisi Uyuşmazlığı',
    'Konut Finansmanı (Mortgage) Uyuşmazlığı',
    'Mesafeli Satış – Cayma Hakkı',
    'Haksız Sözleşme Şartlarının Tespiti',
    'Abonelik Sözleşmesi Uyuşmazlığı',
    'Paket Tur – Seyahat Uyuşmazlığı',
    'Devre Mülk / Devre Tatil Uyuşmazlığı',
    'Banka – Tüketici Uyuşmazlığı',
    'Sigorta – Tüketici Uyuşmazlığı',
    'Diğer / Manuel Giriş'
  ],
  'Kadastro': [
    'Tapu Tescil Davası (Kadastro)',
    'Kadastro Tespitine İtiraz',
    'Orman Sınırı Tespitine İtiraz',
    'Mera Sınırı Tespitine İtiraz',
    'Taşınmaz Sınır Uyuşmazlığı',
    'Diğer / Manuel Giriş'
  ],
  'Fikri Mülkiyet': [
    'Marka İhlali – Tecavüzün Tespiti',
    'Marka İhlali – Tecavüzün Durdurulması',
    'Marka İhlali – Tazminat',
    'Marka İptali Davası', 'Marka Hükümsüzlüğü',
    'Patent İhlali – Tecavüzün Tespiti',
    'Patent İhlali – Tazminat',
    'Faydalı Model İhlali',
    'Telif Hakkı İhlali',
    'Endüstriyel Tasarım İhlali',
    'Coğrafi İşaret İhlali',
    'Haksız Rekabet – Fikri Mülkiyet',
    'Diğer / Manuel Giriş'
  ],
  'Asliye Ceza': [
    'Kasten Yaralama (TCK 86)', 'Kasten Yaralama – Neticesi Ağırlaşmış',
    'Tehdit (TCK 106)', 'Şantaj (TCK 107)',
    'Hakaret (TCK 125)', 'Alenen Aşağılama',
    'Konut Dokunulmazlığının İhlali (TCK 116)',
    'Hırsızlık (TCK 141)', 'Mala Zarar Verme (TCK 151)',
    'Dolandırıcılık (TCK 157)',
    'Güveni Kötüye Kullanma (TCK 155)',
    'Resmi Evrakta Sahtecilik (TCK 204)',
    'Özel Belgede Sahtecilik (TCK 207)',
    'Görevi Kötüye Kullanma (TCK 257)',
    'Bilişim Suçları (TCK 243-246)',
    'Basın Yoluyla Hakaret',
    'Suç Eşyası Satın Alma (TCK 165)',
    '6458 Yabancılar Kanunu İhlali',
    'Diğer / Manuel Giriş'
  ],
  'Ağır Ceza': [
    'Kasten Öldürme (TCK 81)', 'Kasten Öldürme – Nitelikli (TCK 82)',
    'Taksirle Öldürme (TCK 85)',
    'Kasten Ağır Yaralama (TCK 87)',
    'İşkence (TCK 94)', 'Eziyet (TCK 96)',
    'Cinsel Saldırı (TCK 102)', 'Cinsel İstismar (TCK 103)',
    'Çocuğun Cinsel İstismarı (TCK 103)',
    'Kişi Hürriyetini Kısıtlama (TCK 109)',
    'Yağma / Gasp (TCK 148)', 'Nitelikli Yağma (TCK 149)',
    'Uyuşturucu Ticareti (TCK 188)',
    'Uyuşturucu Kullanımı (TCK 191)',
    'Terörle Mücadele Kanunu İhlali',
    'Suç Örgütü Kurma/Üyeliği (TCK 220)',
    'Zimmet (TCK 247)', 'İrtikap (TCK 250)', 'Rüşvet (TCK 252)',
    'Nitelikli Dolandırıcılık (TCK 158)',
    'Banka Kartı Dolandırıcılığı (TCK 245)',
    'Kamu Malına Zarar Verme',
    'Diğer / Manuel Giriş'
  ],
  'Sulh Ceza Hâkimliği': [
    'Tutukluluk İncelemesi',
    'Tutuklulukta Devam / Serbest Bırakma',
    'Arama Kararına İtiraz',
    'El Koyma Kararına İtiraz',
    'Dinleme / Teknik Takip Kararına İtiraz',
    'İletişimin Tespiti Kararına İtiraz',
    'Gizli Soruşturmacı Kararına İtiraz',
    'Uzlaştırma Kararına İtiraz',
    'Adli Para Cezasına İtiraz',
    'Erteleme Kararına İtiraz',
    'Hâkimlik Kararlarına İtiraz (Genel)',
    'Diğer / Manuel Giriş'
  ],
  'Çocuk': [
    'Suça Sürüklenen Çocuk – Hırsızlık',
    'Suça Sürüklenen Çocuk – Yaralama',
    'Suça Sürüklenen Çocuk – Uyuşturucu',
    'Suça Sürüklenen Çocuk – Cinsel Suç',
    'Çocuğa Yönelik Suç (Mağdur Çocuk)',
    'Korunma Kararı',
    'Diğer / Manuel Giriş'
  ],
  'Çocuk Ağır Ceza': [
    'Suça Sürüklenen Çocuk – Öldürme',
    'Suça Sürüklenen Çocuk – Ağır Yaralama',
    'Suça Sürüklenen Çocuk – Yağma',
    'Suça Sürüklenen Çocuk – Nitelikli Cinsel Suç',
    'Suça Sürüklenen Çocuk – Terör',
    'Diğer / Manuel Giriş'
  ],
  'İdare': [
    'İptal Davası – İdari İşlem',
    'Tam Yargı Davası – Tazminat',
    'İdari İşlemin İptali (Disiplin Cezası)',
    'İdari İşlemin İptali (İmar)',
    'Kamulaştırma Bedelinin Artırılması',
    'Kamulaştırmasız El Atma',
    'İdari Para Cezasının İptali',
    'Lisans / Ruhsat İptali',
    'Kamu İhale Uyuşmazlığı',
    'Kamu Görevlisi – Atama / Nakil İptali',
    'Kamu Görevlisi – Görevden Alma İptali',
    'Kamu Görevlisi – Sicil Notu İptali',
    'Çevre ve İmar Mevzuatı İhlali',
    'Sağlık Hizmetinden Kaynaklı Tazminat',
    'Diğer / Manuel Giriş'
  ],
  'Vergi': [
    'Vergi / Ceza İhbarnamesinin İptali',
    'Ödeme Emrinin İptali',
    'Haciz İşleminin İptali',
    'KDV İadesine İlişkin Uyuşmazlık',
    'Kurumlar Vergisi Uyuşmazlığı',
    'Gelir Vergisi Uyuşmazlığı',
    'ÖTV Uyuşmazlığı',
    'Damga Vergisi Uyuşmazlığı',
    'Gümrük Vergisi Uyuşmazlığı',
    'Vergi Ziyaı Cezasının İptali',
    'Usulsüzlük Cezasının İptali',
    'Tecil ve Taksitlendirme Talebi',
    'Diğer / Manuel Giriş'
  ],
  'Bölge İdare': [
    'İdare Mahkemesi Kararına İtiraz (İstinaf)',
    'Vergi Mahkemesi Kararına İtiraz (İstinaf)',
    'İstinaf – Tam Yargı Davası',
    'İstinaf – İptal Davası',
    'Diğer / Manuel Giriş'
  ],
  'İcra Hukuk': [
    // Temel İtiraz Davaları
    'İtirazın İptali Davası (İİK m.67)',
    'İtirazın Kaldırılması Talebi (İİK m.68)',
    'Menfi Tespit Davası (İİK m.72)',
    'İstirdat Davası (İİK m.72)',
    // İstihkak
    'İstihkak Davası – Borçlu Elinde (İİK m.96)',
    'İstihkak Davası – 3. Kişi Elinde (İİK m.99)',
    // Tahliye & Teslim
    'Tahliye Davası (İİK m.26)',
    'Çocuk Teslimi / Kişisel İlişki (İİK m.25)',
    // İhalenin Feshi
    'İhalenin Feshi (İİK m.134)',
    // Diğer
    'Sıra Cetveline İtiraz (İİK m.142)',
    'Paraların Paylaştırılmasına İtiraz',
    'Aciz Belgesi – Alacağın Tespiti',
    'Konkordato – Alacaklı İtirazı',
    'Kambiyo Senetlerine Özgü Haciz – İtiraz',
    'Borçtan Kurtulma Davası (Kambiyo)',
    'Diğer / Manuel Giriş'
  ],
  'Bölge Adliye': [
    'Hukuk (Genel) – İstinaf',
    'Aile Hukuku – İstinaf',
    'İş Hukuku – İstinaf',
    'Ticaret – İstinaf',
    'Tüketici – İstinaf',
    'İcra Hukuk – İstinaf',
    'Ceza (Genel) – İstinaf',
    'Ağır Ceza – İstinaf',
    'Çocuk – İstinaf',
    'Diğer / Manuel Giriş'
  ],
  'Yargıtay': [
    'Hukuk Genel Kurulu – Temyiz',
    'Ceza Genel Kurulu – Temyiz',
    '1. Hukuk Dairesi – Tapu / Taşınmaz',
    '2. Hukuk Dairesi – Aile / Kişiler Hukuku',
    '3. Hukuk Dairesi – Borçlar / Kira',
    '4. Hukuk Dairesi – Tazminat',
    '9. Hukuk Dairesi – İş Hukuku',
    '11. Hukuk Dairesi – Ticaret',
    '12. Hukuk Dairesi – İcra İflas',
    '1. Ceza Dairesi', '2. Ceza Dairesi', '4. Ceza Dairesi',
    'Diğer / Manuel Giriş'
  ],
  'Danıştay': [
    '2. Daire – Personel Hukuku',
    '4. Daire – Vergi',
    '6. Daire – İmar / Çevre',
    '7. Daire – Gümrük / Teknik',
    '9. Daire – Vergi',
    '10. Daire – Genel İdare',
    '13. Daire – İhale / Rekabet',
    'İdari Dava Daireleri Kurulu',
    'Vergi Dava Daireleri Kurulu',
    'Diğer / Manuel Giriş'
  ],
  'Anayasa': [
    'Bireysel Başvuru – Adil Yargılanma Hakkı',
    'Bireysel Başvuru – Mülkiyet Hakkı',
    'Bireysel Başvuru – Kişi Özgürlüğü',
    'Bireysel Başvuru – İfade Özgürlüğü',
    'Bireysel Başvuru – Özel Hayat',
    'Bireysel Başvuru – Yaşam Hakkı',
    'İptal Davası (Soyut Norm Denetimi)',
    'İtiraz (Somut Norm Denetimi)',
    'Diğer / Manuel Giriş'
  ]
};

function updateDavaCesitleri(tur) {
  const wrap = document.getElementById('d-cesit-wrap');
  const sel = document.getElementById('d-cesit');
  const cesitler = DAVA_CESITLERI[tur];
  if (!cesitler || cesitler.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';
  sel.innerHTML = '<option value="">Seçin...</option>' +
    cesitler.map(c => `<option value="${c === 'Diğer / Manuel Giriş' ? '__diger__' : c}">${c}</option>`).join('');
}

// ========== TÜRK YARGI SİSTEMİ VERİSİ ==========
const TR_ILLER = [
  'Adana','Adıyaman','Afyonkarahisar','Ağrı','Amasya','Ankara','Antalya','Artvin',
  'Aydın','Balıkesir','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa',
  'Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Edirne','Elazığ','Erzincan',
  'Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkari','Hatay','Isparta',
  'Mersin','İstanbul','İzmir','Kars','Kastamonu','Kayseri','Kırklareli','Kırşehir',
  'Kocaeli','Konya','Kütahya','Malatya','Manisa','Kahramanmaraş','Mardin','Muğla',
  'Muş','Nevşehir','Niğde','Ordu','Rize','Sakarya','Samsun','Siirt','Sinop',
  'Sivas','Tekirdağ','Tokat','Trabzon','Tunceli','Şanlıurfa','Uşak','Van',
  'Yozgat','Zonguldak','Aksaray','Bayburt','Karaman','Kırıkkale','Batman','Şırnak',
  'Bartın','Ardahan','Iğdır','Yalova','Karabük','Kilis','Osmaniye','Düzce'
];

// Her il için mahkeme türüne göre kaç tane olduğunu tanımlar
// İstanbul, Ankara, İzmir gibi büyük şehirlerde daha fazla mahkeme var
const MAHKEME_SAYILARI = {
  // [il] -> { mahkemeTurü: maxSıra }
  'İstanbul': {
    'Asliye Hukuk': 50, 'Sulh Hukuk': 30, 'Aile': 22, 'İş': 42,
    'Ticaret': 18, 'Tüketici': 16, 'Kira': 30, 'Kadastro': 6,
    'İcra Hukuk': 14,
    'Fikri Mülkiyet': 4, 'Asliye Ceza': 46, 'Ağır Ceza': 28,
    'Sulh Ceza Hâkimliği': 12, 'Çocuk': 8, 'Çocuk Ağır Ceza': 4,
    'İdare': 12, 'Vergi': 8, 'Bölge Adliye': 1,
    'İcra': 38
  },
  'Ankara': {
    'Asliye Hukuk': 30, 'Sulh Hukuk': 20, 'Aile': 14, 'İş': 24,
    'Ticaret': 10, 'Tüketici': 10, 'Kira': 20, 'Kadastro': 4,
    'İcra Hukuk': 8,
    'Fikri Mülkiyet': 2, 'Asliye Ceza': 30, 'Ağır Ceza': 18,
    'Sulh Ceza Hâkimliği': 10, 'Çocuk': 6, 'Çocuk Ağır Ceza': 3,
    'İdare': 8, 'Vergi': 6, 'Bölge Adliye': 1,
    'İcra': 22
  },
  'İzmir': {
    'Asliye Hukuk': 18, 'Sulh Hukuk': 12, 'Aile': 10, 'İş': 16,
    'Ticaret': 8, 'Tüketici': 8, 'Kira': 12, 'Kadastro': 3,
    'İcra Hukuk': 6,
    'Fikri Mülkiyet': 1, 'Asliye Ceza': 20, 'Ağır Ceza': 12,
    'Sulh Ceza Hâkimliği': 8, 'Çocuk': 4, 'Çocuk Ağır Ceza': 2,
    'İdare': 4, 'Vergi': 3, 'Bölge Adliye': 1,
    'İcra': 16
  },
  'Bursa': {
    'Asliye Hukuk': 12, 'Sulh Hukuk': 8, 'Aile': 6, 'İş': 10,
    'Ticaret': 4, 'Tüketici': 4, 'Kira': 8,
    'Asliye Ceza': 12, 'Ağır Ceza': 6, 'Sulh Ceza Hâkimliği': 5,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 2, 'Bölge Adliye': 1, 'İcra': 12
  },
  'Antalya': {
    'Asliye Hukuk': 10, 'Sulh Hukuk': 6, 'Aile': 5, 'İş': 8,
    'Ticaret': 3, 'Tüketici': 4, 'Kira': 6,
    'Asliye Ceza': 10, 'Ağır Ceza': 5, 'Sulh Ceza Hâkimliği': 4,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 2, 'Bölge Adliye': 1, 'İcra': 10
  },
  'Adana': {
    'Asliye Hukuk': 8, 'Sulh Hukuk': 5, 'Aile': 4, 'İş': 6,
    'Ticaret': 2, 'Tüketici': 3, 'Kira': 5,
    'Asliye Ceza': 8, 'Ağır Ceza': 4, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 14
  },
  'Gaziantep': {
    'Asliye Hukuk': 8, 'Sulh Hukuk': 5, 'Aile': 4, 'İş': 6,
    'Ticaret': 2, 'Tüketici': 3, 'Kira': 5,
    'Asliye Ceza': 8, 'Ağır Ceza': 4, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 5
  },
  'Kocaeli': {
    'Asliye Hukuk': 8, 'Sulh Hukuk': 5, 'Aile': 4, 'İş': 7,
    'Ticaret': 3, 'Tüketici': 3, 'Kira': 5,
    'Asliye Ceza': 8, 'Ağır Ceza': 4, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 8
  },
  'Konya': {
    'Asliye Hukuk': 8, 'Sulh Hukuk': 5, 'Aile': 4, 'İş': 6,
    'Ticaret': 2, 'Tüketici': 3, 'Kira': 5,
    'Asliye Ceza': 8, 'Ağır Ceza': 4, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 7
  },
  'Mersin': {
    'Asliye Hukuk': 6, 'Sulh Hukuk': 4, 'Aile': 3, 'İş': 5,
    'Ticaret': 2, 'Tüketici': 2, 'Kira': 4,
    'Asliye Ceza': 6, 'Ağır Ceza': 3, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'İcra': 6
  },
  'Diyarbakır': {
    'Asliye Hukuk': 6, 'Sulh Hukuk': 4, 'Aile': 3, 'İş': 4,
    'Tüketici': 2, 'Kira': 4,
    'Asliye Ceza': 6, 'Ağır Ceza': 4, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 6
  },
  'Samsun': {
    'Asliye Hukuk': 6, 'Sulh Hukuk': 4, 'Aile': 3, 'İş': 5,
    'Ticaret': 2, 'Tüketici': 2, 'Kira': 4,
    'Asliye Ceza': 6, 'Ağır Ceza': 3, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'İcra': 6
  },
  'Trabzon': {
    'Asliye Hukuk': 4, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 3,
    'Ticaret': 2, 'Tüketici': 2, 'Kira': 3,
    'Asliye Ceza': 4, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 3
  },
  'Kayseri': {
    'Asliye Hukuk': 6, 'Sulh Hukuk': 4, 'Aile': 3, 'İş': 5,
    'Ticaret': 2, 'Tüketici': 2, 'Kira': 4,
    'Asliye Ceza': 6, 'Ağır Ceza': 3, 'Sulh Ceza Hâkimliği': 3,
    'Çocuk': 2, 'İdare': 2, 'Vergi': 1, 'İcra': 8
  },
  'Eskişehir': {
    'Asliye Hukuk': 5, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 4,
    'Ticaret': 2, 'Tüketici': 2, 'Kira': 3,
    'Asliye Ceza': 5, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 5
  },
  'Sakarya': {
    'Asliye Hukuk': 5, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 4,
    'Ticaret': 2, 'Tüketici': 2, 'Kira': 3,
    'Asliye Ceza': 5, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'İcra': 5
  },
  'Denizli': {
    'Asliye Hukuk': 4, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 3,
    'Ticaret': 1, 'Tüketici': 2, 'Kira': 3,
    'Asliye Ceza': 4, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'İcra': 7
  },
  'Malatya': {
    'Asliye Hukuk': 4, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 3,
    'Tüketici': 1, 'Kira': 3,
    'Asliye Ceza': 4, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'Bölge Adliye': 1, 'İcra': 3
  },
  'Hatay': {
    'Asliye Hukuk': 5, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 4,
    'Tüketici': 2, 'Kira': 3,
    'Asliye Ceza': 5, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'İcra': 3
  },
  'Manisa': {
    'Asliye Hukuk': 4, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 3,
    'Tüketici': 1, 'Kira': 3,
    'Asliye Ceza': 4, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'İcra': 3
  },
  'Balıkesir': {
    'Asliye Hukuk': 4, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 3,
    'Tüketici': 1, 'Kira': 3,
    'Asliye Ceza': 4, 'Ağır Ceza': 2, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 1, 'İdare': 1, 'İcra': 3
  },
  'Şanlıurfa': {
    'Asliye Hukuk': 5, 'Sulh Hukuk': 3, 'Aile': 2, 'İş': 3,
    'Tüketici': 2, 'Kira': 3,
    'Asliye Ceza': 5, 'Ağır Ceza': 3, 'Sulh Ceza Hâkimliği': 2,
    'Çocuk': 2, 'İdare': 1, 'İcra': 3
  },
  // Diğer tüm iller için varsayılan
  '__default__': {
    'Asliye Hukuk': 3, 'Sulh Hukuk': 2, 'Aile': 1, 'İş': 2,
    'Ticaret': 1, 'Tüketici': 1, 'Kira': 2, 'Kadastro': 1,
    'İcra Hukuk': 1,
    'Asliye Ceza': 3, 'Ağır Ceza': 1, 'Sulh Ceza Hâkimliği': 1,
    'Çocuk': 1, 'İdare': 1, 'Vergi': 1, 'İcra': 3
  }
};

// Dava türüne göre yargı kolu ve mahkeme adı eşleştirmesi
const DAVA_TUR_MAP = {
  'Asliye Hukuk':       { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Asliye Hukuk Mahkemesi' },
  'Sulh Hukuk':         { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Sulh Hukuk Mahkemesi' },
  'Aile':               { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Aile Mahkemesi' },
  'İş':                 { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. İş Mahkemesi' },
  'Ticaret':            { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Asliye Ticaret Mahkemesi' },
  'Tüketici':           { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Tüketici Mahkemesi' },
  'Kira':               { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Sulh Hukuk Mahkemesi' },
  'İcra Hukuk':         { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. İcra Hukuk Mahkemesi' },
  'Kadastro':           { yargi: 'Adli Yargı – Hukuk',      ad: '{il} {sira}. Kadastro Mahkemesi' },
  'Fikri Mülkiyet':     { yargi: 'Adli Yargı – Hukuk',      ad: '{il} Fikrî ve Sınaî Haklar Hukuk Mahkemesi' },
  'Asliye Ceza':        { yargi: 'Adli Yargı – Ceza',       ad: '{il} {sira}. Asliye Ceza Mahkemesi' },
  'Ağır Ceza':          { yargi: 'Adli Yargı – Ceza',       ad: '{il} {sira}. Ağır Ceza Mahkemesi' },
  'Sulh Ceza Hâkimliği':{ yargi: 'Adli Yargı – Ceza',       ad: '{il} {sira}. Sulh Ceza Hâkimliği' },
  'Çocuk':              { yargi: 'Adli Yargı – Ceza',       ad: '{il} {sira}. Çocuk Mahkemesi' },
  'Çocuk Ağır Ceza':    { yargi: 'Adli Yargı – Ceza',       ad: '{il} {sira}. Çocuk Ağır Ceza Mahkemesi' },
  'İdare':              { yargi: 'İdari Yargı',              ad: '{il} {sira}. İdare Mahkemesi' },
  'Vergi':              { yargi: 'İdari Yargı',              ad: '{il} {sira}. Vergi Mahkemesi' },
  'Bölge İdare':        { yargi: 'İdari Yargı',              ad: '{il} Bölge İdare Mahkemesi' },
  'Bölge Adliye':       { yargi: 'Adli Yargı – İstinaf',    ad: '{il} Bölge Adliye Mahkemesi' },
  'Danıştay':           { yargi: 'İdari Yargı – Temyiz',    ad: 'Danıştay' },
  'Yargıtay':           { yargi: 'Adli Yargı – Temyiz',     ad: 'Yargıtay' },
  'Anayasa':            { yargi: 'Anayasa Yargısı',          ad: 'Anayasa Mahkemesi' },
};

function getMahkemeSayisi(il, tur) {
  const data = MAHKEME_SAYILARI[il] || MAHKEME_SAYILARI['__default__'];
  return data[tur] || 2;
}

function ordinalTR(n) {
  return n + '.';
}

// Dava türü değişince il listesini ve yargı kolunu güncelle
function onDavaTuruChange() {
  const tur = document.getElementById('d-tur').value;
  const ilSel = document.getElementById('d-il');
  const siraSel = document.getElementById('d-sira');

  // Yargı kolu alanını güncelle
  const turMap = DAVA_TUR_MAP[tur];
  document.getElementById('d-yargi-kolu').value = turMap ? turMap.yargi : '';

  // Dava çeşitlerini güncelle
  updateDavaCesitleri(tur);
  // Asgari ücret güncelle
  hesaplaVekaletUcreti('dava');

  // Üst derece mahkemelerde il seçimi anlamsız
  const ilsiz = ['Danıştay', 'Yargıtay', 'Anayasa'].includes(tur);
  ilSel.disabled = ilsiz;
  siraSel.disabled = ilsiz;

  if (ilsiz) {
    ilSel.innerHTML = '<option value="">—</option>';
    siraSel.innerHTML = '<option value="">—</option>';
    document.getElementById('d-mahkeme').value = turMap ? turMap.ad.replace('{il} ', '').replace(' {sira}.', '') : '';
    return;
  }

  // Bölge Adliye veya Bölge İdare'de sınırlı il var
  let iller = TR_ILLER;
  const bolgeIller = ['İstanbul','Ankara','İzmir','Bursa','Antalya','Adana','Gaziantep','Diyarbakır','Samsun','Erzurum','Konya','Trabzon','Malatya','Eskişehir','Sakarya'];
  if (['Bölge Adliye', 'Bölge İdare'].includes(tur)) iller = bolgeIller;

  ilSel.innerHTML = '<option value="">İl seçin...</option>' + iller.map(il => `<option value="${il}">${il}</option>`).join('');

  // İl seçilmişse sıra no'yu güncelle
  if (ilSel.value) onMahkemeIlChange('dava');
  else { siraSel.innerHTML = '<option value="">—</option>'; }
}

function onMahkemeIlChange(mod) {
  const tur = mod === 'dava' ? document.getElementById('d-tur').value : 'İcra';
  const il = document.getElementById(mod === 'dava' ? 'd-il' : 'i-il').value;
  const siraSel = document.getElementById(mod === 'dava' ? 'd-sira' : 'i-sira');

  if (!il) { siraSel.innerHTML = '<option value="">—</option>'; return; }

  const max = getMahkemeSayisi(il, tur);
  const ilsiz = ['Bölge Adliye', 'Bölge İdare', 'Fikri Mülkiyet'].includes(tur);

  if (ilsiz || max === 1) {
    siraSel.innerHTML = '<option value="1">—</option>';
    siraSel.value = '1';
  } else {
    siraSel.innerHTML = '<option value="">Seçin...</option>' +
      Array.from({length: max}, (_,i) => `<option value="${i+1}">${i+1}.</option>`).join('');
  }
  buildMahkemeAdi(mod);
}

function buildIstinafAdi() {
  const il = document.getElementById('d-istinaf-il').value;
  const daire = document.getElementById('d-istinaf-daire').value;
  if (!il && !daire) { document.getElementById('d-istinaf-mahkeme').value = ''; return; }
  let ad = il ? il + ' Bölge Adliye Mahkemesi' : 'Bölge Adliye Mahkemesi';
  if (daire) ad += ' ' + daire;
  document.getElementById('d-istinaf-mahkeme').value = ad;
}

const YARGITAY_DAIRELER = [
  { v:'Hukuk Genel Kurulu', l:'Hukuk Genel Kurulu' },
  { v:'1. Hukuk Dairesi', l:'1. HD – Tapu / Taşınmaz' },
  { v:'2. Hukuk Dairesi', l:'2. HD – Aile / Kişiler' },
  { v:'3. Hukuk Dairesi', l:'3. HD – Borçlar / Kira' },
  { v:'4. Hukuk Dairesi', l:'4. HD – Tazminat' },
  { v:'5. Hukuk Dairesi', l:'5. HD – Kamulaştırma' },
  { v:'6. Hukuk Dairesi', l:'6. HD – Ticaret' },
  { v:'7. Hukuk Dairesi', l:'7. HD – İş' },
  { v:'8. Hukuk Dairesi', l:'8. HD – İcra İflas' },
  { v:'9. Hukuk Dairesi', l:'9. HD – İş' },
  { v:'10. Hukuk Dairesi', l:'10. HD – Sigorta / İş' },
  { v:'11. Hukuk Dairesi', l:'11. HD – Ticaret' },
  { v:'12. Hukuk Dairesi', l:'12. HD – İcra İflas' },
  { v:'13. Hukuk Dairesi', l:'13. HD – Tüketici' },
  { v:'14. Hukuk Dairesi', l:'14. HD – Miras / Kadastro' },
  { v:'15. Hukuk Dairesi', l:'15. HD – Eser Sözleşmesi' },
  { v:'17. Hukuk Dairesi', l:'17. HD – Trafik / Sigorta' },
  { v:'20. Hukuk Dairesi', l:'20. HD – Tapu / Kadastro' },
  { v:'21. Hukuk Dairesi', l:'21. HD – İş / SSK' },
  { v:'22. Hukuk Dairesi', l:'22. HD – İş' },
  { v:'23. Hukuk Dairesi', l:'23. HD – Ticaret / İflas' },
  { v:'Ceza Genel Kurulu', l:'Ceza Genel Kurulu' },
  { v:'1. Ceza Dairesi', l:'1. CD – Kasten Öldürme' },
  { v:'2. Ceza Dairesi', l:'2. CD – Genel Suçlar' },
  { v:'3. Ceza Dairesi', l:'3. CD – Uyuşturucu' },
  { v:'4. Ceza Dairesi', l:'4. CD – Genel Suçlar' },
  { v:'5. Ceza Dairesi', l:'5. CD – Sahtecilik' },
  { v:'6. Ceza Dairesi', l:'6. CD – Cinsel Suçlar' },
  { v:'7. Ceza Dairesi', l:'7. CD – Terör / Örgüt' },
  { v:'8. Ceza Dairesi', l:'8. CD – Zimmet / Rüşvet' },
  { v:'9. Ceza Dairesi', l:'9. CD – Trafik' },
  { v:'10. Ceza Dairesi', l:'10. CD – Genel' },
  { v:'11. Ceza Dairesi', l:'11. CD – Bilişim' },
  { v:'12. Ceza Dairesi', l:'12. CD – Genel' },
];

const DANISTAY_DAIRELER = [
  'İdari Dava Daireleri Kurulu','Vergi Dava Daireleri Kurulu',
  '2. Daire – Personel','3. Daire – Vergi','4. Daire – Vergi',
  '5. Daire – Personel / Disiplin','6. Daire – İmar / Çevre',
  '7. Daire – Gümrük','8. Daire – Sağlık / Eğitim','9. Daire – Vergi',
  '10. Daire – Genel İdare','11. Daire – Vergi / KDV','12. Daire – Personel',
  '13. Daire – İhale / Rekabet','14. Daire – İmar','15. Daire – Güvenlik'
];

const ANAYASA_KONULAR = [
  'Adil Yargılanma Hakkı','Mülkiyet Hakkı','Kişi Özgürlüğü ve Güvenliği',
  'İfade Özgürlüğü','Özel Hayatın Gizliliği','Yaşam Hakkı',
  'Etkili Başvuru Hakkı','Diğer'
];

function onTemyizMerciChange() {
  const merci = document.getElementById('d-temyiz-merci').value;
  const daireSel = document.getElementById('d-temyiz-daire');
  daireSel.disabled = false;
  daireSel.innerHTML = '<option value="">Seçin...</option>';
  if (merci === 'Yargıtay') {
    daireSel.innerHTML += YARGITAY_DAIRELER.map(d => `<option value="${d.v}">${d.l}</option>`).join('');
  } else if (merci === 'Danıştay') {
    daireSel.innerHTML += DANISTAY_DAIRELER.map(d => `<option value="${d}">${d}</option>`).join('');
  } else if (merci === 'Anayasa Mahkemesi') {
    daireSel.innerHTML += ANAYASA_KONULAR.map(d => `<option value="${d}">${d}</option>`).join('');
    daireSel.options[0].text = 'Konu seçin...';
  } else {
    daireSel.disabled = true;
  }
  buildTemyizAdi();
}

function buildTemyizAdi() {
  const merci = document.getElementById('d-temyiz-merci').value;
  const daire = document.getElementById('d-temyiz-daire').value;
  if (!merci) { document.getElementById('d-temyiz-mahkeme').value = ''; return; }
  let ad = merci;
  if (daire) ad += ' ' + daire;
  document.getElementById('d-temyiz-mahkeme').value = ad;
}

// Eski fonksiyonlar — artık kullanılmıyor ama hata vermemesi için bırakıldı
function buildIstinafMahkeme() { buildIstinafAdi(); }
function buildYargitayMahkeme() {}
function buildDanistayMahkeme() {}


const COKLU_ADLIYE = {
  'İstanbul': ['İstanbul (Çağlayan/Kuştepe)', 'İstanbul Anadolu (Kartal)', 'Bakırköy', 'Küçükçekmece', 'Büyükçekmece', 'Gaziosmanpaşa', 'Üsküdar', 'Kartal', 'Beykoz', 'Adalar', 'Şişli'],
  'Ankara': ['Ankara (Sıhhiye)', 'Ankara Batı (Sincan)', 'Ankara Yenimahalle', 'Etimesgut', 'Keçiören', 'Mamak'],
  'İzmir': ['İzmir (Adliye)', 'İzmir Karşıyaka', 'İzmir Bayraklı', 'Bornova', 'Buca', 'Konak', 'Torbalı'],
  'Bursa': ['Bursa (Merkez)', 'Bursa Osmangazi', 'Bursa Yıldırım', 'Bursa Nilüfer', 'İnegöl', 'Gemlik'],
  'Antalya': ['Antalya (Merkez)', 'Alanya', 'Manavgat', 'Serik', 'Kemer'],
  'Adana': ['Adana (Merkez)', 'Adana Seyhan', 'Adana Çukurova', 'Ceyhan', 'Kozan'],
  'Gaziantep': ['Gaziantep (Merkez)', 'Gaziantep Şahinbey', 'Gaziantep Şehitkamil', 'Nizip'],
  'Kocaeli': ['Kocaeli (İzmit)', 'Kocaeli Gebze', 'Kocaeli Darıca', 'Gölcük', 'Kandıra'],
  'Mersin': ['Mersin (Merkez)', 'Tarsus', 'Silifke', 'Erdemli'],
  'Diyarbakır': ['Diyarbakır (Merkez)', 'Diyarbakır Sur', 'Bismil', 'Ergani'],
  'Şanlıurfa': ['Şanlıurfa (Merkez)', 'Viranşehir', 'Birecik', 'Siverek'],
  'Sakarya': ['Sakarya (Adapazarı)', 'Sakarya Serdivan', 'Hendek', 'Akyazı'],
  'Trabzon': ['Trabzon (Merkez)', 'Akçaabat', 'Of', 'Sürmene'],
  'Samsun': ['Samsun (Merkez)', 'Bafra', 'Çarşamba', 'Terme'],
  'Konya': ['Konya (Merkez)', 'Konya Meram', 'Konya Selçuklu', 'Ereğli', 'Akşehir'],
  'Kayseri': ['Kayseri (Merkez)', 'Kayseri Kocasinan', 'Kayseri Melikgazi', 'Develi'],
  'Hatay': ['Hatay Antakya', 'İskenderun', 'Dörtyol', 'Reyhanlı'],
};

function onIcraIlChange() {
  const il = document.getElementById('i-il').value;
  const adliyeWrap = document.getElementById('i-adliye-wrap');
  const adliyeSel  = document.getElementById('i-adliye');

  // Çoklu adliye olan iller için adliye seçiciyi göster
  const adliyeler = COKLU_ADLIYE[il];
  if (adliyeler && adliyeler.length > 1) {
    adliyeSel.innerHTML = '<option value="">Adliye seçin...</option>' +
      adliyeler.map(a => `<option value="${a}">${a}</option>`).join('');
    adliyeWrap.style.display = '';
  } else {
    adliyeSel.innerHTML = il ? `<option value="${escAttr(il)}">${escHtml(il)}</option>` : '';
    adliyeWrap.style.display = 'none';
  }
  onMahkemeIlChange('icra');
}

function onAdliyeIlChange() {
  const il = document.getElementById('d-il')?.value || '';
  const wrap = document.getElementById('d-adliye-wrap');
  const sel = document.getElementById('d-adliye');
  if (!wrap || !sel) return;
  
  const adliyeler = COKLU_ADLIYE[il];
  if (adliyeler && adliyeler.length > 1) {
    sel.innerHTML = '<option value="">Adliye seçin...</option>' + 
      adliyeler.map(a => `<option value="${a}">${a}</option>`).join('');
    wrap.style.display = '';
  } else {
    sel.innerHTML = `<option value="${escAttr(il)}">${escHtml(il)}</option>`;
    wrap.style.display = 'none';
  }
  buildMahkemeAdi('dava');
}

function buildMahkemeAdi(mod) {
  if (mod === 'dava') {
    const tur = document.getElementById('d-tur').value;
    const il = document.getElementById('d-il').value;
    const sira = document.getElementById('d-sira').value;
    const turMap = DAVA_TUR_MAP[tur];
    if (!turMap) return;
    // Üst derece
    if (['Danıştay','Yargıtay','Anayasa'].includes(tur)) {
      document.getElementById('d-mahkeme').value = turMap.ad;
      return;
    }
    if (!il) return;
    // Adliye seçimi varsa onu kullan
    const adliyeSel = document.getElementById('d-adliye');
    const adliyeAdi = (adliyeSel && adliyeSel.style.display !== 'none' && adliyeSel.value) ? adliyeSel.value : il;
    const ilsiz = ['Bölge Adliye', 'Bölge İdare', 'Fikri Mülkiyet'].includes(tur);
    if (ilsiz) {
      if (tur === 'Bölge Adliye') { buildIstinafMahkeme(); return; }
      document.getElementById('d-mahkeme').value = turMap.ad.replace('{il}', adliyeAdi).replace(' {sira}.', '');
      return;
    }
    if (!sira) return;
    document.getElementById('d-mahkeme').value =
      turMap.ad.replace('{il}', adliyeAdi).replace('{sira}', sira);
  } else {
    const il = document.getElementById('i-il').value;
    const sira = document.getElementById('i-sira').value;
    if (!il) return;
    // Adliye seçici açıksa adliye adını kullan, yoksa ili kullan
    const adliyeSel = document.getElementById('i-adliye');
    const adliyeWrap = document.getElementById('i-adliye-wrap');
    const adliyeAdi = (adliyeSel && adliyeWrap && adliyeWrap.style.display !== 'none' && adliyeSel.value)
      ? adliyeSel.value : il;
    const max = getMahkemeSayisi(il, 'İcra');
    if (max === 1 || !sira) {
      document.getElementById('i-mudurluk').value = adliyeAdi + ' İcra Müdürlüğü';
    } else {
      document.getElementById('i-mudurluk').value = adliyeAdi + ' ' + sira + '. İcra Müdürlüğü';
    }
  }
}

// İl select'lerini başlangıçta doldur
function initMahkemeSelects() {
  const ilOptions = '<option value="">İl seçin...</option>' + TR_ILLER.map(il => `<option value="${il}">${il}</option>`).join('');
  const iIl = document.getElementById('i-il');
  if (iIl) iIl.innerHTML = ilOptions;
  const dIl = document.getElementById('d-il');
  if (dIl) dIl.innerHTML = '<option value="">İl seçin...</option>' + TR_ILLER.map(il => `<option value="${il}">${il}</option>`).join('');
  const istinafIl = document.getElementById('d-istinaf-il');
  if (istinafIl) istinafIl.innerHTML = '<option value="">BAM İli seçin...</option>'
    + '<option value="Adana">Adana</option><option value="Ankara">Ankara</option><option value="Antalya">Antalya</option><option value="Bursa">Bursa</option><option value="Diyarbakır">Diyarbakır</option><option value="Erzurum">Erzurum</option><option value="Gaziantep">Gaziantep</option><option value="İstanbul">İstanbul</option><option value="İzmir">İzmir</option><option value="Konya">Konya</option><option value="Samsun">Samsun</option><option value="Sakarya">Sakarya</option><option value="Trabzon">Trabzon</option>';
}

// ========== 2025-2026 AAÜT VEKÂLETÜCRETİ HESAPLAMA ==========
// Kaynak: TBB Avukatlık Asgari Ücret Tarifesi 2024-2025 (RG: 03.10.2024)
// ========== 2025-2026 AAÜT (RG: 04.11.2025 / 33067) ==========
// Kaynak: TBB Avukatlık Asgari Ücret Tarifesi 2025-2026
const AAUT = {
  // 2. Kısım — Maktu ücretler (TL)
  maktu: {
    // Hukuk mahkemeleri
    'Sulh Hukuk': 30000,
    'Kira':       30000,   // Sulh hukuk kapsamında
    'Asliye Hukuk': 45000,
    'Aile':       45000,
    'İş':         45000,
    'Ticaret':    45000,   // Asliye mahkemesi kapsamında
    'Tüketici':   22500,
    'İcra Hukuk': 18000,   // İcra mahkemelerinde takip
    'Kadastro':   45000,
    'Fikri Mülkiyet': 55000,
    // Ceza mahkemeleri
    'Asliye Ceza':        45000,
    'Ağır Ceza':          65000,
    'Çocuk':              45000,
    'Çocuk Ağır Ceza':    65000,
    'Sulh Ceza Hâkimliği': 18000,
    // İdare & Vergi
    'İdare':  40000,   // duruşmalı; duruşmasız: 30000
    'Vergi':  40000,   // duruşmalı; duruşmasız: 30000
    // Üst derece
    'Bölge Adliye': 35000,   // ilk derecede; istinaf duruşmalı: 22000
    'Bölge İdare':  35000,
    'Yargıtay':     55000,   // duruşmalı; duruşmasız farklı
    'Danıştay':     55000,
    'Anayasa':      55000,
    '__default__':  45000
  },

  // 3. Kısım — Nispi ücret kademeli tablosu (4 Kasım 2025 tarife)
  // Kaynak: incekas ve kadimhukuk — ilk 150.000 TL %10, sonraki 150.000 TL %8,
  // devamında %8, %5, %3, %2, %1 olarak bildirilmiştir; tam resmi dilim eşikleri:
  nispiOran(degerTL) {
    if (!degerTL || degerTL <= 0) return 0;
    const d = Number(degerTL);
    // 2025-2026 AAÜT 3. kısım kademeli tablo
    // Eşik değerleri ve oranlar (resmi gazete 04.11.2025 baz alınmıştır)
    const kademeler = [
      { kadar: 600000,   oran: 0.16 }, // İlk 600k    → %16
      { kadar: 600000,   oran: 0.15 }, // Sonraki 600k → %15
      { kadar: 1200000,  oran: 0.14 }, // Sonraki 1.2m → %14
      { kadar: 1200000,  oran: 0.13 }, // Sonraki 1.2m → %13
      { kadar: 1800000,  oran: 0.11 }, // Sonraki 1.8m → %11
      { kadar: 2400000,  oran: 0.08 }, // Sonraki 2.4m → %8
      { kadar: 3000000,  oran: 0.05 }, // Sonraki 3m   → %5
      { kadar: 3600000,  oran: 0.03 }, // Sonraki 3.6m → %3
      { kadar: Infinity, oran: 0.02 }, // Üstü         → %2 (yeni eklenen dilim)
    ];
    let ucret = 0, kalan = d, oncekiLimit = 0;
    for (const k of kademeler) {
      if (kalan <= 0) break;
      const buDilimdeki = Math.min(kalan, k.limit - oncekiLimit);
      ucret += buDilimdeki * k.oran;
      kalan -= buDilimdeki;
      oncekiLimit = k.limit;
    }
    return Math.round(ucret);
  },

  hesapla(tur, deger, ucretTuru) {
    const maktu = this.maktu[tur] || this.maktu['__default__'];
    if (ucretTuru === 'nispi' && deger > 0) {
      const nispi = this.nispiOran(deger);
      return Math.max(nispi, maktu); // Nispi maktudan az olamaz
    }
    return maktu;
  },

  // İcra takibi için özel hesaplama (AAÜT m.11)
  // İcra dairesi genel takip: 9.000 TL maktu; tahliye: 20.000 TL
  // Konusu para olan icra: nispi ücret, ama maktu ücretin altına düşemez
  hesaplaIcra(alacak, tahliye = false) {
    if (tahliye) return 20000;
    if (!alacak || alacak <= 0) return 9000;
    const nispi = this.nispiOran(alacak);
    return Math.max(nispi, 9000);
  }
};

function hesaplaVekaletUcreti(mod) {
  if (mod === 'dava') {
    const tur = document.getElementById('d-tur').value;
    const ucretTuru = document.getElementById('d-ucret-tur').value;
    const deger = Number(document.getElementById('d-dava-degeri').value) || 0;
    const asgari = AAUT.hesapla(tur, deger, ucretTuru);
    document.getElementById('d-asgari-ucret').value = asgari > 0 ? fmt(asgari) + ' ₺' : '—';
    // Akdi ücret boşsa asgariyi öner
    const akdiEl = document.getElementById('d-akdi-ucret');
    if (!akdiEl.value) akdiEl.value = asgari || '';
    updateDavaFinans();
  }
}

function updateDavaFinans() {
  const akdi = Number(document.getElementById('d-akdi-ucret').value) || 0;
  const tahsil = Number(document.getElementById('d-tahsil-edilen').value) || 0;
  const masraf = Number(document.getElementById('d-masraf').value) || 0;
  document.getElementById('d-kalan-alacak').value = akdi - tahsil > 0 ? fmt(akdi - tahsil) + ' ₺' : '0 ₺';
  document.getElementById('d-net-kazanc').value = fmt(tahsil - masraf) + ' ₺';
}


function icraFaizSec() {
  const sel = document.getElementById('i-faiz-tur');
  const g = document.getElementById('i-faiz-ozel-g');
  const hid = document.getElementById('i-faiz');
  if (!sel) return;
  if (g) g.style.display = sel.value === '0' ? '' : 'none';
  if (hid && sel.value !== '0') hid.value = sel.value;
  updateIcraFinans();
}
function updateIcraFinans() {
  const alacak = parsePara(document.getElementById('i-alacak')?.value) || 0;
  const asgari = AAUT.hesaplaIcra(alacak);
  document.getElementById('i-asgari-ucret').value = fmt(asgari) + ' ₺';
  const akdi = Number(document.getElementById('i-akdi-ucret').value) || 0;
  const tahsil = Number(document.getElementById('i-tahsil-edilen').value) || 0;
  const masraf = Number(document.getElementById('i-masraf').value) || 0;
  document.getElementById('i-net-kazanc').value = fmt(tahsil - masraf) + ' ₺';
}

function switchKisilerTab(tab) {
  // Sekmeler
  document.getElementById('tab-muvekkiller').classList.toggle('active', tab === 'muvekkiller');
  document.getElementById('tab-digerkisiler').classList.toggle('active', tab === 'digerkisiler');
  // İçerikler
  document.getElementById('kisiler-tab-muvekkiller').style.display = tab === 'muvekkiller' ? '' : 'none';
  document.getElementById('kisiler-tab-digerkisiler').style.display = tab === 'digerkisiler' ? '' : 'none';
  // Topbar butonu handleTopbarAdd() tarafından yönetiliyor
  const btn = document.getElementById('topbar-add-btn');
  if (btn) {
    btn.onclick = handleTopbarAdd;
    btn.textContent = tab === 'muvekkiller' ? '+ Yeni Müvekkil' : '+ Yeni Kişi';
    btn.style.display = '';
  }
}

// ========== KİŞİLER ==========
function renderKisiler() {
  const kisiler = DB.get('kisiler');
  const contacts = DB.get('contacts');
  document.getElementById('kisiler-tbody').innerHTML = kisiler.length ? kisiler.map(k => {
    const ctCount = contacts.filter(c => c.accountId === k.id && c.accountType === 'kisi').length;
    return `
    <tr>
      <td data-label="Ad Soyad / Unvan"><strong style="color:var(--text)">${escHtml(k.ad)}</strong>${k.kurum ? `<div style="font-size:11px;color:var(--text3)">${escHtml(k.kurum)}</div>` : ''}</td>
      <td data-label="Rol"><span class="tag" style="background:rgba(28,26,23,0.12);color:var(--gold2)">${escHtml(k.rol)}</span></td>
      <td data-label="İlgili Dosya" style="font-size:12px;color:var(--text3)">${escHtml(k.dosya||'—')}</td>
      <td data-label="Telefon" style="font-size:12px">${escHtml(k.tel||'—')}</td>
      <td data-label="E-posta" style="font-size:12px">${escHtml(k.email||'—')}${ctCount > 0 ? `<span class="tag" style="background:rgba(58,107,140,0.15);color:#7ab5d4;margin-left:6px">👥 ${ctCount}</span>` : ''}</td>
      <td>
        <button class="btn btn-ghost" onclick="showKisiDetail('${k.id}')">Detay</button>
        <button class="btn btn-ghost" onclick="editKisi('${k.id}')">✏</button>
        <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteKisi('${k.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty"><div class="empty-icon">🧑‍⚖️</div><div class="empty-text">Henüz kişi eklenmedi</div></div></td></tr>`;
  updateKisilerDatalist();
}

function updateKisilerDatalist() {
  const dl = document.getElementById('kisiler-list-dl');
  if (!dl) return;
  const kisiler = DB.get('kisiler');
  dl.innerHTML = kisiler.map(k => `<option value="${escAttr(k.ad)}">${escHtml(k.ad)} (${escHtml(k.rol)})</option>`).join('');
}

// Davacı/Davalı/Alacaklı/Borçlu alanları için: kayıtlı müvekkiller, kişiler
// ve contactlardan isim önerileri üretir. Hangi kayıt türünden geldiği option
// etiketinde görünür; alan yine de serbest metindir (herhangi bir isim yazılabilir).
function updateTarafDatalist() {
  const dl = document.getElementById('taraf-list-dl');
  if (!dl) return;
  const isimler = [];
  (DB.get('muvekkiller')||[]).forEach(m => { if (m.ad) isimler.push({ad: m.ad, etiket: 'Müvekkil'}); });
  (DB.get('kisiler')||[]).forEach(k => { if (k.ad) isimler.push({ad: k.ad, etiket: k.rol||'Kişi'}); });
  (DB.get('contacts')||[]).forEach(c => { if (c.ad) isimler.push({ad: c.ad, etiket: 'Contact'}); });
  dl.innerHTML = isimler.map(x => `<option value="${escAttr(x.ad)}">${escHtml(x.ad)} (${escHtml(x.etiket)})</option>`).join('');
}

async function saveKisi() {
  const ad = document.getElementById('k-ad').value.trim();
  if (!ad) return notify('Ad Soyad zorunludur!');
  const obj = {
    id: editingId || DB.genId(),
    ad,
    rol: document.getElementById('k-rol').value,
    dosya: document.getElementById('k-dosya').value,
    tel: document.getElementById('k-tel').value,
    email: document.getElementById('k-email').value,
    kurum: document.getElementById('k-kurum').value,
    notlar: document.getElementById('k-notlar').value,
    tarih: new Date().toISOString()
  };
  const { error } = await _supabaseClient.from('kisiler').upsert(_sbKisiToRow(obj));
  if (error) { console.error('Kişi kaydedilemedi:', error); return notify('❌ Kişi kaydedilemedi: ' + (error.message||'bilinmeyen hata')); }
  let arr = DB.get('kisiler');
  if (editingId) arr = arr.map(x => x.id === editingId ? obj : x);
  else arr = [obj, ...arr];
  DB.set('kisiler', arr);
  closeModal('modal-kisi');
  renderKisiler();
  notify(editingId ? 'Kişi güncellendi' : 'Kişi eklendi ✓');
  editingId = null;
}

function editKisi(id) {
  const k = DB.get('kisiler').find(x => x.id === id);
  if (!k) return;
  editingId = id;
  document.getElementById('k-ad').value = k.ad;
  document.getElementById('k-rol').value = k.rol;
  document.getElementById('k-dosya').value = k.dosya || '';
  document.getElementById('k-tel').value = k.tel || '';
  document.getElementById('k-email').value = k.email || '';
  document.getElementById('k-kurum').value = k.kurum || '';
  document.getElementById('k-notlar').value = k.notlar || '';
  document.getElementById('modal-kisi-title').textContent = 'Kişiyi Düzenle';
  openModal('modal-kisi');
}

function deleteKisi(id) {
  showConfirmModal('Bu kişiyi silmek istediğinizden emin misiniz?', async function() {
    const { error } = await _supabaseClient.from('kisiler').delete().eq('id', id);
    if (error) { console.error('Kişi silinemedi:', error); return notify('❌ Kişi silinemedi: ' + (error.message||'bilinmeyen hata')); }
    // İlgili kişileri Supabase'den de sil — contacts diff-sync'li DEĞİL,
    // yalnız cache'ten silinirse sayfa yenilenince geri gelir
    await _supabaseClient.from('contacts').delete().eq('account_id', id);
    DB.set('kisiler', DB.get('kisiler').filter(x => x.id !== id));
    DB.set('contacts', (DB.get('contacts')||[]).filter(function(c){ return c.accountId !== id; }));
    renderKisiler();
    notify('Kişi silindi');
  });
}

// ========== DAVA DASHBOARDU ==========
function populateDavaDashCesit() {
  const sel = document.getElementById('davadash-cesit');
  if (!sel) return;
  const cur = sel.value;

  // DAVA_CESITLERI'nden tüm seçenekleri gruplu olarak doldur
  let html = '<option value="">Tüm Dava Çeşitleri</option>';
  for (const [mahkeme, cesitler] of Object.entries(DAVA_CESITLERI)) {
    html += `<optgroup label="── ${mahkeme}">`;
    cesitler.forEach(c => {
      if (c === 'Diğer / Manuel Giriş') return; // bunları atla
      html += `<option value="${c}"${c === cur ? ' selected' : ''}>${c}</option>`;
    });
    html += '</optgroup>';
  }
  sel.innerHTML = html;
}

// Bu fonksiyon renderDavaDash içinde KPI bölümünü değiştirir
// 4 KPI → 3 KPI + Günlük Görevler Donut
// Bekleyen Görevler paneli → Bu Haftaki Görevler (liste)

// Renk paleti dosyalara göre (tutarlı)
var DOSYA_RENKLER = [
  '#1c1a17','#7ab5d4','#7dc495','#9c968d','#e8a04d',
  '#d4756b','#5fa8a0','#b0c45a','#a882c8','#6ba5d4'
];

function gorevDonut(gorevler, today, boyut) {
  boyut = boyut || 120;
  var r = boyut/2 - 8;
  var cx = boyut/2, cy = boyut/2;
  var bugun = gorevler.filter(function(t){
    if(!t.tarih) return false;
    var d = Math.ceil((new Date(t.tarih.slice(0,10))-today)/86400000);
    return d === 0;
  });
  var total = bugun.length;
  
  if(total === 0) {
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:'+boyut+'px;gap:4px">'
      +'<div style="font-size:28px">☀️</div>'
      +'<div style="font-size:11px;color:var(--text3)">Bugün görev yok</div>'
      +'</div>';
  }

  // Her göreve benzersiz renk (dosyaya göre grupla)
  var dosyaRenkMap = {};
  var renkSayaci = 0;
  bugun.forEach(function(t){
    var key = t.ilgili || '__genel__';
    if(!dosyaRenkMap[key]) {
      dosyaRenkMap[key] = DOSYA_RENKLER[renkSayaci % DOSYA_RENKLER.length];
      renkSayaci++;
    }
  });

  // SVG path hesapla
  var dilimAci = (2 * Math.PI) / total;
  var paths = '';
  var bosluk = 0.04; // dilimler arası boşluk (radyan)
  
  bugun.forEach(function(t, idx){
    var basAci = idx * dilimAci - Math.PI/2 + bosluk/2;
    var bitAci = basAci + dilimAci - bosluk;
    var key = t.ilgili || '__genel__';
    var renk = dosyaRenkMap[key];
    var gecikti = t.tarih && Math.ceil((new Date(t.tarih.slice(0,10))-today)/86400000) < 0;
    var tamam = t.done;
    
    var x1 = cx + r * Math.cos(basAci);
    var y1 = cy + r * Math.sin(basAci);
    var x2 = cx + r * Math.cos(bitAci);
    var y2 = cy + r * Math.sin(bitAci);
    var largeArc = dilimAci - bosluk > Math.PI ? 1 : 0;
    
    // İç boşluk için iç yarıçap
    var ri = r * 0.55;
    var x3 = cx + ri * Math.cos(bitAci);
    var y3 = cy + ri * Math.sin(bitAci);
    var x4 = cx + ri * Math.cos(basAci);
    var y4 = cy + ri * Math.sin(basAci);

    var opacity = tamam ? 0.3 : 1;
    var dash = gecikti ? 'stroke-dasharray="3,2" stroke="rgba(192,83,58,0.6)" stroke-width="2"' : '';
    
    paths += '<path d="M '+x1+' '+y1+' A '+r+' '+r+' 0 '+largeArc+' 1 '+x2+' '+y2
      +' L '+x3+' '+y3+' A '+ri+' '+ri+' 0 '+largeArc+' 0 '+x4+' '+y4+' Z"'
      +' fill="'+renk+'" opacity="'+opacity+'" '+dash+'/>';
  });

  // Ortada bugünün sayısı
  var tamamlanan = bugun.filter(function(t){return t.done;}).length;
  var kalan = total - tamamlanan;

  return '<div style="position:relative;display:inline-flex;align-items:center;justify-content:center">'
    +'<svg width="'+boyut+'" height="'+boyut+'" viewBox="0 0 '+boyut+' '+boyut+'">'
    +paths
    +'</svg>'
    +'<div style="position:absolute;text-align:center;pointer-events:none">'
    +'<div style="font-size:20px;font-weight:900;color:var(--text);line-height:1">'+kalan+'</div>'
    +'<div style="font-size:9px;color:var(--text3);margin-top:1px">kalan</div>'
    +'</div>'
    +'</div>';
}

// Bu haftaki görevler listesi
