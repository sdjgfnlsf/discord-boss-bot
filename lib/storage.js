const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'users.json');

function loadAll() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('유저 데이터 로드 실패:', e);
  }
  return {};
}

function saveAll(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getUser(discordUserId) {
  const all = loadAll();
  return all[discordUserId] || { apiKey: '', characters: [] };
}

function saveUser(discordUserId, userData) {
  const all = loadAll();
  all[discordUserId] = userData;
  saveAll(all);
}

function getAllUsers() {
  return loadAll();
}

module.exports = { getUser, saveUser, getAllUsers };
