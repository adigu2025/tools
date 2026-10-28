(function(){
  "use strict";

  var $ = function(id){ return CD.getElementById(id); };

  // 各工具最近一次的結果文字，供「複製結果」使用
  var COPY = {};
  // 自我評估模組的分頁與面板由資料產生，必須早於下方所有事件綁定，
  // 因此這些狀態變數也必須在 buildAssessments() 之前就完成指派
  var RESETTERS = {};
  var QSTATE = {};
  var TONE = {
    green:{ color:'#2E7D4F', bg:'#E9F5EE' },
    amber:{ color:'#B45A00', bg:'#FFF5E6' },
    red:{ color:'#C0392B', bg:'#FBEBE9' }
  };
  var ASSESS = assessSpecs();
  buildAssessments();

  /* ======================================================
     Tabs + hash routing
     ====================================================== */
  var tabs = Array.prototype.slice.call(CD.querySelectorAll('.tab'));
  var groupBtns = Array.prototype.slice.call(CD.querySelectorAll('.group-btn'));
  var TOOL_GROUP = {};
  tabs.forEach(function(t){
    TOOL_GROUP[t.dataset.tool] = t.closest('.tabs').dataset.group;
  });

  // 預設停在基本評估的第一項（BMI）。FIB-4、R Factor、Child-Pugh 這類
  // 需要醫師解釋的判讀工具另外收在「臨床判讀」，避免病人誤讀存活率等數字
  var DEFAULT_GROUP = 'basic';
  var staffUnlocked = false;

  function unlockStaff(){
    if (staffUnlocked) return;
    staffUnlocked = true;
    $('group-calc').hidden = false;
    var toggle = $('staff-toggle');
    toggle.hidden = true;
    toggle.setAttribute('aria-expanded', 'true');
  }

  function switchGroup(group){
    groupBtns.forEach(function(b){
      var on = b.dataset.group === group;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    CD.querySelectorAll('.tabs').forEach(function(row){
      row.hidden = row.dataset.group !== group;
    });
    $('staff-notice').hidden = group !== 'calc';
  }

  // 「已完成的評估」彙整與列印只給自我評估用（病人要帶去門診的那種），以面板的 data-summary 標記。
  // BMI 這類當場看的計算與臨床判讀工具不需要。脂肪肝放在基本評估，但仍是自我評估，所以照樣收錄。
  function isSummaryTool(tool){
    var p = $('panel-' + tool);
    return !!(p && p.dataset.summary);
  }

  function firstToolOf(group){
    var first = CD.querySelector('.tabs[data-group="' + group + '"] .tab');
    return first ? first.dataset.tool : null;
  }

  function visibleGroupBtns(){
    return groupBtns.filter(function(b){ return !b.hidden; });
  }

  groupBtns.forEach(function(b){
    b.addEventListener('click', function(){
      // 切換分類時跳到該分類的第一個工具
      var first = firstToolOf(b.dataset.group);
      if (first) switchTool(first);
    });
    b.addEventListener('keydown', function(e){
      var list = visibleGroupBtns();
      var i = list.indexOf(b), next = null;
      if (e.key === 'ArrowRight') next = (i + 1) % list.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + list.length) % list.length;
      if (next === null) return;
      e.preventDefault();
      list[next].click();
      list[next].focus();
    });
  });

  $('staff-toggle').addEventListener('click', function(){
    unlockStaff();
    switchTool(firstToolOf('calc'));
    $('group-calc').focus();
  });

  /* ======================================================
     QR code 放大
     ====================================================== */
  (function(){
    var overlay = $('qr-overlay'), openBtn = $('qr-open'), closeBtn = $('qr-close');
    if (!overlay || !openBtn || !closeBtn) return;
    function openQr(){ overlay.hidden = false; closeBtn.focus(); }
    function closeQr(){ overlay.hidden = true; openBtn.focus(); }
    openBtn.addEventListener('click', openQr);
    closeBtn.addEventListener('click', closeQr);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeQr(); });
    CD.addEventListener('keydown', function(e){ if (e.key === 'Escape' && !overlay.hidden) closeQr(); });
  })();
  var TOOLS = tabs.map(function(t){ return t.dataset.tool; });

  function switchTool(tool, opts){
    if (TOOLS.indexOf(tool) === -1) tool = firstToolOf(DEFAULT_GROUP) || TOOLS[0];
    opts = opts || {};
    // 直接以錨點指向臨床工具時（例如醫師自己的書籤），一併展開該分類
    if (TOOL_GROUP[tool] === 'calc') unlockStaff();
    tabs.forEach(function(t){
      var on = t.dataset.tool === tool;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && opts.scrollTab !== false) {
        t.scrollIntoView({ block:'nearest', inline:'nearest' });
      }
    });
    CD.querySelectorAll('.tool-panel').forEach(function(p){
      var on = p.id === 'panel-' + tool;
      p.classList.toggle('active', on);
      p.hidden = !on;
    });
    switchGroup(TOOL_GROUP[tool] || DEFAULT_GROUP);
    $('summary-zone').hidden = !isSummaryTool(tool);
    // 切換工具時「不」把工具名稱寫進網址。若寫進去，瀏覽器會記住帶錨點的網址，
    // 下次開啟就會停在上次那一項，而不是預設的 BMI。
  }

  tabs.forEach(function(t){
    t.addEventListener('click', function(){ switchTool(t.dataset.tool); });
    t.addEventListener('keydown', function(e){
      var i = TOOLS.indexOf(t.dataset.tool), next = null;
      if (e.key === 'ArrowRight') next = (i + 1) % TOOLS.length;
      else if (e.key === 'ArrowLeft') next = (i - 1 + TOOLS.length) % TOOLS.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = TOOLS.length - 1;
      if (next === null) return;
      e.preventDefault();
      switchTool(TOOLS[next]);
      tabs[next].focus();
    });
  });

  // 網址錨點一律忽略。舊版會把工具名稱寫進錨點，瀏覽器記住後就會停在上次那一項；
  // 要直接指定工具請改用 ?tool=fib4 這種查詢參數。
  window.addEventListener('hashchange', stripHash);

  function stripHash(){
    if (!location.hash) return;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* 忽略 */ }
  }

  function toolFromQuery(){
    var m = /[?&]tool=([A-Za-z0-9_-]+)/.exec(location.search);
    return m ? m[1] : '';
  }

  /* ======================================================
     Field helpers
     ====================================================== */
  var EMPTY = null;   // 欄位空白
  var BAD = NaN;      // 超出合理範圍

  function isNum(v){ return typeof v === 'number' && !isNaN(v); }

  function num(id){
    var el = $(id);
    var wrap = el.closest('.field');
    var err = wrap ? wrap.querySelector('.field-err') : null;
    el.classList.remove('invalid');
    if (err) { err.textContent = ''; err.hidden = true; }

    var raw = el.value.trim();
    if (raw === '') return EMPTY;

    var v = parseFloat(raw);
    var min = el.min !== '' ? parseFloat(el.min) : -Infinity;
    var max = el.max !== '' ? parseFloat(el.max) : Infinity;
    if (!isFinite(v) || v < min || v > max) {
      el.classList.add('invalid');
      if (err) {
        err.textContent = '請輸入 ' + el.min + '–' + el.max + ' 之間的數值';
        err.hidden = false;
      }
      return BAD;
    }
    return v;
  }

  function fieldError(id, msg){
    var el = $(id);
    var wrap = el.closest('.field');
    var err = wrap ? wrap.querySelector('.field-err') : null;
    if (!err) return;
    if (msg) { el.classList.add('invalid'); err.textContent = msg; err.hidden = false; }
    else { el.classList.remove('invalid'); err.textContent = ''; err.hidden = true; }
  }

  function show(tool, hasResult){
    var hint = $(tool + '-hint');
    var res = $(tool + '-result');
    if (hint) hint.style.display = hasResult ? 'none' : 'block';
    if (res) res.style.display = hasResult ? 'block' : 'none';
    var btn = CD.querySelector('[data-copy="' + tool + '"]');
    if (btn) { btn.disabled = !hasResult; btn.classList.remove('done'); btn.textContent = btn.dataset.label || '複製結果'; }
    if (!hasResult) COPY[tool] = '';
    renderSummary();
    saveState();
  }

  function markRow(tableId, band){
    var t = $(tableId);
    if (!t) return;
    t.querySelectorAll('tbody tr').forEach(function(tr){
      tr.classList.toggle('hit', tr.dataset.band === band);
    });
  }

  function paint(tool, color, bg){
    var res = $(tool + '-result');
    if (!res) return;
    res.style.background = bg;
    res.style.borderColor = color;
  }

  function bind(ids, fn){
    ids.forEach(function(id){
      var el = $(id);
      if (!el) return;
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', fn);
    });
  }

  /* ======================================================
     Copy result
     ====================================================== */
  CD.querySelectorAll('[data-copy]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var tool = btn.dataset.copy;
      if (!COPY[tool]) return;
      // 附上日期，貼進病歷或帶去門診時才看得出是哪一天做的
      copyText(COPY[tool] + '（' + today() + '）', function(){
        btn.classList.add('done');
        btn.textContent = '已複製';
        setTimeout(function(){ btn.classList.remove('done'); btn.textContent = btn.dataset.label || '複製結果'; }, 1800);
      });
    });
  });

  function copyText(text, done){
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function(){ fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 忽略 */ }
    document.body.removeChild(ta);
  }

  /* ======================================================
     Reset
     ====================================================== */
  CD.querySelectorAll('[data-reset]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var tool = btn.dataset.reset;
      if (RESETTERS[tool]) { RESETTERS[tool](); return; }
      var panel = $('panel-' + tool);
      panel.querySelectorAll('input').forEach(function(el){
        el.value = '';
        el.classList.remove('invalid');
      });
      panel.querySelectorAll('select').forEach(function(el){
        el.value = '';
        el.classList.remove('invalid');
      });
      panel.querySelectorAll('.field-err').forEach(function(el){
        el.textContent = ''; el.hidden = true;
      });
      panel.querySelectorAll('.bristol-card').forEach(function(c){
        c.setAttribute('aria-pressed', 'false');
      });
      panel.querySelectorAll('tbody tr').forEach(function(tr){ tr.classList.remove('hit'); });
      if (tool === 'bmi') bmiBase = '';
      var tr = $('target-result'), td = $('target-detail');
      if (tr) tr.style.display = 'none';
      if (td) td.style.display = 'none';
      show(tool, false);
      var first = panel.querySelector('input, select');
      if (first) first.focus();
    });
  });

  /* ======================================================
     BMI
     ====================================================== */
  var BMI_STATUS = [
    { max:18.5,     label:'體重過輕', color:'#2979A0', bg:'#E6F1F8', note:'建議增加營養攝取，必要時由醫師評估潛在原因。' },
    { max:24,       label:'體重正常', color:'#2E7D4F', bg:'#E9F5EE', note:'維持現有飲食與運動習慣，定期追蹤。' },
    { max:27,       label:'體重過重', color:'#B45A00', bg:'#FFF5E6', note:'建議調整飲食內容並增加活動量。' },
    { max:30,       label:'輕度肥胖', color:'#C0392B', bg:'#FBEBE9', note:'建議就醫評估，擬定減重計畫。' },
    { max:35,       label:'中度肥胖', color:'#C0392B', bg:'#FBEBE9', note:'建議就醫評估代謝疾病風險並積極介入。' },
    { max:Infinity, label:'重度肥胖', color:'#922B21', bg:'#FBEBE9', note:'建議儘早就醫，進行全面健康評估。' }
  ];

  var bmiBase = '';

  function calcBMI(){
    var h = num('height'), w = num('weight');
    if (!isNum(h) || !isNum(w)) { bmiBase = ''; show('bmi', false); calcTarget(); return; }

    var hm = h / 100;
    var bmi = w / (hm * hm);
    var s = BMI_STATUS.find(function(x){ return bmi < x.max; });

    $('bmi-val').textContent = bmi.toFixed(1);
    $('bmi-val').style.color = s.color;
    var badge = $('bmi-badge');
    badge.textContent = s.label;
    badge.style.background = s.bg;
    badge.style.color = s.color;
    $('bmi-note').textContent = s.note;

    var lo = (18.5 * hm * hm).toFixed(1);
    var hi = (24 * hm * hm).toFixed(1);
    $('ideal-range').textContent = lo + ' – ' + hi + ' kg';

    var extra;
    if (bmi >= 24) extra = '距標準體重上限（' + hi + ' kg）約需減少 ' + (w - parseFloat(hi)).toFixed(1) + ' kg。';
    else if (bmi < 18.5) extra = '距標準體重下限（' + lo + ' kg）約需增加 ' + (parseFloat(lo) - w).toFixed(1) + ' kg。';
    else extra = '目前體重位於標準範圍內。';
    $('ideal-note').textContent = extra;

    var marker = $('bar-marker');
    marker.style.left = (Math.min(Math.max((bmi - 14) / 26, 0), 1) * 100) + '%';
    marker.setAttribute('aria-valuenow', bmi.toFixed(1));
    marker.setAttribute('aria-valuetext', 'BMI ' + bmi.toFixed(1) + '，體重 ' + w.toFixed(1) + ' 公斤');

    bmiBase = 'BMI ' + bmi.toFixed(1) + '（' + s.label + '）｜身高 ' + h + ' cm、體重 ' + w +
              ' kg｜標準體重範圍 ' + lo + '–' + hi + ' kg';
    COPY.bmi = bmiBase;
    show('bmi', true);
    calcTarget();
  }

  function calcTarget(){
    var w = num('weight'), t = num('target-weight');
    var box = $('target-result'), detail = $('target-detail');
    var hide = function(){
      box.style.display = 'none';
      detail.style.display = 'none';
      if (bmiBase) COPY.bmi = bmiBase;
    };

    if (!isNum(w) || !isNum(t)) { hide(); return; }
    if (t >= w) {
      fieldError('target-weight', '目標體重需小於目前體重');
      hide();
      return;
    }

    var pct = ((w - t) / w * 100).toFixed(1);
    var diff = (w - t).toFixed(1);
    var el = $('target-pct');
    el.textContent = '需減重 ' + pct + '%';
    el.style.background = '#FFF5E6';
    el.style.color = '#B45A00';
    box.style.display = 'block';
    detail.textContent = '目前 ' + w + ' kg → 目標 ' + t + ' kg，需減少 ' + diff + ' kg（占目前體重 ' + pct + '%）。' +
                         '以每週減重 0.5 kg 估算，約需 ' + Math.ceil(parseFloat(diff) / 0.5) + ' 週。';
    detail.style.display = 'block';
    if (bmiBase) COPY.bmi = bmiBase + '｜目標 ' + t + ' kg（需減 ' + diff + ' kg，' + pct + '%）';
  }

  bind(['height','weight'], calcBMI);
  bind(['target-weight'], calcTarget);

  /* ------------------------------------------------------
     BMI 色條：拖曳黑點即時調整體重（身高固定）
     ------------------------------------------------------ */
  (function(){
    var track = $('bar-track');
    var marker = $('bar-marker');
    if (!track || !marker) return;

    var BMI_MIN = 14, BMI_MAX = 40;

    // 依身高把指定 BMI 換算成體重，並套回體重欄位
    function setWeightByBMI(bmi){
      var h = num('height');
      if (!isNum(h)) return;
      var el = $('weight');
      var hm = h / 100;
      var w = bmi * hm * hm;
      var lo = parseFloat(el.min), hi = parseFloat(el.max);
      w = Math.min(Math.max(w, lo), hi);
      el.value = w.toFixed(1);
      calcBMI();
    }

    function bmiFromX(clientX){
      var r = track.getBoundingClientRect();
      var p = Math.min(Math.max((clientX - r.left) / r.width, 0), 1);
      return BMI_MIN + p * (BMI_MAX - BMI_MIN);
    }

    function onMove(e){
      e.preventDefault();
      setWeightByBMI(bmiFromX(e.clientX));
    }

    function onUp(e){
      marker.classList.remove('dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (marker.releasePointerCapture && e.pointerId !== undefined) {
        try { marker.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      }
    }

    function startDrag(e){
      if (e.button !== undefined && e.button !== 0) return;
      if (!isNum(num('height'))) return;
      e.preventDefault();
      marker.classList.add('dragging');
      marker.focus();
      if (marker.setPointerCapture && e.pointerId !== undefined) {
        try { marker.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      }
      setWeightByBMI(bmiFromX(e.clientX));
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }

    track.addEventListener('pointerdown', startDrag);

    // 鍵盤操作：方向鍵 ±0.5 kg，PageUp／PageDown ±2 kg
    marker.addEventListener('keydown', function(e){
      var step = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') step = 0.5;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') step = -0.5;
      else if (e.key === 'PageUp') step = 2;
      else if (e.key === 'PageDown') step = -2;
      if (!step) return;
      e.preventDefault();
      var el = $('weight');
      var w = parseFloat(el.value);
      if (isNaN(w)) return;
      var lo = parseFloat(el.min), hi = parseFloat(el.max);
      el.value = Math.min(Math.max(w + step, lo), hi).toFixed(1);
      calcBMI();
    });
  })();

  /* ======================================================
     BMR / TDEE
     ====================================================== */
  function calcTDEE(){
    var sex = $('tdee-sex').value;
    var age = num('tdee-age'), ht = num('tdee-height'), wt = num('tdee-weight');
    var act = parseFloat($('tdee-activity').value);

    if (!sex || !isNum(age) || !isNum(ht) || !isNum(wt) || !act) { show('tdee', false); return; }

    var bmr = 10 * wt + 6.25 * ht - 5 * age + (sex === 'male' ? 5 : -161);
    var tdee = bmr * act;
    // 一般減重建議每日少吃 500 kcal，但不低於自行節食的最低熱量
    // （女性 1,200、男性 1,500 kcal），更低須在醫療監督下進行。
    // 個子小、活動量低的人照扣 500 會掉到這條線以下，所以縮小赤字
    var floor = sex === 'male' ? 1500 : 1200;
    var deficit = Math.round(Math.max(0, Math.min(500, tdee - floor)));
    var target = tdee - deficit;

    $('tdee-bmr').textContent = Math.round(bmr);
    $('tdee-val').textContent = Math.round(tdee);
    $('tdee-target').textContent = Math.round(target);
    $('tdee-target-unit').textContent = 'kcal／天（−' + deficit + '）';
    $('tdee-timeline-title').textContent = '減重時程預估（每日減少 ' + deficit + ' kcal）';
    var floorNote = '';
    var floorName = (sex === 'male' ? '男性 1,500' : '女性 1,200') + ' kcal';
    if (deficit === 0) {
      floorNote = '每日總消耗已低於自行節食的最低建議熱量（' + floorName + '），不建議再少吃。建議增加活動量，或到門診討論其他方式。';
    } else if (deficit < 500) {
      floorNote = '減重目標熱量已設在自行節食的最低建議值（' + floorName + '），不再往下扣。' +
        (deficit < 200 ? '光靠少吃效果有限，建議增加活動量，或到門診討論其他方式。' : '想再加快，建議從增加活動量著手。');
    }
    $('tdee-floor').textContent = floorNote;
    $('tdee-floor').hidden = !floorNote;

    var labels = ['1 個月', '2 個月', '3 個月', '6 個月'];
    var weeks = [4, 8, 12, 24];
    var loss = weeks.map(function(w){ return (w * 7 * deficit / 7700).toFixed(1); });
    var html = '';
    for (var i = 0; i < weeks.length; i++) {
      html += '<div class="mini"><div class="mini-label">' + labels[i] + '</div>' +
              '<div class="mini-val">−' + loss[i] + '</div><div class="mini-unit">kg</div></div>';
    }
    $('tdee-timeline').innerHTML = html;

    var waterLo = Math.round(wt * 30 / 50) * 50, waterHi = Math.round(wt * 35 / 50) * 50;
    $('tdee-water').textContent = '每日飲水 30 至 35 mL/kg（以您的體重約 ' + fmtInt(waterLo) + ' 至 ' + fmtInt(waterHi) + ' mL）';

    var protein = Math.round(target * 0.30 / 4);
    var carbs = Math.round(target * 0.40 / 4);
    var fat = Math.round(target * 0.30 / 9);
    $('tdee-macros').innerHTML =
      '<div class="mini"><div class="mini-label">蛋白質</div><div class="mini-val" style="color:var(--blue)">' + protein + '</div><div class="mini-unit">g／天</div></div>' +
      '<div class="mini"><div class="mini-label">碳水化合物</div><div class="mini-val" style="color:var(--green)">' + carbs + '</div><div class="mini-unit">g／天</div></div>' +
      '<div class="mini"><div class="mini-label">脂肪</div><div class="mini-val" style="color:var(--gold)">' + fat + '</div><div class="mini-unit">g／天</div></div>';

    var actSel = $('tdee-activity');
    var actName = actSel.options[actSel.selectedIndex].text.replace(/（.*$/, '');
    var bmi = wt / Math.pow(ht / 100, 2);
    COPY.tdee = (sex === 'male' ? '男' : '女') + ' ' + age + ' 歲，' + ht + ' cm／' + wt + ' kg（BMI ' + bmi.toFixed(1) + '），' +
                actName + ' × ' + act + '｜' +
                'BMR ' + Math.round(bmr) + ' kcal／天｜TDEE ' + Math.round(tdee) +
                ' kcal／天｜減重目標 ' + Math.round(target) + ' kcal／天（−' + deficit + '）｜' +
                '蛋白質 ' + protein + ' g、碳水 ' + carbs + ' g、脂肪 ' + fat + ' g';
    show('tdee', true);
  }

  bind(['tdee-sex','tdee-age','tdee-height','tdee-weight','tdee-activity'], calcTDEE);

  function fmtInt(n){ return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  /* ======================================================
     FIB-4
     ====================================================== */
  function calcFIB4(){
    var age = num('fib-age'), ast = num('fib-ast'), alt = num('fib-alt'), plt = num('fib-plt');
    if (!isNum(age) || !isNum(ast) || !isNum(alt) || !isNum(plt)) { show('fib4', false); markRow('fib4-table', null); return; }

    var fib4 = (age * ast) / (plt * Math.sqrt(alt));
    var senior = age >= 65;
    var loCut = senior ? 2.0 : 1.30;
    var hiCut = senior ? 4.0 : 2.67;
    var cutNote = senior ? '（年齡 ≥ 65 歲，已改用調整閾值 2.0／4.0）' : '';

    var status, color, bg, band, interp;
    if (fib4 < loCut) {
      status = '低度纖維化風險'; color = '#2E7D4F'; bg = '#E9F5EE'; band = 'low';
      interp = 'FIB-4 < ' + loCut.toFixed(2) + cutNote + '：可合理排除進階肝纖維化（F0–F1），陰性預測值約 90%。\n建議依病因常規追蹤，並定期複查肝功能與血小板。';
    } else if (fib4 <= hiCut) {
      status = '不確定區間'; color = '#B45A00'; bg = '#FFF5E6'; band = 'mid';
      interp = 'FIB-4 介於 ' + loCut.toFixed(2) + '–' + hiCut.toFixed(2) + cutNote + '：落於不確定區間，無法排除也無法確認進階纖維化。\n建議搭配肝臟彈性超音波（FibroScan）或其他非侵入性指標進一步評估。';
    } else {
      status = '高度纖維化風險'; color = '#C0392B'; bg = '#FBEBE9'; band = 'high';
      interp = 'FIB-4 > ' + hiCut.toFixed(2) + cutNote + '：高度懷疑進階肝纖維化（F3–F4），陽性預測值約 65%。\n建議安排肝臟彈性超音波，必要時考慮肝臟切片，並評估後續治療與肝癌篩檢策略。';
    }
    if (age < 35) {
      interp += '\n※ 年齡 < 35 歲時 FIB-4 的診斷準確度較低，判讀請保守。';
    }

    paint('fib4', color, bg);
    $('fib-score').textContent = fib4.toFixed(2);
    $('fib-score').style.color = color;
    $('fib-status').textContent = status;
    $('fib-status').style.color = color;
    $('fib-interp').textContent = interp;
    markRow('fib4-table', senior ? null : band);

    COPY.fib4 = 'FIB-4 = ' + fib4.toFixed(2) + '（' + status + '）｜年齡 ' + age +
                '、AST ' + ast + '、ALT ' + alt + '、PLT ' + plt + ' ×10⁹/L' +
                (senior ? '｜採 ≥65 歲調整閾值 2.0／4.0' : '');
    show('fib4', true);
  }

  bind(['fib-age','fib-ast','fib-alt','fib-plt'], calcFIB4);

  /* ======================================================
     R Factor
     ====================================================== */
  function calcRF(){
    var alt = num('rf-alt'), altULN = num('rf-alt-uln'), alp = num('rf-alp'), alpULN = num('rf-alp-uln');
    if (!isNum(alt) || !isNum(altULN) || !isNum(alp) || !isNum(alpULN)) { show('rfactor', false); markRow('rfactor-table', null); return; }

    var r = (alt / altULN) / (alp / alpULN);
    var label, color, bg, band, interp, detail;

    if (r >= 5) {
      label = '肝細胞型損傷 Hepatocellular'; color = '#C0392B'; bg = '#FBEBE9'; band = 'hep';
      interp = 'R ≥ 5：以 ALT 顯著升高為主，提示肝細胞直接損傷。';
      detail = '處置建議：停用可疑藥物並密切追蹤肝功能。鑑別診斷可安排病毒性肝炎血清學（HAV／HBV／HCV）、自體免疫抗體（ANA、ASMA、IgG），並評估酒精與草藥使用史。若合併黃疸（Hy’s law），需警覺急性肝衰竭風險。';
    } else if (r < 2) {
      label = '膽汁鬱積型損傷 Cholestatic'; color = '#2979A0'; bg = '#E6F1F8'; band = 'chol';
      interp = 'R < 2：以 ALP 顯著升高為主，提示膽道排泄或膽汁分泌受損。';
      detail = '處置建議：先以腹部超音波排除膽道阻塞，並檢驗 GGT（確認 ALP 來自肝膽）、直接與間接膽紅素；必要時安排 MRCP。亦須考慮原發性膽汁性膽管炎（AMA）等膽汁鬱積性肝病。';
    } else {
      label = '混合型損傷 Mixed'; color = '#B45A00'; bg = '#FFF5E6'; band = 'mix';
      interp = 'R 介於 2–5：肝細胞損傷與膽汁鬱積並存。';
      detail = '處置建議：完整回顧用藥史（含中草藥、保健食品與近三個月新增藥物），同時進行病毒性與自體免疫性肝炎鑑別，並以腹部超音波評估膽道。停藥後追蹤肝功能變化有助於因果判定。';
    }

    paint('rfactor', color, bg);
    $('rf-score').textContent = r.toFixed(2);
    $('rf-score').style.color = color;
    var badge = $('rf-badge');
    badge.textContent = label;
    badge.style.background = bg;
    badge.style.color = color;
    badge.style.border = '1.5px solid ' + color;
    $('rf-interp').textContent = interp;
    $('rf-detail').textContent = detail;
    markRow('rfactor-table', band);

    COPY.rfactor = 'R factor = ' + r.toFixed(2) + '（' + label + '）｜ALT ' + alt + '／ULN ' + altULN +
                   '、ALP ' + alp + '／ULN ' + alpULN;
    show('rfactor', true);
  }

  bind(['rf-alt','rf-alt-uln','rf-alp','rf-alp-uln'], calcRF);

  /* ======================================================
     Child-Pugh
     ====================================================== */
  var CP_FIELDS = [
    { id:'cp-ascites', label:'腹水' },
    { id:'cp-enceph',  label:'肝性腦病變' },
    { id:'cp-bili',    label:'總膽紅素' },
    { id:'cp-alb',     label:'白蛋白' },
    { id:'cp-pt',      label:'PT／INR' }
  ];

  function calcCP(){
    var vals = CP_FIELDS.map(function(f){ return $(f.id).value; });
    var filled = vals.filter(function(v){ return v !== ''; }).length;

    if (filled < CP_FIELDS.length) {
      show('childpugh', false);
      markRow('childpugh-table', null);
      return;
    }

    var total = vals.reduce(function(a, v){ return a + parseInt(v, 10); }, 0);
    var grade, color, bg, band, interp;
    if (total <= 6) {
      grade = 'A 級'; color = '#2E7D4F'; bg = '#E9F5EE'; band = 'A';
      interp = '代償良好，肝功能尚可維持。一年存活率約 100%，二年約 85%。建議定期追蹤肝功能與腹部超音波（肝癌篩檢）。';
    } else if (total <= 9) {
      grade = 'B 級'; color = '#B45A00'; bg = '#FFF5E6'; band = 'B';
      interp = '肝功能中度受損。一年存活率約 81%，二年約 57%。建議加強併發症監測，並評估肝臟移植的轉介時機。';
    } else {
      grade = 'C 級'; color = '#C0392B'; bg = '#FBEBE9'; band = 'C';
      interp = '失代償期肝硬化，肝功能嚴重受損。一年存活率約 45%，二年約 35%。建議積極評估肝臟移植並處理併發症。';
    }

    paint('childpugh', color, bg);
    $('cp-score').textContent = total + ' 分';
    $('cp-score').style.color = color;
    $('cp-grade').textContent = 'Child-Pugh ' + grade;
    $('cp-grade').style.color = color;
    $('cp-interp').textContent = interp;

    var parts = CP_FIELDS.map(function(f, i){ return f.label + ' ' + vals[i] + ' 分'; });
    $('cp-detail').textContent = '各項得分：' + parts.join('　');
    markRow('childpugh-table', band);

    COPY.childpugh = 'Child-Pugh ' + grade + '（' + total + ' 分）｜' + parts.join('、');
    show('childpugh', true);
  }

  bind(CP_FIELDS.map(function(f){ return f.id; }), calcCP);

  /* ======================================================
     用藥給付判定：共用小工具
     ====================================================== */
  function ck(id){ var e = $(id); return !!(e && e.checked); }
  function rxFmt(n){ return isNum(n) ? (Math.round(n * 100) / 100).toLocaleString('en-US') : '－'; }
  var RX_LABEL = { yes:'符合', no:'未符合', wait:'需先生活型態調整', na:'資料不足', part:'部分品項' };
  function rxBadge(st, label){
    return '<span class="rx-status st-' + st + '">' + esc(label || RX_LABEL[st] || '') + '</span>';
  }
  var RX_ACCENT = { yes:'var(--green)', no:'var(--red)', wait:'var(--amber)', part:'var(--amber)', na:'var(--line)' };
  function rxCard(st, title, bodyHtml, why, lead){
    var accent = lead ? 'var(--teal)' : (RX_ACCENT[st] || 'var(--line)');
    return '<div class="rx-card' + (lead ? ' lead' : '') + '" style="border-left-color:' + accent + '">' +
      '<div class="rx-card-head"><h4>' + esc(title) + '</h4>' + (st ? rxBadge(st) : '') + '</div>' +
      '<p>' + bodyHtml + '</p>' +
      (why ? '<div class="rx-why">' + esc(why) + '</div>' : '') +
      '</div>';
  }
  function rxRule(st, title, detail){
    return '<div class="rx-rule">' + rxBadge(st, st === 'part' ? '受限' : undefined) +
      '<div class="rx-rule-body"><b>' + esc(title) + '</b><div class="rx-why">' + esc(detail) + '</div></div></div>';
  }
  function rxDrugChips(list, on){
    return '<div class="drugs">' + list.map(function(d){
      return '<span class="drug ' + (on ? 'ok' : 'off') + '">' + esc(d[0]) + '<small>' + esc(d[1]) + '</small></span>';
    }).join('') + '</div>';
  }

  /* ======================================================
     降血脂／TG 用藥給付
     ====================================================== */
  var LX_NEW = [['Lipitor','10、20、40 mg'],['Crestor','10 mg'],['Tulip "SDZ"','10、20、40 mg'],['Vytorin','10/20 mg 複方'],['Atozet','10/10、10/20 mg 複方'],['Tonvasca','2/10 mg 複方']];
  var LX_OLD = [['Crestor','5、20 mg'],['Tulip','10、20、40 mg'],['Livalo','2 mg、OD 2 mg'],['Mevalotin protect','20、40 mg'],['Lescol XL','80 mg'],['Caduet','5/10、5/20 mg'],['Zyrova','5、10、20 mg']];
  var LX_FLAGS = ['lx-acs','lx-mi1y','lx-mi2','lx-mvd','lx-revasc','lx-cadPlaque','lx-carotid','lx-padPlaque','lx-padSym','lx-stroke',
    'lx-dm','lx-ckd','lx-cac','lx-htn','lx-smoke','lx-fhx','lx-meno','lx-bpHigh','lx-fgHigh','lx-tgMed','lx-life3','lx-intol','lx-event1y','lx-pcskPre'];

  function lipidrxShow(ok){
    var btn = CD.querySelector('[data-copy="lipidrx"]');
    if (btn) { btn.disabled = !ok; btn.classList.remove('done'); btn.textContent = '複製結果'; }
    if (!ok) COPY.lipidrx = '';
    renderSummary();
    saveState();
  }

  function calcLipidRx(){
    var s = $('lx-sex').value, age = num('lx-age');
    var ldl = num('lx-ldl'), tc = num('lx-tc'), hdl = num('lx-hdl'), tg = num('lx-tg'), waist = num('lx-waist');
    var h = {};
    LX_FLAGS.forEach(function(id){ h[id.slice(3)] = ck(id); });
    var statin = $('lx-statin').value;

    var nonhdl = (isNum(tc) && isNum(hdl)) ? tc - hdl : NaN;
    var ratio = (isNum(tc) && isNum(hdl) && hdl > 0) ? tc / hdl : NaN;
    $('lx-calcLine').textContent = 'non-HDL-C：' + rxFmt(nonhdl) + '　TC/HDL-C：' + rxFmt(ratio);

    var ageRF = isNum(age) && s && (s === 'M' ? age >= 45 : age >= 55);
    var hdlLow = isNum(hdl) && s && (s === 'M' ? hdl < 40 : hdl < 50);
    var metsItems = [isNum(waist) && s && (s === 'M' ? waist >= 90 : waist >= 80), h.bpHigh || h.htn, h.fgHigh || h.dm, (isNum(tg) && tg >= 150) || h.tgMed, hdlLow];
    var metsN = metsItems.filter(Boolean).length, mets = metsN >= 3;
    var rf = [['高血壓', h.htn], ['年齡', ageRF], ['家族史', h.fhx], ['HDL-C 偏低', hdlLow], ['抽菸', h.smoke], ['代謝症候群（' + metsN + '/5）', mets]];
    var rfN = rf.filter(function(r){ return r[1]; }).length;
    $('lx-rfChips').innerHTML = '<span class="rx-hint" style="margin:0">表一計入：</span>' +
      rf.map(function(r){ return '<span class="chip' + (r[1] ? ' on' : '') + '">' + esc(r[0]) + '</span>'; }).join('') +
      '<span class="chip-count">共 ' + rfN + ' 項</span>';

    var cad = h.acs || h.mi1y || h.mi2 || h.mvd || h.revasc || h.cadPlaque;
    var pad = h.padPlaque || h.padSym;
    var why = [], lv;
    if (cad && (h.mi1y || h.mi2 || h.mvd || (h.acs && h.dm) || pad || h.carotid)) {
      lv = 'xh';
      why.push('冠狀動脈疾病合併：' + [h.mi1y && '一年內 MI', h.mi2 && '≥2 次 MI', h.mvd && '多支阻塞', (h.acs && h.dm) && 'ACS 合併糖尿病', pad && '周邊動脈疾病', h.carotid && '頸動脈狹窄'].filter(Boolean).join('、'));
    } else if (pad && (cad || h.carotid)) {
      lv = 'xh'; why.push('周邊動脈疾病合併' + (cad ? '冠狀動脈疾病' : '頸動脈狹窄'));
    } else if (h.acs || h.mi1y || h.mi2 || h.revasc || h.stroke || h.padSym || h.cadPlaque || h.carotid || h.padPlaque || h.mvd) {
      lv = 'vh';
      why.push([(h.acs || h.mi1y || h.mi2) && 'ACS 病史', h.revasc && '血管再通術', h.stroke && '缺血性中風／TIA', h.padSym && '周邊動脈疾病', (h.cadPlaque || h.carotid || h.padPlaque || h.mvd) && '影像 ≥50% 狹窄'].filter(Boolean).join('、'));
    } else if (h.dm || h.ckd || (isNum(ldl) && ldl >= 190) || h.cac) {
      lv = 'h';
      why.push([h.dm && '糖尿病', h.ckd && '慢性腎臟病', (isNum(ldl) && ldl >= 190) && 'LDL-C ≥190', h.cac && 'CAC ≥400'].filter(Boolean).join('、'));
    } else if (rfN >= 2) { lv = 'm'; why.push('心血管風險因子 ' + rfN + ' 項'); }
    else if (rfN === 1) { lv = 'l'; why.push('心血管風險因子 1 項'); }
    else { lv = 'z'; why.push('無心血管風險因子'); }
    var LV = {
      xh: ['極高風險', 55, '< 55（non-HDL-C < 85）', false], vh: ['非常高風險', 70, '< 70（non-HDL-C < 100）', false],
      h: ['高風險', 100, '< 100（non-HDL-C < 130）', false], m: ['中風險', 115, '< 115（non-HDL-C < 145）', true],
      l: ['低風險', 130, '< 130（non-HDL-C < 160）', true], z: ['0 項心血管風險因子', 160, '< 160', true]
    };
    var lvInfo = LV[lv], lvName = lvInfo[0], start = lvInfo[1], goal = lvInfo[2], needLS = lvInfo[3];

    var t1, t1txt;
    if (!isNum(ldl)) { t1 = 'na'; t1txt = '請輸入 LDL-C。'; }
    else if (ldl < start) { t1 = 'no'; t1txt = 'LDL-C ' + rxFmt(ldl) + '，未達起始值 ≥ ' + start + '。'; }
    else if (needLS && !h.life3) { t1 = 'wait'; t1txt = '先生活型態調整 3–6 個月並處置風險因子；屆時 LDL-C 仍 ≥ ' + start + '，給予中強度 statin。'; }
    else { t1 = 'yes'; t1txt = needLS ? ('LDL-C ' + rxFmt(ldl) + ' ≥ ' + start + '，可給予中強度 statin。') : ('LDL-C ' + rxFmt(ldl) + ' ≥ ' + start + '，可給予中至高強度 statin。'); }
    var fu1 = needLS ? '生活型態調整 3–6 個月後驗血脂；中強度 statin 6–8 週後追蹤；達標後每 6–12 個月追蹤。' : '起始治療 6–8 週驗血脂；達標後每 6 個月追蹤；調整用藥後 1–3 個月內再驗。';

    var oCAD = h.acs || h.mi1y || h.mi2 || h.revasc;
    var oCVD = h.cadPlaque || h.mvd || h.stroke || h.carotid;
    var oAge = isNum(age) && s && (s === 'M' ? age >= 45 : (age >= 55 || h.meno));
    var oRF = [h.htn, oAge, h.fhx, isNum(hdl) && hdl < 40, h.smoke].filter(Boolean).length;
    var row;
    if (oCAD) row = { n:'ACS 病史或曾 PCI／CABG', ldl:70, tc:null, ls:false, goal:'LDL-C < 70' };
    else if (oCVD || h.dm) row = { n:'心血管疾病或糖尿病', ldl:100, tc:160, ls:false, goal:'TC < 160 或 LDL-C < 100' };
    else if (oRF >= 2) row = { n:'危險因子 ' + oRF + ' 項', ldl:130, tc:200, ls:true, goal:'TC < 200 或 LDL-C < 130' };
    else if (oRF === 1) row = { n:'危險因子 1 項', ldl:160, tc:240, ls:true, goal:'TC < 240 或 LDL-C < 160' };
    else row = { n:'危險因子 0 項', ldl:190, tc:null, ls:true, goal:'LDL-C < 190' };
    var t2, t2txt;
    var hitL = isNum(ldl) && ldl >= row.ldl, hitT = row.tc !== null && isNum(tc) && tc >= row.tc;
    var t2cond = row.tc !== null ? ('TC ≥ ' + row.tc + ' 或 LDL-C ≥ ' + row.ldl) : ('LDL-C ≥ ' + row.ldl);
    if (!isNum(ldl) && !isNum(tc)) { t2 = 'na'; t2txt = '請輸入 LDL-C 或 TC。'; }
    else if (!(hitL || hitT)) { t2 = 'no'; t2txt = '未達起始值（' + t2cond + '）。'; }
    else if (row.ls && !h.life3) { t2 = 'wait'; t2txt = '符合數值（' + t2cond + '），但給藥前需 3–6 個月非藥物治療。'; }
    else { t2 = 'yes'; t2txt = '符合（' + t2cond + '）' + (hitT && !hitL ? '，以 TC 達標' : '') + '。'; }

    var ok1 = t1 === 'yes', ok2 = t2 === 'yes';
    var brandNote;
    if (ok1 && ok2) brandNote = '表一、表二品項皆可給付。';
    else if (ok1) brandNote = '只能開<b>表一（新制）</b>品項；表二列表品項不符合。';
    else if (ok2) brandNote = '只能開<b>表二（舊制）</b>品項（以 TC 或舊分級達標）。';
    else brandNote = '目前兩表皆未符合。';

    var curGoal = start, notAtGoal = isNum(ldl) && ldl >= curGoal;
    var eze, ezeTxt;
    if (h.intol) { eze = 'yes'; ezeTxt = 'statin 無法耐受：可用 ezetimibe（限原發性高膽固醇血症、HoFH、植物脂醇血症）。'; }
    else if (statin === 'none') { eze = 'no'; ezeTxt = '需 statin 單一治療 6–8 週未達標，才可合併 ezetimibe 或使用 ezetimibe／statin 複方。'; }
    else if (!notAtGoal) { eze = 'no'; ezeTxt = isNum(ldl) ? ('LDL-C 已達目標（' + goal + '），不需加藥。') : '請輸入目前 LDL-C。'; }
    else if (statin === '6w') { eze = 'part'; ezeTxt = 'statin 6–8 週未達標：一般 ezetimibe 單方及複方（如 Ezetrol、Vytorin、Atozet、Tonvasca）可用；Ezetity、Ezzicad、Ezta 10、Ezetimibe Sandoz 及 Cretrol、Agitin、Sacure、Ezta-SM、Zoliton、Zovastin、Livazebe HD 仍需滿 3 個月。'; }
    else { eze = 'yes'; ezeTxt = 'statin ≥3 個月未達標：ezetimibe 單方與複方皆可合併。'; }

    var pc, pcTxt;
    if (!h.event1y) { pc = 'na'; pcTxt = '限一年內重大心血管事件（MI、血管再通術、動脈硬化缺血性中風）。'; }
    else if (!h.pcskPre) { pc = 'no'; pcTxt = '需先高強度（如 rosuvastatin 20 mg、atorvastatin 40 mg 以上）或最大耐受 statin ≥3 個月，再合併 ezetimibe 10 mg ≥3 個月。'; }
    else if (!isNum(ldl)) { pc = 'na'; pcTxt = '請輸入 LDL-C。'; }
    else if (ldl > 100) { pc = 'yes'; pcTxt = 'LDL-C ' + rxFmt(ldl) + ' > 100：可申請 evolocumab 或 alirocumab，需事前審查，每次核准 12 個月。'; }
    else { pc = 'no'; pcTxt = 'LDL-C ' + rxFmt(ldl) + ' 未高於 100。'; }

    var cvdTG = oCAD || oCVD;
    var tgCond = isNum(tg) && tg >= 200 && ((isNum(ratio) && ratio > 5) || (isNum(hdl) && hdl < 40));
    var tgs, tgTxt, tgGoal = 'TG < 200';
    if (!isNum(tg)) { tgs = 'na'; tgTxt = '請輸入 TG。'; }
    else if (cvdTG || h.dm) {
      if (tgCond) { tgs = 'yes'; tgTxt = '心血管疾病或糖尿病，TG ' + rxFmt(tg) + ' ≥200 且（TC/HDL-C >5 或 HDL-C <40）：可與非藥物治療並行。'; }
      else if (tg >= 500) { tgs = 'part'; tgTxt = 'TG ≥500，但 TG ≥500 條款列於「無心血管疾病」；有心血管疾病或糖尿病者須符合 TC/HDL-C >5 或 HDL-C <40，申報前請確認。'; }
      else { tgs = 'no'; tgTxt = tg >= 200 ? 'TG ≥200，但 TC/HDL-C 未 >5 且 HDL-C 未 <40。' : ('TG ' + rxFmt(tg) + ' 未達 200。'); }
    } else {
      if (tg >= 500) { tgs = 'yes'; tgTxt = 'TG ' + rxFmt(tg) + ' ≥500：可與非藥物治療並行。'; tgGoal = 'TG < 500'; }
      else if (tgCond) { tgs = h.life3 ? 'yes' : 'wait'; tgTxt = 'TG ≥200 且（TC/HDL-C >5 或 HDL-C <40）：給藥前需 3–6 個月非藥物治療' + (h.life3 ? '，已完成' : '') + '。'; }
      else { tgs = 'no'; tgTxt = tg >= 200 ? 'TG ≥200，但 TC/HDL-C 未 >5 且 HDL-C 未 <40。' : ('TG ' + rxFmt(tg) + ' 未達 200。'); }
    }

    var cards = [];
    var sexWarn = (!s || !isNum(age)) ? '請先填性別與年齡，年齡與 HDL-C 風險因子才會計入。' : '';
    cards.push(
      '<div class="rx-card lead"><div class="rx-card-head"><h4>ASCVD 風險等級（表一）</h4></div>' +
      '<div class="score" style="font-size:26px;margin:2px 0 4px">' + esc(lvName) + '</div>' +
      '<div class="rx-why">' + esc(why.join('；')) + (sexWarn ? '<br><span style="color:var(--amber)">' + esc(sexWarn) + '</span>' : '') + '</div>' +
      '<p style="margin-top:8px;font-size:13px;color:var(--muted)">起始 LDL-C ≥ ' + start + ' mg/dL　｜　目標 LDL-C ' + goal + '　｜　' + (needLS ? '給藥前需 3–6 個月生活型態改變' : '與藥物治療並行') + '</p></div>'
    );
    cards.push(rxCard(t1, '表一（新制品項）', t1txt, '追蹤：' + fu1));
    cards.push(rxCard(t2, '表二（舊制品項）', '分級：' + esc(row.n) + '。' + esc(t2txt),
      '目標 ' + row.goal + '。第一年每 3–6 個月抽血，第二年起至少每 6–12 個月。' + (h.smoke ? '因吸菸而符合者，未戒菸要求用藥應自費。' : '')));
    cards.push(
      '<div class="rx-card"><div class="rx-card-head"><h4>可開立 statin 品項</h4></div><p>' + brandNote + '</p>' +
      '<p class="rx-why" style="margin-top:8px">表一（新制）</p>' + rxDrugChips(LX_NEW, ok1) +
      '<p class="rx-why" style="margin-top:8px">表二（舊制）</p>' + rxDrugChips(LX_OLD, ok2) +
      '<div class="rx-why">' + (ok1 && !needLS ? '強度參考：高強度 atorvastatin 40–80、rosuvastatin 20–40 mg；中強度 atorvastatin 10–20、rosuvastatin 5–10、pitavastatin 2–4 mg。' : '中強度參考：atorvastatin 10–20、rosuvastatin 5–10、pitavastatin 2–4、simvastatin 20–40 mg。') + '</div></div>'
    );
    cards.push(rxCard(eze, 'Ezetimibe 與複方', ezeTxt, '複方不得與 gemfibrozil 併用。'));
    cards.push(rxCard(pc, 'PCSK9 抑制劑', pcTxt));
    cards.push(rxCard(tgs, '三酸甘油酯藥物', tgTxt,
      '目標 ' + tgGoal + '。藥物如 fenofibrate、gemfibrozil；gemfibrozil 避免與 statin 併用。第一年每 3–6 個月抽血，注意肝功能與橫紋肌溶解。'));

    $('lipidrx-result').innerHTML = cards.join('');

    var hasResult = !!(s && isNum(age) && isNum(ldl));
    if (hasResult) {
      COPY.lipidrx = '降血脂給付判定：' + lvName + '｜LDL-C ' + rxFmt(ldl) + '（目標 ' + goal + '）｜表一 ' + RX_LABEL[t1] + '、表二 ' + RX_LABEL[t2];
    }
    lipidrxShow(hasResult);
  }

  bind(['lx-sex','lx-age','lx-ldl','lx-tc','lx-hdl','lx-tg','lx-waist','lx-statin'].concat(LX_FLAGS), calcLipidRx);
  calcLipidRx();

  RESETTERS.lipidrx = function(){
    var panel = $('panel-lipidrx');
    panel.querySelectorAll('input[type=number]').forEach(function(el){ el.value = ''; el.classList.remove('invalid'); });
    panel.querySelectorAll('input[type=checkbox]').forEach(function(el){ el.checked = false; });
    panel.querySelectorAll('select').forEach(function(el){ el.selectedIndex = 0; });
    panel.querySelectorAll('.field-err').forEach(function(el){ el.textContent = ''; el.hidden = true; });
    calcLipidRx();
    var first = panel.querySelector('select, input');
    if (first) first.focus();
  };

  /* ======================================================
     B 型肝炎用藥給付
     ====================================================== */
  var HB_RESTRICT = 'Fofnir、Hepwin、Sebivo、Ricovir、Hepuri、Virclean、Teno B、Tenof、Viread、Livepro、Lamidine、Hepar-Pro、Hepato-Ease、Barazer、Becavir';

  function hbvrxShow(ok){
    var btn = CD.querySelector('[data-copy="hbvrx"]');
    if (btn) { btn.disabled = !ok; btn.classList.remove('done'); btn.textContent = '複製結果'; }
    if (!ok) COPY.hbvrx = '';
    renderSummary();
    saveState();
  }

  function calcHbvRx(){
    var age = num('hb-age'), uln = num('hb-uln'), a1 = num('hb-alt1'), a2 = num('hb-alt2'), ast = num('hb-ast'), plt = num('hb-plt'), bil = num('hb-bil'), pt = num('hb-pt');
    var dnaRaw = num('hb-dna');
    var und = ck('hb-dnaUnd');
    var dna = und ? 0 : dnaRaw;
    var dnaDet = !und && isNum(dnaRaw) && dnaRaw > 0;
    var bx = Number($('hb-bx').value || 0);
    var x1 = (isNum(a1) && isNum(uln) && uln > 0) ? a1 / uln : NaN;
    var x2 = (isNum(a2) && isNum(uln) && uln > 0) ? a2 / uln : NaN;
    $('hb-altLine').textContent = 'ALT 倍數：最近 ' + (isNum(x1) ? x1.toFixed(2) + ' X' : '－') + '　另一次 ' + (isNum(x2) ? x2.toFixed(2) + ' X' : '－');

    var fs = num('hb-fs'), arfi = num('hb-arfi');
    var fib4 = (isNum(age) && isNum(ast) && isNum(plt) && isNum(a1) && plt > 0 && a1 > 0) ? (age * ast) / (plt * Math.sqrt(a1)) : NaN;
    var F4 = bx >= 4 || (isNum(fs) && fs >= 12) || (isNum(arfi) && arfi >= 1.98);
    var F3 = F4 || bx >= 3 || (isNum(fs) && fs >= 9.5) || (isNum(arfi) && arfi >= 1.81) || (isNum(fib4) && fib4 >= 3.25);
    var F2 = F3 || bx >= 2 || (isNum(fs) && fs >= 8) || (isNum(arfi) && arfi >= 1.5) || (isNum(fib4) && fib4 >= 2.1);
    var fLabel = F4 ? '≥F4（肝硬化等級）' : F3 ? '≥F3' : F2 ? '≥F2' : '未達 F2';
    $('hb-fibLine').textContent = 'FIB-4：' + (isNum(fib4) ? fib4.toFixed(2) : '－（需年齡、AST、ALT、血小板）') + '　判定纖維化 ' + fLabel;

    var hbsag = ck('hb-hbsag'), six = ck('hb-hbsag6'), e = $('hb-eag').value;
    var items = [];
    function add(st, title, detail){ items.push({ st:st, title:title, detail:detail }); }

    var decomp = (isNum(bil) && bil >= 2) || (isNum(pt) && pt >= 3);
    if (hbsag && decomp) add('yes', '代償不全（第 1 項）',
      [isNum(bil) && bil >= 2 && '總膽紅素 ≥2.0', isNum(pt) && pt >= 3 && 'PT 延長 ≥3 秒'].filter(Boolean).join('、') +
      '。藥物：lamivudine 100 mg、entecavir 1.0 mg、telbivudine、TDF、TAF。療程：' +
      (e === 'P' ? '治療至 e 抗原轉陰再 12 個月' : e === 'N' ? '至少 2 年，DNA 連續 3 次（間隔 6 個月）測不到停藥，每次最多 36 個月' : '依 HBeAg 決定') + '。');

    var lcDx = F4 || (ck('hb-usLc') && (ck('hb-usVar') || ck('hb-usSpl') || (isNum(plt) && plt < 120))) || ck('hb-ctLc');
    if (hbsag && lcDx && dnaDet) add('yes', '肝硬化，可長期使用（第 2(5) 項）', 'HBsAg（＋）、可測到 HBV DNA，且符合肝硬化診斷（切片 F4、超音波條件、肝硬度 Fibroscan ≥12 或 ARFI ≥1.98，或 CT／MRI）。');
    else if (hbsag && lcDx && !dnaDet) add('no', '肝硬化長期使用（第 2(5) 項）', '肝硬化成立，但需可檢驗到血清 HBV DNA。');
    else if (hbsag && ck('hb-usLc') && !lcDx) add('no', '肝硬化長期使用（第 2(5) 項）', '超音波肝硬化需合併靜脈曲張、脾腫大或血小板 <120,000/µL。');

    if (hbsag && e === 'P') {
      if (!six) add('na', 'HBeAg 陽性（第 3 項）', '需 HBsAg（＋）超過 6 個月（或 IgM anti-HBc 陰性）。');
      else if (isNum(x1) && x1 >= 5) add('yes', 'HBeAg 陽性：ALT ≥5X（第 3(1) 項）', '療程：治療至 e 抗原轉陰，再給付最多 12 個月。');
      else if (isNum(x1) && x1 >= 2 && dna >= 20000) add('yes', 'HBeAg 陽性：2X ≤ALT <5X，DNA ≥20,000（第 3(2) 項）', '療程：治療至 e 抗原轉陰，再給付最多 12 個月。');
      else if (F3 && x1 > 1 && x2 > 1 && ck('hb-gap3') && dna >= 20000) add('yes', 'HBeAg 陽性：纖維化 ≥F3（第 3(3) 項）', '半年內兩次 ALT >ULN（間隔 >3 個月）、DNA ≥20,000。療程：至 e 抗原轉陰再 12 個月。');
      else add('no', 'HBeAg 陽性（第 3 項）', (function(){
        var r = [];
        if (!isNum(x1)) r.push('缺 ALT');
        else if (x1 < 2) r.push('ALT ' + x1.toFixed(2) + 'X <2X');
        else if (dna < 20000 || !isNum(dna)) r.push('DNA 未達 20,000');
        if (isNum(x1) && x1 > 1 && dna >= 20000 && !F3) r.push('纖維化未達 F3');
        if (F3 && !(x2 > 1 && ck('hb-gap3'))) r.push('F3 條款需半年內兩次 ALT >ULN 且間隔 >3 個月');
        return r.join('；') + '。';
      })());
    }

    var restricted = false;
    if (hbsag && e === 'N') {
      var dur = '療程至少 2 年，DNA 連續 3 次（間隔 6 個月）測不到停藥，每次最多給付 36 個月。';
      var twice2 = isNum(x2) && x2 >= 2 && ck('hb-gap3');
      if (!six) add('na', 'HBeAg 陰性（第 4 項）', '需 HBsAg（＋）超過 6 個月（或 IgM anti-HBc 陰性）。');
      else if (isNum(x1) && x1 >= 2 && dna >= 2000) {
        if (twice2) add('yes', 'HBeAg 陰性：ALT ≥2X，DNA ≥2,000（第 4(1) 項）', '半年內兩次 ALT ≥2X，所有品項皆可。' + dur);
        else { restricted = true; add('part', 'HBeAg 陰性：ALT ≥2X 一次，DNA ≥2,000（第 4(1) 項）', '只有一次 ALT ≥2X：' + HB_RESTRICT + ' 不可用（需半年內兩次、間隔 3 個月）。可用 Baraclude 等未列名 entecavir、Vemlidy（TAF）。' + dur); }
      } else if (F2 && x1 > 1 && x2 > 1 && ck('hb-gap3') && dna >= 20000) {
        if (F3) add('yes', 'HBeAg 陰性：纖維化 ≥F3（第 4(2) 項）', '半年內兩次 ALT >ULN、DNA ≥20,000，所有品項皆可。' + dur);
        else { restricted = true; add('part', 'HBeAg 陰性：纖維化 F2（第 4(2) 項）', '纖維化 ≥F2 未達 F3：' + HB_RESTRICT + ' 不可用（需 ≥F3）。可用 Baraclude 等未列名 entecavir、Vemlidy（TAF）。' + dur); }
      } else add('no', 'HBeAg 陰性（第 4 項）', (function(){
        var r = [];
        if (!isNum(x1)) r.push('缺 ALT');
        else if (x1 < 2 && !(F2 && x1 > 1)) r.push('ALT ' + x1.toFixed(2) + 'X');
        if (isNum(x1) && x1 >= 2 && !(dna >= 2000)) r.push('DNA 未達 2,000');
        if (isNum(x1) && x1 > 1 && x1 < 2) {
          if (!F2) r.push('纖維化未達 F2');
          if (!(x2 > 1 && ck('hb-gap3'))) r.push('需半年內兩次 ALT >ULN 且間隔 >3 個月');
          if (!(dna >= 20000)) r.push('DNA 未達 20,000');
        }
        return (r.join('；') || '未符合') + '。';
      })());
    }

    if (hbsag && ck('hb-preg')) {
      if (dna >= 200000) add('yes', '懷孕（第 2(7) 項）', 'DNA ≥2×10⁵ IU/mL，懷孕滿 27 週起可用 telbivudine、TDF 或 TAF，至產後 4 週。');
      else add('no', '懷孕（第 2(7) 項）', '需 HBV DNA ≥2×10⁵ IU/mL。');
    }
    if (hbsag && ck('hb-hcc')) add(dnaDet ? 'yes' : 'no', '肝癌根除性治療後（第 2(8) 項）', dnaDet ? '可檢驗到 HBV DNA，可長期使用至肝癌復發且無法再根除。' : '需可檢驗到血清 HBV DNA。');
    if (ck('hb-immuno')) add('part', '化療或免疫抑制（第 2(9) 項）', '預防性用藥依藥物種類與 HBsAg／anti-HBc 狀態判定，請對照 10.7.3 第 2(9) 項條文。');

    var head, headSt;
    var yes = items.filter(function(i){ return i.st === 'yes'; }), part = items.filter(function(i){ return i.st === 'part'; });
    if (!hbsag) { headSt = 'na'; head = '請勾選 HBsAg（＋）'; }
    else if (items.some(function(i){ return i.title.indexOf('肝硬化，可長期') !== -1 || i.title.indexOf('代償不全') !== -1; })) { headSt = 'yes'; head = '符合，可長期或優先給付'; }
    else if (yes.length) { headSt = 'yes'; head = '符合健保給付'; }
    else if (part.length) { headSt = 'part'; head = restricted ? '符合，但品項受限' : '需確認'; }
    else if (!e && !items.length) { headSt = 'na'; head = '請選擇 HBeAg'; }
    else { headSt = 'no'; head = '目前未符合'; }

    var drugsHtml = restricted ?
      '<div class="drugs"><span class="drug ok">Entecavir 0.5 mg<small>未列名品項，如 Baraclude</small></span><span class="drug ok">TAF 25 mg<small>Vemlidy</small></span><span class="drug off">TDF 300 mg<small>Viread 等列名品項</small></span></div>' :
      '<div class="drugs"><span class="drug ' + (headSt === 'yes' ? 'ok' : '') + '">Entecavir 0.5 mg<small>代償不全 1.0 mg</small></span><span class="drug ' + (headSt === 'yes' ? 'ok' : '') + '">TDF 300 mg<small>Viread 等</small></span><span class="drug ' + (headSt === 'yes' ? 'ok' : '') + '">TAF 25 mg<small>Vemlidy</small></span></div>';

    var cards = [];
    cards.push(
      '<div class="rx-card lead"><div class="rx-card-head"><h4>判定結果</h4>' + rxBadge(headSt, head) + '</div>' +
      '<div class="score" style="font-size:24px;margin:2px 0 6px;color:var(--teal-dark)">' + esc(head) + '</div>' +
      '<p style="font-size:13px;color:var(--muted)">HBeAg ' + (e === 'P' ? '陽性' : e === 'N' ? '陰性' : '未選') +
      '　｜　ALT ' + (isNum(x1) ? x1.toFixed(2) + ' X ULN' : '－') + (isNum(x2) ? '／' + x2.toFixed(2) + ' X' : '') +
      '　｜　HBV DNA ' + (und ? '測不到' : (isNum(dnaRaw) ? rxFmt(dnaRaw) + ' IU/mL' : '－')) +
      '　｜　纖維化 ' + fLabel + (isNum(fib4) ? '（FIB-4 ' + fib4.toFixed(2) + '）' : '') + '</p></div>'
    );
    cards.push(
      '<div class="rx-card"><div class="rx-card-head"><h4>逐條比對</h4></div>' +
      (items.length ? items.map(function(i){ return rxRule(i.st, i.title, i.detail); }).join('') : '<p class="rx-why">輸入資料後顯示符合的條款。</p>') + '</div>'
    );
    cards.push(
      '<div class="rx-card"><div class="rx-card-head"><h4>可用藥物</h4></div>' + drugsHtml +
      '<div class="rx-why">基層院所須有消化系內科專任專科醫師開立。纖維化門檻：F2＝Fibroscan ≥8 kPa、ARFI ≥1.5、FIB-4 ≥2.1；F3＝≥9.5、≥1.81、≥3.25；F4＝≥12、≥1.98。</div></div>'
    );

    $('hbvrx-result').innerHTML = cards.join('');

    if (hbsag) {
      COPY.hbvrx = 'B 肝用藥給付判定：' + head + '｜HBeAg ' + (e === 'P' ? '陽性' : e === 'N' ? '陰性' : '未選') + '｜纖維化 ' + fLabel;
    }
    hbvrxShow(!!hbsag);
  }

  var HB_FIELDS = ['hb-age','hb-uln','hb-alt1','hb-alt2','hb-ast','hb-plt','hb-dna','hb-fs','hb-arfi','hb-bx','hb-bil','hb-pt','hb-eag',
    'hb-hbsag','hb-hbsag6','hb-gap3','hb-dnaUnd','hb-usLc','hb-usVar','hb-usSpl','hb-ctLc','hb-preg','hb-hcc','hb-immuno'];
  bind(HB_FIELDS, calcHbvRx);
  calcHbvRx();

  RESETTERS.hbvrx = function(){
    var panel = $('panel-hbvrx');
    panel.querySelectorAll('input[type=number]').forEach(function(el){ el.value = ''; el.classList.remove('invalid'); });
    panel.querySelectorAll('input[type=text]').forEach(function(el){ el.value = ''; el.classList.remove('invalid'); });
    panel.querySelectorAll('input[type=checkbox]').forEach(function(el){ el.checked = false; });
    panel.querySelectorAll('select').forEach(function(el){ el.selectedIndex = 0; });
    panel.querySelectorAll('.field-err').forEach(function(el){ el.textContent = ''; el.hidden = true; });
    $('hb-uln').value = '40';
    calcHbvRx();
    var first = panel.querySelector('select, input');
    if (first) first.focus();
  };

  /* ======================================================
     用藥給付判定：檢驗截圖自動帶入
     以 Tesseract.js 在本機瀏覽器辨識文字，影像不會送出；
     辨識元件第一次使用時從 CDN 下載（約 5 MB），之後由瀏覽器快取。
     ====================================================== */
  var OCR_LIB = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
  var ocrWorker = null, ocrBusy = false;

  function ocrLoadLib(){
    if (window.Tesseract) return Promise.resolve();
    return new Promise(function(ok, fail){
      var s = document.createElement('script');
      s.src = OCR_LIB; s.onload = ok; s.onerror = function(){ fail(new Error('lib')); };
      document.head.appendChild(s);
    });
  }
  function ocrGetWorker(){
    if (ocrWorker) return ocrWorker;
    ocrWorker = ocrLoadLib().then(function(){
      return Tesseract.createWorker(['eng', 'chi_tra'], 1, {
        logger: function(m){ if (ocrProgress) ocrProgress(m); }
      });
    }).catch(function(err){ ocrWorker = null; throw err; });
    return ocrWorker;
  }
  var ocrProgress = null;

  // 截圖字小時先放大並轉灰階。中文小字在不同放大倍率下時好時壞，所以準備兩種倍率各辨識一次再合併
  function ocrPrepare(file){
    return new Promise(function(ok, fail){
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function(){
        var base = img.naturalWidth;
        var ks = [Math.max(1, Math.min(3, 2000 / base)), Math.max(1.3, Math.min(4, 2800 / base))];
        URL.revokeObjectURL(url);
        ok(ks.map(function(k){
          var c = document.createElement('canvas');
          c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
          var g = c.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.filter = 'grayscale(1)';
          g.drawImage(img, 0, 0, c.width, c.height);
          return c;
        }));
      };
      img.onerror = function(){ URL.revokeObjectURL(url); fail(new Error('img')); };
      img.src = url;
    });
  }

  // 全形轉半形、數字中的千分位去掉、常見複合名稱先合併，避免 HDL Cholesterol 被當成總膽固醇
  function ocrNormalize(text){
    return text
      .replace(/[！-～]/g, function(c){ return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/　/g, ' ')
      .replace(/([一-鿿])\s+(?=[一-鿿])/g, '$1')   // 中文辨識常在字與字之間插空白
      .replace(/(\d),(\d{3})(?!\d)/g, '$1$2')
      .replace(/non[-\s]?HDL[-\s]?(?:C(?:holesterol)?)?/ig, ' NONHDL ')
      .replace(/(?:T[-.\s]?CHO\w*|Chol\w*|TC)\s*\/\s*HDL\w*/ig, ' RATIO ')
      .replace(/LDL\s*\/\s*HDL\w*/ig, ' RATIO ')
      .replace(/\b(HDL|LDL)[-\s]*C(?:hol(?:esterol)?)?\b/ig, ' $1 ')
      .replace(/\bALT\s*[\/(]\s*S?GPT\s*\)?|\bS?GPT\s*[\/(]\s*ALT\s*\)?/ig, ' ALT ')
      .replace(/\bAST\s*[\/(]\s*S?GOT\s*\)?|\bS?GOT\s*[\/(]\s*AST\s*\)?/ig, ' AST ');
  }

  var OCR_NUM = /(\d+(?:\.\d+)?)/;
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
    bil: { re: /T[-.\s]?BIL\w*|Total\s*Bil\w*|Bilirubin\s*[,(]?\s*total|總膽紅素/ig, lo: 0.1, hi: 40 }
  };

  function ocrPick(lines, keys){
    var out = {};
    function accept(k, v){
      var spec = OCR_KEYS[k];
      if (spec.plt && v > 2000) v = v / 1000;   // 以 /µL 表示的血小板換算成 ×10³/µL
      if (v >= spec.lo && v <= spec.hi && !(k in out)) out[k] = v;
    }
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
        if (m) { accept(h.k, parseFloat(m[1])); got++; }
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

  function ocrSet(id, v){
    var el = $(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
    el.classList.add('ocr-filled');
    var flag = el.closest('.flag'); if (flag) flag.classList.add('ocr-filled');
    el.dispatchEvent(new Event(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', { bubbles: true }));
  }
  function ocrClearMarks(panel){
    panel.querySelectorAll('.ocr-filled').forEach(function(el){ el.classList.remove('ocr-filled'); });
  }

  // 依工具把辨識結果填入欄位，回傳已帶入與未辨識的清單
  var OCR_APPLY = {
    lipidrx: function(text, lines){
      var got = [], miss = [];
      var sex = ocrSex(text), age = ocrAge(text);
      var v = ocrPick(lines, ['tc', 'tg', 'hdl', 'ldl', 'waist']);
      if (sex) { ocrSet('lx-sex', sex); got.push('性別 ' + (sex === 'M' ? '男' : '女')); }
      if (isNum(age)) { ocrSet('lx-age', age); got.push('年齡 ' + age); } else miss.push('年齡');
      [['tc', 'lx-tc', 'Cholesterol'], ['tg', 'lx-tg', 'TG'], ['hdl', 'lx-hdl', 'HDL'], ['ldl', 'lx-ldl', 'LDL']].forEach(function(f){
        if (f[0] in v) { ocrSet(f[1], v[f[0]]); got.push(f[2] + ' ' + v[f[0]]); } else miss.push(f[2]);
      });
      if ('waist' in v) { ocrSet('lx-waist', v.waist); got.push('腰圍 ' + v.waist); }
      return { got: got, miss: miss };
    },
    hbvrx: function(text, lines){
      var got = [], miss = [];
      var age = ocrAge(text);
      var v = ocrPick(lines, ['alt', 'ast', 'plt', 'bil']);
      if (isNum(age)) { ocrSet('hb-age', age); got.push('年齡 ' + age); } else miss.push('年齡');
      var sag = ocrAntigen(lines, /HBs\s*Ag/i), eag = ocrAntigen(lines, /HBe\s*Ag/i);
      if (sag === 'P') { ocrSet('hb-hbsag', true); got.push('HBsAg（＋）'); }
      else if (sag === 'N') { ocrSet('hb-hbsag', false); got.push('HBsAg（－）'); }
      if (eag) { ocrSet('hb-eag', eag); got.push('HBeAg ' + (eag === 'P' ? '陽性' : '陰性')); } else miss.push('HBeAg');
      [['alt', 'hb-alt1', 'ALT'], ['ast', 'hb-ast', 'AST'], ['plt', 'hb-plt', '血小板']].forEach(function(f){
        if (f[0] in v) { ocrSet(f[1], Math.round(v[f[0]] * 10) / 10); got.push(f[2] + ' ' + Math.round(v[f[0]] * 10) / 10); } else miss.push(f[2]);
      });
      var dna = ocrDna(lines);
      if (dna && dna.und) { $('hb-dna').value = ''; ocrSet('hb-dnaUnd', true); got.push('HBV DNA ' + dna.note); }
      else if (dna) { ocrSet('hb-dnaUnd', false); ocrSet('hb-dna', dna.v); got.push('HBV DNA ' + rxFmt(dna.v) + (dna.note ? '（' + dna.note + '）' : '')); }
      else miss.push('HBV DNA');
      if ('bil' in v) { ocrSet('hb-bil', v.bil); got.push('總膽紅素 ' + v.bil); }
      var fs = ocrFibroscan(text);
      if (isNum(fs)) { ocrSet('hb-fs', fs); got.push('Fibroscan ' + fs); }
      return { got: got, miss: miss };
    }
  };

  function ocrRun(tool, file){
    var box = CD.querySelector('.rx-ocr[data-ocr="' + tool + '"]');
    if (!box || !file || !/^image\//.test(file.type) || ocrBusy) return;
    var msg = box.querySelector('.rx-ocr-msg');
    function say(cls, html){ box.className = 'rx-ocr ' + cls; msg.innerHTML = html; }
    ocrBusy = true;
    var pass = 0;
    say('busy', '準備辨識元件中…（第一次使用需下載約 5 MB）');
    ocrProgress = function(m){
      if (m.status === 'recognizing text') say('busy', '辨識中… ' + Math.round((pass + m.progress) / 2 * 100) + '%');
    };
    Promise.all([ocrGetWorker(), ocrPrepare(file)]).then(function(r){
      var worker = r[0], imgs = r[1], texts = [];
      say('busy', '辨識中…');
      // 依序辨識（同一個 worker 不能並行），先找到的值優先
      return imgs.reduce(function(p, c){
        return p.then(function(){ pass = texts.length; return worker.recognize(c); }).then(function(res){ texts.push(res.data.text || ''); });
      }, Promise.resolve()).then(function(){ return texts.join('\n'); });
    }).then(function(raw){
      var text = ocrNormalize(raw);
      var lines = text.split(/\n+/).map(function(l){ return l.trim(); }).filter(Boolean);
      var panel = $('panel-' + tool);
      ocrClearMarks(panel);
      var out = OCR_APPLY[tool](text, lines);
      if (!out.got.length) say('fail', '沒有辨識到可帶入的數值。請確認截圖清楚、包含項目名稱，或直接手動輸入。');
      else say('done', '已帶入（黃底欄位）：<b>' + esc(out.got.join('、')) + '</b>' +
        (out.miss.length ? '。未辨識：' + esc(out.miss.join('、')) : '') + '。請核對後再判定。');
    }).catch(function(err){
      say('fail', err && err.message === 'lib' ?
        '辨識元件載入失敗：需要連上網路下載（第一次約 5 MB），請確認網路後再試。' :
        '圖片讀取或辨識失敗，請換一張截圖再試。');
    }).then(function(){ ocrBusy = false; ocrProgress = null; });
  }

  CD.querySelectorAll('.rx-ocr').forEach(function(box){
    var tool = box.dataset.ocr, panel = $('panel-' + tool);
    var input = panel.querySelector('input[type=file]');
    panel.querySelector('[data-ocr-pick]').addEventListener('click', function(){ input.click(); });
    input.addEventListener('change', function(){
      var f = input.files && input.files[0];
      input.value = '';   // 清掉，免得 saveState 存到檔名
      ocrRun(tool, f);
    });
    // 整個面板都可以拖放圖檔
    panel.addEventListener('dragover', function(e){
      if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types, 'Files') !== -1) { e.preventDefault(); panel.classList.add('drag'); }
    });
    panel.addEventListener('dragleave', function(e){ if (!panel.contains(e.relatedTarget)) panel.classList.remove('drag'); });
    panel.addEventListener('drop', function(e){
      var f = e.dataTransfer && e.dataTransfer.files[0];
      panel.classList.remove('drag');
      if (!f) return;
      e.preventDefault();
      ocrRun(tool, f);
    });
    // 手動修改後就不再標示為自動帶入
    panel.addEventListener('input', function(e){ if (e.isTrusted && e.target.classList) e.target.classList.remove('ocr-filled'); });
    panel.addEventListener('change', function(e){
      if (!e.isTrusted || !e.target.classList) return;
      e.target.classList.remove('ocr-filled');
      var flag = e.target.closest('.flag'); if (flag) flag.classList.remove('ocr-filled');
    });
    var reset = panel.querySelector('[data-reset]');
    var msg = box.querySelector('.rx-ocr-msg'), msg0 = msg.innerHTML;
    if (reset) reset.addEventListener('click', function(){ ocrClearMarks(panel); box.className = 'rx-ocr'; msg.innerHTML = msg0; });
  });

  // Ctrl+V 貼上截圖：只在降血脂或 B 肝面板開啟時接手
  CD.addEventListener('paste', function(e){
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var file = null;
    for (var i = 0; i < items.length; i++) if (items[i].kind === 'file' && /^image\//.test(items[i].type)) { file = items[i].getAsFile(); break; }
    if (!file) return;
    var panel = CD.querySelector('.rx-panel.active');
    if (!panel) return;
    e.preventDefault();
    ocrRun(panel.querySelector('.rx-ocr').dataset.ocr, file);
  });

  /* ======================================================
     Bristol Stool Scale
     ====================================================== */
  var BRISTOL = {
    1:{ label:'嚴重便秘', color:'#922B21', bg:'#FBEBE9',
        interp:'Type 1：分離的硬球狀糞便，如堅果或羊糞，排出困難。',
        detail:'腸道傳輸時間過長（大於 72 小時），糞便水分被過度吸收。\n建議：每日飲水 2000 mL 以上、增加膳食纖維（蔬果、全穀）、規律運動。若持續超過兩週，建議就醫評估。' },
    2:{ label:'便秘', color:'#C0392B', bg:'#FBEBE9',
        interp:'Type 2：表面凹凸的臘腸狀糞便，排便費力。',
        detail:'腸道傳輸偏慢，糞便較乾硬。\n建議：增加纖維與水分攝取，必要時可短期使用滲透性瀉劑（如氧化鎂），並建立固定的排便時間。' },
    3:{ label:'正常偏乾', color:'#2E7D4F', bg:'#E9F5EE',
        interp:'Type 3：表面有裂縫的臘腸狀糞便，接近理想。',
        detail:'腸道功能大致正常，僅稍偏乾。\n建議：維持足夠水分與纖維攝取即可，屬於可接受的正常範圍。' },
    4:{ label:'理想型態', color:'#1A6B3A', bg:'#D9EFE1',
        interp:'Type 4：光滑柔軟的臘腸狀或蛇形糞便，最為理想。',
        detail:'腸道傳輸時間正常（約 12–48 小時），含水量適中。\n此為最佳排便型態，維持目前的飲食與生活習慣即可。' },
    5:{ label:'腸道傳輸偏快', color:'#B45A00', bg:'#FFF5E6',
        interp:'Type 5：柔軟小塊、邊緣清楚，排便容易但偏軟。',
        detail:'腸道傳輸時間稍快，或與飲食內容有關。\n建議：觀察近期飲食與壓力狀態；若合併腹痛、排便次數增加或體重下降，建議就醫評估。' },
    6:{ label:'輕度腹瀉', color:'#C0392B', bg:'#FBEBE9',
        interp:'Type 6：糊狀、邊緣不整，無法成形。',
        detail:'腸道傳輸過快或腸道受到刺激（感染、飲食、藥物）。\n建議：補充水分與電解質，避免油膩與刺激性食物。若超過 48 小時，或合併發燒、血便，請盡速就醫。' },
    7:{ label:'急性腹瀉', color:'#922B21', bg:'#FBEBE9',
        interp:'Type 7：完全液狀，無固體成分。',
        detail:'嚴重腹瀉，脫水風險高。常見原因包括急性腸胃炎、食物中毒、腸躁症發作、發炎性腸病。\n建議：積極補充口服電解質液；若合併發燒、血便、脫水症狀，或持續超過 24 小時，需立即就醫。' }
  };

  CD.querySelectorAll('.bristol-card').forEach(function(card){
    card.addEventListener('click', function(){
      var type = card.dataset.type;
      CD.querySelectorAll('.bristol-card').forEach(function(c){
        c.setAttribute('aria-pressed', c === card ? 'true' : 'false');
      });

      var d = BRISTOL[type];
      paint('bristol', d.color, d.bg);
      $('bristol-type').textContent = 'Type ' + type;
      $('bristol-type').style.color = d.color;

      var badge = $('bristol-badge');
      badge.textContent = d.label;
      badge.style.background = '#fff';
      badge.style.color = d.color;
      badge.style.border = '1.5px solid ' + d.color;

      $('bristol-interp').textContent = d.interp;
      $('bristol-detail').textContent = d.detail;

      COPY.bristol = 'Bristol Type ' + type + '（' + d.label + '）：' + d.interp;
      show('bristol', true);
    });
  });

  /* ======================================================
     自我評估模組：資料
     ====================================================== */
  function assessSpecs(){
    return [
      /* ---------- 腸胃與消化 ---------- */
      {
        id:'reflux', group:'gi', kind:'quiz', tab:'胃酸逆流', tabEn:'症狀自評',
        title:'胃酸逆流與胃黏膜受損風險', sub:'診所自訂題組，非驗證版量表',
        scoreLabel:'總分',
        intro:'依照最近的症狀作答，共 8 題。題目分為頻率、非典型症狀、警訊症狀與藥物依賴四類。',
        note:'※ 本題組由診所自行設計，參考 GerdQ 的題目方向，但未經效度驗證，分數不等同 GerdQ 分數，僅供整理症狀之用，確診需由醫師評估',
        max:20,
        qs:[
          { tag:'頻率評估', tagCls:'tag-freq', q:'過去一週內，胸口灼熱（火燒心）或胃酸湧上喉嚨的現象超過 2 天？',
            opts:['否，幾乎沒有','有，但少於 2 天','是，超過 2 天','幾乎天天發生'], scores:[0,1,2,3] },
          { tag:'頻率評估', tagCls:'tag-freq', q:'逆流症狀是否在飯後、彎腰或躺下時明顯加重？',
            opts:['否','有時','是，幾乎每次都這樣'], scores:[0,1,2] },
          { tag:'非典型症狀', tagCls:'tag-atypical', q:'是否常有查不出原因的長期慢性咳嗽、喉嚨異物感（卡卡的），或聲音沙啞？',
            opts:['否','偶爾有，以為是過敏或感冒','是，已持續超過一個月'], scores:[0,1,2] },
          { tag:'非典型症狀', tagCls:'tag-atypical', q:'是否曾有口腔異味、口水增加，或清晨起床感覺喉嚨有酸苦感？',
            opts:['否','偶爾','是，蠻常見的'], scores:[0,1,2] },
          { tag:'警訊症狀', tagCls:'tag-red', q:'吃東西時吞嚥困難、常覺得食物卡在食道？',
            opts:['否','偶爾喝水才能順下','是，吞嚥時明顯有阻礙感'], scores:[0,1,3] },
          { tag:'警訊症狀', tagCls:'tag-red', q:'常莫名其妙胃痛到睡不著，或夜間因逆流嗆咳醒來？',
            opts:['否','偶爾一兩次','是，常常發生'], scores:[0,1,3] },
          { tag:'藥物依賴', tagCls:'tag-drug', q:'是否自行購買胃藥、制酸劑服用超過一個月，且停藥就復發？',
            opts:['沒有用過','偶爾用，症狀緩解就停','是，停藥就復發，已超過一個月'], scores:[0,1,3] },
          { tag:'藥物依賴', tagCls:'tag-drug', q:'是否曾被醫師診斷為胃食道逆流，或曾接受胃鏡發現食道發炎？',
            opts:['否','不確定','是'], scores:[0,1,2] }
        ],
        grade:function(total, s){
          if (s[4] >= 3 || s[5] >= 3) return { level:'需儘速就醫', tone:'red',
            advice:'您的評估出現警訊症狀（吞嚥困難或夜間症狀），這類表現可能代表食道黏膜受損，甚至需要排除食道狹窄或巴瑞特食道症。請告知醫師並優先安排胃鏡檢查，切勿單靠胃藥自行緩解。' };
          if (total <= 5) return { level:'輕度逆流', tone:'green',
            advice:'目前症狀較輕微，屬於間歇性不適。建議調整生活習慣：少量多餐、飯後勿立即躺下、睡前 2 小時禁食、減少咖啡與辛辣食物。若症狀持續，告知醫師評估是否用藥。' };
          if (total <= 12) return { level:'中度逆流風險', tone:'amber',
            advice:'您有多項逆流相關症狀，胃黏膜可能已受到影響。建議告知醫師，討論是否需要短期藥物治療（質子幫浦抑制劑 PPI），並考慮安排胃鏡確認食道狀況。' };
          return { level:'高度逆流風險', tone:'red',
            advice:'您的症狀頻繁且多樣，包含可能的非典型症狀或藥物依賴。建議在診間告知醫師完整狀況，進行胃鏡評估，以排除食道炎、巴瑞特食道或潰瘍。' };
        }
      },
      {
        id:'fatty', group:'basic', kind:'quiz', tab:'脂肪肝', tabEn:'肝病風險快篩',
        title:'脂肪肝與肝病風險快篩', sub:'代謝指標、三高病史、飲食習慣與慢性肝炎背景',
        scoreLabel:'風險評分',
        intro:'共 8 題，涵蓋代謝指標、三高病史、生活飲食與慢性肝炎背景。',
        note:'※ 本評估僅供初步篩查參考，確診需由醫師進行影像及抽血評估',
        max:17,
        qs:[
          { tag:'代謝指標', tagCls:'tag-meta', q:'你的 BMI 是否超過 24？（BMI = 體重 kg ÷ 身高 m²）',
            opts:['否，BMI < 24','BMI 24–27（過重）','BMI > 27（肥胖）'], scores:[0,1,2] },
          { tag:'代謝指標', tagCls:'tag-meta', q:'腰圍是否超標？（男性 ≥ 90 cm，女性 ≥ 80 cm）',
            opts:['否','是'], scores:[0,2] },
          { tag:'三高病史', tagCls:'tag-3high', q:'是否曾被告知有高血脂（三酸甘油酯偏高或 HDL 偏低）？',
            opts:['否','不確定','是'], scores:[0,1,2] },
          { tag:'三高病史', tagCls:'tag-3high', q:'是否有高血壓或糖尿病（含前期）病史，或正在用藥控制？',
            opts:['否','有一項','兩項都有'], scores:[0,1,2] },
          { tag:'生活與飲食', tagCls:'tag-life', q:'是否經常應酬喝酒，或每週飲酒超過 3 次？',
            opts:['否，幾乎不喝','偶爾喝，每月少於 4 次','是，幾乎每週都喝'], scores:[0,1,2] },
          { tag:'生活與飲食', tagCls:'tag-life', q:'是否喜歡喝手搖飲料、含糖飲料，或常吃甜食、精緻澱粉？',
            opts:['幾乎不','每週 2–3 次','幾乎天天'], scores:[0,1,2] },
          { tag:'慢性肝炎背景', tagCls:'tag-hep', q:'是否為 B 型或 C 型肝炎帶原者，或曾被告知肝功能（GOT／GPT）偏高？',
            opts:['否','曾偶爾偏高，但已正常','是，確認帶原或持續偏高'], scores:[0,1,3] },
          { tag:'篩檢記錄', tagCls:'tag-drug', q:'最近一次做腹部超音波（肝臟篩查）是什麼時候？',
            opts:['一年內','一到三年前','超過三年或從未做過'], scores:[0,1,2] }
        ],
        grade:function(total, s){
          if (s[6] >= 3) return { level:'需優先評估', tone:'red',
            advice:'您為慢性肝炎帶原者或肝功能持續異常，這類族群發生肝硬化或肝癌的風險較高。建議定期追蹤肝功能、甲型胎兒蛋白（AFP）及腹部超音波，並在診間告知醫師完整病史。' };
          if (total <= 4) return { level:'低風險', tone:'green',
            advice:'您目前脂肪肝相關風險因子較少。建議維持均衡飲食、控制體重、減少精緻糖與酒精攝取，並每 2–3 年定期接受健康檢查。' };
          if (total <= 9) return { level:'中風險', tone:'amber',
            advice:'您有數項脂肪肝的代謝風險因子。建議告知醫師，考慮安排腹部超音波評估肝臟狀況，同時積極改善飲食並增加運動。' };
          return { level:'高風險', tone:'red',
            advice:'您的風險因子較多，脂肪肝或慢性肝病的可能性較高。建議主動告知醫師，安排腹部超音波及肝功能抽血（GOT／GPT、GGT），及早發現並介入。' };
        }
      },
      {
        id:'stoolcolor', group:'gi', kind:'picker', tab:'糞便顏色', tabEn:'消化道警訊',
        title:'糞便顏色自我對照', sub:'糞便顏色可反映消化道健康狀態與潛在警訊',
        scoreLabel:'對照結果',
        intro:'選擇最接近你近期糞便的顏色，即可顯示可能原因與建議。',
        note:'※ 本對照僅供衛教參考；糞便持續異常（帶血、顏色改變超過 3 天）請告知醫師',
        items:[
          { label:'棕褐色', color:'#8B5C2A', tone:'green', status:'正常',
            detail:'棕褐色是最健康的糞便顏色，代表膽汁正常代謝、消化功能良好。飲食均衡、腸道功能正常者通常呈現此顏色。' },
          { label:'深褐色', color:'#4A2C0A', tone:'green', status:'正常偏深',
            detail:'深褐色通常與攝取較多動物性脂肪及蛋白質有關，膽汁使顏色加深，氣味也較重。屬於正常範圍，無需過度擔心。' },
          { label:'綠色', color:'#4A7C2F', tone:'amber', status:'留意',
            detail:'可能原因：一、短時間內吃了大量深綠色蔬菜（菠菜、青花菜）；二、腸道蠕動過快，膽汁來不及完全代謝；三、細菌感染導致腸胃炎。若無其他症狀且飲食正常，可觀察幾天；若持續且伴隨腹痛、腹瀉，建議就醫。' },
          { label:'黑色／瀝青色', color:'#1A1A1A', tone:'red', status:'需注意',
            detail:'可能原因：一、食用高鐵質食物（豬血糕、動物內臟）或鐵劑補充品；二、墨魚汁或甘草糖；三、上消化道出血（胃潰瘍、十二指腸潰瘍、胃癌）。若非特殊飲食因素，黑色糞便可能代表上消化道出血，請儘快就醫。' },
          { label:'鮮紅色', color:'#C0392B', tone:'red', status:'需注意',
            detail:'可能原因：一、攝取大量紅色食物（火龍果、甜菜根）；二、痔瘡出血（鮮血附著於糞便表面）；三、大腸下段出血、大腸瘜肉或大腸癌。若非飲食因素，鮮紅色糞便應盡快就醫，安排大腸鏡評估。' },
          { label:'黃色／土黃色', color:'#C8A822', tone:'amber', status:'留意',
            detail:'可能原因：一、高脂飲食或膽汁分泌不足（膽囊疾病）；二、胰臟外分泌功能不足，脂肪消化不良；三、感染性腹瀉（如賈第鞭毛蟲感染）。若糞便油膩、漂浮於水面，建議就醫評估胰臟與膽道功能。' },
          { label:'灰白色／陶土色', color:'#C8C0B0', tone:'red', status:'需立即就醫',
            detail:'灰白色糞便代表膽汁缺乏，可能原因：一、膽管阻塞（膽結石、膽管炎）；二、肝臟疾病（病毒性肝炎、肝硬化）；三、胰臟疾病（胰臟癌）。若糞便呈灰白色且同時出現黃疸（眼白或皮膚泛黃），請立即就醫。' }
        ]
      },
      {
        id:'polyp', group:'gi', kind:'quiz', tab:'瘜肉風險', tabEn:'腸癌隱形風險',
        title:'大腸瘜肉與腸癌隱形風險', sub:'涵蓋症狀頻率、警訊紅旗與篩檢記錄',
        scoreLabel:'風險評分',
        intro:'共 8 題，涵蓋排便變化、警訊症狀、家族史、飲食與篩檢記錄。',
        note:'※ 本評估為初步風險篩查，不等同診斷，確認需由醫師評估',
        max:19,
        qs:[
          { tag:'頻率評估', tagCls:'tag-freq', q:'過去一個月內，你是否有排便習慣改變（如突然便秘或腹瀉交替）？',
            opts:['沒有','偶爾','持續超過兩週'], scores:[0,1,2] },
          { tag:'頻率評估', tagCls:'tag-freq', q:'是否曾在馬桶或衛生紙上發現血跡，或糞便呈暗紅色、黑色？',
            opts:['從未發現','偶爾有，但量很少','有，且不只一次'], scores:[0,1,3] },
          { tag:'非典型症狀', tagCls:'tag-atypical', q:'是否有不明原因的體重減輕（近 3 個月內減少超過 3 公斤）？',
            opts:['否','有意識地在減重，是','非刻意減重，卻瘦了'], scores:[0,1,3] },
          { tag:'非典型症狀', tagCls:'tag-atypical', q:'是否常感到腹部悶脹、腸鳴音增加，或左下腹隱隱作痛？',
            opts:['沒有','偶爾','幾乎每週都有'], scores:[0,1,2] },
          { tag:'警訊症狀', tagCls:'tag-red', q:'是否曾被告知有大腸瘜肉，或曾做過大腸鏡發現異常？',
            opts:['否，從未做過大腸鏡','做過，結果正常','是，曾發現瘜肉或異常'], scores:[0,0,3] },
          { tag:'警訊症狀', tagCls:'tag-red', q:'家族中是否有一等親（父母、兄弟姊妹）曾罹患大腸癌或大腸瘜肉？',
            opts:['否','不確定','是'], scores:[0,1,2] },
          { tag:'生活與飲食', tagCls:'tag-life', q:'飲食習慣如何？',
            opts:['多蔬果、少紅肉、少加工食品','一般，沒特別注意','常吃紅肉、燒烤、香腸、火腿等'], scores:[0,1,2] },
          { tag:'篩檢記錄', tagCls:'tag-drug', q:'你最近一次做大腸癌篩檢（糞便潛血）是什麼時候？',
            opts:['一年內','一到三年前','超過三年或從未做過'], scores:[0,1,2] }
        ],
        grade:function(total){
          if (total <= 3) return { level:'低風險', tone:'green',
            advice:'目前風險訊號較少。建議維持高纖、少紅肉的飲食習慣。國民健康署自 2025 年起提供 45 至 74 歲每 2 年一次免費糞便潛血檢查，一等親有大腸癌者則自 40 歲起適用，符合年齡即可持健保卡至特約院所受檢。' };
          if (total <= 8) return { level:'中風險', tone:'amber',
            advice:'您有數項值得注意的風險因子。建議諮詢醫師是否需提前安排大腸鏡檢查，並主動告知家族病史，以利醫師判斷篩檢頻率。' };
          return { level:'高風險', tone:'red',
            advice:'評估結果顯示多項警訊，建議告知醫師並儘早安排大腸鏡檢查。若症狀伴隨血便或體重下降，請勿拖延就醫。' };
        }
      },
      {
        id:'colon', group:'gi', kind:'quiz', tab:'大腸癌風險', tabEn:'危險因子評估',
        title:'大腸癌風險自我評估', sub:'依據危險因子評估相對風險',
        scoreLabel:'風險評分',
        intro:'共 7 題，依年齡、家族史、病史與生活習慣評估相對風險。',
        note:'※ 本評估為相對風險參考，不代表罹癌診斷',
        max:12,
        qs:[
          { q:'你的年齡？', opts:['45 歲以下','45–54 歲','55–64 歲','65 歲以上'], scores:[0,1,2,3] },
          { q:'家族中是否有人曾罹患大腸癌或大腸瘜肉？', opts:['無','二等親（祖父母、叔伯）','一等親（父母、兄弟姊妹、子女）'], scores:[0,1,2] },
          { q:'你是否曾被診斷過大腸瘜肉？', opts:['否','是'], scores:[0,2] },
          { q:'你的飲食習慣？', opts:['多蔬果、少紅肉','一般均衡','常吃紅肉或加工肉品'], scores:[0,0,1] },
          { q:'你是否有規律運動（每週 3 次以上，每次 30 分鐘）？', opts:['有','偶爾','幾乎沒有'], scores:[0,1,1] },
          { q:'你是否有長期便秘、腹瀉或血便的情形？', opts:['否','偶爾','經常'], scores:[0,1,2] },
          { q:'你是否有吸菸習慣？', opts:['否','已戒菸','目前仍在吸菸'], scores:[0,1,1] }
        ],
        grade:function(total){
          if (total <= 2) return { level:'低風險', tone:'green',
            advice:'目前風險因子較少。建議維持健康飲食與規律運動。國民健康署自 2025 年起提供 45 至 74 歲每 2 年一次免費糞便潛血檢查，一等親有大腸癌者則自 40 歲起適用。' };
          if (total <= 5) return { level:'中風險', tone:'amber',
            advice:'您有部分風險因子。建議諮詢醫師是否需要提早接受大腸鏡檢查，並積極改善飲食及生活習慣。' };
          return { level:'高風險', tone:'red',
            advice:'您的風險因子較多，建議主動告知醫師並安排大腸鏡檢查，以利早期發現與治療。請勿輕忽腸道症狀的變化。' };
        }
      },
      {
        id:'scope', group:'gi', kind:'check', tab:'內視鏡疑慮', tabEn:'檢查前說明',
        title:'內視鏡檢查常見疑慮', sub:'檢查前的說明，供與醫師討論時參考',
        intro:'勾選你最在意的項目（可複選），下方會顯示對應的檢查說明。',
        note:'※ 以上為一般性檢查說明，實際做法會依個人病史調整，請於門診與醫師討論',
        submitText:'查看說明', requireOne:true, scoreLabel:'勾選項目',
        items:[
          { tag:'項目 A', label:'怕不適、怕嘔吐反胃', desc:'擔心管子進入喉嚨或腸道時會反胃、不舒服。',
            solution:'鎮靜內視鏡是以靜脈給予鎮靜劑，在淺眠狀態下完成檢查，多數人對過程沒有明顯記憶，胃鏡約 5–10 分鐘、大腸鏡約 15–30 分鐘。也可以選擇不使用鎮靜，搭配喉嚨局部麻醉，由醫護人員引導呼吸完成。兩種方式各有適應狀況，可在門診依你的病史討論。' },
          { tag:'項目 B', label:'清腸過程與藥水口感', desc:'聽說要跑很多次廁所，藥水不好入口。',
            solution:'目前臨床上有低容量清腸藥（約需飲用 1–2 公升），冰鎮後飲用可降低異味。清腸過程約 2–4 小時，建議安排在方便如廁的環境。清腸品質會直接影響大腸鏡的觀察範圍，清得越乾淨，越不容易遺漏瘜肉。' },
          { tag:'項目 C', label:'對鎮靜的安全性有疑慮', desc:'擔心鎮靜或麻醉會有風險。',
            solution:'內視鏡使用的是中度鎮靜，而非手術用的全身麻醉，過程中會持續監測心跳、血壓與血氧。多數健康成人耐受性良好，但仍有呼吸抑制等風險。若有心肺疾病、睡眠呼吸中止、氣道異常或麻醉不良反應病史，務必於檢查前告知醫師評估。' },
          { tag:'項目 D', label:'不清楚檢查前怎麼準備', desc:'不知道低渣飲食該怎麼吃。',
            solution:'低渣飲食的原則是減少纖維殘渣：檢查前兩天避免高纖蔬菜、菇類、堅果、糙米與帶籽水果，改吃白飯、白吐司、蛋、豆腐、去皮魚肉。若有服用抗凝血劑、糖尿病藥或需要調整的慢性病用藥，請提前告知醫師。預約時會提供完整書面說明。' }
        ]
      },

      /* ---------- 代謝與體態 ---------- */
      {
        id:'waist', group:'meta', kind:'waist', tab:'腰圍', tabEn:'代謝症候群指標',
        title:'腰圍與代謝症候群指標', sub:'依台灣國民健康署標準判定',
        scoreLabel:'腰圍評估',
        intro:'請於肚臍水平位置量測腰圍，並選擇生理性別，系統會即時判定是否符合代謝症候群的腰圍指標。',
        note:'※ 腰圍僅為代謝症候群五項指標之一，完整評估請諮詢醫師'
      },
      {
        id:'metsyn', group:'meta', kind:'check', tab:'代謝症候群', tabEn:'五項指標評估',
        title:'代謝症候群完整評估', sub:'依台灣國民健康署五項指標判定',
        intro:'以下五項指標符合三項（含）以上即符合代謝症候群。請依你目前的檢驗數值與用藥狀況勾選。',
        note:'※ 本評估依據台灣國民健康署代謝症候群判定標準，確認需由醫師評估',
        submitText:'查看評估結果', requireOne:false, scoreLabel:'符合異常指標數',
        items:[
          { tag:'腹部肥胖', label:'腰圍超標', desc:'男性 ≥ 90 cm，女性 ≥ 80 cm（肚臍水平量測）' },
          { tag:'高血壓指標', label:'血壓偏高', desc:'收縮壓 ≥ 130 mmHg 或舒張壓 ≥ 85 mmHg，或目前正在服用降血壓藥' },
          { tag:'血糖指標', label:'空腹血糖偏高', desc:'空腹血糖 ≥ 100 mg/dL，或目前正在服用降血糖藥物' },
          { tag:'血脂指標', label:'三酸甘油酯偏高', desc:'三酸甘油酯（TG）≥ 150 mg/dL，或目前正在服用降血脂藥物' },
          { tag:'好膽固醇指標', label:'好膽固醇（HDL）偏低', desc:'男性 HDL < 40 mg/dL，女性 HDL < 50 mg/dL' }
        ]
      },
      {
        id:'diabetes', group:'meta', kind:'quiz', tab:'糖尿病前期', tabEn:'風險自評',
        title:'糖尿病前期風險自評', sub:'參考 ADA 及台灣糖尿病衛教學會量表',
        scoreLabel:'風險評分',
        intro:'共 7 題，依年齡、體位、家族史與生活習慣評估糖尿病前期風險。',
        note:'※ 本評估參考 ADA 及台灣糖尿病衛教學會量表，僅供初步篩檢參考',
        max:14,
        qs:[
          { q:'你的年齡？', opts:['40 歲以下','40–49 歲','50–59 歲','60 歲以上'], scores:[0,1,2,3] },
          { q:'你的 BMI（體重 kg ÷ 身高 m²）？', opts:['BMI < 18.5（過輕）','BMI 18.5–24（正常）','BMI 24–27（過重）','BMI > 27（肥胖）'], scores:[0,0,1,2] },
          { q:'你的腰圍是否超標？（男 ≥ 90 cm，女 ≥ 80 cm）', opts:['否','是'], scores:[0,2] },
          { q:'家族中（父母或兄弟姊妹）是否有人罹患糖尿病？', opts:['否','是'], scores:[0,1] },
          { q:'是否曾被告知血壓偏高（≥ 130/85 mmHg）或正在服用降壓藥？', opts:['否','是'], scores:[0,1] },
          { q:'你的運動習慣？', opts:['每週 3 次以上有氧運動','偶爾運動','幾乎不運動'], scores:[0,1,2] },
          { q:'是否曾被告知血糖偏高（空腹 ≥ 100 mg/dL）或有妊娠糖尿病史？', opts:['否','是'], scores:[0,2] }
        ],
        grade:function(total){
          if (total <= 3) return { level:'低風險', tone:'green',
            advice:'您目前糖尿病前期的風險因子較少。建議維持低糖、低精緻澱粉的飲食與規律運動，並定期健康檢查。' };
          if (total <= 7) return { level:'中風險', tone:'amber',
            advice:'您有部分風險因子。建議告知醫師，考慮檢查空腹血糖或糖化血色素（HbA1c），並積極改善生活習慣。' };
          return { level:'高風險', tone:'red',
            advice:'您的風險因子較多，建議主動告知醫師並安排血糖檢查。糖尿病前期若能及早介入，有機會延緩甚至逆轉進展為糖尿病。' };
        }
      }
    ];
  }

  /* ======================================================
     自我評估模組：介面產生與互動
     ====================================================== */
  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function buildAssessments(){
    ASSESS.forEach(function(spec){
      // 分頁按鈕
      var row = CD.getElementById('tabs-' + spec.group);
      var tab = document.createElement('button');
      tab.className = 'tab';
      tab.type = 'button';
      tab.setAttribute('role', 'tab');
      tab.id = 'tab-' + spec.id;
      tab.setAttribute('aria-controls', 'panel-' + spec.id);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
      tab.dataset.tool = spec.id;
      tab.innerHTML = esc(spec.tab) + '<span class="tab-en">' + esc(spec.tabEn) + '</span>';
      row.appendChild(tab);

      // 面板
      var panel = document.createElement('section');
      panel.className = 'tool-panel';
      panel.id = 'panel-' + spec.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', 'tab-' + spec.id);
      panel.tabIndex = 0;
      panel.hidden = true;
      panel.dataset.summary = '1';
      panel.innerHTML =
        '<div class="panel-head">' +
          '<div class="panel-title">' + esc(spec.title) + '<small>' + esc(spec.sub) + '</small></div>' +
          '<div class="panel-actions">' +
            '<button class="act" type="button" data-reset="' + spec.id + '">重設</button>' +
            '<button class="act" type="button" data-copy="' + spec.id + '" disabled>複製結果</button>' +
          '</div>' +
        '</div>' +
        '<div class="quiz-intro">' + esc(spec.intro) + '</div>' +
        '<div id="' + spec.id + '-body"></div>' +
        '<div class="assess-result" id="' + spec.id + '-result" aria-live="polite"></div>';
      // 面板要排在彙整區之前，彙整區永遠留在最後
      var main = CD.querySelector('main.body');
      main.insertBefore(panel, $('summary-zone'));

      RESETTERS[spec.id] = function(){ startModule(spec); };
      startModule(spec);
    });
    // 寫在 HTML 的靜態分頁（Bristol）依 data-after 移到指定評估的後面
    CD.querySelectorAll('.tab[data-after]').forEach(function(t){
      var ref = CD.getElementById('tab-' + t.dataset.after);
      if (ref) ref.parentNode.insertBefore(t, ref.nextSibling);
    });
  }

  function startModule(spec){
    var res = $(spec.id + '-result');
    if (res) res.innerHTML = '';
    show(spec.id, false);
    var body = $(spec.id + '-body');
    body.hidden = false;
    if (spec.kind === 'quiz')   { QSTATE[spec.id] = { idx:0, scores:[], picked:[] }; renderQuiz(spec); }
    if (spec.kind === 'check')  { QSTATE[spec.id] = { chosen:[] }; renderCheck(spec); }
    if (spec.kind === 'picker') { QSTATE[spec.id] = {}; renderPicker(spec); }
    if (spec.kind === 'waist')  { renderWaist(spec); }
  }

  function resultCard(spec, scoreHtml, level, tone, advice, extra){
    var t = TONE[tone];
    return '<div class="result-card" style="background:' + t.bg + ';border-color:' + t.color + ';">' +
      '<div class="score-label">' + esc(spec.scoreLabel || '評估結果') + '</div>' +
      '<div class="result-score" style="color:' + t.color + '">' + scoreHtml + '</div>' +
      '<div style="margin-top:10px;"><span class="badge" style="background:#fff;color:' + t.color +
        ';border:1.5px solid ' + t.color + '">' + esc(level) + '</span></div>' +
      '<div class="result-advice">' + advice + '</div>' +
      (extra || '') +
      '<div class="notes" style="margin-top:14px;">' + esc(spec.note) + '</div>' +
      '</div>';
  }

  /* ---------- 題目式 ---------- */
  function renderQuiz(spec){
    var st = QSTATE[spec.id];
    var q = spec.qs[st.idx];
    var last = st.idx === spec.qs.length - 1;
    var body = $(spec.id + '-body');
    body.innerHTML =
      '<div class="progress-track"><div class="progress-fill" style="width:' +
        (st.idx / spec.qs.length * 100) + '%"></div></div>' +
      '<div class="quiz-step">問題 ' + (st.idx + 1) + ' / ' + spec.qs.length + '</div>' +
      (q.tag ? '<div class="quiz-tag ' + (q.tagCls || '') + '">' + esc(q.tag) + '</div>' : '') +
      '<div class="quiz-q">' + esc(q.q) + '</div>' +
      '<div class="opt-list">' + q.opts.map(function(o, i){
        return '<button type="button" class="opt" data-i="' + i + '" aria-pressed="' +
               (st.picked[st.idx] === i ? 'true' : 'false') + '">' + esc(o) + '</button>';
      }).join('') + '</div>' +
      '<div class="quiz-nav">' +
        (st.idx > 0 ? '<button type="button" class="btn-ghost" data-prev>上一題</button>' : '') +
        '<button type="button" class="btn-main" data-next' +
          (st.picked[st.idx] === undefined ? ' disabled' : '') + '>' +
          (last ? '查看評估結果' : '下一題') + '</button>' +
      '</div>';

    body.querySelectorAll('.opt').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = parseInt(btn.dataset.i, 10);
        body.querySelectorAll('.opt').forEach(function(b){ b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        st.picked[st.idx] = i;
        st.scores[st.idx] = spec.qs[st.idx].scores[i];
        body.querySelector('[data-next]').disabled = false;
        saveState();
      });
    });
    var prev = body.querySelector('[data-prev]');
    if (prev) prev.addEventListener('click', function(){ st.idx--; renderQuiz(spec); });
    body.querySelector('[data-next]').addEventListener('click', function(){
      if (st.picked[st.idx] === undefined) return;
      if (st.idx < spec.qs.length - 1) { st.idx++; renderQuiz(spec); saveState(); return; }
      finishQuiz(spec);
    });
  }

  function finishQuiz(spec){
    var st = QSTATE[spec.id];
    var total = st.scores.reduce(function(a, b){ return a + b; }, 0);
    var g = spec.grade(total, st.scores);
    $(spec.id + '-result').innerHTML = resultCard(
      spec,
      total + ' <span class="of">/ ' + spec.max + '</span>',
      g.level, g.tone, esc(g.advice), g.extra
    );
    $(spec.id + '-body').hidden = true;

    COPY[spec.id] = spec.title + '：' + total + ' / ' + spec.max + '（' + g.level + '）';

    show(spec.id, true);
  }

  /* ---------- 勾選式 ---------- */
  function renderCheck(spec){
    var st = QSTATE[spec.id];
    var body = $(spec.id + '-body');
    body.innerHTML =
      '<div class="check-list">' + spec.items.map(function(it, i){
        return '<button type="button" class="check-item" data-i="' + i + '" aria-pressed="false">' +
          '<span class="check-box"><span>✓</span></span>' +
          '<span class="check-body">' +
            '<span class="check-tag">' + esc(it.tag) + '</span>' +
            '<span class="check-label">' + esc(it.label) + '</span>' +
            '<span class="check-desc">' + esc(it.desc) + '</span>' +
          '</span></button>';
      }).join('') + '</div>' +
      '<div class="quiz-nav"><button type="button" class="btn-main" data-submit' +
        (spec.requireOne ? ' disabled' : '') + '>' + esc(spec.submitText) + '</button></div>';

    var submit = body.querySelector('[data-submit]');
    body.querySelectorAll('.check-item').forEach(function(btn){
      btn.addEventListener('click', function(){
        var i = parseInt(btn.dataset.i, 10);
        var at = st.chosen.indexOf(i);
        if (at >= 0) st.chosen.splice(at, 1); else st.chosen.push(i);
        btn.setAttribute('aria-pressed', at >= 0 ? 'false' : 'true');
        if (spec.requireOne) submit.disabled = st.chosen.length === 0;
        saveState();
      });
    });
    submit.addEventListener('click', function(){
      if (spec.requireOne && st.chosen.length === 0) return;
      if (spec.id === 'scope') finishScope(spec); else finishMetsyn(spec);
    });
  }

  function finishScope(spec){
    var st = QSTATE[spec.id];
    var picked = st.chosen.slice().sort(function(a, b){ return a - b; }).map(function(i){ return spec.items[i]; });
    $(spec.id + '-result').innerHTML =
      '<div class="result-card" style="background:' + TONE.green.bg + ';border-color:' + TONE.green.color + ';">' +
        '<div class="score-label">針對您勾選的 ' + picked.length + ' 個項目</div>' +
        '<div style="margin-top:12px;">' + picked.map(function(g){
          return '<div class="solution-card">' +
            '<div class="solution-gate">' + esc(g.tag) + '</div>' +
            '<div class="solution-title">' + esc(g.label) + '</div>' +
            '<div class="solution-body">' + esc(g.solution) + '</div></div>';
        }).join('') + '</div>' +
        '<div class="notes" style="margin-top:8px;">' + esc(spec.note) + '</div>' +
      '</div>';
    $(spec.id + '-body').hidden = true;

    COPY[spec.id] = '內視鏡檢查疑慮：' + picked.map(function(g){ return g.tag + ' ' + g.label; }).join('、');

    show(spec.id, true);
  }

  function finishMetsyn(spec){
    var st = QSTATE[spec.id];
    var count = st.chosen.length;
    var names = st.chosen.slice().sort(function(a, b){ return a - b; })
      .map(function(i){ return spec.items[i].label; }).join('、');
    var level, tone, advice, extra;

    if (count === 0) {
      level = '各項指標均正常'; tone = 'green';
      advice = '目前五項代謝指標皆未超標，請繼續維持健康生活習慣，並定期接受健康檢查。';
      extra = '<div class="info-box tone-green"><div class="info-title">代謝症候群說明</div>' +
        '<div class="info-body">代謝症候群是指五大代謝指標中有三項以上異常。您目前各項均正常，請繼續保持良好的飲食習慣、規律運動與充足睡眠，每年定期健檢持續追蹤。</div></div>';
    } else if (count === 1) {
      level = '1 項指標異常'; tone = 'amber';
      advice = '您有 1 項指標偏高（' + names + '），尚未達到代謝症候群標準，但已是警訊。建議積極調整飲食與運動習慣，並於下次健檢時追蹤相關數值。';
      extra = metsynInfo(false);
    } else if (count === 2) {
      level = '2 項指標異常'; tone = 'amber';
      advice = '您有 2 項指標異常（' + names + '），距代謝症候群僅一步之遙。建議告知醫師，進行完整血液及身體評估，並展開生活型態改善計畫。';
      extra = metsynInfo(false);
    } else {
      level = '符合代謝症候群'; tone = 'red';
      advice = '您符合代謝症候群的判定標準（' + count + ' 項指標異常：' + names + '）。請告知醫師，進行進一步檢查與風險評估，並討論是否需要藥物介入。';
      extra = metsynInfo(true);
    }
    if (count >= 1) {
      extra += '<div class="info-box tone-teal"><div class="info-title">改善建議</div><div class="info-body">' +
        '<strong>飲食：</strong>減少精緻澱粉與含糖飲料，增加蔬菜、全穀、魚類與堅果<br>' +
        '<strong>運動：</strong>每週至少 150 分鐘中強度有氧運動（快走、游泳、騎車）<br>' +
        '<strong>體重：</strong>體重減少 5–10% 可顯著改善多項代謝指標<br>' +
        '<strong>戒菸限酒：</strong>吸菸與過量飲酒會加重代謝異常<br>' +
        '<strong>定期追蹤：</strong>每年抽血檢查血糖、血脂並量測腰圍</div></div>';
    }

    $(spec.id + '-result').innerHTML = resultCard(
      spec, count + ' <span class="of">/ 5 項</span>', level, tone, esc(advice), extra
    );
    $(spec.id + '-body').hidden = true;

    COPY[spec.id] = '代謝症候群評估：' + count + ' / 5 項異常（' + level + '）' + (names ? '｜' + names : '');

    show(spec.id, true);
  }

  function metsynInfo(hasMets){
    if (hasMets) {
      return '<div class="info-box tone-red"><div class="info-title">代謝症候群的健康風險</div><div class="info-body">' +
        '代謝症候群不是單一疾病，而是多種代謝異常同時存在，會提高以下風險：<br>' +
        '<strong>心血管疾病</strong>（冠心病、心肌梗塞）風險約提高 <strong>2–3 倍</strong><br>' +
        '<strong>腦中風</strong>風險約提高 <strong>2 倍</strong><br>' +
        '<strong>第 2 型糖尿病</strong>風險約提高 <strong>5 倍</strong><br>' +
        '<strong>非酒精性脂肪肝</strong>與<strong>慢性腎病</strong>的風險也會上升<br><br>' +
        '研究顯示，生活型態介入（飲食控制加上每週 150 分鐘中度有氧運動）可有效改善代謝症候群。</div></div>';
    }
    return '<div class="info-box tone-amber"><div class="info-title">關於代謝症候群</div><div class="info-body">' +
      '代謝症候群是指腹部肥胖、血壓、血糖、三酸甘油酯、HDL 膽固醇五項指標中，有三項以上異常的狀態，是心血管疾病與糖尿病的重要前驅訊號。您目前尚未達標，但已出現部分警訊，積極介入可有效預防。</div></div>';
  }

  /* ---------- 顏色挑選 ---------- */
  function renderPicker(spec){
    var body = $(spec.id + '-body');
    body.innerHTML = '<div class="swatch-list">' + spec.items.map(function(it, i){
      return '<button type="button" class="swatch-item" data-i="' + i + '" aria-pressed="false">' +
        '<span class="swatch-dot" style="background:' + it.color + '"></span>' +
        '<span class="swatch-name">' + esc(it.label) + '</span></button>';
    }).join('') + '</div>';

    body.querySelectorAll('.swatch-item').forEach(function(btn){
      btn.addEventListener('click', function(){
        var it = spec.items[parseInt(btn.dataset.i, 10)];
        body.querySelectorAll('.swatch-item').forEach(function(b){ b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        var t = TONE[it.tone];
        $(spec.id + '-result').innerHTML =
          '<div class="result-card" style="background:' + t.bg + ';border-color:' + t.color + ';">' +
            '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">' +
              '<span class="swatch-dot" style="width:54px;height:54px;background:' + it.color + '"></span>' +
              '<div><div class="score-label">你選擇的顏色</div>' +
              '<div style="font-size:21px;font-weight:700;color:' + t.color + '">' + esc(it.label) + '</div>' +
              '<span class="badge" style="margin-top:6px;background:#fff;color:' + t.color +
                ';border:1.5px solid ' + t.color + '">' + esc(it.status) + '</span></div>' +
            '</div>' +
            '<div class="result-advice">' + esc(it.detail) + '</div>' +
            '<div class="notes" style="margin-top:14px;">' + esc(spec.note) + '</div>' +
          '</div>';

        COPY[spec.id] = '糞便顏色：' + it.label + '（' + it.status + '）';

        show(spec.id, true);
      });
    });
  }

  /* ---------- 腰圍 ---------- */
  function renderWaist(spec){
    var body = $(spec.id + '-body');
    body.innerHTML =
      '<div class="grid-2">' +
        '<div class="field">' +
          '<div class="field-head"><label for="waist-sex">生理性別</label></div>' +
          '<select id="waist-sex"><option value="">未選擇</option>' +
          '<option value="male">男性</option><option value="female">女性</option></select>' +
        '</div>' +
        '<div class="field">' +
          '<div class="field-head"><label for="waist-val">腰圍</label><span class="field-unit">cm</span></div>' +
          '<input type="number" id="waist-val" min="40" max="200" step="0.1" inputmode="decimal" autocomplete="off">' +
          '<p class="field-err" hidden></p>' +
        '</div>' +
      '</div>';

    var calc = function(){
      var sex = $('waist-sex').value;
      var val = num('waist-val');
      if (!sex || !isNum(val)) { show(spec.id, false); return; }
      var limit = sex === 'male' ? 90 : 80;
      var over = val >= limit;
      var tone = over ? 'red' : 'green';
      var advice = over
        ? '您的腰圍超過台灣國民健康署的建議標準（男性 &lt; 90 cm，女性 &lt; 80 cm），屬於代謝症候群的腰圍指標異常。建議搭配血壓、血糖、血脂共同評估，並積極調整飲食與增加有氧運動。'
        : '您的腰圍在正常範圍內（男性 &lt; 90 cm，女性 &lt; 80 cm），代謝症候群的腰圍指標目前正常。請持續維持均衡飲食與規律運動。';
      $(spec.id + '-result').innerHTML = resultCard(
        spec, val + ' <span class="of">cm</span>',
        over ? '超標' : '正常範圍', tone, advice
      );
      COPY[spec.id] = '腰圍 ' + val + ' cm（' + (over ? '超標' : '正常範圍') +
                      '，' + (sex === 'male' ? '男性標準 < 90' : '女性標準 < 80') + ' cm）';
      show(spec.id, true);
    };
    $('waist-sex').addEventListener('change', calc);
    $('waist-val').addEventListener('input', calc);
  }

  /* ======================================================
     彙整結果：把所有已完成的評估收成一份可複製、可列印的清單
     ====================================================== */
  function toolTitle(tool){
    var tab = $('tab-' + tool);
    if (!tab) return tool;
    var en = tab.querySelector('.tab-en');
    return tab.firstChild.textContent.trim() + (en ? '（' + en.textContent + '）' : '');
  }

  function completedTools(){
    // 彙整摘要只收自我評估（有 data-summary 的面板），臨床計算與臨床判讀工具不列入
    return (TOOLS || []).filter(function(t){
      return COPY[t] && isSummaryTool(t);
    });
  }

  function today(){
    var d = new Date();
    var p = function(n){ return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function summaryText(){
    var done = completedTools();
    if (!done.length) return '';
    return '木子澄安診所　自我評估摘要（' + today() + '）\n' +
      done.map(function(t){ return '・' + COPY[t]; }).join('\n') +
      '\n\n※ 以上為自我評估結果，僅供就診時參考，不等同診斷。';
  }

  function renderSummary(){
    // 建立面板的階段會先呼叫 show()，此時 TOOLS 等變數尚未指派，直接略過
    if (!ready) return;
    var list = $('summary-list');
    if (!list) return;
    var done = completedTools();
    var copyBtn = $('summary-copy'), printBtn = $('summary-print');

    if (!done.length) {
      list.innerHTML = '<div class="summary-empty">完成任一項評估後，結果會自動收錄在這裡，可一次複製或列印帶去門診。</div>';
      $('summary-count').textContent = '尚未完成任何評估';
      copyBtn.disabled = true;
      printBtn.disabled = true;
      return;
    }
    list.innerHTML = done.map(function(t){
      var group = TOOL_GROUP[t];
      var dot = group === 'calc' ? 'var(--gold)' : 'var(--teal)';
      return '<div class="summary-item"><span class="summary-dot" style="background:' + dot + '"></span>' +
             '<span>' + esc(COPY[t]) + '</span></div>';
    }).join('');
    $('summary-count').textContent = '共 ' + done.length + ' 項，記錄日期 ' + today();
    copyBtn.disabled = false;
    printBtn.disabled = false;
  }

  $('summary-copy').addEventListener('click', function(){
    var btn = this;
    copyText(summaryText(), function(){
      btn.classList.add('done');
      btn.textContent = '已複製';
      setTimeout(function(){ btn.classList.remove('done'); btn.textContent = '複製全部'; }, 1800);
    });
  });
  // 在工作台裡由工作台負責列印（只印臨床計算這一區）；病人版直接列印整頁
  $('summary-print').addEventListener('click', function(){ (window.CALC_PRINT || window.print)(); });

  /* ======================================================
     暫存作答：只存在本機分頁，關閉分頁即消失，逾時自動作廢
     ====================================================== */
  var STORE_KEY = 'muzi-calc-state';
  var STORE_TTL = 30 * 60 * 1000;   // 30 分鐘，避免診間共用裝置留下上一位的作答
  var ready = false;

  function saveState(){
    if (!ready) return;
    try {
      var fields = {};
      CD.querySelectorAll('main.body input, main.body select').forEach(function(el){
        if (el.id && el.value !== '') fields[el.id] = el.value;
      });
      sessionStorage.setItem(STORE_KEY, JSON.stringify({
        at: Date.now(), fields: fields, quiz: QSTATE, copy: COPY
      }));
    } catch (e) { /* 隱私瀏覽模式可能不允許寫入，忽略即可 */ }
  }

  function clearState(){
    try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* 忽略 */ }
  }

  function restoreState(){
    var raw;
    try { raw = sessionStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { clearState(); return; }
    if (!data || !data.at || Date.now() - data.at > STORE_TTL) { clearState(); return; }

    Object.keys(data.fields || {}).forEach(function(id){
      var el = $(id);
      if (el) el.value = data.fields[id];
    });
    // 重新觸發各工具的計算，讓畫面與還原的數值一致
    CD.querySelectorAll('main.body input, main.body select').forEach(function(el){
      if (el.value !== '') {
        el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles:true }));
      }
    });
    // 還原量表進度
    ASSESS.forEach(function(spec){
      var st = (data.quiz || {})[spec.id];
      if (!st) return;
      QSTATE[spec.id] = st;
      if (spec.kind === 'quiz' && st.picked && st.picked.length) {
        if (st.idx >= spec.qs.length) { st.idx = spec.qs.length - 1; }
        renderQuiz(spec);
        if ((data.copy || {})[spec.id]) finishQuiz(spec);
      }
      if (spec.kind === 'check' && st.chosen && st.chosen.length) {
        renderCheck(spec);
        var body = $(spec.id + '-body');
        st.chosen.forEach(function(i){
          var el = body.querySelector('.check-item[data-i="' + i + '"]');
          if (el) el.setAttribute('aria-pressed', 'true');
        });
        var submit = body.querySelector('[data-submit]');
        if (submit) submit.disabled = false;
      }
    });
    renderSummary();
  }

  /* ======================================================
     最後改版日期（顯示於主畫面左下角）
     每次改版請一併更新這個常數
     ====================================================== */
  var APP_REVISION = '2026-10-29';
  (function renderAppRevision(){
    var el = $('app-revision');
    if (el) el.textContent = '最後改版：' + APP_REVISION;
  })();

  /* ======================================================
     Init
     ====================================================== */
  // 一律停在 BMI，除非網址明確指定 ?tool=xxx（醫師自己加的書籤才會有）
  switchTool(toolFromQuery() || firstToolOf(DEFAULT_GROUP), { scrollTab:false });

  stripHash();
  restoreState();
  ready = true;
  renderSummary();

  // 作答過程隨時暫存，重新整理不會白填
  CD.addEventListener('input', saveState);
  CD.addEventListener('change', saveState);
})();
