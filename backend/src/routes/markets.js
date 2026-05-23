const express = require('express');
const { get, all, run, trackChange, logNotification } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  res.json(all('SELECT * FROM markets ORDER BY created_at DESC'));
});

router.get('/:id', authenticate, (req, res) => {
  const m = get('SELECT * FROM markets WHERE market_id = ?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Market not found' });
  res.json(m);
});

router.post('/', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { market_name, country, industry, market_size_usd, growth_rate, target_segment } = req.body;
  if (!market_name || !country) return res.status(400).json({ error: 'Name and country required' });
  const result = run(`INSERT INTO markets (market_name, country, industry, market_size_usd, growth_rate, target_segment, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [market_name, country, industry || '', market_size_usd || 0, growth_rate || 0, target_segment || '', req.user.user_id]);
  const market = get('SELECT * FROM markets WHERE market_id = ?', [result.lastInsertRowid]);
  trackChange('markets', market.market_id, 'insert', market, req.user.user_id);
  logNotification(req.user.user_id, 'info', `Market "${market_name}" created`, 'markets', market.market_id);
  req.app.get('io').emit('market:created', market);
  res.status(201).json(market);
});

router.put('/:id', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const old = get('SELECT * FROM markets WHERE market_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Market not found' });
  const { market_name, country, industry, market_size_usd, growth_rate, target_segment } = req.body;
  run(`UPDATE markets SET market_name=?, country=?, industry=?, market_size_usd=?, growth_rate=?, target_segment=? WHERE market_id=?`,
    [market_name || old.market_name, country || old.country, industry !== undefined ? industry : old.industry,
     market_size_usd !== undefined ? market_size_usd : old.market_size_usd,
     growth_rate !== undefined ? growth_rate : old.growth_rate,
     target_segment !== undefined ? target_segment : old.target_segment, req.params.id]);
  const updated = get('SELECT * FROM markets WHERE market_id = ?', [req.params.id]);
  trackChange('markets', updated.market_id, 'update', { before: old, after: updated }, req.user.user_id);
  req.app.get('io').emit('market:updated', updated);
  res.json(updated);
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = get('SELECT * FROM markets WHERE market_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Market not found' });
  run('DELETE FROM markets WHERE market_id = ?', [req.params.id]);
  trackChange('markets', Number(req.params.id), 'delete', old, req.user.user_id);
  req.app.get('io').emit('market:deleted', { market_id: Number(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
