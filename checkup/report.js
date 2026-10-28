/* 健檢報告：章節內容、A4 排版、預覽與列印。
   版面沿用減重報告：REPORT_CSS、RPT_FONTS、rLogo、rPill、rBar、rBlock、rCallout、rRich、rBr 都來自 weight/report.js，
   排版流程（ckLayout）照 layoutReport 改寫，只換掉頁首、封面、目錄與頁尾，減重報告本身不受影響。 */

const CK_RPT_CSS = `
.find .t{white-space:normal;}
.rb.full > .rb-l{display:flex; align-items:baseline; gap:12px; padding:0 0 10px;}
.rb.full > .rb-l .rb-no{margin:0;}
.labt .rt td{padding:6px 5px;}
.labt .rt th{padding:0 5px 6px;}
.labt .rt td.nm{font-size:12.5px; color:#1F262A; line-height:1.45;}
.labt .rt td.n{font-size:13px;}
.labt .rt td.prev{font-size:11.5px; color:#6F6A62; font-variant-numeric:tabular-nums; white-space:nowrap;}
.labt .rt td.prev small{display:block; font-size:9.5px; color:#9A9387;}
.labt .rt td.g{text-align:right;}
.labt .rt tr.rest td{font-size:11.5px; color:#5F5A53; line-height:1.7;}
.us-row{display:grid; grid-template-columns:1fr auto; gap:12px; align-items:baseline; padding:8px 0; border-bottom:1px solid #ECE7DE;}
.us-row:first-child{padding-top:0;}
.us-row b{font-size:13.5px; color:#1F262A;}
.us-row p{font-size:12px; color:#5F5A53; margin-top:2px;}
.big-row{display:flex; align-items:flex-end; gap:14px; margin-bottom:6px;}
.fib-v{font-family:"Noto Serif TC","Source Han Serif TC","PMingLiU",serif; font-size:34px; font-weight:700; color:#1F262A; line-height:1;}
.tile .v b{font-weight:500;}
`;

// ---------- 小工具 ----------
const CK_G_TXT = ['正常', '注意', '異常'];
function ckPill(g, txt){ return rPill(g, txt); }
function ckWorst(list){
  const have = list.filter(x=> x && x.g != null && x.g >= 0);
  if(!have.length) return {g: -1, v: '<span class="na">未測</span>'};
  return have.reduce((a, b)=> b.g > a.g ? b : a);
}
function ckDateZh(s){ const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? `${m[1]} 年 ${+m[2]} 月 ${+m[3]} 日` : (s || ''); }
function ckSecName(s){ return String(s || '其他').replace(/檢查$/, '') || '其他'; }
// 各檢驗分組的一句說明，放在表格下方
const CK_SEC_NOTE = [
  [/肝炎/,     'B 肝表面抗原陽性代表帶原；表面抗體陽性代表有保護力；C 肝抗體陽性要再驗病毒量，確認是否仍有感染。'],
  [/心血管/,   '脂蛋白(a) 主要由遺傳決定；ApoB 反映會造成動脈硬化的脂蛋白顆粒數；hs-CRP 反映血管的慢性發炎。'],
  [/肝/,      'AST、ALT 反映肝細胞有沒有受損，脂肪肝、病毒性肝炎、飲酒與部分藥物都會讓數值上升。'],
  [/脂/,       'LDL-C 是主要的心血管風險指標；HDL-C 越高越好。是否需要用藥，要合併年齡、血壓、血糖與吸菸一起評估。'],
  [/糖/,       '糖化血色素反映過去 2 至 3 個月的平均血糖。HOMA-IR 由空腹血糖與胰島素算出，數值越高代表胰島素阻抗越明顯。'],
  [/腎/,       'eGFR 由肌酸酐、年齡與性別算出，60 以上且尿液正常，一般視為腎功能正常。'],
  [/血液/,     '紅血球與血色素看有沒有貧血，白血球與發炎、感染有關，血小板和凝血功能有關。'],
  [/甲狀腺/,   'TSH 是篩檢甲狀腺功能最敏感的指標，搭配游離甲狀腺素判斷功能亢進或低下。'],
  [/^尿/,      '尿糖、尿蛋白與潛血是腎臟與泌尿道的篩檢；生理期前後的尿液容易出現潛血。'],
  [/癌|腫瘤/,  '腫瘤標記只能當作參考，數值正常不代表沒有癌症，數值升高也不一定是癌症，不能取代影像與內視鏡檢查。'],
];

// ---------- 各章 ----------
function ckChSummary(d){
  const blocks = [];
  const comment = String(CK.comment || '').trim();
  if(comment) blocks.push(rBlock('醫師綜合評語', '', `<div class="memo"><div class="rich ru-host">${rRich(comment, 36)}</div></div>`, {split:true}));
  const f = d.findings;
  const findHtml = f.length
    ? f.map((x, i)=> `<div class="find ru"><span class="i">${String(i + 1).padStart(2, '0')}</span><span class="t">${x.html}</span>${ckPill(x.g)}</div>`).join('')
    : '<div class="empty">這次健檢沒有判讀為「注意」或「異常」的項目。</div>';
  blocks.push(rBlock('優先處理事項', '', `<div class="ru-host">${findHtml}</div>`, {split:true}));

  const row = k=> d.rows.find(r=> r.key === k);
  const item = (k, label)=>{ const r = row(k); return r && String(r.raw || '').trim() ? {g: r.j.g, v: `${label} <b>${ckEsc(r.raw)}</b>`} : null; };
  const keysOf = re=> d.rows.filter(r=> re.test(r.sec || '') && String(r.raw || '').trim()).map(r=> ({g: r.j.g, v: `${ckEsc(r.zh || r.code)} ${ckEsc(r.raw)}`}));
  const urine = d.rows.filter(r=> /^尿/.test(r.sec || '') && String(r.raw || '').trim());
  const urineT = urine.length ? (()=>{ const bad = urine.filter(r=> r.j.g >= 1); return {g: bad.length ? Math.max(...bad.map(r=> r.j.g)) : 0, v: bad.length ? `${bad.length} 項異常` : '皆正常'}; })() : null;
  const abd = d.us.filter(u=> u.area === '腹部'), thyUs = d.us.filter(u=> u.area === '甲狀腺');
  const usT = list=> list.length ? (()=>{ const w = list.reduce((a, b)=> b.g > a.g ? b : a); return {g: w.g, v: ckEsc(w.t)}; })() : null;
  const b = d.body;
  const tiles = [
    ['體位', b.bmi ? {g: b.bmi.g, v: `BMI <b>${b.bmi.v.toFixed(1)}</b>`} : null],
    ['血壓', b.bp ? {g: b.bp.g, v: `<b>${b.bp.s}/${b.bp.d}</b>`} : null],
    ['血糖', ckWorst([item('a1c', 'HbA1c'), item('glu', '血糖')])],
    ['血脂', ckWorst([item('ldl', 'LDL'), item('tg', 'TG'), item('hdl', 'HDL'), item('tc', 'TC')])],
    ['肝臟', ckWorst([item('alt', 'ALT'), item('ast', 'AST'), d.fib4 && d.fib4.v != null ? {g: d.fib4.g, v: `FIB-4 <b>${d.fib4.v.toFixed(2)}</b>`} : null])],
    ['腎臟', ckWorst([item('egfr', 'eGFR'), item('cr', 'Cr'), item('ua', '尿酸')])],
    ['血液', ckWorst(keysOf(/血液/))],
    ['甲狀腺', ckWorst([item('tsh', 'TSH'), item('ft4', 'fT4'), usT(thyUs)])],
    ['尿液', urineT],
    ['腹部超音波', usT(abd)],
  ].map(([k, x])=>{ const t = x && x.g != null ? x : {g: -1, v: '<span class="na">未測</span>'}; return {k, ...t}; });
  blocks.push(rBlock('各系統總覽', '',
    `<div class="tiles">${tiles.map(t=> `<div class="tile"><div class="k">${t.k}</div><div class="v">${t.v}</div><div>${ckPill(t.g, t.g < 0 ? '未測' : '')}</div></div>`).join('')}</div>` +
    `<p class="note-line">每格顯示該系統判讀最需要注意的一項。</p>`));
  return blocks;
}

function ckChBody(d){
  const b = d.body, B = CK.body, blocks = [];
  if(b.bmi){
    const h = ckNum(B.h), hM = h / 100;
    blocks.push(rBlock('身體質量指數', '',
      `<div class="bmi-top"><div class="big">${b.bmi.v.toFixed(1)}<small>kg/m²</small></div><div style="padding-bottom:6px">${ckPill(b.bmi.g, b.bmi.cat)}</div>` +
      `<div class="facts"><span>身高</span><b>${ckEsc(B.h)} cm</b><span>體重</span><b>${ckEsc(B.w)} kg</b>` +
      `<span>建議體重範圍</span><b>${(18.5 * hM * hM).toFixed(1)} 至 ${(24 * hM * hM).toFixed(1)} kg</b></div></div>` +
      rBar(b.bmi.v, [15, 35], [[18.5, 1], [24, 0], [27, 1], [Infinity, 2]], 516) +
      `<p class="note-line">依國健署標準：BMI 18.5 至 24 為正常，24 至 27 為過重，27 以上為肥胖。</p>`));
  }
  const kv = [];
  if(b.waist) kv.push(['腰圍', `${b.waist.v} 公分　${ckPill(b.waist.g)}`, `${d.P.male ? '男' : '女'}性標準：小於 ${b.waist.cut} 公分`]);
  if(b.bp) kv.push(['血壓', `${b.bp.s}/${b.bp.d} mmHg　${ckPill(b.bp.g)}`, '台灣 2022 高血壓指引：居家血壓 130/80 以上為高血壓']);
  if(ckNum(B.hr) != null) kv.push(['脈搏', `${ckEsc(B.hr)} 次／分`, '']);
  if(kv.length) blocks.push(rBlock('腰圍與血壓', '', `<table class="rt kv">${kv.map(([k, v, n])=> `<tr><th>${k}</th><td>${v}${n ? `<br><span class="muted small">${n}</span>` : ''}</td></tr>`).join('')}</table>`));
  // 身體組成：項目、判讀標準與長條分區和減重報告一致
  const m = d.P.male, I = Infinity, E = 1e-9;
  const comp = [
    ['體脂肪率', 'Body Fat', b.fat, '%', m ? '< 25%' : '< 30%', [5, 50], [[m ? 25 : 30, 0], [I, 2]]],
    ['體脂肪量', 'Fat Mass', ckNum(B.fatmass) != null ? {v: ckNum(B.fatmass)} : null, 'kg', '', null, null],
    ['肌肉量', 'Muscle Mass', ckNum(B.muscle) != null ? {v: ckNum(B.muscle)} : null, 'kg', '', null, null],
    ['內臟脂肪等級', 'Visceral Fat', b.visceral, '', '1 至 9', [1, 25], [[10, 0], [15, 1], [I, 2]]],
    ['身體水分率', 'Body Water', b.water, '%', m ? '50 至 65%' : '45 至 60%', [35, 75], m ? [[50, 1], [65 + E, 0], [I, 1]] : [[45, 1], [60 + E, 0], [I, 1]]],
    ['四肢骨骼肌指數', 'SMI', b.smi, 'kg/m²', m ? '≥ 7.0' : '≥ 5.7', [4, 11], [[m ? 7 : 5.7, 1], [I, 0]]],
    ['相位角', 'Phase Angle', b.phase, '°', '≥ 4.5°', [2, 9], [[4.5, 1], [I, 0]]],
    ['身體年齡', 'Body Age', b.bodyage, '歲', d.P.age != null ? `實際 ${d.P.age} 歲` : '', null, null],
    ['基礎代謝量', 'BMR', ckNum(B.bmr) != null ? {v: ckNum(B.bmr)} : null, 'kcal', '', null, null],
  ].filter(r=> r[2]);
  if(comp.length){
    const trs = comp.map(([zh, en, x, u, ref, sc, cuts])=> `<tr class="ru"><td class="nm">${zh}<span class="en">${en}</span></td>` +
      `<td class="n">${x.v}${u ? `<span class="u">${u}</span>` : ''}</td><td class="ref">${ref}</td>` +
      `<td>${sc ? rBar(x.v, sc, cuts, 118) : ''}</td><td class="g">${x.g != null ? ckPill(x.g) : ''}</td></tr>`).join('');
    const ph = b.pheno && b.pheno.hasComp ? `<div class="pheno"><span class="muted">身體組成分型</span><b>${ckEsc(b.pheno.t)}</b></div>` +
      (b.pheno.focus ? `<p class="note-line" style="margin-top:2px">${rBr('訓練主軸：' + b.pheno.focus, 40)}</p>` : '') +
      (b.pheno.partial ? `<p class="note-line">${rBr('這次沒有 SMI 或相位角，分型只依 BMI 與體脂肪判斷。', 40)}</p>` : '') : '';
    blocks.push(rBlock('身體組成分析', '',
      `<table class="rt"><colgroup><col style="width:30%"><col style="width:17%"><col style="width:17%"><col style="width:24%"><col style="width:12%"></colgroup>` +
      `<thead><tr><th>項目</th><th>結果</th><th>參考值</th><th>位置</th><th class="c">判讀</th></tr></thead><tbody class="ru-host">${trs}</tbody></table>` +
      ph + `<p class="note-line tail">${rBr('以 TANITA 身體組成分析儀量測。SMI 切點依亞洲肌少症工作小組（AWGS 2019）。', 40)}</p>`, {split:true}));
  }
  return blocks;
}

/* ---------- 歷年趨勢 ----------
   上傳兩份以上報告時，常用項目畫成小折線圖；虛線是判讀切點（取 ckBarDef 第一個分界），最後一點依本次判讀上色。 */
const CK_TREND = [['ldl', 'LDL-C'], ['tc', '總膽固醇'], ['tg', '三酸甘油脂'], ['hdl', 'HDL-C'], ['a1c', '糖化血色素'], ['glu', '飯前血糖'],
  ['alt', 'ALT'], ['ast', 'AST'], ['egfr', 'eGFR'], ['ua', '尿酸'], ['hgb', '血色素'], ['plt', '血小板']];
const CK_G_COLOR = ['#5E8A63', '#C08A2E', '#B4543A'];
function ckTrendSeries(d){
  if(d.reports.length < 2) return [];
  const old = [...d.reports].reverse();
  return CK_TREND.map(([k, label])=>{
    const pts = old.map(rp=>{ const r = rp.rows.find(x=> x.key === k); const v = r ? ckNum(r.raw) : null; return v == null ? null : {date: rp.date || '', v}; }).filter(Boolean);
    if(pts.length < 2) return null;
    const cur = d.rows.find(r=> r.key === k);
    const bd = ckBarDef(k, d.P, cur);
    return {k, label, unit: (CK_LAB_BY[k] || [])[4] || '', pts, g: cur ? cur.j.g : 0, cut: k === 'egfr' ? 60 : bd ? bd.cuts[0][0] : null};
  }).filter(Boolean);
}
function ckTrendSvg(s, W){
  const H = 118, L = 8, R = 8, top = 22, bot = 24;
  const vals = s.pts.map(p=> p.v).concat(s.cut != null && isFinite(s.cut) ? [s.cut] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * .18 || Math.abs(hi) * .1 || 1; lo -= pad; hi += pad;
  const n = s.pts.length;
  const x = i=> n === 1 ? W / 2 : L + 14 + i * (W - L - R - 28) / (n - 1);
  const y = v=> top + (hi - v) / (hi - lo) * (H - top - bot);
  const fmt = v=> String(Math.round(v * 100) / 100);
  let g = '';
  if(s.cut != null && isFinite(s.cut)) g += `<line x1="${L}" x2="${W - R}" y1="${y(s.cut).toFixed(1)}" y2="${y(s.cut).toFixed(1)}" stroke="#BC7F30" stroke-width="1" stroke-dasharray="3 3"/>`;
  g += `<polyline fill="none" stroke="#3E6A7C" stroke-width="1.8" points="${s.pts.map((p, i)=> x(i).toFixed(1) + ',' + y(p.v).toFixed(1)).join(' ')}"/>`;
  s.pts.forEach((p, i)=>{
    const last = i === n - 1, c = last ? CK_G_COLOR[Math.max(0, s.g)] : '#3E6A7C';
    g += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${last ? 4 : 3}" fill="${last ? c : '#fff'}" stroke="${c}" stroke-width="1.6"/>` +
      `<text x="${x(i).toFixed(1)}" y="${(y(p.v) - 8).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="${last ? 700 : 400}" fill="#1F262A">${fmt(p.v)}</text>` +
      `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="9.5" fill="#8A8378">${ckEsc(p.date.slice(0, 7).replace('-', '/'))}</text>`;
  });
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block; overflow:visible">${g}</svg>`;
}
function ckTrendBlock(d){
  const S = ckTrendSeries(d);
  if(!S.length) return null;
  const W = 206, rows = [];
  for(let i = 0; i < S.length; i += 3) rows.push(S.slice(i, i + 3));
  const tile = s=> `<div style="width:${W}px"><div style="font-size:12px; color:#1F262A; font-weight:700">${ckEsc(s.label)}<span style="font-weight:400; color:#8A8378; margin-left:4px">${ckEsc(s.unit)}</span></div>${ckTrendSvg(s, W)}</div>`;
  return `<div class="rb full" data-split="1"><div class="rb-l"><div class="rb-no"></div><h3 class="rb-h">歷年變化</h3></div><div class="rb-r"><div class="ru-host">` +
    rows.map(r=> `<div class="ru" style="display:flex; gap:24px; padding:4px 0 10px">${r.map(tile).join('')}</div>`).join('') +
    `</div><p class="note-line tail">${rBr('每張圖由左到右是歷次檢查，最右邊是這次；虛線是判讀的切點。', 52)}</p></div></div>`;
}

function ckChLab(d){
  const blocks = [];
  const tb = ckTrendBlock(d);
  if(tb) blocks.push(tb);
  const hasPrev = d.reports.length > 1;
  const prevDate = hasPrev ? d.reports[1].date : '';
  const secs = [];
  d.rows.forEach(r=>{ let s = secs.find(x=> x.name === r.sec); if(!s){ s = {name: r.sec, rows: []}; secs.push(s); } s.rows.push(r); });
  const cols = hasPrev ? [176, 104, 78, 112, 134, 62] : [206, 116, 0, 128, 150, 66];
  secs.forEach(s=>{
    const rows = s.rows.filter(r=> String(r.raw || '').trim());
    if(!rows.length) return;
    const isUrine = /^尿/.test(s.name || '');
    const show = isUrine ? rows.filter(r=> r.j.g >= 1 || /PH|SPECIFIC/i.test(r.code)) : rows;
    const rest = isUrine ? rows.filter(r=> !show.includes(r)) : [];
    const tr = r=>{
      const nm = ckEsc(r.zh || (CK_LAB_BY[r.key] || [])[2] || r.code);
      const ar = r.flag === 'H' ? '<span class="arrow hi">↑</span>' : r.flag === 'L' ? '<span class="arrow lo">↓</span>' : '';
      const bd = ckBarDef(r.key, d.P, r), v = ckNum(r.raw);
      const pv = hasPrev ? ckPrev(r.key, r.code) : null;
      return `<tr class="ru"><td class="nm">${nm}<span class="en">${ckEsc(r.code)}</span></td>` +
        `<td class="n">${ckEsc(r.raw)}${ar}${r.unit ? `<span class="u">${ckEsc(r.unit)}</span>` : ''}</td>` +
        (hasPrev ? `<td class="prev">${pv ? ckEsc(pv.raw) : '—'}</td>` : '') +
        // 「（見報告說明）」指的是檢驗所報告的附註，這份報告沒有那一段，所以拿掉
        `<td class="ref">${ckEsc(String(r.ref || '').replace(/\s*[（(]見(報告)?說明[)）]/g, ''))}</td>` +
        `<td>${bd && v != null ? rBar(v, bd.scale, bd.cuts, cols[4] - 12) : ''}</td>` +
        `<td class="g">${ckPill(r.j.g, r.j.pill)}</td></tr>`;
    };
    let body = show.map(tr).join('');
    if(rest.length) body += `<tr class="ru rest"><td colspan="${hasPrev ? 6 : 5}">${rBr(rest.map(r=> r.zh || r.code).join('、') + `，共 ${rest.length} 項皆正常。`, 50)}</td></tr>`;
    const colg = `<colgroup>${cols.filter(w=> w).map(w=> `<col style="width:${w}px">`).join('')}</colgroup>`;
    const head = `<thead><tr><th>項目</th><th>本次</th>${hasPrev ? `<th>上次<br>${ckEsc(prevDate.slice(0, 7))}</th>` : ''}<th>參考區間</th><th>位置</th><th class="c">判讀</th></tr></thead>`;
    const note = CK_SEC_NOTE.find(([re])=> re.test(s.name || ''));
    blocks.push(`<div class="rb full labt" data-split="1"><div class="rb-l"><div class="rb-no"></div><h3 class="rb-h">${ckEsc(ckSecName(s.name))}</h3></div>` +
      `<div class="rb-r"><table class="rt">${colg}${head}<tbody class="ru-host">${body}</tbody></table>` +
      (note ? `<p class="note-line tail">${rBr(note[1], 52)}</p>` : '') + `</div></div>`);
  });
  // AST、ALT、血小板缺任何一項就不放（醫師端畫面另有缺項提醒）
  if(d.fib4 && d.fib4.v != null){
    const F = d.fib4;
    const inner = `<div class="big-row"><div class="fib-v">${F.v.toFixed(2)}</div><div style="padding-bottom:3px">${ckPill(F.g)}</div></div>` +
      rBar(F.v, [0, 4], [[F.low, 0], [2.67, 1], [Infinity, 2]], 516) +
      `<p class="note-line">${rBr(`這次數值${F.d}。`, 40)}<br>${rBr(rFib4Note(F), 40)}</p>`;
    blocks.push(rBlock('肝纖維化指數 FIB-4', '', inner));
  }
  return blocks;
}

function ckChUs(d){
  const blocks = [];
  ['腹部', '甲狀腺'].forEach(area=>{
    const list = d.us.filter(u=> u.area === area);
    if(!list.length) return;
    blocks.push(rBlock(area + '超音波', '', `<div class="ru-host">${list.map(u=> `<div class="us-row ru"><div><b>${ckEsc(u.t)}</b>${u.d ? `<p>${rBr(u.d, 34)}</p>` : ''}</div>${ckPill(u.g)}</div>`).join('')}</div>`, {split:true}));
  });
  const note = String(CK.us.note || '').trim();
  if(note) blocks.push(rRichBlock('補充說明', '', note));
  return blocks;
}

function ckChMod(d){
  const blocks = [];
  const row = u=> `<div class="us-row ru"><div><b>${ckEsc(u.t)}</b>${u.d ? `<p>${rBr(u.d, 34)}</p>` : ''}</div>${ckPill(u.g)}</div>`;
  const info = d.mod.info || {};
  const areas = [...new Set(d.mod.map(u=> u.area).concat(Object.keys(info)))];
  areas.forEach(area=>{
    const list = d.mod.filter(u=> u.area === area);
    const I = info[area] || {};
    let note = list.map(u=> String(u.note || '').trim()).concat([String(I.note || '').trim()]).filter(Boolean).join('\n');
    // 單一區塊不能跨頁，摘要太長就截斷，全文看附件
    if(note.length > 600) note = note.slice(0, 600) + '……（全文見原始報告與附件）';
    const proc = I.proc ? `<p class="note-line tail" style="margin-top:8px">${rBr('處置：' + I.proc, 40)}</p>` : '';
    const label = /病理/.test(area) ? '病理報告' : '摘要';
    blocks.push(rBlock(area, '', `<div class="ru-host">${list.map(row).join('')}</div>` + proc +
      (note ? `<div class="memo tail" style="margin-top:8px"><div class="muted small" style="margin-bottom:2px">${label}</div><div class="rich">${rRich(note, 36)}</div></div>` : ''), {split:true}));
  });
  return blocks;
}

function ckChCv(d){
  const {prevent: pv, tw} = d.cv;
  if(pv.na && tw.na) return [];
  if((pv.miss || pv.range) && (tw.miss || tw.na)) return [];
  const blocks = [];
  const pct = v=> (Math.round(v * 1000) / 10).toFixed(1);
  const why = x=> x.na ? x.na + '。' : x.miss ? `這次缺少${x.miss.join('、')}，無法計算。` : x.range ? '有數值超出模型的適用範圍，無法計算。' : '';
  const big = (v, lbl)=> `<div><div class="fib-v">${pct(v)}<small style="font-size:15px; margin-left:2px">%</small></div><p class="note-line" style="margin-top:4px">${lbl}</p></div>`;
  blocks.push(rBlock('PREVENT 心血管風險', '', why(pv) ? `<p>${rBr(why(pv), 40)}</p>` :
    `<div class="big-row" style="gap:36px; align-items:flex-start">${big(pv.cvd10, '10 年總心血管疾病')}${big(pv.ascvd10, '10 年動脈硬化心血管疾病')}</div>` +
    (pv.cvd30 != null ? `<table class="rt kv" style="margin-top:8px"><tr><th>30 年總心血管疾病</th><td>${pct(pv.cvd30)}%</td></tr><tr><th>30 年動脈硬化心血管疾病</th><td>${pct(pv.ascvd30)}%</td></tr></table>` : '') +
    `<p class="note-line">${rBr('美國心臟學會 2023 年發表的模型，用年齡、膽固醇、血壓、血糖、腎功能、吸菸與用藥估計。總心血管疾病包含心肌梗塞、中風與心衰竭；動脈硬化心血管疾病指心肌梗塞與中風。', 40)}</p>`));
  blocks.push(rBlock('TwCCCC 冠心病風險', '', why(tw) ? `<p>${rBr(why(tw), 40)}</p>` :
    `<div class="big-row">${big(tw.risk, '10 年冠心病風險')}</div>` +
    `<p class="note-line">${rBr(`以台灣竹山社區世代建立，2023 年台灣心臟學會指引採用，用年齡、性別、BMI、血壓、LDL、HDL 與吸菸計分（本次 ${tw.pts} 分），只預測冠心病。`, 40)}</p>`));
  blocks.push(rCallout('兩個數字怎麼看', `<div class="li ru">${rBr('兩個模型預測的疾病與建立的族群不同，數字不能直接相比。', 40)}</div>` +
    `<div class="li ru">${rBr('風險分數是估計值，用來決定血壓與血脂要控制得多積極，請和醫師一起討論。', 40)}</div>`, true));
  return blocks;
}

function ckChPlan(d){
  const blocks = [];
  const order = ['now', 'm3', 'm6', 'y1', 'long'];
  const groups = order.map(w=> ({w, list: d.advice.filter(a=> a.when === w)})).filter(g=> g.list.length);
  const html = groups.map(g=> `<div class="tl-row ru"><div><div class="tl-when">${CK_WHEN[g.w]}</div></div>` +
    `<div>${g.list.map(a=> `<div class="what">${rBr(a.t, 34)}</div>`).join('<div style="height:6px"></div>')}</div></div>`).join('');
  blocks.push(rBlock('建議與追蹤時程', '', `<div class="ru-host">${html}</div>`, {split:true}));
  if(d.pub.length){
    blocks.push(rBlock('可以使用的公費篩檢', '', `<div class="ru-host">${d.pub.map(x=> `<div class="us-row ru"><div><b>${ckEsc(x.t)}</b><p>${rBr(x.rule + (x.done ? '。' + x.done : ''), 34)}</p></div></div>`).join('')}</div>` +
      `<p class="note-line tail">${rBr('依國民健康署公告整理。間隔從上次篩檢起算，實際資格以健保卡紀錄為準，可在門診或健保快易通 App 查詢。', 40)}</p>`, {split:true}));
  }
  // 文字在健檢畫面「追蹤時程」下方，醫師可改；全部刪掉就不印這一框
  const warn = ckWarnText().split('\n').map(t=> t.trim()).filter(Boolean);
  if(warn.length) blocks.push(rCallout('提早就醫', warn.map(t=> `<div class="li ru">${rBr(t, 40)}</div>`).join(''), true));
  return blocks;
}

function ckChAppendix(){
  const G = [
    ['判讀燈號', '正常：在參考範圍內。注意：略超出範圍或屬前期。異常：明顯超出範圍，建議優先處理。'],
    ['參考區間', '檢驗所依檢驗方法與性別訂定；部分項目另依臨床指引判讀，例如糖化血色素與 LDL-C。'],
    ['HbA1c', '糖化血色素，反映 2 至 3 個月平均血糖。5.7 至 6.4 為糖尿病前期，6.5 以上達糖尿病診斷值。'],
    ['HOMA-IR', '胰島素阻抗指數＝空腹血糖 × 胰島素 ÷ 405，數值越高表示身體對胰島素越不敏感。'],
    ['SMI', '四肢骨骼肌量 ÷ 身高²。依亞洲肌少症工作小組（AWGS 2019），男性低於 7.0、女性低於 5.7 kg/m² 為偏低。'],
    ['相位角', '生物電阻抗量測的細胞完整性指標，偏低時常和肌肉品質或營養狀態不佳有關，本報告以 4.5° 為參考。'],
    ['Non-HDL-C', '非高密度膽固醇＝總膽固醇減 HDL-C，包含所有會造成動脈硬化的膽固醇。'],
    ['eGFR', '估算腎絲球過濾率，本報告採用 CKD-EPI 公式。'],
    ['FIB-4', '肝纖維化指數＝年齡 × AST ÷（血小板 × √ALT），用來篩檢肝臟纖維化。'],
    ['TI-RADS', '美國放射學會的甲狀腺結節分級（TR1 至 TR5），依分級與大小決定是否穿刺或追蹤。'],
    ['PREVENT', '美國心臟學會 2023 年發表的心血管風險模型，適用 30 至 79 歲、沒有心血管疾病的人。'],
    ['TwCCCC', '以台灣竹山社區世代建立的冠心病風險計分，2023 年台灣心臟學會指引採用，適用 35 歲以上。'],
    ['Lung-RADS', '美國放射學會的低劑量肺部電腦斷層分級（1 至 4X），依分級決定追蹤間隔。'],
    ['大腸鏡間隔', '依 2020 年美國多學會大腸癌工作小組建議，由瘜肉的種類、數目與大小決定。'],
  ];
  return [`<div class="rb full gloss"><div class="rb-l"><div class="rb-no"></div><h3 class="rb-h">名詞與判讀說明</h3></div><div class="rb-r">` +
    `<table class="rt kv">${G.map(([k, v])=> `<tr><th>${k}</th><td>${rBr(v, 38)}</td></tr>`).join('')}</table></div></div>`];
}

function ckBuildModel(){
  const d = ckCollect();
  const name = CK.info.name || '（未填寫姓名）';
  const date = CK.info.date || ckToday();
  const chapters = [
    {id:'summary', no:'01', zh:'健檢總結',     lead:'醫師評語、優先處理事項與各系統判讀。',            blocks: ckChSummary(d)},
    {id:'body',    no:'02', zh:'身體測量',     lead:'BMI、腰圍、血壓與身體組成。',                     blocks: ckChBody(d)},
    {id:'lab',     no:'03', zh:'血液與尿液檢驗', lead:'依檢驗所的分組列出本次數值、參考區間與判讀。',  blocks: ckChLab(d)},
    {id:'us',      no:'04', zh:'超音波檢查',   lead:'腹部與甲狀腺超音波的發現。',                      blocks: ckChUs(d)},
    {id:'mod',     no:'05', zh:'加選檢查',     lead:'心電圖、頸動脈、幽門桿菌、糞便潛血、胃腸鏡與病理、肺部電腦斷層的結果。', blocks: ckChMod(d)},
    {id:'cv',      no:'06', zh:'心血管風險',   lead:'用國際與台灣兩個模型，估計未來發生心血管疾病的機率。', blocks: ckChCv(d)},
    {id:'plan',    no:'07', zh:'建議與追蹤',   lead:'依這次結果整理的建議、下次檢查的時間，以及可以使用的公費篩檢。', blocks: ckChPlan(d)},
    {id:'appx',    no:'A',  zh:'附錄',         lead:'報告中用到的名詞與判讀標準。',                    blocks: ckChAppendix()},
  ].filter(c=> c.blocks.length);
  chapters.forEach((c, i)=>{ if(c.id !== 'appx') c.no = String(i + 1).padStart(2, '0'); });
  const attachments = [];
  if(ckAttOn()){
    if(d.current && CK_PAGES[d.current.id]){
      const pg = CK_PAGES[d.current.id];
      pg.forEach((src, i)=> attachments.push({title: `檢驗報告：${d.current.date || ''}`, sub: pg.length > 1 ? `第 ${i + 1}／${pg.length} 頁` : '', src}));
    }
    // 其他附件依報告章節順序排列
    Object.keys(CK_ATT_KIND).forEach(kind=>{
      CK.att.filter(a=> a.kind === kind && CK_PAGES[a.id]).forEach(a=>{
        const pg = CK_PAGES[a.id];
        pg.forEach((src, i)=> attachments.push({title: CK_ATT_KIND[kind], sub: pg.length > 1 ? `第 ${i + 1}／${pg.length} 頁` : '', src}));
      });
    });
  }
  return {d, name, date, chapters, attachments};
}
let ckWithAtt = true;
function ckAttOn(){ return ckWithAtt; }

// ---------- 封面與目錄 ----------
function ckCoverHtml(m, logo){
  const I = CK.info, sex = I.sex === 'M' ? '男' : I.sex === 'F' ? '女' : '';
  const f = (k, v)=> `<div class="cv-f"><span class="k">${k}</span><span class="v${v ? '' : ' na'}">${v ? ckEsc(v) : '--'}</span></div>`;
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
      ${f('姓名', I.name)}${f('病歷號', I.chart)}
      ${f('性別', sex)}${f('年齡', I.age ? I.age + ' 歲' : '')}
      ${f('出生日期', I.birth)}${f('檢查日期', m.date)}
    </div>
  </div>
  <div class="cv-foot"><div>高雄市仁武區仁孝路282號<br>07-3739496 ・ LINE @muzichengan</div><div class="r">本報告僅供臨床參考，<br>檢查結果請與主治醫師討論。</div></div>
</section>`;
}
function ckTocHtml(m){
  const rows = m.chapters.map(c=> `<div class="toc" data-toc="${c.id}"><span class="no">${c.no}</span><span class="t">${c.zh}</span><span class="p"></span></div>`).join('') +
    (m.attachments.length ? `<div class="toc" data-toc="att"><span class="no">B</span><span class="t">原始報告與附件</span><span class="p"></span></div>` : '');
  return `<div class="toc-head"><h2>目錄</h2><div class="lead">這份報告依下列順序整理，每一章開頭先說明這一章看什麼。</div></div>${rows}
  <div class="rb callout howto"><div class="co-l">閱讀方式</div><div class="co-r">
    <div class="lg">
      <div>${rPill(0)}<br>在參考範圍內。</div>
      <div>${rPill(1)}<br>略超出參考範圍，<br>或屬前期。</div>
      <div>${rPill(2)}<br>明顯超出範圍，<br>建議優先處理。</div>
      <div>${rPill(-1, '未測')}<br>本次沒有資料。</div>
    </div>
    <p>數值旁的長條代表判讀分區，綠色為正常，黃色需要注意，紅色建議處理，黑色標記是您這次的位置。</p>
    <p>有往年報告時，表格會列出上一次的數值，方便比較變化。</p>
    <p>判讀以一般成人參考值為基準，不能取代醫師的臨床判斷，治療計畫請與醫師討論後再進行。</p>
  </div></div>`;
}

// ---------- 排版：把內容放進固定高度的 A4 頁（照 layoutReport 改寫） ----------
async function ckLayout(doc, m, retry){
  const pagesBox = doc.getElementById('pages');
  const stage = doc.getElementById('stage');
  const hd = r=> `<div class="rpt-hd"><span>木子澄安診所　健康檢查報告</span><span class="r">${r}</span></div>`;

  const logo = {wm: await rLogo('#F0F2F1', 1826), mark: await rLogo('#2F5445', 144, true)};
  pagesBox.innerHTML = ckCoverHtml(m, logo);
  stage.innerHTML = m.chapters.map(c=> `<div class="rc" data-id="${c.id}"><div class="rc-head"><h2>${c.zh}</h2>` +
    (c.id === 'summary' ? `<div class="rc-sign"><span>醫師</span><span class="ln"></span><span>日期</span><span class="ln"></span></div>` : '') +
    `<div class="lead">${rBr(c.lead, 42)}</div></div>${c.blocks.filter(Boolean).join('')}</div>`).join('');
  stage.querySelectorAll(':scope > .rc').forEach(rc=>{
    rc.querySelectorAll(':scope > .rb > .rb-l > .rb-no').forEach((n, i)=>{ n.textContent = String(i + 1).padStart(2, '0'); });
  });

  // 字型與圖片都到位後才量高度；離線時最多等 5 秒，改用系統字型
  const sleep = ms=> new Promise(r=> setTimeout(r, ms));
  const link = doc.querySelector('link[rel="stylesheet"]');
  if(link && !link.sheet) await Promise.race([new Promise(r=>{ link.onload = link.onerror = r; }), sleep(3000)]);
  void stage.offsetHeight; void pagesBox.offsetHeight;
  await sleep(30);
  const waitFonts = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
  const imgs = [...doc.images].filter(im=> !im.complete).map(im=> new Promise(r=>{ im.onload = im.onerror = r; }));
  await Promise.race([Promise.all([waitFonts, Promise.all(imgs)]), sleep(5000)]);

  // 右欄內文的第一行和左欄小標水平對齊
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

  let body = null, chLabel = '';
  const pages = [];
  const newPage = ()=>{
    const pg = doc.createElement('section');
    pg.className = 'rpt-page';
    pg.innerHTML = hd(chLabel) + '<div class="rpt-body"></div>' +
      `<div class="rpt-ft"><span>木子澄安診所　${ckEsc(m.name)}　檢查日期 ${ckEsc(m.date)}<br>本報告僅供臨床參考，檢查結果請與醫師討論</span><span class="pg"></span></div>`;
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
      while(n > 0 && shost.lastElementChild && shost.lastElementChild.classList.contains('keep')){ carry.unshift(shost.lastElementChild); shost.lastElementChild.remove(); n--; }
      if(n === 0){
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
      // 附註不單獨換頁：本頁還有兩列以上時，帶最後一列一起到下一頁
      const last = shost && shost.querySelectorAll(':scope > .ru').length > 1 ? shost.lastElementChild : null;
      if(last) last.remove();
      newPage();
      if(last){
        shell = contClone(blk);
        shost = shell.querySelector('.ru-host');
        body.appendChild(shell);
        shost.appendChild(last);
      } else {
        shell = doc.createElement('div');
        shell.className = 'rb';
        shell.innerHTML = '<div class="rb-l"></div><div class="rb-r"></div>';
        body.appendChild(shell);
      }
      tailBox(shell).appendChild(t);
    });
  };
  const place = (blk, lead)=>{
    if(tryPut([...lead, blk])) return;
    // 提示框放不下時連同前一段一起換頁，避免下一頁只剩這一框（同減重報告的 keep-prev）
    if(blk.classList.contains('callout')){
      const prev = body.lastElementChild;
      if(prev && prev.classList.contains('rb') && prev.previousElementSibling){
        prev.remove();
        newPage();
        if(tryPut([prev, blk])) return;
        body.appendChild(prev);
      }
    }
    const splittable = blk.dataset.split === '1' && blk.querySelector('.ru-host') && blk.querySelectorAll('.ru-host > .ru').length > 1;
    const probe = doc.createElement('div');
    probe.style.cssText = 'position:absolute; left:-10000px; top:0; width:' + body.clientWidth + 'px;';
    doc.body.appendChild(probe);
    lead.forEach(x=> probe.appendChild(x)); probe.appendChild(blk);
    const h = probe.getBoundingClientRect().height;
    lead.forEach(x=> x.remove()); blk.remove(); probe.remove();
    const A = avail();
    if(splittable && (h > A || (h > A * .4 && remaining() > A * .3))){ splitPlace(blk, lead); return; }
    if(used()){ newPage(); if(tryPut([...lead, blk])) return; }
    if(splittable){ splitPlace(blk, lead); return; }
    lead.forEach(x=> body.appendChild(x)); body.appendChild(blk);
    squeeze(blk);
  };

  chLabel = '目錄';
  newPage();
  body.innerHTML = ckTocHtml(m);

  const chapterStart = {};
  [...stage.querySelectorAll(':scope > .rc')].forEach(rc=>{
    const c = m.chapters.find(x=> x.id === rc.dataset.id);
    chLabel = `${c.zh}<b>${c.no}</b>`;
    newPage();
    chapterStart[c.id] = pages.length + 1;
    const head = rc.querySelector('.rc-head');
    const blocks = [...rc.children].filter(x=> x.classList.contains('rb'));
    head.remove();
    if(!blocks.length){ body.appendChild(head); return; }
    blocks.forEach((b, i)=>{ b.remove(); place(b, i === 0 ? [head] : []); });
  });

  if(m.attachments.length){
    chLabel = '原始報告與附件<b>B</b>';
    m.attachments.forEach((a, i)=>{
      newPage();
      if(i === 0) chapterStart.att = pages.length + 1;
      body.innerHTML = `<div class="rb att"><h3 class="rb-h">${ckEsc(a.title)}${a.sub ? `<i class="cont">${ckEsc(a.sub)}</i>` : ''}</h3><img src="${a.src}" alt=""></div>`;
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
  // 字型晚到時，排版當下量到的高度比實際小，最後一列會壓到頁尾：字型到位後整份重排一次
  if(!retry && pages.some(pg=>{ const b = pg.querySelector('.rpt-body'); return b && b.scrollHeight > b.clientHeight + .5; })){
    if(doc.fonts && doc.fonts.ready) await doc.fonts.ready;
    return ckLayout(doc, m, true);
  }
  stage.remove();
  return total;
}

function ckDocHtml(title, preview){
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"><title>${ckEsc(title)}</title>` +
    `<base href="${location.href}">${RPT_FONTS}<style>${REPORT_CSS}${CK_RPT_CSS}</style></head>` +
    `<body${preview ? ' class="preview"' : ''}><div id="pages"></div><div id="stage"></div></body></html>`;
}
// 另存 PDF 的預設檔名：姓名_健檢_檢查日期
function ckFilename(){ return (CK.info.name ? CK.info.name + '_' : '') + '健檢_' + String(CK.info.date || ckToday()).replace(/-/g, ''); }
function ckNeedSex(){
  if(CK.info.sex) return false;
  alert('請先在「基本資料」選擇性別，報告的判讀標準依性別不同。');
  ckEl('k-sec-info').scrollIntoView({behavior:'smooth'});
  return true;
}

// ---------- 預覽與列印 ----------
async function ckPreview(){
  if(ckNeedSex()) return;
  ckClosePreview();
  const m = ckBuildModel();
  const cur = m.d.current;
  const ov = document.createElement('div');
  ov.className = 'k-ov';
  ov.id = 'k-ov';
  ov.innerHTML = `<div class="k-ov-bar"><b>報告預覽</b><span id="k-ov-info">排版中…</span>` +
    (cur && cur.unverified ? '<span class="warn">檢驗報告尚未審核</span>' : '') +
    `<span style="flex:1"></span>` +
    ((cur && CK_PAGES[cur.id]) || CK.att.some(a=> CK_PAGES[a.id]) ? `<label><input type="checkbox" id="k-ov-att"${ckWithAtt ? ' checked' : ''}> 附上原始報告與附件</label>` : '') +
    `<button class="k-btn" id="k-ov-print">列印／輸出 PDF</button><button class="k-btn ghost" id="k-ov-close">關閉</button></div>` +
    `<iframe id="k-ov-frame" title="報告預覽"></iframe>`;
  KD.appendChild(ov);
  ov.querySelector('#k-ov-close').onclick = ckClosePreview;
  ov.querySelector('#k-ov-print').onclick = ()=> ckPrint();
  const att = ov.querySelector('#k-ov-att');
  if(att) att.onchange = ()=>{ ckWithAtt = att.checked; ckPreview(); };
  const frame = ov.querySelector('#k-ov-frame');
  const doc = frame.contentWindow.document;
  doc.open(); doc.write(ckDocHtml(ckFilename(), true)); doc.close();
  const fit = ()=>{ const w = frame.clientWidth - 40; doc.body.style.zoom = w < 794 ? (w / 794).toFixed(3) : ''; };
  try{
    const total = await ckLayout(doc, m);
    const info = KD.getElementById('k-ov-info');
    if(info) info.textContent = `共 ${total} 頁　A4 直式`;
    fit();
    frame.contentWindow.addEventListener('resize', fit);
  }catch(e){
    console.error(e);
    const info = KD.getElementById('k-ov-info');
    if(info) info.textContent = '排版失敗：' + e.message;
  }
}
function ckClosePreview(){ const ov = KD.getElementById('k-ov'); if(ov) ov.remove(); }

// 列印：在隱藏的 iframe 裡排好版再叫出列印對話框；頁首頁尾由 @page margin:0 去掉
async function ckPrint(){
  if(ckNeedSex()) return;
  const m = ckBuildModel();
  const title = ckFilename();
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed; left:-10000px; top:0; width:820px; height:1200px; border:0; opacity:0;';
  document.body.appendChild(frame);
  const win = frame.contentWindow, doc = win.document;
  doc.open(); doc.write(ckDocHtml(title, false)); doc.close();
  try{ await ckLayout(doc, m); }
  catch(e){ console.error(e); alert('排版失敗：' + e.message); frame.remove(); return; }
  const orig = document.title;
  document.title = title;
  let done = false;
  const cleanup = ()=>{
    if(done) return;
    done = true;
    if(document.title === title) document.title = orig;
    try{ window.focus(); }catch(e){}
    setTimeout(()=> frame.remove(), 800);
  };
  win.addEventListener('afterprint', cleanup);
  window.addEventListener('afterprint', cleanup, {once:true});
  win.focus();
  win.print();
  setTimeout(cleanup, 60000);
}

KD.addEventListener('keydown', e=>{
  if(e.key === 'Escape' && KD.getElementById('k-ov')){ e.stopPropagation(); e.preventDefault(); ckClosePreview(); }
}, true);

// ---------- 醫師評語草稿 ----------
function ckDraftComment(d){
  const L = [];
  const top = d.findings.filter(x=> x.g === 2), mid = d.findings.filter(x=> x.g === 1);
  const plain = h=> h.replace(/<[^>]+>/g, '');
  L.push('【整體評估】');
  if(!d.findings.length){
    L.push('這次健檢的檢驗與檢查結果都在正常範圍內，請維持目前的飲食與運動習慣，明年同一時間再安排健檢。');
  } else {
    const head = (top.length ? top : mid).slice(0, 3).map(x=> plain(x.html).split('，')[0]);
    L.push(`這次健檢有 ${d.findings.length} 個項目需要注意，${top.length ? '最需要優先處理的是' : '主要是'}${head.join('、')}。`);
    if(top.length && mid.length) L.push(`另外${mid.slice(0, 3).map(x=> plain(x.html).split('，')[0]).join('、')}也建議一起追蹤。`);
  }
  const pv = d.cv.prevent, tw = d.cv.tw, pc = v=> (Math.round(v * 1000) / 10).toFixed(1) + '%';
  if(pv.cvd10 != null || tw.risk != null){
    L.push('【心血管風險】');
    L.push([pv.cvd10 != null && `PREVENT 估計 10 年總心血管疾病風險 ${pc(pv.cvd10)}`, tw.risk != null && `TwCCCC 估計 10 年冠心病風險 ${pc(tw.risk)}`].filter(Boolean).join('，') + '。');
  }
  if(d.advice.length){
    L.push('【我的建議】');
    d.advice.filter(a=> a.key !== 'yearly').slice(0, 5).forEach(a=> L.push('• ' + a.t));
  }
  // 中文與英文、數字之間留一個半形空格
  return L.join('\n').replace(/([一-鿿])([A-Za-z0-9β])/g, '$1 $2').replace(/([A-Za-z0-9%])([一-鿿])/g, '$1 $2');
}

// ---------- LINE 一頁摘要圖 ----------
/* 直接畫在 canvas（1080 寬），不靠截圖套件。只放需要注意的項目、接下來要做的事與心血管風險；
   姓名中間遮成○，不放病歷號與出生日期，傳 LINE 時不暴露完整個資。 */
function ckMaskName(n){
  const s = [...String(n || '')];
  if(s.length <= 1) return s.join('');
  if(s.length === 2) return s[0] + '○';
  return s[0] + '○'.repeat(s.length - 2) + s[s.length - 1];
}
function ckLineDraw(cv, d){
  const W = 1080, P = 64, F = '"Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';
  const ctx = cv.getContext('2d');
  const C = {teal:'#3E6A7C', gold:'#BC7F30', navy:'#152831', ink:'#1F262A', mute:'#6F6A62', line:'#E4DED3', bg:'#FBF9F5'};
  const plain = h=> String(h).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // 斷行：中文逐字、英數字整段不拆
  const wrap = (t, size, weight, maxW)=>{
    ctx.font = `${weight} ${size}px ${F}`;
    const toks = String(t).match(/[A-Za-z0-9.%/()\-+≥≤<>]+|\s+|./gu) || [];
    const lines = []; let cur = '';
    toks.forEach(tk=>{
      if(ctx.measureText(cur + tk).width > maxW && cur.trim()){ lines.push(cur.trimEnd()); cur = tk.trimStart(); }
      else cur += tk;
    });
    if(cur.trim()) lines.push(cur.trimEnd());
    return lines;
  };
  const draw = dry=>{
    let y = 0;
    const text = (t, x, size, weight, color, maxW, lh)=>{
      const ls = wrap(t, size, weight, maxW);
      if(!dry){ ctx.font = `${weight} ${size}px ${F}`; ctx.fillStyle = color; ctx.textBaseline = 'top'; ls.forEach((l, i)=> ctx.fillText(l, x, y + i * lh)); }
      return ls.length * lh;
    };
    const pill = (label, color, x, yy)=>{
      ctx.font = `700 26px ${F}`;
      const w = ctx.measureText(label).width + 28;
      if(!dry){ ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, yy, w, 42, 21); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(label, x + 14, yy + 22); }
      return w;
    };
    const head = t=>{
      y += 40;
      if(!dry){ ctx.fillStyle = C.gold; ctx.fillRect(P, y + 6, 8, 36); }
      y += text(t, P + 24, 36, 700, C.navy, W - 2 * P, 50) + 14;
    };
    // 頁首
    if(!dry){ ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, cv.height); ctx.fillStyle = C.teal; ctx.fillRect(0, 0, W, 210); }
    y = 56;
    text('木子澄安診所', P, 30, 500, '#D7E3E8', 600, 40); y += 44;
    text('健康檢查摘要', P, 58, 700, '#fff', 700, 70);
    y = 250;
    const nm = ckMaskName(CK.info.name);
    y += text(`${nm ? nm + '　您好，' : ''}這是您 ${ckDateZh(CK.info.date || ckToday())}健檢的重點整理。`, P, 32, 500, C.ink, W - 2 * P, 48);
    // 需要注意的項目
    head('需要注意的項目');
    const f = d.findings.slice(0, 8);
    if(!f.length) y += text('這次的檢驗與檢查結果都在正常範圍內。', P, 30, 400, C.ink, W - 2 * P, 46);
    f.forEach(x=>{
      const pw = pill(x.g === 2 ? '異常' : '注意', x.g === 2 ? CK_G_COLOR[2] : CK_G_COLOR[1], P, y + 2);
      const h = text(plain(x.html), P + pw + 18, 30, 400, C.ink, W - 2 * P - pw - 18, 46);
      y += Math.max(h, 46) + 14;
    });
    if(d.findings.length > 8) y += text(`另有 ${d.findings.length - 8} 項，詳見完整報告。`, P, 26, 400, C.mute, W - 2 * P, 40);
    // 接下來要做的事
    const groups = ['now', 'm3', 'm6', 'y1', 'long'].map(w=> ({w, list: d.advice.filter(a=> a.when === w && a.key !== 'yearly')})).filter(g=> g.list.length);
    if(groups.length){
      head('接下來要做的事');
      groups.forEach(g=>{
        y += text(CK_WHEN[g.w], P, 28, 700, C.teal, W - 2 * P, 42) + 4;
        g.list.slice(0, 4).forEach(a=>{
          if(!dry){ ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(P + 8, y + 22, 5, 0, Math.PI * 2); ctx.fill(); }
          y += text(a.t, P + 28, 28, 400, C.ink, W - 2 * P - 28, 44) + 8;
        });
        y += 10;
      });
    }
    // 心血管風險
    const pv = d.cv.prevent, tw = d.cv.tw, pc = v=> (Math.round(v * 1000) / 10).toFixed(1) + '%';
    if(pv.cvd10 != null || tw.risk != null){
      head('心血管風險（10 年）');
      if(pv.cvd10 != null) y += text(`PREVENT 總心血管疾病 ${pc(pv.cvd10)}`, P, 30, 400, C.ink, W - 2 * P, 46);
      if(tw.risk != null) y += text(`TwCCCC 冠心病 ${pc(tw.risk)}`, P, 30, 400, C.ink, W - 2 * P, 46);
      y += text('兩個模型預測的疾病不同，數字不能直接相比。', P, 24, 400, C.mute, W - 2 * P, 38);
    }
    // 頁尾
    y += 44;
    if(!dry){ ctx.fillStyle = C.line; ctx.fillRect(P, y, W - 2 * P, 2); }
    y += 28;
    y += text('完整報告請看紙本，有任何不清楚的地方，歡迎回診一起討論。', P, 26, 400, C.mute, W - 2 * P, 40);
    y += text('木子澄安診所　高雄市仁武區仁孝路282號　07-3739496　LINE @muzichengan', P, 24, 400, C.mute, W - 2 * P, 38);
    return y + 56;
  };
  cv.width = W; cv.height = 10;
  const H = Math.ceil(draw(true));
  cv.width = W; cv.height = H;
  draw(false);
}
function ckLineFilename(){ return (CK.info.name ? CK.info.name + '_' : '') + '健檢摘要_' + String(CK.info.date || ckToday()).replace(/-/g, '') + '.png'; }
async function ckLinePreview(){
  if(ckNeedSex()) return;
  ckClosePreview();
  const d = ckCollect();
  const cv = document.createElement('canvas');
  try{ await document.fonts.load(`700 40px "Noto Sans TC"`); }catch(e){}
  ckLineDraw(cv, d);
  const url = cv.toDataURL('image/png');
  const ov = document.createElement('div');
  ov.className = 'k-ov'; ov.id = 'k-ov';
  ov.innerHTML = `<div class="k-ov-bar"><b>LINE 摘要圖</b><span>1080 × ${cv.height}　姓名已遮蔽，不含病歷號</span><span style="flex:1"></span>` +
    `<button class="k-btn" id="k-ln-copy">複製圖片</button><button class="k-btn ghost" id="k-ln-dl">下載 PNG</button><button class="k-btn ghost" id="k-ov-close">關閉</button></div>` +
    `<div style="flex:1; overflow:auto; padding:20px; text-align:center"><img src="${url}" alt="LINE 摘要圖" style="width:min(540px, 100%); box-shadow:0 2px 12px rgba(0,0,0,.12)"></div>`;
  KD.appendChild(ov);
  ov.querySelector('#k-ov-close').onclick = ckClosePreview;
  ov.querySelector('#k-ln-dl').onclick = ()=>{ const a = document.createElement('a'); a.href = url; a.download = ckLineFilename(); a.click(); };
  const cp = ov.querySelector('#k-ln-copy');
  cp.onclick = ()=> cv.toBlob(async b=>{
    try{ await navigator.clipboard.write([new ClipboardItem({'image/png': b})]); cp.textContent = '已複製，可直接貼到 LINE'; }
    catch(e){ cp.textContent = '這個瀏覽器不能複製圖片，請改用下載'; }
  }, 'image/png');
}
