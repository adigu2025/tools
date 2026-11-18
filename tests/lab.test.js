/* 共用檢驗判讀（lab/lab.js）的測試。用法（在 tools 資料夾）：node tests/lab.test.js
   健檢報告與減重報告都用這一份，改判讀規則時兩邊同時生效，所以單獨測。
   全部通過時最後一行是「全部通過」，結束碼 0。
   預期值依判讀標準寫（國健署、ADA 糖尿病前期、血脂 200/240、ALT 正常上限 3 倍、eGFR 60/45），
   不是抄程式目前的輸出。FIB-4 與 PREVENT 在 calc.test.js。 */
const {loadGlobals, suite} = require('./load.js');
const t = suite('檢驗判讀');
const L = loadGlobals(['lab/lab.js'], ['ckNum', 'ckRoc', 'ckKeyOf', 'ckRefRange', 'ckFlag', 'ckNeg', 'ckJudge', 'ckParseRepLines', 'ckTwcccc']);

// 數值與日期
t.eq('數值：一般', L.ckNum('5.6'), 5.6);
t.eq('數值：千分位', L.ckNum('4,500'), 4500);
t.eq('數值：小於符號', L.ckNum('<0.5'), 0.5);
t.eq('數值：後面接箭頭', L.ckNum('180 ↑'), 180);
t.eq('數值：文字', L.ckNum('Negative'), null);
t.eq('民國日期', L.ckRoc('115/10/27'), '2026-10-27');
t.eq('民國日期：補零', L.ckRoc('083/9/8'), '1994-09-08');
t.eq('民國日期：看不懂', L.ckRoc('2026-10-27'), '');

// 檢驗所代碼 → 項目
[['S-GOT', 'ast'], ['GPT', 'alt'], ['ALT', 'alt'], ['Cholesterol', 'tc'], ['T-CHO', 'tc'], ['HDL-C', 'hdl'], ['LDL-C', 'ldl'],
 ['Glucose AC', 'glu'], ['HbA1c', 'a1c'], ['BUN', 'bun'], ['Triglyceride', 'tg']]
  .forEach(([code, key])=> t.eq('代碼 ' + code, L.ckKeyOf(code), key));
t.eq('不認得的代碼', L.ckKeyOf('XYZ123'), '');

// 參考區間與 ↑↓
t.eq('區間 70-99', JSON.stringify(L.ckRefRange('70-99')), '{"lo":70,"hi":99}');
t.eq('區間 ≦50', JSON.stringify(L.ckRefRange('≦50')), '{"hi":50,"strict":false}');
t.eq('區間 <130 (見報告說明)', JSON.stringify(L.ckRefRange('<130 (見報告說明)')), '{"hi":130,"strict":true}');
t.eq('區間 >40', JSON.stringify(L.ckRefRange('>40')), '{"lo":40,"strict":true}');
t.eq('區間看不懂', L.ckRefRange('見報告說明'), null);
t.eq('≦50 時 50 不算高', L.ckFlag({raw: '50', ref: '≦50'}), '');
t.eq('≦50 時 51 算高', L.ckFlag({raw: '51', ref: '≦50'}), 'H');
t.eq('<130 時 130 算高', L.ckFlag({raw: '130', ref: '<130'}), 'H');
t.eq('70-99 時 65 算低', L.ckFlag({raw: '65', ref: '70-99'}), 'L');
t.eq('區間看不懂時沿用檢驗所標記', L.ckFlag({raw: '3', ref: '', labFlag: 'H'}), 'H');
t.eq('陰性：Negative', L.ckNeg('Negative'), true);
t.eq('陰性：(-)', L.ckNeg('(-)'), true);
t.eq('陽性：(+)', L.ckNeg('(+)'), false);

// 判讀：g 0 正常、1 注意、2 異常
const g = (key, raw, ref, P)=> L.ckJudge({key, raw: String(raw), ref: ref || ''}, P || {}).g;
t.eq('血糖 99', g('glu', 99), 0); t.eq('血糖 100', g('glu', 100), 1); t.eq('血糖 126', g('glu', 126), 2);
t.eq('A1c 5.6', g('a1c', 5.6), 0); t.eq('A1c 5.7', g('a1c', 5.7), 1); t.eq('A1c 6.5', g('a1c', 6.5), 2);
t.eq('總膽固醇 199', g('tc', 199), 0); t.eq('總膽固醇 200', g('tc', 200), 1); t.eq('總膽固醇 240', g('tc', 240), 2);
t.eq('TG 500 是異常', g('tg', 500), 2);
t.eq('LDL 190 寫出家族性高膽固醇血症', L.ckJudge({key: 'ldl', raw: '195'}, {}).d.includes('家族性'), true);
t.eq('HDL 45 男性正常', g('hdl', 45, '', {male: true}), 0); t.eq('HDL 45 女性偏低', g('hdl', 45, '', {male: false}), 1);
t.eq('ALT 依檢驗所上限 50：50 正常', g('alt', 50, '≦50'), 0);
t.eq('ALT 依檢驗所上限 50：150 注意', g('alt', 150, '≦50'), 1);
t.eq('ALT 依檢驗所上限 50：151 超過 3 倍', g('alt', 151, '≦50'), 2);
t.eq('ALT 沒有區間時上限用 40', g('alt', 41), 1);
t.eq('eGFR 60', g('egfr', 60), 0); t.eq('eGFR 50', g('egfr', 50), 1); t.eq('eGFR 44', g('egfr', 44), 2);
t.eq('血色素 12.5 男性輕度貧血', g('hgb', 12.5, '', {male: true}), 1); t.eq('血色素 12.5 女性正常', g('hgb', 12.5, '', {male: false}), 0);
t.eq('血色素 9.5 異常', g('hgb', 9.5), 2);
t.eq('血小板 90 異常', g('plt', 90, '140-440'), 2);
t.eq('B 肝表面抗原陰性', g('hbsag', 'Negative'), 0); t.eq('B 肝表面抗原陽性', g('hbsag', 'Positive'), 1);
t.eq('B 肝表面抗體 10 以上有保護力', g('antihbs', 12), 0); t.eq('B 肝表面抗體 <10 沒有保護力', g('antihbs', 5), 1);
t.eq('沒有數值', g('glu', ''), -1);
t.eq('β-HCG 育齡女性升高要先確認懷孕', L.ckJudge({key: 'bhcg', raw: '30', ref: '<5'}, {female: true, age: 30}).pill, '需確認');

// 報告逐列擷取：模擬優品 PDF 一頁（x 座標依頁寬 595）
const row = (y, ...cells)=> ({y, items: cells.map(([x, s])=> ({x, s}))});
const lines = [
  row(800, [40, '姓名：測試'], [200, '性別：女'], [300, '年齡：45歲']),
  row(780, [40, '收件日期：115/10/27'], [300, '報告日期：115/10/28']),
  row(760, [40, '檢驗項目'], [130, '中文名稱'], [260, '結果'], [360, '參考區間'], [470, '單位']),
  row(740, [40, '肝臟功能']),
  row(720, [40, 'S-GPT'], [130, '丙胺酸轉胺酶'], [260, '62 ↑'], [360, '≦35'], [470, 'U/L']),
  row(700, [40, 'Glucose AC'], [130, '飯前血糖'], [260, '95'], [360, '70-99'], [470, 'mg/dL']),
  row(680, [40, '[[ 報告說明 ]]'])
];
const rep = {rows: []};
L.ckParseRepLines(lines, rep, true, '');
t.eq('擷取：性別', rep.sex, 'F'); t.eq('擷取：年齡', rep.age, '45'); t.eq('擷取：收件日期', rep.date, '2026-10-27');
t.eq('擷取：列數（報告說明之後不算）', rep.rows.length, 2);
t.eq('擷取：ALT 數值去掉箭頭', rep.rows[0] && rep.rows[0].raw, '62');
t.eq('擷取：ALT 標記偏高', rep.rows[0] && rep.rows[0].labFlag, 'H');
t.eq('擷取：分組', rep.rows[0] && rep.rows[0].sec, '肝臟功能');
t.eq('擷取：血糖對到項目', rep.rows[1] && rep.rows[1].key, 'glu');

// TwCCCC：35 至 39 歲女性、各項最低分，總分 0
const tw = L.ckTwcccc({sexOk: true, male: false, age: 36, bmi: 21, sbp: 105, ldl: 80, hdl: 85, smoke: false, smokeSet: true});
t.eq('TwCCCC 最低分', tw.pts, 0);
const tw2 = L.ckTwcccc({sexOk: true, male: true, age: 60, bmi: 27, sbp: 155, ldl: 160, hdl: 35, smoke: true, smokeSet: true});
t.eq('TwCCCC 60 歲吸菸男性：5＋3＋2＋3＋2＋4＋2', tw2.pts, 21);
t.eq('TwCCCC 已有心血管疾病不適用', !!L.ckTwcccc({cvd: true}).na, true);
t.eq('TwCCCC 缺值列出缺什麼', (L.ckTwcccc({sexOk: true, male: true, age: 50}).miss || []).includes('收縮壓'), true);

const bad = t.done();
console.log(bad ? `${bad} 項失敗` : '全部通過');
process.exit(bad ? 1 : 0);
