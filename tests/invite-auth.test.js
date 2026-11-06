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

test('exactly one public invite action is visible in the dashboard top navigation',async()=>{
 const [index,app,css]=await Promise.all([
  source('public/index.html'),source('public/app.js'),source('public/design-v2.css')
 ]);
 assert.match(index,/bot-invite-top/);
 assert.equal((index.match(/href="\/api\/invite"/g)||[]).length,1,'avoid duplicate invite links in layout');
 assert.doesNotMatch(app,/invite-bot-btn/,'hero and login notice should not repeat invite action');
 assert.match(css,/\.bot-invite-top/);
 assert.match(index,/id="installApp"/);
 assert.equal((index.match(/id="installApp"/g)||[]).length,1);
});

test('OAuth2 failure is explained persistently without leaking credentials',async()=>{
 const [auth,app]=await Promise.all([source('lib/auth.js'),source('public/app.js')]);
 assert.match(auth,/reply\.status===401/);
 assert.match(auth,/auth=credentials/);
 assert.match(app,/authError==='credentials'/);
 assert.match(app,/DISCORD_CLIENT_SECRET/);
 assert.doesNotMatch(auth,/console\.log\([^\n]*SECRET\(/);
});
