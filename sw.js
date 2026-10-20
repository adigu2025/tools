/* 離線快取：診所網路斷線時，工作台（含臨床計算、減重報告、衛教圖卡、列印表單）仍可開啟。
   網頁、程式與樣式：先連網拿最新版，連不上才用快取，所以改版後不必手動清快取。
   圖片：先用快取立即顯示，同時在背景向網路拿新版更新快取（下次開啟就是新圖）。
   外部程式庫與字型（網址含版本號，不會變）：有快取就直接用。
   工作台開啟後會把所有衛教與表單圖片預先存下，斷網時也能顯示與列印。 */
const CACHE = 'tools-v2';
const CORE = [
  './', 'index.html',
  'calc/', 'calc/index.html', 'calc/app.js', 'calc/styles.css', 'calc/hub.css', 'calc/qr.png',
  'weight/', 'weight/index.html', 'weight/app.js', 'weight/hub.css'
];
const IMG = /\.(webp|png|jpe?g|svg)$/i;
const CDN = /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(CORE)).then(()=> self.skipWaiting()));
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
  if(IMG.test(url.pathname)) return e.respondWith(staleWhileRevalidate(e, req));
  e.respondWith(networkFirst(req));
});

// 工作台開啟後傳來衛教與表單圖片清單，還沒存過的逐一存下
self.addEventListener('message', e=>{
  const d = e.data;
  if(!d || d.type !== 'warm' || !Array.isArray(d.urls)) return;
  const urls = d.urls.filter(u=> { try{ return new URL(u).origin === location.origin; }catch(err){ return false; } });
  e.waitUntil(caches.open(CACHE).then(c=> Promise.all(urls.map(u=>
    c.match(u).then(hit=> hit || c.add(u).catch(()=>{}))
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
    const res = await fetch(req);
    if(res.ok) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  }catch(err){
    const hit = await caches.match(req, {ignoreSearch:true});
    if(hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(e, req){
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const update = fetch(req).then(res=>{ if(res.ok) cache.put(req, res.clone()); return res; });
  if(hit){
    e.waitUntil(update.catch(()=>{}));
    return hit;
  }
  return update;
}
