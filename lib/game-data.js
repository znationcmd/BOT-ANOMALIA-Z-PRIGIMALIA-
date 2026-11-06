// Original ANOMALIA’Z prototype locations. Not a live Unreal Engine server feed.
// Keep in sync with src/bunker-radio.js in the game repository.
const entries=[
 ['Bunker des Murmures',310,-460,'medical'],
 ['Refuge du Veilleur',-410,740,'civil'],
 ['Bunker Vesper',-780,-840,'military'],
 ['Station Cendre',1290,-1630,'industrial'],
 ['Refuge des Pionniers',-2280,1030,'civil'],
 ['Bunker Boréalis',-1950,1340,'medical'],
 ['Bunker Dôme',3220,850,'research'],
 ['Refuge du Port Noir',4100,380,'industrial'],
 ['Bunker Euryn',-650,-2840,'medical'],
 ['Bunker des Brumes',-460,520,'civil'],
 ['Bunker des Cimes',-11500,-11100,'military'],
 ['Refuge Boréal',-12100,-11900,'civil'],
 ['Bunker des Aiguilles',-10700,-12600,'medical'],
 ['Bunker Valbrume',-13900,-10150,'industrial'],
 ['Refuge Mistral',-14050,-9700,'civil'],
 ['Bunker Austral',10800,12300,'military'],
 ['Refuge des Prés',11400,13000,'civil'],
 ['Bunker Méridia',13050,13900,'research'],
 ['Bunker des Dunes',12500,13300,'industrial'],
 ['Refuge Sentinelle',6250,600,'military'],
 ['Bunker Archipel',7380,3610,'medical'],
 ['Bunker des Cendres',3260,-5890,'industrial'],
 ['Bunker de l’Atoll',8020,-4080,'military']
];
export const BUNKERS=Object.freeze(entries.map(([name,x,z,building],i)=>Object.freeze({
 id:'radio-bunker-'+String(i+1).padStart(2,'0'),name,x,z,building,
 access:['key','card','morse'][i%3],
 required:['key','card','morse'][i%3]==='key'?'security_key_'+['a','b','c'][Math.floor(i/3)%3]:['key','card','morse'][i%3]==='card'?'punch_card_level'+(Math.floor(i/3)%3+1):null,
 grid:String(Math.floor((x+24000)/100)).padStart(3,'0')+String(Math.floor((z+24000)/100)).padStart(3,'0')
})));
export const ANTENNAS=Object.freeze([
 ['Antenne Hélion',160,320],['Antenne Boréalis',-2060,680],['Tour Vanta',3920,700],
 ['Relais de Borée',-11800,-11500],['Relais Austral',11000,12700],['Tour Sentinelle',6300,100],
 ['Relais Archipel',7380,3550],['Relais des Cendres',3150,-5950]
].map(([name,x,z])=>({name,x,z})));
const keys=['-----','.----','..---','...--','....-','.....','-....','--...','---..','----.'];
const reversed=Object.fromEntries(keys.map((m,i)=>[m,String(i)]));
export function decodeMorse(signal){
 let digits;
 const raw=String(signal||'').trim();
 if(/^\d{10}$/.test(raw))digits=raw;
 else{
  if(!/^[.\-\s/]+$/.test(raw))throw new Error('Utilise 10 chiffres ou du Morse séparé par des espaces.');
  const groups=raw.split(/[\s/]+/).filter(Boolean);
  if(groups.length!==10)throw new Error('Il faut 10 groupes Morse complets (6 chiffres de grille + 4 de code).');
  digits=groups.map(g=>{if(!Object.hasOwn(reversed,g))throw new Error('Groupe invalide : '+g);return reversed[g]}).join('');
 }
 if(!/^\d{10}$/.test(digits))throw new Error('Transmission incomplète.');
 const grid=digits.slice(0,6);
 return {digits,grid,code:digits.slice(6),bunker:BUNKERS.find(b=>b.grid===grid)||null};
}
export function encodeMorse(value){return String(value).split('').map(ch=>keys[Number(ch)]||'').join(' ')}
