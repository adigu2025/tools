/* 衛教單、同意書、院內指引的圖片一鍵重新產生。用法（在 tools 資料夾）：
     node kit/render-images.js                     列出可以產生的項目
     node kit/render-images.js a5                  重新產生全部 A5 衛教單
     node kit/render-images.js a5 edu-a5-gerd edu-a5-fatty-liver   只產生這幾張
     node kit/render-images.js all                 全部重新產生（a5、cards、patch、consent、guide）
   加上 --no-copy 只輸出到各原始檔資料夾的 out/，不複製到 img/。

   做的事（原本 edu-src、consent-src、guide-src README 的手動步驟）：
   1. consent：先把 head.html、p-*.html、tail.html 串成 pages.html。
   2. 開本機伺服器（提供 tools 資料夾的檔案，並接收頁面送回的圖片 POST /__save?name=）。
   3. 用電腦上的 Chrome 或 Edge（無頭模式，透過 DevTools 通訊協定控制）打開原始檔，
      先跑 fitReport() 檢查內容有沒有壓到頁尾，壓到就停下來不輸出；再跑 renderAll()（patch 是 saveAll()）。
   4. 把這次輸出的圖片複製到 img/，內容有變的才複製；有複製就把 sw.js 的快取版號加一。
   不需要另外安裝套件（Node 22 以上內建 WebSocket）。字型從 Google Fonts 載入，要連網。
   最後一行是「完成」或錯誤原因；有錯誤時結束碼 1。 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {spawn} = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JOBS = {
  a5:      {page: 'edu-src/a5.html',     save: 'edu-src/out',  out: 'edu-src/out',          run: 'renderAll', min: 4, wait: 0},
  cards:   {page: 'edu-src/cards.html',  save: 'edu-src/out',  out: 'edu-src/out',          run: 'renderAll', min: 1, wait: 0},
  patch:   {page: 'edu-src/patch.html',  save: 'edu-src/out',  out: 'edu-src/out',          run: 'saveAll',   min: null, wait: 3000},
  consent: {page: 'consent-src/pages.html', save: 'consent-src', out: 'consent-src/out/tools', run: 'renderAll', min: 1, wait: 0},
  guide:   {page: 'guide-src/sedation-guide.html', save: 'consent-src', out: 'consent-src/out/tools', run: 'renderAll', min: 1, wait: 0},
  // 解剖圖稿：原圖在 edu-src/anatomy/，裁邊放大後輸出 A5（A4 上半頁），沒有文字所以不跑 fitReport
  anatomy: {page: 'edu-src/anatomy.html', save: 'edu-src/out',  out: 'edu-src/out',          run: 'renderAll', min: null, wait: 0}
};
// consent-src/README.md 的串接順序
const CONSENT_PARTS = ['head', 'p-gastro', 'p-colon', 'p-capsule', 'p-sedation', 'p-het', 'p-arbl', 'p-thyroid', 'p-imaging', 'p-case', 'p-glp1', 'tail'];

const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json'};

function fail(msg){ console.log('錯誤：' + msg); process.exit(1); }

function findBrowser(){
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  return c.find(p=> p && fs.existsSync(p));
}

/* 本機伺服器：GET 提供 tools 底下的檔案；POST /__save?name= 存到目前這個工作的 save 資料夾 */
function startServer(state){
  const srv = http.createServer((req, res)=>{
    const u = new URL(req.url, 'http://x');
    if(req.method === 'POST' && u.pathname === '/__save'){
      const name = (u.searchParams.get('name') || '').replace(/[^A-Za-z0-9_./-]/g, '').replace(/\.\./g, '');
      const dest = path.join(ROOT, state.save, name);
      const chunks = [];
      req.on('data', d=> chunks.push(d));
      req.on('end', ()=>{ fs.mkdirSync(path.dirname(dest), {recursive: true}); fs.writeFileSync(dest, Buffer.concat(chunks)); state.saved.push(path.basename(dest)); res.end('ok'); });
      return;
    }
    let f = path.join(ROOT, decodeURIComponent(u.pathname));
    if(!f.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
    if(fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    fs.readFile(f, (e, d)=>{
      if(e){ res.writeHead(404); return res.end(); }
      res.writeHead(200, {'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store'});
      res.end(d);
    });
  });
  return new Promise(r=> srv.listen(0, '127.0.0.1', ()=> r(srv)));
}

/* 極簡的 DevTools 通訊協定用戶端 */
async function openBrowser(exe){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + dir, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--window-size=1400,1000', 'about:blank'], {stdio: 'ignore'});
  let ws;
  for(let i = 0; i < 50 && !ws; i++){
    await new Promise(r=> setTimeout(r, 200));
    try{
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const pg = list.find(t=> t.type === 'page');
      if(pg) ws = pg.webSocketDebuggerUrl;
    }catch(e){}
  }
  if(!ws){ proc.kill(); fail('瀏覽器沒有回應（' + exe + '）'); }
  const sock = new WebSocket(ws);
  await new Promise((r, j)=>{ sock.onopen = r; sock.onerror = j; });
  let id = 0;
  const pending = {}, waiters = [];
  sock.onmessage = ev=>{
    const m = JSON.parse(ev.data);
    if(m.id && pending[m.id]){ pending[m.id](m); delete pending[m.id]; }
    else if(m.method) waiters.filter(w=> w.method === m.method).forEach(w=> w.fn(m.params));
  };
  const send = (method, params)=> new Promise(r=>{ const i = ++id; pending[i] = r; sock.send(JSON.stringify({id: i, method, params: params || {}})); });
  const once = method=> new Promise(r=>{ const w = {method, fn: p=>{ waiters.splice(waiters.indexOf(w), 1); r(p); }}; waiters.push(w); });
  const evaluate = async expr=>{
    const m = await send('Runtime.evaluate', {expression: expr, awaitPromise: true, returnByValue: true, timeout: 600000});
    if(m.result && m.result.exceptionDetails) throw new Error((m.result.exceptionDetails.exception || {}).description || m.result.exceptionDetails.text);
    return m.result && m.result.result ? m.result.result.value : undefined;
  };
  await send('Page.enable');
  await send('Runtime.enable');
  return {send, once, evaluate, close(){ try{ sock.close(); }catch(e){} proc.kill(); try{ fs.rmSync(dir, {recursive: true, force: true}); }catch(e){} }};
}

/* fitReport() 的結果統一成 [[名稱, 最小剩餘空間], ...]：A5 是「名稱：左，右」字串，同意書是 [名稱, 數字] 陣列 */
function parseFit(v){
  if(typeof v === 'string') return v.split('\n').filter(Boolean).map(l=>{ const [n, r] = l.split('：'); return [n, Math.min(...(r || '').split('，').map(Number))]; });
  if(Array.isArray(v)) return v.map(x=> Array.isArray(x) ? [x[0], Number(x[1])] : [String(x), NaN]);
  return [];
}

function bumpCache(){
  const f = path.join(ROOT, 'sw.js');
  const s = fs.readFileSync(f, 'utf8');
  const m = /const CACHE = 'tools-v(\d+)';/.exec(s);
  if(!m) return '（sw.js 找不到快取版號，請手動加一）';
  fs.writeFileSync(f, s.replace(m[0], `const CACHE = 'tools-v${+m[1] + 1}';`));
  return `sw.js 快取版號 v${m[1]} → v${+m[1] + 1}`;
}

async function main(){
  const args = process.argv.slice(2);
  const noCopy = args.includes('--no-copy');
  const rest = args.filter(a=> a !== '--no-copy');
  const which = rest[0];
  if(!which){
    console.log('可以產生的項目：' + Object.keys(JOBS).join('、') + '、all');
    console.log('例：node kit/render-images.js a5 edu-a5-gerd');
    return;
  }
  const jobs = which === 'all' ? Object.keys(JOBS) : [which];
  jobs.forEach(j=>{ if(!JOBS[j]) fail('沒有「' + j + '」這個項目，可用：' + Object.keys(JOBS).join('、') + '、all'); });
  const only = rest.slice(1);
  if(only.length && jobs.length > 1) fail('指定圖片名稱時一次只能做一個項目');

  if(jobs.includes('consent')){
    const html = CONSENT_PARTS.map(n=> fs.readFileSync(path.join(ROOT, 'consent-src', n + '.html'), 'utf8')).join('');
    fs.writeFileSync(path.join(ROOT, 'consent-src', 'pages.html'), html);
    console.log('consent：已重新串接 pages.html');
  }

  const exe = findBrowser();
  if(!exe) fail('找不到 Chrome 或 Edge，可用環境變數 CHROME_PATH 指定瀏覽器位置');
  const state = {save: '', saved: []};
  const srv = await startServer(state);
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const B = await openBrowser(exe);
  const copied = [], unchanged = [];
  let bad = '';
  try{
    for(const j of jobs){
      const job = JOBS[j];
      state.save = job.save; state.saved = [];
      const loaded = B.once('Page.loadEventFired');
      await B.send('Page.navigate', {url: base + job.page});
      await loaded;
      await B.evaluate('document.fonts.ready.then(()=> typeof kwReady !== "undefined" ? kwReady : null).then(()=> 1)');
      if(job.wait) await new Promise(r=> setTimeout(r, job.wait));
      if(job.min != null){
        const fit = parseFit(await B.evaluate('fitReport()')).filter(([n])=> !only.length || only.includes(n));
        const tight = fit.filter(([, r])=> !(r >= job.min));
        if(tight.length){ bad = j + '：內容壓到頁尾（剩餘空間要 ' + job.min + ' 以上）：' + tight.map(([n, r])=> n + ' ' + r).join('、'); break; }
      }
      const arg = only.length && job.run === 'renderAll' ? JSON.stringify(only) : '';
      await B.evaluate(`${job.run}(${arg})`);
      let names = state.saved.slice();
      if(only.length) names = names.filter(n=> only.includes(n.replace(/\.\w+$/, '')));
      console.log(`${j}：輸出 ${names.length} 張到 ${job.out}/`);
      if(only.length){
        const miss = only.filter(n=> !names.some(x=> x.replace(/\.\w+$/, '') === n));
        if(miss.length){ bad = j + '：找不到這幾張：' + miss.join('、'); break; }
      }
      if(noCopy) continue;
      for(const n of names){
        const src = path.join(ROOT, job.out, n), dst = path.join(ROOT, 'img', n);
        const a = fs.readFileSync(src);
        if(fs.existsSync(dst) && Buffer.compare(a, fs.readFileSync(dst)) === 0){ unchanged.push(n); continue; }
        fs.writeFileSync(dst, a);
        copied.push(n);
      }
    }
  } catch(e){
    bad = '頁面執行失敗：' + e.message;
  } finally {
    B.close();
    srv.close();
  }
  if(bad) fail(bad);
  if(!noCopy){
    console.log(copied.length ? '複製到 img/：' + copied.join('、') : 'img/ 沒有需要更新的圖片');
    if(unchanged.length) console.log('內容相同、沒有複製：' + unchanged.length + ' 張');
    if(copied.length){
      console.log(bumpCache());
      console.log('新增的圖片要加進 edu/edu.js 的側欄清單，並更新 revision.js');
    }
  }
  console.log('完成');
}
main().catch(e=> fail(e.message));
