/* ANOMALIA’Z PRIGIMALIA installable PWA / static assets only. */
const VERSION='2026-11-06-cinematic-v1';
const CACHE='anomaliaz-shell-'+VERSION;
const APP_SHELL=['/','/index.html','/style.css','/app.js','/manifest.webmanifest','/icons/anomalia-192.png','/icons/anomalia-512.png','/icons/anomalia-maskable-192.png','/icons/anomalia-maskable-512.png','/icons/apple-icon.png','/media/anomalia-world.webp'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(APP_SHELL.map(uri=>new Request(uri,{cache:'reload'})));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys()){
   if(key.startsWith('anomaliaz-shell-')&&key!==CACHE)await caches.delete(key);
  }
  await self.clients.claim();
 })());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
 if(event.data?.type==='APP_VERSION'&&event.source?.postMessage)event.source.postMessage({type:'APP_VERSION',version:VERSION});
});
const excluded=url=>url.pathname==='/health'||url.pathname.startsWith('/api/')||url.pathname.startsWith('/admin');
const staticAsset=url=>/\.(?:js|css|webp|png|svg|jpe?g|woff2?|ico|webmanifest)$/.test(url.pathname);
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||excluded(url))return;
 if(req.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(new Request(req,{cache:'no-store'}));
    if(response.ok&&response.type==='basic') (await caches.open(CACHE)).put('/index.html',response.clone()).catch(()=>{});
    return response;
   }catch{
    return (await caches.match('/index.html'))||Response.error();
   }
  })());
  return;
 }
 if(!staticAsset(url))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const existing=await cache.match(req);
  if(existing&&/\.(?:png|webp|jpe?g|svg|ico)$/.test(url.pathname))return existing;
  try{
   const network=await fetch(req);
   if(network.ok&&network.type==='basic')await cache.put(req,network.clone());
   return network;
  }catch{
   return existing||Response.error();
  }
 })());
});
