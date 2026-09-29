const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOcid, getCharacterBasic } = require('../lib/nexonApi');
const { getUser, saveUser } = require('../lib/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('등록')
    .setDescription('넥슨 오픈 API 키와 캐릭터를 등록해요 (나만 볼 수 있게 응답해요)')
    .addStringOption(opt =>
      opt.setName('api키')
        .setDescription('넥슨 오픈 API 사이트에서 발급받은 키')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('캐릭터명')
        .setDescription('추적할 캐릭터 이름')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }); // 본인만 보이게

    const apiKey = interaction.options.getString('api키').trim();
    const characterName = interaction.options.getString('캐릭터명').trim();

    try {
      const ocid = await getOcid(apiKey, characterName);
      const info = await getCharacterBasic(apiKey, ocid);

      const user = getUser(interaction.user.id);
      user.apiKey = apiKey;
      if (!user.characters) user.characters = [];
      const existing = user.characters.find(c => c.name === info.name);
      if (existing) {
        existing.ocid = ocid;
      } else {
        user.characters.push({ name: info.name, ocid });
      }
      saveUser(interaction.user.id, user);

      const embed = new EmbedBuilder()
        .setColor(0xC1502B)
        .setTitle('✅ 등록 완료')
        .setDescription(`**${info.name}** 캐릭터가 등록됐어요.`)
        .addFields(
          { name: '레벨', value: `Lv.${info.level}`, inline: true },
          { name: '직업', value: info.job || '-', inline: true },
          { name: '월드', value: info.world || '-', inline: true }
        )
        .setFooter({ text: '/숙제 명령어로 확인해보세요' });
      if (info.image) embed.setThumbnail(info.image);

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply(`등록에 실패했어요: ${e.message}\nAPI 키나 캐릭터 이름을 다시 확인해주세요.`);
    }
  }
};
