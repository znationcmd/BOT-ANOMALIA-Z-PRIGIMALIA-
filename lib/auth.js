import crypto from 'node:crypto';

const BASE=()=>String(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
const CLIENT=()=>process.env.DISCORD_CLIENT_ID||'';
const SECRET=()=>process.env.DISCORD_CLIENT_SECRET||'';
const TTL=8*60*60*1000;
const sessions=new Map();
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
 const search=new URLSearchParams({client_id:CLIENT(),redirect_uri:uri,response_type:'code',scope:'identify guilds',state,prompt:'consent'});
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
  sessions.set(sid,info);
  issueCookie(res,COOKIE,sid,TTL);
  res.redirect('/');
 }catch(error){console.error('OAuth Discord :',error.message);res.redirect('/?auth=failed');}
}
function current(req){
 const sid=cookies(req)[COOKIE],s=sessions.get(sid);
 if(!s||s.expires<Date.now()){if(sid)sessions.delete(sid);return null;}
 return s;
}
export function session(req){return current(req)}
export function authRequired(req,res,next){
 const s=current(req);
 if(!s)return res.status(401).json({error:'Connexion Discord requise.'});
 if(!s.guildId||!s.guilds.some(g=>g.id===s.guildId))return res.status(403).json({error:'Aucun serveur Discord administrable.'});
 req.anomaliaSession=s;next();
}
export function csrfRequired(req,res,next){
 const s=req.anomaliaSession||current(req);
 if(!s||!req.get('X-CSRF-Token')||req.get('X-CSRF-Token')!==s.csrf)
  return res.status(403).json({error:'Jeton anti-CSRF manquant ou invalide.'});
 next();
}
export function selectGuild(req,res){
 const s=req.anomaliaSession,chosen=String(req.body?.guildId||'');
 if(!s.guilds.some(g=>g.id===chosen))return res.status(403).json({error:'Accès à ce Discord interdit.'});
 s.guildId=chosen;res.json({ok:true,guildId:chosen});
}
export function logout(req,res){
 const sid=cookies(req)[COOKIE];sessions.delete(sid);res.clearCookie(COOKIE,{path:'/'});
 res.json({ok:true});
}
export function sessionInfo(req){
 const s=current(req);
 return s?{authenticated:true,user:s.user,guilds:s.guilds,guildId:s.guildId,csrf:s.csrf}:{authenticated:false,config:authConfig()};
}
