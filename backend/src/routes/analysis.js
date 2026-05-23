const express = require('express');
const { get, all, run, trackChange } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/swot/competitor/:compId', authenticate, (req, res) => {
  const swot = get('SELECT * FROM swot_analysis WHERE competitor_id = ?', [req.params.compId]);
  res.json(swot || null);
});

router.post('/swot', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { competitor_id, strengths, weaknesses, opportunities, threats } = req.body;
  if (!competitor_id) return res.status(400).json({ error: 'Competitor ID required' });
  const existing = get('SELECT * FROM swot_analysis WHERE competitor_id = ?', [competitor_id]);
  if (existing) {
    run(`UPDATE swot_analysis SET strengths=?, weaknesses=?, opportunities=?, threats=?, analyzed_by=?, analyzed_at=datetime('now') WHERE swot_id=?`,
      [strengths || '', weaknesses || '', opportunities || '', threats || '', req.user.user_id, existing.swot_id]);
    const updated = get('SELECT * FROM swot_analysis WHERE swot_id = ?', [existing.swot_id]);
    trackChange('swot_analysis', updated.swot_id, 'update', updated, req.user.user_id);
    req.app.get('io').emit('swot:updated', updated);
    return res.json(updated);
  }
  const result = run(`INSERT INTO swot_analysis (competitor_id, strengths, weaknesses, opportunities, threats, analyzed_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [competitor_id, strengths || '', weaknesses || '', opportunities || '', threats || '', req.user.user_id]);
  const swot = get('SELECT * FROM swot_analysis WHERE swot_id = ?', [result.lastInsertRowid]);
  trackChange('swot_analysis', swot.swot_id, 'insert', swot, req.user.user_id);
  req.app.get('io').emit('swot:created', swot);
  res.status(201).json(swot);
});

router.get('/risks', authenticate, (req, res) => {
  const { market_id, type } = req.query;
  let sql = 'SELECT * FROM risks_opportunities';
  const params = [];
  const wheres = [];
  if (market_id) { wheres.push('market_id = ?'); params.push(market_id); }
  if (type) { wheres.push('type = ?'); params.push(type); }
  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY created_at DESC';
  res.json(all(sql, params));
});

router.get('/risks/:id', authenticate, (req, res) => {
  const r = get('SELECT * FROM risks_opportunities WHERE tag_id = ?', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'Tag not found' });
  res.json(r);
});

router.post('/risks', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { market_id, competitor_id, type, title, description, severity } = req.body;
  if (!market_id || !type || !title) return res.status(400).json({ error: 'Market, type, and title required' });
  const result = run(`INSERT INTO risks_opportunities (market_id, competitor_id, type, title, description, severity, tagged_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [market_id, competitor_id || null, type, title, description || '', severity || 'medium', req.user.user_id]);
  const risk = get('SELECT * FROM risks_opportunities WHERE tag_id = ?', [result.lastInsertRowid]);
  trackChange('risks_opportunities', risk.tag_id, 'insert', risk, req.user.user_id);
  req.app.get('io').emit('risk:created', risk);
  res.status(201).json(risk);
});

router.put('/risks/:id', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const old = get('SELECT * FROM risks_opportunities WHERE tag_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Tag not found' });
  const { market_id, competitor_id, type, title, description, severity } = req.body;
  run(`UPDATE risks_opportunities SET market_id=?, competitor_id=?, type=?, title=?, description=?, severity=? WHERE tag_id=?`,
    [market_id || old.market_id, competitor_id !== undefined ? competitor_id : old.competitor_id,
     type || old.type, title || old.title, description !== undefined ? description : old.description,
     severity || old.severity, req.params.id]);
  const updated = get('SELECT * FROM risks_opportunities WHERE tag_id = ?', [req.params.id]);
  trackChange('risks_opportunities', updated.tag_id, 'update', { before: old, after: updated }, req.user.user_id);
  req.app.get('io').emit('risk:updated', updated);
  res.json(updated);
});

router.delete('/risks/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = get('SELECT * FROM risks_opportunities WHERE tag_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Tag not found' });
  run('DELETE FROM risks_opportunities WHERE tag_id = ?', [req.params.id]);
  trackChange('risks_opportunities', Number(req.params.id), 'delete', old, req.user.user_id);
  req.app.get('io').emit('risk:deleted', { tag_id: Number(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
