require('dotenv').config();
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import cron from 'node-cron';
import moment from 'moment-timezone';

const app = express();
const PORT = process.env.PORT || 3000;

const { Client, GatewayIntentBits } = require('discord.js');
const fetchAI = require("./requests/aiml");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});
const token = process.env.DISCORD_TOKEN;

client.once('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
  if (message.content === '!ping') message.reply('!pong');
  if (message.content.startsWith('!chat')) {
    const request = message.content.slice(6);
    const response = await fetchAI(request);
    message.reply(response);
  }
});

const events = {};
const polls = {}; // Défini pour éviter d'autres erreurs liées aux sondages

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, id, data, channel_id } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    if (name === 'poll' && options) {
      const title = options.find(opt => opt.name === 'title')?.value || "Titre non défini";

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
    }

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

      res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Événement ajouté: ${description} le ${date} à ${time}`,
        },
      });

      return;
    }

    if (name === 'deleteevent') {
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

        res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Événement le ${date} à ${time} supprimé.`,
          },
        });

        return;
      }
    }

    if (name === 'listevent') {
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
    }
  }
});

cron.schedule('* * * * *', () => {
  const now = moment().tz('Europe/Paris');
  console.log('Checking events at', now.format());
  for (const guildId in events) {
    events[guildId] = events[guildId].filter(event => {
      const eventMoment = moment(event.date).tz('Europe/Paris');
      const isToday = eventMoment.isSame(now, 'day') && eventMoment.isSame(now, 'hour') && eventMoment.isSame(now, 'minute');
      const isTomorrow = eventMoment.isSame(now.clone().add(1, 'day'), 'day') && eventMoment.hour() === now.hour() && eventMoment.minute() === now.minute();

      if (isToday || isTomorrow) {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
          const channel = guild.channels.cache.get(event.channelId);
          if (channel) {
            const permissions = channel.permissionsFor(client.user);
            if (permissions.has('SendMessages')) {
              if (isToday) {
                channel.send(`@everyone Événement "${event.description}" maintenant`);
                return false;
              } else if (isTomorrow) {
                channel.send(`@everyone Événement "${event.description}" demain à ${eventMoment.format('HH:mm')}`);
              }
            }
          }
        }
      }
      return !isToday;
    });
  }
});

client.login(token);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
