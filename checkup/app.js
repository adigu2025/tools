/* 健檢報告：輸入畫面、優品 PDF 擷取、判讀規則。報告排版在 report.js。
   畫面在 view.html（裝進 #checkup-host 的 shadow root），一律用 KD 找元素、KB 處理捲動，不可直接用 document。
   所有全域名稱都以 ck／CK 開頭，避免和同一頁的減重報告、臨床計算撞名。 */
const CK_REVISION = '2026-10-27';
const CK_DRAFT = 'checkup_draft_v1';

/* ---------- 資料 ----------
   CK.reports：上傳的檢驗報告（可多份），日期最新的是本次，其餘當作歷次比較。
   CK.manual：沒有 PDF 時手動輸入的檢驗列。PDF 轉出的頁面圖片只放記憶體（CK_PAGES），不存進暫存。 */
let CK = ckBlank();
const CK_PAGES = {};
function ckBlank(){ return {info:{}, body:{}, hx:{}, us:{}, mod:{}, comment:'', reports:[], manual:null}; }

function ckGet(path){ return path.split('.').reduce((o, k)=> o == null ? undefined : o[k], CK); }
function ckSet(path, v){
  const ks = path.split('.'), last = ks.pop();
  const o = ks.reduce((o, k)=> (o[k] = o[k] || {}), CK);
  o[last] = v;
}
function ckEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function ckNum(s){
  const m = String(s == null ? '' : s).replace(/,/g, '').match(/^\s*[<>≦≧≤≥]?\s*(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
function ckToday(){ const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
// 民國日期（115/10/27、083/09/28）轉成 2026-10-27
function ckRoc(s){
  const m = /(\d{2,3})\/(\d{1,2})\/(\d{1,2})/.exec(s || '');
  return m ? `${+m[1] + 1911}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : '';
}
function ckAgeAt(birth, date){
  if(!birth || !date) return null;
  const b = new Date(birth + 'T00:00:00'), d = new Date(date + 'T00:00:00');
  let a = d.getFullYear() - b.getFullYear();
  if(d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a;
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
// 手動輸入時列出的常用項目（基礎套組）
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
  return {rep, pages};
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

/* ---------- 身體測量、超音波與衍生指標的判讀 ---------- */
function ckPatient(){
  const sex = CK.info.sex || '', age = ckNum(CK.info.age);
  return {sex, male: sex === 'M', female: sex === 'F', age, preg: CK.hx.preg || ''};
}
function ckBodyJudge(P){
  const b = CK.body, out = {};
  const h = ckNum(b.h), w = ckNum(b.w);
  if(h && w){
    const bmi = w / Math.pow(h / 100, 2);
    out.bmi = {v: bmi, ...(bmi < 18.5 ? {g:1, cat:'體重過輕', adv:'underweight'} : bmi < 24 ? {g:0, cat:'正常'} : bmi < 27 ? {g:1, cat:'過重', adv:'weight'} : {g:2, cat:'肥胖', adv:'weight'})};
  }
  const wa = ckNum(b.waist);
  if(wa != null){ const cut = P.male ? 90 : 80; out.waist = {v: wa, cut, g: wa >= cut ? 1 : 0, adv: 'weight'}; }
  const s = ckNum(b.sbp), d = ckNum(b.dbp);
  if(s != null && d != null){
    out.bp = {s, d, ...(s >= 140 || d >= 90 ? {g:2, cat:'達 140/90 以上'} : s >= 130 || d >= 80 ? {g:1, cat:'達 130/80 以上'} : {g:0, cat:'正常'}), adv:'bp'};
  }
  const fat = ckNum(b.fat);
  if(fat != null){ const cut = P.male ? 25 : 30; out.fat = {v: fat, cut, g: fat >= cut ? 1 : 0, adv:'weight'}; }
  const vf = ckNum(b.visceral);
  if(vf != null) out.visceral = {v: vf, g: vf >= 15 ? 2 : vf >= 10 ? 1 : 0, adv:'weight'};
  return out;
}

const CK_ABD = {
  normal:{t:'正常', g:0}, fatty1:{t:'輕度脂肪肝', g:1, adv:'fatty'}, fatty2:{t:'中度脂肪肝', g:1, adv:'fatty'}, fatty3:{t:'重度脂肪肝', g:2, adv:'fatty'},
  gbstone:{t:'膽結石', g:1, adv:'gbstone'}, gbpolyp:{t:'膽囊瘜肉', g:1}, lcyst:{t:'肝囊腫', g:0, d:'單純囊腫屬良性變化'},
  hemangioma:{t:'肝血管瘤', g:0, d:'屬良性腫瘤', adv:'hemangioma'}, kstone:{t:'腎結石', g:1, adv:'kstone'}, kcyst:{t:'腎囊腫', g:0, d:'單純囊腫屬良性變化'}, other:{t:'其他', g:1, adv:'usother'}
};
const CK_THY = {normal:{t:'正常', g:0}, nodule:{t:'甲狀腺結節', g:1}, cyst:{t:'甲狀腺囊腫', g:0, d:'單純囊腫屬良性變化'}, goiter:{t:'甲狀腺腫大', g:1, adv:'thyroid'}, other:{t:'其他', g:1, adv:'usother'}};

// 超音波每個發現一筆：{area, t, g, d, adv}
function ckUsJudge(){
  const u = CK.us, out = [];
  (u.abd || []).forEach(k=>{
    const x = CK_ABD[k]; if(!x) return;
    let it = {area:'腹部', t: x.t, g: x.g, d: x.d || '', adv: x.adv || ''};
    if(k === 'gbpolyp'){
      const mm = ckNum(u.gbpolyp);
      if(mm == null) it = {...it, g:1, d:'請補上大小，追蹤間隔依大小決定', adv:'gbpolyp'};
      else if(mm >= 10) it = {...it, t:`膽囊瘜肉 ${mm} mm`, g:2, d:'達 10 mm 以上', adv:'gbpolyp10'};
      else if(mm >= 6) it = {...it, t:`膽囊瘜肉 ${mm} mm`, g:1, d:'6 至 9 mm', adv:'gbpolyp6'};
      else it = {...it, t:`膽囊瘜肉 ${mm} mm`, g:0, d:'5 mm 以下，多數不需要特別追蹤', adv:''};
    }
    if(k === 'hemangioma' && ckNum(u.hemangioma) != null) it.t = `肝血管瘤 ${ckNum(u.hemangioma)} cm`;
    if(k === 'other') it.t = u.abdOther ? String(u.abdOther) : '其他發現';
    out.push(it);
  });
  (u.thy || []).forEach(k=>{
    const x = CK_THY[k]; if(!x) return;
    let it = {area:'甲狀腺', t: x.t, g: x.g, d: x.d || '', adv: x.adv || ''};
    if(k === 'nodule'){
      // ACR TI-RADS（2017）：依分級與最大徑決定穿刺或追蹤
      const tr = +u.tirads || 0, cm = ckNum(u.nodSize);
      it.t = `甲狀腺結節${tr ? ' TR' + tr : ''}${cm != null ? ' ' + cm + ' cm' : ''}`;
      const lim = {3:[2.5, 1.5], 4:[1.5, 1.0], 5:[1.0, .5]}[tr];
      if(!tr || cm == null) it = {...it, g:1, d:'請補上 TI-RADS 分級與大小', adv:'nodfu'};
      else if(tr <= 2) it = {...it, g:0, d:'良性特徵，不需要穿刺', adv:''};
      else if(cm >= lim[0]) it = {...it, g:2, d:`依 TI-RADS，TR${tr} 達 ${lim[0]} cm 建議細針穿刺`, adv:'fna'};
      else if(cm >= lim[1]) it = {...it, g:1, d:`依 TI-RADS，TR${tr} 達 ${lim[1]} cm 建議超音波追蹤`, adv:'nodfu'};
      else it = {...it, g: tr >= 5 ? 1 : 0, d:'未達追蹤大小', adv: tr >= 5 ? 'nodfu' : ''};
    }
    if(k === 'other') it.t = u.thyOther ? String(u.thyOther) : '其他發現';
    out.push(it);
  });
  return out;
}

/* ---------- 貼上報告工具（adigu2025.github.io/report/）的英文超音波報告 ----------
   以報告標題切開腹部與甲狀腺，FINDINGS 的固定片語轉成勾選；大小是醫師自由輸入的備註，抓得到才帶入。
   回傳 {abd, thy, msg}；abd、thy 為 null 表示這次沒貼該部位。 */
function ckSizeOf(s, unit){
  // 「1.2 x 0.8 x 0.9 cm」取最大值；unit 是想要的單位（mm 或 cm）
  const m = /((?:\d+(?:\.\d+)?\s*[x×*]\s*)*\d+(?:\.\d+)?)\s*(mm|cm)\b/i.exec(s || '');
  if(!m) return null;
  const v = Math.max(...m[1].split(/[x×*]/i).map(parseFloat));
  const u = m[2].toLowerCase();
  return u === unit ? v : u === 'cm' ? Math.round(v * 100) / 10 : Math.round(v) / 10;
}
function ckParseUsText(text){
  const T = String(text || '').replace(/\r/g, '');
  const msg = [];
  const part = re=>{ const m = re.exec(T); if(!m) return null; const rest = T.slice(m.index + m[0].length); const end = rest.search(/(ABDOMINAL|THYROID) ULTRASOUND REPORT/i); return end < 0 ? rest : rest.slice(0, end); };
  const sec = (s, re)=>{ const m = re.exec(s); return m ? m[1] : ''; };
  let abd = null, thy = null;
  const A = part(/ABDOMINAL ULTRASOUND REPORT/i) || (/LIVER:|GALLBLADDER/i.test(T) && !/THYROID/i.test(T) ? T : null);
  if(A != null){
    const liver = sec(A, /LIVER:([^\n]*)/i), gb = sec(A, /GALLBLADDER[^:\n]*:([^\n]*)/i), kid = sec(A, /KIDNEYS:([^\n]*)/i);
    const imp = sec(A, /IMPRESSION:\s*\n?([^\n]*)/i);
    const list = [], u = {};
    if(/severe fatty liver/i.test(liver)) list.push('fatty3');
    else if(/moderate fatty liver/i.test(liver)) list.push('fatty2');
    else if(/mild fatty liver/i.test(liver)) list.push('fatty1');
    if(/gallbladder stone|cholelithiasis/i.test(gb + imp)) list.push('gbstone');
    if(/gallbladder polyp/i.test(gb)){
      list.push('gbpolyp');
      // 片語本身有「less than 5mm」「5–9mm」「≥10mm」，先拿掉再找醫師寫的大小
      const seg = gb.split(';').filter(x=> /polyp/i.test(x)).join(';').replace(/less than 5mm|5[–-]9mm|≥10mm/gi, '');
      const mm = ckSizeOf(seg, 'mm');
      if(mm != null) u.gbpolyp = String(mm);
      else if(/≥10mm/i.test(gb)) u.gbpolyp = '10';
      else msg.push('膽囊瘜肉沒有寫大小，請補上');
    }
    if(/hepatic cyst|simple cyst/i.test(liver)) list.push('lcyst');
    if(/hemangioma/i.test(liver)){
      list.push('hemangioma');
      const cm = ckSizeOf(liver.split(';').filter(x=> /hemangioma/i.test(x)).join(';'), 'cm');
      if(cm != null) u.hemangioma = String(cm);
    }
    if(/renal stone|nephrolith/i.test(kid)) list.push('kstone');
    if(/renal cyst/i.test(kid)) list.push('kcyst');
    // 印象裡沒有對應選項的項目，放進「其他」
    const known = /fatty liver|cholelithiasis|gallbladder polyp|hepatic cyst|hemangioma|renal (stone|cyst)|no significant|unremarkable/i;
    const other = imp.replace(/\.$/, '').split(/\.\s+|;\s*/).map(x=> x.trim()).filter(x=> x && !known.test(x));
    if(other.length){ list.push('other'); u.abdOther = other.join('；'); msg.push('有沒對應到選項的發現，已放進「其他」，請改成中文'); }
    abd = {list: list.length ? list : ['normal'], u};
  }
  const Th = part(/THYROID ULTRASOUND REPORT/i);
  if(Th != null){
    const gland = sec(Th, /THYROID GLAND:([^\n]*)/i);
    const list = [], u = {};
    const nods = [...Th.matchAll(/Nodule \d+:[^\n]*?size ([^;]*);[^\n]*?\(TR(\d)/gi)].map(m=> ({cm: ckSizeOf(m[1], 'cm'), tr: +m[2]}));
    if(nods.length){
      // 先挑處置最積極的（穿刺 > 追蹤 > 不需處理），再比分級與大小；TR4 0.9 cm 不如 TR3 1.8 cm 需要追蹤
      const act = n=>{ const lim = {3:[2.5, 1.5], 4:[1.5, 1.0], 5:[1.0, .5]}[n.tr]; return !lim || n.cm == null ? 0 : n.cm >= lim[0] ? 2 : n.cm >= lim[1] ? 1 : 0; };
      nods.sort((a, b)=> act(b) - act(a) || b.tr - a.tr || (b.cm || 0) - (a.cm || 0));
      list.push('nodule');
      u.tirads = String(nods[0].tr);
      if(nods[0].cm != null) u.nodSize = String(nods[0].cm); else msg.push('甲狀腺結節沒有寫大小，請補上');
      if(nods.length > 1){
        u.noteAdd = `甲狀腺共 ${nods.length} 顆結節，以上為最需要處理的一顆；其餘：` + nods.slice(1).map(n=> `TR${n.tr}${n.cm != null ? ' ' + n.cm + ' cm' : ''}`).join('、') + '。';
      }
    }
    if(/cystic lesion within the thyroid/i.test(Th)) list.push('cyst');
    if(/goiter|enlarged/i.test(gland)) list.push('goiter');
    thy = {list: list.length ? list : ['normal'], u};
  }
  return {abd, thy, msg};
}
function ckImportUs(text){
  const r = ckParseUsText(text);
  if(!r.abd && !r.thy) return {ok: false, msg: ['看不出是腹部或甲狀腺超音波報告，請貼上報告工具產生的完整英文報告（含 FINDINGS 與 IMPRESSION）']};
  const U = CK.us;
  const done = [];
  if(r.abd){
    U.abd = r.abd.list;
    ['gbpolyp', 'hemangioma', 'abdOther'].forEach(k=>{ if(r.abd.u[k] != null) U[k] = r.abd.u[k]; });
    done.push('腹部：' + r.abd.list.map(k=> CK_ABD[k].t).join('、'));
  }
  if(r.thy){
    U.thy = r.thy.list;
    ['tirads', 'nodSize'].forEach(k=>{ if(r.thy.u[k] != null) U[k] = r.thy.u[k]; });
    if(r.thy.u.noteAdd && !String(U.note || '').includes(r.thy.u.noteAdd)) U.note = (U.note ? U.note + '\n' : '') + r.thy.u.noteAdd;
    done.push('甲狀腺：' + r.thy.list.map(k=> CK_THY[k].t).join('、') + (U.tirads ? `（TR${U.tirads}${U.nodSize ? ' ' + U.nodSize + ' cm' : ''}）` : ''));
  }
  return {ok: true, done, msg: r.msg};
}

// FIB-4 = 年齡 × AST ÷（血小板 × √ALT），血小板單位 10⁹/L（＝ 10³/uL）
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

/* ---------- 加選模組 ----------
   PDF 沒有、但在「加選模組」手動填的檢驗值，補成檢驗列，判讀與報告表格照常處理。 */
const CK_MOD_ROWS = [['lpa', '<50'], ['apob', '<130'], ['hscrp', '<2.0'], ['hbsag', '陰性'], ['antihbs', '陽性'], ['antihcv', '陰性']];
function ckModRows(rows){
  const m = CK.mod || {}, out = [];
  CK_MOD_ROWS.forEach(([k, ref])=>{
    const v = String(m[k] == null ? '' : m[k]).trim();
    if(!v || rows.some(r=> r.key === k && String(r.raw || '').trim())) return;
    const x = CK_LAB_BY[k];
    out.push({key: k, code: '', zh: x[2], raw: v, ref, unit: /^[\d.]+$/.test(v) ? x[4] : '', sec: x[3], labFlag: '', manual: true});
  });
  return out;
}

/* 大腸鏡追蹤間隔：依 2020 美國多學會大腸癌工作小組（USMSTF）建議。
   回傳 {t 間隔, g 燈號, when 建議分組, d 說明}；沒有填病理時回傳 null。 */
function ckColonNext(){
  const m = CK.mod || {}, h = m.cHist;
  if(!h) return null;
  const n = ckNum(m.cNum) || (h === 'none' ? 0 : 1), mm = ckNum(m.cSize) || 0;
  const fam = (CK.hx.fam || []).includes('crc');
  let t, g = 1, d = '';
  if(h === 'cancer') return {t:'轉介外科與腫瘤科', g:2, when:'now', d:'病理為癌，需要進一步分期與治療'};
  if(h === 'none'){ t = fam ? '5 年' : '10 年'; g = 0; d = fam ? '沒有瘜肉；一等親有大腸癌，間隔縮短為 5 年' : '沒有瘜肉'; }
  else if(h === 'hyper'){ if(mm >= 10){ t = '3 至 5 年'; d = '增生性瘜肉達 10 mm 以上'; } else { t = '10 年'; g = 0; d = '小於 10 mm 的增生性瘜肉，屬低風險'; } }
  else if(h === 'tubular'){
    if(n > 10){ t = '1 年'; d = '腺瘤超過 10 顆'; }
    else if(mm >= 10 || n >= 5){ t = '3 年'; d = mm >= 10 ? '腺瘤達 10 mm 以上' : '腺瘤 5 至 10 顆'; }
    else if(n >= 3){ t = '3 至 5 年'; d = '腺瘤 3 至 4 顆，皆小於 10 mm'; }
    else { t = '7 至 10 年'; d = '腺瘤 1 至 2 顆，皆小於 10 mm'; }
  }
  else if(h === 'advanced'){ t = '3 年'; d = '絨毛狀或高度分化不良腺瘤，屬進行性腺瘤'; }
  else if(h === 'ssl' || h === 'ssldys'){
    if(h === 'ssldys' || mm >= 10){ t = '3 年'; d = h === 'ssldys' ? '鋸齒狀病灶合併分化不良' : '鋸齒狀病灶達 10 mm 以上'; }
    else if(n >= 5){ t = '3 年'; d = '鋸齒狀病灶 5 至 10 顆'; }
    else if(n >= 3){ t = '3 至 5 年'; d = '鋸齒狀病灶 3 至 4 顆，皆小於 10 mm'; }
    else { t = '5 至 10 年'; d = '鋸齒狀病灶 1 至 2 顆，皆小於 10 mm'; }
  }
  if(m.cPiece === 'yes'){ t = '6 個月'; g = 1; d = '20 mm 以上分片切除，需要確認切除部位沒有殘留'; }
  else if(m.cPrep === 'poor' && !/^(1 年)$/.test(t)){ t = '1 年內'; g = 1; d = '腸道清潔不佳，可能有看不清楚的地方'; }
  const when = t === '6 個月' ? 'm6' : /^1 年/.test(t) ? 'y1' : 'long';
  return {t, g, when, d};
}

const CK_EGD = {
  normal:{t:'正常', g:0}, gerd:{t:'逆流性食道炎', g:1, adv:'gerd'}, gastritis:{t:'慢性胃炎', g:0},
  atrophy:{t:'萎縮性胃炎或腸上皮化生', g:1, adv:'atrophy'}, ulcer:{t:'潰瘍', g:2, adv:'ulcer'},
  polyp:{t:'瘜肉', g:1, adv:'egdpolyp'}, tumor:{t:'疑似腫瘤', g:2, adv:'egdtumor'}, other:{t:'其他', g:1, adv:'egdother'}
};
// Lung-RADS v2022：分級、燈號、建議
const CK_LUNG = {
  '1':{g:0, d:'沒有結節，或結節有明確良性特徵', adv:'ldct12'}, '2':{g:0, d:'結節屬良性表現', adv:'ldct12'},
  '3':{g:1, d:'可能良性，建議 6 個月後追蹤', adv:'ldct6'}, '4A':{g:2, d:'可疑，建議 3 個月後追蹤', adv:'ldct3'},
  '4B':{g:2, d:'非常可疑，需要進一步檢查', adv:'ldct4b'}, '4X':{g:2, d:'非常可疑，需要進一步檢查', adv:'ldct4b'}
};

// 加選模組的判讀，每個發現一筆：{area, t, g, d, adv, note}
function ckModJudge(){
  const m = CK.mod || {}, out = [];
  if(m.ecg === 'normal') out.push({area:'心電圖', t:'正常', g:0});
  if(m.ecg === 'abn') out.push({area:'心電圖', t: m.ecgNote ? String(m.ecgNote) : '異常', g:1, adv:'ecg'});
  const ca = m.carotid || [], imt = ckNum(m.imt);
  if(ca.length || imt != null){
    let g = 0, adv = '', t = [];
    if(ca.includes('normal')) t.push('正常');
    if(ca.includes('imt') || (imt != null && imt >= 1.0)){ g = Math.max(g, 1); adv = 'plaque'; t.push('內膜中層增厚'); }
    if(ca.includes('plaque')){ g = Math.max(g, 1); adv = 'plaque'; t.push('有斑塊'); }
    if(ca.includes('sten50')){ g = 2; adv = 'carotid50'; t.push('狹窄 50% 以上'); }
    out.push({area:'頸動脈超音波', t: (t.join('、') || '已檢查') + (imt != null ? `（IMT ${imt} mm）` : ''), g, adv, note: m.carotidNote});
  }
  if(m.ubt === 'neg') out.push({area:'幽門桿菌', t:'碳 13 呼氣檢查陰性', g:0});
  if(m.ubt === 'pos') out.push({area:'幽門桿菌', t:'碳 13 呼氣檢查陽性' + (ckNum(m.ubtVal) != null ? `（DOB ${ckNum(m.ubtVal)}‰）` : ''), g:1, d:'有幽門桿菌感染，建議除菌治療', adv:'hp'});
  const colonDone = !!m.cHist;
  if(m.fit === 'neg') out.push({area:'糞便潛血', t:'陰性', g:0});
  if(m.fit === 'pos') out.push(colonDone ? {area:'糞便潛血', t:'陽性', g:1, d:'本次已完成大腸鏡，依大腸鏡結果追蹤'} : {area:'糞便潛血', t:'陽性', g:2, d:'需要安排大腸鏡檢查', adv:'fitpos'});
  (m.egd || []).forEach(k=>{
    const x = CK_EGD[k]; if(!x) return;
    out.push({area:'胃鏡', t: x.t, g: x.g, adv: x.adv || ''});
  });
  if((m.egd || []).length && m.egdNote) out[out.length - 1].note = m.egdNote;
  const cn = ckColonNext();
  if(cn){
    const hz = {none:'沒有瘜肉', hyper:'增生性瘜肉', tubular:'管狀腺瘤', advanced:'進行性腺瘤', ssl:'無柄鋸齒狀病灶', ssldys:'鋸齒狀病灶合併分化不良', cancer:'大腸癌'}[m.cHist];
    const num = ckNum(m.cNum), mm = ckNum(m.cSize);
    const t = hz + (m.cHist !== 'none' && (num || mm) ? `（${num ? num + ' 顆' : ''}${num && mm ? '，' : ''}${mm ? '最大 ' + mm + ' mm' : ''}）` : '');
    out.push({area:'大腸鏡', t, g: cn.g, d: `${cn.d}；下次大腸鏡：${cn.t}`, adv:'colon', note: m.colonNote, colon: cn});
  } else if(m.colonNote) out.push({area:'大腸鏡', t:'已檢查', g:0, note: m.colonNote});
  if(m.ldct){
    const x = CK_LUNG[m.ldct];
    out.push({area:'低劑量肺部電腦斷層', t:'Lung-RADS ' + m.ldct, g: x.g, d: x.d, adv: x.adv, note: m.ldctNote});
  }
  return out;
}

/* ---------- 心血管風險 ----------
   PREVENT（AHA 2023，Khan SS 等，Circulation 2024;149:430-449）：係數取自 preventr 套件（含 2026-10-14 勘誤後的 HbA1c 項順序），
   以 preventr 範例驗證：女 50 歲、SBP 160 服降壓藥、TC 200、HDL 45、糖尿病、不吸菸、eGFR 90、BMI 35
   → 10 年總心血管 14.7%、ASCVD 9.2%，30 年 53.0%、35.4%。
   每組係數順序：age、(30 年才有 age²)、nonHDL、HDL、SBP<110、SBP≥110、DM、吸菸、BMI<30、BMI≥30、eGFR<60、eGFR≥60、
   降壓藥、statin、降壓藥×SBP、statin×nonHDL、age×(nonHDL、HDL、SBP、DM、吸菸、BMI、eGFR)、(HbA1c 模型：HbA1c 無 DM、有 DM、缺值)、常數。 */
const CK_PREVENT = {
  b10:{
    f_cvd:  [0.7939329,0.0305239,-0.1606857,-0.2394003,0.3600781,0.8667604,0.5360739,0,0,0.6045917,0.0433769,0.3151672,-0.1477655,-0.0663612,0.1197879,-0.0819715,0.0306769,-0.0946348,-0.27057,-0.078715,0,-0.1637806,-3.307728],
    m_cvd:  [0.7688528,0.0736174,-0.0954431,-0.4347345,0.3362658,0.7692857,0.4386871,0,0,0.5378979,0.0164827,0.288879,-0.1337349,-0.0475924,0.150273,-0.0517874,0.0191169,-0.1049477,-0.2251948,-0.0895067,0,-0.1543702,-3.031168],
    f_ascvd:[0.719883,0.1176967,-0.151185,-0.0835358,0.3592852,0.8348585,0.4831078,0,0,0.4864619,0.0397779,0.2265309,-0.0592374,-0.0395762,0.0844423,-0.0567839,0.0325692,-0.1035985,-0.2417542,-0.0791142,0,-0.1671492,-3.819975],
    m_ascvd:[0.7099847,0.1658663,-0.1144285,-0.2837212,0.3239977,0.7189597,0.3956973,0,0,0.3690075,0.0203619,0.2036522,-0.0865581,-0.0322916,0.114563,-0.0300005,0.0232747,-0.0927024,-0.2018525,-0.0970527,0,-0.1217081,-3.500655]
  },
  b30:{
    f_cvd:  [0.5503079,-0.0928369,0.0409794,-0.1663306,-0.1628654,0.3299505,0.6793894,0.3196112,0,0,0.1857101,0.0553528,0.2894,-0.075688,-0.056367,0.1071019,-0.0751438,0.0301786,-0.0998776,-0.3206166,-0.1607862,0,-0.1450788,-1.318827],
    m_cvd:  [0.4627309,-0.0984281,0.0836088,-0.1029824,-0.2140352,0.2904325,0.5331276,0.2141914,0,0,0.1155556,0.0603775,0.232714,-0.0272112,-0.0384488,0.134192,-0.0511759,0.0165865,-0.1101437,-0.2585943,-0.1566406,0,-0.1166776,-1.148204],
    f_ascvd:[0.4669202,-0.0893118,0.1256901,-0.1542255,-0.0018093,0.322949,0.6296707,0.268292,0,0,0.100106,0.0499663,0.1875292,0.0152476,-0.0276123,0.0736147,-0.0521962,0.0316918,-0.1046101,-0.2727793,-0.1530907,0,-0.1299149,-1.974074],
    m_ascvd:[0.3994099,-0.0937484,0.1744643,-0.120203,-0.0665117,0.2753037,0.4790257,0.1782635,0,0,-0.0218789,0.0602553,0.1421182,0.0135996,-0.0218265,0.1013148,-0.0312619,0.020673,-0.0920935,-0.2159947,-0.1548811,0,-0.0712547,-1.736444]
  },
  a10:{
    f_cvd:  [0.7858178,0.0194438,-0.1521964,-0.2296681,0.3465777,0.5366241,0.5411682,0,0,0.5931898,0.0472458,0.3158567,-0.1535174,-0.0687752,0.1054746,-0.0761119,0.0307469,-0.0905966,-0.2241857,-0.080186,0,-0.1667286,0.1338348,0.1622409,-0.0142496,-3.306162],
    m_cvd:  [0.7699177,0.0605093,-0.0888525,-0.417713,0.3288657,0.4759471,0.4385663,0,0,0.5334616,0.0206431,0.2917524,-0.1383313,-0.0482622,0.1393796,-0.0463501,0.0205926,-0.1037717,-0.1737697,-0.0915839,0,-0.1637039,0.13159,0.1295185,-0.0128373,-3.040901],
    f_ascvd:[0.7111831,0.106797,-0.1425745,-0.0736824,0.3480844,0.5112951,0.4880292,0,0,0.4754997,0.0438132,0.2259093,-0.0648872,-0.0437645,0.0697082,-0.0506382,0.0327475,-0.0996442,-0.1924338,-0.0803539,0,-0.1682586,0.1339055,0.1596461,0.0015678,-3.838746],
    m_ascvd:[0.7064146,0.1532267,-0.1082166,-0.2675288,0.3173809,0.432604,0.3958842,0,0,0.3665014,0.0250243,0.2061158,-0.0899988,-0.0334959,0.1034168,-0.0255406,0.0247538,-0.0917441,-0.1499195,-0.098089,0,-0.1305231,0.1157161,0.1288303,-0.0010001,-3.51835]
  },
  a30:{
    f_cvd:  [0.5343493,-0.0952314,0.0298124,-0.1578451,-0.1504488,0.3173368,0.4314738,0.3209399,0,0,0.1771435,0.0582828,0.2888947,-0.0795886,-0.0600438,0.0920598,-0.0696108,0.0308807,-0.0954051,-0.2763408,-0.1623944,0,-0.1430514,0.0940543,0.1116486,-0.0024798,-1.341059],
    m_cvd:  [0.4519873,-0.101624,0.0700456,-0.0968005,-0.1923527,0.2827043,0.3417152,0.2105272,0,0,0.1113291,0.0640135,0.2334248,-0.0299421,-0.0393204,0.1228854,-0.0463737,0.0184599,-0.1085744,-0.2208049,-0.1577978,0,-0.1179375,0.0768169,0.0777295,0.0092204,-1.180767],
    f_ascvd:[0.4555574,-0.0903501,0.1148321,-0.1458754,0.0089323,0.3139029,0.386281,0.2714309,0,0,0.0930987,0.0532216,0.1862181,0.0106964,-0.0329713,0.0583609,-0.0463273,0.0324717,-0.1004777,-0.2266944,-0.1541859,0,-0.1286005,0.0875827,0.1126417,0.0124356,-2.011533],
    m_ascvd:[0.3883267,-0.0958114,0.1613374,-0.1144418,-0.0474338,0.2691281,0.2859773,0.1759553,0,0,-0.0242898,0.0644523,0.142874,0.0115062,-0.02333,0.0899664,-0.0275478,0.022573,-0.090802,-0.1771894,-0.1548847,0,-0.0732754,0.0591089,0.0821158,0.0179755,-1.777708]
  }
};
// 心血管風險要用的輸入，全部從現有欄位取
function ckCvInputs(rows, P, body){
  const get = k=> { const r = rows.find(x=> x.key === k && String(x.raw || '').trim()); return r ? ckNum(r.raw) : null; };
  const dx = CK.hx.dx || [], med = CK.hx.med || [];
  const h = ckNum(CK.body.h), w = ckNum(CK.body.w);
  return {
    age: P.age, male: P.male, sexOk: P.male || P.female,
    tc: get('tc'), hdl: get('hdl'), ldl: get('ldl'), a1c: get('a1c'), glu: get('glu'),
    egfr: get('egfr') != null ? get('egfr') : get('mdrd'),
    sbp: body.bp ? body.bp.s : null, bmi: h && w ? w / Math.pow(h / 100, 2) : null,
    dm: dx.includes('dm') || med.includes('dm'), smoke: CK.hx.smoke === 'current',
    bptx: med.includes('bp'), statin: med.includes('statin'), cvd: dx.includes('cvd'), smokeSet: !!CK.hx.smoke
  };
}
function ckPrevent(I){
  if(I.cvd) return {na:'已有心血管疾病，屬次級預防，不適用風險預測'};
  const miss = [!I.sexOk && '性別', I.age == null && '年齡', I.tc == null && '總膽固醇', I.hdl == null && 'HDL', I.sbp == null && '收縮壓', I.egfr == null && 'eGFR', !I.smokeSet && '吸菸狀態'].filter(Boolean);
  if(miss.length) return {miss};
  const out = [[I.age, 30, 79, '年齡'], [I.sbp, 90, 180, '收縮壓'], [I.tc, 130, 320, '總膽固醇'], [I.hdl, 20, 100, 'HDL'], [I.egfr, 15, 140, 'eGFR']]
    .filter(([v, lo, hi])=> v < lo || v > hi).map(([v, lo, hi, n])=> `${n} ${Math.round(v * 10) / 10}（適用 ${lo} 至 ${hi}）`);
  if(out.length) return {range: out};
  const useA1c = I.a1c != null && I.a1c >= 4.5 && I.a1c <= 15;
  const bmi = I.bmi || 25;     // BMI 只影響心衰竭模型，總心血管與 ASCVD 的係數都是 0
  const a = (I.age - 55) / 10, nh = (I.tc - I.hdl) * 0.02586 - 3.5, hd = (I.hdl * 0.02586 - 1.3) / 0.3;
  const sl = (Math.min(I.sbp, 110) - 110) / 20, sg = (Math.max(I.sbp, 110) - 130) / 20;
  const bl = (Math.min(bmi, 30) - 25) / 5, bg = (Math.max(bmi, 30) - 30) / 5;
  const el = (Math.min(I.egfr, 60) - 60) / -15, eg = (Math.max(I.egfr, 60) - 90) / -15;
  const dm = I.dm ? 1 : 0, sm = I.smoke ? 1 : 0, bp = I.bptx ? 1 : 0, st = I.statin ? 1 : 0;
  const run = (yr, ev)=>{
    const x = [a, nh, hd, sl, sg, dm, sm, bl, bg, el, eg, bp, st, bp * sg, st * nh, a * nh, a * hd, a * sg, a * dm, a * sm, a * bg, a * el];
    if(yr === 30) x.splice(1, 0, a * a);
    if(useA1c) x.push(dm ? 0 : I.a1c - 5.3, dm ? I.a1c - 5.3 : 0, 0);
    x.push(1);
    const c = CK_PREVENT[(useA1c ? 'a' : 'b') + yr][(I.male ? 'm_' : 'f_') + ev];
    const s = x.reduce((t, v, i)=> t + v * c[i], 0);
    return Math.exp(s) / (1 + Math.exp(s));
  };
  const r = {model: useA1c ? 'HbA1c' : '基本', cvd10: run(10, 'cvd'), ascvd10: run(10, 'ascvd')};
  if(I.age <= 59){ r.cvd30 = run(30, 'cvd'); r.ascvd30 = run(30, 'ascvd'); }
  return r;
}
/* TwCCCC：2023 台灣心臟學會慢性冠心症指引 Table 7（源自竹山社區世代，Chien KL 等，Int J Cardiol 2012;157:263-8），預測 10 年冠心病風險。
   原表收縮壓欄另有一列「< 110 → 5 分」與第一列矛盾，本工具採 0 至 4 分，待對照原始論文確認。 */
const CK_TW_RISK = [0, .001, .001, .001, .001, .002, .003, .003, .005, .006, .008, .011, .014, .019, .025, .033, .044, .058, .076, .099, .129, .168, .216, .276, .349];
function ckTwcccc(I){
  if(I.cvd) return {na:'已有心血管疾病，屬次級預防，不適用風險預測'};
  if(I.age != null && I.age < 35) return {na:'TwCCCC 適用 35 歲以上'};
  const miss = [!I.sexOk && '性別', I.age == null && '年齡', I.bmi == null && '身高體重', I.sbp == null && '收縮壓', I.ldl == null && 'LDL', I.hdl == null && 'HDL', !I.smokeSet && '吸菸狀態'].filter(Boolean);
  if(miss.length) return {miss};
  const p = {
    age: Math.min(8, Math.max(0, Math.floor((I.age - 35) / 5))),
    sex: I.male ? 3 : 0,
    bmi: I.bmi < 22 ? 0 : I.bmi < 26 ? 1 : 2,
    sbp: I.sbp < 110 ? 0 : I.sbp < 130 ? 1 : I.sbp < 150 ? 2 : I.sbp < 160 ? 3 : 4,
    ldl: I.ldl < 90 ? 0 : I.ldl < 150 ? 1 : 2,
    hdl: I.hdl < 30 ? 5 : I.hdl < 40 ? 4 : I.hdl < 60 ? 3 : I.hdl < 70 ? 2 : I.hdl < 80 ? 1 : 0,
    smoke: I.smoke ? 2 : 0
  };
  const pts = Object.values(p).reduce((a, b)=> a + b, 0);
  return {pts, parts: p, risk: CK_TW_RISK[Math.min(24, pts)]};
}

/* ---------- 公費篩檢 ----------
   依國民健康署公告整理（2026 年 10 月）。只看年齡、性別、家族史與吸菸，不知道上次篩檢日期，所以寫成「符合資格」。
   tbc：新制或來源說法不一，醫師端標示待確認。 */
function ckPublic(P){
  const age = P.age, out = [];
  if(age == null) return out;
  const fam = CK.hx.fam || [], m = CK.mod || {}, smoke = CK.hx.smoke;
  const by = /^\d{4}/.test(CK.info.birth || '') ? +CK.info.birth.slice(0, 4) : null;
  const add = (t, rule, done, tbc)=> out.push({t, rule, done: done || '', tbc: !!tbc});
  if(age >= 30) add('成人預防保健', age >= 65 ? '65 歲以上每年 1 次' : age >= 40 ? '40 至 64 歲每 3 年 1 次' : '30 至 39 歲每 5 年 1 次');
  if((age >= 45 && age <= 74) || (age >= 40 && age < 45 && fam.includes('crc')))
    add('糞便潛血檢查', age < 45 ? '一等親有大腸癌，40 至 44 歲每 2 年 1 次' : '45 至 74 歲每 2 年 1 次', m.cHist ? '本次已做大腸鏡，依大腸鏡追蹤時程即可' : m.fit ? '本次已做' : '');
  if(P.female && age >= 40 && age <= 74) add('乳房攝影', '40 至 74 歲女性每 2 年 1 次');
  if(age >= 30 && (smoke === 'current' || smoke === 'former')) add('口腔黏膜檢查', '30 歲以上吸菸或嚼檳榔（含已戒）每 2 年 1 次');
  if(age >= 45 && age <= 74) add('幽門桿菌糞便抗原檢查', '45 至 74 歲一生 1 次（2026 年起）', m.ubt ? '本次已做呼氣檢查' : '', true);
  const hepDone = m.hbsag || m.antihcv || ckCurrentRows().some(r=> (r.key === 'hbsag' || r.key === 'antihcv') && String(r.raw || '').trim());
  if(age <= 79 && ((by && by <= 1986) || (!by && age >= 40))) add('B、C 型肝炎篩檢', '民國 75 年以前出生、79 歲以下一生 1 次', hepDone ? '本次已驗' : '', true);
  const py = ckNum(CK.hx.packyears), quit = ckNum(CK.hx.quitYears);
  const famLung = fam.includes('lung') && ((P.female && age >= 40 && age <= 74) || (P.male && age >= 45 && age <= 74));
  const heavy = age >= 50 && age <= 74 && py != null && py >= 20 && (smoke === 'current' || (smoke === 'former' && quit != null && quit < 15));
  if(famLung || heavy) add('低劑量肺部電腦斷層', famLung ? '一等親有肺癌，每 2 年 1 次' : '吸菸 20 包年以上（戒菸未滿 15 年），每 2 年 1 次', m.ldct ? '本次已做' : '');
  return out;
}

/* ---------- 建議事項 ----------
   when：now 盡快回診、m3 三個月內、m6 半年內、y1 一年後（下次健檢）。同一類只列一次。 */
const CK_ADV = {
  sugar1:   {when:'m6', t:'減少含糖飲料與精緻澱粉，每週運動 150 分鐘，3 至 6 個月後複查糖化血色素。'},
  sugar2:   {when:'now', t:'請回診再驗一次血糖與糖化血色素，確認是否為糖尿病並討論治療。'},
  homa:     {when:'m6', t:'胰島素阻抗會隨減重與規律運動改善，3 至 6 個月後可複查。'},
  lipid:    {when:'m3', t:'減少油炸、肥肉與加工肉品，3 個月後複查血脂；是否需要用藥，會依心血管風險一起評估。'},
  tg500:    {when:'now', t:'三酸甘油脂過高有急性胰臟炎風險，請盡快回診討論用藥，並暫停飲酒。'},
  liver:    {when:'m3', t:'肝指數升高的原因包括脂肪肝、B／C 型肝炎、藥物與飲酒，請回診找原因，3 個月後複查。'},
  fib4:     {when:'m3', t:'FIB-4 偏高，建議安排肝臟纖維化掃描，進一步確認肝臟硬度。'},
  kidney:   {when:'m3', t:'請回診複查腎功能與尿液，並檢視目前服用的藥物。'},
  ua:       {when:'m6', t:'多喝水，減少含糖飲料、酒精與內臟類食物；有關節紅腫熱痛再評估用藥。'},
  cbc:      {when:'m3', t:'血球數值有異常，請回診了解原因，必要時加驗鐵質與維生素。'},
  thyroid:  {when:'m3', t:'請回診複查甲狀腺功能，確認是否需要治療。'},
  urine:    {when:'m3', t:'尿液檢查有陽性反應，請在非生理期複驗一次尿液；持續陽性再進一步檢查。'},
  preg:     {when:'now', t:'請先確認是否懷孕。確認之前，暫緩 X 光、電腦斷層與麻醉內視鏡檢查。'},
  tumor:    {when:'m3', t:'腫瘤標記升高的原因很多，發炎、吸菸與良性疾病都可能讓數值上升，請回診討論是否需要複驗或安排影像檢查。'},
  hbv:      {when:'m3', t:'B 型肝炎帶原者，請每 6 個月追蹤一次肝功能與腹部超音波。'},
  hcv:      {when:'m3', t:'C 肝抗體陽性，請回診驗 C 肝病毒量，確認是否需要治療。'},
  other:    {when:'m3', t:'其他檢驗有超出參考值的項目，請回診討論。'},
  weight:   {when:'m6', t:'以 3 至 6 個月減少目前體重的 5% 為第一階段目標，飲食與運動一起調整。'},
  underweight:{when:'m6', t:'體重過輕，建議增加蛋白質攝取與肌力訓練。'},
  bp:       {when:'m3', t:'請在家量血壓 7 天，早晚各量 2 次，帶紀錄回診確認是否為高血壓。'},
  fatty:    {when:'m6', t:'脂肪肝會隨減重改善，減少體重 7% 至 10% 效果最明顯，6 至 12 個月後追蹤肝功能與超音波。'},
  gbstone:  {when:'y1', t:'沒有症狀的膽結石通常不需要處理；如果出現右上腹痛、發燒或黃疸，請盡快就醫。'},
  gbpolyp:  {when:'m6', t:'膽囊瘜肉的追蹤間隔依大小決定，請回診確認。'},
  gbpolyp6: {when:'m6', t:'6 至 9 mm 的膽囊瘜肉，建議 6 個月後超音波追蹤，之後每年追蹤。'},
  gbpolyp10:{when:'now', t:'膽囊瘜肉達 10 mm 以上，建議轉介外科評估手術。'},
  hemangioma:{when:'y1', t:'肝血管瘤屬良性，建議下次健檢超音波確認大小穩定。'},
  kstone:   {when:'y1', t:'腎結石請多喝水，每天尿量 2000 mL 以上；出現腰痛或血尿請就醫。'},
  nodfu:    {when:'y1', t:'甲狀腺結節建議 1 年後超音波追蹤，比較大小與特徵。'},
  fna:      {when:'now', t:'甲狀腺結節建議安排細針穿刺，確認細胞性質。'},
  usother:  {when:'m3', t:'超音波有其他發現，請回診討論後續追蹤。'},
  lpa:      {when:'y1', t:'脂蛋白(a) 主要由遺傳決定，一生驗一次即可；數值高的人，其他危險因子要控制得更嚴格，也建議一等親檢查。'},
  crp:      {when:'y1', t:'hs-CRP 偏高代表血管有慢性發炎，戒菸、減重與規律運動可以降低；會和其他危險因子一起評估。'},
  crp10:    {when:'m3', t:'hs-CRP 明顯升高多半是急性發炎，感冒或受傷恢復 2 週後再驗一次才準確。'},
  hbvvac:   {when:'m6', t:'B 型肝炎表面抗體陰性，代表沒有保護力，可以接種 B 型肝炎疫苗。'},
  ebv:      {when:'m3', t:'EB 病毒抗體陽性和鼻咽癌有關，建議到耳鼻喉科做鼻咽內視鏡檢查。'},
  ecg:      {when:'m3', t:'心電圖有異常發現，請回診討論是否需要心臟超音波或轉介心臟科。'},
  plaque:   {when:'m3', t:'頸動脈有斑塊或內膜增厚，代表已有動脈硬化，血脂與血壓的控制目標要更嚴格。'},
  carotid50:{when:'now', t:'頸動脈狹窄 50% 以上，建議轉介神經內科或心臟科評估。'},
  hp:       {when:'m3', t:'幽門桿菌陽性建議除菌治療，可以降低胃癌與潰瘍的風險；療程結束 4 週以上、並停用胃藥 2 週後，再做呼氣檢查確認除菌成功。'},
  fitpos:   {when:'now', t:'糞便潛血陽性，請安排大腸鏡檢查，不建議只重驗一次糞便。'},
  gerd:     {when:'m3', t:'逆流性食道炎可以先調整生活習慣：睡前 3 小時不進食、減少咖啡與油炸食物、控制體重；症狀明顯時再用藥。'},
  atrophy:  {when:'long', t:'萎縮性胃炎或腸上皮化生是胃癌的前驅變化，胃竇與胃體都有時建議每 3 年做一次胃鏡；有胃癌家族史，間隔再縮短。'},
  ulcer:    {when:'now', t:'消化性潰瘍需要用藥治療，並確認幽門桿菌；胃潰瘍在治療 8 至 12 週後要再做胃鏡確認癒合。'},
  egdpolyp: {when:'m3', t:'胃鏡瘜肉的追蹤依病理報告決定，請回診看病理結果。'},
  egdtumor: {when:'now', t:'胃鏡有疑似腫瘤的病灶，請盡快回診看病理報告並安排後續治療。'},
  egdother: {when:'m3', t:'胃鏡有其他發現，請回診討論後續追蹤。'},
  ldct12:   {when:'y1', t:'低劑量肺部電腦斷層結果屬低風險，依 Lung-RADS 建議 12 個月後追蹤（公費篩檢為每 2 年 1 次）。'},
  ldct6:    {when:'m6', t:'肺部結節屬 Lung-RADS 3，建議 6 個月後再做一次低劑量電腦斷層。'},
  ldct3:    {when:'m3', t:'肺部結節屬 Lung-RADS 4A，建議 3 個月後追蹤低劑量電腦斷層，必要時安排正子攝影。'},
  ldct4b:   {when:'now', t:'肺部結節屬 Lung-RADS 4B 以上，請轉介胸腔科，安排進一步影像或切片。'},
};
const CK_WHEN = {now:'盡快回診', m3:'3 個月內', m6:'半年內', y1:'下次健檢', long:'長期追蹤'};

/* ---------- 彙整：本次檢驗、歷次、所有判讀 ---------- */
function ckSortedReports(){ return [...CK.reports].sort((a, b)=> (b.date || '').localeCompare(a.date || '')); }
function ckCurrentRows(){
  const reps = ckSortedReports();
  if(reps.length) return reps[0].rows;
  return CK.manual || [];
}
// 某一項在歷次報告裡最近的一筆（比本次早）
function ckPrev(key, code){
  const reps = ckSortedReports().slice(1);
  for(const rp of reps){
    const r = rp.rows.find(x=> key ? x.key === key : x.code === code);
    if(r && String(r.raw || '').trim()) return {raw: r.raw, date: rp.date};
  }
  return null;
}
function ckCollect(){
  const P = ckPatient();
  const base = ckCurrentRows();
  const rows = [...base, ...ckModRows(base)].map(r=> ({...r, j: ckJudge(r, P), flag: ckFlag(r)}));
  const body = ckBodyJudge(P);
  const us = ckUsJudge();
  const mod = ckModJudge();
  const fib4 = ckFib4(rows, P);
  const cvIn = ckCvInputs(rows, P, body);
  const cv = {inp: cvIn, prevent: ckPrevent(cvIn), tw: ckTwcccc(cvIn)};
  const pub = ckPublic(P);
  const findings = [];
  const add = (g, html, adv)=> { if(g >= 1) findings.push({g, html, adv}); };
  if(body.bmi) add(body.bmi.g, `<b>BMI ${body.bmi.v.toFixed(1)}</b>，屬${body.bmi.cat}`, body.bmi.adv);
  if(body.waist) add(body.waist.g, `<b>腰圍 ${body.waist.v} 公分</b>，達${P.male ? '男' : '女'}性腹部肥胖標準 ${body.waist.cut} 公分`, 'weight');
  if(body.bp) add(body.bp.g, `<b>血壓 ${body.bp.s}/${body.bp.d} mmHg</b>，${body.bp.cat}`, 'bp');
  rows.forEach(r=>{
    if(r.j.g < 1) return;
    const name = r.key && CK_LAB_BY[r.key] ? CK_LAB_BY[r.key][2] : (r.zh || r.code);
    const unit = /^ratio$/i.test(r.unit || '') ? '' : r.unit === '%' ? '%' : r.unit ? ' ' + r.unit : '';
    add(r.j.g, `<b>${ckEsc(name)} ${ckEsc(r.raw)}${ckEsc(unit)}</b>，${r.j.d}`, r.j.adv);
  });
  if(fib4 && fib4.v != null) add(fib4.g, `<b>FIB-4 ${fib4.v.toFixed(2)}</b>，${fib4.d}`, fib4.adv);
  if(body.fat) add(body.fat.g, `<b>體脂肪率 ${body.fat.v}%</b>，高於${P.male ? '男' : '女'}性標準 ${body.fat.cut}%`, 'weight');
  if(body.visceral) add(body.visceral.g, `<b>內臟脂肪等級 ${body.visceral.v}</b>，${body.visceral.g === 2 ? '過高' : '偏高'}`, 'weight');
  us.forEach(u=> add(u.g, `<b>${u.area}超音波：${ckEsc(u.t)}</b>${u.d ? '，' + u.d : ''}`, u.adv));
  mod.forEach(u=> add(u.g, `<b>${u.area}：${ckEsc(u.t)}</b>${u.d ? '，' + u.d : ''}`, u.adv));
  findings.forEach((x, i)=> x.i = i);
  findings.sort((a, b)=> b.g - a.g || a.i - b.i);
  // 建議事項：異常與注意項目的建議，依時間分組，同類只列一次
  const advSeen = new Set(), advice = [];
  // B 肝帶原者表面抗體本來就是陰性，不建議打疫苗
  if(rows.some(r=> r.key === 'hbsag' && r.j.g >= 1)) advSeen.add('hbvvac');
  const push = key=>{ if(key && CK_ADV[key] && !advSeen.has(key)){ advSeen.add(key); advice.push({key, ...CK_ADV[key]}); } };
  findings.forEach(x=> push(x.adv));
  us.forEach(u=>{ if(u.g < 1) push(u.adv); });
  mod.forEach(u=>{ if(u.g < 1 && u.adv !== 'colon') push(u.adv); });
  // 大腸鏡間隔每個人不同，建議文字依結果產生
  const colon = mod.find(u=> u.colon);
  if(colon){
    const c = colon.colon;
    advice.push({key:'colon', when: c.when, t: c.when === 'now' ? '大腸鏡病理為癌，請盡快回診討論轉介與治療。' : `依這次大腸鏡結果（${c.d}），下次大腸鏡建議在 ${c.t}${/內$/.test(c.t) ? '' : '後'}。`});
  }
  const reps = ckSortedReports();
  return {P, rows, body, us, mod, fib4, cv, pub, findings, advice, reports: reps, current: reps[0] || null};
}

/* ---------- 畫面 ---------- */
function ckEl(id){ return KD.getElementById(id); }

function ckInitOpts(){
  KD.querySelectorAll('.k-opts[data-k]').forEach(box=>{
    box.innerHTML = box.dataset.opts.split('|').map(p=>{
      const i = p.indexOf(':');
      return `<button type="button" class="k-opt" data-v="${ckEsc(p.slice(0, i))}" aria-pressed="false">${ckEsc(p.slice(i + 1))}</button>`;
    }).join('');
    box.addEventListener('click', e=>{
      const b = e.target.closest('.k-opt'); if(!b) return;
      const path = box.dataset.k, v = b.dataset.v;
      if(box.dataset.multi){
        let cur = Array.isArray(ckGet(path)) ? [...ckGet(path)] : [];
        const excl = box.dataset.excl;
        if(cur.includes(v)) cur = cur.filter(x=> x !== v);
        else cur = v === excl ? [v] : [...cur.filter(x=> x !== excl), v];
        ckSet(path, cur);
      } else {
        ckSet(path, ckGet(path) === v ? '' : v);
      }
      ckChanged();
    });
  });
}

function ckRenderFields(){
  KD.querySelectorAll('input[data-k], textarea[data-k]').forEach(el=>{
    const v = ckGet(el.dataset.k);
    const s = v == null ? '' : String(v);
    if(el.value !== s && KD.activeElement !== el) el.value = s;
    el.classList.toggle('has-val', !!el.value);
    if(el.tagName === 'TEXTAREA') ckGrow(el);
  });
  KD.querySelectorAll('.k-opts[data-k]').forEach(box=>{
    const v = ckGet(box.dataset.k);
    box.querySelectorAll('.k-opt').forEach(b=>{
      const on = Array.isArray(v) ? v.includes(b.dataset.v) : v === b.dataset.v;
      b.setAttribute('aria-pressed', String(on));
    });
  });
  KD.querySelectorAll('[data-show]').forEach(el=>{
    const [path, val] = el.dataset.show.split(':');
    const v = ckGet(path);
    el.hidden = !(Array.isArray(v) ? v.includes(val) : v === val);
  });
  // data-show-not：有選擇、且不是指定值時才顯示
  KD.querySelectorAll('[data-show-not]').forEach(el=>{
    const [path, val] = el.dataset.showNot.split(':');
    const v = ckGet(path);
    el.hidden = !v || v === val;
  });
  ckEl('k-row-preg').hidden = CK.info.sex !== 'F';
}
function ckGrow(t){ t.style.height = 'auto'; t.style.height = (t.scrollHeight + 3) + 'px'; }

function ckRenderFiles(){
  const reps = ckSortedReports();
  ckEl('k-files').innerHTML = reps.map((r, i)=> `<div class="k-file">
    <span class="tag${i === 0 ? ' cur' : ''}">${i === 0 ? '本次' : '歷次'}</span>
    <span class="meta"><b>${ckEsc(r.date || '日期不明')}</b>${ckEsc(r.name || '')}　病歷號 ${ckEsc(r.chart || '—')}　${r.rows.length} 項${r.unverified ? '　<span class="g2">未審核</span>' : ''}${CK_PAGES[r.id] ? '' : '　（原始報告圖片需重新上傳）'}</span>
    <button class="del" data-del="${r.id}">移除</button></div>`).join('');
  const charts = [...new Set(reps.map(r=> r.chart).filter(Boolean))];
  const w = ckEl('k-warn-id');
  w.hidden = charts.length <= 1;
  w.textContent = charts.length > 1 ? `上傳的報告病歷號不一致（${charts.join('、')}），請確認是不是同一位病人。` : '';
  const u = ckEl('k-warn-unv');
  u.hidden = !(reps[0] && reps[0].unverified);
  u.textContent = '本次報告標示「未審核」，檢驗所審核後數值可能修正，正式交給病人前請以審核後的報告為準。';
}

function ckRenderLab(){
  const box = ckEl('k-lab-box');
  const P = ckPatient();
  const rows = ckCurrentRows();
  if(!rows.length){ box.innerHTML = '<div class="k-empty">尚未上傳檢驗報告。</div>'; return; }
  const hasPrev = ckSortedReports().length > 1;
  let sec = null, html = '';
  rows.forEach((r, i)=>{
    if(r.sec !== sec){ sec = r.sec; html += `<tr class="sec"><td colspan="${hasPrev ? 5 : 4}">${ckEsc(sec || '其他')}</td></tr>`; }
    const j = ckJudge(r, P), f = ckFlag(r);
    const pv = hasPrev ? ckPrev(r.key, r.code) : null;
    html += `<tr><td class="nm">${ckEsc(r.zh || (CK_LAB_BY[r.key] || [])[2] || r.code)}<small>${ckEsc(r.code)}</small></td>` +
      `<td class="v"><input type="text" data-row="${i}" value="${ckEsc(r.raw)}"> <span class="${f === 'H' ? 'g2' : 'g0'}">${f === 'H' ? '↑' : f === 'L' ? '↓' : ''}</span> <small style="color:var(--k-faint)">${ckEsc(r.unit || '')}</small></td>` +
      (hasPrev ? `<td class="prev">${pv ? ckEsc(pv.raw) + ' <small>' + ckEsc(pv.date.slice(0, 7)) + '</small>' : '—'}</td>` : '') +
      `<td class="ref">${ckEsc(r.ref || '')}</td>` +
      `<td class="g ${j.g < 0 ? 'gna' : 'g' + j.g}">${j.pill || (j.g < 0 ? '—' : ['正常', '注意', '異常'][j.g])}</td></tr>`;
  });
  box.innerHTML = `<table class="k-lab"><thead><tr><th>項目</th><th>本次</th>${hasPrev ? '<th>上次</th>' : ''}<th>參考區間</th><th>判讀</th></tr></thead><tbody>${html}</tbody></table>`;
}

function ckRenderFind(){
  const d = ckCollect();
  const box = ckEl('k-find');
  if(!d.findings.length){ box.innerHTML = '<div class="k-empty" style="display:block">目前沒有判讀為「注意」或「異常」的項目。</div>'; }
  else box.innerHTML = d.findings.map(x=> `<div><span class="g${x.g}">${x.g === 2 ? '異常' : '注意'}</span><span>${x.html}</span></div>`).join('');
  if(d.fib4 && d.fib4.miss) box.insertAdjacentHTML('beforeend', `<div><span class="gna">提醒</span><span>FIB-4 無法計算：缺${d.fib4.miss.join('、')}。</span></div>`);
  const b = d.body.bmi;
  ckEl('k-bmi').innerHTML = b ? `BMI <b>${b.v.toFixed(1)}</b>　<span class="g${b.g}">${b.cat}</span>` : '';
  const cn = ckColonNext();
  ckEl('k-colon-next').innerHTML = cn ? `下次大腸鏡：<b>${ckEsc(cn.t)}</b>　<span class="g${cn.g}">${ckEsc(cn.d)}</span>` : '';
  ckRenderCv(d);
  ckRenderPub(d);
}

const ckPct = v=> (Math.round(v * 1000) / 10).toFixed(1) + '%';
function ckRenderCv(d){
  const {prevent: pv, tw, inp} = d.cv;
  const why = x=> x.na ? x.na : x.miss ? `缺${x.miss.join('、')}，無法計算。` : x.range ? `超出模型適用範圍：${x.range.join('、')}。` : '';
  const pvHtml = why(pv) ? `<p class="k-note">${ckEsc(why(pv))}</p>` :
    `<table><tr><td>10 年總心血管疾病</td><td class="n">${ckPct(pv.cvd10)}</td></tr><tr><td>10 年動脈硬化心血管疾病</td><td class="n">${ckPct(pv.ascvd10)}</td></tr>` +
    (pv.cvd30 != null ? `<tr><td>30 年總心血管疾病</td><td class="n">${ckPct(pv.cvd30)}</td></tr><tr><td>30 年動脈硬化心血管疾病</td><td class="n">${ckPct(pv.ascvd30)}</td></tr>` : '') +
    `</table><p class="k-note">${pv.model === 'HbA1c' ? '使用含 HbA1c 的模型' : '沒有 HbA1c，使用基本模型'}。糖尿病${inp.dm ? '有' : '無'}、吸菸${inp.smoke ? '有' : '無'}、降壓藥${inp.bptx ? '有' : '無'}、降血脂藥${inp.statin ? '有' : '無'}（依病史欄位）。</p>`;
  const P = tw.parts;
  const twHtml = why(tw) ? `<p class="k-note">${ckEsc(why(tw))}</p>` :
    `<table><tr><td>10 年冠心病風險</td><td class="n">${ckPct(tw.risk)}</td></tr><tr><td>總分</td><td class="n">${tw.pts} 分</td></tr></table>` +
    `<p class="k-note">年齡 ${P.age}、性別 ${P.sex}、BMI ${P.bmi}、收縮壓 ${P.sbp}、LDL ${P.ldl}、HDL ${P.hdl}、吸菸 ${P.smoke}。` +
    `<span class="k-tbc">待確認</span> 原表收縮壓另有一列「&lt; 110 → 5 分」與第一列矛盾，目前採 0 至 4 分。</p>`;
  let warn = '';
  if(!inp.dm && ((inp.a1c != null && inp.a1c >= 6.5) || (inp.glu != null && inp.glu >= 126)))
    warn = '<p class="k-note" style="color:#A23B2A">血糖已達糖尿病診斷值，但病史沒有勾選糖尿病；計算時視為沒有糖尿病。</p>';
  ckEl('k-cv').innerHTML = `<div class="k-cvg"><div><h4>PREVENT<small>美國心臟學會 2023</small></h4>${pvHtml}</div><div><h4>TwCCCC<small>台灣心臟學會 2023</small></h4>${twHtml}</div></div>${warn}`;
}
function ckRenderPub(d){
  const box = ckEl('k-pub');
  if(d.P.age == null){ box.innerHTML = '<div class="k-empty" style="display:block">請先填年齡。</div>'; return; }
  box.innerHTML = d.pub.length ? `<table class="k-pubt">${d.pub.map(x=> `<tr><td>${x.t}${x.tbc ? '<span class="k-tbc">待確認</span>' : ''}</td><td>${x.rule}${x.done ? `<br><small>${ckEsc(x.done)}</small>` : ''}</td></tr>`).join('')}</table>` +
    '<p class="k-note">只依年齡、性別、家族史與吸菸判斷，間隔從上次篩檢起算；病人實際資格以健保卡查詢紀錄為準。</p>'
    : '<div class="k-empty" style="display:block">依目前資料，沒有符合資格的公費篩檢。</div>';
}

function ckRenderNav(){
  const has = {
    upload: CK.reports.length > 0 || !!(CK.manual && CK.manual.length),
    info: !!(CK.info.name && CK.info.sex && CK.info.age),
    body: !!(CK.body.h && CK.body.w),
    hx: !!CK.hx.smoke,
    lab: ckCurrentRows().some(r=> String(r.raw || '').trim()),
    us: !!((CK.us.abd || []).length || (CK.us.thy || []).length),
    mod: Object.values(CK.mod || {}).some(v=> Array.isArray(v) ? v.length : String(v || '').trim()),
    cv: (()=>{ const c = ckCollect().cv; return c.prevent.cvd10 != null || c.tw.risk != null; })(),
    pub: ckNum(CK.info.age) != null,
    comment: !!String(CK.comment || '').trim()
  };
  KD.querySelectorAll('.k-nav a[data-sec]').forEach(a=> a.classList.toggle('done', !!has[a.dataset.sec]));
}

function ckRenderAll(){ ckRenderFields(); ckRenderFiles(); ckRenderLab(); ckRenderFind(); ckRenderNav(); }

let ckSaveTimer = null;
function ckSave(){
  clearTimeout(ckSaveTimer);
  ckSaveTimer = setTimeout(()=>{ try{ localStorage.setItem(CK_DRAFT, JSON.stringify(CK)); }catch(e){} }, 400);
}
function ckChanged(opts){
  ckSave();
  ckRenderFields();
  if(!opts || !opts.keepLab) ckRenderLab();
  ckRenderFind();
  ckRenderNav();
}

/* ---------- 上傳 ---------- */
async function ckAddFiles(files){
  const list = [...files].filter(f=> f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
  if(!list.length){ alert('請選擇優品醫事檢驗所的 PDF 檔。'); return; }
  const drop = ckEl('k-drop'), orig = drop.innerHTML;
  drop.innerHTML = '<b>讀取中…</b>';
  for(const f of list){
    try{
      const {rep, pages} = await ckParsePdf(f);
      if(!rep.rows.length){ alert(`${f.name} 讀不到檢驗項目，可能不是優品的報告格式，請改用手動輸入。`); continue; }
      // 同一份報告（檢體編號相同）重複上傳時取代舊的
      CK.reports = CK.reports.filter(r=> !(rep.sid && r.sid === rep.sid));
      CK.reports.push(rep);
      CK_PAGES[rep.id] = pages;
    }catch(err){
      console.error(err);
      alert(`${f.name} 讀取失敗：${err.message}`);
    }
  }
  drop.innerHTML = orig;
  CK.manual = null;
  // 基本資料以本次（日期最新）的報告帶入，已經填過的欄位不覆蓋
  const cur = ckSortedReports()[0];
  if(cur){
    const fill = (k, v)=>{ if(v && !CK.info[k]) CK.info[k] = v; };
    fill('name', cur.name); fill('chart', cur.chart); fill('sex', cur.sex); fill('birth', cur.birth); fill('date', cur.date);
    if(!CK.info.age){ const a = ckAgeAt(cur.birth, cur.date); CK.info.age = a != null ? String(a) : (cur.age || ''); }
  }
  ckSave();
  ckRenderAll();
}

/* ---------- 啟動 ---------- */
(function ckInit(){
  try{ const s = JSON.parse(localStorage.getItem(CK_DRAFT)); if(s && typeof s === 'object') CK = Object.assign(ckBlank(), s); }catch(e){}
  ckInitOpts();
  ckEl('k-rev').textContent = '最後改版：' + CK_REVISION;

  KD.addEventListener('input', e=>{
    const el = e.target;
    if(el.dataset.k){
      ckSet(el.dataset.k, el.value);
      // 出生日期或檢查日期改了，重算年齡
      if(el.dataset.k === 'info.birth' || el.dataset.k === 'info.date'){
        const a = ckAgeAt(CK.info.birth, CK.info.date);
        if(a != null){ CK.info.age = String(a); const ag = KD.querySelector('[data-k="info.age"]'); if(ag) ag.value = a; }
      }
      if(el.tagName === 'TEXTAREA') ckGrow(el);
      el.classList.toggle('has-val', !!el.value);
      ckChanged();
    } else if(el.dataset.row != null){
      const rows = ckCurrentRows(), r = rows[+el.dataset.row];
      if(r){ r.raw = el.value; ckSave(); ckRenderFind(); ckRenderNav(); }
    }
  });
  // 檢驗值改完離開欄位時，才重畫表格（↑↓ 與判讀），輸入中不打斷
  KD.addEventListener('change', e=>{ if(e.target.dataset.row != null) ckRenderLab(); });
  // 數字欄位：點進去全選、Enter 跳下一格、滾輪不改數值
  KD.addEventListener('focusin', e=>{ if(e.target.matches('input[type=number], input[type=text]')) setTimeout(()=> e.target.select(), 0); });
  KD.addEventListener('keydown', e=>{
    if(e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const all = [...KD.querySelectorAll('input:not([type=file]), textarea')].filter(x=> x.offsetParent);
    const n = all[all.indexOf(e.target) + 1];
    if(n) n.focus();
  });
  KD.addEventListener('wheel', e=>{ if(e.target.matches('input[type=number]') && KD.activeElement === e.target) e.target.blur(); }, {passive:true});

  KD.querySelectorAll('.k-nav a[data-sec]').forEach(a=> a.addEventListener('click', ()=>{
    const s = ckEl('k-sec-' + a.dataset.sec);
    if(s) KB.scrollTo({top: s.offsetTop - 16, behavior: 'smooth'});
  }));

  const drop = ckEl('k-drop'), fi = ckEl('k-file');
  drop.addEventListener('click', ()=> fi.click());
  fi.addEventListener('change', ()=>{ ckAddFiles(fi.files); fi.value = ''; });
  drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', ()=> drop.classList.remove('over'));
  drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('over'); ckAddFiles(e.dataTransfer.files); });
  ckEl('k-files').addEventListener('click', e=>{
    const id = e.target.dataset && e.target.dataset.del;
    if(!id) return;
    CK.reports = CK.reports.filter(r=> r.id !== id);
    delete CK_PAGES[id];
    ckSave(); ckRenderAll();
  });
  ckEl('k-lab-manual').addEventListener('click', ()=>{
    if(CK.reports.length && !confirm('已經有上傳的報告。改成手動輸入會清掉上傳的報告，確定嗎？')) return;
    CK.reports = [];
    CK.manual = CK_MANUAL_KEYS.map(k=>{
      const x = CK_LAB_BY[k], rf = CK_MANUAL_REF[k];
      const ref = Array.isArray(rf) ? rf[CK.info.sex === 'F' ? 1 : 0] : (rf || '');
      return {key: k, code: '', zh: x[2], raw: '', ref, unit: x[4], sec: x[3], labFlag: ''};
    });
    ckSave(); ckRenderAll();
  });
  ckEl('k-draft').addEventListener('click', ()=>{
    if(String(CK.comment || '').trim() && !confirm('會取代目前的醫師評語，確定嗎？')) return;
    CK.comment = ckDraftComment(ckCollect());
    ckRenderFields(); ckSave(); ckRenderNav();
  });
  ckEl('k-us-import').addEventListener('click', ()=>{
    const ta = ckEl('k-us-paste'), box = ckEl('k-us-msg');
    if(((CK.us.abd || []).length || (CK.us.thy || []).length) && !confirm('會取代目前超音波的勾選，確定嗎？')) return;
    const r = ckImportUs(ta.value);
    box.innerHTML = (r.done || []).map(t=> `<div><span class="g0">已帶入</span><span>${ckEsc(t)}</span></div>`).join('') +
      r.msg.map(t=> `<div><span class="${r.ok ? 'g1' : 'g2'}">${r.ok ? '請確認' : '無法帶入'}</span><span>${ckEsc(t)}</span></div>`).join('');
    if(r.ok){ ta.value = ''; ckChanged(); }
  });
  ckEl('k-line').addEventListener('click', ()=> ckLinePreview());
  ckEl('k-preview').addEventListener('click', ()=> ckPreview());
  ckEl('k-print').addEventListener('click', ()=> ckPrint());

  ckRenderAll();
})();
