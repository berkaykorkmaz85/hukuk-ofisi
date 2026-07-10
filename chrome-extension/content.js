(function () {
  var lastDosya = null;
  var lastEvrakNos = null;
  var scanTimeout = null;

  function getSon20Items() {
    // DevExtreme treeview düğümleri içinde "Son 20 Evrak" başlıklı olanı bul
    var treeNodes = document.querySelectorAll('.dx-treeview-node');
    for (var i = 0; i < treeNodes.length; i++) {
      var contentEl = treeNodes[i].querySelector('.dx-treeview-item-content');
      if (contentEl && contentEl.innerText && contentEl.innerText.trim().indexOf('Son 20 Evrak') !== -1) {
        var scoped = Array.from(treeNodes[i].querySelectorAll('.evrak-list--item'));
        if (scoped.length > 0) return scoped;
      }
    }
    // Fallback: "Tüm Evraklar" görünümündeyse hiçbir şey döndürme
    var tumEvrakAktif = Array.from(document.querySelectorAll('.dx-treeview-item-content'))
      .some(function(el) {
        return el.innerText && el.innerText.trim().indexOf('Tüm Evrak') !== -1 &&
               el.closest('.dx-treeview-node-is-leaf') === null;
      });
    if (tumEvrakAktif) return [];
    // Son çare: genel selector
    return Array.from(document.querySelectorAll('.evrak-treeview .evrak-list--item'));
  }

  function extractAndReport() {
    // Extension yeniden yüklendiyse context geçersiz — observer'ı durdur
    if (!chrome.runtime || !chrome.runtime.id) {
      observer.disconnect();
      return;
    }

    // Dosya başlığı — popup içindeki ilk satır
    var dosyaEl = document.querySelector('.dosya-sorgula-popup .dx-popup-title');
    if (!dosyaEl) return;
    var dosyaAdi = dosyaEl.innerText.split('\n')[0].trim();
    if (!dosyaAdi) return;

    // Sadece "Son 20 Evrak" düğümü altındaki itemları al
    var items = getSon20Items();
    if (items.length === 0) return;

    var evraklar = items.map(function (el) {
      // Detaylı bilgi title attribute'unda
      var titleEl = el.querySelector('[title]');
      var titleText = titleEl ? titleEl.getAttribute('title') : '';

      // Birim Evrak No
      var noMatch = titleText.match(/Birim Evrak No:\s*(\d+)/);
      var no = noMatch ? noMatch[1] : null;

      // Tür
      var turMatch = titleText.match(/Tür:\s*([^\n\r]+)/);
      var tur = turMatch ? turMatch[1].trim() : '';

      // Onaylanma tarihi
      var tarihMatch = titleText.match(/Onaylandığı Tarih:\s*([\d\/]+)/);
      var tarih = tarihMatch ? tarihMatch[1].trim() : '';

      // Ad — title element'in innerText'i "Duruşma Zaptı 08/07/2026" formatında
      var innerText = titleEl ? titleEl.innerText.trim() : '';
      var ad = innerText.replace(/\s*\d{2}\/\d{2}\/\d{4}.*$/, '').trim() || tur;

      return { no: no, ad: ad, tur: tur, tarih: tarih };
    }).filter(function (e) { return e.no; });

    if (evraklar.length === 0) return;

    // Aynı dosya + aynı liste ise tekrar gönderme
    var nosKey = evraklar.map(function (e) { return e.no; }).sort().join(',');
    if (dosyaAdi === lastDosya && nosKey === lastEvrakNos) return;
    lastDosya = dosyaAdi;
    lastEvrakNos = nosKey;

    try {
      chrome.runtime.sendMessage({
        type: 'EVRAK_UPDATE',
        data: { dosyaAdi: dosyaAdi, evraklar: evraklar }
      });
    } catch (e) {
      observer.disconnect();
    }
  }

  // DOM değişikliklerini izle (UYAP SPA — evrak listesi AJAX ile yükleniyor)
  var observer = new MutationObserver(function () {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(extractAndReport, 1000);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Sayfa zaten yüklüyse ilk taramayı da çalıştır
  setTimeout(extractAndReport, 1500);
})();
