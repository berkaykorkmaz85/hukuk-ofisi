chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {

  if (msg.type === 'EVRAK_UPDATE') {
    var dosyaAdi = msg.data.dosyaAdi;
    var evraklar = msg.data.evraklar;
    var storageKey = 'seen_' + dosyaAdi.slice(0, 80).replace(/[^\w]/g, '_');

    chrome.storage.local.get([storageKey, 'newEvrak'], function (result) {
      var seenNos = result[storageKey] || [];
      var newEvrak = result.newEvrak || [];

      // İlk ziyaret: baseline oluştur, bildirim gösterme
      if (seenNos.length === 0) {
        var baselineNos = evraklar.map(function (e) { return e.no; });
        chrome.storage.local.set({ [storageKey]: baselineNos });
        return;
      }

      // Yeni evrakları bul
      var yeniEvrak = evraklar.filter(function (e) {
        return e.no && !seenNos.includes(e.no);
      });

      // Zaten newEvrak listesinde olanları ekleme
      var existingNos = newEvrak.map(function (e) { return e.no; });
      var toAdd = yeniEvrak
        .filter(function (e) { return !existingNos.includes(e.no); })
        .map(function (e) { return Object.assign({}, e, { dosyaAdi: dosyaAdi }); });

      // seen listesini güncelle
      var allSeenNos = Array.from(new Set(seenNos.concat(evraklar.map(function (e) { return e.no; }))));
      var updatedNewEvrak = newEvrak.concat(toAdd);

      chrome.storage.local.set({ [storageKey]: allSeenNos, newEvrak: updatedNewEvrak });

      if (updatedNewEvrak.length > 0) {
        chrome.action.setBadgeText({ text: String(updatedNewEvrak.length) });
        chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
      }
    });
    return false;
  }

  if (msg.type === 'GET_NEW') {
    chrome.storage.local.get('newEvrak', function (result) {
      sendResponse(result.newEvrak || []);
    });
    return true;
  }

  if (msg.type === 'CLEAR_NEW') {
    chrome.storage.local.set({ newEvrak: [] });
    chrome.action.setBadgeText({ text: '' });
    return false;
  }
});
