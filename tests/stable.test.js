/* 工作台畫面穩定檢查：點頂端分頁、點臨床計算每個項目時，其他元素不可以移位，字級不可以跳動。
   用法（在 tools 資料夾）：node tests/stable.test.js
   為什麼：YT 要求「所有工具共用同一個字級，切換時字級不可跳動」，頁首分頁也不可以因為切換而變寬或位移。
   改頁首（Esc 封面、深色模式、目錄樣式）之前先用這一份鎖住現況，改完再跑一次。

   作法：在本機開一個小網頁伺服器（view.html 要用 fetch 讀，file:// 讀不到），
   用本機 Chrome 無頭模式開 1920x1080 與 1366x768 兩種畫面：
   1. 四個頂端分頁各點一次，量 QR code、診所名稱、四個分頁按鈕的位置與大小。
   2. 臨床計算：展開醫療人員工具後，逐一點每個分組與每個計算項目，等倍率重算（0.4 秒）後量
      分組按鈕、項目按鈕、頁首的位置，以及共用倍率（.card 的 zoom）。
      降血脂與 B 肝用藥另外縮小的是自己的面板（rxZoom），不影響共用倍率，所以不算跳動。
   3. Esc 叫出與收起封面時頁首不移位，封面上的常用項目捷徑要開到對應的工具或分類。
   4. 四個分頁各切換一次深色模式，頁首與工具畫面都不可以移位（深色只換顏色）。
   差超過 1px 或倍率不同就列出來。全部沒問題時最後一行是「全部通過」。
   自我測試：node tests/stable.test.js --self-test，故意讓切到臨床計算時分頁變寬、某個計算項目改變倍率，要抓得到才算過。 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(p => fs.existsSync(p));
if (!CHROME) { console.log('找不到 Chrome 或 Edge，無法執行'); process.exit(1); }

const PROBE = `
<script>
(function(){
function tick(ms){return new Promise(function(r){setTimeout(r,ms||0);});}
function vis(e){if(!e.isConnected)return false;var r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';}
function snap(list){return list.map(function(e){var r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height];});}
function label(e){return (e.textContent||e.id||e.className).replace(/\\s+/g,' ').trim().slice(0,16);}
function moved(list,a,skip){
  var out=[];
  list.forEach(function(e,i){
    if(e===skip||!vis(e))return;
    var r=e.getBoundingClientRect(),b=a[i];
    var d=Math.max(Math.abs(r.left-b[0]),Math.abs(r.top-b[1]),Math.abs(r.width-b[2]),Math.abs(r.height-b[3]));
    if(d>1)out.push(label(e)+'('+Math.round(d)+'px)');
  });
  return out;
}
function head(){return [].slice.call(document.querySelectorAll('.qr-btn, .hub-brand, .hub-tab')).filter(vis);}
function calcNav(){return [].slice.call(CD.querySelectorAll('.group-btn, .tabs .tab, .staff-toggle')).filter(vis);}
function zoom(){var c=CD.querySelector('.card');return c?String(c.style.zoom||getComputedStyle(c).zoom):'?';}
async function ready(){
  for(var i=0;i<200;i++){
    if(calcReady&&!document.querySelector('#quote-host.loading, #calc-host.loading, #weight-host.loading'))return true;
    await tick(100);
  }
  return false;
}
async function run(){
  var res=[];window.__n=0;
  if(!(await ready()))return ['工具沒有在 20 秒內載入完成'];
  // 1. 頂端分頁
  var VIEWS=['quote','calc','edu','weight'];
  setView('quote');await tick(400);
  var h=head(),h0=snap(h);
  for(var i=0;i<VIEWS.length;i++){
    setView(VIEWS[i]);await tick(400);
    var m=moved(h,h0,null);
    if(m.length)res.push('切到「'+VIEWS[i]+'」：頁首移位 '+m.join('、'));
  }
  // 2. 臨床計算每個項目
  setView('calc');await tick(400);
  var staff=CD.getElementById('staff-toggle');
  if(staff&&staff.getAttribute('aria-expanded')!=='true'){staff.click();await tick(400);}
  var groups=[].slice.call(CD.querySelectorAll('.group-btn')).filter(vis);
  var z0=null;
  for(var g=0;g<groups.length;g++){
    groups[g].click();await tick(400);
    var tabs=[].slice.call(CD.querySelectorAll('.tabs .tab')).filter(vis);
    for(var k=0;k<tabs.length;k++){
      var el=tabs[k];
      var list=calcNav().concat(head()),before=snap(list);
      el.click();await tick(400);
      window.__n++;
      if(window.__BREAK&&window.__n===3)CD.querySelector('.card').style.zoom='0.5';
      var name=label(el),z=zoom();
      if(z0===null)z0=z;
      else if(z!==z0)res.push('點「'+name+'」：共用倍率 '+z0+' → '+z);
      var mv=moved(list,before,el);
      if(mv.length)res.push('點「'+name+'」：'+mv.length+' 個移位 '+mv.slice(0,4).join('、'));
    }
  }
  if(z0===null)res.push('臨床計算沒有找到任何項目');
  // 4. 切換深色模式：每個分頁的頁首與工具畫面都不可以動（深色只換顏色）
  var ROOTS={quote:function(){return QD;},calc:function(){return CD;},edu:function(){return document.getElementById('pane-edu');},weight:function(){return document.getElementById('pane-weight');}};
  for(var vi=0;vi<VIEWS.length;vi++){
    setView(VIEWS[vi]);await tick(400);
    var rt=ROOTS[VIEWS[vi]]();
    var els=head().concat([].slice.call(rt.querySelectorAll('*')).filter(vis).slice(0,400)),b=snap(els);
    toggleTheme();await tick(100);
    var md=moved(els,b,null);
    toggleTheme();await tick(100);
    if(md.length)res.push('切換深色模式（'+VIEWS[vi]+'）：'+md.length+' 個移位 '+md.slice(0,4).join('、'));
  }
  // 3. Esc 封面：叫出與收起時頁首不移位；常用項目捷徑要真的開到對應的地方
  setView('quote');await tick(400);
  function esc(){document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));}
  var cv=document.getElementById('hub-cover'),hb=head(),hb0=snap(hb);
  esc();await tick(100);
  if(cv.hidden)res.push('按 Esc 沒有叫出封面');
  var mc=moved(hb,hb0,null);if(mc.length)res.push('叫出封面：頁首移位 '+mc.join('、'));
  esc();await tick(100);
  if(!cv.hidden)res.push('封面上再按 Esc 沒有收起');
  // 從每個分頁叫出封面，封面上不可以透出工具的元素（2026-11-19：臨床計算左側目錄 z-index 與封面相同，蓋在封面上）
  for(var ci=0;ci<VIEWS.length;ci++){
    setView(VIEWS[ci]);await tick(400);esc();await tick(100);
    var r0=cv.getBoundingClientRect(),leak=[];
    for(var px=r0.left+10;px<r0.right;px+=50)for(var py=r0.top+10;py<r0.bottom;py+=50){var at=document.elementFromPoint(px,py);if(at&&at!==cv&&!cv.contains(at))leak.push(Math.round(px)+','+Math.round(py));}
    if(leak.length)res.push('從「'+VIEWS[ci]+'」叫出封面：'+leak.length+' 點透出工具畫面，例如 '+leak.slice(0,3).join('、'));
    esc();await tick(100);
  }
  // 快速前往：臨床計算按 /，打 fib 按 Enter 要開到 FIB-4；製作報告按 2 要開健檢報告
  setView('calc');await tick(400);
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'/',bubbles:true,cancelable:true}));
  var jq=document.getElementById('jump-q');
  if(document.getElementById('jump-modal').hidden)res.push('臨床計算按 / 沒有叫出快速前往');
  else{jq.value='fib';jq.dispatchEvent(new Event('input'));jq.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await tick(400);
    var jp=CD.querySelector('.tool-panel.active');if(!jp||jp.id!=='panel-fib4')res.push('快速前往「fib」沒有開到 FIB-4（'+(jp&&jp.id)+'）');}
  setView('weight');setRep('home');await tick(200);
  document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'2',bubbles:true,cancelable:true}));await tick(200);
  if(main.dataset.rep!=='checkup')res.push('製作報告按 2 沒有開健檢報告');
  setRep('home');
  setView('quote');await tick(400);
  function sec(act){esc();var b=cv.querySelector('[data-act="'+act+'"]');if(!b)return res.push('封面沒有捷徑 '+act);b.click();}
  sec('c:lipidrx');await tick(400);
  var ap=CD.querySelector('.tool-panel.active');
  if(main.dataset.view!=='calc'||!ap||ap.id!=='panel-lipidrx')res.push('捷徑「降血脂給付」沒有開到該工具（'+main.dataset.view+'、'+(ap&&ap.id)+'）');
  sec('r:checkup');await tick(200);
  if(main.dataset.view!=='weight'||main.dataset.rep!=='checkup')res.push('捷徑「健檢報告」沒有開到健檢報告');
  setRep('home');
  sec('e:consent');await tick(200);
  if(main.dataset.view!=='edu'||eduGroup!=='consent')res.push('捷徑「同意書」沒有開到同意書分類');
  sec('q:lab');await tick(400);
  var lab=QD.querySelector('#itemsGrid');
  if(main.dataset.view!=='quote'||!lab||!vis(lab))res.push('捷徑「檢驗」沒有開到報價的檢驗分類');
  return res;
}
window.addEventListener('load',function(){setTimeout(async function(){
  var r;try{r=await run();}catch(e){r=['頁面錯誤：'+e.message];}
  var pre=document.createElement('pre');pre.id='__probe__';pre.textContent=JSON.stringify({r:r,n:window.__n});document.body.appendChild(pre);
},300);});
})();
</script>`;

const SELF_TEST = process.argv.includes('--self-test');
// 自我測試用的破壞：切到臨床計算時頂端分頁變寬（第 3 個計算項目的倍率在 PROBE 裡改）
const BREAK = '<style>body[data-view="calc"] .hub-tab{padding-right:40px}</style><script>window.__BREAK=1</script>';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p === '/index.html') {
      // 不註冊離線快取（sw.js），每次都讀本機最新檔案
      const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
        .replace("'serviceWorker' in navigator", 'false')
        .replace('</body>', (SELF_TEST ? BREAK : '') + PROBE + '</body>');
      res.writeHead(200, { 'Content-Type': TYPES['.html'] }); res.end(html); return;
    }
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok(server)));
}

function probe(port, w, h) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tools-stable-'));
  return new Promise((ok, bad) => {
    let out = '';
    const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--user-data-dir=' + path.join(tmp, 'prof'),
      '--virtual-time-budget=120000', `--window-size=${w},${h}`, '--dump-dom', `http://127.0.0.1:${port}/`]);
    const timer = setTimeout(() => ch.kill(), 300000);
    ch.stdout.on('data', d => out += d);
    ch.on('close', () => {
      clearTimeout(timer);
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
      const m = out.match(/<pre id="__probe__">([\s\S]*?)<\/pre>/);
      if (!m) return bad(new Error('頁面沒有回傳結果'));
      ok(JSON.parse(m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')));
    });
  });
}

(async () => {
  const server = await serve();
  const port = server.address().port;
  let bad = 0;
  try {
    for (const [w, h] of [[1920, 1080], [1366, 768]]) {
      const { r, n } = await probe(port, w, h);
      r.forEach(s => console.log(`✗ ${w}x${h} ${s}`));
      if (n < 10) { console.log(`✗ ${w}x${h} 只點到 ${n} 個計算項目，檢查沒有真的跑`); bad++; }
      bad += r.length;
    }
  } catch (e) { console.log(e.message); bad = bad || 1; }
  server.close();
  if (SELF_TEST) {
    console.log(bad >= 4 ? '自我測試通過：抓到故意造成的移位與倍率改變' : '自我測試失敗：故意造成的問題沒有被抓到');
    process.exit(bad >= 4 ? 0 : 1);
  }
  console.log(bad ? `${bad} 處移位` : '全部通過');
  process.exit(bad ? 1 : 0);
})();
