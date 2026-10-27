/* 把畫面檔（view.html：樣式＋畫面）裝進 host 的 shadow root，再依序載入程式。
   shadow root 讓每個工具的樣式與 id 關在自己裡面，和工作台或其他工具互不影響。
   工作台（index.html）用它載入減重報告與臨床計算；病人版臨床計算（calc/index.html）也用它。
   opts.css：另外加上的樣式檔（例如工作台專用外觀）；opts.onRoot(root)：載入程式前先設定全域變數；
   opts.scripts：依序載入的程式（程式一執行就要找得到畫面元素，所以一定在畫面放好之後） */
async function mountView(host, viewUrl, opts){
  opts = opts || {};
  const res = await fetch(viewUrl);
  if(!res.ok) throw new Error(viewUrl + ' ' + res.status);
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = await res.text();
  // 畫面檔裡的圖片路徑是相對於畫面檔，放進別的頁面後改成完整網址
  root.querySelectorAll('img[src]').forEach(im=> im.src = new URL(im.getAttribute('src'), res.url).href);
  for(const href of opts.css || []){
    const r = await fetch(href);
    if(!r.ok) throw new Error(href + ' ' + r.status);
    const s = document.createElement('style');
    s.textContent = await r.text();
    root.appendChild(s);
  }
  if(opts.onRoot) opts.onRoot(root);
  for(const src of opts.scripts || []) await loadScript(src);
  return root;
}
function loadScript(src){
  return new Promise((ok, bad)=>{
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = ()=> bad(new Error(src + ' 載入失敗'));
    document.body.appendChild(s);
  });
}
