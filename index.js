// index.js
const { Client, GatewayIntentBits, Partials, Collection, Events } = require('discord.js');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.counts = new Map();
client.commands = new Collection();

// Load slash command(s)
const countCommand = require('./commands/count');
client.commands.set(countCommand.data.name, countCommand);

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot is ready: ${client.user.tag}`);

  // Register slash command(s) for all guilds
  const guilds = await client.guilds.fetch();
  for (const [guildId] of guilds) {
    const guild = await client.guilds.fetch(guildId);
    await guild.commands.set([countCommand.data]);
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  const channel = message.channel;
  const current = client.counts.get(channel.id) || { count: 1, lastUserId: null, paused: false, highScore: 0 };

  if (current.paused) return;

  const num = parseInt(message.content.trim());
  if (isNaN(num)) return;

  if (current.lastUserId === message.author.id) {
    channel.send('❌ You can’t count twice! Resetting to 1.');
    client.counts.set(channel.id, { count: 1, lastUserId: null, paused: current.paused, highScore: current.highScore });
    return;
  }

  if (num === current.count) {
    try {
      await message.react('✅');
    } catch {}
    client.counts.set(channel.id, {
      count: current.count + 1,
      lastUserId: message.author.id,
      paused: current.paused,
      highScore: Math.max(current.highScore, current.count)
    });
  } else {
    channel.send('❌ Wrong number! Resetting to 1.');
    client.counts.set(channel.id, { count: 1, lastUserId: null, paused: current.paused, highScore: current.highScore });
  }
});

client.on('interactionCreate', async interaction => {
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
