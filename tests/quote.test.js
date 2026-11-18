/* 報價的測試。用法（在 tools 資料夾）：node tests/quote.test.js
   全部通過時最後一行是「全部通過」，結束碼 0。
   測三件事：
   1. 價目資料本身：id 不重複、價格是數字、套組成分（PANEL_PARTS）指到的品項都存在。
      改價格或新增檢驗時，最容易漏掉的是套組成分表，這裡會直接抓出來。
   2. 優惠規則（DISCOUNT_RULES）：什麼組合會套用哪個優惠，免自費項目不算。
   3. 重複計費與前提條件提醒（findConflicts）。
   預期值依診所的收費規則寫，不是抄程式目前的輸出。 */
const {loadQuote, suite} = require('./load.js');
const t = suite('報價');
const Q = loadQuote();

// ── 1. 價目資料 ──
const all = [];
Q.CATEGORIES.forEach(c=> c.items.forEach(i=> all.push(Object.assign({cat: c.id}, i))));
const items = all.filter(i=> !i.type);
const seen = {}, dupIds = [];
items.forEach(i=> { if(seen[i.id]) dupIds.push(i.id); seen[i.id] = 1; });
t.eq('品項 id 不重複', dupIds.join('、'), '');
t.eq('價格都是 0 以上的數字', items.filter(i=> typeof i.price !== 'number' || !(i.price >= 0)).map(i=> i.id).join('、'), '');
t.eq('品項都有名稱', items.filter(i=> !String(i.name || '').trim()).map(i=> i.id).join('、'), '');
const missing = [];
Object.entries(Q.PANEL_PARTS).forEach(([k, parts])=> {
  if(!Q.ITEM_BY_ID[k]) missing.push('套組 ' + k);
  parts.forEach(x=> { if(!Q.ITEM_BY_ID[x]) missing.push(k + ' 的成分 ' + x); });
});
t.eq('套組成分都指到存在的品項', missing.join('、'), '');
t.eq('P 的每個檢驗代碼都存在', Object.entries(Q.P).filter(([, id])=> !Q.ITEM_BY_ID[id]).map(([k])=> k).join('、'), '');
t.eq('同一項檢驗的分身都指到本尊', Object.entries(Q.SAME_TEST).filter(([a, b])=> !Q.ITEM_BY_ID[a] || !Q.ITEM_BY_ID[b]).map(([a])=> a).join('、'), '');
t.eq('價目版本是日期', /^\d{4}-\d{2}-\d{2}$/.test(Q.Q_PRICE_VERSION), true);
const endoIds = Q.ENDO_TREE.layer1.concat(Q.ENDO_TREE.selfPay).map(x=> x.id);
t.eq('內視鏡鏡種 id 不重複', endoIds.length, new Set(endoIds).size);

// ── 2. 優惠 ──
const it = (id, mode)=> ({id, mode: mode || 'self', price: (Q.ITEM_BY_ID[id] || {}).price || 0, name: (Q.ITEM_BY_ID[id] || {}).name || id});
const disc = list=> Q.discounts(list).join(',');
t.eq('超音波 2 項', disc([it('ex1'), it('ex2')]), 'disc-us-2');
t.eq('超音波 3 項（2 項與 3 項規則都成立，由畫面取最優）', disc([it('ex1'), it('ex2'), it('ex3')]), 'disc-us-2,disc-us-3');
t.eq('超音波其中一項免自費不算', disc([it('ex1'), it('ex2', 'ins')]), '');
t.eq('點滴 2 項', disc([it('dr1'), it('dr2')]), 'disc-drip-2');
t.eq('點滴 3 項', disc([it('dr1'), it('dr2'), it('dr3')]), 'disc-drip-2,disc-drip-3');
t.eq('健檢 ① 加頸動脈超音波', disc([it('hc_m1'), it('ex3')]), 'disc-hc-cv');
t.eq('只選健檢 ①', disc([it('hc_m1')]), '');
t.eq('胃鏡加 Hp 快速尿素測試', disc([{id: 'en_gastro', mode: 'self'}, {id: 'en_gastro|en_g_hp', mode: 'self'}]), 'disc-hp');
t.eq('只有胃鏡', disc([{id: 'en_gastro', mode: 'self'}]), '');
t.eq('麻醉胃鏡＋麻醉大腸鏡同日', disc([{id: 'en_gastro|en_g_a'}, {id: 'en_colon|en_c_a'}]), 'disc-endo-1');
t.eq('清醒胃鏡＋清醒大腸鏡同日', disc([{id: 'en_gastro|en_g_w'}, {id: 'en_colon|en_c_w'}]), 'disc-endo-2');
t.eq('麻醉胃鏡＋清醒大腸鏡不套用同日優惠', disc([{id: 'en_gastro|en_g_a'}, {id: 'en_colon|en_c_w'}]), '');

// ── 3. 重複計費與提醒 ──
const conf = list=> Q.findConflicts(list);
const join = r=> r.warns.concat(r.rules, r.clin).join('｜');
t.has('套組已含單項', conf([it('lb02'), it('lb_01001')]).warns.join(''), '已包含');
t.has('套組已含單項：寫出重複金額', conf([it('lb02'), it('lb_01001')]).warns.join(''), 'NT$');
t.eq('套組含的單項設成免自費就不提醒', conf([it('lb02'), it('lb_01001', 'ins')]).warns.length, 0);
t.has('兩個套組成分重複', conf([it('lb01'), it('lb02')]).warns.join(''), '內容重複');
t.eq('沒有重複就沒有提醒', join(conf([it('lb05'), it('ex1')])), '');
t.has('同一項檢驗在兩個分類各選一次', join(conf([it('lb_14004'), it('lb_09009')])), '同一項檢驗');
t.has('大腸鏡與糞便潛血', conf([it('hc_m5'), {id: 'en_colon', mode: 'self'}]).clin.join(''), '糞便潛血');
t.has('ARBL 沒有鎮靜胃鏡', conf([{id: 'en_arbl', mode: 'self'}]).rules.join(''), 'ARBL');
t.eq('ARBL 有麻醉胃鏡就不提醒', conf([{id: 'en_arbl', mode: 'self'}, {id: 'en_gastro|en_g_a', mode: 'self'}]).rules.length, 0);
t.has('胃鏡與大腸鏡都免自費', conf([{id: 'en_gastro', mode: 'ins'}, {id: 'en_colon', mode: 'ins'}]).rules.join(''), '同日只給付其中一項');
t.has('兩個胃鏡項目', conf([{id: 'en_gastro', mode: 'self'}, {id: 'en_sp_g', mode: 'self'}]).warns.join(''), '2 個胃鏡項目');

const bad = t.done();
console.log(bad ? `${bad} 項失敗` : '全部通過');
process.exit(bad ? 1 : 0);
