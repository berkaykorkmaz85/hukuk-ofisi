// ══ PARA GİRİŞİ: tüm tutar alanlarında canlı binlik ayıracı ══
// Yazarken 1000000 → 1.000.000, ondalık için virgül: 1.250,50
// Mevcut kod alanları .value ile okumaya devam eder; okunan değer HAM sayıdır
// ("1000000.5"), böylece Number(), parseFloat(), parsePara() hepsi doğru çalışır.
(function () {
  var PARA_IDLER = ['d-dava-degeri','d-akdi-ucret','d-pesinat-tutar','d-tahsil-edilen','d-masraf',
    'i-alacak','i-akdi-ucret','i-tahsil-edilen','i-masraf',
    'm-u-avukatlik','m-u-aylik','m-u-yillik','m-u-saatlik','m-u-pesinat',
    'f-tutar','op-toplam','op-pesinat','c-tutar','smm-tutar','fhd-anapara','tg-asgari','sa-tutar',
    'idp-masraf-tutar','ddp-masraf-tutar'];
  var proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

  // Her türlü yazımı sayıya çevir: 1.000.000 / 1.000.000,50 / 1000000.5 / 1250,5 / sayı
  function oku(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var t = String(v == null ? '' : v).replace(/[^\d.,-]/g, '');
    if (!t || t === '-') return null;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if ((t.match(/\./g) || []).length > 1 || /^\-?\d{1,3}\.\d{3}$/.test(t)) t = t.replace(/\./g, '');
    var n = parseFloat(t);
    return isNaN(n) ? null : n;
  }
  // Yazılmakta olan metni biçimle (ondalık kısmı kullanıcının yazdığı gibi korunur)
  function bicimle(metin) {
    var s = String(metin || '').replace(/[^\d,]/g, '');
    var virgul = s.indexOf(',');
    var tam = virgul >= 0 ? s.slice(0, virgul) : s;
    var ond = virgul >= 0 ? s.slice(virgul + 1).replace(/,/g, '').slice(0, 2) : null;
    tam = tam.replace(/^0+(?=\d)/, '');
    var t = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (ond !== null) t = (t || '0') + ',' + ond;
    return t;
  }
  function sayidanMetin(n) {
    if (n == null) return '';
    var r = Math.round(n * 100) / 100;
    var tam = Math.trunc(Math.abs(r)), ond = Math.round((Math.abs(r) - tam) * 100);
    var t = String(tam).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (ond) t += ',' + String(ond).padStart(2, '0');
    return (r < 0 ? '-' : '') + t;
  }
  function ham(el) {
    var n = oku(proto.get.call(el));
    return n == null ? '' : String(n);
  }

  function hazirla(el) {
    if (!el || el._canliPara || el.readOnly || el.type === 'hidden' || el.type === 'date') return;
    el._canliPara = true;
    var mevcut = proto.get.call(el);
    if (el.type === 'number') { try { el.type = 'text'; } catch (e) {} }
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('autocomplete', 'off');
    Object.defineProperty(el, 'value', {
      configurable: true,
      get: function () { return ham(this); },
      set: function (v) { proto.set.call(this, (v === '' || v == null) ? '' : sayidanMetin(oku(v))); }
    });
    if (mevcut) el.value = mevcut;
    el.addEventListener('input', function () {
      var eski = proto.get.call(el);
      var imlec = el.selectionStart == null ? eski.length : el.selectionStart;
      var oncesi = eski.slice(0, imlec).replace(/[^\d,]/g, '').length;
      var yeni = bicimle(eski);
      if (yeni === eski) return;
      proto.set.call(el, yeni);
      var say = 0, pos = 0;
      while (pos < yeni.length && say < oncesi) { if (/[\d,]/.test(yeni[pos])) say++; pos++; }
      try { el.setSelectionRange(pos, pos); } catch (e) {}
    });
    // Nokta tuşu: Türkçe klavyede ondalık için virgüle çevir (binlik ayıracı otomatik)
    el.addEventListener('keydown', function (e) {
      if (e.key === '.' || e.key === 'Decimal') {
        var v = proto.get.call(el);
        e.preventDefault();
        if (v.indexOf(',') < 0) {
          var p = el.selectionStart == null ? v.length : el.selectionStart;
          proto.set.call(el, v.slice(0, p) + ',' + v.slice(p));
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
  }

  function tara(kok) {
    kok = kok || document;
    PARA_IDLER.forEach(function (id) { var el = document.getElementById(id); if (el) hazirla(el); });
    if (kok.querySelectorAll) kok.querySelectorAll('input[data-para]').forEach(hazirla);
  }
  window._paraAlaniHazirla = hazirla;
  window._paraTara = tara;

  // Eski blur/focus biçimlendiricisi canlı biçimlendirmeyle çakışmasın
  var eskiInit = window.initParaInput;
  window.initParaInput = function (el) { hazirla(el); if (!el || !el._canliPara) return eskiInit && eskiInit(el); };

  // parsePara: tek nokta + 1-2 ondalık hane ("1000000.5") ondalık sayılsın
  var eskiParse = window.parsePara;
  window.parsePara = function (str) { var n = oku(str); return n == null ? 0 : n; };

  // Dinamik olarak çizilen sekme/modal içeriklerini de yakala
  var bekleyen = false;
  new MutationObserver(function () {
    if (bekleyen) return; bekleyen = true;
    requestAnimationFrame(function () { bekleyen = false; tara(document); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ tara(); });
  else tara();
})();
