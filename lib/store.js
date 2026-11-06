import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import {MODULES,validateEntry} from './modules.js';

const location=path.resolve(process.env.DATA_FILE||'data/anomalia-bot.json');
let pool;
let initialized=false;
let writeChain=Promise.resolve();
const locks=new Map();
const guildPattern=/^\d{15,22}$/;
const clone=value=>structuredClone(value);
const createGuild=()=>({
  modules:Object.fromEntries(Object.keys(MODULES).map(k=>[k,[]])),
  settings:{name:"ANOMALIA’Z PRIGIMALIA",accent:'#e2324f',whitelistRoleId:'',announcementChannelId:'',logsChannelId:'',welcomeChannelId:''},
  audit:[],events:[],createdAt:new Date().toISOString(),lastGameEvent:null
});
const requireGuild=id=>{if(!guildPattern.test(String(id)))throw new Error('Identifiant Discord du serveur invalide.');return String(id)};

export async function initStore(){
 if(initialized)return;
 if(process.env.DATABASE_URL){
  pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:4,connectionTimeoutMillis:10000});
  await pool.query('CREATE TABLE IF NOT EXISTS anomalia_guilds (guild_id TEXT PRIMARY KEY, document JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
 }else{
  await fs.mkdir(path.dirname(location),{recursive:true});
  try{await fs.access(location)}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(location,'{}\n',{flag:'wx'}).catch(err=>{if(err.code!=='EEXIST')throw err})}
 }
 initialized=true;
}

async function readFile(){try{return JSON.parse(await fs.readFile(location,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
async function readGuild(id){
 await initStore();
 if(pool){
  const r=await pool.query('SELECT document FROM anomalia_guilds WHERE guild_id=$1',[id]);
  return r.rows[0]?.document||createGuild();
 }
 const db=await readFile();return db[id]||createGuild();
}
async function persist(id,doc){
 if(pool){
  await pool.query('INSERT INTO anomalia_guilds (guild_id,document) VALUES($1,$2::jsonb) ON CONFLICT(guild_id) DO UPDATE SET document=excluded.document,updated_at=NOW()',[id,JSON.stringify(doc)]);
  return;
 }
 const op=writeChain.catch(()=>{}).then(async()=>{
  const db=await readFile();db[id]=doc;
  const temp=location+'.'+crypto.randomUUID()+'.tmp';
  await fs.writeFile(temp,JSON.stringify(db,null,2)+'\n');
  await fs.rename(temp,location);
 });
 writeChain=op;await op;
}
export async function readGuildData(guildId){
 const id=requireGuild(guildId);
 return clone(await readGuild(id));
}
export async function mutateGuild(guildId,actor,fn){
 const id=requireGuild(guildId);
 const prev=locks.get(id)||Promise.resolve();
 const task=prev.catch(()=>{}).then(async()=>{
  const doc=await readGuild(id);
  doc.modules||={};doc.settings||={};doc.audit||=[];doc.events||=[];
  const result=await fn(doc);
  if(actor)doc.audit.unshift({time:new Date().toISOString(),actor:String(actor).slice(0,90),action:result?.action||'update'});
  doc.audit=doc.audit.slice(0,200);
  await persist(id,doc);
  return result;
 });
 locks.set(id,task);task.finally(()=>{if(locks.get(id)===task)locks.delete(id)}).catch(()=>{});
 return task;
}
export async function listRecords(id,moduleId){
 if(!MODULES[moduleId])throw new Error('Module inconnu.');
 const doc=await readGuildData(id);
 return Array.isArray(doc.modules?.[moduleId])?doc.modules[moduleId].slice(0,1000):[];
}
export async function createRecord(id,moduleId,input,actor){
 if(!MODULES[moduleId])throw new Error('Module inconnu.');
 const values=validateEntry(moduleId,input);
 return mutateGuild(id,actor,doc=>{
  const list=doc.modules[moduleId]||[];
  if(list.length>=1000)throw new Error('Limite de 1000 entrées par module atteinte.');
  const record={id:crypto.randomUUID(),...values,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  list.unshift(record);doc.modules[moduleId]=list;
  return {action:'create:'+moduleId,record};
 });
}
export async function updateRecord(id,moduleId,recordId,input,actor){
 if(!MODULES[moduleId])throw new Error('Module inconnu.');
 const values=validateEntry(moduleId,input);
 return mutateGuild(id,actor,doc=>{
  const item=(doc.modules[moduleId]||[]).find(r=>r.id===recordId);
  if(!item)throw new Error('Enregistrement introuvable.');
  Object.assign(item,values,{updatedAt:new Date().toISOString()});
  return {action:'update:'+moduleId,record:item};
 });
}
export async function deleteRecord(id,moduleId,recordId,actor){
 if(!MODULES[moduleId])throw new Error('Module inconnu.');
 return mutateGuild(id,actor,doc=>{
  const list=doc.modules[moduleId]||[],before=list.length;
  doc.modules[moduleId]=list.filter(r=>r.id!==recordId);
  if(before===doc.modules[moduleId].length)throw new Error('Enregistrement introuvable.');
  return {action:'delete:'+moduleId,deleted:recordId};
 });
}
export async function addGameEvent(id,event){
 return mutateGuild(id,'game-bridge',doc=>{
  doc.events.unshift({...event,at:new Date().toISOString()});doc.events=doc.events.slice(0,250);
  doc.lastGameEvent=new Date().toISOString();return {action:'game-event',accepted:true};
 });
}
export async function getStatus(){
 await initStore();if(pool)await pool.query('SELECT 1');
 return {ready:true,mode:pool?'postgres':'local-ephemeral'};
}
