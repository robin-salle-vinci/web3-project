require('dotenv').config();
const { OpenAI } = require("openai");
const { Client, GatewayIntentBits } = require('discord.js');

const apiKey = process.env.API_KEY;
const baseURL = process.env.API_URL;

const api = new OpenAI({
    apiKey,
    baseURL,
  });

// Créer une instance du client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Le token du bot
const token = process.env.DISCORD_TOKEN;

// L'événement de connexion
client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
});

// L'événement pour écouter les messages
client.on('messageCreate', async message => {

    if(message.content === '!ping') message.reply('!pong')

    // code pour la commande avec chatGPT
    if(message.content.startsWith('!chat')){
        const request = message.content.slice(6)
        const response = await fetchAI(request)
        message.reply(response)
    }
});
// Connexion du bot à Discord
client.login(token);


const fetchAI = async (request) => {
    console.log(request)
    const completion = await api.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an helpful assistant",
          },
          {
            role: "user",
            content: request,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
      });
    
      const response = completion.choices[0].message.content;
    
      console.log("AI:", response);
      return response;
}
