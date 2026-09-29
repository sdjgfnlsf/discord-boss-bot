const { SlashCommandBuilder } = require('discord.js');
const { BOSS_PRICE_DEFAULTS } = require('../lib/bossPrices');
const { getUser, saveUser } = require('../lib/storage');

const DIFFICULTY_CHOICES = [
  { name: '이지', value: 'easy' },
  { name: '노멀', value: 'normal' },
  { name: '하드', value: 'hard' },
  { name: '익스트림', value: 'extreme' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('가격수정')
    .setDescription('보스 결정석 가격을 내 기준으로 수정해요 (기본값 덮어씀)')
    .addStringOption(opt =>
      opt.setName('보스명')
        .setDescription('예: 스우, 카링, 검은 마법사')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('난이도')
        .setDescription('난이도')
        .setRequired(true)
        .addChoices(...DIFFICULTY_CHOICES))
    .addIntegerOption(opt =>
      opt.setName('가격')
        .setDescription('메소 단위 (예: 89600000)')
        .setRequired(true)),

  async execute(interaction) {
    const bossName = interaction.options.getString('보스명').trim();
    const difficulty = interaction.options.getString('난이도');
    const price = interaction.options.getInteger('가격');

    const user = getUser(interaction.user.id);
    if (!user.bossPrices) user.bossPrices = {};
    if (!user.bossPrices[bossName]) {
      user.bossPrices[bossName] = { ...(BOSS_PRICE_DEFAULTS[bossName] || {}) };
    }
    user.bossPrices[bossName][difficulty] = price;
    saveUser(interaction.user.id, user);

    await interaction.reply({
      content: `"${bossName}" ${DIFFICULTY_CHOICES.find(d => d.value === difficulty).name} 가격을 ${price.toLocaleString()} 메소로 저장했어요.`,
      ephemeral: true
    });
  }
};
