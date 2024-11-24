require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fetchAI = require("./requests/aiml");

// Instance of Discord bot
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const token = process.env.DISCORD_TOKEN;
client.once('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}!`);
});

// Function to listen created messages on Discord servers 
client.on('messageCreate', async message => {
    if(message.content === '!ping') message.reply('!pong')
        
    if(message.content.startsWith('!chat')){
        const request = message.content.slice(6)
        const response = await fetchAI(request)
        message.reply(response)
    }


});

// Login the bot to the servers
client.login(token);