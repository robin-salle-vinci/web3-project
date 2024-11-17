import pkg from 'discord.js';
const { Client, GatewayIntentBits, Partials, PermissionsBitField, Events } = pkg;
import fs from 'fs';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// Liste de mots bannis
const bannedWords = ['connard', 'connasse', 'enculé', 'salope', 'pute', 'pédé', 'nique ta mère', 'nique ton père', 'poufiasse', 
  'bouffon', 'fils de pute', 'trou du cul', 'enfoiré', 'batard', 'gouine', 'tapette', 'clochard', 'branleur', 
  'branleuse', 'va te faire foutre', 'je t’emmerde','emmerdeur', 'racaille', 
  'pute à clic', 'bordel', 'pisseuse', 'ducon', 'pédale', 'pétasse', 'pouffiasse', 'dégénéré', 'crevure',
  'fuck', 'fucker', 'motherfucker', 'asshole', 'bitch', 'cunt', 'dickhead', 'bastard', 'whore', 'slut', 'cock', 
  'fucking', 'shithead', 'cocksucker', 'arsehole', 'pussy', 'dildo', 'blowjob', 'cum', 'clit', 'prick', 'boobs', 
  'nipples', 'penis', 'vagina',

  // Termes discriminatoires racistes, homophobes, et xénophobes (français et anglais)
  'nigger', 'nigga', 'faggot', 'spic', 'chink', 'kike', 'wop', 'dyke', 'tranny', 'retard', 'pédophile', 'pédé', 
  'singe', 'bougnoule', 'négro', 'tête de nègre', 'youpin', 'raton', 'romanichel', 'mangeur de chien', 'face de citron', 
  'niakoué', 'portos', 'chinetoque', 'roumain', 'esquimau', 'féménazie', 'kraut', 'japs', 'bouffeur de curry', 
  'blédard', 'bougnoul', 'racaille', 'sale étranger', 'sale migrant', 'sale arabe', 'bouffeur de pastèque', 
  'bicot', 'goudou', 'camé', 'camée', 'schizo', 'mongolien', 'mongol', 'zinzin', 'esclave', 'pirate somalien', 
  'sans-papiers', 'foutue lesbienne', 'tarlouze', 'lopette', 'queer', 'freak', 'tafiole', 'chacal', 'arabe', 
  'clodo', 'caillera', 'zigoto', 'fripouille','juif',

  // Variations pour éviter les contournements (avec des caractères spéciaux et majuscules)
  'p€d€', 'n!gga', 'f@ggot', 'c*nnard', 'a$$hole', 'fûck', 'wh0re', 'sl*t', 'k!ke', 'dyk€', 'p*ssy', 'bi©ot', 'ch!nk',
  'r€tard', 's@lope', 'conn@rd', 'b@stard', 'g0ud0u', 'pédo', 'nég*o', 'j*p', 'queer'];

const newPersonRole = '1306230718199889930'; // ID du rôle à attribuer
const charteAcceptationRole = '1306230922567356436';
const muteRoleId = '1306219205468880896'; // ID du rôle de mute
const rulesChannelName = 'chartes-et-regles'; // Nom du canal des règles
const rulesMessageId = '1306233550005075968'; // ID du message des règles
const infractionLimit = 3; // Limite d'infractions avant mute
const muteDuration = 60000; // Durée du mute en millisecondes (1 minute)

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const userInfractions = new Map();

client.on(Events.ClientReady, () => {
  console.log(`Connecté en tant que ${client.user.tag}!`);
});

client.on(Events.GuildMemberAdd, member => {
  const role = member.guild.roles.cache.get(roleId);
  if (role) {
    member.roles.add(role).catch(console.error);
  }

  const welcomeChannel = member.guild.channels.cache.find(channel => channel.name === 'bienvenue');
  if (welcomeChannel) {
    welcomeChannel.send(`Bienvenue sur le serveur, ${member}!`).catch(console.error);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const messageContent = message.content.toLowerCase();
  let infraction = false;

  for (const word of bannedWords) {
    if (messageContent.includes(word)) {
      message.delete().catch(console.error);
      message.channel.send(`${message.author}, ce mot est interdit !`).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      }).catch(console.error);

      logModerationAction(message.guild, `${message.author.tag} a utilisé un mot interdit : ${word}`);
      infraction = true;
      break;
    }
  }

  if (infraction) {
    const userId = message.author.id;
    if (!userInfractions.has(userId)) {
      userInfractions.set(userId, 0);
    }
    userInfractions.set(userId, userInfractions.get(userId) + 1);

    console.log(`Infractions pour ${message.author.tag}: ${userInfractions.get(userId)}`);

    if (userInfractions.get(userId) >= infractionLimit) {
      const muteRole = message.guild.roles.cache.get(muteRoleId);
      const member = message.member;

      if (muteRole && member) {
        try {
          // Sauvegarde des anciens rôles dans une variable
          const oldRoles = member.roles.cache.filter(role => role.id !== message.guild.id && role.id !== muteRoleId);
          await member.roles.remove(oldRoles);
          await member.roles.add(muteRole);
          console.log(`Rôle de mute ajouté pour ${message.author.tag}`);

          message.author.send(`Vous avez été mute pour 1 minute pour avoir enfreint les règles à plusieurs reprises.`).catch(console.error);

          // Retirer le rôle de mute après la durée et restaurer les rôles
          setTimeout(async () => {
            try {
              // Vérifier si l'utilisateur est toujours présent sur le serveur
              const currentMember = await message.guild.members.fetch(userId).catch(console.error);
              if (!currentMember) return;

              await currentMember.roles.remove(muteRole);
              console.log(`Rôle de mute retiré pour ${message.author.tag}`);

              // Restaurer les anciens rôles
              await currentMember.roles.add(oldRoles);
              console.log(`Rôles restaurés pour ${message.author.tag}`);
              message.author.send(`Vous n'êtes plus mute.`).catch(console.error);
            } catch (error) {
              console.error("Erreur lors du retrait du rôle de mute et de la restauration des rôles :", error);
            }
          }, muteDuration);

          // Réinitialiser les infractions après le mute
          userInfractions.set(userId, 0);
        } catch (error) {
          console.error("Erreur lors de l'attribution du rôle de mute :", error);
        }
      } else {
        console.log("Rôle de mute ou membre non trouvé.");
      }
    }
  }
});



client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch();
    } catch (error) {
      console.error("Erreur lors de la récupération du message :", error);
      return;
    }
  }

  if (reaction.message.id === rulesMessageId && reaction.message.channel.name === rulesChannelName) {
    try {
      const member = await reaction.message.guild.members.fetch(user.id);
      const accessRole = reaction.message.guild.roles.cache.get(charteAcceptationRole);
      const initialRole = reaction.message.guild.roles.cache.get(newPersonRole);

      if (accessRole && member) {
        await member.roles.add(accessRole);
        console.log(`Rôle ajouté à ${user.tag}`);
      }

      if (initialRole && member) {
        await member.roles.remove(initialRole);
        console.log(`Rôle supprimé pour ${user.tag}`);
      }
    } catch (error) {
      console.error("Erreur lors de la gestion des rôles :", error);
    }
  }
});



client.on(Events.MessageCreate, message => {
  if (message.content.startsWith('!setlogchannel')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      message.channel.send('Vous n\'avez pas la permission de définir le canal de log.');
      return;
    }

    const args = message.content.split(' ').slice(1);
    if (args.length === 0) {
      message.channel.send('Veuillez fournir le nom du canal de log.');
      return;
    }

    const newLogChannelName = args.join(' ');
    const guildId = message.guild.id;
    if (!config[guildId]) {
      config[guildId] = {};
    }
    config[guildId].logChannelName = newLogChannelName;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    message.channel.send(`Le canal de log a été défini sur ${newLogChannelName}.`);
  }
});

client.on(Events.MessageCreate, message => {
  if (message.content === '!help') {
    const helpMessage = `
**Commandes disponibles pour le bot :**

1. **Modération des mots interdits :**
   - Le bot supprime automatiquement tout message contenant des mots interdits. 
   - L’utilisateur reçoit un avertissement. Après ${infractionLimit} infractions, l'utilisateur sera mute temporairement.

2. **Système de mute :**
   - Un utilisateur atteint ${infractionLimit} infractions sera mute pendant une durée de ${muteDuration / 60000} minutes.
   - Les rôles de l'utilisateur sont retirés temporairement durant cette période de mute.

3. **Système de réaction pour les règles :**
   - Dans le canal **${rulesChannelName}**, un utilisateur peut obtenir le rôle de membre en réagissant au message ayant l’ID **${rulesMessageId}**.

4. **Commande de configuration du canal de log :**
   - **!setlogchannel [nom du canal]** : Définit le canal dans lequel les actions de modération seront enregistrées.
   - _Exemple :_ \`!setlogchannel logs\`
   - **Note** : Seuls les administrateurs peuvent utiliser cette commande.

5. **Bienvenue et attribution de rôle par défaut :**
   - Lorsqu'un nouvel utilisateur rejoint le serveur, il reçoit automatiquement le rôle avec l’ID **${newPersonRole}** et un message de bienvenue est envoyé dans le canal **bienvenue**.

6. **Détection et suppression de liens et d'images inappropriées :**
   - Les messages contenant des liens ou des images sont surveillés selon les règles de modération.

Pour toute question, contactez un administrateur !`;

    message.channel.send(helpMessage).catch(console.error);
  }
});


function logModerationAction(guild, action) {
  const guildId = guild.id;
  const logChannelName = config[guildId] ? config[guildId].logChannelName : 'modération';
  const logChannel = guild.channels.cache.find(channel => channel.name === logChannelName);
  if (logChannel) {
    logChannel.send(action).catch(console.error);
  }
}

client.login('MTI5ODI3ODYzMjA2MTQwMzIxNg.GKPJ9p.nlnrXwUCAHnbdVULSG7X0r32bqfNsIc_Wn8OPI'); 
