import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import {BUNKERS,ANTENNAS,decodeMorse,encodeMorse} from '../lib/game-data.js';
import {MODULES,GROUPS,FIELDS,validateEntry} from '../lib/modules.js';

test('ANOMALIA app includes editor, tools, whitelist, shop, battlepass, RP and radio',()=>{
 for(const k of ['editor','tools','whitelist','loot','shop','battlepass','rp','bunkers','radio','maps','servers','moderation','tickets','quests','economy']){
  assert.ok(MODULES[k],k);assert.ok(FIELDS[k].length,k);
 }
 assert.ok(GROUPS.length>=5);
 assert.equal(new Set(GROUPS.flatMap(g=>g.modules)).size,Object.keys(MODULES).length);
});

test('original bunker catalogue has 23 unique locations and 8/8/7 access types',()=>{
 assert.equal(BUNKERS.length,23);
 assert.equal(new Set(BUNKERS.map(b=>b.grid)).size,23);
 assert.equal(BUNKERS.filter(b=>b.access==='key').length,8);
 assert.equal(BUNKERS.filter(b=>b.access==='card').length,8);
 assert.equal(BUNKERS.filter(b=>b.access==='morse').length,7);
 assert.equal(ANTENNAS.length,8);
 assert.ok(BUNKERS.some(b=>b.building!=='military'));
});

test('Morse decodes 10 numeral groups with leading zeros preserved',()=>{
 const digits=BUNKERS[2].grid+'0481';
 const decoded=decodeMorse(encodeMorse(digits));
 assert.equal(decoded.digits,digits);
 assert.equal(decoded.code,'0481');
 assert.equal(decoded.bunker.id,BUNKERS[2].id);
 assert.deepEqual(decodeMorse(digits),decoded);
 assert.throws(()=>decodeMorse('..-- ..'),/10 groupes/);
});

test('module validation rejects unknown and invalid values',()=>{
 assert.throws(()=>validateEntry('missing',{a:'b'}),/Module/);
 assert.throws(()=>validateEntry('shop',{price:'lol'}),/invalide/);
 assert.throws(()=>validateEntry('shop',{name:'X'.repeat(300)}),/long/);
 assert.deepEqual(validateEntry('shop',{sku:'abc',name:'Pack',price:'42'}),{sku:'abc',name:'Pack',price:42});
});

test('guild data is isolated; CRUD, audit, and durable local file work',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'anomaliaz-test-'));
 const filename=path.join(tmp,'store.json');
 process.env.DATA_FILE=filename;
 delete process.env.DATABASE_URL;
 try{
  const store=await import('../lib/store.js?test='+Date.now());
  const guild1='123456789012345678',guild2='223456789012345678';
  await store.initStore();
  const one=await store.createRecord(guild1,'whitelist',{playerId:'323456789012345678',platform:'PC',status:'pending'},'tester');
  assert.equal((await store.listRecords(guild1,'whitelist')).length,1);
  assert.equal((await store.listRecords(guild2,'whitelist')).length,0);
  await store.updateRecord(guild1,'whitelist',one.record.id,{status:'approved'},'tester');
  assert.equal((await store.listRecords(guild1,'whitelist'))[0].status,'approved');
  assert.ok((await store.readGuildData(guild1)).audit.length>=2);
  const saved=JSON.parse(await fs.readFile(filename,'utf8'));
  assert.equal(saved[guild1].modules.whitelist.length,1);
  await store.deleteRecord(guild1,'whitelist',one.record.id,'tester');
  assert.equal((await store.listRecords(guild1,'whitelist')).length,0);
  assert.equal((await store.getStatus()).mode,'local-ephemeral');
 }finally{await fs.rm(tmp,{recursive:true,force:true})}
});
