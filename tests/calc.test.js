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

if(t.done()) process.exit(1);
console.log('全部通過');
