// ============================================================
// 減重評估報告（2026-10 改版）
// 架構參考國內外高階健檢報告：封面 → 目錄與閱讀方式 → 評估總結（醫師評語、優先處理事項、
// 各系統燈號）→ 分章結果（數值、參考值、位置條、判讀）→ 治療與生活處方 → 追蹤計畫 → 附錄。
//
// 換頁不交給瀏覽器：在列印視窗裡把內容一段一段放進固定高度的 A4 頁面，實際量高度判斷放不放得下。
// 放不下就整段移到下一頁；只有比半頁還高的段落，才會在表格列與列、段落與段落之間拆開並標「（續）」。
// 文字不會從一行中間切斷，版型也不會因為內容溢出而跑掉。
// 數值的取用順序：上傳或實測的數值優先，沒有時才用公式估算，並在報告上標示來源。
// ============================================================

const RPT_FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&family=Noto+Serif+TC:wght@600;700;900&family=Cormorant+Garamond:wght@500;600&display=swap" rel="stylesheet">';

const REPORT_CSS = `
@page{size:A4; margin:0;}
*{box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
html,body{background:#fff;}
body{font-family:"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif; color:#24292B; font-size:13px; line-height:1.8;
  text-wrap:pretty; line-break:strict; -webkit-font-smoothing:antialiased;}
.serif,.rc-head h2,.rb-h,.rb-no,.toc .no,.toc .t,.toc .p,.kcal .v,.goal .w,.find .i,.big,.co-l,.tier h5,.tl-when,.rpt-hd b,.toc-head h2{
  font-family:"Noto Serif TC","Source Han Serif TC","PMingLiU",serif;}
#stage{position:absolute; left:-10000px; top:0; width:666px;}
body.preview{background:#E7E3DC; padding:28px 0 8px;}
body.preview .rpt-page{margin:0 auto 28px; box-shadow:0 2px 16px rgba(21,40,49,.18);}
@media print{
  body.preview{background:#fff; padding:0;}
  body.preview .rpt-page{margin:0; box-shadow:none;}
}

/* 頁面骨架：794 × 1123（A4，96 dpi），版型比照工作台的減重衛教單 */
.rpt-page{width:794px; height:1123px; overflow:hidden; position:relative; background:#fff; display:flex; flex-direction:column;
  padding:0 64px; break-after:page; page-break-after:always;}
.rpt-page:last-child{break-after:auto; page-break-after:auto;}
.rpt-hd{flex:none; height:76px; display:flex; align-items:flex-end; justify-content:space-between; padding-bottom:4px;
  font-size:11.5px; color:#6F6A62; letter-spacing:.2em;}
.rpt-hd .r{letter-spacing:.12em; color:#3B3A36;}
.rpt-hd b{color:#9A6E2A; font-size:16px; font-weight:700; letter-spacing:.04em; margin-left:8px;}
.rpt-body{flex:1; min-height:0; overflow:hidden; padding-top:26px;}
.rpt-ft{flex:none; height:70px; display:flex; justify-content:space-between; align-items:flex-start; padding-top:12px;
  border-top:1px solid #E6E1D8; font-size:10.5px; color:#6F6A62; line-height:1.7; letter-spacing:.04em;}
.rpt-ft .pg{font-variant-numeric:tabular-nums; color:#3B3A36; letter-spacing:.08em; padding-top:2px;}

/* 章首：襯線大標＋一句說明＋深色細線 */
.rc-head{padding-bottom:20px; margin-bottom:26px; border-bottom:1px solid #24292B;}
.rc-head h2{font-size:42px; color:#1F262A; letter-spacing:.04em; line-height:1.2; font-weight:700;}
.rc-head .lead{font-size:14.5px; color:#55524B; margin-top:12px; line-height:1.7;}

/* 段落：左欄金色序號＋襯線小標，右欄內容，段落之間淡色細線 */
.rb{display:grid; grid-template-columns:150px 1fr; border-top:1px solid #E6E1D8; padding-top:22px; margin-top:22px;}
.rpt-body > .rb:first-child, .rc-head + .rb{border-top:0; padding-top:0; margin-top:0;}
.rb-l{padding-right:16px;}
.rb-no{font-size:13px; color:#9A6E2A; letter-spacing:.14em; line-height:1.4; font-weight:700;}
.rb-no:empty{display:none;}
.rb-h{font-size:17.5px; font-weight:700; color:#1F262A; line-height:1.45; letter-spacing:.04em; margin-top:2px;}
.rb-h .cont{display:block; font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif; font-style:normal; font-size:11.5px; font-weight:400; color:#9A9387; letter-spacing:.06em;}
.rb-r{min-width:0;}
.muted{color:#66615A;} .small{font-size:11.5px;}
.na{color:#8A847A; font-weight:400;}
.empty{font-size:12.5px; color:#77716A;}
.note-line{font-size:12px; color:#5F5A53; margin-top:10px; line-height:1.75;}
.mark{font-weight:700; color:#1F262A; background:linear-gradient(transparent 60%, #EFE1C2 60%);}

/* 提示框：米色（一般）與淡紅（就醫），左側襯線標籤 */
.rb.callout{grid-template-columns:118px 1fr; background:#F7F4EC; padding:18px 22px 18px 24px; border-top:0;}
.rb.callout.red{background:#FAEDEA;}
.co-l{font-size:16px; font-weight:700; color:#9A6E2A; letter-spacing:.1em; line-height:1.75;}
.callout.red .co-l{color:#A3362F;}
.co-r{font-size:13.5px; color:#2F3436;}

/* 判讀與資料來源：彩色文字，不用圓角標籤 */
.pill{font-size:11.5px; font-weight:700; letter-spacing:.12em; white-space:nowrap;}
.g0{color:#3F6E4D;} .g1{color:#8A5F1F;} .g2{color:#A8352F;} .gna{color:#8A847A; font-weight:400;}
.src{font-size:9.5px; color:#3E6A7C; margin-left:5px; letter-spacing:.08em; font-weight:500; white-space:nowrap; vertical-align:1px;}
.src::before{content:'／';  color:#B9C9CF; margin-right:2px;}
.arrow{font-weight:700; margin-left:3px;}
.arrow.hi{color:#B3413B;} .arrow.lo{color:#2F5D8A;}

/* 表格 */
.rt{width:100%; border-collapse:collapse; table-layout:fixed; font-size:12.5px;}
.rt th{font-size:11px; letter-spacing:.12em; color:#66615A; font-weight:400; text-align:left; padding:0 6px 7px; border-bottom:1px solid #24292B;}
.rt td{padding:8px 6px; border-bottom:1px solid #ECE7DE; vertical-align:middle; overflow-wrap:anywhere;}
.rt td.n{font-variant-numeric:tabular-nums; font-weight:700; color:#1F262A; font-size:13.5px; white-space:nowrap;}
.rt td.n .u{font-size:10.5px; color:#77716A; font-weight:400; margin-left:3px;}
.rt td.ref{font-size:11.5px; color:#6F6A62; font-variant-numeric:tabular-nums; white-space:nowrap;}
.rt td.c{text-align:right;} .rt th.c{text-align:right;}
.rt .en{display:block; font-size:10.5px; color:#77716A; letter-spacing:.02em; line-height:1.45;}
.rt tr.grp td{padding:14px 6px 4px; font-size:11.5px; font-weight:700; color:#9A6E2A; letter-spacing:.2em; border-bottom:1px solid #E6E1D8;}
.rt tr:first-child.grp td{padding-top:6px;}
.rt.kv th{width:26%; font-size:12px; letter-spacing:.1em; color:#9A6E2A; font-weight:700; padding:9px 6px; border-bottom:1px solid #ECE7DE; vertical-align:top;}
.rt.kv td{padding:9px 6px; line-height:1.75;}
.rt.kv tr:first-child th, .rt.kv tr:first-child td{padding-top:2px;}
.rt.track th,.rt.track td{text-align:center; padding-left:2px; padding-right:2px; font-variant-numeric:tabular-nums;}
.rt.track td{font-size:12px;}
.bar{display:block;}

/* 總結 */
.memo .rich p{font-size:13.5px;}
.find{display:grid; grid-template-columns:24px 1fr auto; gap:12px; align-items:baseline; padding:8px 0; border-bottom:1px solid #ECE7DE;}
.find:first-child{padding-top:0;}
.find .i{font-weight:700; color:#9A6E2A; font-size:14px; font-variant-numeric:tabular-nums;}
.find .t{font-size:12.5px; color:#2F3436; line-height:1.7; white-space:nowrap;}
.find .t b{color:#1F262A;}
.tiles{display:grid; grid-template-columns:repeat(5,1fr); column-gap:12px; row-gap:16px;}
.tile{border-top:2px solid #24292B; padding-top:8px;}
.tile .k{font-size:12px; color:#1F262A; font-weight:700; letter-spacing:.08em; white-space:nowrap;}
.tile .v{font-size:14px; font-weight:500; color:#1F262A; margin:4px 0 2px; line-height:1.4; font-variant-numeric:tabular-nums; white-space:nowrap;}
.tile .v small{font-size:10.5px; color:#9A9387; font-weight:400;}
.tile .v .na{font-size:12.5px;}
.goal{display:grid; grid-template-columns:repeat(4,1fr); position:relative;}
.goal::before{content:''; position:absolute; left:7px; width:50%; top:6px; height:2px; background:#24292B;}
.goal::after{content:''; position:absolute; left:calc(50% + 7px); width:25%; top:6px; height:0; border-top:2px dashed #9A6E2A;}
.goal .st{position:relative; padding-right:8px;}
.goal .pt{width:14px; height:14px; border-radius:50%; background:#fff; border:3px solid #24292B; position:relative; z-index:1;}
.goal .st.end .pt{border-color:#9A6E2A; background:#9A6E2A;}
.goal .lbl{font-size:11px; letter-spacing:.08em; color:#66615A; margin-top:10px; white-space:nowrap;}
.goal .w{font-size:24px; font-weight:700; color:#1F262A; line-height:1.3; font-variant-numeric:tabular-nums;}
.goal .w small{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif; font-size:11px; color:#9A9387; font-weight:400; margin-left:3px;}
.goal .st.end .w{color:#9A6E2A;}
.goal .b{font-size:11.5px; color:#6F6A62;}
/* 評估醫師與日期：放在「評估總結」標題列右側，不另佔高度 */
.rc-head{position:relative;}
.rc-sign{position:absolute; right:0; bottom:20px; height:24.65px; display:grid; grid-template-columns:auto 130px auto 96px; gap:8px; align-items:center; font-size:12px; line-height:1; color:#4A4740; letter-spacing:.12em;}
.rc-sign .ln{border-bottom:1px solid #24292B; height:16px; align-self:start;}

/* 體位 */
.bmi-top{display:flex; align-items:flex-end; gap:16px; margin-bottom:12px;}
.big{font-size:50px; font-weight:700; color:#1F262A; line-height:.95; font-variant-numeric:tabular-nums;}
.big small{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif; font-size:12.5px; font-weight:400; color:#9A9387; margin-left:5px;}
.bmi-top .facts{margin-left:auto; display:grid; grid-template-columns:auto auto; column-gap:14px; row-gap:0; font-size:12px; color:#6F6A62; white-space:nowrap;}
.bmi-top .facts b{color:#1F262A; font-weight:500; font-variant-numeric:tabular-nums;}
.pheno{display:flex; gap:12px; align-items:baseline; padding-top:12px; font-size:12px;}
.pheno b{font-size:14px; color:#1F262A; letter-spacing:.04em;}

/* 治療階梯：每一階一列，本次所在的階層以米色底標出 */
.tier{display:grid; grid-template-columns:158px 1fr; gap:14px; padding:12px 12px 12px 0; border-bottom:1px solid #ECE7DE;}
.tier:first-child{padding-top:0;}
.tier .n{font-size:11px; letter-spacing:.16em; color:#9A6E2A; font-weight:700;}
.tier h5{font-size:15px; color:#1F262A; letter-spacing:.04em; line-height:1.5;}
.tier .when{font-size:10.5px; color:#6F6A62; line-height:1.6; margin-top:2px; white-space:nowrap;}
.tier p{font-size:12px; color:#3B3A36; line-height:1.75;}
.tier.on{background:#F7F4EC; margin:0 -12px; padding:12px;}
.tier .now{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif; font-size:11px; color:#9A6E2A; font-weight:700; margin-left:6px; letter-spacing:.1em;}

/* 熱量：三欄，每欄上方深色粗線 */
.kcal{display:grid; grid-template-columns:repeat(3,1fr); column-gap:14px;}
.kcal > div{border-top:2px solid #24292B; padding-top:8px;}
.kcal .k{font-size:12px; color:#1F262A; font-weight:700; letter-spacing:.06em;}
.kcal .v{font-size:28px; font-weight:700; color:#1F262A; line-height:1.3; font-variant-numeric:tabular-nums;}
.kcal .v small{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif; font-size:11.5px; color:#9A9387; font-weight:400; margin-left:4px;}
.kcal .main .v{color:#9A6E2A;}
.kcal .s{font-size:11px; color:#66615A; line-height:1.6;}
.macro{display:flex; height:8px; margin:18px 0 10px;}
.macro i{display:block; height:100%;}
.macro-lg{display:grid; grid-template-columns:repeat(3,1fr); column-gap:14px; font-size:12px;}
.macro-lg b{display:block; font-size:15px; color:#1F262A; font-variant-numeric:tabular-nums;}
.macro-lg .sw{display:inline-block; width:8px; height:8px; margin-right:6px;}
.warn{font-size:12.5px; color:#B3413B; font-weight:700; margin-top:10px; line-height:1.75;}

/* 自由文字 */
.rich h4{font-size:13.5px; font-weight:700; color:#1F262A; margin:14px 0 2px; letter-spacing:.04em;}
.rich > h4:first-child{margin-top:0;}
.rich p{margin:0 0 3px;}
.rich .li{padding-left:16px; position:relative; margin:0 0 3px;}
.rich .li::before{content:''; position:absolute; left:2px; top:.72em; width:6px; height:6px; background:#C9A15E;}
.rich .note{font-size:12px; color:#5F5A53;}

/* 量表 */
.scale-row{display:grid; grid-template-columns:140px 1fr; gap:16px; align-items:center;}
.scale-row .score{font-size:12px; color:#66615A;}
.scale-row .score b{display:block; font-family:"Noto Serif TC","Source Han Serif TC","PMingLiU",serif; font-size:30px; color:#1F262A; line-height:1.25;}
.items{margin-top:10px; font-size:12px; color:#4A4740; line-height:1.75;}

/* 回診時程：左欄時間（襯線大字），右欄重點 */
.tl-row{display:grid; grid-template-columns:120px 1fr; gap:14px; padding:12px 0; border-bottom:1px solid #ECE7DE;}
.tl-row:first-child{padding-top:0;}
.tl-when{font-size:22px; font-weight:700; color:#1F262A; line-height:1.3; white-space:nowrap;}
.tl-row:first-child .tl-when{color:#9A6E2A;}
.tl-sub{font-size:11px; color:#66615A; line-height:1.6; white-space:nowrap;}
.tl-row h4{font-size:13.5px; color:#1F262A; font-weight:700; line-height:1.6;}
.tl-row .what{font-size:12.5px; color:#3B3A36; line-height:1.75;}
.chart svg{width:100%; height:auto; display:block; border:0 !important; border-top:1px solid #24292B !important; border-radius:0 !important; padding-top:6px; margin-top:16px;}

/* 封面：依診所設計稿重建，位置由設計稿等比換算；個人資料由系統帶入 */
.rpt-page.cover{padding:0; display:block; color:#1F2A26;}
.cover .cv-wm{position:absolute; left:81px; top:-106px; width:1217px; height:1521px; display:block; pointer-events:none;}
.cover .cv-bar{position:absolute; left:0; right:0; top:0; height:9px; background:#2E5244; box-shadow:0 2px 0 #C9A15E;}
.cover .cv-brand{position:absolute; left:72px; top:64px; display:flex; align-items:center; gap:14px;}
.cover .cv-mark{width:36px; height:auto; display:block;}
.cover .cv-zh{font-size:16px; font-weight:700; letter-spacing:.24em; color:#202A26; line-height:1.3;}
.cover .cv-en{font-family:"Cormorant Garamond","Times New Roman",serif; font-size:12px; font-weight:500; letter-spacing:.3em; color:#4B5852; line-height:1.3; margin-top:5px;}
.cover .cv-rule{position:absolute; left:72px; right:72px; top:129px; border-top:1px solid #DEE2E1;}
.cover .cv-title{position:absolute; left:72px; top:340px;}
.cover .cv-kicker{font-family:"Cormorant Garamond","Times New Roman",serif; font-size:14px; font-weight:600; letter-spacing:.42em; color:#9A6E2A; line-height:1;}
.cover h1{font-family:"Noto Serif TC","Source Han Serif TC","PMingLiU",serif; font-size:68px; font-weight:900; letter-spacing:.03em; line-height:1; color:#14251F; margin-top:33px;}
.cover .cv-line{width:56px; height:3px; background:#BC7F30; margin-top:36px;}
.cover .cv-sub{font-size:14.5px; letter-spacing:.22em; color:#4A524E; line-height:1; margin-top:28px;}
.cover .cv-info{position:absolute; left:72px; top:741px; width:521px;}
.cover .cv-info-h{display:flex; align-items:baseline; gap:16px; line-height:1;}
.cover .cv-info-h b{font-size:13.5px; letter-spacing:.2em; color:#2F5445;}
.cover .cv-info-h span{font-family:"Cormorant Garamond","Times New Roman",serif; font-size:12.5px; font-weight:500; letter-spacing:.3em; color:#5E6662;}
.cover .cv-grid{display:grid; grid-template-columns:240px 240px; column-gap:41px; margin-top:28px;}
.cover .cv-f{display:flex; align-items:center; height:55px; border-bottom:1px solid #CDD4D0;}
.cover .cv-f .k{flex:none; width:81px; font-size:12.5px; letter-spacing:.2em; color:#5E6662;}
.cover .cv-f .v{font-size:17px; font-weight:500; color:#1F2A26; letter-spacing:.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums;}
.cover .cv-f .v.na{color:#8C9490; font-weight:400;}
.cover .cv-foot{position:absolute; left:72px; right:72px; top:1006px; padding-top:16px; border-top:1px solid #DEE2E1;
  display:flex; justify-content:space-between; font-size:12px; line-height:24px; color:#5E6662; letter-spacing:.02em;}
.cover .cv-foot .r{text-align:right;}

/* 目錄頁 */
.toc-head{padding-bottom:20px; margin-bottom:6px; border-bottom:1px solid #24292B;}
.toc-head h2{font-size:42px; color:#1F262A; letter-spacing:.04em; line-height:1.2;}
.toc-head .lead{font-size:14.5px; color:#55524B; margin-top:12px;}
.toc{display:grid; grid-template-columns:54px 1fr auto; align-items:baseline; padding:13px 0; border-bottom:1px solid #ECE7DE;}
.toc .no{font-size:16px; color:#9A6E2A; font-weight:700; letter-spacing:.1em;}
.toc .t{font-size:19px; color:#1F262A; font-weight:700; letter-spacing:.06em;}
.toc .p{font-size:16px; color:#3B3A36; font-variant-numeric:tabular-nums;}
.howto{margin-top:34px; grid-template-columns:1fr !important;}
.howto .co-l{margin-bottom:10px;}
.howto p{white-space:nowrap;}
.howto .lg{display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:12px;}
.howto .lg div{font-size:12px; color:#3B3A36; line-height:1.7;}
.howto p{font-size:12.5px; color:#3B3A36; line-height:1.85; margin-top:6px;}

/* 附錄名詞表：整頁寬，每列說明都不自動換行 */
.rb.full{display:block;}
.gloss .rt.kv th{width:150px; padding:8px 6px 8px 0;}
.gloss .rt.kv td{padding:8px 6px; white-space:nowrap; line-height:1.7;}

/* 附件 */
.rb.att{display:block; border:0; padding:0; margin:0;}
.att .rb-h{margin-bottom:12px;}
.att img{display:block; max-width:100%; margin:0 auto; border:1px solid #E4DED3; object-fit:contain;}
`;

// ---------- 取值與判讀 ----------
function rS(id){ const e = document.getElementById(id); return e ? String(e.value == null ? '' : e.value).trim() : ''; }
function rN(id){ const v = parseFloat(rS(id)); return isNaN(v) ? null : v; }
function rMale(){ return rS('p-gender') === 'M'; }
// cuts：[[上限, 等級], …]，數值小於上限就取該等級；等級 0 正常、1 注意、2 異常
function rGrade(v, cuts){
  if(v == null || !cuts) return -1;
  for(const [lim, g] of cuts){ if(v < lim) return g; }
  return -1;
}
const R_GRADE_TXT = ['正常', '注意', '異常'];
function rPill(g, txt){ return `<span class="pill ${g < 0 ? 'gna' : 'g' + g}">${txt || (g < 0 ? '未評估' : R_GRADE_TXT[g])}</span>`; }
function rSrc(t){ return t ? `<span class="src">${t}</span>` : ''; }
function rUp(id){ return (typeof FIELD_SRC !== 'undefined' && FIELD_SRC[id] === 'upload') ? '上傳' : ''; }
function rMax(...gs){ return gs.reduce((a, b)=> Math.max(a, b), -1); }
const R_EPS = 1e-9;

// 數值在參考範圍上的位置：灰底長條＋分區色塊＋指標
function rBar(v, scale, cuts, W){
  if(v == null || !scale || !cuts) return '';
  W = W || 116;
  const [lo, hi] = scale, H = 20, y = 10, bh = 5;
  const x = t => Math.max(0, Math.min(W, (t - lo) / (hi - lo) * W));
  const col = ['#A9CBB4', '#E8C88E', '#DD9A92'];
  let segs = '', start = lo;
  for(const [lim, g] of cuts){
    const end = Math.min(lim, hi);
    if(end > start) segs += `<rect x="${x(start).toFixed(1)}" y="${y}" width="${(x(end) - x(start)).toFixed(1)}" height="${bh}" fill="${col[g]}"/>`;
    start = Math.max(start, lim);
    if(start >= hi) break;
  }
  const mx = x(v);
  return `<svg class="bar" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect x="0" y="${y}" width="${W}" height="${bh}" fill="#EEEAE3"/>${segs}` +
    `<path d="M${mx.toFixed(1)} ${y - 1} l-4 -6 h8 z" fill="#152831"/><rect x="${(mx - .75).toFixed(1)}" y="${y - 1}" width="1.5" height="${bh + 2}" fill="#152831"/></svg>`;
}

// 分數量表（STOP-BANG、PHQ-9）。cells 是可能分數的個數（0 到 8 分共 9 格），標記畫在該分數那一格的中間
function rScale(v, cells, bands, W){
  W = W || 440;
  const H = 46, y = 14, bh = 8;
  const x = t => t / cells * W;
  const col = ['#A9CBB4', '#E8C88E', '#DD9A92'];
  let s = '', from = 0;
  bands.forEach(([to, g, label])=>{
    s += `<rect x="${x(from).toFixed(1)}" y="${y}" width="${(x(to) - x(from)).toFixed(1)}" height="${bh}" fill="${col[g]}"/>` +
         `<text x="${((x(from) + x(to)) / 2).toFixed(1)}" y="${y + bh + 15}" text-anchor="middle" font-size="10.5" fill="#7D776D">${label}</text>`;
    from = to;
  });
  const mx = v == null ? null : x(Math.max(0, Math.min(cells - 1, v)) + .5);
  const mk = mx == null ? '' : `<path d="M${mx.toFixed(1)} ${y - 1} l-5 -8 h10 z" fill="#152831"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${s}${mk}</svg>`;
}

// 中文手動斷行：只在標點後面斷開，每行不超過 max 個全形字寬，不從詞語中間切斷。
// 寬度以全形字為 1、英數字約 0.56 估算；max 依各區塊的實際寬度與字級設定，並留一點餘裕。
function rW(s){
  let w = 0;
  for(const ch of String(s)) w += /[⺀-鿿豈-﫿︰-﹏＀-｠　-〿]/.test(ch) ? 1 : .56;
  return w;
}
function rSplit(text, max){
  const parts = String(text == null ? '' : text).match(/[^，。；：、！？）」]*[，。；：、！？）」]*/g).filter(Boolean);
  const lines = [];
  let cur = '';
  parts.forEach(p=>{
    if(cur && rW(cur + p) > max){ lines.push(cur); cur = p; }
    else cur += p;
  });
  if(cur) lines.push(cur);
  return lines;
}
function rBr(text, max){ return rSplit(text, max).map(esc).join('<br>'); }
// 多行文字（使用者輸入）：保留原本的換行，每一行再依標點斷行
function rLines(text, max){ return String(text || '').split('\n').filter(l=> l.trim()).map(l=> rBr(l.trim(), max)).join('<br>'); }

// 文字框內容轉成段落：【標題】成小標，• 開頭成項目，※ 開頭成附註。每一行是可換頁的最小單位，小標不會孤單留在頁尾
function rRich(text, max){
  max = max || 36;
  const out = [];
  String(text || '').replace(/\r/g, '').split('\n').forEach(raw=>{
    const l = raw.trim();
    if(!l) return;
    let m;
    if((m = l.match(/^【(.+?)】\s*(.*)$/))){
      out.push(`<h4 class="ru keep">${esc(m[1])}</h4>`);
      if(m[2]) out.push(`<p class="ru">${rBr(m[2], max)}</p>`);
      return;
    }
    if((m = l.match(/^[•・●▪︎]\s*(.+)$/)) || (m = l.match(/^[-－]\s+(.+)$/))){ out.push(`<div class="li ru">${rBr(m[1], max - 1.2)}</div>`); return; }
    if(/^※/.test(l)){ out.push(`<p class="note ru">${rBr(l, max * 13 / 12)}</p>`); return; }
    out.push(`<p class="ru">${rBr(l, max)}</p>`);
  });
  return out.join('');
}
function rBlock(title, en, inner, opt){
  opt = opt || {};
  return `<div class="rb${opt.cls ? ' ' + opt.cls : ''}"${opt.split ? ' data-split="1"' : ''}>` +
    `<div class="rb-l"><div class="rb-no"></div><h3 class="rb-h">${title}</h3></div><div class="rb-r">${inner}</div></div>`;
}
// 米色或淡紅的提示框（比照衛教單的「效果不如預期」「提早就醫」）
function rCallout(label, inner, red){
  return `<div class="rb callout${red ? ' red' : ''}" data-split="1"><div class="co-l">${label}</div><div class="co-r rich ru-host">${inner}</div></div>`;
}
function rRichBlock(title, en, text, cls){
  if(!String(text || '').trim()) return '';
  return rBlock(title, en, `<div class="rich ru-host${cls ? ' ' + cls : ''}">${rRich(text)}</div>`, {split:true});
}
function rAddDays(base, d){ const t = new Date(base + 'T00:00:00'); t.setDate(t.getDate() + d); return rYmd(t); }
function rAddMonths(base, m){
  const t = new Date(base + 'T00:00:00'), day = t.getDate();
  t.setDate(1); t.setMonth(t.getMonth() + m);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return rYmd(t);
}
function rYmd(t){ return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
function rDateZh(s){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[1]} 年 ${+m[2]} 月 ${+m[3]} 日` : (s || ''); }

// ---------- 判讀標準 ----------
function rLabMeta(){
  const m = rMale();
  const lim = (a, b)=> (m ? a : b);
  return [
    {grp:'血糖與胰島素阻抗'},
    {k:'ac',    zh:'空腹血糖',       en:'Glucose AC',  u:'mg/dL', ref:'70–99',  scale:[60, 160], cuts:[[100, 0], [126, 1], [Infinity, 2]]},
    {k:'hba1c', zh:'糖化血色素',     en:'HbA1c',       u:'%',     ref:'< 5.7',  scale:[4, 9],    cuts:[[5.7, 0], [6.5, 1], [Infinity, 2]]},
    {k:'homa',  zh:'胰島素阻抗指數', en:'HOMA-IR',     u:'',      ref:'無統一切點'},
    {grp:'血脂'},
    {k:'tcho',  zh:'總膽固醇',       en:'T-CHO',       u:'mg/dL', ref:'< 200',  scale:[120, 300], cuts:[[200, 0], [240, 1], [Infinity, 2]]},
    {k:'tg',    zh:'三酸甘油酯',     en:'TG',          u:'mg/dL', ref:'< 150',  scale:[40, 400],  cuts:[[150, 0], [200, 1], [Infinity, 2]]},
    {k:'hdl',   zh:'高密度膽固醇',   en:'HDL-C',       u:'mg/dL', ref:'≥ ' + lim(40, 50), scale:[20, 90], cuts:[[lim(40, 50), 1], [Infinity, 0]]},
    {k:'ldl',   zh:'低密度膽固醇',   en:'LDL-C',       u:'mg/dL', ref:'< 130',  scale:[50, 220],  cuts:[[130, 0], [160, 1], [Infinity, 2]]},
    {grp:'肝功能'},
    {k:'alt',   zh:'丙胺酸轉胺酶',   en:'ALT（GPT）',  u:'U/L',   ref:'≤ 40',   scale:[0, 160],   cuts:[[40 + R_EPS, 0], [120 + R_EPS, 1], [Infinity, 2]]},
    {k:'ast',   zh:'天門冬胺酸轉胺酶', en:'AST（GOT）', u:'U/L',   ref:'≤ 40',   scale:[0, 160],   cuts:[[40 + R_EPS, 0], [120 + R_EPS, 1], [Infinity, 2]]},
    {grp:'腎功能與尿酸'},
    {k:'cr',    zh:'肌酸酐',         en:'Creatinine',  u:'mg/dL', ref:'≤ ' + lim('1.3', '1.1'), scale:[.3, 2.5], cuts:[[lim(1.3, 1.1) + R_EPS, 0], [Infinity, 1]]},
    {k:'egfr',  zh:'腎絲球過濾率',   en:'eGFR（mL/min/1.73m²）', u:'', ref:'≥ 60', scale:[0, 130], cuts:[[30, 2], [60, 1], [Infinity, 0]]},
    {k:'ua',    zh:'尿酸',           en:'Uric Acid',   u:'mg/dL', ref:'≤ ' + lim('7.0', '6.0'), scale:[2, 11], cuts:[[lim(7, 6) + R_EPS, 0], [Infinity, 1]]},
    {grp:'甲狀腺'},
    {k:'tsh',   zh:'甲狀腺刺激素',   en:'TSH',         u:'μIU/mL', ref:'0.4–4.0', scale:[0, 8], cuts:[[.4, 1], [4 + R_EPS, 0], [Infinity, 1]]},
  ];
}
// eGFR：檢驗單有數值就用檢驗值，沒有才依肌酸酐估算
function rLabValue(k){
  const v = rN('lab-' + k);
  if(v != null) return {v, src: rUp('lab-' + k)};
  if(k === 'egfr' && typeof egfrEstimate === 'function'){
    const e = egfrEstimate();
    if(e != null) return {v: Math.round(e), src:'估算'};
  }
  return {v:null, src:''};
}
function rBodyMeta(){
  const m = rMale();
  return [
    {id:'t-fat',        zh:'體脂肪率',     en:'Body Fat',            u:'%',  ref: m ? '< 25%' : '< 30%', scale:[5, 50], cuts:[[m ? 25 : 30, 0], [Infinity, 2]]},
    {id:'t-fatmass',    zh:'體脂肪量',     en:'Fat Mass',            u:'kg', ref:''},
    {id:'t-muscle',     zh:'肌肉量',       en:'Muscle Mass',         u:'kg', ref:''},
    {id:'t-visceral',   zh:'內臟脂肪等級', en:'Visceral Fat Level',  u:'',   ref:'1–9', scale:[1, 25], cuts:[[10, 0], [15, 1], [Infinity, 2]]},
    {id:'t-water',      zh:'身體水分率',   en:'Total Body Water',    u:'%',  ref: m ? '50–65%' : '45–60%', scale:[35, 75], cuts: m ? [[50, 1], [65 + R_EPS, 0], [Infinity, 1]] : [[45, 1], [60 + R_EPS, 0], [Infinity, 1]]},
    {id:'t-smi',        zh:'四肢骨骼肌指數', en:'SMI',               u:'kg/m²', ref: m ? '≥ 7.0' : '≥ 5.7', scale:[4, 11], cuts:[[m ? 7 : 5.7, 1], [Infinity, 0]]},
    {id:'t-phaseangle', zh:'相位角',       en:'Phase Angle',         u:'°',  ref:'≥ 4.5°', scale:[2, 9], cuts:[[4.5, 1], [Infinity, 0]]},
    {id:'t-bodyage',    zh:'身體年齡',     en:'Body Age',            u:'歲', ref:''},
  ];
}

// ---------- 評估資料整理（報告各章共用） ----------
function rCollect(){
  const male = rMale();
  const h = rN('b-height'), w = rN('b-weight');
  const bmi = (h && w) ? w / Math.pow(h / 100, 2) : null;
  const d = {male, h, w, bmi, age: rN('p-age')};
  d.gBmi = bmi == null ? -1 : rGrade(bmi, [[18.5, 1], [24, 0], [27, 1], [Infinity, 2]]);
  d.bmiCat = bmi == null ? '' : bmiCategory(bmi).label;
  d.waist = rN('b-waist');
  d.waistCut = male ? 90 : 80;
  d.gWaist = d.waist == null ? -1 : (d.waist >= d.waistCut ? 2 : 0);
  d.sbp = rN('b-sbp'); d.dbp = rN('b-dbp');
  d.gBp = (d.sbp == null || d.dbp == null) ? -1 : ((d.sbp >= 140 || d.dbp >= 90) ? 2 : (d.sbp >= 130 || d.dbp >= 80) ? 1 : 0);
  d.lab = {};
  rLabMeta().forEach(x=>{
    if(!x.k) return;
    const lv = rLabValue(x.k);
    d.lab[x.k] = Object.assign({}, x, lv, {g: rGrade(lv.v, x.cuts)});
  });
  d.body = {};
  rBodyMeta().forEach(x=>{
    const v = rN(x.id);
    let g = rGrade(v, x.cuts);
    if(x.id === 't-bodyage' && v != null && d.age != null) g = v > d.age ? 1 : 0;
    d.body[x.id] = Object.assign({}, x, {v, g, src: rUp(x.id)});
  });
  const fatty = rS('us-fatty');
  d.fatty = fatty;
  d.gFatty = !fatty ? -1 : fatty === '無脂肪肝' ? 0 : fatty === '輕度脂肪肝' ? 1 : 2;
  const thy = rS('us-thyroid');
  d.thyUs = thy;
  d.gThyUs = !thy ? -1 : thy === '無異常' ? 0 : 1;
  const ms = ['ms-waist', 'ms-glucose', 'ms-bp', 'ms-tg', 'ms-hdl'];
  d.msCount = ms.filter(id=> chk(id)).length;
  const hb = rN('ms-hba1c');
  d.msHba1c = hb != null && hb >= 5.7 && hb <= 6.4;
  d.msPositive = d.msCount >= 3 || d.msHba1c;
  d.msAny = d.msCount > 0 || hb != null || ['b-waist', 'b-sbp', 'lab-ac', 'lab-tg', 'lab-hdl'].some(id=> rS(id));
  // 睡眠：問卷沒有勾任何一題、也沒手動輸入分數時，視為未評估（系統自動加的年齡、性別、BMI 分數不單獨成立）
  const sbAnswered = STOPBANG_ITEMS.some(it=> chk(it.id)) || rS('stopbang-manual') !== '';
  d.sb = sbAnswered ? calcStopBang() : null;
  d.sbItems = STOPBANG_ITEMS.filter(it=> chk(it.id)).map(it=> it.label);
  d.gSb = d.sb == null ? -1 : d.sb >= 5 ? 2 : d.sb >= 3 ? 1 : 0;
  const phq = calcPhq9();
  d.phq = phq;
  d.gPhq = !phq ? -1 : (phq.item9 >= 1 || phq.total >= 10) ? 2 : phq.total >= 5 ? 1 : 0;
  return d;
}

function rScreeningLists(){
  const sc = [];
  [['sc-thyroid','甲狀腺功能低下'],['sc-cushing','庫欣氏症候群'],['sc-pcos','多囊性卵巢症候群'],['sc-hypothal','下視丘病灶'],
   ['sc-gh','生長激素缺乏症'],['sc-hypogonad','性腺功能低下症'],['sc-genetic','遺傳性肥胖症候群']].forEach(([id, t])=>{ if(chk(id)) sc.push(t); });
  if(chk('sc-other')) sc.push(otherLabel('sc-other-text'));
  const meds = [];
  [['med-steroid','類固醇'],['med-psych','抗精神病藥／抗憂鬱藥'],['med-insulin','胰島素'],['med-bb','乙型阻斷劑'],
   ['med-antiepileptic','抗癲癇藥物'],['med-hormone','荷爾蒙避孕藥'],['med-antihistamine','抗組織胺藥物'],['med-chemo','化療藥物']].forEach(([id, t])=>{ if(chk(id)) meds.push(t); });
  if(chk('med-other')) meds.push(otherLabel('med-other-text'));
  return {sc, meds};
}

// 優先處理事項：所有判讀為「注意」「異常」的項目，異常在前
function rFindings(d){
  const f = [];
  const add = (g, html)=>{ if(g >= 1) f.push({g, html}); };
  if(d.bmi != null) add(d.gBmi, `<b>BMI ${d.bmi.toFixed(1)}</b>，屬${d.bmiCat}`);
  if(d.waist != null) add(d.gWaist, `<b>腰圍 ${d.waist} 公分</b>，超過${d.male ? '男' : '女'}性標準 ${d.waistCut} 公分，屬腹部肥胖`);
  if(d.gBp >= 1) add(d.gBp, `<b>血壓 ${d.sbp}/${d.dbp} mmHg</b>，${d.gBp === 2 ? '達 140/90 以上' : '高於 130/80'}`);
  if(d.msPositive) add(2, `<b>符合代謝症候群</b>（五項指標符合 ${d.msCount} 項${d.msHba1c ? '，另 HbA1c 屬糖尿病前期' : ''}）`);
  const L = d.lab;
  if(L.hba1c.v != null) add(L.hba1c.g, `<b>HbA1c ${L.hba1c.v}%</b>，${L.hba1c.v >= 6.5 ? '達糖尿病診斷值' : '屬糖尿病前期範圍'}`);
  if(L.ac.v != null) add(L.ac.g, `<b>空腹血糖 ${L.ac.v} mg/dL</b>，${L.ac.v >= 126 ? '達糖尿病診斷值' : '高於正常值'}`);
  ['ldl', 'tg', 'tcho'].forEach(k=>{ if(L[k].v != null) add(L[k].g, `<b>${L[k].zh} ${L[k].v} mg/dL</b>，偏高`); });
  if(L.hdl.v != null) add(L.hdl.g, `<b>HDL-C ${L.hdl.v} mg/dL</b>，低於${d.male ? '男' : '女'}性建議值 ${d.male ? 40 : 50}`);
  ['alt', 'ast'].forEach(k=>{ if(L[k].v != null) add(L[k].g, `<b>${k.toUpperCase()} ${L[k].v} U/L</b>，${L[k].g === 2 ? '超過正常上限 3 倍' : '高於正常上限'}`); });
  if(d.gFatty >= 1) add(d.gFatty, `<b>腹部超音波：${esc(d.fatty)}</b>`);
  if(L.egfr.v != null) add(L.egfr.g, `<b>eGFR ${L.egfr.v}</b>${L.egfr.src === '估算' ? '（估算）' : ''}，腎功能下降，用藥與飲食需調整`);
  if(L.cr.v != null && L.egfr.g < 1) add(L.cr.g, `<b>肌酸酐 ${L.cr.v} mg/dL</b>，偏高`);
  if(L.ua.v != null) add(L.ua.g, `<b>尿酸 ${L.ua.v} mg/dL</b>，偏高`);
  if(L.tsh.v != null) add(L.tsh.g, `<b>TSH ${L.tsh.v} μIU/mL</b>，偏${L.tsh.v > 4 ? '高' : '低'}，需評估甲狀腺功能`);
  if(d.gThyUs >= 1) add(1, `<b>甲狀腺超音波：${esc(d.thyUs)}</b>，使用腸泌素類藥物前需確認性質`);
  const B = d.body;
  if(B['t-fat'].v != null) add(B['t-fat'].g, `<b>體脂肪率 ${B['t-fat'].v}%</b>，超過${d.male ? '男' : '女'}性標準 ${d.male ? 25 : 30}%`);
  if(B['t-visceral'].v != null) add(B['t-visceral'].g, `<b>內臟脂肪等級 ${B['t-visceral'].v}</b>，${B['t-visceral'].g === 2 ? '過高' : '偏高'}`);
  if(B['t-smi'].v != null) add(B['t-smi'].g, `<b>SMI ${B['t-smi'].v} kg/m²</b>，低於肌少症切點，減重時需保留肌肉`);
  if(B['t-phaseangle'].v != null) add(B['t-phaseangle'].g, `<b>相位角 ${B['t-phaseangle'].v}°</b>，偏低`);
  if(d.sb != null) add(d.gSb, `<b>STOP-BANG ${d.sb} 分</b>，睡眠呼吸中止症${d.gSb === 2 ? '高' : '中'}風險，建議安排睡眠檢查`);
  if(d.phq){
    if(d.phq.item9 >= 1) add(2, `<b>PHQ-9 第 9 題有作答</b>，需進一步評估自殺風險並轉介身心科`);
    else add(d.gPhq, `<b>PHQ-9 ${d.phq.total} 分</b>，${d.phq.severity}憂鬱症狀`);
  }
  const {sc, meds} = rScreeningLists();
  const listLine = (head, list)=> rBr(head + '：' + list.join('、'), 32).replace(esc(head) + '：', `<b>${esc(head)}</b>：`);
  if(sc.length) add(1, listLine('次發性肥胖待排除', sc));
  if(meds.length) add(1, listLine('可能影響體重的藥物', meds));
  return f.map((x, i)=> Object.assign(x, {i})).sort((a, b)=> b.g - a.g || a.i - b.i);
}

// ---------- 各章內容 ----------
function rChSummary(d){
  const blocks = [];
  const comment = rS('doc-comment');
  if(comment) blocks.push(rBlock('醫師綜合評語', 'PHYSICIAN SUMMARY', `<div class="memo"><div class="rich ru-host">${rRich(comment, 36)}</div></div>`, {split:true}));

  const f = rFindings(d);
  const findHtml = f.length
    ? f.map((x, i)=> `<div class="find ru"><span class="i">${String(i + 1).padStart(2, '0')}</span><span class="t">${x.html}</span>${rPill(x.g)}</div>`).join('')
    : '<div class="empty">本次評估沒有判讀為「注意」或「異常」的項目。</div>';
  blocks.push(rBlock('優先處理事項', 'KEY FINDINGS', `<div class="ru-host">${findHtml}</div>`, {split:true}));

  const L = d.lab, B = d.body;
  const val = (v, unit, pre)=> v == null ? '<span class="na">未測</span>' : `${pre ? pre + ' ' : ''}${v}${unit ? `<small> ${unit}</small>` : ''}`;
  // 一格有多個指標時，顯示判讀最差的那一項（同等級取排在前面的），數值才會和燈號對得上
  const worst = list=>{
    const have = list.filter(x=> x.has);
    if(!have.length) return {v: val(null), g: -1};
    const top = have.reduce((a, b)=> b.g > a.g ? b : a);
    return {v: top.html, g: top.g};
  };
  const labItem = (k, pre, unit)=> ({has: L[k].v != null, g: L[k].g, html: val(L[k].v, unit, pre)});
  const tiles = [
    {k:'體位',     v: d.bmi == null ? val(null) : `BMI ${d.bmi.toFixed(1)}`, g: d.gBmi, s: d.bmiCat},
    Object.assign({k:'腹部脂肪'}, worst([{has: d.waist != null, g: d.gWaist, html: val(d.waist, 'cm', '腰圍')}, {has: B['t-visceral'].v != null, g: B['t-visceral'].g, html: val(B['t-visceral'].v, '', '內臟脂肪')}])),
    {k:'血壓',     v: (d.sbp != null && d.dbp != null) ? `${d.sbp}/${d.dbp}<small> mmHg</small>` : val(null), g: d.gBp},
    Object.assign({k:'血糖'}, worst([labItem('hba1c', 'HbA1c', '%'), labItem('ac', 'AC', 'mg/dL')])),
    Object.assign({k:'血脂'}, worst([labItem('ldl', 'LDL'), labItem('tg', 'TG'), labItem('hdl', 'HDL'), labItem('tcho', 'TC')])),
    Object.assign({k:'肝臟'}, worst([labItem('alt', 'ALT', 'U/L'), labItem('ast', 'AST', 'U/L'), {has: !!d.fatty, g: d.gFatty, html: esc(d.fatty)}])),
    Object.assign({k:'腎臟'}, worst([labItem('egfr', 'eGFR'), labItem('cr', 'Cr', 'mg/dL')])),
    Object.assign({k:'甲狀腺'}, worst([labItem('tsh', 'TSH'), {has: !!d.thyUs, g: d.gThyUs, html: esc(d.thyUs)}])),
    {k:'睡眠',     v: d.sb != null ? `${d.sb}<small> / 8 分</small>` : '<span class="na">未評估</span>', g: d.gSb},
    {k:'情緒',     v: d.phq ? `${d.phq.total}<small> / 27 分</small>` : '<span class="na">未評估</span>', g: d.gPhq},
  ];
  blocks.push(rBlock('健康指標總覽', 'AT A GLANCE',
    `<div class="tiles">${tiles.map(t=> `<div class="tile"><div class="k">${t.k}</div><div class="v">${t.v}</div><div>${rPill(t.g)}</div></div>`).join('')}</div>` +
    `<p class="note-line">睡眠為 STOP-BANG 分數，情緒為 PHQ-9 分數。</p>`));

  if(d.w != null && d.h){
    const hM = d.h / 100;
    const tgt = rN('b-target-weight');
    const bmiOf = w=> (w / (hM * hM)).toFixed(1);
    let goal;
    if(d.bmi >= 24){
      const endW = tgt != null ? tgt : 24 * hM * hM;
      const pct = (d.w - endW) / d.w * 100;
      const st = [
        ['目前', d.w, ''],
        ['第一階段　減 5%', d.w * .95, ''],
        ['第二階段　減 10%', d.w * .90, ''],
        [tgt != null ? '目標體重' : '長期參考　BMI 24', endW, 'end'],
      ];
      goal = `<div class="goal">${st.map(([l, w, c])=> `<div class="st ${c}"><div class="pt"></div><div class="lbl">${l}</div>` +
        `<div class="w">${w.toFixed(1)}<small>kg</small></div><div class="b">BMI ${bmiOf(w)}</div></div>`).join('')}</div>` +
        `<p class="note-line">${tgt != null ? `目標體重需減少約 ${pct.toFixed(1)}%。<br>` : ''}<span class="mark">先以 3 至 6 個月內減少初始體重 5% 至 10% 為階段目標</span>；<br>減重 5% 以上，血糖、血壓、血脂與脂肪肝就會開始改善。</p>`;
    } else {
      goal = `<p>目前 BMI ${d.bmi.toFixed(1)}，已在正常範圍（18.5 至 24）。<br>建議以維持體重、增加肌肉量為主。</p>`;
    }
    blocks.push(rBlock('減重目標', 'WEIGHT GOAL', goal));
  }
  return blocks;
}

function rChBody(d){
  const blocks = [];
  if(d.bmi != null){
    const pos = Math.max(0, Math.min(1, (d.bmi - 15) / 25));
    const W = 516, y = 30;
    const zones = [[15, 18.5, '#C9D7DC', '過輕'], [18.5, 24, '#A9CBB4', '正常'], [24, 27, '#E8C88E', '過重'], [27, 30, '#E2AE84', '輕度肥胖'], [30, 35, '#DD9A92', '中度肥胖'], [35, 40, '#C97C73', '重度肥胖']];
    const xs = v=> (v - 15) / 25 * W;
    const gauge = `<svg viewBox="0 0 ${W} 64" width="${W}" height="64">` +
      zones.map(([a, b, c, l])=> `<rect x="${xs(a).toFixed(1)}" y="${y}" width="${(xs(b) - xs(a)).toFixed(1)}" height="10" fill="${c}"/>` +
        `<text x="${((xs(a) + xs(b)) / 2).toFixed(1)}" y="${y + 27}" text-anchor="middle" font-size="10.5" fill="#6F6A62">${l}</text>`).join('') +
      [18.5, 24, 27, 30, 35].map(v=> `<text x="${xs(v).toFixed(1)}" y="${y - 6}" text-anchor="middle" font-size="10" fill="#9A9387">${v}</text>`).join('') +
      `<path d="M${(pos * W).toFixed(1)} ${y - 1} l-6 -10 h12 z" fill="#152831"/><rect x="${(pos * W - 1).toFixed(1)}" y="${y - 1}" width="2" height="12" fill="#152831"/></svg>`;
    const hM = d.h / 100;
    blocks.push(rBlock('身體質量指數', 'BODY MASS INDEX',
      `<div class="bmi-top"><div class="big">${d.bmi.toFixed(1)}<small>kg/m²</small></div><div style="padding-bottom:6px">${rPill(d.gBmi, d.bmiCat)}</div>` +
      `<div class="facts"><span>身高</span><b>${d.h} cm</b><span>體重</span><b>${d.w} kg${rSrc(rUp('b-weight'))}</b>` +
      `<span>標準體重</span><b>${(18.5 * hM * hM).toFixed(1)}–${(24 * hM * hM).toFixed(1)} kg</b><span>理想體重（BMI 22）</span><b>${(22 * hM * hM).toFixed(1)} kg</b></div></div>` +
      gauge));
  }
  const rows = [];
  rows.push(['腰圍', 'Waist', d.waist == null ? null : d.waist, 'cm', (d.male ? '< 90' : '< 80'), d.gWaist, d.waist == null ? '' : rBar(d.waist, [60, 130], [[d.waistCut, 0], [Infinity, 2]])]);
  rows.push(['血壓', 'Blood Pressure', (d.sbp != null && d.dbp != null) ? `${d.sbp}/${d.dbp}` : null, 'mmHg', '< 130/80', d.gBp, '']);
  const tgt = rN('b-target-weight');
  rows.push(['目標體重', 'Target Weight', tgt, 'kg', '', -2, tgt != null && d.w ? `<span class="small muted">需減少 ${((d.w - tgt) / d.w * 100).toFixed(1)}%</span>` : '']);
  blocks.push(rBlock('體位與血壓', 'ANTHROPOMETRICS',
    `<table class="rt"><colgroup><col style="width:28%"><col style="width:19%"><col style="width:15%"><col style="width:25%"><col style="width:13%"></colgroup>` +
    `<thead><tr><th>項目</th><th>結果</th><th>參考值</th><th>位置</th><th class="c">判讀</th></tr></thead><tbody>` +
    rows.map(([zh, en, v, u, ref, g, bar])=> `<tr><td>${zh}<span class="en">${en}</span></td>` +
      `<td class="n">${v == null ? '<span class="na">未測</span>' : `${v}<span class="u">${u}</span>`}</td><td class="ref">${ref}</td><td>${bar}</td>` +
      `<td class="c">${g === -2 ? '' : rPill(v == null ? -1 : g)}</td></tr>`).join('') + `</tbody></table>`));

  const B = d.body;
  const any = Object.values(B).some(x=> x.v != null) || rN('t-bmr') != null;
  if(any){
    const list = rBodyMeta();
    const trs = list.map(x=>{
      const r = B[x.id];
      const v = r.v == null ? '<span class="na">未測</span>' : `${r.v}<span class="u">${x.u}</span>${rSrc(r.src)}`;
      const ref = x.id === 't-bodyage' && d.age != null ? `實際 ${d.age} 歲` : x.ref;
      return `<tr class="ru"><td>${x.zh}<span class="en">${x.en}</span></td><td class="n">${v}</td><td class="ref">${ref}</td>` +
        `<td>${r.v == null ? '' : rBar(r.v, x.scale, x.cuts)}</td><td class="c">${(x.cuts || x.id === 't-bodyage') ? rPill(r.v == null ? -1 : r.g) : ''}</td></tr>`;
    });
    const bmr = rN('t-bmr');
    trs.push(`<tr class="ru"><td>基礎代謝量<span class="en">BMR</span></td><td class="n">${bmr == null ? '<span class="na">未測</span>' : `${bmr}<span class="u">kcal</span>${rSrc(rUp('t-bmr') || '實測')}`}</td><td class="ref"></td><td></td><td></td></tr>`);
    let pheno = '';
    try{
      if(d.bmi != null){
        const p = classifyExercisePhenotype(d.male ? 'M' : 'F', d.bmi, B['t-fat'].v == null ? NaN : B['t-fat'].v, B['t-smi'].v == null ? NaN : B['t-smi'].v, B['t-phaseangle'].v == null ? NaN : B['t-phaseangle'].v);
        const rx = EXERCISE_PRESCRIPTIONS[p];
        pheno = `<div class="pheno"><span class="muted">身體組成分型</span><b>${esc(p)}</b></div>` + (rx ? `<p class="note-line" style="margin-top:2px">${rBr('訓練主軸：' + rx.focus, 42)}</p>` : '');
      }
    }catch(e){}
    blocks.push(rBlock('身體組成分析', 'BODY COMPOSITION',
      `<table class="rt"><colgroup><col style="width:28%"><col style="width:19%"><col style="width:15%"><col style="width:25%"><col style="width:13%"></colgroup>` +
      `<thead><tr><th>項目</th><th>結果</th><th>參考值</th><th>位置</th><th class="c">判讀</th></tr></thead><tbody class="ru-host">${trs.join('')}</tbody></table>` +
      pheno + (rS('body-note') ? `<p class="note-line">${rLines('備註：' + rS('body-note'), 42)}</p>` : ''), {split:true}));
  }

  const rowsB = (trackData.body || []).filter(r=> TRACK_COLS.body.some(([k])=> k !== 'date' && String(r[k] || '').trim()));
  if(rowsB.length){
    const recent = rowsB.slice().sort((a, b)=> String(a.date || '').localeCompare(String(b.date || ''))).slice(-8);
    const cols = TRACK_COLS.body.filter(([k])=> k === 'date' || recent.some(r=> String(r[k] || '').trim()));
    const chart = trackChartSvg('body', 'weight', '體重變化（kg）', 516, 190);
    blocks.push(rBlock('歷次身體組成', 'TRENDS',
      `<table class="rt track"><thead><tr>${cols.map(([, l])=> `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody class="ru-host">` +
      recent.map(r=> `<tr class="ru">${cols.map(([k])=> `<td>${String(r[k] || '').trim() ? esc(k === 'date' ? String(r[k]).trim().slice(2) : r[k]) : '<span class="na">—</span>'}</td>`).join('')}</tr>`).join('') +
      `</tbody></table>` + (rowsB.length > recent.length ? `<p class="note-line tail">共 ${rowsB.length} 筆紀錄，列出最近 ${recent.length} 筆。</p>` : '') +
      (chart ? `<div class="chart tail">${chart}</div>` : ''), {split:true}));
  }
  return blocks;
}

function rChLab(d){
  const blocks = [];
  const meta = rLabMeta();
  const anyLab = meta.some(x=> x.k && d.lab[x.k].v != null);
  if(anyLab){
    let trs = '';
    meta.forEach(x=>{
      if(x.grp){ trs += `<tr class="grp ru keep"><td colspan="5">${x.grp}</td></tr>`; return; }
      const r = d.lab[x.k];
      const flag = r.v == null ? '' : (typeof labFlag === 'function' ? labFlag(x.k, r.v) : '');
      const v = r.v == null ? '<span class="na">未檢驗</span>' :
        `${r.v}${flag ? `<span class="arrow ${flag}">${flag === 'hi' ? '↑' : '↓'}</span>` : ''}<span class="u">${x.u}</span>${rSrc(r.src)}`;
      trs += `<tr class="ru"><td>${x.zh}<span class="en">${x.en}</span></td><td class="n">${v}</td><td class="ref">${x.ref}</td>` +
        `<td>${rBar(r.v, x.scale, x.cuts)}</td><td class="c">${x.cuts ? rPill(r.v == null ? -1 : r.g) : ''}</td></tr>`;
    });
    blocks.push(rBlock('血液檢驗', 'LABORATORY',
      `<table class="rt"><colgroup><col style="width:28%"><col style="width:19%"><col style="width:15%"><col style="width:25%"><col style="width:13%"></colgroup>` +
      `<thead><tr><th>項目</th><th>結果</th><th>參考值</th><th>位置</th><th class="c">判讀</th></tr></thead><tbody class="ru-host">${trs}</tbody></table>` +
      `<p class="note-line tail">參考值為一般成人標準，實際判讀以檢驗單位的參考範圍為準。${d.lab.egfr.src === '估算' ? '<br>eGFR 標示「估算」者，是依肌酸酐、年齡、性別以 CKD-EPI 2021 公式計算。' : ''}</p>` +
      (rS('lab-note') ? `<p class="note-line tail">${rLines('備註：' + rS('lab-note'), 42)}</p>` : ''), {split:true}));
  } else {
    blocks.push(rBlock('血液檢驗', 'LABORATORY', '<div class="empty">本次未提供抽血檢驗數值。</div>'));
  }

  if(d.msAny){
    const sug = (typeof msSuggestions === 'function') ? msSuggestions() : {};
    const items = [['ms-waist', '腹部肥胖', `腰圍 男 ≥ 90／女 ≥ 80 cm，或 BMI ≥ 27`], ['ms-bp', '血壓偏高', '≥ 130/85 mmHg，或已服藥'],
      ['ms-glucose', '空腹血糖偏高', '≥ 100 mg/dL，或已服藥'], ['ms-tg', '三酸甘油酯偏高', '≥ 150 mg/dL，或已服藥'], ['ms-hdl', 'HDL-C 偏低', '男 < 40／女 < 50 mg/dL，或已服藥']];
    // 本次數值：標準已寫在左欄，這裡只列數值
    const lab = k=> rN('lab-' + k);
    const vals = {
      'ms-waist': [d.waist != null ? `腰圍 ${d.waist} cm` : '', d.bmi != null ? `BMI ${d.bmi.toFixed(1)}` : ''].filter(Boolean).join('<br>'),
      'ms-bp': (d.sbp != null && d.dbp != null) ? `${d.sbp}/${d.dbp} mmHg` : '',
      'ms-glucose': lab('ac') != null ? `${lab('ac')} mg/dL` : '',
      'ms-tg': lab('tg') != null ? `${lab('tg')} mg/dL` : '',
      'ms-hdl': lab('hdl') != null ? `${lab('hdl')} mg/dL` : '',
    };
    const trs = items.map(([id, zh, crit])=>
      `<tr class="ru"><td>${zh}<span class="en">${rBr(crit, 16)}</span></td><td class="n" style="font-size:12.5px; font-weight:500">${vals[id] || '<span class="na">未測</span>'}</td><td class="c">${chk(id) ? rPill(2, '符合') : rPill(0, '未符合')}</td></tr>`
    ).join('');
    const hb = rN('ms-hba1c');
    blocks.push(rBlock('代謝症候群判定', 'METABOLIC SYNDROME',
      `<table class="rt"><colgroup><col style="width:46%"><col style="width:36%"><col style="width:18%"></colgroup>` +
      `<thead><tr><th>指標</th><th>本次數值</th><th class="c">判定</th></tr></thead><tbody class="ru-host">${trs}</tbody></table>` +
      `<p class="note-line tail">五項中符合三項以上即成立。<br>共符合 <b>${d.msCount}</b>／5 項${hb != null ? `；HbA1c ${hb}%${d.msHba1c ? '，屬糖尿病前期' : ''}` : ''}。　結果：${d.msPositive ? rPill(2, '符合代謝症候群') : rPill(0, '未達診斷標準')}</p>` +
      (rS('metabolic-note') ? `<p class="note-line tail">${rLines('備註：' + rS('metabolic-note'), 42)}</p>` : ''), {split:true}));
  }

  const rowsL = (trackData.lab || []).filter(r=> TRACK_COLS.lab.some(([k])=> k !== 'date' && String(r[k] || '').trim()));
  if(rowsL.length){
    const recent = rowsL.slice().sort((a, b)=> String(a.date || '').localeCompare(String(b.date || ''))).slice(-8);
    const cols = TRACK_COLS.lab.filter(([k])=> k === 'date' || recent.some(r=> String(r[k] || '').trim()));
    const cell = (k, v)=>{
      v = String(v || '').trim();
      if(!v) return '<td><span class="na">—</span></td>';
      if(k === 'date') return `<td>${esc(v.slice(2))}</td>`;
      const f = labFlag(k, v);
      return `<td>${esc(v)}${f ? `<span class="arrow ${f}">${f === 'hi' ? '↑' : '↓'}</span>` : ''}</td>`;
    };
    blocks.push(rBlock('歷次檢驗', 'TRENDS',
      `<table class="rt track"><thead><tr>${cols.map(([, l])=> `<th>${esc(l)}</th>`).join('')}</tr></thead><tbody class="ru-host">` +
      recent.map(r=> `<tr class="ru">${cols.map(([k])=> cell(k, r[k])).join('')}</tr>`).join('') + `</tbody></table>` +
      (rowsL.length > recent.length ? `<p class="note-line tail">共 ${rowsL.length} 筆紀錄，列出最近 ${recent.length} 筆。</p>` : ''), {split:true}));
  }

  const us = [];
  us.push(['腹部超音波', 'Abdominal Sonography', rS('us-fatty'), rS('us-text'), d.gFatty]);
  us.push(['甲狀腺超音波', 'Thyroid Sonography', rS('us-thyroid'), rS('us-thyroid-text'), d.gThyUs]);
  blocks.push(rBlock('影像檢查', 'IMAGING',
    `<table class="rt"><colgroup><col style="width:26%"><col style="width:60%"><col style="width:14%"></colgroup>` +
    `<thead><tr><th>檢查</th><th>結果與所見</th><th class="c">判讀</th></tr></thead><tbody class="ru-host">` +
    us.map(([zh, en, v, t, g])=> `<tr class="ru"><td>${zh}<span class="en">${en}</span></td><td>${v ? `<b>${esc(v)}</b>` : '<span class="na">未檢查</span>'}${t ? `<div class="small muted">${rLines(t, 24)}</div>` : ''}</td><td class="c">${rPill(v ? g : -1, v ? null : '未檢查')}</td></tr>`).join('') +
    `</tbody></table>`, {split:true}));
  return blocks;
}

function rChHistory(d){
  const blocks = [];
  const {sc, meds} = rScreeningLists();
  const kv = (rows)=> `<table class="rt kv"><tbody class="ru-host">${rows.map(([k, v])=> `<tr class="ru"><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table>`;
  const withNote = (list, noteId, none)=> (list.length ? rBr(list.join('、'), 27) : `<span class="muted">${none}</span>`) + (rS(noteId) ? `<div class="small muted">${rLines(rS(noteId), 29)}</div>` : '');
  blocks.push(rBlock('次發性肥胖<br>與藥物因素', 'SECONDARY CAUSES', kv([
    ['次發性肥胖篩檢', withNote(sc, 'sc-note', '未發現')],
    ['藥物性因素', withNote(meds, 'med-note', '無')],
  ]), {split:true}));

  const diet = stripHeaderLine(rS('diet-habit-text'), CATEGORY_TEXT_HEADERS['diet-habit-text']);
  const act = stripHeaderLine(rS('activity-habit-text'), CATEGORY_TEXT_HEADERS['activity-habit-text']);
  const life = [];
  if(diet.trim()) life.push(`<h4 class="ru keep">飲食習慣</h4>` + rRich(diet));
  if(act.trim()) life.push(`<h4 class="ru keep">活動習慣</h4>` + rRich(act));
  blocks.push(rBlock('飲食與活動習慣', 'LIFESTYLE', life.length ? `<div class="rich ru-host">${life.join('')}</div>` : '<div class="empty">未記錄。</div>', {split:true}));

  const motiv = rS('motiv-score');
  blocks.push(rBlock('家族史、<br>生育計畫與動機', 'BACKGROUND', kv([
    ['家族史', rS('fam-note') ? rLines(rS('fam-note'), 27) : '<span class="muted">未記錄</span>'],
    ['生育計畫', rS('preg-plan') ? esc(rS('preg-plan')) : '<span class="muted">未評估</span>'],
    ['減重意願與準備度', motiv ? `<b>${esc(motiv)}</b> / 10` : '<span class="muted">未評估</span>'],
    ['社會支持', rS('motiv-support') ? rBr(rS('motiv-support'), 27) : '<span class="muted">未記錄</span>'],
  ].concat(rS('fam-motiv-note') ? [['備註', rLines(rS('fam-motiv-note'), 27)]] : [])), {split:true}));

  const sbHtml = d.sb == null
    ? '<div class="empty">未填寫 STOP-BANG 問卷。</div>'
    : `<div class="scale-row"><div class="score">STOP-BANG 分數<b>${d.sb}<small style="font-size:13px; color:#9A9387"> / 8</small></b>${rPill(d.gSb, ['低風險', '中風險', '高風險'][d.gSb])}</div>` +
      rScale(d.sb, 9, [[3, 0, '0–2 低風險'], [5, 1, '3–4 中風險'], [9, 2, '5–8 高風險']], 340) + `</div>` +
      `<div class="items">${d.sbItems.length ? '問卷勾選：<br>' + d.sbItems.map(t=> '・' + esc(t)).join('<br>') : '問卷各題皆未勾選。'}<br>另依資料自動計分：BMI ＞ 35、年齡 ＞ 50 歲、男性；頸圍未納入。</div>`;
  blocks.push(rBlock('睡眠評估', 'SLEEP APNEA SCREENING', sbHtml));

  const phqHtml = !d.phq
    ? '<div class="empty">未完成 PHQ-9 量表。</div>'
    : `<div class="scale-row"><div class="score">PHQ-9 總分<b>${d.phq.total}<small style="font-size:13px; color:#9A9387"> / 27</small></b>${rPill(d.gPhq, d.phq.severity)}</div>` +
      rScale(d.phq.total, 28, [[5, 0, '0–4 無明顯'], [10, 1, '5–9 輕度'], [28, 2, '10 以上 中度至重度']], 340) + `</div>` +
      (d.phq.item9 >= 1 ? `<p class="warn">第 9 題（傷害自己的念頭）有作答，<br>建議立即評估自殺風險並轉介身心科。</p>` : '');
  blocks.push(rBlock('情緒評估', 'MOOD SCREENING', phqHtml + (rS('sleep-note') ? `<p class="note-line">${rLines('睡眠與心理評估備註：' + rS('sleep-note'), 42)}</p>` : '')));

  blocks.push(rRichBlock('共病症', 'COMORBIDITIES', rS('cm-note')) || rBlock('共病症', 'COMORBIDITIES', '<div class="empty">未記錄共病症。</div>'));
  return blocks;
}

function rChPlan(d){
  const blocks = [];
  const tx = getTxChoices();
  const onMed = tx.some(k=> k !== 'lifestyle');
  const tiers = [
    ['第一階', '生活型態介入', '飲食調整、運動、行為改變、睡眠管理。<br>所有人都需要，貫穿全程。', 'BMI ≥ 24，或腰圍超標'],
    ['第二階', '藥物治療', '以腸泌素類藥物為主，搭配生活型態調整。', 'BMI ≥ 27，<br>或 BMI ≥ 24 合併代謝問題'],
    ['第三階', '內視鏡輔助減重', '胃內肉毒桿菌注射、胃內水球置放、內視鏡縮胃術。<br>自費項目，需完整說明效果、風險與費用。', '藥物治療 3 個月，<br>減重未達 5%，或無法用藥'],
    ['第四階', '減重手術', '袖狀胃切除、胃繞道，轉介外科評估。', 'BMI ≥ 37.5，<br>或 BMI ≥ 32.5 合併嚴重共病'],
  ];
  const cur = onMed ? 1 : (tx.length ? 0 : -1);
  blocks.push(rBlock('治療階梯', 'TREATMENT PATHWAY',
    `<div class="ladder">${tiers.map(([n, h, p, w], i)=> `<div class="tier${i === cur ? ' on' : ''}"><div><div class="n">${n}${i === cur ? '<span class="now">本次</span>' : ''}</div><h5>${h}</h5><div class="when">${w}</div></div><p>${p}</p></div>`).join('')}</div>` +
    `<p class="note-line" style="white-space:nowrap">肥胖治療採階梯式進行，每一階都建立在生活型態調整上；符合手術條件者可直接轉介評估。</p>`));

  const eduText = rS('tx-edu');
  blocks.push(rBlock('本次用藥建議', 'MEDICATION',
    `<p style="margin-bottom:${eduText ? 12 : 0}px"><span class="pill g1" style="margin-right:12px">本次選擇</span><b style="color:#1F262A">${esc(txChoiceText())}</b></p>` +
    (eduText ? `<div class="rich ru-host">${rRich(eduText, 39.5)}</div>` : ''), {split:true}));

  const c = typeof computeCalorie === 'function' ? computeCalorie() : null;
  if(c && !c.error){
    const pk = c.proteinG * 4, fk = c.fatG * 9, ck = Math.max(0, c.carbG * 4), tot = pk + fk + ck || 1;
    blocks.push(rBlock('熱量與營養素', 'ENERGY & MACRONUTRIENTS',
      `<div class="kcal"><div><div class="k">基礎代謝率 BMR</div><div class="v">${Math.round(c.bmr)}<small>kcal</small></div><div class="s">${c.bmrSrc === 'measured' ? 'TANITA 實測' + (rUp('t-bmr') ? '（上傳）' : '') : 'Mifflin-St Jeor 公式估算'}</div></div>` +
      `<div><div class="k">每日總消耗 TDEE</div><div class="v">${Math.round(c.tdee)}<small>kcal</small></div><div class="s">${rBr(c.palLabel || '', 14)}</div></div>` +
      `<div class="main"><div class="k">建議每日攝取</div><div class="v">${Math.round(c.target)}<small>kcal</small></div><div class="s">${rBr(c.goalLabel || '', 14)}</div></div></div>` +
      `<div class="macro"><i style="width:${(pk / tot * 100).toFixed(1)}%; background:#24292B"></i><i style="width:${(fk / tot * 100).toFixed(1)}%; background:#C9A15E"></i><i style="width:${(ck / tot * 100).toFixed(1)}%; background:#DDD6C9"></i></div>` +
      `<div class="macro-lg"><div><span class="sw" style="background:#24292B"></span>蛋白質<b>${Math.round(c.proteinG)} g</b><span class="small muted">${c.perKg} g/kg<br>${rBr(c.refLabel, 14)}</span></div>` +
      `<div><span class="sw" style="background:#C9A15E"></span>脂肪<b>${Math.round(c.fatG)} g</b><span class="small muted">總熱量 25%</span></div>` +
      `<div><span class="sw" style="background:#DDD6C9"></span>碳水化合物<b>${Math.round(c.carbG)} g</b><span class="small muted">其餘熱量</span></div></div>` +
      ((c.safetyNote || c.macroNote) ? `<p class="warn">${[c.safetyNote, c.macroNote].filter(Boolean).map(t=> rBr(t, 40)).join('<br>')}</p>` : '')));
  } else if(c && c.bmr){
    blocks.push(rBlock('熱量與營養素', 'ENERGY & MACRONUTRIENTS',
      `<div class="kcal"><div><div class="k">基礎代謝率 BMR</div><div class="v">${Math.round(c.bmr)}<small>kcal</small></div><div class="s">${c.bmrSrc === 'measured' ? 'TANITA 實測' : 'Mifflin-St Jeor 公式估算'}</div></div><div></div><div></div></div>` +
      `<p class="note-line">尚未設定活動量與減重速度，<br>未計算每日熱量建議。</p>`));
  }

  const ex = rRichBlock('運動處方', 'EXERCISE PRESCRIPTION', rS('ex-text'));
  if(ex) blocks.push(ex);
  const diet = rRichBlock('飲食建議', 'NUTRITION GUIDANCE', rS('edu-text'));
  if(diet) blocks.push(diet);
  return blocks;
}

function rChFollow(d){
  const blocks = [];
  const base = rS('p-date') || todayLocal();
  const md = s=> s.slice(5);
  const plan = [
    ['1 至 2 週', ['開始用藥後', `約 ${md(rAddDays(base, 7))} 至 ${md(rAddDays(base, 14))}`], '副作用與劑量', '噁心、便祕等腸胃狀況是否可以忍受，<br>決定能不能調升劑量。'],
    ['1 個月', [`約 ${rAddMonths(base, 1)}`], '體重與身體組成', '體重、腰圍、體脂與肌肉量，<br>一起檢視這個月的飲食與運動。'],
    ['3 個月', [`約 ${rAddMonths(base, 3)}`], '療效評估與抽血', '確認減重是否達到原本體重的 5%；<br>抽血看血糖、血脂、肝腎功能。'],
    ['6 個月', [`約 ${rAddMonths(base, 6)}`], '腹部超音波', '看脂肪肝改善多少，<br>追蹤血壓、血糖、血脂等共病指標。'],
    ['長期', ['每 3 至 6 個月'], '規律回診', '目標是「不復胖」。<br>停藥前後尤其要留意體重變化。'],
  ];
  blocks.push(rBlock('回診與<br>追蹤時程', 'FOLLOW-UP SCHEDULE',
    `<div class="ru-host">${plan.map(([w, sub, h, t])=> `<div class="tl-row ru"><div><div class="tl-when">${w}</div>${sub.map(x=> `<div class="tl-sub">${x}</div>`).join('')}</div><div><h4>${h}</h4><div class="what">${t}</div></div></div>`).join('')}</div>` +
    `<p class="note-line tail">日期由評估日期推算，實際回診以預約為準。${rS('track-note') ? '<br>' + rLines(rS('track-note'), 42) : ''}</p>`, {split:true}));

  const psy = [];
  if(chk('psy-refer')) psy.push('建議轉介身心科或心理諮商');
  if(chk('psy-support')) psy.push('已建立支持系統（家人、朋友、定期回診）');
  if(psy.length || rS('psy-note')){
    blocks.push(rBlock('心理支持<br>與復胖預防', 'SUPPORT',
      `<div class="rich ru-host">${psy.map(t=> `<div class="li ru">${rBr(t, 35)}</div>`).join('')}${rRich(rS('psy-note'))}</div>`, {split:true}));
  }
  blocks.push(rCallout('提早就醫', ['上腹痛延伸到背部、持續嘔吐無法進食，或出現黃疸，請立即就醫。',
      '嚴重腹瀉、頭暈、尿量明顯減少，可能是脫水，請盡快回診。',
      '計畫懷孕、已懷孕或開始哺乳，請先停藥並回診討論。',
      '任何疑問，歡迎來電木子澄安診所 07-3739496，或於回診時與醫師討論。'].map(t=> `<div class="li ru">${rBr(t, 34)}</div>`).join(''), true));
  return blocks;
}

function rChAppendix(){
  // 說明文字已依標點手動斷行（每行一個完整意思），不再交給 rBr 自動切
  const g = [
    ['BMI 身體質量指數', '體重（公斤）÷ 身高（公尺）²。<br>國民健康署成人標準：18.5 至 24 為正常，24 至 27 為過重，27 以上為肥胖。'],
    ['腰圍', '男性 90 公分、女性 80 公分以上為腹部肥胖，與內臟脂肪及代謝疾病風險相關。'],
    ['BMR 基礎代謝率', '維持生命所需的最低熱量。<br>有 TANITA 實測值時採用實測值，沒有時以 Mifflin-St Jeor 公式估算。'],
    ['TDEE 每日總消耗', '基礎代謝率乘上活動係數，代表一天實際消耗的熱量。'],
    ['HbA1c 糖化血色素', '反映近 2 至 3 個月的平均血糖。<br>5.7% 至 6.4% 為糖尿病前期，6.5% 以上達糖尿病診斷值。'],
    ['HOMA-IR', '由空腹血糖與胰島素計算的胰島素阻抗指數，數值越高代表阻抗越明顯。'],
    ['eGFR 腎絲球過濾率', '評估腎臟功能。<br>檢驗報告未提供時，依肌酸酐、年齡、性別以 CKD-EPI 2021 公式估算，<br>並標示「估算」。'],
    ['內臟脂肪等級', 'TANITA 指標。1 至 9 為標準，10 至 14 偏高，15 以上過高。'],
    ['SMI 四肢骨骼肌指數', '四肢骨骼肌量 ÷ 身高²。<br>依亞洲肌少症工作小組（AWGS 2019）生物電阻抗切點，<br>男性低於 7.0、女性低於 5.7 kg/m² 為偏低。'],
    ['相位角', '生物電阻抗量測的細胞完整性指標，偏低時常與肌肉品質或營養狀態不佳有關。<br>各族群參考值不同，本報告以 4.5° 作為分型參考。'],
    ['代謝症候群', '腰圍、血壓、空腹血糖、三酸甘油酯、HDL-C<br>五項中符合三項以上（國民健康署標準）。'],
    ['STOP-BANG', '阻塞性睡眠呼吸中止症篩檢問卷。<br>0 至 2 分低風險，3 至 4 分中風險，5 分以上高風險。'],
    ['PHQ-9', '憂鬱症狀篩檢量表。5、10、15、20 分分別是輕度、中度、中重度、重度的切點。<br>篩檢結果需由醫師進一步評估。'],
  ];
  return [`<div class="rb full gloss"><div class="rb-r"><table class="rt kv"><tbody>${g.map(([k, v])=> `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}</tbody></table></div></div>`];
}

// ---------- 整份報告的內容模型 ----------
function buildReportModel(){
  try{ calcBMI(true); }catch(e){}
  try{ applyMsAuto(); calcMetabolic(); }catch(e){}
  const d = rCollect();
  const name = rS('p-name') || '（未填寫姓名）';
  const date = rS('p-date') || todayLocal();
  const chapters = [
    {id:'summary', no:'01', zh:'評估總結',         en:'EXECUTIVE SUMMARY',    lead:'醫師結論、優先處理項目與各系統判讀。', blocks: rChSummary(d)},
    {id:'body',    no:'02', zh:'體位與身體組成',   en:'BODY COMPOSITION',     lead:'BMI、腰圍、血壓與 TANITA 身體組成分析。',             blocks: rChBody(d)},
    {id:'lab',     no:'03', zh:'檢驗與影像', en:'LABORATORY & IMAGING',    lead:'血糖、血脂、肝腎功能、代謝症候群與超音波檢查。',      blocks: rChLab(d)},
    {id:'history', no:'04', zh:'病史與身心評估',   en:'HISTORY & SCREENING',  lead:'次發性肥胖、生活型態、睡眠與情緒量表。',              blocks: rChHistory(d)},
    {id:'plan',    no:'05', zh:'治療與生活處方',   en:'TREATMENT PLAN',       lead:'治療方式、用藥說明、熱量營養、運動與飲食建議。',      blocks: rChPlan(d)},
    {id:'follow',  no:'06', zh:'追蹤計畫',         en:'FOLLOW-UP',            lead:'回診時程與需要提早回診的狀況。',                      blocks: rChFollow(d)},
    {id:'appx',    no:'A',  zh:'附錄',             en:'APPENDIX',             lead:'報告中用到的名詞與判讀標準。',                  blocks: rChAppendix()},
  ];
  const attachments = [];
  // 「附上原始報告」沒勾就只印到附錄
  const attBox = document.getElementById('rpt-att');
  if(!attBox || attBox.checked) [['lab', '抽血報告'], ['tanita', 'TANITA 報告']].forEach(([kind, label])=>{
    (uploadedFiles[kind] || []).forEach(file=>{
      file.pages.forEach((src, i)=> attachments.push({title: `${label}：${file.name}`, sub: file.pages.length > 1 ? `第 ${i + 1}／${file.pages.length} 頁` : '', src}));
    });
  });
  return {d, name, date, chapters, attachments};
}

function rCoverHtml(m, logo){
  const sex = rS('p-gender'), gender = sex === 'M' ? '男' : sex === 'F' ? '女' : '--';
  const birth = rS('p-birth'), age = rS('p-age');
  const f = (k, v, na)=> `<div class="cv-f"><span class="k">${k}</span><span class="v${na ? ' na' : ''}">${v}</span></div>`;
  return `<section class="rpt-page cover">
  <img class="cv-wm" src="${logo.wm}" alt="">
  <div class="cv-bar"></div>
  <div class="cv-brand"><img class="cv-mark" src="${logo.mark}" alt=""><div><div class="cv-zh">木子澄安診所</div><div class="cv-en">MUZI CHENG'AN CLINIC</div></div></div>
  <div class="cv-rule"></div>
  <div class="cv-title">
    <div class="cv-kicker">HEALTH EXAMINATION REPORT</div>
    <h1>健康檢查報告</h1>
    <div class="cv-line"></div>
    <div class="cv-sub">個人健康檢查結果彙整與醫師建議</div>
  </div>
  <div class="cv-info">
    <div class="cv-info-h"><b>個人資料</b><span>PERSONAL INFORMATION</span></div>
    <div class="cv-grid">
      ${f('姓名', esc(m.name))}${f('出生日期', esc(birth || '--'), !birth)}
      ${f('性別', gender, !sex)}${f('年齡', age ? esc(age) + ' 歲' : '-- 歲', !age)}
      ${f('檢查日期', esc(m.date))}
    </div>
  </div>
  <div class="cv-foot"><div>高雄市仁武區仁孝路282號<br>07-3739496 ・ LINE @muzichengan</div><div class="r">本報告僅供臨床參考，<br>檢查結果請與主治醫師討論。</div></div>
</section>`;
}

// 診所 logo 原檔是金色線稿：在畫布上改成指定顏色並放大，邊緣重新銳化，封面浮水印放大五倍也不糊
const R_LOGO_CACHE = {};
async function rLogo(color, w, crop){
  const key = color + w + (crop ? 'c' : '');
  if(R_LOGO_CACHE[key]) return R_LOGO_CACHE[key];
  const im = new Image();
  im.src = CLINIC_LOGO_DATA_URI;
  const ok = await new Promise(r=>{ im.onload = ()=> r(true); im.onerror = ()=> r(false); if(im.complete && im.naturalWidth) r(true); setTimeout(()=> r(im.naturalWidth > 0), 3000); });
  if(!ok) return CLINIC_LOGO_DATA_URI;
  const [sx, sy, sw, sh] = crop ? [33, 52, 169, 194] : [0, 0, im.width, im.height];
  const H = Math.round(w * sh / sw);
  const c = document.createElement('canvas');
  c.width = w; c.height = H;
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
  x.drawImage(im, sx, sy, sw, sh, 0, 0, w, H);
  const d = x.getImageData(0, 0, w, H), p = d.data;
  const rgb = [1, 3, 5].map(i=> parseInt(color.slice(i, i + 2), 16));
  for(let i = 0; i < p.length; i += 4){
    const a = Math.max(0, Math.min(255, (p[i + 3] - 128) * 3 + 128));
    p[i] = rgb[0]; p[i + 1] = rgb[1]; p[i + 2] = rgb[2]; p[i + 3] = a;
  }
  x.putImageData(d, 0, 0);
  return (R_LOGO_CACHE[key] = c.toDataURL('image/png'));
}

function rTocHtml(m){
  const rows = m.chapters.map(c=> `<div class="toc" data-toc="${c.id}"><span class="no">${c.no}</span><span class="t">${c.zh}</span><span class="p"></span></div>`).join('') +
    (m.attachments.length ? `<div class="toc" data-toc="att"><span class="no">B</span><span class="t">原始報告</span><span class="p"></span></div>` : '');
  return `<div class="toc-head"><h2>目錄</h2><div class="lead">這份報告依下列順序整理，每一章開頭先說明這一章看什麼。</div></div>${rows}
  <div class="rb callout howto"><div class="co-l">閱讀方式</div><div class="co-r">
    <div class="lg">
      <div>${rPill(0)}<br>在參考範圍內。</div>
      <div>${rPill(1)}<br>略超出參考範圍，<br>或屬前期。</div>
      <div>${rPill(2)}<br>明顯超出範圍，<br>建議優先處理。</div>
      <div>${rPill(-1, '未測')}<br>本次沒有資料。</div>
    </div>
    <p>每項數值旁的長條代表參考範圍，綠色為正常區間，黑色標記是您這次的位置。</p>
    <p>數值後面的小字註明資料來源：「上傳」由上傳報告擷取，「實測」為儀器量測，「估算」依公式計算。<br>同一項目有實測值時，一律以實測值為準。</p>
    <p>判讀以一般成人參考值為基準，不能取代醫師的臨床判斷，治療計畫請與醫師討論後再進行。</p>
  </div></div>`;
}

// ---------- 排版：把內容放進固定高度的 A4 頁 ----------
async function layoutReport(doc, m){
  const pagesBox = doc.getElementById('pages');
  const stage = doc.getElementById('stage');
  const hd = r=> `<div class="rpt-hd"><span>木子澄安診所　減重評估報告</span><span class="r">${r}</span></div>`;

  const logo = {wm: await rLogo('#F0F2F1', 1826), mark: await rLogo('#2F5445', 144, true)};
  pagesBox.innerHTML = rCoverHtml(m, logo);
  stage.innerHTML = m.chapters.map(c=> `<div class="rc" data-id="${c.id}"><div class="rc-head"><h2>${c.zh}</h2>` +
    (c.id === 'summary' ? `<div class="rc-sign"><span>評估醫師</span><span class="ln"></span><span>日期</span><span class="ln"></span></div>` : '') +
    `<div class="lead">${rBr(c.lead, 42)}</div></div>${c.blocks.filter(Boolean).join('')}</div>`).join('');
  // 每章的段落依序編上 01、02…（左欄金色序號）
  stage.querySelectorAll(':scope > .rc').forEach(rc=>{
    rc.querySelectorAll(':scope > .rb > .rb-l > .rb-no').forEach((n, i)=>{ n.textContent = String(i + 1).padStart(2, '0'); });
  });

  // 字型與圖片都到位後才量高度，量到的就是列印時的樣子。
  // 先等字型樣式表載入、讓整份內容排版一次（觸發各字集分段下載），再等字型全部到位；離線時最多等 5 秒，改用系統字型
  const sleep = ms=> new Promise(r=> setTimeout(r, ms));
  const link = doc.querySelector('link[rel="stylesheet"]');
  if(link && !link.sheet) await Promise.race([new Promise(r=>{ link.onload = link.onerror = r; }), sleep(3000)]);
  void stage.offsetHeight; void pagesBox.offsetHeight;
  await sleep(30);
  const waitFonts = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
  const imgs = [...doc.images].filter(im=> !im.complete).map(im=> new Promise(r=>{ im.onload = im.onerror = r; }));
  await Promise.race([Promise.all([waitFonts, Promise.all(imgs)]), sleep(5000)]);

  // 右欄內文的第一行和左欄小標（序號下面那一行）水平對齊：量出兩者的行中線差多少，就把右欄往下推多少
  const firstLine = el=>{
    const tw = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, {acceptNode: n=> n.textContent.trim() ? 1 : 3});
    let n, best = null;
    while((n = tw.nextNode())){
      const r = doc.createRange();
      r.selectNodeContents(n);
      const box = [...r.getClientRects()].find(x=> x.height > 0);
      if(box && (!best || box.top < best.top - 1)) best = box;
    }
    return best;
  };
  stage.querySelectorAll('.rb:not(.callout):not(.full)').forEach(b=>{
    const t = b.querySelector(':scope > .rb-l > .rb-h'), r = b.querySelector(':scope > .rb-r');
    if(!t || !r) return;
    const a = firstLine(t), c = firstLine(r);
    if(!a || !c) return;
    const dy = Math.round((a.top + a.bottom - c.top - c.bottom) / 2);
    if(dy > 0) r.style.paddingTop = dy + 'px';
  });
  stage.querySelectorAll('.tier').forEach(t=>{
    const hh = t.querySelector('h5'), p = t.querySelector(':scope > p');
    if(!hh || !p) return;
    const a = firstLine(hh), c = firstLine(p);
    if(!a || !c) return;
    const dy = Math.round((a.top + a.bottom - c.top - c.bottom) / 2);
    if(dy > 0) p.style.paddingTop = dy + 'px';
  });

  let body = null, chLabel = '';
  const pages = [];
  const newPage = ()=>{
    const pg = doc.createElement('section');
    pg.className = 'rpt-page';
    pg.innerHTML = hd(chLabel) + '<div class="rpt-body"></div>' +
      `<div class="rpt-ft"><span>木子澄安診所　${esc(m.name)}　檢查日期 ${esc(m.date)}<br>本報告僅供臨床評估參考，治療計畫請與醫師討論</span><span class="pg"></span></div>`;
    pagesBox.appendChild(pg);
    pages.push(pg);
    body = pg.querySelector('.rpt-body');
  };
  const fits = ()=> body.scrollHeight <= body.clientHeight + .5;
  const used = ()=> body.children.length > 0;
  const avail = ()=> body.clientHeight - parseFloat(doc.defaultView.getComputedStyle(body).paddingTop);
  const remaining = ()=>{
    if(!used()) return avail();
    const last = body.lastElementChild.getBoundingClientRect().bottom;
    return body.getBoundingClientRect().bottom - last;
  };
  const tryPut = nodes=>{ nodes.forEach(n=> body.appendChild(n)); if(fits()) return true; nodes.forEach(n=> n.remove()); return false; };
  // 單一單位在空白頁也放不下（極少見，例如一大段沒有換行的文字）：等比縮小到剛好放得下
  const squeeze = el=>{
    const over = body.scrollHeight - body.clientHeight;
    if(over <= 0) return;
    const h = el.getBoundingClientRect().height;
    el.style.zoom = Math.max(.55, (h - over - 2) / h).toFixed(3);
  };
  const contClone = blk=>{
    const c = blk.cloneNode(true);
    const host = c.querySelector('.ru-host');
    if(host) host.innerHTML = '';
    c.querySelectorAll('.tail').forEach(x=> x.remove());
    const t = c.querySelector('.rb-h');
    if(t && !t.querySelector('.cont')) t.insertAdjacentHTML('beforeend', '<i class="cont">（續）</i>');
    c.style.marginTop = '0';
    return c;
  };
  const splitPlace = (blk, lead)=>{
    const host = blk.querySelector('.ru-host');
    const units = [...host.children].filter(u=> u.classList.contains('ru'));
    const tails = [...blk.querySelectorAll('.tail')];
    units.forEach(u=> u.remove());
    tails.forEach(t=> t.remove());
    let shell = blk, shost = host, n = 0;
    lead.forEach(x=> body.appendChild(x));
    body.appendChild(shell);
    if(!fits()){ shell.remove(); lead.forEach(x=> x.remove()); newPage(); lead.forEach(x=> body.appendChild(x)); body.appendChild(shell); }
    for(const u of units){
      shost.appendChild(u);
      if(fits()){ n++; continue; }
      u.remove();
      const carry = [u];
      // 小標或表格分組列不留在頁尾，跟著下一列一起換頁
      while(n > 0 && shost.lastElementChild && shost.lastElementChild.classList.contains('keep')){ carry.unshift(shost.lastElementChild); shost.lastElementChild.remove(); n--; }
      if(n === 0){
        // 這一頁連一列都放不下：整段改到下一頁開始（本頁若已是空白頁就留在原地，交給下面的縮放處理）
        const first = shell === blk;
        shell.remove();
        if(first) lead.forEach(x=> x.remove());
        if(used()) newPage();
        if(first) lead.forEach(x=> body.appendChild(x));
        else { shell = contClone(blk); shost = shell.querySelector('.ru-host'); }
        body.appendChild(shell);
      } else {
        newPage();
        shell = contClone(blk);
        shost = shell.querySelector('.ru-host');
        body.appendChild(shell);
      }
      carry.forEach(x=> shost.appendChild(x));
      if(!fits()) squeeze(carry[carry.length - 1]);
      n = carry.length;
    }
    const tailBox = sh=> sh.querySelector(':scope > .rb-r') || sh;
    tails.forEach(t=>{
      tailBox(shell).appendChild(t);
      if(fits()) return;
      t.remove();
      newPage();
      shell = doc.createElement('div');
      shell.className = 'rb';
      shell.innerHTML = '<div class="rb-l"></div><div class="rb-r"></div>';
      body.appendChild(shell);
      tailBox(shell).appendChild(t);
    });
  };
  const place = (blk, lead)=>{
    if(tryPut([...lead, blk])) return;
    const splittable = blk.dataset.split === '1' && blk.querySelector('.ru-host') && blk.querySelectorAll('.ru-host > .ru').length > 1;
    // 量這一段完整的高度
    const probe = doc.createElement('div');
    probe.style.cssText = 'position:absolute; left:-10000px; top:0; width:' + body.clientWidth + 'px;';
    doc.body.appendChild(probe);
    lead.forEach(x=> probe.appendChild(x)); probe.appendChild(blk);
    const h = probe.getBoundingClientRect().height;
    lead.forEach(x=> x.remove()); blk.remove(); probe.remove();
    const A = avail();
    // 比半頁還高、而本頁還剩三成以上空間：在列與列之間拆開，避免留下大片空白
    if(splittable && (h > A || (h > A * .4 && remaining() > A * .3))){ splitPlace(blk, lead); return; }
    if(used()){ newPage(); if(tryPut([...lead, blk])) return; }
    if(splittable){ splitPlace(blk, lead); return; }
    lead.forEach(x=> body.appendChild(x)); body.appendChild(blk);
    squeeze(blk);
  };

  // 目錄頁
  chLabel = '目錄';
  newPage();
  body.innerHTML = rTocHtml(m);

  const chapterStart = {};
  [...stage.querySelectorAll(':scope > .rc')].forEach(rc=>{
    const c = m.chapters.find(x=> x.id === rc.dataset.id);
    chLabel = `${c.zh}<b>${c.no}</b>`;
    newPage();
    chapterStart[c.id] = pages.length + 1;   // 封面是第 1 頁
    const head = rc.querySelector('.rc-head');
    const blocks = [...rc.children].filter(x=> x.classList.contains('rb'));
    head.remove();
    if(!blocks.length){ body.appendChild(head); return; }
    blocks.forEach((b, i)=>{ b.remove(); place(b, i === 0 ? [head] : []); });
  });

  if(m.attachments.length){
    chLabel = '原始報告<b>B</b>';
    m.attachments.forEach((a, i)=>{
      newPage();
      if(i === 0) chapterStart.att = pages.length + 1;
      body.innerHTML = `<div class="rb att"><h3 class="rb-h">${esc(a.title)}${a.sub ? `<i class="cont">${esc(a.sub)}</i>` : ''}</h3><img src="${a.src}" alt=""></div>`;
      const img = body.querySelector('img');
      img.style.maxHeight = (avail() - (a.sub ? 74 : 56)) + 'px';
    });
  }

  const total = pages.length + 1;
  pages.forEach((pg, i)=>{ pg.querySelector('.pg').textContent = `第 ${i + 2} 頁／共 ${total} 頁`; });
  doc.querySelectorAll('[data-toc]').forEach(row=>{
    const p = chapterStart[row.dataset.toc];
    const el = row.querySelector('.p');
    if(el) el.textContent = p ? String(p).padStart(2, '0') : '—';
  });
  stage.remove();
  return total;
}

function reportDocHtml(title, preview){
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>${esc(title)}</title>` +
    `<base href="${location.href}">${RPT_FONTS}<style>${REPORT_CSS}</style></head>` +
    `<body${preview ? ' class="preview"' : ''}><div id="pages"></div><div id="stage"></div></body></html>`;
}

// 列印：在隱藏的 iframe 裡排好版再叫出列印對話框（沿用 printIsolated 的清理流程）
// 判讀標準（腰圍、HDL-C、體脂肪率、eGFR、BMR）依性別不同，沒選性別就不產生報告
function rHasUploads(){ return ['lab', 'tanita'].some(k=> (uploadedFiles[k] || []).length); }
function rAttOn(){ const box = document.getElementById('rpt-att'); return !box || box.checked; }
function rNeedGender(){
  if(rS('p-gender')) return false;
  alert('請先在「基本資料」選擇性別，報告的判讀標準依性別不同。');
  const g = document.getElementById('p-gender');
  if(g) g.focus();
  return true;
}

function printReport(){
  if(rNeedGender()) return;
  const m = buildReportModel();
  printIsolated('', getReportFilename(), {
    html: reportDocHtml(getReportFilename(), false),
    prepare: doc=> layoutReport(doc, m)
  });
  const pill = document.getElementById('status-pill');
  if(pill) pill.textContent = '報告已產生';
}

// 預覽：全螢幕顯示排好的每一頁，可直接列印
async function previewReport(){
  if(rNeedGender()) return;
  closeReportPreview();
  const m = buildReportModel();
  const ov = document.createElement('div');
  ov.className = 'rpt-overlay no-print';
  ov.id = 'rpt-overlay';
  ov.innerHTML = `<div class="rpt-ov-bar"><b>報告預覽</b><span class="rpt-ov-info" id="rpt-ov-info">排版中…</span>` +
    `<span style="flex:1"></span>` +
    (rHasUploads() ? `<label class="rpt-att-opt"><input type="checkbox" id="rpt-ov-att"${rAttOn() ? ' checked' : ''}> 附上原始報告</label>` : '') +
    `<button class="btn teal" id="rpt-ov-print">列印／輸出 PDF</button><button class="btn outline" id="rpt-ov-close">關閉</button></div>` +
    `<iframe id="rpt-ov-frame" title="報告預覽"></iframe>`;
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';
  ov.querySelector('#rpt-ov-close').onclick = closeReportPreview;
  ov.querySelector('#rpt-ov-print').onclick = ()=> printReport();
  const ovAtt = ov.querySelector('#rpt-ov-att');
  if(ovAtt) ovAtt.onchange = ()=>{
    const box = document.getElementById('rpt-att');
    if(box) box.checked = ovAtt.checked;
    previewReport();
  };
  const frame = ov.querySelector('#rpt-ov-frame');
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(reportDocHtml(getReportFilename(), true)); doc.close();
  const fit = ()=>{
    const w = frame.clientWidth - 40;
    doc.body.style.zoom = w < 794 ? (w / 794).toFixed(3) : '';
  };
  try{
    const total = await layoutReport(doc, m);
    document.getElementById('rpt-ov-info').textContent = `共 ${total} 頁　A4 直式`;
    fit();
    frame.contentWindow.addEventListener('resize', fit);
  }catch(e){
    console.error(e);
    document.getElementById('rpt-ov-info').textContent = '排版失敗：' + e.message;
  }
}
function closeReportPreview(){
  const ov = document.getElementById('rpt-overlay');
  if(ov) ov.remove();
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && document.getElementById('rpt-overlay')){ e.stopPropagation(); e.preventDefault(); closeReportPreview(); }
}, true);
