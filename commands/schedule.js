const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getSchedule } = require('../lib/nexonApi');
const { getBossPrice, formatMeso } = require('../lib/bossPrices');
const { isRegistered, isDone, formatItemLine } = require('../lib/scheduleUtil');
const { getUser } = require('../lib/storage');

function buildScheduleEmbed(schedule, priceTable, goals) {
  const dailyItems = (schedule.daily_contents || []).filter(isRegistered);
  const weeklyItems = (schedule.weekly_contents || []).filter(isRegistered);
  const bossItems = (schedule.boss_contents || []).filter(isRegistered);

  const embed = new EmbedBuilder()
    .setColor(0xC1502B)
    .setTitle(`🍁 ${schedule.character_name}`)
    .setDescription(`Lv.${schedule.character_level} · ${schedule.character_class} · ${schedule.world_name}`);

  if (dailyItems.length === 0 && weeklyItems.length === 0 && bossItems.length === 0) {
    embed.addFields({
      name: '스케줄러 데이터 없음',
      value: '게임 내 스케줄러에 등록된 일일/주간/보스 항목이 없어요. 게임에서 먼저 추적할 항목을 등록해주세요.'
    });
    return embed;
  }

  if (dailyItems.length > 0) {
    const sorted = dailyItems.slice().sort((a, b) => (isDone(a, goals) ? 1 : 0) - (isDone(b, goals) ? 1 : 0));
    const done = dailyItems.filter(i => isDone(i, goals)).length;
    embed.addFields({
      name: `일일 (${done}/${dailyItems.length})`,
      value: sorted.map(i => formatItemLine(i, goals)).join('\n').slice(0, 1024) || '없음'
    });
  }

  if (weeklyItems.length > 0) {
    const sorted = weeklyItems.slice().sort((a, b) => (isDone(a, goals) ? 1 : 0) - (isDone(b, goals) ? 1 : 0));
    const done = weeklyItems.filter(i => isDone(i, goals)).length;
    embed.addFields({
      name: `주간 (${done}/${weeklyItems.length})`,
      value: sorted.map(i => formatItemLine(i, goals)).join('\n').slice(0, 1024) || '없음'
    });
  }

  if (bossItems.length > 0) {
    const sorted = bossItems.slice().sort((a, b) => (isDone(a, goals) ? 1 : 0) - (isDone(b, goals) ? 1 : 0));
    const lines = sorted.map(item => {
      const price = getBossPrice(item, priceTable);
      const priceText = price !== null ? ` \`${formatMeso(price)}\`` : '';
      return formatItemLine(item, goals) + priceText;
    });

    const income = bossItems.filter(i => isDone(i, goals)).reduce((sum, item) => sum + (getBossPrice(item, priceTable) || 0), 0);
    const clearInfo = (schedule.weekly_boss_clear_count !== undefined && schedule.weekly_boss_clear_limit_count)
      ? `${schedule.weekly_boss_clear_count}/${schedule.weekly_boss_clear_limit_count} 처치`
      : '';

    embed.addFields({
      name: `보스${clearInfo ? ` (${clearInfo})` : ''}`,
      value: lines.join('\n').slice(0, 1024) || '없음'
    });

    if (income > 0) {
      embed.addFields({ name: '이번 주 예상 수익', value: `💰 ${formatMeso(income)} 메소` });
    }
  }

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('숙제')
    .setDescription('등록된 캐릭터의 오늘/이번 주 숙제 현황과 보스 수익을 보여줘요')
    .addStringOption(opt =>
      opt.setName('캐릭터명')
        .setDescription('특정 캐릭터만 보고 싶으면 이름 입력 (비우면 전체)')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const user = getUser(interaction.user.id);
    if (!user.apiKey || !user.characters || user.characters.length === 0) {
      await interaction.editReply('등록된 캐릭터가 없어요. `/등록`으로 먼저 API 키와 캐릭터를 등록해주세요.');
      return;
    }

    const filterName = interaction.options.getString('캐릭터명');
    let targets = user.characters;
    if (filterName) {
      targets = targets.filter(c => c.name === filterName);
      if (targets.length === 0) {
        await interaction.editReply(`"${filterName}" 이름으로 등록된 캐릭터를 못 찾았어요. \`/캐릭터목록\`으로 확인해주세요.`);
        return;
      }
    }

    const priceTable = user.bossPrices || {};
    const goals = user.dailyItemGoals || {};
    const embeds = [];
    const errors = [];

    for (const char of targets) {
      try {
        const schedule = await getSchedule(user.apiKey, char.ocid);
        embeds.push(buildScheduleEmbed(schedule, priceTable, goals));
      } catch (e) {
        errors.push(`${char.name}: ${e.message}`);
      }
    }

    if (embeds.length === 0) {
      await interaction.editReply(`조회에 실패했어요.\n${errors.join('\n')}`);
      return;
    }

    // 디스코드 메시지 하나에 embed 최대 10개까지 가능
    await interaction.editReply({
      content: errors.length > 0 ? `⚠️ 일부 실패: ${errors.join(', ')}` : undefined,
      embeds: embeds.slice(0, 10)
    });
  }
};
