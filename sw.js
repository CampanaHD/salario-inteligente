/* Service worker: abre o app mesmo sem rede (rede primeiro, cache como reserva). Dados do banco nunca são cacheados. */
const C='si-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  /* APK e dados de versão nunca passam pelo cache do service worker */
  if(/\/downloads\//.test(new URL(r.url).pathname))return;
  e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))});
