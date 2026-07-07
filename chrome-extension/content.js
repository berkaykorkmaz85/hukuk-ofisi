(function () {
  var lastDosya = null;
  var lastEvrakNos = null;
  var scanTimeout = null;

  function extractAndReport() {
    // Dosya başlığı
    var dosyaEl = document.querySelector('.dosya-sorgula-popup .dx-popup-title');
    if (!dosyaEl) return;
    var dosyaAdi = dosyaEl.innerText.split('\n')[0].trim();
    if (!dosyaAdi) return;

    // Evrak listesi (Son 20 Evrak)
    var items = Array.from(document.querySelectorAll('.evrak-treeview .dx-treeview-node-is-leaf'));
    if (items.length === 0) return;

    var evraklar = items.map(function (el) {
      var ariaLabel = el.getAttribute('aria-label') || '';
      var titleEl = el.querySelector('[title]');
      var titleText = titleEl ? titleEl.getAttribute('title') : '';

      var noMatch = titleText.match(/Birim Evrak No:\s*(\d+)/);
      var no = noMatch ? noMatch[1] : null;

      var turMatch = titleText.match(/Tür:\s*([^\n]+)/);
      var tur = turMatch ? turMatch[1].trim() : '';

      var tarihMatch = ariaLabel.match(/(\d{2}\/\d{2}\/\d{4})$/);
      var tarih = tarihMatch ? tarihMatch[1] : '';

      var ad = ariaLabel.replace(/\s*\d{2}\/\d{2}\/\d{4}$/, '').trim();

      return { no: no, ad: ad, tur: tur, tarih: tarih };
    }).filter(function (e) { return e.no; });

    if (evraklar.length === 0) return;

    // Aynı dosya + aynı liste ise tekrar gönderme
    var nosKey = evraklar.map(function (e) { return e.no; }).sort().join(',');
    if (dosyaAdi === lastDosya && nosKey === lastEvrakNos) return;
    lastDosya = dosyaAdi;
    lastEvrakNos = nosKey;

    chrome.runtime.sendMessage({ type: 'EVRAK_UPDATE', data: { dosyaAdi: dosyaAdi, evraklar: evraklar } });
  }

  var observer = new MutationObserver(function () {
    if (scanTimeout) clearTimeout(scanTimeout);
    scanTimeout = setTimeout(extractAndReport, 900);
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
