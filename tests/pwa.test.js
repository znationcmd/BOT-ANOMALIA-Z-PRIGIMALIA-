import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const p=x=>path.join(root,'public',x);
const read=x=>readFile(p(x),'utf8');

test('user’s first image is installed as cinematic background; second as PWA icon',async()=>{
 const [html,css,manifest]=await Promise.all([read('index.html'),read('style.css'),read('manifest.webmanifest')]);
 const m=JSON.parse(manifest);
 assert.ok(css.includes('/media/anomaliaz-world.webp'),'full-size cinematic background');
 assert.ok(html.includes('/media/anomaliaz-icon-192.webp'),'user icon in app header');
 assert.ok(html.includes('apple-touch-icon'),'Apple iOS home icon');
 assert.ok(html.includes('rel="manifest"'),'PWA manifest reference');
 assert.ok(html.includes('id="installApp"'),'install action');
 assert.equal(m.display,'standalone');
 assert.equal(m.scope,'/');
 for(const icon of m.icons)assert.ok((await stat(p(icon.src.replace(/^\//,'')))).size>1000,'icon exists '+icon.src);
 for(const file of ['media/anomaliaz-world.webp','media/anomaliaz-apple-icon.png']){
  assert.ok((await stat(p(file))).size>1000,file);
 }
 const mainIcon=await readFile(p('media/anomaliaz-icon-512.webp'));
 assert.equal(mainIcon.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(mainIcon.subarray(8,12).toString('ascii'),'WEBP');
 const background=await readFile(p('media/anomaliaz-world.webp'));
 assert.equal(background.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(background.subarray(8,12).toString('ascii'),'WEBP');
 const apple=await readFile(p('media/anomaliaz-apple-icon.png'));
 assert.equal(apple.subarray(1,4).toString('ascii'),'PNG');
});
test('SW includes deployment-specific cache version and does not cache admin API or auth',async()=>{
 const sw=await read('sw.js'), server=await readFile(path.join(root,'server.js'),'utf8');
 assert.match(sw,/__BUILD_ID__/);
 assert.match(sw,/caches\.keys\(\)/);
 assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\)/);
 assert.match(sw,/request\.method!=='GET'/);
 assert.match(sw,/skipWaiting\(\)/);
 assert.match(server,/RAILWAY_GIT_COMMIT_SHA/);
 assert.match(server,/replace\('__BUILD_ID__',buildId\)/);
});
test('mobile install and auto-updates are implemented without re-install prompts',async()=>{
 const pwa=await read('pwa.js'),css=await read('style.css');
 assert.match(pwa,/beforeinstallprompt/);
 assert.match(pwa,/appinstalled/);
 assert.match(pwa,/serviceWorker\.register/);
 assert.match(pwa,/registration\?\.update\(\)/);
 assert.match(pwa,/controllerchange/);
 assert.match(pwa,/display-mode: standalone/);
 assert.match(css,/\.button\.is-energized/);
 assert.match(css,/\.hero-cinematic/);
 const app=await read('app.js');
 assert.match(app,/pointerdown/);
 assert.match(app,/is-energized/);
});
