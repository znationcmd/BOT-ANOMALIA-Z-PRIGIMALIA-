import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=file=>readFile(path.join(root,file),'utf8');

test('public dashboard shows multi-server Discord integrations rather than developer project',async()=>{
 const app=await source('public/app.js');
 assert.match(app,/function integrationsPage\(\)/);
 assert.match(app,/Services de votre communauté/);
 assert.match(app,/Serveur administré/);
 assert.match(app,/Données de démonstration/);
 assert.match(app,/Données.*séparées entre les serveurs|Données','Isolées entre les serveurs/);
 assert.doesNotMatch(app,/ANOMALIA-PRIMEVAL-OUTBOUNDUN|D:\\\\ANOMALIA|GAME_BRIDGE_SECRET|Unreal Engine|repoUrl/);
});

test('public API does not disclose private development URLs or bridge secrets',async()=>{
 const server=await source('server.js');
 const catalog=server.split("app.get('/api/catalog'")[1].split("));")[0];
 assert.doesNotMatch(catalog,/gameRepo|GAME_REPO|bridge/i);
 const status=server.split("app.get('/api/status'")[1].split("}));")[0];
 assert.doesNotMatch(status,/gameBridgeConfigured|GAME_BRIDGE_SECRET|storage/);
 const exportRoute=server.split("app.get('/api/editor/export'")[1].split("}));")[0];
 assert.doesNotMatch(exportRoute,/GAME_REPO|gameRepo|UE5/);
 assert.match(server,/app.post\('\/api\/bridge\/events'/);
});

test('public slash commands link only to the bot dashboard',async()=>{
 const bot=await source('bot.js');
 assert.doesNotMatch(bot,/GAME_REPO|Unreal Engine|GAME_BRIDGE_SECRET|Télémétrie Unreal/);
 assert.match(bot,/Bot Discord multi-serveurs/);
 assert.match(bot,/dash\(\)\+'\/\#editor'/);
});

test('each guild retains its own data and configuration',async()=>{
 const server=await source('server.js');
 assert.match(server,/readGuildData\(req\.anomaliaSession\.guildId\)/);
 assert.match(server,/listRecords\(req\.anomaliaSession\.guildId,section\)/);
 assert.match(server,/mutateGuild\(req\.anomaliaSession\.guildId/);
});
