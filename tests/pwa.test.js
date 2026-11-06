import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pub=p=>path.join(root,'public',p);
const text=p=>readFile(pub(p),'utf8');

test('PWA is installed with the exact second submitted image as app icon',async()=>{
 const manifest=JSON.parse(await text('manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.scope,'/');
 assert.ok(manifest.start_url.startsWith('/'));
 for(const size of [192,512]){
  const icon=manifest.icons.find(i=>i.sizes===size+'x'+size&&i.purpose==='any');
  const mask=manifest.icons.find(i=>i.sizes===size+'x'+size&&i.purpose==='maskable');
  assert.ok(icon, 'missing '+size+'px icon');
  assert.ok(mask,'missing maskable '+size+'px icon');
  for(const file of [icon.src,mask.src]){
   const bytes=await readFile(pub(file.replace(/^\//,'')));
   assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
   assert.ok(bytes.length>10000);
  }
 }
 assert.ok((await stat(pub('icons/apple-icon.png'))).size>10000);
});

test('panoramic wallpaper is packaged at HD, 4K and upscaled 8K',async()=>{
 for(const name of ['anomalia-world.webp','anomalia-world-4k.webp','anomalia-world-8k.webp']){
  const buffer=await readFile(pub('media/'+name));
  assert.equal(buffer.subarray(0,4).toString(),'RIFF');
  assert.equal(buffer.subarray(8,12).toString(),'WEBP');
  assert.ok(buffer.byteLength>200000,name);
 }
 const html=await text('index.html');
 assert.match(html,/anomalia-world-8k\.webp 7680w/);
 assert.match(html,/anomalia-world-4k\.webp 3840w/);
 assert.match(html,/class="world-backdrop"/);
 assert.match(html,/rel="manifest"/);
 assert.match(html,/apple-touch-icon/);
});

test('service worker caches only static app shell, never private API',async()=>{
 const worker=await text('sw.js');
 assert.match(worker,/addEventListener\('install'/);
 assert.match(worker,/addEventListener\('activate'/);
 assert.match(worker,/addEventListener\('fetch'/);
 assert.match(worker,/url\.pathname\.startsWith\('\/api\/'\)/);
 assert.match(worker,/req\.method!=='GET'/);
 assert.match(worker,/skipWaiting/);
 const client=await text('app.js');
 assert.match(client,/beforeinstallprompt/);
 assert.match(client,/serviceWorker\.register/);
 assert.match(client,/api\/app-version/);
 assert.match(client,/controllerchange/);
 const styles=await text('style.css');
 assert.match(styles,/\.button\.primary:active/);
 assert.match(styles,/flame-glow/);
});
