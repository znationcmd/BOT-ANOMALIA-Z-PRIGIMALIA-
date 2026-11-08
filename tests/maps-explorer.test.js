import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BASE_MAPS,buildMapExplorer,safeImageUrl,safeTierZones} from '../lib/map-catalog.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFile(path.join(root,file),'utf8');

test('catalog contains only the nineteen ANOMALIA’Z PRIGIMALIA maps',()=>{
 const original=['SKARVIK','DRAZOVIA','KARSKOV','VORGRAD','NEMORIS','DRAKHEIM','SOLYNACALYRA',
 'NEXAVARKHOS','CHERNASKALUXRIA','F.A.L.C','KOLCHIEM ORIGINS'];
 const added=['ROSКАТVIA-B1','НОГОКВ-51','PARADISIOMANIA','DEADROOT','YUDINAVIA','MOSCOVIE','CORSIVIA','БОТ СЕВЕР'];
 assert.equal(BASE_MAPS.length,19);
 assert.deepEqual(new Set(BASE_MAPS.map(m=>m.name)),new Set([...original,...added]));
 assert.ok(BASE_MAPS.every(m=>m.family.startsWith('ANOMALIA’Z')&&m.imageUrl===null&&m.width===null));
 for(const foreign of ['Chernarus+','Livonia','Sakhal','Deer Isle','Namalsk'])assert.ok(!BASE_MAPS.some(m=>m.name===foreign));
 assert.deepEqual(buildMapExplorer().features,[]);
});

test('guild-specific image, tier and spawn coordinates work on an original world',()=>{
 const out=buildMapExplorer({
  guildMaps:[{name:'SKARVIK',imageUrl:'https://example.org/skarvik.webp',width:10000,height:10000,
   tierZones:JSON.stringify([{tier:'3',x:2000,z:3000,width:500,height:800}])}],
  locations:[{name:'Camp',map:'SKARVIK',x:1000,z:4500,tier:'2',type:'base'}],
  loot:[{name:'Objet rare',map:'SKARVIK',x:2100,z:3200,tier:'3'}],
  vehicles:[{name:'4x4',map:'SKARVIK',x:7500,z:9000,tier:'1'}]
 });
 const map=out.maps.find(m=>m.id==='skarvik');
 assert.ok(map.configured);
 assert.equal(map.imageUrl,'https://example.org/skarvik.webp');
 assert.equal(map.tierZones.length,1);
 assert.deepEqual(new Set(out.features.map(f=>f.category)),new Set(['location','item','vehicle']));
 assert.equal(out.features.find(f=>f.name==='Objet rare').tier,'3');
 assert.equal(out.features.find(f=>f.name==='4x4').mapId,'skarvik');
 assert.deepEqual(buildMapExplorer().features,[],'no leak between Discord servers');
});

test('reject external game maps, invalid image URLs and impossible coordinates',()=>{
 assert.equal(safeImageUrl('javascript:alert(1)'),null);
 assert.equal(safeImageUrl('http://example.com/map.png'),null);
 assert.equal(safeImageUrl('https://example.com/invalid.svg'),null);
 assert.equal(safeTierZones('[{"tier":"2","x":900,"z":0,"width":500,"height":100}]',1000,1000).length,0);
 const out=buildMapExplorer({
  guildMaps:[{name:'Chernarus+',imageUrl:'https://example.org/other-game.webp',width:1000,height:1000},
             {name:'DRAZOVIA',width:1000,height:1000}],
  loot:[{name:'Impossible',map:'DRAZOVIA',x:1500,z:30},
        {name:'Sans coordonnées',map:'DRAZOVIA'},
        {name:'Autre jeu',map:'Chernarus+',x:20,z:20}]
 });
 assert.equal(out.maps.length,19);
 assert.ok(!out.maps.some(m=>m.name==='Chernarus+'));
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

test('new worlds accept scoped data without inventing map images or spawn points',()=>{
 for(const [name,size] of [['YUDINAVIA','12,5 × 12,5 km'],['MOSCOVIE','10 × 10 km'],['CORSIVIA','15 × 15 km']]){
  const m=BASE_MAPS.find(m=>m.name===name);
  assert.equal(m.size,size);assert.equal(m.configured,false);
  assert.equal(m.imageUrl,null);
  const out=buildMapExplorer({guildMaps:[{name,width:1000,height:1000,imageUrl:'https://example.org/map.webp'}],locations:[{name:'Test',map:name,x:100,z:200}]});
  assert.equal(out.features.length,1);assert.equal(out.features[0].mapId,m.id);
 }
 assert.deepEqual(buildMapExplorer().features,[]);
});

test('regional scripts and area shares remain authored labels, never fabricated spawns',()=>{
 const out=buildMapExplorer();assert.equal(out.features.length,0);
 const north=out.maps.find(m=>m.id==='bot-sever');assert.equal(north.size,'50 × 50 km');
 const regions=north.localityNaming.regions;assert.equal(regions[0].areaFraction,.15);
 assert.equal((regions[0].northMetres-regions[0].southMetres)*(regions[0].eastMetres-regions[0].westMetres),375000000);
 assert.equal(regions[0].northMetres,regions[1].southMetres);
 assert.ok(north.localityNaming.cityNames.ka.every(n=>/\p{Script=Georgian}/u.test(n)));
 assert.ok(north.localityNaming.cityNames.ru.every(n=>/\p{Script=Cyrillic}/u.test(n)));
 assert.equal(out.maps.find(m=>m.id==='vorgrad').localityNaming.direction,'rtl');
 assert.ok(out.maps.find(m=>m.id==='vorgrad').localityNaming.cityNames.every(n=>/\p{Script=Arabic}/u.test(n)));
 assert.equal(out.maps.find(m=>m.id==='corsivia').localityNaming.language,'co');
});
