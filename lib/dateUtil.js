function getTodayKst() {
  const now = new Date();
  const kstEpoch = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstEpoch).toISOString().slice(0, 10);
}

// 현재 KST 시각을 "HH:mm" 형태로 반환 (분 단위 크론 체크용)
function getNowKstHHMM() {
  const now = new Date();
  const kstEpoch = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstEpoch);
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isValidTimeStr(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

// JS Date.getDay() 규칙과 동일: 0=일, 1=월 ... 6=토
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_CHOICES = [
  { name: '월요일', value: 1 },
  { name: '화요일', value: 2 },
  { name: '수요일', value: 3 },
  { name: '목요일', value: 4 },
  { name: '금요일', value: 5 },
  { name: '토요일', value: 6 },
  { name: '일요일', value: 0 }
];

function getNowKstWeekday() {
  const now = new Date();
  const kstEpoch = now.getTime() + 9 * 60 * 60 * 1000;
  return new Date(kstEpoch).getUTCDay(); // 0=일 ... 6=토
}

function addDaysStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isValidDateStr(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + 'T00:00:00Z').getTime());
}

// 시작일/종료일 옵션(둘 다 선택 사항)을 받아 유효한 범위를 반환.
// 아무것도 안 주면 최근 7일(오늘 포함). 시작일만 있으면 그날부터 오늘까지.
function resolveRange(startOpt, endOpt, defaultDays = 7) {
  const todayKst = getTodayKst();
  let start = startOpt || addDaysStr(todayKst, -(defaultDays - 1));
  let end = endOpt || todayKst;

  if (!isValidDateStr(start) || !isValidDateStr(end)) {
    throw new Error('날짜는 YYYY-MM-DD 형식으로 입력해주세요 (예: 2026-09-01)');
  }
  if (start > end) [start, end] = [end, start];
  if (end > todayKst) end = todayKst;

  return { start, end };
}

module.exports = {
  getTodayKst, getNowKstHHMM, getNowKstWeekday, isValidTimeStr,
  WEEKDAY_LABELS, WEEKDAY_CHOICES,
  addDaysStr, isValidDateStr, resolveRange
};
