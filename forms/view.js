/* 工作台「衛教與表單」分頁裡的表單預覽：多頁並排預覽、縮放，以及衛教與表單共用的列印（A4、邊界 0）。
   由 index.html 接在 edu/edu.js 之後載入；表單資料 FORMS 與側欄（renderRail、showItem）在 edu/edu.js，HTML 表單內容在 forms/forms.js。 */
let formZoom = 'fit';
const formView = document.getElementById('form-view');
// 問卷與健康紀錄表沒有圖檔，由 forms/forms.js 即時產生 HTML；預覽時每一頁放進一個 iframe，與列印是同一份內容
const PAGE_W = 794, PAGE_H = 1123;
function formHtmlPages(t){
  const tmp = document.createElement('div');
  tmp.innerHTML = t.html();
  const head = `<!DOCTYPE html><html><head><meta charset="UTF-8">` +
    `<style>${FORMS_CSS}\nhtml,body{margin:0;background:#fff;overflow:hidden;}</style></head><body>`;
  return [...tmp.querySelectorAll('.report-page')].map(pg=> head + pg.outerHTML + '</body></html>');
}
// t：FORMS 裡的一份表單（由 edu/edu.js 的 showItem 呼叫）
function showForm(t){
  document.getElementById('form-title').innerHTML = esc(t.label) + '<span class="sz">A4</span>';
  document.getElementById('form-count').textContent = groupPos() + '　' + t.note;
  if(t.kind === 'html'){
    const docs = formHtmlPages(t);
    formView.innerHTML = docs.map((_, i)=>
      `<div class="fpage"><iframe title="${esc(t.label)} 第 ${i + 1} 頁" width="${PAGE_W}" height="${PAGE_H}" tabindex="-1"></iframe></div>`).join('');
    [...formView.querySelectorAll('iframe')].forEach((f, i)=>{
      const d = f.contentWindow.document;
      d.open(); d.write(docs[i]); d.close();
      // 內容超出一頁時與列印相同，等比例縮進 A4
      fitPrintPages(d);
    });
    applyFormZoom();
    formView.scrollTo(0, 0);
    return;
  }
  formView.innerHTML = t.pages.map((src, i)=> `<img alt="${esc(t.label)} 第 ${i + 1} 頁" ${imgSrcAttr('edu', src)} draggable="false">`).join('');
  const imgs = [...formView.querySelectorAll('img')];
  imgs.forEach(im=> im.style.visibility = 'hidden');
  let left = imgs.length;
  const done = ()=>{
    if(--left > 0) return;
    imgs.forEach(im=> im.style.visibility = '');
    applyFormZoom();
    formView.scrollTo(0, 0);
  };
  imgs.forEach(im=>{
    if(im.complete && im.naturalWidth) done();
    else{ im.addEventListener('load', done, {once:true}); im.addEventListener('error', done, {once:true}); }
  });
}
// 'fit'：所有頁面放進畫面，並排或上下排看哪一種顯示得比較大；數字為實際倍率（並排）
const FORM_GAP = 12;
function formItems(){
  return [...formView.children].map(el=>{
    if(el.tagName === 'IMG') return el.naturalWidth ? {el, w:el.naturalWidth, h:el.naturalHeight} : null;
    if(el.classList.contains('fpage')) return {el, w:PAGE_W, h:PAGE_H};
    return null;
  }).filter(Boolean);
}
function applyFormZoom(){
  const items = formItems();
  const has = items.length > 0;
  ['fzoom-in', 'fzoom-out', 'fzoom-fit'].forEach(id=> document.getElementById(id).disabled = !has);
  if(!has || !formView.clientWidth){ document.getElementById('fzoom-val').textContent = '－'; return; }
  const cs = getComputedStyle(formView);
  const gaps = FORM_GAP * (items.length - 1);
  const aw = formView.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const ah = formView.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const sumW = items.reduce((s, x)=> s + x.w, 0), sumH = items.reduce((s, x)=> s + x.h, 0);
  const maxW = Math.max(...items.map(x=> x.w)), maxH = Math.max(...items.map(x=> x.h));
  const row = Math.min((aw - gaps) / sumW, ah / maxH);
  const col = Math.min(aw / maxW, (ah - gaps) / sumH);
  let s, vertical = false;
  if(typeof formZoom === 'number') s = formZoom;
  // 窄螢幕（手機）改成每頁寬度填滿、上下捲動，否則整頁塞進畫面會小到看不清楚
  else if(innerWidth < 860){ vertical = true; s = aw / maxW; }
  else{ vertical = col > row * 1.05; s = vertical ? col : row; }
  formView.classList.toggle('vertical', vertical);
  items.forEach(x=>{
    const w = Math.max(60, Math.round(x.w * s)), h = Math.round(x.h * w / x.w);
    x.el.style.width = w + 'px';
    if(x.el.tagName !== 'IMG'){
      x.el.style.height = h + 'px';
      x.el.firstElementChild.style.transform = `scale(${w / x.w})`;
    }
  });
  const pct = Math.round(s * 100) + '%';
  document.getElementById('fzoom-val').textContent = formZoom === 'fit' ? '整頁 ' + pct : pct;
  document.getElementById('fzoom-fit').setAttribute('aria-pressed', String(formZoom === 'fit'));
  formView.classList.toggle('pannable',
    formView.scrollWidth > formView.clientWidth + 1 || formView.scrollHeight > formView.clientHeight + 1);
}
function formZoomStep(dir){
  const x = formItems()[0];
  if(!x) return;
  const cur = x.el.getBoundingClientRect().width / x.w;
  const next = dir > 0 ? ZOOM_STEPS.find(z=> z > cur + 0.01) : [...ZOOM_STEPS].reverse().find(z=> z < cur - 0.01);
  if(next !== undefined){ formZoom = next; applyFormZoom(); }
}
document.getElementById('form-prev').addEventListener('click', ()=> stepItem(-1));
document.getElementById('form-next').addEventListener('click', ()=> stepItem(1));
document.getElementById('fzoom-in').addEventListener('click', ()=> formZoomStep(1));
document.getElementById('fzoom-out').addEventListener('click', ()=> formZoomStep(-1));
document.getElementById('fzoom-fit').addEventListener('click', ()=>{ formZoom = 'fit'; applyFormZoom(); });
document.getElementById('form-max').addEventListener('click', toggleMax);
// 放大後按住預覽拖曳移動；雙擊回到整頁
let fpan = null;
formView.addEventListener('pointerdown', e=>{
  if(e.button !== 0 || !formView.classList.contains('pannable')) return;
  fpan = {x:e.clientX, y:e.clientY, l:formView.scrollLeft, t:formView.scrollTop, id:e.pointerId};
  formView.setPointerCapture(e.pointerId);
  formView.classList.add('panning');
});
formView.addEventListener('pointermove', e=>{
  if(!fpan || e.pointerId !== fpan.id) return;
  formView.scrollLeft = fpan.l - (e.clientX - fpan.x);
  formView.scrollTop = fpan.t - (e.clientY - fpan.y);
});
['pointerup','pointercancel'].forEach(t=> formView.addEventListener(t, ()=>{ fpan = null; formView.classList.remove('panning'); }));
formView.addEventListener('dblclick', ()=>{ formZoom = formZoom === 'fit' ? 1 : 'fit'; applyFormZoom(); });
document.getElementById('form-print').addEventListener('click', ()=>{
  const it = ITEMS[cur];
  if(it && it.kind === 'form') printForm(it.ref);
});
formView.addEventListener('wheel', e=>{
  if(!e.ctrlKey) return;
  e.preventDefault();
  formZoomStep(e.deltaY < 0 ? 1 : -1);
}, {passive:false});
window.addEventListener('resize', ()=>{ if(main.dataset.view === 'edu') applyFormZoom(); });
function printForm(t){
  if(t.kind === 'html'){
    // 每一頁本身就是 A4 大小（794×1123），不必再包一層 .pg
    printHtml(t.html(), t.label, false, FORMS_CSS +
      '\n.report-page{break-after:page; page-break-after:always;}' +
      '\n.report-page:last-child{break-after:auto; page-break-after:auto;}');
    return;
  }
  printImages(t.pages.map(src=> ({src})), t.label);
}

/* ── 列印：A4、邊界 0。直式或橫式依圖片比例自動判斷；兩頁並列的圖（split = 2）拆成兩張紙。
   A5 衛教單的圖本身就是整張 A4 直式（內容在上半頁、下半頁留白），和一般 A4 圖一樣列印，不另外處理 ── */
function loadImg(src){
  return new Promise((ok, bad)=>{ const im = new Image(); im.onload = ()=> ok(im); im.onerror = bad; im.src = src; });
}
async function printImages(pages, title){
  let html = '', landscape = false;
  try{
    const loaded = [];
    for(const pg of pages){ loaded.push({pg, img: await loadImg(pg.src)}); }
    // 每一張紙的長寬比；全部都是橫的才用橫式紙
    landscape = loaded.every(({pg, img})=> (img.naturalWidth / (pg.split || 1)) > img.naturalHeight);
    const PW = landscape ? 297 : 210, PH = landscape ? 210 : 297;
    loaded.forEach(({pg, img})=>{
      const n = pg.split || 1;
      const ar = (img.naturalWidth / n) / img.naturalHeight;
      let w = PW, h = PW / ar;
      if(h > PH){ h = PH; w = PH * ar; }
      for(let k = 0; k < n; k++){
        html += `<div class="pg"><div style="width:${w}mm;height:${h}mm;overflow:hidden">` +
          `<img src="${pg.src}" style="display:block;width:${w*n}mm;height:${h}mm;margin-left:-${w*k}mm"></div></div>`;
      }
    });
  }catch(err){ toast('圖片載入失敗，無法列印。'); return; }
  printHtml(html, title, landscape);
}

// 用隱藏 iframe 列印，只跳出列印對話框。@page margin 為 0，瀏覽器不會加上網址與日期的頁首頁尾。
// css：另外加上的樣式（列印 HTML 表單時傳入），有傳時列印前先把略超出一頁的內容縮進 A4
function printHtml(body, title, landscape, css){
  const PW = landscape ? 297 : 210, PH = landscape ? 210 : 297;
  const old = document.getElementById('print-frame');
  if(old) old.remove();
  const f = document.createElement('iframe');
  f.id = 'print-frame';
  f.style.cssText = 'position:fixed;left:-10000px;top:0;width:900px;height:1200px;border:0;';
  document.body.appendChild(f);
  const d = f.contentWindow.document;
  d.open();
  d.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(title)}</title><style>
    @page{size:A4 ${landscape ? 'landscape' : 'portrait'};margin:0;}
    *{box-sizing:border-box;}
    html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .pg{width:${PW}mm;height:${PH}mm;display:flex;align-items:center;justify-content:center;
      overflow:hidden;break-after:page;page-break-after:always;}
    .pg:last-child{break-after:auto;page-break-after:auto;}
    ${css || ''}
  </style></head><body>${body}</body></html>`);
  d.close();
  if(css) fitPrintPages(d);
  const imgs = [...d.images].filter(i=> !i.complete).map(i=> new Promise(r=>{ i.onload = i.onerror = r; }));
  const prevTitle = document.title;
  Promise.race([Promise.all(imgs), new Promise(r=> setTimeout(r, 15000))]).then(()=> setTimeout(()=>{
    document.title = title;
    f.contentWindow.focus();
    f.contentWindow.print();
    document.title = prevTitle;
    setTimeout(()=>{ if(f.parentNode) f.remove(); }, 60000);
  }, 80));
}

