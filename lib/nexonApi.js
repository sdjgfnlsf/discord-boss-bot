const API_BASE = 'https://open.api.nexon.com/maplestory/v1';

async function nexonFetch(apiKey, endpoint, params) {
  const url = new URL(API_BASE + endpoint);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: { 'x-nxopen-api-key': apiKey }
  });
  const json = await res.json();
  if (!res.ok) {
    const message = (json && json.error && json.error.message) || `API 오류 (${res.status})`;
    throw new Error(`[${endpoint}] ${message}`);
  }
  return json;
}

// 어제 날짜(KST) - 넥슨 API는 하루 전 데이터 기준으로 제공됨.
// Date.getTime()은 항상 UTC epoch이므로 서버 시간대와 무관하게 안전하게 계산.
function getApiDate() {
  const now = new Date();
  const kstEpoch = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstEpoch);
  kst.setUTCDate(kst.getUTCDate() - 1);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function getOcid(apiKey, characterName) {
  const res = await nexonFetch(apiKey, '/id', { character_name: characterName });
  return res.ocid;
}

async function getCharacterBasic(apiKey, ocid) {
  const date = getApiDate();
  const basic = await nexonFetch(apiKey, '/character/basic', { ocid, date });
  let combatPower = null;
  try {
    const stat = await nexonFetch(apiKey, '/character/stat', { ocid, date });
    const found = (stat.final_stat || []).find(s => s.stat_name === '전투력');
    if (found) combatPower = found.stat_value;
  } catch (e) { /* 스탯 실패해도 기본정보는 반환 */ }

  return {
    name: basic.character_name,
    world: basic.world_name,
    job: basic.character_class,
    level: basic.character_level,
    image: basic.character_image,
    combatPower
  };
}

async function getSchedule(apiKey, ocid) {
  // date 생략 시 오늘 날짜로 자동 조회됨
  return await nexonFetch(apiKey, '/scheduler/character-state', { ocid });
}

// ---------- 큐브/스타포스 히스토리 (하루 단위 조회 + 커서 페이지네이션) ----------
function toDateParts(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

async function fetchHistoryDay(apiKey, endpoint, dateStr, cursor) {
  const { year, month, day } = toDateParts(dateStr);
  const dateParam = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const params = { date: dateParam, count: 1000 };
  if (cursor) params.cursor = cursor;
  return await nexonFetch(apiKey, endpoint, params);
}

// startDate ~ endDate (포함) 범위를 하루씩 돌면서 전부 모음.
// maxDays로 과도한 호출을 막음 (기본 31일).
async function fetchHistoryRange(apiKey, endpoint, startDate, endDate, { maxDays = 31 } = {}) {
  const start = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');
  const records = [];
  const warnings = [];
  let dayCount = 0;

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dayCount++;
    if (dayCount > maxDays) {
      warnings.push(`요청 범위가 너무 길어서 최근 ${maxDays}일까지만 조회했어요.`);
      break;
    }
    const dateStr = d.toISOString().slice(0, 10);
    let cursor = undefined;
    let guard = 0;
    do {
      let page;
      try {
        page = await fetchHistoryDay(apiKey, endpoint, dateStr, cursor);
      } catch (e) {
        warnings.push(`${dateStr}: ${e.message}`);
        break;
      }
      const items = page.cube_history || page.starforce_history || [];
      records.push(...items);
      cursor = page.next_cursor || null;
      guard++;
    } while (cursor && guard < 20); // 하루에 페이지가 20개(=최대 2만건) 넘으면 안전하게 중단
  }

  return { records, warnings };
}

module.exports = { getOcid, getCharacterBasic, getSchedule, nexonFetch, fetchHistoryRange };
