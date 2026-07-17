// ═══════════════════════════════════════════════════════════
// UDF DÖNÜŞTÜRÜCÜ — tamamen istemci tarafında çalışır, dosyalar
// hiçbir sunucuya gönderilmez. UYAP Doküman Editörü'nün .udf
// formatı gerçek bir örnek dosya incelenerek çözümlendi:
//
//   .udf = ZIP paketi > content.xml
//   <template format_id="1.8">
//     <content><![CDATA[TÜM METİN TEK BLOK HALİNDE]]></content>
//     <properties><pageFormat leftMargin=".." topMargin=".." .../></properties>
//     <elements resolver="hvl-default">
//       <paragraph Alignment="0|1|2|3" Numbered="true" LeftIndent="25.0">
//         <content startOffset="N" length="M" bold="true" italic="true"
//                  underline="true" size="14" />
//         <!-- bir paragrafta birden fazla content (run) olabilir -->
//       </paragraph>
//       ...
//     </elements>
//     <styles>...</styles>
//   </template>
//
// Yani metin TEK bir blob'ta saklanıyor; her paragraf o blob'un bir
// aralığını (startOffset/length) referans alan bir veya daha fazla
// biçimlendirme "run"undan oluşuyor. Alignment: 0=sol,1=orta,2=sağ,3=iki yana yaslı.
// Birim: pt (nokta) — 42.525pt ≈ 15mm sayfa kenar boşluğu.
// ═══════════════════════════════════════════════════════════

const UDFD_PT_TO_MM = 1 / 2.83465;
const UDFD_ALIGN_CSS = { 0: 'left', 1: 'center', 2: 'right', 3: 'justify' };

// ── UDF PARSE ────────────────────────────────────────────────
function _udfdParseXml(xmlText) {
  var doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('UDF içeriği okunamadı (XML bozuk)');
  var contentEl = doc.querySelector('content');
  var fullText = contentEl ? (contentEl.textContent || '') : '';
  var paragraphs = [];
  doc.querySelectorAll('elements > paragraph').forEach(function (pEl) {
    var alignAttr = pEl.getAttribute('Alignment');
    var align = alignAttr === null ? 0 : (parseInt(alignAttr, 10) || 0);
    var numbered = pEl.getAttribute('Numbered') === 'true';
    var leftIndent = parseFloat(pEl.getAttribute('LeftIndent') || '0') || 0;
    var runs = [];
    pEl.querySelectorAll('content').forEach(function (cEl) {
      var start = parseInt(cEl.getAttribute('startOffset') || '0', 10) || 0;
      var len = parseInt(cEl.getAttribute('length') || '0', 10) || 0;
      runs.push({
        text: fullText.substr(start, len),
        bold: cEl.getAttribute('bold') === 'true',
        italic: cEl.getAttribute('italic') === 'true',
        underline: cEl.getAttribute('underline') === 'true',
        size: parseFloat(cEl.getAttribute('size') || '12') || 12
      });
    });
    if (!runs.length) runs.push({ text: '', bold: false, italic: false, underline: false, size: 12 });
    paragraphs.push({ align: align, numbered: numbered, leftIndent: leftIndent, runs: runs });
  });
  var pf = doc.querySelector('pageFormat');
  var pageFormat = pf ? {
    leftMargin: parseFloat(pf.getAttribute('leftMargin') || '42.5') || 42.5,
    topMargin: parseFloat(pf.getAttribute('topMargin') || '42.5') || 42.5
  } : null;
  return { paragraphs: paragraphs, fullText: fullText, pageFormat: pageFormat };
}

async function _udfdLoadZipXml(file) {
  var buf = await file.arrayBuffer();
  var zip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch (e) {
    throw new Error('Geçersiz .udf dosyası: dosya bozuk veya bir UDF dosyası değil');
  }
  var contentFile = zip.file('content.xml');
  if (!contentFile) throw new Error("Geçersiz .udf dosyası: content.xml bulunamadı");
  return await contentFile.async('string');
}

async function udfdParseFile(file) {
  var xmlText = await _udfdLoadZipXml(file);
  return _udfdParseXml(xmlText);
}

// ── UDF BUILD ────────────────────────────────────────────────
// paragraphs: [{align, numbered, leftIndent, runs:[{text,bold,italic,underline,size}]}]
async function udfdBuildBlob(paragraphs) {
  var blobParts = [];
  var offset = 0;
  var xmlParagraphs = paragraphs.map(function (p) {
    var runs = (p.runs && p.runs.length) ? p.runs : [{ text: ' ', bold: false, italic: false, underline: false, size: 12 }];
    var runXml = runs.map(function (r) {
      var text = (r.text != null && r.text !== '') ? r.text : ' ';
      var len = text.length;
      var attrs = '';
      if (r.bold) attrs += ' bold="true"';
      if (r.italic) attrs += ' italic="true"';
      if (r.underline) attrs += ' underline="true"';
      attrs += ' size="' + (r.size || 12) + '"';
      attrs += ' startOffset="' + offset + '" length="' + len + '"';
      blobParts.push(text);
      offset += len;
      return '<content' + attrs + ' />';
    }).join('');
    var pAttrs = '';
    if (p.align) pAttrs += ' Alignment="' + p.align + '"';
    if (p.numbered) pAttrs += ' NumberType="NUMBER_TYPE_NUMBER_PARANTHESE" SecListTypeLevel1="NUMBER_TYPE_NUMBER_DOT" ListLevel="1" Numbered="true" ListId="1"';
    if (p.leftIndent) pAttrs += ' LeftIndent="' + p.leftIndent + '"';
    return '<paragraph' + pAttrs + '>' + runXml + '</paragraph>';
  });

  var fullText = blobParts.join('').replace(/]]>/g, ']]]]><![CDATA[>');
  var xml = '<?xml version="1.0" encoding="UTF-8" ?> \n\n<template format_id="1.8" >\n'
    + '<content><![CDATA[' + fullText + ']]></content>'
    + '<properties><pageFormat mediaSizeName="1" leftMargin="42.525000000000006" rightMargin="42.525000000000006" '
    + 'topMargin="42.525000000000006" bottomMargin="42.525000000000006" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>\n'
    + '<elements resolver="hvl-default" >' + xmlParagraphs.join('') + '</elements>\n'
    + '<styles><style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" '
    + 'FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" foreground="-13421773" />'
    + '<style name="hvl-default" family="Times New Roman" size="12" description="Gövde" /></styles>\n'
    + '</template>\n';

  var zip = new JSZip();
  zip.file('content.xml', xml);
  return await zip.generateAsync({ type: 'blob' });
}

// ── 1) WORD → UDF (mammoth.js) ──────────────────────────────
async function udfdWordToUdf(file, onProgress) {
  onProgress && onProgress('Word dosyası okunuyor…');

  // Hizalama bilgisini ham docx XML'inden al (mammoth bunu çıktıya yansıtmaz)
  var docxParaAligns = [];
  try {
    var alignBuf = await file.arrayBuffer();
    var docxZip = await JSZip.loadAsync(alignBuf);
    var docXmlFile = docxZip.file('word/document.xml');
    if (docXmlFile) {
      var docXmlText = await docXmlFile.async('string');
      var paraRegex = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g;
      var pm;
      while ((pm = paraRegex.exec(docXmlText)) !== null) {
        var jcMatch = pm[0].match(/<w:jc\s+w:val="([^"]+)"/);
        var val = jcMatch ? jcMatch[1] : '';
        var a = 0;
        if (val === 'center') a = 1;
        else if (val === 'right') a = 2;
        else if (val === 'both' || val === 'distribute') a = 3;
        docxParaAligns.push(a);
      }
    }
  } catch (e) { /* hizalama alınamazsa varsayılan (sol) kullanılır */ }

  var buf = await file.arrayBuffer();
  var result = await mammoth.convertToHtml({ arrayBuffer: buf });
  onProgress && onProgress('Biçimlendirme ayrıştırılıyor…');
  var doc = new DOMParser().parseFromString(result.value || '', 'text/html');

  function walkInline(node, state, runs) {
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) {
        if (child.textContent) runs.push({ text: child.textContent, bold: state.bold, italic: state.italic, underline: state.underline, size: state.size });
      } else if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        if (tag === 'br') { runs.push({ text: '\n', bold: state.bold, italic: state.italic, underline: state.underline, size: state.size }); return; }
        var ns = Object.assign({}, state);
        if (tag === 'strong' || tag === 'b') ns.bold = true;
        if (tag === 'em' || tag === 'i') ns.italic = true;
        if (tag === 'u') ns.underline = true;
        walkInline(child, ns, runs);
      }
    });
  }

  var paragraphs = [];
  var paraIndex = 0;
  var blocks = doc.body.querySelectorAll('p, h1, h2, h3, h4, li');
  if (!blocks.length) blocks = [doc.body];
  blocks.forEach(function (block) {
    var isHeading = /^h[1-4]$/.test(block.tagName.toLowerCase());
    var runs = [];
    walkInline(block, { bold: isHeading, italic: false, underline: false, size: isHeading ? 14 : 12 }, runs);
    if (!runs.length) runs.push({ text: '', bold: false, italic: false, underline: false, size: 12 });

    var isListItem = block.tagName.toLowerCase() === 'li';
    var isOrdered = isListItem && block.parentElement && block.parentElement.tagName.toLowerCase() === 'ol';
    if (isListItem && !isOrdered) runs.unshift({ text: '• ', bold: false, italic: false, underline: false, size: 12 });

    // Hizalamayı önce docx XML'inden al; yoksa CSS fallback
    var align = 0;
    if (paraIndex < docxParaAligns.length) {
      align = docxParaAligns[paraIndex];
    } else {
      var styleAttr = block.getAttribute('style') || '';
      if (/text-align:\s*center/.test(styleAttr)) align = 1;
      else if (/text-align:\s*right/.test(styleAttr)) align = 2;
      else if (/text-align:\s*justify/.test(styleAttr)) align = 3;
    }
    paraIndex++;

    paragraphs.push({ align: align, numbered: isOrdered, leftIndent: isListItem ? 25 : 0, runs: runs });
  });

  onProgress && onProgress('.udf paketleniyor…');
  return await udfdBuildBlob(paragraphs);
}

// ── 2) UDF → PDF (html2canvas ile render — Türkçe karakterler
//     tarayıcının kendi font motoru tarafından çizildiği için
//     garanti doğru çıkar; TTF gömme/kodlama sorunu yaşanmaz) ──
async function udfdUdfToPdf(file, onProgress) {
  onProgress && onProgress('UDF ayrıştırılıyor…');
  var xmlText = await _udfdLoadZipXml(file);
  var parsed = _udfdParseXml(xmlText);

  onProgress && onProgress('Sayfa hazırlanıyor…');
  var pageWmm = 210, pageHmm = 297;
  var marginMm = parsed.pageFormat ? Math.round(parsed.pageFormat.leftMargin * UDFD_PT_TO_MM) : 15;
  var MM_TO_PX = 3.7795;
  var pageWpx = Math.round(pageWmm * MM_TO_PX);
  var pageHpx = Math.round(pageHmm * MM_TO_PX);
  var marginPx = Math.round(marginMm * MM_TO_PX);
  var contentHpx = pageHpx - marginPx * 2;

  var host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + pageWpx + 'px;background:#fff;';
  document.body.appendChild(host);
  var pageDiv = document.createElement('div');
  pageDiv.style.cssText = 'width:' + (pageWpx - marginPx * 2) + 'px;font-family:\'Times New Roman\',serif;color:#000;box-sizing:border-box;';
  host.appendChild(pageDiv);

  var JsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  var pdf = new JsPDFCtor({ unit: 'mm', format: 'a4' });
  var firstPage = true;

  async function flushPage() {
    if (!pageDiv.childNodes.length) return;
    var canvas = await html2canvas(pageDiv, { scale: 2, backgroundColor: '#ffffff' });
    var imgData = canvas.toDataURL('image/jpeg', 0.92);
    if (!firstPage) pdf.addPage();
    firstPage = false;
    var imgWmm = pageWmm - marginMm * 2;
    var imgHmm = canvas.height * imgWmm / canvas.width;
    pdf.addImage(imgData, 'JPEG', marginMm, marginMm, imgWmm, imgHmm);
    pageDiv.innerHTML = '';
  }

  for (var i = 0; i < parsed.paragraphs.length; i++) {
    var p = parsed.paragraphs[i];
    onProgress && onProgress('Paragraf ' + (i + 1) + '/' + parsed.paragraphs.length + ' işleniyor…');
    var pEl = document.createElement('div');
    var indentPx = p.leftIndent ? Math.round(p.leftIndent * (96 / 72)) : 0;
    pEl.style.cssText = 'text-align:' + (UDFD_ALIGN_CSS[p.align] || 'left') + ';white-space:pre-wrap;line-height:1.5;margin:0 0 4px 0;' + (indentPx ? ('padding-left:' + indentPx + 'px;') : '');
    p.runs.forEach(function (r) {
      var span = document.createElement('span');
      span.textContent = r.text;
      span.style.fontWeight = r.bold ? '700' : '400';
      span.style.fontStyle = r.italic ? 'italic' : 'normal';
      span.style.textDecoration = r.underline ? 'underline' : 'none';
      span.style.fontSize = (r.size || 12) + 'pt';
      pEl.appendChild(span);
    });
    pageDiv.appendChild(pEl);
    if (pageDiv.scrollHeight > contentHpx) {
      pageDiv.removeChild(pEl);
      await flushPage();
      pageDiv.appendChild(pEl);
    }
  }
  await flushPage();
  document.body.removeChild(host);

  onProgress && onProgress('PDF oluşturuluyor…');
  return pdf.output('blob');
}

// ── 3) PDF → UDF (pdf.js — uygulamada zaten yüklü) ──────────
async function udfdPdfToUdf(file, onProgress) {
  onProgress && onProgress('PDF okunuyor…');
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var paragraphs = [];
  for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    onProgress && onProgress('Sayfa ' + pageNum + '/' + pdf.numPages + ' okunuyor…');
    var page = await pdf.getPage(pageNum);
    var textContent = await page.getTextContent();
    var line = '';
    textContent.items.forEach(function (item) {
      line += item.str;
      if (item.hasEOL) {
        paragraphs.push({ align: 0, numbered: false, leftIndent: 0, runs: [{ text: line, bold: false, italic: false, underline: false, size: 12 }] });
        line = '';
      }
    });
    if (line.trim()) {
      paragraphs.push({ align: 0, numbered: false, leftIndent: 0, runs: [{ text: line, bold: false, italic: false, underline: false, size: 12 }] });
    }
    if (pageNum < pdf.numPages) {
      paragraphs.push({ align: 0, numbered: false, leftIndent: 0, runs: [{ text: '', bold: false, italic: false, underline: false, size: 12 }] });
    }
  }
  onProgress && onProgress('.udf paketleniyor…');
  return await udfdBuildBlob(paragraphs);
}

// ── 4) UDF → WORD (docx.js) ──────────────────────────────────
async function udfdUdfToWord(file, onProgress) {
  onProgress && onProgress('UDF ayrıştırılıyor…');
  var xmlText = await _udfdLoadZipXml(file);
  var parsed = _udfdParseXml(xmlText);

  onProgress && onProgress('.docx oluşturuluyor…');
  var alignMap = { 0: docx.AlignmentType.LEFT, 1: docx.AlignmentType.CENTER, 2: docx.AlignmentType.RIGHT, 3: docx.AlignmentType.JUSTIFIED };
  var docParagraphs = parsed.paragraphs.map(function (p) {
    return new docx.Paragraph({
      alignment: alignMap[p.align] || docx.AlignmentType.LEFT,
      children: p.runs.map(function (r) {
        return new docx.TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          underline: r.underline ? {} : undefined,
          size: Math.round((r.size || 12) * 2),
          font: 'Times New Roman'
        });
      })
    });
  });
  var wordDoc = new docx.Document({ sections: [{ children: docParagraphs }] });
  return await docx.Packer.toBlob(wordDoc);
}

// ── 5) UDF GÖRÜNTÜLE (indirmeden tarayıcıda önizleme) ───────
async function udfdPreview(file) {
  var xmlText = await _udfdLoadZipXml(file);
  var parsed = _udfdParseXml(xmlText);
  var bodyHtml = parsed.paragraphs.map(function (p) {
    var inner = p.runs.map(function (r) {
      var style = 'font-size:' + (r.size || 12) + 'pt;';
      if (r.bold) style += 'font-weight:700;';
      if (r.italic) style += 'font-style:italic;';
      if (r.underline) style += 'text-decoration:underline;';
      return '<span style="' + style + '">' + escHtml(r.text).replace(/\n/g, '<br>') + '</span>';
    }).join('');
    return '<div style="text-align:' + (UDFD_ALIGN_CSS[p.align] || 'left') + ';white-space:pre-wrap;margin:0 0 4px 0">' + (inner || '&nbsp;') + '</div>';
  }).join('');

  var pane = document.getElementById('udf-preview-pane');
  if (!pane) return;
  pane.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--text)">📄 ' + escHtml(file.name) + '</div>'
    + '<button class="btn btn-outline" style="font-size:12px" onclick="document.getElementById(\'udf-preview-pane\').style.display=\'none\'">✕ Kapat</button>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--text3);margin-bottom:12px">' + parsed.paragraphs.length + ' paragraf · ' + parsed.fullText.length + ' karakter</div>'
    + '<div style="background:#fff;color:#111;padding:32px;border-radius:8px;max-height:70vh;overflow-y:auto;font-family:\'Times New Roman\',serif">' + bodyHtml + '</div>';
  pane.style.display = '';
  pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── 6) TIF/TIFF → PDF (UTIF.js) ─────────────────────────────
async function udfdTifToPdf(file, onProgress) {
  onProgress && onProgress('TIFF çözümleniyor…');
  var buf = await file.arrayBuffer();
  var ifds = UTIF.decode(buf);
  if (!ifds || !ifds.length) throw new Error('TIFF dosyası okunamadı');

  var JsPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  var pdf = null;
  for (var i = 0; i < ifds.length; i++) {
    onProgress && onProgress('Kare ' + (i + 1) + '/' + ifds.length + ' işleniyor…');
    UTIF.decodeImage(buf, ifds[i]);
    var rgba = UTIF.toRGBA8(ifds[i]);
    var w = ifds[i].width, h = ifds[i].height;
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    var imgData = ctx.createImageData(w, h);
    imgData.data.set(rgba);
    ctx.putImageData(imgData, 0, 0);
    var dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    var orientation = w > h ? 'l' : 'p';
    if (!pdf) pdf = new JsPDFCtor({ orientation: orientation, unit: 'px', format: [w, h] });
    else pdf.addPage([w, h], orientation);
    pdf.addImage(dataUrl, 'JPEG', 0, 0, w, h);
  }
  onProgress && onProgress('PDF oluşturuluyor…');
  return pdf.output('blob');
}

// ── SAYFA UI ─────────────────────────────────────────────────
var UDFD_CONVERTERS = [
  { id: 'word2udf', title: 'Word → UDF', icon: '📝', accept: '.docx', desc: 'Word belgesini UYAP formatına dönüştürün', oncelik: true },
  { id: 'udf2pdf', title: 'UDF → PDF', icon: '📄', accept: '.udf', desc: 'UDF dosyasını PDF olarak indirin', oncelik: true },
  { id: 'pdf2udf', title: 'PDF → UDF', icon: '📑', accept: '.pdf', desc: 'PDF metnini UYAP formatına aktarın (biçimlendirme korunmaz)' },
  { id: 'udf2word', title: 'UDF → Word', icon: '📃', accept: '.udf', desc: 'UDF dosyasını .docx olarak indirin' },
  { id: 'udfPreview', title: 'UDF Görüntüle', icon: '👁', accept: '.udf', desc: 'İndirmeden içeriği tarayıcıda görüntüleyin' },
  { id: 'tif2pdf', title: 'TIF/TIFF → PDF', icon: '🖼', accept: '.tif,.tiff', desc: 'Taranmış görüntüleri PDF\'e çevirin' }
];

function udfdInit() {
  var grid = document.getElementById('udf-conv-grid');
  if (!grid || grid.dataset.built) return;
  grid.dataset.built = '1';
  grid.innerHTML = UDFD_CONVERTERS.map(function (c) {
    return '<div class="card" style="padding:18px">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">'
      + '<span style="font-size:20px">' + c.icon + '</span>'
      + '<div style="font-size:14px;font-weight:700;color:var(--text)">' + c.title + '</div>'
      + (c.oncelik ? '<span class="tag" style="background:var(--gold-dim);color:var(--gold)">Öncelikli</span>' : '')
      + '</div>'
      + '<div style="font-size:11.5px;color:var(--text3);margin-bottom:12px;min-height:28px">' + c.desc + '</div>'
      + '<div class="udfd-drop" id="udfd-drop-' + c.id + '" style="border:2px dashed var(--border);border-radius:10px;padding:20px 12px;text-align:center;cursor:pointer;transition:all .15s">'
      + '<div style="font-size:26px;margin-bottom:6px">📤</div>'
      + '<div style="font-size:12px;color:var(--text2)">Dosyayı sürükleyin veya <span style="color:var(--gold);text-decoration:underline">seçin</span></div>'
      + '<input type="file" id="udfd-file-' + c.id + '" accept="' + c.accept + '" style="display:none" onchange="udfdHandleFiles(\'' + c.id + '\', this.files)">'
      + '</div>'
      + '<div id="udfd-status-' + c.id + '" style="margin-top:10px;font-size:12px;color:var(--text3);word-break:break-word"></div>'
      + '</div>';
  }).join('');

  UDFD_CONVERTERS.forEach(function (c) {
    var drop = document.getElementById('udfd-drop-' + c.id);
    var input = document.getElementById('udfd-file-' + c.id);
    if (!drop || !input) return;
    drop.addEventListener('click', function () { input.click(); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.style.borderColor = 'var(--gold)'; drop.style.background = 'var(--gold-dim)'; });
    drop.addEventListener('dragleave', function () { drop.style.borderColor = 'var(--border)'; drop.style.background = 'transparent'; });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.style.borderColor = 'var(--border)'; drop.style.background = 'transparent';
      udfdHandleFiles(c.id, e.dataTransfer.files);
    });
  });
}

function _udfdSetStatus(id, msg, isError) {
  var el = document.getElementById('udfd-status-' + id);
  if (el) { el.textContent = msg; el.style.color = isError ? 'var(--red)' : 'var(--text3)'; }
}

function _udfdDownload(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
}

async function udfdHandleFiles(convId, fileList) {
  if (!fileList || !fileList.length) return;
  var file = fileList[0];
  var baseName = file.name.replace(/\.[^.]+$/, '');
  var progressCb = function (m) { _udfdSetStatus(convId, '⏳ ' + m); };
  try {
    if (convId === 'word2udf') {
      _udfdDownload(await udfdWordToUdf(file, progressCb), baseName + '.udf');
      _udfdSetStatus(convId, '✅ ' + baseName + '.udf indirildi');
    } else if (convId === 'udf2pdf') {
      _udfdDownload(await udfdUdfToPdf(file, progressCb), baseName + '.pdf');
      _udfdSetStatus(convId, '✅ ' + baseName + '.pdf indirildi');
    } else if (convId === 'pdf2udf') {
      _udfdDownload(await udfdPdfToUdf(file, progressCb), baseName + '.udf');
      _udfdSetStatus(convId, '✅ ' + baseName + '.udf indirildi');
    } else if (convId === 'udf2word') {
      _udfdDownload(await udfdUdfToWord(file, progressCb), baseName + '.docx');
      _udfdSetStatus(convId, '✅ ' + baseName + '.docx indirildi');
    } else if (convId === 'udfPreview') {
      progressCb('Görüntüleniyor…');
      await udfdPreview(file);
      _udfdSetStatus(convId, '✅ Görüntülendi (aşağıda)');
    } else if (convId === 'tif2pdf') {
      _udfdDownload(await udfdTifToPdf(file, progressCb), baseName + '.pdf');
      _udfdSetStatus(convId, '✅ ' + baseName + '.pdf indirildi');
    }
  } catch (err) {
    console.error('[UDF Dönüştürücü]', convId, err);
    _udfdSetStatus(convId, '❌ Hata: ' + (err && err.message ? err.message : 'bilinmeyen hata'), true);
  }
}
