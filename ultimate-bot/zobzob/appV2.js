import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import pkg from 'discord.js';
import cron from 'node-cron';
import moment from 'moment-timezone';
import fs from 'fs';

const { Client, GatewayIntentBits, Partials, PermissionsBitField, Events } = pkg;

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Object to store active polls
const polls = {};

// Store for in-progress games. In production, you'd want to use a DB
const events = {};

// Create the Discord client with necessary intents and partials
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

// List of banned words detected by the bot
const bannedWords = ['word1', 'word2', 'word3']; // Replace with actual words

// IDs for roles and messages for bot functionalities
const newPersonRole = 'role_id_1';
const charteAcceptationRole = 'role_id_2';
const muteRoleId = 'role_id_3';
const rulesChannelName = 'rules-channel';
const rulesMessageId = 'message_id';
const infractionLimit = 3;
const muteDuration = 60000;

// Read the configuration file for logs
let config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Map to track user infractions
const userInfractions = new Map();

// Event triggered when the bot is ready
client.on(Events.ClientReady, () => {
  console.log(`Connected as ${client.user.tag}!`);
});

// Event triggered when a new member joins the server
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

// Event triggered when a message is sent
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

// Event triggered when a reaction is added to a message
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

// Function to log moderation actions
function logModerationAction(guild, action) {
  const guildId = guild.id;
  const logChannelName = config[guildId] ? config[guildId].logChannelName : 'moderation';
  const logChannel = guild.channels.cache.find(channel => channel.name === logChannelName);
  if (logChannel) {
    logChannel.send(action).catch(console.error);
  }
}

// Connect to the bot with the token (move this token to a .env file for better security)
client.login(process.env.DISCORD_TOKEN);

// Interactions endpoint URL where Discord will send HTTP requests
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, id, data, channel_id } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data || {};

    if (name === 'poll' && options) {
      const title = options.find(opt => opt.name === 'title')?.value || "Title not defined";
      
      const pollOptions = [];
      for (let i = 1; i <= 5; i++) {
        const option = options.find(opt => opt.name === `option${i}`)?.value;
        if (option) {
          pollOptions.push({ name: option, votes: 0 });
        }
      }

      const pollId = id;
      polls[pollId] = { title, options: pollOptions };

      const pollContent = `**${title}**\n` + pollOptions.map((opt, index) => `${index + 1}️⃣ ${opt.name}`).join('\n');

      const components = [
        {
          type: 1,
          components: pollOptions.map((opt, index) => ({
            type: 2,
            label: `${index + 1}️⃣ ${opt.name}`,
            style: 1,
            custom_id: `vote_${pollId}_option${index + 1}`,
          })),
        },
      ];

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: pollContent,
          components,
        },
      });
    } else if (name === 'addevent') {
      const dateOption = options.find(option => option.name === 'date');
      const timeOption = options.find(option => option.name === 'heure');
      const descriptionOption = options.find(option => option.name === 'description');

      if (!dateOption || !timeOption || !descriptionOption) {
        console.error('Invalid options:', options);
        return res.status(400).json({ error: 'Invalid options' });
      }

      const date = dateOption.value;
      const time = timeOption.value;
      const description = descriptionOption.value;
      const eventDate = moment.tz(`${date}T${time}:00`, 'Europe/Paris').toDate();

      if (!events[req.body.guild_id]) {
        events[req.body.guild_id] = [];
      }

      events[req.body.guild_id].push({ date: eventDate, description, channelId: channel_id });
      console.log(`Event added: ${description} on ${eventDate} in channel ${channel_id}`);

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Event added: ${description} on ${date} at ${time}`,
        },
      });

      return;
    } else if (name === 'deleteevent') {
      const dateOption = options.find(option => option.name === 'date');
      const timeOption = options.find(option => option.name === 'heure');

      if (!dateOption || !timeOption) {
        console.error('Invalid options:', options);
        return res.status(400).json({ error: 'Invalid options' });
      }

      const date = dateOption.value;
      const time = timeOption.value;
      const eventDate = moment.tz(`${date}T${time}:00`, 'Europe/Paris').toDate();

      if (events[req.body.guild_id]) {
        events[req.body.guild_id] = events[req.body.guild_id].filter(event => event.date.getTime() !== eventDate.getTime());
        console.log(`Event on ${eventDate} deleted.`);

        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Event on ${date} at ${time} deleted.`,
          },
        });

        return;
      }
    } else if (name === 'listevent') {
      if (!events[req.body.guild_id] || events[req.body.guild_id].length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'No events found.',
          },
        });
      }

      const eventList = events[req.body.guild_id]
        .map(event => `Event: ${event.description} on ${moment(event.date).format('DD/MM/YYYY at HH:mm')}`)
        .join('\n');

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: eventList,
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = data.custom_id;
    const [_, pollId, option] = customId.split("_");

    if (polls[pollId] && option.startsWith('option')) {
      const optionIndex = parseInt(option.replace('option', '')) - 1;
      polls[pollId].options[optionIndex].votes += 1;

      const results = polls[pollId];
      const resultsMessage = `**${results.title}**\n` +
        results.options.map((opt, index) => `${index + 1}️⃣ ${opt.name}: ${opt.votes} votes`).join('\n');

      return res.send({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: resultsMessage,
          components: [
            {
              type: 1,
              components: results.options.map((opt, index) => ({
                type: 2,
                label: `${index + 1}️⃣ ${opt.name}`,
                style: 1,
                custom_id: `vote_${pollId}_option${index + 1}`,
              })),
            },
          ],
        },
      });
    } else {
      return res.status(400).json({ error: 'Unknown interaction' });
    }
  }

  console.error('Unknown interaction type', type);
  return res.status(400).json({ error: 'Unknown interaction type' });
});

cron.schedule('* * * * *', () => {
  const now = moment().tz('Europe/Paris');
  console.log('Checking events at', now.format());
  for (const guildId in events) {
    events[guildId] = events[guildId].filter(event => {
      console.log(`Checking event: ${event.description} on ${moment(event.date).format()}`);
      const eventMoment = moment(event.date).tz('Europe/Paris');
      console.log(`now: ${now.format()}, eventMoment: ${eventMoment.format()}`);
      const isToday = eventMoment.isSame(now, 'day') && eventMoment.isSame(now, 'hour') && eventMoment.isSame(now, 'minute');
      const isTomorrow = eventMoment.isSame(now.clone().add(1, 'day'), 'day') && eventMoment.hour() === now.hour() && eventMoment.minute() === now.minute();
      console.log(`isToday: ${isToday}, isTomorrow: ${isTomorrow}`);
      if (isToday || isTomorrow) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(event.channelId);
          if (channel) {
            console.log("Checking permissions for channel:", channel.name);
            const permissions = channel.permissionsFor(client.user);
            if (permissions.has('SendMessages')) {
              console.log("Sending message to channel:", channel.name);
              if (isToday) {
                console.log("Sending today's event reminder to channel:", channel.name);
                channel.send(`@everyone Event "${event.description}" now`)
                  .then(() => {
                    console.log(`Event reminder sent: ${event.description}`);
                  })
                  .catch(err => {
                    console.error('Error sending message:', err);
                  });
                return false;
              } else if (isTomorrow) {
                console.log("Sending tomorrow's event reminder to channel:", channel.name);
                channel.send(`@everyone Event "${event.description}" tomorrow at ${eventMoment.format('HH:mm')}`)
                  .then(() => {
                    console.log(`Event reminder sent: ${event.description}`);
                  })
                  .catch(err => {
                    console.error('Error sending message:', err);
                  });
              }
            } else {
              console.log(`Bot does not have permission to send messages in channel '${channel.name}' of guild ${guildId}`);
            }
          } else {
            console.log(`Channel with ID ${event.channelId} not found in guild ${guildId}`);
          }
        } else {
          console.log(`Guild ${guildId} not found`);
        }
      }
      return !isToday;
    });
  }
});

client.login(process.env.DISCORD_TOKEN);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});