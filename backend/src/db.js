const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'competitoriq.db');
let db = null;

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

async function getDb() {
  if (db) return db;
  ensureDir(DB_PATH);
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
  return db;
}

function q(sql, params = []) {
  const stmt = db.prepare(sql);
  if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('WITH') || sql.trim().toUpperCase().startsWith('PRAGMA')) {
    if (params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } else {
    const result = stmt.run(params);
    stmt.free();
    saveDb();
    return result;
  }
}

function get(sql, params = []) {
  const rows = q(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  return q(sql, params);
}

function all(sql, params = []) {
  return q(sql, params);
}

function exec(sql) {
  db.run(sql);
  saveDb();
}

function initSchema() {
  exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'analyst' CHECK(role IN ('admin','analyst','viewer')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS markets (
      market_id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_name TEXT NOT NULL,
      country TEXT NOT NULL,
      industry TEXT DEFAULT '',
      market_size_usd REAL DEFAULT 0,
      growth_rate REAL DEFAULT 0,
      target_segment TEXT DEFAULT '',
      created_by INTEGER REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competitors (
      competitor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL REFERENCES markets(market_id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      country_origin TEXT DEFAULT '',
      founded_year INTEGER,
      revenue_usd REAL DEFAULT 0,
      market_share REAL DEFAULT 0,
      website TEXT DEFAULT '',
      description TEXT DEFAULT '',
      added_by INTEGER REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competitor_pricing (
      pricing_id INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id INTEGER NOT NULL REFERENCES competitors(competitor_id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      price_usd REAL NOT NULL,
      pricing_model TEXT DEFAULT 'mid-range' CHECK(pricing_model IN ('budget','mid-range','premium')),
      discount_policy TEXT DEFAULT '',
      distribution TEXT DEFAULT '',
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS swot_analysis (
      swot_id INTEGER PRIMARY KEY AUTOINCREMENT,
      competitor_id INTEGER NOT NULL REFERENCES competitors(competitor_id) ON DELETE CASCADE,
      strengths TEXT DEFAULT '',
      weaknesses TEXT DEFAULT '',
      opportunities TEXT DEFAULT '',
      threats TEXT DEFAULT '',
      analyzed_by INTEGER REFERENCES users(user_id),
      analyzed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_entry_strategies (
      strategy_id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL REFERENCES markets(market_id) ON DELETE CASCADE,
      strategy_title TEXT NOT NULL,
      entry_mode TEXT NOT NULL CHECK(entry_mode IN ('joint venture','direct export','acquisition','franchise','greenfield')),
      target_segment TEXT DEFAULT '',
      estimated_cost REAL DEFAULT 0,
      timeline_months INTEGER DEFAULT 0,
      key_risks TEXT DEFAULT '',
      expected_roi REAL DEFAULT 0,
      created_by INTEGER REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL REFERENCES markets(market_id) ON DELETE CASCADE,
      strategy_id INTEGER REFERENCES market_entry_strategies(strategy_id),
      report_title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','final','archived')),
      created_by INTEGER REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS risks_opportunities (
      tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_id INTEGER NOT NULL REFERENCES markets(market_id) ON DELETE CASCADE,
      competitor_id INTEGER REFERENCES competitors(competitor_id) ON DELETE SET NULL,
      type TEXT NOT NULL CHECK(type IN ('risk','opportunity')),
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      severity TEXT DEFAULT 'medium' CHECK(severity IN ('low','medium','high')),
      tagged_by INTEGER REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS change_history (
      change_id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      action TEXT NOT NULL CHECK(action IN ('insert','update','delete')),
      changes TEXT DEFAULT '{}',
      user_id INTEGER REFERENCES users(user_id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(user_id),
      type TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      related_table TEXT,
      related_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getChangeHistory(limit = 50) {
  return all(`SELECT ch.*, u.username FROM change_history ch LEFT JOIN users u ON ch.user_id = u.user_id ORDER BY ch.created_at DESC LIMIT ?`, [limit]);
}

function trackChange(table, recordId, action, changes, userId) {
  run(`INSERT INTO change_history (table_name, record_id, action, changes, user_id) VALUES (?, ?, ?, ?, ?)`,
    [table, recordId, action, JSON.stringify(changes), userId]);
}

function logNotification(userId, type, message, relatedTable, relatedId) {
  run(`INSERT INTO notifications (user_id, type, message, related_table, related_id) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, message, relatedTable, relatedId]);
}

function getNotifications(userId) {
  return all(`SELECT * FROM notifications WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT 20`, [userId]);
}

function markNotificationsRead(userId) {
  run(`UPDATE notifications SET is_read = 1 WHERE user_id = ?`, [userId]);
}

module.exports = { db, getDb, initSchema, getChangeHistory, trackChange, logNotification, getNotifications, markNotificationsRead, get, all, run, exec };
