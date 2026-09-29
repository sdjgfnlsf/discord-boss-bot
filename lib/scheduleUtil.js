function isRegistered(item) { return item.registration_flag === 'true' || item.registration_flag === true; }

// goals: { "몬스터파크": 2, ... } 처럼 사용자가 직접 설정한 개인 목표 횟수.
// content_name이 goals의 키를 포함하면 그 목표치를 max_count 대신 사용.
function findGoalCount(item, goals) {
  if (!goals) return null;
  const keys = Object.keys(goals).sort((a, b) => b.length - a.length);
  const matched = keys.find(key => item.content_name.includes(key));
  return matched ? goals[matched] : null;
}

function isDone(item, goals) {
  const goalCount = findGoalCount(item, goals);
  if (goalCount !== null && item.now_count !== undefined) {
    return item.now_count >= goalCount;
  }
  if (item.complete_flag !== undefined) return item.complete_flag === 'true' || item.complete_flag === true;
  if (item.quest_state !== undefined) return item.quest_state === '2';
  if (item.now_count !== undefined && item.max_count !== undefined) return item.now_count >= item.max_count;
  return false;
}

function formatItemLine(item, goals) {
  const dot = isDone(item, goals) ? '✅' : '⬜';
  const diff = item.difficulty ? ` (${item.difficulty})` : '';
  const goalCount = findGoalCount(item, goals);
  let count = '';
  if (item.max_count > 1) {
    count = goalCount !== null
      ? ` \`${item.now_count}/${goalCount}\`` // 개인 목표치로 표시 (예: 2/2)
      : ` \`${item.now_count}/${item.max_count}\``;
  }
  return `${dot} ${item.content_name}${diff}${count}`;
}

module.exports = { isRegistered, isDone, formatItemLine, findGoalCount };
