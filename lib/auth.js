import crypto from 'node:crypto';
import pg from 'pg';

const BASE=()=>String(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
const CLIENT=()=>process.env.DISCORD_CLIENT_ID||'';
const SECRET=()=>process.env.DISCORD_CLIENT_SECRET||'';
const TTL=30*24*60*60*1000;
const sessions=new Map(); // Development fallback only when DATABASE_URL is unset.
let sessionPool=null;
let readyPromise=null;
function sessionDb(){
 if(!process.env.DATABASE_URL)return null;
 if(!sessionPool)sessionPool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:10000});
 if(!readyPromise)readyPromise=sessionPool.query(
  'CREATE TABLE IF NOT EXISTS anomalia_sessions (session_hash TEXT PRIMARY KEY, payload JSONB NOT NULL, expires_at TIMESTAMPTZ NOT NULL)'
 ).catch(err=>{readyPromise=null;throw err});
 return sessionPool;
}
const hashSession=sid=>crypto.createHash('sha256').update(String(sid)).digest('hex');
async function saveSession(sid,data){
 const db=sessionDb();
 if(!db){sessions.set(sid,data);return}
 await readyPromise;
 await db.query('INSERT INTO anomalia_sessions (session_hash,payload,expires_at) VALUES ($1,$2::jsonb,$3) ON CONFLICT(session_hash) DO UPDATE SET payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at',
  [hashSession(sid),JSON.stringify(data),new Date(data.expires)]);
}
async function loadSession(sid){
 if(!sid||sid.length>128)return null;
 const db=sessionDb();
 if(!db)return sessions.get(sid)||null;
 await readyPromise;
 const r=await db.query('SELECT payload FROM anomalia_sessions WHERE session_hash=$1 AND expires_at>NOW() LIMIT 1',[hashSession(sid)]);
 return r.rows[0]?.payload||null;
}
async function deleteSession(sid){
 if(!sid)return;
 sessions.delete(sid);
 const db=sessionDb();if(db){await readyPromise;await db.query('DELETE FROM anomalia_sessions WHERE session_hash=$1',[hashSession(sid)])}
}
async function updateSession(sid,data){await saveSession(sid,data)}

const states=new Map();
const cookieSecure=()=>BASE().startsWith('https://');
const COOKIE='anomalia_session',STATE='anomalia_oauth_state';

function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(p=>p.trim()).filter(Boolean).map(s=>{let i=s.indexOf('=');return [s.slice(0,i),decodeURIComponent(s.slice(i+1))]}));}
function issueCookie(res,name,value,maxAge,opts={}){res.cookie(name,value,{httpOnly:true,secure:cookieSecure(),sameSite:'lax',path:'/',maxAge,...opts});}
function authorizedGuilds(guilds){return (Array.isArray(guilds)?guilds:[]).filter(g=>
  g&&/^\d{15,22}$/.test(String(g.id))&&(g.owner||((BigInt(g.permissions||'0')&40n)!==0n))
 ).map(g=>({id:g.id,name:String(g.name||'Discord').slice(0,90),icon:g.icon||null}));}
function oauthReady(){return Boolean(CLIENT()&&SECRET()&&/^https:\/\//.test(BASE()));}
export function authConfig(){return {ready:oauthReady(),missing:[!CLIENT()?'DISCORD_CLIENT_ID':null,!SECRET()?'DISCORD_CLIENT_SECRET':null,!/^https:\/\//.test(BASE())?'PUBLIC_BASE_URL HTTPS':null].filter(Boolean)};}
export function oauthStart(req,res){
 if(!oauthReady())return res.status(503).json({error:'Connexion Discord non configurée.',...authConfig()});
 const state=crypto.randomBytes(24).toString('base64url');
 states.set(state,Date.now()+10*60*1000);issueCookie(res,STATE,state,10*60*1000);
 const uri=BASE()+'/api/auth/callback';
 const search=new URLSearchParams({client_id:CLIENT(),redirect_uri:uri,response_type:'code',scope:'identify guilds',state});
 res.redirect('https://discord.com/oauth2/authorize?'+search);
}
async function discordFetch(url,accessToken){
 const r=await fetch(url,{headers:{authorization:'Bearer '+accessToken},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error('Discord API: '+r.status);
 return r.json();
}
export async function oauthCallback(req,res){
 const {code,state}=req.query||{},expected=cookies(req)[STATE];
 res.clearCookie(STATE,{path:'/'});
 if(typeof state!=='string'||state!==expected||states.get(state)<Date.now()||typeof code!=='string'){
  return res.redirect('/?auth=invalid');
 }
 states.delete(state);
 try{
  const form=new URLSearchParams({client_id:CLIENT(),client_secret:SECRET(),grant_type:'authorization_code',code,redirect_uri:BASE()+'/api/auth/callback'});
  const reply=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',body:form,headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:AbortSignal.timeout(10000)});
  if(reply.status===401){
   // A different application's Client Secret is the most common cause after changing Client ID.
   // Do not log or expose the secret, authorization code or Discord token response.
   console.error('OAuth Discord : échange de code refusé (401) — vérifier DISCORD_CLIENT_SECRET et DISCORD_CLIENT_ID.');
   return res.redirect('/?auth=credentials');
  }
  if(!reply.ok)throw new Error('Token OAuth2 refusé : '+reply.status);
  const token=await reply.json();
  const [user,guilds]=await Promise.all([
   discordFetch('https://discord.com/api/v10/users/@me',token.access_token),
   discordFetch('https://discord.com/api/v10/users/@me/guilds',token.access_token)
  ]);
  const allowed=authorizedGuilds(guilds);
  if(!/^\d{15,22}$/.test(String(user?.id||'')))throw new Error('Utilisateur Discord non identifié.');
  const sid=crypto.randomBytes(32).toString('base64url');
  const info={user:{id:user.id,username:user.global_name||user.username,avatar:user.avatar},guilds:allowed,guildId:allowed[0]?.id||null,
    csrf:crypto.randomBytes(20).toString('base64url'),expires:Date.now()+TTL};
  await saveSession(sid,info);
  issueCookie(res,COOKIE,sid,TTL);
  res.redirect('/');
 }catch(error){console.error('OAuth Discord :',error.message);res.redirect('/?auth=failed');}
}
async function current(req){
 const sid=cookies(req)[COOKIE];
 const data=await loadSession(sid);
 if(!data||!Number.isFinite(Number(data.expires))||data.expires<=Date.now()){
  if(data&&sid)await deleteSession(sid);
  return null;
 }
 return data;
}
export async function session(req){return current(req)}
export async function authRequired(req,res,next){
 try{
  const s=await current(req);
  if(!s)return res.status(401).json({error:'Connexion Discord requise.'});
  if(!s.guildId||!Array.isArray(s.guilds)||!s.guilds.some(g=>g.id===s.guildId))return res.status(403).json({error:'Aucun serveur Discord administrable.'});
  req.anomaliaSession=s;req.anomaliaSid=cookies(req)[COOKIE];next();
 }catch(e){next(e)}
}
export function csrfRequired(req,res,next){
 const s=req.anomaliaSession;
 if(!s||!req.get('X-CSRF-Token')||req.get('X-CSRF-Token')!==s.csrf)
  return res.status(403).json({error:'Jeton anti-CSRF manquant ou invalide.'});
 next();
}
export async function selectGuild(req,res,next){
 try{
  const s=req.anomaliaSession,chosen=String(req.body?.guildId||'');
  if(!s.guilds.some(g=>g.id===chosen))return res.status(403).json({error:'Accès à ce Discord interdit.'});
  s.guildId=chosen;
  await updateSession(req.anomaliaSid,s);
  res.json({ok:true,guildId:chosen});
 }catch(e){next(e)}
}
export async function logout(req,res,next){
 try{
  const sid=req.anomaliaSid||cookies(req)[COOKIE];
  await deleteSession(sid);
  res.clearCookie(COOKIE,{httpOnly:true,secure:cookieSecure(),sameSite:'lax',path:'/'});
  res.json({ok:true});
 }catch(e){next(e)}
}
export async function sessionInfo(req){
 const s=await current(req);
 return s?{authenticated:true,user:s.user,guilds:s.guilds,guildId:s.guildId,csrf:s.csrf,expiresAt:new Date(s.expires).toISOString()}:{authenticated:false,config:authConfig()};
}
