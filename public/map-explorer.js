// ANOMALIA'Z interactive atlas. No proprietary map tiles or fabricated spawns.
// Supports mouse wheel, drag, iOS/Android two-finger pinch and keyboard zoom.
const $=(root,selector)=>root.querySelector(selector);
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=type=>({item:'Objet',vehicle:'Véhicule',location:'Lieu'}[type]||type);
const normalize=v=>String(v||'').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const WORLD=1000;

export async function mountMapExplorer(root,fetcher){
 if(!root||!root.isConnected)return;
 const catalog=$ (root,'#atlasCatalog'),family=$ (root,'#atlasFamily'),catalogSearch=$ (root,'#atlasCatalogSearch');
 const picker=$ (root,'#atlasMapSelect'),viewer=$ (root,'#atlasViewer'),scene=$ (root,'#atlasScene');
 const base=$ (root,'#atlasBase'),zoneLayer=$ (root,'#atlasZones'),markers=$ (root,'#atlasMarkers');
 const results=$ (root,'#atlasResults'),title=$ (root,'#atlasTitle'),status=$ (root,'#atlasStatus');
 const search=$ (root,'#atlasSearch'),category=$ (root,'#atlasMarkerType'),tier=$ (root,'#atlasTier');
 const showZones=$ (root,'#atlasShowZones'),coordinates=$ (root,'#atlasCoordinates'),reference=$ (root,'#atlasReference');
 const detail=$ (root,'#atlasDetail'),count=$ (root,'#atlasCount');
 let maps=[],features=[],active=null,scale=1,fit=1,tx=0,ty=0,expanded=false;
 let pointerState=new Map(),pinchDistance=0,pinchScale=1,pinchWorld=null,dragged=false;
 let destroyed=false,resizeObserver=null;
 const setDetail=message=>{detail.textContent=message};
 const camera=()=>{scene.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';$ (root,'#atlasZoomValue').textContent=Math.round(scale/Math.max(fit,0.01)*100)+' %'};
 const limits=()=>{
  const w=viewer.clientWidth,h=viewer.clientHeight,s=WORLD*scale;
  const margin=Math.min(140,Math.min(w,h)*.28);
  if(s<=w)tx=(w-s)/2;else tx=clamp(tx,w-s-margin,margin);
  if(s<=h)ty=(h-s)/2;else ty=clamp(ty,h-s-margin,margin);
 };
 const reset=()=>{
  if(!active)return;
  const w=viewer.clientWidth||600,h=viewer.clientHeight||460;
  fit=Math.min(w/WORLD,h/WORLD);
  scale=fit;tx=(w-WORLD*scale)/2;ty=(h-WORLD*scale)/2;camera();
 };
 const zoomAt=(factor,x,y)=>{
  if(!active)return;
  const next=clamp(scale*factor,fit*.75,fit*16);
  const worldX=(x-tx)/scale,worldY=(y-ty)/scale;
  tx=x-worldX*next;ty=y-worldY*next;scale=next;limits();camera();
 };
 const toWorld=(clientX,clientY)=>{
  const rect=viewer.getBoundingClientRect();
  const x=(clientX-rect.left-tx)/scale,z=(clientY-rect.top-ty)/scale;
  return {x:clamp(x/WORLD,0,1),z:clamp(z/WORLD,0,1)};
 };
 const mapCoordinates=(world)=>({x:Math.round(world.x*(active?.width||WORLD)),z:Math.round(world.z*(active?.height||WORLD))});
 function renderCatalog(){
  const q=normalize(catalogSearch.value),group=family.value;
  const visible=maps.filter(m=>(group==='all'||m.family===group)&&(normalize(m.name).includes(q)||normalize(m.family).includes(q)));
  catalog.innerHTML=visible.length?visible.map(m=>'<button type="button" class="atlas-map-card '+(active?.id===m.id?'selected':'')+'" data-atlas-map="'+esc(m.id)+'" aria-pressed="'+String(active?.id===m.id)+'"><span class="atlas-map-thumb" aria-hidden="true">'+(m.configured?'▧':'◇')+'</span><span class="atlas-map-meta"><strong>'+esc(m.name)+'</strong><small>'+esc(m.family)+'</small></span><span class="atlas-map-state">'+(m.configured?'Fond ✓':'À compléter')+'</span></button>').join(''):'<p class="atlas-empty">Aucune carte ne correspond à la recherche.</p>';
 }
 function filtered(){
  if(!active)return[];
  const q=normalize(search.value.trim()),c=category.value,t=tier.value;
  return features.filter(f=>f.mapId===active.id&&(c==='all'||f.category===c)&&(t==='all'||f.tier===t)&&(!q||normalize(f.name+' '+f.detail).includes(q)));
 }
 function placeMarker(f,index){
  const left=100*Number(f.x)/active.width,top=100*Number(f.z)/active.height;
  return '<button type="button" class="atlas-marker kind-'+esc(f.category)+'" data-atlas-feature="'+index+'" style="left:'+left.toFixed(5)+'%;top:'+top.toFixed(5)+'%" title="'+esc(f.name)+'" aria-label="'+esc(label(f.category)+' : '+f.name)+'"><span></span></button>';
 }
 function drawZones(){
  zoneLayer.replaceChildren();
  if(!active||!showZones.checked||!active.width||!active.height)return;
  const tierValue=tier.value;
  for(const z of active.tierZones||[]){
   if(tierValue!=='all'&&z.tier!==tierValue)continue;
   const div=document.createElement('div');
   div.className='atlas-tier-zone tier-'+z.tier;
   div.style.left=(z.x/active.width*100)+'%';
   div.style.top=(z.z/active.height*100)+'%';
   div.style.width=(z.width/active.width*100)+'%';
   div.style.height=(z.height/active.height*100)+'%';
   div.textContent='T'+z.tier.toUpperCase();zoneLayer.appendChild(div);
  }
 }
 function focusFeature(f){
  if(!active||!active.width||!active.height)return;
  const worldX=Number(f.x)/active.width*WORLD,worldY=Number(f.z)/active.height*WORLD;
  scale=Math.max(scale,fit*2);
  tx=viewer.clientWidth/2-worldX*scale;
  ty=viewer.clientHeight/2-worldY*scale;limits();camera();
  setDetail(label(f.category)+' · '+f.name+' — X '+f.x+' / Z '+f.z+(f.tier?' · Tier '+f.tier:'')+(f.detail?' · '+f.detail:''));
 }
 function drawFeatures(){
  if(!active){results.innerHTML='<p class="atlas-empty">Choisis une carte pour afficher ses emplacements.</p>';return}
  const rows=filtered();
  count.textContent=rows.length+' repère'+(rows.length>1?'s':'');
  const capped=rows.slice(0,900);
  markers.innerHTML=capped.map((f,i)=>placeMarker(f,i)).join('');
  if(!rows.length){
   const allForMap=features.some(f=>f.mapId===active.id);
   results.innerHTML='<p class="atlas-empty">'+(allForMap?'Aucun emplacement ne correspond à ces filtres.':'Aucun emplacement vérifié sur cette carte. Les administrateurs peuvent ajouter les objets, véhicules et lieux avec leurs coordonnées.')+'</p>';
  }else{
   results.innerHTML=capped.map((f,i)=>'<button class="atlas-result" data-atlas-feature="'+i+'" type="button"><span class="atlas-result-symbol">'+({item:'◫',vehicle:'▰',location:'⌖'}[f.category]||'•')+'</span><span><strong>'+esc(f.name)+'</strong><small>'+esc(label(f.category))+(f.tier?' · Tier '+esc(f.tier):'')+' · X '+esc(f.x)+' / Z '+esc(f.z)+'</small></span></button>').join('')+(rows.length>900?'<p class="atlas-empty">Affichage limité aux 900 premiers résultats. Affine la recherche.</p>':'');
  }
  drawZones();
  // Expose only current results for marker click handlers.
  viewer._atlasResults=capped;
 }
 function openMap(id,{scroll=false}={}){
  active=maps.find(m=>m.id===id)||null;
  if(!active)return;
  picker.value=active.id;
  title.textContent=active.name;
  status.textContent=active.configured?'Fond disponible':'Fond cartographique à configurer';
  status.dataset.ready=active.configured?'true':'false';
  reference.hidden=!active.referenceUrl;
  if(active.referenceUrl)reference.href=active.referenceUrl;
  base.replaceChildren();
  if(active.imageUrl){
   const img=document.createElement('img');img.src=active.imageUrl;img.alt='Fond de carte : '+active.name;img.decoding='async';img.draggable=false;img.loading='lazy';
   img.addEventListener('error',()=>{if(active?.id!==id)return;base.classList.add('missing-image');status.textContent='Image indisponible — vérifie l’URL et sa licence';});
   base.classList.remove('missing-image');base.appendChild(img);
  }else{
   base.classList.add('missing-image');
   const message=document.createElement('div');message.className='atlas-placeholder';
   message.innerHTML='<strong>Fond cartographique non configuré</strong><span>La grille permet de tester le zoom. Une image géoréférencée et des coordonnées validées sont nécessaires pour afficher la carte réelle.</span>';
   base.appendChild(message);
  }
  setDetail('Pince avec deux doigts ou utilise la molette pour zoomer. Glisse pour déplacer la carte.');
  renderCatalog();drawFeatures();
  requestAnimationFrame(()=>{if(!destroyed&&active?.id===id)reset();if(scroll&&window.matchMedia('(max-width:760px)').matches)viewer.scrollIntoView({behavior:'smooth',block:'start'})});
 }
 const onCatalogClick=e=>{const b=e.target.closest('[data-atlas-map]');if(b)openMap(b.dataset.atlasMap,{scroll:true})};
 const onFeatureClick=e=>{
  const b=e.target.closest('[data-atlas-feature]');if(!b)return;
  const f=viewer._atlasResults?.[Number(b.dataset.atlasFeature)];if(f)focusFeature(f);
 };
 const onPointerDown=e=>{
  if(!active||e.target.closest('.atlas-marker')||e.target.closest('.atlas-view-controls'))return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  viewer.setPointerCapture(e.pointerId);
  pointerState.set(e.pointerId,{x:e.clientX,y:e.clientY});
  dragged=false;
  if(pointerState.size===2){
   const pts=[...pointerState.values()],dx=pts[0].x-pts[1].x,dy=pts[0].y-pts[1].y;
   pinchDistance=Math.hypot(dx,dy)||1;pinchScale=scale;
   const rect=viewer.getBoundingClientRect(),mx=(pts[0].x+pts[1].x)/2-rect.left,my=(pts[0].y+pts[1].y)/2-rect.top;
   pinchWorld={worldX:(mx-tx)/scale,worldY:(my-ty)/scale};
  }
 };
 const onPointerMove=e=>{
  if(!active)return;
  if(pointerState.has(e.pointerId)){
   const prev=pointerState.get(e.pointerId);
   pointerState.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pointerState.size===1){
    tx+=e.clientX-prev.x;ty+=e.clientY-prev.y;limits();camera();dragged=true;
   }else if(pointerState.size===2&&pinchWorld){
    const points=[...pointerState.values()],rect=viewer.getBoundingClientRect();
    const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    const x=(points[0].x+points[1].x)/2-rect.left,y=(points[0].y+points[1].y)/2-rect.top;
    scale=clamp(pinchScale*distance/pinchDistance,fit*.75,fit*16);
    tx=x-pinchWorld.worldX*scale;ty=y-pinchWorld.worldY*scale;limits();camera();dragged=true;
   }
  }
  const pos=mapCoordinates(toWorld(e.clientX,e.clientY));
  coordinates.textContent='X '+pos.x+' · Z '+pos.z;
 };
 const onPointerUp=e=>{
  pointerState.delete(e.pointerId);
  if(pointerState.size<2)pinchWorld=null;
  if(viewer.hasPointerCapture?.(e.pointerId))viewer.releasePointerCapture(e.pointerId);
 };
 const onWheel=e=>{
  if(!active)return;
  e.preventDefault();
  const r=viewer.getBoundingClientRect();
  zoomAt(Math.exp(clamp(-e.deltaY*.002,-.5,.5)),e.clientX-r.left,e.clientY-r.top);
 };
 const onClick=e=>{
  const b=e.target.closest('[data-atlas-action]');
  if(b){const action=b.dataset.atlasAction;
   if(action==='reset')reset();
   if(action==='zoom-in')zoomAt(1.4,viewer.clientWidth/2,viewer.clientHeight/2);
   if(action==='zoom-out')zoomAt(1/1.4,viewer.clientWidth/2,viewer.clientHeight/2);
   if(action==='expand'){
    expanded=!expanded;viewer.classList.toggle('atlas-expanded',expanded);
    document.body.classList.toggle('atlas-lock',expanded);
    b.setAttribute('aria-pressed',String(expanded));b.textContent=expanded?'Fermer':'Plein écran';
    requestAnimationFrame(reset);
   }
  }
  onFeatureClick(e);
 };
 const onKey=e=>{
  if(!active)return;
  if(e.key==='+'||e.key==='='){zoomAt(1.25,viewer.clientWidth/2,viewer.clientHeight/2);e.preventDefault()}
  if(e.key==='-'){zoomAt(.8,viewer.clientWidth/2,viewer.clientHeight/2);e.preventDefault()}
  if(e.key==='Escape'&&expanded){$ (root,'[data-atlas-action="expand"]').click();e.preventDefault()}
 };
 family.addEventListener('change',renderCatalog);catalogSearch.addEventListener('input',renderCatalog);
 picker.addEventListener('change',()=>openMap(picker.value));
 for(const element of [search,category,tier,showZones])element.addEventListener(element===search?'input':'change',drawFeatures);
 catalog.addEventListener('click',onCatalogClick);results.addEventListener('click',onFeatureClick);
 viewer.addEventListener('pointerdown',onPointerDown);viewer.addEventListener('pointermove',onPointerMove);
 viewer.addEventListener('pointerup',onPointerUp);viewer.addEventListener('pointercancel',onPointerUp);
 viewer.addEventListener('lostpointercapture',onPointerUp);
 viewer.addEventListener('wheel',onWheel,{passive:false});
 viewer.addEventListener('click',onClick);viewer.addEventListener('keydown',onKey);
 const onResize=()=>{if(active)reset()};
 if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(onResize);resizeObserver.observe(viewer)}
 else window.addEventListener('resize',onResize);
 const cleanup=()=>{
  destroyed=true;resizeObserver?.disconnect();window.removeEventListener('resize',onResize);
  if(expanded)document.body.classList.remove('atlas-lock');
 };
 // Hook cleanup to the dynamic page lifecycle.
 root._atlasCleanup=cleanup;
 try{
  const data=await fetcher('/api/maps/explorer');
  if(destroyed||!root.isConnected)return;
  maps=Array.isArray(data.maps)?data.maps:[];
  features=Array.isArray(data.features)?data.features:[];
  family.innerHTML='<option value="all">Toutes les collections</option>'+[...new Set(maps.map(m=>m.family))].sort().map(g=>'<option value="'+esc(g)+'">'+esc(g)+'</option>').join('');
  picker.innerHTML='<option value="">Choisir une carte…</option>'+maps.map(m=>'<option value="'+esc(m.id)+'">'+esc(m.name)+' · '+esc(m.family)+'</option>').join('');
  $ (root,'#atlasCatalogCount').textContent=maps.length+' cartes référencées';
  $ (root,'#atlasDataInfo').textContent=data.scope==='guild'?'Données configurées pour votre Discord':'Catalogue public — positions du serveur accessibles après connexion';
  renderCatalog();
  // The viewer is intentionally opened by selecting a card, not by inventing a map background.
  results.innerHTML='<p class="atlas-empty">Choisis une carte dans le catalogue. Les repères apparaissent uniquement lorsqu’ils ont été configurés pour ce Discord.</p>';
 }catch(err){
  if(!destroyed&&root.isConnected){catalog.innerHTML='<p class="atlas-empty">Catalogue momentanément indisponible.</p>';setDetail(err.message||'Erreur de chargement')}
 }
}
