const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchHistoryRange } = require('../lib/nexonApi');
const { getUser } = require('../lib/storage');
const { resolveRange } = require('../lib/dateUtil');

function groupCount(records, field) {
  const counts = {};
  records.forEach(r => {
    const key = String(r[field] ?? '알 수 없음');
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function formatGroupCounts(counts, total, limit = 8) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, n]) => `${key}: ${n}회 (${((n / total) * 100).toFixed(1)}%)`)
    .join('\n');
}

// 스타 구간(before_starforce_count)별 성공률표
function buildStarSuccessTable(records) {
  const byStar = {};
  records.forEach(r => {
    const star = r.before_starforce_count;
    if (star === undefined || star === null) return;
    if (!byStar[star]) byStar[star] = { total: 0, success: 0 };
    byStar[star].total++;
    if (r.item_upgrade_result === '성공') byStar[star].success++;
  });

  const stars = Object.keys(byStar).map(Number).sort((a, b) => a - b);
  if (stars.length === 0) return null;

  return stars
    .slice(0, 15) // 임베드 필드 길이 제한 고려해 최대 15구간
    .map(star => {
      const { total, success } = byStar[star];
      return `${star}성→${star + 1}성: ${success}/${total} (${((success / total) * 100).toFixed(0)}%)`;
    })
    .join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('스타포스통계')
    .setDescription('기간 내 스타포스 강화 통계를 봐요 (기본: 최근 7일)')
    .addStringOption(opt =>
      opt.setName('캐릭터명')
        .setDescription('등록된 캐릭터 중 하나 (비우면 첫 번째 캐릭터)')
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName('시작일')
        .setDescription('YYYY-MM-DD (예: 2026-09-01)')
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName('종료일')
        .setDescription('YYYY-MM-DD, 비우면 오늘까지')
        .setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();

    const user = getUser(interaction.user.id);
    if (!user.apiKey || !user.characters || user.characters.length === 0) {
      await interaction.editReply('등록된 캐릭터가 없어요. `/등록`으로 먼저 등록해주세요.');
      return;
    }

    const charName = interaction.options.getString('캐릭터명');
    const char = charName
      ? user.characters.find(c => c.name === charName)
      : user.characters[0];
    if (!char) {
      await interaction.editReply(`"${charName}" 캐릭터를 못 찾았어요. \`/캐릭터목록\`으로 확인해주세요.`);
      return;
    }

    let range;
    try {
      range = resolveRange(
        interaction.options.getString('시작일'),
        interaction.options.getString('종료일')
      );
    } catch (e) {
      await interaction.editReply(e.message);
      return;
    }

    const { records, warnings } = await fetchHistoryRange(
      user.apiKey, '/history/starforce', range.start, range.end
    );

    const embed = new EmbedBuilder()
      .setColor(0xF1C40F)
      .setTitle(`⭐ ${char.name} 스타포스 통계`)
      .setDescription(`${range.start} ~ ${range.end}`);

    if (records.length === 0) {
      embed.addFields({ name: '결과 없음', value: '이 기간에 스타포스 강화 기록이 없어요.' });
    } else {
      embed.addFields({ name: '총 시도 횟수', value: `${records.length.toLocaleString()}회` });

      const byResult = groupCount(records, 'item_upgrade_result');
      embed.addFields({ name: '결과별', value: formatGroupCounts(byResult, records.length) });

      const byItem = groupCount(records, 'target_item');
      embed.addFields({ name: '아이템별 (상위)', value: formatGroupCounts(byItem, records.length, 6) });

      const starTable = buildStarSuccessTable(records);
      if (starTable) {
        embed.addFields({ name: '구간별 성공률', value: starTable.slice(0, 1024) });
      }
    }

    if (warnings.length > 0) {
      embed.addFields({ name: '⚠️ 알림', value: warnings.join('\n').slice(0, 1024) });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
