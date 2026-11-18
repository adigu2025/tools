/* 列印與 PDF 輸出的檢查。用法（在 tools 資料夾）：node tests/print.test.js
   診所規範：列印／PDF 不可有瀏覽器自動產生的頁首頁尾（網址、日期、頁碼），詞語不可斷在中間。

   規則（每一條都附上為什麼）：
   1. 每一個 @page 的 margin 都要是 0。
      Chrome 只有在頁面邊界是 0 時才不印網址與日期；要留白改用內容的 padding。
   2. 每一條列印路徑（呼叫 print() 的地方）都要找得到一份 margin 為 0 的 @page：
      寫在同一個檔案，或寫在它實際套用的檔案（PRINT_PAGE 對照表）。
      shadow root 裡的 @page 不一定有作用，所以工作台的列印函式（QUOTE_PRINT、CALC_PRINT）要自己在主頁面放一份。
   3. 減重報告、健檢報告在排版完成、列印或轉 PDF 之前要執行 keepWords()（kit/keep-words.js），
      醫師評語、超音波發現這類自由文字自動換行時才不會把詞切開；工作台要載入 keep-words.js。

   全部通過時最後一行是「全部通過」。自我測試：node tests/print.test.js --self-test */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = f=> fs.readFileSync(path.join(ROOT, f), 'utf8');

// 有列印功能的檔案（原始檔資料夾 *-src 是輸出圖片用，不列印，不在範圍）
const FILES = ['index.html', 'calc/view.html', 'calc/app.js', 'calc/index.html', 'quote/view.html', 'quote/app.js',
  'weight/view.html', 'weight/app.js', 'weight/report.js', 'checkup/view.html', 'checkup/app.js', 'checkup/report.js',
  'kit/report-kit.js', 'forms/view.js', 'forms/forms.js', 'edu/edu.js'];
// 列印路徑實際套用的 @page 在哪個檔案：[呼叫 print() 的檔案, 該行要包含的文字, @page 所在檔案, 原因]
const PRINT_PAGE = [
  ['calc/app.js', 'CALC_PRINT || window.print', ['index.html', 'calc/view.html'], '工作台用 CALC_PRINT（index.html），病人版直接列印 calc/view.html'],
  ['quote/app.js', 'QUOTE_PRINT || window.print', ['index.html', 'quote/view.html'], '工作台用 QUOTE_PRINT（index.html）'],
  ['checkup/report.js', 'win.print()', ['kit/report-kit.js'], '健檢報告的 iframe 樣式來自 report-kit.js 的 REPORT_CSS'],
];
// 規則 3：要在列印前執行 keepWords 的報告
const KEEP_WORDS = ['weight/report.js', 'checkup/report.js'];

function pageRules(src){
  src = src.replace(/\$\{[^}\n]*\}/g, 'X');   // 樣板字串的 ${...} 先換掉，裡面的 } 不是 @page 的結尾
  const out = [];
  const re = /@page\s*\{([^}]*)\}/g;
  let m;
  while((m = re.exec(src))) out.push({body: m[1], line: src.slice(0, m.index).split('\n').length});
  return out;
}
const zeroMargin = body=> /margin\s*:\s*0(?:mm|px)?\s*(?:;|$|!)/.test(body.trim());

function check(files){
  const errs = [];
  // 規則 1
  for(const [f, src] of Object.entries(files)){
    pageRules(src).forEach(p=>{ if(!zeroMargin(p.body)) errs.push(`規則 1：${f}:${p.line} @page{${p.body.trim()}} 的 margin 不是 0，列印會出現網址與日期`); });
  }
  // 規則 2
  for(const [f, src] of Object.entries(files)){
    src.split('\n').forEach((line, i)=>{
      if(!/\bprint\(\)/.test(line) || /^\s*(\/\/|\*)/.test(line)) return;
      const map = PRINT_PAGE.find(([pf, part])=> pf === f && line.includes(part));
      const targets = map ? map[2] : [f];
      const missing = targets.filter(t=> !pageRules(files[t] || '').some(p=> zeroMargin(p.body)));
      if(missing.length) errs.push(`規則 2：${f}:${i + 1} 呼叫 print()，但 ${missing.join('、')} 沒有 margin 為 0 的 @page`);
    });
  }
  // 規則 3
  KEEP_WORDS.forEach(f=>{ if(files[f] != null && !/keepWords\(/.test(files[f])) errs.push(`規則 3：${f} 沒有執行 keepWords()，自由文字換行可能切開詞語`); });
  if(files['index.html'] != null && !/kit\/keep-words\.js/.test(files['index.html'])) errs.push('規則 3：index.html 沒有載入 kit/keep-words.js');
  return errs;
}

if(process.argv.includes('--self-test')){
  const cases = [
    ['樣板字串裡的 @page 通過', {'a.js': "`@page{size:A4 ${x ? 1 : 2};margin:0;}`; f.print();"}, 0],
    ['邊界 14mm 要抓到', {'a.html': '@page{margin:14mm;}'}, 1],
    ['邊界 0 通過', {'a.html': '@page{size:A4; margin:0;}'}, 0],
    ['邊界 0 加 !important 通過', {'a.html': '@page { margin: 0 !important; }'}, 0],
    ['列印但沒有 @page 要抓到', {'a.js': 'win.print();'}, 1],
    ['列印且同檔有 @page 通過', {'a.js': "s='@page{margin:0;}'; win.print();"}, 0],
    ['註解裡的 print() 不算', {'a.js': '// win.print()'}, 0],
    ['報告沒有 keepWords 要抓到', {'weight/report.js': 'function x(){}'}, 1],
  ];
  let bad = 0;
  cases.forEach(([name, files, want])=>{ const got = check(files).length; if(got !== want){ bad++; console.log(`自我測試失敗：${name}（預期 ${want} 個錯誤，實際 ${got}）`); } });
  console.log(bad ? `自我測試 ${bad} 項失敗` : '自我測試全部通過');
  process.exit(bad ? 1 : 0);
}

const files = {};
FILES.forEach(f=>{ if(fs.existsSync(path.join(ROOT, f))) files[f] = read(f); });
const errs = check(files);
errs.forEach(e=> console.log(e));
console.log(errs.length ? `列印檢查：${errs.length} 項沒過` : '全部通過');
process.exit(errs.length ? 1 : 0);
