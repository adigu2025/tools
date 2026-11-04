/* 工作台的衛教圖卡：圖卡與列印表單的資料、左側清單、縮放與拖曳。
   由 index.html 以一般 script 載入，放在工作台主程式（分頁、BASE、recall、main）之後、啟動程式之前；
   列印表單的畫面在 forms/view.js，列印共用的 loadImg、printHtml 也在那裡。 */
/* ── 衛教圖卡與列印表單的資料 ──
   衛教依用途分類。減重治療類的清單即時讀減重系統（以後在減重系統新增圖片，這裡自動出現）；
   傷口照護與檢查類的圖片放在工作台自己的 img/。
   每份衛教可以有多頁（pages），每頁可以是兩頁並列的圖（split = 2，列印時拆成兩張 A4）。 */
// 減重衛教與表單的圖片已移到工作台的 img/，路徑與其他圖片相同
const W = p=> BASE + p;
const EDU_GROUPS = [
  {key:'weight', label:'減重治療'},
  {key:'wound',  label:'傷口照護'},
  {key:'exam',   label:'檢查'},
];
const ICON_DOC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>';
const ICON_BANDAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10.5 10.5h.01M13.5 13.5h.01M13.5 10.5h.01M10.5 13.5h.01"/></svg>';
const ICON_HEAD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M7 20v-3.5A7 7 0 1 1 18.5 11l1.5 3.5h-2v2.5a2 2 0 0 1-2 2h-2V20"/></svg>';
const ICON_US = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M8 3h8l-1.5 6h-5z"/><path d="M5 14a7 7 0 0 0 14 0"/><path d="M8 14a4 4 0 0 0 8 0"/></svg>';
const LOCAL_EDU = [
  {group:'wound', label:'傷口處理衛教', icon:ICON_BANDAGE, pages:[{src:'img/edu-wound-care-1.webp'}, {src:'img/edu-wound-care-2.webp'}]},
  {group:'wound', label:'頭部傷口衛教', icon:ICON_HEAD,    pages:[{src:'img/edu-head-injury-1.webp'}, {src:'img/edu-head-injury-2.webp'}]},
  {group:'exam',  label:'腹部超音波衛教', icon:ICON_US,    pages:[{src:'img/edu-abdominal-us-1.webp'}, {src:'img/edu-abdominal-us-2.webp'}]},
];
function weightEdu(list){
  return reorderEdu(list.map(([label, src, split, icon])=>({group:'weight', label, icon: icon || '', pages:[{src: W(src), split: split || 1}]})));
}
let EDU = weightEdu([
  ['臨床評估','img/edu-clinical-assessment.webp'],
  ['肥胖與代謝症候群','img/edu-obesity-metabolic-syndrome.webp'],
  ['肥胖是日漸嚴重的問題','img/edu-obesity-trend.webp'],
  ['肥胖的成因','img/edu-obesity-causes.webp'],
  ['何時介入與改善方式','img/edu-when-to-intervene.webp'],
  ['治療流程','img/edu-treatment-pathway.webp'],
  ['藥物選擇','img/edu-medication-options.webp'],
  ['用藥衛教','img/edu-medication-guide.webp'],
  ['內視鏡減重','img/edu-endoscopic-treatment.webp'],
  ['針劑注射與保存','img/edu-glp1-injection-storage.webp', 2],
  ['追蹤與監測時程','img/edu-follow-up-schedule.webp']
]).concat(LOCAL_EDU);

// 列印表單：依用途分組。問卷與健康紀錄表由 forms/forms.js 產生空白表（與減重系統共用版面）；
// 地中海飲食、腸泌素同意書、管藥與麻醉紀錄、檢查同意書都是圖片，放在工作台的 img/（檢查同意書由 consent-src/ 輸出）。
const FORM_GROUPS = [
  {key:'weight',  label:'減重門診'},
  {key:'ctrl',    label:'管藥與麻醉紀錄'},
  {key:'consent', label:'檢查與治療同意書'},
];
const C = n=> Array.from({length:n.pages}, (_, i)=> `img/consent-${n.file}-${i + 1}.webp`);
let FORMS = [
  {group:'weight', label:'減重門診評估問卷', note:'共 2 頁', pages:[], kind:'html', html:()=> formScalesHtml()},
  {group:'weight', label:'地中海飲食衛教', note:'共 2 頁', pages:[W('img/diet-mediterranean-1.webp'), W('img/diet-mediterranean-2.webp')], kind:'img'},
  {group:'weight', label:'健康紀錄表', note:'共 2 頁', pages:[], kind:'html', html:()=> formHealthRecordHtml()},
  {group:'weight', label:'腸泌素針劑自費使用同意書', note:'共 2 頁', pages:[W('img/consent-glp1-1.webp'), W('img/consent-glp1-2.webp')], kind:'img'},
  // 管制藥品處方箋為橫式 A4，列印時依圖片比例自動改橫式紙
  {group:'ctrl', label:'Midazolam', note:'共 1 頁', pages:['img/ctrl-midazolam.jpg'], kind:'img'},
  {group:'ctrl', label:'Fentanyl',  note:'共 1 頁', pages:['img/ctrl-fentanyl.jpg'],  kind:'img'},
  {group:'ctrl', label:'Propofol',  note:'共 1 頁', pages:['img/ctrl-propofol.jpg'],  kind:'img'},
  {group:'ctrl', label:'空白管藥單', note:'共 1 頁', pages:['img/ctrl-blank.jpg'],     kind:'img'},
  {group:'ctrl', label:'麻醉紀錄表', note:'共 1 頁', pages:['img/anesthesia-record.jpg'], kind:'img'},
].concat([
  {label:'胃鏡同意書',       file:'gastroscopy', pages:2},
  {label:'大腸鏡同意書',     file:'colonoscopy', pages:2},
  {label:'膠囊內視鏡同意書', file:'capsule',     pages:2},
  {label:'輕中度鎮靜同意書', file:'sedation',    pages:2},
  {label:'麻醉同意書',       file:'anesthesia',  pages:3},
  {label:'冷凝刀同意書',     file:'het',         pages:2},
  {label:'抗逆流結紮術同意書', file:'arbl',        pages:2},
  {label:'甲狀腺穿刺同意書', file:'thyroid-fna', pages:1},
].map(n=> ({group:'consent', label:n.label, note:`共 ${n.pages} 頁`, pages:C(n), kind:'img'})));

let eduIdx = 0, eduPage = 0;
let eduGroup = recall('hub-edu-group', 'weight');
if(!EDU_GROUPS.some(g=> g.key === eduGroup)) eduGroup = 'weight';
const eduKey = p=> p.group + '|' + p.label;

function reorderEdu(list){
  const out = list.slice();
  EDU_AFTER.forEach(([move, after])=>{
    const i = out.findIndex(p=> p.label === move);
    if(i < 0 || !out.some(p=> p.label === after)) return;
    const [item] = out.splice(i, 1);
    out.splice(out.findIndex(p=> p.label === after) + 1, 0, item);
  });
  return out;
}

function pullWeightData(){
  try{
    const list = EDU_PDF_PAGES;
    if(Array.isArray(list) && list.length){
      const cur = EDU[eduIdx] && eduKey(EDU[eduIdx]);
      EDU = weightEdu(list.map(p=> [p.label, p.src, p.printSplit, p.icon])).concat(LOCAL_EDU);
      const keep = EDU.findIndex(p=> eduKey(p) === cur);
      eduIdx = keep >= 0 ? keep : 0;
      renderRail();
    }
  }catch(err){}
}

// 側欄：上方是分類切換，下方列出該類的衛教；多頁的衛教標示頁數
let railFirst = true;
function renderRail(){
  if(railFirst){
    // 第一次顯示時回到上次看的那份
    const last = recall('hub-edu-key', '');
    const i = EDU.findIndex(p=> eduKey(p) === last);
    if(i >= 0){ eduIdx = i; eduGroup = EDU[i].group; }
  }
  railFirst = false;
  if(!EDU[eduIdx] || EDU[eduIdx].group !== eduGroup){
    const first = EDU.findIndex(p=> p.group === eduGroup);
    eduIdx = first >= 0 ? first : 0;
    eduPage = 0;
  }
  const rail = document.getElementById('edu-rail');
  const tabs = EDU_GROUPS.map(g=>{
    const n = EDU.filter(p=> p.group === g.key).length;
    return `<button class="edu-group press" data-g="${g.key}" aria-pressed="${g.key === eduGroup}">${esc(g.label)}<span class="n">${n}</span></button>`;
  }).join('');
  const items = EDU.map((p, i)=> p.group !== eduGroup ? '' :
    `<button class="edu-item press" data-i="${i}" aria-current="${i === eduIdx}"><span class="ico">${p.icon || ICON_DOC}</span>` +
    `<span class="lb">${esc(p.label)}</span>${p.pages.length > 1 ? `<span class="pg">${p.pages.length} 頁</span>` : ''}</button>`
  ).join('');
  rail.innerHTML = `<div class="edu-groups" role="tablist" aria-label="衛教分類">${tabs}</div><div class="edu-list">${items}</div>`;
  rail.querySelectorAll('.edu-group').forEach(b=> b.addEventListener('click', ()=>{
    eduGroup = b.dataset.g;
    store('hub-edu-group', eduGroup);
    renderRail();
  }));
  rail.querySelectorAll('.edu-item').forEach(b=> b.addEventListener('click', ()=> showEdu(+b.dataset.i, 0)));
  showEdu(eduIdx, eduPage);
}
function showEdu(i, page){
  eduIdx = (i + EDU.length) % EDU.length;
  const p = EDU[eduIdx];
  eduPage = Math.max(0, Math.min(page || 0, p.pages.length - 1));
  const inGroup = EDU.filter(x=> x.group === p.group);
  const pos = inGroup.indexOf(p) + 1;
  document.getElementById('edu-title').textContent = p.label;
  document.getElementById('edu-count').textContent = pos + '／' + inGroup.length +
    (p.pages.length > 1 ? `　第 ${eduPage + 1}／${p.pages.length} 頁` : '');
  document.querySelectorAll('#edu-rail .edu-item').forEach(b=> b.setAttribute('aria-current', String(+b.dataset.i === eduIdx)));
  store('hub-edu-key', eduKey(p));
  const src = p.pages[eduPage].src;
  const shown = main.dataset.view === 'edu';
  eduView.innerHTML = `<img alt="${esc(p.label)}" ${imgSrcAttr('edu', src)} draggable="false">`;
  const img = eduView.querySelector('img');
  img.style.visibility = 'hidden';
  const ready = ()=>{ img.style.visibility = ''; applyZoom(); eduView.scrollTo(0, 0); };
  if(img.complete && img.naturalWidth) ready();
  else img.addEventListener('load', ready, {once:true});
  img.addEventListener('error', ()=>{ eduView.innerHTML = '<div class="msg">圖片載入失敗，請確認網路連線。</div>'; });
  // 預先載入下一頁
  const nxt = p.pages[eduPage + 1] || (inGroup[pos % inGroup.length] || p).pages[0];
  if(nxt && shown){ const pre = new Image(); pre.src = nxt.src; }
}
// 上下張：先翻完同一份的各頁，再到同一分類的下一份（到底回第一份）
function stepEdu(d){
  const p = EDU[eduIdx];
  const np = eduPage + d;
  if(np >= 0 && np < p.pages.length){ showEdu(eduIdx, np); return; }
  const inGroup = EDU.map((x, i)=> x.group === p.group ? i : -1).filter(i=> i >= 0);
  const at = inGroup.indexOf(eduIdx);
  const ni = inGroup[(at + d + inGroup.length) % inGroup.length];
  showEdu(ni, d > 0 ? 0 : EDU[ni].pages.length - 1);
}

/* ── 縮放：與減重系統相同的倍率，另外多一個「寬度」模式。
   'fit' 整張圖放進畫面、'width' 寬度填滿、數字為實際倍率。切換圖卡時沿用目前設定。 ── */
const eduView = document.getElementById('edu-view');
const ZOOM_STEPS = [0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.25, 1.5, 2, 2.5, 3];
let eduZoom = recall('hub-edu-zoom', 'fit');
if(!(eduZoom === 'fit' || eduZoom === 'width' || typeof eduZoom === 'number')) eduZoom = 'fit';

function fitScale(img, mode){
  const aw = eduView.clientWidth - 12, ah = eduView.clientHeight - 12;
  return mode === 'width' ? aw / img.naturalWidth : Math.min(aw / img.naturalWidth, ah / img.naturalHeight);
}
function currentScale(){
  const img = eduView.querySelector('img');
  return (img && img.naturalWidth) ? img.getBoundingClientRect().width / img.naturalWidth : 1;
}
function applyZoom(){
  const img = eduView.querySelector('img');
  if(!img || !img.naturalWidth || !eduView.clientWidth) return;
  const s = typeof eduZoom === 'number' ? eduZoom : fitScale(img, eduZoom);
  img.style.width = Math.max(80, Math.round(img.naturalWidth * s)) + 'px';
  const pct = Math.round(s * 100) + '%';
  document.getElementById('zoom-val').textContent =
    eduZoom === 'fit' ? '整頁 ' + pct : eduZoom === 'width' ? '寬度 ' + pct : pct;
  document.getElementById('zoom-fit').setAttribute('aria-pressed', String(eduZoom === 'fit'));
  document.getElementById('zoom-width').setAttribute('aria-pressed', String(eduZoom === 'width'));
  eduView.classList.toggle('pannable',
    eduView.scrollWidth > eduView.clientWidth + 1 || eduView.scrollHeight > eduView.clientHeight + 1);
}
// 以畫面中心為基準縮放，放大後不會跳到左上角
function setZoom(z){
  const cx = (eduView.scrollLeft + eduView.clientWidth / 2) / Math.max(1, eduView.scrollWidth);
  const cy = (eduView.scrollTop + eduView.clientHeight / 2) / Math.max(1, eduView.scrollHeight);
  eduZoom = z;
  store('hub-edu-zoom', z);
  applyZoom();
  eduView.scrollLeft = cx * eduView.scrollWidth - eduView.clientWidth / 2;
  eduView.scrollTop = cy * eduView.scrollHeight - eduView.clientHeight / 2;
}
function zoomStep(dir){
  const cur = typeof eduZoom === 'number' ? eduZoom : currentScale();
  const next = dir > 0 ? ZOOM_STEPS.find(z=> z > cur + 0.01) : [...ZOOM_STEPS].reverse().find(z=> z < cur - 0.01);
  if(next !== undefined) setZoom(next);
}
function toggleMax(){
  const on = document.body.classList.toggle('edu-max');
  ['edu-max', 'form-max'].forEach(id=>{
    const b = document.getElementById(id);
    b.querySelector('span').textContent = on ? '結束最大化' : '最大化';
    b.setAttribute('aria-pressed', String(on));
  });
  setTimeout(()=>{ applyZoom(); applyFormZoom(); }, 0);
}
window.addEventListener('resize', ()=>{ if(main.dataset.view === 'edu') applyZoom(); });

// Ctrl＋滾輪縮放；放大後按住圖片拖曳移動
eduView.addEventListener('wheel', e=>{
  if(!e.ctrlKey) return;
  e.preventDefault();
  zoomStep(e.deltaY < 0 ? 1 : -1);
}, {passive:false});
let pan = null;
eduView.addEventListener('pointerdown', e=>{
  if(e.button !== 0 || !eduView.classList.contains('pannable')) return;
  pan = {x:e.clientX, y:e.clientY, l:eduView.scrollLeft, t:eduView.scrollTop, id:e.pointerId};
  eduView.setPointerCapture(e.pointerId);
  eduView.classList.add('panning');
});
eduView.addEventListener('pointermove', e=>{
  if(!pan || e.pointerId !== pan.id) return;
  eduView.scrollLeft = pan.l - (e.clientX - pan.x);
  eduView.scrollTop = pan.t - (e.clientY - pan.y);
});
// 雙擊圖片在「整頁」與「寬度」之間切換
eduView.addEventListener('dblclick', ()=> setZoom(eduZoom === 'fit' ? 'width' : 'fit'));
['pointerup','pointercancel'].forEach(t=> eduView.addEventListener(t, ()=>{ pan = null; eduView.classList.remove('panning'); }));

document.getElementById('edu-prev').addEventListener('click', ()=> stepEdu(-1));
document.getElementById('edu-next').addEventListener('click', ()=> stepEdu(1));
document.getElementById('zoom-in').addEventListener('click', ()=> zoomStep(1));
document.getElementById('zoom-out').addEventListener('click', ()=> zoomStep(-1));
document.getElementById('zoom-fit').addEventListener('click', ()=> setZoom('fit'));
document.getElementById('zoom-width').addEventListener('click', ()=> setZoom('width'));
document.getElementById('edu-max').addEventListener('click', toggleMax);
document.getElementById('edu-print').addEventListener('click', ()=>{
  const p = EDU[eduIdx];
  printImages(p.pages, p.label);
});
