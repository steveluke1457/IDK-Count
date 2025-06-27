import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  setInterval(async () => {
    const channel = await client.channels.fetch(process.env.CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      channel.send('/bump');
      console.log('⏰ Sent /bump');
    }
  }, (120 * 60 + 30) * 1000); // every 2 hours and 30 seconds
});

client.login(process.env.DISCORD_TOKEN);