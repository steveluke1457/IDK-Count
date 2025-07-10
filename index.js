// index.js
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Express Web Server for UptimeRobot ping
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🤖 Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`🌐 Web server running at http://localhost:${PORT}`);
});

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Data stores
client.counts = new Map(); // channelId => {count, lastUserId, paused, highScore}
client.leaderboards = new Map(); // channelId => {userId, username, score}
client.activeChannels = new Map(); // guildId => channelId (counting channel)
client.lastActivity = new Map(); // guildId => timestamp (last counting activity)

client.commands = new Collection();

// Load slash command(s)
const countCommand = require('./commands/count');
client.commands.set(countCommand.data.name, countCommand);

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot is ready: ${client.user.tag}`);

  // Register slash command(s) for all guilds
  const guilds = await client.guilds.fetch();
  for (const [guildId] of guilds) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set([countCommand.data]);
  }
});

// Constants
const LEADERBOARD_INTERVAL = 5 * 60 * 1000; // 5 minutes

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;
  if (!guildId) return;

  const activeChannelId = client.activeChannels.get(guildId);
  if (!activeChannelId) return; // No channel set, ignore

  if (message.channel.id !== activeChannelId) return; // Ignore other channels

  const current = client.counts.get(activeChannelId) || { count: 1, lastUserId: null, paused: false, highScore: 0 };
  if (current.paused) return;

  const num = parseInt(message.content.trim());
  if (isNaN(num)) return;

  if (current.lastUserId === message.author.id) {
    // Same user twice in a row - delete message
    await message.delete().catch(() => {});
    return;
  }

  if (num === current.count) {
    try {
      await message.react('✅');
    } catch {}

    const newCount = current.count + 1;

    // Update high score and leaderboard if needed
    if (newCount - 1 > current.highScore) {
      current.highScore = newCount - 1;
      client.leaderboards.set(activeChannelId, {
        userId: message.author.id,
        username: message.author.username,
        score: current.highScore,
      });
    }

    client.counts.set(activeChannelId, {
      count: newCount,
      lastUserId: message.author.id,
      paused: current.paused,
      highScore: current.highScore,
    });

    client.lastActivity.set(guildId, Date.now());
  } else {
    // Wrong number - delete message, no reset
    await message.delete().catch(() => {});
  }
});

// Send leaderboard every LEADERBOARD_INTERVAL only if activity happened
async function sendLeaderboards() {
  for (const [guildId, channelId] of client.activeChannels.entries()) {
    const lastTime = client.lastActivity.get(guildId);
    if (!lastTime) continue; // No activity, skip

    const now = Date.now();
    if (now - lastTime > LEADERBOARD_INTERVAL) {
      // No recent activity, skip sending
      continue;
    }

    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) continue;

      const data = client.leaderboards.get(channelId);
      if (!data) continue;

      await channel.send(
        `🏆 **Leaderboard Update** 🏆\n` +
        `Top Scorer: **${data.username}**\n` +
        `Highest Count: **${data.score}**`
      );

      // Reset last activity to prevent spamming until next count
      client.lastActivity.set(guildId, 0);
    } catch (e) {
      console.error(`Failed to send leaderboard in channel ${channelId}:`, e);
    }
  }
}

// Periodic leaderboard posting
setInterval(() => {
  if (client.isReady()) {
    sendLeaderboards();
  }
}, LEADERBOARD_INTERVAL);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '⚠️ Error executing command.', ephemeral: true });
  }
});

client.login(process.env.TOKEN);
