import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..','public');
const read=name=>readFile(path.join(root,name));
test('illustration from user image is in original, 4K and upscaled 8K layers',async()=>{
 for(const name of ['anomaliaz-world.webp','anomaliaz-world-4k.webp','anomaliaz-world-8k.webp']){
  const image=await read('media/'+name);
  assert.equal(image.subarray(0,4).toString(),'RIFF');
  assert.equal(image.subarray(8,12).toString(),'WEBP');
  assert.ok(image.length>100000);
 }
 const css=(await read('style.css')).toString();
 assert.match(css,/cinematic-backdrop/);
 assert.match(css,/anomaliaz-world-8k\.webp/);
 assert.match(css,/anomaliaz-world-4k\.webp/);
});
test('second user image is installed as PWA icon for 192px, 512px and maskable use',async()=>{
 const manifest=JSON.parse((await read('manifest.webmanifest')).toString());
 assert.equal(manifest.display,'standalone');
 assert.equal(manifest.icons.length,4);
 for(const icon of manifest.icons){
  const bytes=await read(icon.src.slice(1));
  assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
 }
 assert.ok((await stat(path.join(root,'icons/apple-icon.png'))).size>10000);
 const html=(await read('index.html')).toString();
 assert.match(html,/rel="manifest"/);
 assert.match(html,/apple-touch-icon/);
 assert.match(html,/cinematic-backdrop/);
});
test('PWA updates and private APIs remain outside offline cache',async()=>{
 const sw=(await read('sw.js')).toString();
 assert.match(sw,/__BUILD_ID__/);
 assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\)/);
 assert.match(sw,/SKIP_WAITING/);
 const pwa=(await read('pwa.js')).toString();
 assert.match(pwa,/beforeinstallprompt/);
 assert.match(pwa,/serviceWorker\.register/);
 assert.match(pwa,/controllerchange/);
});
