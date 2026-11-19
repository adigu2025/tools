/* 產生四個工具的深色模式樣式（quote/dark.css、calc/dark.css、weight/dark.css、checkup/dark.css）。
   用法（在 tools 資料夾）：node kit/build-dark.js          重新產生
                           node kit/build-dark.js --check  只檢查是否需要重新產生（檢查全部.js 用這個）

   為什麼用產生的：四個工具的畫面檔裡寫死了約 500 個顏色，一個一個手改容易漏，之後改了淺色也會忘記改深色。
   作法：讀各工具的樣式（view.html 的 <style> 與工作台外觀 hub.css），把每一條含顏色的規則照抄一份，
   顏色換成深色版，選擇器前面加上 :host([data-theme="dark"])（工作台切到深色時，hub.js 會把 data-theme 放在各工具的外框上）。
   換色規則：
   1. 一般顏色：保留色相，明暗反轉（L' = 0.95 − 0.83 × L）。深色字變淺色字、中間調的主色稍微提亮，對比度大致維持。
      接近白色的底色（L ≥ 0.86）不反轉層次：對應到工作台深色底的範圍，白卡片仍比底色亮一點；框線另外提亮。
      很淡的粉彩底降低彩度，不會變成濃濁的深色塊；中性灰帶一點暖色，和工作台外殼一致。
   2. 陰影（box-shadow、text-shadow、名稱含 shadow 的變數）：一律改成黑色、透明度加倍，深底上才看得出層次。
   3. 只處理螢幕顯示：@media print 的規則略過，輸出整份包在 @media screen 裡，列印與另存 PDF 不受影響。
   4. 病人版臨床計算（calc/index.html）與單獨開啟的工具不載入 dark.css，不受影響。
   改了某個工具的顏色之後重新執行一次，再把產生的 dark.css 一起 commit。 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const TOOLS = {
  quote: ['quote/view.html', 'quote/hub.css'],
  calc: ['calc/view.html', 'calc/hub.css'],
  weight: ['weight/view.html'],
  checkup: ['checkup/view.html'],
};
const ON = '[data-theme="dark"]';

/* ── 顏色換算 ── */
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
function parseColor(s) {
  s = s.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s].slice();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = i => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1], +m[2], +m[3], a];
  }
  return null;
}
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb([h, s, l]) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
}
const hex = c => '#' + c.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
const out = (rgb, a) => a >= 1 ? hex(rgb) : `rgba(${rgb.join(',')},${+a.toFixed(3)})`;
function darkColor(c, line) {
  let [h, s, l] = rgb2hsl(c);
  let nl;
  if (l >= 0.86) {
    // 接近白色的底色：不反轉層次，越白越亮一點（白色卡片仍浮在底色上），落在工作台深色底 #1C1B19 到 #272522 之間；
    // 框線與分隔線另外提亮，深底上才看得到
    nl = line ? 0.2 + (1 - l) * 0.6 : 0.105 + (l - 0.86) / 0.14 * 0.045;
    s = Math.min(s * 0.35, 0.08);   // 暖白底的黃色調在深底上會變成橄欖色，彩度壓低
  } else nl = 0.95 - 0.83 * l;
  if (s < 0.04) { h = 36; s = 0.06; }   // 中性灰帶一點暖色，和工作台外殼一致
  return out(hsl2rgb([h, s, nl]), c[3]);
}
const shadowColor = c => `rgba(0,0,0,${+Math.min(0.6, c[3] * 2 + 0.08).toFixed(3)})`;

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function mapValue(prop, val) {
  const shadow = /shadow/i.test(prop) || /drop-shadow/.test(val);
  let changed = false;
  const v = val.replace(COLOR_RE, m => {
    if (/^(?:white|black)$/i.test(m) && !/color|background|border|outline|fill|stroke|shadow|^--/i.test(prop)) return m;
    const c = parseColor(m);
    if (!c) return m;
    changed = true;
    return shadow ? shadowColor(c) : darkColor(c, /border|outline|line|rule|divider/i.test(prop));
  });
  return changed ? v : null;
}

/* ── CSS 解析（足夠處理這幾份手寫的樣式：規則、巢狀 @media，忽略註解與字串裡的大括號） ── */
function strip(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
function parse(css) {
  const items = []; let i = 0;
  function block() {
    const list = []; let buf = '';
    while (i < css.length) {
      const ch = css[i];
      if (ch === '"' || ch === "'") { const j = css.indexOf(ch, i + 1); buf += css.slice(i, j + 1); i = j + 1; continue; }
      if (ch === '{') {
        const head = buf.trim(); buf = ''; i++;
        if (head.startsWith('@')) list.push({ at: head, kids: block() });
        else { let body = ''; let depth = 0;
          while (i < css.length && !(css[i] === '}' && depth === 0)) { if (css[i] === '{') depth++; if (css[i] === '}') depth--; body += css[i++]; }
          i++; list.push({ sel: head, body }); }
        continue;
      }
      if (ch === '}') { i++; return list; }
      if (ch === ';' && buf.trim().startsWith('@')) { buf = ''; i++; continue; }   // @import、@charset 之類
      buf += ch; i++;
    }
    return list;
  }
  items.push(...block());
  return items;
}
function splitTop(s, sep) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === sep && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}
function darkSel(sel) {
  const parts = splitTop(sel, ',').map(p => p.trim()).filter(p => p && !/^(?::root|html|body)\b/.test(p));
  return parts.map(p => {
    if (p.startsWith(':host(')) {
      let depth = 0, k = 6;
      for (; k < p.length; k++) { if (p[k] === '(') depth++; if (p[k] === ')') { if (depth === 0) break; depth--; } }
      return p.slice(0, k) + ON + p.slice(k);
    }
    if (p.startsWith(':host')) return ':host(' + ON + ')' + p.slice(5);
    return ':host(' + ON + ') ' + p;
  }).join(',\n');
}
function decls(body) {
  return splitTop(body, ';').map(d => {
    const k = d.indexOf(':');
    if (k < 0) return null;
    const raw = d.slice(k + 1).trim();
    return [d.slice(0, k).trim(), raw.replace(/\s*!important\s*$/i, ''), /!important\s*$/i.test(raw)];
  }).filter(Boolean);
}
// 和顏色有關的屬性。這類宣告就算沒有寫死顏色（例如 color:var(--navy)）也照抄一份：
// 深色版的選擇器多了 :host([data-theme="dark"])，權重比原本高一級，只換有色碼的那幾條的話，
// 會蓋過原本權重較高、但沒寫死顏色的規則（例如 .btn{color:#fff} 的深色版蓋過 .btn.outline{color:var(--navy)}，外框按鈕的字就看不見）。
const COLOR_PROP = /^(?:color|background(?:-color|-image)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline(?:-color)?|fill|stroke|box-shadow|text-shadow|caret-color|accent-color|text-decoration-color|column-rule-color)$/i;
function emit(list, ind) {
  let s = '';
  for (const it of list) {
    if (it.at) {
      if (!/^@media/i.test(it.at) || /\bprint\b/i.test(it.at) && !/\bscreen\b/i.test(it.at)) continue;   // 只留螢幕用的 @media
      const inner = emit(it.kids, ind + '  ');
      if (inner) s += `${ind}${it.at}{\n${inner}${ind}}\n`;
      continue;
    }
    // 原本是 !important 的維持 !important，其餘不加：原本規則之間誰蓋誰的順序在深色版照舊
    // 抄了縮寫屬性（border、background、outline）時，同一條規則裡排在它後面、會被它重設的細項也一起抄，
    // 否則例如 {border:solid #9C978C; border-width:0 1.5px 1.5px 0} 只抄前一條，框線寬度會被重設成四邊都有（箭頭變菱形）
    const shorts = [];
    const ds = decls(it.body).map(([p, v, imp]) => {
      const nv = mapValue(p, v);
      const resetByShort = shorts.some(sh => p.toLowerCase().startsWith(sh + '-'));
      if (!nv && !COLOR_PROP.test(p) && !resetByShort) return null;
      if (/^(?:border(?:-(?:top|right|bottom|left))?|background|outline)$/i.test(p)) shorts.push(p.toLowerCase());
      return `${p}:${nv || v}${imp ? ' !important' : ''}`;
    }).filter(Boolean);
    const sel = darkSel(it.sel);
    if (ds.length && sel) s += `${ind}${sel.replace(/\n/g, '\n' + ind)}{${ds.join('; ')};}\n`;
  }
  return s;
}

function build(tool) {
  const css = TOOLS[tool].map(f => {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    return f.endsWith('.html') ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n') : src;
  }).join('\n');
  return `/* 由 kit/build-dark.js 自動產生，不要手改：改淺色樣式後執行 node kit/build-dark.js。
   來源：${TOOLS[tool].join('、')}。只在工作台切到深色時生效（外框帶 data-theme="dark"），列印不受影響。 */
@media screen{
${emit(parse(strip(css)), '')}}
`;
}

const check = process.argv.includes('--check');
let stale = [];
for (const tool of Object.keys(TOOLS)) {
  const file = path.join(ROOT, tool, 'dark.css'), css = build(tool);
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '';
  if (old === css) continue;
  if (check) stale.push(tool + '/dark.css');
  else { fs.writeFileSync(file, css); console.log('已產生 ' + tool + '/dark.css（' + css.split('\n').length + ' 行）'); }
}
if (check) {
  if (stale.length) { console.log('深色樣式過期：' + stale.join('、') + '，請執行 node kit/build-dark.js'); process.exit(1); }
  console.log('全部通過');
} else console.log('全部通過');
