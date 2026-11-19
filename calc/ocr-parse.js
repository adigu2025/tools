/* 臨床計算「檢驗截圖自動帶入」的文字解析：把辨識出的文字整理成數值（膽固醇、肝指數、血小板、年齡、性別、B 肝抗原、檢驗日期等）。
   從 calc/app.js 拆出來（2026-11-19）：這一段只處理文字，不碰畫面，改辨識規則只改這一份；測試在 tests/calc.test.js。
   app.js 用 calcOcrParse() 取得解析函式，所以這份要在 app.js 之前載入（index.html、calc/index.html、hub.js、sw.js、tests/load.js）。 */
function calcOcrParse(){
  "use strict";
  // 等寬字型的報告（例如優品）小數點後面有空隙，「0.90」會被認成「0.」「90」兩個字，
  // 只取到 0，INR 因此超出合理範圍被丟掉。小數點後面接空白再接數字時，接回同一個數
  function ocrJoinDot(s){ return s.replace(/(\d)\s*\.\s+(?=\d)/g, '$1.'); }

  // 全形轉半形、數字中的千分位去掉、常見複合名稱先合併，避免 HDL Cholesterol 被當成總膽固醇
  function ocrNormalize(text){
    return ocrJoinDot(text
      .replace(/[！-～]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }))
      .replace(/　/g, ' ')
      .replace(/([一-鿿])\s+(?=[一-鿿])/g, '$1')   // 中文辨識常在字與字之間插空白
      .replace(/(\d),(\d{3})(?!\d)/g, '$1$2')
      // 血小板單位「x10^3/uL」的 ^ 常被認成「"」「'」「*」或「7」（x10" 3/uL、x1073/uL），
      // 單位沒認出來時，裡面的「10」會被當成結果（2026-11-17 優品報告的血小板 211 讀成 10）。統一改回 x10^3/uL
      .replace(/[x×X*]\s*10\s*(?:[\^"'`‘’“”*°]\s*|7\s*)?([39])\s*\/\s*([uµ]?L)\b/g, ' x10^$1/$2')
      .replace(/(?<![\d.xX×*])10\s*["'`‘’“”*°]\s*([39])\s*\/\s*([uµ]?L)\b/g, 'x10^$1/$2')
      .replace(/non[-\s]?HDL[-\s]?(?:C(?:holesterol)?)?/ig, ' NONHDL ')
      .replace(/(?:T[-.\s]?CHO\w*|Chol\w*|TC)\s*\/\s*HDL\w*/ig, ' RATIO ')
      .replace(/LDL\s*\/\s*HDL\w*/ig, ' RATIO ')
      .replace(/\b(HDL|LDL)[-\s]*C(?:hol(?:esterol)?)?\b/ig, ' $1 ')
      .replace(/\bALT\s*[\/(]\s*S?GPT\s*\)?|\bS?GPT\s*[\/(]\s*ALT\s*\)?/ig, ' ALT ')
      .replace(/\bAST\s*[\/(]\s*S?GOT\s*\)?|\bS?GOT\s*[\/(]\s*AST\s*\)?/ig, ' AST ')
      .replace(/Alb(?:umin)?\s*\/\s*Glob\w*(?:\s*ratio)?|\bA\s*\/\s*G(?:\s*ratio)?\b/ig, ' AGRATIO ')   // A/G 比值不能當成白蛋白
      // 「PT/INR 11.5 / 1.02」「PT (INR) 11.5 sec 1.02」這種把兩項寫在同一個名稱下的列：
      // 名稱後第一個數字是 PT 秒數，不是 INR，直接取會把正常的人判成 INR > 2.3（3 分）。
      // 做法：扣掉參考範圍（9.4-12.5）後，有兩個數字就取較小的那個當 INR（PT 秒數一定比 INR 大）；
      // 只有一個數字時，6 以下才當成 INR，否則不帶入，讓使用者自己選（寧可不帶，不可帶錯）。
      .replace(/\bP\.?T\.?\s*(?:\/\s*INR\b|\(\s*INR\s*\))([^\n]*)/ig, function(all, rest){
        var nums = [];
        rest.replace(/(\d+(?:\.\d+)?)(\s*[-–~～]\s*\d+(?:\.\d+)?)?/g, function(m, a, range){ if (!range) nums.push(parseFloat(a)); return m; });
        var v = nums.length >= 2 ? Math.min(nums[0], nums[1]) : nums.length === 1 && nums[0] <= 6 ? nums[0] : null;
        return v === null ? ' PT_INR_UNREAD ' : ' INR ' + v + ' ';
      });
  }

  var OCR_NUM = /(\d+(?:\.\d+)?)/;
  // 小數點被吃掉時常剩「09」「048」這種 0 開頭的整數，補回成 0.9、0.48
  function ocrVal(t){ return /^0\d+$/.test(t) ? parseFloat('0.' + t.slice(1)) : parseFloat(t); }

  // 依報告表頭欄位判讀：找到含「結果」與「參考／單位」的表頭列，用各欄標題的左右位置切出欄界，
  // 表頭下方每一列的文字依水平位置歸到對應欄，再重組成「項目 結果 參考值 單位」交給後面的判讀。
  // 這樣不論各檢驗所欄位順序怎麼排、中文名稱被認成什麼亂碼，都以表頭對照為準。
  // 找不到表頭（截圖沒截到、表頭辨識失敗）就回傳空字串，改用原本依「結果、參考值、單位」順序的判讀
  var OCR_COLS = [
    ['item', /項目|^項$|Item|Test/i],
    ['name', /中文|名稱|^稱$|Name/i],
    ['res',  /結果|^結$|^果$|Result|Value/i],
    ['ref',  /參考|^參$|^考$|區間|範圍|Ref|Range|Normal/i],
    ['unit', /單位|^單$|^位$|Unit/i]
  ];
  function ocrTable(data){
    var lines = (data && data.lines) || [];
    function words(l){ return (l.words || []).filter(function(w){ return w.bbox && /[^\s|｜│_\-—.,]/.test(w.text); }); }
    for (var h = 0; h < lines.length; h++) {
      var ws = words(lines[h]), col = {}, kw = [];
      ws.forEach(function(w){
        for (var i = 0; i < OCR_COLS.length; i++) if (OCR_COLS[i][1].test(w.text)) { kw.push({ w: w, k: OCR_COLS[i][0] }); return; }
      });
      kw.forEach(function(x){ col[x.k] = 1; });
      if (!col.res || !(col.ref || col.unit)) continue;
      // 沒有關鍵字的表頭字（例如「檢驗」「判讀」）歸到距離最近的關鍵字那一欄
      var span = {};
      ws.forEach(function(w){
        var best = null, gap = Infinity;
        kw.forEach(function(x){
          var g = x.w === w ? -1 : Math.max(0, Math.max(x.w.bbox.x0, w.bbox.x0) - Math.min(x.w.bbox.x1, w.bbox.x1));
          if (g < gap) { gap = g; best = x.k; }
        });
        var s = span[best] || (span[best] = { k: best, x0: Infinity, x1: -Infinity });
        s.x0 = Math.min(s.x0, w.bbox.x0); s.x1 = Math.max(s.x1, w.bbox.x1);
      });
      var cols = Object.keys(span).map(function(k){ return span[k]; }).sort(function(a, b){ return a.x0 - b.x0; });
      for (var c = 0; c < cols.length; c++) cols[c].cut = c + 1 < cols.length ? (cols[c].x1 + cols[c + 1].x0) / 2 : Infinity;
      var top = lines[h].bbox ? lines[h].bbox.y1 : -Infinity;
      var out = lines.map(function(l, li){
        if (li <= h || (l.bbox && l.bbox.y0 < top)) return l.text.trim();
        var cell = { left: [], res: [], ref: [], unit: [], other: [] };
        words(l).forEach(function(w){
          var cx = (w.bbox.x0 + w.bbox.x1) / 2, c = 0;
          while (cx > cols[c].cut) c++;
          var k = cols[c].k === 'item' || cols[c].k === 'name' ? 'left' : cols[c].k;
          if (k === 'left' && /^[\d.,:;]+$/.test(w.text)) return;   // 名稱欄裡單獨的數字是中文名稱辨識成的亂碼
          (cell[k] || cell.other).push(w.text);
        });
        var res = ocrJoinDot(cell.res.join(' ')).match(OCR_NUM);
        if (!res || !cell.left.length) return l.text.trim();
        var refTxt = ocrJoinDot(cell.ref.join(' ')), ref = '';
        var r = refTxt.match(/(\d+(?:\.\d+)?)\s*[-–~～]\s*(\d+(?:\.\d+)?)/);
        if (r) ref = r[1] + '-' + r[2];
        else if ((r = refTxt.match(OCR_NUM))) ref = (/[>≧≥]/.test(refTxt) ? '>' : '≦') + r[1];
        return [cell.left.join(' '), res[1], ref, cell.unit.join(' ')].join(' ').replace(/\s+/g, ' ').trim();
      });
      return out.join('\n');
    }
    return '';
  }
  // 每個檢驗項目：名稱的寫法、合理範圍；同一行出現多項時，各取名稱後面到下一個名稱之前的第一個數字
  var OCR_KEYS = {
    tc:  { re: /\bTC\b|T[-.\s]?CHO(?:L)?\b|Total\s*Chol\w*|\bCholesterol\b|\bCHOL\b|總膽固醇/ig, lo: 50, hi: 800 },
    tg:  { re: /\bT\.?G\b|Triglycerides?|三酸甘油酯?/ig, lo: 10, hi: 5000 },
    hdl: { re: /\bHDL\b|高密度/ig, lo: 5, hi: 200 },
    ldl: { re: /\bLDL\b|低密度/ig, lo: 5, hi: 500 },
    waist: { re: /腰\s*圍|Waist/ig, lo: 40, hi: 200 },
    alt: { re: /\bALT\b|\bS?GPT\b/ig, lo: 1, hi: 5000 },
    ast: { re: /\bAST\b|\bS?GOT\b/ig, lo: 1, hi: 5000 },
    plt: { re: /\bPLT\b|Platelets?|血小板/ig, lo: 1, hi: 1500, plt: true },
    bil: { re: /T[-.\s]?BIL\w*|Total\s*Bil\w*|Bilirubin\s*[,(]?\s*total|總膽紅素/ig, lo: 0.1, hi: 40 },
    alp: { re: /\bALP\b|\bAlk(?:aline)?[-.\s]*P(?:hos\w*)?\b|鹼性磷酸\S*/ig, lo: 5, hi: 5000 },
    alb: { re: /\bAlb(?:umin)?\b|白蛋白/ig, lo: 1, hi: 70, alb: true },
    inr: { re: /\bINR\b/ig, lo: 0.5, hi: 15 }
  };

  // 同一行裡每個項目名稱後面那一段文字（到下一個項目名稱為止）
  function ocrSegs(line, keys){
    var hits = [];
    keys.forEach(function(k){
      var re = OCR_KEYS[k].re; re.lastIndex = 0;
      var m;
      while ((m = re.exec(line))) hits.push({ k: k, s: m.index, e: m.index + m[0].length });
    });
    hits.sort(function(a, b){ return a.s - b.s; });
    return hits.map(function(h, i){ return { k: h.k, seg: line.slice(h.e, i + 1 < hits.length ? hits[i + 1].s : undefined) }; });
  }
  // 報告上的參考值上限：數值後面的「0-40」「5～35」「<40」「≦40」「≤40」
  // 依報告欄位順序「結果 →（↑↓ 旗標）→ 參考區間 → 單位」拆一列：單位前最後一個數字（或範圍）是參考值，
  // 再往前一個是結果。中文名稱常被認成夾帶數字的亂碼（例如「44.70 SE 48」），從單位往回找就不受影響。
  // ↑ 常被認成「1」，夾在結果與參考值中間的單獨「1」當成旗標略過
  var OCR_UNIT = /I?U\s*\/\s*L\b|\bI?UL\b|\bIU\b|m?g\s*\/\s*[dm]?L\b|mmol\s*\/\s*L\b|10\s*\^?\s*[39]\s*\/\s*[uµ]?L|\/\s*[uµ]L\b/i;
  function ocrRow(seg){
    var u = seg.search(OCR_UNIT);
    if (u < 0) return null;
    var toks = seg.slice(0, u).match(/\d+(?:\.\d+)?(?:\s*[-–~～]\s*\d+(?:\.\d+)?)?/g);
    if (!toks || toks.length < 2) return null;
    var ref = toks.pop(), r = ref.match(/(\d+(?:\.\d+)?)(?:\s*[-–~～]\s*(\d+(?:\.\d+)?))?/);
    var hi = r[2] ? parseFloat(r[2]) : parseFloat(r[1]);
    if (r[2] && parseFloat(r[1]) >= hi) hi = NaN;
    if (toks.length >= 2 && toks[toks.length - 1] === '1') toks.pop();
    var last = toks[toks.length - 1];
    if (/[-–~～]/.test(last)) return null;
    return { v: ocrVal(last), hi: hi };
  }
  function ocrRef(lines, k, keys){
    for (var i = 0; i < lines.length; i++) {
      var segs = ocrSegs(lines[i], keys);
      for (var j = 0; j < segs.length; j++) {
        if (segs[j].k !== k) continue;
        var row = ocrRow(segs[j].seg);
        if (row && row.hi >= 5 && row.hi <= 1000) return row.hi;
        var seg = segs[j].seg, v = seg.match(OCR_NUM);
        if (!v) continue;
        var rest = seg.slice(v.index + v[0].length);
        var m = rest.match(/(\d+(?:\.\d+)?)\s*[-–~～]\s*(\d+(?:\.\d+)?)/);
        var hi = m ? parseFloat(m[2]) : NaN;
        if (m && parseFloat(m[1]) >= hi) hi = NaN;
        // 「≦」「≤」實際辨識常變成 £、€、=、«、<I、<l 等，一併接受
        if (!m) { m = rest.match(/(?:[<≦≤≲⩽£€=«‹]|\bS(?=\d))\s*[=_Il|!]?\s*(\d+(?:\.\d+)?)/); if (m) hi = parseFloat(m[1]); }
        // 符號整個漏掉：數值後面只有單位，再接一個數字（例如「52 U/L 35」）
        if (!m) { m = rest.match(/^\s*[HLhl*↑↓]?\s*(?:I?U\s*\/?\s*L|IU|mg\/dL)\s+(\d+(?:\.\d+)?)\s*$/i); if (m) hi = parseFloat(m[1]); }
        if (hi >= 5 && hi <= 1000) return hi;
      }
    }
    return NaN;
  }

  function ocrPick(lines, keys){
    var out = {}, sure = {};
    function fix(k, v){
      var spec = OCR_KEYS[k];
      if (spec.plt && v > 2000) v = v / 1000;   // 以 /µL 表示的血小板換算成 ×10³/µL
      if (spec.alb && v > 7) v = v / 10;        // 以 g/L 表示的白蛋白換算成 g/dL
      if (spec.alb && (v < 1 || v > 7)) return NaN;
      return v >= spec.lo && v <= spec.hi ? v : NaN;
    }
    function accept(k, v){
      v = fix(k, v);
      if (!isNaN(v) && !(k in out)) out[k] = v;
    }
    // 先找「結果、參考值、單位」排得完整的列；兩次辨識結果不同時取出現較多次的
    lines.forEach(function(line){
      ocrSegs(line, keys).forEach(function(s){
        var row = ocrRow(s.seg), v = row ? fix(s.k, row.v) : NaN;
        if (!isNaN(v)) (sure[s.k] = sure[s.k] || []).push(v);
      });
    });
    Object.keys(sure).forEach(function(k){
      var n = {};
      sure[k].forEach(function(v){ n[v] = (n[v] || 0) + 1; });
      out[k] = sure[k].reduce(function(a, b){ return n[b] > n[a] ? b : a; });
    });
    lines.forEach(function(line, li){
      var hits = [];
      keys.forEach(function(k){
        var re = OCR_KEYS[k].re; re.lastIndex = 0;
        var m;
        while ((m = re.exec(line))) hits.push({ k: k, s: m.index, e: m.index + m[0].length });
      });
      if (!hits.length) return;
      hits.sort(function(a, b){ return a.s - b.s; });
      var got = 0;
      hits.forEach(function(h, i){
        var seg = line.slice(h.e, i + 1 < hits.length ? hits[i + 1].s : undefined);
        var m = seg.match(OCR_NUM);
        if (m) { accept(h.k, ocrVal(m[1])); got++; }
      });
      // 表格把名稱排成一列、數值在下一列：依順序對應
      if (!got && hits.length >= 2) {
        var next = (lines[li + 1] || '').match(/\d+(?:\.\d+)?/g) || [];
        if (next.length >= hits.length) hits.forEach(function(h, i){ accept(h.k, parseFloat(next[i])); });
      }
    });
    return out;
  }

  function ocrAge(text){
    var m = text.match(/(?:年\s*齡|Age)\s*[:：]?\s*(\d{1,3})/i) || text.match(/(\d{1,3})\s*(?:歲|y\/o\b|yo\b|yrs?\b)/i);
    if (m && +m[1] > 0 && +m[1] <= 120) return +m[1];
    // 「歲」常被認成「%」：只在有姓名、性別的那幾行採用，避免抓到檢驗的百分比
    m = text.match(/^.*(?:姓名|性別|病歷|男|女).*$/mg);
    m = m && m.join(' ').match(/(?:^|[^\d.])(\d{1,3})\s*%/);
    if (m && +m[1] > 0 && +m[1] <= 120) return +m[1];
    m = text.match(/(?:出生日期|出生|生日|DOB|Birth\w*)\D{0,8}(\d{2,4})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})/i);
    if (!m) return NaN;
    var y = +m[1]; if (y < 1000) y += 1911;   // 民國年
    var now = new Date(), age = now.getFullYear() - y;
    if (now.getMonth() + 1 < +m[2] || (now.getMonth() + 1 === +m[2] && now.getDate() < +m[3])) age--;
    return age > 0 && age <= 120 ? age : NaN;
  }
  function ocrSex(text){
    var m = text.match(/(?:性\s*別|Sex|Gender)\s*[:：]?\s*(男|女|M(?:ale)?\b|F(?:emale)?\b)/i) || text.match(/\b(Male|Female)\b/i);
    if (!m) return '';
    return /^(男|M)/i.test(m[1]) ? 'M' : 'F';
  }
  // HBsAg／HBeAg：文字判讀優先，沒有文字時以 COI ≥1 判定陽性
  function ocrAntigen(lines, re){
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(re);
      if (!m) continue;
      var seg = lines[i].slice(m.index + m[0].length);
      if (/non[-\s]?reactive|negative|陰性|\(\s*-\s*\)/i.test(seg)) return 'N';
      if (/reactive|positive|陽性|\(\s*\+\s*\)/i.test(seg)) return 'P';
      var n = seg.match(/([<>]?)\s*(\d+(?:\.\d+)?)/);
      if (n) { var v = parseFloat(n[2]); if (n[1] !== '<' && v >= 1) return 'P'; if (v < 1) return 'N'; }
    }
    return '';
  }
  // HBV DNA：可能寫成 2.3E+05、2.3x10^5、<20 或 Not detected；copies/mL 依 5.82 換算 IU/mL
  function ocrDna(lines){
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i], m = line.match(/HBV[-\s]*DNA|DNA\s*(?:viral\s*load|定量)/i);
      if (!m) continue;
      var seg = line.slice(m.index + m[0].length) + ' ' + (lines[i + 1] || '');
      if (/not\s*detect|undetect|\bTND\b|未檢出|測不到/i.test(seg)) return { und: true, note: '測不到' };
      var n = seg.match(/(<)?\s*(\d+(?:\.\d+)?)\s*(?:(?:[xX×*]\s*10\s*\^?\s*\(?\s*([+-]?\d+)\s*\)?)|[eE]\s*\+?\s*(\d+))?/);
      if (!n) continue;
      if (n[1]) return { und: true, note: '<' + n[2] + '，視為低於偵測下限' };
      var v = parseFloat(n[2]) * Math.pow(10, +(n[3] || n[4] || 0));
      if (/copies/i.test(seg)) return { v: Math.round(v / 5.82), note: '由 copies/mL 換算' };
      return { v: v };
    }
    return null;
  }
  function ocrFibroscan(text){
    var m = text.match(/(\d+(?:\.\d+)?)\s*kPa/i);
    return m && +m[1] >= 2 && +m[1] <= 75 ? +m[1] : NaN;
  }

  // 檢驗日期：先找採檢、檢驗、抽血、收件那幾行，再找報告日期，最後才找任何日期；出生日期那行跳過
  function ocrDate(lines){
    var DATE = /(\d{2,4})\s*[\/.\-年]\s*(\d{1,2})\s*[\/.\-月]\s*(\d{1,2})|\b((?:19|20)\d{2})(\d{2})(\d{2})\b/g;
    var tiers = [/採\s*檢|檢\s*驗|抽\s*血|採\s*血|收\s*件|Collect|Sampl/i, /報\s*告|日\s*期|Date/i, /./];
    var today = new Date();
    for (var t = 0; t < tiers.length; t++) {
      for (var i = 0; i < lines.length; i++) {
        if (/出生|生日|DOB|Birth/i.test(lines[i]) || !tiers[t].test(lines[i])) continue;
        var m; DATE.lastIndex = 0;
        while ((m = DATE.exec(lines[i]))) {
          var y = +(m[1] || m[4]), mo = +(m[2] || m[5]), d = +(m[3] || m[6]);
          if (y < 1000) y += 1911;   // 民國年
          var dt = new Date(y, mo - 1, d);
          if (y >= 1990 && mo >= 1 && mo <= 12 && dt.getDate() === d && dt <= today)
            return y + '-' + (mo < 10 ? '0' : '') + mo + '-' + (d < 10 ? '0' : '') + d;
        }
      }
    }
    return '';
  }

  // 每張截圖先各自讀出數值，等全部辨識完再依日期整理後一起帶入
  var OCR_READ = {
    lipidrx: function(text, lines){
      var v = ocrPick(lines, ['tc', 'tg', 'hdl', 'ldl', 'waist']);
      v.sex = ocrSex(text); v.age = ocrAge(text);
      return v;
    },
    hbvrx: function(text, lines){
      var v = ocrPick(lines, ['alt', 'ast', 'plt', 'bil']);
      v.age = ocrAge(text);
      v.sag = ocrAntigen(lines, /HBs\s*Ag/i); v.eag = ocrAntigen(lines, /HBe\s*Ag/i);
      v.dna = ocrDna(lines); v.fs = ocrFibroscan(text);
      return v;
    },
    fib4: function(text, lines){
      var v = ocrPick(lines, ['alt', 'ast', 'plt']);
      v.age = ocrAge(text);
      return v;
    },
    rfactor: function(text, lines){
      var keys = ['alt', 'ast', 'alp', 'bil'];
      var v = ocrPick(lines, ['alt', 'alp']);
      v.altU = ocrRef(lines, 'alt', keys); v.alpU = ocrRef(lines, 'alp', keys);
      return v;
    },
    childpugh: function(text, lines){
      return ocrPick(lines, ['bil', 'alb', 'inr']);
    }
  };

  return { ocrNormalize: ocrNormalize, ocrTable: ocrTable, ocrDate: ocrDate, OCR_READ: OCR_READ };
}
