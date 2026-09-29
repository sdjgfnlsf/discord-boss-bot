// 결정석 가격 기본값 (단위: 메소)
const BOSS_PRICE_DEFAULTS = {
  '세렌': { normal: 167000000, hard: 302000000, extreme: 1840000000 },
  '칼로스': { easy: 238000000, normal: 479000000, hard: 1230000000, extreme: 4104000000 },
  '카링': { easy: 320000000, normal: 593000000, hard: 1560000000, extreme: 5387000000 },
  '림보': { normal: 995000000, hard: 2385000000 },
  '발드릭스': { normal: 1320000000, hard: 3078000000 },
  '최초의 대적자': { easy: 261000000, normal: 532000000, hard: 1390000000, extreme: 4712000000 },
  '찬란한 흉성': { normal: 576000000, hard: 2678000000 },
  '유피테르': { normal: 1560000000, hard: 4845000000 },
  '벨로나': { easy: 396000000, normal: 824000000, hard: 2950000000 },
  '가디언 엔젤 슬라임': { normal: null, hard: null },
  '스우': { normal: 8350000, hard: 48900000, extreme: 545000000 },
  '데미안': { normal: 8750000, hard: 46400000 },
  '가엔슬': { normal: 12700000, hard: 71300000 },
  '루시드': { easy: 14900000, normal: 17800000, hard: 59700000 },
  '윌': { easy: 16100000, normal: 20500000, hard: 73200000 },
  '더스크': { normal: 22000000, hard: 66300000 },
  '진 힐라': { normal: 67600000, hard: 100000000 },
  '둔켈': { normal: 23700000, hard: 89600000 },
  '검은 마법사': { hard: 665000000, extreme: 8740000000 }
};

const BOSS_NAME_ALIASES = { '듄켈': '둔켈' };
const DIFFICULTY_ALIASES = { chaos: 'hard' };

function findBossPriceKey(contentName) {
  const allKeys = [...Object.keys(BOSS_PRICE_DEFAULTS), ...Object.keys(BOSS_NAME_ALIASES)]
    .sort((a, b) => b.length - a.length);
  const matched = allKeys.find(key => contentName.includes(key));
  if (!matched) return null;
  return BOSS_NAME_ALIASES[matched] || matched;
}

function getBossPrice(item, priceTable) {
  const key = findBossPriceKey(item.content_name);
  if (!key) return null;
  const table = (priceTable && priceTable[key]) || BOSS_PRICE_DEFAULTS[key];
  if (!table) return null;
  const difficulty = (item.difficulty || '').toLowerCase();
  let price = table[difficulty];
  if (price === undefined && DIFFICULTY_ALIASES[difficulty]) {
    price = table[DIFFICULTY_ALIASES[difficulty]];
  }
  return typeof price === 'number' ? price : null;
}

function formatMeso(n) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`;
  return n.toLocaleString();
}

module.exports = { BOSS_PRICE_DEFAULTS, findBossPriceKey, getBossPrice, formatMeso };
