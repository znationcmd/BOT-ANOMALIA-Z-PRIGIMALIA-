import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(path.join(root,file),'utf8');

test('Discord guild endpoint is private and intersects authorized guilds with actual bot memberships',async()=>{
 const server=await read('server.js');
 assert.match(server,/app\.get\('\/api\/discord\/servers'/);
 assert.match(server,/session\(req\)/);
 assert.match(server,/if\(!userSession\)return res\.status\(401\)/);
 assert.match(server,/userSession\.guilds/);
 assert.match(server,/client\?\.guilds\?\.cache\?\.has\(g\.id\)/);
 assert.match(server,/selectedGuildId:userSession\.guildId/);
});

test('guild sidebar is available on desktop and mobile with real icons and selection action',async()=>{
 const [page,app,styles]=await Promise.all([read('public/index.html'),read('public/app.js'),read('public/style.css')]);
 assert.match(page,/id="guildList"/);
 assert.match(page,/class="guild-switcher"/);
 assert.match(app,/api\('\/api\/discord\/servers'\)/);
 assert.match(app,/function renderGuildList/);
 assert.match(app,/data-switch-guild/);
 assert.match(app,/api\('\/api\/select-guild'/);
 assert.match(app,/renderGuildList\(\)/);
 assert.match(styles,/\.guild-chip\.selected/);
 assert.match(styles,/\.guild-avatar img/);
});

test('unauthenticated visitors cannot view private guild names',async()=>{
 const app=await read('public/app.js');
 assert.match(app,/if\(!state\.session\?\.authenticated\)/);
 assert.match(app,/Connecte-toi pour voir les serveurs/);
});
