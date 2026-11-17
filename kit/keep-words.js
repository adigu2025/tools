/* 詞語不跨行：衛教單、同意書、指引等版面原始檔輸出圖片前執行 keepWords()。
   用瀏覽器內建的中文斷詞（Intl.Segmenter）切出詞語，每個詞包一層不換行的 <k-w>（自訂標籤，頁面上 span 的樣式套不到它，例如頁尾地址的 span 間距），
   換行只會落在詞與詞之間，不會出現「同｜時」「內｜視鏡」。
   斷詞器不認得的醫學名詞放在 KW_DICT；數字和後面的單位（1600 元、30 分鐘、5 mg）也綁在一起。
   只處理畫面上的 DOM，不改原始檔的文字。已經包過的（k-w、.nw、white-space:nowrap）會跳過。

   切詞的邏輯全部在 kwTokens()，不碰 DOM，可以用 Node 直接測：
     node kit/keep-words.test.js
   改這個檔之前先把「會斷錯的句子」加進測試檔的案例，看到它失敗，再改到通過。
   補字典詞也一樣：加進 KW_DICT 後跑一次測試，確認沒有別的句子因此斷錯。 */
const KW_DICT = [
  '內視鏡', '胃鏡', '大腸鏡', '小腸鏡', '膠囊內視鏡', '超音波', '電腦斷層', '核磁共振',
  '乙狀結腸', '升結腸', '橫結腸', '降結腸', '十二指腸', '直腸', '盲腸', '食道', '咽喉', '下咽部',
  '侵入性', '非侵入性', '通暢性', '拋棄式', '兩截式', '醫學中心', '抗逆流', '結紮術', '內容物', '細胞學',
  '使用人', '同意人', '立同意書人', '檢查費', '耗材費', '治療費', '掛號費', '押金', '健保卡',
  '麻醉藥', '麻醉科', '鎮靜劑', '止痛藥', '軟便藥', '抗凝血劑', '抗血小板藥', '降血糖藥', '胰島素',
  '幽門桿菌', '冷凝刀', '止血夾', '注射針', '瘜肉', '腺瘤', '息肉', '痔瘡', '內痔', '外痔', '齒狀線',
  '併發症', '過敏', '穿孔', '出血', '感染', '吸入性肺炎', '心律不整', '低血壓', '低血氧',
  '血氧', '血壓', '心跳', '呼吸道', '抽痰', '少見', '罕見', '必要時', '腸泌素', '減重', '體重',
  '甲狀腺', '結節', '穿刺', '細針', '病理', '切片', '報告', '回診', '急診', '就醫',
  '輕中度', '鎮靜', '靜脈', '注射', '口服', '避孕', '懷孕', '哺乳',
  '無聲影', '聲影', '低回音', '高回音', '等回音', '脂肪肝', '肝硬化', '肝指數', '血脂', '血糖', '糖化血色素',
  '纖維化', '進階纖維化', '彈性檢查', '肝臟彈性檢查', '肝切片', '臨床事件', '肝功能失代償',
  // 2026-11 補：斷詞器會切開的常用詞（每一個在 keep-words.test.js 都有對應案例）
  '木子澄安診所', '木子澄安', '篩檢', '黑便', '血便', '吐血', '失智', '除菌', '帶原者', '帶原',
  '受體促效劑', '促效劑', '質子幫浦抑制劑', '質子幫浦', '嗜酸性食道炎', '嗜酸性', '自體免疫',
  '脂肪肝炎', 'A 型肝炎', 'B 型肝炎', 'C 型肝炎', '人年', '仁武區', '仁孝路', '胃食道逆流', '消化性潰瘍'
].sort((a, b)=> b.length - a.length);
const KW_UNIT = /^(人年|元|次|支|顆|包|片|劑|天|日|週|周|個月|月|年|歲|分鐘|秒|小時|公分|公釐|公斤|公克|公升|毫升|毫克|大卡|倍|度|級|號|樓|人|位|件|項|種|張|成|分|%|％|mL|ml|mg|mcg|g|kg|cm|mm|L|IU|U)/;
// 單獨一個字時多半是虛詞或連接詞：不拿來跟前後的字併成一個詞
const KW_STOP = '的了是在和與或及為不也都就要可每被把對從到於以而但並且將會能很更最較該看這那其有無沒請已再還只才又所之個們嗎呢吧啊著過得地你我他她您它一二三四五六七八九十兩幾多少大小上下左右時';
// 斷詞器常把字尾切開（侵入／性、食道／癌）：這些字尾併回前一個詞
const KW_SUFFIX = /^[性式費物學化率劑術科鏡器類型者後前中內外間癌炎症病瘤藥菌期]$/;
const KW_CJK = /[㐀-鿿]/;

/* 把一段文字切成「不可從中間換行」的單位。回傳 [{s:文字, keep:是否要包成不換行}]。
   seg 是 Intl.Segmenter('zh-Hant', {granularity:'word'})；dict 省略時用 KW_DICT。 */
function kwTokens(text, seg, dict){
  dict = (dict || KW_DICT).slice().sort((a, b)=> b.length - a.length);
  const cjk = KW_CJK;
  // 1. 先讓斷詞器切整段，記下每個詞的邊界
  let toks = [];
  for(const s of seg.segment(text)) toks.push(s.segment);
  // 2. 字典詞：只有「頭尾都落在斷詞邊界上」才算數，整個詞併成一個單位。
  //    以前是先用字典切再斷詞，「指出血糖」會被「出血」切成 指｜出血｜糖，「身體重要」被「體重」切成 身｜體重｜要。
  const bound = new Set([0]);
  let p = 0;
  toks.forEach(t=>{ p += t.length; bound.add(p); });
  const out1 = [];
  p = 0;
  for(let i = 0; i < toks.length; ){
    const w = dict.find(d=> text.startsWith(d, p) && bound.has(p + d.length));
    if(w){
      out1.push(w);
      const end = p + w.length;
      while(p < end){ p += toks[i].length; i++; }
    } else { out1.push(toks[i]); p += toks[i].length; i++; }
  }
  toks = out1;
  // 3. 英數用連字號或斜線接起來的（FIB-4、GLP-1、CV-1500）併成一個；縮寫＋空白＋數字（aHR 3.41）、p < 0.05、n = 120 也是
  const alnum = /^[A-Za-z0-9.]+$/, out2 = [];
  for(let i = 0; i < toks.length; i++){
    let s = toks[i];
    if(alnum.test(s)){
      while((toks[i + 1] === '-' || toks[i + 1] === '/') && alnum.test(toks[i + 2] || '')){ s += toks[i + 1] + toks[i + 2]; i += 2; }
      if(/^[A-Za-z][A-Za-z0-9-]{0,5}$/.test(s) && toks[i + 1] === ' '){
        if(/^[\d.,]+$/.test(toks[i + 2] || '')){ s += ' ' + toks[i + 2]; i += 2; }
        else if(/^[<>=≤≥]$/.test(toks[i + 2] || '') && toks[i + 3] === ' ' && /^[\d.,]+$/.test(toks[i + 4] || '')){ s += ' ' + toks[i + 2] + ' ' + toks[i + 4]; i += 4; }
      }
    }
    out2.push(s);
  }
  toks = out2;
  // 4. 數字＋（空白）＋單位綁在一起；「1 至 2」「3、4」這類範圍也綁在一起
  const out = [];
  for(let i = 0; i < toks.length; i++){
    let s = toks[i];
    if(/^[\d.,/]+$/.test(s)){
      let j = i + 1;
      while(j < toks.length){
        const a = toks[j], b = toks[j + 1], c = toks[j + 2];
        if(a === ' ' && b && KW_UNIT.test(b)){ s += a + b; j += 2; break; }
        if(KW_UNIT.test(a) && !cjk.test(a.replace(KW_UNIT, '').slice(0, 1))){ s += a; j += 1; break; }
        if(a === ' ' && (b === '至' || b === '到' || b === '～') && c === ' ' && /^[\d.]+$/.test(toks[j + 3] || '')){ s += a + b + c + toks[j + 3]; j += 4; continue; }
        break;
      }
      i = j - 1;
    }
    out.push(s);
  }
  // 5. 字尾併回前一個詞；前一個是單獨的虛詞（的、在、不……）就不併
  const one = s=> s.length === 1 && cjk.test(s);
  const merged = [];
  out.forEach(s=>{
    const prev = merged[merged.length - 1];
    if(prev && KW_SUFFIX.test(s) && cjk.test(prev.slice(-1)) && prev.length <= 4 && !(prev.length === 1 && KW_STOP.includes(prev))) merged[merged.length - 1] = prev + s;
    else merged.push(s);
  });
  // 6. 連續兩個單獨的實字（黑｜便、失｜智）多半是斷詞器不認得的詞：併成一個，最多併到四個字
  const fin = [];
  let run = false;   // 上一個單位是不是由單獨的實字開始的
  merged.forEach(s=>{
    const prev = fin[fin.length - 1];
    const solo = one(s) && !KW_STOP.includes(s);
    if(solo && prev && run && prev.length < 4){ fin[fin.length - 1] = prev + s; return; }
    fin.push(s);
    run = solo;
  });
  return fin.map(s=> ({s, keep: s.length >= 2 && s.length <= 12 &&
    (cjk.test(s) || (/\d/.test(s) && / /.test(s)) || /[A-Za-z0-9][-/][A-Za-z0-9]/.test(s))}));
}

function keepWords(root){
  root = root || document;
  // 報告排版在 iframe 裡：用那份文件自己的 document 與樣式
  const doc = root.ownerDocument || root, win = doc.defaultView || window;
  if(!window.Intl || !Intl.Segmenter) return 0;
  const seg = new Intl.Segmenter('zh-Hant', {granularity:'word'});
  const cjk = KW_CJK;
  const nodes = [];
  const w = doc.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
  let n;
  while((n = w.nextNode())){
    if(!cjk.test(n.data) && !/\d/.test(n.data)) continue;
    const pe = n.parentElement;
    if(!pe || pe.closest('script,style,svg,k-w,.nw,h1,[data-kw-skip]')) continue;
    const cs = win.getComputedStyle(pe);
    if(cs.whiteSpace.startsWith('nowrap') || cs.whiteSpace === 'pre') continue;
    // flex、grid 容器裡直接放的文字不可拆成 span：每個 span 會變成一個項目，被 gap 拉開（「檢查 介紹」）
    if(/flex|grid/.test(cs.display)) continue;
    nodes.push(n);
  }
  let count = 0;
  nodes.forEach(t=>{
    const units = kwTokens(t.data, seg);
    if(!units.some(u=> u.keep)) return;
    const frag = doc.createDocumentFragment();
    units.forEach(u=>{
      if(u.keep){
        const sp = doc.createElement('k-w'); sp.style.whiteSpace = 'nowrap'; sp.textContent = u.s; frag.appendChild(sp); count++;
      } else frag.appendChild(doc.createTextNode(u.s));
    });
    t.parentNode.replaceChild(frag, t);
  });
  return count;
}
// 給 Node 測試用；瀏覽器沒有 module，這一行不會執行
if(typeof module !== 'undefined' && module.exports) module.exports = {kwTokens, keepWords, KW_DICT, KW_UNIT};
