// Read-only catalogue of known terrains; a listed name does not imply a licensed
// satellite layer or a verified loot/vehicle database is available.
const names=[
 ['chernarus','Chernarus+','DayZ officiel','https://www.izurvive.com/'],
 ['livonia','Livonia','DayZ officiel','https://www.izurvive.com/'],
 ['sakhal','Sakhal','DayZ officiel','https://www.izurvive.com/'],
 ['nasdara','Nasdara / Badlands','DayZ officiel','https://www.izurvive.com/'],
 ['namalsk','Namalsk','DayZ communautaire','https://mapzone.app/'],
 ['deer-isle','Deer Isle','DayZ communautaire','https://mapzone.app/'],
 ['alteria','Alteria','DayZ communautaire','https://mapzone.app/'],
 ['banov','Banov','DayZ communautaire','https://mapzone.app/'],
 ['bitterroot','Bitterroot','DayZ communautaire',''],
 ['novikostok','Novikostok','DayZ communautaire','https://mapzone.app/'],
 ['takistan-plus','TakistanPlus','DayZ communautaire',''],
 ['lux-redux','LuxRedux','DayZ communautaire',''],
 ['badland','Badland','DayZ communautaire',''],
 ['esseker','Esseker','DayZ communautaire',''],
 ['chiemsee','Chiemsee','DayZ communautaire',''],
 ['pripyat','Pripyat','DayZ communautaire',''],
 ['valning','Valning','DayZ communautaire',''],
 ['skarvik','SKARVIK','ANOMALIA’Z',''],
 ['drazovia','DRAZOVIA','ANOMALIA’Z',''],
 ['falc','F.A.L.C','ANOMALIA’Z',''],
 ['roskatvia-b1','ROSKATVIA-B1','ANOMALIA’Z',''],
 ['nogokv-51','НОГОКВ-51','ANOMALIA’Z',''],
 ['paradisiomania','PARADISIOMANIA','ANOMALIA’Z',''],
 ['deadroot','DEADROOT','ANOMALIA’Z',''],
 ['karskov','KARSKOV','ANOMALIA’Z','']
];
export const BASE_MAPS=Object.freeze(names.map(([id,name,family,referenceUrl])=>Object.freeze({
 id,name,family,referenceUrl:referenceUrl||null,
 imageUrl:null,width:null,height:null,attribution:null,tierZones:[],
 configured:false,source:'catalog'
})));
export const normalizeMapKey=value=>String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u0400-\u04ff]+/g,'-').replace(/^-|-$/g,'');
export function safeImageUrl(input){
 if(typeof input!=='string'||input.length>1500)return null;
 try{
  const u=new URL(input.trim());
  if(u.protocol!=='https:'||u.username||u.password)return null;
  if(!/\.(png|jpe?g|webp|avif)$/i.test(u.pathname))return null;
  return u.href;
 }catch{return null}
}
export function safeTierZones(value,width,height){
 if(!value||!width||!height)return [];
 try{
  const data=typeof value==='string'?JSON.parse(value):value;
  if(!Array.isArray(data))return [];
  return data.slice(0,400).flatMap(zone=>{
   const tier=String(zone?.tier||'');
   if(!['1','2','3','4','5','unique'].includes(tier))return [];
   const x=Number(zone.x),z=Number(zone.z),w=Number(zone.width),h=Number(zone.height);
   if(![x,z,w,h].every(Number.isFinite)||x<0||z<0||w<=0||h<=0||x+w>width||z+h>height)return [];
   return [{tier,x,z,width:w,height:h}];
  });
 }catch{return []}
}
export function buildMapExplorer({guildMaps=[],locations=[],loot=[],vehicles=[]}={}){
 const maps=new Map(BASE_MAPS.map(m=>[m.id,{...m}]));
 for(const record of guildMaps.slice(0,250)){
  if(!record||!record.name)continue;
  const key=normalizeMapKey(record.name);
  if(!key)continue;
  const base=maps.get(key)||[...maps.values()].find(m=>normalizeMapKey(m.name)===key);
  const width=Number.isInteger(Number(record.width))&&Number(record.width)>=100&&Number(record.width)<=300000?Number(record.width):null;
  const height=Number.isInteger(Number(record.height))&&Number(record.height)>=100&&Number(record.height)<=300000?Number(record.height):null;
  const img=safeImageUrl(record.imageUrl);
  const current=base||{id:key,name:String(record.name).slice(0,100),family:'Carte du serveur',referenceUrl:null,source:'server'};
  const result={...current,imageUrl:img,width,height,
   attribution:String(record.attribution||'').slice(0,180)||null,
   tierZones:safeTierZones(record.tierZones,width,height),
   configured:Boolean(img&&width&&height)};
  maps.set(current.id,result);
 }
 const available=[...maps.values()].sort((a,b)=>a.family.localeCompare(b.family,'fr')||a.name.localeCompare(b.name,'fr'));
 const byName=new Map();
 for(const m of available){byName.set(normalizeMapKey(m.id),m.id);byName.set(normalizeMapKey(m.name),m.id)}
 // Alt spellings commonly used in community servers.
 for(const [alias,id] of [['deerisle','deer-isle'],['nasdas','nasdara'],['badlands','nasdara'],['chernarusplus','chernarus'],['roskatvia-b1','roskatvia-b1']])byName.set(alias,id);
 const features=[];
 const ingest=(rows,category)=>{for(const item of rows.slice(0,1500)){
  const mapId=byName.get(normalizeMapKey(item?.map));
  if(!mapId)continue;
  const m=maps.get(mapId);
  if(!m?.width||!m.height)continue;
  const x=Number(item.x),z=Number(item.z);
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>m.width||z>m.height)continue;
  const name=String(item.name||item.id||item.item||item.type||category).slice(0,120);
  const tier=String(item.tier||'');
  features.push({id:String(item.recordId||item.id||'').slice(0,80),mapId,category,name,x,z,
    tier:['1','2','3','4','5','unique'].includes(tier)?tier:null,
    detail:String(item.type||item.category||item.location||item.notes||'').slice(0,190)});
 }};
 ingest(locations,'location');ingest(loot,'item');ingest(vehicles,'vehicle');
 return {maps:available,features:features.slice(0,3500),scope:'guild',dataStatus:'configured-records-only'};
}
