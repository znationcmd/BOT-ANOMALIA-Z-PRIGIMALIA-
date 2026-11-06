import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');

test('single global actions, no redundant invitation / install / editor footer links',async()=>{
 const index=await read('public/index.html');
 assert.equal((index.match(/href="\/api\/invite"/g)||[]).length,1);
 assert.equal((index.match(/id="installApp"/g)||[]).length,1);
 assert.ok(index.includes('href="/design-v2.css"'));
 assert.doesNotMatch(index,/studio-prompt/);
 const nav=index.split('<nav class="mobile-quicknav"')[1].split('</nav>')[0];
 assert.ok((nav.match(/<a /g)||[]).length<=6);
});

test('dashboard groups modules and reduces large duplicate cards',async()=>{
 const app=await read('public/app.js');
 assert.match(app,/class="command-grid"/);
 assert.match(app,/class="command-pane"/);
 assert.match(app,/Monde & survie/);
 assert.match(app,/Communauté & RP/);
 assert.match(app,/Administration/);
 assert.doesNotMatch(app,/class="card-grid">\$\{cards\.map/);
 assert.match(app,/class="grid metric-grid"/);
 assert.match(app,/hero-cinematic/);
});

test('sidebar uses accessible collapsible navigation and a selected guild list',async()=>{
 const [index,app]=await Promise.all([read('public/index.html'),read('public/app.js')]);
 assert.match(index,/id="guildList"/);
 assert.match(app,/details class="nav-group"/);
 assert.match(app,/summary class="nav-group-head"/);
 assert.match(app,/openGroups\.has\(group\.id\)/);
 assert.match(app,/data-switch-guild/);
});

test('visual design supports responsive mobile, accessible focus, and compact OAuth errors',async()=>{
 const [css,app]=await Promise.all([read('public/design-v2.css'),read('public/app.js')]);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/\.bot-invite-top\{display:inline-flex/);
 assert.match(css,/\.command-grid/);
 assert.match(css,/\.notice\.auth-help details/);
 assert.match(app,/<details><summary>Afficher le diagnostic/);
});
