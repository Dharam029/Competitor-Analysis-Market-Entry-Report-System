const express = require('express');
const { get, all, run, trackChange, logNotification } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { market_id } = req.query;
  if (market_id) return res.json(all('SELECT * FROM market_entry_strategies WHERE market_id = ? ORDER BY created_at DESC', [market_id]));
  res.json(all('SELECT * FROM market_entry_strategies ORDER BY created_at DESC'));
});

router.get('/:id', authenticate, (req, res) => {
  const s = get('SELECT * FROM market_entry_strategies WHERE strategy_id = ?', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Strategy not found' });
  res.json(s);
});

router.post('/', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { strategy_title, market_id, entry_mode, target_segment, estimated_cost, timeline_months, key_risks, expected_roi } = req.body;
  if (!strategy_title || !market_id || !entry_mode) return res.status(400).json({ error: 'Title, market, and entry mode required' });
  const result = run(`INSERT INTO market_entry_strategies (strategy_title, market_id, entry_mode, target_segment, estimated_cost, timeline_months, key_risks, expected_roi, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [strategy_title, market_id, entry_mode, target_segment || '', estimated_cost || 0, timeline_months || 0, key_risks || '', expected_roi || 0, req.user.user_id]);
  const strategy = get('SELECT * FROM market_entry_strategies WHERE strategy_id = ?', [result.lastInsertRowid]);
  trackChange('market_entry_strategies', strategy.strategy_id, 'insert', strategy, req.user.user_id);
  logNotification(req.user.user_id, 'info', `Strategy "${strategy_title}" created`, 'strategies', strategy.strategy_id);
  req.app.get('io').emit('strategy:created', strategy);
  res.status(201).json(strategy);
});

router.put('/:id', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const old = get('SELECT * FROM market_entry_strategies WHERE strategy_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Strategy not found' });
  const { strategy_title, market_id, entry_mode, target_segment, estimated_cost, timeline_months, key_risks, expected_roi } = req.body;
  run(`UPDATE market_entry_strategies SET strategy_title=?, market_id=?, entry_mode=?, target_segment=?, estimated_cost=?, timeline_months=?, key_risks=?, expected_roi=? WHERE strategy_id=?`,
    [strategy_title || old.strategy_title, market_id || old.market_id, entry_mode || old.entry_mode,
     target_segment !== undefined ? target_segment : old.target_segment,
     estimated_cost !== undefined ? estimated_cost : old.estimated_cost,
     timeline_months !== undefined ? timeline_months : old.timeline_months,
     key_risks !== undefined ? key_risks : old.key_risks,
     expected_roi !== undefined ? expected_roi : old.expected_roi, req.params.id]);
  const updated = get('SELECT * FROM market_entry_strategies WHERE strategy_id = ?', [req.params.id]);
  trackChange('market_entry_strategies', updated.strategy_id, 'update', { before: old, after: updated }, req.user.user_id);
  req.app.get('io').emit('strategy:updated', updated);
  res.json(updated);
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = get('SELECT * FROM market_entry_strategies WHERE strategy_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Strategy not found' });
  run('DELETE FROM market_entry_strategies WHERE strategy_id = ?', [req.params.id]);
  trackChange('market_entry_strategies', Number(req.params.id), 'delete', old, req.user.user_id);
  req.app.get('io').emit('strategy:deleted', { strategy_id: Number(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
