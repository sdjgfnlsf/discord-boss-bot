const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../lib/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('캐릭터목록')
    .setDescription('내가 등록한 캐릭터 목록을 봐요'),

  async execute(interaction) {
    const user = getUser(interaction.user.id);
    if (!user.characters || user.characters.length === 0) {
      await interaction.reply({ content: '등록된 캐릭터가 없어요. `/등록`으로 먼저 추가해주세요.', ephemeral: true });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xC1502B)
      .setTitle('내 캐릭터 목록')
      .setDescription(user.characters.map(c => `• ${c.name}`).join('\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
