// Bu dosya index.html'den ayrildi (kod tasinmadan, sadece dosya sinirlari
// eklendi) — tek dosyanin git diff/inceleme/gezinme zorlugunu azaltmak icin.
// Yukleme sirasi index.html'deki eski calisma sirasiyla AYNIDIR, degistirmeyin.

function buHaftaGorevList(gorevler, today) {
  var haftaSonu = new Date(today); haftaSonu.setDate(haftaSonu.getDate()+7);
  var hafta = gorevler.filter(function(t){
    if(!t.tarih) return false;
    var d = _yerelTarih(t.tarih);
    return d >= today && d <= haftaSonu;
  }).sort(function(a,b){return new Date(a.tarih)-new Date(b.tarih);});
  return hafta;
}


function ortakTakvimTamAc() {
  // Ortak takvim full modal
  var modal = document.getElementById('modal-ortak-takvim');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-ortak-takvim';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:500;display:flex;align-items:stretch;justify-content:center;padding:20px';
    modal.innerHTML = '<div style="background:var(--bg1);border:1px solid var(--border);border-radius:16px;width:100%;max-width:1200px;display:flex;flex-direction:column;overflow:hidden">'
      + '<div style="padding:14px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">'
      +   '<div style="font-size:16px;font-weight:700;color:var(--text)">🗓 Ortak Takvim — Tüm Etkinlikler</div>'
      +   '<button data-close-modal="modal-ortak-takvim">×</button>'
      + '</div>'
      + '<div id="otk-tam-body" style="flex:1;overflow-y:auto;padding:20px"></div>'
      + '</div>';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  
  var body = modal.querySelector('#otk-tam-body');
  var davalar = DB.get('davalar') || [];
  var tasks = DB.get('tasks') || [];
  var today = new Date(); today.setHours(0,0,0,0);
  var AY_ADLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var GUNLER = ['Paz','Pzt','Sal','Çrş','Per','Cum','Cmt'];
  
  // 3 ay göster: geçen ay, bu ay, gelecek ay
  body.innerHTML = '';
  for (var mo = -1; mo <= 2; mo++) {
    var d = new Date(today.getFullYear(), today.getMonth() + mo, 1);
    var y = d.getFullYear(), m = d.getMonth();
    var ayWrap = document.createElement('div');
    ayWrap.style.cssText = 'margin-bottom:32px';
    
    var ayHdr = document.createElement('div');
    ayHdr.style.cssText = 'font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border)';
    ayHdr.textContent = AY_ADLARI[m] + ' ' + y;
    ayWrap.appendChild(ayHdr);
    
    var gunBasliklari = document.createElement('div');
    gunBasliklari.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px';
    ['Pzt','Sal','Çrş','Per','Cum','Cmt','Paz'].forEach(function(g){
      var h = document.createElement('div');
      h.style.cssText = 'text-align:center;font-size:11px;color:var(--text3);font-weight:600;padding:4px 0';
      h.textContent = g; gunBasliklari.appendChild(h);
    });
    ayWrap.appendChild(gunBasliklari);
    
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:3px';
    
    var ilkGun = new Date(y, m, 1).getDay();
    var bosluk = ilkGun === 0 ? 6 : ilkGun - 1;
    var sonGun = new Date(y, m + 1, 0).getDate();
    
    for (var bb = 0; bb < bosluk; bb++) {
      grid.appendChild(document.createElement('div'));
    }
    
    for (var gun = 1; gun <= sonGun; gun++) {
      var ds = y + '-' + String(m+1).padStart(2,'0') + '-' + String(gun).padStart(2,'0');
      var cellDate = new Date(ds + 'T00:00:00');
      var diff = Math.round((cellDate - today) / 86400000);
      var isToday = diff === 0;
      
      var evler = [];
      davalar.forEach(function(dav){
        if(dav.sonraki && dav.sonraki.slice(0,10) === ds)
          evler.push({clr:'var(--gold)', icon:'⚖️', txt:dav.muvekkil||dav.no, id:dav.id, tip:'dava'});
      });
      tasks.forEach(function(t){
        if(!t.tarih || t.tarih.slice(0,10) !== ds) return;
        var tipIcon = t.tip==='randevu'?'📞':t.tip==='durusma'?'⚖️':'✅';
        var clr = t.tip==='randevu'?'#7ab5d4':t.tip==='durusma'?'var(--gold)':t.oncelik==='Acil'?'var(--red)':'var(--green)';
        evler.push({clr:clr, icon:tipIcon, txt:t.baslik||t.text||'', tip:'task', done:t.done});
      });
      
      var cell = document.createElement('div');
      cell.style.cssText = 'min-height:70px;padding:4px;border-radius:8px;border:1px solid '+(isToday?'rgba(201,168,76,0.5)':'rgba(255,255,255,0.05)')+';background:'+(isToday?'rgba(201,168,76,0.06)':evler.length?'rgba(255,255,255,0.02)':'transparent')+(evler.length?';cursor:pointer':'');
      if(evler.length) { cell.onmouseover=function(){this.style.background='rgba(255,255,255,0.05)';}; cell.onmouseout=function(){this.style.background=evler.length?'rgba(255,255,255,0.02)':'transparent';}; }
      
      var numEl = document.createElement('div');
      numEl.style.cssText = 'font-size:12px;font-weight:'+(isToday?'800':evler.length?'600':'400')+';color:'+(isToday?'var(--gold)':diff<0?'var(--text3)':'var(--text)')+';text-align:right;margin-bottom:3px';
      numEl.textContent = gun;
      cell.appendChild(numEl);
      
      evler.forEach(function(ev){
        var evEl = document.createElement('div');
        evEl.style.cssText = 'font-size:10px;color:'+ev.clr+';padding:1px 4px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border-left:2px solid '+ev.clr+';border-radius:0 3px 3px 0;'+(ev.done?'opacity:0.4;text-decoration:line-through':'');
        evEl.textContent = ev.icon + ' ' + ev.txt;
        evEl.title = ev.txt;
        cell.appendChild(evEl);
      });
      
      if(evler.length) {
        cell.onclick = (function(ds_cap){ return function(){ modal.remove(); otkGunDetayAc(ds_cap); }; })(ds);
      }
      grid.appendChild(cell);
    }
    ayWrap.appendChild(grid);
    body.appendChild(ayWrap);
  }
  
  // Legend
  var legend = document.createElement('div');
  legend.style.cssText = 'display:flex;gap:16px;padding:12px 0;border-top:1px solid var(--border);margin-top:8px;flex-wrap:wrap';
  [['var(--gold)','⚖️ Duruşma'],['#7ab5d4','📞 Randevu'],['var(--green)','✅ Görev'],['var(--red)','🔴 Acil']].forEach(function(x){
    var sp = document.createElement('span');
    sp.style.cssText = 'font-size:12px;color:var(--text3);display:flex;align-items:center;gap:6px';
    sp.innerHTML = '<span style="width:10px;height:10px;border-radius:50%;background:'+x[0]+';display:inline-block"></span>'+x[1];
    legend.appendChild(sp);
  });
  body.appendChild(legend);
}

function otkGunDetayAc(dateStr) {
  var davalar = DB.get('davalar') || [];
  var tasks   = DB.get('tasks')   || [];
  var today   = new Date(); today.setHours(0,0,0,0);
  var cellDate= new Date(dateStr+'T00:00:00');
  var diff    = Math.round((cellDate-today)/86400000);
  var AY_ADLARI=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var GUNLER=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  var label = cellDate.getDate()+' '+AY_ADLARI[cellDate.getMonth()]+' '+cellDate.getFullYear()+' — '+GUNLER[cellDate.getDay()];
  document.getElementById('modal-gun-baslik').textContent = '📅 '+label;

  var evler = [];
  // Davalar - sonraki duruşma
  davalar.forEach(function(d){
    if(d.sonraki && d.sonraki.slice(0,10)===dateStr)
      evler.push({tip:'durusma', clr:'var(--gold)', icon:'⚖️', baslik:'Duruşma — '+escHtml(d.no), alt:escHtml(d.muvekkil)+(d.mahkeme?'  ·  '+escHtml(d.mahkeme.replace('Mahkemesi','Mhk.')):''), click:function(){closeModal('modal-gun-detay');openDavaDetailPage(d.id);}});
  });
  // Tasks
  tasks.forEach(function(t){
    if(!t.tarih||t.tarih.slice(0,10)!==dateStr) return;
    var tipIcon=t.tip==='randevu'?'📞':t.tip==='durusma'?'⚖️':'✅';
    var tipClr=t.tip==='randevu'?'#7ab5d4':t.tip==='durusma'?'var(--gold)':'var(--green)';
    var gecikti=!t.done&&diff<0;
    evler.push({tip:t.tip, clr:tipClr, icon:tipIcon, baslik:escHtml(t.baslik||t.text||''), alt:(t.ilgili?'📁 '+escHtml(t.ilgili):'')+(t.done?' · ✓ Tamamlandı':gecikti?' · ⚠ Gecikmiş':''), done:t.done, click:null});
  });

  var icerik = document.getElementById('modal-gun-icerik');
  if(!evler.length) {
    icerik.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text3)"><div style="font-size:36px;margin-bottom:10px">📭</div><div>Bu gün için etkinlik yok</div></div>';
  } else {
    icerik.innerHTML = '';
    evler.forEach(function(ev){
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.05);'+(ev.click?'cursor:pointer;':'')+(ev.done?'opacity:0.5;':'');
      if(ev.click){ row.onmouseover=function(){this.style.background='rgba(255,255,255,0.03)';}; row.onmouseout=function(){this.style.background='';}; row.onclick=ev.click; }
      row.innerHTML = '<div style="width:44px;height:44px;border-radius:12px;background:'+ev.clr.replace('var(--gold)','rgba(201,168,76,0.15)').replace('var(--green)','rgba(74,140,92,0.15)').replace('#7ab5d4','rgba(58,107,140,0.15)')+';display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;border:1px solid '+ev.clr.replace('var(--gold)','rgba(201,168,76,0.3)').replace('var(--green)','rgba(74,140,92,0.3)').replace('#7ab5d4','rgba(58,107,140,0.3)')+'">'
        +ev.icon+'</div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:'+(ev.done?'var(--text3)':'var(--text)')+(ev.done?';text-decoration:line-through':'')+'">'+ev.baslik+'</div>'
        +(ev.alt?'<div style="font-size:12px;color:var(--text3);margin-top:3px">'+ev.alt+'</div>':'')
        +'</div>'
        +(ev.click?'<span style="color:var(--text3);font-size:18px">›</span>':'');
      icerik.appendChild(row);
    });
  }
  openModal('modal-gun-detay');
}

function renderDavaDash() {
  var el = document.getElementById('davadash-content');
  if (!el) return;

  var davalar0 = DB.get('davalar') || [];
  var icralar0 = DB.get('icralar') || [];
  var muvekkiller = DB.get('muvekkiller') || [];
  var finans = DB.get('finans') || [];
  var gorevler = (DB.get('tasks') || []).filter(function(t){return !t.done;});
  var today = new Date(); today.setHours(0,0,0,0);

  var mvF  = (el.querySelector('#dd-mv')  && el.querySelector('#dd-mv').value)  || '';
  var mhF  = (el.querySelector('#dd-mh')  && el.querySelector('#dd-mh').value)  || '';
  var durF = (el.querySelector('#dd-dur') && el.querySelector('#dd-dur').value) || '';

  var davalar = mvF ? davalar0.filter(function(d){return d.muvekkil===mvF;}) : davalar0.slice();
  var icralar = mvF ? icralar0.filter(function(i){return i.muvekkil===mvF;}) : icralar0.slice();
  if (mhF) davalar = davalar.filter(function(d){return d.mahkeme===mhF;});
  if (durF) { davalar=davalar.filter(function(d){return d.durum===durF;}); icralar=icralar.filter(function(i){return i.durum===durF;}); }

  var mahkemeler = [...new Set(davalar0.map(function(d){return d.mahkeme;}).filter(Boolean))].sort();
  var filtFinans = (mvF ? finans.filter(function(f){return f.muvekkil===mvF;}) : finans.slice()).filter(function(f){ return f.tur !== 'Karşı Vekalet Ücreti' && f.tur !== 'Taksit Planı'; });

  var GELIR_T = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
  var MASRAF_T = ['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç'];
  var _ayNow = new Date().getMonth();
  var _yilNow = new Date().getFullYear();
  var filtFinansAylik = filtFinans.filter(function(f){ return new Date(f.tarih).getMonth()===_ayNow && new Date(f.tarih).getFullYear()===_yilNow; });
  var topTah = filtFinansAylik.filter(function(f){return GELIR_T.includes(f.tur);}).reduce(function(a,b){return a+Number(b.tutar);},0);
  var topMas = filtFinansAylik.filter(function(f){return MASRAF_T.includes(f.tur);}).reduce(function(a,b){return a+Number(b.tutar);},0);
  var masOde = filtFinansAylik.filter(function(f){return f.tur==='Masraf Ödemesi';}).reduce(function(a,b){return a+Number(b.tutar);},0);
  var netBakiye = topTah - topMas + masOde;

  var yaklasan = davalar0.filter(function(d){return d.sonraki&&d.durum==='Aktif';})
    .map(function(d){return Object.assign({},d,{diff:Math.ceil((new Date(d.sonraki)-today)/86400000)});})
    .filter(function(d){return d.diff>=0&&d.diff<=14;}).sort(function(a,b){return a.diff-b.diff;});

  var istinafDosyalar = davalar0.filter(function(d){return d.istinafMahkeme||d.istinafEsas;});
  var temyizDosyalar  = davalar0.filter(function(d){return d.temyizMahkeme||d.temyizEsas;});

  var satisAvansliIcra = icralar0.filter(function(i){
    try{var h=JSON.parse(localStorage.getItem('icra_haciz_'+i.id)||'{}');return (h.satisAvanslariList||[]).length>0;}catch(e){return false;}
  });

  var hacizYenilemGerek = icralar0.filter(function(i){
    try{
      var h=JSON.parse(localStorage.getItem('icra_haciz_'+i.id)||'{}');
      return ['sonHaciz','hacizTarih','hacizTarih2','hacizTarih3'].some(function(k){
        if(!h[k]) return false;
        var deadline=new Date(h[k]); deadline.setFullYear(deadline.getFullYear()+1);
        var kalan=Math.ceil((deadline-today)/86400000); return kalan>=0&&kalan<=14;
      });
    }catch(e){return false;}
  }).map(function(i){
    var h=JSON.parse(localStorage.getItem('icra_haciz_'+i.id)||'{}');
    var en=null,enK=999;
    ['sonHaciz','hacizTarih','hacizTarih2','hacizTarih3'].forEach(function(k){
      if(!h[k]) return;
      var dl=new Date(h[k]); dl.setFullYear(dl.getFullYear()+1);
      var kalan=Math.ceil((dl-today)/86400000);
      if(kalan>=0&&kalan<=14&&kalan<enK){enK=kalan;en={t:dl.toISOString().slice(0,10),diff:kalan,hacizTarih:h[k]};}
    });
    return Object.assign({},i,{yenilemeUyari:en});
  });

  var yakHaciz = icralar0.filter(function(i){
    try{var h=JSON.parse(localStorage.getItem('icra_haciz_'+i.id)||'{}');
      return ['sonHaciz','hacizTarih','hacizTarih2','hacizTarih3','ihaleTarih'].some(function(k){if(!h[k])return false;var d=Math.ceil((new Date(h[k])-today)/86400000);return d>=0&&d<=14;});
    }catch(e){return false;}
  }).map(function(i){
    var h=JSON.parse(localStorage.getItem('icra_haciz_'+i.id)||'{}');
    var en=['sonHaciz','hacizTarih','hacizTarih2','hacizTarih3','ihaleTarih'].map(function(k){return {t:h[k],diff:h[k]?Math.ceil((new Date(h[k])-today)/86400000):999};}).filter(function(x){return x.t&&x.diff>=0&&x.diff<=14;}).sort(function(a,b){return a.diff-b.diff;})[0];
    return Object.assign({},i,{yakinTarih:en});
  });

  var maasHacizliIcra = icralar0.filter(function(i){
    try{var h=JSON.parse(localStorage.getItem('icra_haciz_'+i.id)||'{}');return !!h.maasHaczi;}catch(e){return false;}
  });

  var haftaSonu = new Date(today); haftaSonu.setDate(haftaSonu.getDate()+7);
  var sureRiski = [];
  gorevler.forEach(function(t){
    if(!t.tarih||!t.ilgili) return;
    var dt=_yerelTarih(t.tarih); dt.setHours(0,0,0,0);
    if(dt>=today&&dt<=haftaSonu){
      var diff=Math.ceil((dt-today)/86400000);
      // İlgili dosyayı bul (dava veya icra)
      var davaMatch = davalar0.find(function(d){return d.no===t.ilgili||d.id===t.ilgili;});
      var icraMatch = !davaMatch ? icralar0.find(function(i){return (i.bki||i.no)===t.ilgili||i.id===t.ilgili;}) : null;
      sureRiski.push({baslik:escHtml(t.baslik||t.text||''),dosya:escHtml(t.ilgili),diff:diff,clr:diff<=2?'var(--red)':'var(--gold)',davaId:davaMatch?davaMatch.id:null,icraId:icraMatch?icraMatch.id:null});
    }
  });
  davalar0.forEach(function(d){
    if(!d.sonraki||d.durum!=='Aktif'||d.istinafMahkeme) return;
    var diff=Math.ceil((new Date(d.sonraki)-today)/86400000);
    if(diff>=0&&diff<=14) sureRiski.push({baslik:'İstinaf süresi yaklaşıyor',dosya:escHtml(d.no)+' — '+escHtml(d.muvekkil),diff:diff,clr:diff<=3?'var(--red)':'#7ab5d4',davaId:d.id,icraId:null});
  });
  sureRiski.sort(function(a,b){return a.diff-b.diff;});

  var randevular = gorevler.filter(function(t){return t.tip==='randevu';})
    .sort(function(a,b){return new Date(a.tarih||'9999')-new Date(b.tarih||'9999');});

  var buAy = new Date(); buAy.setDate(1); buAy.setHours(0,0,0,0);
  var buAyDavalar = davalar0.filter(function(d){var t=d.created||d.tarih||'';if(!t)return false;var dt=new Date(t);dt.setHours(0,0,0,0);return dt>=buAy;});
  var buAyIcralar = icralar0.filter(function(i){var t=i.tarih||i.created||'';if(!t)return false;var dt=new Date(t);dt.setHours(0,0,0,0);return dt>=buAy;});

  var GIZLI_TURLER = ['Karşı Vekalet Ücreti', 'Taksit Planı'];
  var sonFinans = filtFinans.filter(function(f){ return !GIZLI_TURLER.includes(f.tur); }).slice().sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);}).slice(0,6);

  el.innerHTML = '';

  // ── FİLTRE BAR ──────────────────────────────────────────────────
  var fb=document.createElement('div');
  fb.style.cssText='display:flex;align-items:center;gap:10px;margin-bottom:16px';
  fb.innerHTML='<div style="font-family:\'Playfair Display\',serif;font-size:22px;font-weight:700;color:var(--text)">Dashboard</div><div style="flex:1"></div>';
  function mkSel(id,opts,cur){var s=document.createElement('select');s.id=id;s.style.cssText='background:var(--bg3);border:1px solid var(--border);border-radius:7px;color:var(--text);padding:5px 10px;font-size:12px;max-width:160px';s.onchange=function(){renderDavaDash();};s.innerHTML=opts.map(function(o){return '<option value="'+escAttr(o.v||'')+'"'+(o.v===cur?' selected':'')+'>'+escHtml(o.l)+'</option>';}).join('');return s;}
  fb.appendChild(mkSel('dd-mv',[{l:'Tüm Müvekkiller',v:''}].concat(muvekkiller.map(function(m){return {v:m.ad,l:m.ad};})),mvF));
  fb.appendChild(mkSel('dd-mh',[{l:'Tüm Mahkemeler',v:''}].concat(mahkemeler.map(function(m){return {v:m,l:m.replace('Mahkemesi','Mhk.')};})),mhF));
  fb.appendChild(mkSel('dd-dur',[{l:'Tüm Durumlar',v:''},{l:'Aktif',v:'Aktif'},{l:'Bekliyor',v:'Bekliyor'},{l:'Kapalı',v:'Kapalı'}],durF));
  el.appendChild(fb);

  // ── 4 KPI ────────────────────────────────────────────────────────
  var bugunGorevler = gorevler.filter(function(t){if(!t.tarih)return false;return Math.ceil((_yerelTarih(t.tarih)-today)/86400000)===0;});
  var kg=document.createElement('div');
  kg.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 1.3fr;gap:10px;margin-bottom:20px';
  [{icon:'📁',label:'Aktif Dava',val:davalar.filter(function(d){return d.durum==='Aktif';}).length,sub:davalar.length+' toplam',clr:'var(--text)',click:function(){showPage('davalar');}},
   {icon:'⚡',label:'Aktif İcra',val:icralar.filter(function(i){return i.durum==='Aktif';}).length,sub:icralar.length+' toplam',clr:'#7ab5d4',click:function(){showPage('icralar');}},
   {icon:'📅',label:'Yaklaşan Duruşma',val:yaklasan.length,sub:'14 gün içinde',clr:yaklasan.length?'var(--red)':'var(--text3)'},
  ].forEach(function(k){
    var d=document.createElement('div');
    d.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;'+(k.click?'cursor:pointer;':'')+'transition:border-color 0.15s';
    if(k.click){d.onclick=k.click;d.onmouseover=function(){this.style.borderColor='rgba(201,168,76,0.5)';};d.onmouseout=function(){this.style.borderColor='';};}
    d.innerHTML='<div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;font-weight:600">'+k.icon+' '+k.label+'</div><div style="font-size:32px;font-weight:900;color:'+k.clr+';line-height:1">'+k.val+'</div><div style="font-size:11px;color:var(--text3);margin-top:6px">'+k.sub+'</div>';
    kg.appendChild(d);
  });
  // Donut KPI
  var donutKart=document.createElement('div');
  donutKart.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 18px;cursor:pointer;transition:border-color 0.15s;display:flex;align-items:center;gap:14px';
  donutKart.onclick=function(){showPage('tasks');};
  donutKart.onmouseover=function(){this.style.borderColor='rgba(201,168,76,0.5)';};
  donutKart.onmouseout=function(){this.style.borderColor='';};
  donutKart.innerHTML='<div style="flex-shrink:0">'+gorevDonut(gorevler,today,80)+'</div>'
    +'<div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;font-weight:600">📋 Günlük Görevler</div>'
    +'<div style="font-size:24px;font-weight:900;color:var(--gold);line-height:1">'+bugunGorevler.length+'</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:4px">'+bugunGorevler.filter(function(t){return t.done;}).length+' tamamlandı</div></div>';
  kg.appendChild(donutKart);
  el.appendChild(kg);

  // ── YARDIMCI FONKSİYONLAR ───────────────────────────────────────
  function satirBaslik(baslik, sayi, kenarlık) {
    var div=document.createElement('div');
    div.style.cssText='font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid '+(kenarlık||'var(--border)');
    div.textContent=baslik+(sayi!==undefined?' ('+sayi+')':'');
    return div;
  }

  function satırGrid(kolonlar) {
    var g=document.createElement('div');
    g.style.cssText='display:grid;grid-template-columns:'+kolonlar+';gap:14px;margin-bottom:4px';
    return g;
  }

  function kart(kenarlık, maxH) {
    var w=document.createElement('div');
    w.style.cssText='background:var(--bg2);border:1px solid '+(kenarlık||'var(--border)')+';border-radius:14px;overflow:hidden';
    var h=document.createElement('div');
    h.style.cssText='padding:0';
    var b=document.createElement('div');
    b.style.cssText='padding:0'+(maxH?';max-height:'+maxH+'px;overflow-y:auto':'');
    w.appendChild(h);w.appendChild(b);
    return {wrap:w,hdr:h,body:b};
  }

  function kartBaslik(icon, baslik, alt, badge, tiklama) {
    var div=document.createElement('div');
    div.style.cssText='padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between';
    div.innerHTML='<div><div style="font-size:14px;font-weight:700;color:var(--text)">'+icon+' '+baslik+'</div>'+(alt?'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+alt+'</div>':'')+'</div>';
    var sag=document.createElement('div');
    sag.style.cssText='display:flex;align-items:center;gap:8px';
    if(badge!==undefined&&badge!==null){var b=document.createElement('span');b.style.cssText='background:rgba(201,168,76,0.2);color:var(--gold);font-size:11px;font-weight:700;padding:3px 10px;border-radius:10px';b.textContent=badge;sag.appendChild(b);}
    if(tiklama){var btn=document.createElement('button');btn.className='btn btn-outline';btn.style.cssText='font-size:11px;padding:3px 10px';btn.textContent='Tümü →';btn.onclick=tiklama;sag.appendChild(btn);}
    div.appendChild(sag);
    return div;
  }

  function dosyaSatir(no, ad, alt, sag, klk) {
    var row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:90px 1fr auto;gap:10px;align-items:center;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.04)'+(klk?';cursor:pointer':'');
    if(klk){row.onmouseover=function(){this.style.background='rgba(255,255,255,0.03)';};row.onmouseout=function(){this.style.background='';};row.onclick=klk;}
    var noEl=document.createElement('span');noEl.style.cssText='font-size:12px;color:var(--gold);font-weight:700;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';noEl.textContent=no;
    var midEl=document.createElement('div');midEl.style.cssText='min-width:0';
    midEl.innerHTML='<div style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+ad+'</div>'+(alt?'<div style="font-size:11px;color:var(--text3);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+alt+'</div>':'');
    var sagEl=document.createElement('div');sagEl.style.cssText='flex-shrink:0;text-align:right';sagEl.innerHTML=sag||'';
    row.appendChild(noEl);row.appendChild(midEl);row.appendChild(sagEl);
    return row;
  }

  function bos(msg){var d=document.createElement('div');d.style.cssText='padding:16px 18px;color:var(--text3);font-size:13px;text-align:center';d.textContent=msg;return d;}
  function tag(txt,cls){return '<span class="tag tag-'+cls+'" style="font-size:11px">'+escHtml(txt)+'</span>';}

  // ══ SATIR 1: DOSYALAR ════════════════════════════════════════════
  el.appendChild(satirBaslik('📁 Dosyalar', null, 'rgba(201,168,76,0.4)'));
  var satir1=satırGrid('1fr 1fr');

  // Dava listesi
  var {wrap:dW,hdr:dH,body:dB}=kart(null,320);
  dH.appendChild(kartBaslik('📁','Dava Dosyaları',davalar.filter(function(d){return d.durum==='Aktif';}).length+' aktif · '+davalar.length+' toplam',null,function(){showPage('davalar');}));
  if(!davalar.length) dB.appendChild(bos('Dava dosyası yok'));
  else davalar.slice().sort(function(a,b){return a.durum==='Aktif'?-1:1;}).forEach(function(d){
    var mhK=(d.mahkeme||'').replace('Mahkemesi','Mhk.').replace('Asliye Hukuk','AHM').replace('Asliye Ticaret','ATM').replace('Sulh Hukuk','SHM');
    var tp=_davaTarafPair(d);
    var karsiStr=tp.davali?'<span style="color:var(--text3)"> vs </span>'+escHtml(tp.davali):'';
    var sag=tag(d.durum,d.durum==='Aktif'?'aktif':d.durum==='Bekliyor'?'bekliyor':'kapali');
    dB.appendChild(dosyaSatir(d.no,escHtml(tp.davaci)+karsiStr,escHtml(mhK),sag,function(dd){return function(){openDavaDetailPage(dd.id);};}(d)));
  });
  satir1.appendChild(dW);

  // İcra listesi
  var {wrap:iW,hdr:iH,body:iB}=kart(null,320);
  iH.appendChild(kartBaslik('⚡','İcra Dosyaları',icralar.filter(function(i){return i.durum==='Aktif';}).length+' aktif · '+icralar.length+' toplam',null,function(){showPage('icralar');}));
  if(!icralar.length) iB.appendChild(bos('İcra dosyası yok'));
  else icralar.slice().sort(function(a,b){return a.durum==='Aktif'?-1:1;}).forEach(function(i){
    var sag='<div><div style="font-size:12px;font-weight:700;color:var(--gold);font-family:monospace">₺'+fmt(i.alacak)+'</div>'+tag(i.durum,i.durum==='Aktif'?'aktif':'kapali')+'</div>';
    iB.appendChild(dosyaSatir(i.bki||i.no,escHtml(i.borclu),escHtml(i.muvekkil)+(i.mudurluk?' · '+i.mudurluk.replace('İcra Müdürlüğü',''):''),sag));
  });
  satir1.appendChild(iW);
  el.appendChild(satir1);

  // ══ SATIR 2: TAKİP & UYARILAR ════════════════════════════════════
  el.appendChild(satirBaslik('⚠️ Takip & Uyarılar', null, 'rgba(192,83,58,0.4)'));
  var satir2=satırGrid('1fr 1fr 1fr');

  // İstinaf + Temyiz
  var {wrap:itW,hdr:itH,body:itB}=kart(istinafDosyalar.length||temyizDosyalar.length?'rgba(122,181,212,0.3)':null,280);
  itH.appendChild(kartBaslik('⚖️','İstinaf / Temyiz',(istinafDosyalar.length+temyizDosyalar.length)+' dosya'));
  if(!istinafDosyalar.length&&!temyizDosyalar.length) itB.appendChild(bos('İstinaf/Temyiz aşamasında dosya yok'));
  else {
    istinafDosyalar.forEach(function(d){itB.appendChild(dosyaSatir(d.no,escHtml(d.muvekkil),'🔵 '+escHtml((d.istinafMahkeme||'').replace('Bölge Adliye Mahkemesi','BAM')),d.istinafEsas?'<span style="font-size:11px;color:var(--text3)">'+escHtml(d.istinafEsas)+'</span>':'',function(dd){return function(){openDavaDetailPage(dd.id);};}(d)));});
    temyizDosyalar.forEach(function(d){itB.appendChild(dosyaSatir(d.no,escHtml(d.muvekkil),'🟣 '+escHtml(d.temyizMahkeme||'Yargıtay'),d.temyizEsas?'<span style="font-size:11px;color:var(--text3)">'+escHtml(d.temyizEsas)+'</span>':'',function(dd){return function(){openDavaDetailPage(dd.id);};}(d)));});
  }
  satir2.appendChild(itW);

  // Süre Aşımı + Haciz Yenileme
  var {wrap:suW,hdr:suH,body:suB}=kart(sureRiski.length||hacizYenilemGerek.length?'rgba(192,83,58,0.4)':null,280);
  var toplamUyari=sureRiski.length+hacizYenilemGerek.length;
  suH.appendChild(kartBaslik('⏰','Süre & Haciz Uyarıları',toplamUyari+' aktif uyarı',toplamUyari||null));
  if(!toplamUyari) suB.appendChild(bos('Bu hafta süre/haciz riski yok ✓'));
  else {
    sureRiski.forEach(function(s){
      var row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s';
      row.onmouseover=function(){this.style.background='rgba(255,255,255,0.03)';};row.onmouseout=function(){this.style.background='';};
      // Tıklama: ilgili dosyayı aç (dava veya icra)
      if(s.davaId) { row.onclick=(function(did){return function(){openDavaDetailPage(did);};})(s.davaId); }
      else if(s.icraId) { row.onclick=(function(iid){return function(){showPage('icralar');setTimeout(function(){showIcraDetail(iid);},100);};})(s.icraId); }
      row.innerHTML='<div style="flex-shrink:0;min-width:42px;text-align:center;background:rgba(255,255,255,0.05);border-radius:7px;padding:4px"><div style="font-size:13px;font-weight:800;color:'+s.clr+'">'+s.diff+'</div><div style="font-size:9px;color:var(--text3)">gün</div></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+s.baslik+'</div><div style="font-size:11px;color:var(--text3)">'+s.dosya+'</div></div>';
      suB.appendChild(row);
    });
    hacizYenilemGerek.forEach(function(i){
      var d3=i.yenilemeUyari?i.yenilemeUyari.diff:0;
      var row=document.createElement('div');
      row.style.cssText='display:flex;align-items:center;gap:10px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer;transition:background 0.15s';
      row.onmouseover=function(){this.style.background='rgba(255,255,255,0.03)';};row.onmouseout=function(){this.style.background='';};
      row.onclick=(function(iid){return function(){showPage('icralar');setTimeout(function(){showIcraDetail(iid);},100);};})(i.id);
      row.innerHTML='<div style="flex-shrink:0;min-width:42px;text-align:center;background:rgba(192,83,58,0.1);border:1px solid rgba(192,83,58,0.3);border-radius:7px;padding:4px"><div style="font-size:13px;font-weight:800;color:var(--red)">'+d3+'</div><div style="font-size:9px;color:var(--text3)">gün</div></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text)">Haciz yenileme!</div><div style="font-size:11px;color:var(--text3)">'+escHtml(i.borclu)+' — '+escHtml(i.muvekkil)+'</div><div style="font-size:10px;color:var(--text3)">Son: '+fmtDateShort(i.yenilemeUyari?i.yenilemeUyari.t:'')+'</div></div>';
      suB.appendChild(row);
    });
  }
  satir2.appendChild(suW);

  // Satış Avansı + Yaklaşan Haciz/İhale
  var {wrap:saW,hdr:saH,body:saB}=kart(satisAvansliIcra.length||yakHaciz.length?'rgba(201,168,76,0.25)':null,280);
  saH.appendChild(kartBaslik('💰','Satış Avansı / Haciz',satisAvansliIcra.length+' avans · '+yakHaciz.length+' yaklaşan'));
  if(!satisAvansliIcra.length&&!yakHaciz.length) saB.appendChild(bos('Satış avansı / yaklaşan haciz yok'));
  else {
    satisAvansliIcra.forEach(function(i){
      saB.appendChild(dosyaSatir(i.bki||i.no,escHtml(i.borclu),escHtml(i.muvekkil),'<span style="font-size:11px;font-weight:600;color:var(--gold);background:rgba(201,168,76,0.15);padding:2px 8px;border-radius:4px">Avans ✓</span>'));
    });
    if(satisAvansliIcra.length&&yakHaciz.length){var sep=document.createElement('div');sep.style.cssText='margin:4px 18px;border-top:1px solid var(--border);font-size:10px;color:var(--text3);padding:4px 0 0';sep.textContent='Yaklaşan Haciz/İhale';saB.appendChild(sep);}
    yakHaciz.forEach(function(i){
      var d2=i.yakinTarih?i.yakinTarih.diff:0;
      var c2=d2<=3?'var(--red)':'var(--gold)';
      var sag='<div style="text-align:right"><div style="font-size:13px;font-weight:700;color:'+c2+'">'+(d2===0?'BUGÜN':d2+' gün')+'</div><div style="font-size:10px;color:var(--text3)">'+fmtDateShort(i.yakinTarih?i.yakinTarih.t:'')+'</div></div>';
      saB.appendChild(dosyaSatir(i.bki||i.no,escHtml(i.borclu),escHtml(i.muvekkil),sag));
    });
  }
  satir2.appendChild(saW);
  el.appendChild(satir2);

  // ══ SATIR 3: GÖREVLER & TAKVİM ═══════════════════════════════════
  el.appendChild(satirBaslik('📋 Görevler & Takvim', null, 'rgba(122,181,212,0.3)'));
  var satir3=satırGrid('1fr 1fr 1fr');

  // Yaklaşan duruşmalar
  var {wrap:durW,hdr:durH,body:durB}=kart(yaklasan.length?'rgba(192,83,58,0.4)':null,280);
  durH.appendChild(kartBaslik('📅','Yaklaşan Duruşmalar','14 gün içinde',yaklasan.length||null));
  if(!yaklasan.length) durB.appendChild(bos('14 gün içinde duruşma yok'));
  else yaklasan.forEach(function(d){
    var bgC=d.diff===0?'var(--red)':d.diff<=3?'rgba(192,83,58,0.3)':'rgba(201,168,76,0.15)';
    var numC=d.diff===0?'#fff':d.diff<=3?'var(--red)':'var(--gold)';
    var row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:48px 1fr;gap:10px;align-items:center;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,0.04);cursor:pointer';
    row.onmouseover=function(){this.style.background='rgba(255,255,255,0.03)';};row.onmouseout=function(){this.style.background='';};
    row.onclick=function(dd){return function(){openDavaDetailPage(dd.id);};}(d);
    row.innerHTML='<div style="background:'+bgC+';border-radius:8px;padding:5px 0;text-align:center"><div style="font-size:16px;font-weight:900;color:'+numC+';line-height:1">'+d.diff+'</div><div style="font-size:9px;color:'+(d.diff===0?'rgba(255,255,255,0.8)':'var(--text3)')+';margin-top:1px">gün</div></div>'
      +'<div><div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(d.no)+' · '+escHtml(d.muvekkil)+'</div><div style="font-size:11px;color:var(--text3)">'+fmtDateShort(d.sonraki)+'</div></div>';
    durB.appendChild(row);
  });
  satir3.appendChild(durW);

  // Bu Haftaki Görevler + Randevular
  var haftaGorevleri=(function(){var hs=new Date(today);hs.setDate(hs.getDate()+7);return gorevler.filter(function(t){if(!t.tarih)return false;var d=_yerelTarih(t.tarih);return d>=today&&d<=hs;}).sort(function(a,b){return new Date(a.tarih)-new Date(b.tarih);});})();
  var {wrap:goW,hdr:goH,body:goB}=kart(null,280);
  goH.appendChild(kartBaslik('📋','Bu Haftaki Görevler',haftaGorevleri.length+' görev · 7 gün',haftaGorevleri.length||null));
  if(!haftaGorevleri.length) goB.appendChild(bos('Bu hafta görev yok'));
  else haftaGorevleri.forEach(function(t){
    var diff2=t.tarih?Math.ceil((_yerelTarih(t.tarih)-today)/86400000):null;
    var oclr=t.oncelik==='Acil'?'var(--red)':t.oncelik==='Yüksek'?'var(--gold)':'var(--text3)';
    var tipIcon=t.tip==='randevu'?'📞':t.tip==='durusma'?'⚖️':'✅';
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:9px 18px;border-bottom:1px solid rgba(255,255,255,0.04)';
    row.innerHTML='<div style="flex-shrink:0;min-width:50px;text-align:center;background:rgba(255,255,255,0.05);border-radius:6px;padding:3px 5px">'
      +'<div style="font-size:11px;font-weight:700;color:'+(diff2===0?'var(--gold)':'var(--text2)')+'">'+(diff2===0?'Bugün':diff2===1?'Yarın':diff2+' gün')+'</div>'
      +(t.tarih?'<div style="font-size:9px;color:var(--text3)">'+fmtDateShort(t.tarih.slice(0,10))+'</div>':'')
      +'</div>'
      +'<span style="font-size:12px">'+tipIcon+'</span>'
      +'<span style="font-size:10px;font-weight:700;color:'+oclr+';background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;flex-shrink:0">'+(t.oncelik||'Normal')+'</span>'
      +'<div style="flex:1;font-size:13px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(t.baslik||t.text||'')+'</div>';
    goB.appendChild(row);
  });
  satir3.appendChild(goW);

  // Son İşlemler + Finans
  var {wrap:fW,hdr:fH,body:fB}=kart(null,280);
  var finBtn2=document.createElement('button');finBtn2.className='btn btn-outline';finBtn2.style.cssText='font-size:10px;padding:3px 8px';finBtn2.textContent='Finans →';finBtn2.onclick=function(){showPage('finans');};
  var fHdrDiv=kartBaslik('💸','Son İşlemler',null,null,null);
  fHdrDiv.querySelector('div:last-child').appendChild(finBtn2);
  fH.appendChild(fHdrDiv);
  // Finans özet
  var fOzet=document.createElement('div');
  fOzet.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--border)';
  fOzet.innerHTML='<div style="background:var(--bg2);padding:10px 14px"><div style="font-size:10px;color:var(--text3)">Tahsilat</div><div style="font-size:14px;font-weight:700;color:var(--green);font-family:monospace">₺'+fmt(topTah)+'</div></div>'
    +'<div style="background:var(--bg2);padding:10px 14px"><div style="font-size:10px;color:var(--text3)">Net Bakiye</div><div style="font-size:14px;font-weight:700;color:'+(netBakiye>=0?'var(--green)':'var(--red)')+';font-family:monospace">'+(netBakiye>=0?'+':'')+'₺'+fmt(netBakiye)+'</div></div>';
  fB.appendChild(fOzet);
  if(!sonFinans.length) fB.appendChild(bos('İşlem yok'));
  else sonFinans.forEach(function(f){
    var isG=GELIR_T.includes(f.tur);
    var row=document.createElement('div');
    row.style.cssText='display:flex;align-items:center;gap:8px;padding:7px 18px;border-bottom:1px solid rgba(255,255,255,0.04)';
    row.innerHTML='<div style="width:28px;height:28px;border-radius:7px;background:'+(isG?'rgba(74,140,92,0.15)':'rgba(192,83,58,0.15)')+';display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">'+(isG?'↗':'↘')+'</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:600;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(f.muvekkil||f.tur)+'</div><div style="font-size:10px;color:var(--text3)">'+fmtDateShort(f.tarih)+'</div></div>'
      +'<span style="font-size:12px;font-weight:700;color:'+(isG?'var(--green)':'var(--red)')+';font-family:monospace;flex-shrink:0">'+(isG?'+':'−')+'₺'+fmt(f.tutar)+'</span>';
    fB.appendChild(row);
  });
  satir3.appendChild(fW);
  el.appendChild(satir3);

  // ══ SATIR 4: ORTAK TAKVİM ════════════════════════════════════════
  el.appendChild(satirBaslik('🗓 Bu Ay', null, 'var(--border)'));
  var otkWrap=document.createElement('div');
  otkWrap.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:14px';
  var otkNow=new Date(),otkY=otkNow.getFullYear(),otkM=otkNow.getMonth();
  var OTK_AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var otkToday=new Date();otkToday.setHours(0,0,0,0);
  var otkTodayStr=otkY+'-'+String(otkM+1).padStart(2,'0')+'-'+String(otkNow.getDate()).padStart(2,'0');
  var otkTasks=DB.get('tasks')||[];
  var otkDavalar=DB.get('davalar')||[];
  function otkGetEvs(ds){
    var evs=[];var dt=new Date(ds+'T00:00:00');var diff=Math.round((dt-otkToday)/86400000);
    otkDavalar.forEach(function(d){if(d.sonraki&&d.sonraki.slice(0,10)===ds)evs.push({clr:diff<=3?'var(--red)':'var(--gold)',label:d.muvekkil||d.no,icon:'⚖️'});});
    otkTasks.forEach(function(t){if(!t.done&&t.tarih&&t.tarih.slice(0,10)===ds){if(t.tip==='randevu')evs.push({clr:'#7ab5d4',label:t.baslik||t.text||'',icon:'📞'});else if(t.tip==='durusma')evs.push({clr:'var(--gold)',label:t.baslik||t.text||'',icon:'⚖️'});else evs.push({clr:'var(--green)',label:t.baslik||t.text||'',icon:'✅'});}});
    return evs;
  }
  var otkHdr=document.createElement('div');
  otkHdr.style.cssText='padding:12px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between';
  var otkTitleEl=document.createElement('div');
  otkTitleEl.innerHTML='<div style="font-size:14px;font-weight:700;color:var(--text)">🗓 Ortak Takvim — '+OTK_AYLAR[otkM]+' '+otkY+'</div><div style="font-size:11px;color:var(--text3);margin-top:2px">Duruşmalar · Görevler · Randevular</div>';
  var otkBtn=document.createElement('button');otkBtn.className='btn btn-outline';otkBtn.style.cssText='font-size:11px;padding:4px 10px';otkBtn.textContent='Tam Takvim →';otkBtn.onclick=function(){ortakTakvimTamAc();};
  otkHdr.appendChild(otkTitleEl);otkHdr.appendChild(otkBtn);
  otkWrap.appendChild(otkHdr);
  var otkLegend=document.createElement('div');
  otkLegend.style.cssText='padding:8px 18px;border-bottom:1px solid var(--border);display:flex;gap:14px';
  otkLegend.innerHTML='<span style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:var(--gold);display:inline-block"></span>Duruşma</span><span style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#7ab5d4;display:inline-block"></span>Randevu</span><span style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span>Görev</span><span style="font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span>Acil</span>';
  otkWrap.appendChild(otkLegend);
  var otkGrid2=document.createElement('div');
  otkGrid2.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:10px 12px;background:var(--bg2)';
  ['Pzt','Sal','Çrş','Per','Cum','Cmt','Paz'].forEach(function(g){var h=document.createElement('div');h.style.cssText='text-align:center;font-size:11px;color:var(--text3);font-weight:600;padding:4px 0;border-bottom:1px solid var(--border)';h.textContent=g;otkGrid2.appendChild(h);});
  var otkFirst=new Date(otkY,otkM,1);var otkBosluk=otkFirst.getDay()===0?6:otkFirst.getDay()-1;
  var otkSonGun=new Date(otkY,otkM+1,0).getDate();
  for(var bb=0;bb<otkBosluk;bb++){var bc2=document.createElement('div');bc2.style.cssText='min-height:56px;padding:2px';otkGrid2.appendChild(bc2);}
  for(var gun2=1;gun2<=otkSonGun;gun2++){
    var ds2=otkY+'-'+String(otkM+1).padStart(2,'0')+'-'+String(gun2).padStart(2,'0');
    var evs3=otkGetEvs(ds2);var isToday3=(ds2===otkTodayStr);
    var cell2=document.createElement('div');
    cell2.style.cssText='min-height:56px;padding:3px;border-radius:8px;border:1px solid '+(isToday3?'rgba(201,168,76,0.4)':'var(--border)')+';background:'+(isToday3?'rgba(201,168,76,0.06)':'transparent');
    if(evs3.length){cell2.style.cursor='pointer';cell2.onclick=(function(ds_capture){ return function(){ otkGunDetayAc(ds_capture); }; })(ds2);}
    var numD2=document.createElement('div');numD2.style.cssText='font-size:12px;font-weight:'+(isToday3?'800':evs3.length?'600':'400')+';color:'+(isToday3?'var(--gold)':evs3.length?'var(--text)':'var(--text3)')+';text-align:center;padding:1px 0';numD2.textContent=gun2;cell2.appendChild(numD2);
    if(evs3.length){evs3.slice(0,2).forEach(function(e){var evDiv=document.createElement('div');evDiv.style.cssText='font-size:10px;font-weight:500;color:'+e.clr+';padding:1px 4px;margin-bottom:1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border-left:2px solid '+e.clr+';border-radius:0 3px 3px 0';evDiv.textContent=e.icon+' '+e.label;evDiv.title=e.label;cell2.appendChild(evDiv);});if(evs3.length>2){var moreD=document.createElement('div');moreD.style.cssText='font-size:10px;color:var(--text3);text-align:center';moreD.textContent='+'+( evs3.length-2)+' daha';cell2.appendChild(moreD);}}
    otkGrid2.appendChild(cell2);
  }
  otkWrap.appendChild(otkGrid2);
  el.appendChild(otkWrap);

  // ══ SATIR 5: İSTATİSTİKLER ═══════════════════════════════════════
  el.appendChild(satirBaslik('📊 İstatistikler', null, 'var(--border)'));
  var altGrid=document.createElement('div');
  altGrid.style.cssText='display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px';
  // Yıllık bar
  var yillar=[0,1,2,3].map(function(i){return new Date().getFullYear()-i;}).reverse();
  var yilSayilar=yillar.map(function(y){return davalar0.filter(function(d){return (d.created||d.tarih||'').slice(0,4)===String(y);}).length;});
  var yilMax=Math.max.apply(null,yilSayilar.concat([1]));
  var yc=document.createElement('div');yc.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column';
  yc.innerHTML='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;color:var(--text)">📈 Yıllık Dava Açılışı</div>'
    +'<div style="padding:16px;flex:1;display:flex;flex-direction:column;justify-content:flex-end"><div style="display:flex;align-items:flex-end;gap:8px;height:100px">'
    +yillar.map(function(y,i){var v=yilSayilar[i];var pct=Math.round(v/yilMax*100);var clr=i===yillar.length-1?'var(--gold)':'rgba(201,168,76,0.35)';
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%"><div style="font-size:14px;font-weight:800;color:'+(v>0?'var(--text)':'var(--text3)')+';margin-bottom:4px">'+v+'</div><div style="width:100%;background:'+clr+';border-radius:6px 6px 0 0;height:'+Math.max(Math.round(v/yilMax*100),v===0?2:8)+'%;min-height:3px"></div><div style="font-size:10px;color:var(--text3);margin-top:5px;font-weight:500">'+y+'</div></div>';
    }).join('')+'</div></div>';
  altGrid.appendChild(yc);
  // Mahkeme türü
  var MAHKEME_TIP={};davalar0.forEach(function(d){var m=d.mahkeme||'Belirtilmemiş';var tip=/Asliye Hukuk|AHM/.test(m)?'Asliye Hukuk':/İş Mahk|İş Mah/.test(m)?'İş':/Asliye Ticaret|ATM/.test(m)?'Ticaret':/Ağır Ceza|Asliye Ceza|Ceza/.test(m)?'Ceza':/Sulh Hukuk|SHM/.test(m)?'Sulh':/Aile/.test(m)?'Aile':/İdare/.test(m)?'İdare':/Bölge Adliye|BAM/.test(m)?'İstinaf':/Yargıtay/.test(m)?'Temyiz':'Diğer';MAHKEME_TIP[tip]=(MAHKEME_TIP[tip]||0)+1;});
  var mhkD=Object.entries(MAHKEME_TIP).sort(function(a,b){return b[1]-a[1];}).slice(0,5);var mhkMax=mhkD.length?mhkD[0][1]:1;
  var mc=document.createElement('div');mc.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column';
  mc.innerHTML='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;color:var(--text)">🏛 Mahkeme Türleri</div>'
    +(mhkD.length?mhkD.map(function(e){var pct=Math.round(e[1]/mhkMax*100);return '<div style="padding:7px 16px 3px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:2px"><span style="color:var(--text2)">'+escHtml(e[0])+'</span><span style="font-weight:700;color:var(--gold)">'+e[1]+'</span></div><div style="background:var(--bg3);border-radius:4px;height:4px;margin-bottom:4px"><div style="height:100%;width:'+pct+'%;background:var(--gold);border-radius:4px"></div></div></div>';}).join(''):'<div style="padding:12px 16px;color:var(--text3);font-size:12px">Dava yok</div>');
  altGrid.appendChild(mc);
  // Müvekkil dağılım
  var mvDagilim=muvekkiller.map(function(m){return {ad:m.ad,dava:davalar0.filter(function(d){return d.muvekkil===m.ad;}).length,icra:icralar0.filter(function(i){return i.muvekkil===m.ad;}).length};}).filter(function(m){return m.dava+m.icra>0;}).sort(function(a,b){return b.dava+b.icra-a.dava-a.icra;});
  var mvc=document.createElement('div');mvc.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column';
  mvc.innerHTML='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;color:var(--text)">👤 Müvekkil Dağılımı</div>'
    +(mvDagilim.length?mvDagilim.slice(0,6).map(function(m){return '<div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,0.04)"><div style="flex:1;font-size:13px;font-weight:600;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(m.ad)+'</div><div style="display:flex;gap:4px">'+(m.dava?'<span style="font-size:11px;font-weight:700;color:var(--text3);background:rgba(255,255,255,0.07);padding:2px 8px;border-radius:4px">📁 '+m.dava+'</span>':'')+(m.icra?'<span style="font-size:11px;font-weight:700;color:#7ab5d4;background:rgba(58,107,140,0.15);padding:2px 8px;border-radius:4px">⚡ '+m.icra+'</span>':'')+'</div></div>';}).join(''):'<div style="padding:12px 16px;color:var(--text3);font-size:12px">Veri yok</div>');
  altGrid.appendChild(mvc);
  // Dosya özeti
  var sc=document.createElement('div');sc.style.cssText='background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden;display:flex;flex-direction:column';
  sc.innerHTML='<div style="padding:12px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;color:var(--text)">📊 Dosya Özeti</div><div style="padding:8px 16px">'
    +[{l:'Aktif Dava',v:davalar0.filter(function(d){return d.durum==='Aktif';}).length,c:'var(--green)'},{l:'Bekleyen Dava',v:davalar0.filter(function(d){return d.durum==='Bekliyor';}).length,c:'var(--gold)'},{l:'Kapalı Dava',v:davalar0.filter(function(d){return d.durum==='Kapalı';}).length,c:'var(--text3)'},{l:'Aktif İcra',v:icralar0.filter(function(i){return i.durum==='Aktif';}).length,c:'#7ab5d4'},{l:'İstinaf',v:istinafDosyalar.length,c:'rgba(122,181,212,0.9)'},{l:'Temyiz',v:temyizDosyalar.length,c:'rgba(196,168,224,0.9)'},{l:'Satış Avansı',v:satisAvansliIcra.length,c:'var(--gold)'},{l:'Haciz Yenileme!',v:hacizYenilemGerek.length,c:hacizYenilemGerek.length?'var(--red)':'var(--text3)'}]
    .map(function(x){return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04)"><span style="font-size:12px;color:var(--text3)">'+x.l+'</span><span style="font-size:15px;font-weight:700;color:'+x.c+'">'+x.v+'</span></div>';}).join('')+'</div>';
  altGrid.appendChild(sc);
  el.appendChild(altGrid);
}











// ========== TAKVİM ==========
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function setTaskView(v) {
  document.getElementById('task-view-list').style.display    = v === 'list'   ? '' : 'none';
  document.getElementById('task-view-person').style.display  = v === 'person' ? '' : 'none';
  document.getElementById('task-view-cal').style.display     = v === 'cal'    ? 'block' : 'none';
  document.getElementById('task-view-list-btn').className    = v === 'list'   ? 'btn btn-gold' : 'btn btn-outline';
  document.getElementById('task-view-person-btn').className  = v === 'person' ? 'btn btn-gold' : 'btn btn-outline';
  document.getElementById('task-view-cal-btn').className     = v === 'cal'    ? 'btn btn-gold' : 'btn btn-outline';
  if (v === 'cal')    renderCalendar();
  else if (v === 'person') renderTasksByPerson();
  else renderTasks();
}

function isCalendarVisible() {
  const el = document.getElementById('task-view-cal');
  return el ? el.style.display === 'block' : false;
}

function calPrev()  { if (--calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext()  { if (++calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }
function calToday() { calYear = new Date().getFullYear(); calMonth = new Date().getMonth(); renderCalendar(); }


// ══════════════════════════════════════════
// DURUŞMA TAKVİMİ
// ══════════════════════════════════════════
var _dtYear  = new Date().getFullYear();
var _dtMonth = new Date().getMonth();
var _dtView  = 'ay';
var _dtWeekStart = (function() {
  var d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  return d;
})();

function dtCalPrev() {
  if (_dtView === 'ay') {
    _dtMonth--;
    if (_dtMonth < 0) { _dtMonth = 11; _dtYear--; }
  } else {
    var d = new Date(_dtWeekStart);
    d.setDate(d.getDate() - 7);
    _dtWeekStart = d;
  }
  renderDurusmaTakvim();
}
function dtCalNext() {
  if (_dtView === 'ay') {
    _dtMonth++;
    if (_dtMonth > 11) { _dtMonth = 0; _dtYear++; }
  } else {
    var d = new Date(_dtWeekStart);
    d.setDate(d.getDate() + 7);
    _dtWeekStart = d;
  }
  renderDurusmaTakvim();
}
function dtCalToday() {
  _dtYear  = new Date().getFullYear();
  _dtMonth = new Date().getMonth();
  var d = new Date();
  d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
  _dtWeekStart = d;
  renderDurusmaTakvim();
}
function setDtView(view) {
  _dtView = view;
  ['ay','hafta','liste'].forEach(function(v) {
    var el = document.getElementById('dt-view-' + v);
    if (el) el.style.display = v === view ? '' : 'none';
    var btn = document.getElementById('dt-view-' + v + '-btn');
    if (btn) btn.className = 'btn ' + (v === view ? 'btn-gold' : 'btn-outline');
  });
  renderDurusmaTakvim();
}

function renderDurusmaTakvim() {
  var labelEl = document.getElementById('dt-month-label');
  var AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var allTasks = DB.get('tasks') || [];
  var tasks = allTasks.filter(function(t) { return t.tip === 'durusma' || (t.mahkeme && t.mahkeme.length > 0); });
  var today = new Date();
  var todayStr = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  if (_dtView === 'ay') {
    if (labelEl) labelEl.textContent = AY[_dtMonth] + ' ' + _dtYear;
    var grid = document.getElementById('dt-month-grid');
    if (!grid) return;
    var gunMap = {};
    tasks.forEach(function(t) {
      var d = t.tarih ? t.tarih.slice(0,10) : '';
      if (!d) return;
      if (!gunMap[d]) gunMap[d] = [];
      gunMap[d].push(t);
    });
    var ilkGun = new Date(_dtYear, _dtMonth, 1).getDay();
    var bosluk = ilkGun === 0 ? 6 : ilkGun - 1;
    var sonGun  = new Date(_dtYear, _dtMonth + 1, 0).getDate();
    var onceki  = new Date(_dtYear, _dtMonth, 0).getDate();
    var html = '';
    for (var i = 0; i < bosluk; i++) {
      html += '<div class="durusma-cal-day other-month"><div class="durusma-cal-day-num">' + (onceki - bosluk + i + 1) + '</div></div>';
    }
    for (var gun = 1; gun <= sonGun; gun++) {
      var anahtar = _dtYear + '-' + String(_dtMonth+1).padStart(2,'0') + '-' + String(gun).padStart(2,'0');
      var isToday = anahtar === todayStr;
      var gt = gunMap[anahtar] || [];
      var dots = gt.slice(0,3).map(function(t) {
        var gecikti = anahtar < todayStr && !t.done;
        var clr = t.done ? 'rgba(74,140,92,0.25)' : gecikti ? 'rgba(192,83,58,0.3)' : 'rgba(201,168,76,0.2)';
        var tc  = t.done ? 'var(--green)' : gecikti ? 'var(--red)' : 'var(--gold)';
        return '<div style="font-size:10px;padding:1px 4px;border-radius:3px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:' + clr + ';color:' + tc + '">' + escHtml((t.baslik||'').slice(0,18)) + '</div>';
      }).join('');
      html += '<div class="durusma-cal-day' + (isToday ? ' today' : '') + '"'
           + (gt.length > 0 ? ' data-dtday="' + anahtar + '" style="cursor:pointer"' : '')
           + '>'
           + '<div class="durusma-cal-day-num"' + (isToday ? ' style="background:var(--gold);color:#1a1400;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700"' : '') + '>' + gun + '</div>'
           + dots
           + (gt.length > 3 ? '<div style="font-size:10px;color:var(--text3)">+' + (gt.length-3) + ' daha</div>' : '')
           + '</div>';
    }
    var kalan = (bosluk + sonGun) % 7;
    if (kalan > 0) for (var j = 1; j <= 7 - kalan; j++) html += '<div class="durusma-cal-day other-month"><div class="durusma-cal-day-num">' + j + '</div></div>';
    grid.innerHTML = html;

  } else if (_dtView === 'hafta') {
    var ws = new Date(_dtWeekStart);
    var we = new Date(ws); we.setDate(we.getDate()+6);
    if (labelEl) labelEl.textContent = ws.getDate() + ' ' + AY[ws.getMonth()] + ' – ' + we.getDate() + ' ' + AY[we.getMonth()] + ' ' + we.getFullYear();
    var wgrid = document.getElementById('dt-week-grid');
    if (!wgrid) return;
    var GUNLER = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    var cols = '';
    for (var di = 0; di < 7; di++) {
      var dd = new Date(ws); dd.setDate(ws.getDate() + di);
      var dstr = dd.toISOString().slice(0,10);
      var isTd = dstr === todayStr;
      var dtasks = tasks.filter(function(t){ return t.tarih && t.tarih.slice(0,10) === dstr; });
      cols += '<div style="flex:1;border-right:1px solid var(--border);min-height:300px;padding:8px">'
           + '<div style="font-size:11px;color:var(--text3);text-align:center;margin-bottom:6px">' + GUNLER[di] + '</div>'
           + '<div style="text-align:center;font-size:16px;font-weight:700;margin-bottom:8px' + (isTd ? ';color:var(--gold)' : '') + '">' + dd.getDate() + '</div>'
           + dtasks.map(function(t) {
               var gecikti = dstr < todayStr && !t.done;
               var bc = t.done ? 'var(--green)' : gecikti ? 'var(--red)' : 'var(--gold)';
               return '<div style="font-size:11px;padding:4px 6px;border-radius:6px;margin-bottom:4px;border-left:3px solid ' + bc + ';background:var(--bg3);cursor:pointer" data-dttask="' + t.id + '">'
                 + (t.tarih && t.tarih.length > 10 ? '<div style="font-size:10px;color:var(--text3)">' + t.tarih.slice(11,16) + '</div>' : '')
                 + '<div style="font-weight:600;color:var(--text)">' + escHtml((t.baslik||'').slice(0,20)) + '</div>'
                 + (t.mahkeme ? '<div style="color:var(--text3)">' + escHtml(t.mahkeme.slice(0,20)) + '</div>' : '')
                 + '</div>';
             }).join('')
           + '</div>';
    }
    wgrid.innerHTML = '<div style="display:flex;border-top:1px solid var(--border)">' + cols + '</div>';

  } else {
    var listEl = document.getElementById('dt-list-content');
    if (!listEl) return;
    if (labelEl) labelEl.textContent = 'Tüm Duruşmalar';
    var sorted = tasks.slice().sort(function(a,b){ return new Date(a.tarih) - new Date(b.tarih); });
    var upcoming = sorted.filter(function(t){ return t.tarih && t.tarih.slice(0,10) >= todayStr; });
    var past = sorted.filter(function(t){ return !t.tarih || t.tarih.slice(0,10) < todayStr; }).reverse();
    var makeRow = function(t) {
      var dstr2 = t.tarih ? t.tarih.slice(0,10) : '';
      var gecikti = dstr2 < todayStr && !t.done;
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer" data-dttask="' + t.id + '">'
        + '<div style="text-align:center;min-width:48px"><div style="font-size:18px;font-weight:700;color:' + (gecikti?'var(--red)':'var(--gold)') + '">' + (dstr2 ? dstr2.slice(8,10) : '-') + '</div><div style="font-size:10px;color:var(--text3)">' + (dstr2 ? AY[parseInt(dstr2.slice(5,7))-1].slice(0,3) : '') + '</div></div>'
        + '<div style="flex:1"><div style="font-weight:600;color:var(--text)">' + escHtml(t.baslik||'') + '</div>'
        + (t.mahkeme ? '<div style="font-size:12px;color:var(--text3)">📍 ' + escHtml(t.mahkeme) + '</div>' : '')
        + (t.ilgili  ? '<div style="font-size:12px;color:var(--text3)">📁 ' + escHtml(t.ilgili)  + '</div>' : '')
        + '</div>'
        + '<div style="font-size:11px;color:' + (t.done?'var(--green)':gecikti?'var(--red)':'var(--text3)') + '">' + (t.done?'✓':'●') + '</div>'
        + '</div>';
    };
    listEl.innerHTML = (upcoming.length ? '<div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase">Yaklaşan (' + upcoming.length + ')</div>' + upcoming.map(makeRow).join('') : '')
      + (past.length ? '<div style="padding:10px 16px;font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;border-top:1px solid var(--border)">Geçmiş</div>' + past.map(makeRow).join('') : '')
      + (!upcoming.length && !past.length ? '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:32px;margin-bottom:12px">📅</div><div>Duruşma kaydı yok</div></div>' : '');
  }

  // Event delegation — data-dtday ve data-dttask
  var pageEl = document.getElementById('page-durusmatakvim');
  if (pageEl && !pageEl._dtEvt) {
    pageEl._dtEvt = true;
    pageEl.addEventListener('click', function(e) {
      var dayEl = e.target.closest('[data-dtday]');
      if (dayEl) { dtDayClick(dayEl.dataset.dtday); return; }
      var taskEl = e.target.closest('[data-dttask]');
      if (taskEl) { editTask(taskEl.dataset.dttask); return; }
    });
  }
}

function dtDayClick(dateStr) {
  var tasks = (DB.get('tasks')||[]).filter(function(t){ return t.tarih && t.tarih.slice(0,10) === dateStr; });
  if (!tasks.length) return;
  var popup = document.getElementById('dt-day-popup');
  var title = document.getElementById('dt-popup-title');
  var body  = document.getElementById('dt-popup-body');
  var AY = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  var d = new Date(dateStr + 'T00:00:00');
  if (title) title.textContent = d.getDate() + ' ' + AY[d.getMonth()] + ' ' + d.getFullYear();
  if (body) {
    body.innerHTML = tasks.map(function(t) {
      return '<div style="padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer" data-dttask="' + t.id + '">'
        + '<div style="font-weight:600;color:var(--text);margin-bottom:4px">' + escHtml(t.baslik||'') + '</div>'
        + (t.tarih && t.tarih.length > 10 ? '<div style="font-size:12px;color:var(--text3)">🕐 ' + t.tarih.slice(11,16) + '</div>' : '')
        + (t.mahkeme ? '<div style="font-size:12px;color:var(--text3)">📍 ' + escHtml(t.mahkeme) + '</div>' : '')
        + (t.ilgili  ? '<div style="font-size:12px;color:var(--text3)">📁 ' + escHtml(t.ilgili)  + '</div>' : '')
        + (t.aciklama ? '<div style="font-size:12px;color:var(--text3);margin-top:4px">' + escHtml(t.aciklama) + '</div>' : '')
        + '</div>';
    }).join('');
    // event delegation popup içinde
    body.onclick = function(e) {
      var taskEl = e.target.closest('[data-dttask]');
      if (taskEl) { popup.style.display = 'none'; editTask(taskEl.dataset.dttask); }
    };
  }
  if (popup) popup.style.display = 'flex';
}

function renderCalendar() {
  const gridEl  = document.getElementById('cal-grid');
  const labelEl = document.getElementById('cal-month-label');
  if (!gridEl || !labelEl) return;

  const AY_ADLARI = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  labelEl.textContent = AY_ADLARI[calMonth] + ' ' + calYear;

  const gorevler = DB.get('tasks') || [];

  // Görevleri tarih anahtarına göre grupla
  const harita = {};
  gorevler.forEach(g => {
    if (!g.tarih) return;
    const anahtar = g.tarih.slice(0, 10);
    if (!harita[anahtar]) harita[anahtar] = [];
    harita[anahtar].push(g);
  });

  // Bugünün anahtarı
  const bugun = new Date();
  const bugunAnahtar = bugun.getFullYear() + '-' +
    String(bugun.getMonth() + 1).padStart(2, '0') + '-' +
    String(bugun.getDate()).padStart(2, '0');

  // Ayın ilk gününün haftanın hangi günü (Pazartesi = 0)
  const ilkGun = new Date(calYear, calMonth, 1).getDay();
  const bosluk = ilkGun === 0 ? 6 : ilkGun - 1;
  const sonGun  = new Date(calYear, calMonth + 1, 0).getDate();

  let html = '';

  // Önceki ay dolgu
  const oncekiAySon = new Date(calYear, calMonth, 0).getDate();
  for (let i = 0; i < bosluk; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${oncekiAySon - bosluk + i + 1}</div></div>`;
  }

  // Bu ayın günleri
  for (let gun = 1; gun <= sonGun; gun++) {
    const anahtar = calYear + '-' +
      String(calMonth + 1).padStart(2, '0') + '-' +
      String(gun).padStart(2, '0');

    const gunGorevler = harita[anahtar] || [];
    const bugunMu     = anahtar === bugunAnahtar;
    const aktifSayi   = gunGorevler.filter(g => !g.done).length;
    const tamamSayi   = gunGorevler.filter(g => g.done).length;

    const dotlar = gunGorevler.slice(0, 2).map(g => {
      const sinif = g.done ? 'done'
        : g.oncelik === 'Acil'   ? 'urgent'
        : g.oncelik === 'Yüksek' ? 'high'
        : 'normal';
      const baslik = (g.baslik || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      return `<span class="cal-task-dot ${sinif}" title="${baslik}">${baslik}</span>`;
    }).join('');

    const fazlaBadge = gunGorevler.length > 2
      ? `<span style="font-size:10px;color:var(--text3);display:block">+${gunGorevler.length - 2} daha</span>` : '';

    const sayi = gunGorevler.length > 0
      ? `<div style="position:absolute;top:5px;right:6px;font-size:10px;font-weight:700;color:${aktifSayi > 0 ? 'var(--gold)' : 'var(--text3)'}">${gunGorevler.length}</div>`
      : '';

    const clickable = gunGorevler.length > 0 ? `onclick="calGunAc('${anahtar}')" style="cursor:pointer"` : '';

    html += `<div class="cal-day${bugunMu ? ' today' : ''}${gunGorevler.length > 0 ? ' has-tasks' : ''}" ${clickable}>
      ${sayi}
      <div class="cal-day-num">${gun}</div>${dotlar}${fazlaBadge}
    </div>`;
  }

  // Sonraki ay dolgu
  const kalanHucre = (7 - (bosluk + sonGun) % 7) % 7;
  for (let i = 1; i <= kalanHucre; i++) {
    html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
  }

  gridEl.innerHTML = html;
}

// ========== MÜVEKKİL TÜR ==========
function onMuvekkilTurChange() {
  const isKurumsal = document.getElementById('m-tur-kurumsal').checked;
  document.getElementById('m-tc-wrap').style.display = isKurumsal ? 'none' : '';
  document.getElementById('m-sektor-wrap').style.display = isKurumsal ? '' : 'none';
}

function showKisiDetail(id) {
  const k = DB.get('kisiler').find(x => x.id === id);
  if (!k) return;
  const contacts = DB.get('contacts').filter(c => c.accountId === id && c.accountType === 'kisi');
  document.getElementById('kisi-detail-view').innerHTML = buildAccountDetailHTML(k, 'kisi', id, contacts, [
    { label: 'Rol', val: k.rol },
    { label: 'İlgili Dosya', val: k.dosya || '—' },
    { label: 'Kurum', val: k.kurum || '—' },
    { label: 'Telefon', val: k.tel || '—' },
    { label: 'E-posta', val: k.email || '—' },
  ]);
  document.getElementById('kisi-list-view').style.display = 'none';
  document.getElementById('kisi-detail-view').style.display = '';
}

function buildAccountDetailHTML(account, accountType, accountId, contacts, infoItems) {
  const isMusekkil = accountType === 'muvekkil';
  const icon = isMusekkil ? (account.tur === 'kurumsal' ? '🏢' : '👤') : '🧑‍⚖️';
  const backFn = isMusekkil
    ? `showSubpage('muvekkil-list'); renderMuvekkiller()`
    : `document.getElementById('kisi-list-view').style.display=''; document.getElementById('kisi-detail-view').style.display='none'; renderKisiler()`;

  const infoGrid = infoItems.filter(i => i.val && i.val !== '—').map(i =>
    `<div class="info-item"><label>${i.label}</label><span>${i.val}</span></div>`
  ).join('');

  const contactsHTML = buildContactsSection(accountId, accountType, contacts);
  const notlar = account.notlar ? `<div class="card" style="margin-top:12px"><div class="card-title">📝 Notlar</div><p style="color:var(--text2);line-height:1.7;font-size:13.5px">${account.notlar}</p></div>` : '';

  return `
    <button class="btn btn-outline" style="margin-top:16px" onclick="mvGeri('${accountType}','${accountId}')">← Geri</button>
    <div style="margin-top:16px">
      <div class="detail-header">
        <div class="detail-avatar">${icon}</div>
        <div class="detail-info">
          <div class="detail-name">${account.ad}</div>
          <div class="detail-meta">${account.rol || (account.tur === 'kurumsal' ? '🏢 Kurumsal' : '👤 Bireysel')}${account.sektor ? ' · ' + account.sektor : ''}</div>
        </div>
        <button class="btn btn-outline" onclick="mvGeriEdit('${accountType}','${accountId}')">✏ Düzenle</button>
      </div>
      ${infoGrid ? `<div class="info-grid">${infoGrid}</div>` : ''}
      ${contactsHTML}
      ${notlar}
      ${isMusekkil ? buildMuvekkilDavaSection(account) : ''}
    </div>`;
}

function buildContactsSection(accountId, accountType, contacts) {
  return `
    <div class="card" style="margin-top:12px;border-color:rgba(58,107,140,0.35)">
      <div class="card-title" style="color:#7ab5d4;display:flex;justify-content:space-between;align-items:center">
        <span>👥 Contacts (${contacts.length})</span>
        <button class="btn btn-outline" style="font-size:12px;padding:5px 10px;color:#7ab5d4;border-color:rgba(58,107,140,0.5)"
          onclick="openAddContact('${accountId}','${accountType}')">+ Contact Ekle</button>
      </div>
      ${contacts.length ? `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${contacts.map(c => `
            <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px;display:flex;gap:12px;align-items:flex-start">
              <div style="width:38px;height:38px;border-radius:50%;background:rgba(58,107,140,0.18);border:1px solid rgba(58,107,140,0.35);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">👤</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;color:var(--text);font-size:13.5px">${c.ad}</div>
                ${c.unvan ? `<div style="font-size:12px;color:var(--gold2);margin-top:2px">${c.unvan}${c.departman ? ' · <span style="color:var(--text3)">' + c.departman + '</span>' : ''}</div>` : ''}
                <div style="font-size:11px;color:var(--text3);margin-top:5px;display:flex;gap:14px;flex-wrap:wrap">
                  ${c.tel ? `<span>📞 ${c.tel}</span>` : ''}
                  ${c.email ? `<span>✉ ${c.email}</span>` : ''}
                </div>
                ${c.notlar ? `<div style="font-size:11px;color:var(--text3);margin-top:4px;font-style:italic">${c.notlar}</div>` : ''}
              </div>
              <div style="display:flex;gap:4px;flex-shrink:0">
                <button class="btn btn-ghost" onclick="editContactItem('${c.id}','${accountId}','${accountType}')">✏</button>
                <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteContactItem('${c.id}','${accountId}','${accountType}')">🗑</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="text-align:center;padding:24px;color:var(--text3)">
          <div style="font-size:28px;margin-bottom:8px">👥</div>
          <div style="font-size:13px;margin-bottom:12px">Henüz contact eklenmedi</div>
          <button class="btn btn-outline" style="font-size:12px;color:#7ab5d4;border-color:rgba(58,107,140,0.5)"
            onclick="openAddContact('${accountId}','${accountType}')">+ İlk Contact'ı Ekle</button>
        </div>
      `}
    </div>`;
}

function buildMuvekkilDavaSection(m) {
  const davalar = DB.get('davalar').filter(d => d.muvekkil === m.ad);
  return `
    <div class="card" style="margin-top:12px">
      <div class="card-title">📁 Dava Dosyaları (${davalar.length})</div>
      ${davalar.length ? davalar.map(d => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
          <span class="mono text-gold" style="font-size:12px">${d.no}</span>
          <span style="flex:1;font-size:13.5px">${d.konu}</span>
          <span class="tag tag-${d.durum==='Aktif'?'aktif':'kapali'}">${d.durum}</span>
        </div>
      `).join('') : '<div style="color:var(--text3);font-size:13px;padding:8px 0">Dava dosyası yok</div>'}
    </div>`;
}

// ========== CONTACT CRUD (unified for muvekkil + kisi accounts) ==========
let editingContactId = null;
let contactAccountId = null;
let contactAccountType = null;

function openAddContact(accountId, accountType) {
  const arr = accountType === 'muvekkil' ? DB.get('muvekkiller') : DB.get('kisiler');
  const account = arr.find(x => x.id === accountId);
  if (!account) return;
  contactAccountId = accountId;
  contactAccountType = accountType;
  editingContactId = null;
  ['ad','unvan','departman','tel','email','notlar'].forEach(f => {
    const el = document.getElementById('ct-' + f); if (el) el.value = '';
  });
  document.getElementById('modal-contact-title').textContent = 'Yeni Contact';
  document.getElementById('modal-contact-parent-label').textContent =
    (accountType === 'muvekkil' ? '👤 ' : '🧑‍⚖️ ') + account.ad + ' için contact ekleniyor';
  openModal('modal-contact');
}

function editContactItem(contactId, accountId, accountType) {
  const c = DB.get('contacts').find(x => x.id === contactId);
  if (!c) return;
  const arr = accountType === 'muvekkil' ? DB.get('muvekkiller') : DB.get('kisiler');
  const account = arr.find(x => x.id === accountId);
  editingContactId = contactId;
  contactAccountId = accountId;
  contactAccountType = accountType;
  document.getElementById('ct-ad').value = c.ad || '';
  document.getElementById('ct-unvan').value = c.unvan || '';
  document.getElementById('ct-departman').value = c.departman || '';
  document.getElementById('ct-tel').value = c.tel || '';
  document.getElementById('ct-email').value = c.email || '';
  document.getElementById('ct-notlar').value = c.notlar || '';
  document.getElementById('modal-contact-title').textContent = 'Contact Düzenle';
  document.getElementById('modal-contact-parent-label').textContent =
    (accountType === 'muvekkil' ? '👤 ' : '🧑‍⚖️ ') + (account ? account.ad : '') + ' — düzenleniyor';
  openModal('modal-contact');
}

async function saveContact() {
  const ad = document.getElementById('ct-ad').value.trim();
  if (!ad) return notify('Ad Soyad zorunludur!');
  const obj = {
    id: editingContactId || DB.genId(),
    accountId: contactAccountId,
    accountType: contactAccountType,
    // Eski muvekkilId uyumluluğu için
    muvekkilId: contactAccountType === 'muvekkil' ? contactAccountId : null,
    ad,
    unvan: document.getElementById('ct-unvan').value,
    departman: document.getElementById('ct-departman').value,
    tel: document.getElementById('ct-tel').value,
    email: document.getElementById('ct-email').value,
    notlar: document.getElementById('ct-notlar').value,
    tarih: new Date().toISOString()
  };
  const { error } = await _supabaseClient.from('contacts').upsert(_sbContactToRow(obj));
  if (error) { console.error('Contact kaydedilemedi:', error); return notify('❌ Contact kaydedilemedi: ' + (error.message||'bilinmeyen hata')); }
  let arr = DB.get('contacts');
  if (editingContactId) arr = arr.map(x => x.id === editingContactId ? obj : x);
  else arr = [obj, ...arr];
  DB.set('contacts', arr);
  closeModal('modal-contact');
  notify(editingContactId ? 'Contact güncellendi' : 'Contact eklendi ✓');
  // İlgili detay sayfasını yenile
  if (contactAccountType === 'muvekkil') showMuvekkilDetail(contactAccountId);
  else if (contactAccountType === 'kisi') showKisiDetail(contactAccountId);
  editingContactId = null; contactAccountId = null; contactAccountType = null;
}

function deleteContactItem(contactId, accountId, accountType) {
  showConfirmModal('Bu contact kaydını silmek istediğinizden emin misiniz?', async function() {
    const { error } = await _supabaseClient.from('contacts').delete().eq('id', contactId);
    if (error) { console.error('Contact silinemedi:', error); return notify('❌ Contact silinemedi: ' + (error.message||'bilinmeyen hata')); }
    DB.set('contacts', DB.get('contacts').filter(x => x.id !== contactId));
    notify('Contact silindi');
    if (accountType === 'muvekkil') showMuvekkilDetail(accountId);
    else showKisiDetail(accountId);
  });
}

// ========== DATA STORE ==========
// DB, Firebase modül scriptinde window.DB olarak tanımlandı.
// Burada sadece referans alıyoruz (module script önce çalışmazsa fallback):
if (typeof DB === 'undefined') {
  var DB = window.DB || {
    genId: () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2,5)),
    get: (key) => JSON.parse(localStorage.getItem('hukuk_' + key) || '[]'),
    set: (key, val) => localStorage.setItem('hukuk_' + key, JSON.stringify(val))
  };
}

let editingId = null;
let currentPage = 'dashboard';
let _prevPage = null; // Önceki sayfa (geri dönmek için)
let _navStack = []; // Navigasyon geçmişi (stack)

// ========== REALTIME SAYFA YENİLEME ==========
window.refreshCurrentPage = function(changedKey) {
  if (!window._appStarted) return;
  const keyPageMap = {
    davalar: 'davalar', icralar: 'icralar', muvekkiller: 'kisiler',
    kisiler: 'kisiler', finans: 'finans', cari: 'cari',
    tasks: 'tasks', notlar: 'notlar', kullanicilar: 'kullanicilar'
  };
  const targetPage = keyPageMap[changedKey];
  if (!targetPage) return;
  if (currentPage === targetPage) {
    // Aktif sayfayı sessizce yenile
    if (targetPage === 'davalar') renderDavalar();
    else if (targetPage === 'icralar') renderIcralar();
    else if (targetPage === 'kisiler') { renderMuvekkiller(); renderKisiler(); }
    else if (targetPage === 'finans') renderFinans();
    else if (targetPage === 'cari') renderCari();
    else if (targetPage === 'tasks') {
    if (document.getElementById('task-view-list') && document.getElementById('task-view-list').style.display !== 'none') {
      renderTasks();
    }
  }
    else if (targetPage === 'notlar') renderNotes();
    else if (targetPage === 'kullanicilar') renderKullanicilar();
    // Küçük bildirim
    const bar = document.getElementById('online-users-bar');
    if (bar && bar.textContent) notify('🔄 Veriler güncellendi');
  }
  // Dashboard her zaman güncelle
  if (currentPage === 'dashboard') renderDashboard();
};

// ========== NAVIGATION ==========
function showPage(page) {
  if (currentPage !== page) {
    _prevPage = currentPage; // Önceki sayfayı kaydet
    _navStack.push(currentPage);
    if (_navStack.length > 20) _navStack.shift(); // max 20 kayıt tut
  }
  // Aktif sekmenin sayfa bilgisini güncelle (navigasyon durumunu koru)
  if (_activeTabId) {
    var activeTab = _tabs.find(function(t){ return t.id === _activeTabId; });
    if (activeTab && !activeTab.subpage) {
      activeTab.page = page;
      activeTab.label = (pageTitles && pageTitles[page]) || page;
    }
  }
  // Dava detay sayfası açıksa kapat ve sekmesini kaldır
  const ddp = document.getElementById('dava-detail-page');
  if (ddp && ddp.classList.contains('open')) {
    ddp.classList.remove('open');
    document.body.style.overflow = '';
    // Topbar'ı sıfırla (closeDavaDetailPage ile aynı)
    var ddpCtx = document.getElementById('ddp-topbar-context');
    if (ddpCtx) ddpCtx.style.display = 'none';
    var addBtn = document.getElementById('topbar-add-btn');
    if (addBtn) addBtn.textContent = '+ Yeni Ekle';
    var pgTitle = document.getElementById('page-title');
    if (pgTitle) pgTitle.style.display = '';
    if (currentDavaId) {
      var dTab = _tabs.find(function(t){ return t.itemId === currentDavaId && t.subpage === 'dava-detail'; });
      if (dTab) { _tabs = _tabs.filter(function(t){ return t.id !== dTab.id; }); if (_activeTabId === dTab.id) _activeTabId = null; tabRender(); if (typeof _tabSaveSession === 'function') _tabSaveSession(); }
    }
    currentDavaId = null;
  }
  // İcra detay sayfası açıksa kapat ve sekmesini kaldır
  const idp = document.getElementById('icra-detail-page');
  if (idp && idp.classList.contains('open')) {
    idp.classList.remove('open');
    // Topbar'ı sıfırla
    var idpCtx = document.getElementById('ddp-topbar-context');
    if (idpCtx) idpCtx.style.display = 'none';
    var addBtn2 = document.getElementById('topbar-add-btn');
    if (addBtn2) addBtn2.textContent = '+ Yeni Ekle';
    var pgTitle2 = document.getElementById('page-title');
    if (pgTitle2) pgTitle2.style.display = '';
    if (currentIcraId) {
      var iTab = _tabs.find(function(t){ return t.itemId === currentIcraId && t.subpage === 'icra-detail'; });
      if (iTab) { _tabs = _tabs.filter(function(t){ return t.id !== iTab.id; }); if (_activeTabId === iTab.id) _activeTabId = null; tabRender(); if (typeof _tabSaveSession === 'function') _tabSaveSession(); }
    }
    currentIcraId = null;
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.trim().toLowerCase().includes(pageNames[page]?.toLowerCase())) n.classList.add('active');
  });
  currentPage = page;
  document.getElementById('page-title').textContent = pageTitles[page] || '';
  if (page === 'dashboard') renderDashboard();
  else if (page === 'davalar') { showSubpage('dava-list'); renderDavalar(); }
  else if (page === 'icralar') { showSubpage('icra-list'); renderIcralar(); }
  else if (page === 'muvekkiller') {
    // Müvekkiller artık Kişiler sayfasının içinde
    currentPage = 'kisiler';
    document.getElementById('page-title').textContent = pageTitles['kisiler'];
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-kisiler').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.textContent.includes('Müvekkil')) n.classList.add('active');
    });
    switchKisilerTab('muvekkiller');
    renderMuvekkiller();
    closeSidebar();
    return; // ← currentPage = 'kisiler' olarak kaldı, doğru
  }
  else if (page === 'kisiler') {
    currentPage = 'kisiler'; // açıkça set et
    // Açık müvekkil sekmelerini kapat
    const mvTabs = _tabs.filter(t => t.subpage === 'muvekkil-detail');
    mvTabs.forEach(t => {
      _tabs = _tabs.filter(x => x.id !== t.id);
      if (_activeTabId === t.id) _activeTabId = null;
    });
    if (mvTabs.length) tabRender();
    switchKisilerTab('muvekkiller');
    renderMuvekkiller();
    renderKisiler();
    // Her zaman liste görünümünden başla
    showSubpage('muvekkil-list');
  }
  else if (page === 'finans') {
    renderFinans();
    // İlk sekmede başla
    document.querySelectorAll('.finans-sekme').forEach(function(b,i){b.classList.toggle('aktif',i===0);});
    ['islemler','odeme-plani','karsi-vekalet','avans-kasa','ofis-gider'].forEach(function(s,i){
      var el=document.getElementById('finans-tab-'+s);if(el)el.style.display=i===0?'':'none';
    });
  }
  else if (page === 'cari') { populateCariMuvekkilSelect(); renderCari(); }
  else if (page === 'kullanicilar') { renderKullanicilar(); }
  else if (page === 'tasks') {
    populateTaskDosyaFilter();
    // Liste view zorla
    ['kanban','cal','person'].forEach(function(v){
      var el = document.getElementById('task-view-'+v);
      if(el) el.style.display='none';
      var btn = document.getElementById('task-view-'+v+'-btn');
      if(btn) btn.className='btn btn-outline';
    });
    var lv = document.getElementById('task-view-list');
    if(lv) lv.style.display='';
    var lb = document.getElementById('task-view-list-btn');
    if(lb) lb.className='btn btn-gold';
    // tab sıfırla - gecikmiş varsa gecikmiş seç, yoksa tümü
    var tl = document.getElementById('task-list');
    if(tl) {
      var allTasks = DB.get('tasks') || [];
      var todayCheck = new Date(); todayCheck.setHours(0,0,0,0);
      var hasGecikmus = allTasks.some(function(t){ return !t.done && t.tarih && _yerelTarih(t.tarih) < todayCheck; });
      tl.dataset.activeTab = hasGecikmus ? 'gecikmus' : 'tumü';
    }
    taskFilter = 'all';
    document.querySelectorAll('#page-tasks .tab').forEach(function(t){t.classList.remove('active');});
    var at = document.getElementById('task-tab-all');
    if(at) at.classList.add('active');
    renderTasks();
  }
  else if (page === 'notlar') { showSubpage('note-list'); renderNotes(); }
  else if (page === 'davadash') { populateDavaDashCesit(); renderDavaDash(); }
  else if (page === 'tebligat') { renderTebligatGecmis(); }
  else if (page === 'raporlar') { renderRaporlarPage(); }
  else if (page === 'durusmatakvim') { renderDurusmaTakvim(); }
  else if (page === 'faizHesap') {
    // initFaizPage hiçbir yerden çağrılmıyordu — kayıtlı özel oranlar geri
    // yüklenmiyor, geçmiş oran tablosu boş kalıyor, varsayılan bitiş tarihi
    // hiç dolmuyordu. Sayfa her açılışta kurulum yapsın.
    initFaizPage();
  }
  else if (page === 'ptt-takip') {
    setTimeout(function() {
      if (typeof window.pttGecmisRender === 'function') window.pttGecmisRender();
      var inp = document.getElementById('ptt-takip-no');
      if (inp) inp.focus();
    }, 80);
  }

  // Topbar "+ Yeni Ekle" butonunu sayfaya göre güncelle
  const btn = document.getElementById('topbar-add-btn');
  if (btn) {
    const btnLabels = {
      dashboard:      '+ Yeni Dava',
      davalar:        '+ Yeni Dava',
      icralar:        '+ Yeni İcra',
      kisiler:        '+ Yeni Müvekkil',
      muvekkiller:    '+ Yeni Müvekkil',
      finans:         '+ Yeni İşlem',
      cari:           '+ Cari İşlem',
      tasks:          '+ Yeni Görev',
      notlar:         '+ Yeni Not',
      durusmatakvim:  '+ Yeni Duruşma',
      davadash:       '+ Yeni Dava',
      raporlar:       null,
      tebligat:       null,
      'ptt-takip':    null,
    };
    const label = btnLabels[page];
    if (label === null) {
      btn.style.display = 'none';
    } else {
      btn.style.display = '';
      btn.textContent = label || '+ Yeni Ekle';
    }
  }

  closeSidebar();
  // Mobil bottom nav güncelle
  mbnAktiflestir(page);
  // Sekme çubuğunu güncelle
  if (typeof tabRender === 'function') tabRender();
}

// ── MOBİL BOTTOM NAV ──
function mbnAktiflestir(page) {
  const map = {
    dashboard: 'mbn-dashboard',
    davalar:   'mbn-davalar',
    icralar:   'mbn-icralar',
    kisiler:   'mbn-kisiler',
    muvekkiller:'mbn-kisiler',
    tasks:     'mbn-tasks',
  };
  document.querySelectorAll('.mbn-item').forEach(el => el.classList.remove('active'));
  const targetId = map[page];
  if (targetId) {
    const el = document.getElementById(targetId);
    if (el) el.classList.add('active');
  }
}

// Mobil task badge güncelle
function updateMbnTaskBadge() {
  const badge = document.getElementById('mbn-task-badge');
  const topBadge = document.getElementById('task-badge');
  if (!badge) return;
  const count = topBadge ? parseInt(topBadge.textContent) || 0 : 0;
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';
}

// Mobil topbar search toggle
function initMobileTopbar() {
  const isMobile = () => window.innerWidth <= 768;
  const mobileSearch = document.getElementById('topbar-search-mobile');
  const desktopSearch = document.getElementById('topbar-search');
  function updateTopbar() {
    if (isMobile()) {
      if (mobileSearch) mobileSearch.style.display = 'flex';
      if (desktopSearch) desktopSearch.style.display = 'none';
    } else {
      if (mobileSearch) mobileSearch.style.display = 'none';
      if (desktopSearch) desktopSearch.style.display = 'flex';
    }
  }
  updateTopbar();
  window.addEventListener('resize', updateTopbar);
}

const pageTitles = {kullanicilar:'Kullanıcı Yönetimi', dashboard:'Gösterge Paneli', davalar:'Dava Dosyaları', icralar:'İcra Dosyaları', muvekkiller:'Müvekkil & Kişiler', kisiler:'Müvekkil & Kişiler', finans:'Finans', tasks:'Görevler', notlar:'Notlar', davadash:'Dava Dashboardu', tebligat:'Yardımcı Siteler', raporlar:'Raporlar', durusmatakvim:'Duruşma Takvimi', faizHesap:'🧮 Faiz Hesaplama', smmHesap:'🧾 SMM Hesaplama', 'ptt-takip':'📬 PTT Tebligat Takip'};
const pageNames = {kullanicilar:'Kullanıcı', dashboard:'Gösterge', davalar:'Dava Dosyaları', icralar:'İcra', muvekkiller:'Müvekkil', kisiler:'Müvekkil', finans:'Finans', tasks:'Görev', notlar:'Not', davadash:'Dava Dashboard', tebligat:'Yardımcı', raporlar:'Raporlar', durusmatakvim:'Duruşma Takvimi', faizHesap:'🧮 Faiz Hesaplama', smmHesap:'🧾 SMM Hesaplama', 'ptt-takip':'PTT Tebligat'};

function showSubpage(id) {
  const page = id.split('-')[0];
  const pageMap = {dava:'davalar', icra:'icralar', muvekkil:'kisiler', note:'notlar', kisi:'kisiler'};
  document.querySelectorAll(`#page-${pageMap[page]||page} .subpage`).forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
  // Müvekkil listesine dönülünce açık müvekkil sekmelerini kapat
  if (id === 'muvekkil-list') {
    const mvTabs = _tabs.filter(t => t.subpage === 'muvekkil-detail');
    mvTabs.forEach(t => {
      _tabs = _tabs.filter(x => x.id !== t.id);
      if (_activeTabId === t.id) _activeTabId = null;
    });
    if (mvTabs.length) tabRender();
  }
}

function handleTopbarAdd() {
  editingId = null;
  clearForms();

  // Dava detay sayfası açıksa → o dosyaya görev ekle
  if (document.getElementById('dava-detail-page').classList.contains('open') && currentDavaId) {
    const dava = DB.get('davalar').find(x => x.id === currentDavaId);
    document.getElementById('modal-task-title').textContent = dava ? `Yeni Görev — ${dava.ad || dava.no}` : 'Yeni Görev';
    if (dava) window._taskIlgiliOnac = dava.no;
    openModal('modal-task');
    return;
  }

  // İcra detay sayfası açıksa → o icra dosyasına görev ekle
  if (document.getElementById('icra-detail-page').classList.contains('open') && currentIcraId) {
    const icra = DB.get('icralar').find(x => x.id === currentIcraId);
    document.getElementById('modal-task-title').textContent = icra ? `Yeni Görev — ${icra.bki || icra.no}` : 'Yeni Görev';
    if (icra) window._taskIlgiliOnac = icra.bki || icra.no || '';
    openModal('modal-task');
    return;
  }

  // Aktif sayfayı hem DOM'dan hem currentPage'den kontrol et
  const domPage = document.querySelector('.page.active')?.id?.replace('page-', '') || '';
  const activePage = domPage || currentPage;

  // İcra dosyaları
  if (activePage === 'icralar') {
    clearForms();
    document.getElementById('modal-icra-title').textContent = 'Yeni İcra Dosyası';
    // BKİ numarasını otomatik doldur
    const nums = DB.get('icralar').map(x=>{const m=(x.no||'').match(/BK[İI](\d+)/);return m?parseInt(m[1]):0;});
    const nextNo = 'BKİ' + String((nums.length?Math.max(...nums):0)+1).padStart(3,'0');
    const iNoEl = document.getElementById('i-no');
    if (iNoEl) iNoEl.value = nextNo;
    openModal('modal-icra');
    populateMuvekkilSelects();
    initMahkemeSelects();
    return;
  }

  // Finans
  if (activePage === 'finans') {
    clearForms();
    document.getElementById('modal-finans-title').textContent = 'Yeni Finansal İşlem';
    openModal('modal-finans');
    populateMuvekkilSelects();
    return;
  }

  // Cari hesap
  if (activePage === 'cari') {
    openCariModal();
    return;
  }

  // Kişiler / Müvekkiller
  if (activePage === 'kisiler' || activePage === 'muvekkiller') {
    const muvekilTabActive = document.getElementById('tab-muvekkiller')?.classList.contains('active');
    if (muvekilTabActive) {
      document.getElementById('modal-muvekkil-title').textContent = 'Yeni Müvekkil';
      openModal('modal-muvekkil');
    } else {
      document.getElementById('modal-kisi-title').textContent = 'Yeni Kişi';
      openModal('modal-kisi');
    }
    populateMuvekkilSelects(); updateKisilerDatalist();
    return;
  }

  // Görevler
  if (activePage === 'tasks') {
    const dosyaFilter = document.getElementById('task-dosya-filter')?.value || '';
    const dava = dosyaFilter ? DB.get('davalar').find(d => d.ad === dosyaFilter || d.no === dosyaFilter) : null;
    document.getElementById('modal-task-title').textContent = dava ? `Yeni Görev — ${dava.ad || dava.no}` : 'Yeni Görev';
    openModal('modal-task');
    populateDavaSelect(dosyaFilter);
    return;
  }

  // Duruşma takvimi
  if (activePage === 'durusmatakvim') {
    setTaskTip('durusma');
    document.getElementById('modal-task-title').textContent = 'Yeni Duruşma';
    openModal('modal-task');
    populateDavaSelect('');
    return;
  }

  // Notlar
  if (activePage === 'notlar') {
    document.getElementById('modal-note-title').textContent = 'Yeni Not';
    openModal('modal-note');
    return;
  }

  // Dava dashboardu
  if (activePage === 'davadash') {
    document.getElementById('modal-dava-title').textContent = 'Yeni Dava Dosyası';
    openModal('modal-dava');
    populateMuvekkilSelects(); updateKisilerDatalist();
    return;
  }

  // Raporlar / Yardımcı siteler — buton zaten gizli, yine de guard
  if (['raporlar','tebligat'].includes(activePage)) return;

  // Dava dosyaları + Dashboard + Fallback
  document.getElementById('modal-dava-title').textContent = 'Yeni Dava Dosyası';
  openModal('modal-dava');
  populateMuvekkilSelects(); updateKisilerDatalist();
}

// ========== DASHBOARD ==========
let dashCharts = {};

function destroyCharts() {
  Object.values(dashCharts).forEach(c => { try { c.destroy(); } catch(e){} });
  dashCharts = {};
}

function makeDonut(id, labels, data, colors, legendId) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const total = data.reduce((a,b)=>a+b,0);
  const c = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: 'transparent', borderWidth: 0, hoverOffset: 4 }] },
    options: {
      animation: { duration: 0 },
      cutout: '68%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.raw} (${total?Math.round(ctx.raw/total*100):0}%)`
          },
          backgroundColor: '#211f1b',
          borderColor: '#3d3a32',
          borderWidth: 1,
          titleColor: '#f0ead8',
          bodyColor: '#a89f8a',
        }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw(chart) {
        const { ctx, chartArea: { left, top, right, bottom } } = chart;
        const cx = (left+right)/2, cy = (top+bottom)/2;
        ctx.save();
        ctx.font = 'bold 32px DM Mono, monospace';
        ctx.fillStyle = 'var(--text)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy);
        ctx.restore();
      }
    }]
  });
  dashCharts[id] = c;
  if (legendId) {
    document.getElementById(legendId).innerHTML = labels.map((l,i) =>
      `<span style="display:flex;align-items:center;gap:5px">
        <span style="width:8px;height:8px;border-radius:50%;background:${colors[i]};flex-shrink:0;display:inline-block"></span>
        <span style="color:var(--text3);font-size:11px">${l}:</span>
        <span style="color:${colors[i]};font-size:14px;font-weight:700">${data[i]}</span>
      </span>`
    ).join('');
  }
}

function makeBar(id, labels, datasets) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const c = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      animation: { duration: 0 },
      responsive: true,
      maintainAspectRatio: false,
      hover: { mode: 'index', intersect: false },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6455', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6455', font: { size: 11 }, callback: v => '₺'+fmt(v) } }
      },
      plugins: {
        legend: { labels: { color: '#a89f8a', font: { size: 11 }, boxWidth: 10, boxHeight: 10 } },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(33,31,27,0.95)',
          borderColor: '#c9a84c',
          borderWidth: 1,
          titleColor: '#f0ead8',
          bodyColor: '#a89f8a',
          padding: 10,
          callbacks: {
            title: items => items[0]?.label || '',
            label: ctx => ` ${ctx.dataset.label}: ₺${fmt(ctx.raw)}`,
            afterBody: items => {
              const vals = items.map(i => i.raw);
              if (vals.length >= 2) {
                const net = vals[0] - vals[1];
                return [`Net: ₺${fmt(Math.abs(net))} ${net >= 0 ? '↑ Kâr' : '↓ Zarar'}`];
              }
              return [];
            }
          }
        }
      }
    }
  });
  dashCharts[id] = c;
}

function makeHBar(id, labels, data) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const c = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data, backgroundColor: 'rgba(224,185,58,0.85)', borderColor: '#e0b93a', borderWidth: 1, borderRadius: 4 }]
    },
    options: {
      animation: { duration: 0 },
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor:'#211f1b', borderColor:'#3d3a32', borderWidth:1, titleColor:'#f0ead8', bodyColor:'#a89f8a' } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b6455', font:{size:11} } },
        y: { grid: { display:false }, ticks: { color: '#a89f8a', font:{size:11} } }
      }
    }
  });
  dashCharts[id] = c;
}

function renderBugunWidget() {
  var today = new Date();
  var gun = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][today.getDay()];
  var tarih = today.getDate() + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();
  var tarihEl = document.getElementById('bugun-tarih');
  if (tarihEl) tarihEl.textContent = gun + ', ' + tarih;

  var grid = document.getElementById('bugun-grid');
  if (!grid) return;

  var todayStr = today.toISOString().slice(0,10);
  var tasks = DB.get('tasks') || [];
  var davalar = DB.get('davalar') || [];
  var icralar = DB.get('icralar') || [];

  // Bugünkü ve gecikmiş görevler
  var bugunTasks = tasks.filter(function(t) {
    if (t.done) return false;
    if (!t.tarih) return false;
    return t.tarih <= todayStr;
  }).slice(0,6);

  // Bugün duruşması olan davalar
  var bugunDavalar = davalar.filter(function(d) {
    return d.durusma && d.durusma.slice(0,10) === todayStr;
  }).slice(0,3);

  var html = '';

  if (bugunDavalar.length > 0) {
    bugunDavalar.forEach(function(d) {
      html += '<div class="bugun-item bugun-durusma" onclick="openDavaDetail(\'' + d.id + '\')" style="cursor:pointer">' +
        '<span class="bugun-icon">⚖️</span>' +
        '<span class="bugun-text"><strong>' + (d.dosyaNo||d.taraflar||'Dava') + '</strong> — Duruşma bugün</span>' +
        '</div>';
    });
  }

  if (bugunTasks.length > 0) {
    bugunTasks.forEach(function(t) {
      var gecikti = t.tarih < todayStr;
      html += '<div class="bugun-item ' + (gecikti ? 'bugun-gecikme' : 'bugun-gorev') + '">' +
        '<span class="bugun-icon">' + (gecikti ? '🔴' : '📌') + '</span>' +
        '<span class="bugun-text">' + (t.baslik||t.text||'Görev') + (gecikti ? ' <em style="color:var(--red,#e06060);font-size:10px">(Gecikti)</em>' : '') + '</span>' +
        '<button onclick="toggleTask(\'' + t.id + '\')" style="margin-left:auto;padding:2px 8px;font-size:10px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;color:var(--text3);cursor:pointer">&#10003;</button>' +
        '</div>';
    });
  }

  if (html === '') {
    html = '<div class="bugun-item" style="color:var(--text3);font-size:13px">✅ Bugün için planlanmış görev veya duruşma yok.</div>';
  }

  grid.innerHTML = html;
}

function renderDashboard() {
  destroyCharts();
  // Bugün widget — inline
  (function() {
    var today = new Date();
    var gun = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'][today.getDay()];
    var tarih = today.getDate() + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();
    var tarihEl = document.getElementById('bugun-tarih');
    if (tarihEl) tarihEl.textContent = gun + ', ' + tarih;
    var grid = document.getElementById('bugun-grid');
    if (!grid) return;
    var todayStr = today.toISOString().slice(0,10);
    var tasks = (DB.get('tasks')||[]).filter(function(t){ return !t.done && t.tarih && t.tarih <= todayStr; }).slice(0,6);
    var davalar = (DB.get('davalar')||[]).filter(function(d){ return d.durusma && d.durusma.slice(0,10)===todayStr; }).slice(0,3);
    var html = '';
    davalar.forEach(function(d){
      html += '<div class="bugun-item" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border-radius:8px;margin-bottom:6px;border-left:3px solid var(--gold)">' +
        '<span>⚖️</span><span style="font-size:13px"><strong>'+(d.dosyaNo||d.taraflar||'Dava')+'</strong> — Duruşma bugün</span></div>';
    });
    tasks.forEach(function(t){
      var gecikti = t.tarih < todayStr;
      html += '<div class="bugun-item" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border-radius:8px;margin-bottom:6px;border-left:3px solid '+(gecikti?'#e06060':'var(--gold)') + '">' +
        '<span>'+(gecikti?'🔴':'📌')+'</span><span style="font-size:13px">'+(t.baslik||'Görev')+(gecikti?' <em style="color:#e06060;font-size:10px">(Gecikti)</em>':'')+'</span></div>';
    });
    if (!html) html = '<div style="color:var(--text3);font-size:13px;padding:8px">✅ Bugün için planlanmış görev veya duruşma yok.</div>';
    grid.innerHTML = html;
  })();

  const davalar = DB.get('davalar');
  const icralar = DB.get('icralar');
  const muvekkiller = DB.get('muvekkiller');
  const tasks = DB.get('tasks');
  const finans = DB.get('finans');

  const GELIR_TURLER_DASH = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
  const MASRAF_TURLER_DASH = ['Masraf','Masraf (Ofis Avansı)','Dava Masrafı','Harç'];
  const buAy = new Date().getMonth();
  const buYil = new Date().getFullYear();
  const ayFiltre = function(f){ return new Date(f.tarih).getMonth()===buAy && new Date(f.tarih).getFullYear()===buYil; };
  const tahsilat = finans.filter(f=>GELIR_TURLER_DASH.includes(f.tur)&&ayFiltre(f)).reduce((a,b)=>a+Number(b.tutar),0);
  const masraf = finans.filter(f=>MASRAF_TURLER_DASH.includes(f.tur)&&ayFiltre(f)).reduce((a,b)=>a+Number(b.tutar),0);
  const masrafOdemesi = finans.filter(f=>f.tur==='Masraf Ödemesi'&&ayFiltre(f)).reduce((a,b)=>a+Number(b.tutar),0);
  const netBakiyeDash = tahsilat - masraf + masrafOdemesi;
  // Duruşmalar görev sayısına dahil edilmez
  const bekleyen = tasks.filter(t=>!t.done && t.tip !== 'durusma').length;
  const icraToplamAlacak = icralar.filter(i=>i.durum==='Aktif').reduce((a,b)=>a+Number(b.alacak),0);

  document.getElementById('task-badge').textContent = bekleyen;
  if(typeof updateMbnTaskBadge==='function') updateMbnTaskBadge();

  // KPI CARDS
  document.getElementById('stat-grid').innerHTML = `
    <div class="stat-card" style="cursor:pointer" onclick="showPage('davalar')">
      <div class="stat-label">Aktif Dava</div>
      <div class="stat-value">${davalar.filter(d=>d.durum==='Aktif').length}</div>
      <div class="stat-sub">Toplam: ${davalar.length} · Kapalı: ${davalar.filter(d=>d.durum==='Kapalı').length}</div>
    </div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('icralar')">
      <div class="stat-label">Aktif İcra</div>
      <div class="stat-value">${icralar.filter(i=>i.durum==='Aktif').length}</div>
      <div class="stat-sub">Toplam alacak: ₺${fmt(icraToplamAlacak)}</div>
    </div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('kisiler')">
      <div class="stat-label">Müvekkil</div>
      <div class="stat-value">${muvekkiller.length}</div>
      <div class="stat-sub">Aktif dosya: ${davalar.filter(d=>d.durum==='Aktif').length + icralar.filter(i=>i.durum==='Aktif').length}</div>
    </div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('tasks')">
      <div class="stat-label">Bekleyen Görev</div>
      <div class="stat-value" style="${bekleyen>0?'color:var(--red)':''}">${bekleyen}</div>
      <div class="stat-sub">Tamamlanan: ${tasks.filter(t=>t.done).length}</div>
    </div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('finans')">
      <div class="stat-label">Aylık Tahsilat</div>
      <div class="stat-value" style="font-size:20px;color:var(--green)">₺${fmt(tahsilat)}</div>
      <div class="stat-sub">Masraf: ₺${fmt(masraf)}</div>
    </div>
    <div class="stat-card" style="cursor:pointer" onclick="showPage('finans')">
      <div class="stat-label">Aylık Net Bakiye</div>
      <div class="stat-value" style="font-size:20px;color:var(--gold)">₺${fmt(netBakiyeDash)}</div>
      <div class="stat-sub">&nbsp;</div>
    </div>
  `;

  // --- DONUT: Dava Durumları ---
  setTimeout(() => {
    const dDurum = ['Aktif','Bekliyor','Kapalı'].map(s=>davalar.filter(d=>d.durum===s).length);
    makeDonut('chart-dava-durum', ['Aktif','Bekliyor','Kapalı'], dDurum,
      ['#22a35a','#e0b93a','#8a8172'], 'chart-dava-legend');

    // --- DONUT: İcra Durumları ---
    const iDurum = ['Aktif','Bekliyor','Kapalı'].map(s=>icralar.filter(i=>i.durum===s).length);
    makeDonut('chart-icra-durum', ['Aktif','Bekliyor','Kapalı'], iDurum,
      ['#2f7dc4','#e0b93a','#8a8172'], 'chart-icra-legend');

    // --- DONUT: Görev Öncelikleri ---
    const tPri = ['Acil','Yüksek','Normal'].map(p=>tasks.filter(t=>!t.done&&t.oncelik===p).length);
    makeDonut('chart-task-oncelik', ['Acil','Yüksek','Normal'], tPri,
      ['#e0472b','#e0b93a','#22a35a'], 'chart-task-legend');

    // --- BAR: Aylık finans (son 6 ay) ---
    const months = [];
    const tahArr = [], masArr = [];
    for (let m=5; m>=0; m--) {
      const d = new Date(); d.setMonth(d.getMonth()-m);
      const y = d.getFullYear(), mo = d.getMonth();
      const label = d.toLocaleString('tr-TR',{month:'short',year:'2-digit'});
      months.push(label);
      const GELIR_TURLER = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
      const MASRAF_TURLER = ['Masraf','Masraf (Ofis Avansı)','Dava Masrafı','Harç'];
      var tVal = finans.filter(f=>GELIR_TURLER.includes(f.tur)&&new Date(f.tarih).getMonth()===mo&&new Date(f.tarih).getFullYear()===y).reduce((a,b)=>a+Number(b.tutar),0);
      var mVal = finans.filter(f=>MASRAF_TURLER.includes(f.tur)&&new Date(f.tarih).getMonth()===mo&&new Date(f.tarih).getFullYear()===y).reduce((a,b)=>a+Number(b.tutar),0);
      tahArr.push(tVal);
      masArr.push(mVal);
    }
    makeBar('chart-finans-aylik', months, [
      { label:'Tahsilat', data:tahArr, backgroundColor:'rgba(34,163,90,0.85)', borderColor:'#22a35a', borderWidth:1, borderRadius:4 },
      { label:'Masraf',   data:masArr, backgroundColor:'rgba(224,71,43,0.85)', borderColor:'#e0472b', borderWidth:1, borderRadius:4 }
    ]);

    // --- HBAR: Müvekkil başına dava sayısı (top 6) ---
    const mvDava = muvekkiller.map(m=>({
      ad: m.ad.split(' ')[0] + (m.ad.split(' ')[1]?' '+m.ad.split(' ')[1][0]+'.':''),
      count: davalar.filter(d=>d.muvekkil===m.ad).length + icralar.filter(i=>i.muvekkil===m.ad).length
    })).filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,6);
    if (mvDava.length) makeHBar('chart-muvekkil-dava', mvDava.map(x=>x.ad), mvDava.map(x=>x.count));
    else {
      const el = document.getElementById('chart-muvekkil-dava');
      if (el) el.parentElement.innerHTML = '<div class="empty" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center"><div class="empty-icon">👤</div><div class="empty-text">Veri yok</div></div>';
    }
  }, 50);

  // YAKLAŞAN GÖREVLER
  const urgentTasks = tasks.filter(t=>!t.done).sort((a,b)=>new Date(a.tarih)-new Date(b.tarih)).slice(0,5);
  document.getElementById('urgent-count').textContent = `${urgentTasks.length} görev bekliyor`;
  document.getElementById('upcoming-tasks').innerHTML = urgentTasks.length ? urgentTasks.map(t=>`
    <div class="task-item" style="cursor:pointer" onclick="showPage('tasks')" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
      <div class="task-check ${t.done?'done':''}" onclick="event.stopPropagation();toggleTask('${t.id}', renderDashboard)"></div>
      <div class="task-content">
        <div class="task-title">${t.baslik}</div>
        <div class="task-meta">
          <span ${isUrgent(t.tarih)?'class="task-urgent"':''}>📅 ${fmtDate(t.tarih)}</span>
          ${t.ilgili ? `<span>📁 ${t.ilgili}</span>` : ''}
          <span class="tag tag-${t.oncelik==='Acil'?'icra':t.oncelik==='Yüksek'?'dava':'bekliyor'}">${t.oncelik}</span>
        </div>
      </div>
    </div>
  `).join('') : '<div class="empty"><div class="empty-icon">✅</div><div class="empty-text">Bekleyen görev yok</div></div>';

  // SON AKTİVİTELER
  const all = [
    ...davalar.slice(-3).map(d=>({text:`📁 Dava: ${d.konu} (${d.no})`, tarih:d.tarih, page:'davalar'})),
    ...icralar.slice(-2).map(i=>({text:`⚡ İcra: ${i.borclu} — ₺${fmt(i.alacak)}`, tarih:i.tarih, page:'icralar'})),
    ...finans.slice(-2).map(f=>({text:`💰 ${f.tur}: ₺${fmt(f.tutar)} — ${f.aciklama}`, tarih:f.created, page:'finans'})),
  ].sort((a,b)=>new Date(b.tarih)-new Date(a.tarih)).slice(0,6);

  document.getElementById('recent-activity').innerHTML = all.length ? all.map(a=>`
    <div class="timeline-item" style="cursor:pointer" onclick="showPage('${a.page||'dashboard'}')" onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
      <div class="timeline-date">${fmtDate(a.tarih)}</div>
      <div class="timeline-text">${a.text}</div>
    </div>
  `).join('') : '<div style="color:var(--text3);font-size:13px">Henüz aktivite yok</div>';

  // YAKLAŞAN DURUŞMALAR (1 hafta) — dava sonraki tarihleri + tip='durusma' görevler
  const today = new Date(); today.setHours(0,0,0,0);
  const inWeek = new Date(today); inWeek.setDate(inWeek.getDate() + 7);

  // Dava kaynaklı duruşmalar
  const upcomingDava = davalar
    .filter(d => d.sonraki && new Date(d.sonraki) >= today && new Date(d.sonraki) <= inWeek && d.durum !== 'Kapalı')
    .map(d => ({ tarih: d.sonraki, konu: d.konu, alt: `${d.no} · ${d.mahkeme||'—'} · ${d.muvekkil}`, id: d.id, kaynak: 'dava' }));

  // Görev kaynaklı duruşmalar
  const upcomingTask = tasks
    .filter(t => t.tip === 'durusma' && !t.done && t.tarih && new Date(t.tarih) >= today && new Date(t.tarih) <= inWeek)
    .map(t => ({ tarih: t.tarih, konu: t.baslik, alt: `${t.mahkeme||''} ${t.ilgili ? '· '+t.ilgili : ''}`.trim(), id: t.id, kaynak: 'task' }));

  const upcoming = [...upcomingDava, ...upcomingTask].sort((a,b) => new Date(a.tarih) - new Date(b.tarih));

  document.getElementById('upcoming-durusmalar').innerHTML = upcoming.length ? upcoming.map(item => {
    const dt = new Date(item.tarih);
    const diffDays = Math.ceil((dt - today) / 86400000);
    const urgent = diffDays === 0;
    return `
    <div class="durusma-row">
      <div class="durusma-date-box ${urgent?'durusma-urgent':''}">
        <div class="durusma-date-day">${dt.getDate()}</div>
        <div class="durusma-date-month">${dt.toLocaleString('tr-TR',{month:'short'})}</div>
      </div>
      <div class="durusma-info">
        <div class="durusma-konu">${item.konu}</div>
        <div class="durusma-meta" style="color:var(--text3);font-size:11px">${item.alt||'—'}</div>
      </div>
      <div style="flex-shrink:0;display:flex;align-items:center;gap:8px">
        <div style="font-size:12px;${diffDays<=1?'color:var(--red);font-weight:600':'color:var(--text3)'}">
          ${diffDays === 0 ? '🔴 Bugün!' : diffDays === 1 ? '🟠 Yarın' : `${diffDays} gün`}
        </div>
        ${item.kaynak === 'dava'
          ? `<button onclick="openGcalDurusma('${item.id}')" title="Google Takvime Ekle"
              style="background:rgba(58,107,140,0.2);border:1px solid var(--blue);color:#7ab5d4;font-size:11px;padding:4px 8px;border-radius:6px;cursor:pointer;white-space:nowrap">
              📅 Takvime Ekle
            </button>`
          : `<span style="background:rgba(58,107,140,0.15);border:1px solid rgba(58,107,140,0.4);color:#7ab5d4;font-size:10px;padding:3px 8px;border-radius:6px">⚖️ Manuel</span>`
        }
      </div>
    </div>`;
  }).join('') : '<div class="empty"><div class="empty-icon">⚖</div><div class="empty-text">Bu hafta duruşma yok</div></div>';
}

// ========== DAVALAR ==========
var _davaSirala = { alan: 'no', yon: 'asc' };
function davaSirala(alan) {
  if (_davaSirala.alan === alan) _davaSirala.yon = _davaSirala.yon === 'asc' ? 'desc' : 'asc';
  else { _davaSirala.alan = alan; _davaSirala.yon = 'asc'; }
  renderDavalar();
}

function renderDavalar() {
  let davalar = DB.get('davalar').slice();
  populateMuvekkilSelects();

  const alan = _davaSirala.alan, yon = _davaSirala.yon;
  davalar.sort(function(a, b) {
    var av, bv;
    if (alan === 'ad') {
      var ta = _davaTarafPair(a), tb = _davaTarafPair(b);
      av = (ta.davaci || a.ad || a.no || ''); bv = (tb.davaci || b.ad || b.no || '');
    } else if (alan === 'konu') { av = a.konu || ''; bv = b.konu || ''; }
    else if (alan === 'mahkeme') { av = a.mahkeme || ''; bv = b.mahkeme || ''; }
    else if (alan === 'esas') { av = a.esas || ''; bv = b.esas || ''; }
    else if (alan === 'durum') { av = a.durum || ''; bv = b.durum || ''; }
    else { av = a.no || ''; bv = b.no || ''; }
    var cmp = String(av).localeCompare(String(bv), 'tr', {numeric:true});
    return yon === 'asc' ? cmp : -cmp;
  });

  ['no','ad','konu','mahkeme','esas','durum'].forEach(function(a) {
    var el = document.getElementById('dava-sort-'+a);
    if (el) el.textContent = (_davaSirala.alan === a) ? (_davaSirala.yon === 'asc' ? '▲' : '▼') : '';
  });

  document.getElementById('dava-tbody').innerHTML = davalar.length ? davalar.map(d=>{
    const tp = _davaTarafPair(d);
    const dosyaAdi = (tp.davaci || tp.davali) ? (tp.davaci||'—') + ' vs ' + (tp.davali||'—') : (d.ad || '—');
    return `
    <tr oncontextmenu="itemContextMenu(event,'dava','${d.id}','${escHtml(d.ad||d.no)}')" style="cursor:pointer" onclick="openDavaDetailPage('${d.id}')">
      <td data-label="Dosya No"><span class="mono text-gold" style="cursor:pointer">${escHtml(d.no)}</span></td>
      <td data-label="Dosya Adı">${escHtml(dosyaAdi)}</td>
      <td data-label="Konu">${escHtml(d.konu)}${d.cesit ? `<div style="font-size:11px;color:var(--gold);margin-top:2px">${escHtml(d.cesit)}</div>` : ''}</td>
      <td data-label="Mahkeme">${escHtml(d.mahkeme||'—')}</td>
      <td data-label="Esas No"><span class="mono">${escHtml(d.esas||'—')}</span></td>
      <td data-label="Durum"><span class="tag tag-${d.durum==='Aktif'?'aktif':d.durum==='Bekliyor'?'bekliyor':'kapali'}">${d.durum}</span></td>
      <td onclick="event.stopPropagation()">
        <button class="btn btn-ghost" onclick="editDava('${d.id}')">✏</button>
        <button class="btn btn-ghost" style="color:var(--red)" onclick="deleteDava('${d.id}')">🗑</button>
      </td>
    </tr>
  `;}).join('') : `<tr><td colspan="7"><div class="empty"><div class="empty-icon">📁</div><div class="empty-text">Henüz dava dosyası yok</div></div></td></tr>`;
}

// ========== DAVA DETAY TAM SAYFA ==========
let currentDavaId = null;
let replyToPostId = null;

function openDavaDetailPage(id) {
  currentDavaId = id;
  replyToPostId = null;
  const d = DB.get('davalar').find(x => x.id === id);
  document.getElementById('dava-detail-page').classList.add('open');
  // Topbar güncelle
  document.getElementById('ddp-topbar-context').style.display = 'flex';
  document.getElementById('ddp-topbar-file').textContent = d ? (d.ad || d.no) : '';
  document.getElementById('topbar-add-btn').textContent = '+ Görev Ekle';
  document.getElementById('page-title').style.display = 'none';
  // Sekmeyi her zaman genel'e sıfırla
  document.querySelectorAll('.ddp-sekme').forEach(function(b){ b.classList.remove('aktif'); });
  var genelBtn = document.querySelector('.ddp-sekme[data-sekme="genel"]');
  if (genelBtn) genelBtn.classList.add('aktif');
  // Mobilde açık kalmış olabilecek chatter panelini kapat
  mobilChatterKapat('dava');
  renderDavaDetailPage(id);
}

function closeDavaDetailPage() {
  document.getElementById('dava-detail-page').classList.remove('open');
  document.getElementById('ddp-topbar-context').style.display = 'none';
  document.getElementById('topbar-add-btn').textContent = '+ Yeni Ekle';
  document.getElementById('page-title').style.display = '';
  // Açık olan dava sekmesini kapat
  var davaTabId = currentDavaId;
  currentDavaId = null;
  replyToPostId = null;
  if (davaTabId) {
    var tab = _tabs.find(function(t){ return t.itemId === davaTabId && t.subpage === 'dava-detail'; });
    if (tab) {
      _tabs = _tabs.filter(function(t){ return t.id !== tab.id; });
      if (_activeTabId === tab.id) _activeTabId = _tabs.length ? _tabs[_tabs.length-1].id : null;
      tabRender();
    }
  }
  // Dava listesinden değil başka sayfadan açıldıysa o sayfaya dön
  if (currentPage !== 'davalar') {
    document.getElementById('page-title').textContent = pageTitles[currentPage] || '';
  }
}

// Sabit resmi tatiller (ay 0-indexed) — UETS 5 iş günü / son başvuru
// hesaplamasında kullanılır (bkz. _uets5IsGunu, _uetsSonBasvuruTarihi)
const _RESMI_TATILLER_SABIT = [
  { ay: 0, gun: 1,  ad: 'Yılbaşı' },
  { ay: 3, gun: 23, ad: '23 Nisan' },
  { ay: 4, gun: 1,  ad: 'İşçi Bayramı' },
  { ay: 4, gun: 19, ad: '19 Mayıs' },
  { ay: 6, gun: 15, ad: '15 Temmuz' },
  { ay: 7, gun: 30, ad: '30 Ağustos' },
  { ay: 9, gun: 29, ad: 'Cumhuriyet Bayramı' },
];

function ddpSekme(sekme, btn) {
  document.querySelectorAll('.ddp-sekme').forEach(function(b){b.classList.remove('aktif');});
  if(btn) btn.classList.add('aktif');
  // T3: Tab transition animation
  var infoEl = document.getElementById('ddp-info');
  if(infoEl) { infoEl.classList.add('ddp-tab-enter'); setTimeout(function(){ infoEl.classList.remove('ddp-tab-enter'); },20); }
  if(currentDavaId) renderDavaTab(currentDavaId, sekme);
}

// T2: Update tab badges
function _ddpUpdateBadges(d, id) {
  var durusmalar = (DB.get('tasks')||[]).filter(function(t){return t.ilgili&&(t.ilgili===d.no||t.ilgili===d.id)&&t.tip==='durusma';});
  var belgeler = (DB.get('belgeler')||[]).filter(function(b){return b.davaId===id;});
  var tasks = DB.get('tasks').filter(function(t){return t.ilgili&&(t.ilgili===d.no||t.ilgili===d.id)&&t.tip!=='durusma';});
  var masrafBadge = document.getElementById('ddp-badge-masraf');
  if (masrafBadge) { var mc = (DB.get('dava_masraflar')||[]).filter(function(m){return m.davaId===id;}).length; masrafBadge.textContent = mc||''; }
  var today2 = new Date(); today2.setHours(0,0,0,0);
  var gecikmisCnt = tasks.filter(function(t){return !t.done&&t.tarih&&Math.ceil((_yerelTarih(t.tarih)-today2)/86400000)<0;}).length;

  var bDur = document.getElementById('ddp-badge-durusma');
  if(bDur) bDur.textContent = durusmalar.length||'';
  var bBel = document.getElementById('ddp-badge-belge');
  if(bBel) bBel.textContent = belgeler.length||'';
  var bGor = document.getElementById('ddp-badge-gorev-wrap');
  if(bGor) {
    if(gecikmisCnt>0) bGor.innerHTML='<span class="ddp-sekme-dot" title="'+gecikmisCnt+' gecikmiş görev"></span>';
    else if(tasks.length) bGor.innerHTML='<span class="ddp-sekme-badge normal">'+tasks.length+'</span>';
    else bGor.innerHTML='';
  }
}

function renderDavaDetailPage(id) {
  const d = DB.get('davalar').find(x => x.id === id);
  if (!d) return;

  // T1: Breadcrumb
  const titleEl = document.getElementById('ddp-title');
  titleEl.textContent = d.no + (d.muvekkil ? ' — ' + d.muvekkil : '');

  document.getElementById('ddp-edit-btn').onclick = () => { editDava(id); };
  document.getElementById('ddp-delete-btn').onclick = () => {
    showConfirmModal('Bu dava dosyasını silmek istediğinizden emin misiniz?', function(){ closeDavaDetailPage(); deleteDava(id); });
  };

  // T2: Badges
  _ddpUpdateBadges(d, id);

  const aktifSekme = document.querySelector('.ddp-sekme.aktif');
  const sekme = aktifSekme ? aktifSekme.dataset.sekme : 'genel';
  renderDavaTab(id, sekme);
  renderChatter(id);
}

// G1: File age helper
function _ddpFileAge(d) {
  if(!d.tarih && !d.olusturma) return '';
  var created = new Date(d.tarih || d.olusturma || Date.now());
  var now = new Date();
  var days = Math.floor((now - created) / 86400000);
  if(days < 1) return 'Bugün açıldı';
  if(days < 30) return days + ' gün';
  if(days < 365) return Math.floor(days/30) + ' ay ' + (days%30) + ' gün';
  return Math.floor(days/365) + ' yıl ' + Math.floor((days%365)/30) + ' ay';
}

// D4: ICS export helper
function _ddpExportICS(baslik, tarih, mahkeme) {
  var d = new Date(tarih);
  var pad = function(n){return String(n).padStart(2,'0');};
  var dtStr = d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T090000';
  var dtEnd = d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T100000';
  var ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:'+dtStr+'\nDTEND:'+dtEnd+'\nSUMMARY:'+baslik+'\nLOCATION:'+(mahkeme||'')+'\nEND:VEVENT\nEND:VCALENDAR';
  var blob = new Blob([ics],{type:'text/calendar'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'durusma-'+tarih+'.ics';
  a.click();
  URL.revokeObjectURL(a.href);
}

// Ö6: Quick task add
function _ddpQuickAddTask(davaNo) {
  var input = document.getElementById('ddp-quick-task-input');
  if(!input) return;
  var baslik = input.value.trim();
  if(!baslik) return;
  var obj = { id:DB.genId(), baslik:baslik, ilgili:davaNo, oncelik:'Normal', done:false, tarih:'', tip:'gorev', aciklama:'', subtasks:[] };
  var arr = DB.get('tasks');
  arr.push(obj);
  DB.set('tasks', arr);
  input.value = '';
  renderDavaTab(currentDavaId, 'gorev');
  _ddpUpdateBadges(DB.get('davalar').find(function(x){return x.id===currentDavaId;}), currentDavaId);
  notify('Görev eklendi ✓');
}

// Ö2: Subtask toggle
// G2: Quick status change
function _ddpChangeStatus(davaId, newStatus) {
  var arr = DB.get('davalar');
  // Yerinde mutasyon YOK — yeni obje üret (cache/senkron referans güvenliği)
  arr = arr.map(function(d){ return d.id===davaId ? Object.assign({}, d, {durum:newStatus}) : d; });
  DB.set('davalar', arr);
  _sbTekKayitYaz('davalar', arr.find(function(d){ return d.id===davaId; }));
  renderDavaDetailPage(davaId);
  notify('Durum güncellendi: '+newStatus);
}

// Status cycle: click to toggle Aktif → Bekliyor → Kapalı → Aktif
function _ddpCycleStatus(davaId) {
  var d = DB.get('davalar').find(function(x){return x.id===davaId;});
  if(!d) return;
  var cycle = ['Aktif','Bekliyor','Kapalı'];
  var idx = cycle.indexOf(d.durum||'Aktif');
  var next = cycle[(idx+1) % cycle.length];
  _ddpChangeStatus(davaId, next);
}

// B2: Edit belge
function editBelge(belgeId, davaId) {
  var belgeler = DB.get('belgeler')||[];
  var b = belgeler.find(function(x){return x.id===belgeId;});
  if(!b) return;
  document.getElementById('modal-belge-title').textContent = '📎 Belge Düzenle';
  document.getElementById('belge-ad').value = b.ad||'';
  document.getElementById('belge-tur').value = b.tur||'Dilekçe';
  document.getElementById('belge-tarih').value = b.tarih||'';
  document.getElementById('belge-url').value = b.url||'';
  document.getElementById('belge-taraf').value = b.taraf||'Biz';
  document.getElementById('belge-aciklama').value = b.aciklama||'';
  document.getElementById('belge-edit-id').value = belgeId;
  currentBelgeDavaId = davaId;
  openModal('modal-belge');
}

// B5: File upload handlers
var _belgeSelectedFile = null;
function onBelgeFileSelect(input) {
  if(input.files&&input.files[0]) {
    _belgeSelectedFile = input.files[0];
    var nameEl = document.getElementById('belge-file-name');
    nameEl.textContent = '📎 '+_belgeSelectedFile.name+' ('+chFmtBoyut(_belgeSelectedFile.size)+')';
    nameEl.style.display = '';
    if(!document.getElementById('belge-ad').value.trim()) document.getElementById('belge-ad').value = _belgeSelectedFile.name.replace(/\.[^.]+$/,'');
  }
}
function handleBelgeFileDrop(e) {
  if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0]) {
    _belgeSelectedFile = e.dataTransfer.files[0];
    var nameEl = document.getElementById('belge-file-name');
    nameEl.textContent = '📎 '+_belgeSelectedFile.name+' ('+chFmtBoyut(_belgeSelectedFile.size)+')';
    nameEl.style.display = '';
    if(!document.getElementById('belge-ad').value.trim()) document.getElementById('belge-ad').value = _belgeSelectedFile.name.replace(/\.[^.]+$/,'');
  }
}

// F4: Toggle masraf paid status
function _ddpToggleMasrafOdendi(fId) {
  var arr = DB.get('finans');
  arr = arr.map(function(f){ if(f.id===fId) f.odpisr = !f.odpisr; return f; });
  DB.set('finans', arr);
  renderDavaTab(currentDavaId, 'finans');
}

// F3: Edit/Delete finans from detail
function _ddpEditFinans(fId) {
  editFinans(fId);
}
// Dava detay sayfasından finans modalı aç — dosya bilgilerini ön doldur
function _ddpOpenFinansModal(davaId, davaNo, muvekkil) {
  openModal('modal-finans');
  // Müvekkil alanını doldur
  setTimeout(function(){
    var mvSel = document.getElementById('f-muvekkil');
    if(mvSel && muvekkil) mvSel.value = muvekkil;
    // İlgili dosya alanını doldur
    var ilgiliInput = document.getElementById('f-ilgili');
    if(ilgiliInput) ilgiliInput.value = davaNo;
    var ilgiliId = document.getElementById('f-ilgili-id');
    if(ilgiliId) ilgiliId.value = davaId;
    var ilgiliTip = document.getElementById('f-ilgili-tip');
    if(ilgiliTip) ilgiliTip.value = 'dava';
  }, 100);
}

function _ddpSaveFinansalNot(davaId) {
  var not = (document.getElementById('ddp-finansal-not')||{}).value || '';
  var arr = DB.get('davalar');
  arr = arr.map(function(d){ return d.id===davaId ? Object.assign({}, d, {finansalNot: not}) : d; });
  DB.set('davalar', arr);
  _sbTekKayitYaz('davalar', arr.find(function(d){ return d.id===davaId; }));
  notify('Finansal not kaydedildi');
}

function _ddpDeleteFinans(fId) {
  // Silinecek kaydı önceden sakla (müvekkil/icra yenilemesi için)
  var silinenF = (DB.get('finans')||[]).find(function(f){ return f.id === fId; });
  showConfirmModal('Bu finansal işlemi silmek istediğinizden emin misiniz?', function() {
    DB.set('finans', DB.get('finans').filter(function(f){ return f.id !== fId; }));
    // odeme_planlari taksit senkronizasyonu
    if (silinenF && silinenF.tur === 'Taksit Tahsilatı') {
      var planlar = DB.get('odeme_planlari') || [];
      var planGuncellendi = false;
      planlar = planlar.map(function(plan) {
        var degisti = false;
        var yeniTaksitler = (plan.taksitler || []).map(function(t) {
          if (t.finansId === fId) {
            degisti = true; planGuncellendi = true;
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
    // Dava detay sayfasını yenile
    if (currentDavaId) renderDavaTab(currentDavaId, 'finans');
    // Finans ana listesi açıksa yenile
    if (typeof renderFinans === 'function') renderFinans();
    if (typeof renderKarsiVekalet === 'function') renderKarsiVekalet();
    if (typeof renderOdemePlanlari === 'function') renderOdemePlanlari();
    if (typeof renderAvansKasa === 'function') renderAvansKasa();
    if (typeof renderOfisGider === 'function') renderOfisGider();
    // Dashboard yenile
    if (typeof renderDashboard === 'function' && document.getElementById('page-dashboard') &&
        document.getElementById('page-dashboard').style.display !== 'none') {
      renderDashboard();
    }
    // Müvekkil detay açıksa yenile
    if (silinenF && silinenF.muvekkil) {
      var mvDetail = document.getElementById('muvekkil-detail');
      if (mvDetail && mvDetail.classList.contains('active')) {
        var mv = (DB.get('muvekkiller')||[]).find(function(m){ return m.ad === silinenF.muvekkil; });
        if (mv) showMuvekkilDetail(mv.id);
      }
    }
    notify('İşlem silindi');
  });
}

// Belge silme — dava detay sayfasından
function deleteBelge(belgeId, davaId) {
  showConfirmModal('Bu belgeyi silmek istediğinizden emin misiniz?', function() {
    var belgeler = DB.get('belgeler') || [];
    var belge = belgeler.find(function(b){ return b.id === belgeId; });
    if (belge && belge.yol && window._supabaseToken) {
      fetch(SUPABASE_URL + '/storage/v1/object/chatter-files/' + belge.yol, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + window._supabaseToken, 'apikey': SUPABASE_ANON_KEY }
      }).catch(function(e){ console.warn('Dosya silinemedi:', e); });
    }
    DB.set('belgeler', belgeler.filter(function(b){ return b.id !== belgeId; }));
    if (currentDavaId) {
      renderDavaTab(currentDavaId, 'belge');
      _ddpUpdateBadges(DB.get('davalar').find(function(x){return x.id===currentDavaId;}), currentDavaId);
    }
    notify('Belge silindi');
  });
}

// Görev silme — dava detay sayfasından
function _ddpDeleteTask(taskId, davaId) {
  showConfirmModal('Bu görevi silmek istediğinizden emin misiniz?', function() {
    DB.set('tasks', DB.get('tasks').filter(function(t){ return t.id !== taskId; }));
    if (currentDavaId) {
      renderDavaTab(currentDavaId, 'gorev');
      _ddpUpdateBadges(DB.get('davalar').find(function(x){return x.id===currentDavaId;}), currentDavaId);
    }
    if (typeof renderTasks === 'function') renderTasks();
    if (typeof isCalendarVisible === 'function' && isCalendarVisible()) renderCalendar();
    notify('Görev silindi');
  });
}

// F5: Export finans to CSV
function _ddpExportFinansCSV(davaId) {
  var d = DB.get('davalar').find(function(x){return x.id===davaId;});
  if(!d) return;
  var GELIR_T = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
  var finans = DB.get('finans').filter(function(f){return f.davaId===davaId||f.ilgili===d.no;});
  var rows = [['Tarih','Tür','Tutar','Yön','Açıklama']];
  finans.forEach(function(f){
    rows.push([f.tarih||'',f.tur||'',f.tutar||0,GELIR_T.includes(f.tur)?'Gelir':'Gider',f.aciklama||'']);
  });
  var csv = rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'finans-'+d.no+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  notify('CSV indirildi ✓');
}

// D5: Duruşma filter state
var _ddpDurusmaFilter = 'all'; // 'all','upcoming','past'

function renderDavaTab(id, sekme) {
  const d = DB.get('davalar').find(x => x.id === id);
  if (!d) return;
  const el = document.getElementById('ddp-info');
  if (!el) return;

  // Tarih alanları hâlâ satır-içi (inline) düzenleniyor (takvim input'u gerekiyor);
  // düz metin alanları sonDurum/sonrakiAdim ile aynı modal deseniyle düzenleniyor.
  const ei = (field, label, value, type='text') => type==='date' ? `
    <div class="info-item" id="ei-${field}" style="cursor:pointer" onclick="startInlineEdit('${id}','${field}','${type}')">
      <label>${label}</label>
      <span class="ei-val">${value||'—'}</span>
      <button class="info-edit-btn" onclick="event.stopPropagation();startInlineEdit('${id}','${field}','${type}')">✏</button>
    </div>` : `
    <div class="info-item" id="ei-${field}" style="cursor:pointer" onclick="editDavaNotKartInline('${id}','${field}')">
      <label>${label}</label>
      <span class="ei-val">${value||'—'}</span>
      <button class="info-edit-btn" onclick="event.stopPropagation();editDavaNotKartInline('${id}','${field}')">✏</button>
    </div>`;

  const GELIR_T = ['Tahsilat','Vekalet Ücreti Tahsilatı','İcra Vekalet Ücreti','Taksit Tahsilatı','Karşı Vekalet Tahsilatı'];
  const MASRAF_T = ['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç','Ofis Kirası','Personel Maaşı','Baro Aidatı','Vergi / SGK','Ofis Gideri'];
  // Fix 4: Filter finans strictly by this case only (davaId or ilgili matching case no)
  const finans = DB.get('finans').filter(f => f.davaId === id || f.ilgili === d.no);
  const tahsilat = finans.filter(f=>GELIR_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const masraf   = finans.filter(f=>MASRAF_T.includes(f.tur)).reduce((a,b)=>a+Number(b.tutar),0);
  const masrafOd = finans.filter(f=>f.tur==='Masraf Ödemesi').reduce((a,b)=>a+Number(b.tutar),0);
  // Fix 5: Exclude duruşmalar from tasks (they have their own tab)
  const tasks  = DB.get('tasks').filter(t => t.ilgili && (t.ilgili === d.no || t.ilgili === id) && t.tip !== 'durusma');
  const belgeler = (DB.get('belgeler')||[]).filter(b => b.davaId === id);

  if (sekme === 'genel') {
    // T4: Type-based icon color
    var turLower = (d.tur||'').toLowerCase();
    var iconClass = turLower.includes('ceza')?'ceza':turLower.includes('idare')||turLower.includes('idari')?'idare':turLower.includes('icra')?'icra':'hukuk';
    var iconEmoji = iconClass==='ceza'?'⚔️':iconClass==='idare'?'🏛️':iconClass==='icra'?'📋':'⚖️';
    // G1: File age
    var ageStr = _ddpFileAge(d);
    // G4: Müvekkil link
    var muvekkilLink = '';
    if(d.muvekkil) {
      var mvk = (DB.get('muvekkiller')||[]).find(function(m){return m.ad===d.muvekkil;});
      muvekkilLink = mvk ? '<a href="#" onclick="showMuvekkilDetail(\''+mvk.id+'\');event.preventDefault()" style="color:var(--text);text-decoration:none;border-bottom:1px dashed var(--text3)">'+escHtml(d.muvekkil)+'</a>' : escHtml(d.muvekkil||'—');
    } else { muvekkilLink = '—'; }
    // Davacı/Davalı sırası — müvekkilimiz olan taraf tıklanabilir link olarak kalır
    var _tp = _davaTarafPair(d);
    var davaciDisplay = (d.taraf!=='davali' && d.muvekkil) ? muvekkilLink : escHtml(_tp.davaci||'—');
    var davaliDisplay = (d.taraf==='davali' && d.muvekkil) ? muvekkilLink : escHtml(_tp.davali||'');

    el.innerHTML = `
    <div style="padding:16px">
      <!-- Cover Card -->
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:16px">
        <!-- Top gradient banner -->
        <div style="background:linear-gradient(135deg,rgba(201,168,76,0.12) 0%,rgba(122,181,212,0.08) 100%);padding:16px 20px 14px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <span class="ddp-no-pill">${escHtml(d.no)}</span>
            <div style="display:flex;align-items:center;gap:6px">
              ${ageStr?'<span style="font-size:10px;color:var(--text3)">📅 '+ageStr+'</span>':''}
              <!-- Compact status badge -->
              <span class="ddp-durum-badge ddp-durum-${d.durum==='Aktif'?'aktif':d.durum==='Bekliyor'?'bekliyor':'kapali'}" onclick="_ddpCycleStatus('${id}')" title="Tıklayarak durum değiştir" style="cursor:pointer">
                <span class="ddp-durum-dot ${d.durum==='Aktif'?'aktif':d.durum==='Bekliyor'?'bekliyor':'kapali'}"></span> ${escHtml(d.durum||'Aktif')}
              </span>
            </div>
          </div>
          <!-- Plaintiff vs Defendant -->
          <div style="font-size:20px;font-weight:700;color:var(--text);line-height:1.3">
            ${davaciDisplay}${davaliDisplay?' <span style="color:var(--gold);font-size:15px;font-weight:400;margin:0 6px">vs</span> '+davaliDisplay:''}
          </div>
        </div>
        <!-- Info row -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          <div style="padding:10px 20px;border-right:1px solid var(--border);border-bottom:1px solid var(--border)">
            <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Mahkeme</div>
            <div style="font-size:13px;color:var(--text);font-weight:500">${escHtml(d.mahkeme||'—')}</div>
          </div>
          <div style="padding:10px 20px;border-bottom:1px solid var(--border)">
            <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Esas No</div>
            <div style="font-size:13px;color:var(--text);font-weight:500;font-family:'DM Mono',monospace">${escHtml(d.esas||'—')}</div>
          </div>
          <div style="padding:10px 20px;grid-column:span 2;border-bottom:1px solid var(--border)">
            <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Konu</div>
            <div style="font-size:13px;color:var(--text);font-weight:500">${escHtml(d.konu||'—')}</div>
          </div>
          <div style="padding:10px 20px;border-right:1px solid var(--border)">
            <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Davacı</div>
            <div style="font-size:13px;color:var(--text);font-weight:500">${davaciDisplay||'—'}</div>
          </div>
          <div style="padding:10px 20px">
            <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px">Davalı</div>
            <div style="font-size:13px;color:var(--text);font-weight:500">${davaliDisplay||'—'}</div>
          </div>
        </div>
      </div>
      <!-- Bilgi grid -->
      <div class="info-grid">
        ${ei('hakim','Hâkim',d.hakim)}
        ${d.savci?ei('savci','Savcı',d.savci):''}
        ${ei('karsiAvukat','Karşı Av.',d.karsiAvukat)}
        ${ei('bilirkisi','Bilirkişi',d.bilirkisi)}
        ${ei('sonraki','Sonraki Duruşma',d.sonraki?fmtDate(d.sonraki):'','date')}
        ${d.durusma?ei('durusma','Son Duruşma',fmtDate(d.durusma),'date'):''}
      </div>
      <!-- İstinaf / Temyiz -->
      ${(d.istinafMahkeme||d.temyizMahkeme)?`
      <div style="margin-top:14px">
        ${d.istinafMahkeme?`<div style="background:rgba(58,107,140,0.1);border:1px solid rgba(58,107,140,0.3);border-radius:8px;padding:10px 14px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;color:#7ab5d4;margin-bottom:4px">🔵 İSTİNAF</div>
          <div style="font-size:13px;color:var(--text)">${escHtml(d.istinafMahkeme)}</div>
          ${d.istinafEsas?`<div style="font-size:12px;color:var(--text3);margin-top:2px;font-family:monospace">${escHtml(d.istinafEsas)}</div>`:''}
        </div>`:''}
        ${d.temyizMahkeme?`<div style="background:rgba(196,168,224,0.08);border:1px solid rgba(196,168,224,0.3);border-radius:8px;padding:10px 14px">
          <div style="font-size:11px;font-weight:700;color:#c4a8e0;margin-bottom:4px">🟣 TEMYİZ</div>
          <div style="font-size:13px;color:var(--text)">${escHtml(d.temyizMahkeme)}</div>
          ${d.temyizEsas?`<div style="font-size:12px;color:var(--text3);margin-top:2px;font-family:monospace">${escHtml(d.temyizEsas)}</div>`:''}
        </div>`:''}
      </div>`:''}
      <!-- Notlar -->
      ${d.notlar?`<div style="margin-top:14px;background:var(--bg3);border-radius:8px;padding:12px 14px"><div style="font-size:11px;color:var(--text3);margin-bottom:4px">Notlar</div><div style="font-size:13px;color:var(--text2);white-space:pre-wrap">${escHtml(d.notlar)}</div></div>`:''}
      <!-- Son Durum & Sonraki Adım — T6 lift effect -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px">
        <div class="ddp-note-card" onclick="editDavaNotKartInline('${id}','sonDurum')">
          <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:6px;display:flex;align-items:center;gap:6px">📌 Son Durum <span style="margin-left:auto;font-size:10px;color:var(--text3);font-weight:400">✏</span></div>
          <div style="font-size:13px;color:${d.sonDurum?'var(--text2)':'var(--text3)'};white-space:pre-wrap;line-height:1.5">${d.sonDurum?escHtml(d.sonDurum):'Henüz girilmemiş — tıklayarak ekleyin'}</div>
          ${d._sonDurumTarih?'<div style="font-size:9px;color:var(--text3);margin-top:6px;opacity:0.6">Son güncelleme: '+fmtDate(d._sonDurumTarih)+'</div>':''}
        </div>
        <div class="ddp-note-card" onclick="editDavaNotKartInline('${id}','sonrakiAdim')">
          <div style="font-size:11px;font-weight:700;color:#7dc495;margin-bottom:6px;display:flex;align-items:center;gap:6px">➡️ Sonraki Adım <span style="margin-left:auto;font-size:10px;color:var(--text3);font-weight:400">✏</span></div>
          <div style="font-size:13px;color:${d.sonrakiAdim?'var(--text2)':'var(--text3)'};white-space:pre-wrap;line-height:1.5">${d.sonrakiAdim?escHtml(d.sonrakiAdim):'Henüz girilmemiş — tıklayarak ekleyin'}</div>
        </div>
      </div>
      <!-- Dava Stratejisi — T6 -->
      <div class="ddp-note-card" style="margin-top:10px" onclick="editDavaNotKartInline('${id}','strateji')">
        <div style="font-size:11px;font-weight:700;color:#7ab5d4;margin-bottom:6px;display:flex;align-items:center;gap:6px">⚖️ Dava Stratejisi <span style="margin-left:auto;font-size:10px;color:var(--text3);font-weight:400">✏</span></div>
        <div style="font-size:13px;color:${d.strateji?'var(--text2)':'var(--text3)'};white-space:pre-wrap;line-height:1.5">${d.strateji?escHtml(d.strateji):'Henüz girilmemiş — tıklayarak ekleyin'}</div>
      </div>
    </div>`;

  } else if (sekme === 'durusma') {
    const today2 = new Date(); today2.setHours(0,0,0,0);
    // Sort: upcoming first (nearest date at top), then past dates descending
    const durusmalar = (DB.get('tasks')||[]).filter(t=>t.ilgili&&(t.ilgili===d.no||t.ilgili===id)&&t.tip==='durusma').sort((a,b)=>{
      const aDate = new Date(a.tarih||'9999');
      const bDate = new Date(b.tarih||'9999');
      const aFuture = aDate >= today2;
      const bFuture = bDate >= today2;
      if(aFuture && bFuture) return aDate - bDate; // upcoming: nearest first
      if(!aFuture && !bFuture) return bDate - aDate; // past: most recent first
      return aFuture ? -1 : 1; // upcoming before past
    });
    // D5: Filter
    var filteredDur = durusmalar;
    if(_ddpDurusmaFilter==='upcoming') filteredDur = durusmalar.filter(function(t){return !t.tarih||Math.ceil((_yerelTarih(t.tarih)-today2)/86400000)>=0;});
    else if(_ddpDurusmaFilter==='past') filteredDur = durusmalar.filter(function(t){return t.tarih&&Math.ceil((_yerelTarih(t.tarih)-today2)/86400000)<0;});
    // D1: Hero card with countdown badge
    var heroDays = d.sonraki ? Math.ceil((new Date(d.sonraki)-today2)/86400000) : null;
    var heroBadgeClass = heroDays!==null?(heroDays<=7?'urgent':heroDays<=30?'soon':'safe'):'safe';

    el.innerHTML = `<div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:14px;font-weight:700;color:var(--text)">⚖️ Duruşma Geçmişi & Planı</div>
        <button class="btn btn-gold" style="font-size:12px;padding:6px 12px" onclick="window._taskIlgiliOnac='${escHtml(d.no)}';openModal('modal-task');setTaskTip('durusma');document.getElementById('t-mahkeme-durusma').value='${escHtml(d.mahkeme||'')}';document.getElementById('t-baslik').value='DURUŞMA'">+ Duruşma Ekle</button>
      </div>
      ${d.sonraki?`<div class="ddp-hero-durusma">
        <div>
          <div class="ddp-hero-days">${heroDays}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">gün kaldı</div>
        </div>
        <div style="flex:1">
          <div class="ddp-hero-label">SONRAKİ DURUŞMA</div>
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-top:2px">${fmtDate(d.sonraki)}</div>
          <div style="margin-top:4px"><span class="ddp-countdown ${heroBadgeClass}">⏰ ${heroDays<=0?'BUGÜN':heroDays+' gün'}</span></div>
        </div>
        <button class="ddp-fin-export" onclick="_ddpExportICS('Duruşma — ${escHtml(d.no)}','${d.sonraki}','${escHtml(d.mahkeme||'')}')">📅 .ics</button>
      </div>`:''}
      <!-- D5: Filter toggle -->
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <button class="btn ${_ddpDurusmaFilter==='all'?'btn-gold':'btn-outline'}" style="font-size:11px;padding:4px 10px" onclick="_ddpDurusmaFilter='all';renderDavaTab('${id}','durusma')">Tümü (${durusmalar.length})</button>
        <button class="btn ${_ddpDurusmaFilter==='upcoming'?'btn-gold':'btn-outline'}" style="font-size:11px;padding:4px 10px" onclick="_ddpDurusmaFilter='upcoming';renderDavaTab('${id}','durusma')">Yaklaşan</button>
        <button class="btn ${_ddpDurusmaFilter==='past'?'btn-gold':'btn-outline'}" style="font-size:11px;padding:4px 10px" onclick="_ddpDurusmaFilter='past';renderDavaTab('${id}','durusma')">Geçmiş</button>
      </div>
      ${filteredDur.length===0?'<div style="text-align:center;color:var(--text3);padding:30px">Duruşma kaydı yok</div>':
        '<div style="display:flex;flex-direction:column;gap:2px">'
        +filteredDur.map(t=>{
          const diff=t.tarih?Math.ceil((_yerelTarih(t.tarih)-today2)/86400000):null;
          const gecti=diff!==null&&diff<0;
          // T7: dot classes
          var dotClass = gecti?'':'ddp-tl-dot '+(diff===0?'today':'future');
          // D2: Sonuç field + D3: saat
          var sonucHtml = t.sonuc ? '<div style="font-size:11px;margin-top:3px"><span style="background:rgba(201,168,76,0.12);color:var(--gold);padding:1px 6px;border-radius:4px;font-weight:600">'+escHtml(t.sonuc)+'</span></div>' : '';
          var saatHtml = t.saat ? ' · '+escHtml(t.saat) : '';
          return `<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
            <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:40px">
              <div class="${dotClass}" style="width:10px;height:10px;border-radius:50%;background:${gecti?'var(--text3)':diff===0?'var(--red)':'var(--gold)'};margin-top:3px"></div>
              <div style="width:1px;flex:1;background:var(--border);margin-top:4px${gecti?';border-left:1px dashed var(--text3);width:0':''}"></div>
            </div>
            <div style="flex:1;min-width:0;padding-bottom:8px">
              <div style="font-size:13px;font-weight:600;color:${gecti?'var(--text3)':'var(--text)'}${t.done?';text-decoration:line-through':''}">⚖️ ${escHtml(t.baslik||'Duruşma')}</div>
              <div style="font-size:11px;color:${gecti?'var(--text3)':diff===0?'var(--red)':'var(--gold)'};margin-top:3px">${fmtDate(t.tarih.slice(0,10))}${saatHtml}${diff===0?' — BUGÜN':diff>0?' — '+diff+' gün':' — Geçti'}</div>
              ${t.mahkeme?`<div style="font-size:11px;color:var(--text3)">${escHtml(t.mahkeme)}</div>`:''}
              ${sonucHtml}
              ${t.aciklama?`<div style="font-size:12px;color:var(--text2);margin-top:4px">${escHtml(t.aciklama)}</div>`:''}
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
              ${t.done?'<span style="font-size:11px;color:var(--green)">✓</span>':''}
              ${!gecti?'<button class="ddp-fin-export" onclick="_ddpExportICS(\'Duruşma\',\''+t.tarih.slice(0,10)+'\',\''+escHtml(t.mahkeme||'')+'\')" title="Takvime aktar">📅</button>':''}
            </div>
          </div>`;
        }).join('')+'</div>'
      }
    </div>`;

  } else if (sekme === 'belge') {
    // B1: Filter/search
    el.innerHTML = `<div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:14px;font-weight:700;color:var(--text)">📎 Belgeler</div>
        <button class="btn btn-gold" style="font-size:12px;padding:6px 12px" onclick="_belgeSelectedFile=null;document.getElementById('belge-file-name').style.display='none';document.getElementById('belge-edit-id').value='';openBelgeModal('${id}')">+ Belge Ekle</button>
      </div>
      ${belgeler.length>3?`<div class="ddp-belge-filter">
        <input type="text" placeholder="🔍 Belge ara..." oninput="_ddpFilterBelgeler('${id}',this.value,document.getElementById('ddp-belge-tur-filter').value,document.getElementById('ddp-belge-taraf-filter').value)">
        <select id="ddp-belge-tur-filter" onchange="_ddpFilterBelgeler('${id}',this.parentNode.querySelector('input').value,this.value,document.getElementById('ddp-belge-taraf-filter').value)">
          <option value="">Tüm Türler</option><option value="Dilekçe">Dilekçe</option><option value="Karar">Karar</option><option value="Vekaletname">Vekaletname</option><option value="Bilirkişi">Bilirkişi</option><option value="Tebligat">Tebligat</option><option value="Sözleşme">Sözleşme</option><option value="Diğer">Diğer</option>
        </select>
        <select id="ddp-belge-taraf-filter" onchange="_ddpFilterBelgeler('${id}',this.parentNode.querySelector('input').value,document.getElementById('ddp-belge-tur-filter').value,this.value)">
          <option value="">Tüm Taraflar</option><option value="Biz">Biz</option><option value="Karşı">Karşı</option><option value="Mahkeme">Mahkeme</option>
        </select>
      </div>`:''}
      <div id="ddp-belge-list">
      ${belgeler.length===0
        ? '<div class="ddp-empty-state"><div class="ddp-empty-icon">📂</div><div class="ddp-empty-text">Henüz belge eklenmedi</div><button class="btn btn-gold" style="font-size:12px" onclick="openBelgeModal(\''+id+'\')">İlk Belgenizi Ekleyin →</button></div>'
        : '<div style="display:flex;flex-direction:column;gap:8px">'
          +belgeler.sort((a,b)=>new Date(b.tarih)-new Date(a.tarih)).map((b,idx)=>{
            // T9: Side stripe + B4: numbering
            var tarafClass = b.taraf==='Biz'?'taraf-biz':b.taraf==='Karşı'?'taraf-karsi':b.taraf==='Mahkeme'?'taraf-mahkeme':'';
            var belgeIcon = b.tur==='Dilekçe'?'📄':b.tur==='Karar'?'⚖️':b.tur==='Vekaletname'?'✍️':b.tur==='Bilirkişi'?'🔬':b.tur==='Tebligat'?'📬':b.tur==='Sözleşme'?'📜':'📎';
            return `
          <div class="ddp-belge-card ${tarafClass}" data-ad="${escHtml(b.ad).toLowerCase()}" data-tur="${b.tur||''}" data-taraf="${b.taraf||''}">
            <div style="font-size:10px;color:var(--text3);font-weight:700;font-family:monospace;flex-shrink:0;width:20px">${idx+1}</div>
            <div style="font-size:20px;flex-shrink:0">${belgeIcon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text)">${escHtml(b.ad)}</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">${escHtml(b.tur||'')}${b.taraf?' · '+escHtml(b.taraf):''} · ${fmtDate(b.tarih)}</div>
              ${b.aciklama?`<div style="font-size:12px;color:var(--text3);margin-top:3px">${escHtml(b.aciklama)}</div>`:''}
            </div>
            ${b.url?`<a href="${escHtml(b.url)}" ${_dosyaAcLinkAttrs(b.ad)} class="btn btn-outline" style="font-size:11px;padding:4px 10px;flex-shrink:0">Aç →</a>`:''}
            <button class="btn btn-ghost" style="font-size:11px;padding:3px 6px;flex-shrink:0" onclick="editBelge('${b.id}','${id}')">✏</button>
            <button class="btn btn-ghost" style="color:var(--red);font-size:12px;flex-shrink:0" onclick="deleteBelge('${b.id}','${id}')">🗑</button>
          </div>`}).join('')+'</div>'
      }
      </div>
    </div>`;

  } else if (sekme === 'finans') {
    const akdiUcret = Number(d.akdiUcret)||0;
    const pct = akdiUcret>0 ? Math.min(Math.round(tahsilat/akdiUcret*100),100) : 0;
    // F1: Masraf KPI
    const netKar = tahsilat - masraf;
    // T12: Segmented progress
    const masrafPct = akdiUcret>0 ? Math.min(Math.round(masraf/akdiUcret*100),100-pct) : 0;

    el.innerHTML = `<div style="padding:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="font-size:14px;font-weight:700;color:var(--text)">💰 Finansal Durum</div>
        <button class="ddp-fin-export" onclick="_ddpExportFinansCSV('${id}')">📊 CSV İndir</button>
      </div>
      <!-- KPI — F1: 4 cards + T11 -->
      <div id="ddp-finans-kpi" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
        <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Anlaşılan Ücret</div>
          <div style="font-size:16px;font-weight:800;color:var(--gold);font-family:monospace">₺${fmt(akdiUcret)}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid rgba(74,140,92,0.3);border-radius:10px;padding:10px 12px">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Tahsil Edilen</div>
          <div style="font-size:16px;font-weight:800;color:var(--green);font-family:monospace">₺${fmt(tahsilat)}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid rgba(192,83,58,0.3);border-radius:10px;padding:10px 12px">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Toplam Masraf</div>
          <div style="font-size:16px;font-weight:800;color:var(--red);font-family:monospace">₺${fmt(masraf)}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid ${netKar>=0?'rgba(74,140,92,0.3)':'rgba(192,83,58,0.3)'};border-radius:10px;padding:10px 12px">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Net Kâr/Zarar</div>
          <div style="font-size:16px;font-weight:800;color:${netKar>=0?'var(--green)':'var(--red)'};font-family:monospace">${netKar>=0?'+':''}₺${fmt(Math.abs(netKar))}</div>
        </div>
      </div>
      ${akdiUcret>0?`<!-- T12: Segmented progress -->
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:4px">
        <span>Tahsilat İlerlemesi</span>
        <span style="font-weight:700;color:var(--gold)">${pct}%</span>
      </div>
      <div class="ddp-progress-wrap">
        <div class="ddp-progress-seg" style="width:${pct}%;background:var(--gold)"></div>
        <div class="ddp-progress-seg" style="width:${masrafPct}%;background:var(--red);opacity:0.5"></div>
      </div>`:''}
      <!-- Kalan alacak bilgi -->
      ${akdiUcret>0?`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:14px">
        <span>Kalan Alacak: <b style="color:${Math.max(0,akdiUcret-tahsilat)>0?'var(--red)':'var(--green)'}">₺${fmt(Math.max(0,akdiUcret-tahsilat))}</b></span>
        <span>Altın: tahsilat / Kırmızı: masraf</span>
      </div>`:''}
      <!-- İşlem listesi + F3 edit/delete + F4 paid toggle -->
      <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">İşlem Geçmişi</div>
      ${finans.length===0?'<div style="text-align:center;color:var(--text3);padding:20px">İşlem yok</div>':
        (function(){
          // T13: Group by month
          var sorted = finans.filter(f=>f.tur!=='Karşı Vekalet Ücreti'&&f.tur!=='Taksit Planı').sort((a,b)=>new Date(b.tarih)-new Date(a.tarih));
          var lastMonth = '';
          return sorted.map(f=>{
            var isG=GELIR_T.includes(f.tur);
            var isMasraf=MASRAF_T.includes(f.tur);
            var monthKey = (f.tarih||'').slice(0,7);
            var monthNames = ['','Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
            var monthHeader = '';
            if(monthKey && monthKey !== lastMonth) {
              var parts = monthKey.split('-');
              monthHeader = '<div class="ddp-month-header">'+(monthNames[parseInt(parts[1])]||'')+' '+parts[0]+'</div>';
              lastMonth = monthKey;
            }
            return monthHeader+`<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <div style="width:32px;height:32px;border-radius:8px;background:${isG?'rgba(74,140,92,0.15)':'rgba(192,83,58,0.15)'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${isG?'↗':'↘'}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:600;color:var(--text2)">${escHtml(f.tur)}${isMasraf&&f.odpisr?'<span style="font-size:9px;background:rgba(74,140,92,0.2);color:var(--green);padding:1px 5px;border-radius:3px;margin-left:6px">ÖDENDİ</span>':''}</div>
                <div style="font-size:11px;color:var(--text3)">${fmtDate(f.tarih)}${f.aciklama?' · '+escHtml(f.aciklama):''}</div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${isG?'var(--green)':'var(--red)'};font-family:monospace;flex-shrink:0">${isG?'+':'−'}₺${fmt(f.tutar)}</span>
              <div style="display:flex;gap:2px;flex-shrink:0">
                ${isMasraf?'<button class="btn btn-ghost" style="font-size:10px;padding:2px 5px;color:'+(f.odpisr?'var(--green)':'var(--text3)')+'" onclick="_ddpToggleMasrafOdendi(\''+f.id+'\')" title="Ödeme durumu">'+(f.odpisr?'✓':'○')+'</button>':''}
                <button class="btn btn-ghost" style="font-size:10px;padding:2px 5px" onclick="_ddpDeleteFinans('${f.id}')">🗑</button>
              </div>
            </div>`;
          }).join('');
        })()
      }
      <button class="btn btn-gold" style="width:100%;justify-content:center;margin-top:12px" onclick="_ddpOpenFinansModal('${id}','${escHtml(d.no)}','${escHtml(d.muvekkil)}')">+ Yeni İşlem Ekle</button>
      <!-- Finansal Notlar -->
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border)">
        <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">📝 Finansal Notlar</div>
        <textarea id="ddp-finansal-not" rows="4" placeholder="Bu dosyayla ilgili finansal notlarınızı buraya yazın…" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;padding:10px 12px;font-family:inherit;resize:vertical;outline:none;box-sizing:border-box">${escHtml(d.finansalNot||'')}</textarea>
        <button class="btn btn-outline" style="margin-top:6px;font-size:12px" onclick="_ddpSaveFinansalNot('${id}')">Kaydet</button>
      </div>
    </div>`;

  } else if (sekme === 'masraf') {
    _ddpRenderMasraflar(id, d);
    return;
  } else if (sekme === 'gorev') {
    const today2 = new Date(); today2.setHours(0,0,0,0);
    const allTasks = tasks;
    const gecikmisTasks = allTasks.filter(t=>!t.done&&t.tarih&&Math.ceil((_yerelTarih(t.tarih)-today2)/86400000)<0);
    const bekleyenTasks = allTasks.filter(t=>!t.done&&(!t.tarih||Math.ceil((_yerelTarih(t.tarih)-today2)/86400000)>=0));
    const tamamTasks   = allTasks.filter(t=>t.done);

    el.innerHTML = `<div style="padding:0">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 14px 10px">
        <div style="font-size:14px;font-weight:700;color:var(--text)">✅ Görevler</div>
        <button class="btn btn-gold" style="font-size:12px;padding:6px 12px" onclick="window._taskIlgiliOnac='${escHtml(d.no)}';openModal('modal-task')">+ Görev Ekle</button>
      </div>
      <!-- Ö4: Task summary -->
      <div class="ddp-task-summary">
        <span style="color:var(--red)"><span class="cnt">${gecikmisTasks.length}</span> gecikmiş</span>
        <span style="color:var(--gold)"><span class="cnt">${bekleyenTasks.length}</span> bekleyen</span>
        <span style="color:var(--green)"><span class="cnt">${tamamTasks.length}</span> tamamlandı</span>
      </div>
      <!-- Ö6: Quick task input -->
      <div class="ddp-quick-task">
        <input id="ddp-quick-task-input" placeholder="Hızlı görev ekle... (Enter)" onkeydown="if(event.key==='Enter')_ddpQuickAddTask('${escHtml(d.no)}')">
        <button class="btn btn-gold" style="font-size:11px;padding:5px 10px" onclick="_ddpQuickAddTask('${escHtml(d.no)}')">+</button>
      </div>
      ${_gorevRowListHTML(allTasks,'dava',id)}
    </div>`;
  }
}

// ── DAVA MASRAF SEKMESİ ──────────────────────────────────────────────────────

function _ddpRenderMasraflar(id, d) {
  var masraflar = (DB.get('dava_masraflar')||[]).filter(function(m){return m.davaId===id;})
    .sort(function(a,b){return new Date(b.tarih)-new Date(a.tarih);});
  var toplam = masraflar.reduce(function(a,b){return a+Number(b.tutar||0);},0);

  // Müvekkilin toplam avans bakiyesi
  var finans = DB.get('finans')||[];
  var tumMasraflar = (DB.get('dava_masraflar')||[]);
  var muvekkilAd = d.muvekkil||'';
  var avansAlinan = finans.filter(function(f){return f.muvekkil===muvekkilAd&&f.tur==='Masraf Ödemesi';})
    .reduce(function(a,b){return a+Number(b.tutar);},0);
  var tumHarcanan = tumMasraflar.filter(function(m){return m.muvekkilAd===muvekkilAd;})
    .reduce(function(a,b){return a+Number(b.tutar||0);},0)
    + finans.filter(function(f){return f.muvekkil===muvekkilAd&&['Masraf (Ofis Avansı)','Masraf','Dava Masrafı','Harç'].includes(f.tur);})
    .reduce(function(a,b){return a+Number(b.tutar);},0);
  var bakiye = avansAlinan - tumHarcanan;

  var el = document.getElementById('ddp-info');
  el.innerHTML = '<div style="padding:16px">'
    // KPI satırı
    + '<div class="kpi-3col" style="gap:8px;margin-bottom:16px">'
    + '<div style="background:var(--bg3);border:1px solid rgba(192,83,58,0.3);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Bu Dava Masrafı</div><div style="font-size:16px;font-weight:800;color:var(--red);font-family:monospace">₺'+fmt(toplam)+'</div></div>'
    + '<div style="background:var(--bg3);border:1px solid rgba(58,107,140,0.3);border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Müvekkil Toplam Avans</div><div style="font-size:16px;font-weight:800;color:#7ab5d4;font-family:monospace">₺'+fmt(avansAlinan)+'</div></div>'
    + '<div style="background:var(--bg3);border:1px solid '+(bakiye>=0?'rgba(74,140,92,0.3)':'rgba(192,83,58,0.5)')+';border-radius:10px;padding:10px 12px"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Avans Bakiyesi</div><div style="font-size:16px;font-weight:800;color:'+(bakiye>=0?'var(--green)':'var(--red)')+';font-family:monospace">'+(bakiye>=0?'+':'')+'₺'+fmt(Math.abs(bakiye))+'</div></div>'
    + '</div>'
    // Masraf ekleme formu
    + '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">'
    + '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:10px">+ Masraf Ekle</div>'
    + '<div class="form-grid" style="gap:8px;margin-bottom:8px">'
    + '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Tarih</label><input type="date" id="ddp-masraf-tarih" value="'+new Date().toISOString().slice(0,10)+'" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;padding:6px 10px;font-family:inherit;outline:none;color-scheme:dark"></div>'
    + '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Tutar (₺)</label><input type="number" id="ddp-masraf-tutar" placeholder="0" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;padding:6px 10px;font-family:inherit;outline:none"></div>'
    + '</div>'
    + '<div class="form-grid" style="gap:8px;margin-bottom:10px">'
    + '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Tür</label><select id="ddp-masraf-tur" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;padding:6px 10px;font-family:inherit;outline:none"><option>Harç</option><option>Tebligat Ücreti</option><option>Bilirkişi Ücreti</option><option>Posta Ücreti</option><option>Keşif Masrafı</option><option>Tercüman Ücreti</option><option>Yol/Konaklama</option><option>Diğer</option></select></div>'
    + '<div><label style="font-size:10px;color:var(--text3);display:block;margin-bottom:3px">Açıklama</label><input type="text" id="ddp-masraf-aciklama" placeholder="İsteğe bağlı..." style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;padding:6px 10px;font-family:inherit;outline:none"></div>'
    + '</div>'
    + '<button class="btn btn-gold" style="width:100%;justify-content:center;font-size:13px" onclick="_ddpAddDavaMasraf(\''+id+'\',\''+escHtml(d.muvekkil||'')+'\')">+ Masraf Kaydet</button>'
    + '</div>'
    // Liste başlığı
    + '<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:8px">Masraf Geçmişi</div>'
    + (masraflar.length === 0
      ? '<div style="text-align:center;color:var(--text3);padding:20px;font-size:13px">Henüz masraf kaydı yok</div>'
      : masraflar.map(function(m){
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05)">'
            + '<div style="width:32px;height:32px;border-radius:8px;background:rgba(192,83,58,0.12);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">🧾</div>'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:13px;font-weight:600;color:var(--text2)">'+escHtml(m.tur||'Masraf')+'</div>'
            + '<div style="font-size:11px;color:var(--text3)">'+fmtDate(m.tarih)+(m.aciklama?' · '+escHtml(m.aciklama):'')+'</div>'
            + '</div>'
            + '<span style="font-size:13px;font-weight:700;color:var(--red);font-family:monospace;flex-shrink:0">−₺'+fmt(Number(m.tutar||0))+'</span>'
            + '<button class="btn btn-ghost" style="font-size:10px;padding:2px 5px;color:var(--red)" onclick="_ddpDeleteDavaMasraf(\''+m.id+'\',\''+id+'\')">🗑</button>'
            + '</div>';
        }).join('')
    )
    + '</div>';
}

function _ddpAddDavaMasraf(davaId, muvekkilAd) {
  var tarih = document.getElementById('ddp-masraf-tarih')?.value;
  var tutar = parseFloat(document.getElementById('ddp-masraf-tutar')?.value)||0;
  var tur   = document.getElementById('ddp-masraf-tur')?.value||'Harç';
  var aciklama = document.getElementById('ddp-masraf-aciklama')?.value||'';
  if (!tutar || tutar <= 0) { notify('Tutar giriniz'); return; }
  var arr = DB.get('dava_masraflar')||[];
  arr.push({ id: 'dm_'+Date.now()+'_'+Math.random().toString(36).slice(2,6), davaId: davaId, muvekkilAd: muvekkilAd, tarih: tarih, tutar: tutar, tur: tur, aciklama: aciklama });
  DB.set('dava_masraflar', arr);
  _ddpUpdateBadges(DB.get('davalar').find(function(x){return x.id===davaId;})||{}, davaId);
  renderDavaTab(davaId, 'masraf');
  notify('Masraf kaydedildi ✓');
}

function _ddpDeleteDavaMasraf(masrafId, davaId) {
  showConfirmModal('Bu masraf kaydını silmek istediğinizden emin misiniz?', function() {
    DB.set('dava_masraflar', (DB.get('dava_masraflar')||[]).filter(function(m){return m.id!==masrafId;}));
    _ddpUpdateBadges(DB.get('davalar').find(function(x){return x.id===davaId;})||{}, davaId);
    renderDavaTab(davaId, 'masraf');
    notify('Masraf silindi');
  });
}

// B1: Client-side filter for belgeler
function _ddpFilterBelgeler(davaId, searchText, turFilter, tarafFilter) {
  var cards = document.querySelectorAll('#ddp-belge-list .ddp-belge-card');
  var search = (searchText||'').toLowerCase();
  cards.forEach(function(card){
    var ad = card.dataset.ad||'';
    var tur = card.dataset.tur||'';
    var taraf = card.dataset.taraf||'';
    var matchSearch = !search || ad.includes(search);
    var matchTur = !turFilter || tur===turFilter;
    var matchTaraf = !tarafFilter || taraf===tarafFilter;
    card.style.display = (matchSearch&&matchTur&&matchTaraf) ? '' : 'none';
  });
}

// ===== DAVA NOT KARTLARI =====
function editDavaNotKartInline(davaId, key) {
  const d = DB.get('davalar').find(x => x.id === davaId);
  if (!d) return;
  const labels = {
    sonDurum:'📌 Son Durum', sonrakiAdim:'➡️ Sonraki Adım',
    strateji:'⚖️ Strateji', arabuluculuk:'🤝 Arabuluculuk', notlar:'📝 Genel Notlar',
    karsi:'⚖️ Karşı Taraf', hakim:'👨‍⚖️ Hâkim', savci:'🧑‍⚖️ Savcı',
    karsiAvukat:'🎓 Karşı Avukat', bilirkisi:'🔬 Bilirkişi'
  };

  // Mini modal oluştur
  const existing = document.getElementById('dnk-quick-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'dnk-quick-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:24px;width:480px;max-width:95vw;box-shadow:0 20px 60px rgba(0,0,0,0.5)">
      <div style="font-family:'Playfair Display',serif;font-size:15px;color:var(--gold);margin-bottom:14px">${labels[key]||key}</div>
      <textarea id="dnk-modal-ta" style="width:100%;min-height:120px;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13.5px;padding:10px 12px;resize:vertical;font-family:'DM Sans',sans-serif;outline:none;line-height:1.7">${d[key]||''}</textarea>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
        <button onclick="document.getElementById('dnk-quick-modal').remove()" class="btn btn-outline">İptal</button>
        ${d[key] ? `<button onclick="dnkSilInline('${davaId}','${key}')" class="btn btn-ghost" style="color:var(--red)">🗑 Sil</button>` : ''}
        <button onclick="dnkKaydetInline('${davaId}','${key}')" class="btn btn-gold">Kaydet</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  // Not: modal arka planına (backdrop) tıklayınca kapanma davranışı KASITLI olarak
  // kaldırıldı — kullanıcı not yazarken yanlışlıkla dışarı tıklayınca içerik
  // kaybolmasın diye. Kapatmak için İptal butonu veya Kaydet kullanılmalı.
  setTimeout(() => document.getElementById('dnk-modal-ta')?.focus(), 50);
}

function dnkKaydetInline(davaId, key) {
  const ta = document.getElementById('dnk-modal-ta');
  if (!ta) return;
  let arr = DB.get('davalar');
  arr = arr.map(d => d.id === davaId ? {...d, [key]: ta.value.trim(), ['_'+key+'Tarih']: new Date().toISOString()} : d);
  DB.set('davalar', arr);
  _sbTekKayitYaz('davalar', arr.find(d => d.id === davaId));
  document.getElementById('dnk-quick-modal')?.remove();
  renderDavaDetailPage(davaId);
  notify('Kaydedildi ✓');
}

function dnkSilInline(davaId, key) {
  showConfirmModal('Bu notu silmek istediğinizden emin misiniz?', function() {
    let arr = DB.get('davalar');
    arr = arr.map(d => d.id === davaId ? {...d, [key]: ''} : d);
    DB.set('davalar', arr);
    _sbTekKayitYaz('davalar', arr.find(d => d.id === davaId));
    document.getElementById('dnk-quick-modal')?.remove();
    renderDavaDetailPage(davaId);
  });
}

const DAVA_NOT_LABELS = {
  sonDurum:   {label:'📌 Son Durum',    color:'var(--gold)'},
  sonrakiAdim:{label:'➡️ Sonraki Adım', color:'#7dc495'},
  strateji:   {label:'⚖️ Strateji',     color:'#7ab5d4'},
  arabuluculuk:{label:'🤝 Arabuluculuk',color:'#c4a8e0'},
  notlar:     {label:'📝 Genel Not',    color:'var(--text2)'}
};
let _activeNotKart = {};

function toggleDavaNotKart(davaId, key) {
  const d = DB.get('davalar').find(x => x.id === davaId);
  if (!d) return;
  const panel = document.getElementById('dava-not-panel-' + davaId);
  const labelEl = document.getElementById('dnk-label-' + davaId);
  const contentEl = document.getElementById('dnk-content-' + davaId);
  if (!panel) return;

  // Aynı butona tekrar tıklanırsa kapat
  if (_activeNotKart[davaId] === key && panel.style.display !== 'none') {
    panel.style.display = 'none';
    _activeNotKart[davaId] = null;
    return;
  }

  _activeNotKart[davaId] = key;
  const info = DAVA_NOT_LABELS[key];
  labelEl.textContent = info.label;
  labelEl.style.color = info.color;
  contentEl.textContent = d[key] || '(Henüz not girilmemiş)';
  contentEl.style.color = d[key] ? 'var(--text2)' : 'var(--text3)';
  panel.dataset.activeKey = key;
  panel.style.display = '';
}

function editDavaNotKart(davaId) {
  const d = DB.get('davalar').find(x => x.id === davaId);
  const panel = document.getElementById('dava-not-panel-' + davaId);
  const key = panel?.dataset?.activeKey;
  if (!d || !key) return;
  const info = DAVA_NOT_LABELS[key];

  const contentEl = document.getElementById('dnk-content-' + davaId);
  const mevcut = d[key] || '';

  const taStyle = 'width:100%;min-height:80px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:8px;resize:vertical;outline:none';
  contentEl.innerHTML = '<textarea id="dnk-ta-' + davaId + '" style="' + taStyle + '">' + escHtml(mevcut) + '</textarea>';
  const saveBtn = panel.querySelector('button');
  if (saveBtn) {
    saveBtn.textContent = '✓ Kaydet';
    saveBtn.onclick = () => saveDavaNotKart(davaId, key);
  }
  document.getElementById('dnk-ta-' + davaId)?.focus();
}

function saveDavaNotKart(davaId, key) {
  const ta = document.getElementById('dnk-ta-' + davaId);
  if (!ta) return;
  const val = ta.value;
  let arr = DB.get('davalar');
  arr = arr.map(d => d.id === davaId ? {...d, [key]: val} : d);
  DB.set('davalar', arr);
  _sbTekKayitYaz('davalar', arr.find(d => d.id === davaId));
  notify('Kaydedildi ✓');
  renderDavaDetailPage(davaId);
  // Paneli tekrar aç
  setTimeout(() => toggleDavaNotKart(davaId, key), 50);
}

function clearDavaNotKart(davaId) {
  const panel = document.getElementById('dava-not-panel-' + davaId);
  const key = panel?.dataset?.activeKey;
  if (!key) return;
  showConfirmModal('Bu notu silmek istediğinizden emin misiniz?', function() {
    let arr = DB.get('davalar');
    arr = arr.map(d => d.id === davaId ? {...d, [key]: ''} : d);
    DB.set('davalar', arr);
    _sbTekKayitYaz('davalar', arr.find(d => d.id === davaId));
    panel.style.display = 'none';
    _activeNotKart[davaId] = null;
    renderDavaDetailPage(davaId);
  });
}

// ========== INLINE EDIT (sol panel) ==========
function startInlineEdit(davaId, field, type = 'text') {
  const d = DB.get('davalar').find(x => x.id === davaId);
  if (!d) return;

  const container = document.getElementById('ei-' + field);
  if (!container) return;
  container.onclick = null; // Düzenleme modundayken kart tıklamasının tekrar tetiklenmesini engelle

  const currentVal = d[field] || '';
  const isDate = type === 'date';
  const isTextarea = type === 'textarea';
  const isNumber = type === 'number';

  // Seçim kutusu gereken alanlar
  const selectFields = {
    durum: ['Aktif','Bekliyor','Kapalı'],
  };

  let inputHTML;
  if (selectFields[field]) {
    inputHTML = `<select class="info-inline-input" id="ii-${field}">
      ${selectFields[field].map(o => `<option${o===currentVal?' selected':''}>${o}</option>`).join('')}
    </select>`;
  } else if (isTextarea) {
    inputHTML = `<textarea class="info-inline-input" id="ii-${field}" style="min-height:80px;resize:vertical">${currentVal}</textarea>`;
  } else {
    inputHTML = `<input class="info-inline-input" id="ii-${field}" type="${isDate?'date':isNumber?'number':'text'}" value="${isDate ? currentVal : currentVal}">`;
  }

  container.innerHTML = `
    ${inputHTML}
    <div style="display:flex;gap:4px;margin-top:4px">
      <button class="info-inline-save" onclick="saveInlineEdit('${davaId}','${field}','${type}')">✓ Kaydet</button>
      <button class="info-inline-cancel" onclick="renderDavaDetailPage('${davaId}')">İptal</button>
    </div>`;

  const inp = document.getElementById('ii-' + field);
  if (inp) {
    inp.focus();
    if (!isTextarea && !selectFields[field]) {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveInlineEdit(davaId, field, type);
        if (e.key === 'Escape') renderDavaDetailPage(davaId);
      });
    }
  }
}

function saveInlineEdit(davaId, field, type) {
  const inp = document.getElementById('ii-' + field);
  if (!inp) return;
  let val = inp.value;
  if (type === 'number') val = val; // keep as string, fmt() handles display

  let davalar = DB.get('davalar');
  davalar = davalar.map(x => x.id === davaId ? { ...x, [field]: val } : x);
  DB.set('davalar', davalar);
  _sbTekKayitYaz('davalar', davalar.find(x => x.id === davaId));
  renderDavaDetailPage(davaId);
  notify('✓ ' + field + ' güncellendi');
}

// ========== CHATTER ==========
// ── AVATAR RENK SİSTEMİ ──
var CH_COLORS=[
  {bg:'var(--gold-dim)',border:'rgba(201,168,76,0.4)',color:'var(--gold)'},
  {bg:'rgba(122,92,140,0.2)',border:'rgba(122,92,140,0.4)',color:'#c4a0e0'},
  {bg:'rgba(74,140,92,0.2)',border:'rgba(74,140,92,0.4)',color:'#7dc495'},
  {bg:'rgba(58,107,140,0.2)',border:'rgba(58,107,140,0.4)',color:'#7ab5d4'},
  {bg:'rgba(192,83,58,0.2)',border:'rgba(192,83,58,0.4)',color:'#e08878'},
];
var _chCM={},_chCI=0;
function chColor(y){if(!_chCM[y]){_chCM[y]=CH_COLORS[_chCI%CH_COLORS.length];_chCI++;}return _chCM[y];}

function chAvatar(y,s){
  var ini=(y||'AV').split(' ').map(function(w){return w[0];}).join('').slice(0,2).toUpperCase();
  var cv=chColor(y),sz=s||32;
  return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+cv.bg+';border:1.5px solid '+cv.border+';display:flex;align-items:center;justify-content:center;font-size:'+(sz<26?9:11)+'px;font-weight:700;color:'+cv.color+';flex-shrink:0;font-family:DM Mono,monospace">'+ini+'</div>';
}

function chReplyTo(pY,pM){
  if(!pY) return '';
  var cv=chColor(pY);
  var snip=escHtml((pM||'').slice(0,45))+((pM||'').length>45?'...':'');
  return '<div class="ch-reply-to"><span class="ch-reply-dot" style="background:'+cv.color+'"></span><span style="color:var(--text3)">&#x21a9;</span><span class="ch-reply-name">'+escHtml(pY)+'</span><span class="ch-reply-snip">&middot; '+snip+'</span></div>';
}

function chActions(pid, davaId, small){
  var b = small ? 'chatter-btn' : 'chatter-btn';
  return '<div class="ch-actions" id="cactions-'+pid+'">'
    +'<button class="'+b+' reply-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="startReplyById(this.dataset.pid,this.dataset.did)">&#x21a9; Yan&#x131;tla</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="'+b+' edit-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="startChatterEdit(this.dataset.pid,this.dataset.did)">&#x270f; D&#xfc;zenle</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="'+b+' del-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="deletePost(this.dataset.pid,this.dataset.did)">&#x1f5d1; Sil</button>'
    +'</div>';
}

function chGetRoot(post, all) {
  var cur = post;
  var visited = {};
  while (cur.parentId) {
    if (visited[cur.id]) break;
    visited[cur.id] = true;
    var parent = all.find(function(p){ return p.id === cur.parentId; });
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

async function renderChatter(davaId){
  await _sbYukleChatter('dava', davaId);
  var all=(DB.get('chatter_'+davaId)||[]).slice().sort(function(a,b){return new Date(a.tarih)-new Date(b.tarih);});
  var countEl=document.getElementById('ddp-post-count');
  if(countEl) countEl.textContent=all.length+' mesaj';
  var feed=document.getElementById('chatter-feed');
  if(!feed) return;
  if(!all.length){
    feed.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:32px;margin-bottom:10px">&#x1f4ac;</div><div style="font-size:13px">Henüz mesaj yok</div></div>';
    return;
  }
  // Kök post: parentId yok VEYA parentId all'da bulunamıyor
  var anaPosts = all.filter(function(p){
    if (!p.parentId) return true;
    return !all.find(function(x){ return x.id === p.parentId; });
  });
  // Her post için kökünü bul, kök altına grupla
  var rootReplies = {};
  all.forEach(function(p){
    if (anaPosts.find(function(a){ return a.id === p.id; })) return;
    var root = chGetRoot(p, all);
    if (!rootReplies[root.id]) rootReplies[root.id] = [];
    rootReplies[root.id].push(p);
  });
  var lastId = all[all.length-1].id;
  feed.innerHTML = anaPosts.map(function(post, idx){
    var replies = rootReplies[post.id] || [];
    var postHtml = chBuildPost(post, all, davaId, post.id===lastId, replies);
    return idx>0 ? '<div class="ch-post-gap"></div>'+postHtml : postHtml;
  }).join('');
  feed.scrollTop = feed.scrollHeight;
}

function startReplyById(pid, davaId){
  var all=DB.get('chatter_'+davaId)||[];
  var post=all.find(function(p){return p.id===pid;});
  if(!post) return;
  startReply(pid, post.yazar||'Avukat', (post.metin||'').slice(0,80));
}

function chBuildReply(reply,all,davaId,isLast){
  var y=reply.yazar||'Avukat';
  var rid=reply.id;
  var rol=reply.rol?'<span class="ch-rr">'+escHtml(reply.rol)+'</span>':'';
  var duz=reply.duzenlemeTarih?'<span style="font-size:10px;color:var(--text3);font-style:italic"> &middot; d&uuml;zenlendi</span>':'';
  var tb=renderTepkiBar(reply,davaId,true);
  // Sub-replies artık rootReplies flat listesinde zaten var, tekrar ekleme
  return '<div class="ch-rply" id="post-'+rid+'">'
    +'<div class="ch-rhead">'
    +chAvatar(y,18)
    +'<span class="ch-rn">'+escHtml(y)+'</span>'
    +rol
    +'<span class="ch-rt">'+fmtDate(reply.tarih)+duz+'</span>'
    +'</div>'
    +chReplyTo(reply.parentYazar,reply.parentMetin)
    +'<div class="ch-rbody" id="cbody-'+rid+'">'+(reply.metin ? escHtml(reply.metin) : '')+'</div>'
    +chRenderEkler(reply.ekler)
    +tb
    +'<div class="ch-ractions" id="cactions-'+rid+'">'
    +'<button class="chatter-btn reply-btn" data-pid="'+rid+'" data-did="'+davaId+'" onclick="startReplyById(this.dataset.pid,this.dataset.did)">&#x21a9; Yan&#x131;tla</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="chatter-btn edit-btn" data-pid="'+rid+'" data-did="'+davaId+'" onclick="startChatterEdit(this.dataset.pid,this.dataset.did)">&#x270f; D&uuml;zenle</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="chatter-btn del-btn" data-pid="'+rid+'" data-did="'+davaId+'" onclick="deletePost(this.dataset.pid,this.dataset.did)">&#x1f5d1; Sil</button>'
    +'</div>'
    +'</div>';
}

// Yanıt sayfalama sistemi: her post için kaç yanıt gösterileceğini tutar
var _chReplyVisible = {};
var CH_REPLY_PAGE = 4; // her seferinde kaç yanıt gösterilecek

function chBuildRepliesSection(replies, all, davaId, pid) {
  var total = replies.length;
  var shown = _chReplyVisible[pid] || CH_REPLY_PAGE;
  shown = Math.min(shown, total);
  var hidden = total - shown;
  // Son "shown" kadar yanıtı göster
  var visible = replies.slice(total - shown);
  var html = '<div class="ch-replies" id="ch-replies-'+pid+'">';
  if (hidden > 0) {
    html += '<button class="ch-more-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="chShowMoreReplies(this.dataset.pid,this.dataset.did)">'
      + hidden + ' yanıt daha gör'
      + '</button>';
  }
  // Flat render: her reply ve sub-reply'ları aynı seviyede
  visible.forEach(function(r) {
    html += chBuildReply(r, all, davaId, false);
  });
  html += '</div>';
  return html;
}

function chShowMoreReplies(pid, davaId) {
  var current = _chReplyVisible[pid] || CH_REPLY_PAGE;
  _chReplyVisible[pid] = current + CH_REPLY_PAGE;
  var all = (DB.get('chatter_' + davaId) || []).slice().sort(function(a,b){return new Date(a.tarih)-new Date(b.tarih);});
  var post = all.find(function(p){return p.id===pid;});
  if (!post) return;
  var postEl = document.getElementById('post-' + pid);
  if (!postEl) return;
  var oldReplies = postEl.querySelector('#ch-replies-' + pid);
  if (!oldReplies) return;
  // Kök post'un tüm zincir yanıtlarını bul (chGetRoot ile)
  var replies = all.filter(function(r){
    if (r.id === pid) return false;
    var root = chGetRoot(r, all);
    return root.id === pid;
  });
  var newHtml = chBuildRepliesSection(replies, all, davaId, pid);
  var tmp = document.createElement('div');
  tmp.innerHTML = newHtml;
  oldReplies.replaceWith(tmp.firstChild);
}

function chBuildPost(post, all, davaId, isLast, repliesOverride){
  var y=post.yazar||'Avukat';
  var pid=post.id;
  var rol=post.rol?'<span class="ch-role">'+escHtml(post.rol)+'</span>':'';
  var duz=post.duzenlemeTarih?'<span style="font-size:10px;color:var(--text3);font-style:italic"> &middot; düzenle</span>':'';
  var lastBadge=isLast?'<span class="ch-last-badge">&#x1f514; Son mesaj</span>':'';
  var tb=renderTepkiBar(post,davaId,false);
  // Dışarıdan geçilen replies varsa kullan, yoksa direkt parentId ile bul
  var replies = repliesOverride !== undefined ? repliesOverride : all.filter(function(r){return r.parentId===pid;});
  var repliesHtml=replies.length ? chBuildRepliesSection(replies,all,davaId,pid) : '';
  return '<div class="ch-post'+(isLast?' ch-last':'')+'" id="post-'+pid+'">'
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:6px">'
    +chAvatar(y,32)
    +'<div style="flex:1;display:flex;align-items:center;gap:6px;flex-wrap:wrap">'
    +'<span class="ch-name">'+escHtml(y)+'</span>'+rol+'<span class="ch-time">'+fmtDate(post.tarih)+duz+'</span>'+lastBadge
    +'</div></div>'
    +chReplyTo(post.parentYazar,post.parentMetin)
    +'<div class="ch-body" id="cbody-'+pid+'">'+(post.metin?escHtml(post.metin):'')+'</div>'
    +chRenderEkler(post.ekler)
    +tb
    +'<div class="ch-actions" id="cactions-'+pid+'">'
    +'<button class="chatter-btn reply-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="startReplyById(this.dataset.pid,this.dataset.did)">&#x21a9; Yan&#x131;tla</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="chatter-btn edit-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="startChatterEdit(this.dataset.pid,this.dataset.did)">&#x270f; D&uuml;zenle</button>'
    +'<span class="ch-btn-sep"></span>'
    +'<button class="chatter-btn del-btn" data-pid="'+pid+'" data-did="'+davaId+'" onclick="deletePost(this.dataset.pid,this.dataset.did)">&#x1f5d1; Sil</button>'
    +'</div>'
    +repliesHtml
    +'</div>';
}

function renderPost(post,all,davaId){return chBuildPost(post,all,davaId,false);}
function chRenderAnaPost(p,d){return chBuildPost(p,[],d,false);}
function chRenderReply(p,d){return chBuildReply(p,[],d,false);}

function scrollToPost(postId) {
  const el = document.getElementById('post-' + postId);
  if (!el) return;
  el.scrollIntoView({behavior:'smooth', block:'center'});
  el.style.background = 'rgba(201,168,76,0.08)';
  setTimeout(() => el.style.background = '', 1500);
}

function startReply(postId, yazarAdi, metin) {
  replyToPostId = postId;
  document.getElementById('chatter-reply-banner').style.display = '';
  document.getElementById('chatter-reply-who').textContent = '↩ ' + yazarAdi;
  document.getElementById('chatter-reply-preview').textContent = metin.slice(0,80) + (metin.length>80?'…':'');
  document.getElementById('chatter-input').focus();
  document.getElementById('chatter-input').placeholder = 'Yanıt yaz...';
}



const TEPKILER = ['👍','❤️','😂','😮','😢','🔥'];

function renderTepkiBar(post, davaId, isReply=false) {
  const tepkiler = post.tepkiler || {};
  const mevcut = Object.entries(tepkiler).map(([emoji, users]) => {
    const sayi = (users||[]).length;
    if (sayi === 0) return '';
    const bende = (users||[]).includes(window.currentUser?.username || 'avukat');
    return `<span onclick="tepkiVer('${post.id}','${davaId}','${emoji}',${isReply})"
      style="display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:12px;font-size:12px;cursor:pointer;transition:all 0.15s;
      background:${bende?'var(--gold-dim)':'var(--bg3)'};border:1px solid ${bende?'var(--gold)':'var(--border)'}"
    >${emoji} ${sayi}</span>`;
  }).filter(Boolean).join('');

  const ekleBtn = `<button onclick="tepkiPanelAc('${post.id}','${davaId}',${isReply})"
    style="background:none;border:1px solid var(--border);border-radius:10px;color:var(--text3);font-size:11px;padding:2px 7px;cursor:pointer;line-height:1.4"
    title="Tepki ekle">+ 😊</button>`;

  return `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:5px" id="tepki-bar-${post.id}">${mevcut}${ekleBtn}</div>`;
}

function tepkiPanelAc(postId, davaId, isReply) {
  const existing = document.getElementById('tepki-panel-' + postId);
  if (existing) { existing.remove(); return; }
  const bar = document.getElementById('tepki-bar-' + postId);
  if (!bar) return;
  const panel = document.createElement('div');
  panel.id = 'tepki-panel-' + postId;
  panel.style.cssText = 'display:flex;gap:6px;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:6px 10px;margin-top:4px;box-shadow:0 4px 16px rgba(0,0,0,0.4)';
  panel.innerHTML = TEPKILER.map(e =>
    `<span onclick="tepkiVer('${postId}','${davaId}','${e}',${isReply});document.getElementById('tepki-panel-${postId}')?.remove()"
      style="font-size:20px;cursor:pointer;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">${e}</span>`
  ).join('');
  bar.insertAdjacentElement('afterend', panel);
  setTimeout(() => panel.remove(), 5000);
}

