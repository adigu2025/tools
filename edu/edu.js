/* 工作台的「衛教與表單」分頁：圖卡與列印表單的資料、合併的左側清單、圖卡的縮放與拖曳、多份一起列印。
   由 index.html 以一般 script 載入，放在工作台主程式（分頁、BASE、recall、main）之後、啟動程式之前；
   表單的預覽區在 forms/view.js（側欄點到表單時由 showItem 呼叫 showForm），列印共用的 loadImg、printImages、printHtml 也在那裡。 */
/* ── 衛教圖卡與列印表單的資料 ──
   衛教依用途分類，同一類再依圖卡角落的系列與編號分小節（例如減重的「療程 01 至 04」），側欄順序與圖卡編號一致。
   清單只在這裡維護一份；側欄名稱一律用圖卡上的標題，在診間口頭說「點那張」時對得上。
   每份衛教可以有多頁（pages），每頁可以是兩頁並列的圖（split = 2，列印時拆成兩張 A4）。
   第 6 欄寫 'A5' 的是 A5 衛教單：圖是整張 A4 直式、內容只在上半頁（210 × 148.5 mm），列印時就是一般 A4 直式，
   紙匣放 A5 紙、長邊先進紙，印出來就是一張 A5。側欄與標題都會註記 A4 或 A5。A5 版面原始檔在 edu-src/a5.html。
   圖卡原始檔：減重「用藥 02」與「檢查與治療」類自製圖卡的版面在 edu-src/，改文字後重新輸出圖片。 */
const W = p=> BASE + p;
// 「衛教與表單」分頁的分類：衛教圖卡與列印表單合併在同一個側欄，同一類先列衛教、再列表單。
// 減重門診的衛教與表單併成一類（初診時衛教、問卷、同意書會一起用到）；檢查的衛教與同意書項目多，分成兩類。
const EDU_GROUPS = [
  {key:'weight',  label:'減重門診'},
  {key:'exam',    label:'檢查衛教'},
  {key:'consent', label:'檢查同意書'},
  {key:'ctrl',    label:'管藥與麻醉'},
  {key:'disease', label:'疾病衛教'},
  {key:'wound',   label:'傷口照護'},
];
const svgIcon = d=> `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true">${d}</svg>`;
const ICON_DOC = svgIcon('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>');
const ICON_PRINT = svgIcon('<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>');
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
  leaf:     svgIcon('<path d="M5 19c0-8 5-14 15-15-1 10-7 15-15 15z"/><path d="M5 19l8-8"/>'),
  liver:    svgIcon('<path d="M3 9c0-3 3-5 8-5 5 0 10 1 10 5 0 5-6 10-11 10-4 0-7-5-7-10z"/><path d="M11 4v8"/>'),
  kidney:   svgIcon('<path d="M14 4c4 0 6 4 6 8s-2 8-6 8c-3 0-4-2-4-4 0-1.5 1-2.5 1-4s-1-2.5-1-4c0-2 1-4 4-4z"/><path d="M10 12H5v8"/>'),
  heart:    svgIcon('<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><path d="M6 12h3l1.5-3 2 6 1.5-3H18"/>'),
  drop:     svgIcon('<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>'),
  form:     svgIcon('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3"/><path d="M8.5 10.5l1.5 1.5 2.5-2.5M14 11h2M8.5 16h7"/>'),
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
  ['weight', '認識肥胖', '何時該開始治療', ICON.light,     ['img/edu-when-to-intervene.webp']],
  ['weight', '用藥',     '減重藥物怎麼選',   ICON.pill,     ['img/edu-medication-options.webp']],
  // 2026/11 由「用藥注意事項」與「針劑注射與保存」合併；瑞倍適服法移到「減重藥物怎麼選」
  ['weight', '用藥',     '腸泌素針劑怎麼打', ICON.pen,      ['img/edu-glp1-guide-1.webp', 'img/edu-glp1-guide-2.webp']],
  // 地中海飲食衛教原本放在列印表單，合併後歸到減重衛教
  ['weight', '飲食',     '地中海飲食衛教',   ICON.leaf,     ['img/diet-mediterranean-1.webp', 'img/diet-mediterranean-2.webp']],
  ['exam',   '檢查前',   '胃鏡檢查前須知', ICON.stomach,   ['img/edu-a5-gastroscopy-prep.webp'], 'A5'],
  // 保可淨清腸說明：大腸鏡現行紙本的備份（保可淨用法與飲食控制），原檔是 PDF，不修改
  ['exam',   '檢查前',   '保可淨清腸說明', ICON.scope, ['img/edu-colonoscopy-bowel-prep-1.webp', 'img/edu-colonoscopy-bowel-prep-2.webp']],
  ['exam',   '檢查前',   '大腸鏡檢查前須知', ICON.scope,    ['img/edu-a5-colonoscopy-prep.webp'], 'A5'],
  ['exam',   '檢查前',   '腹部超音波衛教',   ICON.us,       ['img/edu-a5-abdominal-us.webp'], 'A5'],
  ['exam',   '檢查後',   '腸胃鏡檢查後須知', ICON.scope,    ['img/edu-a5-endoscopy-after.webp'], 'A5'],
  ['exam',   '治療後',   '瘜肉切除術後',     ICON.polyp,    ['img/edu-a5-polypectomy-after.webp'], 'A5'],
  ['exam',   '治療後',   '冷凝刀痔瘡治療後', ICON.snow,     ['img/edu-a5-het-after.webp'], 'A5'],
  ['exam',   '治療後',   '抗逆流結紮術後',   ICON.band,     ['img/edu-a5-arbl-after.webp'], 'A5'],
  ['exam',   '用藥',     '幽門桿菌除菌治療', ICON.germ,     ['img/edu-a5-hp-eradication.webp'], 'A5'],
  // 疾病衛教（2026/11 新增，A5）：原始檔在 edu-src/a5.html，右下角放官方 LINE QR code
  ['disease', '肝膽',     '膽結石、膽砂',     ICON.liver,    ['img/edu-a5-gallstone.webp'], 'A5'],
  ['disease', '肝膽',     '膽囊瘜肉',         ICON.liver,    ['img/edu-a5-gb-polyp.webp'], 'A5'],
  ['disease', '肝膽',     '脂肪肝',           ICON.liver,    ['img/edu-a5-fatty-liver.webp'], 'A5'],
  ['disease', '腸胃',     '胃食道逆流',       ICON.stomach,  ['img/edu-a5-gerd.webp'], 'A5'],
  ['disease', '腸胃',     '急性腸胃炎',       ICON.germ,     ['img/edu-a5-gastroenteritis.webp'], 'A5'],
  ['disease', '腸胃',     '痔瘡分級與治療',   ICON.polyp,    ['img/edu-a5-hemorrhoids.webp'], 'A5'],
  ['disease', '腎臟',     '腎結石',           ICON.kidney,   ['img/edu-a5-kidney-stone.webp'], 'A5'],
  ['disease', '腎臟',     '腎水腫',           ICON.kidney,   ['img/edu-a5-hydronephrosis.webp'], 'A5'],
  ['disease', '慢性病',   '高血壓與 722 量測', ICON.heart,   ['img/edu-a5-hypertension.webp'], 'A5'],
  ['disease', '慢性病',   '糖尿病前期與糖尿病', ICON.drop,   ['img/edu-a5-diabetes.webp'], 'A5'],
  ['disease', '慢性病',   '膽固醇與三酸甘油酯', ICON.drop,   ['img/edu-a5-dyslipidemia.webp'], 'A5'],
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

// 列印表單：問卷與健康紀錄表由 forms/forms.js 產生空白表（與減重系統共用版面）；
// 腸泌素同意書、管藥與麻醉紀錄、檢查同意書都是圖片，放在工作台的 img/（檢查同意書由 consent-src/ 輸出）。
// group 對應上方 EDU_GROUPS；sec 是側欄小標。
const C = n=> Array.from({length:n.pages}, (_, i)=> `img/consent-${n.file}-${i + 1}.webp`);
let FORMS = [
  {group:'weight', sec:'表單', label:'減重門診評估問卷', note:'共 2 頁', pages:[], kind:'html', html:()=> formScalesHtml()},
  {group:'weight', sec:'表單', label:'健康紀錄表', note:'共 2 頁', pages:[], kind:'html', html:()=> formHealthRecordHtml()},
  {group:'weight', sec:'表單', label:'腸泌素自費同意書', note:'共 2 頁', pages:[W('img/consent-glp1-1.webp'), W('img/consent-glp1-2.webp')], kind:'img'},
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
  {label:'抗逆流結紮同意書', file:'arbl',         pages:2},
  {label:'甲狀腺穿刺同意書', file:'thyroid-fna', pages:1},
].map(n=> ({group:'consent', label:n.label, note:`共 ${n.pages} 頁`, pages:C(n), kind:'img'})));

// 側欄的完整清單：同一分類先列衛教圖卡、再列表單，切換、翻頁、多份列印都用這一份
const ITEMS = EDU_GROUPS.flatMap(g=> [
  ...EDU.filter(p=> p.group === g.key).map(p=> ({kind:'edu', group:g.key, sec:p.sec, label:p.label, icon:p.icon, size:p.size, ref:p})),
  ...FORMS.filter(f=> f.group === g.key).map(f=> ({kind:'form', group:g.key, sec:f.sec || '', label:f.label, icon:ICON.form, size:'A4', ref:f})),
]);
// 同名的 A4、A5 兩版要分得開，鍵值帶紙張大小
const itemKey = it=> it.kind + '|' + it.group + '|' + it.label + '|' + it.size;
// 印出的張數：衛教兩頁並列的圖算兩張；表單照頁數
const itemSheets = it=> it.kind === 'edu' ? sheetCount(it.ref) : (it.ref.kind === 'img' ? it.ref.pages.length : +(it.ref.note.match(/\d+/) || [1])[0]);
// 多份一起列印只收圖片；問卷與健康紀錄表是即時產生的 HTML，要單獨列印
const canPick = it=> it.kind === 'edu' || it.ref.kind === 'img';

let cur = 0, eduIdx = 0, eduPage = 0, shownKey = '';
let eduGroup = recall('hub-edu-group', 'weight');
if(!EDU_GROUPS.some(g=> g.key === eduGroup)) eduGroup = 'weight';

// 多份一起列印：勾選模式下，點清單是勾選或取消，不切換項目；可以跨分類勾選，依清單順序印出
let pickMode = false;
const picked = new Set();

// 側欄：上方是分類切換，下方列出該類的衛教與表單（依系列分小標），最下方是多份列印
// 桌機版的清單浮在側欄右邊（半透明，蓋在預覽左側留白上，預覽不會移動）；再按一次目前的分類可收起
let railFirst = true;
let railFly = recall('hub-edu-fly', true) !== false;
function renderRail(){
  const prev = cur;
  if(railFirst){
    // 第一次顯示時回到上次看的那份（找不到就從該類第一份開始）
    const last = recall('hub-edu-key', '');
    const i = ITEMS.findIndex(it=> itemKey(it) === last);
    if(i >= 0){ cur = i; eduGroup = ITEMS[i].group; }
  }
  railFirst = false;
  if(!ITEMS[cur] || ITEMS[cur].group !== eduGroup){
    const first = ITEMS.findIndex(it=> it.group === eduGroup);
    cur = first >= 0 ? first : 0;
    eduPage = 0;
  }
  const rail = document.getElementById('edu-rail');
  // 重畫清單（勾選模式每勾一份都會重畫）時保留捲動位置
  const oldList = rail.querySelector('.edu-list');
  const keepTop = oldList && oldList.dataset.g === eduGroup ? oldList.scrollTop : 0;
  const tabs = EDU_GROUPS.map(g=>{
    const n = ITEMS.filter(it=> it.group === g.key).length;
    const k = ITEMS.filter(it=> it.group === g.key && picked.has(itemKey(it))).length;
    return `<button class="edu-group press" data-g="${g.key}" aria-pressed="${g.key === eduGroup}">${esc(g.label)}` +
      `<span class="n">${pickMode && k ? '已選 ' + k : n}</span></button>`;
  }).join('');
  let sec = null;
  const items = ITEMS.map((it, i)=>{
    if(it.group !== eduGroup) return '';
    const head = (it.sec && it.sec !== sec) ? `<div class="edu-sec">${esc(it.sec)}</div>` : '';
    sec = it.sec;
    const n = itemSheets(it);
    const on = picked.has(itemKey(it));
    const ok = canPick(it);
    const lead = pickMode ? `<span class="ck${ok ? '' : ' off'}" aria-hidden="true">${on ? '✓' : ''}</span>` : `<span class="ico">${it.icon || ICON_DOC}</span>`;
    return head + `<button class="edu-item press${pickMode ? ' picking' : ''}${pickMode && !ok ? ' nopick' : ''}" data-i="${i}" aria-current="${!pickMode && i === cur}"` +
      (pickMode ? ` aria-pressed="${on}"` : '') + (pickMode && !ok ? ' title="這份表單由系統產生，請單獨列印"' : '') +
      `>${lead}<span class="lb">${esc(it.label)}</span>${sizeTag(it)}${n > 1 ? `<span class="pg">${n} 張</span>` : ''}</button>`;
  }).join('');
  // 多份一起列印放在最上方，捲動清單時固定在側欄頂端
  const g = EDU_GROUPS.find(x=> x.key === eduGroup);
  const flyHead = `<div class="edu-fly-head"><b>${esc(g ? g.label : '')}</b>` +
    `<button class="fly-x press" type="button" title="收起清單（再按一次分類可展開）" aria-label="收起清單">‹</button></div>`;
  rail.classList.toggle('fly-off', !railFly);
  rail.innerHTML = `<div class="edu-pick${pickMode ? ' on' : ''}">${pickBar()}</div>` +
    `<div class="edu-groups" role="tablist" aria-label="衛教與表單分類">${tabs}</div>` +
    `<div class="edu-list" data-g="${eduGroup}">${flyHead}${items}</div>`;
  rail.querySelector('.edu-list').scrollTop = keepTop;
  const setFly = on=>{ railFly = on; store('hub-edu-fly', on); rail.classList.toggle('fly-off', !on); };
  rail.querySelector('.fly-x').addEventListener('click', ()=> setFly(false));
  rail.querySelectorAll('.edu-group').forEach(b=> b.addEventListener('click', ()=>{
    // 再按一次目前的分類：收起或展開清單；換分類時一律展開
    if(b.dataset.g === eduGroup){ setFly(!railFly); return; }
    eduGroup = b.dataset.g;
    store('hub-edu-group', eduGroup);
    railFly = true; store('hub-edu-fly', true);
    renderRail();
  }));
  rail.querySelectorAll('.edu-item').forEach(b=> b.addEventListener('click', ()=>{
    const i = +b.dataset.i;
    if(!pickMode){ showItem(i, 0); return; }
    if(!canPick(ITEMS[i])){ toast('「' + ITEMS[i].label + '」由系統產生，請點選後單獨列印。'); return; }
    const k = itemKey(ITEMS[i]);
    picked.has(k) ? picked.delete(k) : picked.add(k);
    renderRail();
  }));
  const on = document.getElementById('pick-on');
  if(on) on.addEventListener('click', ()=>{ pickMode = true; renderRail(); });
  const cancel = document.getElementById('pick-cancel');
  if(cancel) cancel.addEventListener('click', ()=>{ pickMode = false; picked.clear(); renderRail(); });
  const go = document.getElementById('pick-print');
  if(go) go.addEventListener('click', printPicked);
  // 勾選模式下只重畫清單；切換分類（目前項目換了）時才換預覽
  if(!pickMode || cur !== prev || shownKey !== itemKey(ITEMS[cur])) showItem(cur, eduPage);
}
function pickBar(){
  if(!pickMode) return `<button class="tbtn pick-on" id="pick-on" title="勾選幾份衛教或表單，一次印出">${ICON_PRINT}多份一起列印</button>`;
  const list = ITEMS.filter(it=> picked.has(itemKey(it)));
  const count = size=> list.filter(it=> it.size === size).reduce((n, it)=> n + itemSheets(it), 0);
  const a4 = count('A4'), a5 = count('A5');
  const sheets = [a4 ? a4 + ' 張 A4' : '', a5 ? a5 + ' 張 A5' : ''].filter(Boolean).join('、');
  // A5 衛教單的圖是整張 A4（內容在上半頁），和 A4 用同一種紙，混在一起印沒有問題
  return `<div class="sum">${list.length ? `已選 ${list.length} 份，共 ${sheets}` : '點選要一起列印的衛教或表單'}</div>` +
    `<div class="acts"><button class="tbtn" id="pick-cancel">取消</button>` +
    `<button class="tbtn pri" id="pick-print"${list.length ? '' : ' disabled'}>列印</button></div>`;
}
// 雙面列印提醒：選到 A5 衛教單，或任何一份 A4 是奇數頁，就在列印視窗打開前提醒取消雙面。
// A5 紙走雙面會印出空白；奇數頁開著雙面，下一份會印到它的背面。網頁無法替使用者取消雙面（Chrome 會記住上一次的設定），只能提醒。
// 提醒先顯示 1.5 秒再打開列印視窗，否則會被列印視窗蓋住
function duplexReason(items){
  const a5 = items.filter(it=> it.size === 'A5');
  if(a5.length) return '這次有 A5 衛教單，開著雙面會印出空白頁';
  const odd = items.filter(it=> itemSheets(it) % 2 === 1);
  if(!odd.length) return '';
  if(items.length === 1){
    const n = itemSheets(odd[0]);
    return n === 1 ? '這份只有 1 頁，請用單面列印' : `這份共 ${n} 頁（奇數），請用單面列印`;
  }
  // 奇數頁的那份後面還有別份，開著雙面時下一份會接著印在它的背面；排在最後就只提醒用單面
  const mid = odd.filter(it=> it !== items[items.length - 1]);
  const name = it=> `「${it.label}」`;
  if(mid.length) return `${name(mid[0])}${odd.length > 1 ? `等 ${odd.length} 份` : ''}是奇數頁，開著雙面，下一份會印到它的背面`;
  return `${name(odd[0])}是奇數頁，請用單面列印`;
}
// 回傳 false 表示上一次的列印還在等提醒，這次不要再印（連按兩下「列印」只出一個列印視窗）
let duplexWaiting = false;
async function duplexWarn(items){
  if(duplexWaiting) return false;
  const why = duplexReason(items);
  if(!why) return true;
  duplexWaiting = true;
  toast('', 'warn', 9000, `<b>請取消勾選『雙面列印』</b><span>${esc(why)}</span>`);
  await new Promise(r=> setTimeout(r, 1500));
  duplexWaiting = false;
  return true;
}
async function printPicked(){
  const list = ITEMS.filter(it=> picked.has(itemKey(it)));
  if(!list.length || !await duplexWarn(list)) return;
  const pages = list.flatMap(it=> it.kind === 'edu' ? it.ref.pages : it.ref.pages.map(src=> ({src})));
  printImages(pages, list.length === 1 ? list[0].label : '衛教與表單 ' + list.length + ' 份');
}
// 目前項目在同一分類裡的位置，例如「3／15」
function groupPos(){
  const it = ITEMS[cur];
  const inGroup = ITEMS.filter(x=> x.group === it.group);
  return (inGroup.indexOf(it) + 1) + '／' + inGroup.length;
}
// 切換項目：衛教圖卡與表單各有自己的預覽區（圖卡一次看一頁，表單多頁並排），依項目種類切換
function showItem(i, page){
  cur = (i + ITEMS.length) % ITEMS.length;
  const it = ITEMS[cur];
  shownKey = itemKey(it);
  store('hub-edu-key', shownKey);
  document.getElementById('pane-edu').dataset.stage = it.kind;
  document.querySelectorAll('#edu-rail .edu-item').forEach(b=> b.setAttribute('aria-current', String(!pickMode && +b.dataset.i === cur)));
  if(it.kind === 'edu') showEdu(it.ref, page);
  else showForm(it.ref);
}
function showEdu(p, page){
  eduIdx = EDU.indexOf(p);
  eduPage = Math.max(0, Math.min(page || 0, p.pages.length - 1));
  const n = sheetCount(p);
  document.getElementById('edu-title').innerHTML = esc(p.label) + sizeTag(p);
  // 多頁的衛教顯示目前第幾頁；兩頁並列的圖（一張圖印成兩張 A4）標示列印張數
  document.getElementById('edu-count').textContent = groupPos() +
    (p.pages.length === 1 && n > 1 ? `　列印 ${n} 張` : '');
  // 多頁的衛教在標題旁列出每一頁的按鈕，不必知道要按「›」才看得到第 2 頁
  const pages = document.getElementById('edu-pages');
  pages.innerHTML = p.pages.length > 1 ? p.pages.map((_, k)=> `<button data-p="${k}" aria-pressed="${k === eduPage}">第 ${k + 1} 頁</button>`).join('') : '';
  pages.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> showEdu(p, +b.dataset.p)));
  const src = p.pages[eduPage].src;
  const shown = main.dataset.view === 'edu';
  eduView.innerHTML = `<img alt="${esc(p.label)}" ${imgSrcAttr('edu', src)} draggable="false">`;
  const img = eduView.querySelector('img');
  img.style.visibility = 'hidden';
  const ready = ()=>{ img.style.visibility = ''; applyZoom(); eduView.scrollTo(0, 0); };
  if(img.complete && img.naturalWidth) ready();
  else img.addEventListener('load', ready, {once:true});
  img.addEventListener('error', ()=>{ eduView.innerHTML = '<div class="msg">圖片載入失敗，請確認網路連線。</div>'; });
  // 預先載入下一頁（下一項是表單就不預載）
  const nx = ITEMS.filter(x=> x.group === ITEMS[cur].group);
  const nextItem = nx[(nx.indexOf(ITEMS[cur]) + 1) % nx.length];
  const nxt = p.pages[eduPage + 1] || (nextItem && nextItem.kind === 'edu' ? nextItem.ref.pages[0] : null);
  if(nxt && shown){ const pre = new Image(); pre.src = nxt.src; }
}
// 上下張：衛教先翻完同一份的各頁，再到同一分類的下一項（到底回第一項）
function stepItem(d){
  const it = ITEMS[cur];
  if(it.kind === 'edu'){
    const np = eduPage + d;
    if(np >= 0 && np < it.ref.pages.length){ showEdu(it.ref, np); return; }
  }
  const inGroup = ITEMS.map((x, i)=> x.group === it.group ? i : -1).filter(i=> i >= 0);
  const at = inGroup.indexOf(cur);
  const ni = inGroup[(at + d + inGroup.length) % inGroup.length];
  const nIt = ITEMS[ni];
  showItem(ni, d > 0 || nIt.kind !== 'edu' ? 0 : nIt.ref.pages.length - 1);
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

document.getElementById('edu-prev').addEventListener('click', ()=> stepItem(-1));
document.getElementById('edu-next').addEventListener('click', ()=> stepItem(1));
document.getElementById('zoom-in').addEventListener('click', ()=> zoomStep(1));
document.getElementById('zoom-out').addEventListener('click', ()=> zoomStep(-1));
document.getElementById('zoom-fit').addEventListener('click', ()=> setZoom('fit'));
document.getElementById('zoom-width').addEventListener('click', ()=> setZoom('width'));
document.getElementById('edu-max').addEventListener('click', toggleMax);
document.getElementById('edu-print').addEventListener('click', async ()=>{
  const p = EDU[eduIdx];
  if(await duplexWarn([ITEMS[cur]])) printImages(p.pages, p.label);
});
