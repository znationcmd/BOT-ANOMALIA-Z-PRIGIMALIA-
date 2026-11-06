/* Install on desktop/phone; update silently on next safe page activation. */
const installButton=document.getElementById('installApp');
const updateLabel=document.getElementById('updateNotice');
let installPrompt=null;
let hasControl=Boolean(navigator.serviceWorker?.controller);
let reloadQueued=false;
let registration=null;
const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const isiOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const busy=()=>!document.getElementById('modal')?.hidden || document.activeElement?.matches('input,select,textarea,[contenteditable]');
const updateSoon=()=>{
 if(reloadQueued)return;
 reloadQueued=true;
 const tryReload=()=>{
  if(busy()){setTimeout(tryReload,1500);return}
  if(updateLabel){updateLabel.textContent='✓ Application mise à jour';updateLabel.hidden=false;}
  window.location.reload();
 };
 setTimeout(tryReload,850);
};
function installHelp(){
 if(standalone())return 'ANOMALIA’Z est déjà installée sur cet appareil.';
 if(isiOS())return 'iPhone / iPad : ouvre ce site dans Safari, touche Partager puis « Sur l’écran d’accueil ».';
 return 'Sur PC : utilise le menu de Chrome ou Edge → « Installer cette application ». Sur Android : menu du navigateur → « Installer l’application ».';
}
window.addEventListener('beforeinstallprompt',event=>{
 event.preventDefault();installPrompt=event;
 if(installButton)installButton.hidden=false;
});
window.addEventListener('appinstalled',()=>{
 installPrompt=null;
 if(installButton){installButton.textContent='✓ INSTALLÉE';installButton.disabled=true;}
});
if(installButton){
 installButton.hidden=standalone();
 installButton.addEventListener('click',async()=>{
  if(installPrompt){
   const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;return;
  }
  alert(installHelp());
 });
}
if('serviceWorker' in navigator && window.isSecureContext){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(hasControl)updateSoon();
  else hasControl=true;
 });
 window.addEventListener('load',async()=>{
  try{
   registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});
   // No forced page reload on first PWA installation, only on subsequent updates.
   hasControl=Boolean(navigator.serviceWorker.controller);
   const check=()=>registration?.update().catch(err=>console.warn('PWA update:',err));
   document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
   window.addEventListener('focus',check);
   setInterval(check,30*60*1000);
  }catch(err){console.warn('PWA installation not available:',err);}
 });
}
