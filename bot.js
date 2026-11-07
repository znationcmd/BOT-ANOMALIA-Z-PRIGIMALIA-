import crypto from 'node:crypto';
import {Client,GatewayIntentBits,SlashCommandBuilder,PermissionFlagsBits,MessageFlags} from 'discord.js';
import {createRecord,listRecords,mutateGuild,readGuildData} from './lib/store.js';
import {BUNKERS,decodeMorse} from './lib/game-data.js';

const commands=[
 new SlashCommandBuilder().setName('anomalia').setDescription('ANOMALIA’Z PRIGIMALIA : serveur, outils et Dashboard')
  .addSubcommand(s=>s.setName('status').setDescription('Statut du bot et des données'))
  .addSubcommand(s=>s.setName('dashboard').setDescription('Ouvrir le Dashboard du bot'))
  .addSubcommand(s=>s.setName('editor').setDescription('Accéder à ANOMALIA Éditor'))
  .addSubcommand(s=>s.setName('tools').setDescription('Accéder à ANOMALIA Tools')),
 new SlashCommandBuilder().setName('whitelist').setDescription('Demander un accès au serveur ANOMALIA')
  .addStringOption(o=>o.setName('plateforme').setDescription('PC, Xbox ou PlayStation').addChoices(
   {name:'PC',value:'PC'},{name:'Xbox',value:'Xbox'},{name:'PlayStation',value:'PlayStation'}).setRequired(true))
  .addStringOption(o=>o.setName('presentation').setDescription('Présentation RP / motif').setMaxLength(650).setRequired(true)),
 new SlashCommandBuilder().setName('shop').setDescription('Boutique ANOMALIA')
  .addSubcommand(s=>s.setName('catalogue').setDescription('Voir les articles'))
  .addSubcommand(s=>s.setName('acheter').setDescription('Acheter avec les crédits du jeu')
   .addStringOption(o=>o.setName('reference').setDescription('SKU de l’article').setMaxLength(100).setRequired(true))),
 new SlashCommandBuilder().setName('pass').setDescription('Consulter le pass de combat').addSubcommand(s=>s.setName('statut').setDescription('Ton niveau et les paliers')) ,
 new SlashCommandBuilder().setName('bunker').setDescription('Bunkers du monde ANOMALIA')
  .addSubcommand(s=>s.setName('liste').setDescription('Liste des accès par clés, cartes et Morse')
   .addStringOption(o=>o.setName('acces').setDescription('Type de fermeture')
    .addChoices({name:'Clé',value:'key'},{name:'Carte perforée',value:'card'},{name:'Code Morse',value:'morse'}))),
 new SlashCommandBuilder().setName('morse').setDescription('Décoder une transmission Morse enregistrée en jeu')
  .addStringOption(o=>o.setName('signal').setDescription('10 chiffres ou groupes de points/traits séparés').setRequired(true).setMaxLength(350)),
 new SlashCommandBuilder().setName('ticket').setDescription('Ouvrir un ticket ANOMALIA')
  .addStringOption(o=>o.setName('sujet').setDescription('Sujet du ticket').setRequired(true).setMaxLength(180))
  .addStringOption(o=>o.setName('message').setDescription('Description du problème').setRequired(true).setMaxLength(1300)),
 new SlashCommandBuilder().setName('rp').setDescription('Règles et informations RP').addSubcommand(s=>s.setName('regles').setDescription('Consulter les règles RP configurées'))
].map(c=>c.toJSON());

const privateResponse=async(i,content)=>i.reply({content:String(content).slice(0,1950),flags:MessageFlags.Ephemeral,allowedMentions:{parse:[]}});
const dash=()=>String(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
async function handle(interaction){
 if(!interaction.isChatInputCommand()||!interaction.inGuild())return;
 const name=interaction.commandName,sub=interaction.options.getSubcommand(false),guildId=interaction.guildId,user=interaction.user;
 if(name==='anomalia'){
  if(sub==='dashboard')return privateResponse(interaction,'🩸 **Dashboard ANOMALIA’Z PRIGIMALIA**\n'+(dash()||'Lien non configuré sur Railway.'));
  if(sub==='editor')return privateResponse(interaction,'🛠️ ANOMALIA Éditor pour ton serveur Discord : '+(dash()?dash()+'/#editor':'Dashboard à configurer'));
  if(sub==='tools')return privateResponse(interaction,'🧰 ANOMALIA Tools pour ta communauté : '+(dash()?dash()+'/#tools':'Dashboard à configurer'));
  return privateResponse(interaction,'🤖 **ANOMALIA’Z PRIGIMALIA**\nBot Discord multi-serveurs : connecté\nConfiguration indépendante pour chaque communauté.\nDashboard : '+(dash()||'domaine à configurer'));
 }
 if(name==='whitelist'){
  const already=(await listRecords(guildId,'whitelist')).find(x=>x.playerId===user.id&&x.status==='pending');
  if(already)return privateResponse(interaction,'⏳ Une demande whitelist est déjà en attente.');
  await createRecord(guildId,'whitelist',{playerId:user.id,platform:interaction.options.getString('plateforme'),reason:interaction.options.getString('presentation'),status:'pending'},user.id);
  return privateResponse(interaction,'✅ Demande de whitelist enregistrée. Un administrateur doit la valider depuis le Dashboard. Aucun accès au jeu n’a été attribué automatiquement.');
 }
 if(name==='ticket'){
  await createRecord(guildId,'tickets',{playerId:user.id,subject:interaction.options.getString('sujet'),message:interaction.options.getString('message'),status:'open'},user.id);
  return privateResponse(interaction,'🎫 Ticket enregistré. Il est visible par les administrateurs dans le Dashboard.');
 }
 if(name==='shop'){
  if(sub==='catalogue'){
   const items=(await listRecords(guildId,'shop')).filter(x=>!Number.isFinite(x.stock)||x.stock!==0).slice(0,15);
   return privateResponse(interaction,items.length?'🛍️ **Boutique**\n'+items.map(x=>'• '+x.name+' | '+x.price+' crédits | réf. '+x.sku).join('\n'):'La boutique ne contient pas encore d’articles.');
  }
  const sku=interaction.options.getString('reference');
  try{
   const result=await mutateGuild(guildId,user.id,doc=>{
    const item=(doc.modules.shop||[]).find(x=>x.sku===sku);
    if(!item||item.stock===0)throw new Error('Article introuvable ou épuisé.');
    if(!Number.isInteger(item.price)||item.price<0)throw new Error('Prix invalide.');
    const player=(doc.modules.players||[]).find(x=>x.discordId===user.id);
    if(!player||Number(player.credits||0)<item.price)throw new Error('Crédits insuffisants : consulte ton compte.');
    const pending=(doc.modules.deliveries||[]).filter(x=>x.status==='pending').length;
    if(pending>=500)throw new Error('File de livraisons saturée.');
    player.credits-=item.price;
    if(Number.isInteger(item.stock)&&item.stock>0)item.stock-=1;
    const delivery={id:crypto.randomUUID(),playerId:user.id,sku:item.sku,qty:1,status:'pending',createdAt:new Date().toISOString()};
    doc.modules.deliveries.unshift(delivery);
    return {action:'purchase',name:item.name,remaining:player.credits,deliveryId:delivery.id};
   });
   return privateResponse(interaction,'✅ Achat enregistré : '+result.name+'. Solde : '+result.remaining+' crédits. Livraison **en attente** dans le Dashboard. Une intégration externe est nécessaire pour toute livraison en jeu.');
  }catch(e){return privateResponse(interaction,'❌ '+e.message)}
 }
 if(name==='pass'){
  const data=await readGuildData(guildId);
  const player=(data.modules.players||[]).find(x=>x.discordId===user.id);
  if(!player)return privateResponse(interaction,'Aucun profil de joueur relié à ton Discord. Le pass sera disponible après inscription par les administrateurs ou connexion du jeu.');
  const rewards=(data.modules.battlepass||[]).filter(x=>Number(x.level)<=Number(player.level||0)).length;
  return privateResponse(interaction,'🏆 **Pass de combat ANOMALIA**\nNiveau '+(player.level||0)+' · XP '+(player.xp||0)+'\nPaliers débloqués : '+rewards+'\nToute livraison en jeu dépend des intégrations activées par les administrateurs de ce serveur.');
 }
 if(name==='bunker'){
  const access=interaction.options.getString('acces');
  const filtered=BUNKERS.filter(x=>!access||x.access===access).slice(0,23);
  return privateResponse(interaction,'🔐 **Bunkers d’exemple (catalogue de démonstration)**\n'+filtered.map(b=>'• '+b.name+' · '+({key:'clé',card:'carte',morse:'Morse'}[b.access])+' · grille '+b.grid).join('\n'));
 }
 if(name==='morse'){
  try{
   const out=decodeMorse(interaction.options.getString('signal'));
   return privateResponse(interaction,'📟 Message décodé : **'+out.digits+'**\nPosition : '+out.grid+' · Code : '+out.code+'\n'+(out.bunker?out.bunker.name:'Position non répertoriée')+'\n⚠️ Résultat de la saisie, pas un signal radio reçu en direct.');
  }catch(e){return privateResponse(interaction,'Signal non reconnu : '+e.message)}
 }
 if(name==='rp'){
  const regs=(await listRecords(guildId,'rp')).slice(0,8);
  return privateResponse(interaction,regs.length?'📜 **Règles RP**\n'+regs.map(x=>'• '+x.title+': '+String(x.body||'').slice(0,170)).join('\n'):'Les règles RP ne sont pas encore configurées.');
 }
}
export async function startDiscord(){
 if(!process.env.DISCORD_TOKEN){console.warn('DISCORD_TOKEN absent : Dashboard accessible, bot Discord désactivé.');return {ready:false};}
 const client=new Client({intents:[GatewayIntentBits.Guilds]});
 client.once('ready',async()=>{
  console.log('Bot ANOMALIA connecté : '+client.user.tag);
  try{await client.application.commands.set(commands);console.log(commands.length+' commandes Discord enregistrées.');}
  catch(e){console.error('Enregistrement slash commands :',e.message)}
 });
 client.on('interactionCreate',i=>{handle(i).catch(async e=>{
  console.error('Commande ANOMALIA:',e);
  if(!i.isRepliable())return;
  try{
   if(i.replied||i.deferred)await i.followUp({content:'Erreur temporaire : '+e.message,flags:MessageFlags.Ephemeral});
   else await privateResponse(i,'Erreur temporaire : '+e.message);
  }catch{}
 })});
 client.on('error',e=>console.error('Discord:',e.message));
 try{await client.login(process.env.DISCORD_TOKEN);return client;}
 catch(e){console.error('Connexion Discord impossible :',e.message);return {ready:false,error:e.message};}
}
