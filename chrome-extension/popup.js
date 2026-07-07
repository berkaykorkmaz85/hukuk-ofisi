chrome.runtime.sendMessage({ type: 'GET_NEW' }, function (items) {
  var root = document.getElementById('root');

  if (!items || items.length === 0) {
    root.innerHTML = '<div class="empty">✅ Yeni evrak yok.<br><small>UYAP\'ta bir dosyanın Evrak sekmesini açınca burada takip başlar.</small></div>';
    return;
  }

  var listEl = document.createElement('div');
  listEl.className = 'list';

  items.forEach(function (item) {
    var div = document.createElement('div');
    div.className = 'item';
    div.innerHTML =
      '<div class="dosya-adi">📁 ' + escapeHtml(item.dosyaAdi) + '</div>' +
      '<div class="evrak-adi">📄 ' + escapeHtml(item.ad) + '</div>' +
      '<div class="tarih">' + escapeHtml(item.tarih) + (item.tur ? ' · ' + escapeHtml(item.tur) : '') + '</div>';
    listEl.appendChild(div);
  });

  var footer = document.createElement('div');
  footer.className = 'footer';

  var btn = document.createElement('button');
  btn.className = 'clear-btn';
  btn.textContent = '✓ Tamam, gördüm (' + items.length + ' evrak)';
  btn.addEventListener('click', function () {
    chrome.runtime.sendMessage({ type: 'CLEAR_NEW' });
    window.close();
  });

  footer.appendChild(btn);
  root.appendChild(listEl);
  root.appendChild(footer);
});

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
