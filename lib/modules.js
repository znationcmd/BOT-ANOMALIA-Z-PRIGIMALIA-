// Domain modules. All configurable records are stored independently per Discord guild.
// Per-guild configurations can optionally be connected to games or external services; none are required.
export const GROUPS = [
 {id:'command', title:'CENTRE DE COMMANDE',modules:['overview','servers','status','announcements','alerts','logs']},
 {id:'world', title:'LE MONDE ANOMALIA',modules:['maps','locations','bunkers','radio','loot','creatures','vehicles','weather','events']},
 {id:'community', title:'SURVIVANTS & COMMUNAUTÉ',modules:['whitelist','players','factions','rp','jobs','economy','shop','deliveries','battlepass','quests']},
 {id:'discord', title:'DISCORD & MODÉRATION',modules:['tickets','moderation','automod','welcome','autoroles','verification','levels','giveaways','polls','social','stats']},
 {id:'studio', title:'CMD STUDIO',modules:['editor','tools','assets','builds','integrations','settings']}
];
const labels = {
 overview:['Tableau de bord','layout-dashboard','Vue d’ensemble des modules et de la communauté'],
 servers:['Serveurs','server','Instances et statut de connexion'],status:['État des services','activity','Suivi des services de la communauté'],announcements:['Annonces','megaphone','Messages à publier'],alerts:['Alertes','siren','Notifications du serveur'],logs:['Journal','scroll-text','Événements du serveur Discord'],
 maps:['Cartes','map','Monde et lieux'],locations:['Villes & points d’intérêt','map-pin','Zones du monde'],bunkers:['Bunkers','key-round','Clés, cartes perforées et codes'],radio:['Radio Morse','radio-tower','Transmissions en provenance du jeu'],loot:['Gestion du loot','package','Objets et quantités'],creatures:['Animaux & dinosaures','paw-print','Bestiaire, compagnons et taming'],vehicles:['Véhicules','car-front','Garages et simulation'],weather:['Météo','cloud','Cycle et environnement'],events:['Événements','calendar-days','Scénarios et événements'],
 whitelist:['Whitelist','shield-check','Admissions à valider'],players:['Joueurs','users','Profils et progression'],factions:['Factions','flag','Groupes des survivants'],rp:['Rôleplay','briefcase-business','Lois, métiers et règles RP'],jobs:['Métiers','hammer','Salaires et emplois'],economy:['Économie','coins','Crédits du serveur'],shop:['Boutique','shopping-cart','Catalogue et achats'],deliveries:['Livraisons','truck','Commandes en attente'],battlepass:['Pass de combat','trophy','Récompenses et paliers'],quests:['Quêtes','scroll','Missions et objectifs'],
 tickets:['Tickets','ticket','Assistance des joueurs'],moderation:['Modération','shield-alert','Actions Discord'],automod:['Auto-modération','bot','Filtres configurables'],welcome:['Bienvenue','hand','Messages de bienvenue'],autoroles:['Rôles automatiques','user-round-check','Rôles attribués aux membres'],verification:['Vérification','badge-check','Accès vérifié'],levels:['Niveaux Discord','chart-no-axes-column','Progression communautaire'],giveaways:['Giveaways','gift','Tirages au sort'],polls:['Sondages','list-check','Votes communautaires'],social:['Réseaux sociaux','share-2','Annonces communautaires'],stats:['Statistiques','chart-line','Activité disponible'],
 editor:['ANOMALIA Éditor','panel-top','Éditeur de configuration du monde'],tools:['ANOMALIA Tools','wrench','Diagnostic, validation, exports'],assets:['Bibliothèque 3D','boxes','Catalogue et références'],builds:['Builds & versions','git-branch','Historique des versions'],integrations:['Intégrations Discord','plug-zap','Connecteurs personnalisés de votre serveur'],settings:['Paramètres','settings','Sécurité et personnalisation']
};
export const MODULES=Object.fromEntries(Object.entries(labels).map(([id,[label,icon,description]])=>[id,{id,label,icon,description,group:GROUPS.find(g=>g.modules.includes(id))?.id}]));
const text=(name,label,max=180)=>({name,label,type:'text',max});
const int=(name,label,min=0,max=1000000)=>({name,label,type:'number',min,max});
const select=(name,label,choices)=>({name,label,type:'select',choices});
export const FIELDS={
 whitelist:[text('playerId','Discord / ID du joueur',100),text('platform','Plateforme (PC / Xbox / PlayStation)',40),text('reason','Motif / présentation',650),select('status','Statut',['pending','approved','rejected']),text('notes','Notes privées',400)],
 announcements:[text('title','Titre',120),text('body','Contenu',2000),text('channelId','Salon Discord cible (ID)',25),select('status','Statut',['draft','published'])],
 alerts:[text('message','Message',500),select('severity','Priorité',['info','warning','critical']),select('status','Statut',['open','resolved'])],
 servers:[text('name','Nom du serveur',120),text('map','Carte',90),text('endpoint','Adresse de connexion',160),select('status','Statut manuel',['unverified','online','offline'])],
 maps:[text('name','Nom de la carte',100),text('size','Dimensions',80),text('description','Description',600),text('repoPath','Chemin de ressource dans le jeu',220)],
 locations:[text('name','Lieu',120),text('map','Carte',100),int('x','Position X',-240000,240000),int('z','Position Z',-240000,240000),text('type','Type de zone',80)],
 bunkers:[text('name','Nom du bunker',120),text('map','Carte',90),select('access','Type d’accès',['key','card','morse']),text('required','Clé ou carte requise (ID)',100),text('grid','Grille (6 chiffres)',6),int('x','X',-240000,240000),int('z','Z',-240000,240000),text('building','Bâtiment',120)],
 radio:[text('frequency','Fréquence (MHz)',30),text('message','Message / Morse',1000),text('source','Source',100),select('status','État',['recorded','decoded','archived'])],
 loot:[text('id','ID objet du jeu',120),text('name','Nom affiché',150),select('rarity','Rareté',['common','uncommon','rare','epic','legendary']),int('quantity','Quantité',0,100000),text('location','Table de loot / zone',120),text('gamePath','Chemin du DataAsset',220)],
 creatures:[text('id','ID créature',120),text('name','Nom',150),select('category','Catégorie',['animal','dinosaur','companion']),text('habitat','Habitat',120),text('taming','Condition de dressage',240)],
 vehicles:[text('id','ID véhicule',120),text('name','Modèle',120),select('category','Catégorie',['car','bike','boat','aircraft','truck']),text('map','Carte',90),text('notes','Notes simulation',450)],
 weather:[text('zone','Zone',120),select('weather','Climat',['clear','rain','snow','storm','sandstorm','fog']),int('duration','Durée secondes',0,86400)],
 events:[text('title','Événement',160),text('startsAt','Début ISO (optionnel)',60),select('status','État',['scheduled','active','completed']),text('description','Description',1000)],
 players:[text('discordId','Discord ID',25),text('nickname','Pseudo du joueur',100),text('platform','Plateforme',40),int('level','Niveau',0,1000),int('xp','Expérience',0,10000000),int('credits','Crédits',0,100000000)],
 factions:[text('name','Nom de faction',120),text('leaderId','Discord du chef',25),text('type','Catégorie',120),text('description','Description',1000)],
 rp:[text('title','Règle ou organisation RP',180),text('category','Catégorie RP',120),text('body','Texte',2000)],
 jobs:[text('name','Métier',140),int('salary','Salaire',0,10000000),text('department','Administration / entreprise',120),text('description','Missions',750)],
 economy:[text('name','Compte / opération',120),int('amount','Montant',0,100000000),text('notes','Motif',400)],
 shop:[text('sku','Référence',100),text('name','Article',150),int('price','Prix en crédits',0,1000000),int('stock','Stock (-1 illimité)',-1,1000000),text('gameItemId','ID d’objet en jeu',140),text('description','Description',600)],
 deliveries:[text('playerId','Discord acheteur',25),text('sku','SKU acheté',100),int('qty','Quantité',1,1000),select('status','Livraison',['pending','fulfilled','cancelled'])],
 battlepass:[int('level','Niveau de palier',1,1000),int('xpRequired','XP à atteindre',0,10000000),text('reward','Récompense',180),select('tier','Parcours',['free','premium'])],
 quests:[text('id','ID quête',100),text('title','Quête',180),int('xp','XP attribués',0,1000000),text('objective','Objectif',1000),select('status','État',['draft','active','archived'])],
 tickets:[text('playerId','ID Discord',25),text('subject','Sujet',180),text('message','Demande',1300),select('status','État',['open','in_progress','closed'])],
 moderation:[text('playerId','ID Discord',25),select('action','Action',['warn','timeout','ban','unban']),text('reason','Motif',1000),select('status','Traitement',['pending','done'])],
 automod:[text('rule','Règle',160),select('action','Action',['warn','delete','timeout']),text('pattern','Mot ou expression',400)],
 welcome:[text('name','Titre du message',100),text('message','Texte de bienvenue',1200),text('channelId','Salon Discord ID',25)],
 autoroles:[text('roleId','Identifiant du rôle Discord',25),text('description','Description',240)],
 verification:[text('roleId','Rôle après vérification',25),text('message','Texte affiché',850)],
 levels:[int('level','Niveau',1,10000),int('xp','XP requis',0,10000000),text('reward','Rôle / récompense',140)],
 giveaways:[text('title','Concours',180),text('reward','Lot',160),text('endsAt','Fin (ISO)',80),select('status','État',['open','closed'])],
 polls:[text('question','Question',300),text('options','Options séparées par |',1000),select('status','État',['open','closed'])],
 social:[text('network','Réseau',100),text('url','Lien public',350),text('channelId','Salon Discord',25)],
 stats:[text('metric','Mesure',140),text('value','Valeur',140)],
 editor:[text('map','Carte ciblée',120),text('assetPath','Chemin Unreal /Game/...',350),text('category','Type de modification',120),text('notes','Instructions',1600),select('status','Validation',['draft','review','approved'])],
 assets:[text('name','Modèle / ressource',160),text('path','Chemin source',350),text('license','Licence / attribution',180),text('category','Catégorie',100)],
 builds:[text('version','Version du jeu',90),text('branch','Branche GitHub',140),text('commit','SHA ou référence',100),select('status','Statut',['planned','building','tested','released'])],
 integrations:[text('name','Service externe',140),text('url','URL de consultation',300),select('status','Statut déclaré',['unverified','connected','disabled'])],
 settings:[text('key','Clé de configuration',140),text('value','Valeur non secrète',650)]
};
FIELDS.tools=[text('name','Opération',150),text('input','Entrée / chemin',400),text('result','Résultat',1400)];
FIELDS.overview=[text('title','Indicateur',100),text('value','Valeur',200)];
FIELDS.logs=[text('source','Source',140),text('type','Type',120),text('message','Message',1000)];
export const ID_PATTERN=/^[a-z][a-z\d-]{1,39}$/;
export function validateEntry(section, value) {
 const spec=FIELDS[section];
 if(!spec||!value||typeof value!=='object'||Array.isArray(value))throw new Error('Module ou enregistrement incorrect.');
 const out={};
 for(const field of spec){
  const v=value[field.name];
  if(v==null||v==='')continue;
  if(field.type==='number'){
   const n=Number(v);
   if(!Number.isFinite(n)||!Number.isInteger(n)||n<field.min||n>field.max)throw new Error('Valeur invalide : '+field.label);
   out[field.name]=n;
  }else{
   const s=String(v).trim();
   if(s.length>(field.max||2000))throw new Error('Champ trop long : '+field.label);
   if(field.type==='select'&&!field.choices.includes(s))throw new Error('Choix invalide : '+field.label);
   out[field.name]=s;
  }
 }
 if(!Object.keys(out).length)throw new Error('Au moins un champ est requis.');
 return out;
}
export const GAME_REPO='https://github.com/znationcmd/ANOMALIA-PRIMEVAL-OUTBOUNDUN';
export const EDITOR_PATH=GAME_REPO+'/blob/main/src/map-editor.js';
export const TOOLS_PATH=GAME_REPO+'/tree/main/scripts';
export const UNREAL_PATH=GAME_REPO+'/tree/main/unreal';
