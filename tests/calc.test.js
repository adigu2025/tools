/* 臨床計算的測試。用法（在 tools 資料夾）：node tests/calc.test.js
   全部通過時最後一行是「全部通過」，結束碼 0。
   預期值都來自公式或公開範例，不是抄程式目前的輸出：
   FIB-4＝年齡×AST÷(血小板×√ALT)；BMI 依國健署分級；Child-Pugh 依標準切點；
   eGFR 為 CKD-EPI 2021；PREVENT 用 lab/lab.js 註解裡的 preventr 範例病人。 */
const {loadCalc, loadGlobals, pickFunction, suite, makeDoc} = require('./load.js');
const t = suite('臨床計算');
const {doc, T, run} = loadCalc();

// FIB-4
run({'fib-age': 50, 'fib-ast': 40, 'fib-alt': 40, 'fib-plt': 200}, 'fib-plt');
t.eq('FIB-4 數值', doc.text('fib-score'), '1.58'); t.eq('FIB-4 分級', doc.text('fib-status'), '不確定區間');
run({'fib-age': 40, 'fib-ast': 20, 'fib-alt': 25, 'fib-plt': 250}, 'fib-plt');
t.eq('FIB-4 低風險', doc.text('fib-status'), '低度纖維化風險');
run({'fib-age': 60, 'fib-ast': 90, 'fib-alt': 36, 'fib-plt': 100}, 'fib-plt');
t.eq('FIB-4 高風險數值', doc.text('fib-score'), '9.00'); t.eq('FIB-4 高風險', doc.text('fib-status'), '高度纖維化風險');
run({'fib-age': 70, 'fib-ast': 30, 'fib-alt': 25, 'fib-plt': 250}, 'fib-plt');   // 1.68：65 歲以上下限 2.0
t.eq('FIB-4 65 歲以上用 2.0', doc.text('fib-status'), '低度纖維化風險');

// BMI（國健署：18.5、24、27、30、35）
[[170, 52, '體重過輕'], [170, 60, '體重正常'], [170, 70, '體重過重'], [170, 80, '輕度肥胖'], [170, 90, '中度肥胖'], [170, 105, '重度肥胖']]
  .forEach(([h, w, label])=> { run({height: h, weight: w}, 'weight'); t.eq(`BMI ${h}/${w}`, doc.text('bmi-badge'), label); });
run({height: 170, weight: 70}, 'weight'); t.eq('BMI 數值', doc.text('bmi-val'), '24.2');

// R Factor
run({'rf-alt': 200, 'rf-alt-uln': 40, 'rf-alp': 100, 'rf-alp-uln': 100}, 'rf-alp'); t.has('R=5 肝細胞型', doc.text('rf-badge'), '肝細胞型');
run({'rf-alt': 80, 'rf-alt-uln': 40, 'rf-alp': 300, 'rf-alp-uln': 100}, 'rf-alp'); t.has('R<2 膽汁鬱積型', doc.text('rf-badge'), '膽汁鬱積型');

// Child-Pugh 總分與分級（5 至 6 分 A、7 至 9 分 B、10 分以上 C）
const cp = (a, e, b, al, p)=> { doc.set({'cp-ascites': a, 'cp-enceph': e, 'cp-bili': b, 'cp-alb': al, 'cp-pt': p}); doc.fire('cp-pt', 'change'); return doc.text('cp-grade'); };
t.has('CP 5 分', cp(1, 1, 1, 1, 1), 'A 級'); t.has('CP 6 分', cp(1, 1, 2, 1, 1), 'A 級'); t.has('CP 7 分', cp(1, 1, 2, 2, 1), 'B 級');
t.has('CP 9 分', cp(2, 2, 2, 2, 1), 'B 級'); t.has('CP 10 分', cp(2, 2, 2, 2, 2), 'C 級');

// 檢驗單文字的 INR：PT 秒數不可被當成 INR（2026-11 YT 回報過正常的人被判成 INR > 2.3）
[['INR 1.02 0.85-1.15', 1.02], ['PT 11.5 sec INR 1.02', 1.02], ['PT/INR 11.5 / 1.02', 1.02], ['PT/INR 11.5/1.02', 1.02],
 ['PT (INR) 11.5 sec 1.02', 1.02], ['PT(INR) 1.02', 1.02], ['PT/INR 25.3 / 2.41', 2.41], ['PT/INR 11.5 sec 9.4-12.5 1.02 0.85-1.15', 1.02],
 ['INR(PT) 1.03 11.2', 1.03], ['PT 11.5 9.4-12.5 sec\nPT INR 1.02 0.85-1.15', 1.02]]
  .forEach(([text, want])=> t.eq('INR：' + text.replace('\n', '／'), T.ocrRead('childpugh', text).inr, want));
t.eq('PT/INR 只有秒數時不帶入', T.ocrRead('childpugh', 'PT/INR 11.5').inr, undefined);
// MELD-Na（UNOS 2016）：預期值手算，MELD＝round(10 ×(0.957 ln Cr ＋ 0.378 ln Bil ＋ 1.120 ln INR ＋ 0.643))
const md = (cr, b, i, na, dia)=> T.meldScore(cr, b, i, na, dia);
t.eq('MELD 全部正常 → 6', md(1, 1, 1, 140).meldNa, 6);
t.eq('MELD 數值小於 1 以 1 計', md(0.5, 0.4, 0.9, 140).meldNa, 6);
t.eq('MELD Cr 2、Bil 3、INR 1.5 → 22', md(2, 3, 1.5, 137).meld, 22);
t.eq('MELD-Na 同上、Na 130 → 26', md(2, 3, 1.5, 130).meldNa, 26);
t.eq('MELD-Na 鈉低於 125 以 125 計 → 29', md(2, 3, 1.5, 120).meldNa, 29);
t.eq('MELD 11 以下不做鈉校正', md(1, 1, 1, 125).meldNa, 6);
t.eq('MELD 透析時肌酸酐以 4 計 → 20', md(1, 1, 1, 137, true).meldNa, 20);
t.eq('MELD 上限 40', md(4, 30, 4, 137).meldNa, 40);
// Glasgow-Blatchford：BUN mg/dL 切點 18.2、22.4、28、70
const gb = o=> T.gbsScore(Object.assign({male: true, bun: 15, hb: 14, sbp: 120, hr: 80}, o)).total;
t.eq('GBS 全部正常 0 分', gb({}), 0);
[[18.1, 0], [18.2, 2], [22.4, 3], [28, 4], [70, 6]].forEach(([b, p])=> t.eq('GBS BUN ' + b, gb({bun: b}), p));
t.eq('GBS 男 Hb 12.5 → 1', gb({hb: 12.5}), 1); t.eq('GBS 男 Hb 11 → 3', gb({hb: 11}), 3); t.eq('GBS 女 Hb 11 → 1', gb({male: false, hb: 11}), 1);
t.eq('GBS 女 Hb 12.5 → 0', gb({male: false, hb: 12.5}), 0); t.eq('GBS Hb 9 → 6', gb({hb: 9}), 6);
t.eq('GBS 收縮壓 105 / 95 / 85', [105, 95, 85].map(s=> gb({sbp: s})).join(','), '1,2,3');
t.eq('GBS 心跳 100 → 1', gb({hr: 100}), 1);
t.eq('GBS 男 BUN 30、Hb 11、SBP 95、HR 110、黑便 → 11', gb({bun: 30, hb: 11, sbp: 95, hr: 110, melena: true}), 11);
t.eq('GBS 最高 23 分', gb({bun: 80, hb: 8, sbp: 80, hr: 120, melena: true, syncope: true, liver: true, cardiac: true}), 23);
// 畫面：填完欄位要出結果，複製文字帶分數
run({'gbs-sex': 'M', 'gbs-bun': 30, 'gbs-hb': 11, 'gbs-sbp': 95, 'gbs-hr': 110}, 'gbs-hr');
t.has('GBS 畫面結果', T.copy('gbs'), 'Glasgow-Blatchford 10 分');
run({'meld-cr': 2, 'meld-bili': 3, 'meld-inr': 1.5, 'meld-na': 130}, 'meld-na');
t.has('MELD-Na 畫面結果', T.copy('meld'), 'MELD-Na 26');

// 數值換算成分數：膽紅素 <2、2 至 3、>3；白蛋白 >3.5、2.8 至 3.5、<2.8；INR <1.7、1.7 至 2.3、>2.3
const pts = v=> { ['cp-bili', 'cp-alb', 'cp-pt'].forEach(id=> { const e = doc.getElementById(id); e.value = ''; delete e.dataset.manual; }); T.ocrApply('childpugh', v); return ['cp-bili', 'cp-alb', 'cp-pt'].map(id=> doc.getElementById(id).value).join(''); };
t.eq('分數：正常', pts({bil: 1.2, alb: 4.1, inr: 1.02}), '111');
t.eq('分數：中間', pts({bil: 2.5, alb: 3.0, inr: 2.0}), '222');
t.eq('分數：邊界', pts({bil: 3, alb: 2.8, inr: 2.3}), '222');
t.eq('分數：嚴重', pts({bil: 3.1, alb: 2.7, inr: 2.4}), '333');

// 降血脂給付（健保 2.6.1 表一）
const lxIds = ['lx-acs', 'lx-dm', 'lx-htn', 'lx-life3'];
const lx = v=> { const base = {'lx-sex': 'F', 'lx-age': 40, 'lx-hdl': 60, 'lx-tc': '', 'lx-tg': ''}; lxIds.forEach(id=> base[id] = false); run(Object.assign(base, v), 'lx-ldl'); return T.copy('lipidrx'); };
t.has('ACS、LDL 75', lx({'lx-acs': true, 'lx-ldl': 75}), '非常高風險'); t.has('ACS、LDL 75 表一', lx({'lx-acs': true, 'lx-ldl': 75}), '表一 符合');
t.has('ACS、LDL 65 未達 70', lx({'lx-acs': true, 'lx-ldl': 65}), '表一 未符合');
t.has('ACS 合併糖尿病', lx({'lx-acs': true, 'lx-dm': true, 'lx-ldl': 60}), '極高風險');
t.has('糖尿病、LDL 105', lx({'lx-dm': true, 'lx-ldl': 105}), '表一 符合'); t.has('糖尿病、LDL 95', lx({'lx-dm': true, 'lx-ldl': 95}), '表一 未符合');
t.has('無風險因子、LDL 165 先調整生活', lx({'lx-ldl': 165}), '表一 需先生活型態調整');
t.has('無風險因子、已調整生活', lx({'lx-ldl': 165, 'lx-life3': true}), '表一 符合');
// 115/12/1 修訂：Livalo 2 mg、Livalo OD 2 mg 移出「只適用表二」清單（改適用表一）；Zovastin、Livazebe HD 不必再滿 3 個月；PCSK9 新增 inclisiran
const lxMore = v=> { lx(v); return T.copyMore('lipidrx'); };
const lxTab1 = lxMore({'lx-htn': true, 'lx-life3': true, 'lx-ldl': 135}).split('\n').find(l=> l.startsWith('・可開立 statin'));
t.has('Livalo 改列表一', lxTab1.split('表二：')[0], 'Livalo 2 mg、OD 2 mg');
t.eq('只符合表一時不列表二品項', lxTab1.includes('表二：'), false);
// 測試環境的 plain() 取不到文字，卡片內容改看結果區的 HTML
const lxHtml = v=> { lx(v); return doc.getElementById('lipidrx-result').innerHTML; };
const lx6w = lxHtml({'lx-dm': true, 'lx-ldl': 105, 'lx-statin': '6w'});
t.has('statin 6 至 8 週：仍列 Zoliton 需滿 3 個月', lx6w, 'Zoliton');
t.eq('statin 6 至 8 週：Zovastin、Livazebe 不再列需滿 3 個月', /Zovastin|Livazebe/.test(lx6w), false);
t.has('PCSK9 符合時列出 inclisiran', lxHtml({'lx-dm': true, 'lx-ldl': 120, 'lx-event1y': true, 'lx-pcskPre': true}), 'inclisiran');

// lab/lab.js：FIB-4 與 PREVENT
const L = loadGlobals(['lab/lab.js'], ['ckFib4', 'ckPrevent']);
const rows = (a, b, c)=> [{key: 'ast', raw: a}, {key: 'alt', raw: b}, {key: 'plt', raw: c}];
t.near('lab FIB-4', L.ckFib4(rows('40', '40', '200'), {age: 50}).v, 1.581, 0.001);
t.eq('lab FIB-4 與 calc 分級一致', L.ckFib4(rows('40', '40', '200'), {age: 50}).g, 1);
t.eq('lab FIB-4 血小板填 0 當缺值', !!L.ckFib4(rows('40', '40', '0'), {age: 50}).miss, true);
const pv = L.ckPrevent({sexOk: true, male: false, age: 50, tc: 200, hdl: 45, sbp: 160, bptx: true, dm: true, smoke: false, smokeSet: true, egfr: 90, bmi: 35});
t.near('PREVENT 10 年總心血管 14.7%', pv.cvd10 * 100, 14.7, 0.05); t.near('PREVENT 10 年 ASCVD 9.2%', pv.ascvd10 * 100, 9.2, 0.05);
t.near('PREVENT 30 年 53.0%', pv.cvd30 * 100, 53.0, 0.05); t.near('PREVENT 10 年心衰竭 8.1%', pv.hf10 * 100, 8.1, 0.05);

// weight/app.js：eGFR（CKD-EPI 2021）
const eg = (cr, age, sex)=> { const wd = makeDoc(); wd.set({'lab-cr': cr, 'p-age': age, 'p-gender': sex}); return pickFunction('weight/app.js', 'egfrEstimate', {WD: wd})(); };
t.near('eGFR 男 50 歲 Cr 1.0', eg(1.0, 50, 'M'), 91.7, 0.2); t.near('eGFR 女 60 歲 Cr 0.7', eg(0.7, 60, 'F'), 99.0, 0.3);

// 給付規定的最後查核日（calc/rules.js）：超過 RX_STALE_DAYS 天沒查，就請 aria 查健保署新公告後更新 checked
const RX = loadGlobals(['calc/rules.js'], ['RX_RULES', 'RX_STALE_DAYS', 'rxCheckedAgo']);
t.eq('查核天數：同一天', RX.rxCheckedAgo({checked: '2026-11-04'}, '2026-11-04'), 0);
t.eq('查核天數：40 天', RX.rxCheckedAgo({checked: '2026-11-04'}, '2026-12-14'), 40);
t.eq('查核天數：日期寫錯算過期', RX.rxCheckedAgo({checked: '2026/11/04'}, '2026-11-04') === Infinity, true);
const rxToday = process.env.RX_TODAY;   // 只在測試這個檢查本身時用：RX_TODAY=2027-01-01 node tests/calc.test.js 應該失敗
Object.entries(RX.RX_RULES).forEach(([k, r])=> {
  t.eq(k + ' 查核日格式 YYYY-MM-DD', /^\d{4}-\d{2}-\d{2}$/.test(r.checked), true);
  const ago = RX.rxCheckedAgo(r, rxToday);
  t.eq(k + ' 最後查核 ' + r.checked + '（' + ago + ' 天前）要在 ' + RX.RX_STALE_DAYS + ' 天內：超過就請 aria 查健保署新公告，確認後改 calc/rules.js 的 checked', ago <= RX.RX_STALE_DAYS, true);
});

if(t.done()) process.exit(1);
console.log('全部通過');
