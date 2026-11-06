import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initStore,readGuildData,listRecords,createRecord,updateRecord,deleteRecord,getStatus,addGameEvent,mutateGuild} from './lib/store.js';
import {MODULES,GROUPS,FIELDS,validateEntry,GAME_REPO} from './lib/modules.js';
import {BUNKERS,ANTENNAS,decodeMorse,encodeMorse} from './lib/game-data.js';
import {authConfig,oauthStart,oauthCallback,authRequired,csrfRequired,selectGuild,logout,sessionInfo} from './lib/auth.js';
import {startDiscord} from './bot.js';

const dir=path.dirname(fileURLToPath(import.meta.url));
const app=express();app.disable('x-powered-by');app.set('trust proxy',1);
app.use(express.json({limit:'96kb'}));
app.use((req,res,next)=>{
 res.set('X-Content-Type-Options','nosniff');
 res.set('Referrer-Policy','strict-origin-when-cross-origin');
 res.set('X-Frame-Options','DENY');
 res.set('Cache-Control','no-store');
 next();
});
const port=Number(process.env.PORT||8080);
const state={startedAt:new Date().toISOString(),discord:null,discordReady:false};

const controller=(fn)=>async(req,res,next)=>{try{await fn(req,res,next)}catch(e){next(e)}};
app.get('/health',controller(async(req,res)=>{
 const status=await getStatus();
 return res.status(status.ready?200:503).json({
  service:'anomaliaz-prigimalia-bot',ok:status.ready,
  discordConnected:Boolean(state.discord?.isReady?.()),
  dataStore:status.mode,authConfigured:authConfig().ready,uptime:Math.round(process.uptime())
 });
}));
app.get('/api/status',controller(async(req,res)=>{
 const s=await getStatus();
 res.json({online:true,discordConnected:Boolean(state.discord?.isReady?.()),storage:s.mode,oauth:authConfig().ready,
  gameBridgeConfigured:Boolean(process.env.GAME_BRIDGE_SECRET),time:new Date().toISOString()});
}));
app.get('/api/catalog',(req,res)=>res.json({groups:GROUPS,modules:MODULES,fields:FIELDS,gameRepo:GAME_REPO}));
app.get('/api/game-data',(req,res)=>res.json({bunkers:BUNKERS,antennas:ANTENNAS,source:'game-prototype-reference',live:false,frequencyMHz:80}));
app.post('/api/morse/decode',controller(async(req,res)=>{
 const value=String(req.body?.signal||'');
 if(value.length>350)return res.status(400).json({error:'Signal trop long.'});
 try{res.json(decodeMorse(value))}catch(e){res.status(400).json({error:e.message})}
}));
app.get('/api/auth/start',oauthStart);
app.get('/api/auth/callback',controller(oauthCallback));
app.get('/api/session',(req,res)=>res.json(sessionInfo(req)));
app.post('/api/logout',authRequired,csrfRequired,logout);
app.post('/api/select-guild',authRequired,csrfRequired,selectGuild);

app.get('/api/overview',authRequired,controller(async(req,res)=>{
 const doc=await readGuildData(req.anomaliaSession.guildId);
 const counts=Object.fromEntries(Object.keys(MODULES).map(id=>[id,(doc.modules?.[id]||[]).length]));
 res.json({counts,events:(doc.events||[]).slice(0,20),audit:(doc.audit||[]).slice(0,20),
  gameConnection:doc.lastGameEvent?'dernier événement '+doc.lastGameEvent:'aucune télémétrie Unreal reçue',settings:doc.settings,
  discordConnected:Boolean(state.discord?.isReady?.()),storage:(await getStatus()).mode});
}));
app.get('/api/modules/:section',authRequired,controller(async(req,res)=>{
 const section=req.params.section;
 if(!MODULES[section])return res.status(404).json({error:'Module inconnu.'});
 const rows=await listRecords(req.anomaliaSession.guildId,section);
 res.json({section,records:rows,fields:FIELDS[section]});
}));
app.post('/api/modules/:section',authRequired,csrfRequired,controller(async(req,res)=>{
 if(!MODULES[req.params.section])return res.status(404).json({error:'Module inconnu.'});
 res.status(201).json(await createRecord(req.anomaliaSession.guildId,req.params.section,req.body,req.anomaliaSession.user.id));
}));
app.patch('/api/modules/:section/:id',authRequired,csrfRequired,controller(async(req,res)=>{
 if(!MODULES[req.params.section])return res.status(404).json({error:'Module inconnu.'});
 res.json(await updateRecord(req.anomaliaSession.guildId,req.params.section,req.params.id,req.body,req.anomaliaSession.user.id));
}));
app.delete('/api/modules/:section/:id',authRequired,csrfRequired,controller(async(req,res)=>{
 if(!MODULES[req.params.section])return res.status(404).json({error:'Module inconnu.'});
 res.json(await deleteRecord(req.anomaliaSession.guildId,req.params.section,req.params.id,req.anomaliaSession.user.id));
}));
app.put('/api/settings',authRequired,csrfRequired,controller(async(req,res)=>{
 const allowed=['name','accent','whitelistRoleId','announcementChannelId','logsChannelId','welcomeChannelId'];
 const input=req.body||{};
 const values=Object.fromEntries(allowed.filter(k=>typeof input[k]==='string'&&input[k].length<=120).map(k=>[k,input[k]]));
 if(values.accent && !/^#[0-9a-fA-F]{6}$/.test(values.accent))return res.status(400).json({error:'Couleur hexadécimale invalide.'});
 res.json(await mutateGuild(req.anomaliaSession.guildId,req.anomaliaSession.user.id,doc=>{
  Object.assign(doc.settings,values);return {action:'settings',settings:doc.settings};
 }));
}));
app.get('/api/editor/export',authRequired,controller(async(req,res)=>{
 const doc=await readGuildData(req.anomaliaSession.guildId);
 const safe={format:'ANOMALIAZ-CMD-CONFIG',version:1,gameRepo:GAME_REPO,source:'dashboard-draft-not-deployed-in-UE5',
  guildId:req.anomaliaSession.guildId,exportedAt:new Date().toISOString(),
  world:Object.fromEntries(['maps','locations','bunkers','radio','loot','creatures','vehicles','weather','events','editor','assets'].map(k=>[k,doc.modules?.[k]||[]]))};
 res.setHeader('Content-Disposition','attachment; filename="anomaliaz-editor-export.json"');
 res.type('json').send(JSON.stringify(safe,null,2));
}));
app.post('/api/tools/validate',authRequired,csrfRequired,(req,res)=>{
 const raw=req.body?.document;
 if(typeof raw!=='string'||raw.length>60000)return res.status(400).json({error:'Document JSON manquant ou trop volumineux.'});
 try{
  const obj=JSON.parse(raw);
  if(!obj||typeof obj!=='object'||Array.isArray(obj))throw new Error('Objet JSON attendu.');
  const keys=Object.keys(obj);
  res.json({valid:true,keys:keys.slice(0,50),size:raw.length,message:'JSON valide. Validation syntaxique uniquement : aucune importation dans Unreal Engine.'});
 }catch(e){res.status(400).json({valid:false,error:e.message})}
});
app.post('/api/discord/announce',authRequired,csrfRequired,controller(async(req,res)=>{
 const s=req.anomaliaSession,channelId=String(req.body?.channelId||''),
   message=String(req.body?.message||'').trim();
 if(!/^\d{15,22}$/.test(channelId)||!message||message.length>1800)return res.status(400).json({error:'Salon ou message invalide.'});
 if(!state.discord?.isReady())return res.status(503).json({error:'Bot Discord non connecté.'});
 const guild=await state.discord.guilds.fetch(s.guildId);
 const channel=await guild.channels.fetch(channelId);
 if(!channel||channel.guildId!==s.guildId||!channel.isTextBased())return res.status(403).json({error:'Salon Discord non autorisé.'});
 await channel.send({content:message,allowedMentions:{parse:[]}});
 await mutateGuild(s.guildId,s.user.id,doc=>({action:'announce:'+channelId,ok:true}));
 res.json({ok:true});
}));
app.post('/api/bridge/events',controller(async(req,res)=>{
 const secret=process.env.GAME_BRIDGE_SECRET;
 const incoming=req.get('X-Anomalia-Bridge-Secret')||'';
 if(!secret||!incoming||secret.length!==incoming.length||!crypto.timingSafeEqual(Buffer.from(secret),Buffer.from(incoming)))return res.status(401).json({error:'Bridge non autorisé ou non configuré.'});
 const guildId=String(req.body?.guildId||''),type=String(req.body?.type||''),payload=req.body?.payload;
 const allowed=new Set(['player_join','player_leave','kill','death','loot','bunker_open','server_status','quest','build']);
 if(!/^\d{15,22}$/.test(guildId)||!allowed.has(type)||!payload||typeof payload!=='object'||Array.isArray(payload))
  return res.status(400).json({error:'Événement de jeu invalide.'});
 const safe=JSON.parse(JSON.stringify(payload));
 if(JSON.stringify(safe).length>5000)return res.status(400).json({error:'Événement trop volumineux.'});
 await addGameEvent(guildId,{type,payload:safe});
 res.json({accepted:true,gameIntegration:'event-ingest-only'});
}));
app.use(express.static(path.join(dir,'public'),{index:'index.html',maxAge:0}));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API inconnue.'});res.sendFile(path.join(dir,'public','index.html'))});
app.use((err,req,res,next)=>{
 console.error('Erreur ANOMALIA :',err.message);
 res.status(/invalide|incorrect|atteinte|champ|introuvable|manquant|requis|incomplète/i.test(err.message)?400:500).json({error:err.message?.slice(0,220)||'Erreur interne.'});
});

await initStore();
app.listen(port,'0.0.0.0',()=>console.log("Dashboard ANOMALIA’Z actif sur 0.0.0.0:"+port));
const bot=await startDiscord();
state.discord=bot?.isReady?.()?bot:null;
