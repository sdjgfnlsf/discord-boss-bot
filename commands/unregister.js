const { SlashCommandBuilder } = require('discord.js');
const { getUser, saveUser } = require('../lib/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('삭제')
    .setDescription('등록한 캐릭터를 목록에서 지워요')
    .addStringOption(opt =>
      opt.setName('캐릭터명')
        .setDescription('지울 캐릭터 이름')
        .setRequired(true)),

  async execute(interaction) {
    const characterName = interaction.options.getString('캐릭터명').trim();
    const user = getUser(interaction.user.id);

    const before = (user.characters || []).length;
    user.characters = (user.characters || []).filter(c => c.name !== characterName);
    saveUser(interaction.user.id, user);

    if (user.characters.length === before) {
      await interaction.reply({ content: `"${characterName}" 이름으로 등록된 캐릭터를 못 찾았어요.`, ephemeral: true });
    } else {
      await interaction.reply({ content: `"${characterName}" 삭제했어요.`, ephemeral: true });
    }
  }
};
