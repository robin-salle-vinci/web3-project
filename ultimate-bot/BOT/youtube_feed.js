import { google } from 'googleapis';
import { Client, GatewayIntentBits } from 'discord.js';

// Initialize YouTube client
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Initialize Discord client
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds] });

discordClient.once('ready', () => {
  console.log('Discord bot is ready!');
});

discordClient.login(process.env.DISCORD_TOKEN);

// Store posted video IDs to avoid duplicates
const postedVideoIds = new Set();

console.log('YouTube feed bot is running!');

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
  for (const video of videos) {
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
    } catch (error) {
      console.error(`Error posting video: ${videoUrl}`, error);
    }
  }
}

// Set an interval to fetch and post YouTube videos every 5 minutes
setInterval(postYouTubeVideosToDiscord, 300000);

export { discordClient };