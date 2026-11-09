import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeBunkerTransmission,decodeBunkerTransmission,createPrivateCycle,publicCycleView,checkBunkerCode} from '../lib/morse-engine.js';
test('roundtrip leading zeros',()=>{const signal=encodeBunkerTransmission('001234','0007');assert.deepEqual(decodeBunkerTransmission(signal),{digits:'0012340007',grid:'001234',code:'0007'});});
test('reject incomplete Morse',()=>assert.throws(()=>decodeBunkerTransmission('....- .----')));
test('codes private from public view',()=>{const cycle=createPrivateCycle([{id:'a',grid:'123456'}]);assert.equal(cycle.entries.length,1);assert.ok(checkBunkerCode(cycle,'a',cycle.entries[0].code));assert.equal(JSON.stringify(publicCycleView(cycle)).includes(cycle.entries[0].code),false);});
