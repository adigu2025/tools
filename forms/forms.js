/* 列印表單共用：減重門診評估問卷、健康紀錄表的題目資料、版面與樣式。
   工作台（列印表單）與減重系統（weight/）都載入這個檔案，改一處兩邊同步。
   工作台印的是空白表；減重系統把目前畫面的資料傳進來，印出已帶入資料的版本。 */

// ── 題目資料：減重系統的評估畫面也用同一份 ──
const STOPBANG_ITEMS = [
  {id:'sb1', label:'大聲打鼾（比說話聲音大，或隔壁房間可聽見）'},
  {id:'sb2', label:'白天經常感到疲倦、嗜睡或無力'},
  {id:'sb3', label:'他人觀察到您睡眠中呼吸暫停'},
  {id:'sb4', label:'高血壓病史或正在治療中'},
];

const PHQ9_ITEMS = [
  '做事提不起勁或無趣',
  '感到心情低落、沮喪或絕望',
  '入睡困難、睡不安穩或睡眠過多',
  '感覺疲倦或沒有活力',
  '食慾不振或吃太多',
  '覺得自己很糟，或覺得自己很失敗，或讓自己或家人失望',
  '對事物專注有困難，例如閱讀報紙或看電視時',
  '動作或說話速度緩慢到別人已注意到，或正好相反－煩躁、坐立不安、動來動去更甚於平常',
  '有不如死掉，或用某種方式傷害自己的念頭',
];
const PHQ9_OPTS = ['完全沒有','好幾天','超過一半天數','幾乎每天'];

const COMORBID_TAGS = [
  '第2型糖尿病前期或糖尿病','高血壓','血脂異常','脂肪肝／代謝性脂肪肝炎',
  '阻塞性睡眠呼吸中止症','退化性關節炎','多囊卵巢症候群（PCOS）',
];

const FAMILY_HISTORY_TAGS = [
  '肥胖家族史','糖尿病家族史','高血壓家族史','血脂異常家族史',
  '心血管疾病家族史（心肌梗塞／中風）','脂肪肝家族史','痛風／高尿酸家族史',
  '甲狀腺疾病家族史','多囊性卵巢症候群家族史（PCOS）','家族性遺傳肥胖症候群',
];

// ── 活動習慣：三大類，每類擇一 ──
const ACTIVITY_CATEGORIES = [
  {
    key: 'exercise',
    label: '一、運動習慣（肌肉與心肺刺激、身體活動度）',
    intro: '評估除日常走路外，是否有刻意給予身體足夠的運動刺激與肌肉阻力訓練。',
    options: [
      '高強度規律訓練：每週 4 次以上，含重量訓練或 HIIT',
      '有氧與重訓兼顧：每週 2 至 3 次，達微喘流汗程度',
      '假日運動員／低頻率：每週僅 1 次或集中於週末',
      '靜態生活／以車代步：無運動習慣，能坐不站',
      '久坐臥床／關節受限：近乎全天靜態，體力差',
    ]
  },
  {
    key: 'work',
    label: '二、工作型態（非運動消耗 NEAT、職場壓力）',
    intro: '工作型態決定日常「非運動性熱量消耗」的基底，是評估久坐風險的核心。',
    options: [
      '高體力勞動：持續走動、搬重物、長時間站立',
      '動靜皆宜／頻繁走動：常起身走動、開會巡視',
      '混合型辦公：坐辦公室但會定時起身活動',
      '長時間定著久坐：連續久坐 8 小時以上不挪動',
      '職業駕駛／高壓禁錮：長時間受限座位、高壓力',
    ]
  },
  {
    key: 'sleep',
    label: '三、睡眠作息（修復能力、皮質醇與飢餓素節律）',
    intro: '睡眠時間與品質直接影響瘦素與飢餓素分泌，是許多減重卡關者的隱形因素。',
    options: [
      '黃金睡眠：11 點前入睡，睡足 7 至 8 小時',
      '規律穩定：12 點前入睡，睡 6 至 7 小時',
      '晚睡少眠：常超過 1 點才睡，不足 6 小時',
      '睡眠障礙／夜醒頻繁：難入睡、易夜醒、打呼',
      '輪班／日夜顛倒：長期輪大夜班或日夜顛倒',
    ]
  },
];

// ── 飲食習慣：四大類，每類擇一 ──
const DIET_CATEGORIES = [
  {
    key: 'pattern',
    label: '一、飲食型態與偏好（熱量密度與烹調）',
    options: [
      '極致原型：原型食物為主，蒸煮清淡、多粗糧',
      '均衡自主：原型食物為主，一般家常調味',
      '外食常態：三餐依賴外食，精緻澱粉較多',
      '重口味偏好：重鹹辛辣，常吃加工食品',
      '高熱量密度：偏好油炸、甜點、速食',
    ]
  },
  {
    key: 'behavior',
    label: '二、進食行為與頻率（進食模式與情緒關係）',
    options: [
      '正念慢食：細嚼慢嚥、7 分飽、不吃零食',
      '隨性規律：進食速度正常，吃飽就停',
      '社交／環境誘導：易受周遭環境影響多吃',
      '狼吞虎嚥：進食極快，邊看螢幕邊吃零食',
      '情緒衝動：依賴手搖飲，常情緒性進食',
    ]
  },
  {
    key: 'timing',
    label: '三、時間與餐次結構（進食時間軸與節律）',
    options: [
      '嚴格斷食／定時：規律執行間歇性斷食',
      '規律三餐：固定 2 至 3 餐，無宵夜習慣',
      '作息晃動：三餐時間不固定但餐數穩定',
      '頻繁刺激：正餐外常吃點心、含糖飲料',
      '夜貓宵夜：睡前吃宵夜，熱量集中深夜',
    ]
  },
  {
    key: 'hydration',
    label: '四、飲水與微量元素（代謝基礎原料）',
    options: [
      '水分豐沛：純水 2000 cc 以上，蔬果蛋白足量',
      '基礎及格：純水 1500 至 2000 cc，蔬菜略不足',
      '代替性飲水：多以茶、咖啡、湯代替純水',
      '蛋白質缺乏：偏好單一澱粉餐，少吃蛋豆肉',
      '嚴重脫水：幾乎不喝水，飲食缺乏蔬菜',
    ]
  },
];

const TX_OPTIONS = [
  {key:'lifestyle', title:'生活型態介入為主', sub:'暫不用藥', edu:''},
  {key:'rybelsus',  title:'Rybelsus 瑞倍適',  sub:'口服',     edu:'rybelsus'},
  {key:'wegovy',    title:'Wegovy 週纖達',    sub:'注射',     edu:'wegovy'},
  {key:'mounjaro',  title:'Mounjaro 猛健樂',  sub:'注射',     edu:'mounjaro'},
];

// ── 檢驗判讀標準：報告的判讀與健康紀錄表的單位、參考值共用 ──
const LAB_EPS = 1e-9;
function LAB_META(male){
  const lim = (a, b)=> (male ? a : b);
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
    {k:'alt',   zh:'丙胺酸轉胺酶',   en:'ALT（GPT）',  u:'U/L',   ref:'≤ 40',   scale:[0, 160],   cuts:[[40 + LAB_EPS, 0], [120 + LAB_EPS, 1], [Infinity, 2]]},
    {k:'ast',   zh:'天門冬胺酸轉胺酶', en:'AST（GOT）', u:'U/L',   ref:'≤ 40',   scale:[0, 160],   cuts:[[40 + LAB_EPS, 0], [120 + LAB_EPS, 1], [Infinity, 2]]},
    {grp:'腎功能與尿酸'},
    {k:'cr',    zh:'肌酸酐',         en:'Creatinine',  u:'mg/dL', ref:'≤ ' + lim('1.3', '1.1'), scale:[.3, 2.5], cuts:[[lim(1.3, 1.1) + LAB_EPS, 0], [Infinity, 1]]},
    {k:'egfr',  zh:'腎絲球過濾率',   en:'eGFR（mL/min/1.73m²）', u:'', ref:'≥ 60', scale:[0, 130], cuts:[[30, 2], [60, 1], [Infinity, 0]]},
    {k:'ua',    zh:'尿酸',           en:'Uric Acid',   u:'mg/dL', ref:'≤ ' + lim('7.0', '6.0'), scale:[2, 11], cuts:[[lim(7, 6) + LAB_EPS, 0], [Infinity, 1]]},
    {grp:'甲狀腺'},
    {k:'tsh',   zh:'甲狀腺刺激素',   en:'TSH',         u:'μIU/mL', ref:'0.4–4.0', scale:[0, 8], cuts:[[.4, 1], [4 + LAB_EPS, 0], [Infinity, 1]]},
  ];
}

// 減重門診評估問卷（兩頁 A4），題目順序對應報告第 04 章「病史與身心評估」。
// 選項文字直接取自系統的資料陣列與表單標籤，紙本與螢幕上的選項一致，日後改一處即可同步。
// 病人填寫的題目都有對應的系統欄位；身體測量、量表計分與本次治療留給醫療人員填寫。
const QS_BOX = '<svg viewBox="0 0 16 16" fill="none" stroke="#152831" stroke-width="1.3"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/></svg>';
// 病人勾選後由醫師判斷是否影響用藥選擇（腸泌素類藥物的禁忌與注意事項）
const QS_MED_SAFETY = [
  '胰臟炎病史',
  '膽結石或膽囊疾病',
  '本人或家族有甲狀腺髓質癌（含 MEN 2 症候群）',
  '胃排空異常或嚴重腸胃蠕動問題',
  '曾有暴食、催吐或其他飲食障礙',
];
// 與減重系統評估畫面「藥物性因素」勾選項（weight/index.html 的 med-*）相同，改一邊要同步改另一邊
const QS_MED_LABELS = ['類固醇','抗精神病藥／抗憂鬱藥','胰島素','乙型阻斷劑（降血壓藥）','抗癲癇藥物','荷爾蒙避孕藥','抗組織胺藥物','化療藥物'];
const QS_PREG = ['無相關計畫','計畫懷孕中','懷孕中','哺乳中'];
const QS_SUPPORT = ['家人','伴侶','朋友','同事','病友或社群','目前沒有'];

function qsOpt(text, splitKey){
  let body;
  if(splitKey){
    const i = text.indexOf('：');
    body = i >= 0
      ? '<span class="k">' + formEsc(text.slice(0, i)) + '</span>：' + formEsc(text.slice(i + 1))
      : formEsc(text);
  } else {
    body = formEsc(text);
  }
  return '<div class="qs-opt">' + QS_BOX + '<span>' + body + '</span></div>';
}
function qsOther(label, w){
  return '<div class="qs-opt">' + QS_BOX + '<span>' + formEsc(label || '其他') + ' <span class="qs-blank" style="min-width:' + (w || 110) + 'px"></span></span></div>';
}
// 分類標題去掉「一、」編號與括號說明，紙本只留病人看得懂的部分
function qsCatName(label){
  return label.replace(/^[一二三四五六七八九十]+、/, '').replace(/（.*?）$/, '');
}
function qsCatBlock(cat){
  return '<div class="qs-catbox"><div class="qs-cat">' + formEsc(qsCatName(cat.label)) + '</div>' +
    cat.options.map(o=> qsOpt(o, true)).join('') + '</div>';
}
function qsHeader(pageNo){
  return '<div class="rp-header"><span class="clinic">木子澄安診所 Muzi Cheng\'an Clinic</span>' +
    '<span class="pagenum">第 ' + pageNo + ' 頁／共 2 頁</span></div>';
}
function qsFoot(note){
  return '<div class="qs-foot"><span>木子澄安診所 Muzi Cheng\'an Clinic</span><span>' + (note || '本問卷僅供臨床評估參考，內容依個人資料保護規定保管') + '</span></div>';
}
function qsStaffLine(label, unit, w){
  return '<span class="qs-sf"><span class="l">' + label + '</span><span class="ln" style="min-width:' + (w || 46) + 'px"></span>' + (unit ? '<span class="u">' + unit + '</span>' : '') + '</span>';
}

// d.name：已知的病人姓名，空白表不傳
function formScalesHtml(d){
  const name = (d && d.name) || '';
  const pregOpts = QS_PREG;
  const medOpts = QS_MED_LABELS;

  const pageA = `
  <div class="report-page qs-page">
    ${qsHeader(1)}
    <div class="qs-title">減重門診評估問卷</div>
    <div class="qs-lead">請依您目前的實際狀況填寫，沒有標準答案。看不懂的題目可以空著，門診時醫師會再跟您確認。</div>
    <div class="qs-basic">
      <span><span class="lbl">姓名</span><span class="line">${formEsc(name)}</span></span>
      <span class="qs-sex"><span class="lbl">性別</span>${qsOpt('男')}${qsOpt('女')}</span>
      <span><span class="lbl">出生日期</span><span class="line short"></span>年<span class="line tiny"></span>月<span class="line tiny"></span>日</span>
      <span><span class="lbl">填寫日期</span><span class="line short"></span></span>
    </div>

    <div class="qs-sec">一、這次的目標與期待</div>
    <div class="qs-grid">
      <div class="qs-panel">
        <div class="qs-q"><span class="num">1</span>這次想減重的原因<span class="hint">可複選</span></div>
        <div class="qs-inline">
          ${qsOpt('改善健康檢查的異常數據')}
          ${qsOpt('改善關節或行動上的不適')}
          ${qsOpt('調整體態與外型')}
          ${qsOpt('為特定活動做準備（如婚禮、同學會）')}
          ${qsOther('其他', 150)}
        </div>
        <div class="qs-q"><span class="num">2</span>過去是否曾嘗試減重？</div>
        <div class="qs-inline">
          ${qsOpt('沒有')}
          ${qsOther('有，方式為', 120)}
        </div>
        <div class="qs-q"><span class="num">3</span>成年後的最高體重</div>
        <div class="qs-fillrow">
          <span>約 <span class="qs-blank"></span> 公斤</span>
          <span>當時年齡 <span class="qs-blank"></span> 歲</span>
        </div>
      </div>
      <div class="qs-panel">
        <div class="qs-target"><span>目標體重</span><span class="fill"></span><span>公斤</span></div>
        <div class="qs-q"><span class="num">4</span>希望多久達到這個體重？</div>
        <div class="qs-inline">
          ${qsOpt('1 個月')}${qsOpt('3 個月')}${qsOpt('6 個月')}${qsOpt('1 年')}
          ${qsOpt('沒有特定時間，穩定就好')}
        </div>
        <div class="qs-q"><span class="num">5</span>每月可安排的治療費用預算</div>
        <div class="qs-inline">
          ${qsOpt('1,000 至 5,000 元')}${qsOpt('5,000 至 10,000 元')}
          ${qsOpt('10,000 至 15,000 元')}${qsOpt('15,000 元以上')}
          ${qsOpt('尚未考慮，想先了解')}
        </div>
        <div class="qs-note">預算僅用於安排合適的治療組合，不影響專業醫療建議。</div>
      </div>
    </div>

    <div class="qs-sec">二、健康狀況與用藥</div>
    <div class="qs-q"><span class="num">1</span>目前或過去曾被診斷的疾病<span class="hint">可複選</span></div>
    <div class="qs-3col">
      ${qsOpt('目前沒有')}
      ${COMORBID_TAGS.map(t=> qsOpt(t)).join('')}
      ${qsOpt('甲狀腺功能低下')}
      ${qsOther('其他', 96)}
    </div>
    <div class="qs-q"><span class="num">2</span>是否有下列狀況<span class="hint">會影響減重藥物的選擇，請盡量填寫</span></div>
    <div class="qs-2col">
      ${qsOpt('以上皆無')}
      ${QS_MED_SAFETY.map(t=> qsOpt(t)).join('')}
    </div>
    <div class="qs-q"><span class="num">3</span>目前正在使用的藥物<span class="hint">可複選，保健食品也請一併寫下</span></div>
    <div class="qs-3col">
      ${qsOpt('目前沒有用藥')}
      ${medOpts.map(t=> qsOpt(t)).join('')}
    </div>
    <div class="qs-lines">
      <div><span class="l">其他藥物或保健食品</span><span class="ln"></span></div>
      <div><span class="l">藥物過敏</span><span class="ln"></span></div>
    </div>
    <div class="qs-q"><span class="num">4</span>睡眠與血壓：是否有下列狀況？<span class="hint">符合者請勾選，可複選</span></div>
    <div class="qs-2col">${STOPBANG_ITEMS.map(it=> qsOpt(it.label)).join('')}</div>

    <div class="qs-sec">三、家族史與生活背景</div>
    <div class="qs-q"><span class="num">1</span>父母、兄弟姊妹或子女是否有下列疾病？<span class="hint">可複選</span></div>
    <div class="qs-3col">
      ${qsOpt('都沒有或不清楚')}
      ${FAMILY_HISTORY_TAGS.map(t=> qsOpt(t.replace(/家族史/, ''))).join('')}
      ${qsOther('其他', 96)}
    </div>
    <div class="qs-grid qs-grid-tight">
      <div>
        <div class="qs-q"><span class="num">2</span>生育計畫<span class="hint">女性請填</span></div>
        <div class="qs-inline">${pregOpts.map(t=> qsOpt(t)).join('')}</div>
        <div class="qs-q"><span class="num">3</span>減重過程中，誰可以支持您？<span class="hint">可複選</span></div>
        <div class="qs-inline">${QS_SUPPORT.map(t=> qsOpt(t)).join('')}${qsOther('其他', 60)}</div>
      </div>
      <div>
        <div class="qs-q"><span class="num">4</span>您現在想開始減重的意願有多強？<span class="hint">請圈選</span></div>
        <div class="qs-scale">${Array.from({length:10}, (_, i)=> `<span>${i + 1}</span>`).join('')}</div>
        <div class="qs-scale-cap"><span>還在考慮</span><span>已經準備好</span></div>
      </div>
    </div>
    ${qsFoot()}
  </div>`;

  const phqRows = PHQ9_ITEMS.map((q,i)=>
    `<tr><td>${i+1}. ${formEsc(q)}</td>${PHQ9_OPTS.map(()=>'<td>'+QS_BOX+'</td>').join('')}</tr>`
  ).join('');

  const pageB = `
  <div class="report-page qs-page">
    ${qsHeader(2)}
    <div class="qs-sec">四、飲食習慣<span class="note">每一類請選擇一項最接近的描述</span></div>
    <div class="qs-cats">${DIET_CATEGORIES.map(qsCatBlock).join('')}</div>

    <div class="qs-sec">五、活動與作息<span class="note">每一類請選擇一項最接近的描述</span></div>
    <div class="qs-cats three">${ACTIVITY_CATEGORIES.map(qsCatBlock).join('')}</div>

    <div class="qs-sec">六、近兩週的情緒與睡眠<span class="note">請就每一題勾選一格</span></div>
    <table class="qs-phq">
      <tr><th>過去兩週，下列問題困擾您的頻率</th>${PHQ9_OPTS.map(o=>`<th>${formEsc(o)}</th>`).join('')}</tr>
      ${phqRows}
    </table>

    <div class="qs-staff">
      <div class="qs-staff-title">以下由醫療人員填寫</div>
      <div class="qs-sfrow">
        ${qsStaffLine('身高', 'cm')}${qsStaffLine('體重', 'kg')}${qsStaffLine('BMI', '')}
        ${qsStaffLine('腰圍', 'cm')}${qsStaffLine('頸圍', 'cm')}
      </div>
      <div class="qs-sfrow">
        ${qsStaffLine('血壓', 'mmHg', 64)}${qsStaffLine('心跳', '次／分', 34)}
        ${qsStaffLine('PHQ-9', '／27 分', 34)}
        <span class="qs-sf">${qsOpt('第 9 題有作答，已評估自殺風險')}</span>
      </div>
      <div class="qs-sfrow">
        <span class="qs-sf"><span class="l">STOP-BANG 客觀項目</span>${qsOpt('BMI ＞ 35')}${qsOpt('年齡 ＞ 50 歲')}${qsOpt('頸圍 ＞ 40 cm')}${qsOpt('男性')}</span>
        ${qsStaffLine('STOP-BANG 總分', '／8 分', 34)}
      </div>
      <div class="qs-sfrow">
        <span class="qs-sf"><span class="l">次發性肥胖</span>${qsOpt('未發現')}${qsOpt('疑似')}<span class="ln" style="min-width:150px"></span></span>
        <span class="qs-sf grow"><span class="l">藥物可否調整</span><span class="ln"></span></span>
      </div>
      <div class="qs-sfrow">
        <span class="qs-sf"><span class="l">本次治療</span>${TX_OPTIONS.map(o=> qsOpt(o.key === 'lifestyle' ? '生活型態介入' : o.title)).join('')}</span>
      </div>
      <div class="qs-sfrow">
        <span class="qs-sf grow"><span class="l">備註</span><span class="ln"></span></span>
        ${qsStaffLine('評估人員', '', 90)}
      </div>
    </div>
    ${qsFoot()}
  </div>`;

  return pageA + pageB;
}

// 健康紀錄表（兩頁 A4），欄位對應系統的追蹤紀錄（TRACK_COLS）、檢驗判讀標準（LAB_META）與報告的回診時程。
// 減重系統有資料時傳入 d 自動帶入：基本資料、起始與目標體重、超音波結果、已存的追蹤紀錄與回診日期；空白時就是可手寫的空白表。
const QS_CHK = '<svg viewBox="0 0 16 16" fill="none" stroke="#152831" stroke-width="1.3"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M4.2 8.3l2.6 2.6 5-5.6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const HR_SIDE_EFFECTS = ['噁心','嘔吐','腹瀉','便秘','腹脹或胃脹','食慾很差','注射部位紅腫','其他'];
const HR_LAB_ROWS = 7, HR_BODY_ROWS = 18;
const HR_FOOT = '本紀錄表由醫療人員協助填寫，請妥善保管並於回診時攜帶';

function hrPick(text, on){ return '<div class="qs-opt">' + (on ? QS_CHK : QS_BOX) + '<span>' + formEsc(text) + '</span></div>'; }
function hrFix(n, d){ return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); }
// 紙本參考值：範圍改用「至」；未選性別而男女切點不同時，兩個都列出
function hrLabMeta(sex){
  const male = LAB_META(true).filter(m=> m.k), female = LAB_META(false).filter(m=> m.k);
  const cur = sex === 'M' ? male : female;
  return cur.map((m, i)=>{
    const fix = s=> (s || '').replace(/–/g, ' 至 ').replace(/\s+/g, ' ').trim();
    let ref = fix(m.ref);
    if(!sex && male[i].ref !== female[i].ref) ref = '男 ' + fix(male[i].ref) + '<br>女 ' + fix(female[i].ref);
    if(m.ref === '無統一切點') ref = '';
    return {k:m.k, ref, u:m.u};
  });
}
// 筆數超過表格列數時，保留第一筆（治療前）與最近的幾筆
function hrRows(list, n){
  list = list || [];
  return list.length <= n ? list : [list[0]].concat(list.slice(-(n - 1)));
}
function hrStaffDate(base, fn, n){
  return base && typeof fn === 'function' ? fn(base, n) : '';
}

// d（皆可省略）：name、dob、start（開始治療日）、height、weight（起始體重）、target、sex（M/F）、
// fatty、thy、usText、thyText（超音波）、lab、body（追蹤紀錄）、addDays、addMonths（日期推算函式）
function formHealthRecordHtml(d){
  d = d || {};
  const s = k=> (d[k] == null ? '' : String(d[k])).trim();
  const name = s('name'), dob = s('dob'), start = s('start'), hCm = s('height'), target = s('target');
  const w0 = parseFloat(s('weight'));
  const has = !isNaN(w0) && w0 > 0;
  const fatty = s('fatty'), thy = s('thy');
  const usText = s('usText'), thyText = s('thyText');

  // 檢驗表：欄位順序與單位取自報告的判讀標準，找不到時退回追蹤表欄位
  const SHORT = {ac:'AC', hba1c:'HbA1c', homa:'HOMA-IR', tcho:'TC', tg:'TG', hdl:'HDL', ldl:'LDL', alt:'ALT', ast:'AST', cr:'Cr', egfr:'eGFR', ua:'UA', tsh:'TSH'};
  const GROUPS = [['血糖', ['ac','hba1c','homa']], ['血脂', ['tcho','tg','hdl','ldl']], ['肝腎功能', ['alt','ast','cr','egfr']], ['其他', ['ua','tsh']]];
  const meta = {};
  hrLabMeta(d.sex).forEach(m=> meta[m.k] = m);
  const labKeys = GROUPS.flatMap(([, ks])=> ks);
  const labRows = hrRows(d.lab, HR_LAB_ROWS);
  let labBody = '';
  for(let i = 0; i < HR_LAB_ROWS; i++){
    const r = labRows[i] || {};
    const first = i === 0 && !r.date ? '<span class="hr-ph">治療前</span>' : formEsc(r.date || '');
    labBody += `<tr><td class="d">${first}</td>${labKeys.map(k=> `<td>${formEsc(r[k] || '')}</td>`).join('')}</tr>`;
  }
  const labTable = `
    <table class="hr-tb hr-lab">
      <colgroup><col style="width:74px">${labKeys.map(()=> '<col>').join('')}</colgroup>
      <tr class="g"><th rowspan="2">日期</th>${GROUPS.map(([n, ks])=> `<th colspan="${ks.length}">${n}</th>`).join('')}</tr>
      <tr class="n">${labKeys.map(k=> `<th${k === 'homa' ? ' class="sm"' : ''}>${SHORT[k]}</th>`).join('')}</tr>
      <tr class="u"><td>單位</td>${labKeys.map(k=> `<td>${formEsc((meta[k] && meta[k].u) || (k === 'egfr' ? 'mL/min' : ''))}</td>`).join('')}</tr>
      <tr class="u"><td>參考值</td>${labKeys.map(k=> `<td>${meta[k] ? meta[k].ref : ''}</td>`).join('')}</tr>
      ${labBody}
    </table>`;

  // 回診時程：與醫師評語的回診清單、報告第 06 章一致
  const addD = d.addDays, addM = d.addMonths;
  const plan = [
    ['一週後', hrStaffDate(start, addD, 7), '確認副作用與劑量'],
    ['一個月後', hrStaffDate(start, addM, 1), '測量體重，評估是否調整劑量'],
    ['一個療程', '', '用完一盒藥物時測量身體組成'],
    ['三個月後', hrStaffDate(start, addM, 3), '評估療效並複查抽血'],
    ['六個月後', hrStaffDate(start, addM, 6), '腹部超音波，追蹤脂肪肝'],
  ];
  const planRows = plan.map(([w, d, what])=>
    `<tr><td class="w">${w}</td><td>${formEsc(d)}</td><td class="l">${what}</td><td></td><td>${QS_BOX}</td></tr>`).join('');

  const pageA = `
  <div class="report-page qs-page hr-page">
    ${qsHeader(1)}
    <div class="qs-title">健康紀錄表</div>
    <div class="qs-lead">回診時可以帶著這份紀錄表由醫療人員協助填寫，或回家後自行記錄。</div>
    <div class="qs-basic">
      <span><span class="lbl">姓名</span><span class="line">${formEsc(name)}</span></span>
      <span><span class="lbl">出生日期</span><span class="line mid">${formEsc(dob)}</span></span>
      <span><span class="lbl">身高</span><span class="line short">${formEsc(hCm)}</span>cm</span>
      <span><span class="lbl">開始治療日期</span><span class="line mid">${formEsc(start)}</span></span>
    </div>

    <div class="hr-goals">
      <div><span class="t">起始體重</span><span class="v">${has ? hrFix(w0, 1) : ''}</span><span class="u">kg</span></div>
      <div><span class="t">減 5% 的體重</span><span class="v">${has ? hrFix(w0 * 0.95, 1) : ''}</span><span class="u">kg</span><span class="s">第一個里程碑</span></div>
      <div><span class="t">減 10% 的體重</span><span class="v">${has ? hrFix(w0 * 0.9, 1) : ''}</span><span class="u">kg</span><span class="s">代謝明顯改善</span></div>
      <div class="me"><span class="t">我的目標體重</span><span class="v">${formEsc(target)}</span><span class="u">kg</span></div>
    </div>

    <div class="qs-sec">一、治療前影像檢查</div>
    <div class="hr-us">
      <div class="row"><span class="k">腹部超音波</span>
        ${['無脂肪肝','輕度脂肪肝','中度脂肪肝','重度脂肪肝'].map(t=> hrPick(t, fatty === t)).join('')}
      </div>
      <div class="row line"><span class="k sub">所見</span><span class="ln">${formEsc(usText.replace(/\n/g, ' '))}</span></div>
      <div class="row"><span class="k">甲狀腺超音波</span>
        ${[['無異常','無異常'],['甲狀腺結節','甲狀腺結節'],['甲狀腺腫大','甲狀腺腫大'],['其他異常','其他異常']].map(([v, t])=> hrPick(t, thy === v)).join('')}
      </div>
      <div class="row line"><span class="k sub">所見</span><span class="ln">${formEsc(thyText.replace(/\n/g, ' '))}</span></div>
    </div>

    <div class="qs-sec">二、檢驗紀錄<span class="note">第一列為治療前數值，之後每次抽血記錄一列</span></div>
    ${labTable}

    <div class="qs-sec">三、回診時程<span class="note">日期由開始治療日推算，實際以預約為準</span></div>
    <table class="hr-tb hr-plan">
      <colgroup><col style="width:82px"><col style="width:104px"><col><col style="width:104px"><col style="width:56px"></colgroup>
      <tr><th>時間點</th><th>預計日期</th><th>這次要做什麼</th><th>實際回診日</th><th>已完成</th></tr>
      ${planRows}
    </table>
    <div class="hr-plan-note">之後每 3 至 6 個月規律回診，目標是減重後不復胖。</div>

    <div class="hr-alert">
      <div class="h">出現下列狀況，請提早回診或就醫</div>
      <ul>
        <li>上腹痛延伸到背部、持續嘔吐無法進食，或出現黃疸，請立即就醫。</li>
        <li>嚴重腹瀉、頭暈、尿量明顯減少，可能是脫水，請盡快回診。</li>
        <li>計畫懷孕、已懷孕或開始哺乳，請先停藥並回診討論。</li>
      </ul>
      <div class="tel">木子澄安診所　07-3739496　高雄市仁武區仁孝路 282 號</div>
    </div>
    ${qsFoot(HR_FOOT)}
  </div>`;

  // 身體組成與用藥紀錄：體重變化以起始體重計算，追蹤表已有資料時自動帶入
  const bodyRows = hrRows(d.body, HR_BODY_ROWS);
  let bodyHtml = '';
  for(let i = 0; i < HR_BODY_ROWS; i++){
    const r = bodyRows[i] || {};
    const w = parseFloat(r.weight);
    let chg = '';
    if(has && !isNaN(w)){
      const dk = w - w0;
      chg = (dk > 0 ? '+' : '') + hrFix(dk, 1) + '<small>（' + (dk > 0 ? '+' : '') + hrFix(dk / w0 * 100, 1) + '%）</small>';
    }
    bodyHtml += `<tr><td class="d">${formEsc(r.date || '')}</td><td></td><td>${formEsc(r.weight || '')}</td><td>${chg}</td>` +
      `<td>${formEsc(r.bmi || '')}</td><td>${formEsc(r.waist || '')}</td><td>${formEsc(r.fat || '')}</td><td>${formEsc(r.muscle || '')}</td>` +
      `<td>${formEsc(r.visceral || '')}</td><td>${formEsc(r.bp || '')}</td><td></td></tr>`;
  }

  // 體重變化圖：橫軸 0 至 24 週，縱軸留白讓醫療人員依起始體重自行標刻度
  const gx0 = 40, gx1 = 694, gy0 = 8, gy1 = 182, weeks = 24, rowsN = 10;
  let grid = '';
  for(let i = 0; i <= weeks; i++){
    const x = gx0 + (gx1 - gx0) * i / weeks;
    grid += `<line x1="${x}" y1="${gy0}" x2="${x}" y2="${gy1}" stroke="${i % 4 ? '#ECE7DF' : '#D8D1C5'}" stroke-width="1"/>`;
    if(i % 4 === 0) grid += `<text x="${x}" y="${gy1 + 14}" text-anchor="middle">${i}</text>`;
  }
  for(let j = 0; j <= rowsN; j++){
    const y = gy0 + (gy1 - gy0) * j / rowsN;
    grid += `<line x1="${gx0}" y1="${y}" x2="${gx1}" y2="${y}" stroke="${j % 5 ? '#ECE7DF' : '#D8D1C5'}" stroke-width="1"/>` +
      `<line x1="${gx0 - 26}" y1="${y}" x2="${gx0 - 4}" y2="${y}" stroke="#D8D1C5" stroke-width="1"/>`;
  }
  const chart = `<svg class="hr-chart" viewBox="0 0 706 212" xmlns="http://www.w3.org/2000/svg">${grid}` +
    `<text x="${gx1}" y="${gy1 + 28}" text-anchor="end">週數</text><text x="2" y="${gy0 + 4}" text-anchor="start">kg</text></svg>`;

  const pageB = `
  <div class="report-page qs-page hr-page">
    ${qsHeader(2)}
    <div class="qs-sec">四、身體組成與用藥紀錄<span class="note">每次回診記錄一列，副作用請填下方代碼</span></div>
    <table class="hr-tb hr-body">
      <colgroup><col style="width:68px"><col style="width:92px"><col style="width:46px"><col style="width:76px"><col style="width:40px"><col style="width:42px"><col style="width:56px"><col style="width:46px"><col style="width:56px"><col style="width:62px"><col></colgroup>
      <tr><th>日期</th><th>藥物與劑量</th><th>體重</th><th>累計變化</th><th>BMI</th><th>腰圍</th><th>體脂肪率</th><th>肌肉量</th><th>內臟脂肪</th><th>血壓</th><th>副作用代碼</th></tr>
      <tr class="u"><td></td><td></td><td>kg</td><td>kg（%）</td><td></td><td>cm</td><td>%</td><td>kg</td><td>等級</td><td>mmHg</td><td></td></tr>
      ${bodyHtml}
    </table>
    <div class="hr-codes"><b>副作用代碼</b><span><i>0</i>沒有不適</span>${HR_SIDE_EFFECTS.map((t, i)=> `<span><i>${i + 1}</i>${formEsc(t)}</span>`).join('')}</div>

    <div class="qs-sec">五、體重變化圖<span class="note">每次回診在對應週數點上體重，連成曲線</span></div>
    ${chart}

    <div class="hr-notes">
      <div class="h">備註</div>
      <div class="ln"></div><div class="ln"></div><div class="ln"></div>
    </div>
    ${qsFoot(HR_FOOT)}
  </div>`;

  return pageA + pageB;
}

// A4 於 96dpi 的像素高。頁面內容只要超出一點點，尾端就會溢到下一張紙而印出空白頁。
const PRINT_SHEET_H = 1123;

// 內容僅略超過一張 A4 時等比縮到剛好一頁；超出較多者維持自然分頁，
// 讓內容正常延續到下一張並保留重複的頁首頁尾。
function fitPrintPages(doc){
  const view = doc.defaultView;
  doc.querySelectorAll('.report-page').forEach(pg=>{
    const cs = view.getComputedStyle(pg);
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const avail = PRINT_SHEET_H - padT - padB;
    if(avail <= 0) return;
    const need = pg.getBoundingClientRect().height - padT - padB;
    if(need <= avail + 0.5) return;
    if(need / avail > 1.15) return;
    const f = avail / need;
    const kids = [...pg.children];
    if(!kids.length) return;
    const wrap = doc.createElement('div');
    wrap.style.cssText = 'height:' + avail + 'px; overflow:hidden;';
    const scaler = doc.createElement('div');
    scaler.style.cssText = 'transform:scale(' + f.toFixed(4) + '); transform-origin:top left; width:' + (100 / f).toFixed(3) + '%;';
    pg.appendChild(wrap);
    wrap.appendChild(scaler);
    kids.forEach(k=> scaler.appendChild(k));
  });
}

function formEsc(s){ return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ── 樣式：減重系統載入時放進頁面；工作台預覽與列印時直接寫進 iframe ──
// 色彩與基本設定綁在 .report-page 上，放進其他頁面也不會影響原本的版面
const FORMS_CSS = `
:where(.report-page), :where(.report-page) *, :where(.report-page) *::before, :where(.report-page) *::after{
  box-sizing:border-box; margin:0; padding:0; -webkit-print-color-adjust:exact; print-color-adjust:exact;}
.report-page{
  --primary:#BC7F30; --primary-dark:#96631F; --primary-pale:#FBF4E8; --navy:#152831; --teal:#3E6A7C;
  --text:#262421; --muted:#7A756D; --border:#E4DFD6;
  font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",-apple-system,sans-serif;
  color:var(--text); line-height:1.65; background:#fff;}
.report-page{width:794px; min-height:1123px; padding:42px 55px;}
.report-page + .report-page{page-break-before:always; break-before:page;}
.rp-header{display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--primary); padding-bottom:8px; margin-bottom:16px;}
.rp-header .clinic{font-size:14px; color:var(--primary-dark); font-weight:700;}
.rp-header .pagenum{font-size:12px; color:var(--muted); letter-spacing:.04em;}
/* ── 減重門診評估問卷（列印單張）───────────── */
/* 問卷版面較密，使用比報告稍窄的邊距，讓兩頁剛好各佔一張 A4 */
.report-page.qs-page{padding:26px 44px 30px; position:relative; min-height:1123px; height:1123px; overflow:hidden;}
.qs-foot{position:absolute; left:44px; right:44px; bottom:10px;
  display:flex; justify-content:space-between; font-size:10.5px; color:var(--muted);
  border-top:1px solid var(--border); padding-top:5px;}
.qs-title{font-size:20px; font-weight:700; color:var(--navy); text-align:center; letter-spacing:.06em;}
.qs-lead{font-size:12px; color:var(--muted); text-align:center; margin-top:3px;}
.qs-basic{display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:6px 16px;
  margin:8px 0 0; padding:6px 12px; border:1px solid var(--border); border-radius:8px; font-size:12.5px;}
.qs-basic > span{display:inline-flex; align-items:baseline; gap:4px;}
.qs-basic .lbl{color:var(--muted); margin-right:3px;}
.qs-basic .line{border-bottom:1px solid var(--navy); display:inline-block; min-width:120px; height:15px;}
.qs-basic .line.short{min-width:52px;}
.qs-basic .line.tiny{min-width:28px;}
.qs-basic .qs-sex{gap:10px; align-items:center;}
.qs-basic .qs-sex .qs-opt{margin:0;}
.qs-sec{font-size:14px; font-weight:700; color:#fff; background:var(--teal);
  padding:3px 11px; border-radius:5px; margin:8px 0 4px; display:inline-block;}
.qs-sec .note{font-weight:400; font-size:11.5px; opacity:.88; margin-left:6px;}
.qs-cat{font-size:13px; font-weight:700; color:var(--navy);
  margin:0 0 3px; padding-left:7px; border-left:3.5px solid var(--primary);}
.qs-opt{display:flex; align-items:flex-start; gap:6px;
  font-size:11.5px; line-height:1.4; margin-bottom:2px;}
.qs-opt svg{flex-shrink:0; width:11.5px; height:11.5px; margin-top:2px;}
.qs-opt .k{font-weight:700; color:var(--navy);}
.qs-2col{display:grid; grid-template-columns:1fr 1fr; column-gap:20px; padding-left:21px;}
.qs-3col{display:grid; grid-template-columns:1fr 1fr 1fr; column-gap:14px; padding-left:21px;}
.qs-grid{display:grid; grid-template-columns:1fr 1fr; column-gap:18px; align-items:stretch;}
.qs-grid-tight{margin-top:2px;}
.qs-panel{border:1px solid var(--border); border-radius:9px; background:#FCFBF9; padding:6px 12px 8px;}
.qs-panel .qs-q:first-child{margin-top:0;}
.qs-blank{border-bottom:1px solid var(--border); display:inline-block; min-width:52px; height:14px; vertical-align:-2px;}
.qs-q{font-size:12.5px; font-weight:700; color:var(--navy); margin:5px 0 2px; line-height:1.35;}
.qs-q .num{display:inline-block; width:15px; height:15px; line-height:15px; text-align:center;
  background:var(--primary); color:#fff; border-radius:50%; font-size:10.5px; margin-right:6px;}
.qs-q .hint{font-weight:400; font-size:11px; color:var(--muted); margin-left:7px;}
.qs-inline{display:flex; flex-wrap:wrap; gap:1px 14px; padding-left:21px;}
.qs-inline .qs-opt{margin-bottom:1px;}
.qs-fillrow{display:flex; flex-wrap:wrap; gap:3px 18px; padding-left:21px; font-size:12px;}
.qs-target{background:var(--primary-pale); border:1px solid #EAD9BC; border-radius:7px;
  padding:7px 12px; font-size:13px; font-weight:700; color:var(--navy);
  display:flex; align-items:baseline; gap:10px;}
.qs-target .fill{flex:1; border-bottom:1px solid var(--primary-dark); height:15px;}
.qs-note{font-size:11px; color:var(--muted); line-height:1.4; margin-top:4px;}
.qs-lines{display:grid; grid-template-columns:3fr 2fr; column-gap:18px; padding-left:21px; margin-top:3px; font-size:12px;}
.qs-lines > div{display:flex; align-items:baseline; gap:7px;}
.qs-lines .l{flex-shrink:0; color:var(--navy);}
.qs-lines .ln{flex:1; border-bottom:1px solid var(--border); height:15px;}
.qs-scale{display:flex; gap:5px; padding-left:21px; margin-top:4px;}
.qs-scale span{flex:1; height:24px; line-height:22px; text-align:center; font-size:12px; font-weight:700; color:var(--navy);
  border:1px solid var(--border); border-radius:50%; max-width:24px;}
.qs-scale-cap{display:flex; justify-content:space-between; padding-left:21px; max-width:311px; font-size:10.5px; color:var(--muted); margin-top:2px;}
.qs-cats{display:grid; grid-template-columns:1fr 1fr; gap:6px 18px;}
.qs-cats.three{grid-template-columns:1fr 1fr 1fr; column-gap:12px;}
.qs-catbox{border:1px solid var(--border); border-radius:8px; padding:5px 10px 4px; background:#FCFBF9;}
.qs-phq{width:100%; border-collapse:collapse; font-size:11px; margin-top:2px;}
.qs-phq th,.qs-phq td{border:1px solid var(--border); padding:1.3px 5px; text-align:center;}
.qs-phq th{white-space:nowrap;}
.qs-phq th{background:var(--primary-pale); color:var(--navy); font-weight:700;}
.qs-phq td:first-child{text-align:left; width:64%;}
.qs-phq svg{width:11px; height:11px;}
.qs-staff{border:1.6px dashed var(--muted); border-radius:9px; padding:7px 13px 8px;
  background:#FAF9F6; margin-top:8px;}
.qs-staff-title{font-size:13px; font-weight:700; color:var(--navy); margin-bottom:4px;}
.qs-sfrow{display:flex; flex-wrap:wrap; align-items:center; gap:4px 16px; font-size:12px; color:var(--muted);}
.qs-sfrow + .qs-sfrow{margin-top:3px;}
.qs-sf{display:inline-flex; align-items:baseline; gap:6px;}
.qs-sf.grow{flex:1;}
.qs-sf .l{flex-shrink:0; color:var(--navy); font-weight:700;}
.qs-sf .ln{flex:1; border-bottom:1px solid var(--border); height:14px; display:inline-block;}
.qs-sf .u{font-size:11px;}
.qs-sf .qs-opt{margin:0 6px 0 0; color:var(--navy);}
/* ── 健康紀錄表（列印單張，沿用問卷的頁面與標題樣式）──── */
.qs-basic .line.mid{min-width:96px;}
.hr-goals{display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-top:8px;}
.hr-goals > div{border:1px solid var(--border); border-radius:8px; background:#FCFBF9; padding:6px 10px 5px;
  display:grid; grid-template-columns:1fr auto; align-items:baseline; column-gap:4px;}
.hr-goals .t{grid-column:1 / -1; font-size:11.5px; color:var(--muted);}
.hr-goals .v{font-size:17px; font-weight:700; color:var(--navy); border-bottom:1px solid var(--border); min-height:24px; line-height:24px;}
.hr-goals .u{font-size:11.5px; color:var(--muted);}
.hr-goals .s{grid-column:1 / -1; font-size:10.5px; color:var(--primary-dark); margin-top:1px;}
.hr-goals .me{background:var(--primary-pale); border-color:#EAD9BC;}
.hr-us{border:1px solid var(--border); border-radius:8px; padding:6px 12px 8px;}
.hr-us .row{display:flex; align-items:center; gap:4px 14px; flex-wrap:wrap; font-size:12px;}
.hr-us .row + .row{margin-top:4px;}
.hr-us .row .qs-opt{margin:0;}
.hr-us .k{width:84px; flex-shrink:0; font-weight:700; color:var(--navy); font-size:12.5px;}
.hr-us .k.sub{font-weight:400; color:var(--muted); font-size:12px; text-align:right; padding-right:4px;}
.hr-us .row.line{margin-left:0;}
.hr-us .ln{flex:1; border-bottom:1px solid var(--border); min-height:18px; font-size:11.5px; color:var(--navy);}
.hr-tb{width:100%; border-collapse:collapse; table-layout:fixed; font-size:11.5px; color:var(--navy);}
.hr-tb th,.hr-tb td{border:1px solid #D8D1C5; text-align:center; padding:2px 3px; overflow:hidden;}
.hr-tb th{background:var(--primary-pale); font-weight:700; white-space:nowrap; font-size:11px;}
.hr-tb tr.g th{background:var(--teal); color:#fff; border-color:#fff #D8D1C5 #D8D1C5;}
.hr-tb tr.u td{font-size:10px; color:var(--muted); line-height:1.25; background:#FAF9F6; padding:2px 2px;}
.hr-tb tr.u td:first-child{font-size:10.5px; color:var(--navy);}
.hr-lab td{height:27px;}
.hr-lab tr.u td{height:auto;}
.hr-tb td.d{font-size:11px;}
.hr-tb th.sm{font-size:9.5px; letter-spacing:-.2px;}
.hr-ph{color:var(--muted); font-size:11px;}
.hr-plan td{height:24px;}
.hr-plan td.w{font-weight:700;}
.hr-plan td.l{text-align:left; padding-left:8px;}
.hr-plan svg{width:12px; height:12px; vertical-align:-1px;}
.hr-plan-note{font-size:11px; color:var(--muted); margin-top:3px;}
.hr-alert{margin-top:9px; border:1.4px solid #E3B4AF; background:#FFF8F6; border-radius:8px; padding:7px 13px 8px;}
.hr-alert .h{font-size:13px; font-weight:700; color:#B3413B; margin-bottom:2px;}
.hr-alert ul{margin:0; padding-left:18px; font-size:12px; line-height:1.55; color:var(--navy);}
.hr-alert .tel{font-size:11.5px; color:var(--muted); margin-top:3px;}
.hr-body td{height:28px;}
.hr-body tr.u td{height:auto;}
.hr-body td small{font-size:9.5px; color:var(--muted);}
.hr-codes{display:flex; flex-wrap:wrap; align-items:center; gap:3px 10px; font-size:11.5px; color:var(--navy); margin-top:5px;}
.hr-codes b{margin-right:2px;}
.hr-codes i{font-style:normal; display:inline-block; width:15px; height:15px; line-height:15px; text-align:center;
  border-radius:50%; background:var(--primary); color:#fff; font-size:10px; margin-right:4px;}
.hr-chart{width:100%; height:auto; display:block; border:1px solid var(--border); border-radius:8px; background:#fff;}
.hr-chart text{font-size:10px; fill:#8A8478;}
.hr-notes{margin-top:9px;}
.hr-notes .h{font-size:12.5px; font-weight:700; color:var(--navy);}
.hr-notes .ln{border-bottom:1px solid var(--border); height:24px;}
`;
