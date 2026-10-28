/* 健檢報告：輸入畫面與判讀整合。檢驗項目、優品 PDF 擷取與單項判讀規則在 ../lab/lab.js（與減重報告共用）；報告排版在 report.js。
   畫面在 view.html（裝進 #checkup-host 的 shadow root），一律用 KD 找元素、KB 處理捲動，不可直接用 document。
   所有全域名稱都以 ck／CK 開頭，避免和同一頁的減重報告、臨床計算撞名。 */
const CK_REVISION = '2026-10-28';
const CK_DRAFT = 'checkup_draft_v1';

/* ---------- 資料 ----------
   CK.reports：上傳的檢驗報告（可多份），日期最新的是本次，其餘當作歷次比較。
   CK.manual：沒有 PDF 時手動輸入的檢驗列。PDF 轉出的頁面圖片只放記憶體（CK_PAGES），不存進暫存。 */
let CK = ckBlank();
const CK_PAGES = {};
function ckBlank(){ return {info:{}, body:{}, hx:{}, us:{}, mod:{}, att:[], fu:{}, fuAdd:[], comment:'', reports:[], manual:null, warn:null}; }

function ckGet(path){ return path.split('.').reduce((o, k)=> o == null ? undefined : o[k], CK); }
// 報告「提早就醫」：CK.warn 沒改過（null）就用預設文字；醫師改過就照改過的存檔與列印
const CK_WARN_DEFAULT = '胸痛、呼吸困難、單側肢體無力或說話不清楚，請立即就醫。\n解黑便、吐血、皮膚或眼白變黃，請盡快回診。';
function ckWarnText(){ return CK.warn == null ? CK_WARN_DEFAULT : String(CK.warn); }
function ckSet(path, v){
  const ks = path.split('.'), last = ks.pop();
  const o = ks.reduce((o, k)=> (o[k] = o[k] || {}), CK);
  o[last] = v;
}
function ckEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function ckToday(){ const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }
function ckAgeAt(birth, date){
  if(!birth || !date) return null;
  const b = new Date(birth + 'T00:00:00'), d = new Date(date + 'T00:00:00');
  let a = d.getFullYear() - b.getFullYear();
  if(d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a;
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
  // 下列判讀標準與減重報告相同（weight/report.js rBodyMeta）：SMI 依 AWGS 2019 生物電阻抗切點
  const smi = ckNum(b.smi);
  if(smi != null){ const cut = P.male ? 7.0 : 5.7; out.smi = {v: smi, cut, g: smi < cut ? 1 : 0, adv:'smi'}; }
  const pa = ckNum(b.phaseangle);
  if(pa != null) out.phase = {v: pa, g: pa < 4.5 ? 1 : 0, adv:'phase'};
  const wt = ckNum(b.water);
  if(wt != null){ const lo = P.male ? 50 : 45, hi = P.male ? 65 : 60; out.water = {v: wt, lo, hi, g: wt < lo || wt > hi ? 1 : 0}; }
  const ba = ckNum(b.bodyage);
  if(ba != null) out.bodyage = {v: ba, g: P.age != null && ba > P.age ? 1 : 0};
  // 身體組成分型與訓練主軸：沿用減重報告的分型規則
  if(out.bmi && typeof classifyExercisePhenotype === 'function'){
    try{
      const p = classifyExercisePhenotype(P.male ? 'M' : 'F', out.bmi.v, fat == null ? NaN : fat, smi == null ? NaN : smi, pa == null ? NaN : pa);
      const rx = typeof EXERCISE_PRESCRIPTIONS !== 'undefined' ? EXERCISE_PRESCRIPTIONS[p] : null;
      out.pheno = {t: p, focus: rx ? rx.focus : '', partial: smi == null || pa == null, hasComp: fat != null || smi != null || pa != null};
    }catch(e){}
  }
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

/* ---------- 附件：超音波、胃腸鏡、病理、TANITA 等報告 ----------
   PDF 有文字層就讀文字自動判讀，並把每頁轉成圖片附在報告最後；掃描檔或照片只附圖片，內容要手動輸入。
   CK.att 只存檔名與種類（會進暫存），圖片放 CK_PAGES，重新整理後要重新上傳。 */
const CK_ATT_KIND = {
  tanita:'TANITA 身體組成', us:'超音波報告', egd:'胃鏡報告', egdpath:'胃鏡病理報告', colon:'大腸鏡報告', colonpath:'大腸鏡病理報告',
  ecg:'心電圖', carotid:'頸動脈超音波報告', ldct:'低劑量肺部電腦斷層報告'
};
// 讀 PDF：pages 每頁圖片；lines 依 y 座標排成列（判讀英文報告用）；flat 每頁項目以空白串接（和減重報告的 TANITA 擷取同格式）
async function ckPdfRead(file){
  await ensurePdfjs();
  if(typeof pdfjsLib === 'undefined') throw new Error('PDF 元件載入失敗，請連網後重新整理');
  const pdf = await pdfjsLib.getDocument({data: await file.arrayBuffer()}).promise;
  const pages = [], lines = [], flat = [];
  for(let i = 1; i <= pdf.numPages; i++){
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    flat.push(tc.items.map(it=> it.str).join(' '));
    lines.push(...pdfTextLines(tc));
    const vp = page.getViewport({scale: 1.6});
    const cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height;
    try{ await page.render({canvasContext: cv.getContext('2d'), viewport: vp, intent: 'print'}).promise; pages.push(cv.toDataURL('image/jpeg', .85)); }catch(e){ console.warn(e); }
  }
  return {pages, text: lines.join('\n'), flat: flat.join('\n')};
}
function ckReadImage(file){ return new Promise(r=>{ const fr = new FileReader(); fr.onload = ()=> r(fr.result); fr.onerror = ()=> r(''); fr.readAsDataURL(file); }); }

// 病理報告只取「診斷」段落放進摘要，表頭、檢體資料、肉眼與顯微描述都留在附件原文
function ckPathDx(text){
  const s = String(text || '');
  // 只認行首的「DIAGNOSIS：」，表頭的「臨床診斷 Clinical Diagnosis」「病理診斷與臨床診斷比較」不算
  const m = s.match(/(^|\n)[ \t]*(病理診斷|診斷結果|PATHOLOGIC(?:AL)? DIAGNOSIS|DIAGNOSIS)[ \t]*[:：]/i);
  if(!m) return '';
  let t = s.slice(m.index + m[0].length);
  const end = t.search(/\n\s*(GROSS|MICROSCOP|COMMENT|NOTE|肉眼|顯微|巨觀|備註|報告醫師|病理醫師|簽核)/i);
  if(end > 0) t = t.slice(0, end);
  t = t.trim();
  return t.length > 500 ? t.slice(0, 500) + '……' : t;
}
// 上傳後依種類判讀；回傳 {done:[], msg:[]}
function ckAttParse(kind, text, flat, fname){
  if(!String(text || '').trim()) return {done: [], msg: ['這個 PDF 沒有文字層（可能是掃描檔），已附在報告後面，內容請手動輸入']};
  if(kind === 'tanita') return ckImportTanita(flat || text, text, fname || '');
  if(kind === 'us'){ const r = ckImportUs(text); return r.ok ? r : {done: [], msg: ['讀不出超音波發現，已附在報告後面，請手動勾選']}; }
  if(kind === 'egd' || kind === 'colon'){ const r = ckImportScope(text, kind); return r.ok ? r : {done: [], msg: ['讀不出內視鏡發現，已附在報告後面，請手動勾選']}; }
  if(kind === 'egdpath' || kind === 'colonpath'){
    const k = kind === 'egdpath' ? 'egdPathNote' : 'colonPathNote';
    const dx = ckPathDx(text);
    if(dx && !String(CK.mod[k] || '').trim()) CK.mod[k] = dx;
    return ckImportPath(kind === 'egdpath' ? 'egd' : 'colon', text);
  }
  return {done: [], msg: []};
}
// 圖片與掃描檔：用 Tesseract.js 在瀏覽器裡辨識英文（圖片不會上傳到任何地方，只下載辨識引擎與英文字庫）
const CK_OCR_KINDS = ['us', 'egd', 'colon', 'egdpath', 'colonpath'];
let ckOcrLoad = null;
function ckEnsureOcr(){
  if(window.Tesseract) return Promise.resolve();
  return ckOcrLoad || (ckOcrLoad = new Promise((ok, no)=>{
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js';
    s.onload = ok; s.onerror = ()=>{ ckOcrLoad = null; no(new Error('影像辨識元件載入失敗，請確認網路')); };
    document.head.appendChild(s);
  }));
}
async function ckOcr(srcs){
  await ckEnsureOcr();
  const w = await Tesseract.createWorker('eng');
  let t = '';
  try{ for(const s of srcs) t += (await w.recognize(s)).data.text + '\n'; }
  finally{ await w.terminate(); }
  return t;
}
async function ckAttach(kind, files){
  const box = KD.querySelector(`.k-att[data-att="${kind}"]`);
  const msgBox = box && box.querySelector('.k-amsg');
  const out = {done: [], msg: []};
  for(const f of [...files]){
    const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name), isImg = /^image\/(jpeg|png|webp)$/.test(f.type);
    if(!isPdf && !isImg){ out.msg.push(`${f.name} 不是 PDF 或圖片（JPG、PNG），已略過`); continue; }
    const id = 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    try{
      let text = '', flat = '', ocr = false;
      if(isImg){
        CK_PAGES[id] = [await ckReadImage(f)];
      } else {
        const r = await ckPdfRead(f);
        CK_PAGES[id] = r.pages; text = r.text; flat = r.flat;
      }
      if(!text.trim() && CK_OCR_KINDS.includes(kind)){
        if(msgBox) msgBox.innerHTML = `<div><span class="g1">辨識中</span><span>${ckEsc(f.name)}：正在辨識圖片文字，約需 5 至 20 秒</span></div>`;
        try{ text = flat = await ckOcr(CK_PAGES[id]); ocr = true; }
        catch(err){ out.msg.push(`${f.name}：${err.message}，已附在報告後面，內容請手動輸入`); }
      }
      if(text.trim()){
        const p = ckAttParse(kind, text, flat, f.name);
        out.done.push(...p.done); out.msg.push(...p.msg);
        if(ocr) out.msg.push(`${f.name} 是用影像辨識讀出的文字，請逐項核對勾選結果`);
      } else if(isImg || ocr) out.msg.push(`${f.name} 讀不到文字，已附在報告後面；內容請手動輸入`);
      else if(!ocr) { const p = ckAttParse(kind, '', ''); out.msg.push(...p.msg); }
      CK.att.push({id, kind, name: f.name});
      ckPagesUnsaved = true;
    }catch(err){ console.error(err); out.msg.push(`${f.name} 讀取失敗：${err.message}`); }
  }
  ckSave();
  ckChanged();
  ckRenderAtt();
  if(msgBox) msgBox.innerHTML = out.done.map(t=> `<div><span class="g0">已帶入</span><span>${ckEsc(t)}</span></div>`).join('') +
    out.msg.map(t=> `<div><span class="g1">請確認</span><span>${ckEsc(t)}</span></div>`).join('');
}
function ckInitAtt(){
  KD.querySelectorAll('.k-att[data-att]').forEach(box=>{
    const kind = box.dataset.att;
    box.innerHTML = `<div class="k-adrop" tabindex="0"><b>上傳${ckEsc(box.dataset.label || CK_ATT_KIND[kind])}</b>PDF 或圖片，可拖曳多個檔案；截圖可以點一下這裡再按 Ctrl＋V 貼上</div>` +
      `<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple hidden><div class="k-alist"></div><div class="k-find k-amsg"></div>`;
    const drop = box.querySelector('.k-adrop'), fi = box.querySelector('input');
    drop.addEventListener('click', ()=> fi.click());
    // 網頁版病理報告：Win＋Shift＋S 截圖後直接貼上
    drop.addEventListener('paste', e=>{
      const imgs = [...(e.clipboardData ? e.clipboardData.items : [])].filter(it=> it.kind === 'file' && /^image\//.test(it.type))
        .map((it, i)=> { const b = it.getAsFile(); return new File([b], `截圖${i ? i + 1 : ''}.png`, {type: b.type}); });
      if(imgs.length){ e.preventDefault(); ckAttach(kind, imgs); }
    });
    fi.addEventListener('change', ()=>{ ckAttach(kind, fi.files); fi.value = ''; });
    drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', ()=> drop.classList.remove('over'));
    drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('over'); ckAttach(kind, e.dataTransfer.files); });
    box.querySelector('.k-alist').addEventListener('click', e=>{
      const id = e.target.dataset && e.target.dataset.adel;
      if(!id) return;
      CK.att = CK.att.filter(a=> a.id !== id);
      delete CK_PAGES[id];
      // TANITA 全部移除後，下一份上傳的不論日期都可以帶入
      if(!CK.att.some(a=> a.kind === 'tanita')) delete CK.tanitaDate;
      ckSave(); ckRenderAtt();
    });
  });
}
function ckRenderAtt(){
  KD.querySelectorAll('.k-att[data-att]').forEach(box=>{
    const list = CK.att.filter(a=> a.kind === box.dataset.att);
    box.querySelector('.k-alist').innerHTML = list.map(a=>{
      const pg = CK_PAGES[a.id];
      return `<div class="k-aitem">${pg && pg[0] ? `<img src="${pg[0]}" alt="">` : ''}<span>${ckEsc(a.name)}${pg ? `（${pg.length} 頁）` : '（需重新上傳）'}</span><button data-adel="${a.id}">移除</button></div>`;
    }).join('');
  });
}

/* TANITA：和減重報告共用同一份判讀（tanitaParse，在 weight/app.js），擷取結果是關鍵字比對，帶入後欄位要人工核對。
   帶入規則和減重報告相同：欄位空白、或目前的值本來就是上傳帶入的（CK.bodySrc 有記錄）才寫入，自己輸入或改過的值不覆蓋。
   有多份時以量測日期最新的為準（CK.tanitaDate 記錄已帶入那份的日期），比它舊的報告只附圖、不帶數值。
   姓名不從 TANITA 帶入：報表印的是「名 姓」順序，姓名維持從抽血報告帶入。 */
const CK_TANITA_KEY = {weight:'w', height:'h', fat:'fat', fatmass:'fatmass', muscle:'muscle', visceral:'visceral', water:'water', bmr:'bmr', bodyage:'bodyage', smi:'smi', phaseangle:'phaseangle'};
function ckImportTanita(flat, lineText, fname){
  if(typeof tanitaParse !== 'function') return {done: [], msg: ['減重報告的擷取元件沒有載入，請重新整理']};
  const date = tanitaDate(flat);
  if(date && CK.tanitaDate && date < CK.tanitaDate)
    return {done: [], msg: [`${fname} 的量測日期 ${date} 比已帶入的 TANITA（${CK.tanitaDate}）舊，只附在報告後面，數值沒有帶入`]};
  const {f, bad, notes} = tanitaParse(flat, lineText, CK.body.h, !(CK.bodySrc && CK.bodySrc.h));
  if(!Object.keys(f).length) return {done: [], msg: ['讀不到 TANITA 數值，已附在報告後面，請手動輸入'].concat(bad.length ? [`超出合理範圍、沒有採用：${bad.join('、')}`] : [])};
  CK.bodySrc = CK.bodySrc || {};
  const got = [], kept = [];
  Object.keys(f).forEach(src=>{
    const k = CK_TANITA_KEY[src];
    if(!k) return;
    const cur = String(CK.body[k] == null ? '' : CK.body[k]).trim();
    if(cur && !CK.bodySrc[k]){
      if(parseFloat(cur) !== parseFloat(f[src])) kept.push(`${TANITA_NAMES[src]}（欄位 ${cur}，報告 ${f[src]}）`);
      return;
    }
    CK.body[k] = String(f[src]);
    CK.bodySrc[k] = 'upload';
    got.push(TANITA_NAMES[src]);
  });
  if(date) CK.tanitaDate = date;
  const msg = ['擷取結果是關鍵字比對，請核對數值；欄位旁標示「上傳」，改過就會消失', '姓名不從 TANITA 帶入，維持從抽血報告帶入'];
  if(kept.length) msg.push(`以下欄位已有自己輸入的數值，沒有覆蓋：${kept.join('、')}。要改用報告的數值，請直接修改欄位`);
  if(bad.length) msg.push(`以下數值超出合理範圍，沒有採用，請對照原始報告手動輸入：${bad.join('、')}`);
  msg.push(...notes);
  return {done: got.length ? [`TANITA：${got.join('、')}`] : [], msg};
}

/* 報告工具的英文胃鏡（ESOPHAGOGASTRODUODENOSCOPY）與大腸鏡（COLONOSCOPY）報告：
   依 FINDINGS 與 IMPRESSION 的關鍵字勾選診斷與處置；病理要等病理報告。 */
function ckImportScope(text, only){
  const T = String(text || '').replace(/\r/g, '');
  const cut = re=>{ const m = re.exec(T); if(!m) return null; const rest = T.slice(m.index + m[0].length); const e = rest.search(/(ESOPHAGOGASTRODUODENOSCOPY|COLONOSCOPY) \(/i); return e < 0 ? rest : rest.slice(0, e); };
  let E = cut(/ESOPHAGOGASTRODUODENOSCOPY \(EGD\) REPORT/i), C = cut(/COLONOSCOPY \(CFS\) REPORT/i);
  // 沒有標題時（只貼了部分內容），依上傳位置或關鍵字判斷
  if(E == null && C == null){
    if(only === 'egd' || (!only && /esophag|stomach|duoden/i.test(T))) E = T;
    else if(only === 'colon' || (!only && /colon|rectum|cecum|sigmoid/i.test(T))) C = T;
  }
  const done = [], msg = [], M = CK.mod;
  const has = (s, re)=> re.test(s);
  if(E != null){
    const s = E, dx = [], proc = [];
    if(has(s, /reflux esophagitis|LA grade/i)) dx.push('gerd');
    if(has(s, /barrett/i)) dx.push('barrett');
    if(has(s, /hiatal hernia/i)) dx.push('hernia');
    if(has(s, /atrophic gastritis|atrophy/i)) dx.push('atrophy');
    if(has(s, /intestinal metaplasia/i)) dx.push('im');
    if(has(s, /erosive gastritis|erosions?\b/i)) dx.push('erosive');
    if(has(s, /gastritis/i) && !dx.some(k=> ['atrophy', 'im', 'erosive'].includes(k))) dx.push('gastritis');
    if(has(s, /gastric ulcer/i)) dx.push('ulcer');
    if(has(s, /duodenal ulcer/i)) dx.push('duoulcer');
    if(has(s, /duodenitis/i)) dx.push('duodenitis');
    if(has(s, /fundic gland polyp/i)) dx.push('fgp');
    else if(has(s, /gastric polyp|polypoid lesion/i)) dx.push('polyp');
    if(has(s, /malignan|carcinoma|cancer|borrmann|suspect.*tumor/i)) dx.push('tumor');
    if(has(s, /biopsy/i)) proc.push('biopsy');
    if(has(s, /CLO|rapid urease/i)) proc.push('clo');
    if(has(s, /polypectomy|EMR|mucosal resection/i)) proc.push('polypectomy');
    if(has(s, /hemostasis/i)) proc.push('hemostasis');
    M.egd = dx.length ? dx : (has(s, /no significant abnormality/i) ? ['normal'] : []);
    M.egdProc = proc;
    if(/CLO[^.\n]*positive/i.test(s)) M.clo = 'pos'; else if(/CLO[^.\n]*negative/i.test(s)) M.clo = 'neg';
    const imp = (/IMPRESSION:\s*\n?([^\n]*)/i.exec(s) || [])[1];
    if(imp && !String(M.egdNote || '').trim()) M.egdNote = imp.trim();
    if(M.egd.length) done.push('胃鏡：' + M.egd.map(k=> CK_EGD[k].t).join('、'));
    else msg.push('胃鏡沒有對應到選項，請手動勾選');
  }
  if(C != null){
    const s = C, dx = [], proc = [];
    if(has(s, /polypoid lesion|colon polyp|polyps?\b/i)) dx.push('polyp');
    if(has(s, /hemorrhoid/i)) dx.push('hemorrhoid');
    if(has(s, /diverticul/i)) dx.push('divert');
    if(has(s, /colitis/i)) dx.push('colitis');
    if(has(s, /malignan|carcinoma|cancer|suspect.*tumor/i)) dx.push('tumor');
    if(has(s, /biopsy/i)) proc.push('biopsy');
    if(has(s, /polypectomy/i)) proc.push('polypectomy');
    if(has(s, /EMR|mucosal resection/i)) proc.push('emr');
    if(has(s, /hemostasis/i)) proc.push('hemostasis');
    M.cDx = dx.length ? dx : (has(s, /no significant abnormality|unremarkable/i) ? ['normal'] : []);
    M.cProc = proc;
    if(/\b(poor|inadequate|fair)\b[^.\n]*(prep|bowel)|(prep|bowel)[^.\n]*\b(poor|inadequate)\b/i.test(s)) M.cPrep = 'poor';
    else if(/\b(good|excellent|adequate)\b[^.\n]*(prep|bowel)|(prep|bowel)[^.\n]*\b(good|excellent|adequate)\b|boston/i.test(s)) M.cPrep = 'good';
    // 每個瘜肉一句「One 0.6cm ... polypoid lesion」，數目與最大尺寸照抄，病理分類要等病理報告
    const sizes = [...s.matchAll(/One\s+(\d+(?:\.\d+)?)\s*cm[^\n;]*?polyp/gi)].map(m=> parseFloat(m[1]) * 10);
    if(sizes.length){ M.cNum = String(sizes.length); M.cSize = String(Math.max(...sizes)); }
    if(!dx.includes('polyp') && dx.length && !M.cHist) M.cHist = 'none';
    if(M.cDx.includes('normal') && !M.cHist) M.cHist = 'none';
    const imp = (/IMPRESSION:\s*\n?([^\n]*)/i.exec(s) || [])[1];
    if(imp && !String(M.colonNote || '').trim()) M.colonNote = imp.trim();
    if(M.cDx.length) done.push('大腸鏡：' + M.cDx.map(k=> CK_CDX[k].t).join('、') + (sizes.length ? `（瘜肉 ${sizes.length} 顆，最大 ${Math.max(...sizes)} mm）` : ''));
    else msg.push('大腸鏡沒有對應到選項，請手動勾選');
    if(dx.includes('polyp') && !M.cHist) msg.push('瘜肉的病理分類要等病理報告，追蹤間隔會在選好病理後算出');
  }
  return {ok: E != null || C != null, done, msg};
}

// 病理報告：中英文關鍵字勾選；同時有多種時，大腸取風險最高的一類決定追蹤間隔
// 病理關鍵字比對前的整理：從「診斷」段落開始（避開表頭的臨床診斷），
// 再依標點切成小段，丟掉含否定語的段落（NOT IDENTIFIED、NO EVIDENCE OF MALIGNANCY、陰性……）
function ckPathClean(text){
  let s = String(text || '').replace(/\r/g, '');
  const m = s.match(/(^|\n)[ \t]*(病理診斷|診斷結果|PATHOLOGIC(?:AL)? DIAGNOSIS|DIAGNOSIS)[ \t]*[:：]/i);
  if(m) s = s.slice(m.index);
  // 截圖辨識的斷行常把否定語和名詞拆在兩行，先跨行拿掉整個否定片語
  const term = '(malignan\\w*|carcinoma|lymphoma|dysplasia|metaplasia|atroph\\w*|helicobacter|h\\.?\\s*pylori|bacilli|organisms?)';
  s = s.replace(new RegExp(`\\b(no|not|negative for|without|absence of|free of)\\s+(evidence\\s+of\\s+)?[\\w\\s-]{0,30}?${term}`, 'gi'), ' ')
       .replace(new RegExp(`${term}[^.;。；]{0,40}?\\b(not (identified|seen|found|present)|absent|negative)\\b`, 'gi'), ' ');
  return s.split(/[.;,\n。；，]/).filter(c=> !/\b(no|not|negative|without|absent|absence|free of|rule out|r\/o)\b|無|未見|沒有|陰性|排除/i.test(c)).join('\n');
}
function ckImportPath(area, text){
  const raw = String(text || ''), M = CK.mod, done = [], msg = [];
  if(!raw.trim()) return {done, msg: ['病理內容是空的']};
  const s = ckPathClean(raw);
  if(area === 'egd'){
    const p = [];
    if(/chronic (active )?gastritis|慢性.*胃炎/i.test(s)) p.push('chronic');
    if(/(helicobacter|H\.?\s*pylori|HP)[^.\n]{0,40}(positive|present|identified|\(\+\))|幽門桿菌[^。\n]{0,10}(陽性|\(\+\)|存在)/i.test(s)) p.push('hp');
    if(/intestinal metaplasia|腸上皮化生/i.test(s)) p.push('im');
    if(/atroph|萎縮/i.test(s)) p.push('atrophy');
    if(/fundic gland polyp|胃底腺瘜肉/i.test(s)) p.push('fgp');
    if(/hyperplastic polyp|增生性瘜肉/i.test(s)) p.push('hyperplastic');
    if(/adenoma\b|腺瘤/i.test(s)) p.push('adenoma');
    if(/dysplasia|分化不良/i.test(s) && !/no dysplasia|negative for dysplasia|無分化不良/i.test(s)) p.push('dysplasia');
    if(/carcinoma|malignan|lymphoma|癌/i.test(s)) p.push('cancer');
    M.egdPath = p;
    if(p.length) done.push('胃鏡病理：' + p.map(k=> CK_EGDPATH[k].t).join('、')); else msg.push('胃鏡病理沒有對應到選項，請手動勾選');
  } else {
    const rank = [];
    if(/adenocarcinoma|carcinoma|malignan|癌/i.test(s)) rank.push('cancer');
    if(/sessile serrated[^.\n]*dysplasia|SSL[^.\n]*dysplasia|traditional serrated/i.test(s)) rank.push('ssldys');
    if(/villous|tubulovillous|high[- ]grade dysplasia|高度分化不良|絨毛/i.test(s)) rank.push('advanced');
    if(/sessile serrated|SSA|SSL|無柄鋸齒/i.test(s)) rank.push('ssl');
    if(/tubular adenoma|管狀腺瘤/i.test(s)) rank.push('tubular');
    if(/hyperplastic polyp|增生性瘜肉/i.test(s)) rank.push('hyper');
    if(rank.length){ M.cHist = rank[0]; done.push('大腸鏡病理：' + {cancer:'癌', ssldys:'鋸齒狀病灶合併分化不良', advanced:'進行性腺瘤', ssl:'無柄鋸齒狀病灶', tubular:'管狀腺瘤', hyper:'增生性瘜肉'}[rank[0]]); }
    else msg.push('大腸鏡病理沒有對應到分類，請手動選擇');
    if(rank.length > 1) msg.push('病理有多種分類，已選風險最高的一類決定追蹤間隔');
  }
  return {done, msg};
}

// ESC：輸入框裡第一次按先離開欄位，再按一次回到「製作報告」選單；預覽開著時由 report.js 先關預覽
function ckOnEsc(e){
  if(e.key !== 'Escape' || e.defaultPrevented) return;
  if(KD.getElementById('k-ov')) return;
  const t = e.target;
  if(t && t.matches && t.matches('input, textarea, select')){ e.preventDefault(); t.blur(); KB.focus({preventScroll: true}); return; }
  if(typeof setRep === 'function'){ e.preventDefault(); setRep('home'); }
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
  // 醫師修改的間隔優先，指引的理由仍保留在說明裡
  const ov = String(m.cNextOv || '').trim();
  if(ov){ d = (d ? d + '；' : '') + `指引建議 ${t}，醫師依個別狀況調整`; t = ov; }
  return {t, g, when: ckWhenOf(t), d, ov: !!ov};
}
// 由間隔文字推回建議分組：3 個月內、半年內、1 年、更久
function ckWhenOf(t){
  const s = String(t || ''), mo = s.match(/(\d+)\s*(?:至\s*\d+\s*)?個月/), yr = s.match(/^(\d+)/);
  if(/週|天|盡快|立即/.test(s)) return 'now';
  if(mo) return +mo[1] <= 3 ? 'm3' : +mo[1] <= 6 ? 'm6' : 'y1';
  if(/年/.test(s) && yr) return +yr[1] <= 1 ? 'y1' : 'long';
  return 'long';
}

// 胃腸鏡診斷選單（用語同報告工具的診斷書）、處置與病理
const CK_EGD = {
  normal:{t:'正常', g:0}, gerd:{t:'逆流性食道炎', g:1, adv:'gerd'}, barrett:{t:'巴瑞特食道', g:1, adv:'barrett'},
  hernia:{t:'食道裂孔疝氣', g:0}, gastritis:{t:'胃炎', g:0}, erosive:{t:'糜爛性胃炎', g:1, adv:'erosive'},
  atrophy:{t:'萎縮性胃炎', g:1, adv:'atrophy'}, im:{t:'胃炎併腸上皮化生', g:1, adv:'atrophy'},
  ulcer:{t:'胃潰瘍', g:2, adv:'ulcer'}, duoulcer:{t:'十二指腸潰瘍', g:2, adv:'ulcer'}, duodenitis:{t:'十二指腸炎', g:0},
  fgp:{t:'胃底腺瘜肉', g:0, d:'屬良性瘜肉'}, polyp:{t:'胃瘜肉', g:1, adv:'egdpolyp'},
  tumor:{t:'疑似腫瘤', g:2, adv:'egdtumor'}, other:{t:'其他', g:1, adv:'egdother'}
};
const CK_EGDPROC = {biopsy:'切片', clo:'幽門桿菌快速尿素酶檢查', polypectomy:'瘜肉切除', hemostasis:'止血'};
const CK_EGDPATH = {
  chronic:{t:'慢性胃炎', g:0}, hp:{t:'幽門桿菌陽性', g:1, adv:'hp'}, im:{t:'腸上皮化生', g:1, adv:'atrophy'},
  atrophy:{t:'萎縮性變化', g:1, adv:'atrophy'}, fgp:{t:'胃底腺瘜肉', g:0, d:'屬良性瘜肉'}, hyperplastic:{t:'增生性瘜肉', g:1, adv:'egdpolyp'},
  adenoma:{t:'腺瘤', g:2, adv:'egdadenoma'}, dysplasia:{t:'分化不良', g:2, adv:'egdadenoma'}, cancer:{t:'癌', g:2, adv:'egdtumor'}
};
const CK_CDX = {
  normal:{t:'正常', g:0}, polyp:{t:'大腸瘜肉', g:1}, hemorrhoid:{t:'痔瘡', g:0, adv:'hemorrhoid'}, divert:{t:'大腸憩室', g:0, adv:'divert'},
  colitis:{t:'大腸炎', g:1, adv:'colitis'}, tumor:{t:'疑似腫瘤', g:2, adv:'colontumor'}, other:{t:'其他', g:1, adv:'colonother'}
};
const CK_CPROC = {biopsy:'切片', polypectomy:'瘜肉切除', emr:'黏膜切除術（EMR）', hemostasis:'止血'};
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
  const colonDone = !!(m.cHist || (m.cDx || []).length);
  if(m.fit === 'neg') out.push({area:'糞便潛血', t:'陰性', g:0});
  if(m.fit === 'pos') out.push(colonDone ? {area:'糞便潛血', t:'陽性', g:1, d:'本次已完成大腸鏡，依大腸鏡結果追蹤'} : {area:'糞便潛血', t:'陽性', g:2, d:'需要安排大腸鏡檢查', adv:'fitpos'});
  // 胃腸鏡：每個區塊另記處置、摘要與病理原文（out.info），報告列在發現下方
  const info = {};
  const procTxt = (list, dict)=> (list || []).map(k=> dict[k]).filter(Boolean).join('、');
  (m.egd || []).forEach(k=>{
    const x = CK_EGD[k]; if(!x) return;
    out.push({area:'胃鏡', t: x.t, g: x.g, d: x.d || '', adv: x.adv || ''});
  });
  if((m.egdProc || []).includes('clo') && m.clo)
    out.push(m.clo === 'pos' ? {area:'胃鏡', t:'快速尿素酶檢查陽性', g:1, d:'有幽門桿菌感染，建議除菌治療', adv:'hp'} : {area:'胃鏡', t:'快速尿素酶檢查陰性', g:0});
  if((m.egd || []).length || m.egdNote || (m.egdProc || []).length){
    if(!out.some(u=> u.area === '胃鏡')) out.push({area:'胃鏡', t:'已檢查', g:0});
    info['胃鏡'] = {proc: procTxt(m.egdProc, CK_EGDPROC), note: m.egdNote};
  }
  (m.egdPath || []).forEach(k=>{
    const x = CK_EGDPATH[k]; if(!x) return;
    out.push({area:'胃鏡病理', t: x.t, g: x.g, d: x.d || '', adv: x.adv || ''});
  });
  if(String(m.egdPathNote || '').trim()){
    if(!out.some(u=> u.area === '胃鏡病理')) out.push({area:'胃鏡病理', t:'病理報告', g:0, d:'請見下方原文'});
    info['胃鏡病理'] = {note: m.egdPathNote};
  }
  const cn = ckColonNext();
  const cdx = (m.cDx || []).filter(k=> CK_CDX[k] && !(cn && (k === 'polyp' || k === 'normal')));
  if(cn){
    const hz = {none:'沒有瘜肉', hyper:'增生性瘜肉', tubular:'管狀腺瘤', advanced:'進行性腺瘤', ssl:'無柄鋸齒狀病灶', ssldys:'鋸齒狀病灶合併分化不良', cancer:'大腸癌'}[m.cHist];
    const num = ckNum(m.cNum), mm = ckNum(m.cSize);
    const t = hz + (m.cHist !== 'none' && (num || mm) ? `（${num ? num + ' 顆' : ''}${num && mm ? '，' : ''}${mm ? '最大 ' + mm + ' mm' : ''}）` : '');
    out.push({area:'大腸鏡', t, g: cn.g, d: `${cn.d}；下次大腸鏡：${cn.t}`, adv:'colon', colon: cn});
  }
  cdx.forEach(k=>{
    const x = CK_CDX[k];
    out.push({area:'大腸鏡', t: x.t, g: x.g, d: k === 'polyp' ? '病理分類要等病理報告，追蹤間隔之後再決定' : '', adv: x.adv || ''});
  });
  if(cn || cdx.length || m.colonNote || (m.cProc || []).length){
    if(!out.some(u=> u.area === '大腸鏡')) out.push({area:'大腸鏡', t:'已檢查', g:0});
    info['大腸鏡'] = {proc: procTxt(m.cProc, CK_CPROC) + (m.cPrep ? `${(m.cProc || []).length ? '；' : ''}腸道清潔${m.cPrep === 'good' ? '良好' : '不佳'}` : ''), note: m.colonNote};
  }
  if(String(m.colonPathNote || '').trim()) info['大腸鏡病理'] = {note: m.colonPathNote};
  if(m.ldct){
    const x = CK_LUNG[m.ldct];
    out.push({area:'低劑量肺部電腦斷層', t:'Lung-RADS ' + m.ldct, g: x.g, d: x.d, adv: x.adv, note: m.ldctNote});
  }
  out.info = info;
  return out;
}

/* ---------- 心血管風險：CK_PREVENT、ckPrevent、ckTwcccc 在 ../lab/lab.js ---------- */
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
    add('糞便潛血檢查', age < 45 ? '一等親有大腸癌，40 至 44 歲每 2 年 1 次' : '45 至 74 歲每 2 年 1 次', (m.cHist || (m.cDx || []).length) ? '本次已做大腸鏡，依大腸鏡追蹤時程即可' : m.fit ? '本次已做' : '');
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
  fib4:     {when:'m3', t:'FIB-4 落在無法判定的區間，建議做肝臟纖維化掃描（FibroScan）或超音波彈性檢查，確認肝臟硬度。'},
  fib4h:    {when:'now', t:'FIB-4 高於 2.67，晚期肝纖維化的可能性高，請回診做進一步評估。'},
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
  barrett:  {when:'long', t:'巴瑞特食道的追蹤依長度與病理決定：沒有分化不良時，長度小於 3 公分每 5 年、3 公分以上每 3 年做一次胃鏡（2022 年美國腸胃科醫學會指引）。'},
  erosive:  {when:'m3', t:'糜爛性胃炎常和止痛藥、酒精與幽門桿菌有關，請減少止痛藥與飲酒，症狀持續請回診。'},
  egdadenoma:{when:'now', t:'胃腺瘤或分化不良屬於癌前病變，請回診討論是否需要內視鏡切除，以及之後的胃鏡追蹤時間。'},
  hemorrhoid:{when:'y1', t:'痔瘡多數靠多喝水、多吃蔬菜與避免久坐久蹲就能改善；反覆出血或脫垂時，可以回診討論治療方式。'},
  divert:   {when:'y1', t:'大腸憩室多數沒有症狀，不需要治療；如果出現左下腹痛合併發燒或血便，請盡快就醫。'},
  colitis:  {when:'m3', t:'大腸鏡看到發炎變化，請回診看切片結果，確認發炎的原因。'},
  colontumor:{when:'now', t:'大腸鏡看到疑似腫瘤的病灶，請盡快回診看病理報告並安排後續治療。'},
  colonother:{when:'m3', t:'大腸鏡有其他發現，請回診討論後續追蹤。'},
  smi:      {when:'m6', t:'四肢骨骼肌量偏低，建議每週 2 至 3 次阻力訓練，每餐都要有足夠的蛋白質，減重時更要保留肌肉。'},
  phase:    {when:'m6', t:'相位角偏低常和肌肉品質或營養狀態不佳有關，建議增加蛋白質攝取並規律肌力訓練，3 至 6 個月後再量一次。'},
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
  if(body.smi) add(body.smi.g, `<b>四肢骨骼肌指數 ${body.smi.v} kg/m²</b>，低於${P.male ? '男' : '女'}性肌少症切點 ${body.smi.cut}`, 'smi');
  if(body.phase) add(body.phase.g, `<b>相位角 ${body.phase.v}°</b>，低於 4.5°`, 'phase');
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
    advice.push({key:'colon', when: c.when, t: c.when === 'now' && !c.ov ? '大腸鏡病理為癌，請盡快回診討論轉介與治療。' : `依這次大腸鏡結果（${c.d}），下次大腸鏡建議在 ${c.t}${/內$|後$/.test(c.t) ? '' : '後'}。`});
  }
  advice.push({key:'yearly', when:'y1', t:'明年同一時間再安排一次健檢，和這次的數值比較。'});
  // 醫師修改：CK.fu[key] 改時間或文字、off 不列入；CK.fuAdd 是自行新增的項目
  const fu = CK.fu || {};
  advice.forEach(a=>{
    a.auto = {when: a.when, t: a.t};
    const o = fu[a.key]; if(!o) return;
    if(o.when && CK_WHEN[o.when]) a.when = o.when;
    if(String(o.t || '').trim()) a.t = o.t.trim();
    if(o.off) a.off = true;
    a.edited = a.when !== a.auto.when || a.t !== a.auto.t || !!a.off;
  });
  (CK.fuAdd || []).forEach((x, i)=> advice.push({key:'add' + i, add: i, when: CK_WHEN[x.when] ? x.when : 'm3', t: String(x.t || '').trim(), edited: true}));
  const reps = ckSortedReports();
  return {P, rows, body, us, mod, fib4, cv, pub, findings, adviceAll: advice, advice: advice.filter(a=> !a.off && a.t), reports: reps, current: reps[0] || null};
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
    const v = el.dataset.k === 'warn' ? ckWarnText() : ckGet(el.dataset.k);
    const s = v == null ? '' : String(v);
    if(el.value !== s && KD.activeElement !== el) el.value = s;
    el.classList.toggle('has-val', !!el.value);
    if(el.tagName === 'TEXTAREA') ckGrow(el);
    // 身體測量：上傳帶入的欄位標「上傳」
    const m = /^body\.(\w+)$/.exec(el.dataset.k), lab = el.closest('.k-f') && el.closest('.k-f').firstElementChild;
    if(m && lab){
      const on = !!(CK.bodySrc && CK.bodySrc[m[1]] && el.value), tag = lab.querySelector('.k-src');
      if(on && !tag) lab.insertAdjacentHTML('beforeend', '<b class="k-src" title="由上傳的報告擷取，請核對">上傳</b>');
      else if(!on && tag) tag.remove();
    }
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
  ckRenderPlan(d);
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

// 追蹤時程：每一項可改時間分組與文字、可不列入；正在打字時不重畫，避免游標跳走
function ckRenderPlan(d){
  const box = ckEl('k-plan');
  if(box.contains(KD.activeElement)) return;
  const sel = (v)=> `<select data-f="when">${Object.entries(CK_WHEN).map(([k, t])=> `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  box.innerHTML = `<table class="k-plan">${d.adviceAll.map(a=> `<tr data-key="${a.key}"${a.add != null ? ` data-add="${a.add}"` : ''} class="${a.off ? 'off' : ''}">` +
    `<td style="width:120px">${sel(a.when)}${a.edited ? '<br><span class="k-mod">已修改</span>' : ''}</td>` +
    `<td><textarea data-f="t">${ckEsc(a.t)}</textarea></td>` +
    `<td style="width:84px"><div class="k-pa">` +
    (a.add != null ? '<button data-f="del">刪除</button>' :
      `<label><input type="checkbox" data-f="off"${a.off ? ' checked' : ''}> 不列入</label>` + (a.edited ? '<button data-f="reset">恢復預設</button>' : '')) +
    `</div></td></tr>`).join('')}</table>`;
}
function ckInitPlan(){
  const box = ckEl('k-plan');
  const upd = (tr, f)=>{
    if(tr.dataset.add != null){ const x = CK.fuAdd[+tr.dataset.add]; f(x); }
    else { const k = tr.dataset.key; CK.fu = CK.fu || {}; CK.fu[k] = CK.fu[k] || {}; f(CK.fu[k]); }
  };
  box.addEventListener('input', e=>{
    const tr = e.target.closest('tr[data-key]'); if(!tr || e.target.dataset.f !== 't') return;
    upd(tr, o=> o.t = e.target.value); ckChanged();
  });
  box.addEventListener('change', e=>{
    const tr = e.target.closest('tr[data-key]'), f = e.target.dataset.f; if(!tr) return;
    if(f === 'when') upd(tr, o=> o.when = e.target.value);
    else if(f === 'off') upd(tr, o=> o.off = e.target.checked);
    else if(f !== 't') return;
    e.target.blur(); ckChanged();
  });
  box.addEventListener('focusout', ()=> setTimeout(()=>{ if(!box.contains(KD.activeElement)) ckRenderFind(); }, 0));
  box.addEventListener('click', e=>{
    const b = e.target.closest('button[data-f]'); if(!b) return;
    const tr = b.closest('tr[data-key]');
    if(b.dataset.f === 'del') CK.fuAdd.splice(+tr.dataset.add, 1);
    else if(b.dataset.f === 'reset') delete CK.fu[tr.dataset.key];
    ckChanged();
  });
  ckEl('k-plan-add').addEventListener('click', ()=>{
    CK.fuAdd = CK.fuAdd || []; CK.fuAdd.push({when:'m3', t:''}); ckChanged();
    const ta = box.querySelectorAll('textarea'); if(ta.length) ta[ta.length - 1].focus();
  });
}
function ckRenderNav(){
  const has = {
    upload: CK.reports.length > 0 || !!(CK.manual && CK.manual.length) || CK.att.length > 0,
    info: !!(CK.info.name && CK.info.sex && CK.info.age),
    body: !!(CK.body.h && CK.body.w),
    hx: !!CK.hx.smoke,
    lab: ckCurrentRows().some(r=> String(r.raw || '').trim()),
    us: !!((CK.us.abd || []).length || (CK.us.thy || []).length),
    mod: Object.values(CK.mod || {}).some(v=> Array.isArray(v) ? v.length : String(v || '').trim()),
    scope: !!((CK.mod.egd || []).length || (CK.mod.cDx || []).length || CK.mod.cHist),
    cv: (()=>{ const c = ckCollect().cv; return c.prevent.cvd10 != null || c.tw.risk != null; })(),
    pub: ckNum(CK.info.age) != null,
    plan: !!(Object.keys(CK.fu || {}).length || (CK.fuAdd || []).length),
    comment: !!String(CK.comment || '').trim()
  };
  KD.querySelectorAll('.k-nav a[data-sec]').forEach(a=> a.classList.toggle('done', !!has[a.dataset.sec]));
}

function ckRenderAll(){ ckRenderFields(); ckRenderFiles(); ckRenderLab(); ckRenderFind(); ckRenderNav(); ckRenderAtt(); }

let ckSaveTimer = null;
function ckSave(){
  clearTimeout(ckSaveTimer);
  ckSaveTimer = setTimeout(()=>{ try{ localStorage.setItem(CK_DRAFT, JSON.stringify(CK)); }catch(e){} }, 400);
}
/* ---------- 備份 ----------
   一位病人一個檔：姓名_健檢_檢查日期_備份.json。app 標記為 muzi-checkup，
   和減重的備份（muzi-weight、多筆紀錄）互不相認，匯錯檔會被擋下來；原始報告圖片一起帶著 */
// 原始報告圖片只在記憶體裡（不進暫存），重新整理或關掉就要重新上傳。
// 有圖片、而且上傳後還沒匯出備份時，離開前提醒；工作台「全部清除」重新載入時（HUB_RELOADING）不提醒
let ckPagesUnsaved = false;
window.addEventListener('beforeunload', e=>{
  if(!ckPagesUnsaved || window.HUB_RELOADING || !Object.keys(CK_PAGES).length) return;
  e.preventDefault();
  e.returnValue = '';
});
function ckExport(){
  ckPagesUnsaved = false;
  const pages = {};
  [...CK.reports, ...CK.att].forEach(x=>{ if(CK_PAGES[x.id]) pages[x.id] = CK_PAGES[x.id]; });
  const data = {app:'muzi-checkup', version:1, exportedAt:new Date().toISOString(), ck:CK, pages};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], {type:'application/json'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = ckFilename() + '_備份.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
}
async function ckImport(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  let data;
  try{ data = JSON.parse(await file.text()); }
  catch(e){ alert('無法讀取這個檔案，請確認是健檢報告匯出的備份檔（.json）。'); return; }
  if(!data || data.app !== 'muzi-checkup' || !data.ck || typeof data.ck !== 'object'){
    alert(data && data.app === 'muzi-weight' ? '這是減重報告的備份檔，請到減重報告匯入。' : '這不是健檢報告的備份檔。');
    return;
  }
  const cur = CK.info.name || CK.reports.length || CK.manual;
  if(cur && !confirm('匯入會取代目前畫面上的健檢資料' + (CK.info.name ? '（' + CK.info.name + '）' : '') + '，確定要匯入嗎？')) return;
  CK = Object.assign(ckBlank(), data.ck);
  Object.keys(CK_PAGES).forEach(k=> delete CK_PAGES[k]);
  Object.assign(CK_PAGES, data.pages || {});
  ckSave();
  ckRenderAll();
  alert('已匯入' + (CK.info.name ? ' ' + CK.info.name + ' ' : '') + '的健檢資料。');
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
      ckPagesUnsaved = true;
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
  ckInitAtt();
  KD.addEventListener('keydown', ckOnEsc);
  ckEl('k-rev').textContent = '最後改版：' + CK_REVISION;

  KD.addEventListener('input', e=>{
    const el = e.target;
    if(el.dataset.k){
      ckSet(el.dataset.k, el.value);
      // 自己改過上傳帶入的數值：取消「上傳」標記，之後再上傳也不會覆蓋
      const bk = /^body\.(\w+)$/.exec(el.dataset.k);
      if(bk && e.isTrusted && CK.bodySrc) delete CK.bodySrc[bk[1]];
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
  // 以前是滾輪一動就讓欄位失去焦點，但筆電觸控板捲到欄位後還會慣性送出滾輪事件，
  // 剛點進去的欄位馬上被踢出來，看起來像「點不進去」。改成擋下預設動作（不改數值）、自己捲頁，焦點留著
  KD.addEventListener('wheel', e=>{
    if(!e.target.matches('input[type=number]') || KD.activeElement !== e.target) return;
    e.preventDefault();
    KB.scrollBy({top: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? KB.clientHeight : 1)});
  }, {passive:false});

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
  ckInitPlan();
  ckEl('k-warn-reset').addEventListener('click', ()=>{ CK.warn = null; ckChanged(); });
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
  const showMsg = (box, r)=>{
    box.innerHTML = (r.done || []).map(t=> `<div><span class="g0">已帶入</span><span>${ckEsc(t)}</span></div>`).join('') +
      (r.msg || []).map(t=> `<div><span class="g1">請確認</span><span>${ckEsc(t)}</span></div>`).join('');
  };
  ckEl('k-scope-import').addEventListener('click', ()=>{
    const ta = ckEl('k-scope-paste');
    if(((CK.mod.egd || []).length || (CK.mod.cDx || []).length) && !confirm('會取代目前胃腸鏡的勾選，確定嗎？')) return;
    const r = ckImportScope(ta.value);
    if(!r.ok) r.msg = ['看不出是胃鏡或大腸鏡報告，請貼上報告工具產生的完整英文報告'];
    showMsg(ckEl('k-scope-msg'), r);
    if(r.ok){ ta.value = ''; ckChanged(); }
  });
  KD.querySelectorAll('[data-path-read]').forEach(b=> b.addEventListener('click', ()=>{
    const area = b.dataset.pathRead;
    const r = ckImportPath(area, CK.mod[area === 'egd' ? 'egdPathNote' : 'colonPathNote']);
    const box = KD.querySelector(`.k-att[data-att="${area}path"] .k-amsg`);
    if(box) showMsg(box, r);
    ckChanged();
  }));
  ckEl('k-line').addEventListener('click', ()=> ckLinePreview());
  ckEl('k-preview').addEventListener('click', ()=> ckPreview());
  ckEl('k-print').addEventListener('click', ()=> ckPrint());
  ckEl('k-export').addEventListener('click', ckExport);
  ckEl('k-import').addEventListener('click', ()=> ckEl('k-import-file').click());
  ckEl('k-import-file').addEventListener('change', e=> ckImport(e.target));

  ckRenderAll();
})();
