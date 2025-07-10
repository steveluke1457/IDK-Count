const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('count')
    .setDescription('Manage the counting game.')
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset the count to 1'))
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set a custom number to start from.')
        .addIntegerOption(opt =>
          opt.setName('number')
            .setDescription('Number to set as start')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('stop')
        .setDescription('Pause the counting game'))
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('Resume the counting game'))
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('Show current count and high score'))
    .addSubcommand(sub =>
      sub.setName('setchannel')
        .setDescription('Set the counting and leaderboard channel.')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel to set')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    switch (sub) {
      case 'reset': {
        const channelId = client.activeChannels.get(guildId);
        if (!channelId) return interaction.reply({ content: '❌ Counting channel not set yet.', ephemeral: true });

        client.counts.set(channelId, { count: 1, lastUserId: null, paused: false, highScore: client.counts.get(channelId)?.highScore || 0 });
        await interaction.reply('🔁 Count has been reset to 1.');
        break;
      }

      case 'set': {
        const number = interaction.options.getInteger('number');
        const channelId = client.activeChannels.get(guildId);
        if (!channelId) return interaction.reply({ content: '❌ Counting channel not set yet.', ephemeral: true });

        client.counts.set(channelId, { count: number, lastUserId: null, paused: false, highScore: client.counts.get(channelId)?.highScore || 0 });
        await interaction.reply(`🔢 Count has been set to ${number}.`);
        break;
      }

      case 'stop': {
        const channelId = client.activeChannels.get(guildId);
        if (!channelId) return interaction.reply({ content: '❌ Counting channel not set yet.', ephemeral: true });

        const current = client.counts.get(channelId) || { count: 1, lastUserId: null, paused: false, highScore: 0 };
        current.paused = true;
        client.counts.set(channelId, current);
        await interaction.reply('⏸️ Counting game paused.');
        break;
      }

      case 'start': {
        const channelId = client.activeChannels.get(guildId);
        if (!channelId) return interaction.reply({ content: '❌ Counting channel not set yet.', ephemeral: true });

        const current = client.counts.get(channelId) || { count: 1, lastUserId: null, paused: true, highScore: 0 };
        current.paused = false;
        client.counts.set(channelId, current);
        await interaction.reply('▶️ Counting game resumed.');
        break;
      }

      case 'status': {
        const channelId = client.activeChannels.get(guildId);
        if (!channelId) return interaction.reply({ content: '❌ Counting channel not set yet.', ephemeral: true });

        const current = client.counts.get(channelId) || { count: 1, lastUserId: null, paused: false, highScore: 0 };
        await interaction.reply(`📊 Current Count: **${current.count}**\n🏆 High Score: **${current.highScore || 0}**`);
        break;
      }

      case 'setchannel': {
        const channel = interaction.options.getChannel('channel');
        if (!channel || !channel.isTextBased()) {
          return interaction.reply({ content: '❌ Please specify a valid text channel.', ephemeral: true });
        }

        client.activeChannels.set(guildId, channel.id);
        // Initialize count state if none
        if (!client.counts.has(channel.id)) {
          client.counts.set(channel.id, { count: 1, lastUserId: null, paused: false, highScore: 0 });
        }

        await interaction.reply(`✅ Counting channel set to ${channel}.`);
        break;
      }
    }
  }
};
