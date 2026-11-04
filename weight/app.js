// 問卷與健康紀錄表的樣式在 forms/forms.js（與工作台共用），開頁時放進頁面
WD.appendChild(Object.assign(document.createElement('style'), {id:'forms-css', textContent: FORMS_CSS}));

// ============================================================
// NAVIGATION（版面與健檢報告一致：一頁捲到底，左側目錄點了捲到該區）
// ============================================================
// 最後改版日期：每次改版請一併更新，顯示於工作台底部
const W_REVISION = REVISION.weight;  // 日期集中在 revision.js
const W_SECS = ['upload', 'basic', 'body', 'history', 'lab', 'image', 'treat', 'calorie', 'diet', 'track', 'report'];
let currentScreen = 'upload';

// 捲到某一區。舊程式（資料完成度的「前往」、載入紀錄後）仍呼叫 showScreen／showLeaf，所以保留這兩個名稱
function showScreen(id){
  const s = WD.getElementById('screen-' + id);
  if(!s) return;
  currentScreen = id;
  WB.scrollTo({top: Math.max(0, s.offsetTop - 16), behavior: 'smooth'});
  if(id === 'report'){
    // 評語是空的就先依檢查結果產生一份草稿
    try{ if(!WD.getElementById('doc-comment').value.trim()) genDocComment(true); }catch(e){}
    try{ renderCompleteness(); }catch(e){}
  }
  if(id === 'track' || id === 'body' || id === 'lab'){ try{ renderTrackChart('body'); renderTrackChart('lab'); }catch(e){} }
  setTimeout(()=>{ if(typeof refreshInputComfort === 'function') refreshInputComfort(); }, 0);
}
function showLeaf(id){ showScreen(id); }
function showWorkflowHub(){ WB.scrollTo(0, 0); }
function goHome(){ showWorkflowHub(); }
function goBack(){ showWorkflowHub(); }

// 左側目錄的綠點：該區有填資料就亮
function wFilled(ids){ return ids.some(id=>{ const el = WD.getElementById(id); return el && String(el.value || '').trim() !== ''; }); }
function renderNav(){
  const anyChk = sel=> !!WD.querySelector(sel + ' input[type=checkbox]:checked, ' + sel + ' input[type=radio]:checked, ' + sel + ' .tag.selected');
  const has = {
    upload:  (uploadedFiles.lab.length + uploadedFiles.tanita.length) > 0,
    basic:   wFilled(['p-name']) && !!WD.getElementById('p-gender').value && wFilled(['b-height', 'b-weight']),
    body:    wFilled(['t-fat', 't-muscle', 't-visceral', 't-bmr']),
    history: anyChk('#screen-history') || wFilled(['diet-habit-text', 'activity-habit-text', 'sleep-note', 'fam-note']),
    lab:     wFilled(['lab-ac', 'lab-hba1c', 'lab-tcho', 'lab-tg', 'lab-alt', 'lab-cr', 'lab-wbc', 'lab-hgb']) || wLabRows().length > 0,
    image:   wFilled(['us-fatty', 'us-thyroid', 'us-text', 'us-thyroid-text']),
    treat:   wFilled(['tx-edu', 'cm-note']),
    calorie: wFilled(['cal-activity', 'ex-text']),
    diet:    anyChk('#screen-diet'),
    track:   wFilled(['track-note', 'psy-note']) || anyChk('#screen-track'),
    report:  wFilled(['doc-comment'])
  };
  WD.querySelectorAll('.w-nav a[data-sec]').forEach(a=> a.classList.toggle('done', !!has[a.dataset.sec]));
}
let navTimer = null;
function scheduleNav(){ clearTimeout(navTimer); navTimer = setTimeout(()=>{ try{ renderNav(); }catch(e){} }, 120); }
WD.querySelectorAll('.w-nav a[data-sec]').forEach(a=> a.addEventListener('click', ()=> showScreen(a.dataset.sec)));
['input', 'change', 'click'].forEach(t=> WD.addEventListener(t, scheduleNav, true));
// 捲動時記下目前在哪一區（快捷鍵與資料完成度用）
WB.addEventListener('scroll', ()=>{
  const y = WB.scrollTop + 80;
  let cur = W_SECS[0];
  W_SECS.forEach(id=>{ const s = WD.getElementById('screen-' + id); if(s && s.offsetTop <= y) cur = id; });
  currentScreen = cur;
}, {passive: true});
WD.getElementById('w-rev').textContent = '最後改版 ' + W_REVISION;

// 今天的日期（本機時區）。不用 toISOString，那是國際標準時間，台灣早上 8 點前會變成前一天
function todayLocal(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ============================================================
// AGE AUTO CALC
// ============================================================
function updateBirthHidden(){
  const y = WD.getElementById('p-birth-y').value;
  const m = WD.getElementById('p-birth-m').value;
  const d = WD.getElementById('p-birth-d').value;
  if(y.length === 4 && m && d){
    const mm = m.padStart(2,'0'), dd = d.padStart(2,'0');
    WD.getElementById('p-birth').value = `${y}-${mm}-${dd}`;
  } else {
    WD.getElementById('p-birth').value = '';
  }
  updateAge();
}
WD.getElementById('p-birth-y').addEventListener('input', function(){
  this.value = this.value.replace(/\D/g,'').slice(0,4);
  if(this.value.length === 4) WD.getElementById('p-birth-m').focus();
  updateBirthHidden();
});
WD.getElementById('p-birth-m').addEventListener('input', function(){
  this.value = this.value.replace(/\D/g,'').slice(0,2);
  if(this.value.length === 2) WD.getElementById('p-birth-d').focus();
  updateBirthHidden();
});
WD.getElementById('p-birth-d').addEventListener('input', function(){
  this.value = this.value.replace(/\D/g,'').slice(0,2);
  updateBirthHidden();
});
WD.getElementById('p-date').addEventListener('change', updateAge);
function updateAge(){
  const b = WD.getElementById('p-birth').value;
  const d = WD.getElementById('p-date').value || todayLocal();
  // 出生日期被清空或填寫不完整時，一併清掉年齡，
  // 否則報告會出現「出生日期 --」卻仍印著舊年齡的矛盾
  if(!b){
    WD.getElementById('p-age').value = '';
    if(typeof calcStopBang === 'function') calcStopBang();
    return;
  }
  const bd = new Date(b), rd = new Date(d);
  let age = rd.getFullYear() - bd.getFullYear();
  const m = rd.getMonth() - bd.getMonth();
  if(m < 0 || (m===0 && rd.getDate() < bd.getDate())) age--;
  WD.getElementById('p-age').value = age;
  if(typeof calcStopBang === 'function') calcStopBang();
}
if(!WD.getElementById('p-date').value){
  WD.getElementById('p-date').value = todayLocal();
}

function toggleCollapse(bodyId, toggleId){
  const body = WD.getElementById(bodyId);
  const toggle = WD.getElementById(toggleId);
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  toggle.textContent = open ? '展開填寫 ▾' : '收合 ▴';
}

// ============================================================
// STOP-BANG
// ============================================================
function renderStopBang(){
  const box = WD.getElementById('stopbang-list');
  box.innerHTML = '';
  STOPBANG_ITEMS.forEach(it=>{
    const div = document.createElement('div');
    div.className = 'chk-row';
    div.innerHTML = `<input type="checkbox" id="${it.id}"><label for="${it.id}">${it.label}</label>`;
    box.appendChild(div);
  });
  const extra = document.createElement('div');
  extra.className = 'hint';
  extra.style.marginTop = '6px';
  extra.textContent = '以下項目將依「基本資料」頁的數值自動判定：BMI＞35、年齡＞50歲、頸圍＞40cm（需另行測量）、性別為男性';
  box.appendChild(extra);
}
renderStopBang();
function calcStopBang(){
  let score = STOPBANG_ITEMS.filter(it=>WD.getElementById(it.id).checked).length;
  const hM = getHeightM();
  const w = parseFloat(WD.getElementById('b-weight').value);
  const bmi = (hM && w) ? w/(hM*hM) : null;
  const age = parseFloat(WD.getElementById('p-age').value);
  const gender = WD.getElementById('p-gender').value;
  if(bmi && bmi > 35) score++;
  if(!isNaN(age) && age > 50) score++;
  if(gender === 'M') score++;
  const manualEl = WD.getElementById('stopbang-manual');
  const manual = manualEl ? manualEl.value : '';
  if(manual !== '' && !isNaN(parseInt(manual))) score = parseInt(manual);
  const risk = score >= 3;
  WD.getElementById('stopbang-result').innerHTML =
    `STOP-BANG 分數：<b>${score}</b> / 8（不含頸圍項目，若頸圍&gt;40cm請手動+1分）　`+
    (risk ? `<span class="flag high">中高風險，建議安排睡眠檢查評估阻塞性睡眠呼吸中止症</span>` : `<span class="flag low">低風險</span>`);
  return score;
}

// ============================================================
// PHQ-9
// ============================================================
function renderPhq9(){
  const box = WD.getElementById('phq9-list');
  box.innerHTML = '';
  PHQ9_ITEMS.forEach((q,i)=>{
    const row = document.createElement('div');
    row.className = 'scale-row';
    let opts = PHQ9_OPTS.map((o,v)=>`<label><input type="radio" name="phq${i}" value="${v}"><span>${o}</span></label>`).join('');
    row.innerHTML = `<div class="q">${i+1}. ${q}</div><div class="scale-opts">${opts}</div>`;
    box.appendChild(row);
  });
}
renderPhq9();
function calcPhq9(){
  let total = 0, answered = 0, item9 = 0;
  PHQ9_ITEMS.forEach((q,i)=>{
    const checked = WD.querySelector(`input[name="phq${i}"]:checked`);
    if(checked){ answered++; total += parseInt(checked.value); if(i===8) item9 = parseInt(checked.value); }
  });
  const manualEl = WD.getElementById('phq9-manual');
  const manual = manualEl ? manualEl.value : '';
  const hasManual = manual !== '' && !isNaN(parseInt(manual));
  if(!hasManual && answered < PHQ9_ITEMS.length){
    WD.getElementById('phq9-result').textContent = `已作答 ${answered}/9 題，請完成全部題目以計算總分（或直接手動輸入總分）`;
    return null;
  }
  if(hasManual) total = parseInt(manual);
  let severity, sevClass;
  if(total<=4){ severity = '輕微／無明顯憂鬱症狀'; sevClass = 'low'; }
  else if(total<=9){ severity = '輕度'; sevClass = 'mid'; }
  else if(total<=14){ severity = '中度'; sevClass = 'mid'; }
  else if(total<=19){ severity = '中重度'; sevClass = 'high'; }
  else { severity = '重度'; sevClass = 'high'; }
  let html = `PHQ-9 總分：<b>${total}</b> / 27　嚴重度：<span class="flag ${sevClass}">${severity}</span>`;
  if(item9 >= 1){
    html += `<br><span class="flag high">第9題呈陽性反應，建議立即評估自殺風險並轉介身心科</span>`;
  }
  WD.getElementById('phq9-result').innerHTML = html;
  return {total, severity, item9};
}
WD.getElementById('phq9-list').addEventListener('change', calcPhq9);
WD.getElementById('phq9-manual').addEventListener('input', calcPhq9);
WD.getElementById('stopbang-list').addEventListener('change', calcStopBang);
WD.getElementById('stopbang-manual').addEventListener('input', calcStopBang);

// ============================================================
// BMI + BP
// ============================================================
function getHeightM(){
  const h = parseFloat(WD.getElementById('b-height').value);
  return h ? h/100 : null;
}
// 腰圍、血壓、性別同樣影響衍生判讀，一併觸發重算，避免修正數值後判讀停留在舊值
['b-height','b-weight','b-waist','b-sbp','b-dbp'].forEach(id=>{
  WD.getElementById(id).addEventListener('input', ()=>{ calcBMI(true); if(typeof calcStopBang === 'function') calcStopBang(); });
});
WD.getElementById('p-gender').addEventListener('change', ()=> calcBMI(true));
WD.getElementById('p-gender').addEventListener('change', ()=>{ if(typeof calcStopBang === 'function') calcStopBang(); });
function updateTargetLossPct(){
  const w = parseFloat(WD.getElementById('b-weight').value);
  const target = parseFloat(WD.getElementById('b-target-weight').value);
  const el = WD.getElementById('target-loss-pct');
  if(!w || !target){ el.value = ''; return; }
  const pct = (w - target) / w * 100;
  el.value = pct.toFixed(1) + '%' + (pct < 0 ? '（目標高於目前體重）' : '');
}
function updateStandardWeightRange(){
  const hM = getHeightM();
  const el = WD.getElementById('standard-weight-range');
  if(!hM){ el.value = ''; return; }
  const min = 18.5 * hM * hM;
  const max = 24 * hM * hM;
  el.value = `${min.toFixed(1)} – ${max.toFixed(1)} kg`;
}
['b-weight','b-target-weight'].forEach(id=>{
  WD.getElementById(id).addEventListener('input', updateTargetLossPct);
});
WD.getElementById('b-height').addEventListener('input', updateStandardWeightRange);
function bmiCategory(bmi){
  if(bmi < 18.5) return {label:'過輕', cls:'mid'};
  if(bmi < 24) return {label:'正常範圍', cls:'low'};
  if(bmi < 27) return {label:'過重', cls:'mid'};
  if(bmi < 30) return {label:'輕度肥胖', cls:'high'};
  if(bmi < 35) return {label:'中度肥胖', cls:'high'};
  return {label:'重度肥胖', cls:'high'};
}
// ============================================================
// 報告顯示輔助：未填寫的欄位不印出孤兒單位
// ============================================================
const RV_NA = '<span style="color:#9E9B94">未測</span>';
const RV_NA_LAB = '<span style="color:#9E9B94">未檢驗</span>';
function rv(val, unit){
  const v = (val == null ? '' : String(val)).trim();
  if(!v) return RV_NA;
  return wEsc(v) + (unit ? ' ' + unit : '');
}
function rvLab(val){
  const v = (val == null ? '' : String(val)).trim();
  return v ? wEsc(v) : RV_NA_LAB;
}
// 檢驗值標示：參考值照優品報告（與健檢報告、forms/forms.js 的 LAB_META 同一套），只用來提醒「偏高／偏低」。
// 有性別差異的（HDL、ALT、AST、Cr、尿酸）依基本資料的性別判斷。
const LAB_REF = {
  ac:    {hi:v=> v >= 100},
  hba1c: {hi:v=> v >= 5.7},
  tcho:  {hi:v=> v >= 200},
  tg:    {hi:v=> v >= 150},
  ldl:   {hi:v=> v >= 130},
  hdl:   {lo:(v,m)=> v < (m ? 40 : 50)},
  alt:   {hi:(v,m)=> v > (m ? 50 : 35)},
  ast:   {hi:(v,m)=> v > (m ? 50 : 35)},
  cr:    {hi:(v,m)=> v > (m ? 1.2 : 0.9)},
  egfr:  {lo:v=> v < 60},
  tsh:   {hi:v=> v > 4.2, lo:v=> v < 0.27},
  ua:    {hi:(v,m)=> v > (m ? 7.0 : 5.7)},
};
function labFlag(key, val){
  const v = parseFloat(val);
  const r = LAB_REF[key];
  if(!r || isNaN(v)) return '';
  const g = WD.getElementById('p-gender');
  const male = !!g && g.value === 'M';
  if(r.hi && r.hi(v, male)) return 'hi';
  if(r.lo && r.lo(v, male)) return 'lo';
  return '';
}
function updateLabFlags(){
  Object.keys(LAB_REF).forEach(k=>{
    const input = WD.getElementById('lab-' + k);
    if(!input) return;
    const label = input.parentNode.querySelector('label');
    let tag = label && label.querySelector('.lab-flag');
    if(label && !tag){ tag = document.createElement('span'); label.appendChild(tag); }
    const f = labFlag(k, input.value);
    if(tag){ tag.className = 'lab-flag' + (f ? ' ' + f : ''); tag.textContent = f === 'hi' ? '偏高' : f === 'lo' ? '偏低' : ''; }
    input.classList.toggle('lab-abn', !!f);
  });
}
WD.addEventListener('input', e=>{ if(e.target && /^lab-/.test(e.target.id || '')) updateLabFlags(); }, true);
WD.addEventListener('change', e=>{ if(e.target && e.target.id === 'p-gender') updateLabFlags(); }, true);
updateLabFlags();
// 報告用：數值後面加 ↑／↓
function rvLabF(key){
  const val = WD.getElementById('lab-' + key).value;
  const v = (val == null ? '' : String(val)).trim();
  if(!v) return RV_NA_LAB;
  const f = labFlag(key, v);
  return wEsc(v) + (f ? ` <span class="rp-flag ${f}">${f === 'hi' ? '↑' : '↓'}</span>` : '');
}
function rvText(val){
  const v = (val == null ? '' : String(val)).trim();
  return (!v || v === '未填寫' || v === '--') ? RV_NA : wEsc(v);
}

// ============================================================
// 輸入合理範圍檢查：超出生理範圍時標紅並提示，避免打錯字直接進報告
// ============================================================
function validateField(id){
  const el = WD.getElementById(id);
  const r = FIELD_RANGES[id];
  if(!el || !r) return true;
  const warnId = id + '-range-warn';
  let warn = WD.getElementById(warnId);
  const raw = el.value.trim();
  const v = parseFloat(raw);
  const bad = raw !== '' && (isNaN(v) || v < r.min || v > r.max);
  if(bad){
    el.style.borderColor = 'var(--red)';
    el.style.background = 'var(--red-pale)';
    if(!warn){
      warn = document.createElement('div');
      warn.id = warnId;
      warn.className = 'hint';
      warn.style.color = 'var(--red)';
      warn.style.marginTop = '4px';
      el.parentNode.appendChild(warn);
    }
    warn.textContent = '請確認：' + r.label + '合理範圍為 ' + r.min + ' 至 ' + r.max + (r.unit ? ' ' + r.unit : '');
  } else {
    el.style.borderColor = '';
    el.style.background = '';
    if(warn) warn.remove();
  }
  return !bad;
}
function validateAllFields(){
  return Object.keys(FIELD_RANGES).filter(id => !validateField(id));
}
Object.keys(FIELD_RANGES).forEach(id=>{
  const el = WD.getElementById(id);
  if(el) el.addEventListener('input', ()=> validateField(id));
});
function calcBMI(silent){
  const hM = getHeightM();
  const w = parseFloat(WD.getElementById('b-weight').value);
  if(!hM || !w){ if(!silent) alert('請先填寫身高與體重'); return; }
  // 身高體重超出生理範圍時不計算，避免打錯字產生錯誤分級
  if(!validateField('b-height') || !validateField('b-weight')){
    WD.getElementById('bmi-value').textContent = '--';
    WD.getElementById('bmi-flag').innerHTML = '<span class="flag mid">數值超出合理範圍，請確認身高體重</span>';
    WD.getElementById('bmi-category').textContent = '數值超出合理範圍';
    WD.getElementById('bmi-result').style.display = 'block';
    return;
  }
  const bmi = w/(hM*hM);
  const cat = bmiCategory(bmi);
  WD.getElementById('bmi-value').textContent = bmi.toFixed(1);
  WD.getElementById('bmi-flag').innerHTML = `<span class="flag ${cat.cls}">${cat.label}</span>`;
  WD.getElementById('bmi-category').textContent = cat.label + '（亞洲人BMI分級：過重≥24、肥胖≥27）';

  const domainMin = 15, domainMax = 40;
  const gaugePct = Math.max(0, Math.min(100, (bmi - domainMin) / (domainMax - domainMin) * 100));
  WD.getElementById('bmi-marker').style.left = gaugePct + '%';

  const ibw = 22 * hM * hM;
  WD.getElementById('ibw').textContent = ibw.toFixed(1) + ' kg';
  const pct2 = (w/ibw*100).toFixed(0);
  WD.getElementById('ibw-pct').textContent = pct2 + '%';

  if(bmi >= 24){
    // 臨床上先以初始體重 5% 至 10% 為階段目標，BMI 24 僅列為長期參考值
    const m5 = (w * 0.95).toFixed(1);
    const m10 = (w * 0.90).toFixed(1);
    const targetW = 24 * hM * hM;
    WD.getElementById('target-loss').innerHTML =
      `階段目標：減 5%　<b>${m5} kg</b>　·　減 10%　<b>${m10} kg</b>` +
      `<div class="hint" style="margin-top:4px">長期參考：BMI 24 相當於 ${targetW.toFixed(1)} kg</div>`;
  } else {
    WD.getElementById('target-loss').textContent = bmi < 18.5 ? '目前 BMI 屬體重過輕，不建議減重，應增加營養與肌力訓練' : '目前 BMI 已在正常範圍，建議以維持為主';
  }

  const waist = parseFloat(WD.getElementById('b-waist').value);
  const gender = WD.getElementById('p-gender').value;
  if(waist && !gender){
    WD.getElementById('waist-flag').textContent = '請先選擇性別';
  } else if(waist){
    const cutoff = gender === 'M' ? 90 : 80;
    const risky = waist >= cutoff;
    WD.getElementById('waist-flag').innerHTML = risky
      ? `<span class="flag high">高</span>`
      : `<span class="flag low">正常</span>`;
  } else {
    WD.getElementById('waist-flag').textContent = '未填寫';
  }

  const sbp = parseFloat(WD.getElementById('b-sbp').value);
  const dbp = parseFloat(WD.getElementById('b-dbp').value);
  if(!isNaN(sbp) && !isNaN(dbp)){
    // 血壓判讀標準 130/80（與報告相同，kit/report-kit.js 的 kBpGrade）；代謝症候群的血壓指標另依國健署 130/85
    const g = kBpGrade(sbp, dbp), ms = sbp >= 130 || dbp >= 85;
    WD.getElementById('bp-flag').innerHTML = `${sbp}/${dbp} mmHg　` + (g >= 1 ? `<span class="flag high">${kBpTxt(sbp, dbp)}（標準 < 130/80）</span>` : `<span class="flag low">正常範圍（< 130/80）</span>`) +
      (ms ? `<br><small>也符合代謝症候群的血壓指標（≥ 130/85，國健署標準）</small>` : '');
  } else {
    WD.getElementById('bp-flag').textContent = '未填寫';
  }

  WD.getElementById('bmi-result').style.display = 'block';
}

// ============================================================
// 代謝症候群
// ============================================================
function syncHba1c(source){
  const other = source === 'ms-hba1c' ? 'lab-hba1c' : 'ms-hba1c';
  WD.getElementById(other).value = WD.getElementById(source).value;
  calcMetabolic();
}
function updateHba1cReadout(){
  const el = WD.getElementById('ms-hba1c-readout');
  if(!el) return;
  const hba1c = parseFloat(WD.getElementById('ms-hba1c').value);
  if(isNaN(hba1c)){ el.innerHTML = '5.7% 至 6.4% 為糖尿病前期，另外標示，不算進代謝症候群五項'; return; }
  const preDM = hba1c >= 5.7 && hba1c <= 6.4;
  el.innerHTML = preDM ? `<span class="flag high">5.7% 至 6.4%，屬糖尿病前期</span>` : `<span class="flag low">未達 5.7% 至 6.4% 範圍</span>`;
}
// 代謝症候群五項可由已輸入的腰圍、血壓、血糖、TG、HDL 直接判定。
// 預設依實測值自動帶入；醫師手動改過的項目（例如已用藥治療）以手動為準，
// 並在該項下方標示實測值，避免勾選與數值不一致卻無人察覺。
const MS_MANUAL = {};
const MS_BASIS = {
  'ms-waist':   {label:'腰圍'},
  'ms-bp':      {label:'血壓'},
  'ms-glucose': {label:'空腹血糖'},
  'ms-tg':      {label:'三酸甘油酯'},
  'ms-hdl':     {label:'HDL-C'}
};
function msSuggestions(){
  const num = id => { const v = parseFloat(WD.getElementById(id).value); return isNaN(v) ? null : v; };
  const gender = WD.getElementById('p-gender').value;
  const waist = num('b-waist'), sbp = num('b-sbp'), dbp = num('b-dbp');
  const ac = num('lab-ac'), tg = num('lab-tg'), hdl = num('lab-hdl');
  const hM = getHeightM(), wt = num('b-weight');
  const bmi = (hM && wt) ? wt/(hM*hM) : null;

  let waistHit = null, waistText = '未輸入腰圍與 BMI';
  if(waist !== null || bmi !== null){
    const cutoff = gender === 'M' ? 90 : 80;
    const byWaist = waist !== null && gender ? waist >= cutoff : false;
    const byBmi = bmi !== null ? bmi >= 27 : false;
    waistHit = byWaist || byBmi;
    const parts = [];
    if(waist !== null) parts.push(gender ? `腰圍 ${waist} cm（標準 ≥${cutoff}）` : `腰圍 ${waist} cm（選擇性別後判定）`);
    if(bmi !== null) parts.push(`BMI ${bmi.toFixed(1)}（標準 ≥27）`);
    waistText = parts.join('，');
  }
  const mk = (val, hit, text) => ({hit: val === null ? null : hit, text: val === null ? text : null, val});
  return {
    'ms-waist':   {hit: waistHit, text: waistText},
    'ms-bp':      (sbp === null && dbp === null)
                    ? {hit:null, text:'未輸入血壓'}
                    : {hit: (sbp !== null && sbp >= 130) || (dbp !== null && dbp >= 85),
                       text: `血壓 ${sbp === null ? '--' : sbp}/${dbp === null ? '--' : dbp} mmHg（國健署代謝症候群標準 ≥ 130/85）`},
    'ms-glucose': ac === null  ? {hit:null, text:'未輸入空腹血糖'}
                               : {hit: ac >= 100,  text:`空腹血糖 ${ac} mg/dL（標準 ≥100）`},
    'ms-tg':      tg === null  ? {hit:null, text:'未輸入三酸甘油酯'}
                               : {hit: tg >= 150,  text:`三酸甘油酯 ${tg} mg/dL（標準 ≥150）`},
    'ms-hdl':     hdl === null ? {hit:null, text:'未輸入 HDL-C'}
                : !gender      ? {hit:null, text:`HDL-C ${hdl} mg/dL（選擇性別後判定）`}
                               : {hit: hdl < (gender === 'M' ? 40 : 50),
                                  text:`HDL-C ${hdl} mg/dL（標準 ${gender === 'M' ? '<40' : '<50'}）`}
  };
}
function renderMsBasis(){
  const sug = msSuggestions();
  Object.keys(MS_BASIS).forEach(id=>{
    const el = WD.getElementById(id);
    if(!el) return;
    const item = el.closest('.ms-item');
    if(!item) return;
    let note = item.querySelector('.ms-basis');
    if(!note){
      note = document.createElement('div');
      note.className = 'ms-basis hint';
      note.style.marginTop = '4px';
      item.querySelector('div:last-child').appendChild(note);
    }
    const s = sug[id];
    if(s.hit === null){
      note.style.color = 'var(--muted)';
      note.textContent = '實測依據：' + s.text;
      return;
    }
    const agree = (el.checked === s.hit);
    note.style.color = agree ? 'var(--muted)' : 'var(--red)';
    note.textContent = '實測依據：' + s.text + '　' +
      (agree ? (s.hit ? '符合' : '未達標準') : '※ 與勾選不一致，實測為' + (s.hit ? '符合' : '未達標準'));
  });
}
function applyMsAuto(){
  const sug = msSuggestions();
  Object.keys(MS_BASIS).forEach(id=>{
    if(MS_MANUAL[id]) return;
    const s = sug[id];
    if(s.hit === null) return;
    const el = WD.getElementById(id);
    if(el) el.checked = s.hit;
  });
}
function resetMsAuto(){
  Object.keys(MS_MANUAL).forEach(k=> delete MS_MANUAL[k]);
  applyMsAuto();
  calcMetabolic();
}
function calcMetabolic(){
  const items = ['ms-waist','ms-glucose','ms-bp','ms-tg','ms-hdl'];
  const count = items.filter(id=>WD.getElementById(id).checked).length;
  renderMsBasis();
  const hba1c = parseFloat(WD.getElementById('ms-hba1c').value);
  const hba1cFlag = !isNaN(hba1c) && hba1c >= 5.7 && hba1c <= 6.4;
  // 代謝症候群只看五項；糖尿病前期另外標示，不算進代謝症候群
  const positive = count >= 3;
  updateHba1cReadout();
  const box = WD.getElementById('metabolic-result');
  box.style.display = 'block';
  box.innerHTML = `符合項目：<b>${count}</b> / 5` +
    (hba1cFlag ? `<br>另屬糖尿病前期（HbA1c 5.7% 至 6.4%）` : '') +
    `<br>` +
    (positive ? `<span class="flag high">符合代謝症候群診斷</span>` : `<span class="flag low">未達代謝症候群診斷標準</span>`);
}
WD.getElementById('ms-hba1c').addEventListener('input', ()=>syncHba1c('ms-hba1c'));
WD.getElementById('lab-hba1c').addEventListener('input', ()=>syncHba1c('lab-hba1c'));
['ms-waist','ms-glucose','ms-bp','ms-tg','ms-hdl'].forEach(id=>{
  WD.getElementById(id).addEventListener('change', ()=>{ MS_MANUAL[id] = true; calcMetabolic(); });
});
// 這些數值改動時重新帶入代謝症候群判定
['b-waist','b-sbp','b-dbp','b-weight','b-height','lab-ac','lab-tg','lab-hdl'].forEach(id=>{
  const el = WD.getElementById(id);
  if(el) el.addEventListener('input', ()=>{ applyMsAuto(); calcMetabolic(); });
});
WD.getElementById('p-gender').addEventListener('change', ()=>{ applyMsAuto(); calcMetabolic(); });

// ============================================================
// 身體組成
// ============================================================
function calcBody(){
  const fat = parseFloat(WD.getElementById('t-fat').value);
  const visceral = parseFloat(WD.getElementById('t-visceral').value);
  const gender = WD.getElementById('p-gender').value;
  let notes = [];
  if(!isNaN(fat) && !gender){
    notes.push(`體脂肪率 ${fat}%（選擇性別後判定）`);
  } else if(!isNaN(fat)){
    const fatHigh = gender === 'M' ? 25 : 30;
    notes.push(fat >= fatHigh ? `體脂肪率 ${fat}% 偏高（男性標準 &lt;25%／女性 &lt;30%）` : `體脂肪率 ${fat}% 在合理範圍內`);
  }
  if(!isNaN(visceral)){
    if(visceral >= 15) notes.push(`內臟脂肪等級 ${visceral}：過高，建議積極介入`);
    else if(visceral >= 10) notes.push(`內臟脂肪等級 ${visceral}：偏高，建議留意`);
    else notes.push(`內臟脂肪等級 ${visceral}：正常範圍`);
  }
  WD.getElementById('body-result').innerHTML = notes.length ? notes.map(n=>'• '+n).join('<br>') : '請輸入數值後套用分析';
  WD.getElementById('body-result').style.display = 'block';
}

// ============================================================
// 追蹤紀錄表 (body / lab) — 表格可直接編輯，亦可自動擷取
// ============================================================
const TRACK_COLS = {
  body: [['date','日期'],['weight','體重'],['bmi','BMI'],['waist','腰圍'],['muscle','肌肉量'],['fat','體脂肪率'],['visceral','內臟脂肪'],['bp','血壓']],
  lab:  [['date','日期'],['ac','AC'],['hba1c','HbA1c'],['homa','HOMA-IR'],['alt','ALT'],['ast','AST'],['cr','Cr'],['egfr','eGFR'],['tsh','TSH'],['ua','UA'],['tcho','TC'],['tg','TG'],['hdl','HDL'],['ldl','LDL']],
};
const trackData = { body: [], lab: [] };

function addTrackRow(kind){
  if(kind === 'body'){
    trackData.body.push({
      date: WD.getElementById('p-date').value || todayLocal(),
      weight: WD.getElementById('b-weight').value,
      bmi: WD.getElementById('bmi-value').textContent !== '--' ? WD.getElementById('bmi-value').textContent : '',
      waist: WD.getElementById('b-waist').value,
      muscle: WD.getElementById('t-muscle').value,
      fat: WD.getElementById('t-fat').value,
      visceral: WD.getElementById('t-visceral').value,
      bp: (WD.getElementById('b-sbp').value && WD.getElementById('b-dbp').value) ? (WD.getElementById('b-sbp').value+'/'+WD.getElementById('b-dbp').value) : ''
    });
  } else {
    trackData.lab.push({
      date: WD.getElementById('p-date').value || todayLocal(),
      ac: WD.getElementById('lab-ac').value, hba1c: WD.getElementById('lab-hba1c').value,
      homa: WD.getElementById('lab-homa').value, alt: WD.getElementById('lab-alt').value,
      ast: WD.getElementById('lab-ast').value,
      cr: WD.getElementById('lab-cr').value, egfr: WD.getElementById('lab-egfr').value,
      tsh: WD.getElementById('lab-tsh').value, ua: WD.getElementById('lab-ua').value,
      tcho: WD.getElementById('lab-tcho').value, tg: WD.getElementById('lab-tg').value,
      hdl: WD.getElementById('lab-hdl').value, ldl: WD.getElementById('lab-ldl').value
    });
  }
  renderTrackTable(kind);
}
function addBlankTrackRow(kind){
  const row = {};
  TRACK_COLS[kind].forEach(([key])=> row[key] = key==='date' ? todayLocal() : '');
  trackData[kind].push(row);
  renderTrackTable(kind);
}
function renderTrackTable(kind){
  setTimeout(()=>{ try{ renderTrackChart(kind); }catch(e){} }, 0);
  const table = WD.getElementById('track-'+kind+'-table');
  const cols = TRACK_COLS[kind];
  const rows = trackData[kind];
  let html = '<tr>' + cols.map(([,label])=>`<th>${label}</th>`).join('') + '<th></th></tr>';
  rows.forEach((r,i)=>{
    html += '<tr>' + cols.map(([key])=>{
      const type = key==='date' ? 'date' : 'text';
      return `<td><input type="${type}" value="${wEsc(r[key]||'')}" style="width:100%; border:1px solid transparent; background:transparent; padding:4px; font-size:14.5px; border-radius:4px;" onfocus="this.style.borderColor='var(--border)'; this.style.background='#fff'" onblur="this.style.borderColor='transparent'; this.style.background='transparent'" oninput="trackData.${kind}[${i}]['${key}']=this.value"></td>`;
    }).join('') + `<td><span class="tt-del" onclick="delTrackRow('${kind}',${i})">刪除</span></td></tr>`;
  });
  table.innerHTML = html;
}
function delTrackRow(kind, idx){
  trackData[kind].splice(idx,1);
  renderTrackTable(kind);
}

// ============================================================
// FILE UPLOAD（含文字擷取，供追蹤表自動判讀使用）
// ============================================================
const uploadedFiles = { lab: [], tanita: [] };

// 數值來源：由上傳報告擷取的欄位記為 'upload'，欄位旁顯示「上傳」標籤，報告也會註明。
// 使用者自己改過該欄位就取消標記。上傳或實測的數值一律優先於公式估算（BMR、eGFR）。
const FIELD_SRC = {};
function markUploaded(el){
  if(!el) return;
  FIELD_SRC[el.id] = 'upload';
  renderSrcTags();
}
function renderSrcTags(){
  WD.querySelectorAll('.src-tag').forEach(t=>{ if(!FIELD_SRC[t.dataset.for]) t.remove(); });
  Object.keys(FIELD_SRC).forEach(id=>{
    const el = WD.getElementById(id);
    const label = el && el.closest('.field') && el.closest('.field').querySelector('label');
    if(!label || label.querySelector('.src-tag')) return;
    const t = document.createElement('span');
    t.className = 'src-tag';
    t.dataset.for = id;
    t.textContent = '上傳';
    t.title = '由上傳的報告擷取，請核對';
    label.appendChild(t);
  });
}
WD.addEventListener('input', e=>{
  const t = e.target;
  if(e.isTrusted && t && t.id && FIELD_SRC[t.id]){ delete FIELD_SRC[t.id]; renderSrcTags(); }
}, true);

// eGFR 估算（CKD-EPI 2021，不分種族）。檢驗單有 eGFR 時以檢驗值為準，這裡只在沒有時補位。
function egfrEstimate(){
  const cr = parseFloat(WD.getElementById('lab-cr').value);
  const age = parseFloat(WD.getElementById('p-age').value);
  const sex = WD.getElementById('p-gender').value;
  if(isNaN(cr) || cr <= 0 || isNaN(age) || !sex) return null;
  const female = sex !== 'M';
  const k = female ? 0.7 : 0.9, a = female ? -0.241 : -0.302;
  const r = cr / k;
  return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) * Math.pow(0.9938, age) * (female ? 1.012 : 1);
}
function updateEgfrHint(){
  const el = WD.getElementById('egfr-est');
  if(!el) return;
  const e = egfrEstimate();
  const has = WD.getElementById('lab-egfr').value.trim() !== '';
  el.textContent = e == null ? '' : (has
    ? `依肌酸酐估算約 ${Math.round(e)}（CKD-EPI 2021）；已有檢驗值，報告採用檢驗值。`
    : `未填檢驗值，報告將採用估算值 ${Math.round(e)}（依肌酸酐、年齡、性別以 CKD-EPI 2021 計算）。`);
}
['lab-cr','lab-egfr','p-birth-y','p-birth-m','p-birth-d','p-date'].forEach(id=>{
  const el = WD.getElementById(id);
  if(el) el.addEventListener('input', ()=> setTimeout(updateEgfrHint, 0));
});
WD.getElementById('p-gender').addEventListener('change', updateEgfrHint);
function setupUpload(kind, dropId, inputId, listId){
  const drop = WD.getElementById(dropId);
  const input = WD.getElementById(inputId);
  input.addEventListener('change', e=> handleFiles(kind, e.target.files, listId));
  drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', ()=> drop.classList.remove('dragover'));
  drop.addEventListener('drop', e=>{
    e.preventDefault(); drop.classList.remove('dragover');
    handleFiles(kind, e.dataTransfer.files, listId);
  });
}
setupUpload('lab','lab-drop','lab-file','lab-filelist');
setupUpload('tanita','tanita-drop','tanita-file','tanita-filelist');

async function handleFiles(kind, files, listId){
  await ensurePdfjs();
  for(const file of files){
    if(/^image\/(jpeg|png|webp)$/.test(file.type)){
      const url = await new Promise(r=>{ const fr = new FileReader(); fr.onload = ()=> r(fr.result); fr.onerror = ()=> r(''); fr.readAsDataURL(file); });
      if(url) uploadedFiles[kind].push({ name:file.name, pages:[url], text:'', image:true });
      continue;
    }
    if(file.type !== 'application/pdf'){ alert(file.name+' 不是 PDF 或圖檔（JPG、PNG），已略過'); continue; }
    const entry = { name:file.name, pages:[], text:'' };
    if(typeof pdfjsLib === 'undefined'){
      alert('PDF預覽元件載入失敗（可能是離線環境），已記錄檔名但無法產生預覽圖，需連網後重新整理頁面再試');
      uploadedFiles[kind].push(entry);
      continue;
    }
    try{
      // 抽血報告：用健檢報告的擷取（lab/lab.js），同時拿到頁面圖片、原始文字和逐列的檢驗值
      if(kind === 'lab'){
        const {rep, pages, text} = await ckParsePdf(file);
        Object.assign(entry, {pages, text, rows: rep.rows, date: rep.date || '', name: rep.name, chart: rep.chart, sex: rep.sex, birth: rep.birth});
        uploadedFiles[kind].push(entry);
        continue;
      }
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data:buf}).promise;
      for(let i=1;i<=pdf.numPages;i++){
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({scale:1.5});
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({canvasContext:canvas.getContext('2d'), viewport}).promise;
        entry.pages.push(canvas.toDataURL('image/jpeg',0.85));
        try{
          const textContent = await page.getTextContent();
          entry.text += textContent.items.map(it=>it.str).join(' ') + '\n';
          entry.lines = (entry.lines || '') + pdfTextLines(textContent).join('\n') + '\n';
        }catch(te){ console.warn('文字擷取失敗', te); }
      }
    }catch(err){
      console.error(err);
      alert(file.name+' 無法解析預覽，仍會保留檔名記錄');
    }
    uploadedFiles[kind].push(entry);
  }
  renderFileList(kind, listId);
  // 和健檢報告一樣，上傳後讀得到文字就直接帶入欄位（按鈕仍保留，可重新帶入）
  if([...files].some(f=> f.type === 'application/pdf') && uploadedFiles[kind].some(f=> f.text && f.text.trim())){
    if(kind === 'lab') fillCurrentLabFieldsFromUpload();
    else fillCurrentBodyFieldsFromUpload();
  }
  try{ renderNav(); }catch(e){}
}
function renderFileList(kind, listId){
  const list = WD.getElementById(listId);
  list.innerHTML = '';
  uploadedFiles[kind].forEach((f,idx)=>{
    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg> ${f.name}（${f.pages.length}頁）</span><span class="del" data-idx="${idx}">移除</span>`;
    list.appendChild(div);
    if(f.pages.length){
      const row = document.createElement('div');
      row.className = 'thumb-row';
      f.pages.forEach(p=>{ const img=document.createElement('img'); img.src=p; row.appendChild(img); });
      list.appendChild(row);
    }
  });
  list.querySelectorAll('.del').forEach(el=>{
    el.addEventListener('click', ()=>{
      uploadedFiles[kind].splice(parseInt(el.dataset.idx),1);
      renderFileList(kind, listId);
    });
  });
}

// ============================================================
// PDF 自動擷取數值到追蹤表（文字關鍵字比對，非AI，需人工核對）
// ============================================================
// 抽血報告：「帶入上方欄位」與「加入追蹤表」共用同一套關鍵字（LAB_CURRENT_EXTRACT_DICT）。
// 舊版追蹤表用另一套較短的關鍵字與 12 字元搜尋距離，ALT／AST 的欄名後面常接中文全名與單位
// （例如「GPT(ALT) 麩胺酸丙酮酸轉胺酶 U/L 25」），距離超過 12 字元就抓不到。
const EXTRACT_DICT = {
  lab: null,   // 於 LAB_CURRENT_EXTRACT_DICT 定義後指定
  body: {
    weight:['體重','体重','Weight'],
    bmi:['BMI'],
    fat:['體脂肪率','体脂肪率','脂肪率','PBF','Fat\\s*%'],
    muscle:['肌肉量','筋肉量','Muscle'],
    visceral:['內臟脂肪(?:指數|等級|レベル)?','内臓脂肪'],
    water:['水分率','體水分率','Water'],
    bmr:['基礎代謝(?:量|率)?','\\bBMR\\b'],
    bodyage:['身體年齡','体年齢','Body\\s*Age'],
  }
};
function extractDateFromText(text){
  let m = text.match(/(20\d{2})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if(m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = text.match(/民國?\s*(\d{2,3})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if(m) return `${parseInt(m[1])+1911}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return '';
}
const LAB_CURRENT_EXTRACT_DICT = {
  ac:['Glucose\\s*\\(?AC\\)?','AC\\s*Sugar','空腹血糖','FPG'],
  hba1c:['HbA1c','醣化血色素','糖化血色素'],
  homa:['HOMA-IR','HOMA'],
  tcho:['Cholesterol','總膽固醇','T-?CHO'],
  tg:['Triglyceride','三酸甘油酯','\\bTG\\b'],
  hdl:['HDL'],
  ldl:['LDL'],
  alt:['S-?GPT','\\bALT\\b','GPT','丙(?:胺|氨)酸(?:胺基)?轉(?:胺|氨)(?:基)?酶','丙酮酸轉(?:胺|氨)(?:基)?酶','Alanine\\s*amino-?transferase'],
  ast:['S-?GOT','\\bAST\\b','GOT','天門冬(?:胺|氨)酸(?:胺基)?轉(?:胺|氨)(?:基)?酶','草醋酸轉(?:胺|氨)(?:基)?酶','Aspartate\\s*amino-?transferase'],
  cr:['Creatinine','肌酸酐','\\bCr\\b'],
  egfr:['eGFR'],
  tsh:['\\bTSH\\b'],
  ua:['Uric\\s*Acid','尿酸','\\bUA\\b'],
};
EXTRACT_DICT.lab = LAB_CURRENT_EXTRACT_DICT;
const LAB_EXTRACT_GAP = 18, LAB_EXTRACT_WIDE_GAP = 45;
// 優品的抽血 PDF 依欄位位置讀出每一列（lab/lab.js 的 ckParsePdf，與健檢報告同一套），比關鍵字比對準；
// 讀不到列的 PDF（其他檢驗所、格式不同）才退回關鍵字比對。
function fillCurrentLabFieldsFromUpload(){
  const cur = wCurrentLabUpload();
  let fields = {};
  if(cur){
    cur.rows.forEach(r=>{
      const k = W_LAB_KEYMAP[r.key], v = ckNum(r.raw);
      if(k && v != null && !(k in fields)) fields[k] = String(v);
    });
    WD.getElementById('lab-rows').value = JSON.stringify(cur.rows.filter(r=> W_EXTRA_KEYS.includes(r.key)));
  } else {
    const allText = getUploadedPdfText('lab');
    if(allText === null) return;
    fields = extractFieldsFromText(allText, LAB_CURRENT_EXTRACT_DICT, LAB_EXTRACT_GAP, LAB_EXTRACT_WIDE_GAP);
  }
  const info = cur ? wFillInfoFromLab(cur) : [];
  const infoMsg = info.length ? `基本資料已帶入${info.join('、')}。` : '';
  const keys = Object.keys(fields);
  if(keys.length === 0){ alert(infoMsg + '未能自動辨識出可用數值，請於上方欄位手動輸入。'); return; }
  keys.forEach(k=>{
    const el = WD.getElementById('lab-'+k);
    if(el){ el.value = fields[k]; flashField(el); markUploaded(el); }
  });
  if('hba1c' in fields){ syncHba1c('lab-hba1c'); flashField(WD.getElementById('ms-hba1c')); }
  updateLabFlags();
  updateEgfrHint();
  renderLabRows();
  try{ applyMsAuto(); calcMetabolic(); }catch(e){}
  scheduleDraftSave();
}

// ============================================================
// 血液常規、尿液、BUN、free T4（健檢基礎套組的項目）：判讀用 lab/lab.js 的 ckJudge，與健檢報告共用，不另外寫一套
// ============================================================
// 共用檢驗代碼 → 減重報告的欄位（lab-xxx）
const W_LAB_KEYMAP = {glu:'ac', a1c:'hba1c', homa:'homa', tc:'tcho', tg:'tg', hdl:'hdl', ldl:'ldl', alt:'alt', ast:'ast',
  cr:'cr', egfr:'egfr', ua:'ua', tsh:'tsh', bun:'bun', ft4:'ft4', wbc:'wbc', hgb:'hgb', plt:'plt'};
// 另外逐列判讀的項目，依這個順序分組顯示
const W_EXTRA_KEYS = ['bun', 'ft4', ...CK_LAB.filter(x=> x[3] === '血液常規' || x[3] === '尿液').map(x=> x[0])];
// 有手動欄位的項目（沒有 PDF 時也能輸入）
const W_EXTRA_MANUAL = ['bun', 'ft4', 'wbc', 'hgb', 'plt'];
// 本次的抽血報告：讀得到列的 PDF 裡，收件日期最新的一份
function wCurrentLabUpload(){
  return uploadedFiles.lab.filter(f=> f.rows && f.rows.length)
    .sort((a, b)=> String(b.date || '').localeCompare(String(a.date || '')))[0] || null;
}
// 檢查日期一開頁預設是今天；自己改過就不再用 PDF 的收件日期覆蓋
let pDateTouched = false;
WD.getElementById('p-date').addEventListener('input', e=>{ if(e.isTrusted) pDateTouched = true; });
// 基本資料：和健檢報告一樣，從抽血 PDF 帶入姓名、病歷號、性別、出生日期、檢查日期（年齡由生日與檢查日期算出）。
// 已經填過的欄位不覆蓋；回傳帶入了哪些欄位
function wFillInfoFromLab(cur){
  const done = [];
  const put = (id, v, label)=>{
    const el = WD.getElementById(id);
    if(!el || !v || String(el.value || '').trim()) return false;
    el.value = v; flashField(el); markUploaded(el); done.push(label);
    return true;
  };
  put('p-name', cur.name, '姓名');
  put('p-chart', cur.chart, '病歷號');
  if(put('p-gender', cur.sex, '性別')) WD.getElementById('p-gender').dispatchEvent(new Event('change', {bubbles: true}));
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cur.birth || '');
  if(b && !WD.getElementById('p-birth').value){
    ['y', 'm', 'd'].forEach((k, i)=>{ const el = WD.getElementById('p-birth-' + k); el.value = b[i + 1]; flashField(el); });
    markUploaded(WD.getElementById('p-birth-y'));
    done.push('出生日期');
  }
  const dt = WD.getElementById('p-date');
  if(cur.date && !pDateTouched && dt.value !== cur.date){ dt.value = cur.date; flashField(dt); markUploaded(dt); done.push('檢查日期'); }
  updateBirthHidden();
  if(WD.getElementById('p-age').value) done.push('年齡');
  return done;
}
function wPatient(){
  const sex = WD.getElementById('p-gender').value;
  const age = parseFloat(WD.getElementById('p-age').value);
  return {male: sex === 'M', female: sex === 'F', age: isNaN(age) ? null : age, preg: WD.getElementById('preg-plan').value === '懷孕中' ? 'yes' : ''};
}
// PDF 讀到的列為主；上方手動欄位有值時以欄位為準（改過的數值、或沒有 PDF 時手動輸入）
function wLabRows(){
  let rows = [];
  try{ rows = JSON.parse(WD.getElementById('lab-rows').value || '[]'); }catch(e){}
  rows = rows.filter(r=> W_EXTRA_KEYS.includes(r.key));
  const sexIdx = WD.getElementById('p-gender').value === 'F' ? 1 : 0;
  W_EXTRA_MANUAL.forEach(k=>{
    const v = (WD.getElementById('lab-' + k).value || '').trim();
    const r = rows.find(x=> x.key === k);
    if(r){ if(v && ckNum(v) !== ckNum(r.raw)){ r.raw = v; r.labFlag = ''; } return; }
    if(!v) return;
    const x = CK_LAB_BY[k], rf = CK_MANUAL_REF[k];
    rows.push({key: k, code: '', zh: x[2], raw: v, ref: Array.isArray(rf) ? rf[sexIdx] : (rf || ''), unit: x[4], sec: x[3], labFlag: ''});
  });
  const P = wPatient();
  return rows.sort((a, b)=> W_EXTRA_KEYS.indexOf(a.key) - W_EXTRA_KEYS.indexOf(b.key))
    .map(r=> Object.assign({}, r, {grp: CK_LAB_BY[r.key][3], flag: ckFlag(r), j: ckJudge(r, P)}));
}
// FIB-4：AST、ALT 用上方欄位，血小板用血液常規
function wFib4(){
  const plt = wLabRows().find(r=> r.key === 'plt');
  const rows = [['ast', WD.getElementById('lab-ast').value], ['alt', WD.getElementById('lab-alt').value], ['plt', plt ? plt.raw : '']]
    .filter(([, v])=> String(v || '').trim()).map(([key, raw])=> ({key, raw}));
  return ckFib4(rows, wPatient());
}

/* 心血管風險：公式在 lab/lab.js（ckPrevent、ckTwcccc），這裡只負責從減重欄位取值。
   吃 collectState() 格式的資料，回診時才能拿存檔的上一次紀錄用同一套重算 */
function wCvInputs(st){
  const n = k=> { const v = parseFloat(st[k]); return isNaN(v) ? null : v; };
  const bd = new Date(birthOf(st)), rd = new Date(st['p-date'] || todayLocal());
  let age = null;
  if(!isNaN(bd) && !isNaN(rd)){
    age = rd.getFullYear() - bd.getFullYear();
    const m = rd.getMonth() - bd.getMonth();
    if(m < 0 || (m === 0 && rd.getDate() < bd.getDate())) age--;
  }
  const h = n('b-height'), w = n('b-weight'), sex = st['p-gender'];
  return {
    age, male: sex === 'M', sexOk: sex === 'M' || sex === 'F',
    tc: n('lab-tcho'), hdl: n('lab-hdl'), ldl: n('lab-ldl'), a1c: n('lab-hba1c'), glu: n('lab-ac'), egfr: n('lab-egfr'),
    sbp: n('b-sbp'), bmi: h && w ? w / Math.pow(h / 100, 2) : null,
    dm: !!(st['cv-dm'] || st['med-insulin']), smoke: st['cv-smoke'] === 'current', smokeSet: !!st['cv-smoke'],
    bptx: !!(st['cv-bptx'] || st['med-bb']), statin: !!st['cv-statin'], cvd: !!st['cv-cvd']
  };
}
// 目標情境：同一個模型，收縮壓 120、LDL 100（沒有 LDL 就用非 HDL 膽固醇 130）、HbA1c 回到目標、目標體重的 BMI。
// 用藥與糖尿病診斷維持不變；只改比目前好的項目
function wCvTarget(I, st){
  const T = Object.assign({}, I), chg = [];
  if(I.sbp != null && I.sbp > 120){ T.sbp = 120; chg.push('收縮壓 120'); }
  if(I.tc != null && I.hdl != null){
    const cut = I.ldl != null ? I.ldl - 100 : I.tc - I.hdl - 130;
    if(cut > 0){ T.tc = Math.max(130, I.tc - cut); chg.push(I.ldl != null ? 'LDL 100' : '非 HDL 膽固醇 130'); }
  }
  if(I.a1c != null){
    const goal = I.dm ? 7 : 5.6;
    if(I.a1c > goal){ T.a1c = goal; chg.push('HbA1c ' + goal.toFixed(1)); }
  }
  const tw = parseFloat(st['b-target-weight']), h = parseFloat(st['b-height']);
  if(tw > 0 && h > 0 && I.bmi != null){
    const b = tw / Math.pow(h / 100, 2);
    if(b < I.bmi){ T.bmi = b; chg.push('目標體重 ' + tw + ' 公斤（BMI ' + b.toFixed(1) + '）'); }
  }
  return {T, chg};
}
// 上一次的紀錄：同姓名、同生日（兩邊都有病歷號時也要相同），檢查日期在這次之前的最近一筆。只讀已儲存的紀錄
function wPrevState(st){
  const name = (st['p-name'] || '').trim(), birth = birthOf(st), date = st['p-date'] || '', chart = (st['p-chart'] || '').trim();
  if(!name || !date) return null;
  return loadRecords().map(r=> r.state || {})
    .filter(s=> (s['p-name'] || '').trim() === name && birthOf(s) === birth && (s['p-date'] || '') && s['p-date'] < date &&
      !(chart && (s['p-chart'] || '').trim() && s['p-chart'].trim() !== chart))
    .sort((a, b)=> a['p-date'] < b['p-date'] ? 1 : -1)[0] || null;
}
function wCv(){
  const st = collectState(), I = wCvInputs(st);
  const pv = ckPrevent(I), tw = ckTwcccc(I);
  const ok = x=> !x.na && !x.miss && !x.range;
  const tg = wCvTarget(I, st);
  const target = ok(pv) && tg.chg.length ? {pv: ckPrevent(tg.T), chg: tg.chg} : null;
  const ps = wPrevState(st);
  const num = v=> { v = parseFloat(v); return isNaN(v) ? null : v; };
  const prev = ps ? {date: ps['p-date'], pv: ckPrevent(wCvInputs(ps)), w: num(ps['b-weight']), waist: num(ps['b-waist'])} : null;
  return {I, pv, tw, target, prev, date: st['p-date'], w: num(st['b-weight']), waist: num(st['b-waist'])};
}
const W_GCLS = ['g0', 'g1', 'g2'], W_GTXT = ['正常', '注意', '異常'];
function renderLabRows(){
  const box = WD.getElementById('w-labrows');
  if(!box) return;
  const rows = wLabRows();
  // 手動欄位旁也標偏高偏低（判讀與下方表格同一套）
  W_EXTRA_MANUAL.forEach(k=>{
    const input = WD.getElementById('lab-' + k), label = input && input.parentNode.querySelector('label');
    if(!label) return;
    let tag = label.querySelector('.lab-flag');
    if(!tag){ tag = document.createElement('span'); label.appendChild(tag); }
    const r = rows.find(x=> x.key === k), f = r && String(input.value || '').trim() ? r.flag : '';
    tag.className = 'lab-flag' + (f === 'H' ? ' hi' : f === 'L' ? ' lo' : '');
    tag.textContent = f === 'H' ? '偏高' : f === 'L' ? '偏低' : '';
    input.classList.toggle('lab-abn', !!f);
  });
  if(!rows.length){ box.innerHTML = '<div class="w-lab-empty">尚未有血液常規或尿液數值。上傳優品的抽血 PDF 會自動列出，或在上面三格手動輸入。</div>'; return; }
  let grp = '', html = '<table class="w-lab"><thead><tr><th>項目</th><th>本次</th><th>參考區間</th><th>判讀</th></tr></thead><tbody>';
  rows.forEach(r=>{
    if(r.grp !== grp){ grp = r.grp; html += `<tr class="sec"><td colspan="4">${wEsc(grp)}</td></tr>`; }
    const ar = r.flag === 'H' ? ' ↑' : r.flag === 'L' ? ' ↓' : '';
    const g = r.j.g;
    html += `<tr><td>${wEsc(r.zh || r.code)}${r.code ? ` <small style="color:var(--muted)">${wEsc(r.code)}</small>` : ''}</td>` +
      `<td>${wEsc(r.raw)}${ar} <small style="color:var(--muted)">${wEsc(r.unit || '')}</small></td><td class="ref">${wEsc(r.ref || '')}</td>` +
      `<td class="g ${g >= 0 ? W_GCLS[g] : ''}">${g >= 0 ? (r.j.pill || W_GTXT[g]) : ''}${r.j.d ? `<small style="font-weight:400; margin-left:6px">${wEsc(r.j.d)}</small>` : ''}</td></tr>`;
  });
  const F = wFib4();
  if(F && F.v != null) html += `<tr class="sec"><td colspan="4">肝纖維化指數</td></tr><tr><td>FIB-4</td><td>${F.v.toFixed(2)}</td><td class="ref">&lt; ${F.low}</td><td class="g ${W_GCLS[F.g]}">${W_GTXT[F.g]}<small style="font-weight:400; margin-left:6px">${wEsc(F.d)}</small></td></tr>`;
  box.innerHTML = html + '</tbody></table>';
}
WD.addEventListener('input', e=>{ if(e.target && /^(lab-|p-birth|p-date)/.test(e.target.id || '')) renderLabRows(); }, true);
WD.addEventListener('change', e=>{ if(e.target && (e.target.id === 'p-gender' || e.target.id === 'preg-plan')) renderLabRows(); }, true);
renderLabRows();
// 有多份 TANITA 時用量測日期最新的一份；日期相同或讀不到日期時，用最後上傳的一份
function tanitaPick(list){
  return list.map((x, i)=> ({x, i, d: tanitaDate(x.text)}))
    .sort((a, b)=> (b.d || '').localeCompare(a.d || '') || b.i - a.i)[0].x;
}

// 帶入規則：欄位空白、或目前的值本來就是上傳帶入的，才寫入；自己輸入或改過的值不覆蓋
function fillCurrentBodyFieldsFromUpload(){
  if(getUploadedPdfText('tanita') === null) return;
  const files = uploadedFiles.tanita.filter(f=> f.text && f.text.trim());
  const src = tanitaPick(files);
  const {f: fields} = tanitaParse(src.text, src.lines || '', WD.getElementById('b-height').value, FIELD_SRC['b-height'] !== 'upload');
  if(!Object.keys(fields).length){ alert('未能自動辨識出可用數值，此PDF可能無文字層或欄位名稱為圖片，請於下方欄位手動輸入。'); return; }
  // 帶入後不跳提示：帶入的欄位會閃一下並標「上傳」，自己改過的欄位維持不動
  Object.keys(fields).forEach(k=>{
    const el = WD.getElementById(k === 'weight' ? 'b-weight' : k === 'height' ? 'b-height' : 't-' + k);
    if(!el) return;
    if(el.value.trim() && FIELD_SRC[el.id] !== 'upload') return;
    el.value = fields[k]; flashField(el); markUploaded(el);
    if(k === 'weight' || k === 'height') el.dispatchEvent(new Event('input', {bubbles:true}));
  });
  try{ calcBMI(true); calcBody(); validateAllFields(); }catch(e){}
}

function extractFromUploads(kind){
  const files = uploadedFiles[kind];
  if(!files || !files.length){ alert('請先上傳PDF檔案'); return; }
  let added = 0;
  files.forEach(f=>{
    if(!f.text) return;
    const date = extractDateFromText(f.text) || (WD.getElementById('p-date').value || '');
    const fields = kind === 'lab'
      ? extractFieldsFromText(f.text, EXTRACT_DICT.lab, LAB_EXTRACT_GAP, LAB_EXTRACT_WIDE_GAP)
      : extractFieldsFromText(f.text, EXTRACT_DICT[kind]);
    if(Object.keys(fields).length === 0) return;
    const row = {};
    TRACK_COLS[kind].forEach(([key])=> row[key] = '');
    row.date = date;
    Object.keys(fields).forEach(k=>{ if(row.hasOwnProperty(k)) row[k] = fields[k]; });
    trackData[kind].push(row);
    added++;
  });
  renderTrackTable(kind);
  if(added){
    alert(`已自動擷取 ${added} 筆資料到追蹤表，擷取結果為關鍵字比對，非AI判讀，請務必核對數值與日期是否正確，如有誤請直接於表格內修改。`);
  } else {
    alert('未能自動辨識出可用數值，請於下方表格手動輸入。若PDF為掃描圖檔（無文字層）則無法自動擷取。');
  }
}

// ============================================================
// 共病症整合評估
// ============================================================
makeTagPicker('comorbid-list', 'cm-note', COMORBID_TAGS, null, 'cm-other-text');

// ============================================================
// 熱量計算
// ============================================================
// 熱量與營養素計算（不動畫面）。BMR 有 TANITA 實測值（手動輸入或上傳擷取）就用實測值，沒有才用 Mifflin-St Jeor 公式估算。
// 缺活動量或減重速度時回傳 error，並附上已算得出的 BMR，報告可以只列 BMR。
function computeCalorie(){
  const hM = getHeightM();
  const w = parseFloat(WD.getElementById('b-weight').value);
  const age = parseFloat(WD.getElementById('p-age').value);
  const gender = WD.getElementById('p-gender').value;
  const measuredBmr = parseFloat(WD.getElementById('t-bmr').value);
  const hasMeasured = !isNaN(measuredBmr) && measuredBmr > 0;
  if(!hasMeasured && (!hM || !w || isNaN(age))) return {error:'請先完成基本資料（出生日期、身高、體重）'};
  if(!hM || !w) return {error:'請先於「基本資料」頁填寫身高體重', bmr: hasMeasured ? measuredBmr : null, bmrSrc:'measured'};
  if(!gender) return {error:'請先於「基本資料」頁選擇性別', bmr: hasMeasured ? measuredBmr : null, bmrSrc:'measured'};
  let bmr, bmrSrc;
  if(hasMeasured){
    bmr = measuredBmr; bmrSrc = 'measured';
  } else {
    bmr = gender === 'M'
      ? 10*w + 6.25*(hM*100) - 5*age + 5
      : 10*w + 6.25*(hM*100) - 5*age - 161;
    bmrSrc = 'formula';
  }
  const actSel = WD.getElementById('cal-activity'), goalSel = WD.getElementById('cal-goal');
  if(actSel.value === '' || goalSel.value === ''){
    return {error:'請先點選「活動量等級」與「減重目標速度」，再計算熱量建議。', bmr, bmrSrc};
  }
  const optText = sel=> (sel.options[sel.selectedIndex] || {}).text || '';
  const palLabel = optText(actSel).split('（')[0] + '，活動係數 ' + actSel.value;
  const goalLabel = optText(goalSel).split('（')[0] + (parseFloat(goalSel.value) > 0 ? '，每日減少 ' + goalSel.value + ' kcal' : '');
  const pal = parseFloat(actSel.value);
  const tdee = bmr * pal;
  const deficit = parseFloat(goalSel.value);
  let target = tdee - deficit;

  const minSafe = gender === 'M' ? 1500 : 1200;
  let safetyNote = '';
  if(target < minSafe){
    safetyNote = `※ 計算目標低於建議安全下限（${minSafe} kcal/日），已自動調整至安全下限，建議搭配醫療監督進行更積極的減重計畫。`;
    target = minSafe;
  }

  // 蛋白質以運動處方的表現型決定係數，兩頁採同一套標準，避免報告出現兩種建議。
  // 參考體重：BMI 40 以下用實際體重；BMI 40 以上改用調整體重
  // （理想體重＋0.25×超出量），避免高體重者算出難以執行的蛋白質量。
  const bmiNow = w / (hM * hM);
  const ibw = 22 * hM * hM;
  const useAdjusted = bmiNow >= 40;
  const refW = useAdjusted ? (ibw + 0.25 * (w - ibw)) : w;
  const refLabel = useAdjusted
    ? `調整體重 ${refW.toFixed(1)} kg（BMI ≥ 40，以理想體重＋0.25×超出量估算）`
    : `目前體重 ${w.toFixed(1)} kg`;

  const bodyFat = parseFloat(WD.getElementById('t-fat').value);
  const smi = parseFloat(WD.getElementById('t-smi').value);
  const phaseAngle = parseFloat(WD.getElementById('t-phaseangle').value);
  let phenotype = null, perKg = 1.2;
  try{
    phenotype = classifyExercisePhenotype(gender, bmiNow, bodyFat, smi, phaseAngle);
    const rx = EXERCISE_PRESCRIPTIONS[phenotype];
    if(rx && rx.proteinPerKg) perKg = rx.proteinPerKg;
  }catch(e){}

  const proteinG = refW * perKg;
  const proteinKcal = proteinG * 4;
  const fatKcal = target * 0.25;
  const fatG = fatKcal / 9;
  const carbKcal = target - proteinKcal - fatKcal;
  const carbG = carbKcal / 4;

  // 碳水過低時提醒，避免熱量赤字與高蛋白同時設定而擠壓到碳水
  let macroNote = '';
  if(carbG < 100){
    macroNote = `※ 依目前設定，碳水化合物僅剩 ${Math.round(carbG)} g/日。建議放寬熱量赤字或下修蛋白質目標，並於門診確認可行性。`;
  }
  return {bmr, bmrSrc, tdee, target, proteinG, proteinKcal, fatG, fatKcal, carbG, carbKcal, safetyNote, macroNote, perKg, refLabel, phenotype, palLabel, goalLabel};
}

function calcCalorie(){
  const c = computeCalorie();
  if(c.error){ alert(c.error); return; }
  const {bmr, tdee, target, proteinG, proteinKcal, fatG, fatKcal, carbG, carbKcal, safetyNote, macroNote, perKg, refLabel, phenotype} = c;
  WD.getElementById('cal-bmr').innerHTML = Math.round(bmr) + '<span class="unit"> kcal</span>' +
    `<div class="hint" style="font-size:13px">${bmrSrcText(c)}</div>`;
  WD.getElementById('cal-tdee').innerHTML = Math.round(tdee) + '<span class="unit"> kcal</span>';
  WD.getElementById('cal-target').innerHTML = Math.round(target) + '<span class="unit"> kcal</span>';

  WD.getElementById('macro-protein-label').textContent =
    `蛋白質（${phenotype || '一般'}：${perKg} g/kg × ${refLabel}）`;
  WD.getElementById('macro-protein').textContent = `${Math.round(proteinG)} g（約 ${Math.round(proteinKcal)} kcal）`;
  WD.getElementById('macro-fat').textContent = `${Math.round(fatG)} g（約 ${Math.round(fatKcal)} kcal）`;
  WD.getElementById('macro-carb').textContent = `${Math.round(carbG)} g（約 ${Math.round(carbKcal)} kcal）`;

  const noteEl = WD.getElementById('cal-safety');
  noteEl.textContent = [safetyNote, macroNote].filter(Boolean).join('　');

  WD.getElementById('cal-result').style.display = 'block';
  window._calorieData = c;
}
function bmrSrcText(c){
  if(c.bmrSrc !== 'measured') return '依 Mifflin-St Jeor 公式估算（沒有 TANITA 實測值）';
  return FIELD_SRC['t-bmr'] === 'upload' ? '採用 TANITA 實測值（上傳報告擷取）' : '採用 TANITA 實測值';
}

// ============================================================
// 運動建議
// ============================================================

// 依本次實測與檢驗數值（rCollect，與報告同一套判讀）逐條加上個人化提醒，句子帶入病人自己的數值
function exerciseAdjustments(){
  const d = rCollect(), L = d.lab, B = d.body;
  const out = [];
  const cm = WD.getElementById('cm-note').value;
  const txs = getTxChoices();
  const glp1 = txs.some(k=> k !== 'lifestyle');

  if(d.bmi != null && d.bmi >= 35)
    out.push(`BMI ${d.bmi.toFixed(1)}，膝踝負擔大：先以水中運動、固定式腳踏車、橢圓機為主，暫不跑步與跳躍。`);
  else if(d.bmi != null && d.bmi >= 30)
    out.push(`BMI ${d.bmi.toFixed(1)}：先用快走、腳踏車建立基礎體能，體重下降約 5% 後再加入慢跑。`);

  if(d.sbp != null && d.dbp != null){
    const bp = `血壓 ${d.sbp}/${d.dbp} mmHg`;
    if(d.sbp >= 160 || d.dbp >= 100) out.push(`${bp}：血壓控制到 160/100 以下之前，暫不做高強度間歇與大重量訓練；阻力訓練全程規律呼吸，不要憋氣。`);
    else if(d.gBp === 2) out.push(`${bp}：以中等強度有氧為主，阻力訓練不要憋氣，運動前後量血壓。`);
    else if(d.gBp === 1) out.push(`${bp}，略高：每週累積 150 分鐘以上中等強度有氧，有助於降低血壓。`);
  }

  const glu = [];
  if(L.ac.v != null && L.ac.g >= 1) glu.push(`空腹血糖 ${L.ac.v} mg/dL`);
  if(L.hba1c.v != null && L.hba1c.g >= 1) glu.push(`HbA1c ${L.hba1c.v}%`);
  if(glu.length){
    out.push(`${glu.join('、')}：每餐飯後 30 分鐘內快走 10 至 15 分鐘，可壓低飯後血糖；每週至少 2 次阻力訓練，改善胰島素敏感度。`);
    if((L.ac.v != null && L.ac.v >= 126) || (L.hba1c.v != null && L.hba1c.v >= 6.5) || chk('med-insulin'))
      out.push('已達糖尿病範圍：若使用胰島素或磺醯尿素類藥物，運動前後量血糖，隨身帶糖果，避免空腹運動。');
  }

  const lip = [];
  if(L.tg.v != null && L.tg.g >= 1) lip.push(`三酸甘油酯 ${L.tg.v} mg/dL`);
  if(L.hdl.v != null && L.hdl.g >= 1) lip.push(`HDL-C ${L.hdl.v} mg/dL 偏低`);
  if(d.gFatty >= 1) lip.push(d.fatty);
  else if((L.alt.v != null && L.alt.g >= 1)) lip.push(`ALT ${L.alt.v} U/L`);
  if(lip.length) out.push(`${lip.join('、')}：有氧運動每週累積 150 至 300 分鐘，中等強度即可，持續的總量比強度更重要。`);

  const vis = B['t-visceral'].v;
  if((d.waist != null && d.gWaist >= 1) || (vis != null && B['t-visceral'].g >= 1)){
    const p = [];
    if(d.waist != null && d.gWaist >= 1) p.push(`腰圍 ${d.waist} 公分`);
    if(vis != null && B['t-visceral'].g >= 1) p.push(`內臟脂肪等級 ${vis}`);
    out.push(`${p.join('、')}：腹部脂肪靠全身性有氧與飲食減少，局部的仰臥起坐無法針對性消除。`);
  }

  const smi = B['t-smi'], pa = B['t-phaseangle'];
  if((smi.v != null && smi.g >= 1) || (pa.v != null && pa.g >= 1)){
    const p = [];
    if(smi.v != null && smi.g >= 1) p.push(`SMI ${smi.v} kg/m²`);
    if(pa.v != null && pa.g >= 1) p.push(`相位角 ${pa.v}°`);
    out.push(`${p.join('、')} 偏低：每週 2 至 3 次阻力訓練不可省略，減重期間蛋白質要吃足，避免減掉的是肌肉。`);
  }
  if(glp1) out.push('使用腸泌素類藥物時體重下降較快，肌肉也容易跟著流失，阻力訓練要從開始用藥的第一週就做。');

  if(d.sb != null && d.gSb >= 1 && !cm.includes('阻塞性睡眠呼吸中止症'))
    out.push(`STOP-BANG ${d.sb} 分，睡眠呼吸中止症${d.gSb === 2 ? '高' : '中'}風險：白天易疲倦，運動排在白天，睡前 2 小時內不做劇烈運動。`);
  if(d.phq && d.gPhq >= 1)
    out.push(`PHQ-9 ${d.phq.total} 分：先從每天散步 10 分鐘這類容易做到的目標開始，規律運動對情緒也有幫助。`);
  if(L.egfr.v != null && L.egfr.g >= 1)
    out.push(`eGFR ${L.egfr.v}：運動中適量補水，避免脫水；蛋白質攝取量請依醫師建議，不要自行大幅增加。`);
  if(d.age != null && d.age >= 65)
    out.push(`${d.age} 歲：每週加入 2 至 3 次平衡訓練（單腳站立、直線行走），預防跌倒。`);

  const act = WD.getElementById('cal-activity').value;
  if(act === '1.2') out.push('目前幾乎沒有運動：前 2 週先從每天快走 15 至 20 分鐘開始，每週增加 5 分鐘，逐步達到上方的頻率。');
  else if(act === '1.375') out.push('目前已有輕度活動：維持原本習慣，每週再多加 1 次阻力訓練。');
  return out;
}

function genExercise(){
  const hM = getHeightM();
  const w = parseFloat(WD.getElementById('b-weight').value);
  const bmi = (hM && w) ? w/(hM*hM) : null;
  const gender = WD.getElementById('p-gender').value;
  const bodyFat = parseFloat(WD.getElementById('t-fat').value);
  const smi = parseFloat(WD.getElementById('t-smi').value);
  const phaseAngle = parseFloat(WD.getElementById('t-phaseangle').value);
  const cmText = WD.getElementById('cm-note').value;
  const joint = cmText.includes('退化性關節炎');
  const dm = cmText.includes('糖尿病');
  const osa = cmText.includes('阻塞性睡眠呼吸中止症');
  const nafld = cmText.includes('脂肪肝');
  const pmos = /PMOS|PCOS|多囊/.test(cmText);

  if(bmi === null){ alert('請先於「基本資料」頁填寫身高體重'); return; }

  const classification = classifyExercisePhenotype(gender, bmi, bodyFat, smi, phaseAngle);
  const rx = EXERCISE_PRESCRIPTIONS[classification];

  let lines = [];
  lines.push(`【生理分型】${classification}`);
  lines.push(`訓練主軸：${rx.focus}`);
  lines.push('');
  lines.push('【有氧運動】');
  lines.push(`• 種類：${rx.aerobic.type}`);
  lines.push(`• 強度：${rx.aerobic.intensity}`);
  lines.push(`• 頻率：${rx.aerobic.frequency}`);
  lines.push('');
  lines.push('【阻力訓練】');
  lines.push(`• 種類：${rx.resistance.type}`);
  lines.push(`• 強度：${rx.resistance.intensity}`);
  lines.push(`• 頻率：${rx.resistance.frequency}`);
  if(joint) lines.push('• 關節負擔問題者，建議由物理治療師或教練指導動作，優先選擇低衝擊訓練');
  const adj = exerciseAdjustments();
  if(adj.length){
    lines.push('');
    lines.push('【依本次檢查數值調整】');
    adj.forEach(t=> lines.push('• ' + t));
  }
  lines.push('');
  lines.push('【營養與恢復策略】');
  lines.push(`• 核心策略：${rx.nutrition.strategy}`);
  lines.push(`• 蛋白質需求：${rx.nutrition.protein}`);
  lines.push(`• 重點提醒：${rx.nutrition.notes}`);
  lines.push('');
  lines.push('【日常活動建議】');
  lines.push('• 減少久坐，每小時起身活動 3 至 5 分鐘');
  lines.push('• 增加日常步數目標，建議每日 7,000 至 10,000 步');

  // 共病勾選的通用提醒：上方已依實測數值寫過同一件事時就不再重複
  const adjText = adj.join('');
  if(dm && !adjText.includes('血糖')){ lines.push(''); lines.push('※ 糖尿病前期／糖尿病者，運動前後建議監測血糖，避免空腹劇烈運動造成低血糖'); }
  if(osa){ lines.push(''); lines.push('※ 阻塞性睡眠呼吸中止症者，建議規律有氧運動有助改善病情，但避免睡前劇烈運動影響睡眠品質'); }
  if(nafld && !adjText.includes('脂肪肝')){ lines.push(''); lines.push('※ 脂肪肝患者，規律有氧運動搭配飲食調整為主要治療方式，建議持續規律執行'); }
  if(pmos){ lines.push(''); lines.push('※ 多囊性卵巢症候群（PCOS）患者，規律運動有助改善胰島素阻抗，建議阻力訓練與有氧並重'); }
  if(isNaN(smi) || isNaN(phaseAngle)){ lines.push(''); lines.push('※ 提醒：本分型未納入 SMI 或相位角數值（未填寫），如 TANITA 機型有提供，建議補充填寫以提高分型準確度'); }

  WD.getElementById('ex-text').value = lines.join('\n');
}

// ============================================================
// 藥物衛教自動帶入
// ============================================================
const MED_EDU = {
  '': '【生活型態介入為主】\n目前階段以飲食調整、運動、行為改變與睡眠管理為核心，暫不使用藥物治療。若 3 至 6 個月效果不足，或 BMI／共病已達介入標準，可與醫師討論藥物治療選項。',
  'rybelsus': '【Rybelsus 瑞倍適 用藥衛教】\n每日早上空腹服用，配不超過120mL的白開水整顆吞服，服藥後至少等30分鐘再進食、喝水或服用其他口服藥物。切勿壓碎、剝半、咀嚼。\n\n【緩解腸胃不良反應】\n• 適度運動\n• 飯後避免躺下\n• 避免睡前用餐\n• 避免油炸刺激食物\n• 少量多餐、慢食\n• 有飽足感就停止進食\n\n常見副作用：噁心、嘔吐、腹瀉、便秘、食慾降低。若懷孕、哺乳中，或有甲狀腺髓質癌／MEN2家族史、胰臟炎病史，請主動告知醫師。',
  'wegovy': '【Wegovy 週纖達 用藥衛教】\n每週固定一天皮下注射，起始劑量依照醫師建議，並依照醫囑逐月調整劑量至穩定控制。\n\n漏打處理：\n錯過的劑量在4天（96小時）內盡快補打；\n超過4天則跳過本次，於原訂日期打下一劑。\n連續漏打多劑時，請先詢問醫師，可能需從較低劑量重新開始。不可施打雙倍劑量。\n如需更改每週施打日：兩劑之間需間隔至少3天（超過72小時）。\n\n【緩解腸胃不良反應】\n• 適度運動\n• 飯後避免躺下\n• 避免睡前用餐\n• 避免油炸刺激食物\n• 少量多餐、慢食\n• 有飽足感就停止進食\n\n常見副作用：噁心、嘔吐、腹瀉、便秘、食慾降低。若懷孕、哺乳中，或有甲狀腺髓質癌／MEN2家族史、胰臟炎病史，請主動告知醫師。',
  'mounjaro': '【Mounjaro 猛健樂 用藥衛教】\n每週固定一天皮下注射，起始劑量依照醫師建議，並依照醫囑逐月調整劑量至穩定控制。\n\n漏打處理：\n錯過的劑量在4天（96小時）內盡快補打；\n超過4天則跳過本次，於原訂日期打下一劑。\n連續漏打多劑時，請先詢問醫師，可能需從較低劑量重新開始。不可施打雙倍劑量。\n如需更改每週施打日：兩劑之間需間隔至少3天（超過72小時）。\n\n【緩解腸胃不良反應】\n• 適度運動\n• 飯後避免躺下\n• 避免睡前用餐\n• 避免油炸刺激食物\n• 少量多餐、慢食\n• 有飽足感就停止進食\n\n常見副作用：噁心、嘔吐、腹瀉、便秘、食慾降低。若懷孕、哺乳中，或有甲狀腺髓質癌／MEN2家族史、胰臟炎病史，請主動告知醫師。',
};
// 依複選結果合併衛教內容；沒有選任何項目時清空
// 男性不帶懷孕、哺乳的提醒，甲狀腺髓質癌與胰臟炎照常提醒
function medEduText(male){
  const parts = getTxChoices().map(k=> MED_EDU[TX_OPTIONS.find(o=> o.key === k).edu] || '').filter(Boolean);
  const t = parts.join('\n\n');
  return male ? t.replace(/若懷孕、哺乳中，或有/g, '若有') : t;
}
function genMedEdu(){
  const ta = WD.getElementById('tx-edu');
  ta.value = medEduText(WD.getElementById('p-gender').value === 'M');
  if(typeof autoGrow === 'function') autoGrow(ta);
}
// 性別改了：衛教文字還是另一個性別的預設版本（醫師沒改過）就重新帶入
WD.getElementById('p-gender').addEventListener('change', ()=>{
  const ta = WD.getElementById('tx-edu'), male = WD.getElementById('p-gender').value === 'M';
  if(ta.value && ta.value === medEduText(!male)) genMedEdu();
  wSexUi();
});
// 男性隱藏只和女性有關的欄位：生育計畫、PCOS、荷爾蒙避孕藥。已勾的值不清掉，報告端男性不列
function wSexUi(){
  const male = WD.getElementById('p-gender').value === 'M';
  WD.querySelectorAll('.f-only, #w-preg-box').forEach(e=> e.style.display = male ? 'none' : '');
  WD.querySelectorAll('#comorbid-list .tag').forEach(t=>{ if(/PCOS/.test(t.textContent)) t.style.display = male ? 'none' : ''; });
  wWarnSync();
}

// 報告「提早就醫」：wWarn 為 null 就用依用藥與性別產生的預設文字；醫師改過就照改過的存檔與列印，全部刪空就不印
let wWarn = null;
// 腸胃副作用與脫水是用藥的警示；沒用藥時只留快速減重可能引起的膽結石。懷孕、哺乳只提醒女性
function wWarnDefault(){
  const onMed = getTxChoices().some(k=> k !== 'lifestyle');
  const male = WD.getElementById('p-gender').value === 'M';
  return [onMed ? '上腹痛延伸到背部、持續嘔吐無法進食，或出現黃疸，請立即就醫。' :
      '上腹痛延伸到背部，或出現黃疸，請立即就醫；體重下降快的時候，膽結石的機會會增加。',
    onMed && '嚴重腹瀉、頭暈、尿量明顯減少，可能是脫水，請盡快回診。',
    !male && (onMed ? '計畫懷孕、已懷孕或開始哺乳，請先停藥並回診討論。' : '計畫懷孕、已懷孕或開始哺乳，請回診討論減重計畫。'),
    '任何疑問，歡迎來電木子澄安診所 07-3739496，或於回診時與醫師討論。'].filter(Boolean).join('\n');
}
function wWarnText(){ return wWarn == null ? wWarnDefault() : wWarn; }
function wWarnSync(){
  const ta = WD.getElementById('warn-text');
  if(!ta) return;
  ta.value = wWarnText();
  if(typeof autoGrow === 'function') autoGrow(ta);
}
WD.getElementById('warn-text').addEventListener('input', e=>{ wWarn = e.target.value; scheduleDraftSave(); });
WD.getElementById('warn-reset').addEventListener('click', ()=>{ wWarn = null; wWarnSync(); scheduleDraftSave(); });

// ============================================================
// 飲食衛教
// ============================================================
const EDU_TEXT = {
  '減重飲食基本原則':'【減重飲食基本原則】\n以熱量赤字為核心，搭配均衡三大營養素分配，避免極端節食造成復胖與肌肉流失。減重關鍵不在藥物，而是良好飲食習慣與熱量管理。\n◆ 建議：\n• 定時定量，避免長時間空腹後暴食\n• 優先選擇原型食物，減少加工與精緻食品\n• 每餐蛋白質、蔬菜、全穀雜糧均衡搭配',
  '地中海飲食五原則':'【地中海飲食五原則】\n蔬果全穀、優質蛋白、好油堅果、喝水戒糖、原型天然。\n◆ 建議：\n• 每週至少2次魚類，尤其深海魚\n• 烹調以橄欖油取代動物性油脂\n• 大量蔬菜與豆類，適量堅果',
  '高蛋白策略':'【減重期高蛋白飲食策略】\n延長飽足感、避免肌肉流失、提升代謝率。\n◆ 建議：\n• 每日攝取【體重 × 1.2 至 1.5】公克蛋白質\n• 來源：雞胸肉、魚、蛋、豆腐、乳製品\n• 分散於三餐，避免集中單一餐攝取',
  '控制飢餓技巧':'【控制飢餓技巧】\n• 規律三餐不跳餐\n• 餐前喝清湯\n• 細嚼慢嚥20分鐘\n• 口渴別當飢餓，先補充水分\n• 準備低熱量點心備用\n• 睡滿7小時（睡眠不足會提高飢餓荷爾蒙）',
  '四大飲食重點':'【四大飲食重點】\n• 少量多餐，穩定血糖\n• 先吃蛋白質與蔬菜，再吃澱粉\n• 腸胃不適時選擇清淡食物\n• 定期追蹤，適時調整飲食計畫',
  '低GI飲食':'【低升糖指數（低GI）飲食】\n選擇消化吸收較慢、血糖上升較緩的食物，有助穩定血糖與延長飽足感。\n◆ 建議：\n• 主食以糙米、燕麥、全麥製品取代白飯白麵\n• 水果選擇芭樂、蘋果等中低GI選項，避免大量果汁\n• 進食順序：先蔬菜和蛋白質，最後吃澱粉類',
  '間歇性斷食':'【間歇性斷食（IF）】\n將進食時間限縮在特定時段內（如16:8），可作為熱量控制的輔助策略，非人人適用。\n◆ 建議：\n• 糖尿病、低血糖病史、孕婦不建議自行嘗試\n• 進食時段仍須注意營養均衡，非放縱進食\n• 建議先諮詢醫師評估是否適合',
  '外食族選擇技巧':'【外食族飲食選擇技巧】\n◆ 建議：\n• 優先選擇蒸、煮、烤、滷，避免油炸與勾芡\n• 便當選擇「三蔬一肉」，飯量減半並優先吃菜\n• 湯品選擇清湯，避免濃湯與勾芡羹湯\n• 含糖飲料改為無糖茶或水',
  '飲食紀錄與行為策略':'【飲食紀錄與行為改變策略】\n記錄飲食內容有助覺察飲食習慣，是體重管理的重要工具。\n◆ 建議：\n• 可用手機APP或筆記記錄三餐內容與份量\n• 留意情緒性進食（壓力、無聊時的進食行為）\n• 設定階段性小目標，避免一次設定過大目標造成挫折',
  '減重高原期因應':'【減重停滯期（高原期）因應】\n體重下降一段時間後趨緩為正常生理現象，非減重失敗。\n◆ 建議：\n• 重新檢視飲食紀錄，確認熱量攝取是否隨體重下降同步調整\n• 適度增加運動強度或變化訓練方式\n• 停滯期通常持續 2 至 4 週，勿因此放棄，必要時回診調整計畫',
  '蔬菜與纖維攝取':'【蔬菜與纖維攝取】\n膳食纖維延長飽足感、穩定血糖、改善腸道菌相。\n◆ 建議：\n• 每日至少3份蔬菜（1份約1碗），優先選深色蔬菜\n• 水果適量攝取，選擇連皮可食者增加纖維\n• 全穀雜糧取代部分精緻澱粉，增加纖維攝取量',
  '手搖飲與含糖飲料替代':'【手搖飲與含糖飲料替代策略】\n含糖飲料是熱量攝取的隱形殺手，戒除比想像中重要。\n◆ 建議：\n• 無糖茶、氣泡水、檸檬水取代手搖飲\n• 若無法立即戒除，先從全糖改半糖、微糖逐步減量\n• 留意「無糖」不等於「無熱量」（如珍珠、椰果仍有熱量）',
  '節慶聚餐因應技巧':'【節慶聚餐／應酬飲食因應技巧】\n偶爾聚餐不需過度焦慮，掌握原則即可將影響降到最低。\n◆ 建議：\n• 聚餐前先吃少量蛋白質或蔬菜墊胃，避免過度飢餓暴食\n• 優先選擇蒸煮烤，減少油炸與勾芡\n• 淺嚐重口味料理與甜點，避免多樣同時大量攝取\n• 聚餐後 1 至 2 天正常飲食即可，不需刻意節食彌補',
  '腸胃道副作用飲食調整':'【用藥期間腸胃道副作用飲食調整】\n使用GLP-1/GIP類藥物期間常見腸胃道不適，可透過飲食調整緩解。\n◆ 建議：\n• 少量多餐，避免一次進食過量\n• 避免高油、油炸、辛辣刺激性食物\n• 進食後避免立即躺下，可散步幫助腸胃蠕動\n• 症狀持續或惡化應回診與醫師討論劑量調整',
  '家庭支持與共餐策略':'【家庭支持與共餐策略】\n家人的飲食型態與支持程度，是減重成功與否的重要因素。\n◆ 建議：\n• 與家人溝通減重目標，尋求共餐時的體諒與配合\n• 避免家中囤積高熱量零食、含糖飲料\n• 鼓勵家人共同採買、備餐，建立健康飲食環境',
  '外出旅遊飲食因應':'【外出旅遊飲食因應】\n旅遊期間作息與飲食型態改變，容易造成短期體重波動。\n◆ 建議：\n• 早餐選擇原型食物為主，避免精緻澱粉過量\n• 善用步行探索景點，增加日常活動量\n• 不需為了維持飲食計畫犧牲旅遊體驗，返家後恢復規律即可',
  '減醣飲食觀念':'【減醣（低碳水）飲食觀念】\n適度減少精緻醣類攝取，非完全戒斷澱粉，避免影響長期代謝與情緒穩定。\n◆ 建議：\n• 減少含糖飲料、甜點、精製澱粉\n• 保留適量全穀雜糧類，勿極端斷醣\n• 搭配足夠蔬菜纖維攝取',
};
// ============================================================
// 通用標籤插入元件（點擊插入短句到指定textarea，可重複切換）
// ============================================================
// otherInputId：在標籤最後加一個「其他」，點選後出現輸入框，打的字以「• 其他：內容」寫進 textarea
function makeTagPicker(containerId, textareaId, phrases, preselected, otherInputId){
  const box = WD.getElementById(containerId);
  if(!box) return;
  box.innerHTML = '';
  const pre = preselected || [];
  if(otherInputId){
    const ta = ()=> WD.getElementById(textareaId);
    const isOtherLine = l=> /^• 其他(：|$)/.test(l.trim());
    const writeOther = (text)=>{
      const lines = ta().value.split('\n').filter(l=> !isOtherLine(l));
      if(text !== null){
        while(lines.length && !lines[lines.length - 1].trim()) lines.pop();
        lines.push('• 其他' + (text.trim() ? '：' + text.trim() : ''));
      }
      ta().value = lines.join('\n');
    };
    setTimeout(()=>{
      const tag = document.createElement('span');
      tag.className = 'tag tag-other';
      tag.textContent = '其他';
      const input = document.createElement('input');
      input.type = 'text';
      input.id = otherInputId;
      input.className = 'tag-other-text';
      input.setAttribute('aria-label', '其他（自行輸入）');
      input.hidden = true;
      tag.onclick = ()=>{
        tag.classList.toggle('selected');
        const on = tag.classList.contains('selected');
        input.hidden = !on;
        writeOther(on ? input.value : null);
        if(on) input.focus();
      };
      input.addEventListener('input', ()=> writeOther(input.value));
      box.appendChild(tag);
      box.appendChild(input);
    }, 0);
  }
  phrases.forEach(p=>{
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = p;
    tag.onclick = ()=>{
      tag.classList.toggle('selected');
      const ta = WD.getElementById(textareaId);
      if(tag.classList.contains('selected')){
        // 新選的項目插在「• 其他」那一行之前，讓「其他」永遠排在最後；醫師評語另有「預計回診」清單時插在清單前
        const lines = ta.value.replace(/\n+$/,'').split('\n').filter((l, i, a)=> !(a.length === 1 && !l.trim()));
        const oi = lines.findIndex(l=> /^(• 其他(：|$)|【預計回診】)/.test(l.trim()));
        if(oi >= 0) lines.splice(oi, 0, '• ' + p); else lines.push('• ' + p);
        ta.value = lines.join('\n');
      } else {
        ta.value = ta.value.split('\n').filter(line=>line.trim() !== '• '+p).join('\n');
      }
    };
    if(pre.includes(p)){
      tag.classList.add('selected');
      const ta = WD.getElementById(textareaId);
      const trimmed = ta.value.replace(/\n+$/,'');
      ta.value = (trimmed ? trimmed + '\n' : '') + '• ' + p;
    }
    box.appendChild(tag);
  });
}
makeTagPicker('family-history-tags', 'fam-note', FAMILY_HISTORY_TAGS, null, 'fam-other-text');



const categorySelections = {};
function renderCategoryGroup(containerId, categories, textareaId){
  const box = WD.getElementById(containerId);
  if(!box) return;
  box.innerHTML = '';
  categories.forEach(cat=>{
    const h3 = document.createElement('h3');
    h3.textContent = cat.label;
    box.appendChild(h3);
    if(cat.intro){
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.style.marginBottom = '8px';
      hint.textContent = cat.intro;
      box.appendChild(hint);
    }
    const wrap = document.createElement('div');
    wrap.className = 'choice-grid';
    wrap.style.marginBottom = '14px';
    cat.options.forEach(opt=>{
      const sep = opt.indexOf('：');
      const title = sep >= 0 ? opt.slice(0, sep) : opt;
      const desc = sep >= 0 ? opt.slice(sep + 1) : '';
      const label = document.createElement('label');
      label.className = 'ms-item';
      label.style.cursor = 'pointer';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = textareaId + '-' + cat.key;
      radio.onclick = ()=> selectCategoryOption(textareaId, categories, cat.key, opt);
      const textDiv = document.createElement('div');
      textDiv.innerHTML = `<div class="ms-title">${wEsc(title)}</div><div class="ms-desc">${wEsc(desc)}</div>`;
      label.appendChild(radio);
      label.appendChild(textDiv);
      wrap.appendChild(label);
    });
    box.appendChild(wrap);
  });
}
const CATEGORY_TEXT_HEADERS = { 'diet-habit-text': '飲食習慣：', 'activity-habit-text': '活動習慣：' };
function selectCategoryOption(textareaId, categories, catKey, optionText){
  if(!categorySelections[textareaId]) categorySelections[textareaId] = {};
  categorySelections[textareaId][catKey] = optionText;
  const ta = WD.getElementById(textareaId);
  const sel = categorySelections[textareaId];
  const header = CATEGORY_TEXT_HEADERS[textareaId] || '';
  const knownLabels = categories.map(c => c.label);
  const freeLines = ta.value.split('\n').filter(l => l.trim() !== '' && l !== header && !knownLabels.some(lab => l.startsWith(lab + '：')));
  const structuredLines = categories.filter(c => sel[c.key]).map(c => c.label + '：' + sel[c.key]);
  const allLines = header ? [header, ...structuredLines, ...freeLines] : [...structuredLines, ...freeLines];
  ta.value = allLines.join('\n');
}
renderCategoryGroup('diet-category-group', DIET_CATEGORIES, 'diet-habit-text');
renderCategoryGroup('activity-category-group', ACTIVITY_CATEGORIES, 'activity-habit-text');

const COMMENT_TAGS = [
  '已討論藥物治療選項並取得同意',
  '共病控制穩定，維持目前治療計畫',
  '體重下降未達預期目標，建議調整治療策略',
  '建議加強運動處方遵從度',
  '建議轉介營養師個別化飲食評估',
  '建議轉介身心科／心理諮商',
  '腸胃道副作用可耐受，劑量維持不變',
  '建議下次回診複查抽血與身體組成',
  '體重下降已達初始體重 5% 以上，成效良好',
  '建議調整藥物劑量並密切追蹤反應',
  '代謝症候群指標已改善，持續監測中',
  '建議安排腹部超音波追蹤脂肪肝變化',
  '患者減重動機與遵從度高，持續鼓勵',
  '建議加強睡眠衛生衛教，改善睡眠品質',
  '已衛教用藥注意事項與可能副作用',
  '建議搭配家庭支持系統以提升治療效果',
  '共病尚未達標，建議轉介相關專科共同照護',
];
// 醫師綜合評語草稿：依本次檢查結果組出 4 至 6 句，保留已點選的標籤句（「• 」開頭）
// silent：進入「報告輸出」頁時自動產生，不跳提醒；沒選性別就先不產生
function genDocComment(silent){
  if(silent){ if(!rS('p-gender')) return; }
  else if(rNeedGender()) return;
  const d = rCollect(), L = d.lab, B = d.body;
  const plain = html=> html.replace(/<br\s*\/?>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  const s = [];

  const head = [];
  if(d.bmi != null) head.push(`BMI ${d.bmi.toFixed(1)}（${d.bmiCat}）`);
  if(d.waist != null) head.push(`腰圍 ${d.waist} 公分`);
  if(head.length || d.msAny){
    const ms = d.msAny ? (d.msPositive ? `符合代謝症候群（五項符合 ${d.msCount} 項）` : `未達代謝症候群診斷標準（五項符合 ${d.msCount} 項）`) : '';
    s.push('本次評估 ' + head.join('，') + (head.length && ms ? '；' : '') + ms + '。');
  }

  // 優先處理事項：排除第一句已講過的 BMI、腰圍、代謝症候群，取最需要處理的前三項
  const skip = /^(BMI |腰圍 |符合代謝症候群)/;
  const top = rFindings(d).map(x=> plain(x.html)).filter(t=> !skip.test(t)).slice(0, 3);
  if(top.length) s.push('需要優先處理的是：' + top.join('；') + '。');

  const txs = getTxChoices();
  if(!txs.length || (txs.length === 1 && txs[0] === 'lifestyle')) s.push('本次以飲食與運動調整為主，暫不用藥。');
  else s.push(`治療選擇 ${txs.filter(k=> k !== 'lifestyle').map(k=> TX_OPTIONS.find(o=> o.key === k).title).join('、')}，搭配飲食與運動調整。`);

  if(d.bmi != null && d.bmi >= 24 && d.w != null){
    const lo = d.w * .05, hi = d.w * .10;
    s.push(`第一階段目標是 3 至 6 個月內減少體重 5% 至 10%，約 ${lo.toFixed(1)} 至 ${hi.toFixed(1)} 公斤，也就是體重降到 ${(d.w - hi).toFixed(1)} 至 ${(d.w - lo).toFixed(1)} 公斤。`);
  }

  const smi = B['t-smi'];
  if(smi.v != null && smi.g >= 1) s.push('肌肉量偏低，減重期間要同時做阻力訓練並吃足蛋白質。');
  if(d.sb != null && d.gSb === 2) s.push('睡眠呼吸中止症風險高，建議安排睡眠檢查。');
  if(d.phq && d.phq.item9 >= 1) s.push('情緒量表需要進一步評估，已建議轉介身心科。');
  else if(d.phq && d.gPhq === 2) s.push('憂鬱症狀較明顯，建議同時處理情緒與睡眠。');
  if(d.gThyUs >= 1 && txs.some(k=> k !== 'lifestyle')) s.push('甲狀腺超音波有發現，使用腸泌素類藥物前需確認結節性質。');

  // 醫師點選的片語放在回診清單前面，報告上才不會被排進「預計回診」底下
  const ta = WD.getElementById('doc-comment');
  ta.value.split('\n').filter(l=> /^•/.test(l.trim())).forEach(l=> s.push(l));

  const base = rS('p-date') || todayLocal();
  const onMed = txs.some(k=> k !== 'lifestyle');
  // 以「- 」開頭：報告排成條列，重新產生時也不會被當成片語保留下來
  s.push('【預計回診】');
  if(onMed){
    s.push(`- 一週後（${rAddDays(base, 7)}）確認副作用與劑量`);
    s.push(`- 一個月後（${rAddMonths(base, 1)}）測量體重並評估是否調整劑量`);
    s.push('- 一個療程（用完一盒藥物）測量身體組成');
  }else{
    s.push(`- 一個月後（${rAddMonths(base, 1)}）測量體重與身體組成，檢視飲食與運動執行狀況`);
  }
  s.push(`- 三個月後（${rAddMonths(base, 3)}）評估療效並複查抽血`);

  ta.value = s.join('\n');
}

makeTagPicker('comment-tags', 'doc-comment', COMMENT_TAGS, []);

const EDU_PRESELECTED = ['減重飲食基本原則','控制飢餓技巧','家庭支持與共餐策略'];
function initEdu(){
  const box = WD.getElementById('edu-tags');
  box.innerHTML = '';
  Object.keys(EDU_TEXT).forEach(topic=>{
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = topic;
    tag.onclick = ()=>{
      tag.classList.toggle('selected');
      const ta = WD.getElementById('edu-text');
      if(tag.classList.contains('selected')){
        ta.value += (ta.value ? '\n\n' : '') + EDU_TEXT[topic];
      }
    };
    if(EDU_PRESELECTED.includes(topic)){
      tag.classList.add('selected');
      const ta = WD.getElementById('edu-text');
      ta.value += (ta.value ? '\n\n' : '') + EDU_TEXT[topic];
    }
    box.appendChild(tag);
  });
}
initEdu();

// ============================================================
// 報告輸出
// ============================================================
function nl2br(s){ return wEsc(s).replace(/\n/g,'<br>'); }
function chk(id){ return WD.getElementById(id) && WD.getElementById(id).checked; }
function flashField(el){
  el.classList.add('auto-filled');
  setTimeout(()=>el.classList.remove('auto-filled'), 2500);
}

function getUploadedPdfText(kind){
  const files = uploadedFiles[kind];
  if(!files || !files.length){ alert('請先上傳PDF檔案'); return null; }
  const allText = files.map(f=>f.text||'').join('\n');
  if(!allText.trim()){ alert('未能讀取文字內容。圖檔與掃描的 PDF（沒有文字層）無法自動擷取，請於欄位手動輸入；檔案仍會附在報告最後。'); return null; }
  return allText;
}

function stripHeaderLine(text, header){
  return (text || '').split('\n').filter(l => l !== header).join('\n');
}
// 「其他」選項：有填文字就寫「其他：文字」，沒填就只寫「其他」
function otherLabel(textId){
  const t = (WD.getElementById(textId).value || '').trim();
  return t ? '其他：' + t : '其他';
}
// 勾選「其他」才顯示旁邊的輸入框；取消勾選時保留已輸入的文字，只是收起來
function syncOtherInputs(focus){
  WD.querySelectorAll('.chk-other').forEach(row=>{
    const box = row.querySelector('input[type=checkbox]');
    const txt = row.querySelector('.other-text');
    if(!box || !txt) return;
    txt.hidden = !box.checked;
    if(focus === box && box.checked) txt.focus();
  });
}
WD.addEventListener('change', e=>{
  if(e.target && e.target.closest && e.target.closest('.chk-other') && e.target.type === 'checkbox') syncOtherInputs(e.target);
}, true);
// 減重門診評估問卷：版面與題目在 forms/forms.js（與工作台共用），這裡帶入目前的病人姓名
function buildBlankScalesHtml(){
  return formScalesHtml({name: WD.getElementById('p-name').value});
}
function printBlankScales(){
  const tmp = document.createElement('div');
  tmp.innerHTML = buildBlankScalesHtml();
  // 問卷頁自帶頁首頁尾（頁尾為絕對定位，不佔版面高度），不套用報告的 table 包裝
  printIsolated(tmp.innerHTML, '減重門診評估問卷');
}

const EDU_PDF_PAGES = [
  {label:'臨床評估', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M5 3v6a4 4 0 0 0 8 0V3"/><path d="M3.5 3H5M13 3h1.5"/><path d="M9 13v2a5 5 0 0 0 9 3"/><circle cx="19" cy="16" r="2.5"/></svg>', src:'img/edu-clinical-assessment.webp'},
  {label:'肥胖與代謝症候群', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M12 4v17M8.5 21h7M4 7l8-2 8 2"/><path d="M4 7l-2 5a2.5 2.5 0 0 0 5 0z"/><path d="M20 7l-2 5a2.5 2.5 0 0 0 5 0z" transform="translate(-1 0)"/></svg>', src:'img/edu-obesity-metabolic-syndrome.webp'},
  {label:'肥胖是日漸嚴重的問題', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"/></svg>', src:'img/edu-obesity-trend.webp'},
  {label:'肥胖的成因', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M7 3c0 6 10 6 10 12M17 3c0 6-10 6-10 12"/><path d="M7 21c0-2 10-2 10 0M8 7h8M8.5 17h7"/></svg>', src:'img/edu-obesity-causes.webp'},
  {label:'何時介入與改善方式', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><rect x="7" y="2" width="10" height="16" rx="3"/><circle cx="12" cy="6" r="1.3"/><circle cx="12" cy="10" r="1.3"/><circle cx="12" cy="14" r="1.3"/><path d="M12 18v4"/></svg>', src:'img/edu-when-to-intervene.webp'},
  {label:'治療流程', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>', src:'img/edu-treatment-pathway.webp'},
  {label:'藥物選擇', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/></svg>', src:'img/edu-medication-options.webp'},
  {label:'用藥衛教', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M12 6.5C10.5 5 8.5 4.5 6 4.5H3v14h3c2.5 0 4.5.5 6 2 1.5-1.5 3.5-2 6-2h3v-14h-3c-2.5 0-4.5.5-6 2z"/><path d="M12 6.5v14"/></svg>', src:'img/edu-medication-guide.webp'},
  {label:'內視鏡減重', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M15 3c-3.9 0-6.5 2.6-6.5 6.5 0 2.5-1 3.2-2.4 4.1C4.7 14.5 3.5 15.6 3.5 18A3 3 0 0 0 9 19.7"/><path d="M9.5 9.5H19a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h-2"/></svg>', src:'img/edu-endoscopic-treatment.webp'},
  {label:'針劑注射與保存', printSplit:2, icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><path d="M17.5 3.5l3 3"/><path d="M19 8l-3-3L5.5 15.5 4 20l4.5-1.5z"/><path d="M13 7l4 4"/></svg>', src:'img/edu-glp1-injection-storage.webp'},
  {label:'追蹤與監測時程', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-0.14em;display:inline-block" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>', src:'img/edu-follow-up-schedule.webp'}
];

// 鍵盤：焦點在選項上時方向鍵改成上下捲動頁面（版面已改成一頁捲到底，不再左右換頁）。
// 焦點在輸入欄位（input/textarea/select）時不攔截，避免影響文字編輯。
WD.addEventListener('keydown', (e)=>{
  const t = e.target;
  const tag = t && t.tagName ? t.tagName.toLowerCase() : '';
  // 點過的選項（單選鈕、勾選框）會留住焦點，瀏覽器預設方向鍵會在同組選項間跳動。
  // 這裡改成：焦點在選項上時方向鍵不改選項，上下捲動頁面。
  const isChoice = tag === 'input' && (t.type === 'radio' || t.type === 'checkbox');
  if(isChoice && /^Arrow/.test(e.key)){
    e.preventDefault();
    if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){ WB.scrollBy({top: e.key === 'ArrowDown' ? 80 : -80}); return; }
    t.blur();
  }
  else if(tag === 'input' || tag === 'textarea' || tag === 'select' || (t && t.isContentEditable)) return;
});
// Esc：和健檢報告一樣，焦點在欄位上時先離開欄位，再按一次回到報告種類（預覽開著時由預覽自己處理）
WD.addEventListener('keydown', e=>{
  if(e.key !== 'Escape' || e.defaultPrevented) return;
  const t = e.target;
  if(t && t.matches && t.matches('input, textarea, select')){ e.preventDefault(); t.blur(); WB.focus({preventScroll: true}); return; }
  if(typeof setRep === 'function'){ e.preventDefault(); setRep('home'); }
});

// 健康紀錄表：版面在 forms/forms.js（與工作台共用），這裡把目前畫面的資料帶進去；空白時就是可手寫的空白表
function hrVal(id){ const el = WD.getElementById(id); return el ? (el.value || '').trim() : ''; }
function buildHealthRecordHtml(){
  const has0 = !!(hrVal('p-name') || hrVal('b-weight'));
  return formHealthRecordHtml({
    name: hrVal('p-name'), dob: hrVal('p-birth'), start: has0 ? hrVal('p-date') : '',
    height: hrVal('b-height'), weight: hrVal('b-weight'), target: hrVal('b-target-weight'), sex: hrVal('p-gender'),
    fatty: hrVal('us-fatty'), thy: hrVal('us-thyroid'), usText: hrVal('us-text'), thyText: hrVal('us-thyroid-text'),
    lab: trackData.lab, body: trackData.body,
    addDays: typeof rAddDays === 'function' ? rAddDays : null,
    addMonths: typeof rAddMonths === 'function' ? rAddMonths : null,
  });
}
function printHealthRecord(){
  printIsolated(buildHealthRecordHtml(), '健康紀錄表');
}

// ============================================================
// 追蹤趨勢圖：以內嵌 SVG 繪製，不依賴外部函式庫，離線與列印皆可用
// ============================================================
const TRACK_CHART_METRICS = {
  body: [['weight','體重','kg'],['bmi','BMI',''],['waist','腰圍','cm'],['fat','體脂肪率','%'],['muscle','肌肉量','kg']],
  lab:  [['hba1c','HbA1c','%'],['ac','空腹血糖','mg/dL'],['tg','三酸甘油酯','mg/dL'],['ldl','LDL-C','mg/dL'],['alt','ALT','U/L']]
};
const trackChartMetric = { body: 'weight', lab: 'hba1c' };

function trackChartPoints(kind, key){
  return (trackData[kind] || [])
    .map(r => ({ date: (r.date || '').trim(), v: parseFloat(r[key]) }))
    .filter(p => p.date && !isNaN(p.v))
    .sort((a,b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
}

function trackChartSvg(kind, key, title, w, h){
  const pts = trackChartPoints(kind, key);
  if(pts.length < 2) return '';
  const padL = 52, padR = 16, padT = 28, padB = 34;
  const innerW = w - padL - padR, innerH = h - padT - padB;
  let min = Math.min(...pts.map(p=>p.v)), max = Math.max(...pts.map(p=>p.v));
  if(min === max){ min -= 1; max += 1; }
  const span = max - min;
  min -= span * 0.12; max += span * 0.12;
  const x = i => padL + (pts.length === 1 ? innerW/2 : innerW * i / (pts.length - 1));
  const y = v => padT + innerH - (v - min) / (max - min) * innerH;

  const grid = [0, 0.5, 1].map(f=>{
    const val = min + (max - min) * (1 - f);
    const yy = padT + innerH * f;
    return `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${w-padR}" y2="${yy.toFixed(1)}" stroke="#E4DFD6" stroke-width="1"/>` +
           `<text x="${padL-8}" y="${(yy+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#7A756D">${val.toFixed(1)}</text>`;
  }).join('');

  const line = pts.map((p,i)=> `${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');

  // 依實際點距決定標示密度：點多時只標首末與最高最低，日期標籤依間距抽稀，
  // 避免歷次紀錄累積後文字互相重疊
  const step = pts.length > 1 ? innerW / (pts.length - 1) : innerW;
  const showAllValues = step >= 46;
  const iMin = pts.reduce((a,p,i)=> p.v < pts[a].v ? i : a, 0);
  const iMax = pts.reduce((a,p,i)=> p.v > pts[a].v ? i : a, 0);
  const dotR = pts.length > 16 ? 2.4 : 3.5;

  // 首末與極值可能落在同一點，去重後再標示，避免同位置疊字
  const keyIdx = new Set([0, pts.length - 1, iMin, iMax]);
  const dots = pts.map((p,i)=>{
    const key = keyIdx.has(i);
    const txt = (showAllValues || key)
      ? `<text x="${x(i).toFixed(1)}" y="${(y(p.v)-9).toFixed(1)}" text-anchor="middle" font-size="11" fill="#152831">${p.v}</text>`
      : '';
    return `<circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${dotR}" fill="#3E6A7C"/>` + txt;
  }).join('');

  const every = Math.max(1, Math.ceil(42 / step));
  const wanted = [];
  for(let i = 0; i < pts.length; i++){
    if(i === 0 || i === pts.length - 1 || i % every === 0) wanted.push(i);
  }
  const kept = [];
  wanted.forEach(i=>{
    const last = kept.length ? kept[kept.length-1] : null;
    if(last !== null && (x(i) - x(last)) < 38){
      if(i === pts.length - 1) kept.pop(); else return;
    }
    kept.push(i);
  });
  const labels = kept.map(i=>
    `<text x="${x(i).toFixed(1)}" y="${h-12}" text-anchor="middle" font-size="10.5" fill="#7A756D">${wEsc(pts[i].date.slice(5))}</text>`
  ).join('');

  const first = pts[0].v, last = pts[pts.length-1].v;
  const diff = last - first;
  const diffTxt = (diff > 0 ? '+' : '') + diff.toFixed(1);
  const diffColor = diff === 0 ? '#7A756D' : (diff < 0 ? '#4C7A5A' : '#B3413B');

  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; display:block; background:#fff; border:1px solid #E4DFD6; border-radius:10px" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="${padL}" y="18" font-size="13" font-weight="700" fill="#152831">${wEsc(title)}</text>` +
    `<text x="${w-padR}" y="18" text-anchor="end" font-size="12" fill="${diffColor}">首次至最近 ${diffTxt}</text>` +
    grid +
    `<path d="${line}" fill="none" stroke="#3E6A7C" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    dots + labels + `</svg>`;
}

function renderTrackChart(kind){
  const box = WD.getElementById('track-' + kind + '-chart');
  if(!box) return;
  const metrics = TRACK_CHART_METRICS[kind];
  const cur = trackChartMetric[kind];
  const pills = metrics.map(([key,label])=>
    `<span class="bn-pill${key === cur ? ' current' : ''}" style="cursor:pointer" onclick="setTrackMetric('${kind}','${key}')">${wEsc(label)}</span>`
  ).join('');
  const meta = metrics.find(m=>m[0] === cur) || metrics[0];
  const title = meta[1] + (meta[2] ? ' (' + meta[2] + ')' : '');
  const svg = trackChartSvg(kind, cur, title, 640, 220);
  box.innerHTML = `<div class="bn-pills" style="flex-wrap:wrap; overflow-x:visible; margin-bottom:10px">${pills}</div>` +
    (svg || '<div class="hint">此項目需要至少 2 筆含日期的數值才能繪製趨勢圖。</div>');
}
function setTrackMetric(kind, key){
  trackChartMetric[kind] = key;
  renderTrackChart(kind);
}

// ============================================================
// 資料完成度：產生報告前一眼看出還缺什麼
// ============================================================
const COMPLETENESS_RULES = [
  {screen:'basic',   label:'基本資料',   parent:null, check:()=>{
     const miss = [];
     if(!WD.getElementById('p-name').value.trim()) miss.push('姓名');
     if(!WD.getElementById('p-gender').value) miss.push('性別');
     if(!WD.getElementById('p-birth').value) miss.push('出生年月日');
     if(!WD.getElementById('p-date').value) miss.push('檢查日期');
     return miss;
   }},
  {screen:'basic',   label:'身高體重血壓', parent:'workflow-hub', check:()=>{
     const miss = [];
     if(!WD.getElementById('b-height').value) miss.push('身高');
     if(!WD.getElementById('b-weight').value) miss.push('體重');
     if(!WD.getElementById('b-waist').value) miss.push('腰圍');
     if(!WD.getElementById('b-sbp').value || !WD.getElementById('b-dbp').value) miss.push('血壓');
     return miss;
   }},
  {screen:'lab',     label:'抽血檢驗',   parent:'workflow-hub', check:()=>{
     const keys = [['lab-ac','空腹血糖'],['lab-hba1c','HbA1c'],['lab-tg','三酸甘油酯'],['lab-hdl','HDL-C']];
     return keys.filter(([id])=>!WD.getElementById(id).value).map(([,l])=>l);
   }},
  {screen:'calorie', label:'熱量與運動', parent:'workflow-hub', check:()=>
     (()=>{ const c = computeCalorie(); return c.error ? [c.error.replace(/^請先/, '').replace(/，再計算熱量建議。$/, '')] : []; })()},
  {screen:'report',  label:'醫師綜合評語', parent:'workflow-hub', check:()=>
     WD.getElementById('doc-comment').value.trim() ? [] : ['尚未填寫']}
];
function renderCompleteness(){
  const box = WD.getElementById('completeness-box');
  if(!box) return;
  const rows = COMPLETENESS_RULES.map(r=>{
    let miss = [];
    try{ miss = r.check() || []; }catch(e){ miss = []; }
    const ok = miss.length === 0;
    const jump = r.parent
      ? `showLeaf('${r.screen}','${r.parent}')`
      : `showLeaf('${r.screen}','workflow-hub')`;
    return `<tr><td style="white-space:nowrap">${wEsc(r.label)}</td>` +
      `<td>${ok ? '<span class="flag low">已完成</span>' : '<span class="flag mid">缺：' + wEsc(miss.join('、')) + '</span>'}</td>` +
      `<td style="white-space:nowrap"><button class="btn outline" style="padding:4px 12px; font-size:13.5px" onclick="${jump}">前往</button></td></tr>`;
  }).join('');
  const missingCount = COMPLETENESS_RULES.filter(r=>{ try{ return (r.check()||[]).length > 0; }catch(e){ return false; } }).length;
  const head = missingCount === 0
    ? '<div class="summary-box" style="margin-bottom:12px">所有主要項目皆已填寫。</div>'
    : `<div class="summary-box" style="margin-bottom:12px; background:var(--amber-pale); border-color:color-mix(in srgb,var(--primary) 30%,transparent)">尚有 <b>${missingCount}</b> 個區塊未完成。未填欄位不會阻擋報告產生，報告中會標示為「未測」或「未檢驗」。</div>`;
  box.innerHTML = head + '<div class="tt-wrap"><table class="dtable"><tr><th>區塊</th><th>狀態</th><th></th></tr>' + rows + '</table></div>';
}

// 篩檢卡片收合後，於標題顯示已勾選項目數，避免收合造成漏填而未被察覺
function updateScreeningSummary(){
  const el = WD.getElementById('screening-summary');
  if(!el) return;
  const ids = ['sc-thyroid','sc-cushing','sc-pcos','sc-hypothal','sc-gh','sc-hypogonad','sc-genetic','sc-other',
    'med-steroid','med-psych','med-insulin','med-bb','med-antiepileptic','med-hormone','med-antihistamine','med-chemo','med-other'];
  const c = ids.filter(id=>{ const e = WD.getElementById(id); return e && e.checked; }).length;
  el.textContent = c ? `已勾選 ${c} 項` : '尚未勾選，可視需要展開';
  el.style.color = c ? 'var(--primary)' : '';
}
WD.addEventListener('change', (e)=>{
  if(e.target && e.target.id && /^(sc|med)-/.test(e.target.id)) updateScreeningSummary();
}, true);
function getReportFilename(){
  const name = WD.getElementById('p-name').value.trim();
  // 另存 PDF 的預設檔名：姓名_減重_西元日期，例如「王小明_減重_20261021」
  return (name ? name + '_' : '') + '減重_' + (rS('p-date') || todayLocal()).replace(/-/g, '');
}


function showPrintBusy(text){
  hidePrintBusy();
  const el = document.createElement('div');
  el.className = 'print-busy no-print';
  el.id = 'print-busy';
  el.innerHTML = '<span class="dot"></span><span>' + wEsc(text || '正在準備列印…') + '</span>';
  WD.appendChild(el);
}
function hidePrintBusy(){
  const el = WD.getElementById('print-busy');
  if(el) el.remove();
}

// 以隱藏 iframe 列印，只會跳出列印對話框，不另開分頁
// opts.html：整份文件（取代預設的「本頁樣式＋bodyHtml」）；opts.prepare(doc)：列印前要先完成的排版，可回傳 Promise
function printIsolated(bodyHtml, title, opts){
  opts = opts || {};
  const prev = WD.getElementById('print-frame');
  if(prev) prev.remove();

  const frame = document.createElement('iframe');
  frame.id = 'print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed; left:-10000px; top:0; width:820px; height:1200px; border:0; opacity:0;';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = win.document;
  // 頁面樣式加上列印表單的共用樣式（forms/forms.js 放進來的那一段）
  const styles = [...WD.querySelectorAll('style')].map(s=> s.innerHTML).join('\n');
  doc.open();
  if(opts.html) doc.write(opts.html);
  else doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${wEsc(title)}</title>` +
    // 圖片改為外部檔案後，列印視窗需要 base 才能正確解析 img/ 相對路徑
    `<base href="${location.href}">` +
    `<style>${styles}
    body{background:#fff; margin:0;}
    .report-page{page-break-after:always; break-after:page;}
    .report-page:last-child{page-break-after:auto !important; break-after:auto !important;}
    @page{ margin:0; size:A4; }
  </style></head><body>${bodyHtml}</body></html>`);
  doc.close();

  const originalTitle = document.title;
  let done = false;
  let printMql = null;
  const cleanup = ()=>{
    if(done) return;
    done = true;
    hidePrintBusy();
    // 只還原自己設定過的標題，避免與另一次列印互相覆蓋
    if(document.title === title) document.title = originalTitle;
    // afterprint 是由實際執行列印的視窗發出，也就是 iframe 那一個，
    // 父視窗不一定收得到，因此兩邊都要監聽與移除
    try{ win.removeEventListener('afterprint', cleanup); }catch(e){}
    window.removeEventListener('afterprint', cleanup);
    if(printMql){
      try{ printMql.removeEventListener('change', onMqlChange); }catch(e){}
      printMql = null;
    }
    // 焦點先前被移進 iframe，不還原的話主畫面收不到鍵盤事件，
    // 方向鍵與快捷鍵會像是失效
    try{ window.focus(); }catch(e){}
    if(document.activeElement && document.activeElement.tagName === 'IFRAME'){
      try{ document.activeElement.blur(); }catch(e){}
    }
    // 刪除自己建立的那個 iframe，不用 id 查找，
    // 否則短時間內連按兩次列印時會誤刪後一次的 iframe
    setTimeout(()=>{ if(frame.parentNode) frame.parentNode.removeChild(frame); }, 800);
  };
  const onMqlChange = (e)=>{ if(!e.matches) cleanup(); };

  const run = ()=>{
    hidePrintBusy();
    try{
      fitPrintPages(doc);
      // 另存 PDF 時的預設檔名取自最上層文件標題
      document.title = title;
      // 兩個視窗都掛，並以 matchMedia 作為額外保險
      try{ win.addEventListener('afterprint', cleanup); }catch(e){}
      window.addEventListener('afterprint', cleanup);
      try{
        printMql = win.matchMedia && win.matchMedia('print');
        if(printMql && printMql.addEventListener) printMql.addEventListener('change', onMqlChange);
        else printMql = null;
      }catch(e){ printMql = null; }
      win.focus();
      win.print();
      setTimeout(cleanup, 60000);
    }catch(e){
      cleanup();
      alert('列印失敗：' + e.message);
    }
  };

  // 圖片為外部檔案，第一次列印需先下載完才能正確排版。
  // 期間顯示提示，並設 20 秒上限，避免網路異常時一直沒有反應。
  if(opts.prepare){
    showPrintBusy('正在排版報告…');
    Promise.resolve().then(()=> opts.prepare(doc, win))
      .catch(e=>{ console.error(e); alert('報告排版失敗：' + e.message); })
      .then(()=> setTimeout(run, 80));
    return;
  }
  const pending = [...doc.images].filter(img=> !img.complete)
    .map(img=> new Promise(r=>{ img.onload = img.onerror = r; }));
  if(pending.length) showPrintBusy('正在準備列印…（' + pending.length + ' 張圖片下載中）');
  const timeout = new Promise(r=> setTimeout(r, 20000));
  Promise.race([Promise.all(pending), timeout]).then(()=> setTimeout(run, 80));
}

// ============================================================
// SAVE / LOAD
// ============================================================
function collectState(){
  const ids = ['p-name','p-gender','p-birth-y','p-birth-m','p-birth-d','p-date','b-height',
    'sc-note','med-note','sc-other-text','med-other-text','diet-habit-text','activity-habit-text',
    'fam-note','preg-plan','motiv-score','motiv-support','fam-motiv-note',
    'b-weight','b-waist','b-sbp','b-dbp','b-target-weight',
    't-fat','t-fatmass','t-muscle','t-visceral','t-water','t-bmr','t-bodyage','t-smi','t-phaseangle',
    'us-fatty','us-text','us-thyroid','us-thyroid-text',
    'lab-ac','lab-hba1c','lab-homa','lab-tcho','lab-ldl','lab-hdl','lab-tg','lab-ast','lab-alt','lab-cr','lab-egfr','lab-ua','lab-tsh',
    'lab-bun','lab-ft4','lab-wbc','lab-hgb','lab-plt','lab-rows','p-chart','cv-smoke',
    'tx-choice','tx-choices','tx-edu','fam-other-text','cm-other-text','cm-note','ms-hba1c',
    'cal-activity','cal-goal','ex-text','edu-text','psy-note','doc-comment','stopbang-manual','phq9-manual',
    'body-note','metabolic-note','lab-note','sleep-note','track-note'];
  const state = {};
  ids.forEach(id=> state[id] = WD.getElementById(id).value);
  ['sc-thyroid','sc-cushing','sc-pcos','sc-hypothal','sc-gh','sc-hypogonad','sc-genetic','sc-other',
   'med-steroid','med-psych','med-insulin','med-bb','med-antiepileptic','med-hormone','med-antihistamine','med-chemo','med-other',
   'ms-waist','ms-glucose','ms-bp','ms-tg','ms-hdl',
   'psy-refer','psy-support','cv-dm','cv-bptx','cv-statin','cv-cvd',
   ...STOPBANG_ITEMS.map(it=>it.id)]
   .forEach(id=> state[id] = WD.getElementById(id).checked);
  state._track = trackData;
  // PHQ-9 為單選鈕，需逐題保存，否則重新載入後第 9 題自殺風險警示會消失
  state._phq9 = PHQ9_ITEMS.map((q,i)=>{
    const c = WD.querySelector('input[name="phq'+i+'"]:checked');
    return c ? c.value : null;
  });
  // 標籤選取狀態（文字已存在對應 textarea，此處只記錄反白狀態）
  state._tags = {};
  WD.querySelectorAll('.tag-box[id]').forEach(box=>{
    state._tags[box.id] = [...box.querySelectorAll('.tag.selected')].map(t=>t.textContent);
  });
  // 飲食／活動習慣的分類單選
  state._catSel = JSON.parse(JSON.stringify(categorySelections));
  state._src = Object.assign({}, FIELD_SRC);
  state._warn = wWarn;
  return state;
}
function applyState(state){
  // 舊紀錄只有單選的 tx-choice：空值代表當時預設的「生活型態介入為主」
  if(state && state['tx-choices'] === undefined && 'tx-choice' in state){
    state = Object.assign({}, state, {'tx-choices': state['tx-choice'] || 'lifestyle'});
  }
  // 單選按鈕列的「已點選」標記先清掉，載入後再依值判斷
  WD.querySelectorAll('select.as-buttons').forEach(s=> s.dataset.picked = '');
  wWarn = state && state._warn != null ? String(state._warn) : null;
  Object.keys(state).forEach(id=>{
    if(id === '_track'){ Object.assign(trackData, state._track || {body:[],lab:[]}); renderTrackTable('body'); renderTrackTable('lab'); return; }
    if(id === '_phq9'){
      (state._phq9 || []).forEach((v,i)=>{
        WD.querySelectorAll('input[name="phq'+i+'"]').forEach(r=> r.checked = (v !== null && r.value === String(v)));
      });
      return;
    }
    if(id === '_tags'){
      Object.keys(state._tags || {}).forEach(boxId=>{
        const box = WD.getElementById(boxId);
        if(!box) return;
        const want = state._tags[boxId] || [];
        // 只切換反白，不重寫 textarea，避免與已還原的文字重複
        box.querySelectorAll('.tag').forEach(t=> t.classList.toggle('selected', want.includes(t.textContent)));
      });
      return;
    }
    if(id === '_src'){
      Object.keys(FIELD_SRC).forEach(k=> delete FIELD_SRC[k]);
      Object.assign(FIELD_SRC, state._src || {});
      return;
    }
    if(id === '_catSel'){
      Object.keys(categorySelections).forEach(k=> delete categorySelections[k]);
      Object.assign(categorySelections, state._catSel || {});
      Object.keys(categorySelections).forEach(taId=>{
        Object.keys(categorySelections[taId] || {}).forEach(catKey=>{
          const val = categorySelections[taId][catKey];
          WD.querySelectorAll('input[name="'+taId+'-'+catKey+'"]').forEach(r=>{
            const lab = r.parentNode.querySelector('.ms-title');
            const desc = r.parentNode.querySelector('.ms-desc');
            const full = desc && desc.textContent ? lab.textContent + '：' + desc.textContent : (lab ? lab.textContent : '');
            // 舊紀錄的選項文字可能是半形寫法（2~3次、/），比對前先統一
            const norm = t=> (t || '').replace(/\s/g, '').replace(/~/g, '至').replace(/\//g, '／');
            r.checked = (norm(full) === norm(val));
          });
        });
      });
      return;
    }
    const el = WD.getElementById(id);
    if(!el) return;
    if(el.type === 'checkbox') el.checked = state[id];
    else el.value = state[id];
  });
  updateBirthHidden();
  updateAge();
  updateTargetLossPct();
  updateStandardWeightRange();
  updateHba1cReadout();
  calcPhq9();
  syncOtherInputs();
  updateScreeningSummary();
  updateLabFlags();
  refreshInputComfort();
  refreshChoiceButtons();
  syncTagOtherInputs();
  renderTxButtons();
  if(!('_src' in state)) Object.keys(FIELD_SRC).forEach(k=> delete FIELD_SRC[k]);
  renderSrcTags();
  updateEgfrHint();
  // 這幾格是後來才加的，舊紀錄沒有：載入時清空，免得留著上一位病人的數值
  ['lab-bun','lab-ft4','lab-wbc','lab-hgb','lab-plt','lab-rows','p-chart','cv-smoke'].forEach(id=>{ if(!(id in state)) WD.getElementById(id).value = ''; });
  ['cv-dm','cv-bptx','cv-statin','cv-cvd'].forEach(id=>{ if(!(id in state)) WD.getElementById(id).checked = false; });
  refreshChoiceButtons();
  renderLabRows();
  renderNav();
  wSexUi();
}
// ============================================================
// 病人紀錄：多筆儲存、草稿自動暫存、離開提醒
// ============================================================
const RECORDS_KEY = 'obesity_records_v1';
const DRAFT_KEY   = 'obesity_draft_v1';
const LEGACY_KEY  = 'obesity_assessment_state_v2';
const BACKUP_KEY  = 'obesity_backup_at';
let isDirty = false;

function loadRecords(){
  try{ const r = JSON.parse(localStorage.getItem(RECORDS_KEY)); return Array.isArray(r) ? r : []; }
  catch(e){ return []; }
}
function persistRecords(list){
  try{ localStorage.setItem(RECORDS_KEY, JSON.stringify(list)); return true; }
  catch(e){ alert('儲存失敗：'+e.message+'\n瀏覽器儲存空間可能已滿，請先刪除舊紀錄。'); return false; }
}
function setStatus(text, dirty){
  isDirty = !!dirty;
  const pill = WD.getElementById('status-pill');
  if(pill) pill.textContent = text;
}
function markDirty(){
  if(isDirty) return;
  setStatus('未儲存的變更', true);
}
function birthOf(st){
  const y = (st['p-birth-y'] || '').trim(), m = (st['p-birth-m'] || '').trim(), d = (st['p-birth-d'] || '').trim();
  return y ? [y, m.padStart(2,'0'), d.padStart(2,'0')].join('-') : '';
}
function recordLabel(st){
  const name = (st['p-name'] || '').trim() || '（未填姓名）';
  const date = (st['p-date'] || '').trim() || '未填日期';
  const birth = birthOf(st);
  return name + (birth ? '（' + birth + '）' : '') + '｜' + date;
}

function saveRecord(){
  const st = collectState();
  const name = (st['p-name'] || '').trim();
  if(!name){ alert('請先在「基本資料」填寫姓名，再儲存紀錄。'); return; }
  const list = loadRecords();
  // 識別值含出生日期，同一天兩位同名病人才不會互相覆蓋。
  // 舊版紀錄的識別值沒有生日（姓名||日期），生日相同時視為同一筆，存檔時順便換成新識別值
  const birth = birthOf(st);
  const key = name + '||' + birth + '||' + (st['p-date'] || '');
  const legacyKey = name + '||' + (st['p-date'] || '');
  const idx = list.findIndex(r => r.key === key || (r.key === legacyKey && birthOf(r.state || {}) === birth));
  if(idx >= 0){
    if(!confirm('已有同姓名、同生日與同檢查日期的紀錄：\n' + recordLabel(st) + '\n\n要覆蓋更新嗎？')) return;
    list[idx] = {key, label: recordLabel(st), savedAt: new Date().toISOString(), state: st};
  } else {
    list.unshift({key, label: recordLabel(st), savedAt: new Date().toISOString(), state: st});
  }
  if(!persistRecords(list)) return;
  try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
  renderRecords();
  setStatus('已儲存 ' + new Date().toLocaleTimeString('zh-TW'), false);
}

function loadRecord(key){
  const rec = loadRecords().find(r => r.key === key);
  if(!rec){ alert('找不到該筆紀錄'); return; }
  if(isDirty && !confirm('目前有未儲存的變更，載入其他紀錄會覆蓋掉。要繼續嗎？')) return;
  wClearUploads(true);
  applyState(rec.state);
  recalcAll();
  renderRecords();
  setStatus('已載入 ' + rec.label, false);
  goHome();
}
// 上傳的原始報告只在記憶體裡，不存進紀錄。換病人或載入紀錄時一併清掉，免得把上一位的報告附在這一位後面
function wClearUploads(loaded){
  uploadedFiles.lab.length = 0;
  uploadedFiles.tanita.length = 0;
  [['lab', 'lab-filelist'], ['tanita', 'tanita-filelist']].forEach(([k, id])=>{
    renderFileList(k, id);
    if(loaded) WD.getElementById(id).innerHTML = '<div class="hint">載入的紀錄不含原始報告檔；要附在報告後面，請重新上傳。</div>';
  });
}
// 下一位病人：清空畫面回到開頁時的空白狀態。已儲存的紀錄、報價與臨床計算都不受影響
let W_BLANK = null;
function newPatient(){
  if(isDirty && !confirm('目前的資料還沒儲存成紀錄，清空後就找不回來。要開始下一位病人嗎？')) return;
  clearTimeout(draftTimer);
  wDraftPending = false;
  const bar = WD.getElementById('w-draft-bar');
  if(bar) bar.remove();
  wClearUploads(false);
  // 單選鈕（飲食與活動分類）不在暫存的欄位裡，先全部取消
  WD.querySelectorAll('input[type="radio"]').forEach(r=> r.checked = false);
  Object.keys(MS_MANUAL).forEach(k=> delete MS_MANUAL[k]);
  applyState(JSON.parse(JSON.stringify(W_BLANK)));
  recalcAll();
  try{ localStorage.removeItem(DRAFT_KEY); }catch(e){}
  setStatus('尚未儲存', false);
  renderRecords();
  goHome();
  WB.scrollTo(0, 0);
}
WD.getElementById('records-list').addEventListener('click', e=>{
  const b = e.target.closest('[data-rec]');
  if(!b) return;
  if(b.dataset.rec === 'load') loadRecord(b.dataset.key);
  else deleteRecord(b.dataset.key);
});

function deleteRecord(key){
  const list = loadRecords();
  const rec = list.find(r => r.key === key);
  if(!rec) return;
  if(!confirm('確定刪除這筆紀錄？\n' + rec.label + '\n\n刪除後無法復原。')) return;
  persistRecords(list.filter(r => r.key !== key));
  renderRecords();
}

function renderRecords(){
  const box = WD.getElementById('records-list');
  if(!box) return;
  const list = loadRecords();
  renderBackupStatus(list);
  if(!list.length){
    box.innerHTML = '<div class="hint">尚無儲存的紀錄。填寫姓名後按上方「儲存病人紀錄」即可建立。</div>';
    return;
  }
  const rows = list.map(r=>{
    const t = new Date(r.savedAt);
    const ts = isNaN(t) ? '' : (t.toLocaleDateString('zh-TW') + ' ' + t.toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}));
    // 識別值放在 data-key，由 records-list 的點擊事件處理；姓名含引號時 inline onclick 會壞掉
    const k = wEsc(r.key).replace(/"/g, '&quot;');
    return '<tr><td>' + wEsc(r.label) + '</td><td style="white-space:nowrap">' + wEsc(ts) + '</td>' +
      '<td style="white-space:nowrap"><button class="btn outline" style="padding:5px 13px; font-size:14px" data-rec="load" data-key="' + k + '">載入</button> ' +
      '<button class="btn outline" style="padding:5px 13px; font-size:14px; color:var(--red); border-color:var(--red)" data-rec="del" data-key="' + k + '">刪除</button></td></tr>';
  }).join('');
  box.innerHTML = '<div class="tt-wrap"><table class="dtable"><tr><th>病人｜檢查日期</th><th>儲存時間</th><th>操作</th></tr>' + rows + '</table></div>';
}

// ── 備份：紀錄只存在這台電腦的瀏覽器裡，清除瀏覽器資料或換電腦就會消失，定期匯出成檔案保存 ──
function renderBackupStatus(list){
  const el = WD.getElementById('records-backup');
  if(!el) return;
  let t = null;
  try{ t = localStorage.getItem(BACKUP_KEY); }catch(e){}
  const at = t ? new Date(t) : null;
  const days = at && !isNaN(at) ? Math.floor((Date.now() - at) / 86400000) : null;
  el.textContent = days === null ? '這台電腦還沒有匯出過備份。'
    : '上次匯出備份：' + at.toLocaleDateString('zh-TW') + '（' + (days === 0 ? '今天' : days + ' 天前') + '）';
  // 有紀錄卻超過兩週沒備份，用紅字提醒
  el.style.color = list.length && (days === null || days >= 14) ? 'var(--red)' : '';
}

function exportRecords(){
  const list = loadRecords();
  if(!list.length){ alert('目前沒有已儲存的紀錄可以匯出。'); return; }
  const data = {app:'muzi-weight', version:1, exportedAt:new Date().toISOString(), records:list};
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], {type:'application/json'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = '減重紀錄備份_' + todayLocal() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 2000);
  try{ localStorage.setItem(BACKUP_KEY, new Date().toISOString()); }catch(e){}
  renderBackupStatus(list);
}

// 匯入是合併：備份裡沒有的紀錄新增；兩邊都有的，保留儲存時間較新的那一份。本機紀錄不會被刪除
async function importRecords(input){
  const file = input.files && input.files[0];
  input.value = '';
  if(!file) return;
  let incoming;
  try{
    const data = JSON.parse(await file.text());
    if(data && data.app === 'muzi-checkup'){ alert('這是健檢報告的備份檔，請到健檢報告匯入。'); return; }
    incoming = Array.isArray(data) ? data : data.records;
    if(!Array.isArray(incoming)) throw new Error('format');
    incoming = incoming.filter(r=> r && typeof r.key === 'string' && r.state && typeof r.state === 'object');
  }catch(e){ alert('無法讀取這個檔案，請確認是本系統匯出的備份檔（.json）。'); return; }
  if(!incoming.length){ alert('備份檔裡沒有紀錄。'); return; }
  const list = loadRecords();
  let added = 0, updated = 0, kept = 0;
  incoming.forEach(r=>{
    const rec = {key:r.key, label:r.label || recordLabel(r.state), savedAt:r.savedAt || new Date().toISOString(), state:r.state};
    const i = list.findIndex(x=> x.key === rec.key);
    if(i < 0){ list.push(rec); added++; }
    else if(new Date(rec.savedAt) > new Date(list[i].savedAt)){ list[i] = rec; updated++; }
    else kept++;
  });
  list.sort((a, b)=> String(b.savedAt).localeCompare(String(a.savedAt)));
  if(!persistRecords(list)) return;
  renderRecords();
  alert('匯入完成：新增 ' + added + ' 筆，更新 ' + updated + ' 筆' + (kept ? '，另有 ' + kept + ' 筆本機版本較新或相同，維持不變' : '') + '。');
}

// 草稿自動暫存：輸入後 1.5 秒無動作即寫入，關閉分頁不致遺失
let draftTimer = null, wDraftPending = false;
function scheduleDraftSave(){
  markDirty();
  clearTimeout(draftTimer);
  if(wDraftPending) return;
  draftTimer = setTimeout(()=>{
    try{
      localStorage.setItem(DRAFT_KEY, JSON.stringify({savedAt: new Date().toISOString(), state: collectState()}));
    }catch(e){}
  }, 1500);
}
['input','change'].forEach(evt=>{
  WD.addEventListener(evt, (e)=>{
    const t = e.target;
    if(!t || !t.closest) return;
    if(t.closest('#rpt-overlay') || t.closest('#records-list')) return;
    if(t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') scheduleDraftSave();
  }, true);
});
WD.addEventListener('click', (e)=>{
  const t = e.target;
  if(t && t.closest && t.closest('.tag-box')) scheduleDraftSave();
}, true);

window.addEventListener('beforeunload', (e)=>{
  if(!isDirty) return;
  e.preventDefault();
  e.returnValue = '';
});

// 重新計算所有衍生數值（載入紀錄或草稿後使用）
function recalcAll(){
  try{ calcBMI(true); }catch(e){}
  try{ applyMsAuto(); calcMetabolic(); }catch(e){}
  try{ calcPhq9(); }catch(e){}
  try{ calcStopBang(); }catch(e){}
  try{ updateTargetLossPct(); updateStandardWeightRange(); updateHba1cReadout(); }catch(e){}
  try{ validateAllFields(); }catch(e){}
}

// ============================================================
// 輸入舒適度
// ============================================================
// 1. 數字欄位按 Enter 跳到同一頁的下一個欄位（數字鍵盤連續輸入不必換手拿滑鼠）；
//    文字欄位保留原本行為，多行文字框照常換行。
WD.addEventListener('keydown', e=>{
  const t = e.target;
  if(e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.altKey || e.isComposing) return;
  if(!t || t.tagName !== 'INPUT' || !['number','date','text'].includes(t.type)) return;
  if(t.closest('.other-text') || t.classList.contains('other-text')) return;
  const scope = t.closest('.screen') || document;
  const list = [...scope.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([hidden]), select, textarea')]
    .filter(el=> !el.disabled && el.offsetParent !== null);
  const i = list.indexOf(t);
  if(i >= 0 && i < list.length - 1){ e.preventDefault(); list[i + 1].focus(); }
}, true);
// 2. 游標停在數字欄位上滾動滑鼠滾輪時，不改動數值（避免捲頁時不小心把 72 變成 71）。
//    擋下預設動作、自己捲頁，不讓欄位失去焦點：觸控板的慣性滾動會把剛點進去的欄位踢出來
WD.addEventListener('wheel', e=>{
  const t = e.target;
  if(!(t && t.tagName === 'INPUT' && t.type === 'number' && WD.activeElement === t)) return;
  e.preventDefault();
  WB.scrollBy({top: e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? WB.clientHeight : 1)});
}, {capture:true, passive:false});
// 3. 點進數字欄位時整格選取，直接打字就能覆蓋舊值
WD.addEventListener('focusin', e=>{
  const t = e.target;
  if(t && t.tagName === 'INPUT' && t.type === 'number' && t.value) setTimeout(()=>{ try{ t.select(); }catch(err){} }, 0);
});
// 4. 多行文字框隨內容長高，不必在小框裡捲動
function autoGrow(ta){
  if(!ta || ta.tagName !== 'TEXTAREA') return;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight + 4, 480) + 'px';
}
WD.addEventListener('input', e=>{ if(e.target && e.target.tagName === 'TEXTAREA') autoGrow(e.target); }, true);
// 5. 已填寫的欄位底色略深
function markFilled(el){
  if(el && (el.tagName === 'INPUT' || el.tagName === 'SELECT') && el.closest('.field')) el.classList.toggle('has-val', !!String(el.value).trim());
}
['input','change'].forEach(ev=> WD.addEventListener(ev, e=> markFilled(e.target), true));
function refreshInputComfort(){
  WD.querySelectorAll('.field input, .field select').forEach(markFilled);
  WD.querySelectorAll('.screen textarea').forEach(autoGrow);
}

// ============================================================
// 單選按鈕列：把 class="as-buttons" 的下拉選單換成一排按鈕。
// 原本的 <select> 保留（隱藏）當資料來源，存檔、報告、計算都不用改。
// 一開始不預選；再點一次已選的按鈕可以取消。
// ============================================================
function choiceParts(text){
  const i = text.indexOf('（');
  return i > 0 ? [text.slice(0, i), text.slice(i + 1).replace(/）$/, '')] : [text, ''];
}
function makeChoiceButtons(sel){
  if(!sel || sel.dataset.btnReady) return;
  sel.dataset.btnReady = '1';
  sel.hidden = true;
  const row = document.createElement('div');
  row.className = 'choice-row';
  row.setAttribute('role', 'radiogroup');
  [...sel.options].forEach(o=>{
    if(!o.text.trim()) return;           // 空白選項只是「未選」的狀態，不做成按鈕
    const [title, sub] = choiceParts(o.text);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice-btn';
    b.dataset.value = o.value;
    b.setAttribute('role', 'radio');
    b.innerHTML = `<span class="t">${wEsc(title)}</span>${sub ? `<span class="s">${wEsc(sub)}</span>` : ''}`;
    b.onclick = ()=>{
      const already = sel.dataset.picked === '1' && sel.value === o.value;
      if(already){
        sel.value = [...sel.options].some(x=> x.value === '') ? '' : sel.value;
        sel.dataset.picked = '';
      } else {
        sel.value = o.value;
        sel.dataset.picked = '1';
      }
      sel.dispatchEvent(new Event('change', {bubbles:true}));
      refreshChoiceButtons();
    };
    row.appendChild(b);
  });
  sel.insertAdjacentElement('afterend', row);
}
function refreshChoiceButtons(){
  WD.querySelectorAll('select.as-buttons').forEach(sel=>{
    // 存檔載入後有值就視為已選；值為空時只有使用者親手點過「未評估／未檢查」才亮
    if(sel.value !== '' && sel.dataset.picked !== '1') sel.dataset.picked = '1';
    const row = sel.nextElementSibling;
    if(!row || !row.classList.contains('choice-row')) return;
    row.querySelectorAll('.choice-btn').forEach(b=>{
      const on = sel.dataset.picked === '1' && b.dataset.value === sel.value;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
  });
}
WD.querySelectorAll('select.as-buttons').forEach(makeChoiceButtons);
refreshChoiceButtons();

// ============================================================
// 本次治療用藥建議：可複選。「生活型態介入為主（暫不用藥）」與藥物互斥。
// 選擇存在 tx-choices（逗號分隔），用藥衛教依選擇順序合併帶入。
// ============================================================
function getTxChoices(){
  const v = WD.getElementById('tx-choices').value;
  return v ? v.split(',').filter(k=> TX_OPTIONS.some(o=> o.key === k)) : [];
}
function setTxChoices(list){
  WD.getElementById('tx-choices').value = list.join(',');
  renderTxButtons();
}
function renderTxButtons(){
  const box = WD.getElementById('tx-buttons');
  if(!box) return;
  const cur = getTxChoices();
  if(!box.children.length){
    TX_OPTIONS.forEach(o=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice-btn';
      b.dataset.value = o.key;
      b.setAttribute('role', 'checkbox');
      b.innerHTML = `<span class="t">${wEsc(o.title)}</span><span class="s">${wEsc(o.sub)}</span>`;
      b.onclick = ()=>{
        let list = getTxChoices();
        if(list.includes(o.key)) list = list.filter(k=> k !== o.key);
        else if(o.key === 'lifestyle') list = ['lifestyle'];
        else list = list.filter(k=> k !== 'lifestyle').concat(o.key);
        setTxChoices(list);
        genMedEdu();
        wWarnSync();
        scheduleDraftSave();
      };
      box.appendChild(b);
    });
  }
  box.querySelectorAll('.choice-btn').forEach(b=>{
    const on = cur.includes(b.dataset.value);
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', String(on));
  });
}
function txChoiceText(){
  const list = getTxChoices();
  if(!list.length) return '未選擇';
  return list.map(k=>{ const o = TX_OPTIONS.find(x=> x.key === k); return o.title + '（' + o.sub + '）'; }).join('、');
}
renderTxButtons();

// 「其他」標籤：載入紀錄後依標籤是否選取，顯示或收起輸入框
function syncTagOtherInputs(){
  WD.querySelectorAll('.tag-box .tag-other').forEach(tag=>{
    const input = tag.nextElementSibling;
    if(input && input.classList.contains('tag-other-text')) input.hidden = !tag.classList.contains('selected');
  });
}

// 啟動時：舊版單筆資料轉為紀錄；有草稿則詢問是否接續
(function initStorage(){
  // 下一位病人要回到的空白狀態（開頁時、還沒載入任何草稿或紀錄）。
  // 「其他」標籤的輸入框是 makeTagPicker 用 setTimeout 補上的，等它們放好再記
  setTimeout(()=>{ W_BLANK = JSON.parse(JSON.stringify(collectState())); }, 0);
  try{
    const legacy = localStorage.getItem(LEGACY_KEY);
    if(legacy && !localStorage.getItem(RECORDS_KEY)){
      const st = JSON.parse(legacy);
      const key = ((st['p-name']||'').trim() || '舊資料') + '||' + (st['p-date']||'');
      persistRecords([{key, label: recordLabel(st), savedAt: new Date().toISOString(), state: st}]);
    }
  }catch(e){}
  renderRecords();

  try{
    const raw = localStorage.getItem(DRAFT_KEY);
    if(raw){
      const d = JSON.parse(raw);
      const t = new Date(d.savedAt);
      const ts = isNaN(t) ? '' : (t.toLocaleDateString('zh-TW') + ' ' + t.toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'}));
      const bar = document.createElement('div');
      bar.className = 'no-print';
      bar.id = 'w-draft-bar';
      wDraftPending = true;
      bar.style.cssText = 'background:var(--amber-pale); border-bottom:1px solid #E4CFA4; padding:10px 18px; display:flex; align-items:center; gap:12px; justify-content:center; flex-wrap:wrap; font-size:15px;';
      bar.innerHTML = '<span>偵測到未儲存的草稿（' + wEsc(ts) + '），要接續填寫嗎？</span>';
      const b1 = document.createElement('button');
      b1.className = 'btn outline';
      b1.style.cssText = 'padding:5px 15px; font-size:14px';
      b1.textContent = '載入草稿';
      b1.onclick = ()=>{ wDraftPending = false; applyState(d.state); recalcAll(); setStatus('已載入草稿', true); scheduleDraftSave(); bar.remove(); };
      const b2 = document.createElement('button');
      b2.className = 'btn outline';
      b2.style.cssText = 'padding:5px 15px; font-size:14px';
      b2.textContent = '捨棄';
      b2.onclick = ()=>{ wDraftPending = false; try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} if(isDirty) scheduleDraftSave(); bar.remove(); };
      bar.appendChild(b1); bar.appendChild(b2);
      WB.insertBefore(bar, WB.querySelector('.w-wrap'));
    }
  }catch(e){}
})();

// 開頁時先畫一次左側目錄的綠點
renderNav();
// 依目前性別顯示或隱藏只和女性有關的欄位
wSexUi();
