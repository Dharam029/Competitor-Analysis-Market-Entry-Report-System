const express = require('express');
const { get, all, run, exec, getChangeHistory, trackChange, markNotificationsRead, getNotifications } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/users', (req, res) => {
  res.json(all('SELECT user_id, username, email, role, created_at FROM users'));
});

router.post('/users', (req, res) => {
  const { username, email, password_hash, role } = req.body;
  if (!username || !email || !password_hash || !role) return res.status(400).json({ error: 'All fields required' });
  const existing = get('SELECT user_id FROM users WHERE username = ?', [username]);
  if (existing) return res.status(409).json({ error: 'Username already exists' });
  const result = run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', [username, email, password_hash, role]);
  const user = get('SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?', [result.lastInsertRowid]);
  trackChange('users', user.user_id, 'insert', user, req.user.user_id);
  res.status(201).json(user);
});

router.put('/users/:id', (req, res) => {
  const old = get('SELECT * FROM users WHERE user_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'User not found' });
  const { username, email, password_hash, role } = req.body;
  run('UPDATE users SET username=?, email=?, password_hash=?, role=? WHERE user_id=?',
    [username || old.username, email || old.email, password_hash || old.password_hash, role || old.role, req.params.id]);
  const updated = get('SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?', [req.params.id]);
  trackChange('users', updated.user_id, 'update', { before: old, after: updated }, req.user.user_id);
  res.json(updated);
});

router.delete('/users/:id', (req, res) => {
  const old = get('SELECT * FROM users WHERE user_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'User not found' });
  run('DELETE FROM users WHERE user_id = ?', [req.params.id]);
  trackChange('users', Number(req.params.id), 'delete', old, req.user.user_id);
  res.json({ success: true });
});

router.get('/export', (req, res) => {
  const tables = ['users', 'markets', 'competitors', 'competitor_pricing', 'swot_analysis', 'market_entry_strategies', 'reports', 'risks_opportunities'];
  const data = {};
  tables.forEach(t => { data[t] = all(`SELECT * FROM ${t}`); });
  res.json(data);
});

router.post('/import', (req, res) => {
  const data = req.body;
  const tables = ['markets', 'competitors', 'competitor_pricing', 'swot_analysis', 'market_entry_strategies', 'reports', 'risks_opportunities'];
  tables.forEach(t => {
    if (Array.isArray(data[t])) {
      data[t].forEach(row => {
        const cols = Object.keys(row).filter(k => k !== 'created_at');
        const vals = cols.map(c => row[c]);
        const placeholders = cols.map(() => '?').join(',');
        try {
          run(`INSERT OR IGNORE INTO ${t} (${cols.join(',')}) VALUES (${placeholders})`, vals);
        } catch {}
      });
    }
  });
  res.json({ success: true });
});

router.post('/reset', (req, res) => {
  exec('DELETE FROM risks_opportunities; DELETE FROM reports; DELETE FROM market_entry_strategies; DELETE FROM swot_analysis; DELETE FROM competitor_pricing; DELETE FROM competitors; DELETE FROM markets; DELETE FROM users; DELETE FROM change_history; DELETE FROM notifications;');
  const { seed } = require('../seed');
  seed();
  res.json({ success: true, message: 'Data reset to demo state' });
});

router.get('/changes', (req, res) => {
  res.json(getChangeHistory(100));
});

router.get('/stats', (req, res) => {
  const tables = ['users', 'markets', 'competitors', 'competitor_pricing', 'swot_analysis', 'market_entry_strategies', 'reports', 'risks_opportunities'];
  const counts = {};
  tables.forEach(t => { counts[t] = get(`SELECT COUNT(*) as count FROM ${t}`).count; });
  res.json(counts);
});

router.get('/notifications', (req, res) => {
  res.json(getNotifications(req.user.user_id));
});

router.post('/notifications/read', (req, res) => {
  markNotificationsRead(req.user.user_id);
  res.json({ success: true });
});

module.exports = router;
