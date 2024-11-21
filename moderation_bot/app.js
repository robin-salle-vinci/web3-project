// Importation des modules nécessaires
import pkg from 'discord.js';
const { Client, GatewayIntentBits, Partials, PermissionsBitField, Events } = pkg;
import fs from 'fs';

// Création du client Discord avec les intentions et les partials nécessaires
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // Gestion des serveurs
    GatewayIntentBits.GuildMembers, // Gestion des membres
    GatewayIntentBits.GuildMessages, // Gestion des messages sur le serveur
    GatewayIntentBits.MessageContent, // Accès au contenu des messages
    GatewayIntentBits.GuildMessageReactions, // Gestion des réactions aux messages
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction], // Gestion des données partielles
});

// Liste des mots bannis détectés par le bot
const bannedWords = ['connard', 'connasse', 'enculé', 'salope', 'pute', 'pédé', 'nique ta mère', 'nique ton père', 'poufiasse'];

// IDs des rôles et messages pour les fonctionnalités du bot
const newPersonRole = '1306230718199889930'; // Rôle attribué aux nouveaux membres
const charteAcceptationRole = '1306230922567356436'; // Rôle attribué après acceptation des règles
const muteRoleId = '1306219205468880896'; // Rôle pour mute les utilisateurs
const rulesChannelName = 'chartes-et-regles'; // Canal contenant les règles
const rulesMessageId = '1306233550005075968'; // Message des règles à réagir
const infractionLimit = 3; // Nombre d'infractions avant mute
const muteDuration = 60000; // Durée du mute en millisecondes (1 minute)

// Lecture du fichier de configuration pour les logs
let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Map pour suivre les infractions des utilisateurs
const userInfractions = new Map();

// Événement déclenché lorsque le bot est prêt
client.on(Events.ClientReady, () => {
  console.log(`Connecté en tant que ${client.user.tag}!`);
});

// Événement déclenché lorsqu'un nouveau membre rejoint le serveur
client.on(Events.GuildMemberAdd, member => {
  const role = member.guild.roles.cache.get(newPersonRole); // Récupération du rôle par son ID
  if (role) {
    member.roles.add(role).catch(console.error); // Ajout du rôle
  }

  // Envoi d'un message de bienvenue dans le canal "bienvenue"
  const welcomeChannel = member.guild.channels.cache.find(channel => channel.name === 'bienvenue');
  if (welcomeChannel) {
    welcomeChannel.send(`Bienvenue sur le serveur, ${member}!`).catch(console.error);
  }
});

// Événement déclenché lorsqu'un message est envoyé
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return; // Ignorer les messages des bots

  const messageContent = message.content.toLowerCase();
  let infraction = false;

  // Vérification si le message contient un mot interdit
  for (const word of bannedWords) {
    if (messageContent.includes(word)) {
      message.delete().catch(console.error); // Suppression du message
      message.channel.send(`${message.author}, ce mot est interdit !`).then(msg => {
        setTimeout(() => msg.delete(), 5000); // Suppression du message d'avertissement après 5 secondes
      }).catch(console.error);

      logModerationAction(message.guild, `${message.author.tag} a utilisé un mot interdit : ${word}`); // Journalisation
      infraction = true;
      break;
    }
  }

  // Gestion des infractions si un mot interdit est détecté
  if (infraction) {
    const userId = message.author.id;
    if (!userInfractions.has(userId)) {
      userInfractions.set(userId, 0);
    }
    userInfractions.set(userId, userInfractions.get(userId) + 1);

    console.log(`Infractions pour ${message.author.tag}: ${userInfractions.get(userId)}`);

    // Mute temporaire si l'utilisateur dépasse la limite d'infractions
    if (userInfractions.get(userId) >= infractionLimit) {
      const muteRole = message.guild.roles.cache.get(muteRoleId);
      const member = message.member;

      if (muteRole && member) {
        try {
          // Sauvegarde des anciens rôles dans une variable
          const oldRoles = member.roles.cache.filter(role => role.id !== message.guild.id && role.id !== muteRoleId);
          await member.roles.remove(oldRoles); // Retrait des anciens rôles
          await member.roles.add(muteRole); // Attribution du rôle de mute
          console.log(`Rôle de mute ajouté pour ${message.author.tag}`);

          message.author.send(`Vous avez été mute pour 1 minute pour avoir enfreint les règles à plusieurs reprises.`).catch(console.error);

          // Retrait du mute et restauration des rôles après la durée définie
          setTimeout(async () => {
            try {
              const currentMember = await message.guild.members.fetch(userId).catch(console.error);
              if (!currentMember) return;

              await currentMember.roles.remove(muteRole);
              console.log(`Rôle de mute retiré pour ${message.author.tag}`);

              // Restauration des anciens rôles
              await currentMember.roles.add(oldRoles);
              console.log(`Rôles restaurés pour ${message.author.tag}`);
              message.author.send(`Vous n'êtes plus mute.`).catch(console.error);
            } catch (error) {
              console.error("Erreur lors du retrait du rôle de mute et de la restauration des rôles :", error);
            }
          }, muteDuration);

          // Réinitialisation des infractions
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

// Événement déclenché lorsqu'une réaction est ajoutée à un message
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  if (reaction.message.partial) {
    try {
      await reaction.message.fetch(); // Récupération du message si partiel
    } catch (error) {
      console.error("Erreur lors de la récupération du message :", error);
      return;
    }
  }

  // Vérification si la réaction est sur le message des règles
  if (reaction.message.id === rulesMessageId && reaction.message.channel.name === rulesChannelName) {
    try {
      const member = await reaction.message.guild.members.fetch(user.id); // Récupération du membre
      const accessRole = reaction.message.guild.roles.cache.get(charteAcceptationRole);
      const initialRole = reaction.message.guild.roles.cache.get(newPersonRole);

      // Ajout du rôle d'accès et retrait du rôle initial
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


Pour toute question, contactez un administrateur !`;

    message.channel.send(helpMessage).catch(console.error);
  }
});



// Fonction pour journaliser les actions de modération
function logModerationAction(guild, action) {
  const guildId = guild.id;
  const logChannelName = config[guildId] ? config[guildId].logChannelName : 'modération';
  const logChannel = guild.channels.cache.find(channel => channel.name === logChannelName);
  if (logChannel) {
    logChannel.send(action).catch(console.error);
  }
}

// Connexion au bot avec le token (déplacez ce token dans un fichier .env pour plus de sécurité)
client.login('process.env.DISCORD_TOKEN'); 
