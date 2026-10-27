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
function ckBlank(){ return {info:{}, body:{}, hx:{}, us:{}, comment:'', reports:[], manual:null}; }

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
    case 'afp': case 'cea': case 'psa': case 'fpsa':
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
};
const CK_WHEN = {now:'盡快回診', m3:'3 個月內', m6:'半年內', y1:'下次健檢'};

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
  const rows = ckCurrentRows().map(r=> ({...r, j: ckJudge(r, P), flag: ckFlag(r)}));
  const body = ckBodyJudge(P);
  const us = ckUsJudge();
  const fib4 = ckFib4(rows, P);
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
  findings.forEach((x, i)=> x.i = i);
  findings.sort((a, b)=> b.g - a.g || a.i - b.i);
  // 建議事項：異常與注意項目的建議，依時間分組，同類只列一次
  const advSeen = new Set(), advice = [];
  findings.forEach(x=>{ if(x.adv && CK_ADV[x.adv] && !advSeen.has(x.adv)){ advSeen.add(x.adv); advice.push({key: x.adv, ...CK_ADV[x.adv]}); } });
  us.forEach(u=>{ if(u.g < 1 && u.adv && CK_ADV[u.adv] && !advSeen.has(u.adv)){ advSeen.add(u.adv); advice.push({key: u.adv, ...CK_ADV[u.adv]}); } });
  const reps = ckSortedReports();
  return {P, rows, body, us, fib4, findings, advice, reports: reps, current: reps[0] || null};
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
}

function ckRenderNav(){
  const has = {
    upload: CK.reports.length > 0 || !!(CK.manual && CK.manual.length),
    info: !!(CK.info.name && CK.info.sex && CK.info.age),
    body: !!(CK.body.h && CK.body.w),
    hx: !!CK.hx.smoke,
    lab: ckCurrentRows().some(r=> String(r.raw || '').trim()),
    us: !!((CK.us.abd || []).length || (CK.us.thy || []).length),
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
  ckEl('k-preview').addEventListener('click', ()=> ckPreview());
  ckEl('k-print').addEventListener('click', ()=> ckPrint());

  ckRenderAll();
})();
