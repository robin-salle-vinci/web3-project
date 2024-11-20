import 'dotenv/config';
import express from 'express';
import { app as agendaApp } from './BOT/agenda.js';
import { pollApp } from './BOT/poll.js';
import { discordClient } from './BOT/youtube_feed.js';

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Use the agenda app
app.use(agendaApp);

// Use the poll app
app.use(pollApp);



// Start the Express server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});