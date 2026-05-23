const express = require('express');
const { get, all, run, trackChange, logNotification } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { status } = req.query;
  if (status) return res.json(all('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC', [status]));
  res.json(all('SELECT * FROM reports ORDER BY created_at DESC'));
});

router.get('/:id', authenticate, (req, res) => {
  const r = get('SELECT * FROM reports WHERE report_id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Report not found' });
  res.json(r);
});

router.post('/', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { report_title, market_id, strategy_id, status, summary } = req.body;
  if (!report_title || !market_id) return res.status(400).json({ error: 'Title and market required' });
  const result = run(`INSERT INTO reports (report_title, market_id, strategy_id, status, summary, version, created_by) VALUES (?, ?, ?, ?, ?, 1, ?)`,
    [report_title, market_id, strategy_id || null, status || 'draft', summary || '', req.user.user_id]);
  const report = get('SELECT * FROM reports WHERE report_id = ?', [result.lastInsertRowid]);
  trackChange('reports', report.report_id, 'insert', report, req.user.user_id);
  logNotification(req.user.user_id, 'info', `Report "${report_title}" created`, 'reports', report.report_id);
  req.app.get('io').emit('report:created', report);
  res.status(201).json(report);
});

router.put('/:id', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const old = get('SELECT * FROM reports WHERE report_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Report not found' });
  const { report_title, market_id, strategy_id, status, summary } = req.body;
  const version = old.version + 1;
  run(`UPDATE reports SET report_title=?, market_id=?, strategy_id=?, status=?, summary=?, version=? WHERE report_id=?`,
    [report_title || old.report_title, market_id || old.market_id,
     strategy_id !== undefined ? strategy_id : old.strategy_id,
     status || old.status, summary !== undefined ? summary : old.summary, version, req.params.id]);
  const updated = get('SELECT * FROM reports WHERE report_id = ?', [req.params.id]);
  trackChange('reports', updated.report_id, 'update', { before: old, after: updated }, req.user.user_id);
  req.app.get('io').emit('report:updated', updated);
  res.json(updated);
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = get('SELECT * FROM reports WHERE report_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Report not found' });
  run('DELETE FROM reports WHERE report_id = ?', [req.params.id]);
  trackChange('reports', Number(req.params.id), 'delete', old, req.user.user_id);
  req.app.get('io').emit('report:deleted', { report_id: Number(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
