/* وريث: عامل الخدمة.
   الهدف الوحيد: أن يفتح التطبيق حتى بدون إنترنت.
   الصفحة تُجلب من الإنترنت أولاً دائماً (فتصل التحديثات فوراً)، وتُحفظ نسخة منها؛
   وإذا انقطع الإنترنت أو تأخر كثيراً تُعرض آخر نسخة محفوظة. طلبات الخادم (Google) لا يلمسها. */
const C='wareeth-shell-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
const clean=r=>new Response(r.body,{status:r.status,statusText:r.statusText,headers:r.headers});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin)return;
  if(r.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(C),old=await c.match('./');
      const net=fetch(u.origin+u.pathname+u.search,{cache:'no-store',credentials:'same-origin'}).then(async x=>{
        if(x.ok&&!x.redirected&&/text\/html/.test(x.headers.get('content-type')||'')){await c.put('./',x.clone());}
        return x.redirected?Response.redirect(x.url,302):x;});
      if(!old)return net;
      // بطء شديد في الشبكة: لا ننتظر أكثر من 8 ثوانٍ ما دامت عندنا نسخة محفوظة
      return Promise.race([net.catch(()=>old),new Promise(res=>setTimeout(()=>res(old),8000))]).then(x=>x===old?clean(old):x);
    })());
    return;
  }
  if(/\/(icon\.png|manifest\.webmanifest)$/.test(u.pathname)){
    e.respondWith(caches.open(C).then(async c=>{const hit=await c.match(r);
      const net=fetch(r).then(x=>{if(x.ok)c.put(r,x.clone());return x;}).catch(()=>hit||Response.error());
      return hit||net;}));
  }
});
