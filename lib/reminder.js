const { EmbedBuilder } = require('discord.js');
const { getSchedule } = require('./nexonApi');
const { getAllUsers, saveUser } = require('./storage');
const { getTodayKst, getNowKstHHMM, getNowKstWeekday, WEEKDAY_LABELS } = require('./dateUtil');
const { isRegistered, isDone } = require('./scheduleUtil');

// categories: ['daily'] 또는 ['weekly', 'boss'] 처럼, 캐릭터별로 어떤 영역의 미완료 항목을 모을지 지정
async function collectIncomplete(apiKey, characters, categories, goals) {
  const lines = [];
  for (const char of characters) {
    try {
      const schedule = await getSchedule(apiKey, char.ocid);
      const parts = [];

      if (categories.includes('daily')) {
        const daily = (schedule.daily_contents || []).filter(isRegistered).filter(i => !isDone(i, goals));
        if (daily.length > 0) parts.push(`일일 미완료 ${daily.length}개: ${daily.map(i => i.content_name).join(', ')}`);
      }
      if (categories.includes('weekly')) {
        const weekly = (schedule.weekly_contents || []).filter(isRegistered).filter(i => !isDone(i, goals));
        if (weekly.length > 0) parts.push(`주간 미완료 ${weekly.length}개: ${weekly.map(i => i.content_name).join(', ')}`);
      }
      if (categories.includes('boss')) {
        const boss = (schedule.boss_contents || []).filter(isRegistered).filter(i => !isDone(i, goals));
        if (boss.length > 0) {
          const clearInfo = (schedule.weekly_boss_clear_count !== undefined && schedule.weekly_boss_clear_limit_count)
            ? ` (${schedule.weekly_boss_clear_count}/${schedule.weekly_boss_clear_limit_count} 처치)`
            : '';
          parts.push(`보스 미처치 ${boss.length}개${clearInfo}: ${boss.map(i => `${i.content_name}(${i.difficulty})`).join(', ')}`);
        }
      }

      if (parts.length > 0) lines.push(`**${schedule.character_name}**\n${parts.join('\n')}`);
    } catch (e) {
      // 개별 캐릭터 조회 실패는 조용히 건너뜀
    }
  }
  return lines;
}

async function sendReminderDM(client, discordUserId, title, lines, footer) {
  const discordUser = await client.users.fetch(discordUserId);
  const embed = new EmbedBuilder()
    .setColor(0xC1502B)
    .setTitle(title)
    .setDescription(lines.join('\n\n'))
    .setFooter({ text: footer });
  await discordUser.send({ embeds: [embed] }).catch(() => {
    // DM 막힌 유저는 조용히 무시
  });
}

async function checkAndSendReminders(client) {
  const nowHHMM = getNowKstHHMM();
  const nowWeekday = getNowKstWeekday();
  const today = getTodayKst();
  const allUsers = getAllUsers();

  for (const [discordUserId, user] of Object.entries(allUsers)) {
    if (!user.apiKey || !user.characters || user.characters.length === 0) continue;
    const r = user.reminder;
    if (!r) continue;
    const goals = user.dailyItemGoals || {};

    // ---- 일일 알림: 매일 지정한 시간 ----
    const daily = r.daily;
    if (daily && daily.enabled && daily.time === nowHHMM && daily.lastSentDate !== today) {
      try {
        const dailyChars = user.characters.filter(c => c.dailyReminderIncluded !== false);
        const lines = await collectIncomplete(user.apiKey, dailyChars, ['daily'], goals);
        daily.lastSentDate = today;
        saveUser(discordUserId, user);
        if (lines.length > 0) {
          await sendReminderDM(client, discordUserId, '🍁 오늘 일일 숙제 미완료',
            lines, '/리마인더 일일끄기 로 알림을 끌 수 있어요');
        }
      } catch (e) {
        console.error(`일일 리마인더 실패 (${discordUserId}):`, e.message);
      }
    }

    // ---- 주간(+보스) 알림: 지정한 요일의 지정한 시간에 주 1회 ----
    const weekly = r.weekly;
    if (weekly && weekly.enabled && weekly.weekday === nowWeekday && weekly.time === nowHHMM && weekly.lastSentDate !== today) {
      try {
        const weeklyChars = user.characters.filter(c => c.weeklyReminderIncluded !== false);
        const lines = await collectIncomplete(user.apiKey, weeklyChars, ['weekly', 'boss'], goals);
        weekly.lastSentDate = today;
        saveUser(discordUserId, user);
        if (lines.length > 0) {
          await sendReminderDM(client, discordUserId, `🗓️ ${WEEKDAY_LABELS[nowWeekday]}요일 주간·보스 미완료`,
            lines, '/리마인더 주간끄기 로 알림을 끌 수 있어요');
        }
      } catch (e) {
        console.error(`주간 리마인더 실패 (${discordUserId}):`, e.message);
      }
    }
  }
}

module.exports = { checkAndSendReminders };
