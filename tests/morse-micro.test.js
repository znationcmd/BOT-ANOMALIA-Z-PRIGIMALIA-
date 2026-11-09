import test from 'node:test';
import assert from 'node:assert/strict';
import {decodePulseSequence} from '../public/morse-micro.js';
const letters=['-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'];
test('microphone Morse pulse decoding preserves 4-digit codes',()=>{
 const pulses=[];
 for(const group of '0012340007'){
  for(const [i,tone] of [...letters[Number(group)]].entries()){
   pulses.push({on:true,ms:tone==='.'?100:300});
   if(i!==4)pulses.push({on:false,ms:100});
  }
  pulses.push({on:false,ms:350});
 }
 const result=decodePulseSequence(pulses);
 assert.equal(result.complete,true);
 assert.equal(result.digits,'0012340007');
});
test('rejects very short recordings',()=>assert.throws(()=>decodePulseSequence([{on:true,ms:60}])));
