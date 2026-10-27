/* 離線快取：診所網路斷線時，工作台（含臨床計算、減重報告、衛教圖卡、列印表單）仍可開啟。
   網頁、程式與樣式：先連網拿最新版，連不上才用快取，所以改版後不必手動清快取。
   連網時一律向伺服器確認是否有新版（cache: no-cache），不使用瀏覽器暫存；
   GitHub Pages 允許暫存 10 分鐘，不這樣做的話剛推上去的新版要等 10 分鐘才看得到。
   圖片：與網頁相同，先向伺服器確認（沒改版只回 304），連不上才用快取；
   以前先顯示快取再背景更新，同意書改版後會先看到舊圖，列印時容易印到舊版。
   外部程式庫與字型（網址含版本號，不會變）：有快取就直接用。
   檢驗截圖辨識（Tesseract.js）從 jsDelivr 載入，用過一次後斷網也能辨識。
   工作台開啟後會把所有衛教與表單圖片預先存下，斷網時也能顯示與列印。 */
const CACHE = 'tools-v17';
const CORE = [
  './', 'index.html',
  'mount.js',
  'calc/', 'calc/index.html', 'calc/view.html', 'calc/app.js', 'calc/hub.css', 'calc/qr.png',
  'weight/', 'weight/index.html', 'weight/view.html', 'weight/app.js', 'weight/report.js',
  'forms/forms.js'
];
const CDN = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(CORE.map(u=> new Request(u, {cache:'no-cache'})))).then(()=> self.skipWaiting()));
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(k=> k !== CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(CDN.test(url.hostname)) return e.respondWith(cacheFirst(req));
  if(url.origin !== location.origin) return;
  e.respondWith(networkFirst(req));
});

// 工作台開啟後傳來衛教與表單圖片清單，還沒存過的逐一存下
self.addEventListener('message', e=>{
  const d = e.data;
  if(!d || d.type !== 'warm' || !Array.isArray(d.urls)) return;
  const urls = d.urls.filter(u=> { try{ return new URL(u).origin === location.origin; }catch(err){ return false; } });
  e.waitUntil(caches.open(CACHE).then(c=> Promise.all(urls.map(u=>
    c.match(u).then(hit=> hit || c.add(new Request(u, {cache:'no-cache'})).catch(()=>{}))
  ))));
});

async function cacheFirst(req){
  const hit = await caches.match(req);
  if(hit) return hit;
  const res = await fetch(req);
  // 以 <script> 載入的外部程式庫是 opaque 回應（看不到狀態碼），照樣可以存
  if(res.ok || res.type === 'opaque') (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req){
  try{
    // 沒有改版時伺服器只回 304，不會重新下載整個檔案。
    // 開啟網頁（navigate）的請求不能帶參數重建，否則會丟出錯誤而一直退回舊快取，所以改用網址重新發出請求
    let res = await fetch(req.url, {cache:'no-cache', credentials:'same-origin'});
    // 網頁被轉址時，重新發出的請求結果不能直接交給瀏覽器，改用原本的請求
    if(res.redirected && req.mode === 'navigate') res = await fetch(req);
    if(res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  }catch(err){
    const hit = await caches.match(req, {ignoreSearch:true});
    if(hit) return hit;
    throw err;
  }
}
