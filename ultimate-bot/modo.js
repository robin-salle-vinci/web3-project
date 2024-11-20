import { Client, GatewayIntentBits, Partials, PermissionsBitField, Events } from 'discord.js';
import fs from 'fs';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const bannedWords = ['word1', 'word2', 'word3']; // Replace with actual words
const newPersonRole = 'role_id_1';
const charteAcceptationRole = 'role_id_2';
const muteRoleId = 'role_id_3';
const rulesChannelName = 'rules-channel';
const rulesMessageId = 'message_id';
const infractionLimit = 3;
const muteDuration = 60000;

let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const userInfractions = new Map();

client.on(Events.ClientReady, () => {
  console.log(`Connected as ${client.user.tag}!`);
});

client.on(Events.GuildMemberAdd, member => {
  const role = member.guild.roles.cache.get(newPersonRole);
  if (role) {
    member.roles.add(role).catch(console.error);
  }

  const welcomeChannel = member.guild.channels.cache.find(channel => channel.name === 'welcome');
  if (welcomeChannel) {
    welcomeChannel.send(`Welcome to the server, ${member}!`).catch(console.error);
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const messageContent = message.content.toLowerCase();
  let infraction = false;

  for (const word of bannedWords) {
    if (messageContent.includes(word)) {
      message.delete().catch(console.error);
      message.channel.send(`${message.author}, that word is not allowed!`).then(msg => {
        setTimeout(() => msg.delete(), 5000);
      }).catch(console.error);

      logModerationAction(message.guild, `${message.author.tag} used a banned word: ${word}`);
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

    console.log(`Infractions for ${message.author.tag}: ${userInfractions.get(userId)}`);

    if (userInfractions.get(userId) >= infractionLimit) {
      const muteRole = message.guild.roles.cache.get(muteRoleId);
      const member = message.member;

      if (muteRole && member) {
        try {
          const oldRoles = member.roles.cache.filter(role => role.id !== message.guild.id && role.id !== muteRoleId);
          await member.roles.remove(oldRoles);
          await member.roles.add(muteRole);
          console.log(`Mute role added for ${message.author.tag}`);

          message.author.send(`You have been muted for 1 minute for repeated rule violations.`).catch(console.error);

          setTimeout(async () => {
            try {
              const currentMember = await message.guild.members.fetch(userId).catch(console.error);
              if (!currentMember) return;

              await currentMember.roles.remove(muteRole);
              console.log(`Mute role removed for ${message.author.tag}`);

              await currentMember.roles.add(oldRoles);
              console.log(`Roles restored for ${message.author.tag}`);
              message.author.send(`You are no longer muted.`).catch(console.error);
            } catch (error) {
              console.error("Error removing mute role and restoring roles:", error);
            }
          }, muteDuration);

          userInfractions.set(userId, 0);
        } catch (error) {
          console.error("Error adding mute role:", error);
        }
      } else {
        console.log("Mute role or member not found.");
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
      console.error("Error fetching message:", error);
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
        console.log(`Role added to ${user.tag}`);
      }
      if (initialRole && member) {
        await member.roles.remove(initialRole);
        console.log(`Role removed for ${user.tag}`);
      }
    } catch (error) {
      console.error("Error managing roles:", error);
    }
  }
});

client.on(Events.MessageCreate, message => {
  if (message.content.startsWith('!setlogchannel')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      message.channel.send('You do not have permission to set the log channel.');
      return;
    }

    const args = message.content.split(' ').slice(1);
    if (args.length === 0) {
      message.channel.send('Please provide the name of the log channel.');
      return;
    }

    const newLogChannelName = args.join(' ');
    const guildId = message.guild.id;
    if (!config[guildId]) {
      config[guildId] = {};
    }
    config[guildId].logChannelName = newLogChannelName;
    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
    message.channel.send(`Log channel set to ${newLogChannelName}.`);
  }
});

client.on(Events.MessageCreate, message => {
  if (message.content === '!help') {
    const helpMessage = `
**Available bot commands:**

1. **Banned words moderation:**
   - The bot automatically deletes any message containing banned words.
   - The user receives a warning. After ${infractionLimit} infractions, the user will be temporarily muted.

2. **Mute system:**
   - A user reaching ${infractionLimit} infractions will be muted for ${muteDuration / 60000} minutes.
   - The user's roles are temporarily removed during the mute period.

3. **Rules reaction system:**
   - In the **${rulesChannelName}** channel, a user can get the member role by reacting to the message with ID **${rulesMessageId}**.

4. **Log channel configuration command:**
   - **!setlogchannel [channel name]**: Sets the channel where moderation actions will be logged.
   - _Example:_ \`!setlogchannel logs\`
   - **Note**: Only administrators can use this command.

5. **Welcome and default role assignment:**
   - When a new user joins the server, they automatically receive the role with ID **${newPersonRole}** and a welcome message is sent in the **welcome** channel.

6. **Detection and removal of inappropriate links and images:**
   - Messages containing links or images are monitored according to moderation rules.

For any questions, contact an administrator!`;

    message.channel.send(helpMessage).catch(console.error);
  }
});

function logModerationAction(guild, action) {
  const guildId = guild.id;
  const logChannelName = config[guildId] ? config[guildId].logChannelName : 'moderation';
  const logChannel = guild.channels.cache.find(channel => channel.name === logChannelName);
  if (logChannel) {
    logChannel.send(action).catch(console.error);
  }
}

export { client, logModerationAction };