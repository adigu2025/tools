/* 工作台畫面的使用體驗檢查。用法（在 tools 資料夾）：node tests/ux.test.js
   來源：2026-11-17 一次修掉 7 類問題（commit 366c345），寫成檢查，避免新工具再犯。
   只查「螢幕上操作的畫面」；列印與 PDF 版面（report.js、kit/report-kit.js、forms、*-src）字級與配色另有考量，不在範圍。

   規則（每一條都附上為什麼）：
   1. Enter 要擋注音組字：keydown 判斷 Enter 的地方，前後 3 行內要有 isComposing（並一起擋 keyCode 229）。
      注音選字按的 Enter 會被當成送出，報價搜尋會選錯項目、欄位會跳走。
      Enter 綁在按鈕或卡片（不是文字輸入）時不會組字，那一行加註解 ime-ok。
   2. 灰色系文字變數（名稱含 faint、muted、mute、sub）對工作台最深的底色 #EFEDE6 對比要 4.5 以上。
   3. 金色 #BC7F30（以及 --gold、--k-gold、--w-gold）不可當文字色：對白底只有 3.4，小字看不清楚。
      小字改用 Navy 或 Teal；工作台內各分頁有自己的配色，改用該工具的 --navy 或 --gold-text 變數。
      大字（24px 以上，或 19px 以上粗體）對比 3 就夠，寫進下面 ALLOW 並註明原因。
   4. 畫面上的字不小於 12px（@media print 區塊不算）。
   5. 只有文字的 <label> 要有 for 指向欄位，點標籤才會跳到欄位；包住欄位的 label 不用。
      多選群組的標題沒有單一欄位可以指，加 data-group。
   6. 不用 alert()：會擋住整個畫面、要多按一次確定。改用各工具的浮出提示（例如 wNotice、ckNotice、showToast）。
   7. type="number" 要有 inputmode，手機與平板才會直接叫出數字鍵盤。預設用 decimal（含小數點）。
   8. 輸入欄位不放 placeholder（診所規範：會被誤認成已填的值）。
   9. 截圖辨識訊息（.rx-ocr）在工作台不可排在輸入欄上方（order 不可為負數）：訊息出現、變長時會把欄位往下推，畫面跳動。
      要放在欄位下方，由參考資訊區讓出空間（calc/hub.css）。

   全部通過時最後一行是「全部通過」。自我測試：node tests/ux.test.js --self-test */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

// 螢幕畫面檔（規則 2 至 5、7、8）
const SCREEN = ['index.html', 'hub.js', 'mount.js', 'edu/edu.js',
  'quote/view.html', 'quote/hub.css', 'quote/data.js', 'quote/app.js', 'quote/index.html',
  'calc/view.html', 'calc/hub.css', 'calc/assess.js', 'calc/app.js', 'calc/index.html',
  'weight/view.html', 'weight/app.js', 'weight/index.html',
  'checkup/view.html', 'checkup/app.js'];
// 會在畫面上跳提示或處理按鍵的程式（規則 1、6），含報告產生程式
const SCRIPTS = SCREEN.concat(['weight/report.js', 'checkup/report.js', 'lab/lab.js', 'forms/view.js']);

// 已確認可以保留的例外：[檔名, 該行要包含的文字, 原因]
const ALLOW = [
  ['calc/view.html', 'id="tdee-target"', '規則 3：數字 30px 粗體，屬大字'],
  ['calc/app.js', 'mini-val" style="color:var(--gold)', '規則 3：數字 19px 粗體，屬大字'],
  ['weight/view.html', 'id="cal-target" style="font-size:26px; color:var(--primary)', '規則 3：26px 大字'],
  ['quote/view.html', '.cat-card:hover .cat-icon { background: var(--gold-pale); color: var(--gold); }', '規則 3：圖示不是文字，對比 3 就夠'],
  ['quote/view.html', '.endo-nav-arrow { color: var(--gold) !important; }', '規則 3：箭頭圖示'],
  ['quote/view.html', '.screen-cat-icon { color: var(--gold); }', '規則 3：圖示'],
  ['quote/view.html', '.head-icon { color: var(--gold); }', '規則 3：圖示'],
];

const DARKEST_BG = '#EFEDE6';

function lum(hex){
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(c=> c + c).join('') : h;
  const c = [0, 2, 4].map(i=> parseInt(f.substr(i, 2), 16) / 255).map(v=> v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b){ const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

// 把 @media print { ... } 區塊換成等長空白（保留行號）
function stripPrint(src){
  let out = '', i = 0;
  const re = /@media[^{;]*print[^{;]*\{/g;
  let m;
  while((m = re.exec(src))){
    out += src.slice(i, m.index);
    let depth = 1, j = m.index + m[0].length;
    while(j < src.length && depth){ if(src[j] === '{') depth++; else if(src[j] === '}') depth--; j++; }
    out += src.slice(m.index, j).replace(/[^\n]/g, ' ');
    i = j; re.lastIndex = j;
  }
  return out + src.slice(i);
}

function allowed(file, line){ return ALLOW.some(([f, s])=> f === file && line.includes(s)); }

function check(file, src){
  const errs = [];
  const lines = src.split('\n');
  const screen = SCREEN.includes(file), script = SCRIPTS.includes(file);
  const push = (n, rule, msg)=> { if(!allowed(file, lines[n - 1] || '')) errs.push(`${file}:${n}　規則 ${rule}　${msg}`); };

  if(script){
    lines.forEach((l, i)=>{
      // 規則 1：判斷 Enter 的那一行（比對 key 的寫法）
      if(/key\s*[!=]==?\s*['"]Enter['"]|['"]Enter['"]\s*[!=]==?\s*\w*\.key/.test(l)){
        const win = lines.slice(Math.max(0, i - 3), i + 4).join('\n');
        if(!/isComposing/.test(win) && !/ime-ok/.test(win)) push(i + 1, 1, 'Enter 沒有擋注音組字（isComposing／keyCode 229）');
      }
      // 規則 6
      if(/(^|[^\w.])alert\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)) push(i + 1, 6, '用了 alert()，改用浮出提示');
    });
  }
  if(!screen) return errs;

  const s = stripPrint(src);
  const sl = s.split('\n');
  sl.forEach((l, i)=>{
    // 規則 2：灰色系文字變數
    for(const m of l.matchAll(/--([\w-]*(?:faint|muted|mute|sub)[\w-]*)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/g)){
      const c = contrast(m[2], DARKEST_BG);
      if(c < 4.5) push(i + 1, 2, `--${m[1]}:${m[2]} 對 ${DARKEST_BG} 只有 ${c.toFixed(2)}`);
    }
    // 規則 3：金色當文字色（color: 前面不是 - 才算，排除 border-color、background-color）
    // 減重工具的 --primary 是金色；其他工具的 --primary 是深色，不算
    const goldVars = file.startsWith('weight/') ? 'gold|k-gold|w-gold|primary' : 'gold|k-gold|w-gold';
    if(new RegExp('(^|[^-\\w])color\\s*:\\s*(#BC7F30|var\\(--(?:' + goldVars + ')\\))', 'i').test(l)) push(i + 1, 3, '金色當文字色，小字改用 Navy／Teal（或該工具的 --navy、--gold-text）');
    // 規則 4：小於 12px
    for(const m of l.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) if(parseFloat(m[1]) < 12) push(i + 1, 4, `font-size:${m[1]}px 小於 12px`);
    for(const m of l.matchAll(/(?:^|[;{\s"'])font\s*:\s*(?:(?:italic|bold|normal|\d00)\s+)*(\d+(?:\.\d+)?)px/g)) if(parseFloat(m[1]) < 12) push(i + 1, 4, `font:${m[1]}px 小於 12px`);
    // 規則 5：只有文字、沒有 for 的 label
    for(const m of l.matchAll(/<label(\s[^>]*)?>[^<]*<\/label>/g)){
      const attrs = m[1] || '';
      if(!/\bfor=/.test(attrs) && !/\bdata-group\b/.test(attrs)) push(i + 1, 5, `${m[0].slice(0, 40)} 沒有 for`);
    }
    // 規則 7：number 欄位沒有 inputmode
    for(const m of l.matchAll(/<input\b[^>]*>/g)) if(/type\s*=\s*["']?number\b/.test(m[0]) && !/inputmode=/.test(m[0])) push(i + 1, 7, 'type="number" 沒有 inputmode');
    // 規則 8：placeholder
    if(/<(?:input|textarea)\b[^>]*\splaceholder\s*=\s*["'][^"']+/.test(l) || /\.placeholder\s*=\s*['"][^'"]+/.test(l)) push(i + 1, 8, '輸入欄位放了 placeholder');
    // 規則 9：辨識訊息排在輸入欄上方
    if(/\.rx-ocr\s*\{[^}]*\border\s*:\s*-/.test(l)) push(i + 1, 9, '截圖辨識訊息排在輸入欄上方，出現時會把欄位往下推');
  });
  return errs;
}

if(process.argv.includes('--self-test')){
  // 每條規則各一個該抓到與不該抓到的例子
  const T = (file, src)=> check(file, src).map(e=> e.split('　')[1]);
  const cases = [
    [T('quote/app.js', "if(e.key==='Enter'){ save(); }"), ['規則 1']],
    [T('quote/app.js', "if(e.key==='Enter' && !(e.isComposing||e.keyCode===229)){ save(); }"), []],
    [T('quote/app.js', "if(e.key !== 'Enter' && e.key !== ' ') return; // ime-ok 卡片"), []],
    [T('weight/report.js', "alert('請先選性別');"), ['規則 6']],
    [T('weight/report.js', "wNotice('請先選性別');"), []],
    [T('index.html', ':root{--faint:#9C978C;}'), ['規則 2']],
    [T('index.html', ':root{--faint:#6F6B63;}'), []],
    [T('quote/view.html', '.x{ color: var(--gold); }'), ['規則 3']],
    [T('quote/view.html', '.x{ border-color: var(--gold); background-color:#BC7F30; }'), []],
    [T('calc/view.html', '.x{font-size:11.5px;}'), ['規則 4']],
    [T('calc/view.html', '@media print{ .x{font-size:9px;} }\n.y{font-size:12px;}'), []],
    [T('weight/view.html', '<label>身高</label><input id="h">'), ['規則 5']],
    [T('weight/view.html', '<label for="h">身高</label><label data-group>病史</label><label class="k-f"><span>年齡</span><input></label>'), []],
    [T('checkup/view.html', '<input type="number" data-k="a">'), ['規則 7']],
    [T('checkup/view.html', '<input type="number" inputmode="decimal">'), []],
    [T('quote/view.html', '<input type="text" placeholder="輸入名稱">'), ['規則 8']],
    [T('calc/hub.css', '  .hub-in > .rx-ocr{order:-1;}'), ['規則 9']],
    [T('calc/hub.css', '  .hub-in > .rx-ocr{order:80;}'), []],
  ];
  let bad = 0;
  cases.forEach(([got, want], i)=>{ if(JSON.stringify(got) !== JSON.stringify(want)){ bad++; console.log(`✗ 自我測試第 ${i + 1} 例：預期 ${JSON.stringify(want)}，得到 ${JSON.stringify(got)}`); } });
  if(bad){ console.log(`${bad} 例沒過`); process.exit(1); }
  console.log(`自我測試 ${cases.length} 例全部通過`);
  process.exit(0);
}

const all = [];
for(const f of SCRIPTS){
  const p = path.join(ROOT, f);
  if(!fs.existsSync(p)) continue;
  all.push(...check(f, fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')));
}
if(all.length){
  all.forEach(e=> console.log('✗ ' + e));
  console.log(`${all.length} 個問題（規則說明在 tests/ux.test.js 開頭）`);
  process.exit(1);
}
console.log('全部通過');
