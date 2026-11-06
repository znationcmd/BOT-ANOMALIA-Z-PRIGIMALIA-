import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=file=>readFile(path.join(root,file),'utf8');

test('public Discord invite uses real bot application ID with scoped permissions',async()=>{
 const server=await source('server.js');
 assert.match(server,/app\.get\('\/api\/invite'/);
 assert.match(server,/state\.discord\?\.application\?\.id\|\|state\.discord\?\.user\?\.id/);
 assert.match(server,/url\.searchParams\.set\('scope','bot applications\.commands'\)/);
 assert.match(server,/url\.searchParams\.set\('permissions','3072'\)/);
 assert.doesNotMatch(server,/url\.searchParams\.set\('permissions','8'\)/);
});

test('public invitation appears in desktop header, sidebar, and mobile shortcuts',async()=>{
 const [index,app,css]=await Promise.all([
  source('public/index.html'),source('public/app.js'),source('public/style.css')
 ]);
 assert.match(index,/bot-invite-top/);
 assert.match(index,/bot-invite-side/);
 assert.match(index,/quicknav-invite/);
 assert.match(app,/invite-bot-btn/);
 assert.match(app,/href="\/api\/invite"/);
 assert.match(css,/hero-cinematic \.hero-actions \.invite-bot-btn/);
});

test('OAuth2 failure is explained persistently without leaking credentials',async()=>{
 const [auth,app]=await Promise.all([source('lib/auth.js'),source('public/app.js')]);
 assert.match(auth,/reply\.status===401/);
 assert.match(auth,/auth=credentials/);
 assert.match(app,/authError==='credentials'/);
 assert.match(app,/DISCORD_CLIENT_SECRET/);
 assert.doesNotMatch(auth,/console\.log\([^\n]*SECRET\(/);
});
