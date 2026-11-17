/* 給 Node 測試用的假頁面：讓 calc/app.js、weight/app.js 這類直接操作頁面的程式可以在沒有瀏覽器的情況下執行。
   只做到「程式跑得動、輸入欄位讀得到值、結果文字抓得到」，不排版、不畫圖。

   用法：
     const {makeDoc, makeGlobals} = require('./fake-dom.js');
     const doc = makeDoc().seed(viewHtml);          // 從 view.html 帶入每個欄位的 min、max、type 等屬性
     doc.set({'fib-age': 50});                       // 填欄位
     doc.fire('fib-age', 'change');                  // 觸發程式綁在這個欄位上的事件
     doc.text('fib-score')                           // 讀程式寫回的結果 */
function makeEl(doc, id){
  const listeners = {};
  const cls = new Set();
  const attr = {};
  const base = {
    id: id || '', tagName: 'DIV', type: '', min: '', max: '', value: '', textContent: '', innerHTML: '',
    hidden: false, checked: false, disabled: false, tabIndex: 0,
    style: {setProperty(){}, removeProperty(){}, getPropertyValue(){ return ''; }}, dataset: {}, children: [], options: [],
    classList: {
      add: (...a)=> a.forEach(x=> cls.add(x)), remove: (...a)=> a.forEach(x=> cls.delete(x)),
      toggle: (x, on)=> { const v = on === undefined ? !cls.has(x) : !!on; if(v) cls.add(x); else cls.delete(x); return v; },
      contains: x=> cls.has(x)
    },
    addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener(){},
    dispatchEvent(ev){ (listeners[ev.type] || []).forEach(fn=> fn(ev)); return true; },
    _fire(type){
      const ev = {type, target: proxy, currentTarget: proxy, preventDefault(){}, stopPropagation(){}, key: ''};
      (listeners[type] || []).forEach(fn=> fn(ev));
    },
    getAttribute(k){ return k in attr ? attr[k] : null; },
    setAttribute(k, v){ attr[k] = String(v); }, removeAttribute(k){ delete attr[k]; }, hasAttribute(k){ return k in attr; },
    // querySelector 一律回一個空元素（程式常直接接 .addEventListener）；querySelectorAll 回空陣列；closest 回 null
    querySelector(){ return makeEl(doc, ""); }, querySelectorAll(){ return []; },
    closest(){ return null; }, matches(){ return false; }, contains(){ return false; },
    appendChild(x){ return x; }, removeChild(x){ return x; }, insertBefore(x){ return x; },
    insertAdjacentHTML(){}, insertAdjacentElement(x){ return x; }, remove(){}, append(){}, prepend(){}, replaceChildren(){}, after(){}, before(){},
    focus(){}, blur(){}, click(){ base._fire('click'); }, select(){}, scrollIntoView(){}, scrollTo(){},
    getBoundingClientRect(){ return {top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0}; },
    getContext(){ return new Proxy({}, {get: ()=> ()=> ({})}); },
    offsetWidth: 0, offsetHeight: 0, clientWidth: 0, clientHeight: 0, scrollHeight: 0, scrollTop: 0,
    nextElementSibling: null, previousElementSibling: null, firstElementChild: null, firstChild: null
  };
  // 上層元素：一律給一個共用的空元素，讓 el.parentNode.insertBefore(...) 這類寫法不會出錯
  const proxy = new Proxy(base, {
    get(t, k){
      if(k === 'parentNode' || k === 'parentElement'){
        if(!doc) return null;
        return doc._dummy || (doc._dummy = makeEl(null, ''));
      }
      return t[k];
    }
  });
  return proxy;
}

function makeDoc(){
  const els = {};
  const doc = makeEl(null, '#document');
  doc.getElementById = id=> els[id] || (els[id] = makeEl(doc, id));
  doc.createElement = tag=> { const e = makeEl(doc, ''); e.tagName = String(tag || 'div').toUpperCase(); return e; };
  doc.createElementNS = (ns, tag)=> doc.createElement(tag);
  doc.createTextNode = s=> ({data: s, textContent: s});
  doc.createDocumentFragment = ()=> makeEl(doc, '');
  doc.body = makeEl(doc, 'body'); doc.documentElement = makeEl(doc, 'html'); doc.head = makeEl(doc, 'head');
  doc.host = null; doc.activeElement = null; doc.fonts = {ready: Promise.resolve()};
  /* 從 view.html 讀出每個有 id 的標籤，把 tagName、type、min、max、data-* 帶進假元素。
     程式裡依 min／max 做的範圍檢查、依 tagName 綁的事件，行為才會跟真的頁面一樣。 */
  doc.seed = html=> {
    const tagRe = /<([a-zA-Z0-9-]+)(\s[^<>]*)?>/g;
    let m;
    while((m = tagRe.exec(html))){
      const attrs = {};
      const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
      let a;
      while((a = attrRe.exec(m[2] || ''))) attrs[a[1]] = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '';
      if(!attrs.id) continue;
      const e = doc.getElementById(attrs.id);
      e.tagName = m[1].toUpperCase();
      Object.keys(attrs).forEach(k=> {
        if(k.startsWith('data-')) e.dataset[k.slice(5).replace(/-([a-z])/g, (x, c)=> c.toUpperCase())] = attrs[k];
        else if(k !== 'id' && k !== 'class' && k !== 'style' && k !== 'hidden' && k !== 'checked' && k !== 'disabled'){ e[k] = attrs[k]; e.setAttribute(k, attrs[k]); }
      });
      if('hidden' in attrs) e.hidden = true;
      if('checked' in attrs) e.checked = true;
    }
    return doc;
  };
  doc.has = id=> !!els[id];
  doc.fire = (id, type)=> doc.getElementById(id)._fire(type || 'input');
  // 填欄位：布林值設 checked，其餘設 value
  doc.set = vals=> {
    Object.keys(vals).forEach(id=> {
      const e = doc.getElementById(id);
      if(typeof vals[id] === 'boolean') e.checked = vals[id]; else e.value = String(vals[id]);
    });
  };
  doc.text = id=> String(doc.getElementById(id).textContent);
  doc.html = id=> String(doc.getElementById(id).innerHTML);
  return doc;
}

/* 執行環境裡程式會用到的全域物件（window、localStorage、location……） */
function makeGlobals(doc){
  const store = {};
  const storage = {
    getItem: k=> (k in store ? store[k] : null), setItem: (k, v)=> { store[k] = String(v); },
    removeItem: k=> { delete store[k]; }, clear(){ Object.keys(store).forEach(k=> delete store[k]); }
  };
  const win = {
    document: doc, localStorage: storage, sessionStorage: storage,
    location: {hash: '', href: 'http://localhost/', search: '', pathname: '/', origin: 'http://localhost'},
    history: {replaceState(){}, pushState(){}},
    navigator: {clipboard: {writeText: ()=> Promise.resolve()}, userAgent: 'node', onLine: true},
    addEventListener(){}, removeEventListener(){},
    matchMedia: ()=> ({matches: false, addEventListener(){}, addListener(){}}),
    getComputedStyle: ()=> ({getPropertyValue: ()=> '', whiteSpace: 'normal', display: 'block'}),
    setTimeout: ()=> 0, clearTimeout(){}, setInterval: ()=> 0, clearInterval(){},
    requestAnimationFrame: ()=> 0, cancelAnimationFrame(){},
    print(){}, alert(){}, confirm: ()=> true, scrollTo(){}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1
  };
  win.window = win; win.self = win;
  return win;
}
module.exports = {makeDoc, makeEl, makeGlobals};
