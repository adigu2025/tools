/* 共用檢驗判讀：健檢報告與減重報告都用這一份（項目定義、優品 PDF 擷取、參考區間與判讀規則）。
   工作台在減重報告之前載入，健檢 checkup/app.js 與減重 weight/app.js 直接呼叫這裡的 ck 開頭函式。
   改判讀規則時兩邊報告同時生效，不要在任一邊另外複製一套。 */
function ckNum(s){
  const m = String(s == null ? '' : s).replace(/,/g, '').match(/^\s*[<>≦≧≤≥]?\s*(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
// 民國日期（115/10/27、083/09/28）轉成 2026-10-27
function ckRoc(s){
  const m = /(\d{2,3})\/(\d{1,2})\/(\d{1,2})/.exec(s || '');
  return m ? `${+m[1] + 1911}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}

/* ---------- 檢驗項目 ----------
   re 比對檢驗所的英文代碼（去掉空白、轉大寫後）。zh 是報告上的中文名；sec 是手動輸入時的分組。
   沒有列在這裡的項目照樣會顯示，判讀改用檢驗所的參考區間。 */
const CK_LAB = [
  ['ast',    /^S?-?GOT|^AST/,            'AST（GOT）',      '肝臟功能', 'U/L'],
  ['alt',    /^S?-?GPT|^ALT/,            'ALT（GPT）',      '肝臟功能', 'U/L'],
  ['tc',     /^CHOLESTEROL$|^T-?CHO/,    '總膽固醇',         '血脂肪',   'mg/dL'],
  ['tg',     /^TRIGLYCERIDE|^TG$/,       '三酸甘油脂',       '血脂肪',   'mg/dL'],
  ['hdl',    /^HDL/,                     '高密度膽固醇',     '血脂肪',   'mg/dL'],
  ['ldl',    /^LDL/,                     '低密度膽固醇',     '血脂肪',   'mg/dL'],
  ['ratio',  /^CHO\/HDL|^TC\/HDL/,       '總膽固醇／HDL',    '血脂肪',   ''],
  ['nonhdl', /^NON-?HDL/,                '非高密度膽固醇',   '血脂肪',   'mg/dL'],
  ['glu',    /^GLUCOSE|^AC$/,            '飯前血糖',         '血糖代謝', 'mg/dL'],
  ['a1c',    /^HBA1C/,                   '糖化血色素',       '血糖代謝', '%'],
  ['ins',    /^INSULIN/,                 '胰島素',           '血糖代謝', 'uU/mL'],
  ['homa',   /^HOMA/,                    '胰島素阻抗指數',   '血糖代謝', ''],
  ['bun',    /^BUN/,                     '尿素氮',           '腎臟功能', 'mg/dL'],
  ['cr',     /^CREATININE|^CRE?$/,       '肌酸酐',           '腎臟功能', 'mg/dL'],
  ['mdrd',   /^MDRD/,                    '腎絲球過濾率（MDRD）', '腎臟功能', 'mL/min/1.73m²'],
  ['egfr',   /^CKD-?EPI|^EGFR/,          '腎絲球過濾率',     '腎臟功能', 'mL/min/1.73m²'],
  ['ua',     /^URICACID|^UA$/,           '尿酸',             '腎臟功能', 'mg/dL'],
  ['wbc',    /^WBC/,                     '白血球',           '血液常規', '/uL'],
  ['rbc',    /^RBC/,                     '紅血球',           '血液常規', '10⁶/uL'],
  ['hgb',    /^HGB|^HB$/,                '血色素',           '血液常規', 'g/dL'],
  ['hct',    /^HCT/,                     '血球容積比',       '血液常規', '%'],
  ['mcv',    /^MCV/,                     '平均紅血球容積',   '血液常規', 'fL'],
  ['mch',    /^MCH$/,                    '平均紅血球血紅素量', '血液常規', 'pg'],
  ['mchc',   /^MCHC/,                    '平均紅血球血紅素濃度', '血液常規', 'g/dL'],
  ['plt',    /^PLATELET|^PLT/,           '血小板',           '血液常規', '10³/uL'],
  ['tsh',    /^TSH/,                     '甲狀腺刺激素',     '甲狀腺',   'uIU/mL'],
  ['ft4',    /^FREET4|^FT4/,             '游離甲狀腺素',     '甲狀腺',   'ng/dL'],
  ['uapp',   /^APPEARANCE/,              '尿液外觀',         '尿液',     ''],
  ['uph',    /^PH$/,                     '尿液酸鹼度',       '尿液',     ''],
  ['uglu',   /^U-?GLUCOSE/,              '尿糖',             '尿液',     ''],
  ['upro',   /^U-?PROTEIN/,              '尿蛋白',           '尿液',     ''],
  ['ubil',   /^BILIRUBIN$|^U-?BIL/,      '尿膽紅素',         '尿液',     ''],
  ['uro',    /^UROBILINOGEN/,            '尿膽素原',         '尿液',     ''],
  ['uket',   /^KETONE/,                  '尿酮體',           '尿液',     ''],
  ['usg',    /^SPECIFICGRAVITY|^SG$/,    '尿比重',           '尿液',     ''],
  ['uob',    /^OCCULTBLOOD|^U-?OB/,      '尿潛血',           '尿液',     ''],
  ['ule',    /^U-?LEUKOCYTE/,            '尿液白血球酯酶',   '尿液',     ''],
  ['unit',   /^NITRITE/,                 '亞硝酸鹽',         '尿液',     ''],
  ['urbc',   /^URINERBC/,                '尿沉渣紅血球',     '尿液',     '/HPF'],
  ['uwbc',   /^URINEWBC/,                '尿沉渣白血球',     '尿液',     '/HPF'],
  ['uepi',   /^EPITHELIUM/,              '上皮細胞',         '尿液',     '/HPF'],
  ['ubact',  /^BACTERIA/,                '細菌',             '尿液',     '/HPF'],
  ['ucrys',  /^CRYSTAL/,                 '結晶體',           '尿液',     '/HPF'],
  ['ucast',  /^CAST/,                    '圓柱體',           '尿液',     '/LPF'],
  ['lpa',    /^LP\(?A\)?/,               '脂蛋白(a)',        '心血管風險', 'mg/dL'],
  ['apob',   /^APO-?B/,                  'ApoB',             '心血管風險', 'mg/dL'],
  ['hscrp',  /^HS-?CRP|^CRP/,            'hs-CRP',           '心血管風險', 'mg/L'],
  ['scc',    /^SCC/,                     'SCC',              '腫瘤標記', 'ng/mL'],
  ['cyfra',  /CYFRA/,                    'Cyfra 21-1',       '腫瘤標記', 'ng/mL'],
  ['ca724',  /^CA-?72-?4/,               'CA 72-4',          '腫瘤標記', 'U/mL'],
  ['progrp', /PRO-?GRP/,                 'ProGRP',           '腫瘤標記', 'pg/mL'],
  ['ebv',    /EB.*VCA|^EBV|^VCA/,        'EB 病毒抗體（VCA-IgA）', '腫瘤標記', ''],
  ['ca125',  /^CA-?125/,                 'CA 125',           '腫瘤標記', 'U/mL'],
  ['ca153',  /^CA-?15-?3/,               'CA 15-3',          '腫瘤標記', 'U/mL'],
  ['ca199',  /^CA-?19-?9/,               'CA 19-9',          '腫瘤標記', 'U/mL'],
  ['bhcg',   /HCG/,                      'β-HCG',            '腫瘤標記', 'mIU/mL'],
  ['afp',    /^AFP/,                     'AFP',              '腫瘤標記', 'ng/mL'],
  ['cea',    /^CEA/,                     'CEA',              '腫瘤標記', 'ng/mL'],
  ['fpsa',   /^FREE-?PSA|^F-?PSA/,       'free-PSA',         '腫瘤標記', 'ng/mL'],
  ['psa',    /PSA/,                      'PSA',              '腫瘤標記', 'ng/mL'],
  ['hbsag',  /HBSAG/,                    'B 肝表面抗原',     '肝炎篩檢', ''],
  ['antihbs',/ANTI-?HBS/,                'B 肝表面抗體',     '肝炎篩檢', ''],
  ['antihcv',/ANTI-?HCV/,                'C 肝抗體',         '肝炎篩檢', ''],
];
const CK_LAB_BY = Object.fromEntries(CK_LAB.map(x=> [x[0], x]));
// 手動輸入時列出的常用項目（基礎套組，減重報告的手動欄位也用這份參考區間）
const CK_MANUAL_KEYS = ['ast','alt','tc','tg','hdl','ldl','glu','a1c','bun','cr','egfr','ua','wbc','hgb','plt','tsh','ft4'];
// 手動輸入時的參考區間，照優品報告上的數值；[男, 女]
const CK_MANUAL_REF = {
  ast:['≦50','≦35'], alt:['≦50','≦35'], tc:'<200', tg:'<150', hdl:['>40','>50'], ldl:'<130', glu:'70-99', a1c:'<5.7',
  bun:'6-20', cr:['0.7-1.20','0.5-0.90'], egfr:'≧60', ua:['3.4-7.0','2.4-5.7'], wbc:'4000-11000', hgb:['13-17','12-16'],
  plt:'140-440', tsh:'0.270-4.20', ft4:'0.92-1.68'
};

function ckKeyOf(code){
  const c = String(code || '').toUpperCase().replace(/\s+/g, '');
  const hit = CK_LAB.find(([, re])=> re.test(c));
  return hit ? hit[0] : '';
}

/* ---------- 優品 PDF 擷取 ----------
   報告每一列的欄位位置固定：項目代碼、中文名稱、結果（後面可能接 ↑↓）、參考區間、單位。
   先把文字依 y 座標排成列，再依表頭各欄的 x 座標切開；不靠字串距離猜，所以不會抓錯欄。 */
async function ckParsePdf(file){
  await ensurePdfjs();
  if(typeof pdfjsLib === 'undefined') throw new Error('PDF 元件載入失敗，請連網後重新整理');
  const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
  const rep = {id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), file: file.name, rows: [], unverified: false};
  const pages = [];
  let raw = '';
  let sec = '';
  for(let i = 1; i <= pdf.numPages; i++){
    const page = await pdf.getPage(i);
    // 原始報告圖片（附在報告最後）。intent 'print' 不等 requestAnimationFrame，分頁在背景時也畫得出來；畫不出來不影響擷取
    try{
      const vp = page.getViewport({scale: 1.5});
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      await page.render({canvasContext: cv.getContext('2d'), viewport: vp, intent: 'print'}).promise;
      pages.push(cv.toDataURL('image/jpeg', .85));
    }catch(err){ console.warn('PDF 頁面圖片產生失敗', err); }

    const tc = await page.getTextContent();
    const items = tc.items.filter(t=> t.str && t.str.trim()).map(t=> ({s: t.str.trim(), x: t.transform[4], y: t.transform[5]}));
    const lines = [];
    items.sort((a, b)=> b.y - a.y).forEach(t=>{
      const ln = lines.find(l=> Math.abs(l.y - t.y) <= 3);
      if(ln) ln.items.push(t); else lines.push({y: t.y, items: [t]});
    });
    lines.forEach(l=> l.items.sort((a, b)=> a.x - b.x));
    const text = l=> l.items.map(t=> t.s).join(' ');
    const all = lines.map(text).join('\n');
    if(/未審核/.test(all)) rep.unverified = true;
    // 原始文字（減重報告的關鍵字擷取用，和以前逐頁串起來的格式相同）
    raw += tc.items.map(it=> it.str).join(' ') + '\n';

    if(i === 1){
      const flat = all.replace(/[ 　]+/g, '');
      const g = re=> { const m = re.exec(flat); return m ? m[1] : ''; };
      rep.name = g(/姓名：(\S+?)(?=檢驗報告單|性別|開單日期|收件日期|報告日期|$)/m);
      rep.chart = g(/病歷號碼：(\d+)/);
      rep.sid = g(/檢體編號：(\d+)/);
      const sx = g(/性別：(男|女)/);
      rep.sex = sx === '男' ? 'M' : sx === '女' ? 'F' : '';
      rep.birth = ckRoc(g(/出生日期：(\d{2,3}\/\d{1,2}\/\d{1,2})/));
      rep.age = g(/年齡：(\d+)歲/);
      rep.date = ckRoc(g(/收件日期：(\d{2,3}\/\d{1,2}\/\d{1,2})/)) || ckRoc(g(/開單日期：(\d{2,3}\/\d{1,2}\/\d{1,2})/));
      rep.reportDate = ckRoc(g(/報告日期：(\d{2,3}\/\d{1,2}\/\d{1,2})/));
    }

    const hi = lines.findIndex(l=> /檢驗項目/.test(text(l).replace(/\s+/g, '')));
    if(hi < 0) continue;
    const colX = re=> { const t = lines[hi].items.find(t=> re.test(t.s.replace(/\s+/g, ''))); return t ? t.x : null; };
    const xZh = colX(/中文/), xVal = colX(/結果/), xRef = colX(/參考/), xUnit = colX(/單位/);
    if(xZh == null || xVal == null || xRef == null) continue;
    const bZh = xZh - 25, bVal = xVal - 20, bRef = xRef - 22, bUnit = xUnit == null ? Infinity : xUnit - 20;

    for(let j = hi + 1; j < lines.length; j++){
      const l = lines[j], t = text(l);
      // 參考區間裡也會出現「（見報告說明）」，所以只認「[[ 報告說明 ]]」這個段落標題
      if(/\[\[\s*報告說明|列印日期|檢體種類/.test(t)) break;
      if(/^[-─=\s]+$/.test(t)) continue;
      if(l.items.length === 1 && l.items[0].x < bZh && /[一-鿿]/.test(t)){ sec = t.replace(/\s+/g, ''); continue; }
      const col = (a, b)=> l.items.filter(it=> it.x >= a && it.x < b).map(it=> it.s).join(' ').trim();
      const code = col(-Infinity, bZh);
      let zh = col(bZh, bVal), val = col(bVal, bRef);
      const ref = col(bRef, bUnit), unit = col(bUnit, Infinity);
      if(!code) continue;
      // 中文名稱太長時會和結果黏成同一段文字（例如「平均紅血球血紅素量 30.1」）
      if(!val){ const m = /^(.*\S)\s+([<>≦≧]?-?\d[\d.,]*|\([+-]+\))$/.exec(zh); if(m){ zh = m[1]; val = m[2]; } }
      const fm = /\s*([↑↓])\s*$/.exec(val);
      const flag = fm ? (fm[1] === '↑' ? 'H' : 'L') : '';
      if(fm) val = val.slice(0, fm.index).trim();
      rep.rows.push({key: ckKeyOf(code), code, zh, raw: val, ref, unit, sec, labFlag: flag});
    }
  }
  return {rep, pages, text: raw};
}

/* ---------- 參考區間與判讀 ---------- */
// 檢驗所的參考區間字串 → 上下限（≦50、<130 (見報告說明)、>40、70-99、4.0-5.5）
function ckRefRange(ref){
  const s = String(ref || '').replace(/\(.*?\)|（.*?）/g, '').trim();
  let m;
  if((m = /^(-?\d+(?:\.\d+)?)\s*[-~～]\s*(-?\d+(?:\.\d+)?)/.exec(s))) return {lo: +m[1], hi: +m[2]};
  if((m = /^[<≦≤]\s*(\d+(?:\.\d+)?)/.exec(s))) return {hi: +m[1], strict: /^</.test(s)};
  if((m = /^[>≧≥]\s*(\d+(?:\.\d+)?)/.exec(s))) return {lo: +m[1], strict: /^>/.test(s)};
  return null;
}
// 數值改過之後，↑↓ 要依參考區間重新算；參考區間看不懂時才沿用檢驗所標的
function ckFlag(r){
  const v = ckNum(r.raw), rg = ckRefRange(r.ref);
  if(v == null || !rg) return r.labFlag || '';
  if(rg.hi != null && (rg.strict ? v >= rg.hi : v > rg.hi)) return 'H';
  if(rg.lo != null && (rg.strict && rg.hi == null ? v <= rg.lo : v < rg.lo)) return 'L';
  return '';
}
function ckNeg(raw){ return /^\s*(\(?\s*-\s*\)?|neg(ative)?|normal|陰性|clear|nil)\s*$/i.test(String(raw || '')); }

/* 每一列的判讀：g 0 正常、1 注意、2 異常、-1 沒有數值；d 是一句說明；adv 是建議分類（見 CK_ADV）；
   pill 可改寫燈號文字（例如 β-HCG 的「需確認」）。 */
function ckJudge(r, P){
  const v = ckNum(r.raw), f = ckFlag(r), hiLo = f === 'H' ? '偏高' : '偏低';
  const R = (g, d, adv, pill)=> ({g, d: d || '', adv: adv || '', pill});
  const isQual = !/\d/.test(String(r.raw || ''));
  if(!String(r.raw || '').trim()) return R(-1);
  switch(r.key){
    case 'glu':
      if(v == null) break;
      return v < 100 ? R(0) : v < 126 ? R(1, '高於 100，屬糖尿病前期範圍', 'sugar1') : R(2, '達 126 以上，需要再驗一次確認是否為糖尿病', 'sugar2');
    case 'a1c':
      if(v == null) break;
      return v < 5.7 ? R(0) : v < 6.5 ? R(1, '介於 5.7 至 6.4，屬糖尿病前期範圍', 'sugar1') : R(2, '達 6.5 以上，達糖尿病診斷值', 'sugar2');
    case 'homa':
      if(v == null) break;
      return v <= 1.4 ? R(0) : R(1, v >= 2 ? '胰島素阻抗明顯' : '輕微胰島素阻抗', 'homa');
    case 'ins': return f ? R(1, hiLo, 'homa') : R(0);
    case 'tc':
      if(v == null) break;
      return v < 200 ? R(0) : v < 240 ? R(1, '高於 200', 'lipid') : R(2, '達 240 以上', 'lipid');
    case 'tg':
      if(v == null) break;
      return v < 150 ? R(0) : v < 500 ? R(1, '高於 150', 'lipid') : R(2, '達 500 以上，有急性胰臟炎風險', 'tg500');
    case 'hdl': {
      if(v == null) break;
      const cut = P.male ? 40 : 50;
      return v < cut ? R(1, `低於${P.male ? '男' : '女'}性建議值 ${cut}`, 'lipid') : R(0);
    }
    case 'ldl':
      if(v == null) break;
      return v < 130 ? R(0) : v < 160 ? R(1, '高於 130', 'lipid') : v < 190 ? R(2, '達 160 以上', 'lipid') : R(2, '達 190 以上，需要評估家族性高膽固醇血症', 'lipid');
    case 'nonhdl':
      if(v == null) break;
      return v < 160 ? R(0) : v < 190 ? R(1, '高於 160', 'lipid') : R(2, '達 190 以上', 'lipid');
    case 'ratio': return v != null && v >= 5 ? R(1, '高於 5', 'lipid') : R(0);
    case 'ast': case 'alt': {
      if(v == null) break;
      const rg = ckRefRange(r.ref), uln = rg && rg.hi != null ? rg.hi : 40;
      return v <= uln ? R(0) : v <= uln * 3 ? R(1, `高於正常上限 ${uln}`, 'liver') : R(2, `超過正常上限 3 倍（${uln * 3}）`, 'liver');
    }
    case 'egfr':
      if(v == null) break;
      return v >= 60 ? R(0) : v >= 45 ? R(1, '低於 60，腎功能輕中度下降', 'kidney') : R(2, '低於 45，腎功能中度以上下降', 'kidney');
    case 'mdrd': return R(0);
    case 'cr': case 'bun': return f === 'H' ? R(1, '偏高', 'kidney') : R(0);
    case 'ua': return f === 'H' ? (v >= 9 ? R(2, '達 9 以上', 'ua') : R(1, '偏高', 'ua')) : R(0);
    case 'hgb': {
      if(v == null) break;
      const lo = P.male ? 13 : 12;
      return v < 10 ? R(2, '低於 10，貧血需要找原因', 'cbc') : v < lo ? R(1, `低於 ${lo}，輕度貧血`, 'cbc') : f === 'H' ? R(1, '偏高', 'cbc') : R(0);
    }
    case 'plt':
      if(v == null) break;
      return v < 100 ? R(2, '低於 100', 'cbc') : f ? R(1, hiLo, 'cbc') : R(0);
    case 'wbc': case 'rbc': case 'hct': case 'mcv': case 'mch': case 'mchc':
      return f ? R(1, hiLo, 'cbc') : R(0);
    case 'tsh':
      if(v == null) break;
      return (v > 10 || v < 0.1) ? R(2, v > 10 ? '明顯偏高' : '明顯偏低', 'thyroid') : f ? R(1, hiLo, 'thyroid') : R(0);
    case 'ft4': return f ? R(1, hiLo, 'thyroid') : R(0);
    case 'uglu': case 'upro': case 'uob': case 'ule': case 'unit': case 'uket': case 'ubil':
      return isQual ? (ckNeg(r.raw) ? R(0) : R(1, '陽性', 'urine')) : (f ? R(1, hiLo, 'urine') : R(0));
    case 'uapp': return /clear|清/i.test(r.raw) ? R(0) : R(1, '外觀異常', 'urine');
    case 'uro': return (isQual && !ckNeg(r.raw) && !/normal|0\.1/i.test(r.raw)) ? R(1, '陽性', 'urine') : R(0);
    case 'urbc': case 'uwbc': case 'uepi': case 'ubact': case 'ucrys': case 'ucast':
      return f || (isQual && !ckNeg(r.raw)) ? R(1, '偏高', 'urine') : R(0);
    case 'bhcg': {
      if(!f && !(v > 5)) return R(0);
      if(P.female && P.age != null && P.age >= 12 && P.age <= 55){
        if(P.preg === 'yes') return R(0, '與懷孕相符', '', '懷孕中');
        return R(2, '育齡女性此數值升高，最常見的原因是懷孕，請先確認', 'preg', '需確認');
      }
      return R(2, '升高，需要進一步檢查', 'tumor');
    }
    case 'lpa': {
      if(v == null) break;
      const cut = /nmol/i.test(r.unit || '') ? 125 : 50;
      return v >= cut ? R(1, `達 ${cut} 以上，屬遺傳性的心血管風險因子`, 'lpa') : R(0);
    }
    case 'apob':
      if(v == null) break;
      return v >= 130 ? R(1, '達 130 以上', 'lipid') : R(0);
    case 'hscrp': {
      if(v == null) break;
      const mgl = /mg\/dL/i.test(r.unit || '') ? v * 10 : v;
      return mgl > 10 ? R(1, '超過 10 mg/L，多半是急性發炎或感染，建議身體恢復後複驗', 'crp10') : mgl >= 2 ? R(1, '達 2 mg/L 以上，屬心血管風險的加重因子', 'crp') : R(0);
    }
    case 'ebv':
      return (isQual ? !(ckNeg(r.raw) || /\(-\)|陰/.test(r.raw)) : f === 'H') ? R(1, '陽性，建議耳鼻喉科檢查鼻咽', 'ebv') : R(0);
    case 'antihbs': {
      const pos = v != null ? v >= 10 : !(ckNeg(r.raw) || /\(-\)|陰|</.test(r.raw));
      return pos ? R(0, '有保護力') : R(1, '沒有保護力，可考慮接種 B 型肝炎疫苗', 'hbvvac', '無抗體');
    }
    case 'afp': case 'cea': case 'psa': case 'fpsa': case 'scc': case 'cyfra': case 'ca724': case 'progrp': case 'ca125': case 'ca153': case 'ca199':
      return f === 'H' ? R(1, '高於參考值，單一數值不代表罹癌，需要和醫師討論', 'tumor') : R(0);
    case 'hbsag': return ckNeg(r.raw) || /\(-\)|陰|<|non/i.test(r.raw) ? R(0) : R(1, '陽性，代表 B 型肝炎帶原', 'hbv');
    case 'antihcv': return ckNeg(r.raw) || /\(-\)|陰|<|non/i.test(r.raw) ? R(0) : R(1, '陽性，需要再驗病毒量確認', 'hcv');
  }
  if(r.sec && /癌|腫瘤/.test(r.sec) && f === 'H') return R(1, '高於參考值，單一數值不代表罹癌，需要和醫師討論', 'tumor');
  if(isQual) return ckNeg(r.raw) || !r.ref || String(r.raw).trim() === String(r.ref).trim() ? R(0) : R(1, '與參考值不同', 'other');
  return f ? R(1, hiLo, 'other') : R(0);
}

// 長條圖的刻度與分區（[上限, 等級]），只給常用項目
function ckBarDef(key, P, r){
  const I = Infinity;
  switch(key){
    case 'glu':    return {scale:[60, 150], cuts:[[100, 0], [126, 1], [I, 2]]};
    case 'a1c':    return {scale:[4, 8],    cuts:[[5.7, 0], [6.5, 1], [I, 2]]};
    case 'homa':   return {scale:[0, 5],    cuts:[[1.45, 0], [I, 1]]};
    case 'tc':     return {scale:[100, 300],cuts:[[200, 0], [240, 1], [I, 2]]};
    case 'tg':     return {scale:[0, 400],  cuts:[[150, 0], [500, 1], [I, 2]]};
    case 'hdl':    return {scale:[20, 100], cuts:[[P.male ? 40 : 50, 1], [I, 0]]};
    case 'ldl':    return {scale:[50, 220], cuts:[[130, 0], [160, 1], [I, 2]]};
    case 'nonhdl': return {scale:[80, 250], cuts:[[160, 0], [190, 1], [I, 2]]};
    case 'ast': case 'alt': {
      const rg = ckRefRange(r && r.ref), u = rg && rg.hi != null ? rg.hi : 40;
      return {scale:[0, u * 4], cuts:[[u + 1e-9, 0], [u * 3 + 1e-9, 1], [I, 2]]};
    }
    case 'egfr':   return {scale:[15, 130], cuts:[[45, 2], [60, 1], [I, 0]]};
  }
  return null;
}

// FIB-4 = 年齡 × AST ÷（血小板 × √ALT），血小板單位 10⁹/L（＝ 10³/uL）；65 歲以上低切點改用 2.0
function ckFib4(rows, P){
  const get = k=> { const r = rows.find(x=> x.key === k); return r ? ckNum(r.raw) : null; };
  const ast = get('ast'), alt = get('alt'), plt = get('plt'), age = P.age;
  if(ast == null && alt == null) return null;
  const miss = [age == null && '年齡', ast == null && 'AST', alt == null && 'ALT', plt == null && '血小板'].filter(Boolean);
  if(miss.length) return {miss};
  const v = age * ast / (plt * Math.sqrt(alt));
  const low = age >= 65 ? 2.0 : 1.3;
  const g = v > 2.67 ? 2 : v >= low ? 1 : 0;
  return {v, g, low, young: age < 35, d: g === 2 ? '高於 2.67，肝纖維化風險高' : g === 1 ? '介於中間值，需要進一步評估' : '低於切點，肝纖維化風險低', adv: g ? 'fib4' : ''};
}

