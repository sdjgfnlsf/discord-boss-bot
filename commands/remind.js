const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, saveUser } = require('../lib/storage');
const { isValidTimeStr, WEEKDAY_CHOICES, WEEKDAY_LABELS } = require('../lib/dateUtil');

function ensureReminderShape(user) {
  if (!user.reminder) user.reminder = {};
  if (!user.reminder.daily) user.reminder.daily = { enabled: false, time: null, lastSentDate: null };
  if (!user.reminder.weekly) user.reminder.weekly = { enabled: false, weekday: null, time: null, lastSentDate: null };
  return user;
}

// 캐릭터의 weeklyReminderIncluded/dailyReminderIncluded가 없으면(기존 캐릭터) 기본 포함으로 취급
function isWeeklyIncluded(char) {
  return char.weeklyReminderIncluded !== false;
}
function isDailyIncluded(char) {
  return char.dailyReminderIncluded !== false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('리마인더')
    .setDescription('미완료 숙제를 DM으로 알려줘요 (일일/주간+보스 따로 설정)')
    .addSubcommand(sub =>
      sub.setName('일일설정')
        .setDescription('매일 지정한 시간에 일일 숙제 미완료 알림')
        .addStringOption(opt =>
          opt.setName('시간')
            .setDescription('KST 24시간 기준 HH:mm (예: 23:00)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('일일끄기')
        .setDescription('일일 알림 끄기'))
    .addSubcommand(sub =>
      sub.setName('일일캐릭터')
        .setDescription('일일 알림에 특정 캐릭터를 포함/제외해요')
        .addStringOption(opt =>
          opt.setName('캐릭터명')
            .setDescription('등록된 캐릭터 이름')
            .setRequired(true))
        .addBooleanOption(opt =>
          opt.setName('포함')
            .setDescription('true=이 캐릭터도 일일 알림에 포함, false=제외')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('일일목표설정')
        .setDescription('일일 항목의 완료 기준 횟수를 직접 정해요 (예: 몬스터파크 무료 2회만)')
        .addStringOption(opt =>
          opt.setName('항목명')
            .setDescription('예: 몬스터파크 (스케줄러에 뜨는 이름 일부만 넣어도 돼요)')
            .setRequired(true))
        .addIntegerOption(opt =>
          opt.setName('목표횟수')
            .setDescription('이 횟수만 채우면 완료로 인식')
            .setRequired(true)
            .setMinValue(1)))
    .addSubcommand(sub =>
      sub.setName('일일목표해제')
        .setDescription('설정해둔 목표치를 지우고 게임 기본 최대 횟수 기준으로 되돌려요')
        .addStringOption(opt =>
          opt.setName('항목명')
            .setDescription('목표를 지울 항목 이름')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('주간설정')
        .setDescription('일주일에 한 번, 지정한 요일·시간에 주간+보스 미완료 알림')
        .addIntegerOption(opt =>
          opt.setName('요일')
            .setDescription('알림 받을 요일')
            .setRequired(true)
            .addChoices(...WEEKDAY_CHOICES))
        .addStringOption(opt =>
          opt.setName('시간')
            .setDescription('KST 24시간 기준 HH:mm (예: 21:00)')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('주간끄기')
        .setDescription('주간+보스 알림 끄기'))
    .addSubcommand(sub =>
      sub.setName('주간캐릭터')
        .setDescription('주간+보스 알림에 특정 캐릭터를 포함/제외해요')
        .addStringOption(opt =>
          opt.setName('캐릭터명')
            .setDescription('등록된 캐릭터 이름')
            .setRequired(true))
        .addBooleanOption(opt =>
          opt.setName('포함')
            .setDescription('true=이 캐릭터도 주간+보스 알림에 포함, false=제외')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('상태')
        .setDescription('현재 알림 설정 확인')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    let user = getUser(interaction.user.id);
    user = ensureReminderShape(user);

    if (sub === '일일설정') {
      const time = interaction.options.getString('시간');
      if (!isValidTimeStr(time)) {
        await interaction.reply({ content: '시간 형식이 올바르지 않아요. HH:mm 형식으로 입력해주세요 (예: 23:00).', ephemeral: true });
        return;
      }
      user.reminder.daily = { enabled: true, time, lastSentDate: null };
      saveUser(interaction.user.id, user);
      await interaction.reply({
        content: `✅ 매일 KST ${time}에 일일 숙제 미완료 항목이 있으면 DM으로 알려드릴게요.`,
        ephemeral: true
      });
      return;
    }

    if (sub === '일일끄기') {
      user.reminder.daily.enabled = false;
      saveUser(interaction.user.id, user);
      await interaction.reply({ content: '🔕 일일 알림을 껐어요.', ephemeral: true });
      return;
    }

    if (sub === '일일캐릭터') {
      const charName = interaction.options.getString('캐릭터명');
      const included = interaction.options.getBoolean('포함');
      const char = (user.characters || []).find(c => c.name === charName);
      if (!char) {
        await interaction.reply({ content: `"${charName}" 캐릭터를 못 찾았어요. \`/캐릭터목록\`으로 확인해주세요.`, ephemeral: true });
        return;
      }
      char.dailyReminderIncluded = included;
      saveUser(interaction.user.id, user);
      await interaction.reply({
        content: included
          ? `✅ "${charName}"도 이제 일일 알림에 포함돼요.`
          : `🔕 "${charName}"는 이제 일일 알림에서 제외돼요.`,
        ephemeral: true
      });
      return;
    }

    if (sub === '일일목표설정') {
      const itemName = interaction.options.getString('항목명').trim();
      const goalCount = interaction.options.getInteger('목표횟수');
      if (!user.dailyItemGoals) user.dailyItemGoals = {};
      user.dailyItemGoals[itemName] = goalCount;
      saveUser(interaction.user.id, user);
      await interaction.reply({
        content: `✅ "${itemName}" 포함하는 일일 항목은 이제 ${goalCount}번만 채우면 완료로 인식할게요.`,
        ephemeral: true
      });
      return;
    }

    if (sub === '일일목표해제') {
      const itemName = interaction.options.getString('항목명').trim();
      if (user.dailyItemGoals && user.dailyItemGoals[itemName] !== undefined) {
        delete user.dailyItemGoals[itemName];
        saveUser(interaction.user.id, user);
        await interaction.reply({ content: `"${itemName}" 목표치를 지웠어요. 이제 게임 기본 최대 횟수 기준으로 판정해요.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `"${itemName}"으로 설정된 목표치가 없어요.`, ephemeral: true });
      }
      return;
    }

    if (sub === '주간설정') {
      const weekday = interaction.options.getInteger('요일');
      const time = interaction.options.getString('시간');
      if (!isValidTimeStr(time)) {
        await interaction.reply({ content: '시간 형식이 올바르지 않아요. HH:mm 형식으로 입력해주세요 (예: 21:00).', ephemeral: true });
        return;
      }
      user.reminder.weekly = { enabled: true, weekday, time, lastSentDate: null };
      saveUser(interaction.user.id, user);
      await interaction.reply({
        content: `✅ 매주 ${WEEKDAY_LABELS[weekday]}요일 KST ${time}에 주간+보스 미완료 항목이 있으면 DM으로 알려드릴게요.`,
        ephemeral: true
      });
      return;
    }

    if (sub === '주간끄기') {
      user.reminder.weekly.enabled = false;
      saveUser(interaction.user.id, user);
      await interaction.reply({ content: '🔕 주간+보스 알림을 껐어요.', ephemeral: true });
      return;
    }

    if (sub === '주간캐릭터') {
      const charName = interaction.options.getString('캐릭터명');
      const included = interaction.options.getBoolean('포함');
      const char = (user.characters || []).find(c => c.name === charName);
      if (!char) {
        await interaction.reply({ content: `"${charName}" 캐릭터를 못 찾았어요. \`/캐릭터목록\`으로 확인해주세요.`, ephemeral: true });
        return;
      }
      char.weeklyReminderIncluded = included;
      saveUser(interaction.user.id, user);
      await interaction.reply({
        content: included
          ? `✅ "${charName}"도 이제 주간+보스 알림에 포함돼요.`
          : `🔕 "${charName}"는 이제 주간+보스 알림에서 제외돼요.`,
        ephemeral: true
      });
      return;
    }

    if (sub === '상태') {
      const d = user.reminder.daily;
      const w = user.reminder.weekly;
      const dailyChars = (user.characters || []).map(c => `${isDailyIncluded(c) ? '✅' : '🔕'} ${c.name}`).join('\n') || '등록된 캐릭터 없음';
      const weeklyChars = (user.characters || []).map(c => `${isWeeklyIncluded(c) ? '✅' : '🔕'} ${c.name}`).join('\n') || '등록된 캐릭터 없음';
      const goals = user.dailyItemGoals || {};
      const goalLines = Object.entries(goals).map(([name, count]) => `${name}: ${count}회`).join('\n') || '설정 없음 (게임 기본값 사용)';
      const embed = new EmbedBuilder()
        .setColor(0xC1502B)
        .setTitle('내 리마인더 설정')
        .addFields(
          {
            name: '일일',
            value: d.enabled ? `켜짐 ✅ · ${d.time} (KST)` : '꺼짐 🔕',
            inline: true
          },
          {
            name: '주간 + 보스',
            value: w.enabled ? `켜짐 ✅ · ${WEEKDAY_LABELS[w.weekday]}요일 ${w.time} (KST)` : '꺼짐 🔕',
            inline: true
          },
          {
            name: '일일 알림 대상 캐릭터',
            value: dailyChars,
            inline: true
          },
          {
            name: '주간+보스 알림 대상 캐릭터',
            value: weeklyChars,
            inline: true
          },
          {
            name: '일일 항목 개인 목표치',
            value: goalLines
          }
        );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
