import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

// Object to store active polls
const polls = {};

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data, id } = req.body;

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data || {};

    if (name === 'poll' && options) {
      const title = options.find(opt => opt.name === 'title')?.value || "Titre non défini";
      
      // Collecte des options du sondage (optionnelles)
      const pollOptions = [];
      for (let i = 1; i <= 5; i++) {
        const option = options.find(opt => opt.name === `option${i}`)?.value;
        if (option) {
          pollOptions.push({ name: option, votes: 0 });
        }
      }

      // ID unique pour chaque sondage
      const pollId = id;
      polls[pollId] = { title, options: pollOptions };

      // Création du message du sondage avec des boutons dynamiques
      const pollContent = `**${title}**\n` + pollOptions.map((opt, index) => `${index + 1}️⃣ ${opt.name}`).join('\n');

      // Création des boutons pour chaque option
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

      // Réponse avec le sondage et ses boutons
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: pollContent,
          components,
        },
      });
    } else {
      return res.status(400).json({ error: 'Les options de la commande poll ne sont pas définies' });
    }
  }

  // Gestion des interactions de type MESSAGE_COMPONENT (clic sur un bouton)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = data.custom_id;
    const [_, pollId, option] = customId.split("_");

    if (polls[pollId] && option.startsWith('option')) {
      // Incrémentation des votes
      const optionIndex = parseInt(option.replace('option', '')) - 1;
      polls[pollId].options[optionIndex].votes += 1;

      // Récupérer les résultats du sondage
      const results = polls[pollId];
      const resultsMessage = `**${results.title}**\n` + // Ajout du titre du sondage
        results.options.map((opt, index) => `${index + 1}️⃣ ${opt.name}: ${opt.votes} votes`).join('\n');

      // Mise à jour du message avec les résultats
      return res.send({
        type: InteractionResponseType.UPDATE_MESSAGE,
        data: {
          content: resultsMessage, // Affichage du titre + des résultats
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
          ], // Les boutons restent visibles
        },
      });
    } else {
      // Interaction inconnue
      return res.status(400).json({ error: 'Interaction inconnue' });
    }
  }

  console.error('Unknown interaction type:', type);
  return res.status(400).json({ error: 'Unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
