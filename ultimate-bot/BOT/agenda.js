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

const { Client, GatewayIntentBits } = pkg;

// Create an express app
const app = express();

// Store for in-progress games. In production, you'd want to use a DB
const events = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction type and data
  const { type, id, data, channel_id } = req.body;

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data || {};

    if (name === 'addevent') {
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
      console.log(`Événement ajouté: ${description} le ${eventDate} dans le canal ${channel_id}`);

      // Respond immediately to avoid timeout
      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Événement ajouté: ${description} le ${date} à ${time}`,
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
        console.log(`Événement le ${eventDate} supprimé.`);

        // Respond immediately to avoid timeout
        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Événement le ${date} à ${time} supprimé.`,
          },
        });

        return;
      }
    } else if (name === 'listevent') {
      if (!events[req.body.guild_id] || events[req.body.guild_id].length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: 'Aucun événement trouvé.',
          },
        });
      }

      const eventList = events[req.body.guild_id]
        .map(event => `Événement: ${event.description} le ${moment(event.date).format('DD/MM/YYYY à HH:mm')}`)
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

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

// Initialize Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
  console.log('Bot is ready!');
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
                channel.send(`@everyone Événement "${event.description}" maintenant`)
                  .then(() => {
                    console.log(`Rappel d'événement envoyé: ${event.description}`);
                  })
                  .catch(err => {
                    console.error('Erreur lors de l\'envoi du message:', err);
                  });
                return false;
              } else if (isTomorrow) {
                console.log("Sending tomorrow's event reminder to channel:", channel.name);
                channel.send(`@everyone Événement "${event.description}" demain à ${eventMoment.format('HH:mm')}`)
                  .then(() => {
                    console.log(`Rappel d'événement envoyé: ${event.description}`);
                  })
                  .catch(err => {
                    console.error('Erreur lors de l\'envoi du message:', err);
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

export { app };