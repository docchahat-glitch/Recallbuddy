/* Service worker: offline-first shell. VERSION is replaced at build time. */
const VERSION='site-c74da8dca0';
const SHELL='sd-shell-'+VERSION, RUNTIME='sd-runtime';
const PRECACHE=["./", "index.html", "demo.js?v=c74da8dca0", "manifest.webmanifest", "style.css?v=75ef62d728", "viz.css?v=75ef62d728", "extra.css?v=75ef62d728", "pro.css?v=75ef62d728", "shell.css?v=75ef62d728", "brand.css?v=75ef62d728", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "favicon-32.png", "img-brand-mark.png", "img-brand-logo-full.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(PRECACHE)))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
  for(const k of await caches.keys()){if(k.startsWith('sd-shell-')&&k!==SHELL)await caches.delete(k)}
  await self.clients.claim()})())});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting()});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  /* the owner page and the server API are never handled offline */
  if(u.origin===location.origin&&(u.pathname.indexOf('/admin')===0||u.pathname.indexOf('/api/')===0))return;
  if(r.mode==='navigate'){
    /* network first (3 s), so reopening always gets the newest page; offline falls back to the saved copy */
    e.respondWith((async()=>{
      const cache=await caches.open(SHELL);
      try{
        const res=await Promise.race([fetch(r),new Promise((_,rej)=>setTimeout(()=>rej(0),3000))]);
        if(res&&res.ok){cache.put('index.html',res.clone());return res}
      }catch(_){}
      return (await cache.match('index.html'))||(await caches.match('index.html'))||Response.error();
    })());return;
  }
  if(u.origin===location.origin){
    e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{
      if(res.ok){const cp=res.clone();caches.open(RUNTIME).then(x=>x.put(r,cp))}return res}).catch(()=>c||Response.error())));return;
  }
  if(u.hostname==='fonts.googleapis.com'||u.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(RUNTIME).then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{c.put(r,res.clone());return res}).catch(()=>m||Response.error()))));
  }
});
