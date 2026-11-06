const state={
 catalog:null,session:null,status:null,game:null,overview:null,records:[],module:'overview',
 search:'',filter:'',loading:false
};
const $=s=>document.querySelector(s);
const html=(value='')=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const sym={
 overview:'◈',servers:'▣',status:'◉',announcements:'◀',alerts:'⚠',logs:'≡',
 maps:'◱',locations:'⌖',bunkers:'⬡',radio:'⌁',loot:'◫',creatures:'♞',vehicles:'▰',weather:'☁',events:'⌁',
 whitelist:'⛨',players:'♧',factions:'⚑',rp:'♜',jobs:'⚒',economy:'◈',shop:'◆',deliveries:'➟',battlepass:'★',quests:'❖',
 tickets:'▤',moderation:'⛨',automod:'⚙',welcome:'✦',autoroles:'♙',verification:'✓',levels:'▥',giveaways:'♢',polls:'☷',social:'◎',stats:'▤',
 editor:'⬡',tools:'⚒',assets:'◈',builds:'⑂',integrations:'⇆',settings:'⚙'
};
const number=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const dateString=x=>{if(!x)return '—';try{return new Date(x).toLocaleString('fr-FR')}catch{return String(x)}};
const current=()=>state.module;
const authed=()=>Boolean(state.session?.authenticated&&state.session.guildId);
const repoUrl='https://github.com/znationcmd/ANOMALIA-PRIMEVAL-OUTBOUNDUN';
const title=id=>state.catalog?.modules?.[id]?.label||id;
function link(id,label,cls=''){return `<a class="button ${cls||'secondary'}" href="#${html(id)}">${html(label)}</a>`}
function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4800)}
async function api(path,opts={}){
 const headers={...(opts.headers||{})};
 if(opts.body&&typeof opts.body!=='string')opts.body=JSON.stringify(opts.body);
 if(opts.body)headers['Content-Type']='application/json';
 if(opts.method&&opts.method!=='GET'&&state.session?.csrf)headers['X-CSRF-Token']=state.session.csrf;
 const res=await fetch(path,{credentials:'same-origin',...opts,headers,cache:'no-store'});
 let data={};
 try{data=await res.json()}catch{}
 if(!res.ok)throw new Error(data.error||'Erreur réseau : '+res.status);
 return data;
}
function renderNavigation(){
 const nav=$('#navigation'),term=String($('#navSearch')?.value||'').trim().toLowerCase();
 if(!state.catalog)return;
 nav.innerHTML=state.catalog.groups.map(group=>{
  const modules=group.modules.filter(id=>title(id).toLowerCase().includes(term));
  if(!modules.length)return '';
  return `<div class="nav-title">${html(group.title)}</div>`+modules.map(id=>`<a class="nav-link ${id===state.module?'active':''}" href="#${html(id)}" data-menu="${html(id)}"><span class="nav-symbol">${sym[id]||'•'}</span><span>${html(title(id))}</span><span class="nav-arrow">›</span></a>`).join('');
 }).join('');
}
function renderUser(){
 const u=$('#userLabel');
 if(state.session?.authenticated){
  u.textContent=state.session.user.username;
  $('#userBadge').title='Déconnexion de '+state.session.user.username;
 }else{
  u.textContent='Se connecter';
  $('#userBadge').title='Connexion Discord';
 }
 $('#connectionLight').className='live-light'+(state.status?.discordConnected?' ok':' warn');
 $('#connectionLabel').textContent=state.status?.discordConnected?'DISCORD CONNECTÉ':'BOT DÉCONNECTÉ';
 $('#footerState').textContent=state.status?.storage==='postgres'?'BASE POSTGRES':'STOCKAGE LOCAL';
}
function metric(label,value,foot,symbol){return `<article class="metric"><div class="metric-top"><span>${html(label)}</span><span class="metric-symbol">${sym[symbol]||'◈'}</span></div><div class="metric-value">${html(value)}</div><div class="metric-foot">${html(foot)}</div></article>`}
function noticeForLogin(){
 if(authed())return '';
 const config=state.session?.config||{};
 return `<div class="notice info">🔒 Le Dashboard est en lecture seule tant qu’un administrateur ne s’est pas connecté avec Discord.
 ${!config.ready?'<strong>Configuration OAuth2 manquante :</strong> '+html((config.missing||[]).join(', '))+'.':''}
 ${config.ready?'<a href="/api/auth/start" class="button small primary">Connexion Discord</a>':'L’activation de la connexion nécessite une variable Railway DISCORD_CLIENT_SECRET et l’URL de redirection OAuth2.'}</div>`;
}
function overview(){
 const counts=state.overview?.counts||{},players=counts.players||0,whitelist=counts.whitelist||0,
 requests=state.overview?.counts?state.overview.counts.whitelist:0,quests=counts.quests||0;
 const cards=['editor','tools','whitelist','loot','shop','battlepass','rp','bunkers','radio','maps','servers','integrations'];
 return `<section class="hero hero-cinematic" aria-label="Monde ANOMALIA’Z PRIGIMALIA">
  <div class="hero-content">
   <div class="microtag">● LE MONDE D’ANOMALIA’Z · CMD STUDIO</div>
   <div class="hero-action-box"><h1>CENTRE <span>DE COMMANDE</span></h1>
   <p>Survivants, RP, cartes, boutique et outils de création.</p>
   <div class="hero-actions">${link('editor','◈ ANOMALIA Éditor','primary')}${link('tools','⚒ ANOMALIA Tools','outline')}</div></div>
  </div></section>
  ${noticeForLogin()}
  <div class="grid metric-grid">${metric('Bot Discord',state.status?.discordConnected?'ACTIF':'OFFLINE','État réel de la connexion','status')}
   ${metric('Survivants',players,'Comptes enregistrés','players')}${metric('Whitelist',requests,'Demandes administratives','whitelist')}
   ${metric('Missions RP',quests,'Quêtes configurées','quests')}</div>
  <div class="section-head"><h2>◈ CENTRE DE COMMANDE</h2><span>${cards.length} modules essentiels</span></div>
  <div class="card-grid">${cards.map(id=>`<a class="feature-card" href="#${html(id)}"><span class="feature-icon">${sym[id]||'◈'}</span><h3>${html(title(id))}</h3><p>${html(state.catalog.modules[id]?.description||'')}</p><span class="feature-link">ACCÉDER AU MODULE →</span></a>`).join('')}</div>
  <div class="section-head"><h2>ÉTAT DES INTÉGRATIONS</h2><span>Contrôle de production</span></div>
  <div class="two-col"><div class="card"><h3>◉ Réseau et données</h3><div class="details-list">
   ${infoLine('Bot Discord',state.status?.discordConnected?'Connecté':'Non connecté')}
   ${infoLine('Base',state.status?.storage==='postgres'?'PostgreSQL persistant':'Fichier local (Railway éphémère)')}
   ${infoLine('Authentification',state.status?.oauth?'OAuth Discord configuré':'Configuration nécessaire')}
   ${infoLine('Événements Unreal',state.overview?.gameConnection||'Aucun bridge ANOMALIA connecté')}
   ${infoLine('Code du jeu','Dépôt GitHub séparé')}
   </div></div><div class="card"><h3>📡 Derniers événements du jeu</h3>
    ${state.overview?.events?.length?state.overview.events.slice(0,5).map(e=>`<div class="info-line"><span>${html(e.type)}</span><strong>${html(dateString(e.at))}</strong></div>`).join(''):'<div class="empty"><span class="emoj">◌</span><strong>Aucun signal de jeu reçu</strong><p>La connexion avec le serveur Unreal Engine nécessite un bridge sécurisé.</p></div>'}
   </div></div>`;
}
function infoLine(k,v){return `<div class="info-line"><span>${html(k)}</span><strong>${html(v)}</strong></div>`}
function heading(id){
 const m=state.catalog.modules[id];
 return `<div class="module-head"><div><p class="section-overline">${html((state.catalog.groups.find(g=>g.id===m.group)||{}).title||'CMD STUDIO')} · ANOMALIA’Z</p>
 <h1 class="display-title"><span class="module-icon">${sym[id]||'◈'}</span> ${html(m.label)}</h1>
 <p class="subtitle">${html(m.description)}. Configuration des données liées à ce serveur Discord.</p></div>
 <span class="tag">MODULE ${html(id.toUpperCase())}</span></div>`;
}
function sectionToolbar(id){
 return `<div class="toolbar"><span class="tag">${state.records.length} ENREGISTREMENTS</span><span class="spacer"></span>
 <input class="input" type="search" id="tableSearch" placeholder="Filtrer les entrées..." value="${html(state.filter)}">
 <button class="button primary" data-create="${html(id)}" ${authed()?'':'disabled'}>＋ Ajouter</button></div>`;
}
function valuesTable(id,rows=state.records){
 const fields=(state.catalog.fields[id]||[]).slice(0,5);
 const term=state.filter.toLowerCase();
 const shown=rows.filter(r=>!term||JSON.stringify(r).toLowerCase().includes(term));
 if(!shown.length)return `<div class="empty"><span class="emoj">${sym[id]||'◈'}</span><strong>${term?'Aucun résultat':'Aucun enregistrement pour le moment'}</strong><p>${authed()?'Crée la première entrée pour configurer ce module.':'Connecte-toi avec Discord pour administrer ce module.'}</p></div>`;
 return `<div class="table-wrap"><table class="data-table"><thead><tr>${fields.map(f=>`<th>${html(f.label)}</th>`).join('')}<th>Mis à jour</th><th>Actions</th></tr></thead><tbody>
 ${shown.slice(0,160).map(record=>`<tr>${fields.map(f=>`<td class="${String(record[f.name]||'').length>50?'wraptext':''}">${formatValue(record[f.name])}</td>`).join('')}
 <td class="muted">${html(dateString(record.updatedAt||record.createdAt))}</td><td><div class="table-actions">
 <button data-edit="${html(record.id)}" ${authed()?'':'disabled'}>Modifier</button><button data-delete="${html(record.id)}" ${authed()?'':'disabled'}>Supprimer</button>
 ${id==='whitelist'&&record.status==='pending'?`<button data-approve="${html(record.id)}">✓ Valider</button>`:''}
 </div></td></tr>`).join('')}</tbody></table></div>`;
}
function formatValue(value){
 if(value===undefined||value===null||value==='')return '<span style="opacity:.4">—</span>';
 if(typeof value==='number')return html(value.toLocaleString('fr-FR'));
 const v=String(value);
 if(['pending','open','draft','unverified'].includes(v))return `<span class="pill warn">${html(v)}</span>`;
 if(['approved','active','fulfilled','online','published','released'].includes(v))return `<span class="pill good">${html(v)}</span>`;
 return html(v.length>115?v.slice(0,112)+'…':v);
}
function modulePage(id){
 const fields=state.catalog.fields[id]||[];
 return heading(id)+noticeForLogin()+`<div class="card">${sectionToolbar(id)}<div style="height:16px"></div>${valuesTable(id)}</div>
 ${id==='shop'?'<div class="notice">Les achats effectués dans Discord sont ajoutés aux livraisons en attente. Ils ne génèrent aucun objet directement dans Unreal Engine sans bridge de livraison.</div>':''}
 ${id==='whitelist'?'<div class="notice">Valider une demande modifie le statut dans le Dashboard. L’admission réelle dans ANOMALIA nécessite la connexion du système de whitelist du serveur de jeu.</div>':''}
 ${id==='builds'?'<div class="notice info">Pour lancer une compilation réelle d’Unreal, utilise le dépôt GitHub du jeu et ses workflows, pas un changement de statut de cette liste.</div>':''}`;
}
function editorPage(){
 return heading('editor')+noticeForLogin()+
 `<div class="two-col"><div class="card"><p class="section-overline">ÉDITEUR DE CONFIGURATION</p><h2>Construire l’univers</h2>
 <p>Prépare les modifications de cartes, assets, routes et bunkers. Le véritable ANOMALIA Éditor UE5 se lance sur le PC où le projet Unreal est installé, pas dans ce navigateur.</p>
 <div class="details-list">
  ${infoLine('Projet Unreal','ANOMALIA’Z PRIGIMALIA')}${infoLine('Répertoire de travail','D:\\ANOMALIA (sur ton PC)')}${infoLine('Mode','Brouillons et export JSON')}
 </div><div class="hero-actions">
  <a class="button primary" target="_blank" rel="noopener noreferrer" href="${repoUrl}/blob/main/src/map-editor.js">↗ ANOMALIA Map Editor (code)</a>
  <a class="button secondary" target="_blank" rel="noopener noreferrer" href="${repoUrl}/tree/main/unreal">↗ Projet Unreal Engine</a>
  ${authed()?'<a class="button outline" href="/api/editor/export" download>↓ Exporter la configuration</a>':''}
 </div></div>
 <div class="card"><p class="section-overline">MODULE D’ÉDITION</p><h2>Demandes de modifications</h2><p>Créer des tâches pour les cartes et modèles 3D, puis les exporter pour le pipeline du jeu.</p>
 <div class="hero-actions"><button class="button primary" data-create="editor" ${authed()?'':'disabled'}>＋ Nouvelle modification</button>${link('maps','Cartes et régions','secondary')}${link('assets','Bibliothèque 3D','secondary')}</div>
 <div class="notice info">L’éditeur Web ne modifie pas automatiquement les fichiers du PC ou les cartes UE5.</div></div></div>
 <div class="section-head"><h2>◈ MODIFICATIONS ENREGISTRÉES</h2></div><div class="card">${sectionToolbar('editor')}<div style="height:16px"></div>${valuesTable('editor')}</div>`;
}
function toolsPage(){
 return heading('tools')+noticeForLogin()+
 `<div class="two-col"><div class="card"><p class="section-overline">VALIDATION · ANOMALIA TOOLS</p><h2>Vérifier un fichier JSON</h2>
 <p>Colle une configuration et vérifie sa syntaxe sans toucher à la version du jeu.</p>
 <textarea id="jsonTool" class="input" rows="11" spellcheck="false" placeholder='{"map":"SKARVIK","lootMultiplier":2}'></textarea>
 <div class="hero-actions"><button class="button primary" data-validate ${authed()?'':'disabled'}>◈ Valider le JSON</button><a class="button secondary" target="_blank" rel="noopener noreferrer" href="${repoUrl}/tree/main/scripts">↗ Scripts ANOMALIA</a></div><pre class="terminal" id="toolResult">En attente d’un document…</pre></div>
 <div class="card"><p class="section-overline">CMD STUDIO</p><h2>Accès aux outils de production</h2>
 ${infoLine('ANOMALIA Éditor','Configuration et cartes')}${infoLine('ANOMALIA Tools','Tests, vérification JSON')}${infoLine('Dépôt du vrai jeu','GitHub ANOMALIA')}${infoLine('Imports et modèles','Gestion via le projet Unreal')}
 <div class="hero-actions">${link('editor','Ouvrir Éditor','primary')}${link('loot','Loot','secondary')}${link('builds','Builds','secondary')}</div>
 <div class="notice">Le Dashboard ne donne pas d’accès à distance à D:\\ANOMALIA tant qu’aucun agent sécurisé autorisé n’est connecté.</div>
 </div></div><div class="section-head"><h2>HISTORIQUE DES DIAGNOSTICS</h2></div><div class="card">${sectionToolbar('tools')}<div style="height:16px"></div>${valuesTable('tools')}</div>`;
}
function bunkersPage(){
 const rows=state.game?.bunkers||[],labels={key:'🔑 Clé',card:'💳 Carte perforée',morse:'📡 Morse'};
 return heading('bunkers')+noticeForLogin()+
 `<div class="grid metric-grid">${metric('Bunkers prévus',rows.length,'Catalogue du prototype','bunkers')}${metric('À clé',rows.filter(x=>x.access==='key').length,'Clés cachées dans le monde','whitelist')}${metric('À carte',rows.filter(x=>x.access==='card').length,'Cartes perforées de niveau','assets')}${metric('Radio Morse',rows.filter(x=>x.access==='morse').length,'Codes tournants nocturnes','radio')}</div>
 <div class="notice info">Ces coordonnées décrivent le prototype ANOMALIA. Elles ne sont pas une lecture en direct des cartes UE5. Les bâtiments comprennent aussi des zones civiles, industrielles et médicales.</div>
 <div class="card"><h2>⬡ Réseau de bunkers ANOMALIA</h2><div class="table-wrap"><table class="data-table"><thead><tr><th>Site</th><th>Bâtiment</th><th>Accès</th><th>Grille</th><th>Coordonnées</th></tr></thead><tbody>
 ${rows.map(b=>`<tr><td>${html(b.name)}</td><td>${html(b.building)}</td><td><span class="pill">${labels[b.access]}</span></td><td>${html(b.grid)}</td><td>${html(b.x)} / ${html(b.z)}</td></tr>`).join('')}</tbody></table></div></div>
 <div class="section-head"><h2>BUNKERS PERSONNALISÉS</h2><span>Administration RP et scénarios</span></div><div class="card">${sectionToolbar('bunkers')}<div style="height:16px"></div>${valuesTable('bunkers')}</div>`;
}
function radioPage(){
 return heading('radio')+noticeForLogin()+
 `<div class="two-col"><div class="card"><p class="section-overline">CANAL 80.0 MHz · CODE DES ANTENNES</p><h2>Décodeur Morse</h2>
 <p>Saisis dix chiffres ou dix groupes Morse séparés par des espaces. Le bot traduit la grille du bunker et le code entendu.</p>
 <textarea id="morseSignal" class="input" rows="4" spellcheck="false" placeholder=".---- ----- ----- .---- ..--- .---- ----- ....- ---.. .----"></textarea>
 <div class="hero-actions"><button class="button primary" data-decode>⌁ Décoder le signal</button><button class="button secondary" data-sample-morse>Essai : Morse d’entraînement</button></div>
 <pre class="radio-morse" id="morseResult">- - - / . . .</pre>
 <div class="notice">Un décodeur manuel n’est pas un récepteur audio du serveur. Les codes ne seront réels qu’après émission du jeu par un bridge/récepteur connecté.</div></div>
 <div class="card"><p class="section-overline">ANTENNES ET RELAIS</p><h2>Réseau de transmissions</h2>
 ${(state.game?.antennas||[]).map(a=>infoLine(a.name,'X '+a.x+' · Z '+a.z)).join('')}
 </div></div><div class="section-head"><h2>TRANSMISSIONS CONFIGURÉES</h2></div><div class="card">${sectionToolbar('radio')}<div style="height:16px"></div>${valuesTable('radio')}</div>`;
}
function settingsPage(){
 const cfg=state.overview?.settings||{};
 const inputs=[['name','Nom du serveur'],['accent','Couleur hexadécimale'],['whitelistRoleId','Rôle whitelist (ID Discord)'],['announcementChannelId','Salon annonces (ID Discord)'],['logsChannelId','Salon logs (ID Discord)'],['welcomeChannelId','Salon bienvenue (ID Discord)']];
 return heading('settings')+noticeForLogin()+`<div class="two-col"><div class="card"><h2>⚙ Personnalisation Discord</h2><form id="settingsForm" class="form-fields">
 ${inputs.map(([key,label])=>`<div class="field"><label for="settings-${key}">${label}</label><input id="settings-${key}" name="${key}" value="${html(cfg[key]||'')}" ${authed()?'':'disabled'}></div>`).join('')}
 <div class="field full"><button class="button primary" type="submit" ${authed()?'':'disabled'}>Enregistrer les réglages</button></div></form></div>
 <div class="card"><h2>🔒 Sécurité et liaison</h2>
 ${infoLine('Authentification',state.status?.oauth?'Discord OAuth2':'Non configurée')}
 ${infoLine('Stockage',state.status?.storage||'inconnu')}
 ${infoLine('Bot Discord',state.status?.discordConnected?'Connecté':'Déconnecté')}
 ${infoLine('Bridge du vrai jeu',state.status?.gameBridgeConfigured?'Prêt à recevoir des événements':'Non configuré')}
 <div class="notice">Les jetons privés (Discord, OAuth, bridge) se définissent dans Railway. Ils ne s’enregistrent jamais dans cette page.</div>
 </div></div>`;
}
function integrationsPage(){
 return heading('integrations')+noticeForLogin()+`<div class="two-col">
 <div class="card"><h2>⚡ Jeu Unreal Engine 5</h2>
 ${infoLine('Code du projet',repoUrl)}${infoLine('État du bridge',state.status?.gameBridgeConfigured?'Jeton configuré':'Aucun jeton GAME_BRIDGE_SECRET')}
 ${infoLine('Dernière télémétrie',state.overview?.gameConnection||'Aucune')}
 <p>Pour synchroniser joueurs, cartes, inventaires et événements, il faut un composant serveur UE5 qui émette des événements signés. Les modules du Dashboard fonctionnent actuellement comme des configurations administratives.</p>
 <a href="${repoUrl}" target="_blank" rel="noopener noreferrer" class="button primary">↗ Ouvrir le jeu sur GitHub</a></div>
 <div class="card"><h2>📡 Discord & services</h2>
 ${infoLine('Bot',state.status?.discordConnected?'En ligne':'Hors ligne')}${infoLine('Dashboard','Cette application')}${infoLine('Comptes liés',state.session?.guilds?.length||0)}
 <p>Le bot et le Dashboard utilisent les mêmes collections propres à chaque Discord. Le stockage PostgreSQL est recommandé pour conserver les achats, whitelist et joueurs après les redéploiements Railway.</p>
 </div></div><div class="section-head"><h2>CONNECTEURS PERSONNALISÉS</h2></div><div class="card">${sectionToolbar('integrations')}<div style="height:16px"></div>${valuesTable('integrations')}</div>`;
}
function render(){
 if(!state.catalog)return;
 const id=state.catalog.modules[state.module]?state.module:'overview';state.module=id;
 $('#crumb').textContent=title(id).toUpperCase();
 renderNavigation();renderUser();
 let page;
 if(id==='overview')page=overview();
 else if(id==='editor')page=editorPage();
 else if(id==='tools')page=toolsPage();
 else if(id==='bunkers')page=bunkersPage();
 else if(id==='radio')page=radioPage();
 else if(id==='settings')page=settingsPage();
 else if(id==='integrations')page=integrationsPage();
 else page=modulePage(id);
 const guilds=state.session?.guilds||[];
 const selector=authed()&&guilds.length>1?`<div class="toolbar" style="margin-bottom:18px"><label class="subline" for="guildSelect">Serveur Discord :</label><select class="input" id="guildSelect" style="width:auto;max-width:330px">
  ${guilds.map(g=>`<option value="${html(g.id)}" ${g.id===state.session.guildId?'selected':''}>${html(g.name)}</option>`).join('')}</select></div>`:'';
 $('#main').innerHTML=selector+page;
 $('#sidebar').classList.remove('open');
}
async function loadOverview(){
 if(!authed()){state.overview=null;return}
 state.overview=await api('/api/overview');
}
async function loadRecords(id){
 if(!authed()||!state.catalog?.modules[id]){state.records=[];return}
 if(!['overview','status'].includes(id)){
  const result=await api('/api/modules/'+encodeURIComponent(id));
  state.records=result.records||[];
 }else state.records=[];
}
async function navigate(){
 const id=decodeURIComponent(location.hash.slice(1))||'overview';
 state.module=state.catalog.modules[id]?id:'overview';state.filter='';
 try{await Promise.all([loadOverview(),loadRecords(state.module)])}catch(e){toast(e.message);state.records=[]}
 render();$('#main').focus({preventScroll:true});
}
function openModal(moduleId,record){
 if(!authed())return toast('Connexion administrateur Discord requise.');
 const fields=state.catalog.fields[moduleId]||[];
 $('#modalTitle').textContent=(record?'Modifier':'Ajouter')+' · '+title(moduleId);
 const form=$('#recordForm');form.dataset.section=moduleId;form.dataset.id=record?.id||'';
 $('#formFields').innerHTML=fields.map(f=>{
  const v=record?.[f.name]??'',big=f.max&&f.max>400;
  const input=f.type==='select'? `<select name="${html(f.name)}"><option value="">Sélectionner...</option>${f.choices.map(c=>`<option value="${html(c)}" ${v===c?'selected':''}>${html(c)}</option>`).join('')}</select>`
   :big?`<textarea name="${html(f.name)}" maxlength="${f.max||1600}">${html(v)}</textarea>`
   :`<input type="${f.type==='number'?'number':'text'}" name="${html(f.name)}" value="${html(v)}" ${f.min!==undefined?'min="'+f.min+'"':''} ${f.max!==undefined&&f.type==='number'?'max="'+f.max+'"':''} ${f.max&&f.type!=='number'?'maxlength="'+f.max+'"':''}>`;
  return `<div class="field ${big?'full':''}"><label>${html(f.label)}</label>${input}</div>`;
 }).join('');
 $('#modal').hidden=false;
 setTimeout(()=>$('#modal input,#modal select')?.focus(),50);
}
function closeModal(){$('#modal').hidden=true}
async function submitModal(event){
 event.preventDefault();const form=event.currentTarget,section=form.dataset.section,id=form.dataset.id;
 const values=Object.fromEntries([...new FormData(form).entries()].filter(([,v])=>String(v).trim()));
 try{
  if(id)await api('/api/modules/'+section+'/'+id,{method:'PATCH',body:values});
  else await api('/api/modules/'+section,{method:'POST',body:values});
  closeModal();toast('✓ '+title(section)+' enregistré.');await loadRecords(section);await loadOverview();render();
 }catch(e){toast('Erreur : '+e.message)}
}
async function deleteRow(id){
 if(!authed())return;
 if(!confirm('Supprimer cet enregistrement définitivement ?'))return;
 try{await api('/api/modules/'+state.module+'/'+id,{method:'DELETE'});toast('Entrée supprimée.');await loadRecords(state.module);await loadOverview();render()}catch(e){toast(e.message)}
}
async function approve(id){
 const r=state.records.find(x=>x.id===id);if(!r)return;
 try{await api('/api/modules/whitelist/'+id,{method:'PATCH',body:{status:'approved'}});toast('Whitelist approuvée dans le Dashboard — pas encore transmise au jeu.');await loadRecords('whitelist');render()}catch(e){toast(e.message)}
}
async function decodeSignal(){
 const raw=$('#morseSignal')?.value||'';
 try{
  const v=await api('/api/morse/decode',{method:'POST',body:{signal:raw}});
  $('#morseResult').textContent='GRILLE '+v.grid+' / CODE '+v.code+'\n'+(v.bunker?v.bunker.name:'Bunker inconnu')+'\n⚠ Signal saisi manuellement, non vérifié en jeu.';
 }catch(e){$('#morseResult').textContent=e.message}
}
function bind(){
 $('#navSearch').addEventListener('input',renderNavigation);
 $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
 $('#refreshBtn').addEventListener('click',async()=>{try{state.status=await api('/api/status');await navigate();toast('Données actualisées.')}catch(e){toast(e.message)}});
 $('#closeModal').addEventListener('click',closeModal);$('#cancelModal').addEventListener('click',closeModal);
 $('#modal').addEventListener('click',event=>{if(event.target.id==='modal')closeModal()});
 $('#recordForm').addEventListener('submit',submitModal);
 $('#userBadge').addEventListener('click',async()=>{
  if(!authed())return location.assign('/api/auth/start');
  if(!confirm('Se déconnecter du Dashboard ANOMALIA ?'))return;
  try{await api('/api/logout',{method:'POST',body:{}});location.reload()}catch(e){toast(e.message)}
 });
 $('#main').addEventListener('input',e=>{if(e.target.id==='tableSearch'){state.filter=e.target.value;const parent=e.target.closest('.card');const prev=parent.querySelector('.table-wrap, .empty');if(prev)prev.outerHTML=valuesTable(state.module)}}); 
 $('#main').addEventListener('change',async e=>{if(e.target.id==='guildSelect'){
  try{await api('/api/select-guild',{method:'POST',body:{guildId:e.target.value}});state.session.guildId=e.target.value;await navigate()}catch(err){toast(err.message)}
 }});
 $('#main').addEventListener('submit',async e=>{
  if(e.target.id!=='settingsForm')return;
  e.preventDefault();
  try{const val=Object.fromEntries(new FormData(e.target).entries());await api('/api/settings',{method:'PUT',body:val});toast('Réglages mis à jour.');await loadOverview()}catch(err){toast(err.message)}
 });
 document.addEventListener('click',async e=>{
  const el=e.target.closest('button,[data-jump]');if(!el)return;
  if(el.dataset.jump){location.hash='#'+el.dataset.jump;return}
  if(el.dataset.create){openModal(el.dataset.create,null);return}
  if(el.dataset.edit){openModal(state.module,state.records.find(r=>r.id===el.dataset.edit));return}
  if(el.dataset.delete){await deleteRow(el.dataset.delete);return}
  if(el.dataset.approve){await approve(el.dataset.approve);return}
  if('decode' in el.dataset){await decodeSignal();return}
  if('sampleMorse' in el.dataset){
   $('#morseSignal').value='.---- ----- ----- .---- ..--- .---- ----- ....- ---.. .----';
   await decodeSignal();return;
  }
  if('validate' in el.dataset){
   const raw=$('#jsonTool').value;try{const r=await api('/api/tools/validate',{method:'POST',body:{document:raw}});$('#toolResult').textContent=JSON.stringify(r,null,2)}
   catch(err){$('#toolResult').textContent='ERREUR : '+err.message}return;
  }
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#sidebar').classList.remove('open');closeModal()}});
 window.addEventListener('hashchange',navigate);
 const updateClock=()=>$('#clock').textContent=new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
 updateClock();setInterval(updateClock,30000);
}
async function bootstrap(){
 try{
  const [catalog,status,session,game]=await Promise.all([
   api('/api/catalog'),api('/api/status'),api('/api/session'),api('/api/game-data')
  ]);
  Object.assign(state,{catalog,status,session,game});bind();await navigate();
  const auth=URLSearchParams?new URLSearchParams(location.search).get('auth'):null;
  if(auth)toast('Connexion Discord : '+auth);
 }catch(e){$('#main').innerHTML='<div class="login-card"><img class="login-logo" src="/media/anomaliaz-icon-192.webp" alt=""><h1>ANOMALIA’Z PRIGIMALIA</h1><p>Dashboard temporairement indisponible : '+html(e.message)+'</p><button class="button primary" onclick="location.reload()">Réessayer</button></div>'}
}

// Responsive tactile feedback: keyboard, mouse and touch all illuminate controls.
function energize(target){
 if(!target||target.disabled||target.getAttribute('aria-disabled')==='true')return;
 target.classList.remove('is-energized');
 void target.offsetWidth;
 target.classList.add('is-energized');
 setTimeout(()=>target.classList.remove('is-energized'),680);
}
document.addEventListener('pointerdown',event=>{
 const button=event.target.closest('.button,.nav-link,.feature-card,.icon-button,.mobile-menu,.table-actions button,.studio-prompt button');
 if(button)energize(button);
},true);
document.addEventListener('keydown',event=>{
 if(event.key!=='Enter'&&event.key!==' ')return;
 const target=event.target.closest('.button,.nav-link,.feature-card,.icon-button,.mobile-menu,.table-actions button,.studio-prompt button');
 if(target)energize(target);
},true);

bootstrap();
