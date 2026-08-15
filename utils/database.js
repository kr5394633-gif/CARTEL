const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'bot.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS warns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    moderatorId TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS whitelist (
    guildId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (guildId, userId)
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    guildId TEXT PRIMARY KEY,
    antiRaidEnabled INTEGER DEFAULT 1,
    antiNukeEnabled INTEGER DEFAULT 1,
    antiSpamEnabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guildId TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    timestamp INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_guild_time ON alerts (guildId, timestamp DESC);
`);

// ---------- Warns ----------
function addWarn(guildId, userId, moderatorId, reason) {
  const stmt = db.prepare(
    `INSERT INTO warns (guildId, userId, moderatorId, reason, timestamp) VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(guildId, userId, moderatorId, reason, Date.now());
  return info.lastInsertRowid;
}

function getWarns(guildId, userId) {
  return db
    .prepare(`SELECT * FROM warns WHERE guildId = ? AND userId = ? ORDER BY timestamp DESC`)
    .all(guildId, userId);
}

function countWarns(guildId, userId) {
  const row = db
    .prepare(`SELECT COUNT(*) as c FROM warns WHERE guildId = ? AND userId = ?`)
    .get(guildId, userId);
  return row.c;
}

function clearWarns(guildId, userId) {
  db.prepare(`DELETE FROM warns WHERE guildId = ? AND userId = ?`).run(guildId, userId);
}

// ---------- Whitelist ----------
function addWhitelist(guildId, userId) {
  db.prepare(`INSERT OR IGNORE INTO whitelist (guildId, userId) VALUES (?, ?)`).run(guildId, userId);
}

function removeWhitelist(guildId, userId) {
  db.prepare(`DELETE FROM whitelist WHERE guildId = ? AND userId = ?`).run(guildId, userId);
}

function getWhitelist(guildId) {
  return db.prepare(`SELECT userId FROM whitelist WHERE guildId = ?`).all(guildId).map((r) => r.userId);
}

function isWhitelisted(guildId, userId) {
  const row = db
    .prepare(`SELECT 1 FROM whitelist WHERE guildId = ? AND userId = ?`)
    .get(guildId, userId);
  return !!row;
}

// ---------- Guild settings (toggle switches) ----------
function ensureGuildSettings(guildId) {
  db.prepare(`INSERT OR IGNORE INTO guild_settings (guildId) VALUES (?)`).run(guildId);
}

function getGuildSettings(guildId) {
  ensureGuildSettings(guildId);
  return db.prepare(`SELECT * FROM guild_settings WHERE guildId = ?`).get(guildId);
}

function setGuildSetting(guildId, key, value) {
  ensureGuildSettings(guildId);
  const allowed = ['antiRaidEnabled', 'antiNukeEnabled', 'antiSpamEnabled'];
  if (!allowed.includes(key)) throw new Error(`Invalid setting key: ${key}`);
  db.prepare(`UPDATE guild_settings SET ${key} = ? WHERE guildId = ?`).run(value ? 1 : 0, guildId);
}

// ---------- Alerts (feeds the RED EXE dashboard's live activity panel) ----------
const MAX_ALERTS_PER_GUILD = 500;

function addAlert(guildId, category, title, description) {
  db.prepare(
    `INSERT INTO alerts (guildId, category, title, description, timestamp) VALUES (?, ?, ?, ?, ?)`
  ).run(guildId, category, title, description || '', Date.now());

  // keep the table bounded — prune anything past the most recent N per guild
  db.prepare(
    `DELETE FROM alerts WHERE guildId = ? AND id NOT IN (
       SELECT id FROM alerts WHERE guildId = ? ORDER BY timestamp DESC LIMIT ?
     )`
  ).run(guildId, guildId, MAX_ALERTS_PER_GUILD);
}

function getAlerts(guildId, limit = 50) {
  return db
    .prepare(`SELECT * FROM alerts WHERE guildId = ? ORDER BY timestamp DESC LIMIT ?`)
    .all(guildId, limit);
}

module.exports = {
  db,
  addWarn,
  getWarns,
  countWarns,
  clearWarns,
  addWhitelist,
  removeWhitelist,
  getWhitelist,
  isWhitelisted,
  getGuildSettings,
  setGuildSetting,
  addAlert,
  getAlerts,
};
