import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { google } from 'googleapis';

// Initialize YouTube client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Initialize Discord client
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

discordClient.once('ready', () => {
  console.log('Discord bot is ready!');
});

discordClient.login(process.env.DISCORD_TOKEN);

// Load posted video IDs from JSON file
let postedVideoIds = new Set();
try {
  const data = fs.readFileSync('../postedVideoids.json', 'utf8');
  postedVideoIds = new Set(JSON.parse(data));
  console.log('Loaded posted video IDs:', postedVideoIds);
} catch (error) {
  console.error('Error loading posted video IDs:', error);
}

// Function to save posted video IDs to JSON file
function savePostedVideoIds() {
  try {
    fs.writeFileSync('../postedVideoids.json', JSON.stringify([...postedVideoIds]), 'utf8');
    console.log('Saved posted video IDs');
  } catch (error) {
    console.error('Error saving posted video IDs:', error);
  }
}

// Function to fetch YouTube videos
async function fetchYouTubeVideos(channelId) {
  try {
    console.log(`Fetching videos for channel ID: ${channelId}`);
    const response = await youtube.search.list({
      part: 'snippet',
      channelId: channelId,
      maxResults: 3,
      order: 'date',
    });
    console.log(`Fetched videos: ${JSON.stringify(response.data.items)}`);
    return response.data.items;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
  }
}

// Function to post YouTube videos to Discord channel
async function postYouTubeVideosToDiscord() {
  const videos = await fetchYouTubeVideos(process.env.YOUTUBE_CHANNEL_ID);
  console.log(`Videos returned from fetchYouTubeVideos: ${JSON.stringify(videos)}`);
  if (!videos || !Array.isArray(videos)) {
    console.error('No videos found or error fetching videos.');
    return;
  }
  const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
  console.log(`Fetched channel: ${channel.name}`);
  // Reverse the order of the videos array to post the newest video last
  for (const video of videos.reverse()) {
    const videoId = video.id.videoId;
    if (postedVideoIds.has(videoId)) {
      console.log(`Skipping already posted video: ${videoId}`);
      continue;
    }
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Posting video: ${videoUrl}`);
    try {
      await channel.send(`${video.snippet.title}\n${videoUrl}`);
      console.log(`Successfully posted video: ${videoUrl}`);
      postedVideoIds.add(videoId); // Add video ID to the set
      savePostedVideoIds(); // Save posted video IDs to JSON file
    } catch (error) {
      console.error(`Error posting video: ${videoUrl}`, error);
    }
  }
}

// Set an interval to fetch and post YouTube videos every 5 minutes
setInterval(postYouTubeVideosToDiscord, 3000);

// Create an Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});