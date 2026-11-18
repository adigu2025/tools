/* 測試共用：把工作台的程式載進 Node。
   這個 repo 沒有打包步驟，程式都是直接放在網頁裡執行的全域腳本，所以這裡用「假頁面＋ new Function」的方式載入，
   不改動原本的檔案結構。 */
const fs = require('fs');
const path = require('path');
const {makeDoc, makeGlobals} = require('./fake-dom.js');
const ROOT = path.join(__dirname, '..');
const read = f=> fs.readFileSync(path.join(ROOT, f), 'utf8');

/* 載入臨床計算（calc/app.js）。回傳 {doc, T}：doc 是假頁面，T 是 app.js 提供的測試入口（ocrRead、ocrApply、copy）。 */
function loadCalc(){
  const doc = makeDoc().seed(read('calc/view.html'));
  const win = makeGlobals(doc);
  const T = {};
  const names = Object.keys(win);
  const src = read('revision.js') + '\n' + read('calc/rules.js') + '\n' + read('calc/assess.js') + '\n' + read('calc/app.js');
  new Function('CD', 'CB', 'CALC_TEST', ...names, src)(doc, doc.body, T, ...names.map(k=> win[k]));
  // 填值並觸發重算：bound 是任何一個有綁計算的欄位
  const run = (vals, bound)=> { doc.set(vals); doc.fire(bound, 'input'); doc.fire(bound, 'change'); };
  return {doc, T, run};
}

/* 載入報價（quote/app.js）。回傳 app.js 掛在 QUOTE_TEST 上的資料與函式（品項、優惠規則、套組成分、findConflicts）。 */
function loadQuote(){
  const doc = makeDoc().seed(read('quote/view.html'));
  const win = makeGlobals(doc);
  const Q = {};
  const names = Object.keys(win);
  const src = read('revision.js') + '\n' + read('quote/data.js') + '\n' + read('quote/app.js');
  new Function('QD', 'QB', 'QUOTE_TEST', ...names, src)(doc, doc.body, Q, ...names.map(k=> win[k]));
  return Q;
}

/* 載入不碰頁面的共用程式（lab/lab.js、kit/report-kit.js 的純計算），回傳指定名稱的函式或常數。 */
function loadGlobals(files, names){
  const doc = makeDoc();
  const win = makeGlobals(doc);
  const g = Object.keys(win);
  const src = files.map(read).join('\n') + '\nreturn {' + names.join(',') + '};';
  return new Function(...g, src)(...g.map(k=> win[k]));
}

/* 從一個大檔裡只取出某個頂層函式（function 名稱(...){ ... } 到行首的 }），配上假頁面執行。
   用在 weight/app.js 這種整份載入成本太高、但想測其中一個公式的情況。 */
function pickFunction(file, name, scope){
  const src = read(file);
  const start = src.indexOf('\nfunction ' + name + '(');
  if(start < 0) throw new Error(file + ' 找不到函式 ' + name);
  const end = src.indexOf('\n}', start);
  const body = src.slice(start, end + 2);
  const keys = Object.keys(scope || {});
  return new Function(...keys, body + '\nreturn ' + name + ';')(...keys.map(k=> scope[k]));
}

/* 極簡的斷言與報告 */
function suite(title){
  let pass = 0, fail = 0;
  const eq = (name, got, want)=> {
    const ok = typeof want === 'number' && typeof got === 'number' ? Math.abs(got - want) < 1e-9 : got === want;
    if(ok) pass++; else { fail++; console.log(`失敗：${name}\n      預期 ${JSON.stringify(want)}\n      實際 ${JSON.stringify(got)}`); }
  };
  const near = (name, got, want, tol)=> {
    if(typeof got === 'number' && Math.abs(got - want) <= tol) pass++;
    else { fail++; console.log(`失敗：${name}\n      預期 ${want} ± ${tol}\n      實際 ${got}`); }
  };
  const has = (name, text, part)=> {
    if(String(text).includes(part)) pass++;
    else { fail++; console.log(`失敗：${name}\n      預期包含「${part}」\n      實際「${String(text).slice(0, 200)}」`); }
  };
  const done = ()=> { console.log(`${title}：通過 ${pass}，失敗 ${fail}`); return fail; };
  return {eq, near, has, done};
}
module.exports = {loadQuote, loadCalc, loadGlobals, pickFunction, suite, makeDoc, makeGlobals, read};
