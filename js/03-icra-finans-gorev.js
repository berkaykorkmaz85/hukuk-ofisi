// Bu dosya index.html'den ayrildi (kod tasinmadan, sadece dosya sinirlari
// eklendi) — tek dosyanin git diff/inceleme/gezinme zorlugunu azaltmak icin.
// Yukleme sirasi index.html'deki eski calisma sirasiyla AYNIDIR, degistirmeyin.

async function tepkiVer(postId, davaId, emoji, isReply) {
  const key = 'chatter_' + davaId;
  let arr = DB.get(key) || [];
  const me = window.currentUser?.username || 'avukat';
  let yeniTepkiler = null;
  arr = arr.map(p => {
    if (p.id !== postId) return p;
    const tepkiler = { ...(p.tepkiler || {}) };
    const users = [...(tepkiler[emoji] || [])];
    const idx = users.indexOf(me);
    if (idx >= 0) users.splice(idx, 1); else users.push(me);
    tepkiler[emoji] = users;
    yeniTepkiler = tepkiler;
    return { ...p, tepkiler };
  });
  if (yeniTepkiler) {
    const { error } = await _supabaseClient.from('dosya_chatter').update({ tepkiler: yeniTepkiler }).eq('id', postId);
    if (error) { console.error('Tepki kaydedilemedi:', error); return; }
  }
  DB.set(key, arr);
  renderChatter(davaId);
}


function renderReply(reply, davaId) {
  const initials = reply.yazar ? reply.yazar.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() : 'AV';
  return `
    <div class="chatter-post reply" id="post-${reply.id}">
      <div class="chatter-post-header">
        <div class="chatter-avatar reply-av">${initials}</div>
        <div class="chatter-meta">
          <div class="chatter-author">${reply.yazar || 'Avukat'}</div>
          <div class="chatter-time">${fmtDate(reply.tarih)}${reply.duzenlemeTarih ? ' · <span style="color:var(--text3);font-style:italic">düzenlendi</span>' : ''}</div>
        </div>
      </div>
      <div class="chatter-body" id="cbody-${reply.id}">${escHtml(reply.metin)}</div>
      ${renderTepkiBar(reply, davaId, true)}
      <div class="chatter-actions" id="cactions-${reply.id}">
        <button class="chatter-btn reply-btn" onclick="startReply('${reply.id}','${escHtml(reply.yazar||'Avukat')}')">↩ Yanıtla</button>
        <button class="chatter-btn" onclick="startChatterEdit('${reply.id}','${davaId}')">✏ Düzenle</button>
        <button class="chatter-btn del-btn" onclick="deletePost('${reply.id}','${davaId}')">🗑 Sil</button>
      </div>
    </div>`;
}

function startChatterEdit(postId, davaId) {
  const key = 'chatter_' + davaId;
  const post = (DB.get(key) || []).find(p => p.id === postId);
  if (!post) return;

  const bodyEl = document.getElementById('cbody-' + postId);
  const actionsEl = document.getElementById('cactions-' + postId);
  if (!bodyEl) return;

  // Body'yi textarea'ya çevir
  bodyEl.innerHTML = `<textarea class="chatter-edit-area" id="cedit-${escHtml(postId)}">${escHtml(post.metin)}</textarea>
    <div class="chatter-edit-row">
      <button class="info-inline-save" onclick="saveChatterEdit('${escHtml(postId)}','${escHtml(davaId)}')">✓ Kaydet</button>
      <button class="info-inline-cancel" onclick="renderChatter('${escHtml(davaId)}')">İptal</button>
    </div>`;
  actionsEl.style.display = 'none';

  const ta = document.getElementById('cedit-' + postId);
  if (ta) {
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') saveChatterEdit(postId, davaId);
      if (e.key === 'Escape') renderChatter(davaId);
    });
  }
}

async function saveChatterEdit(postId, davaId) {
  const ta = document.getElementById('cedit-' + postId);
  if (!ta) return;
  const yeniMetin = ta.value.trim();
  if (!yeniMetin) return notify('Not boş olamaz!');

  const duzenlemeTarih = new Date().toISOString();
  const { error } = await _supabaseClient.from('dosya_chatter')
    .update({ metin: yeniMetin, duzenleme_tarih: duzenlemeTarih }).eq('id', postId);
  if (error) { console.error('Not güncellenemedi:', error); return notify('❌ Not güncellenemedi: ' + (error.message||'bilinmeyen hata')); }

  const key = 'chatter_' + davaId;
  let arr = DB.get(key) || [];
  arr = arr.map(p => p.id === postId
    ? { ...p, metin: yeniMetin, duzenlemeTarih }
    : p
  );
  DB.set(key, arr);
  renderChatter(davaId);
  notify('Not güncellendi ✓');
}

async function sendChatterPost() {
  const metin = document.getElementById('chatter-input').value.trim();
  const dosyalar = window._chatterEkler.filter(function(e){ return !e.yukleniyor && e.url; });
  if (!metin && !dosyalar.length) return;
  if (!currentDavaId) return;

  // Dosyalar zaten yüklendi, URL'lerini kullan
  let ekler = dosyalar;

  const allPosts = DB.get('chatter_' + currentDavaId) || [];
  let parentYazar = null, parentMetin = null;
  if (replyToPostId) {
    const parent = allPosts.find(p => p.id === replyToPostId);
    if (parent) { parentYazar = parent.yazar; parentMetin = (parent.metin||'').slice(0,100); }
  }
  const post = {
    id: DB.genId(), parentId: replyToPostId || null,
    parentYazar, parentMetin,
    yazar: window.currentUser?.adSoyad || window.currentUser?.username || 'Avukat',
    metin: metin || '',
    ekler: ekler,
    tarih: new Date().toISOString()
  };
  const { error } = await _supabaseClient.from('dosya_chatter').insert(_sbPostToChatterRow(post, 'dava', currentDavaId));
  if (error) { console.error('Mesaj gönderilemedi:', error); return notify('❌ Mesaj gönderilemedi: ' + (error.message||'bilinmeyen hata')); }
  const arr = [...allPosts, post];
  DB.set('chatter_' + currentDavaId, arr);
  document.getElementById('chatter-input').value = '';
  // Dosya önizlemelerini temizle
  chatterDosyaTemizle('dava');
  cancelReply();
  renderChatter(currentDavaId);
  document.getElementById('ddp-post-count').textContent = arr.length + ' mesaj';
}


function cancelReply() {
  replyToPostId = null;
  document.getElementById('chatter-reply-banner').style.display = 'none';
  document.getElementById('chatter-input').placeholder = 'Mesaj yaz... (Enter = gönder)';
}

// Supabase Storage'dan dosya sil
async function chatterSupabaseSil(yol) {
  if (!yol || !window._supabaseToken) return;
  try {
    await fetch(SUPABASE_URL + '/storage/v1/object/chatter-files/' + yol, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer ' + window._supabaseToken,
        'apikey': SUPABASE_ANON_KEY
      }
    });
  } catch(e) { console.warn('Dosya silinemedi:', yol); }
}

// Bir postun TÜM alt zincirini (yanıtlar + yanıtların yanıtları) bul.
// DB'de cascade tüm torunları sildiği için yerel temizlik ve Storage ek
// silme de aynı kümeyi kapsamalı — eskiden yalnız doğrudan yanıtlar
// temizleniyor, torun yanıtların ekleri Storage'da yetim kalıyordu.
function _chAltlariBul(postId, arr) {
  var ids = [postId];
  var degisti = true;
  while (degisti) {
    degisti = false;
    arr.forEach(function(p) {
      if (p.parentId && ids.indexOf(p.parentId) >= 0 && ids.indexOf(p.id) < 0) {
        ids.push(p.id);
        degisti = true;
      }
    });
  }
  return ids;
}

async function deletePost(postId, davaId) {
  showConfirmModal('Bu mesajı silmek istediğinizden emin misiniz?', async function() {
  const key = 'chatter_' + davaId;
  let arr = DB.get(key) || [];
  // Silinecek postların (tüm alt zincir dahil) eklerini Storage'dan da sil
  const silinecekIds = _chAltlariBul(postId, arr);
  const silinecekler = arr.filter(p => silinecekIds.indexOf(p.id) >= 0);
  for (const post of silinecekler) {
    if (post.ekler && post.ekler.length) {
      for (const ek of post.ekler) {
        if (ek.yol) await chatterSupabaseSil(ek.yol);
      }
    }
  }
  // dosya_chatter tablosundan sil — parent_id "on delete cascade" olduğu için
  // ana postu silmek tüm yanıt zincirini de siler.
  const { error } = await _supabaseClient.from('dosya_chatter').delete().eq('id', postId);
  if (error) { console.error('Mesaj silinemedi:', error); notify('❌ Mesaj silinemedi: ' + (error.message||'bilinmeyen hata')); return; }
  arr = arr.filter(p => silinecekIds.indexOf(p.id) < 0);
  DB.set(key, arr);
  renderChatter(davaId);
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/\n/g,'<br>');
}
// HTML attribute değerleri için escape — \n→<br> yapılmaz
function escAttr(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Eski showDavaDetail — dashboard'dan çağrılanlar için yönlendir
function showDavaDetail(id) { openDavaDetailPage(id); }

function editDava(id) {
  const d = DB.get('davalar').find(x=>x.id===id);
  if (!d) return;
  editingId = id;
  populateMuvekkilSelects();
  ['no','ad','konu','mahkeme','esas','durusma','sonraki','notlar'].forEach(f => {
    const el = document.getElementById('d-'+f);
    if (el) el.value = d[f]||'';
  });
  const _taraf = _davaTarafPair(d);
  document.getElementById('d-davaci').value = _taraf.davaci;
  document.getElementById('d-davali').value = _taraf.davali;
  document.getElementById('d-taraf').value = d.taraf || 'davaci';
  document.getElementById('d-durum').value = d.durum;
  const turEl = document.getElementById('d-tur');
  turEl.value = d.tur||'Asliye Hukuk';
  onDavaTuruChange();
  document.getElementById('d-mahkeme').value = d.mahkeme||'';
  if (d.yargiKolu) document.getElementById('d-yargi-kolu').value = d.yargiKolu;
  // Dava çeşidini geri yükle
  if (d.cesit) {
    const cesitSel = document.getElementById('d-cesit');
    const opt = Array.from(cesitSel.options).find(o => o.value === d.cesit);
    if (opt) cesitSel.value = d.cesit;
  }
  // İstinaf
  document.getElementById('d-istinaf-mahkeme').value = d.istinafMahkeme || '';
  document.getElementById('d-istinaf-esas').value = d.istinafEsas || '';
  // Temyiz
  document.getElementById('d-temyiz-mahkeme').value = d.temyizMahkeme || '';
  document.getElementById('d-temyiz-esas').value = d.temyizEsas || '';
  if (d.temyizMahkeme) {
    if (d.temyizMahkeme.startsWith('Yargıtay')) document.getElementById('d-temyiz-merci').value = 'Yargıtay';
    else if (d.temyizMahkeme.startsWith('Danıştay')) document.getElementById('d-temyiz-merci').value = 'Danıştay';
    else if (d.temyizMahkeme.startsWith('Anayasa')) document.getElementById('d-temyiz-merci').value = 'Anayasa Mahkemesi';
    onTemyizMerciChange();
  }
  // Finans
  document.getElementById('d-ucret-tur').value = d.ucretTuru || 'maktu';
  document.getElementById('d-dava-degeri').value = d.davaDegeri || '';
  document.getElementById('d-akdi-ucret').value = d.akdiUcret || '';
  document.getElementById('d-tahsil-edilen').value = d.tahsilEdilen || '';
  document.getElementById('d-masraf').value = d.masraf || '';
  document.getElementById('d-masraf-aciklama').value = d.masrafAciklama || '';
  // Ödeme şekli ve taksit bilgilerini geri yükle — eskiden yüklenmediği için
  // her düzenlemede kayboluyordu
  const odemeSekliEl = document.getElementById('d-odeme-sekli');
  if (odemeSekliEl) { odemeSekliEl.value = d.odemeSekli || ''; try { davaOdemeSekliDegis(); } catch(e) {} }
  const taksitSayiEl = document.getElementById('d-taksit-sayi');
  if (taksitSayiEl) taksitSayiEl.value = d.taksitSayisi || '';
  const taksitBasEl = document.getElementById('d-taksit-baslangic');
  if (taksitBasEl) taksitBasEl.value = d.taksitBaslangic || '';
  const pesinatEl = document.getElementById('d-pesinat-tutar');
  if (pesinatEl) pesinatEl.value = d.pesinatTutar || '';
  hesaplaVekaletUcreti('dava');
  // Kişiler
  document.getElementById('d-hakim').value = d.hakim || '';
  document.getElementById('d-savci').value = d.savci || '';
  document.getElementById('d-karsi-avukat').value = d.karsiAvukat || '';
  document.getElementById('d-bilirkisi').value = d.bilirkisi || '';
  document.getElementById('d-arabulucu').value = d.arabulucu || '';
  document.getElementById('d-diger-kisi').value = d.digerKisi || '';
  document.getElementById('modal-dava-title').textContent = 'Davayı Düzenle';
  openModal('modal-dava');
}

function bkOtomatikVer() {
  const davalar = DB.get('davalar');
  const nums = davalar.map(d => {
    const m = (d.no||'').match(/^BK(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const no = 'BK' + String(next).padStart(3,'0');
  document.getElementById('d-no').value = no;
  davaAdOtomatic();
  notify('Büro No: ' + no);
}

function saveDava() { withSaveLock('saveDava', _saveDavaInner); }
async function _saveDavaInner() {
  // Zorunlu alan kontrolü: taraf ismi olmadan dava kaydedilemez
  const davaci = document.getElementById('d-davaci').value.trim();
  const davali = document.getElementById('d-davali').value.trim();
  const taraf = document.getElementById('d-taraf').value || 'davaci';
  const muvekkil = taraf === 'davali' ? davali : davaci;
  const karsi = taraf === 'davali' ? davaci : davali;
  if (!muvekkil) return notify('⚠️ Müvekkilimiz olan tarafın adı zorunludur (' + (taraf==='davali'?'Davalı':'Davacı') + ')!');
  const konu = document.getElementById('d-konu').value.trim();
  if (!konu) return notify('⚠️ Dava konusu zorunludur!');
  let no = document.getElementById('d-no').value.trim();
  if (!no) {
    const existing = DB.get('davalar');
    const nums = existing.map(x => { const m = (x.no||'').match(/BK(\d+)/); return m ? parseInt(m[1]) : 0; });
    no = 'BK' + String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3,'0');
  }
  const tur = document.getElementById('d-tur').value || 'Asliye Hukuk';
  const yargiKolu = DAVA_TUR_MAP[tur] ? DAVA_TUR_MAP[tur].yargi : '';
  const cesitVal = document.getElementById('d-cesit').value;
  const cesit = (cesitVal && cesitVal !== '__diger__') ? cesitVal : '';
  // Düzenlemede orijinal oluşturma tarihini koru — dosya yaşı sıfırlanmasın
  const eskiDava = editingId ? DB.get('davalar').find(x => x.id === editingId) : null;
  const obj = {
    id: editingId || DB.genId(),
    no, konu, cesit,
    ad: (function(){
      const mahkeme = document.getElementById('d-mahkeme').value || '';
      const esas = document.getElementById('d-esas').value || '';
      const kisaltma = mahkeme
        .replace('Asliye Ticaret Mahkemesi','ATM').replace('Asliye Hukuk Mahkemesi','AHM')
        .replace('Sulh Hukuk Mahkemesi','SHM').replace('Ağır Ceza Mahkemesi','ACM')
        .replace('Asliye Ceza Mahkemesi','ACzM').replace('Aile Mahkemesi','AM')
        .replace('İş Mahkemesi','İş Mah.').replace('Tüketici Mahkemesi','TM')
        .replace('İcra Hukuk Mahkemesi','İHM').replace('İdare Mahkemesi','İdM')
        .replace('Vergi Mahkemesi','VM').replace('Kadastro Mahkemesi','KM')
        .replace('Çocuk Mahkemesi','ÇM').replace('Fikri ve Sınai Haklar Mahkemesi','FSHM')
        .replace('Mahkemesi','Mah.');
      // Dosya adı her zaman "Davacı vs Davalı" sırasıyla oluşur — hangi tarafın
      // müvekkilimiz olduğuna bakılmaksızın
      const parts = [];
      if(davaci) parts.push(davaci);
      if(davali) parts.push('vs '+davali);
      if(kisaltma) parts.push(kisaltma);
      if(esas) parts.push(esas);
      return parts.join(' – ');
    })(),
    muvekkil, karsi, davaci, davali, taraf,
    mahkeme: document.getElementById('d-mahkeme').value,
    esas: document.getElementById('d-esas').value,
    durusma: document.getElementById('d-durusma').value,
    sonraki: document.getElementById('d-sonraki').value,
    durum: document.getElementById('d-durum').value,
    tur, yargiKolu,
    istinafMahkeme: document.getElementById('d-istinaf-mahkeme').value,
    istinafEsas: document.getElementById('d-istinaf-esas').value,
    temyizMahkeme: document.getElementById('d-temyiz-mahkeme').value,
    temyizEsas: document.getElementById('d-temyiz-esas').value,
    // Finans
    ucretTuru: document.getElementById('d-ucret-tur').value,
    davaDegeri: document.getElementById('d-dava-degeri').value,
    akdiUcret: document.getElementById('d-akdi-ucret').value,
    odemeSekli: (document.getElementById('d-odeme-sekli') && document.getElementById('d-odeme-sekli').value) || '',
    taksitSayisi: parseInt(document.getElementById('d-taksit-sayi')?.value)||0,
    taksitBaslangic: document.getElementById('d-taksit-baslangic')?.value||'',
    pesinatTutar: parseFloat(document.getElementById('d-pesinat-tutar')?.value)||0,
    tahsilEdilen: document.getElementById('d-tahsil-edilen').value,
    masraf: document.getElementById('d-masraf').value,
    masrafAciklama: document.getElementById('d-masraf-aciklama').value,
    // Kişiler
    hakim: document.getElementById('d-hakim').value,
    savci: document.getElementById('d-savci').value,
    karsiAvukat: document.getElementById('d-karsi-avukat').value,
    bilirkisi: document.getElementById('d-bilirkisi').value,
    arabulucu: document.getElementById('d-arabulucu').value,
    arabulucuNo: document.getElementById('d-arabulucu-no')?.value || '',
    digerKisi: document.getElementById('d-diger-kisi').value,
    notlar: document.getElementById('d-notlar').value,
    tarih: (eskiDava && eskiDava.tarih) || new Date().toISOString()
  };
  // Formda alanı olmayan bilgiler (not kartları vb.) düzenlemede kaybolmasın
  if (eskiDava) {
    ['sonDurum','sonrakiAdim','strateji','arabuluculuk','_sonDurumTarih','_sonrakiAdimTarih','_stratejiTarih','_arabuluculukTarih'].forEach(f => {
      if (obj[f] === undefined && eskiDava[f] !== undefined) obj[f] = eskiDava[f];
    });
  }
  // Supabase'e yaz
  const row = _sbDavaToRow(obj);
  const { error } = await _supabaseClient.from('davalar').upsert(row);
  if (error) {
    console.error('Dava kaydedilemedi:', error);
    return notify('❌ Dava kaydedilemedi: ' + (error.message || 'bilinmeyen hata'));
  }
  let arr = DB.get('davalar');
  if (editingId) arr = arr.map(x=>x.id===editingId?obj:x);
  else arr = [obj, ...arr];
  DB.set('davalar', arr);
  const wasEditing = !!editingId;
  const editedId = editingId || obj.id;
  // Taksit planı oluştur — yeni ekleme veya ödeme şekli taksitli ise
  if (!wasEditing && obj.odemeSekli === 'taksit' && obj.taksitSayisi > 0 && obj.akdiUcret > 0) {
    davaOdemePlaniOlustur(obj);
  }

  closeModal('modal-dava');
  renderDavalar();
  notify(wasEditing ? 'Dava güncellendi ✓' : 'Dava eklendi ✓');
  editingId = null;
  // Eğer dava detay sayfası açıksa, orayı yenile (sayfayı değiştirme)
  if (wasEditing && currentDavaId && currentDavaId === editedId) {
    renderDavaDetailPage(editedId);
  }
}

// Ödeme şekli değişince taksit alanlarını göster/gizle
function davaOdemeSekliDegis() {
  var sekli = document.getElementById('d-odeme-sekli').value;
  var taksitWrap = document.getElementById('d-taksit-wrap');
  var baslangicWrap = document.getElementById('d-taksit-baslangic-wrap');
  var pesinatWrap = document.getElementById('d-pesinat-wrap');
  
  // Hepsini gizle
  taksitWrap.style.display = 'none';
  baslangicWrap.style.display = 'none';
  pesinatWrap.style.display = 'none';
  
  if (sekli === 'taksit') {
    taksitWrap.style.display = '';
    baslangicWrap.style.display = '';
    pesinatWrap.style.display = '';
    // Varsayılan değerler
    if (!document.getElementById('d-taksit-sayi').value) {
      document.getElementById('d-taksit-sayi').value = '12';
    }
    if (!document.getElementById('d-taksit-baslangic').value) {
      var nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      document.getElementById('d-taksit-baslangic').value = nextMonth.toISOString().slice(0,10);
    }
  } else if (sekli === 'aylik') {
    taksitWrap.style.display = '';
    baslangicWrap.style.display = '';
    if (!document.getElementById('d-taksit-sayi').value) {
      document.getElementById('d-taksit-sayi').value = '12';
    }
    if (!document.getElementById('d-taksit-baslangic').value) {
      var nextMonth2 = new Date();
      nextMonth2.setMonth(nextMonth2.getMonth() + 1);
      document.getElementById('d-taksit-baslangic').value = nextMonth2.toISOString().slice(0,10);
    }
  } else if (sekli === 'pesinat') {
    pesinatWrap.style.display = '';
    baslangicWrap.style.display = '';
  }
}

// Taksit ödeme planını finans sayfasına kaydet
function davaOdemePlaniOlustur(dava) {
  var akdiUcret = parseFloat(dava.akdiUcret) || 0;
  var pesinat = parseFloat(dava.pesinatTutar) || 0;
  var taksitSayisi = parseInt(dava.taksitSayisi) || 1;
  var baslangic = dava.taksitBaslangic ? new Date(dava.taksitBaslangic) : new Date();
  var kalan = akdiUcret - pesinat;
  var taksitTutar = taksitSayisi > 0 ? Math.round((kalan / taksitSayisi) * 100) / 100 : 0;

  var finans = DB.get('finans') || [];
  var planId = DB.genId();

  // Peşinat varsa ekle — peşinat tanım gereği tahsil edilmiştir
  if (pesinat > 0) {
    finans.push({
      id: DB.genId(),
      planId: planId,
      davaId: dava.id,
      muvekkil: dava.muvekkil,
      tur: 'Taksit Planı',
      aciklama: dava.no + ' — Peşinat',
      tutar: pesinat,
      tarih: new Date().toISOString().slice(0,10),
      taksitNo: 0,
      taksitDurumu: 'odendi',
      odemeSekli: 'taksit'
    });
  }

  // Taksitler
  for (var i = 1; i <= taksitSayisi; i++) {
    var tarih = new Date(baslangic);
    tarih.setMonth(tarih.getMonth() + (i - 1));
    finans.push({
      id: DB.genId(),
      planId: planId,
      davaId: dava.id,
      muvekkil: dava.muvekkil,
      tur: 'Taksit Planı',
      aciklama: dava.no + ' — ' + i + '. Taksit (' + taksitSayisi + ' taksit)',
      tutar: i === taksitSayisi ? (kalan - taksitTutar * (taksitSayisi - 1)) : taksitTutar,
      tarih: tarih.toISOString().slice(0,10),
      taksitNo: i,
      taksitDurumu: 'bekliyor',
      odemeSekli: 'taksit',
      planAciklama: dava.no + ' · ' + taksitSayisi + ' taksit · ₺' + taksitTutar.toLocaleString('tr-TR') + '/ay'
    });
  }

  DB.set('finans', finans);
  notify('✅ ' + taksitSayisi + ' taksitli ödeme planı finansa eklendi!');
}

// Bir dava/icra dosyası silinirken ona bağlı tüm kayıtları temizle.
// tasks/belgeler/finans/odeme_planlari/icra_belgeler/icra_masraflar diff-sync'li
// olduğundan DB.set ile yerelden çıkarmak Supabase'den de siler; dosya günlüğü
// (chatter) satırları ve Storage'daki ekler ayrıca temizlenir.
async function _dosyaIliskiliVerileriSil(tip, id, dosyaNo) {
  try {
    const posts = await _sbYukleChatter(tip, id);
    for (const p of (posts || [])) {
      for (const ek of (p.ekler || [])) { if (ek.yol) await chatterSupabaseSil(ek.yol); }
    }
    await _supabaseClient.from('dosya_chatter').delete().eq('dosya_tipi', tip).eq('dosya_id', id);
    delete window._sbCache.chatter[(tip === 'icra' ? 'icra_chatter_' : 'chatter_') + id];
  } catch(e) { console.warn('Dosya günlüğü temizlenemedi:', e); }

  if (tip === 'dava') {
    const belgeler = DB.get('belgeler') || [];
    for (const b of belgeler) { if (b.davaId === id && b.yol) await chatterSupabaseSil(b.yol); }
    DB.set('belgeler', belgeler.filter(b => b.davaId !== id));
    DB.set('finans', (DB.get('finans')||[]).filter(f => !(f.davaId === id || (dosyaNo && f.ilgili === dosyaNo))));
  } else {
    DB.set('icra_belgeler', (DB.get('icra_belgeler')||[]).filter(b => b.icraId !== id));
    DB.set('icra_masraflar', (DB.get('icra_masraflar')||[]).filter(m => m.icraId !== id));
    DB.set('finans', (DB.get('finans')||[]).filter(f => !(f.icraId === id || (dosyaNo && f.ilgili === dosyaNo))));
    localStorage.removeItem('icra_haciz_' + id);
    localStorage.removeItem('icra_kapak_' + id);
  }
  DB.set('tasks', (DB.get('tasks')||[]).filter(t => !(t.ilgili && (t.ilgili === id || (dosyaNo && t.ilgili === dosyaNo)))));
  if (dosyaNo) {
    DB.set('odeme_planlari', (DB.get('odeme_planlari')||[]).filter(p => p.dosya !== dosyaNo));
    // UETS kayıtları dosyaNo string eşleşmesiyle bağlanır (davaId alanı hiç
    // kullanılmıyor — bkz. _uetsKaydet)
    DB.set('uets_kayitlar', (DB.get('uets_kayitlar')||[]).filter(k => k.dosyaNo !== dosyaNo));
  }
}

function deleteDava(id) {
  showConfirmModal('Bu dava dosyası ve ona bağlı görevler, belgeler, finans kayıtları ile dosya günlüğü kalıcı olarak silinecek. Emin misiniz?', async function() {
    const d = DB.get('davalar').find(x => x.id === id);
    const { error } = await _supabaseClient.from('davalar').delete().eq('id', id);
    if (error) {
      console.error('Dava silinemedi:', error);
      return notify('❌ Dava silinemedi: ' + (error.message || 'bilinmeyen hata'));
    }
    DB.set('davalar', DB.get('davalar').filter(x=>x.id!==id));
    await _dosyaIliskiliVerileriSil('dava', id, d ? d.no : '');
    var ddp = document.getElementById('dava-detail-page');
    if (ddp && ddp.classList.contains('open')) {
      ddp.classList.remove('open');
      var ddpCtxDel = document.getElementById('ddp-topbar-context');
      if (ddpCtxDel) ddpCtxDel.style.display = 'none';
      currentDavaId = null;
    }
    showPage('davalar');
    renderDavalar();
    notify('Dava ve bağlı kayıtları silindi');
  });
}

// ========== İCRALAR ==========
function renderIcralar() {
  const icralar = DB.get('icralar');
  populateMuvekkilSelects();
  document.getElementById('icra-tbody').innerHTML = icralar.length ? icralar.map(i=>{
    const tp = _icraTarafPair(i);
    const borcluCell = i.taraf==='borclu'
      ? `<span style="color:var(--gold);cursor:pointer" onclick="event.stopPropagation();gotoMuvekkilFromFinans('${escHtml(i.muvekkil)}')">${escHtml(tp.borclu)}</span>`
      : escHtml(tp.borclu);
    const alacakliCell = i.taraf!=='borclu'
      ? `<span style="color:var(--gold);cursor:pointer" onclick="event.stopPropagation();gotoMuvekkilFromFinans('${escHtml(i.muvekkil)}')">${escHtml(tp.alacakli)}</span>`
      : escHtml(tp.alacakli);
    return `
    <tr oncontextmenu="itemContextMenu(event,'icra','${i.id}','${escHtml(i.borclu||i.no)}')" style="cursor:pointer" onclick="showIcraDetail('${i.id}')">
      <td data-label="Dosya No"><span class="mono text-gold">${escHtml(i.no)}</span></td>
      <td data-label="Borçlu">${borcluCell}</td>
      <td data-label="Alacaklı">${alacakliCell}</td>
      <td data-label="Asıl Alacak" class="mono">₺${fmt(i.alacak)}</td>
      <td data-label="Takip Türü"><span class="tag" style="background:var(--bg3);color:var(--text2);border:1px solid var(--border)">${escHtml(i.tur||'—')}</span></td>
      <td data-label="Durum"><span class="tag tag-${i.durum==='Aktif'?'aktif':i.durum==='Bekliyor'?'bekliyor':'kapali'}">${i.durum}</span></td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-ghost" onclick="editIcra('${i.id}')">✏</button>
        <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteIcra('${i.id}')">🗑</button>
      </td>
    </tr>
  `;
  }).join('') : `<tr><td colspan="7"><div class="empty"><div class="empty-icon">⚡</div><div class="empty-text">Henüz icra dosyası yok</div></div></td></tr>`;
}

function hesaplaIcraAaüt(alacak) {
  // AAÜT 2025-2026 (RG 4 Kasım 2025 / 33067) - Üçüncü Kısım Nispi Tarife
  // İcra takibi için m.11 → 56.250 TL altı maktu 9.000 TL
  // Üzeri: Üçüncü Kısım nispi tarifeye göre kümülatif dilimler
  if (!alacak || alacak <= 0) return 9000;
  if (alacak <= 56250) return 9000;
  const DILIMLER = [
    { kadar: 600000,   oran: 0.16 }, // İlk 600.000 TL        → %16
    { kadar: 600000,   oran: 0.15 }, // Sonraki 600.000 TL    → %15
    { kadar: 1200000,  oran: 0.14 }, // Sonraki 1.200.000 TL  → %14
    { kadar: 1200000,  oran: 0.13 }, // Sonraki 1.200.000 TL  → %13
    { kadar: 1800000,  oran: 0.11 }, // Sonraki 1.800.000 TL  → %11
    { kadar: 2400000,  oran: 0.08 }, // Sonraki 2.400.000 TL  → %8
    { kadar: 3000000,  oran: 0.05 }, // Sonraki 3.000.000 TL  → %5
    { kadar: 3600000,  oran: 0.03 }, // Sonraki 3.600.000 TL  → %3
    { kadar: Infinity, oran: 0.02 }, // Üstü                  → %2
  ];
  let ucret = 0, kalan = alacak;
  for (const d of DILIMLER) {
    if (kalan <= 0) break;
    const dilim = d.kadar === Infinity ? kalan : Math.min(kalan, d.kadar);
    ucret += dilim * d.oran;
    kalan -= dilim;
  }
  return Math.max(Math.round(ucret), 9000);
}

function _getDavaTarife() {
  try {
    var k = JSON.parse(localStorage.getItem('hukuk_dava_tarife') || 'null');
    if (k && k.dilimler && k.asgari) return k;
  } catch(e) {}
  // AAÜT 2025-2026 (RG 4 Kasım 2025 / 33067) — Birinci Kısım Nispi Tarife
  return {
    yil: '2025-2026',
    asgari: 9000,
    dilimler: [
      { kadar: 100000,   oran: 0.15 }, // İlk 100.000 TL        → %15
      { kadar: 150000,   oran: 0.13 }, // Sonraki 150.000 TL    → %13
      { kadar: 250000,   oran: 0.10 }, // Sonraki 250.000 TL    → %10
      { kadar: 500000,   oran: 0.08 }, // Sonraki 500.000 TL    → %8
      { kadar: 1000000,  oran: 0.05 }, // Sonraki 1.000.000 TL  → %5
      { kadar: 3000000,  oran: 0.03 }, // Sonraki 3.000.000 TL  → %3
      { kadar: 5000000,  oran: 0.02 }, // Sonraki 5.000.000 TL  → %2
      { kadar: Infinity, oran: 0.01 }  // Üstü                  → %1
    ]
  };
}

function hesaplaVekaletUcreti(tip) {
  if (tip !== 'dava') return;
  var deger = parseFloat(document.getElementById('d-dava-degeri')?.value || '0') || 0;
  var el = document.getElementById('d-asgari-ucret');
  if (!el) return;
  if (!deger || deger <= 0) { el.value = ''; return; }
  var t = _getDavaTarife();
  var ucret = 0, kalan = deger;
  for (var i = 0; i < t.dilimler.length; i++) {
    if (kalan <= 0) break;
    var limit = t.dilimler[i].kadar;
    var dilim = (limit === Infinity) ? kalan : Math.min(kalan, limit);
    ucret += dilim * t.dilimler[i].oran;
    kalan -= dilim;
  }
  ucret = Math.max(Math.round(ucret), t.asgari);
  el.value = ucret.toLocaleString('tr-TR') + ' ₺';
}

function _getIcraTarife() {
  // AAÜT 2025-2026 (RG 4 Kasım 2025 / 33067) — Üçüncü Kısım Nispi Tarife (icra)
  return {
    yil: '2025-2026',
    asgari: 9000,
    dilimler: [
      { kadar: 600000,   oran: 0.16 },
      { kadar: 600000,   oran: 0.15 },
      { kadar: 1200000,  oran: 0.14 },
      { kadar: 1200000,  oran: 0.13 },
      { kadar: 1800000,  oran: 0.11 },
      { kadar: 2400000,  oran: 0.08 },
      { kadar: 3000000,  oran: 0.05 },
      { kadar: 3600000,  oran: 0.03 },
      { kadar: Infinity, oran: 0.02 }
    ]
  };
}

function _vuFmt(n) {
  return (Math.round(n) || 0).toLocaleString('tr-TR');
}

function vuHesapla() {
  var sonucEl = document.getElementById('vu-sonuc');
  if (!sonucEl) return;
  var tutarRaw = document.getElementById('vu-tutar')?.value || '';
  var tutar = (typeof parsePara === 'function') ? parsePara(tutarRaw) : parseFloat(tutarRaw.replace(/\./g, '').replace(',', '.')) || 0;
  var tur = document.getElementById('vu-tur')?.value || 'dava';
  if (!tutar || tutar <= 0) { sonucEl.innerHTML = ''; return; }

  var tarife = (tur === 'icra') ? _getIcraTarife() : _getDavaTarife();
  var baslik = (tur === 'icra') ? 'İcra Takibi (Üçüncü Kısım)' : 'Hukuk Davası (Birinci Kısım)';

  var satirlar = [];
  var toplam = 0, kalan = tutar;
  for (var i = 0; i < tarife.dilimler.length; i++) {
    if (kalan <= 0) break;
    var d = tarife.dilimler[i];
    var uygulanan = (d.kadar === Infinity) ? kalan : Math.min(kalan, d.kadar);
    var ucret = uygulanan * d.oran;
    toplam += ucret;
    kalan -= uygulanan;
    var dilimAciklamasi = i === 0
      ? 'İlk ' + _vuFmt(d.kadar) + ' TL için'
      : (d.kadar === Infinity ? 'Üstü (' + _vuFmt(uygulanan) + ' TL için)' : 'Sonraki ' + _vuFmt(d.kadar) + ' TL için (' + _vuFmt(uygulanan) + ' TL)');
    satirlar.push({ aciklama: dilimAciklamasi, oran: d.oran, ucret: ucret, sifir: uygulanan <= 0 || ucret === 0 });
  }

  var toplamGosterilen = Math.max(Math.round(toplam), tarife.asgari);
  var asgariUygulandi = toplamGosterilen > Math.round(toplam);

  var html = '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:12px">'
    + '<div style="padding:9px 14px;border-bottom:1px solid var(--border);color:var(--text3);font-size:11px">'
    + 'AAÜT ' + tarife.yil + ' · ' + baslik + ' · ' + _vuFmt(tutar) + ',00 TL için VEKALET ÜCRETİ Hesap Tablosu</div>'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<thead><tr style="background:rgba(108,71,255,0.07)">'
    + '<th style="text-align:left;padding:7px 12px;font-size:11px;color:var(--text3);font-weight:600">Dilim</th>'
    + '<th style="text-align:center;padding:7px 8px;font-size:11px;color:var(--text3);font-weight:600">Oran</th>'
    + '<th style="text-align:right;padding:7px 12px;font-size:11px;color:var(--text3);font-weight:600">Tutar</th>'
    + '</tr></thead><tbody>';

  satirlar.forEach(function(s) {
    html += '<tr style="border-top:1px solid var(--border)">'
      + '<td style="padding:7px 12px;color:' + (s.sifir ? 'var(--text3)' : 'var(--text2)') + '">' + s.aciklama + '</td>'
      + '<td style="padding:7px 8px;text-align:center;font-weight:700;color:' + (s.sifir ? 'var(--text3)' : 'var(--gold)') + '">%' + Math.round(s.oran * 100) + '</td>'
      + '<td style="padding:7px 12px;text-align:right;font-family:monospace;font-weight:600;color:' + (s.sifir ? 'var(--text3)' : 'var(--text)') + '">' + _vuFmt(Math.round(s.ucret)) + ',00 TL</td>'
      + '</tr>';
  });

  html += '</tbody><tfoot><tr style="border-top:2px solid var(--border);background:rgba(108,71,255,0.1)">'
    + '<td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--gold)">' + _vuFmt(tutar) + ',00 TL için TOPLAM</td>'
    + '<td style="padding:10px 12px;text-align:right;font-size:15px;font-family:monospace;font-weight:900;color:var(--gold)">' + _vuFmt(toplamGosterilen) + ',00 TL</td>'
    + '</tr></tfoot></table>';

  if (asgariUygulandi) {
    html += '<div style="padding:7px 14px;font-size:11px;color:var(--text3);border-top:1px solid var(--border)">* Asgari ücret (' + _vuFmt(tarife.asgari) + ',00 TL) uygulandı.</div>';
  }
  html += '</div>';
  sonucEl.innerHTML = html;
}

function openTarifeGuncelleModal() {
  var t = _getDavaTarife();
  document.getElementById('tg-yil').value = t.yil;
  document.getElementById('tg-asgari').value = t.asgari;
  // Dilim oranlarını doldur
  var orDilimler = t.dilimler.filter(function(d){ return d.kadar !== Infinity; });
  var sonDilim = t.dilimler.find(function(d){ return d.kadar === Infinity; });
  var tablo = document.getElementById('tg-dilimler');
  if (tablo) {
    tablo.innerHTML = '';
    orDilimler.forEach(function(d, i) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td style="padding:3px 6px;font-size:12px;color:var(--text3)">' + (i===0?'İlk':'Sonraki') + ' ' + (d.kadar/1000).toLocaleString('tr-TR') + '.000 ₺</td>'
        + '<td style="padding:3px 6px"><input type="number" class="tg-oran" data-idx="'+i+'" value="' + Math.round(d.oran*100) + '" min="1" max="30" style="width:60px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 6px;color:var(--text);font-size:12px"> %</td>';
      tablo.appendChild(tr);
    });
    if (sonDilim) {
      var tr2 = document.createElement('tr');
      tr2.innerHTML = '<td style="padding:3px 6px;font-size:12px;color:var(--text3)">Üstü</td>'
        + '<td style="padding:3px 6px"><input type="number" class="tg-oran" data-idx="'+orDilimler.length+'" value="' + Math.round(sonDilim.oran*100) + '" min="1" max="30" style="width:60px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:3px 6px;color:var(--text);font-size:12px"> %</td>';
      tablo.appendChild(tr2);
    }
  }
  openModal('modal-tarife-guncelle');
}

function saveTarifeGuncelle() {
  var t = _getDavaTarife();
  t.yil = document.getElementById('tg-yil').value.trim() || t.yil;
  t.asgari = parseInt(document.getElementById('tg-asgari').value) || t.asgari;
  var oranInputs = document.querySelectorAll('.tg-oran');
  oranInputs.forEach(function(inp, i) {
    if (t.dilimler[i]) t.dilimler[i].oran = (parseInt(inp.value) || 1) / 100;
  });
  localStorage.setItem('hukuk_dava_tarife', JSON.stringify(t));
  // AAÜT label'ı güncelle
  var lbl = document.getElementById('d-asgari-ucret-label');
  if (lbl) lbl.textContent = 'AAÜT ' + t.yil + ' Asgari (₺)';
  closeModal('modal-tarife-guncelle');
  hesaplaVekaletUcreti('dava');
  notify('Tarife güncellendi ✓');
}

// Türkiye İl/İlçe verisi (özet - temsili)
const TR_IL_ILCE = {
  'Adana':['Aladağ','Ceyhan','Çukurova','Feke','İmamoğlu','Karaisalı','Karataş','Kozan','Pozantı','Saimbeyli','Sarıçam','Seyhan','Tufanbeyli','Yumurtalık','Yüreğir'],
  'Ankara':['Akyurt','Altındağ','Ayaş','Bala','Beypazarı','Çamlıdere','Çankaya','Çubuk','Elmadağ','Etimesgut','Evren','Gölbaşı','Güdül','Haymana','Kalecik','Kahramankazan','Keçiören','Kızılcahamam','Mamak','Nallıhan','Polatlı','Pursaklar','Sincan','Şereflikoçhisar','Yenimahalle'],
  'İstanbul':['Adalar','Arnavutköy','Ataşehir','Avcılar','Bağcılar','Bahçelievler','Bakırköy','Başakşehir','Bayrampaşa','Beşiktaş','Beykoz','Beylikdüzü','Beyoğlu','Büyükçekmece','Çatalca','Çekmeköy','Esenler','Esenyurt','Eyüpsultan','Fatih','Gaziosmanpaşa','Güngören','Kadıköy','Kağıthane','Kartal','Küçükçekmece','Maltepe','Pendik','Sancaktepe','Sarıyer','Silivri','Sultanbeyli','Sultangazi','Şile','Şişli','Tuzla','Ümraniye','Üsküdar','Zeytinburnu'],
  'İzmir':['Aliağa','Balçova','Bayındır','Bayraklı','Bergama','Beydağ','Bornova','Buca','Çeşme','Çiğli','Dikili','Foça','Gaziemir','Güzelbahçe','Karabağlar','Karaburun','Karşıyaka','Kemalpaşa','Kınık','Kiraz','Konak','Menderes','Menemen','Narlıdere','Ödemiş','Seferihisar','Selçuk','Tire','Torbalı','Urla'],
  'Bursa':['Büyükorhan','Gemlik','Gürsu','Harmancık','İnegöl','İznik','Karacabey','Keles','Kestel','Mudanya','Mustafakemalpaşa','Nilüfer','Orhaneli','Orhangazi','Osmangazi','Yenişehir','Yıldırım'],
  'Antalya':['Akseki','Aksu','Alanya','Demre','Döşemealtı','Elmalı','Finike','Gazipaşa','Gündoğmuş','İbradı','Kaş','Kemer','Kepez','Konyaaltı','Korkuteli','Kumluca','Manavgat','Muratpaşa','Serik'],
  'Konya':['Ahırlı','Akören','Akşehir','Altınekin','Beyşehir','Bozkır','Cihanbeyli','Çeltik','Çumra','Derbent','Derebucak','Doğanhisar','Emirgazi','Ereğli','Güneysinir','Hadim','Halkapınar','Hüyük','Ilgın','Kadınhanı','Karapınar','Karatay','Kulu','Meram','Sarayönü','Selçuklu','Seydişehir','Taşkent','Tuzlukçu','Yalıhüyük','Yunak'],
  'Gaziantep':['Araban','İslahiye','Karkamış','Nizip','Nurdağı','Oğuzeli','Şahinbey','Şehitkamil','Yavuzeli'],
  'Kocaeli':['Başiskele','Çayırova','Darıca','Derince','Dilovası','Gebze','Gölcük','İzmit','Kandıra','Karamürsel','Kartepe','Körfez'],
  'Mersin':['Akdeniz','Anamur','Aydıncık','Bozyazı','Çamlıyayla','Erdemli','Gülnar','Mezitli','Mut','Silifke','Tarsus','Toroslar','Yenişehir'],
  'Diyarbakır':['Bağlar','Bismil','Çermik','Çınar','Çüngüş','Dicle','Eğil','Ergani','Hani','Hazro','Kayapınar','Kocaköy','Kulp','Lice','Silvan','Sur','Yenişehir'],
  'Hatay':['Altınözü','Antakya','Arsuz','Belen','Defne','Dörtyol','Erzin','Hassa','İskenderun','Kırıkhan','Kumlu','Payas','Reyhanlı','Samandağ','Serinyol','Yayladağı'],
  'Şanlıurfa':['Akçakale','Birecik','Bozova','Ceylanpınar','Eyyübiye','Halfeti','Haliliye','Harran','Hilvan','Karaköprü','Siverek','Suruç','Viranşehir'],
  'Sakarya':['Adapazarı','Akyazı','Arifiye','Erenler','Ferizli','Geyve','Hendek','Karapürçek','Karasu','Kaynarca','Kocaali','Mithatpaşa','Pamukova','Sapanca','Serdivan','Söğütlü','Taraklı'],
  'Kayseri':['Akkışla','Bünyan','Develi','Felahiye','Hacılar','İncesu','Kocasinan','Melikgazi','Özvatan','Pınarbaşı','Sarıoğlan','Sarız','Talas','Tomarza','Yahyalı','Yeşilhisar'],
  'Trabzon':['Akçaabat','Araklı','Arsin','Beşikdüzü','Çarşıbaşı','Çaykara','Dernekpazarı','Düzköy','Hayrat','Köprübaşı','Maçka','Of','Ortahisar','Sürmene','Şalpazarı','Tonya','Vakfıkebir','Yomra'],
  'Aydın':['Bozdoğan','Buharkent','Çine','Didim','Efeler','Germencik','İncirliova','Karacasu','Karpuzlu','Koçarlı','Köşk','Kuşadası','Kuyucak','Nazilli','Söke','Sultanhisar','Yenipazar'],
  'Muğla':['Bodrum','Dalaman','Datça','Fethiye','Kavaklıdere','Köyceğiz','Marmaris','Menteşe','Milas','Ortaca','Seydikemer','Ula','Yatağan'],
  'Tekirdağ':['Çerkezköy','Çorlu','Ergene','Hayrabolu','Kapaklı','Malkara','Marmaraereğlisi','Muratlı','Saray','Süleymanpaşa','Şarköy'],
  'Samsun':['Alaçam','Asarcık','Atakum','Ayvacık','Bafra','Canik','Çarşamba','İlkadım','Kavak','Ladik','Ondokuzmayıs','Salıpazarı','Tekkeköy','Terme','Vezirköprü','Yakakent'],
};

// ══ İCRA DETAY — SEKMELİ SAYFA ══
var _idpSekme = 'genel';

function idpSekme(sekme, btn) {
  document.querySelectorAll('#idp-sekme-bar .ddp-sekme').forEach(function(b){b.classList.remove('aktif');});
  if(btn) btn.classList.add('aktif');
  _idpSekme = sekme;
  if(currentIcraId) renderIcraTab(currentIcraId, sekme);
}

// Ö7: Durum döngüsü
function _idpCycleStatus(icraId) {
  var arr = DB.get('icralar');
  var i = arr.find(function(x){return x.id===icraId;});
  if(!i) return;
  var cycle = ['Aktif','Bekliyor','Kapalı'];
  var idx = cycle.indexOf(i.durum||'Aktif');
  var yeniDurum = cycle[(idx+1) % cycle.length];
  // Yerinde mutasyon YOK — yeni obje üret (cache/senkron referans güvenliği)
  arr = arr.map(function(x){ return x.id===icraId ? Object.assign({}, x, {durum:yeniDurum}) : x; });
  DB.set('icralar', arr);
  _sbTekKayitYaz('icralar', arr.find(function(x){ return x.id===icraId; }));
  showIcraDetail(icraId);
  notify('Durum güncellendi: '+yeniDurum);
}

// Ö8: Dosya yaşı
function _idpFileAge(i) {
  var created = new Date(i.created || i.tarih || Date.now());
  var now = new Date();
  var days = Math.floor((now - created) / 86400000);
  if(days < 1) return 'Bugün';
  if(days < 30) return days + ' gün';
  if(days < 365) return Math.floor(days/30) + ' ay ' + (days%30) + ' gün';
  return Math.floor(days/365) + ' yıl ' + Math.floor((days%365)/30) + ' ay';
}

// Ö1: Faiz hesaplayıcı
function _idpHesaplaFaiz(alacak, faizOrani, baslangicTarihi) {
  if(!alacak || !faizOrani || !baslangicTarihi) return {gun:0,faiz:0,toplam:alacak||0,gunluk:0};
  var start = new Date(baslangicTarihi);
  var now = new Date();
  var gun = Math.max(0, Math.floor((now - start) / 86400000));
  var yillikFaiz = alacak * (faizOrani / 100);
  var faiz = Math.round(yillikFaiz * gun / 365);
  return {gun:gun, faiz:faiz, toplam:alacak+faiz, gunluk:Math.round(yillikFaiz/365)};
}

// İcra belge silme
function deleteIcraBelge(belgeId, icraId) {
  showConfirmModal('Bu belgeyi silmek istediğinizden emin misiniz?', function() {
    var belgeler = DB.get('icra_belgeler') || [];
    DB.set('icra_belgeler', belgeler.filter(function(b){return b.id!==belgeId;}));
    renderIcraTab(icraId, 'belge');
    notify('Belge silindi');
  });
}

function _icraBelgeFilter(icraId, aramaMetni, turFilter) {
  var kartlar = document.querySelectorAll('#idp-belge-list .ddp-belge-card');
  kartlar.forEach(function(k) {
    var adMatch = !aramaMetni || (k.dataset.ad||'').includes(aramaMetni.toLowerCase());
    var turMatch = !turFilter || (k.dataset.tur||'') === turFilter;
    k.style.display = (adMatch && turMatch) ? '' : 'none';
  });
}

// İcra görev silme
function _idpDeleteTask(taskId, icraId) {
  showConfirmModal('Bu görevi silmek istediğinizden emin misiniz?', function() {
    DB.set('tasks', DB.get('tasks').filter(function(t){return t.id!==taskId;}));
    renderIcraTab(icraId, 'gorev');
    notify('Görev silindi');
  });
}

// İcra hızlı görev ekleme
function _idpQuickAddTask(icraNo, icraId) {
  var input = document.getElementById('idp-quick-task-input');
  if(!input) return;
  var baslik = input.value.trim();
  if(!baslik) return;
  var obj = {id:DB.genId(), baslik:baslik, ilgili:icraNo, oncelik:'Normal', done:false, tarih:'', tip:'gorev', aciklama:'', subtasks:[]};
  var arr = DB.get('tasks');
  arr.push(obj);
  DB.set('tasks', arr);
  input.value = '';
  renderIcraTab(icraId, 'gorev');
  notify('Görev eklendi ✓');
}

// Ö6: İcra masraf ekleme
function _idpAddMasraf(icraId) {
  var turEl = document.getElementById('idp-masraf-tur');
  var tutarEl = document.getElementById('idp-masraf-tutar');
  var tarihEl = document.getElementById('idp-masraf-tarih');
  var aciklamaEl = document.getElementById('idp-masraf-aciklama');
  if(!tutarEl || !tutarEl.value.trim()) return notify('Tutar giriniz!');
  var tutar = Number(tutarEl.value.replace(/[^0-9.,]/g,'').replace(',','.'));
  if(!tutar || tutar <= 0) return notify('Geçersiz tutar!');
  var obj = {
    id: DB.genId(), icraId: icraId,
    tur: turEl ? turEl.value : 'Harç',
    tutar: tutar,
    tarih: tarihEl ? tarihEl.value : new Date().toISOString().slice(0,10),
    aciklama: aciklamaEl ? aciklamaEl.value.trim() : '',
    created: new Date().toISOString()
  };
  var arr = DB.get('icra_masraflar')||[];
  arr.push(obj);
  DB.set('icra_masraflar', arr);
  if(tutarEl) tutarEl.value = '';
  if(aciklamaEl) aciklamaEl.value = '';
  renderIcraTab(icraId, 'finans');
  notify('Masraf kaydedildi ✓');
}

function _idpSaveFinansalNot(icraId) {
  var not = (document.getElementById('idp-finansal-not')||{}).value || '';
  var arr = DB.get('icralar');
  arr = arr.map(function(i){ return i.id===icraId ? Object.assign({}, i, {finansalNot: not}) : i; });
  DB.set('icralar', arr);
  _sbTekKayitYaz('icralar', arr.find(function(i){ return i.id===icraId; }));
  notify('Finansal not kaydedildi');
}

function _idpDeleteMasraf(masrafId, icraId) {
  showConfirmModal('Bu masraf kaydını silmek istediğinizden emin misiniz?', function() {
    DB.set('icra_masraflar', (DB.get('icra_masraflar')||[]).filter(function(m){return m.id!==masrafId;}));
    renderIcraTab(icraId, 'finans');
    notify('Masraf silindi');
  });
}

function showIcraDetail(id) {
  const i = DB.get('icralar').find(x=>x.id===id);
  if (!i) return;

  currentIcraId = id;
  document.getElementById('icra-detail-page').classList.add('open');
  document.getElementById('topbar-add-btn').textContent = '+ Görev Ekle';
  document.getElementById('idp-title').textContent = i.no + (i.borclu ? ' — ' + i.borclu : '');
  document.getElementById('idp-edit-btn').onclick = function(){ editIcra(id); };
  document.getElementById('idp-delete-btn').onclick = function(){ showConfirmModal('Bu icra dosyasını silmek istediğinizden emin misiniz?', function(){ deleteIcra(id); }); };

  // Reset tabs to active
  var aktifSekme = document.querySelector('#idp-sekme-bar .ddp-sekme.aktif');
  var sekme = aktifSekme ? aktifSekme.dataset.sekme : 'genel';
  // Mobilde açık kalmış olabilecek chatter panelini kapat
  mobilChatterKapat('icra');
  renderIcraTab(id, sekme);
  renderIdpChatter(id);
}

function renderIcraTab(id, sekme) {
  const i = DB.get('icralar').find(x=>x.id===id);
  if (!i) return;
  const el = document.getElementById('idp-info');
  if (!el) return;

  const hacizData = JSON.parse(localStorage.getItem('icra_haciz_' + id) || '{}');
  const asgariUcret = hesaplaIcraAaüt(Number(i.alacak)||0);
  const masraflar = (DB.get('icra_masraflar')||[]).filter(function(m){return m.icraId===id;});
  const toplamMasraf = masraflar.reduce(function(a,b){return a+Number(b.tutar||0);},0) + Number(i.masraf||0);
  const tasks = DB.get('tasks').filter(function(t){return t.ilgili && (t.ilgili===i.no || t.ilgili===id || (i.bki && t.ilgili===i.bki)) && t.tip!=='durusma';});
  const belgeler = (DB.get('icra_belgeler')||[]).filter(function(b){return b.icraId===id;});
  const ageStr = _idpFileAge(i);
  const today2 = new Date(); today2.setHours(0,0,0,0);

  if (sekme === 'genel') {
    // T1: Cover card + Ö7 status + Ö8 age
    var muvekkilLink = escHtml(i.muvekkil||'—');
    var mvk = (DB.get('muvekkiller')||[]).find(function(m){return m.ad===i.muvekkil;});
    if(mvk) muvekkilLink = '<a href="#" onclick="showMuvekkilDetail(\''+mvk.id+'\');event.preventDefault()" style="color:var(--text);text-decoration:none;border-bottom:1px dashed var(--text3)">'+escHtml(i.muvekkil)+'</a>';
    // Alacaklı/Borçlu sırası — müvekkilimiz olan taraf tıklanabilir link olarak kalır
    var _itp = _icraTarafPair(i);
    var alacakliDisplay = (i.taraf!=='borclu' && i.muvekkil) ? muvekkilLink : escHtml(_itp.alacakli||'—');
    var borcluDisplay = (i.taraf==='borclu' && i.muvekkil) ? muvekkilLink : escHtml(_itp.borclu||'—');

    el.innerHTML = '<div style="padding:16px">'
      // Cover Card
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px">'
      + '<div style="background:linear-gradient(135deg,rgba(125,196,149,0.12) 0%,rgba(122,181,212,0.08) 100%);padding:16px 20px 14px;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      + '<span class="ddp-no-pill" style="background:rgba(125,196,149,0.15);color:var(--green)">'+escHtml(i.no)+'</span>'
      + '<div style="display:flex;align-items:center;gap:6px">'
      + (ageStr?'<span style="font-size:10px;color:var(--text3)">📅 '+ageStr+'</span>':'')
      + '<span class="ddp-durum-badge ddp-durum-'+(i.durum==='Aktif'?'aktif':i.durum==='Bekliyor'?'bekliyor':'kapali')+'" onclick="_idpCycleStatus(\''+id+'\')" title="Tıklayarak durum değiştir" style="cursor:pointer"><span class="ddp-durum-dot '+(i.durum==='Aktif'?'aktif':i.durum==='Bekliyor'?'bekliyor':'kapali')+'"></span> '+escHtml(i.durum||'Aktif')+'</span>'
      + '</div></div>'
      + (i.tur ? '<div style="padding:0 20px;margin-top:-2px"><span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;background:rgba(122,181,212,0.15);color:#7ab5d4;padding:4px 12px;border-radius:20px;border:1px solid rgba(122,181,212,0.3)">📋 '+escHtml(i.tur)+'</span></div>':'')
      + '<div style="padding:8px 20px 0"><span style="font-size:10px;font-weight:700;background:rgba(125,196,149,0.15);color:var(--green);padding:2px 9px;border-radius:10px">👤 Müvekkilimiz: '+(i.taraf==='borclu'?'Borçlu':'Alacaklı')+'</span></div>'
      + '<div style="padding:6px 20px 0;font-size:20px;font-weight:700;color:var(--text);line-height:1.3">'
      + alacakliDisplay+' <span style="color:var(--green);font-size:15px;font-weight:400;margin:0 6px">vs</span> '+borcluDisplay
      + '</div></div>'
      // Finansal vurgu satırı — Asıl Alacak + Faiz öne çıkarılmış
      + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:1px;background:var(--border)">'
      + '<div style="padding:12px 20px;background:rgba(201,168,76,0.06)"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Asıl Alacak</div><div style="font-size:19px;color:var(--gold);font-weight:800;font-family:monospace">₺'+fmt(i.alacak)+'</div></div>'
      + '<div style="padding:12px 20px;background:rgba(201,168,76,0.06)"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Faiz Oranı</div><div style="font-size:19px;color:var(--text);font-weight:800;font-family:monospace">%'+(i.faiz||0)+'</div></div>'
      + '</div>'
      // İdari bilgi satırı — ikincil, sade
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid var(--border)">'
      + '<div style="padding:8px 20px;border-right:1px solid var(--border)"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">İcra Müdürlüğü</div><div style="font-size:12px;color:var(--text2);font-weight:500">'+escHtml(i.mudurluk||'—')+'</div></div>'
      + '<div style="padding:8px 20px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px">Esas No</div><div style="font-size:12px;color:var(--text2);font-weight:500;font-family:monospace">'+escHtml(i.esas||'—')+'</div></div>'
      + '</div></div>'
      // T6: Dosya kişileri
      + ((i.mudur||i.borcluAvukat||i.bilirkisi)?
        '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:16px">'
        + '<div style="font-size:11px;font-weight:700;color:#7ab5d4;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">🧑‍⚖️ Dosya Kişileri</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:12px">'
        + (i.mudur?'<div style="display:flex;align-items:center;gap:8px;background:var(--bg2);border-radius:8px;padding:8px 12px"><span style="font-size:18px">👨‍⚖️</span><div><div style="font-size:10px;color:var(--text3)">İcra Müdürü</div><div style="font-size:13px;color:var(--text);font-weight:500">'+escHtml(i.mudur)+'</div></div></div>':'')
        + (i.borcluAvukat?'<div style="display:flex;align-items:center;gap:8px;background:var(--bg2);border-radius:8px;padding:8px 12px"><span style="font-size:18px">👤</span><div><div style="font-size:10px;color:var(--text3)">Borçlu Avukatı</div><div style="font-size:13px;color:var(--text);font-weight:500">'+escHtml(i.borcluAvukat)+'</div></div></div>':'')
        + (i.bilirkisi?'<div style="display:flex;align-items:center;gap:8px;background:var(--bg2);border-radius:8px;padding:8px 12px"><span style="font-size:18px">🔬</span><div><div style="font-size:10px;color:var(--text3)">Bilirkişi</div><div style="font-size:13px;color:var(--text);font-weight:500">'+escHtml(i.bilirkisi)+'</div></div></div>':'')
        + '</div></div>':'')
      // Notlar
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">📝 Dosya Notları</div>'
      + '<textarea onchange="saveIcraHaciz(\''+id+'\',\'notlar\',this.value)" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-size:13px;padding:10px;width:100%;resize:vertical;min-height:60px;outline:none;font-family:inherit" placeholder="Dosya notları...">'+escHtml(hacizData.notlar||i.notlar||'')+'</textarea>'
      + '</div></div>';

  } else if (sekme === 'finans') {
    // T3: KPI kartları + Ö1 faiz + Ö2 progress + Ö6 masraf
    var netKazanc = (Number(i.tahsilEdilen)||0) - toplamMasraf;
    var faizSonuc = _idpHesaplaFaiz(Number(i.alacak)||0, Number(i.faiz)||0, i.tarih || i.created);
    var tahsilatPct = (Number(i.alacak)||0) > 0 ? Math.min(Math.round((Number(i.tahsilEdilen)||0) / Number(i.alacak) * 100), 100) : 0;

    el.innerHTML = '<div style="padding:16px">'
      + '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px">💰 Finansal Durum</div>'
      // T3: 4 KPI cards with colored borders
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">'
      + '<div style="background:var(--bg3);border:1px solid rgba(201,168,76,0.3);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Asıl Alacak</div><div style="font-size:16px;font-weight:800;color:var(--gold);font-family:monospace">₺'+fmt(i.alacak)+'</div></div>'
      + '<div style="background:var(--bg3);border:1px solid rgba(74,140,92,0.3);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Tahsil Edilen</div><div style="font-size:16px;font-weight:800;color:var(--green);font-family:monospace">₺'+fmt(i.tahsilEdilen||0)+'</div></div>'
      + '<div style="background:var(--bg3);border:1px solid rgba(192,83,58,0.3);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Toplam Masraf</div><div style="font-size:16px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(toplamMasraf)+'</div></div>'
      + '<div style="background:var(--bg3);border:1px solid '+(netKazanc>=0?'rgba(74,140,92,0.3)':'rgba(192,83,58,0.3)')+';border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Net Kazanç</div><div style="font-size:16px;font-weight:800;color:'+(netKazanc>=0?'var(--green)':'var(--red)')+';font-family:monospace">'+(netKazanc>=0?'+':'')+'₺'+fmt(Math.abs(netKazanc))+'</div></div>'
      + '</div>'
      // Vekalet bilgileri
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px">'
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">AAÜT Asgari</div><div style="font-size:14px;font-weight:700;color:#7dc495;font-family:monospace">₺'+fmt(asgariUcret)+'</div></div>'
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Akdi Vekâlet</div><div style="font-size:14px;font-weight:700;color:var(--gold);font-family:monospace">₺'+fmt(i.akdiUcret||0)+'</div></div>'
      + '</div>'
      // Ö2: Tahsilat progress
      + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px"><span>Tahsilat İlerlemesi</span><span style="font-weight:700;color:var(--gold)">'+tahsilatPct+'%</span></div>'
      + '<div class="ddp-progress-wrap" style="margin-bottom:16px"><div class="ddp-progress-seg" style="width:'+tahsilatPct+'%;background:var(--gold)"></div></div>'
      // Ö1: Faiz hesaplayıcı
      + '<div style="background:var(--bg3);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:14px;margin-bottom:16px">'
      + '<div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">📊 Canlı Faiz Hesaplayıcı</div>'
      + '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'
      + '<div style="background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:3px">İşlemiş Gün</div><div style="font-size:16px;font-weight:800;color:var(--text);font-family:monospace">'+faizSonuc.gun+'</div></div>'
      + '<div style="background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:3px">İşlemiş Faiz</div><div style="font-size:16px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(faizSonuc.faiz)+'</div></div>'
      + '<div style="background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:3px">Faizli Toplam</div><div style="font-size:16px;font-weight:800;color:var(--gold);font-family:monospace">₺'+fmt(faizSonuc.toplam)+'</div></div>'
      + '<div style="background:var(--bg2);border-radius:8px;padding:8px 10px;text-align:center"><div style="font-size:9px;color:var(--text3);margin-bottom:3px">Günlük Faiz</div><div style="font-size:16px;font-weight:800;color:var(--text2);font-family:monospace">₺'+fmt(faizSonuc.gunluk)+'</div></div>'
      + '</div>'
      + '<div style="font-size:10px;color:var(--text3);margin-top:8px;text-align:center">%'+(i.faiz||0)+' faiz oranı · Başlangıç: '+fmtDate(i.tarih||i.created||'')+'</div>'
      + '</div>'
      // Ö6: Masraf listesi
      + '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">🧾 Masraf Geçmişi</div>'
      + (masraflar.length === 0 ? '<div style="text-align:center;color:var(--text3);padding:12px;font-size:12px">Masraf kaydı yok</div>' :
        masraflar.sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);}).map(function(m){
          return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)">'
            + '<div style="width:30px;height:30px;border-radius:7px;background:rgba(192,83,58,0.15);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">↘</div>'
            + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text2)">'+escHtml(m.tur)+'</div><div style="font-size:11px;color:var(--text3)">'+fmtDate(m.tarih)+(m.aciklama?' · '+escHtml(m.aciklama):'')+'</div></div>'
            + '<span style="font-size:12px;font-weight:700;color:var(--red);font-family:monospace;flex-shrink:0">−₺'+fmt(m.tutar)+'</span>'
            + '<button class="btn btn-ghost" style="font-size:10px;padding:2px 5px;color:var(--red);flex-shrink:0" onclick="_idpDeleteMasraf(\''+m.id+'\',\''+id+'\')">🗑</button>'
            + '</div>';
        }).join(''))
      // Masraf ekleme formu
      + '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center">'
      + '<select id="idp-masraf-tur" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;padding:5px 8px">'
      + '<option value="Harç">Harç</option><option value="Bilirkişi Ücreti">Bilirkişi Ücreti</option><option value="Posta Gideri">Posta Gideri</option><option value="Satış Avansı">Satış Avansı</option><option value="Diğer">Diğer</option></select>'
      + '<input id="idp-masraf-tutar" placeholder="Tutar (₺)" style="width:100px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;padding:5px 8px">'
      + '<input id="idp-masraf-tarih" type="date" value="'+new Date().toISOString().slice(0,10)+'" style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;padding:5px 8px">'
      + '<input id="idp-masraf-aciklama" placeholder="Açıklama..." style="flex:1;min-width:80px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;padding:5px 8px">'
      + '<button class="btn btn-gold" style="font-size:11px;padding:5px 10px" onclick="_idpAddMasraf(\''+id+'\')">+ Ekle</button>'
      + '</div>'
      // Finansal Notlar
      + '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">'
      + '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">📝 Finansal Notlar</div>'
      + '<textarea id="idp-finansal-not" rows="4" placeholder="Bu dosyayla ilgili finansal notlarınızı buraya yazın…" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;padding:10px 12px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box">'+escHtml(i.finansalNot||'')+'</textarea>'
      + '<button class="btn btn-outline" style="margin-top:6px;font-size:12px" onclick="_idpSaveFinansalNot(\''+id+'\')">Kaydet</button>'
      + '</div></div>';

  } else if (sekme === 'haciz') {
    // Keep existing haciz template but with Ö5 summary dashboard at top
    var bankalar = ['Ziraat Bankası','Vakıfbank','Halkbank','İş Bankası','Garanti BBVA','Yapı Kredi','Akbank','Denizbank','Finansbank (QNB)','Kuveyt Türk','HSBC'];
    var tasinmazlar = hacizData.tasinmazlarList || [];
    var araclar = hacizData.araclarList || [];
    var seciliBanka = (hacizData.bankalar||[]).length;
    var tarihAlani = function(key, label) {
      var val = hacizData[key] || '';
      var isSet = !!val;
      var inputId = 'th-' + id + '-' + key;
      var displayVal = val ? val.split('-').reverse().join('.') : '';
      return '<div style="background:var(--bg3);border:1px solid '+(isSet?'rgba(201,168,76,0.35)':'var(--border)')+';border-radius:8px;padding:10px">'
        + '<div style="font-size:10px;color:'+(isSet?'var(--gold)':'var(--text3)')+';text-transform:uppercase;letter-spacing:0.05em;margin-bottom:7px;font-weight:600">'+escHtml(label)+'</div>'
        + '<div style="display:flex;gap:4px;margin-bottom:6px">'
        + '<input id="'+inputId+'" type="text" inputmode="numeric" placeholder="GG.AA.YYYY" value="'+displayVal+'" oninput="hacizTarihFormat(this)" onblur="hacizTarihKaydet(this,\''+id+'\',\''+key+'\')" onkeydown="if(event.key===\'Enter\'){this.blur()}" style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:15px;padding:8px 10px;outline:none;cursor:text;font-family:monospace;letter-spacing:0.05em">'
        + '<input type="date" style="width:36px;padding:0;background:none;border:none;color:transparent;cursor:pointer;position:relative;margin-left:-40px;opacity:0.01" onchange="var v=this.value;if(v){var d=v.split(\'-\').reverse().join(\'.\');this.previousElementSibling.value=d;hacizTarihKaydet(this.previousElementSibling,\''+id+'\',\''+key+'\')}">'
        + '</div>'
        + '<button onclick="var t=new Date().toISOString().slice(0,10);var d=t.split(\'-\').reverse().join(\'.\');document.getElementById(\''+inputId+'\').value=d;saveIcraHaciz(\''+id+'\',\''+key+'\',t);renderIcraTab(\''+id+'\',\'haciz\')" style="width:100%;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:6px;color:var(--gold);font-size:11px;padding:5px 8px;cursor:pointer;text-align:center">📅 Bugün</button>'
        + '</div>';
    };

    // T4 timeline data
    var tlItems = [
      {key:'odemeEmri',label:'Ödeme Emri Tebliği',icon:'📬'},
      {key:'sonHaciz',label:'Son Haciz Tarihi',icon:'⚖️'},
      {key:'kiymetTakdir',label:'Kıymet Takdiri',icon:'📋'},
      {key:'ihale',label:'İhale Tarihi',icon:'🏛️'},
      {key:'satis',label:'Satış Tarihi',icon:'🏷️'},
      {key:'itirazSure',label:'İtiraz Süresi Sonu',icon:'⏰'}
    ];
    var tamamlanan = tlItems.filter(function(t){return !!hacizData[t.key];}).length;

    el.innerHTML = '<div style="padding:16px">'
      + '<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px">⚖️ Haciz & Takip</div>'
      // Ö5: Dashboard özet
      + '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">'
      + '<span style="font-size:11px;background:rgba(201,168,76,0.1);color:var(--gold);padding:4px 10px;border-radius:6px;font-weight:600">🏦 '+seciliBanka+' banka</span>'
      + '<span style="font-size:11px;background:rgba(125,196,149,0.1);color:var(--green);padding:4px 10px;border-radius:6px;font-weight:600">🏘 '+tasinmazlar.length+' taşınmaz</span>'
      + '<span style="font-size:11px;background:rgba(122,181,212,0.1);color:#7ab5d4;padding:4px 10px;border-radius:6px;font-weight:600">🚗 '+araclar.length+' araç</span>'
      + (hacizData.maasHaczi?'<span style="font-size:11px;background:rgba(74,140,92,0.15);color:var(--green);padding:4px 10px;border-radius:6px;font-weight:600">💼 Maaş haczi aktif</span>':'')
      + '<span style="font-size:11px;background:rgba(255,255,255,0.06);color:var(--text3);padding:4px 10px;border-radius:6px;font-weight:600">📅 '+tamamlanan+'/'+tlItems.length+' tarih</span>'
      + '</div>'
      // T4: Timeline
      + '<div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;font-weight:700">📅 Takip Aşamaları</div>'
      + '<div style="display:flex;flex-direction:column;gap:0;margin-bottom:16px;padding-left:8px">'
      + tlItems.map(function(t, idx) {
        var val = hacizData[t.key];
        var isSet = !!val;
        var displayVal = val ? val.split('-').reverse().join('.') : '';
        var dotColor = isSet ? 'var(--green)' : 'var(--gold)';
        var lineOpacity = idx < tlItems.length-1 ? '1' : '0';
        return '<div style="display:flex;gap:12px;align-items:flex-start;position:relative">'
          + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:20px">'
          + '<div style="width:10px;height:10px;border-radius:50%;background:'+dotColor+';margin-top:5px'+(isSet?'':';box-shadow:0 0 0 3px rgba(201,168,76,0.2)')+'"></div>'
          + '<div style="width:1px;flex:1;background:var(--border);margin-top:2px;opacity:'+lineOpacity+'"></div>'
          + '</div>'
          + '<div style="flex:1;padding-bottom:12px">'
          + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
          + '<span style="font-size:14px">'+t.icon+'</span>'
          + '<span style="font-size:12px;font-weight:600;color:'+(isSet?'var(--text)':'var(--text3)')+'">'+t.label+'</span>'
          + (isSet?'<span style="font-size:11px;color:var(--green);font-family:monospace">'+displayVal+'</span>':'<span style="font-size:11px;color:var(--text3)">Girilmedi</span>')
          + '</div>'
          + tarihAlani(t.key, t.label)
          + '</div></div>';
      }).join('')
      + '</div>'
      // Remaining haciz sections: maaş, taşınmaz, araç, banka, satış avansı
      // We keep references to the existing saveIcraHaciz functions
      + '<div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;font-weight:700">💼 Maaş Haczi</div>'
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:14px">'
      + '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text2)">'
      + '<input type="checkbox" '+(hacizData.maasHaczi?'checked':'')+' onchange="saveIcraHaciz(\''+id+'\',\'maasHaczi\',this.checked);renderIcraTab(\''+id+'\',\'haciz\')" style="width:16px;height:16px;accent-color:var(--gold)"> Maaş haczi uygulandı'
      + '</label>'
      + (hacizData.maasHaczi?'<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:6px">'
        + '<div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">İşveren</div><input value="'+escAttr(hacizData.maasIsyeri||'')+'" onchange="saveIcraHaciz(\''+id+'\',\'maasIsyeri\',this.value)" placeholder="İşveren adı..." style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px;padding:6px 8px;outline:none"></div>'
        + '<div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">Aylık Kesinti</div><input value="'+escAttr(hacizData.maasKesinti||'')+'" onchange="saveIcraHaciz(\''+id+'\',\'maasKesinti\',this.value)" placeholder="₺..." style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:12px;padding:6px 8px;outline:none;font-family:monospace"></div>'
        + '</div>':'')
      + '</div>'
      // T5: Bankalar
      + '<div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;font-weight:700">🏦 Borçlunun Bankaları <span style="color:var(--text3);font-weight:400">'+seciliBanka+' / '+bankalar.length+'</span></div>'
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:14px"><div style="display:flex;flex-wrap:wrap;gap:4px">'
      + bankalar.map(function(b){
        var secili = (hacizData.bankalar||[]).includes(b);
        return '<span onclick="toggleIcraBank(\''+id+'\',\''+b+'\')" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:11px;cursor:pointer;transition:all 0.15s;background:'+(secili?'var(--gold-dim)':'var(--bg2)')+';border:1px solid '+(secili?'var(--gold)':'var(--border)')+';color:'+(secili?'var(--gold2)':'var(--text3)')+';font-weight:'+(secili?'600':'400')+'">'+(secili?'✓ ':'')+b+'</span>';
      }).join('')
      + '</div></div>'
      + '</div>';

  } else if (sekme === 'kapak') {
    var kd = JSON.parse(localStorage.getItem('icra_kapak_' + id) || '{}');
    // Faiz hesaplama: ana para × oran × gün / 365
    var faizHesapla = function() {
      var ana = parseFloat((kd.anaPara||'').replace(',','.')) || 0;
      var oran = parseFloat((kd.faizOrani||'').replace(',','.')) || 0;
      var bas = kd.faizBasTarih;
      if (!ana || !oran || !bas) return null;
      var gun = Math.max(0, Math.floor((new Date() - new Date(bas)) / 86400000));
      return ana * (oran / 100) * (gun / 365);
    };
    var hesaplananFaiz = faizHesapla();
    var gosterilecekFaiz = hesaplananFaiz !== null ? hesaplananFaiz.toFixed(2) : null;

    var kalemler = [
      { key: 'anaPara',      label: 'Ana Para',         icon: '💰', zorunlu: true },
      { key: 'islemiFaiz',   label: 'İşlemiş Faiz',     icon: '📈', readonly: gosterilecekFaiz !== null },
      { key: 'vekaletUcreti',label: 'Vekalet Ücreti',   icon: '⚖️', zorunlu: false },
      { key: 'masrafMiktari',label: 'Masraf Miktarı',   icon: '📋', zorunlu: false },
      { key: 'tahsilHarci',  label: 'Tahsil Harcı',     icon: '🏛️', zorunlu: false },
      { key: 'cezaeviHarci', label: 'Cezaevi Harcı',    icon: '🔒', zorunlu: false },
    ];

    // Toplam hesapla
    var toplam = kalemler.reduce(function(acc, k) {
      var val;
      if (k.key === 'islemiFaiz' && gosterilecekFaiz !== null) {
        val = parseFloat(gosterilecekFaiz) || 0;
      } else {
        val = parseFloat((kd[k.key]||'').replace(',','.')) || 0;
      }
      return acc + val;
    }, 0);

    var fmtTL = function(n) {
      return n.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' ₺';
    };

    el.innerHTML = '<div style="padding:16px;max-width:560px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
      + '<div style="font-size:14px;font-weight:700;color:var(--text)">🧮 Kapak Hesabı</div>'
      + '<button onclick="icraKapakYenile(\''+id+'\')" style="display:flex;align-items:center;gap:6px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.35);border-radius:8px;color:var(--gold);font-size:12px;font-weight:600;padding:7px 14px;cursor:pointer">🔄 Yenile & Hesapla</button>'
      + '</div>'
      // Faiz parametreleri kutusu
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:14px">'
      + '<div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;font-weight:700;margin-bottom:10px">⚙️ Faiz Parametreleri</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + '<div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">Faiz Oranı (%)</div>'
      + '<input type="text" inputmode="decimal" value="'+escAttr(kd.faizOrani||'')+'" placeholder="ör: 9.00" onchange="icraKapakKaydet(\''+id+'\',\'faizOrani\',this.value)" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;outline:none;box-sizing:border-box"></div>'
      + '<div><div style="font-size:10px;color:var(--text3);margin-bottom:3px">Faiz Başlangıç Tarihi</div>'
      + '<input type="date" value="'+escAttr(kd.faizBasTarih||'')+'" onchange="icraKapakKaydet(\''+id+'\',\'faizBasTarih\',this.value)" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;outline:none;box-sizing:border-box">'
      + '</div>'
      + '</div>'
      + (kd.faizBasTarih && kd.faizOrani && kd.anaPara
        ? '<div style="font-size:11px;color:var(--text3);margin-top:8px">📅 Bugün itibarıyla <strong style="color:var(--text2)">'
          + Math.max(0,Math.floor((new Date()-new Date(kd.faizBasTarih))/86400000))
          + ' gün</strong> — Hesaplanan faiz: <strong style="color:var(--gold)">'+fmtTL(hesaplananFaiz||0)+'</strong></div>'
        : '')
      + '</div>'
      // Alacak kalemleri
      + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px">'
      + '<div style="font-size:10px;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;font-weight:700;padding:10px 12px;border-bottom:1px solid var(--border)">📊 Alacak Kalemleri</div>'
      + kalemler.map(function(k) {
          var isReadonly = k.key === 'islemiFaiz' && gosterilecekFaiz !== null;
          var displayVal = isReadonly ? gosterilecekFaiz : escAttr(kd[k.key]||'');
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.04)">'
            + '<span style="font-size:16px;width:22px;text-align:center;flex-shrink:0">'+k.icon+'</span>'
            + '<div style="flex:1;font-size:13px;color:var(--text2)">'+escHtml(k.label)+'</div>'
            + (isReadonly
              ? '<div style="font-size:13px;font-weight:600;color:var(--gold);font-family:monospace;background:rgba(201,168,76,0.08);padding:6px 10px;border-radius:6px;min-width:110px;text-align:right">'+fmtTL(parseFloat(gosterilecekFaiz))+'</div>'
              : '<input type="text" inputmode="decimal" value="'+displayVal+'" placeholder="0,00" onchange="icraKapakKaydet(\''+id+'\',\''+k.key+'\',this.value)" style="width:110px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:6px 10px;outline:none;text-align:right;font-family:monospace">')
            + '</div>';
        }).join('')
      + '</div>'
      // Toplam alacak kutusu
      + '<div style="background:rgba(201,168,76,0.08);border:1.5px solid rgba(201,168,76,0.4);border-radius:10px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:14px;font-weight:700;color:var(--gold)">Toplam Alacak</div>'
      + '<div style="font-size:20px;font-weight:800;color:var(--gold);font-family:monospace">'+fmtTL(toplam)+'</div>'
      + '</div>'
      // Tahsilat varsa bakiye
      + (kd.yatanPara
        ? '<div style="margin-top:8px;background:rgba(74,140,92,0.1);border:1px solid rgba(74,140,92,0.3);border-radius:10px;padding:12px 16px">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
          + '<div style="font-size:12px;color:var(--text3)">Yatan Para</div>'
          + '<input type="text" inputmode="decimal" value="'+escAttr(kd.yatanPara)+'" onchange="icraKapakKaydet(\''+id+'\',\'yatanPara\',this.value)" style="width:110px;background:transparent;border:none;border-bottom:1px solid var(--border);color:var(--text2);font-size:13px;padding:3px 6px;outline:none;text-align:right;font-family:monospace">'
          + '</div>'
          + '<div style="display:flex;align-items:center;justify-content:space-between">'
          + '<div style="font-size:13px;font-weight:700;color:'+(toplam-(parseFloat((kd.yatanPara||'').replace(',','.'))||0)<=0?'var(--green)':'var(--red)')+'">Bakiye Borç</div>'
          + '<div style="font-size:16px;font-weight:800;font-family:monospace;color:'+(toplam-(parseFloat((kd.yatanPara||'').replace(',','.'))||0)<=0?'var(--green)':'var(--red)')+'">'+fmtTL(Math.max(0,toplam-(parseFloat((kd.yatanPara||'').replace(',','.'))||0)))+'</div>'
          + '</div>'
          + '</div>'
        : '<button onclick="icraKapakKaydet(\''+id+'\',\'yatanPara\',\'0\');renderIcraTab(\''+id+'\',\'kapak\')" style="margin-top:8px;width:100%;background:transparent;border:1px dashed var(--border);border-radius:8px;color:var(--text3);font-size:12px;padding:8px;cursor:pointer">+ Yatan Para Ekle</button>')
      + '</div>';

  } else if (sekme === 'belge') {
    var icraBelgeIcon = function(tur) {
      return tur==='Ödeme Emri'?'📬':tur==='İcra Emri'?'⚖️':tur==='Haciz Tutanağı'?'📋':tur==='Kıymet Takdir'?'📊':tur==='Satış İlanı'?'🏷️':tur==='Sıra Cetveli'?'📑':'📁';
    };
    el.innerHTML = '<div style="padding:16px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
      + '<div style="font-size:14px;font-weight:700;color:var(--text)">📎 Belgeler</div>'
      + '<button class="btn btn-gold" style="font-size:12px;padding:6px 12px" onclick="openIcraBelgeModal(\''+id+'\')">+ Belge Ekle</button>'
      + '</div>'
      + (belgeler.length>3
        ? '<div class="ddp-belge-filter"><input type="text" placeholder="🔍 Belge ara..." oninput="_icraBelgeFilter(\''+id+'\',this.value,document.getElementById(\'idp-belge-tur-filter\').value)"><select id="idp-belge-tur-filter" onchange="_icraBelgeFilter(\''+id+'\',this.parentNode.querySelector(\'input\').value,this.value)"><option value="">Tüm Türler</option><option value="Ödeme Emri">Ödeme Emri</option><option value="İcra Emri">İcra Emri</option><option value="Haciz Tutanağı">Haciz Tutanağı</option><option value="Kıymet Takdir">Kıymet Takdir</option><option value="Satış İlanı">Satış İlanı</option><option value="Sıra Cetveli">Sıra Cetveli</option><option value="Diğer">Diğer</option></select></div>'
        : '')
      + '<div id="idp-belge-list">'
      + (belgeler.length===0
        ? '<div class="ddp-empty-state"><div class="ddp-empty-icon">📂</div><div class="ddp-empty-text">Henüz belge eklenmedi</div><button class="btn btn-gold" style="font-size:12px" onclick="openIcraBelgeModal(\''+id+'\')">İlk Belgeyi Ekleyin →</button></div>'
        : '<div style="display:flex;flex-direction:column;gap:8px">'+belgeler.sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);}).map(function(b,idx){
            var tarafClass = b.taraf==='Alacaklı'?'taraf-biz':b.taraf==='Borçlu'?'taraf-karsi':b.taraf==='İcra Müdürlüğü'?'taraf-mahkeme':'';
            return '<div class="ddp-belge-card '+tarafClass+'" data-ad="'+escHtml(b.ad).toLowerCase()+'" data-tur="'+(b.tur||'')+'">'
              + '<div style="font-size:10px;color:var(--text3);font-weight:700;font-family:monospace;flex-shrink:0;width:20px">'+(idx+1)+'</div>'
              + '<div style="font-size:20px;flex-shrink:0">'+icraBelgeIcon(b.tur)+'</div>'
              + '<div style="flex:1;min-width:0">'
              +   '<div style="font-size:13px;font-weight:600;color:var(--text)">'+escHtml(b.ad)+'</div>'
              +   '<div style="font-size:11px;color:var(--text3);margin-top:2px">'+escHtml(b.tur||'')+(b.taraf?' · '+escHtml(b.taraf):'')+' · '+fmtDate(b.tarih)+'</div>'
              +   (b.aciklama?'<div style="font-size:12px;color:var(--text3);margin-top:3px">'+escHtml(b.aciklama)+'</div>':'')
              + '</div>'
              + (b.url?'<a href="'+escHtml(b.url)+'" target="_blank" class="btn btn-outline" style="font-size:11px;padding:4px 10px;flex-shrink:0">Aç →</a>':'')
              + '<button class="btn btn-ghost" style="font-size:11px;padding:3px 6px;flex-shrink:0" onclick="editIcraBelge(\''+b.id+'\',\''+id+'\')">✏</button>'
              + '<button class="btn btn-ghost" style="color:var(--red);font-size:12px;flex-shrink:0" onclick="deleteIcraBelge(\''+b.id+'\',\''+id+'\')">🗑</button>'
              + '</div>';
          }).join('')+'</div>')
      + '</div>'
      + '</div>';

  } else if (sekme === 'gorev') {
    // Ö4: Görevler sekmesi (kanban görünümü)
    var gecikmisTasks = tasks.filter(function(t){return !t.done&&t.tarih&&Math.ceil((new Date(t.tarih.slice(0,10))-today2)/86400000)<0;});
    var bekleyenTasks = tasks.filter(function(t){return !t.done&&(!t.tarih||Math.ceil((new Date(t.tarih.slice(0,10))-today2)/86400000)>=0);});
    var tamamTasks = tasks.filter(function(t){return t.done;});

    el.innerHTML = '<div style="padding:0">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px">'
      + '<div style="font-size:14px;font-weight:700;color:var(--text)">✅ Görevler</div>'
      + '<button class="btn btn-gold" style="font-size:12px;padding:6px 12px" onclick="openModal(\'modal-task\');document.getElementById(\'t-ilgili\').value=\''+escHtml(i.no)+'\'">+ Görev Ekle</button>'
      + '</div>'
      // Ö4: Summary
      + '<div class="ddp-task-summary"><span style="color:var(--red)"><span class="cnt">'+gecikmisTasks.length+'</span> gecikmiş</span><span style="color:var(--gold)"><span class="cnt">'+bekleyenTasks.length+'</span> bekleyen</span><span style="color:var(--green)"><span class="cnt">'+tamamTasks.length+'</span> tamamlandı</span></div>'
      // Quick task
      + '<div class="ddp-quick-task"><input id="idp-quick-task-input" placeholder="Hızlı görev ekle... (Enter)" onkeydown="if(event.key===\'Enter\')_idpQuickAddTask(\''+escHtml(i.no)+'\',\''+id+'\')"><button class="btn btn-gold" style="font-size:11px;padding:5px 10px" onclick="_idpQuickAddTask(\''+escHtml(i.no)+'\',\''+id+'\')">+</button></div>'
      + (tasks.length===0?'<div style="text-align:center;color:var(--text3);padding:30px">Bu dosyada görev yok</div>':_gorevKanbanBoard(tasks,'icra',id))
      + '</div>';
  }
}


// ---- İcra yardımcı fonksiyonlar ----
function tariHAutoSave(icraId, key, inputId) {
  var dd = (document.getElementById(inputId+'-dd')||{value:''}).value;
  var mm = (document.getElementById(inputId+'-mm')||{value:''}).value;
  var yy = (document.getElementById(inputId+'-yy')||{value:''}).value;
  if (!dd || !mm || !yy || yy.length < 4) return;
  var d=parseInt(dd), m=parseInt(mm), y=parseInt(yy);
  if (y < 1900 || y > 2100) return;
  if (m < 1 || m > 12) { document.getElementById(inputId+'-mm').style.color='var(--red)'; return; }
  var maxDay = new Date(y, m, 0).getDate();
  if (d < 1 || d > maxDay) { document.getElementById(inputId+'-dd').style.color='var(--red)'; return; }
  // Reset renk
  ['-dd','-mm','-yy'].forEach(function(s){ var el=document.getElementById(inputId+s); if(el) el.style.color=''; });
  var iso = String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  saveIcraHaciz(icraId, key, iso);
}


// ══ İCRA HACİZ VERİSİ ══
// Haciz verileri localStorage'da (icra_haciz_<id>) saklanır VE icra kaydının
// detaylar.haciz alanı olarak Supabase'e de yazılır. Bu çift-yazma sayesinde:
//   • Okuma tarafı değişmez (localStorage'dan hızlı okuma)
//   • Başka cihaz/tarayıcıda da veri görünür (Supabase'den geri yüklenir)
//   • Yedekleme sistemine otomatik dahil olur
// Giriş sırasında (_sbYukleDavalarIcralar) Supabase'den gelen haciz verisi
// localStorage'a kopyalanır (aşağıda _hacizSbToLocal).

function _hacizLocalYaz(icraId, data) {
  // localStorage'a yaz
  localStorage.setItem('icra_haciz_' + icraId, JSON.stringify(data));
  // Supabase'e de yaz (fire-and-forget, hata sessizce loglanır)
  _hacizSbYaz(icraId, data);
}

async function _hacizSbYaz(icraId, hacizData) {
  if (!window._currentUserId) return;
  // İcra objesini cache'den al, haciz alanını güncelle, Supabase'e upsert et
  const icralar = window._sbCache.icralar || [];
  const icra = icralar.find(x => x.id === icraId);
  if (!icra) return;
  const guncel = Object.assign({}, icra, { haciz: hacizData });
  const { error } = await _supabaseClient.from('icralar').upsert(_sbIcraToRow(guncel));
  if (error) console.error('[haciz] Supabase yazılamadı:', error);
  else {
    // Cache'i de güncelle
    window._sbCache.icralar = icralar.map(x => x.id === icraId ? guncel : x);
  }
}

// Login sırasında çağrılır — Supabase'den gelen icra verilerinin haciz alanını localStorage'a kopyalar
function _hacizSbToLocal() {
  const icralar = window._sbCache.icralar || [];
  icralar.forEach(function(i) {
    if (i.haciz && typeof i.haciz === 'object') {
      try {
        localStorage.setItem('icra_haciz_' + i.id, JSON.stringify(i.haciz));
      } catch(e) {}
    }
    if (i.kapakHesabi && typeof i.kapakHesabi === 'object') {
      try {
        localStorage.setItem('icra_kapak_' + i.id, JSON.stringify(i.kapakHesabi));
      } catch(e) {}
    }
  });
}

function saveIcraHaciz(icraId, key, val) {
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  data[key] = val;
  _hacizLocalYaz(icraId, data);
}

function icraKapakKaydet(icraId, key, val) {
  const data = JSON.parse(localStorage.getItem('icra_kapak_' + icraId) || '{}');
  data[key] = val;
  localStorage.setItem('icra_kapak_' + icraId, JSON.stringify(data));
  // Supabase'e de yaz
  const icra = (DB.get('icralar')||[]).find(x=>x.id===icraId);
  if (icra) {
    const guncel = Object.assign({}, icra, { kapakHesabi: data });
    supabase.from('icralar').upsert(guncel).then(function(r){ if(r.error) console.error('[kapak] sb yazılamadı:', r.error); });
  }
}

function icraKapakYenile(icraId) {
  renderIcraTab(icraId, 'kapak');
}

function toggleIcraBank(icraId, banka) {
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  const arr = data.bankalar || [];
  const idx = arr.indexOf(banka);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(banka);
  data.bankalar = arr;
  _hacizLocalYaz(icraId, data);
  renderIcraTab(icraId, 'haciz');
}

function toggleMaasAy(icraId, key2) {
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  const arr = data.maasAylari || [];
  const idx = arr.indexOf(key2);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(key2);
  data.maasAylari = arr;
  _hacizLocalYaz(icraId, data);
  const chip = document.getElementById('may-' + icraId + '-' + key2);
  if (chip) {
    const secili = arr.includes(key2);
    chip.style.background = secili?'var(--gold-dim)':'var(--bg2)';
    chip.style.borderColor = secili?'var(--gold)':'var(--border)';
    chip.style.color = secili?'var(--gold2)':'var(--text3)';
  }
}

function icraTasinmazEkle(icraId) {
  const il = document.getElementById('tsnmz-il-' + icraId)?.value;
  const ilce = document.getElementById('tsnmz-ilce-' + icraId)?.value;
  const adres = document.getElementById('tsnmz-adres-' + icraId)?.value;
  const tarih = document.getElementById('tsnmz-tarih-' + icraId)?.value;
  if (!il) return notify('İl seçiniz!');
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  const arr = data.tasinmazlarList || [];
  arr.push({ il: il==='__diger__'?adres:il, ilce, adres, tarih });
  data.tasinmazlarList = arr;
  _hacizLocalYaz(icraId, data);
  showIcraDetail(icraId);
}

function icraTasinmazSil(icraId, idx) {
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  (data.tasinmazlarList||[]).splice(idx, 1);
  _hacizLocalYaz(icraId, data);
  showIcraDetail(icraId);
}

function icraAracEkle(icraId) {
  const plaka = document.getElementById('arac-plaka-' + icraId)?.value.trim();
  const marka = document.getElementById('arac-marka-' + icraId)?.value.trim();
  const model = document.getElementById('arac-model-' + icraId)?.value.trim();
  if (!plaka) return notify('Plaka giriniz!');
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  const arr = data.araclarList || [];
  arr.push({ plaka, marka, model });
  data.araclarList = arr;
  _hacizLocalYaz(icraId, data);
  showIcraDetail(icraId);
}

function icraAracSil(icraId, idx) {
  const data = JSON.parse(localStorage.getItem('icra_haciz_' + icraId) || '{}');
  (data.araclarList||[]).splice(idx, 1);
  _hacizLocalYaz(icraId, data);
  showIcraDetail(icraId);
}

// Tarih input'unda otomatik nokta ekle (GG.AA.YYYY formatı)
function hacizTarihFormat(inp) {
  var v = inp.value.replace(/[^\d.]/g, '');
  var digits = v.replace(/\./g, '');
  if (digits.length > 8) digits = digits.slice(0, 8);
  var parts = [];
  if (digits.length > 0) parts.push(digits.slice(0, Math.min(2, digits.length)));
  if (digits.length > 2) parts.push(digits.slice(2, Math.min(4, digits.length)));
  if (digits.length > 4) parts.push(digits.slice(4));
  inp.value = parts.join('.');
}

// Tarih kaydet: GG.AA.YYYY → YYYY-MM-DD ISO formatına çevir
function hacizTarihKaydet(inp, icraId, key) {
  var v = inp.value.trim();
  if (!v) { saveIcraHaciz(icraId, key, ''); showIcraDetail(icraId); return; }
  var parts = v.split('.');
  if (parts.length !== 3) return;
  var d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
  if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
    inp.style.borderColor = 'var(--red)'; return;
  }
  inp.style.borderColor = '';
  var iso = String(y).padStart(4,'0') + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  saveIcraHaciz(icraId, key, iso);
  showIcraDetail(icraId);
}

function tsnmzIlDegisti(icraId) {
  const il = document.getElementById('tsnmz-il-' + icraId)?.value;
  const ilceSel = document.getElementById('tsnmz-ilce-' + icraId);
  if (!ilceSel) return;
  if (il && TR_IL_ILCE[il]) {
    ilceSel.innerHTML = '<option value="">İlçe seç...</option>' +
      TR_IL_ILCE[il].map(ilce=>`<option value="${ilce}">${ilce}</option>`).join('');
  } else {
    ilceSel.innerHTML = '<option value="">İlçe (serbest)...</option>';
  }
}

// (Eski satır-içi icra chatter ailesi kaldırıldı — icra detay sayfası
// renderIdpChatter/sendIdpPost ailesini kullanıyor.)

function editIcra(id) {
  const i = DB.get('icralar').find(x=>x.id===id);
  if (!i) return;
  editingId = id;
  populateMuvekkilSelects();
  initMahkemeSelects();
  ['no','borclu','mudurluk','esas','alacak','faiz','notlar'].forEach(f => {
    const el = document.getElementById('i-'+f);
    if (el) el.value = i[f]||'';
  });
  const _taraf = _icraTarafPair(i);
  document.getElementById('i-alacakli').value = _taraf.alacakli;
  document.getElementById('i-taraf').value = i.taraf || 'alacakli';
  document.getElementById('i-durum').value = i.durum;
  if (i.tur) document.getElementById('i-tur').value = i.tur;
  // Finans
  document.getElementById('i-akdi-ucret').value = i.akdiUcret || '';
  document.getElementById('i-tahsil-edilen').value = i.tahsilEdilen || '';
  document.getElementById('i-masraf').value = i.masraf || '';
  document.getElementById('i-masraf-aciklama').value = i.masrafAciklama || '';
  updateIcraFinans();
  // Kişiler
  document.getElementById('i-mudur').value = i.mudur || '';
  document.getElementById('i-borclu-avukat').value = i.borcluAvukat || '';
  document.getElementById('i-bilirkisi').value = i.bilirkisi || '';
  // İl ve adliye seçicileri geri yükle
  if (i.il) {
    const iIlEl = document.getElementById('i-il');
    if (iIlEl) {
      iIlEl.value = i.il;
      onIcraIlChange();
      // Adliye değerini geri yükle
      if (i.adliye) {
        const adliyeSel = document.getElementById('i-adliye');
        if (adliyeSel) { adliyeSel.value = i.adliye; buildMahkemeAdi('icra'); }
      }
      // Sıra no
      const siraSel = document.getElementById('i-sira');
      if (siraSel && i.siraNo) { siraSel.value = i.siraNo; buildMahkemeAdi('icra'); }
    }
  }
  document.getElementById('modal-icra-title').textContent = 'İcrayı Düzenle';
  openModal('modal-icra');
}

function saveIcra() { withSaveLock('saveIcra', _saveIcraInner); }
async function _saveIcraInner() {
  let no = document.getElementById('i-no').value.trim();
  const borclu = document.getElementById('i-borclu').value.trim();
  const alacakli = document.getElementById('i-alacakli').value.trim();
  const itaraf = document.getElementById('i-taraf').value || 'alacakli';
  const imuvekkil = itaraf === 'borclu' ? borclu : alacakli;
  if (!imuvekkil) return notify('⚠️ Müvekkilimiz olan tarafın adı zorunludur (' + (itaraf==='borclu'?'Borçlu':'Alacaklı') + ')!');
  if (!no) {
    const nums = DB.get('icralar').map(x=>{const m=(x.no||'').match(/BK[İI](\d+)/);return m?parseInt(m[1]):0;});
    no = 'BKİ' + String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
  }
  // Düzenlemede orijinal oluşturma tarihini koru
  const eskiIcra = editingId ? DB.get('icralar').find(x => x.id === editingId) : null;
  const obj = {
    id: editingId || DB.genId(),
    no, borclu, alacakli, taraf: itaraf,
    dosyaAdi: document.getElementById('i-dosya-adi')?.value||'',
    muvekkil: imuvekkil,
    mudurluk: document.getElementById('i-mudurluk').value,
    il: document.getElementById('i-il')?.value || '',
    adliye: (()=>{ const el=document.getElementById('i-adliye'); const wrap=document.getElementById('i-adliye-wrap'); return (el&&wrap&&wrap.style.display!=='none')?el.value:''; })(),
    siraNo: document.getElementById('i-sira')?.value || '',
    esas: document.getElementById('i-esas').value,
    alacak: parsePara(document.getElementById('i-alacak')?.value)||0,
    faiz: (()=>{
      const sel=document.getElementById('i-faiz-tur');
      if(sel&&sel.value==='0') return Number(document.getElementById('i-faiz-ozel')?.value)||0;
      return Number(sel?.value||24);
    })(),
    tur: document.getElementById('i-tur').value,
    durum: document.getElementById('i-durum').value,
    notlar: document.getElementById('i-notlar').value,
    // Finans
    akdiUcret: document.getElementById('i-akdi-ucret').value,
    tahsilEdilen: document.getElementById('i-tahsil-edilen').value,
    masraf: document.getElementById('i-masraf').value,
    masrafAciklama: document.getElementById('i-masraf-aciklama').value,
    // Kişiler
    mudur: document.getElementById('i-mudur').value,
    borcluAvukat: document.getElementById('i-borclu-avukat').value,
    bilirkisi: document.getElementById('i-bilirkisi').value,
    tarih: (eskiIcra && eskiIcra.tarih) || new Date().toISOString()
  };
  // Supabase'e yaz
  const row = _sbIcraToRow(obj);
  const { error } = await _supabaseClient.from('icralar').upsert(row);
  if (error) {
    console.error('İcra kaydedilemedi:', error);
    return notify('❌ İcra kaydedilemedi: ' + (error.message || 'bilinmeyen hata'));
  }
  let arr = DB.get('icralar');
  if (editingId) arr = arr.map(x=>x.id===editingId?obj:x);
  else arr = [obj, ...arr];
  DB.set('icralar', arr);
  closeModal('modal-icra');
  renderIcralar();
  notify(editingId ? 'İcra güncellendi' : 'İcra eklendi ✓');
  editingId = null;
}

function deleteIcra(id) {
  showConfirmModal('Bu icra dosyası ve ona bağlı görevler, belgeler, masraflar, haciz bilgileri ile dosya günlüğü kalıcı olarak silinecek. Emin misiniz?', async function() {
    const i = DB.get('icralar').find(x => x.id === id);
    const { error } = await _supabaseClient.from('icralar').delete().eq('id', id);
    if (error) {
      console.error('İcra silinemedi:', error);
      return notify('❌ İcra silinemedi: ' + (error.message || 'bilinmeyen hata'));
    }
    DB.set('icralar', DB.get('icralar').filter(x=>x.id!==id));
    await _dosyaIliskiliVerileriSil('icra', id, i ? (i.bki || i.no) : '');
    var idp = document.getElementById('icra-detail-page');
    if (idp && idp.classList.contains('open')) { idp.classList.remove('open'); currentIcraId = null; }
    showPage('icralar');
    renderIcralar();
    notify('İcra ve bağlı kayıtları silindi');
  });
}

// ========== MÜVEKKİLLER ==========
function renderMuvekkiller() {
  const mv = DB.get('muvekkiller');
  const davalar = DB.get('davalar');
  const contacts = DB.get('contacts');
  document.getElementById('muvekkil-tbody').innerHTML = mv.length ? mv.map(m=>{
    const aktif = davalar.filter(d=>d.muvekkil===m.ad && d.durum==='Aktif').length;
    const isKurumsal = m.tur === 'kurumsal';
    const ctCount = contacts.filter(c => c.muvekkilId === m.id).length;
    return `
    <tr style="cursor:pointer" onclick="tabMuvekkilAc('${m.id}')" oncontextmenu="itemContextMenu(event,'muvekkil','${m.id}','${escHtml(m.ad)}')">
      <td data-label="Ad Soyad / Unvan">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">${isKurumsal ? '🏢' : '👤'}</span>
          <div>
            <strong style="color:var(--text)">${escHtml(m.ad)}</strong>
            ${isKurumsal && m.sektor ? `<div style="font-size:11px;color:var(--text3)">${escHtml(m.sektor)}</div>` : ''}
          </div>
        </div>
      </td>
      <td data-label="TC / Vergi No" class="mono" style="font-size:12px">${escHtml(m.tc||m.vergi||'—')}</td>
      <td data-label="Telefon">${escHtml(m.tel||'—')}</td>
      <td data-label="E-posta" style="font-size:12px">${escHtml(m.email||'—')}</td>
      <td data-label="Aktif Dosya">
        <span class="tag tag-${aktif>0?'aktif':'kapali'}">${aktif} Aktif</span>
        ${isKurumsal ? `<span class="tag" style="background:rgba(58,107,140,0.15);color:#7ab5d4;margin-left:4px">👥 ${ctCount}</span>` : ''}
      </td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-ghost" onclick="editMuvekkil('${m.id}')">✏</button>
        <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteMuvekkil('${m.id}')">🗑</button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty"><div class="empty-icon">👤</div><div class="empty-text">Henüz müvekkil yok</div></div></td></tr>`;
}

// Hızlı anlaşılan tutar girişi — müvekkil detay sayfasından
function hizliAnlasmaDuzenle(mvId) {
  const mv = DB.get('muvekkiller').find(function(x){ return x.id === mvId; });
  if (!mv) return;
  const mevcutTutar = (mv.ucretAnlasmalari||[]).reduce(function(a,b){ return a+Number(b.tutar||0); },0);
  const mesaj = '💰 ' + mv.ad + ' ile anlaşılan toplam ücret? (Mevcut: ₺' + (mevcutTutar||0).toLocaleString('tr-TR') + ')';
  const girdi = prompt(mesaj, mevcutTutar||'');
  if (girdi === null) return; // iptal
  const tutar = parseFloat((girdi||'').replace(/[^0-9.,]/g,'').replace(',','.')) || 0;
  if (tutar < 0) return notify('Geçersiz tutar!');
  const arr = DB.get('muvekkiller').map(function(m) {
    if (m.id !== mvId) return m;
    return Object.assign({}, m, {
      ucretAnlasmalari: [{tur:'avukatlik', tutar: tutar, rawText: String(tutar), periyot:'', kdv:'dahil', not:''}]
    });
  });
  DB.set('muvekkiller', arr);
  notify('Anlaşılan tutar güncellendi ✓');
  showMuvekkilDetail(mvId);
}

function saveMuvekkilNotlar(id, val) {
  var arr = DB.get('muvekkiller').map(function(m) { return m.id === id ? Object.assign({}, m, { notlar: val }) : m; });
  DB.set('muvekkiller', arr);
  _sbTekKayitYaz('muvekkiller', arr.find(function(m) { return m.id === id; }));
  notify('Not kaydedildi ✓');
}

function showMuvekkilDetail(id) {
  const mv = DB.get('muvekkiller').find(x => x.id === id);
  if (!mv) return;
  const davalar = DB.get('davalar').filter(d => d.muvekkil === mv.ad);
  const icralar = DB.get('icralar').filter(i => i.muvekkil === mv.ad);
  // Müvekkil Son İşlemler — sadece o müvekkile ait, anlamlı işlemler
  const _MV_GOSTER = [
    'Tahsilat',
    'Vekalet Ücreti Tahsilatı',
    'İcra Vekalet Ücreti',
    'Taksit Tahsilatı',
    'Masraf',
    'Dava Masrafı',
    'Harç',
    'Masraf Ödemesi',
    'Karşı Vekalet Tahsilatı'
  ];
  const finans  = DB.get('finans').filter(f =>
    f.muvekkil === mv.ad &&
    _MV_GOSTER.includes(f.tur)
  );
  const contacts= DB.get('contacts').filter(c => c.muvekkilId === id);
  const isKurumsal = mv.tur === 'kurumsal';

  // Ücret tahsilatları (avukatlık ücreti ödemeleri)
  const UCRET_T = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı']; // Karşı Vekalet Tahsilatı burada YOK — müvekkilin ödemesi değil
  // Müvekkil adına yapılan masraflar (avukattan müvekkile borç)
  const MASRAF_T = ['Masraf','Dava Masrafı','Harç'];
  // Müvekkilin masraf avansı ödemesi (masraf borcunu kapatır)
  const AVANS_T = ['Masraf Ödemesi','Masraf (Ofis Avansı)'];

  // Finans modülünden tahsilat ve masraf
  const topTah  = finans.filter(f=>UCRET_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  // Karşı vekalet — tahsil edilmiş ve edilmemiş
  const kvTumKayitlar = DB.get('finans').filter(f => f.muvekkil === mv.ad && f.tur === 'Karşı Vekalet Ücreti');
  const kvTahsil = kvTumKayitlar.filter(f => f.karsiVekaletDurum === 'tamam');
  const kvBekleyen = kvTumKayitlar.filter(f => f.karsiVekaletDurum !== 'tamam');
  const kvTahsilatToplam = kvTahsil.reduce((a,b)=>a+Number(b.tutar),0);
  const kvBekleyenToplam = kvBekleyen.reduce((a,b)=>a+Number(b.tutar),0);
  const topMasFinans = finans.filter(f=>MASRAF_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const topMasDava   = (DB.get('dava_masraflar')||[]).filter(m=>m.muvekkilAd===mv.ad).reduce((a,b)=>a+Number(b.tutar||0),0);
  const topMas  = topMasFinans + topMasDava;
  const masOde  = finans.filter(f=>AVANS_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);

  // Anlaşılan: ucretAnlasmalari VEYA dava+icra dosyalarındaki akdiUcret toplamı
  const ucretAnlasToplam = (mv.ucretAnlasmalari||[]).reduce((a,b)=>a+Number(b.tutar||0),0);
  const davaAkdiToplam   = davalar.reduce((a,d)=>a+Number(d.akdiUcret||0),0);
  const icraAkdiToplam   = icralar.reduce((a,i)=>a+Number(i.akdiUcret||0),0);
  // Önce ucretAnlasmalari'na bak, yoksa dava/icra akdiUcret toplamını kullan
  const anlaşılan = ucretAnlasToplam > 0 ? ucretAnlasToplam : (davaAkdiToplam + icraAkdiToplam);

  // Tahsil edilen: finans modülü VEYA dava tahsilEdilen toplamı
  const davaTahsilToplam = davalar.reduce((a,d)=>a+Number(d.tahsilEdilen||0),0);
  const icraTahsilToplam = icralar.reduce((a,i)=>a+Number(i.tahsilEdilen||0),0);
  const gercekTahsilat   = topTah > 0 ? topTah : (davaTahsilToplam + icraTahsilToplam);

  // Dava/İcra bazlı masraf (dava masraf alanları)
  const davaMasrafToplam = davalar.reduce((a,d)=>a+Number(d.masraf||0),0);
  const gercekMasraf     = topMas > 0 ? topMas : davaMasrafToplam;

  const kalanUcret  = Math.max(0, anlaşılan - gercekTahsilat);
  const kalanMasraf = gercekMasraf - masOde; // + ise müvekkil borçlu, - ise avans fazlası

  const el = document.getElementById('muvekkil-detail');
  el.innerHTML = `
  <div style="display:flex;align-items:center;gap:10px;padding:12px 20px;background:var(--bg2);border-bottom:1px solid var(--border);border-radius:10px 10px 0 0;margin-bottom:16px;position:sticky;top:0;z-index:5">
    <button class="btn btn-outline" style="padding:6px 14px;font-size:13px" onclick="showSubpage('muvekkil-list');renderMuvekkiller()">← Geri</button>
    <div style="flex:1;font-family:'Playfair Display',serif;font-size:16px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(mv.ad)}</div>
    <button class="btn btn-outline" style="font-size:12px;padding:5px 12px" onclick="editMuvekkil('${id}')">✏ Düzenle</button>
    <button class="btn btn-danger" style="font-size:12px;padding:5px 10px" onclick="showConfirmModal('Bu müvekkili silmek istediğinizden emin misiniz?', function(){ deleteMuvekkil('${id}'); })">🗑 Sil</button>
  </div>

  <div class="mv-detail-grid">

  <!-- SOL: Profil -->
  <div style="display:flex;flex-direction:column;gap:12px">

    <!-- Profil kartı -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:20px;text-align:center">
      <div style="width:64px;height:64px;border-radius:50%;background:rgba(201,168,76,0.15);border:2px solid rgba(201,168,76,0.3);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 12px">${isKurumsal?'🏢':'👤'}</div>
      <div style="font-size:18px;font-weight:700;color:var(--text)">${escHtml(mv.ad)}</div>
      ${mv.sektor?`<div style="font-size:12px;color:var(--text3);margin-top:3px">${escHtml(mv.sektor)}</div>`:''}
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px">
        <span style="font-size:11px;background:${isKurumsal?'rgba(58,107,140,0.2)':'rgba(74,140,92,0.15)'};color:${isKurumsal?'#7ab5d4':'var(--green)'};padding:3px 10px;border-radius:10px;font-weight:600">${isKurumsal?'Kurumsal':'Bireysel'}</span>
        <span style="font-size:11px;background:rgba(201,168,76,0.1);color:var(--gold);padding:3px 10px;border-radius:10px;font-weight:600">${davalar.length} Dava · ${icralar.length} İcra</span>
      </div>
    </div>

    <!-- İletişim -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">İletişim</div>
      <div style="padding:8px 0">
        ${mv.tel?`<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="color:var(--text3);font-size:16px">📞</span><div><div style="font-size:11px;color:var(--text3)">Telefon</div><div style="font-size:13px;color:var(--text)">${escHtml(mv.tel)}</div></div></div>`:''}
        ${mv.email?`<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="color:var(--text3);font-size:16px">✉️</span><div><div style="font-size:11px;color:var(--text3)">E-posta</div><div style="font-size:13px;color:var(--text)">${escHtml(mv.email)}</div></div></div>`:''}
        ${mv.tc?`<div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="color:var(--text3);font-size:16px">🪪</span><div><div style="font-size:11px;color:var(--text3)">${isKurumsal?'Vergi No':'TC No'}</div><div style="font-size:13px;color:var(--text);font-family:monospace">${escHtml(mv.tc)}</div></div></div>`:''}
        ${mv.adres?`<div style="display:flex;align-items:start;gap:10px;padding:8px 16px"><span style="color:var(--text3);font-size:16px">📍</span><div><div style="font-size:11px;color:var(--text3)">Adres</div><div style="font-size:13px;color:var(--text);line-height:1.4">${escHtml(mv.adres)}</div></div></div>`:''}
      </div>
    </div>

    <!-- Contacts -->
    <div style="background:var(--bg2);border:1px solid rgba(58,107,140,0.35);border-radius:12px;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid rgba(58,107,140,0.2);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;font-weight:700;color:#7ab5d4">👥 Contacts <span style="background:rgba(58,107,140,0.3);color:#7ab5d4;font-size:10px;padding:1px 8px;border-radius:10px;margin-left:4px">${contacts.length}</span></div>
        <button class="btn btn-outline" style="font-size:12px;padding:5px 12px;color:#7ab5d4;border-color:rgba(58,107,140,0.4)" onclick="openAddContact('${id}','muvekkil')">+ Ekle</button>
      </div>
      ${contacts.length===0
        ? '<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">Contact eklenmedi</div>'
        : contacts.map(ct=>`
          <div style="display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(58,107,140,0.1)">
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(58,107,140,0.2);border:1px solid rgba(58,107,140,0.4);display:flex;align-items:center;justify-content:center;font-size:15px">👤</div>
            <div>
              <div style="font-size:13px;font-weight:700;color:var(--text)">${escHtml(ct.ad)}</div>
              ${ct.unvan?`<div style="font-size:11px;color:var(--gold2)">${escHtml(ct.unvan)}</div>`:''}
              <div style="font-size:11px;color:var(--text3);margin-top:2px;display:flex;gap:10px">
                ${ct.tel?`<span>📞 ${escHtml(ct.tel)}</span>`:''}
                ${ct.email?`<span>✉ ${escHtml(ct.email)}</span>`:''}
              </div>
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn btn-ghost" onclick="editContactItem('${ct.id}','${id}','muvekkil')">✏</button>
              <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteContactItem('${ct.id}','${id}','muvekkil')">🗑</button>
            </div>
          </div>`).join('')
      }
    </div>

    <!-- Notlar -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">📝 Müvekkil Notları</div>
      <textarea onchange="saveMuvekkilNotlar('${id}',this.value)" style="width:100%;min-height:80px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-size:13px;padding:10px 12px;resize:vertical;outline:none;font-family:inherit;line-height:1.5" placeholder="Müvekkil hakkında serbest notlar...">${escHtml(mv.notlar||'')}</textarea>
    </div>

  </div>

  <!-- SAĞ: Davalar, İcralar, Finans -->
  <div style="display:flex;flex-direction:column;gap:12px">

    <!-- Finans Özeti -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:var(--text)">🏦 Finansal Özet</div>
        ${anlaşılan===0?`<button class="btn btn-gold" style="font-size:11px;padding:4px 12px" onclick="hizliAnlasmaDuzenle('${id}')">+ Anlaşılan Tutar Gir</button>`:''}
      </div>

      <!-- CARİ 1: Ücret Carisi -->
      <div style="padding:10px 16px;border-bottom:1px solid var(--border)">
        <div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">⚖️ Ücret Carisi</div>
        ${anlaşılan===0?`<div style="padding:8px 12px;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);border-radius:8px;font-size:12px;color:var(--text3)">💡 Anlaşılan tutar girilmemiş. Müvekkilin "Düzenle" butonundan veya yukarıdaki butona basarak girebilirsiniz.</div>`
        :`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border-radius:8px;overflow:hidden">
          ${[
            {l:'Anlaşılan',v:'₺'+fmt(anlaşılan),c:'var(--gold)'},
            {l:'Tahsil Edilen',v:'₺'+fmt(gercekTahsilat),c:'var(--green)'},
            {l:'Kalan Borç',v:'₺'+fmt(kalanUcret),c:kalanUcret>0?'var(--red)':'var(--green)'},
          ].map(x=>'<div style="background:var(--bg3);padding:10px 12px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">'+x.l+'</div><div style="font-size:15px;font-weight:800;color:'+x.c+';font-family:monospace">'+x.v+'</div></div>').join('')}
        </div>
        <div style="margin-top:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px"><span>Tahsilat İlerlemesi</span><span style="color:var(--gold);font-weight:700">${Math.min(Math.round(gercekTahsilat/anlaşılan*100),100)}%</span></div>
          <div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;width:${Math.min(Math.round(gercekTahsilat/anlaşılan*100),100)}%;background:var(--gold);border-radius:4px"></div></div>
        </div>`}
      </div>

      <!-- CARİ 2: Masraf Carisi -->
      <div style="padding:10px 16px">
        <div style="font-size:11px;font-weight:700;color:#7ab5d4;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">🧾 Masraf Carisi</div>
        ${gercekMasraf===0 && masOde===0
          ?`<div style="padding:8px 12px;background:rgba(58,107,140,0.08);border:1px solid rgba(58,107,140,0.2);border-radius:8px;font-size:12px;color:var(--text3)">Henüz masraf kaydı yok.</div>`
          :`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border-radius:8px;overflow:hidden">
            ${[
              {l:'Yapılan Masraf',v:'₺'+fmt(gercekMasraf),c:'var(--red)'},
              {l:'Müvekkil Avansı',v:'₺'+fmt(masOde),c:'var(--green)'},
              {l:kalanMasraf>0?'Kalan Borç':'Avans Fazlası',v:(kalanMasraf<0?'+':'')+( '₺'+fmt(Math.abs(kalanMasraf))),c:kalanMasraf>0?'var(--red)':'var(--green)'},
            ].map(x=>'<div style="background:var(--bg3);padding:10px 12px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">'+x.l+'</div><div style="font-size:15px;font-weight:800;color:'+x.c+';font-family:monospace">'+x.v+'</div></div>').join('')}
          </div>
          ${gercekMasraf>0?`<div style="margin-top:8px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
              <span>${kalanMasraf>0?'Masraf Karşılama':'Avans Kullanım'}</span>
              <span style="color:#7ab5d4;font-weight:700">${Math.min(Math.round(masOde/topMas*100),100)}%</span>
            </div>
            <div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;width:${Math.min(Math.round(masOde/topMas*100),100)}%;background:#7ab5d4;border-radius:4px"></div></div>
          </div>`:''}
          `}
      </div>
    </div>

    <!-- Dava Bazlı Finansal Özet -->
    ${davalar.length>0?(function(){
      var allFinans = DB.get('finans')||[];
      var GELIR_T2 = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
      var MASRAF_T2 = ['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç','Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];
      var rows = [];
      var gtAnl=0, gtTah=0, gtMas=0, gtNet=0;
      davalar.forEach(function(dv){
        var dFinans = allFinans.filter(function(f){return f.davaId===dv.id||f.ilgili===dv.no;});
        var dAnl = Number(dv.akdiUcret||0);
        var dTah = dFinans.filter(function(f){return GELIR_T2.includes(f.tur);}).reduce(function(a,b){return a+Number(b.tutar);},0);
        var dMas = dFinans.filter(function(f){return MASRAF_T2.includes(f.tur);}).reduce(function(a,b){return a+Number(b.tutar);},0);
        var dNet = dTah - dMas;
        gtAnl+=dAnl; gtTah+=dTah; gtMas+=dMas; gtNet+=dNet;
        rows.push({no:dv.no, id:dv.id, durum:dv.durum, anl:dAnl, tah:dTah, mas:dMas, net:dNet});
      });
      var html = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
      html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">';
      html += '<div style="font-size:14px;font-weight:700;color:var(--text)">📊 Dava Bazlı Finansal Özet</div>';
      html += '<div style="display:flex;gap:4px">';
      html += '<button class="btn btn-outline" style="font-size:10px;padding:3px 8px" id="mv-fin-card-btn" onclick="document.getElementById(\'mv-fin-cards\').style.display=\'\';document.getElementById(\'mv-fin-table\').style.display=\'none\';this.classList.add(\'aktif\');">Kart</button>';
      html += '<button class="btn btn-outline" style="font-size:10px;padding:3px 8px" id="mv-fin-table-btn" onclick="document.getElementById(\'mv-fin-table\').style.display=\'\';document.getElementById(\'mv-fin-cards\').style.display=\'none\';">Tablo</button>';
      html += '</div></div>';
      // Card view (default)
      html += '<div id="mv-fin-cards">';
      rows.forEach(function(r){
        var pct = r.anl>0 ? Math.min(Math.round(r.tah/r.anl*100),100) : 0;
        html += '<div style="padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer" onclick="openDavaDetailPage(\''+r.id+'\')" onmouseover="this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.background=\'\'">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
        html += '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:12px;font-weight:700;color:var(--gold);font-family:monospace">'+escHtml(r.no)+'</span>';
        html += '<span class="tag tag-'+(r.durum==='Aktif'?'aktif':r.durum==='Bekliyor'?'bekliyor':'kapali')+'" style="font-size:9px">'+escHtml(r.durum)+'</span></div>';
        html += '<span style="font-size:12px;font-weight:700;color:'+(r.net>=0?'var(--green)':'var(--red)')+';font-family:monospace">'+(r.net>=0?'+':'')+' ₺'+fmt(Math.abs(r.net))+'</span>';
        html += '</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:6px;overflow:hidden;margin-bottom:6px">';
        [{l:'Anlaşılan',v:r.anl,c:'var(--gold)'},{l:'Tahsil',v:r.tah,c:'var(--green)'},{l:'Masraf',v:r.mas,c:'var(--red)'},{l:'Net',v:r.net,c:r.net>=0?'var(--green)':'var(--red)'}].forEach(function(x){
          html += '<div style="background:var(--bg3);padding:6px 8px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:2px">'+x.l+'</div><div style="font-size:12px;font-weight:700;color:'+x.c+';font-family:monospace">₺'+fmt(Math.abs(x.v))+'</div></div>';
        });
        html += '</div>';
        if(r.anl>0) {
          html += '<div style="background:var(--bg3);border-radius:3px;height:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--gold);border-radius:3px"></div></div>';
        }
        html += '</div>';
      });
      html += '</div>';
      // Table view (hidden by default)
      html += '<div id="mv-fin-table" style="display:none;overflow-x:auto">';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
      html += '<thead><tr style="border-bottom:1px solid var(--border)">';
      ['Dosya','Anlaşılan','Tahsil','Masraf','Net'].forEach(function(h){
        html += '<th style="padding:8px 12px;text-align:left;font-size:10px;color:var(--text3);text-transform:uppercase;font-weight:700">'+h+'</th>';
      });
      html += '</tr></thead><tbody>';
      rows.forEach(function(r){
        html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer" onclick="openDavaDetailPage(\''+r.id+'\')" onmouseover="this.style.background=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.background=\'\'">';
        html += '<td style="padding:8px 12px;font-weight:700;color:var(--gold);font-family:monospace">'+escHtml(r.no)+'</td>';
        html += '<td style="padding:8px 12px;color:var(--text);font-family:monospace">₺'+fmt(r.anl)+'</td>';
        html += '<td style="padding:8px 12px;color:var(--green);font-family:monospace">₺'+fmt(r.tah)+'</td>';
        html += '<td style="padding:8px 12px;color:var(--red);font-family:monospace">₺'+fmt(r.mas)+'</td>';
        html += '<td style="padding:8px 12px;font-weight:700;color:'+(r.net>=0?'var(--green)':'var(--red)')+';font-family:monospace">'+(r.net>=0?'+':'')+'₺'+fmt(Math.abs(r.net))+'</td>';
        html += '</tr>';
      });
      // Totals row
      html += '<tr style="border-top:2px solid var(--gold);background:rgba(201,168,76,0.06)">';
      html += '<td style="padding:10px 12px;font-weight:700;color:var(--gold)">TOPLAM</td>';
      html += '<td style="padding:10px 12px;font-weight:800;color:var(--gold);font-family:monospace">₺'+fmt(gtAnl)+'</td>';
      html += '<td style="padding:10px 12px;font-weight:800;color:var(--green);font-family:monospace">₺'+fmt(gtTah)+'</td>';
      html += '<td style="padding:10px 12px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(gtMas)+'</td>';
      html += '<td style="padding:10px 12px;font-weight:800;color:'+(gtNet>=0?'var(--green)':'var(--red)')+';font-family:monospace">'+(gtNet>=0?'+':'')+'₺'+fmt(Math.abs(gtNet))+'</td>';
      html += '</tr>';
      html += '</tbody></table></div>';
      // Grand totals in card view
      html += '<div style="padding:12px 16px;background:rgba(201,168,76,0.06);border-top:2px solid rgba(201,168,76,0.3)">';
      html += '<div style="font-size:10px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">GENEL TOPLAM ('+rows.length+' DAVA)</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border-radius:6px;overflow:hidden">';
      [{l:'Anlaşılan',v:gtAnl,c:'var(--gold)'},{l:'Tahsil',v:gtTah,c:'var(--green)'},{l:'Masraf',v:gtMas,c:'var(--red)'},{l:'Net Kâr/Zarar',v:gtNet,c:gtNet>=0?'var(--green)':'var(--red)'}].forEach(function(x){
        html += '<div style="background:var(--bg3);padding:8px 10px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:3px">'+x.l+'</div><div style="font-size:14px;font-weight:800;color:'+x.c+';font-family:monospace">'+(x.l==='Net Kâr/Zarar'&&x.v>=0?'+':'')+'₺'+fmt(Math.abs(x.v))+'</div></div>';
      });
      html += '</div></div>';
      html += '</div>';
      return html;
    })():''}

    <!-- Dava Dosyaları -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:var(--text)">📁 Dava Dosyaları <span style="font-size:12px;font-weight:400;color:var(--text3)">${davalar.filter(d=>d.durum==='Aktif').length} aktif</span></div>
        <button class="btn btn-gold" style="font-size:12px;padding:5px 12px" onclick="openModal('modal-dava');document.getElementById('d-davaci').value='${escHtml(mv.ad)}'">+ Yeni Dava</button>
      </div>
      ${davalar.length===0
        ? '<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">Dava dosyası yok</div>'
        : davalar.sort((a,b)=>a.durum==='Aktif'?-1:1).map(d=>`
          <div style="display:grid;grid-template-columns:80px 1fr auto;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer" onclick="openDavaDetailPage('${d.id}')" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background=''">
            <span style="font-size:12px;color:var(--gold);font-weight:700;font-family:monospace">${escHtml(d.no)}</span>
            <div><div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(d.muvekkil)}${d.karsi?' <span style="color:var(--text3)">vs</span> '+escHtml(d.karsi):''}</div><div style="font-size:11px;color:var(--text3)">${escHtml((d.mahkeme||'').replace('Mahkemesi','Mhk.'))}</div></div>
            <span class="tag tag-${d.durum==='Aktif'?'aktif':d.durum==='Bekliyor'?'bekliyor':'kapali'}" style="font-size:11px">${d.durum}</span>
          </div>`).join('')
      }
    </div>

    <!-- İcra Dosyaları -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:14px;font-weight:700;color:var(--text)">⚡ İcra Dosyaları <span style="font-size:12px;font-weight:400;color:var(--text3)">${icralar.filter(i=>i.durum==='Aktif').length} aktif</span></div>
        <button class="btn btn-outline" style="font-size:12px;padding:5px 12px" onclick="openModal('modal-icra');document.getElementById('i-alacakli').value='${escHtml(mv.ad)}'">+ Yeni İcra</button>
      </div>
      ${icralar.length===0
        ? '<div style="padding:16px;color:var(--text3);font-size:13px;text-align:center">İcra dosyası yok</div>'
        : icralar.sort((a,b)=>a.durum==='Aktif'?-1:1).map(i=>`
          <div style="display:grid;grid-template-columns:80px 1fr auto;gap:10px;align-items:center;padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.04)">
            <span style="font-size:12px;color:var(--gold);font-weight:700;font-family:monospace">${escHtml(i.bki||i.no)}</span>
            <div><div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(i.borclu)}</div><div style="font-size:11px;color:var(--text3)">${escHtml(i.mudurluk||'')}${i.esas?' · '+escHtml(i.esas):''}</div></div>
            <div style="text-align:right"><div style="font-size:12px;font-weight:700;color:var(--gold);font-family:monospace">₺${fmt(i.alacak)}</div><span class="tag tag-${i.durum==='Aktif'?'aktif':'kapali'}" style="font-size:10px">${i.durum}</span></div>
          </div>`).join('')
      }
    </div>

    <!-- Karşı Vekalet Bölümü -->
    ${(kvTahsilatToplam > 0 || kvBekleyenToplam > 0) ? (function(){
      var html = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:12px">';
      html += '<div style="padding:10px 16px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">⚖️ Karşı Taraf Vekalet Ücreti</div>';
      if (kvTahsil.length > 0) {
        html += '<div style="padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04)">';
        html += '<div style="font-size:10px;color:var(--green);font-weight:700;margin-bottom:6px">✓ TAHSİL EDİLDİ</div>';
        kvTahsil.forEach(function(f) {
          var ilgiliDavaTahsil = (DB.get('davalar')||[]).find(function(d){
            return (f.davaId && d.id === f.davaId) || d.no === (f.ilgili||'') || d.ad === (f.ilgili||'');
          });
          var karsiTahsil = ilgiliDavaTahsil ? (ilgiliDavaTahsil.karsi||f.ilgili||'—') : (f.ilgili||'—');
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">';
          html += '<div><div style="font-size:12px;font-weight:600;color:var(--text)">' + escHtml(karsiTahsil) + '</div>';
          html += '<div style="font-size:10px;color:var(--text3)">' + escHtml(f.ilgili||'') + '</div></div>';
          html += '<span style="font-size:12px;font-weight:700;color:var(--green);font-family:monospace">+₺' + fmt(f.tutar) + '</span>';
          html += '</div>';
        });
        html += '</div>';
      }
      if (kvBekleyen.length > 0) {
        html += '<div style="padding:8px 16px">';
        html += '<div style="font-size:10px;color:var(--gold);font-weight:700;margin-bottom:6px">⏳ TAHSİL EDİLMEDİ — KARŞI TARAFTAN ALINACAK</div>';
        kvBekleyen.forEach(function(f) {
          var ilgiliDava = (DB.get('davalar')||[]).find(function(d){
            return (f.davaId && d.id === f.davaId) ||
                   d.no === (f.ilgili||'') ||
                   d.ad === (f.ilgili||'');
          });
          var karsiTaraf = ilgiliDava ? (ilgiliDava.karsi||'—') : (f.aciklama||f.ilgili||'—');
          html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)">';
          html += '<div><div style="font-size:12px;font-weight:600;color:var(--text)">' + escHtml(karsiTaraf) + '</div>';
          html += '<div style="font-size:10px;color:var(--text3)">' + escHtml(f.ilgili||'') + ' · ' + fmtDate(f.tarih) + '</div></div>';
          html += '<span style="font-size:12px;font-weight:700;color:var(--gold);font-family:monospace">₺' + fmt(f.tutar) + '</span></div>';
        });
        html += '<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:11px">';
        html += '<span style="color:var(--text3)">Toplam Bekleyen</span>';
        html += '<span style="font-weight:700;color:var(--gold);font-family:monospace">₺' + fmt(kvBekleyenToplam) + '</span></div>';
        html += '</div>';
      }
      html += '</div>';
      return html;
    })() : ''}

    <!-- Son Finansal İşlemler -->
    ${finans.length?`<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:14px;font-weight:700;color:var(--text)">💸 Son İşlemler</div>
      ${finans.filter(f=>f.tur!=='Karşı Vekalet Ücreti'&&f.tur!=='Taksit Planı').sort((a,b)=>new Date(b.tarih)-new Date(a.tarih)).slice(0,5).map(f=>{
        const isG=['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'].includes(f.tur);
        return `<div style="display:flex;align-items:center;gap:10px;padding:9px 16px;border-bottom:1px solid rgba(255,255,255,0.04)">
          <div style="width:30px;height:30px;border-radius:7px;background:${isG?'rgba(74,140,92,0.15)':'rgba(192,83,58,0.15)'};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">${isG?'↗':'↘'}</div>
          <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text2)">${escHtml(f.tur)}</div><div style="font-size:11px;color:var(--text3)">${fmtDate(f.tarih)}${f.aciklama?' · '+escHtml(f.aciklama):''}</div></div>
          <span style="font-size:12px;font-weight:700;color:${isG?'var(--green)':'var(--red)'};font-family:monospace;flex-shrink:0">${isG?'+':'−'}₺${fmt(f.tutar)}</span>
        </div>`;
      }).join('')}
    </div>`:''}

  </div>
  </div>`;

  showSubpage('muvekkil-detail');
}



function editMuvekkil(id) {
  const m = DB.get('muvekkiller').find(x=>x.id===id);
  if (!m) return;
  editingId = id;
  ['ad','tc','vergi','tel','email','sektor','adres','notlar','ucretTur','ucretPeriyot','ucretKdv'].forEach(f => {
    const el = document.getElementById('m-'+f);
    if (el) el.value = m[f]||'';
  });
  // Tür seç
  if (m.tur === 'kurumsal') {
    document.getElementById('m-tur-kurumsal').checked = true;
  } else {
    document.getElementById('m-tur-bireysel').checked = true;
  }
  onMuvekkilTurChange();
  // Ücret tutar alanını doldur
  const ucretEl = document.getElementById('m-ucret-tutar');
  if (ucretEl && m.ucretTutar) ucretEl.value = m.ucretTutar.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
  mvUcretTurDegisti();
  // Yeni satır bazlı ücret inputlarını doldur
  const UCRET_IDS = {
    'avukatlik':'m-u-avukatlik','aylik_danismanlik':'m-u-aylik',
    'yillik_danismanlik':'m-u-yillik','basari_primi':'m-u-basari',
    'saatlik':'m-u-saatlik','pesinat':'m-u-pesinat','diger':'m-u-diger'
  };
  // Önce temizle
  Object.values(UCRET_IDS).forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  // Doldur
  const anls2 = m.ucretAnlasmalari || (m.ucretTur&&m.ucretTutar>0?[{tur:m.ucretTur,tutar:m.ucretTutar}]:[]);
  anls2.forEach(a => {
    const elId = UCRET_IDS[a.tur];
    if (elId) {
      const el = document.getElementById(elId);
      if (el) el.value = a.tutar > 0 ? a.tutar.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2}) : (a.rawText||'');
    }
  });
  document.getElementById('modal-muvekkil-title').textContent = 'Müvekkili Düzenle';
  openModal('modal-muvekkil');
}

function saveMuvekkil() { withSaveLock('saveMuvekkil', _saveMuvekkilInner); }
async function _saveMuvekkilInner() {
  const ad = document.getElementById('m-ad').value.trim();
  if (!ad) return notify('Ad/Unvan zorunludur!');
  const tur = document.getElementById('m-tur-kurumsal').checked ? 'kurumsal' : 'bireysel';
  // TC Kimlik No doğrulaması
  const tcRaw = document.getElementById('m-tc').value.trim();
  if (tcRaw) {
    if (!/^\d{11}$/.test(tcRaw)) return notify('⚠️ TC Kimlik No 11 haneli rakamlardan oluşmalıdır!');
    if (tcRaw[0] === '0') return notify('⚠️ TC Kimlik No sıfır ile başlayamaz!');
    // TC algoritma doğrulaması
    const d = tcRaw.split('').map(Number);
    const odd = d[0]+d[2]+d[4]+d[6]+d[8];
    const even = d[1]+d[3]+d[5]+d[7];
    const c10 = ((odd*7)-even) % 10;
    const c11 = (d[0]+d[1]+d[2]+d[3]+d[4]+d[5]+d[6]+d[7]+d[8]+d[9]) % 10;
    if (c10 !== d[9] || c11 !== d[10]) return notify('⚠️ Geçersiz TC Kimlik No! Lütfen kontrol edin.');
  }
  // E-posta doğrulaması
  const emailVal = document.getElementById('m-email').value.trim();
  if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) return notify('⚠️ Geçersiz e-posta adresi!');
  // Düzenlemede eski kaydı sakla: tarih korunur, ad değiştiyse bağlı kayıtlar güncellenir
  const eskiMv = editingId ? DB.get('muvekkiller').find(x => x.id === editingId) : null;
  const obj = {
    id: editingId || DB.genId(),
    ad, tur,
    tc: document.getElementById('m-tc').value,
    vergi: document.getElementById('m-vergi').value,
    tel: document.getElementById('m-tel').value,
    email: document.getElementById('m-email').value,
    sektor: document.getElementById('m-sektor').value,
    adres: document.getElementById('m-adres').value,
    notlar: document.getElementById('m-notlar').value,
    ucretAnlasmalari: (function(){
      const list = [];
      const vals = [
        {id:'m-u-avukatlik', tur:'avukatlik', periyot:''},
        {id:'m-u-aylik',     tur:'aylik_danismanlik', periyot:'aylik'},
        {id:'m-u-yillik',    tur:'yillik_danismanlik', periyot:'yillik'},
        {id:'m-u-basari',    tur:'basari_primi', periyot:''},
        {id:'m-u-saatlik',   tur:'saatlik', periyot:''},
        {id:'m-u-pesinat',   tur:'pesinat', periyot:''},
        {id:'m-u-diger',     tur:'diger', periyot:''},
      ];
      vals.forEach(v => {
        const raw = document.getElementById(v.id)?.value?.trim() || '';
        if (!raw) return;
        const tutar = parsePara(raw) || 0;
        if (tutar > 0 || v.tur === 'diger') {
          list.push({tur: v.tur, tutar: tutar || 0, rawText: raw, periyot: v.periyot, kdv: 'dahil', not: ''});
        }
      });
      return list;
    })(),
    ucretTur: '',
    ucretTutar: 0,
    ucretPeriyot: 'aylik',
    ucretKdv: 'dahil',
    tarih: (eskiMv && eskiMv.tarih) || new Date().toISOString()
  };
  const { error } = await _supabaseClient.from('muvekkiller').upsert(_sbMuvekkilToRow(obj));
  if (error) { console.error('Müvekkil kaydedilemedi:', error); return notify('❌ Müvekkil kaydedilemedi: ' + (error.message||'bilinmeyen hata')); }
  let arr = DB.get('muvekkiller');
  if (editingId) arr = arr.map(x=>x.id===editingId?obj:x);
  else arr = [obj, ...arr];
  DB.set('muvekkiller', arr);
  // Ad değiştiyse ad-string'i ile bağlı tüm kayıtları yeni ada taşı —
  // aksi halde davalar/icralar/finans bağları kopar
  if (eskiMv && eskiMv.ad && eskiMv.ad !== obj.ad) {
    _muvekkilAdiGuncelle(eskiMv.ad, obj.ad);
  }
  closeModal('modal-muvekkil');
  renderMuvekkiller();
  notify(editingId ? 'Müvekkil güncellendi' : 'Müvekkil eklendi ✓');
  editingId = null;
}

// Müvekkil adı değişince, adı string olarak saklayan tüm kayıtları güncelle.
// davalar/icralar tek tek upsert edilir; finans/odeme_planlari diff-sync ile gider.
function _muvekkilAdiGuncelle(eskiAd, yeniAd) {
  ['davalar', 'icralar'].forEach(function(tbl) {
    var arr = DB.get(tbl);
    var degisenler = [];
    arr = arr.map(function(x) {
      if (x.muvekkil === eskiAd) {
        var y = Object.assign({}, x, { muvekkil: yeniAd });
        degisenler.push(y);
        return y;
      }
      return x;
    });
    if (degisenler.length) {
      DB.set(tbl, arr);
      degisenler.forEach(function(y) { _sbTekKayitYaz(tbl, y); });
    }
  });
  ['finans', 'odeme_planlari'].forEach(function(tbl) {
    var arr = DB.get(tbl);
    var varMi = false;
    arr = arr.map(function(x) {
      if (x.muvekkil === eskiAd) { varMi = true; return Object.assign({}, x, { muvekkil: yeniAd }); }
      return x;
    });
    if (varMi) DB.set(tbl, arr);
  });
}

function deleteMuvekkil(id) {
  showConfirmModal('Bu müvekkili silmek istediğinizden emin misiniz?', async function() {
    const { error } = await _supabaseClient.from('muvekkiller').delete().eq('id', id);
    if (error) { console.error('Müvekkil silinemedi:', error); return notify('❌ Müvekkil silinemedi: ' + (error.message||'bilinmeyen hata')); }
    // İlgili kişileri Supabase'den de sil (contacts diff-sync'li değil)
    await _supabaseClient.from('contacts').delete().eq('account_id', id);
    DB.set('muvekkiller', DB.get('muvekkiller').filter(x=>x.id!==id));
    DB.set('contacts', (DB.get('contacts')||[]).filter(function(c){ return c.muvekkilId !== id && c.accountId !== id; }));
    showPage('kisiler');
    switchKisilerTab('muvekkiller');
    renderMuvekkiller();
    notify('Müvekkil silindi');
  });
}

// ========== FİNANS ==========
function finansSekme(sekme, btn) {
  ['islemler','odeme-plani','karsi-vekalet','avans-kasa','harclar','ofis-gider'].forEach(function(s){
    var el = document.getElementById('finans-tab-'+s);
    if(el) el.style.display = s===sekme ? '' : 'none';
  });
  document.querySelectorAll('.finans-sekme').forEach(function(b){b.classList.remove('aktif');});
  if(btn) btn.classList.add('aktif');
  if(sekme==='odeme-plani') renderOdemePlanlari();
  else if(sekme==='karsi-vekalet') renderKarsiVekalet();
  else if(sekme==='avans-kasa') renderAvansKasa();
  else if(sekme==='harclar') renderHarclar();
  else if(sekme==='ofis-gider') renderOfisGider();
}

function openOdemePlaniModal() {
  editingId = null;
  var sel = document.getElementById('op-muvekkil');
  var dSel = document.getElementById('op-dosya');
  if(sel) {
    var mvler = DB.get('muvekkiller')||[];
    sel.innerHTML = '<option value="">Seçin...</option>'+mvler.map(function(m){return '<option value="'+escAttr(m.ad)+'">'+escHtml(m.ad)+'</option>';}).join('');
  }
  if(dSel) {
    var davalar = DB.get('davalar')||[];
    var icralar = DB.get('icralar')||[];
    dSel.innerHTML = '<option value="">— Genel anlaşma —</option>'
      +'<optgroup label="Davalar">'+davalar.map(function(d){return '<option value="'+escAttr(d.no)+'">'+escHtml(d.no)+' — '+escHtml(d.muvekkil)+'</option>';}).join('')+'</optgroup>'
      +'<optgroup label="İcralar">'+icralar.map(function(i){return '<option value="'+escAttr(i.bki||i.no)+'">'+escHtml(i.bki||i.no)+' — '+escHtml(i.borclu)+'</option>';}).join('')+'</optgroup>';
  }
  // Bugün ilk tarih
  var tarihEl = document.getElementById('op-ilk-tarih');
  if(tarihEl && !tarihEl.value) tarihEl.value = new Date().toISOString().slice(0,10);
  openModal('modal-odeme-plani');
  setTimeout(function(){
    var toplamEl = document.getElementById('op-toplam');
    var pesinatEl = document.getElementById('op-pesinat');
    if(toplamEl) initParaInput(toplamEl);
    if(pesinatEl) initParaInput(pesinatEl);
    opTaksitUret();
  }, 60);
}

function opTaksitUret() {
  var toplam = parsePara(document.getElementById('op-toplam')?.value)||0;
  var pesinat = parsePara(document.getElementById('op-pesinat')?.value)||0;
  var sayi = parseInt(document.getElementById('op-taksit-sayi')?.value)||1;
  var ilkTarih = document.getElementById('op-ilk-tarih')?.value||new Date().toISOString().slice(0,10);
  var periyot = document.getElementById('op-periyot')?.value||'aylik';
  var listEl = document.getElementById('op-onizle-list');
  if(!listEl) return;

  var kalan = toplam - pesinat;
  var taksitTutar = sayi > 0 ? kalan/sayi : 0;
  var rows = [];

  if(pesinat > 0) {
    rows.push({no:0, label:'Peşinat', tarih:ilkTarih, tutar:pesinat});
  }
  for(var i=1; i<=sayi; i++) {
    var tarih = new Date(ilkTarih+'T00:00:00');
    if(periyot==='aylik') tarih.setMonth(tarih.getMonth()+(i-1));
    else if(periyot==='haftalik') tarih.setDate(tarih.getDate()+(i-1)*7);
    else if(periyot==='3aylik') tarih.setMonth(tarih.getMonth()+(i-1)*3);
    rows.push({no:i, label:i+'. Taksit', tarih:tarih.toISOString().slice(0,10), tutar:taksitTutar});
  }

  listEl.innerHTML = rows.map(function(r){
    return '<div style="display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,0.04)">'
      +'<span style="font-size:12px;font-weight:700;color:var(--text3);min-width:80px">'+r.label+'</span>'
      +'<span style="font-size:12px;color:var(--text3)">'+fmtDateShort(r.tarih)+'</span>'
      +'<span style="font-size:13px;font-weight:700;color:var(--gold);font-family:monospace;margin-left:auto">₺'+fmt(r.tutar)+'</span>'
      +'</div>';
  }).join('') + '<div style="padding:10px 14px;background:var(--bg3);font-size:12px;font-weight:700;display:flex;justify-content:space-between">'
    +'<span>Toplam: ₺'+fmt(toplam)+'</span>'
    +'<span>'+rows.length+' ödeme</span>'
    +'</div>';
}

function saveOdemePlani() {
  var mv = document.getElementById('op-muvekkil')?.value;
  var dosya = document.getElementById('op-dosya')?.value||'';
  var toplam = parsePara(document.getElementById('op-toplam')?.value)||0;
  var pesinat = parsePara(document.getElementById('op-pesinat')?.value)||0;
  var sayi = parseInt(document.getElementById('op-taksit-sayi')?.value)||1;
  var ilkTarih = document.getElementById('op-ilk-tarih')?.value||new Date().toISOString().slice(0,10);
  var periyot = document.getElementById('op-periyot')?.value||'aylik';
  var aciklama = document.getElementById('op-aciklama')?.value||'';

  if(!mv) return notify('Müvekkil seçin!');
  if(!toplam) return notify('Tutar giriniz!');

  var kalan = toplam - pesinat;
  var taksitTutar = sayi>0 ? kalan/sayi : 0;
  var taksitler = [];

  if(pesinat>0) taksitler.push({no:0, label:'Peşinat', tarih:ilkTarih, tutar:pesinat, durum:'bekliyor'});
  for(var i=1;i<=sayi;i++){
    var tarih = new Date(ilkTarih+'T00:00:00');
    if(periyot==='aylik') tarih.setMonth(tarih.getMonth()+(i-1));
    else if(periyot==='haftalik') tarih.setDate(tarih.getDate()+(i-1)*7);
    else if(periyot==='3aylik') tarih.setMonth(tarih.getMonth()+(i-1)*3);
    taksitler.push({no:i, label:i+'. Taksit', tarih:tarih.toISOString().slice(0,10), tutar:taksitTutar, durum:'bekliyor'});
  }

  var planlar = DB.get('odeme_planlari')||[];
  planlar.push({
    id: DB.genId(),
    muvekkil: mv,
    dosya: dosya,
    toplam: toplam,
    aciklama: aciklama,
    periyot: periyot,
    taksitler: taksitler,
    created: new Date().toISOString()
  });
  DB.set('odeme_planlari', planlar);
  closeModal('modal-odeme-plani');
  notify('Ödeme planı oluşturuldu ✓');
  renderOdemePlanlari();
}

function renderOdemePlanlari() {
  var el = document.getElementById('odeme-plani-list');
  if(!el) return;
  var today = new Date(); today.setHours(0,0,0,0);

  // Finans tablosundaki taksitli planları da göster
  var finansTaksitler = (DB.get('finans')||[]).filter(function(f){ return f.odemeSekli === 'taksit' && f.taksitNo >= 0; });
  var finansPlanIds = Array.from(new Set(finansTaksitler.map(function(f){ return f.planId; }).filter(Boolean)));
  var finansPlanlar = finansPlanIds.map(function(planId) {
    var taksitler = finansTaksitler.filter(function(f){ return f.planId === planId; })
      .sort(function(a,b){ return a.taksitNo - b.taksitNo; });
    var ilk = taksitler[0];
    var toplam = taksitler.reduce(function(a,b){ return a + Number(b.tutar); }, 0);
    return {
      id: planId, tip: 'finans',
      muvekkil: ilk ? ilk.muvekkil : '',
      dosya: ilk && ilk.aciklama ? ilk.aciklama.split(' — ')[0] : '',
      toplam: toplam,
      taksitler: taksitler.map(function(f) {
        return { id: f.id, label: f.taksitNo === 0 ? 'Peşinat' : f.taksitNo + '. Taksit', tarih: f.tarih, tutar: Number(f.tutar), durum: f.taksitDurumu || 'bekliyor' };
      })
    };
  });

  var manuelPlanlar = DB.get('odeme_planlari')||[];
  var tumPlanlar = finansPlanlar.concat(manuelPlanlar);
  
  // Aktif ve tamamlanmış planları ayır
  var planlar = tumPlanlar.filter(function(plan){
    return plan.taksitler.some(function(t){return t.durum!=='odendi';});
  });
  var tamamlananPlanlar = tumPlanlar.filter(function(plan){
    return plan.taksitler.length > 0 && plan.taksitler.every(function(t){return t.durum==='odendi';});
  });

  if(!planlar.length && !tamamlananPlanlar.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">📅</div><div>Henüz ödeme planı yok</div><div style="font-size:12px;margin-top:6px">Dava eklerken "Taksitli" seçerek veya + Yeni Plan butonuyla ödeme takvimi oluşturun</div></div>';
    return;
  }

  var html = '';
  
  // Aktif planlar
  if (planlar.length) {
    html += planlar.map(function(plan){
    var bekleyen = plan.taksitler.filter(function(t){return t.durum==='bekliyor';});
    var gecikmiş = bekleyen.filter(function(t){return new Date(t.tarih)<today;});
    var toplamOdenen = plan.taksitler.filter(function(t){return t.durum==='odendi';}).reduce(function(a,b){return a+b.tutar;},0);
    var pct = plan.toplam>0 ? Math.min(Math.round(toplamOdenen/plan.toplam*100),100) : 0;

    return '<div style="background:var(--bg2);border:1px solid '+(gecikmiş.length?'rgba(192,83,58,0.4)':'var(--border)')+';border-radius:14px;overflow:hidden;margin-bottom:14px">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">'
      +'<div><div style="font-size:14px;font-weight:700;color:var(--text)"><span style="cursor:pointer;color:var(--gold)" onclick="gotoMuvekkilFromFinans(\''+escHtml(plan.muvekkil)+'\')">'+escHtml(plan.muvekkil)+'</span>'+(plan.dosya?' — <span style="color:var(--gold);font-family:monospace">'+escHtml(plan.dosya)+'</span>':'')+'</div>'
      +'<div style="font-size:12px;color:var(--text3);margin-top:2px">Toplam: ₺'+fmt(plan.toplam)+' · '+plan.taksitler.length+' taksit'+(gecikmiş.length?'<span style="color:var(--red);font-weight:700;margin-left:8px">⚠ '+gecikmiş.length+' gecikmiş</span>':'')+'</div></div>'
      +'<button class="btn btn-ghost" style="color:var(--red);font-size:12px" data-del-plan="'+plan.id+'">🗑</button>'
      +'</div>'
      +'<div style="padding:10px 18px;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px"><span>Ödeme İlerlemesi</span><span style="color:var(--gold);font-weight:700">%'+pct+' (₺'+fmt(toplamOdenen)+')</span></div>'
      +'<div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--gold);border-radius:4px;transition:width 0.3s"></div></div>'
      +'</div>'
      +'<div>'
      +plan.taksitler.map(function(t,idx){
        var dt = new Date(t.tarih+'T00:00:00');
        var gecikti = t.durum==='bekliyor' && dt<today;
        var clr = t.durum==='odendi'?'var(--green)':gecikti?'var(--red)':'var(--text)';
        return '<div class="odeme-taksit-row" style="display:grid;grid-template-columns:90px 1fr 1fr auto;gap:10px;align-items:center;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.04)">'
          +'<span style="font-size:11px;font-weight:700;color:var(--text3);min-width:70px">'+escHtml(t.label)+'</span>'
          +'<span style="font-size:12px;color:'+(gecikti?'var(--red)':'var(--text3)')+'">'+fmtDateShort(t.tarih)+(gecikti?' ⚠':'')+'</span>'
          +'<span style="font-size:13px;font-weight:700;color:'+clr+';font-family:monospace;flex:1;text-align:right">₺'+fmt(t.tutar)+'</span>'
          +'<button style="font-size:11px;padding:3px 10px;border-radius:6px;cursor:pointer;font-family:inherit;border:1px solid '+(t.durum==='odendi'?'rgba(74,140,92,0.3)':'var(--border)')+';background:'+(t.durum==='odendi'?'rgba(74,140,92,0.12)':'rgba(255,255,255,0.05)')+';color:'+(t.durum==='odendi'?'var(--green)':'var(--text2)')+'" data-taksit-plan="'+plan.id+'" data-taksit-idx="'+idx+'">'+(t.durum==='odendi'?'✅ Ödendi':'✓ Öde')+'</button>'
          +'</div>';
      }).join('')
      +'</div></div>';
  }).join('');
  } else if (!tamamlananPlanlar.length) {
    html += '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">📅</div><div>Aktif ödeme planı yok</div></div>';
  }

  // Tamamlanmış Ödeme Planları (arşiv)
  if (tamamlananPlanlar.length) {
    html += '<div style="margin-top:20px">'
      +'<div onclick="var b=this.nextElementSibling;b.style.display=b.style.display===\'none\'?\'\':\'none\';this.querySelector(\'span.arsiv-ok\').textContent=b.style.display===\'none\'?\'▸\':\'▾\'" style="cursor:pointer;padding:10px 14px;background:rgba(74,140,92,0.08);border:1px solid rgba(74,140,92,0.25);border-radius:10px;display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:18px">✅</span><span style="font-size:14px;font-weight:700;color:var(--green)">Tamamlanmış Ödeme Planları</span>'
      +'<span style="font-size:12px;color:var(--text3);margin-left:4px">('+tamamlananPlanlar.length+' plan)</span>'
      +'<span class="arsiv-ok" style="margin-left:auto;color:var(--text3);font-size:14px">▸</span>'
      +'</div>'
      +'<div style="display:none">';
    html += tamamlananPlanlar.map(function(plan){
      var toplamOdenen = plan.taksitler.reduce(function(a,b){return a+b.tutar;},0);
      return '<div style="background:var(--bg2);border:1px solid rgba(74,140,92,0.25);border-radius:14px;overflow:hidden;margin-top:10px;opacity:0.85">'
        +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">'
        +'<div><div style="font-size:14px;font-weight:700;color:var(--text)"><span style="color:var(--green)">✅</span> <span style="cursor:pointer;color:var(--gold)" onclick="gotoMuvekkilFromFinans(\''+escHtml(plan.muvekkil)+'\')">'+escHtml(plan.muvekkil)+'</span>'+(plan.dosya?' — <span style="color:var(--gold);font-family:monospace">'+escHtml(plan.dosya)+'</span>':'')+'</div>'
        +'<div style="font-size:12px;color:var(--green);margin-top:2px;font-weight:600">Tamamlandı · Toplam: ₺'+fmt(toplamOdenen)+' · '+plan.taksitler.length+' taksit</div></div>'
        +'</div>'
        +'<div>'
        +plan.taksitler.map(function(t){
          return '<div style="display:grid;grid-template-columns:90px 1fr 1fr auto;gap:10px;align-items:center;padding:8px 18px;border-bottom:1px solid rgba(255,255,255,0.04)">'
            +'<span style="font-size:11px;font-weight:700;color:var(--text3)">'+escHtml(t.label)+'</span>'
            +'<span style="font-size:12px;color:var(--text3)">'+fmtDateShort(t.tarih)+'</span>'
            +'<span style="font-size:13px;font-weight:700;color:var(--green);font-family:monospace;text-align:right">₺'+fmt(t.tutar)+'</span>'
            +'<span style="font-size:11px;color:var(--green)">✅ Ödendi</span>'
            +'</div>';
        }).join('')
        +'</div></div>';
    }).join('');
    html += '</div></div>';
  }

  el.innerHTML = html;
}

function taksitiOde(planId, taksitIdx) {
  // Önce finans tablosunda bu planId ile eşleşen taksitlere bak
  var finans = DB.get('finans')||[];
  var finansTaksitler = finans.filter(function(f){ return f.planId === planId && f.odemeSekli === 'taksit'; })
    .sort(function(a,b){ return a.taksitNo - b.taksitNo; });

  if (finansTaksitler.length > 0) {
    // Finans tablosundaki taksit
    var t = finansTaksitler[taksitIdx];
    if (!t) return;
    var yeniDurum = t.taksitDurumu === 'odendi' ? 'bekliyor' : 'odendi';
    var bugun = new Date().toISOString().slice(0,10);

    if (yeniDurum === 'odendi') {
      // Taksit planı kaydını güncelle
      finans = finans.map(function(f) {
        if (f.id === t.id) return Object.assign({}, f, { taksitDurumu: 'odendi', odenmeTarihi: bugun });
        return f;
      });
      // Ayrı bir tahsilat kaydı ekle
      var tahsilatId = DB.genId();
      finans.push({
        id: tahsilatId,
        tur: 'Taksit Tahsilatı',
        tarih: bugun,
        tutar: t.tutar,
        muvekkil: t.muvekkil || '',
        aciklama: t.aciklama + ' (Ödendi)',
        planId: planId,
        davaId: t.davaId || '',
        ilgili: t.ilgili || '',
        kaynakTaksitId: t.id,
        created: new Date().toISOString()
      });
    } else {
      // Geri al — tahsilat kaydını sil, taksit durumunu bekliyor yap
      finans = finans
        .filter(function(f) { return f.kaynakTaksitId !== t.id; })
        .map(function(f) {
          if (f.id === t.id) return Object.assign({}, f, { taksitDurumu: 'bekliyor', odenmeTarihi: null });
          return f;
        });
    }

    DB.set('finans', finans);
    renderOdemePlanlari();
    if (typeof renderFinans === 'function') renderFinans();
    notify(yeniDurum === 'odendi' ? '✅ Taksit ödendi — tahsilata eklendi' : '↩ Taksit geri alındı');
    return;
  }

  // Manuel odeme_planlari tablosu
  var planlar = DB.get('odeme_planlari')||[];
  var plan = planlar.find(function(p){return p.id===planId;});
  if(!plan) return;
  var t = plan.taksitler[taksitIdx];
  if(t.durum==='bekliyor') {
    t.durum='odendi'; t.odenmeTarihi=new Date().toISOString().slice(0,10);
    var finansId = DB.genId();
    t.finansId = finansId;
    var finans2 = DB.get('finans')||[];
    finans2.push({id:finansId, tur:'Taksit Tahsilatı', tarih:t.odenmeTarihi, tutar:t.tutar, muvekkil:plan.muvekkil, ilgili:plan.dosya||'', aciklama:t.label+' — '+(plan.aciklama||''), created:new Date().toISOString()});
    DB.set('finans', finans2);
  } else {
    if (t.finansId) {
      var finans3 = DB.get('finans')||[];
      DB.set('finans', finans3.filter(function(f){return f.id!==t.finansId;}));
    }
    t.durum='bekliyor'; delete t.odenmeTarihi; delete t.finansId;
  }
  DB.set('odeme_planlari', planlar);
  renderOdemePlanlari();
  if (typeof renderFinans === 'function') renderFinans();
  notify('Taksit güncellendi ✓');
}

function deletePlan(id) {
  showConfirmModal('Bu ödeme planını silmek istediğinizden emin misiniz?', function() {
    var manuel = DB.get('odeme_planlari') || [];
    if (manuel.some(function(p){ return p.id === id; })) {
      // Elle oluşturulmuş plan (odeme_planlari tablosu)
      DB.set('odeme_planlari', manuel.filter(function(p){ return p.id !== id; }));
    } else {
      // Dava kaydından üretilen plan — taksitleri finans tablosunda planId ile
      // durur; eskiden burada hiçbir şey silinmiyordu (buton işlevsizdi).
      // Yalnız taksit kayıtları silinir, yapılmış tahsilatlar korunur.
      DB.set('finans', (DB.get('finans')||[]).filter(function(f){
        return !(f.planId === id && f.odemeSekli === 'taksit');
      }));
      if (typeof renderFinans === 'function') renderFinans();
    }
    renderOdemePlanlari();
    notify('Ödeme planı silindi');
  });
}



function gotoMuvekkilFromFinans(ad) {
  if (!ad) return;
  var mv = (DB.get('muvekkiller')||[]).find(function(m){ return m.ad === ad; });
  if (mv) tabMuvekkilAc(mv.id);
  else notify('Müvekkil bulunamadı: ' + ad);
}

function karsiVekaletOde(id) {
  var finans = DB.get('finans')||[];
  // Eski hatalı 'kvt_' kayıtlarını temizle
  finans = finans.filter(function(x){ return !x.id.startsWith('kvt_') && !x.id.startsWith('kvt2_'); });

  var f = finans.find(function(x){ return x.id === id; });
  if (!f) return;

  var yeniDurum = f.karsiVekaletDurum === 'tamam' ? 'bekliyor' : 'tamam';

  if (yeniDurum === 'tamam') {
    // Durumu güncelle + İşlemler sekmesine Tahsilat olarak ekle
    var kvTahId = DB.genId();
    finans = finans.map(function(x){
      return x.id === id ? Object.assign({}, x, { karsiVekaletDurum: 'tamam', kvTahsilatId: kvTahId }) : x;
    });
    finans.push({
      id: kvTahId,
      tur: 'Karşı Vekalet Tahsilatı',
      tarih: new Date().toISOString().slice(0,10),
      tutar: Number(f.tutar),
      muvekkil: f.muvekkil || '',
      aciklama: '⚖️ Karşı Taraftan — ' + (f.ilgili || f.muvekkil || ''),
      kaynakKVId: id,
      created: new Date().toISOString()
    });
    notify('✅ Karşı vekalet tahsilata eklendi');
  } else {
    // Geri al — tahsilat kaydını da sil
    var kvTahId2 = f.kvTahsilatId;
    finans = finans
      .filter(function(x){ return x.id !== kvTahId2; })
      .map(function(x){ return x.id === id ? Object.assign({}, x, { karsiVekaletDurum: 'bekliyor', kvTahsilatId: null }) : x; });
    notify('↩ Karşı vekalet geri alındı');
  }

  DB.set('finans', finans);
  renderKarsiVekalet();
  renderFinans();
}

function renderKarsiVekalet() {
  var el = document.getElementById('karsi-vekalet-list');
  if(!el) return;
  var finans = DB.get('finans')||[];
  var kvlar = finans.filter(function(f){return f.tur==='Karşı Vekalet Ücreti';}).sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);});
  var toplamHukmedilen = kvlar.reduce(function(a,b){return a+Number(b.tutar);},0);
  var toplamTahsil = kvlar.filter(function(f){return f.karsiVekaletDurum==='tamam';}).reduce(function(a,b){return a+Number(b.tutar);},0);

  el.innerHTML = '<div class="kpi-3col" style="gap:10px;margin-bottom:16px">'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Toplam Hükmedilen</div><div style="font-size:18px;font-weight:800;color:var(--gold);font-family:monospace">₺'+fmt(toplamHukmedilen)+'</div></div>'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Tahsil Edilen</div><div style="font-size:18px;font-weight:800;color:var(--green);font-family:monospace">₺'+fmt(toplamTahsil)+'</div></div>'
    +'<div style="background:var(--bg2);border:1px solid '+(toplamHukmedilen-toplamTahsil>0?'rgba(192,83,58,0.3)':'var(--border)')+';border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Bekleyen Tahsilat</div><div style="font-size:18px;font-weight:800;color:'+(toplamHukmedilen-toplamTahsil>0?'var(--red)':'var(--green)')+';font-family:monospace">₺'+fmt(toplamHukmedilen-toplamTahsil)+'</div></div>'
    +'</div>'
    +(kvlar.length===0 ? '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">⚖️</div><div>Karşı vekalet ücreti kaydı yok</div></div>'
      : '<div class="card"><div class="table-wrap"><table class="table-card-mobile"><thead><tr><th>Tarih</th><th>Ödeyen (Karşı Taraf)</th><th>Dosya / Müvekkil</th><th>Durum</th><th style="text-align:right">Tutar</th><th></th></tr></thead><tbody>'
        +kvlar.map(function(f){
          var durum=f.karsiVekaletDurum||'bekliyor';
          var durumClr=durum==='tamam'?'var(--green)':durum==='kismen'?'var(--gold)':'var(--text3)';
          var durumLabel=durum==='tamam'?'✓ Tahsil Edildi':durum==='kismen'?'Kısmen Tahsil':'⏳ Bekliyor (İcra)';
          var odeBtn = durum!=='tamam'
            ? '<button style="font-size:11px;padding:3px 10px;border-radius:6px;cursor:pointer;background:rgba(74,140,92,0.15);border:1px solid rgba(74,140,92,0.3);color:var(--green);margin-right:4px" onclick="karsiVekaletOde(\'' + f.id + '\')">✓ Öde</button>'
            : '<button style="font-size:11px;padding:3px 10px;border-radius:6px;cursor:pointer;background:rgba(255,255,255,0.05);border:1px solid var(--border);color:var(--text3);margin-right:4px" onclick="karsiVekaletOde(\'' + f.id + '\')">↩ Geri Al</button>';
          // Karşı tarafı bul — önce kayıtlı karsiTaraf, yoksa ilgili dosyadan çöz
          var karsiTaraf = f.karsiTaraf || '';
          if (!karsiTaraf) {
            var kvDosyaNo = f.karsiDosya || f.ilgili || '';
            if (kvDosyaNo) {
              var kvDava = (DB.get('davalar')||[]).find(function(d){ return d.no === kvDosyaNo || d.ad === kvDosyaNo; });
              var kvIcra = !kvDava ? (DB.get('icralar')||[]).find(function(i){ return (i.bki||i.no) === kvDosyaNo; }) : null;
              if (kvDava && kvDava.karsi) karsiTaraf = kvDava.karsi;
              else if (kvIcra && kvIcra.borclu) karsiTaraf = kvIcra.borclu;
            }
          }
          return '<tr><td data-label="Tarih" style="font-family:monospace;font-size:12px;color:var(--text3)">'+fmtDate(f.tarih)+'</td><td data-label="Ödeyen (Karşı Taraf)"><div style="font-weight:600;color:var(--text)">'+escHtml(karsiTaraf||'—')+'</div></td><td data-label="Dosya / Müvekkil"><div style="font-size:12px;color:var(--gold);cursor:pointer" onclick="gotoMuvekkilFromFinans(\'' + (f.muvekkil||'') + '\')">'+escHtml(f.muvekkil||'')+'</div><div style="font-size:11px;color:var(--text3)">'+escHtml(f.karsiDosya||f.ilgili||'')+'</div></td><td data-label="Durum"><span style="font-size:11px;font-weight:600;color:'+durumClr+'">'+durumLabel+'</span></td><td data-label="Tutar" style="text-align:right;font-family:monospace;font-weight:700;color:var(--gold)">₺'+fmt(f.tutar)+'</td><td style="white-space:nowrap">'+odeBtn+'<button class="btn btn-ghost" style="font-size:11px" data-edit-finans="'+f.id+'">✏</button><button class="btn btn-ghost" style="font-size:11px;color:var(--red)" data-delete-finans="'+f.id+'">🗑</button></td></tr>';
        }).join('')
        +'</tbody></table></div></div>');
}

function renderAvansKasa() {
  var el = document.getElementById('avans-kasa-list');
  if(!el) return;
  var finans = DB.get('finans')||[];
  var muvekkiller = DB.get('muvekkiller')||[];

  // Müvekkillerle avans bakiyesi hesapla
  var mvBakiyeler = muvekkiller.map(function(mv){
    var alinan = finans.filter(function(f){return f.muvekkil===mv.ad&&f.tur==='Masraf Ödemesi';}).reduce(function(a,b){return a+Number(b.tutar);},0);
    var harcananFinans = finans.filter(function(f){return f.muvekkil===mv.ad&&['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç'].includes(f.tur);}).reduce(function(a,b){return a+Number(b.tutar);},0);
    var harcananDavaMasraf = (DB.get('dava_masraflar')||[]).filter(function(m){return m.muvekkilAd===mv.ad;}).reduce(function(a,b){return a+Number(b.tutar||0);},0);
    var harcanan = harcananFinans + harcananDavaMasraf;
    return {ad:mv.ad, alinan:alinan, harcanan:harcanan, bakiye:alinan-harcanan};
  }).filter(function(m){return m.alinan>0||m.harcanan>0;});

  var topAlinan = mvBakiyeler.reduce(function(a,b){return a+b.alinan;},0);
  var topHarcanan = mvBakiyeler.reduce(function(a,b){return a+b.harcanan;},0);

  el.innerHTML = '<div class="kpi-3col" style="gap:10px;margin-bottom:16px">'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Toplam Avans Alınan</div><div style="font-size:18px;font-weight:800;color:#7ab5d4;font-family:monospace">₺'+fmt(topAlinan)+'</div></div>'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Toplam Harcanan</div><div style="font-size:18px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(topHarcanan)+'</div></div>'
    +'<div style="background:var(--bg2);border:1px solid '+(topAlinan-topHarcanan<0?'rgba(192,83,58,0.3)':'var(--border)')+';border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Kalan Avans</div><div style="font-size:18px;font-weight:800;color:'+(topAlinan-topHarcanan>=0?'var(--green)':'var(--red)')+';font-family:monospace">₺'+fmt(topAlinan-topHarcanan)+'</div></div>'
    +'</div>'
    +(mvBakiyeler.length===0 ? '<div style="text-align:center;padding:40px;color:var(--text3)">Avans kaydı yok</div>'
      : '<div class="card"><div class="table-wrap"><table class="table-card-mobile"><thead><tr><th>Müvekkil</th><th style="text-align:right">Avans Alınan</th><th style="text-align:right">Harcanan</th><th style="text-align:right">Bakiye</th></tr></thead><tbody>'
        +mvBakiyeler.map(function(m){
          return '<tr><td data-label="Müvekkil" style="font-weight:600">'+escHtml(m.ad)+'</td><td data-label="Avans Alınan" style="text-align:right;font-family:monospace;color:#7ab5d4">₺'+fmt(m.alinan)+'</td><td data-label="Harcanan" style="text-align:right;font-family:monospace;color:var(--red)">₺'+fmt(m.harcanan)+'</td><td data-label="Bakiye" style="text-align:right;font-family:monospace;font-weight:700;color:'+(m.bakiye>=0?'var(--green)':'var(--red)')+'">₺'+fmt(m.bakiye)+'</td></tr>';
        }).join('')
        +'</tbody></table></div></div>');
}

function renderHarclar() {
  var el = document.getElementById('harclar-list');
  if(!el) return;
  var finans = DB.get('finans')||[];
  var harclar = finans.filter(function(f){return f.tur==='Harç';}).sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);});
  var toplam = harclar.reduce(function(a,b){return a+Number(b.tutar);},0);

  var aylar = {};
  harclar.forEach(function(f){
    var ay = (f.tarih||'').slice(0,7);
    if(!aylar[ay]) aylar[ay]=0;
    aylar[ay]+=Number(f.tutar);
  });

  el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Toplam Harç</div><div style="font-size:18px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(toplam)+'</div></div>'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Bu Ay</div><div style="font-size:18px;font-weight:800;color:var(--gold);font-family:monospace">₺'+fmt(aylar[new Date().toISOString().slice(0,7)]||0)+'</div></div>'
    +'</div>'
    +(harclar.length===0 ? '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">🧾</div><div>Harç kaydı yok</div></div>'
      : '<div class="card"><div class="table-wrap"><table class="table-card-mobile"><thead><tr><th>Tarih</th><th>Müvekkil</th><th>Dosya</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th></th></tr></thead><tbody>'
        +harclar.map(function(f){
          return '<tr><td data-label="Tarih" style="font-family:monospace;font-size:12px;color:var(--text3)">'+fmtDate(f.tarih)+'</td><td data-label="Müvekkil" style="font-size:12px">'+escHtml(f.muvekkil||'—')+'</td><td data-label="Dosya" style="font-size:12px;color:var(--text3)">'+escHtml(f.ilgili||'—')+'</td><td data-label="Açıklama" style="font-size:12px;color:var(--text3)">'+escHtml(f.aciklama||'')+'</td><td data-label="Tutar" style="text-align:right;font-family:monospace;font-weight:700;color:var(--red)">₺'+fmt(f.tutar)+'</td><td><button class="btn btn-ghost" style="font-size:11px" data-edit-finans="'+f.id+'">✏</button><button class="btn btn-ghost" style="font-size:11px;color:var(--red)" data-delete-finans="'+f.id+'">🗑</button></td></tr>';
        }).join('')
        +'</tbody></table></div></div>');
}

function renderOfisGider() {
  var el = document.getElementById('ofis-gider-list');
  if(!el) return;
  var finans = DB.get('finans')||[];
  var OFIS = ['Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];
  var ofisler = finans.filter(function(f){return OFIS.includes(f.tur);}).sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);});
  var toplam = ofisler.reduce(function(a,b){return a+Number(b.tutar);},0);

  // Aya göre grupla
  var aylar = {};
  ofisler.forEach(function(f){
    var ay = (f.tarih||'').slice(0,7);
    if(!aylar[ay]) aylar[ay]=0;
    aylar[ay]+=Number(f.tutar);
  });

  el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Toplam Ofis Gideri</div><div style="font-size:18px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(toplam)+'</div></div>'
    +'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px"><div style="font-size:10px;color:var(--text3);text-transform:uppercase;margin-bottom:6px">Bu Ay</div><div style="font-size:18px;font-weight:800;color:var(--gold);font-family:monospace">₺'+fmt(aylar[new Date().toISOString().slice(0,7)]||0)+'</div></div>'
    +'</div>'
    +(ofisler.length===0 ? '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">🏢</div><div>Ofis gideri kaydı yok</div><div style="font-size:12px;margin-top:6px">Kira, personel, baro aidatı gibi sabit giderleri buradan takip edin</div></div>'
      : '<div class="card"><div class="table-wrap"><table class="table-card-mobile"><thead><tr><th>Tarih</th><th>Tür</th><th>Açıklama</th><th style="text-align:right">Tutar</th><th></th></tr></thead><tbody>'
        +ofisler.map(function(f){
          return '<tr><td data-label="Tarih" style="font-family:monospace;font-size:12px;color:var(--text3)">'+fmtDate(f.tarih)+'</td><td data-label="Tür"><span style="font-size:12px;font-weight:600">'+escHtml(f.tur)+'</span></td><td data-label="Açıklama" style="font-size:12px;color:var(--text3)">'+escHtml(f.aciklama||'')+'</td><td data-label="Tutar" style="text-align:right;font-family:monospace;font-weight:700;color:var(--red)">₺'+fmt(f.tutar)+'</td><td><button class="btn btn-ghost" style="font-size:11px" data-edit-finans="'+f.id+'">✏</button><button class="btn btn-ghost" style="font-size:11px;color:var(--red)" data-delete-finans="'+f.id+'">🗑</button></td></tr>';
        }).join('')
        +'</tbody></table></div></div>');
}

function renderFinans() {
  const mvSel = document.getElementById('finans-mv-filter');
  if (mvSel) {
    const mvler = DB.get('muvekkiller');
    const curVal = mvSel.value;
    mvSel.innerHTML = '<option value="">Tüm Müvekkiller</option>' +
      mvler.map(m=>`<option value="${escAttr(m.ad)}"${m.ad===curVal?' selected':''}>${escHtml(m.ad)}</option>`).join('');
  }

  // Dönem filtresi
  var donemFilt = document.getElementById('finans-donem-filter')?.value||'';
  var tarihBasEl = document.getElementById('finans-tarih-bas');
  var tarihBitEl = document.getElementById('finans-tarih-bit');
  if (tarihBasEl) tarihBasEl.style.display = donemFilt === 'ozel' ? '' : 'none';
  if (tarihBitEl) tarihBitEl.style.display = donemFilt === 'ozel' ? '' : 'none';

  var now = new Date();
  var donemBas = null, donemBit = null;
  if (donemFilt === 'bu-ay') {
    donemBas = new Date(now.getFullYear(), now.getMonth(), 1);
    donemBit = new Date(now.getFullYear(), now.getMonth()+1, 0);
  } else if (donemFilt === 'gecen-ay') {
    donemBas = new Date(now.getFullYear(), now.getMonth()-1, 1);
    donemBit = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (donemFilt === 'bu-yil') {
    donemBas = new Date(now.getFullYear(), 0, 1);
    donemBit = new Date(now.getFullYear(), 11, 31);
  } else if (donemFilt === 'gecen-yil') {
    donemBas = new Date(now.getFullYear()-1, 0, 1);
    donemBit = new Date(now.getFullYear()-1, 11, 31);
  } else if (donemFilt === 'son-3ay') {
    donemBas = new Date(now.getFullYear(), now.getMonth()-2, 1);
    donemBit = now;
  } else if (donemFilt === 'son-6ay') {
    donemBas = new Date(now.getFullYear(), now.getMonth()-5, 1);
    donemBit = now;
  } else if (donemFilt === 'ozel') {
    var basStr = tarihBasEl?.value;
    var bitStr = tarihBitEl?.value;
    if (basStr) donemBas = new Date(basStr);
    if (bitStr) donemBit = new Date(bitStr);
  }

  const mvFilt = mvSel ? mvSel.value : '';
  const turFilt = document.getElementById('finans-tur-filter')?.value||'';
  let finans = DB.get('finans');

  // Dönem filtresi uygula
  if (donemBas || donemBit) {
    finans = finans.filter(function(f) {
      var t = new Date(f.tarih);
      if (donemBas && t < donemBas) return false;
      if (donemBit && t > donemBit) return false;
      return true;
    });
  }
  // Ofis giderleri islemler sekmesinde gösterme
  const OFIS_TURLER = ['Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];
  var PLAN_TURLER = ['Taksit Planı', 'Karşı Vekalet Ücreti']; // bunlar işlemlerde görünmesin — kendi sekmelerinde takip edilir
  finans = finans.filter(function(f){return !OFIS_TURLER.includes(f.tur) && !PLAN_TURLER.includes(f.tur);});
  if (mvFilt) finans = finans.filter(f => f.muvekkil === mvFilt);
  if (turFilt) finans = finans.filter(f => f.tur === turFilt);

  const GELIR_T = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
  const MASRAF_T = ['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç','Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];
  const OFIS_GID = ['Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];

  const allFinans = DB.get('finans')||[];

  // 1. Tahsil Edilen — tüm gelir türleri (gerçekleşen tahsilatlar)
  const topTah = allFinans.filter(f => GELIR_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);

  // 4. Toplam Tahsilat (Toplam Anlaşılan Ücret) — tüm dava + icra dosyalarındaki akdi ücret toplamı
  const allDavalar = DB.get('davalar')||[];
  const allIcralar = DB.get('icralar')||[];
  const topAnlasilan = allDavalar.reduce((a,d)=>a+Number(d.akdiUcret||0),0) + allIcralar.reduce((a,i)=>a+Number(i.akdiUcret||0),0);

  // 2. Tahsil Edilemeyen — anlaşılan - tahsil edilen
  const tahsilEdilemyen = Math.max(0, topAnlasilan - topTah);

  // 3. Masraf Bakiyesi — toplam masraf (bağımsız, tahsilatla karıştırılmaz)
  // Avans Kasası ile tutarlı olması için hem finans tablosundaki hem de ayrı dava_masraflar tablosundaki kayıtlar toplanır
  const topMasFinans = allFinans.filter(f=>['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç'].includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const topMasDava = (DB.get('dava_masraflar')||[]).reduce((a,b)=>a+Number(b.tutar||0),0);
  const topMas = topMasFinans + topMasDava;

  // Ofis giderleri (grafik için korunuyor)
  const topOfis = allFinans.filter(f=>OFIS_GID.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);

  const summary = document.getElementById('finance-summary');
  if (summary) {
    summary.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px';
    summary.innerHTML = [
      {l:'Tahsil Edilen',     v:'₺'+fmt(topTah),           c:'var(--green)', icon:'↗', sub:'Müvekkillerden alınan toplam ödeme'},
      {l:'Tahsil Edilemeyen',  v:'₺'+fmt(tahsilEdilemyen),   c:tahsilEdilemyen>0?'var(--red)':'var(--green)', icon:'⏳', sub:'Anlaşılan − Tahsil Edilen'},
      {l:'Masraf Bakiyesi',    v:'₺'+fmt(topMas),            c:'var(--red)', icon:'🧾', sub:'Tüm dosyalardaki toplam masraf'},
      {l:'Toplam Anlaşılan',   v:'₺'+fmt(topAnlasilan),      c:'var(--gold)', icon:'📋', sub:'Tüm dosyalardaki anlaşılan ücret toplamı'},
    ].map(x=>`
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px">
        <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:8px">${x.icon} ${x.l}</div>
        <div style="font-size:20px;font-weight:800;color:${x.c};font-family:monospace;line-height:1">${x.v}</div>
        ${x.sub?`<div style="font-size:10px;color:var(--text3);margin-top:5px">${x.sub}</div>`:''}
      </div>`).join('');
  }

  // Aylık grafik
  const cariDiv = document.getElementById('finans-mv-cari');
  if (cariDiv) {
    // Son 6 ay verisini hesapla
    const today = new Date();
    const aylar = [];
    for (let i=5; i>=0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      const label = d.toLocaleString('tr-TR',{month:'short'});
      const ayTah = finans.filter(f=>f.tarih&&f.tarih.startsWith(key)&&GELIR_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
      const ayMas = finans.filter(f=>f.tarih&&f.tarih.startsWith(key)&&MASRAF_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
      aylar.push({key, label, tah:ayTah, mas:ayMas});
    }
    const maxVal = Math.max(...aylar.map(a=>Math.max(a.tah,a.mas)), 1);
    
    cariDiv.style.display = '';
    cariDiv.style.cssText = 'margin-bottom:16px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden';
    cariDiv.innerHTML = `
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:13px;font-weight:700;color:var(--text)">📈 Aylık Tahsilat / Masraf</div>
        <div style="display:flex;gap:14px;font-size:11px;color:var(--text3)">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:3px;background:#4a8c5c;border-radius:2px;display:inline-block"></span>Tahsilat</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:3px;background:#c0533a;border-radius:2px;display:inline-block"></span>Masraf</span>
        </div>
      </div>
      <div style="padding:12px 16px;position:relative;height:160px">
        <canvas id="finans-aylik-chart"></canvas>
      </div>`;

    // Chart.js ile çiz — tooltip çalışır
    setTimeout(function() {
      var ctx2 = document.getElementById('finans-aylik-chart');
      if (!ctx2) return;
      if (window._finansAylikChart) { try { window._finansAylikChart.destroy(); } catch(e) {} }
      window._finansAylikChart = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: aylar.map(a => a.label),
          datasets: [
            { label: 'Tahsilat', data: aylar.map(a => a.tah), backgroundColor: 'rgba(74,140,92,0.7)', borderColor: '#4a8c5c', borderWidth: 1, borderRadius: 4 },
            { label: 'Masraf',   data: aylar.map(a => a.mas), backgroundColor: 'rgba(192,83,58,0.6)', borderColor: '#c0533a', borderWidth: 1, borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          hover: { mode: 'index', intersect: false },
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6455', font: { size: 11 } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6455', font: { size: 11 }, callback: function(v) { return '₺'+fmt(v); } } }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(33,31,27,0.97)',
              borderColor: '#c9a84c',
              borderWidth: 1,
              titleColor: '#f0ead8',
              bodyColor: '#a89f8a',
              padding: 10,
              callbacks: {
                label: function(ctx) { return ' ' + ctx.dataset.label + ': ₺' + fmt(ctx.raw); },
                afterBody: function(items) {
                  if (items.length >= 2) {
                    var net = items[0].raw - items[1].raw;
                    return ['Net: ₺' + fmt(Math.abs(net)) + (net >= 0 ? ' ↑' : ' ↓')];
                  }
                  return [];
                }
              }
            }
          }
        }
      });
    }, 100);
  }

  // Tablo
  const tbody = document.getElementById('finans-tbody');
  if (!tbody) return;
  const sorted = finans.slice().sort((a,b)=>new Date(b.tarih)-new Date(a.tarih));
  const isG = f => ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'].includes(f.tur);
  tbody.innerHTML = sorted.length ? sorted.map(f=>`
    <tr>
      <td data-label="Tarih" style="font-family:monospace;font-size:12px;color:var(--text3)">${fmtDate(f.tarih)}</td>
      <td data-label="Tür / Müvekkil">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(f.tur)}</div>
        ${f.muvekkil ? `<div style="font-size:11px;color:var(--gold);cursor:pointer" onclick="gotoMuvekkilFromFinans('${f.muvekkil}')">${escHtml(f.muvekkil)}</div>` : ''}
      </td>
      <td data-label="Açıklama" style="font-size:12px;color:var(--text3)">${escHtml(f.aciklama||'')}</td>
      <td data-label="Tutar" style="text-align:right;font-family:monospace;font-weight:700;font-size:14px;color:${isG(f)?'var(--green)':'var(--red)'}">
        ${isG(f)?'+':'−'}₺${fmt(f.tutar)}
      </td>
      <td style="text-align:right">
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px" data-edit-finans="${f.id}">✏</button>
          <button class="btn btn-ghost" style="font-size:11px;padding:3px 8px;color:var(--red)" data-delete-finans="${f.id}">🗑</button>
        </div>
      </td>
    </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:30px">İşlem yok</td></tr>';
}



function saveFinans() { withSaveLock('saveFinans', _saveFinansInner); }
function _saveFinansInner() {
  const tutar = parsePara(document.getElementById('f-tutar')?.value);
  const aciklama = document.getElementById('f-aciklama').value.trim();
  if (!tutar) return notify('Tutar giriniz!');
  if (tutar < 0) return notify('⚠️ Geçersiz tutar! Negatif değer girilemez.');
  const ilgiliId = document.getElementById('f-ilgili-id')?.value || '';
  const ilgiliTip = document.getElementById('f-ilgili-tip')?.value || '';
  const obj = {
    id: editingId || DB.genId(),
    tur: document.getElementById('f-tur').value,
    tarih: document.getElementById('f-tarih').value || _localDateStr(),
    tutar,
    muvekkil: document.getElementById('f-muvekkil').value,
    muvekkilId: (function() {
      var ad = document.getElementById('f-muvekkil').value;
      var mv = (DB.get('muvekkiller')||[]).find(function(m){ return m.ad === ad; });
      return mv ? mv.id : '';
    })(),
    ilgili: document.getElementById('f-ilgili')?.value||'',
    davaId: ilgiliTip === 'dava' ? ilgiliId : '',
    icraId: ilgiliTip === 'icra' ? ilgiliId : '',
    aciklama,
    created: new Date().toISOString()
  };
  // Karşı Vekalet Ücreti ise özel alanları ekle
  if (obj.tur === 'Karşı Vekalet Ücreti') {
    obj.karsiVekaletDurum = document.getElementById('f-karsi-vekalet-durum')?.value || 'bekliyor';
    obj.karsiDosya = document.getElementById('f-karsi-dosya')?.value || '';
    // Karşı taraf adını ilgili dosyadan bul
    var kvDosyaNo = obj.karsiDosya || obj.ilgili || '';
    if (kvDosyaNo) {
      var kvDava = (DB.get('davalar')||[]).find(function(d){ return d.no === kvDosyaNo || d.ad === kvDosyaNo; });
      var kvIcra = !kvDava ? (DB.get('icralar')||[]).find(function(i){ return (i.bki||i.no) === kvDosyaNo; }) : null;
      if (kvDava && kvDava.karsi) obj.karsiTaraf = kvDava.karsi;
      else if (kvIcra && kvIcra.borclu) obj.karsiTaraf = kvIcra.borclu;
    }
  }
  let arr = DB.get('finans');
  if (editingId) arr = arr.map(x => x.id === editingId ? obj : x);
  else arr.push(obj);
  DB.set('finans', arr);
  const savedMuvekkil = obj.muvekkil;
  closeModal('modal-finans');
  renderFinans();
  // Aktif finans alt sekmesini de yenile
  var aktifSekme = document.querySelector('.finans-sekme.aktif');
  if (aktifSekme) {
    var sekmeText = aktifSekme.textContent.trim().toLowerCase();
    if (sekmeText.includes('avans')) renderAvansKasa();
    else if (sekmeText.includes('ofis')) renderOfisGider();
    else if (sekmeText.includes('vekalet')) renderKarsiVekalet();
    else if (sekmeText.includes('ödeme') || sekmeText.includes('plan')) renderOdemePlanlari();
  }
  notify(editingId ? 'İşlem güncellendi ✓' : 'İşlem eklendi ✓');
  editingId = null;

  // Dava detay sayfası açıksa finansal sekmesini yenile
  if (currentDavaId && document.getElementById('dava-detail-page') && document.getElementById('dava-detail-page').classList.contains('open')) {
    var aktifDdpSekme = document.querySelector('#dava-detail-page .ddp-sekme.aktif');
    if (aktifDdpSekme && aktifDdpSekme.dataset.sekme === 'finans') {
      renderDavaTab(currentDavaId, 'finans');
    }
  }

  // Müvekkil detay sayfası açıksa onu da yenile
  const mvDetail = document.getElementById('muvekkil-detail');
  if (mvDetail && mvDetail.classList.contains('active') && savedMuvekkil) {
    const mv = DB.get('muvekkiller').find(m => m.ad === savedMuvekkil);
    if (mv) showMuvekkilDetail(mv.id);
  }
}

function editFinans(id) {
  const f = DB.get('finans').find(x => x.id === id);
  if (!f) return;
  editingId = id;
  populateMuvekkilSelects();
  document.getElementById('f-tur').value = f.tur;
  document.getElementById('f-tarih').value = f.tarih;
  document.getElementById('f-tutar').value = f.tutar;
  document.getElementById('f-muvekkil').value = f.muvekkil || '';
  document.getElementById('f-aciklama').value = f.aciklama;
  // Dosya ID bağlantısını geri yükle
  const ilgiliIdEl = document.getElementById('f-ilgili-id');
  const ilgiliTipEl = document.getElementById('f-ilgili-tip');
  if (ilgiliIdEl) ilgiliIdEl.value = f.davaId || f.icraId || '';
  if (ilgiliTipEl) ilgiliTipEl.value = f.davaId ? 'dava' : (f.icraId ? 'icra' : '');
  document.getElementById('modal-finans-title').textContent = 'İşlemi Düzenle';
  openModal('modal-finans');
}

function deleteFinans(id) {
  // Silinecek kaydı önceden sakla
  var silinenF = (DB.get('finans')||[]).find(function(x){ return x.id === id; });
  showConfirmModal('Bu finansal işlemi silmek istediğinizden emin misiniz?', function() {
    var yeniFinans = DB.get('finans').filter(function(x){ return x.id !== id; });
    // Taksit Tahsilatı silinirse orijinal taksit kaydını "bekliyor"a döndür
    if (silinenF && silinenF.tur === 'Taksit Tahsilatı') {
      // Durum 1: finans tablosundaki taksit (kaynakTaksitId ile bağlı)
      if (silinenF.kaynakTaksitId) {
        yeniFinans = yeniFinans.map(function(f) {
          if (f.id === silinenF.kaynakTaksitId) return Object.assign({}, f, { taksitDurumu: 'bekliyor', odenmeTarihi: null });
          return f;
        });
      }
      // Durum 2: odeme_planlari tablosundaki manuel taksit (finansId ile bağlı)
      var planlar = DB.get('odeme_planlari') || [];
      var planGuncellendi = false;
      planlar = planlar.map(function(plan) {
        var degisti = false;
        var yeniTaksitler = (plan.taksitler || []).map(function(t) {
          if (t.finansId === id) {
            degisti = true;
            planGuncellendi = true;
            var yeni = Object.assign({}, t);
            yeni.durum = 'bekliyor';
            delete yeni.odenmeTarihi;
            delete yeni.finansId;
            return yeni;
          }
          return t;
        });
        return degisti ? Object.assign({}, plan, { taksitler: yeniTaksitler }) : plan;
      });
      if (planGuncellendi) DB.set('odeme_planlari', planlar);
    }
    DB.set('finans', yeniFinans);
    // Ana finans listesini yenile
    renderFinans();
    renderKarsiVekalet();
    renderOdemePlanlari();
    renderAvansKasa();
    renderOfisGider();
    // Dava detay sayfası açıksa finans sekmesini yenile
    var ddp = document.getElementById('dava-detail-page');
    if (currentDavaId && ddp && ddp.classList.contains('open')) {
      renderDavaTab(currentDavaId, 'finans');
    } else if (silinenF && silinenF.davaId) {
      // Dava detay açık değil ama kayda bağlı dava varsa dava listesini yenile
      if (typeof renderDavalar === 'function') renderDavalar();
    }
    // İcra detay sayfası açıksa yenile
    var idp = document.getElementById('icra-detail-page');
    if (currentIcraId && idp && idp.classList.contains('open')) {
      if (silinenF && silinenF.icraId === currentIcraId) {
        renderIcraTab(currentIcraId, 'finans');
      }
    } else if (silinenF && silinenF.icraId) {
      if (typeof renderIcralar === 'function') renderIcralar();
    }
    // Müvekkil detay sayfası açıksa yenile
    if (silinenF && silinenF.muvekkil) {
      var mvDetail = document.getElementById('muvekkil-detail');
      if (mvDetail && mvDetail.classList.contains('active')) {
        var mv = (DB.get('muvekkiller')||[]).find(function(m){ return m.ad === silinenF.muvekkil; });
        if (mv) showMuvekkilDetail(mv.id);
      }
    }
    // Dashboard açıksa yenile
    var dashPage = document.getElementById('page-dashboard');
    if (dashPage && getComputedStyle(dashPage).display !== 'none') {
      renderDashboard();
    }
    notify('İşlem silindi');
  });
}

// ========== GÖREVLER ==========
let taskFilter = 'all';
function renderTasks() {
  var tasks = DB.get('tasks') || [];
  var davalar = DB.get('davalar') || [];
  var icralar = DB.get('icralar') || [];

  var badge = tasks.filter(function(t){return !t.done && t.tip!=='durusma';}).length;
  var badgeEl = document.getElementById('task-badge');
  if(badgeEl) badgeEl.textContent = badge;

  var dosyaFilter = (document.getElementById('task-dosya-filter') && document.getElementById('task-dosya-filter').value) || '';
  if (dosyaFilter) tasks = tasks.filter(function(t){ return t.ilgili === dosyaFilter; });

  if (taskFilter === 'pending') tasks = tasks.filter(function(t){return !t.done;});
  else if (taskFilter === 'urgent') tasks = tasks.filter(function(t){return !t.done && (t.oncelik==='Acil'||isUrgent(t.tarih));});
  else if (taskFilter === 'done')   tasks = tasks.filter(function(t){return t.done;});

  var today = new Date(); today.setHours(0,0,0,0);

  function getDiff(t) {
    if (!t.tarih) return null;
    return Math.ceil((new Date(t.tarih.slice(0,10)) - today) / 86400000);
  }

  function dosyaAdi(t) {
    if(!t.ilgili) return '';
    var dava = davalar.find(function(d){ return d.ad===t.ilgili||d.no===t.ilgili; });
    if(dava) return dava.no + (dava.muvekkil ? ' — ' + dava.muvekkil.split(' ').slice(0,2).join(' ') : '');
    var icra = icralar.find(function(i){ return i.bki===t.ilgili||i.no===t.ilgili; });
    if(icra) return (icra.bki||icra.no) + (icra.borclu ? ' — ' + icra.borclu.split(' ').slice(0,2).join(' ') : '');
    return t.ilgili;
  }

  // === KPI KARTLARI ===
  var kpiBar = document.getElementById('task-kpi-bar');
  if (kpiBar) {
    var allTasks = DB.get('tasks') || [];
    var totalBekleyen = allTasks.filter(function(t){return !t.done && t.tip!=='durusma';}).length;
    var bugunku = allTasks.filter(function(t){return !t.done && getDiff(t)===0;}).length;
    var geciken = allTasks.filter(function(t){var d=getDiff(t); return !t.done && d!==null && d<0;}).length;
    var buHaftaki = allTasks.filter(function(t){var d=getDiff(t); return !t.done && d!==null && d>0 && d<=7;}).length;
    var tamamlanan = allTasks.filter(function(t){return t.done;}).length;
    var toplamGorev = allTasks.length;
    var tamamYuzde = toplamGorev > 0 ? Math.round(tamamlanan / toplamGorev * 100) : 0;

    var kpis = [
      {icon:'🔥', label:'Gecikmiş', val:geciken, clr:'var(--red)', bg:'rgba(192,83,58,0.1)', border:'rgba(192,83,58,0.3)'},
      {icon:'📍', label:'Bugün', val:bugunku, clr:'var(--gold)', bg:'rgba(201,168,76,0.08)', border:'rgba(201,168,76,0.25)'},
      {icon:'📅', label:'Bu Hafta', val:buHaftaki, clr:'#7ab5d4', bg:'rgba(122,181,212,0.08)', border:'rgba(122,181,212,0.25)'},
      {icon:'📋', label:'Toplam Bekleyen', val:totalBekleyen, clr:'var(--text2)', bg:'rgba(255,255,255,0.03)', border:'var(--border)'},
      {icon:'✅', label:'Tamamlanan', val:tamamYuzde+'%', clr:'var(--green)', bg:'rgba(74,140,92,0.08)', border:'rgba(74,140,92,0.25)'},
    ];
    kpiBar.innerHTML = kpis.map(function(k){
      return '<div style="background:'+k.bg+';border:1px solid '+k.border+';border-radius:12px;padding:14px 16px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.15)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\'">'
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><span style="font-size:16px">'+k.icon+'</span><span style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);font-weight:600">'+k.label+'</span></div>'
        +'<div style="font-size:26px;font-weight:800;color:'+k.clr+';font-family:\'DM Mono\',monospace;line-height:1">'+k.val+'</div>'
        +'</div>';
    }).join('');
  }

  var listEl = document.getElementById('task-list');
  if (!listEl) return;

  var activeTab = listEl.dataset.activeTab || '';

  // Görevleri grupla
  var bugun    = tasks.filter(function(t){return !t.done && getDiff(t)===0;});
  var buHafta  = tasks.filter(function(t){var d=getDiff(t);return !t.done && d!==null && d>0 && d<=7;}).sort(function(a,b){return new Date(a.tarih)-new Date(b.tarih);});
  var buAy     = tasks.filter(function(t){var d=getDiff(t);return !t.done && d!==null && d>7 && d<=31;}).sort(function(a,b){return new Date(a.tarih)-new Date(b.tarih);});
  var buYil    = tasks.filter(function(t){var d=getDiff(t);return !t.done && (d===null || d>31);}).sort(function(a,b){return new Date(a.tarih||'9999')-new Date(b.tarih||'9999');});
  var gecikmus = tasks.filter(function(t){var d=getDiff(t);return !t.done && d!==null && d<0;}).sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);});
  var tamam    = tasks.filter(function(t){return t.done;}).sort(function(a,b){return new Date(b.tamamlanmaTarihi||b.tarih||'0')-new Date(a.tamamlanmaTarihi||a.tarih||'0');});

  var tumBekleyen = gecikmus.concat(bugun).concat(buHafta).concat(buAy).concat(buYil);
  var tabs = [
    {id:'tumü',     label:'📋 Tümü',     count:tumBekleyen.length, clr:'var(--text2)', liste:tumBekleyen},
    {id:'gecikmus', label:'⚠ Gecikmiş', count:gecikmus.length,    clr:'var(--red)',   liste:gecikmus},
    {id:'bugun',    label:'📍 Bugün',    count:bugun.length,       clr:'var(--gold)',  liste:bugun},
    {id:'hafta',    label:'📅 Bu Hafta', count:buHafta.length,     clr:'var(--text2)', liste:buHafta},
    {id:'ay',       label:'📆 Bu Ay',    count:buAy.length,        clr:'var(--text3)', liste:buAy},
    {id:'diger',    label:'🗓 Sonraki',  count:buYil.length,       clr:'var(--text3)', liste:buYil},
    {id:'tamam',    label:'✅ Tamam',    count:tamam.length,       clr:'var(--green)', liste:tamam},
  ];

  if(!activeTab) {
    activeTab = gecikmus.length ? 'gecikmus' : 'tumü';
  }

  listEl.innerHTML = '';

  // === MODERN TAB BAR ===
  var tabBar = document.createElement('div');
  tabBar.style.cssText = 'display:flex;gap:4px;padding:4px;background:var(--bg2);border-radius:12px;border:1px solid var(--border);margin-bottom:16px;overflow-x:auto;scrollbar-width:none;flex-shrink:0';

  tabs.forEach(function(tab) {
    var btn = document.createElement('button');
    var isActive = activeTab === tab.id;
    btn.style.cssText = 'padding:8px 14px;background:'+(isActive?'var(--bg)':'transparent')+';border:'+(isActive?'1px solid var(--border)':'1px solid transparent')+';border-radius:9px;color:'+(isActive?tab.clr:'var(--text3)')+';font-size:12px;font-weight:'+(isActive?'700':'500')+';cursor:pointer;white-space:nowrap;font-family:inherit;transition:all 0.15s;display:flex;align-items:center;gap:6px'+(isActive?';box-shadow:0 1px 3px rgba(0,0,0,0.2)':'');
    btn.innerHTML = tab.label+(tab.count?'<span style="background:'+(isActive?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.06)')+';border-radius:8px;padding:2px 8px;font-size:10px;font-weight:700;min-width:18px;text-align:center">'+tab.count+'</span>':'');
    btn.onmouseover = function(){ if(!isActive) this.style.background='rgba(255,255,255,0.04)'; };
    btn.onmouseout  = function(){ if(!isActive) this.style.background='transparent'; };
    btn.onclick = (function(tabId){ return function(){
      listEl.dataset.activeTab = tabId;
      renderTasks();
    }; })(tab.id);
    tabBar.appendChild(btn);
  });
  listEl.appendChild(tabBar);

  var activeListe = (tabs.find(function(t){return t.id===activeTab;})||tabs[1]).liste;
  var activeTabObj = tabs.find(function(t){return t.id===activeTab;})||tabs[1];

  if(!activeListe.length) {
    var empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:60px 20px;color:var(--text3)';
    empty.innerHTML = '<div style="font-size:48px;margin-bottom:16px;opacity:0.4">'+(activeTab==='tamam'?'🎉':'✨')+'</div><div style="font-size:15px;font-weight:600;color:var(--text2);margin-bottom:4px">'+( activeTab==='tamam'?'Henüz tamamlanan görev yok':'Bu periyotta görev yok')+'</div><div style="font-size:12px;color:var(--text3)">Yeni görev eklemek için + butonunu kullanın</div>';
    listEl.appendChild(empty);
    return;
  }

  // === GÖREV KARTLARI ===
  var cardGrid = document.createElement('div');
  cardGrid.style.cssText = 'display:flex;flex-direction:column;gap:6px';

  activeListe.forEach(function(t, idx) {
    var diff = getDiff(t);
    var gecikti = diff!==null && diff<0 && !t.done;
    var isToday = diff===0 && !t.done;
    var tipIcon = t.tip==='randevu'?'📞':t.tip==='durusma'?'⚖️':'✅';
    var tipLabel = t.tip==='randevu'?'Randevu':t.tip==='durusma'?'Duruşma':'Görev';
    var dosyaLabel = dosyaAdi(t);

    // Öncelik renkleri
    var prClr = t.oncelik==='Acil'?'var(--red)':t.oncelik==='Yüksek'?'var(--gold)':'rgba(74,140,92,0.6)';
    var prBg = t.oncelik==='Acil'?'rgba(192,83,58,0.12)':t.oncelik==='Yüksek'?'rgba(201,168,76,0.08)':'rgba(74,140,92,0.06)';

    // Kart border sol kenar rengi — öncelik göstergesi
    var borderLeft = t.done ? 'var(--green)' : (gecikti ? 'var(--red)' : prClr);

    var card = document.createElement('div');
    card.style.cssText = 'background:var(--bg2);border:1px solid '+(gecikti?'rgba(192,83,58,0.3)':isToday?'rgba(201,168,76,0.25)':'var(--border)')+';border-left:3px solid '+borderLeft+';border-radius:10px;padding:12px 16px;cursor:pointer;transition:all 0.15s;display:grid;grid-template-columns:28px 1fr auto;gap:12px;align-items:start'+(t.done?';opacity:0.55':'');
    card.style.animationDelay = (idx * 20) + 'ms';
    card.onmouseover = function(){ this.style.background='rgba(255,255,255,0.04)';this.style.transform='translateX(2px)'; };
    card.onmouseout  = function(){ this.style.background='var(--bg2)';this.style.transform=''; };
    card.onclick = function(){ gorevDetayAc(t.id); };

    // Checkbox
    var chk = document.createElement('div');
    chk.style.cssText = 'width:22px;height:22px;border-radius:7px;border:2px solid '+(t.done?'var(--green)':'rgba(255,255,255,0.2)')+';background:'+(t.done?'var(--green)':'transparent')+';cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;margin-top:1px';
    if(t.done) chk.innerHTML = '<svg width="12" height="10" viewBox="0 0 10 8" fill="none"><path d="M1 3.5L3.5 6L9 1" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    chk.onmouseover = function(){ if(!t.done) this.style.borderColor='var(--gold)';this.style.transform='scale(1.1)'; };
    chk.onmouseout = function(){ if(!t.done) this.style.borderColor='rgba(255,255,255,0.2)';this.style.transform=''; };
    chk.onclick = function(e){ e.stopPropagation(); toggleTask(t.id, renderTasks); };

    // İçerik
    var mid = document.createElement('div');
    mid.style.cssText = 'min-width:0';

    // Üst satır: tip badge + başlık
    var titleRow = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">'
      +'<span style="font-size:12px">'+tipIcon+'</span>'
      +'<span style="font-size:13.5px;font-weight:600;color:'+(t.done?'var(--text3)':'gecikti'?'var(--red)':'var(--text)')+(t.done?';text-decoration:line-through':'')+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">'+escHtml(t.baslik||t.text||'')+'</span>'
      +'</div>';

    // Alt satır: meta bilgiler
    var metaRow = '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
    if (dosyaLabel) {
      metaRow += '<span style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px"><span style="opacity:0.6">📁</span>'+escHtml(dosyaLabel)+'</span>';
    }
    if (t.tarih) {
      var dateClr = gecikti ? 'var(--red)' : isToday ? 'var(--gold)' : 'var(--text3)';
      var diffLabel = gecikti ? (Math.abs(diff)+' gün gecikmiş') : isToday ? 'Bugün' : (diff!==null && diff<=7) ? (diff+' gün sonra') : '';
      metaRow += '<span style="font-size:11px;color:'+dateClr+';display:flex;align-items:center;gap:3px;font-weight:'+(gecikti||isToday?'600':'400')+'"><span style="opacity:0.6">🕐</span>'+fmtDateShort(t.tarih.slice(0,10))+(diffLabel?' · '+diffLabel:'')+'</span>';
    }
    metaRow += '</div>';

    mid.innerHTML = titleRow + metaRow;

    // Sağ taraf: öncelik + aksiyonlar
    var rightCol = document.createElement('div');
    rightCol.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0';

    // Öncelik badge
    var prBadge = document.createElement('span');
    prBadge.style.cssText = 'font-size:10px;font-weight:700;padding:3px 10px;border-radius:6px;background:'+prBg+';color:'+prClr+';letter-spacing:0.03em;text-transform:uppercase';
    prBadge.textContent = t.oncelik || 'Normal';

    // Aksiyon butonları
    var acts = document.createElement('div');
    acts.style.cssText = 'display:flex;gap:2px;opacity:0.4;transition:opacity 0.15s';
    card.onmouseover = (function(actsRef, cardRef){ return function(){ actsRef.style.opacity='1';cardRef.style.background='rgba(255,255,255,0.04)';cardRef.style.transform='translateX(2px)'; }; })(acts, card);
    card.onmouseout = (function(actsRef, cardRef){ return function(){ actsRef.style.opacity='0.4';cardRef.style.background='var(--bg2)';cardRef.style.transform=''; }; })(acts, card);

    var editBtn = document.createElement('button');
    editBtn.style.cssText='font-size:11px;padding:4px 8px;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:6px;color:var(--text3);cursor:pointer;font-family:inherit';
    editBtn.textContent='✏'; editBtn.onclick=function(e){e.stopPropagation();editTask(t.id);};
    var delBtn = document.createElement('button');
    delBtn.style.cssText='font-size:11px;padding:4px 8px;background:rgba(192,83,58,0.06);border:1px solid rgba(192,83,58,0.2);border-radius:6px;color:var(--red);cursor:pointer;font-family:inherit';
    delBtn.textContent='🗑'; delBtn.onclick=function(e){e.stopPropagation();deleteTask(t.id);};
    acts.appendChild(editBtn); acts.appendChild(delBtn);

    rightCol.appendChild(prBadge);
    rightCol.appendChild(acts);

    card.appendChild(chk);
    card.appendChild(mid);
    card.appendChild(rightCol);
    cardGrid.appendChild(card);
  });

  listEl.appendChild(cardGrid);
}





function filterTasks(f, el) {
  taskFilter = f;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  const personVisible = document.getElementById('task-view-person')?.style.display !== 'none';
  if (personVisible) renderTasksByPerson();
  else renderTasks();
}

function toggleTask(id, cb) {
  let arr = DB.get('tasks');
  arr = arr.map(t=>{
    if (t.id !== id) return t;
    const yeniDone = !t.done;
    const gecmis = t.gecmis || [];
    gecmis.push({
      tip: yeniDone ? 'tamamlandi' : 'yeniden_acildi',
      tarih: new Date().toISOString(),
      aciklama: yeniDone ? 'Görev tamamlandı' : 'Görev yeniden açıldı'
    });
    return {...t, done: yeniDone, tamamlanmaTarihi: yeniDone ? new Date().toISOString() : null, gecmis};
  });
  DB.set('tasks', arr);
  if (typeof cb === 'function') cb();
  else renderTasks();
  if (isCalendarVisible()) renderCalendar();
}

function editTask(id) {
  const t = DB.get('tasks').find(x=>x.id===id);
  if (!t) return;
  editingId = id;
  setTaskTip(t.tip || 'gorev');
  document.getElementById('t-baslik').value = t.baslik;
  setDateValue(document.getElementById('t-tarih'), t.tarih ? t.tarih.slice(0,10) : '');
  document.getElementById('t-saat').value = t.tarih && t.tarih.includes('T') ? t.tarih.slice(11,16) : '09:00';
  document.getElementById('t-oncelik').value = t.oncelik || 'Normal';
  document.getElementById('t-hatirlatma').value = t.hatirlatma||'';
  document.getElementById('t-aciklama').value = t.aciklama||'';
  document.getElementById('t-mahkeme-durusma').value = t.mahkeme||'';
  document.getElementById('modal-task-title').textContent = t.tip === 'durusma' ? 'Duruşmayı Düzenle' : 'Görevi Düzenle';
  openModal('modal-task');
  populateDavaSelect(t.ilgili||'');
}

// ========== GOOGLE CALENDAR ==========
function gcalLink(title, startDt, endDt, details, location) {
  // startDt/endDt: "2026-01-15T09:00" format
  function toGcal(dt) {
    if (!dt) return '';
    // If only date (no time), treat as all-day
    if (dt.length === 10) return dt.replace(/-/g,'');
    return new Date(dt).toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
  }
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const params = new URLSearchParams({
    text: title,
    dates: `${toGcal(startDt)}/${toGcal(endDt || startDt)}`,
    details: details || '',
    location: location || '',
  });
  return `${base}&${params.toString()}`;
}

function openGcal(taskId) {
  const t = DB.get('tasks').find(x=>x.id===taskId);
  if (!t || !t.tarih) return notify('Takvime eklemek için son tarih girilmeli');
  const details = [
    t.aciklama || '',
    t.ilgili ? `İlgili: ${t.ilgili}` : '',
    `Öncelik: ${t.oncelik}`,
    'Hukuk Ofisi Yönetim Paneli'
  ].filter(Boolean).join('\n');
  window.open(gcalLink(t.baslik, t.tarih, t.tarih, details), '_blank');
}

function openGcalDurusma(davaId) {
  const d = DB.get('davalar').find(x=>x.id===davaId);
  if (!d || !d.sonraki) return notify('Duruşma tarihi girilmeli');
  const details = `Dava: ${d.no}\nMahkeme: ${d.mahkeme}\nKarşı Taraf: ${d.karsi||'—'}\nMüvekkil: ${d.muvekkil}\n\nHukuk Ofisi Yönetim Paneli`;
  window.open(gcalLink(`⚖ Duruşma — ${d.konu}`, d.sonraki, d.sonraki, details, d.mahkeme), '_blank');
}

function setTaskTip(tip) {
  document.getElementById('t-tip').value = tip;
  const isDurusma = tip === 'durusma';
  const isRandevu = tip === 'randevu';
  // Buton stilleri - 3 buton
  const gorevBtn   = document.getElementById('t-tip-gorev-btn');
  const durusmaBtn = document.getElementById('t-tip-durusma-btn');
  const randevuBtn = document.getElementById('t-tip-randevu-btn');
  if(gorevBtn)   { gorevBtn.style.background   = (!isDurusma&&!isRandevu)?'var(--gold)':'transparent'; gorevBtn.style.color=(!isDurusma&&!isRandevu)?'#1a1600':'var(--text3)'; }
  if(durusmaBtn) { durusmaBtn.style.background = isDurusma?'rgba(58,107,140,0.4)':'transparent'; durusmaBtn.style.color=isDurusma?'#7ab5d4':'var(--text3)'; }
  if(randevuBtn) { randevuBtn.style.background = isRandevu?'rgba(74,140,92,0.3)':'transparent'; randevuBtn.style.color=isRandevu?'var(--green)':'var(--text3)'; }
  // Alan görünürlükleri
  const saatG = document.getElementById('t-saat-group');
  const mhkG  = document.getElementById('t-mahkeme-group');
  const onclG = document.getElementById('t-oncelik-group');
  if(saatG) saatG.style.display    = isDurusma ? '' : 'none';
  if(mhkG)  mhkG.style.display     = isDurusma ? '' : 'none';
  if(onclG) onclG.style.display    = isDurusma ? 'none' : '';
  const baslikLabel = document.getElementById('t-baslik-label');
  const baslikInp   = document.getElementById('t-baslik');
  const saveBtn     = document.getElementById('t-save-btn');
  if(baslikLabel) baslikLabel.textContent = isDurusma ? 'Duruşma Konusu' : isRandevu ? 'Randevu Konusu' : 'Görev Başlığı';
  if(baslikInp)   baslikInp.placeholder  = isDurusma ? 'Kira alacağı — 1. Duruşma...' : isRandevu ? 'Müvekkil görüşmesi, telefon...' : 'Dilekçe hazırla, araştır...';
  if(saveBtn)     saveBtn.textContent    = isDurusma ? '⚖️ Duruşmayı Kaydet' : isRandevu ? '📞 Randevuyu Kaydet' : 'Kaydet';
  const titleEl = document.getElementById('modal-task-title');
  if (titleEl && !titleEl.textContent.includes('Düzenle')) {
    titleEl.textContent = isDurusma ? 'Yeni Duruşma' : isRandevu ? 'Yeni Randevu' : 'Yeni Görev';
  }
}


// Duruşma modalında ilgili dosya seçilince mahkeme otomatik doldur
function durusmaIlgiliDegis() {
  var tip = document.getElementById('t-tip') ? document.getElementById('t-tip').value : '';
  if (tip !== 'durusma') return;
  var ilgili = document.getElementById('t-ilgili').value;
  if (!ilgili) return;
  var davalar = DB.get('davalar') || [];
  var icralar = DB.get('icralar') || [];
  var dava = davalar.find(function(d){ return d.no === ilgili || d.id === ilgili; });
  var mahkemeEl = document.getElementById('t-mahkeme-durusma');
  if (dava && mahkemeEl) {
    if (dava.mahkeme) mahkemeEl.value = dava.mahkeme;
    // Konuyu da başlık olarak öner
    var baslikEl = document.getElementById('t-baslik');
    if (baslikEl && !baslikEl.value) baslikEl.value = 'DURUŞMA';
  }
}

function saveTask() { withSaveLock('saveTask', _saveTaskInner); }
function _saveTaskInner() {
  const baslik = document.getElementById('t-baslik').value.trim();
  if (!baslik) return notify('Başlık zorunludur!');
  // Tarih validasyonu — GG.AA.YYYY veya YYYY-MM-DD formatını destekle
  const tarihVal = document.getElementById('t-tarih').value;
  if (tarihVal) {
    var _tarihISO = tarihVal;
    if (tarihVal.includes('.')) {
      var _p = tarihVal.split('.');
      if (_p.length === 3) _tarihISO = _p[2] + '-' + _p[1].padStart(2,'0') + '-' + _p[0].padStart(2,'0');
    }
    const d = new Date(_tarihISO + 'T00:00:00');
    const y = d.getFullYear();
    if (isNaN(d.getTime()) || y < 1900 || y > 2100) return notify('Geçersiz tarih! GG.AA.YYYY formatında girin.');
  }
  const tip = document.getElementById('t-tip').value || 'gorev';
  const saat = document.getElementById('t-saat').value || '';
  const tarihRaw = document.getElementById('t-tarih').value;
  const tarih = getDateValue(document.getElementById('t-tarih')) || tarihRaw;
  const obj = {
    id: editingId || DB.genId(),
    tip,
    baslik,
    tarih: tarih && saat && tip === 'durusma' ? tarih + 'T' + saat : tarih,
    oncelik: tip === 'durusma' ? 'Normal' : document.getElementById('t-oncelik').value,
    ilgili: document.getElementById('t-ilgili').value,
    mahkeme: tip === 'durusma' ? document.getElementById('t-mahkeme-durusma').value.trim() : '',
    hatirlatma: getDateValue(document.getElementById('t-hatirlatma')),
    aciklama: document.getElementById('t-aciklama').value,
    done: false,
    created: new Date().toISOString()
  };

  // ⚖️ Çakışan duruşma kontrolü — aynı tarih+saatte başka bir (bitmemiş) duruşma var mı?
  if (tip === 'durusma' && obj.tarih && obj.tarih.includes('T')) {
    const mevcutArr = DB.get('tasks');
    const cakisan = mevcutArr.filter(function(t) {
      return t.tip === 'durusma' && t.id !== editingId && !t.done && t.tarih === obj.tarih;
    });
    if (cakisan.length > 0) {
      const detay = cakisan.map(function(t) {
        return '• ' + escHtml(t.baslik || 'İsimsiz duruşma') + (t.mahkeme ? ' — ' + escHtml(t.mahkeme) : '') + (t.ilgili ? ' (' + escHtml(t.ilgili) + ')' : '');
      }).join('<br>');
      showConfirmModal(
        '⚠️ Aynı tarih ve saatte (' + fmtDate(obj.tarih.slice(0,10)) + ' saat ' + obj.tarih.slice(11,16) + ') zaten kayıtlı duruşma(lar) var:<br><br>' + detay + '<br><br>Yine de kaydetmek istiyor musunuz?',
        function() { _saveTaskFinalize(obj, tip); },
        { okLabel: 'Yine de Kaydet', okBg: 'rgba(201,168,76,0.85)', okBorder: 'rgba(201,168,76,0.4)', icon: '⚖️', iconBg: 'rgba(201,168,76,0.15)', iconBorder: 'rgba(201,168,76,0.3)' }
      );
      return;
    }
  }

  _saveTaskFinalize(obj, tip);
}

function _saveTaskFinalize(obj, tip) {
  // closeModal() aşağıda global editingId'i null'lar; bildirim metni
  // (düzenlendi/eklendi) için orijinal değeri şimdiden sakla
  const duzenleniyorMuydu = !!editingId;
  let arr = DB.get('tasks');
  if (editingId) {
    const eskiTask = arr.find(x=>x.id===editingId);
    obj.done = eskiTask?.done||false;
    // Orijinal oluşturma tarihini koru
    if (eskiTask?.created) obj.created = eskiTask.created;
    if (eskiTask?.tamamlanmaTarihi) obj.tamamlanmaTarihi = eskiTask.tamamlanmaTarihi;
    if (eskiTask?.subtasks) obj.subtasks = eskiTask.subtasks;
    // Tarih değiştiyse geçmişe kaydet (erteleme kaydı)
    if (eskiTask && eskiTask.tarih && obj.tarih && eskiTask.tarih !== obj.tarih) {
      const gecmis = eskiTask.gecmis || [];
      gecmis.push({ 
        tip: 'erteleme', 
        eskiTarih: eskiTask.tarih, 
        yeniTarih: obj.tarih,
        tarih: new Date().toISOString(),
        aciklama: 'Tarih değiştirildi'
      });
      obj.gecmis = gecmis;
    } else {
      obj.gecmis = eskiTask?.gecmis || [];
    }
    arr = arr.map(x=>x.id===editingId?obj:x);
  } else {
    obj.gecmis = [];
    arr.push(obj);
  }
  DB.set('tasks', arr);
  closeModal('modal-task');
  // Dava detay sayfası açıksa ilgili sekmeyi yenile
  if (currentDavaId) {
    const aktifSekme = document.querySelector('.ddp-sekme.aktif');
    const sekme = aktifSekme ? aktifSekme.dataset.sekme : 'gorev';
    if (sekme === 'durusma' || sekme === 'gorev') renderDavaTab(currentDavaId, sekme);
  }
  renderTasks();
  renderCalendar();
  if (typeof renderDurusmaTakvim === 'function' && currentPage === 'durusmatakvim') renderDurusmaTakvim();
  if (obj.tarih) {
    showGcalPrompt(obj);
  } else {
    notify(duzenleniyorMuydu ? (tip==='durusma'?'Duruşma güncellendi':'Görev güncellendi') : (tip==='durusma'?'Duruşma eklendi ✓':'Görev eklendi ✓'));
  }
  editingId = null;
  if (obj.hatirlatma) scheduleReminder(obj);
}

// ================================================================
// UYAP İÇE AKTARMA — FAZ 1 (manuel Excel içe aktarma)
// UYAP Avukat Portal → Duruşmalarım → "Excel'e Aktar" çıktısını okur.
//
// Üç ayrı sonuç — otomatik dosya AÇILMAZ:
//   1) TAKVİM   — her satır, eşleşsin eşleşmesin, duruşma olarak eklenir (tasks, tip:'durusma').
//   2) TAMAMLA  — esas no + mahkeme birlikte eşleşirse, o davanın SADECE boş
//                 alanları (konu, karşı taraf) UYAP verisiyle doldurulur; dolu alana dokunulmaz.
//   3) ONAY     — eşleşmeyenler ayrı listede gösterilir; "Bu dosyayı aç" ile
//                 Yeni Dava formu UYAP verisiyle ön-dolu açılır, kullanıcı kendi onaylar/kaydeder.
//
// Eşleştirme kriteri: esas no VE mahkeme birlikte (yalnız esas no yeterli değil).
// ================================================================

var _uyapImportRows = [];

var _UYAP_HEADER_MAP = [
  { key: 'mahkeme',   al: ['birim'] },
  { key: 'esasNo',    al: ['dosya no', 'esas no'] },
  { key: 'dosyaTuru', al: ['dosya turu', 'dosya türü'] },
  { key: 'tarih',     al: ['duruşma tarihi', 'durusma tarihi'] },
  { key: 'taraflar',  al: ['taraf bilgisi', 'taraflar'] },
  { key: 'islem',     al: ['işlem', 'islem'] },
  { key: 'sonuc',     al: ['sonuç', 'sonuc'] },
];
var _UYAP_ROLLER = ['DAVACI','DAVALI','TANIK','VEKİL','VEKIL','MÜŞTEKİ','MUSTEKI','SANIK','BORÇLU','BORCLU','ALACAKLI','ŞÜPHELİ','SUPHELI','KATILAN','MÜDAHİL','MUDAHIL','BİLİRKİŞİ','BILIRKISI'];
var _UYAP_ANA_ROL = ['DAVACI','DAVALI','ALACAKLI','BORÇLU','BORCLU','MÜŞTEKİ','MUSTEKI','SANIK','KATILAN'];

function _uyapTrLow(s) { return (s == null ? '' : String(s)).trim().toLocaleLowerCase('tr'); }
function _uyapTrUp(s) { return (s == null ? '' : String(s)).trim().toLocaleUpperCase('tr'); }

function _uyapMapHeaders(headerRow) {
  var idx = {};
  headerRow.forEach(function(h, i) {
    var t = _uyapTrLow(h);
    for (var m = 0; m < _UYAP_HEADER_MAP.length; m++) {
      if (_UYAP_HEADER_MAP[m].al.indexOf(t) !== -1) { idx[_UYAP_HEADER_MAP[m].key] = i; break; }
    }
  });
  return idx;
}

function _uyapParseTarih(v) {
  var s = (v == null ? '' : String(v)).trim();
  var m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return { iso: '', saat: '', ok: false };
  var d = m[1], mo = m[2], y = m[3], hh = m[4], mm = m[5];
  var p = function(n) { return String(n).padStart(2, '0'); };
  return { iso: y + '-' + p(mo) + '-' + p(d), saat: (hh != null ? p(hh) + ':' + mm : ''), ok: true };
}

function _uyapParseTaraflar(v) {
  var s = (v == null ? '' : String(v)).trim();
  if (!s) return [];
  var segs = s.split(' - ').map(function(x){return x.trim();}).filter(Boolean);
  if (segs.length === 1) return [{ ad: segs[0], rol: null }];
  var out = [];
  var sonRol = _UYAP_ROLLER.indexOf(_uyapTrUp(segs[segs.length - 1])) !== -1 ? _uyapTrUp(segs[segs.length - 1]) : null;
  out.push({ ad: segs[0], rol: sonRol });
  for (var i = 1; i < segs.length - 1; i++) {
    var kel = segs[i].split(/\s+/);
    var first = _uyapTrUp(kel[0]);
    if (_UYAP_ROLLER.indexOf(first) !== -1) out.push({ ad: kel.slice(1).join(' '), rol: first });
    else out.push({ ad: segs[i], rol: null });
  }
  return out.filter(function(t){return t.ad;});
}

function _uyapTurBelirle(dosyaTuru) {
  var t = _uyapTrLow(dosyaTuru);
  return (t.indexOf('icra') !== -1 || t.indexOf('iflas') !== -1) ? 'icra' : 'dava';
}

function _uyapAnaTaraflar(taraflar) {
  var ana = taraflar.filter(function(t){ return t.rol && _UYAP_ANA_ROL.indexOf(t.rol) !== -1; });
  return ana.length ? ana : taraflar;
}

// Mahkeme adlarını gevşek karşılaştırma (boşluk/harf büyüklüğü farkına takılmasın)
function _uyapMahkemeEsit(a, b) {
  var norm = function(s) { return _uyapTrLow(s).replace(/\s+/g, ' ').trim(); };
  return !!a && !!b && norm(a) === norm(b);
}

function openUyapImportModal() {
  document.getElementById('uyap-import-step-pick').style.display = '';
  document.getElementById('uyap-import-step-preview').style.display = 'none';
  document.getElementById('uyap-import-msg').innerHTML = '';
  document.getElementById('uyap-import-file').value = '';
  _uyapImportRows = [];
  openModal('modal-uyap-import');
}
function _uyapImportClose() { closeModal('modal-uyap-import'); }
function _uyapImportBack() {
  document.getElementById('uyap-import-step-pick').style.display = '';
  document.getElementById('uyap-import-step-preview').style.display = 'none';
}

function _uyapImportPreview(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var msgEl = document.getElementById('uyap-import-msg');
  msgEl.style.color = ''; msgEl.innerHTML = 'Okunuyor…';
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
      if (!aoa.length) { msgEl.style.color = 'var(--red)'; msgEl.innerHTML = 'Dosya boş görünüyor.'; return; }
      var idx = _uyapMapHeaders(aoa[0]);
      if (idx.esasNo == null || idx.tarih == null) {
        msgEl.style.color = 'var(--red)';
        msgEl.innerHTML = 'Beklenen sütunlar bulunamadı ("Dosya No" ve "Duruşma Tarihi" gerekli). Bu, UYAP Duruşmalarım → Excel\'e Aktar çıktısı mı?';
        return;
      }
      var dataRows = aoa.slice(1).filter(function(r){ return r.some(function(c){ return String(c).trim() !== ''; }); });
      var get = function(r, k) { return idx[k] != null ? r[idx[k]] : ''; };

      var davalar = DB.get('davalar') || [];
      var icralar = DB.get('icralar') || [];
      var tasks = DB.get('tasks') || [];

      _uyapImportRows = dataRows.map(function(r) {
        var t = _uyapParseTarih(get(r, 'tarih'));
        var esasNo = (get(r, 'esasNo') || '').toString().trim();
        var mahkeme = (get(r, 'mahkeme') || '').toString().trim();
        var tur = _uyapTurBelirle(get(r, 'dosyaTuru'));
        var taraflar = _uyapParseTaraflar(get(r, 'taraflar'));
        var dedupKey = esasNo + '|' + t.iso + '|' + t.saat + '|' + mahkeme;

        // Eşleştirme: esas no VE mahkeme birlikte (yanlış-pozitifi önler)
        var pool = tur === 'icra' ? icralar : davalar;
        var eslesen = pool.find(function(x) {
          return x.esas && x.esas.trim() === esasNo && _uyapMahkemeEsit(x.mahkeme, mahkeme);
        });

        var mevcutTask = tasks.find(function(tk) {
          return tk.tip === 'durusma' && tk._uyapDedupKey === dedupKey;
        });

        return {
          tur: tur, esasNo: esasNo, mahkeme: mahkeme,
          dosyaTuru: (get(r, 'dosyaTuru') || '').toString().trim(),
          tarihIso: t.iso, saat: t.saat, tarihOk: t.ok,
          islem: (get(r, 'islem') || '').toString().trim(),
          sonuc: (get(r, 'sonuc') || '').toString().trim(),
          taraflar: taraflar,
          dedupKey: dedupKey,
          eslesenId: eslesen ? eslesen.id : null,
          eslesenNo: eslesen ? eslesen.no : null,
          zatenVar: !!mevcutTask,
          takvimSecili: t.ok && !!esasNo && !mevcutTask
        };
      });

      var eksik = [];
      if (idx.mahkeme == null) eksik.push('Birim');
      if (idx.taraflar == null) eksik.push('Taraf Bilgisi');
      msgEl.style.color = eksik.length ? 'var(--gold)' : 'var(--green)';
      msgEl.innerHTML = eksik.length
        ? 'Şu sütunlar bulunamadı, o alanlar boş kalacak: ' + escHtml(eksik.join(', '))
        : ('✓ ' + _uyapImportRows.length + ' satır okundu.');

      _uyapRenderPreview();
      document.getElementById('uyap-import-step-pick').style.display = 'none';
      document.getElementById('uyap-import-step-preview').style.display = '';
    } catch (err) {
      msgEl.style.color = 'var(--red)';
      msgEl.innerHTML = 'Dosya okunamadı: ' + escHtml(err.message || String(err));
    }
  };
  reader.readAsArrayBuffer(file);
}

function _uyapRenderPreview() {
  var rows = _uyapImportRows;
  var eslesen = rows.filter(function(r){ return r.eslesenId; });
  var yeni = rows.filter(function(r){ return !r.eslesenId; });
  var tekrar = rows.filter(function(r){ return r.zatenVar; }).length;

  var cards = [
    ['Duruşma satırı', rows.length],
    ['Takvime eklenecek', rows.filter(function(r){return r.takvimSecili;}).length],
    ['Mevcut dosyayı tamamlar', eslesen.length],
    ['Sende kaydı yok', yeni.length]
  ];
  document.getElementById('uyap-import-cards').innerHTML = cards.map(function(c) {
    return '<div class="card" style="padding:10px 12px"><div style="font-size:11px;color:var(--text3)">' + c[0] + '</div>' +
      '<div style="font-size:18px;font-weight:700;color:var(--text)">' + c[1] + '</div></div>';
  }).join('');

  // 1) Takvim tablosu — her satır, eşleşme durumundan bağımsız
  document.getElementById('uyap-import-tbody').innerHTML = rows.map(function(r, i) {
    var badge = r.zatenVar
      ? '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(192,83,58,0.12);color:var(--red)">zaten takvimde</span>'
      : r.eslesenId
        ? '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(74,163,110,0.12);color:var(--green)">dosya: ' + escHtml(r.eslesenNo) + '</span>'
        : '<span style="font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(201,168,76,0.15);color:var(--gold)">dosya sende yok</span>';
    var ana = _uyapAnaTaraflar(r.taraflar).map(function(t){ return (t.rol ? t.rol + ' ' : '') + escHtml(t.ad); }).join(', ') || '—';
    var when = r.tarihOk ? escHtml(r.tarihIso) + (r.saat ? ' · ' + escHtml(r.saat) : '') : '<span style="color:var(--red)">okunamadı</span>';
    return '<tr' + (r.zatenVar ? ' style="opacity:.5"' : '') + '>' +
      '<td>' + (r.tarihOk ? '<input type="checkbox" ' + (r.takvimSecili ? 'checked' : '') + (r.zatenVar ? ' disabled' : '') + ' data-uyap-idx="' + i + '">' : '') + '</td>' +
      '<td>' + escHtml(r.esasNo || '—') + '</td>' +
      '<td>' + (r.tur === 'icra' ? '⚡ İcra' : '⚖️ Dava') + '</td>' +
      '<td>' + escHtml(r.mahkeme || '—') + '</td>' +
      '<td>' + when + '</td>' +
      '<td>' + ana + '</td>' +
      '<td>' + badge + '</td></tr>';
  }).join('');

  // 2) Eşleşmeyen dosyalar — onay listesi (tek tek "Bu dosyayı aç")
  var yeniEl = document.getElementById('uyap-import-yeni-wrap');
  var yeniUnique = [];
  var gorulen = {};
  yeni.forEach(function(r) {
    var k = r.esasNo + '|' + r.mahkeme;
    if (!r.esasNo || gorulen[k]) return;
    gorulen[k] = true; yeniUnique.push(r);
  });
  if (!yeniUnique.length) {
    yeniEl.style.display = 'none';
  } else {
    yeniEl.style.display = '';
    document.getElementById('uyap-import-yeni-tbody').innerHTML = yeniUnique.map(function(r, i) {
      var ana = _uyapAnaTaraflar(r.taraflar);
      var idxOrig = rows.indexOf(r);
      return '<tr>' +
        '<td>' + escHtml(r.esasNo) + '</td>' +
        '<td>' + (r.tur === 'icra' ? '⚡ İcra' : '⚖️ Dava') + '</td>' +
        '<td>' + escHtml(r.mahkeme || '—') + '</td>' +
        '<td>' + escHtml(ana.map(function(t){return t.ad;}).join(', ') || '—') + '</td>' +
        '<td><button class="btn btn-outline" style="font-size:11px;padding:4px 10px" onclick="_uyapAcYeniDava(' + idxOrig + ')">Bu dosyayı aç</button></td></tr>';
    }).join('');
  }
}

// "Bu dosyayı aç" — Yeni Dava formunu UYAP verisiyle ön-doldurup açar.
// Hiçbir şey otomatik kaydedilmez; kullanıcı formu inceleyip kendi kaydeder.
function _uyapAcYeniDava(rowIdx) {
  var r = _uyapImportRows[rowIdx];
  if (!r) return;
  if (r.tur === 'icra') {
    notify('İcra dosyaları için "Yeni İcra" formunu elle açıp esas no: ' + r.esasNo + ' bilgisini girin.');
    return;
  }
  _uyapImportClose();
  document.getElementById('modal-dava-title').textContent = 'Yeni Dava Dosyası (UYAP\'tan)';
  openModal('modal-dava');
  if (typeof populateMuvekkilSelects === 'function') populateMuvekkilSelects();
  if (typeof updateKisilerDatalist === 'function') updateKisilerDatalist();

  var ana = _uyapAnaTaraflar(r.taraflar);
  var karsiTaraf = ana.map(function(t){ return t.ad; }).join(', ');

  document.getElementById('d-esas').value = r.esasNo || '';
  document.getElementById('d-mahkeme').value = r.mahkeme || '';
  document.getElementById('d-davali').value = karsiTaraf;
  if (r.islem) document.getElementById('d-konu').value = r.islem + (r.sonuc ? ' — ' + r.sonuc : '');
  notify('Form UYAP verisiyle ön-dolduruldu — kontrol edip kaydedin.');
}

function saveUyapImport() { withSaveLock('saveUyapImport', _saveUyapImportInner); }
function _saveUyapImportInner() {
  var checkboxes = document.querySelectorAll('#uyap-import-tbody input[type=checkbox]:checked');
  var secilenIdx = Array.prototype.map.call(checkboxes, function(cb) { return parseInt(cb.dataset.uyapIdx, 10); });
  var secilenler = secilenIdx.map(function(i) { return _uyapImportRows[i]; }).filter(function(r) { return r && !r.zatenVar; });
  if (!secilenler.length) { notify('Takvime eklenecek yeni duruşma seçilmedi.'); return; }

  var davalar = DB.get('davalar') || [];
  var icralar = DB.get('icralar') || [];
  var tasks = DB.get('tasks') || [];
  var yeniTask = 0, tamamlananDosya = 0, davaGuncellendi = false;

  secilenler.forEach(function(r) {
    // ── 1) TAKVİM: her seçili satır için duruşma kaydı (eşleşme şart değil) ──
    var ilgiliNo = r.eslesenNo || r.esasNo; // dosya yoksa esas no ile göster, dosyaya bağlanmaz
    var taraflarOzet = r.taraflar.map(function(t){ return (t.rol ? t.rol + ': ' : '') + t.ad; }).join(' · ');
    tasks.push({
      id: DB.genId(), tip: 'durusma',
      baslik: (r.islem || 'DURUŞMA') + (r.sonuc ? ' — ' + r.sonuc : ''),
      tarih: r.tarihIso + (r.saat ? 'T' + r.saat : ''),
      oncelik: 'Normal', ilgili: ilgiliNo, mahkeme: r.mahkeme,
      aciklama: taraflarOzet, done: false, gecmis: [],
      kaynak: 'uyap-excel', _uyapDedupKey: r.dedupKey,
      created: new Date().toISOString()
    });
    yeniTask++;

    // ── 2) TAMAMLA: eşleşen dava varsa, SADECE boş alanları doldur ──
    if (r.eslesenId) {
      var davaIdx = davalar.findIndex(function(d){ return d.id === r.eslesenId; });
      if (davaIdx !== -1) {
        var d = davalar[davaIdx];
        var ana = _uyapAnaTaraflar(r.taraflar);
        // Müvekkil adı zaten dosyada kayıtlıysa, karşı taraf listesinden onu çıkar
        // — aksi halde "karşı taraf" alanına yanlışlıkla müvekkilin kendisi de yazılır.
        var muvekkilAdiNorm = _uyapTrLow(d.muvekkil || '');
        var karsiAday = ana.filter(function(t) {
          return !muvekkilAdiNorm || _uyapTrLow(t.ad).indexOf(muvekkilAdiNorm) === -1;
        });
        if (!karsiAday.length) karsiAday = ana; // müvekkil bilgisi yoksa hepsini göster, kullanıcı ayıklar
        var karsiTaraf = karsiAday.map(function(t){ return t.ad; }).join(', ');
        var patch = {};
        if (!d.konu && r.islem) patch.konu = r.islem + (r.sonuc ? ' — ' + r.sonuc : '');
        if (!d.karsi && karsiTaraf) patch.karsi = karsiTaraf;
        // sonraki duruşma: boşsa veya geçmişteyse, bu duruşma daha yakınsa güncelle
        if (!d.sonraki || new Date(d.sonraki) < new Date() || r.tarihIso < d.sonraki) patch.sonraki = r.tarihIso;
        if (Object.keys(patch).length) {
          davalar[davaIdx] = Object.assign({}, d, patch);
          davaGuncellendi = true;
          tamamlananDosya++;
        }
      }
    }
  });

  DB.set('tasks', tasks);
  if (davaGuncellendi) DB.set('davalar', davalar);

  _uyapImportClose();
  renderTasks();
  renderCalendar();
  if (typeof renderDavalar === 'function' && currentPage === 'davalar') renderDavalar();
  if (typeof renderDurusmaTakvim === 'function' && currentPage === 'durusmatakvim') renderDurusmaTakvim();

  notify('✓ ' + yeniTask + ' duruşma takvime eklendi' + (tamamlananDosya ? ', ' + tamamlananDosya + ' dosyanın eksik alanı tamamlandı' : ''));
}


// ============================================================
// UYAP DOSYA LİSTESİ İÇE AKTARMA — FAZ 1B
// UYAP → Dosya Sorgulama → XLSX Olarak Dışa Aktar
// Kolonlar: Birim | Dosya No | Dosya Türü | Dosya Durumu | Dosya Açılış Tarihi
// ============================================================

var _uyapDosyaRows = []; // { esasNo, mahkeme, tur, durum, tarih, eslesen, eslesenId, eslesenTablo }

function openUyapDosyaImportModal() {
  document.getElementById('uyap-dosya-step-pick').style.display = '';
  document.getElementById('uyap-dosya-step-preview').style.display = 'none';
  document.getElementById('uyap-dosya-msg').textContent = '';
  document.getElementById('uyap-dosya-file').value = '';
  _uyapDosyaRows = [];
  openModal('modal-uyap-dosya-import');
}

function _uyapDosyaBack() {
  document.getElementById('uyap-dosya-step-pick').style.display = '';
  document.getElementById('uyap-dosya-step-preview').style.display = 'none';
  document.getElementById('uyap-dosya-file').value = '';
  _uyapDosyaRows = [];
}

function _uyapDosyaImportPreview(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var msgEl = document.getElementById('uyap-dosya-msg');
  msgEl.textContent = 'Dosya okunuyor...';

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var wb = XLSX.read(e.target.result, { type: 'array' });
      var ws = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) { msgEl.textContent = '❌ Dosyada veri bulunamadı.'; return; }

      // Kolon adlarını normalize et
      var kolonMap = {};
      Object.keys(rows[0]).forEach(function(k) {
        var kl = _uyapTrLow(k.trim());
        if (kl.indexOf('birim') !== -1) kolonMap.birim = k;
        else if (kl.indexOf('dosya no') !== -1 || kl.indexOf('dosya_no') !== -1) kolonMap.dosyaNo = k;
        else if (kl.indexOf('dosya t') !== -1) kolonMap.dosyaTuru = k;
        else if (kl.indexOf('dosya d') !== -1 && kl.indexOf('durum') !== -1) kolonMap.dosyaDurumu = k;
        else if (kl.indexOf('tarih') !== -1 || kl.indexOf('açılış') !== -1) kolonMap.tarih = k;
      });

      if (!kolonMap.birim || !kolonMap.dosyaNo) {
        msgEl.textContent = '❌ Beklenen kolonlar bulunamadı. UYAP Dosya Sorgulama XLSX\'i mi seçtiniz?';
        return;
      }

      var davalar = DB.get('davalar') || [];
      var icralar = DB.get('icralar') || [];

      _uyapDosyaRows = rows.map(function(r) {
        var esasNo   = String(r[kolonMap.dosyaNo] || '').trim();
        var mahkeme  = String(r[kolonMap.birim] || '').trim();
        var dosyaTur = String(r[kolonMap.dosyaTuru] || '').trim();
        var durumStr = String(r[kolonMap.dosyaDurumu] || '').trim();
        var tarihStr = String(r[kolonMap.tarih] || '').trim();

        var tur      = _uyapTurBelirle(dosyaTur);
        var durum    = durumStr === 'Açık' ? 'Aktif' : durumStr === 'Kapalı' ? 'Kapalı' : '';
        var tarih    = tarihStr ? tarihStr.slice(0, 10).split('.').reverse().join('-') : '';

        // Önce davalar, sonra icralar içinde eşleştir
        var eslesen = null, eslesenId = null, eslesenTablo = null;
        var dEslesen = davalar.find(function(d) {
          return d.esas && d.esas.trim() === esasNo && _uyapMahkemeEsit(d.mahkeme, mahkeme);
        });
        if (dEslesen) {
          eslesen = dEslesen; eslesenId = dEslesen.id; eslesenTablo = 'davalar';
        } else {
          var iEslesen = icralar.find(function(i) {
            return i.esas && i.esas.trim() === esasNo && _uyapMahkemeEsit(i.mahkeme, mahkeme);
          });
          if (iEslesen) { eslesen = iEslesen; eslesenId = iEslesen.id; eslesenTablo = 'icralar'; }
        }

        return { esasNo: esasNo, mahkeme: mahkeme, dosyaTur: dosyaTur, tur: tur, durum: durum, tarih: tarih, eslesen: eslesen, eslesenId: eslesenId, eslesenTablo: eslesenTablo };
      }).filter(function(r) { return r.esasNo; });

      if (!_uyapDosyaRows.length) { msgEl.textContent = '❌ Geçerli satır bulunamadı.'; return; }

      msgEl.textContent = '';
      _uyapDosyaRenderPreview();
      document.getElementById('uyap-dosya-step-pick').style.display = 'none';
      document.getElementById('uyap-dosya-step-preview').style.display = '';
    } catch(err) {
      msgEl.textContent = '❌ Dosya okunamadı: ' + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
}

function _uyapDosyaRenderPreview() {
  var eslesenler = _uyapDosyaRows.filter(function(r) { return r.eslesen; });
  var yeniler    = _uyapDosyaRows.filter(function(r) { return !r.eslesen; });

  // Özet kartlar
  var cardsEl = document.getElementById('uyap-dosya-cards');
  cardsEl.innerHTML = [
    { label: 'Toplam Dosya', val: _uyapDosyaRows.length, clr: 'var(--text)' },
    { label: 'Eşleşen',      val: eslesenler.length,     clr: 'var(--green)' },
    { label: 'Yeni / Kayıt Yok', val: yeniler.length,   clr: 'var(--gold)' }
  ].map(function(c) {
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px 14px;text-align:center">'
      + '<div style="font-size:22px;font-weight:700;color:' + c.clr + '">' + c.val + '</div>'
      + '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + c.label + '</div></div>';
  }).join('');

  // Eşleşen tablo
  var eslesenWrap = document.getElementById('uyap-dosya-eslesen-wrap');
  if (eslesenler.length) {
    var tbody = document.getElementById('uyap-dosya-eslesen-tbody');
    tbody.innerHTML = eslesenler.map(function(r, i) {
      var idx = _uyapDosyaRows.indexOf(r);
      var burodaki = r.eslesen.no + (r.eslesen.ad || r.eslesen.borclu ? ' — ' + (r.eslesen.ad || r.eslesen.borclu) : '');
      return '<tr>'
        + '<td><input type="checkbox" checked data-uyap-dosya-idx="' + idx + '"></td>'
        + '<td>' + escHtml(r.esasNo) + '</td>'
        + '<td style="font-size:11px">' + escHtml(r.mahkeme) + '</td>'
        + '<td>' + escHtml(r.durum) + '</td>'
        + '<td style="font-size:11px;color:var(--text3)">' + escHtml(burodaki) + '</td>'
        + '</tr>';
    }).join('');
    eslesenWrap.style.display = '';
  } else {
    eslesenWrap.style.display = 'none';
  }

  // Yeni / eşleşmeyen tablo
  var yeniWrap = document.getElementById('uyap-dosya-yeni-wrap');
  if (yeniler.length) {
    var yeniTbody = document.getElementById('uyap-dosya-yeni-tbody');
    yeniTbody.innerHTML = yeniler.map(function(r) {
      var idx = _uyapDosyaRows.indexOf(r);
      return '<tr>'
        + '<td>' + escHtml(r.esasNo) + '</td>'
        + '<td style="font-size:11px">' + escHtml(r.mahkeme) + '</td>'
        + '<td>' + escHtml(r.dosyaTur) + '</td>'
        + '<td>' + escHtml(r.durum) + '</td>'
        + '<td><button class="btn btn-outline" style="font-size:11px;padding:3px 10px" onclick="_uyapDosyaAcYeni(' + idx + ')">'
          + (r.tur === 'icra' ? '+ Yeni İcra Aç' : '+ Yeni Dava Aç') + '</button></td>'
        + '</tr>';
    }).join('');
    yeniWrap.style.display = '';
  } else {
    yeniWrap.style.display = 'none';
  }

  var confirmBtn = document.getElementById('uyap-dosya-confirm-btn');
  if (confirmBtn) confirmBtn.style.display = eslesenler.length ? '' : 'none';
}

function _uyapDosyaAcYeni(idx) {
  var r = _uyapDosyaRows[idx];
  if (!r) return;
  closeModal('modal-uyap-dosya-import');
  if (r.tur === 'icra') {
    openModal('modal-icra');
    setTimeout(function() {
      var esasEl = document.getElementById('i-esas');
      var mEl    = document.getElementById('i-mahkeme');
      if (esasEl) esasEl.value = r.esasNo;
      if (mEl)    mEl.value    = r.mahkeme;
    }, 100);
  } else {
    openModal('modal-dava');
    setTimeout(function() {
      var esasEl = document.getElementById('d-esas');
      var mEl    = document.getElementById('d-mahkeme');
      populateMuvekkilSelects && populateMuvekkilSelects();
      if (esasEl) esasEl.value = r.esasNo;
      if (mEl)    mEl.value    = r.mahkeme;
    }, 100);
  }
}

function saveUyapDosyaImport() {
  var davalar  = DB.get('davalar')  || [];
  var icralar  = DB.get('icralar')  || [];
  var dGuncellendi = false, iGuncellendi = false, sayac = 0;

  document.querySelectorAll('[data-uyap-dosya-idx]:checked').forEach(function(cb) {
    var r = _uyapDosyaRows[parseInt(cb.dataset.uyapDosyaIdx)];
    if (!r || !r.eslesenId) return;

    var patch = {};
    if (r.eslesenTablo === 'davalar') {
      var d = davalar.find(function(x){ return x.id === r.eslesenId; });
      if (!d) return;
      if (!d.esas    && r.esasNo)  patch.esas    = r.esasNo;
      if (!d.mahkeme && r.mahkeme) patch.mahkeme = r.mahkeme;
      if (!d.durum   && r.durum)   patch.durum   = r.durum;
      if (!d.tarih   && r.tarih)   patch.tarih   = r.tarih;
      if (Object.keys(patch).length) {
        var idx = davalar.indexOf(d);
        davalar[idx] = Object.assign({}, d, patch);
        dGuncellendi = true; sayac++;
      }
    } else {
      var ic = icralar.find(function(x){ return x.id === r.eslesenId; });
      if (!ic) return;
      if (!ic.esas    && r.esasNo)  patch.esas    = r.esasNo;
      if (!ic.mahkeme && r.mahkeme) patch.mahkeme = r.mahkeme;
      if (!ic.tarih   && r.tarih)   patch.tarih   = r.tarih;
      if (Object.keys(patch).length) {
        var idx2 = icralar.indexOf(ic);
        icralar[idx2] = Object.assign({}, ic, patch);
        iGuncellendi = true; sayac++;
      }
    }
  });

  if (dGuncellendi) DB.set('davalar', davalar);
  if (iGuncellendi) DB.set('icralar', icralar);

  closeModal('modal-uyap-dosya-import');
  if (typeof renderDavalar === 'function') renderDavalar();
  if (typeof renderIcralar === 'function') renderIcralar();
  notify(sayac ? '✓ ' + sayac + ' dosyanın bilgileri güncellendi.' : 'Güncellenecek alan bulunamadı.');
}
