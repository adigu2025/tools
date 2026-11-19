/* 工作台主程式：載入各工具（mountView）、分頁切換、快捷鍵、列印（QUOTE_PRINT、CALC_PRINT）、離線快取註冊。
   從 index.html 拆出來（2026-11-18），內容不變；index.html 在 mount.js、forms/forms.js 之後、edu/edu.js 之前載入這一份。
   這裡宣告的 BASE 等常數，後面的 edu/edu.js、forms/view.js 與 index.html 結尾的程式都會用到。 */
/* 報價、減重報告與臨床計算都直接放在工作台裡，不再用 iframe：
   各自的畫面檔（quote/view.html、weight/view.html、calc/view.html）由 mount.js 裝進 #quote-host、#weight-host、#calc-host 的 shadow root，
   樣式與 id 關在裡面，和工作台互不影響。程式以 QD／QB（報價）、WD／WB（減重）、CD／CB（臨床計算）操作自己的畫面與捲動區。
   舊網址 tools/weight/、tools/quote/、clinic-planner 轉到這裡；tools/calc/ 是病人版，與工作台共用同一份畫面與程式。
   以 file:// 開啟時改讀線上版，只剩分頁切換與保留結果。 */
const IS_FILE = location.protocol === 'file:';
const BASE = IS_FILE ? 'https://adigu2025.github.io/tools/' : './';
// 清除時只刪「目前填寫中」的暫存，兩份報告已儲存的紀錄（obesity_records_v1、checkup_records_v1）不動。
const CLEAR_KEYS = {
  quote:  [['local','muzicheng_planner_state_v1']],
  calc:   [['session','muzi-calc-state']],
  weight: [['local','obesity_draft_v1']],
  checkup: [['local','checkup_draft_v1']]
};

const main = document.getElementById('hub-main');
/* 深色模式：主題記在 <html data-theme>（index.html 開頭已依 hub-theme 或系統設定套上）。
   四個工具在 shadow root 裡，外面的選擇器進不去，所以同時把 data-theme 放在各工具的外框，工具樣式用 :host([data-theme="dark"]) 換色票 */
const THEME_HOSTS = ['quote-host', 'calc-host', 'weight-host', 'checkup-host'];
function applyTheme(t){
  document.documentElement.dataset.theme = t;
  THEME_HOSTS.forEach(id=>{ const el = document.getElementById(id); if(el) el.dataset.theme = t; });
}
function toggleTheme(){
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(t);
  try{ localStorage.setItem('hub-theme', JSON.stringify(t)); }catch(err){}
}
applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
document.getElementById('btn-theme').addEventListener('click', toggleTheme);
// 沒選過的話跟著系統設定即時切換
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e=>{
  let t = null; try{ t = JSON.parse(localStorage.getItem('hub-theme')); }catch(err){}
  if(t !== 'dark' && t !== 'light') applyTheme(e.matches ? 'dark' : 'light');
});
const cover = document.getElementById('hub-cover');

/* 報價。QD、QB 是報價程式共用的全域變數；工作台外觀 quote/hub.css 只在這裡加上 */
let QD = null, QB = null;
async function mountQuote(){
  const host = document.getElementById('quote-host');
  try{
    await mountView(host, BASE + 'quote/view.html', {
      css: [BASE + 'quote/hub.css', BASE + 'quote/dark.css'],
      onRoot: root=>{ QD = root; QB = root.getElementById('q-body'); },
      scripts: [BASE + 'quote/data.js', BASE + 'quote/app.js']
    });
  }catch(err){ mountFailed(host, '報價系統', err); return; }
  host.classList.remove('loading');
  if(main.dataset.view === 'quote') QB.focus({preventScroll:true});
}
// 報價單的列印：只印報價這一區（見樣式 body.print-quote）。
// @page 寫在 shadow root 裡不一定有作用，列印時在工作台另外放一份：A4、邊界 0，瀏覽器不會加上網址與日期的頁首頁尾
window.QUOTE_PRINT = ()=>{
  const page = document.createElement('style');
  page.textContent = '@page{size:A4;margin:0;}';
  document.head.appendChild(page);
  document.body.classList.add('print-quote');
  window.print();
  document.body.classList.remove('print-quote');
  page.remove();
};

/* 減重與健檢報告共用的判讀（lab/lab.js）與排版、判讀標準（kit/report-kit.js）。只載入一次，兩份報告都等它好了再裝 */
const sharedReady = loadScripts([BASE + 'lab/lab.js', BASE + 'kit/report-kit.js', BASE + 'kit/keep-words.js']);

/* 減重報告。WD、WB 是減重程式共用的全域變數 */
let WD = null, WB = null, weightReady = false;
async function mountWeight(){
  const host = document.getElementById('weight-host');
  try{
    await sharedReady;
    await mountView(host, BASE + 'weight/view.html', {
      css: [BASE + 'weight/dark.css'],
      onRoot: root=>{ WD = root; WB = root.getElementById('w-body'); },
      scripts: [BASE + 'weight/app.js', BASE + 'weight/report.js']
    });
  }catch(err){ mountFailed(host, '減重報告', err); return; }
  weightReady = true;
  watchChips(WD, ['bmi-value', 'status-pill']);
  updateChips();
  host.classList.remove('loading');
  syncRep();
}

/* 健檢報告。KD、KB 是健檢程式共用的全域變數。
   報告排版與判讀標準在共用的 kit/report-kit.js，不依賴減重報告，減重載入失敗也不受影響 */
let KD = null, KB = null;
async function mountCheckup(){
  const host = document.getElementById('checkup-host');
  try{
    await sharedReady;
    await mountView(host, BASE + 'checkup/view.html', {
      css: [BASE + 'checkup/dark.css'],
      onRoot: root=>{ KD = root; KB = root.getElementById('k-body'); },
      scripts: [BASE + 'checkup/app.js', BASE + 'checkup/report.js']
    });
  }catch(err){ mountFailed(host, '健檢報告', err); return; }
  host.classList.remove('loading');
  syncRep();
}

/* 臨床計算。CD、CB 是計算程式共用的全域變數；工作台外觀 calc/hub.css 只在這裡加上 */
let CD = null, CB = null, calcReady = false;
async function mountCalc(){
  const host = document.getElementById('calc-host');
  try{
    await mountView(host, BASE + 'calc/view.html', {
      css: [BASE + 'calc/hub.css', BASE + 'calc/dark.css'],
      onRoot: root=>{ CD = root; CB = root.getElementById('c-body'); },
      scripts: [BASE + 'calc/rules.js', BASE + 'calc/assess.js', BASE + 'calc/ocr-parse.js', BASE + 'calc/app.js']
    });
  }catch(err){ mountFailed(host, '臨床計算', err); return; }
  calcReady = true;
  watchChips(CD, ['bmi-result', 'bmi-val', 'bmi-badge']);
  splitCalcPanels();
  // 參考資訊區被截圖辨識訊息擠矮（或訊息清掉變高）時重新判斷，不會露出被切掉一半的字
  { const ro = new ResizeObserver(()=> fitSideInfo());
    CD.querySelectorAll('.side-wrap').forEach(w=> ro.observe(w)); }
  // 倍率只在載入與視窗大小改變時計算一次，所有工具共用，切換時字級不跳動
  calcZ = null;
  fitCalc();
  setTimeout(()=>{ calcZ = null; fitCalc(); }, 400);
  // 切換到降血脂或 B 肝用藥時，結果欄才看得到；等面板淡入動畫（0.28 秒，會位移）結束再量
  CD.addEventListener('click', e=>{ if(e.target.closest('.tab, .group-btn')) setTimeout(fitCalc, 320); }, true);
  // 降血脂與 B 肝用藥：上傳截圖帶入數值（程式送出的 input，isTrusted 為 false）或按「重設」後才重新調整倍率。
  // 手動輸入、勾選時不調整：2026-11-17 勾選「已完成 3–6 個月生活型態調整」，結果卡片變高，
  // 先冒出捲軸把畫面往左推，0.5 秒後倍率重算又整個縮放，畫面水平、垂直各跳一次。寧可短暫出現捲軸（hub.css 已預留捲軸寬度）。
  { let t = null; const refit = ()=>{ clearTimeout(t); t = setTimeout(fitCalc, 500); };
    CD.addEventListener('input', e=>{ if(!e.isTrusted && e.target.closest('.rx-panel')) refit(); });
    CD.addEventListener('click', e=>{ if(e.target.closest('.rx-panel [data-reset]')) refit(); }); }
  // 輸入過程不再改變倍率：少數狀態（例如欄位錯誤提示）超出畫面時，寧可短暫出現捲軸，也不讓全部字級跳動
  updateChips();
  host.classList.remove('loading');
  if(main.dataset.view === 'calc') CB.focus({preventScroll:true});
}
function mountFailed(host, name, err){
  console.error(err);
  host.classList.remove('loading');
  host.innerHTML = `<div class="msg" style="padding:40px;text-align:center">${name}載入失敗，請重新整理頁面。</div>`;
}
// 臨床計算「已完成的評估」的列印：只印臨床計算這一區（見樣式 body.print-calc）
// 和 QUOTE_PRINT 一樣在主頁面放一份 @page（邊界 0），shadow root 裡的 @page 不一定有作用
window.CALC_PRINT = ()=>{
  const page = document.createElement('style');
  page.textContent = '@page{size:A4;margin:0;}';
  document.head.appendChild(page);
  document.body.classList.add('print-calc');
  const done = ()=>{ document.body.classList.remove('print-calc'); page.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
  setTimeout(done, 1000);
};
/* ── 分頁切換 ── */
// 分頁還沒打開時先把圖片網址放在 data-src，不佔開頁的頻寬；setView 打開分頁時才換成 src
function imgSrcAttr(view, src){ return (main.dataset.view === view ? 'src' : 'data-src') + `="${src}"`; }
function setView(v){
  cover.hidden = true;
  // 最大化只用在衛教與表單，切到其他分頁時先結束，否則上方分頁列會一直隱藏
  if(document.body.classList.contains('edu-max') && v !== 'edu') toggleMax();
  if(document.body.classList.contains('q-max') && v !== 'quote' && window.Q_EXIT_MAX) Q_EXIT_MAX();
  main.dataset.view = v;
  document.querySelectorAll('.hub-tab').forEach(b=> b.setAttribute('aria-selected', String(b.dataset.view === v)));
  document.getElementById('btn-split').hidden = (v !== 'edu');
  document.body.dataset.view = v;
  // 衛教與表單的圖片在分頁第一次打開時才下載
  document.querySelectorAll('#pane-' + v + ' img[data-src]').forEach(im=>{ im.src = im.dataset.src; im.removeAttribute('data-src'); });
  syncRep();
  if(v === 'edu'){
    const form = document.getElementById('pane-edu').dataset.stage === 'form';
    document.getElementById(form ? 'form-view' : 'edu-view').focus({preventScroll:true});
    setTimeout(()=>{ applyZoom(); applyFormZoom(); }, 0);
  }
  // 頁面重新整理後回到同一個分頁
  store('hub-view', v);
  // 報價的 Ctrl+K、Esc、方向鍵也一樣，焦點要在報價畫面內
  if(v === 'quote' && QB) QB.focus({preventScroll:true});
  // 臨床計算的 ESC、貼上截圖等操作要在焦點位於計算畫面內時才有作用
  if(v === 'calc' && CB) CB.focus({preventScroll:true});
}
const FOOT_HINT = {
  quote:  '/ 或 Ctrl+K 搜尋　Esc 返回選單　右鍵切換自費／免自費',
  calc:   '以上結果僅供臨床參考，實際診斷與治療須由醫師綜合判斷。數值只在本機計算，不會上傳。',
  report: '1 或 2 選擇報告　/ 快速前往',
  weight: '減重報告會自動暫存草稿；上傳的檔案只在這台電腦讀取，不會上傳。按 Esc 回到報告種類。',
  checkup: '健檢報告會自動暫存草稿（不含 PDF 圖片）；上傳的檔案只在這台電腦讀取，不會上傳。按 Esc 回到報告種類。',
  edu:    '/ 搜尋　← → 換張　＋ － 縮放　0 整頁　W 寬度（衛教）　F 最大化　放大後可按住拖曳　按「列印」直接跳出列印對話框'
};
// 個人瀏覽器的小設定（上次的分頁、衛教圖卡與縮放），讀不到就用預設值
function store(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(err){} }
function recall(k, d){ try{ const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; }catch(err){ return d; } }
document.querySelectorAll('.hub-tab').forEach(b=> b.addEventListener('click', ()=> setView(b.dataset.view)));

/* ── Esc 封面（目錄）：任何分頁按 Esc（工具自己沒用到這次 Esc 時）叫出，點目錄、按 1 至 4 或再按 Esc 回去。
   開啟時仍直接進報價（或上次的分頁），封面只在需要時叫出。 */
function openCover(){
  cover.hidden = false;
  const row = cover.querySelector('.cv-row[data-to="' + main.dataset.view + '"]') || cover.querySelector('.cv-row');
  row.focus({preventScroll:true});
  document.getElementById('foot-hint').textContent = '1 至 4 開啟　↑ ↓ 選擇　Enter 開啟　/ 快速前往　Esc 回到原分頁';
}
// 回到原本的分頁（setView 會收起封面，並把焦點放回該工具）
function closeCover(){ setView(main.dataset.view); }
// 常用項目捷徑：q＝報價分類、c＝臨床計算項目、e＝衛教分類、r＝報告種類
const COVER_ACT = {
  q(id){ setView('quote'); const c = QD && QD.querySelector('.cat-card[data-cat="' + id + '"]'); if(c) c.click(); },
  c(id){ setView('calc'); const t = CD && CD.getElementById('tab-' + id); if(t) t.click(); },
  e(g){
    setView('edu');
    if(typeof eduGroup === 'undefined') return;
    if(eduQuery || eduGroup !== g){ const b = document.querySelector('#edu-rail .edu-group[data-g="' + g + '"]'); if(b) b.click(); }
    else if(!railFly) setRailFly(true);
  },
  r(r){ setView('weight'); setRep(r); }
};
cover.addEventListener('click', e=>{
  const sec = e.target.closest('.cv-sec');
  if(sec){ const [k, id] = sec.dataset.act.split(':'); COVER_ACT[k](id); return; }
  const row = e.target.closest('.cv-row');
  if(row) setView(row.dataset.to);
});
// 封面開著時的按鍵：1 至 4 直接開、上下鍵換列、Enter／空白鍵開啟焦點所在的列、Esc 回去
function onCoverKey(e){
  if(e.ctrlKey || e.metaKey || e.altKey) return false;
  const rows = [...cover.querySelectorAll('.cv-row')];
  const k = e.key;
  if(k === 'Escape'){ e.preventDefault(); closeCover(); return true; }
  if(/^[1-4]$/.test(k)){ e.preventDefault(); setView(rows[+k - 1].dataset.to); return true; }
  const i = rows.indexOf(document.activeElement);
  if(k === 'ArrowDown' || k === 'ArrowUp'){
    e.preventDefault();
    const n = i < 0 ? 0 : (i + (k === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
    rows[n].focus();
    return true;
  }
  if((k === 'Enter' || k === ' ') && i >= 0){ e.preventDefault(); setView(rows[i].dataset.to); return true; }
  return false;
}
/* ── 快速前往：在臨床計算、製作報告與 Esc 目錄按 /（報價與衛教的 / 仍是各自的搜尋）。
   清單每次打開時從畫面現有的項目產生：臨床計算的每個項目、目錄上的報價與衛教分類、兩種報告、四個分頁，
   新增計算項目不必回來改這裡。打字即時篩選，↑ ↓ 選、Enter 開、Esc 關。 */
const jumpModal = document.getElementById('jump-modal');
const jumpQ = document.getElementById('jump-q');
const jumpList = document.getElementById('jump-list');
let jumpItems = [], jumpShown = [], jumpSel = 0;
function jumpBuild(){
  const items = [];
  const tabName = {quote:'報價系統', calc:'臨床計算', edu:'衛教與表單', weight:'製作報告'};
  if(CD) CD.querySelectorAll('.tab[data-tool]').forEach(t=>{
    const en = t.querySelector('.tab-en');
    const name = [...t.childNodes].filter(n=> n.nodeType === 3).map(n=> n.textContent).join('').trim();
    items.push({name, en: en ? en.textContent.trim() : '', group: '臨床計算', act: ()=> COVER_ACT.c(t.dataset.tool)});
  });
  const groupOf = {q:'報價系統', e:'衛教與表單', r:'製作報告'};
  cover.querySelectorAll('.cv-sec').forEach(b=>{
    const [k, id] = b.dataset.act.split(':');
    if(k === 'c') return;   // 臨床計算上面已經逐項列過
    items.push({name: b.textContent.trim(), en: '', group: groupOf[k], act: ()=> COVER_ACT[k](id)});
  });
  Object.keys(tabName).forEach(v=> items.push({name: tabName[v], en: '分頁', group: 'Alt＋' + (Object.keys(tabName).indexOf(v) + 1), act: ()=> setView(v)}));
  return items;
}
function jumpRender(){
  const q = jumpQ.value.trim().toLowerCase().replace(/\s+/g, '');
  jumpShown = q ? jumpItems.filter(it=> (it.name + it.en + it.group).toLowerCase().replace(/\s+/g, '').includes(q)) : jumpItems;
  jumpSel = Math.min(jumpSel, Math.max(jumpShown.length - 1, 0));
  jumpList.innerHTML = '';
  if(!jumpShown.length){ const li = document.createElement('li'); li.className = 'none'; li.textContent = '找不到符合的項目'; jumpList.appendChild(li); return; }
  jumpShown.forEach((it, i)=>{
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === jumpSel ? 'true' : 'false');
    li.innerHTML = '<span></span><span class="je"></span><span class="jg"></span>';
    li.children[0].textContent = it.name; li.children[1].textContent = it.en; li.children[2].textContent = it.group;
    li.addEventListener('click', ()=> jumpGo(i));
    jumpList.appendChild(li);
  });
  const on = jumpList.children[jumpSel];
  if(on) on.scrollIntoView({block:'nearest'});
}
function openJump(){
  jumpItems = jumpBuild(); jumpSel = 0; jumpQ.value = '';
  jumpModal.hidden = false; jumpRender(); jumpQ.focus();
}
function closeJump(){ jumpModal.hidden = true; }
function jumpGo(i){
  const it = jumpShown[i];
  if(!it) return;
  closeJump();
  if(!cover.hidden) cover.hidden = true;
  it.act();
}
jumpQ.addEventListener('input', ()=>{ jumpSel = 0; jumpRender(); });
jumpModal.addEventListener('click', e=>{ if(e.target === jumpModal) closeJump(); });
function onJumpKey(e){
  const k = e.key;
  if(k === 'Escape'){ e.preventDefault(); closeJump(); return; }
  if(k === 'ArrowDown' || k === 'ArrowUp'){
    e.preventDefault();
    if(!jumpShown.length) return;
    jumpSel = (jumpSel + (k === 'ArrowDown' ? 1 : jumpShown.length - 1)) % jumpShown.length;
    jumpRender(); return;
  }
  // 注音選字的 Enter 不算開啟
  if(k === 'Enter' && !e.isComposing && e.keyCode !== 229){ e.preventDefault(); jumpGo(jumpSel); }
}

document.querySelectorAll('[data-go]').forEach(b=> b.addEventListener('click', ()=> setView(b.dataset.go)));

/* ── 製作報告：home＝選報告種類，weight＝減重報告，checkup＝體檢報告 ── */
function setRep(r){
  main.dataset.rep = r;
  store('hub-rep', r);
  syncRep();
}
function syncRep(){
  const v = main.dataset.view, r = main.dataset.rep;
  if(v === 'weight' && r === 'home') renderRepMeta();
  document.getElementById('btn-rep-back').hidden = !(v === 'weight' && r !== 'home');
  const hint = v === 'weight' ? (r === 'home' ? 'report' : r) : v;
  document.getElementById('foot-hint').textContent = FOOT_HINT[hint] || FOOT_HINT.calc;
  // 減重報告的方向鍵與 ESC 快捷鍵要在焦點位於報告畫面內時才有作用
  if(v === 'weight' && r === 'weight' && WB) WB.focus({preventScroll:true});
  if(v === 'weight' && r === 'checkup' && KB) KB.focus({preventScroll:true});
}
// 報告種類卡片底部：這台電腦已儲存幾筆病人紀錄（讀不到就不顯示）
function renderRepMeta(){
  document.querySelectorAll('[data-rep-meta]').forEach(el=>{
    let n = null;
    try{ const r = JSON.parse(localStorage.getItem(el.dataset.repMeta)); n = Array.isArray(r) ? r.length : 0; }catch(err){}
    el.textContent = n == null ? '' : n ? '已儲存 ' + n + ' 筆紀錄' : '尚無儲存紀錄';
  });
}
// 只綁報告種類的按鈕。<main> 本身也有 data-rep（記錄目前在哪個報告），綁到它的話報告裡任何一次點擊
// 都會觸發 setRep → syncRep → 把焦點搶回報告容器，輸入欄位一放開滑鼠就失去游標
document.querySelectorAll('button[data-rep]').forEach(b=> b.addEventListener('click', ()=> setRep(b.dataset.rep)));
document.getElementById('btn-rep-back').addEventListener('click', ()=> setRep('home'));
// 頂端的減重摘要直接帶到減重報告
document.getElementById('chip-weight').addEventListener('click', ()=> setRep('weight'));
document.getElementById('btn-split').addEventListener('click', e=>{
  const on = main.dataset.split !== '1';
  main.dataset.split = on ? '1' : '0';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  // 圖卡區與計算區的寬度都變了：重新算圖卡的「整頁／寬度」大小與計算區倍率
  setTimeout(()=>{ applyZoom(); if(calcReady) fitCalc(); }, 0);
});

// 焦點是否在輸入欄位裡。臨床計算等工具放在 shadow root，文件層收到的 e.target 只是外框（#calc-host），
// 要用 composedPath() 的第一個元素才是真正按鍵的欄位
function typingInField(e){
  const t = e.composedPath()[0];
  return !!(t && t.closest && (t.closest('input,textarea,select') || t.isContentEditable));
}
function onHubKey(e){
  if(e.altKey && !e.ctrlKey && !e.metaKey){
    const v = {'1':'quote','2':'calc','3':'edu','4':'weight'}[e.key];
    if(v){ e.preventDefault(); setView(v); return true; }
  }
  return false;
}
document.addEventListener('keydown', e=>{
  if(onHubKey(e)) return;
  if(!clearModal.hidden){
    if(e.key === 'Escape'){ e.preventDefault(); closeClear(); }
    return;
  }
  if(!revModal.hidden){
    if(e.key === 'Escape'){ e.preventDefault(); closeRev(); }
    return;
  }
  if(!jumpModal.hidden){ onJumpKey(e); return; }
  if(e.key === 'Escape' && !qrOverlay.hidden){ qrOverlay.hidden = true; return; }
  // 快速前往：臨床計算、製作報告與目錄上的 /（報價與衛教的 / 留給各自的搜尋）
  if(e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !typingInField(e) && (!cover.hidden || main.dataset.view === 'calc' || main.dataset.view === 'weight')){ e.preventDefault(); openJump(); return; }
  if(!cover.hidden){ onCoverKey(e); return; }
  // Esc 叫出封面：工具自己用掉的 Esc（關預覽、回上一層、清搜尋，都會 preventDefault）、輸入欄位裡的 Esc、最大化中的 Esc 不算
  if(e.key === 'Escape' && !e.defaultPrevented && !e.ctrlKey && !e.metaKey && !e.altKey && !typingInField(e)
     && !document.body.classList.contains('edu-max') && !document.body.classList.contains('q-max')){
    e.preventDefault(); openCover(); return;
  }
  // 製作報告的報告種類：列上標的 1、2 直接開
  if(main.dataset.view === 'weight' && main.dataset.rep === 'home' && (e.key === '1' || e.key === '2') && !e.ctrlKey && !e.metaKey && !e.altKey && !typingInField(e)){
    e.preventDefault(); setRep(e.key === '1' ? 'weight' : 'checkup'); return;
  }
  // 報價的搜尋快速鍵（/、Ctrl+K）：焦點不在報價畫面裡（例如點過頂端列）時，事件到不了報價的 shadow root，這裡轉送過去
  const qSearchKey = e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey || (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
  if(main.dataset.view === 'quote' && QB && qSearchKey && !typingInField(e) && !e.composedPath().includes(QB)){
    e.preventDefault();
    QB.dispatchEvent(new KeyboardEvent('keydown', {key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, bubbles: true, composed: true}));
    return;
  }
  if(main.dataset.view !== 'edu' || e.ctrlKey || e.metaKey || e.altKey) return;
  // 並排計算時，焦點在右側臨床計算裡的按鍵都留給計算（打數字、方向鍵選項），不當成換張或縮放
  if(typingInField(e) || e.composedPath().includes(document.getElementById('calc-host'))) return;
  // 目前是表單（多頁並排）還是衛教圖卡，縮放各自處理
  const form = document.getElementById('pane-edu').dataset.stage === 'form';
  // 放大後可捲動時，上下鍵留給捲動，換張只用左右鍵
  const canScroll = (form ? formView : eduView).classList.contains('pannable');
  const k = e.key;
  if(k === '/' && !document.body.classList.contains('edu-max')){ e.preventDefault(); const q = document.getElementById('edu-q'); if(q){ q.focus(); q.select(); } return; }
  if(k === 'ArrowLeft' || (k === 'ArrowUp' && !canScroll)){ e.preventDefault(); stepItem(-1); }
  else if(k === 'ArrowRight' || (k === 'ArrowDown' && !canScroll)){ e.preventDefault(); stepItem(1); }
  else if(k === '+' || k === '='){ e.preventDefault(); form ? formZoomStep(1) : zoomStep(1); }
  else if(k === '-' || k === '_'){ e.preventDefault(); form ? formZoomStep(-1) : zoomStep(-1); }
  else if(k === '0'){ e.preventDefault(); if(form){ formZoom = 'fit'; applyFormZoom(); } else setZoom('fit'); }
  else if((k === 'w' || k === 'W') && !form){ e.preventDefault(); setZoom('width'); }
  else if(k === 'f' || k === 'F'){ e.preventDefault(); toggleMax(); }
  else if(k === 'Escape' && document.body.classList.contains('edu-max')){ e.preventDefault(); toggleMax(); }
});

/* 臨床計算自動縮放：所有工具共用同一個倍率，切換工具或分類時字級不會跳動。
   倍率取「每個工具都放得進畫面」的最大值：逐一量過每個工具（結果區全部展開的最壞情況），取最小者。
   量測在同一段同步程式內完成，畫面不會閃。
   降血脂與 B 肝用藥兩個判定表單不列入計算（避免拉低所有工具的字級），輸入區已排進一個畫面，結果欄在欄內捲動（fitRxOut）。 */
const CALC_SCROLL_OK = new Set(['panel-lipidrx', 'panel-hbvrx']);
const CALC_MIN_Z = 0.8, CALC_MAX_Z = 1.45;
let calcZ = null;

// root 是臨床計算的捲動區（.c-body）：內容高度不超過它的高度，就表示不必捲動
function calcCtx(){
  if(!calcReady) return null;
  const card = CD.querySelector('.card');
  if(!card || !CB.clientHeight || !CB.clientWidth) return null;
  return {d: CD, card, root: CB, H: CB.clientHeight, W: CB.clientWidth};
}

// 在目前顯示狀態下，找出不出現捲軸的最大倍率（上限 hi）
function maxFit(c, hi){
  const fits = z=>{ c.card.style.zoom = z; return c.root.scrollHeight <= c.H; };
  if(fits(hi)) return hi;
  if(!fits(CALC_MIN_Z)) return CALC_MIN_Z;
  // 放大時版面變窄、換行變多，高度不是線性變化，用二分搜尋
  let lo = CALC_MIN_Z;
  for(let i = 0; i < 7; i++){
    const mid = (lo + hi) / 2;
    if(fits(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

function computeCalcZ(c){
  const {d} = c;
  c.card.style.removeProperty("--fill-h");
  const panels = [...d.querySelectorAll('.tool-panel')];
  const saved = panels.map(p=> [p, p.hidden, p.classList.contains('active')]);
  const notice = d.getElementById('staff-notice'), summary = d.getElementById('summary-zone');
  const noticeHidden = notice ? notice.hidden : true, summaryHidden = summary ? summary.hidden : true;
  // 各分類的工具分頁列寬度不同，量測時換成該分類實際會出現的那一列
  const tabRows = [...d.querySelectorAll('.tabs[data-group]')];
  const tabRowsHidden = tabRows.map(r=> r.hidden);
  const calcBtn = d.getElementById('group-calc');
  const calcBtnHidden = calcBtn ? calcBtn.hidden : true;
  if(calcBtn) calcBtn.hidden = false;
  let z = Math.min(CALC_MAX_Z, Math.max(1, c.W / 1250));

  panels.filter(p=> !CALC_SCROLL_OK.has(p.id)).forEach(p=>{
    panels.forEach(x=>{ x.hidden = true; x.classList.remove('active'); });
    p.hidden = false; p.classList.add('active');
    // 依工具所屬分類還原提示列；「已完成的評估」欄依面板的 data-summary（自我評估才有）
    const tab = d.getElementById('tab-' + p.id.replace('panel-', ''));
    const group = tab && tab.closest('.tabs') ? tab.closest('.tabs').dataset.group : '';
    tabRows.forEach(r=> r.hidden = r.dataset.group !== group);
    if(notice) notice.hidden = group !== 'calc';
    if(summary) summary.hidden = !p.dataset.summary;
    // 結果區有的用行內 display:none、有的用 hidden 或 class 隱藏，一律以實際顯示狀態判斷，量完原樣還原
    const forced = [...p.querySelectorAll('.hub-out [id$="-result"]')]
      .filter(e=> getComputedStyle(e).display === 'none')
      .map(e=> ({e, v: e.style.getPropertyValue('display'), pr: e.style.getPropertyPriority('display'), h: e.hidden}));
    const hints  = [...p.querySelectorAll('.hub-out [id$="-hint"]')].filter(e=> e.style.display !== 'none');
    // 逐步放寬：先一般的 block（讓 BMI、TDEE 那幾條 !important 的排版規則照常生效），還是隱藏才加 !important
    forced.forEach(({e})=>{
      e.hidden = false;
      e.style.setProperty('display', 'block');
      if(getComputedStyle(e).display === 'none') e.style.setProperty('display', 'block', 'important');
    });
    hints.forEach(e=> e.style.display = 'none');
    z = Math.min(z, maxFit(c, z));
    forced.forEach(({e, v, pr, h})=>{
      if(v) e.style.setProperty('display', v, pr); else e.style.removeProperty('display');
      e.hidden = h;
    });
    hints.forEach(e=> e.style.display = '');
  });

  saved.forEach(([p, h, a])=>{ p.hidden = h; p.classList.toggle('active', a); });
  if(notice) notice.hidden = noticeHidden;
  if(summary) summary.hidden = summaryHidden;
  tabRows.forEach((r, i)=> r.hidden = tabRowsHidden[i]);
  if(calcBtn) calcBtn.hidden = calcBtnHidden;
  return z;
}

function fitCalc(){
  const c = calcCtx();
  if(!c) return;
  // 窄畫面（含並排模式）維持單欄原尺寸，允許捲動
  if(c.W < 1100){ c.card.style.zoom = 1; c.card.style.removeProperty("--fill-h"); fitRxOut(); return; }
  if(calcZ === null) calcZ = computeCalcZ(c);
  c.card.style.zoom = calcZ;
  rxZoom(c);
  fillCalc(c);
  fitRxOut();
  fitSideInfo();
}

// 降血脂與 B 肝用藥的欄位與結果比其他工具多：共用倍率下放不進畫面時，這兩個工具自己再縮小（下限 CALC_MIN_Z），不必捲動
function rxZoom(c){
  const p = c.d.querySelector('.tool-panel.active');
  if(!p || !CALC_SCROLL_OK.has(p.id)) return;
  const o = p.querySelector('.hub-out');
  c.card.style.removeProperty('--fill-h');
  if(o) o.style.maxHeight = '';
  // 只縮這個工具本身（左側目錄維持共用倍率，切換時不會忽大忽小）
  const fits = k=>{ p.style.zoom = k; return c.root.scrollHeight <= c.H; };
  if(fits(1)) return;
  let lo = Math.min(1, CALC_MIN_Z / calcZ), hi = 1;
  if(!fits(lo)) return;
  for(let i = 0; i < 6; i++){ const mid = (lo + hi) / 2; if(fits(mid)) lo = mid; else hi = mid; }
  p.style.zoom = lo;
}

// 參考資訊區（FIB-4、R Factor、Child-Pugh 輸入欄下方）放不完整就整塊藏起來
function fitSideInfo(){
  if(!calcReady) return;
  CD.querySelectorAll('.side-wrap').forEach(w=>{
    const box = w.firstElementChild;
    if(!box || !w.offsetParent) return;
    w.classList.toggle('cut', box.offsetHeight > w.clientHeight + 1);
  });
}

// 卡片高度補滿整個畫面：倍率由最高的工具決定，較矮的工具改由版面（CSS 的 --fill-h）把內容撐開到底，不留一大塊空白
function fillCalc(c){
  const z = parseFloat(c.card.style.zoom) || 1;
  const cs = getComputedStyle(c.root);
  const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  let h = Math.floor((c.H - pad) / z) - 2;
  c.card.style.setProperty("--fill-h", h + "px");
  const p = c.d.querySelector(".tool-panel.active");
  const over = c.root.scrollHeight - c.H;
  if(over > 0 && p) c.card.style.setProperty("--fill-h", (h - Math.ceil(over / z) - 1) + "px");
}

// 降血脂與 B 肝用藥：結果卡片很長，結果欄高度限制在畫面內、欄內捲動，左側輸入不必跟著捲
function fitRxOut(){
  const c = calcCtx();
  if(!c) return;
  const z = parseFloat(c.card.style.zoom) || 1;
  c.d.querySelectorAll('.rx-panel .hub-out').forEach(o=>{
    o.style.maxHeight = '';
    return;   // 2026-11-11 起結果欄不再限高捲動，改由 rxZoom 把整個工具縮進一個畫面
    if(c.W < 1100 || !o.offsetParent) return;
    // 位置是螢幕像素，max-height 會再乘上倍率，所以要除回去
    const top = o.getBoundingClientRect().top - c.root.getBoundingClientRect().top + c.root.scrollTop;
    let h = (c.H - top) / z;
    o.style.maxHeight = h + 'px';
    // 再扣掉卡片與頁面下緣的留白，直到整頁不出現捲軸
    const over = c.root.scrollHeight - c.H;
    if(over > 0) h = (o.getBoundingClientRect().height - over) / z - 1;
    o.style.maxHeight = Math.max(300, h) + 'px';
  });
}

// 面板尺寸一變（視窗縮放、切換並排、手機轉向）就重算共用倍率；
// 不只依賴視窗的 resize 事件，切換並排等情況下它不會觸發
{
  let t = null;
  const refit = ()=>{ clearTimeout(t); t = setTimeout(()=>{ calcZ = null; fitCalc(); }, 120); };
  new ResizeObserver(refit).observe(document.getElementById('pane-calc'));
  window.addEventListener('resize', refit);
}

/* 臨床計算的寬螢幕版面：每個工具分成左「輸入」、右「結果」兩欄，算完不必往下捲。
   只搬動既有元素的位置（id 與事件都不變），量表類工具題目多、結果在最後才出現，維持單欄。
   窄螢幕或並排模式時，CSS 會讓兩欄自動疊回單欄。 */
function splitCalcPanels(){
  const doc = CD;
  // 左欄只放輸入；結果、對照表與文獻附註放右欄（BMI、Bristol、Child-Pugh 的附註留在左欄底部，用藥給付兩個工具維持原樣）
  const isOut = c=> /-(result|hint)$/.test(c.id) || c.matches('.ref-table, .rx-cards, .rx-basis') ||
    (c.matches('.notes:not(.bmi-notes):not(.bristol-notes)') && !c.parentElement.matches('.rx-panel, #panel-childpugh'));
  doc.querySelectorAll('.tool-panel').forEach(p=>{
    if(p.classList.contains('hub-split') || p.querySelector(':scope > .quiz-intro')) return;
    const kids = [...p.children].filter(c=> !c.classList.contains('panel-head'));
    if(!kids.some(isOut)) return;
    const L = document.createElement('div'); L.className = 'hub-in';
    const R = document.createElement('div'); R.className = 'hub-out';
    kids.forEach(c=> (isOut(c) ? R : L).appendChild(c));
    p.append(L, R);
    p.classList.add('hub-split');
  });
  // 結果欄捲動時停在分頁列下方
  const tw = doc.querySelector('.tabs-wrap');
  const setTop = ()=> CB.style.setProperty('--hub-sticky', ((tw ? tw.offsetHeight : 0) + 14) + 'px');
  setTop();
  window.addEventListener('resize', setTop);
}
// 左下角只顯示五個工具裡最晚的改版日期；點一下跳出 revision.js 的 REVISION_NOTE
const LATEST_REV = Object.values(REVISION).sort().pop();
const revModal = document.getElementById('rev-modal');
function renderRevision(){
  document.getElementById('app-revision').textContent = '最後改版：' + LATEST_REV;
}
function closeRev(){ revModal.hidden = true; document.getElementById('app-revision').focus(); }
document.getElementById('app-revision').addEventListener('click', ()=>{
  document.getElementById('rv-title').textContent = LATEST_REV + ' 改了什麼';
  document.getElementById('rv-list').innerHTML = REVISION_NOTE.map(t=> '<li>' + esc(t) + '</li>').join('');
  revModal.hidden = false;
  document.getElementById('rv-close').focus();
});
document.getElementById('rv-close').addEventListener('click', closeRev);
revModal.addEventListener('click', e=>{ if(e.target === revModal) closeRev(); });

function txt(doc, id){ const el = doc && doc.getElementById(id); return el ? el.textContent.trim() : ''; }
/* 頂端摘要只在內容可能改變時才重算，不再每 1.5 秒重算一次：
   輸入、選擇、點擊後，以及結果欄位本身被程式改動時（例如載入紀錄檔是非同步的，點擊當下結果還沒出來） */
let chipTimer = null;
function queueChips(){ clearTimeout(chipTimer); chipTimer = setTimeout(updateChips, 30); }
function watchChips(root, ids){
  ['input','change','click'].forEach(t=> root.addEventListener(t, queueChips, true));
  const mo = new MutationObserver(queueChips);
  ids.forEach(id=>{
    const el = root.getElementById(id);
    if(el) mo.observe(el, {childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:['style','hidden','class']});
  });
}
function updateChips(){
  const cc = document.getElementById('chip-calc');
  const cw = document.getElementById('chip-weight');
  try{
    const d = CD;
    const box = d && d.getElementById('bmi-result');
    const v = txt(d,'bmi-val');
    if(box && box.style.display !== 'none' && v && v !== '—'){
      cc.innerHTML = '<span class="k">臨床計算</span>BMI <b>' + esc(v) + '</b>　' + esc(txt(d,'bmi-badge'));
      cc.hidden = false;
    }else cc.hidden = true;
  }catch(err){ cc.hidden = true; }
  try{
    const d = WD;
    const name = d && d.getElementById('p-name') ? d.getElementById('p-name').value.trim() : '';
    const bmi = txt(d,'bmi-value');
    const parts = [];
    if(name) parts.push(maskName(name));
    if(bmi && bmi !== '--' && bmi !== '—') parts.push('BMI <b>' + esc(bmi) + '</b>');
    if(parts.length){
      // 減重系統原本的「尚未儲存／已儲存」狀態在被隱藏的頁首裡，改顯示在這裡
      const st = txt(d,'status-pill');
      const saved = /^已儲存|^已載入/.test(st);
      cw.innerHTML = '<span class="k">減重報告</span>' + parts.join('　') +
        (st ? `<span class="save ${saved ? 'ok' : ''}">${saved ? '已儲存' : '未儲存'}</span>` : '');
      cw.hidden = false;
    }else cw.hidden = true;
  }catch(err){ cw.hidden = true; }
}
// 姓名中間遮成○，頭尾留著（王○明、兩個字是王○），與健檢 LINE 摘要圖的 ckMaskName 相同；正式報告印全名
function maskName(n){ const s = [...String(n)]; return esc(s.length <= 1 ? s.join('') : s.length === 2 ? s[0] + '○' : s[0] + '○'.repeat(s.length - 2) + s[s.length - 1]); }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ── 全部清除 ── */
const clearModal = document.getElementById('clear-modal');
function openClear(){
  // 健檢報告有上傳圖片、還沒匯出備份時多一行提醒（圖片只在記憶體裡，清除後就沒了）
  let pages = false;
  try{ pages = ckPagesUnsaved && Object.keys(CK_PAGES).length > 0; }catch(err){}
  document.getElementById('cm-pages').hidden = !pages;
  clearModal.hidden = false;
  // 預設焦點放在「取消」，避免誤按 Enter 就清掉
  document.getElementById('cm-cancel').focus();
}
function closeClear(){ clearModal.hidden = true; document.getElementById('btn-clear').focus(); }
document.getElementById('btn-clear').addEventListener('click', openClear);
document.getElementById('cm-cancel').addEventListener('click', closeClear);
clearModal.addEventListener('click', e=>{ if(e.target === clearModal) closeClear(); });
document.getElementById('cm-ok').addEventListener('click', ()=>{
  clearModal.hidden = true;
  // 減重報告直接放在工作台裡，最乾淨的清除方式是刪掉暫存後重新載入整頁（臨床計算也一併重來）。
  // 先停掉減重的自動暫存計時器並標記為未修改，才不會在重新載入前又寫回草稿、或跳出「離開網頁」提醒。
  if(weightReady){ try{ clearTimeout(draftTimer); isDirty = false; }catch(err){} }
  try{ clearTimeout(ckSaveTimer); }catch(err){}
  window.HUB_RELOADING = true;
  Object.values(CLEAR_KEYS).flat().forEach(([kind, k])=>{
    try{ (kind === 'session' ? sessionStorage : localStorage).removeItem(k); }catch(err){}
  });
  try{ sessionStorage.setItem('hub-cleared', '1'); }catch(err){}
  location.reload();
});

