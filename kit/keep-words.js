/* 詞語不跨行：衛教單、同意書、指引等版面原始檔輸出圖片前執行 keepWords()。
   用瀏覽器內建的中文斷詞（Intl.Segmenter）切出詞語，每個詞包一層不換行的 <k-w>（自訂標籤，頁面上 span 的樣式套不到它，例如頁尾地址的 span 間距），
   換行只會落在詞與詞之間，不會出現「同｜時」「內｜視鏡」。
   斷詞器不認得的醫學名詞放在 KW_DICT；數字和後面的單位（1600 元、30 分鐘、5 mg）也綁在一起。
   只處理畫面上的 DOM，不改原始檔的文字。已經包過的（k-w、.nw、white-space:nowrap）會跳過。 */
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
  '纖維化', '進階纖維化', '彈性檢查', '肝臟彈性檢查', '肝切片', '臨床事件', '肝功能失代償'
].sort((a, b)=> b.length - a.length);
const KW_UNIT = /^(元|次|支|顆|包|片|劑|天|日|週|周|個月|月|年|歲|分鐘|秒|小時|公分|公釐|公斤|公升|毫升|倍|度|級|%|％|mL|ml|mg|mcg|g|kg|cm|mm|L|IU|U)/;
function keepWords(root){
  root = root || document;
  // 報告排版在 iframe 裡：用那份文件自己的 document 與樣式
  const doc = root.ownerDocument || root, win = doc.defaultView || window;
  if(!window.Intl || !Intl.Segmenter) return 0;
  const seg = new Intl.Segmenter('zh-Hant', {granularity:'word'});
  const dictRe = new RegExp('(' + KW_DICT.map(s=> s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')');
  const cjk = /[㐀-鿿]/;
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
    // 1. 字典詞優先，其餘交給斷詞器
    const toks = [];
    t.data.split(dictRe).forEach((part, i)=>{
      if(!part) return;
      if(i % 2 === 1){ toks.push(part); return; }
      for(const s of seg.segment(part)) toks.push(s.segment);
    });
    // 2. 數字＋（空白）＋單位綁在一起；「1 至 2」「3、4」這類範圍也綁在一起
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
    // 3. 斷詞器常把字尾切開（侵入／性、拋棄／式）：常見字尾併回前一個詞
    const merged = [];
    out.forEach(s=>{
      const prev = merged[merged.length - 1];
      if(prev && /^[性式費物學化率劑術科鏡器類型者後前中內外間]$/.test(s) && cjk.test(prev.slice(-1)) && prev.length <= 4) merged[merged.length - 1] = prev + s;
      else merged.push(s);
    });
    if(!merged.some(s=> s.length >= 2 && (cjk.test(s) || /\d/.test(s)))) return;
    const frag = doc.createDocumentFragment();
    merged.forEach(s=>{
      if(s.length >= 2 && s.length <= 12 && (cjk.test(s) || (/\d/.test(s) && / /.test(s)))){
        const sp = doc.createElement('k-w'); sp.style.whiteSpace = 'nowrap'; sp.textContent = s; frag.appendChild(sp); count++;
      } else frag.appendChild(doc.createTextNode(s));
    });
    t.parentNode.replaceChild(frag, t);
  });
  return count;
}
