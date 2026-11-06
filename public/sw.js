/* ANOMALIA’Z Progressive Web App. Version injected by the Railway deployment. */
const VERSION='__BUILD_ID__';
const CACHE='anomaliaz-shell-'+VERSION;
const SHELL=['/','/offline.html','/index.html','/style.css','/app.js','/pwa.js','/manifest.webmanifest','/media/anomaliaz-world.webp','/icons/anomalia-maskable-192.png','/icons/anomalia-maskable-512.png','/icons/anomalia-192.png','/icons/anomalia-512.png','/icons/apple-icon.png'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const results=await Promise.allSettled(SHELL.map(url=>cache.add(new Request(url,{cache:'reload'}))));
  const failed=results.filter(r=>r.status==='rejected');
  if(failed.length)console.warn('ANOMALIA PWA: '+failed.length+' shell resources unavailable during pre-cache');
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('anomaliaz-shell-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 const url=new URL(request.url);
 // Never cache authentication, Discord sessions, or administrator API data.
 if(url.pathname.startsWith('/api/')||url.pathname==='/health')return;
 if(url.pathname==='/sw.js')return;
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){const cache=await caches.open(CACHE);await cache.put('/index.html',response.clone());}
    return response;
   }catch{return (await caches.match('/offline.html'))||Response.error();}
  })());return;
 }
 event.respondWith((async()=>{
  try{
   const response=await fetch(request,{cache:'no-store'});
   if(response.ok && /^(\/style\.css|\/app\.js|\/pwa\.js|\/manifest\.webmanifest|\/media\/)/.test(url.pathname)){
    const cache=await caches.open(CACHE);
    await cache.put(url.pathname,response.clone());
   }
   return response;
  }catch{return (await caches.match(url.pathname))||Response.error();}
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});
