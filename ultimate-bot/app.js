import 'dotenv/config';
import express from 'express';
import { combinedMiddleware } from './combinedMiddleware.js';
import { discordClient } from './BOT/youtube_feed.js';
import { moderationClient } from './BOT/moderation.js';

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Use the combined middleware
app.use(combinedMiddleware);
app.use(express.json()); // Ensure the request body is parsed after signature verification

// Start the Express server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
