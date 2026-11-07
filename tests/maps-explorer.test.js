import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BASE_MAPS,buildMapExplorer,safeImageUrl,safeTierZones} from '../lib/map-catalog.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(path.join(root,file),'utf8');

test('catalog contains real terrain names, not fictional item spawn locations',()=>{
 for(const name of ['Chernarus+','Livonia','Sakhal','Nasdara / Badlands','Namalsk','Deer Isle','SKARVIK','DRAZOVIA','F.A.L.C']){
  assert.ok(BASE_MAPS.some(m=>m.name===name),name);
 }
 assert.ok(BASE_MAPS.length>=20);
 assert.ok(BASE_MAPS.every(m=>m.imageUrl===null&&m.width===null));
 assert.deepEqual(buildMapExplorer().features,[]);
});

test('one Discord configures its own map image, tier zones and item/vehicle positions',()=>{
 const out=buildMapExplorer({
  guildMaps:[{name:'Chernarus+',imageUrl:'https://example.org/community-map.webp',width:10000,height:10000,
   tierZones:JSON.stringify([{tier:'3',x:2000,z:3000,width:500,height:800}])}],
  locations:[{name:'Camp',map:'Chernarus+',x:1000,z:4500,tier:'2',type:'base'}],
  loot:[{name:'M4A1',map:'Chernarus+',x:2100,z:3200,tier:'3'}],
  vehicles:[{name:'4x4',map:'Chernarus+',x:7500,z:9000,tier:'1'}]
 });
 const map=out.maps.find(m=>m.id==='chernarus');
 assert.ok(map.configured);
 assert.equal(map.imageUrl,'https://example.org/community-map.webp');
 assert.equal(map.tierZones.length,1);
 assert.deepEqual(new Set(out.features.map(f=>f.category)),new Set(['location','item','vehicle']));
 assert.equal(out.features.find(f=>f.name==='M4A1').tier,'3');
 assert.equal(out.features.find(f=>f.name==='4x4').mapId,'chernarus');
 assert.deepEqual(buildMapExplorer().features,[],'no features bleed between two guilds');
});

test('invalid images and fake coordinates are dropped instead of displayed',()=>{
 assert.equal(safeImageUrl('javascript:alert(1)'),null);
 assert.equal(safeImageUrl('http://example.com/map.png'),null);
 assert.equal(safeImageUrl('https://example.com/invalid.svg'),null);
 assert.equal(safeTierZones('[{"tier":"2","x":900,"z":0,"width":500,"height":100}]',1000,1000).length,0);
 const out=buildMapExplorer({
  guildMaps:[{name:'Deer Isle',width:1000,height:1000}],
  loot:[{name:'Impossible',map:'Deer Isle',x:1500,z:30},{name:'Sans coordonnées',map:'Deer Isle'}]
 });
 assert.equal(out.features.length,0);
});

test('map UI supports touch pinch, mouse wheel, zoom, tiers and exact match search',async()=>{
 const [app,viewer,css,index,sw]=await Promise.all([
  read('public/app.js'),read('public/map-explorer.js'),read('public/map-explorer.css'),read('public/index.html'),read('public/sw.js')
 ]);
 assert.match(app,/function mapsPage\(\)/);
 assert.match(app,/mountMapExplorer/);
 assert.match(viewer,/pointerdown/);
 assert.match(viewer,/pointermove/);
 assert.match(viewer,/pinchDistance/);
 assert.match(viewer,/wheel/);
 assert.match(viewer,/atlasSearch/);
 assert.match(viewer,/atlasTier/);
 assert.match(viewer,/tierZones/);
 assert.match(viewer,/requestAnimationFrame/);
 assert.match(css,/touch-action:none/);
 assert.match(index,/map-explorer\.css/);
 assert.match(sw,/map-explorer\.js/);
});

test('only the current authorized Discord can provide geolocated map data',async()=>{
 const source=await read('server.js');
 const block=source.slice(source.indexOf("app.get('/api/maps/explorer'"),source.indexOf("app.get('/api/catalog'"));
 assert.match(block,/session\(req\)/);
 assert.match(block,/active\.guilds\?\.some/);
 assert.match(block,/readGuildData\(active\.guildId\)/);
 assert.match(block,/features:\[\],scope:'public'/);
});
