// Microphone decoder for ANOMALIA'Z radio: opt-in, local processing, no audio upload.
// Morse tones must be audible through the device microphone; this does NOT tune a real RF receiver.
const codeByPattern=Object.fromEntries(['-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'].map((p,i)=>[p,String(i)]));
export function decodePulseSequence(pulses){
 const on=pulses.filter(p=>p.on&&p.ms>=35).map(p=>p.ms).sort((a,b)=>a-b);
 if(on.length<5)throw new Error('Pas assez de signaux détectés. Approche le micro de la radio.');
 // The shorter half of tones estimates the Morse dot; reject silence spikes.
 const minTone=on[Math.max(0,Math.floor(on.length*.08))];
 const maxTone=on[Math.max(0,Math.floor(on.length*.9))];
 const dot=maxTone>minTone*1.75?minTone:maxTone/3;
 const groups=[];let current='';
 for(const p of pulses){
  if(p.ms<35)continue;
  if(p.on)current+=p.ms>dot*1.95?'-':'.';
  else if(p.ms>=dot*2.25&&current){groups.push(current);current='';}
 }
 if(current)groups.push(current);
 const digits=groups.map(g=>codeByPattern[g]??'?').join('');
 return {digits,groups,complete:/^\d{10}$/.test(digits),dotMs:Math.round(dot)};
}
export class MicroMorseRecorder{
 constructor(onUpdate){this.onUpdate=onUpdate;this.stream=null;this.ctx=null;this.running=false;this.pulses=[];}
 async start(){
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('Micro indisponible : ouvre le Dashboard en HTTPS dans Safari ou Chrome.');
  this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  try{
   const AudioContextClass=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextClass)throw new Error('Web Audio non pris en charge.');
   this.ctx=new AudioContextClass();await this.ctx.resume();
   const source=this.ctx.createMediaStreamSource(this.stream);
   this.analyser=this.ctx.createAnalyser();this.analyser.fftSize=4096;
   source.connect(this.analyser);
   this.samples=new Float32Array(this.analyser.fftSize);
   this.spectrum=new Uint8Array(this.analyser.frequencyBinCount);
   this.frequencyHz=0;this.signalFrames=0;
   this.running=true;this.last=performance.now();this.level=false;this.duration=0;this.noise=0.004;this.peak=0;
   this.frame=()=>{if(!this.running)return;
    this.analyser.getFloatTimeDomainData(this.samples);
    let power=0;for(let i=0;i<this.samples.length;i++)power+=this.samples[i]*this.samples[i];
    const rms=Math.sqrt(power/this.samples.length);
    // Detect a narrowband Morse tone; don't confuse speech with a beep.
    this.analyser.getByteFrequencyData(this.spectrum);
    const hzPerBin=this.ctx.sampleRate/this.analyser.fftSize;
    const low=Math.max(1,Math.ceil(380/hzPerBin));
    const high=Math.min(this.spectrum.length-2,Math.floor(1700/hzPerBin));
    let peak=0,peakIndex=low,total=0,count=0;
    for(let i=low;i<=high;i++){
     const value=this.spectrum[i];total+=value;count++;
     if(value>peak){peak=value;peakIndex=i}
    }
    const background=count?total/count:0;
    const active=rms>.0035&&peak>105&&peak/(background+1)>2.6;
    if(active){this.frequencyHz=Math.round(peakIndex*hzPerBin);this.signalFrames++}
    if(!this.level)this.noise=this.noise*.98+Math.min(rms,this.noise*2)*.02;
    this.peak=Math.max(rms,this.peak*.98);
    const now=performance.now(),dt=Math.min(now-this.last,100);this.last=now;
    if(active===this.level)this.duration+=dt;
    else {if(this.duration>=35)this.pulses.push({on:this.level,ms:this.duration});this.level=active;this.duration=dt;}
    if(this.pulses.length>400)this.pulses.shift();
    if(this.onUpdate)this.onUpdate({rms,seconds:Math.round((now-this.startedAt)/1000),pulses:this.pulses.length,frequencyHz:this.frequencyHz,detected:this.signalFrames>2});
    this.raf=requestAnimationFrame(this.frame);
   };
   this.startedAt=performance.now();this.raf=requestAnimationFrame(this.frame);
  }catch(e){this.stop();throw e}
 }
 stop(){
  if(this.running){const now=performance.now();this.duration+=Math.min(now-this.last,100);if(this.duration>=35)this.pulses.push({on:this.level,ms:this.duration});}
  this.running=false;if(this.raf)cancelAnimationFrame(this.raf);
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
  if(this.ctx){void this.ctx.close().catch(()=>{});this.ctx=null}
  return [...this.pulses];
 }
}
