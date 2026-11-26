/* fitReport 漏報測試：每個有 fitReport 的版面，把第一頁頁尾前的最後一塊塞進一段很高的內容（故意超出），
   fitReport 量到的那一頁一定要小於該項目的門檻（render-images.js 的 min），否則代表超出時不會報錯。
   原因：上一塊的 margin-bottom、.page 的 gap 都不算在 getBoundingClientRect 裡，
   內容超出、頁尾被推出頁面時，「頁尾 top − 上一塊 bottom」仍量得到這段間距而放行。
   另外量一次沒有塞內容的原樣，確認現有頁面都在門檻以上。 */
const {JOBS, findBrowser, startServer, openBrowser, parseFit} = require('../kit/render-images.js');

(async ()=>{
  const exe = findBrowser();
  if(!exe){ console.log('找不到 Chrome 或 Edge，fitReport 測試沒有跑'); process.exit(1); }
  const srv = await startServer({save: '', saved: []});
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const B = await openBrowser(exe);
  let bad = 0;
  try{
    for(const [name, job] of Object.entries(JOBS)){
      if(job.min == null) continue;
      const loaded = B.once('Page.loadEventFired');
      await B.send('Page.navigate', {url: base + job.page});
      await loaded;
      await B.evaluate('document.fonts.ready.then(()=> typeof kwReady !== "undefined" ? kwReady : null).then(()=> 1)');
      const before = parseFit(await B.evaluate('fitReport()'));
      const tight = before.filter(([, r])=> !(r >= job.min));
      if(tight.length){ bad++; console.log(`✗ ${name}：原樣就壓到頁尾：` + tight.map(([n, r])=> n + ' ' + r).join('、')); }
      // 故意超出：逐頁在頁尾前的最後一塊（A5 是每一欄的最後一塊）裡面加一段 2000px 高的內容，保留原本的間距，量完拿掉
      const res = await B.evaluate(`JSON.stringify([...document.querySelectorAll('.page')].map(p=>{
        const f = p.querySelector('.foot');
        const targets = p.querySelectorAll('.col').length ? [...p.querySelectorAll('.col')].map(c=> c.lastElementChild) : [f.previousElementSibling];
        const ds = targets.map(t=>{ const d = document.createElement('div'); d.style.height = '2000px'; t.appendChild(d); return d; });
        const all = fitReport();
        ds.forEach(d=> d.remove());
        const name = p.dataset.out || p.dataset.file;
        const row = typeof all === 'string' ? all.split('\\n').find(l=> l.startsWith(name + '：')) : all.find(x=> x[0] === name);
        return [name, row];
      }))`);
      const leaks = JSON.parse(res).map(([n, row])=> [n, (parseFit(typeof row === 'string' ? row : [row])[0] || [])[1]]).filter(([, r])=> r >= job.min);
      if(leaks.length){ bad++; console.log(`✗ ${name}：故意超出 2000px，fitReport 仍放行（門檻 ${job.min}）：` + leaks.map(([n, r])=> n + ' ' + r).join('、')); }
      else console.log(`✓ ${name}：${before.length} 頁逐頁故意超出都會報錯` + (tight.length ? '' : `；原樣都在 ${job.min} 以上`));
    }
  } finally {
    B.close();
    srv.close();
  }
  console.log(bad ? `fitReport 測試：${bad} 項不合格` : 'fitReport 測試：全部通過');
  process.exit(bad ? 1 : 0);
})().catch(e=>{ console.log('fitReport 測試錯誤：' + e.message); process.exit(1); });
