import namingPlan from './map-locality-names.json' with {type:'json'};
// Catalogue officiel ANOMALIA’Z PRIGIMALIA — 19 cartes du projet.
// Les cartes originales sont référencées ici, mais les fonds 2D et les points
// de spawn n'ont pas été publiés dans le dépôt du bot. Ne rien inventer.
const names=[
 ['skarvik','SKARVIK','Cartes originales','48 × 48 km'],
 ['drazovia','DRAZOVIA','Cartes originales','48 × 48 km'],
 ['karskov','KARSKOV','Cartes originales',null],
 ['vorgrad','VORGRAD','Cartes originales',null],
 ['nemoris','NEMORIS','Cartes originales',null],
 ['drakheim','DRAKHEIM','Cartes originales',null],
 ['solynacalyra','SOLYNACALYRA','Cartes originales',null],
 ['nexavarkhos','NEXAVARKHOS','Cartes originales',null],
 ['chernaskaluxria','CHERNASKALUXRIA','Cartes originales',null],
 ['falc','F.A.L.C','Cartes originales','26,5 × 26,5 km'],
 ['kolchiem-origins','KOLCHIEM ORIGINS','Cartes originales',null],
 ['roskatvia-b1','ROSКАТVIA-B1','Nouvelles cartes','12,8 × 12,8 km'],
 ['nogokv-51','НОГОКВ-51','Nouvelles cartes','15,3 × 15,3 km'],
 ['paradisiomania','PARADISIOMANIA','Nouvelles cartes','10 × 10 km'],
 ['deadroot','DEADROOT','Nouvelles cartes','8 × 8 km'],
 ['yudinavia','YUDINAVIA','Nouvelles cartes','12,5 × 12,5 km'],
 ['moscovie','MOSCOVIE','Nouvelles cartes','10 × 10 km'],
 ['corsivia','CORSIVIA','Nouvelles cartes','15 × 15 km'],
 ['bot-sever','БОТ СЕВЕР','Nouvelles cartes','50 × 50 km']
];
export const BASE_MAPS=Object.freeze(names.map(([id,name,collection,size])=>Object.freeze({
 id,name,family:'ANOMALIA’Z · '+collection,size:size||null,referenceUrl:null,
 imageUrl:null,width:null,height:null,attribution:null,tierZones:[],
 configured:false,source:'catalog',
 localityNaming:namingPlan.maps.find(m=>m.mapId===({skarvik:'archipelago-v2',drazovia:'inhabited-v2'}[id]||id+'-v1'))||null
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
const mapAliases=new Map([
 ['roskatvia-b1','roskatvia-b1'],['rosкatvia-b1','roskatvia-b1'],
 ['rosкатvia-b1','roskatvia-b1'],['roскатvia-b1','roskatvia-b1'],
 ['nogokv-51','nogokv-51'],['ногокв-51','nogokv-51'],
 ['f-a-l-c','falc'],['falc','falc'],['kolchiem-origins','kolchiem-origins']
]);
export function buildMapExplorer({guildMaps=[],locations=[],loot=[],vehicles=[]}={}){
 const maps=new Map(BASE_MAPS.map(m=>[m.id,{...m}]));
 for(const record of guildMaps.slice(0,250)){
  if(!record||!record.name)continue;
  const key=normalizeMapKey(record.name);
  if(!key)continue;
  const base=maps.get(key)||[...maps.values()].find(m=>normalizeMapKey(m.name)===key)||maps.get(mapAliases.get(key));
  // Never leak or insert other games: every configured map must be one of the 19 ANOMALIA'Z worlds.
  if(!base)continue;
  const width=Number.isInteger(Number(record.width))&&Number(record.width)>=100&&Number(record.width)<=300000?Number(record.width):null;
  const height=Number.isInteger(Number(record.height))&&Number(record.height)>=100&&Number(record.height)<=300000?Number(record.height):null;
  const img=safeImageUrl(record.imageUrl);
  const current=base;
  const result={...current,imageUrl:img,width,height,
   attribution:String(record.attribution||'').slice(0,180)||null,
   tierZones:safeTierZones(record.tierZones,width,height),
   configured:Boolean(img&&width&&height)};
  maps.set(current.id,result);
 }
 const available=[...maps.values()].sort((a,b)=>a.family.localeCompare(b.family,'fr')||a.name.localeCompare(b.name,'fr'));
 const byName=new Map();
 for(const m of available){byName.set(normalizeMapKey(m.id),m.id);byName.set(normalizeMapKey(m.name),m.id)}
 // Accept equivalent spellings of the ANOMALIA'Z names only.
 for(const [alias,id] of mapAliases)byName.set(alias,id);
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
