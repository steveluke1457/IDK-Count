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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const channelId = interaction.channel.id;
    const current = client.counts.get(channelId) || {
      count: 1,
      lastUserId: null,
      paused: false,
      highScore: 0
    };

    switch (sub) {
      case 'reset':
        client.counts.set(channelId, { count: 1, lastUserId: null, paused: false, highScore: current.highScore });
        await interaction.reply('🔁 Count has been reset to 1.');
        break;

      case 'set':
        const number = interaction.options.getInteger('number');
        client.counts.set(channelId, { count: number, lastUserId: null, paused: false, highScore: current.highScore });
        await interaction.reply(`🔢 Count has been set to ${number}.`);
        break;

      case 'stop':
        current.paused = true;
        client.counts.set(channelId, current);
        await interaction.reply('⏸️ Counting game paused.');
        break;

      case 'start':
        current.paused = false;
        client.counts.set(channelId, current);
        await interaction.reply('▶️ Counting game resumed.');
        break;

      case 'status':
        await interaction.reply(`📊 Current Count: **${current.count}**\n🏆 High Score: **${current.highScore || 0}**`);
        break;
    }
  }
};
