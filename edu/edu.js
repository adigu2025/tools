/* 工作台的衛教圖卡：圖卡與列印表單的資料、左側清單、縮放與拖曳、多份一起列印。
   由 index.html 以一般 script 載入，放在工作台主程式（分頁、BASE、recall、main）之後、啟動程式之前；
   列印表單的畫面在 forms/view.js，列印共用的 loadImg、printImages、printHtml 也在那裡。 */
/* ── 衛教圖卡與列印表單的資料 ──
   衛教依用途分類，同一類再依圖卡角落的系列與編號分小節（例如減重的「療程 01 至 04」），側欄順序與圖卡編號一致。
   清單只在這裡維護一份；側欄名稱一律用圖卡上的標題，在診間口頭說「點那張」時對得上。
   每份衛教可以有多頁（pages），每頁可以是兩頁並列的圖（split = 2，列印時拆成兩張 A4）。
   第 6 欄寫 'A5' 的是 A5 衛教單：圖是 A4 上半部（210 × 148.5 mm），列印時印在 A4 直式紙的上半部、下半部空白；
   紙匣放 A5 紙、長邊先進紙，印出來就是一張 A5。側欄與標題都會註記 A4 或 A5。A5 版面原始檔在 edu-src/a5.html。
   圖卡原始檔：減重「用藥 02」與「檢查與治療」類自製圖卡的版面在 edu-src/，改文字後重新輸出圖片。 */
const W = p=> BASE + p;
const EDU_GROUPS = [
  {key:'weight', label:'減重治療'},
  {key:'exam',   label:'檢查與治療'},
  {key:'wound',  label:'傷口照護'},
];
const svgIcon = d=> `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true">${d}</svg>`;
const ICON_DOC = svgIcon('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>');
const ICON = {
  assess:   svgIcon('<path d="M5 3v6a4 4 0 0 0 8 0V3"/><path d="M3.5 3H5M13 3h1.5"/><path d="M9 13v2a5 5 0 0 0 9 3"/><circle cx="19" cy="16" r="2.5"/>'),
  path:     svgIcon('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  scope:    svgIcon('<path d="M15 3c-3.9 0-6.5 2.6-6.5 6.5 0 2.5-1 3.2-2.4 4.1C4.7 14.5 3.5 15.6 3.5 18A3 3 0 0 0 9 19.7"/><path d="M9.5 9.5H19a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h-2"/>'),
  calendar: svgIcon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  scale:    svgIcon('<path d="M12 4v17M8.5 21h7M4 7l8-2 8 2"/><path d="M4 7l-2 5a2.5 2.5 0 0 0 5 0z"/><path d="M20 7l-2 5a2.5 2.5 0 0 0 5 0z" transform="translate(-1 0)"/>'),
  globe:    svgIcon('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/>'),
  dna:      svgIcon('<path d="M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12"/><path d="M7 21c0-2 10-2 10 0M8 7h8M8.5 17h7"/>'),
  light:    svgIcon('<rect x="7" y="2" width="10" height="16" rx="3"/><circle cx="12" cy="6" r="1.3"/><circle cx="12" cy="10" r="1.3"/><circle cx="12" cy="14" r="1.3"/><path d="M12 18v4"/>'),
  pill:     svgIcon('<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/>'),
  book:     svgIcon('<path d="M12 6.5C10.5 5 8.5 4.5 6 4.5H3v14h3c2.5 0 4.5.5 6 2 1.5-1.5 3.5-2 6-2h3v-14h-3c-2.5 0-4.5.5-6 2z"/><path d="M12 6.5v14"/>'),
  pen:      svgIcon('<path d="M17.5 3.5l3 3"/><path d="M19 8l-3-3L5.5 15.5 4 20l4.5-1.5z"/><path d="M13 7l4 4"/>'),
  bandage:  svgIcon('<rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)"/><path d="M10.5 10.5h.01M13.5 13.5h.01M13.5 10.5h.01M10.5 13.5h.01"/>'),
  head:     svgIcon('<path d="M7 20v-3.5A7 7 0 1 1 18.5 11l1.5 3.5h-2v2.5a2 2 0 0 1-2 2h-2V20"/>'),
  us:       svgIcon('<path d="M8 3h8l-1.5 6h-5z"/><path d="M5 14a7 7 0 0 0 14 0"/><path d="M8 14a4 4 0 0 0 8 0"/>'),
  stomach:  svgIcon('<path d="M9 3v3c0 2-2 3-3.5 4.5A6 6 0 0 0 11 20c4 0 8-2.5 8-7 0-3-2-4.5-4.5-4.5-1.5 0-2.5.8-3 2"/><path d="M9 3h3"/>'),
  polyp:    svgIcon('<path d="M3 17c3-1 4-4 9-4s6 3 9 4"/><circle cx="12" cy="9" r="3"/><path d="M12 12v1"/>'),
  germ:     svgIcon('<ellipse cx="12" cy="12" rx="6" ry="4" transform="rotate(-30 12 12)"/><path d="M17 8.5c1.5-1 2.5-1 3.5-.5M7 15.5c-1.5 1-2.5 1-3.5.5M16 6c.5-1.5 1.5-2.5 3-3"/>'),
  snow:     svgIcon('<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>'),
  band:     svgIcon('<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v4M12 18v4"/>'),
};
// sec：圖卡角落的系列名稱，同一系列在側欄排在一起並加上小標
const EDU_LIST = [
  ['weight', '療程',     '第一次來減重門診', ICON.assess,   ['img/edu-clinical-assessment.webp']],
  ['weight', '療程',     '治療一步一步來',   ICON.path,     ['img/edu-treatment-pathway.webp']],
  ['weight', '療程',     '內視鏡減重治療',   ICON.scope,    ['img/edu-endoscopic-treatment.webp']],
  ['weight', '療程',     '回診時程',         ICON.calendar, ['img/edu-follow-up-schedule.webp']],
  ['weight', '認識肥胖', '肥胖與代謝症候群', ICON.scale,    ['img/edu-obesity-metabolic-syndrome.webp']],
  ['weight', '認識肥胖', '肥胖越來越常見',   ICON.globe,    ['img/edu-obesity-trend.webp']],
  ['weight', '認識肥胖', '為什麼會胖？',     ICON.dna,      ['img/edu-obesity-causes.webp']],
  ['weight', '認識肥胖', '什麼時候該開始治療', ICON.light,  ['img/edu-when-to-intervene.webp']],
  ['weight', '用藥',     '減重藥物怎麼選',   ICON.pill,     ['img/edu-medication-options.webp']],
  ['weight', '用藥',     '用藥注意事項',     ICON.book,     ['img/edu-medication-guide.webp']],
  ['weight', '用藥',     '針劑注射與保存',   ICON.pen,      [{src:'img/edu-glp1-injection-storage.webp', split:2}]],
  ['exam',   '檢查前',   '胃鏡檢查前注意事項', ICON.stomach, ['img/edu-a5-gastroscopy-prep.webp'], 'A5'],
  // 大腸鏡清腸說明：現行紙本的備份（保可淨用法與飲食控制），原檔是 PDF，不修改
  ['exam',   '檢查前',   '大腸鏡清腸說明（保可淨）', ICON.scope, ['img/edu-colonoscopy-bowel-prep-1.webp', 'img/edu-colonoscopy-bowel-prep-2.webp']],
  ['exam',   '檢查前',   '大腸鏡檢查前注意事項', ICON.scope,  ['img/edu-a5-colonoscopy-prep.webp'], 'A5'],
  ['exam',   '檢查前',   '腹部超音波衛教',   ICON.us,       ['img/edu-a5-abdominal-us.webp'], 'A5'],
  ['exam',   '檢查後',   '胃鏡、大腸鏡檢查後', ICON.scope,    ['img/edu-a5-endoscopy-after.webp'], 'A5'],
  ['exam',   '治療後',   '瘜肉切除術後',     ICON.polyp,    ['img/edu-a5-polypectomy-after.webp'], 'A5'],
  ['exam',   '治療後',   '冷凝刀痔瘡治療後', ICON.snow,     ['img/edu-a5-het-after.webp'], 'A5'],
  ['exam',   '治療後',   '抗逆流結紮術後',   ICON.band,     ['img/edu-a5-arbl-after.webp'], 'A5'],
  ['exam',   '用藥',     '幽門桿菌除菌治療', ICON.germ,     ['img/edu-a5-hp-eradication.webp'], 'A5'],
  ['wound',  '',         '傷口處理衛教',     ICON.bandage,  ['img/edu-wound-care-1.webp', 'img/edu-wound-care-2.webp']],
  ['wound',  '',         '頭部傷口衛教',     ICON.head,     ['img/edu-head-injury-1.webp', 'img/edu-head-injury-2.webp']],
];
const EDU = EDU_LIST.map(([group, sec, label, icon, pages, size])=>{
  const a5 = size === 'A5';
  return {group, sec, label, icon, size: a5 ? 'A5' : 'A4',
    pages: pages.map(p=> typeof p === 'string' ? {src: W(p), split: 1, a5} : {src: W(p.src), split: p.split || 1, a5})};
});
// 實際印出的張數（兩頁並列的圖算兩張）
const sheetCount = p=> p.pages.reduce((n, pg)=> n + (pg.split || 1), 0);
const sizeTag = p=> `<span class="sz${p.size === 'A5' ? ' a5' : ''}">${p.size}</span>`;

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
// 同名的 A4、A5 兩版要分得開，鍵值帶紙張大小
const eduKey = p=> p.group + '|' + p.label + '|' + p.size;


// 多份一起列印：勾選模式下，點清單是勾選或取消，不切換圖卡；可以跨分類勾選，依清單順序印出
let pickMode = false;
const picked = new Set();

// 側欄：上方是分類切換，下方列出該類的衛教（依系列分小標），最下方是多份列印
let railFirst = true;
function renderRail(){
  const prevIdx = eduIdx;
  if(railFirst){
    // 第一次顯示時回到上次看的那份（舊版名稱已改，找不到就從該類第一份開始）
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
    const k = EDU.filter(p=> p.group === g.key && picked.has(eduKey(p))).length;
    return `<button class="edu-group press" data-g="${g.key}" aria-pressed="${g.key === eduGroup}">${esc(g.label)}` +
      `<span class="n">${pickMode && k ? '已選 ' + k : n}</span></button>`;
  }).join('');
  let sec = null;
  const items = EDU.map((p, i)=>{
    if(p.group !== eduGroup) return '';
    const head = (p.sec && p.sec !== sec) ? `<div class="edu-sec">${esc(p.sec)}</div>` : '';
    sec = p.sec;
    const n = sheetCount(p);
    const on = picked.has(eduKey(p));
    const lead = pickMode ? `<span class="ck" aria-hidden="true">${on ? '✓' : ''}</span>` : `<span class="ico">${p.icon || ICON_DOC}</span>`;
    return head + `<button class="edu-item press${pickMode ? ' picking' : ''}" data-i="${i}" aria-current="${!pickMode && i === eduIdx}"` +
      (pickMode ? ` aria-pressed="${on}"` : '') + `>${lead}<span class="lb">${esc(p.label)}</span>${sizeTag(p)}${n > 1 ? `<span class="pg">${n} 張</span>` : ''}</button>`;
  }).join('');
  rail.innerHTML = `<div class="edu-groups" role="tablist" aria-label="衛教分類">${tabs}</div><div class="edu-list">${items}</div>` +
    `<div class="edu-pick">${pickBar()}</div>`;
  rail.querySelectorAll('.edu-group').forEach(b=> b.addEventListener('click', ()=>{
    eduGroup = b.dataset.g;
    store('hub-edu-group', eduGroup);
    renderRail();
  }));
  rail.querySelectorAll('.edu-item').forEach(b=> b.addEventListener('click', ()=>{
    const i = +b.dataset.i;
    if(!pickMode){ showEdu(i, 0); return; }
    const k = eduKey(EDU[i]);
    picked.has(k) ? picked.delete(k) : picked.add(k);
    renderRail();
  }));
  const on = document.getElementById('pick-on');
  if(on) on.addEventListener('click', ()=>{ pickMode = true; renderRail(); });
  const cancel = document.getElementById('pick-cancel');
  if(cancel) cancel.addEventListener('click', ()=>{ pickMode = false; picked.clear(); renderRail(); });
  const go = document.getElementById('pick-print');
  if(go) go.addEventListener('click', printPicked);
  // 勾選模式下只重畫清單；切換分類（目前圖卡換了）時才換圖
  if(!pickMode || eduIdx !== prevIdx || !eduView.querySelector('img')) showEdu(eduIdx, eduPage);
}
function pickBar(){
  if(!pickMode) return `<button class="tbtn" id="pick-on" title="勾選幾份衛教，一次印出">多份一起列印</button>`;
  const list = EDU.filter(p=> picked.has(eduKey(p)));
  const count = size=> list.filter(p=> p.size === size).reduce((n, p)=> n + sheetCount(p), 0);
  const a4 = count('A4'), a5 = count('A5');
  const sheets = [a4 ? a4 + ' 張 A4' : '', a5 ? a5 + ' 張 A5' : ''].filter(Boolean).join('、');
  // A4 與 A5 用不同的紙，混在同一次列印會從同一個紙匣出紙
  const mixed = a4 && a5 ? '<br>A4 與 A5 紙不同，建議分開印' : '';
  return `<div class="sum">${list.length ? `已選 ${list.length} 份，共 ${sheets}${mixed}` : '點選要一起列印的衛教'}</div>` +
    `<div class="acts"><button class="tbtn" id="pick-cancel">取消</button>` +
    `<button class="tbtn pri" id="pick-print"${list.length ? '' : ' disabled'}>列印</button></div>`;
}
function printPicked(){
  const list = EDU.filter(p=> picked.has(eduKey(p)));
  if(!list.length) return;
  printImages(list.flatMap(p=> p.pages), list.length === 1 ? list[0].label : '衛教圖卡 ' + list.length + ' 份');
}
function showEdu(i, page){
  eduIdx = (i + EDU.length) % EDU.length;
  const p = EDU[eduIdx];
  eduPage = Math.max(0, Math.min(page || 0, p.pages.length - 1));
  const inGroup = EDU.filter(x=> x.group === p.group);
  const pos = inGroup.indexOf(p) + 1;
  const n = sheetCount(p);
  document.getElementById('edu-title').innerHTML = esc(p.label) + sizeTag(p);
  // 多頁的衛教顯示目前第幾頁；兩頁並列的圖（一張圖印成兩張 A4）標示列印張數
  document.getElementById('edu-count').textContent = pos + '／' + inGroup.length +
    (p.pages.length === 1 && n > 1 ? `　列印 ${n} 張` : '');
  // 多頁的衛教在標題旁列出每一頁的按鈕，不必知道要按「›」才看得到第 2 頁
  const pages = document.getElementById('edu-pages');
  pages.innerHTML = p.pages.length > 1 ? p.pages.map((_, k)=> `<button data-p="${k}" aria-pressed="${k === eduPage}">第 ${k + 1} 頁</button>`).join('') : '';
  pages.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> showEdu(eduIdx, +b.dataset.p)));
  document.querySelectorAll('#edu-rail .edu-item').forEach(b=> b.setAttribute('aria-current', String(!pickMode && +b.dataset.i === eduIdx)));
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
