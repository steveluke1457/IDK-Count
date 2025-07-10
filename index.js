const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

client.counts = new Map();

client.on('ready', () => {
  console.log(`Bot is ready: ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const channel = message.channel;
  const current = client.counts.get(channel.id) || { count: 1, lastUserId: null };

  const num = parseInt(message.content.trim());
  if (isNaN(num)) return;

  if (current.lastUserId === message.author.id) {
    channel.send('❌ You can’t count twice! Resetting to 1.');
    client.counts.set(channel.id, { count: 1, lastUserId: null });
    return;
  }

  if (num === current.count) {
    try {
      await message.react('✅');
    } catch {}
    client.counts.set(channel.id, {
      count: current.count + 1,
      lastUserId: message.author.id
    });
  } else {
    channel.send('❌ Wrong number! Resetting to 1.');
    client.counts.set(channel.id, { count: 1, lastUserId: null });
  }
});

client.login(process.env.TOKEN);
