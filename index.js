require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { checkAndSendReminders } = require('./lib/reminder');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ 로그인 완료: ${client.user.tag}`);

  // 매분 KST 기준 시각을 체크해서 리마인더 대상인 유저에게 DM 발송
  cron.schedule('* * * * *', () => {
    checkAndSendReminders(client).catch(e => console.error('리마인더 체크 중 오류:', e));
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    const errorMessage = { content: '명령어 실행 중 오류가 났어요.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(errorMessage).catch(() => {});
    } else {
      await interaction.reply(errorMessage).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
