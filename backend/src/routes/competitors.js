const express = require('express');
const { get, all, run, trackChange, logNotification } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, (req, res) => {
  const { market_id } = req.query;
  if (market_id) return res.json(all('SELECT * FROM competitors WHERE market_id = ? ORDER BY created_at DESC', [market_id]));
  res.json(all('SELECT * FROM competitors ORDER BY created_at DESC'));
});

router.get('/:id', authenticate, (req, res) => {
  const c = get('SELECT * FROM competitors WHERE competitor_id = ?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Competitor not found' });
  res.json(c);
});

router.post('/', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { company_name, market_id, country_origin, founded_year, revenue_usd, market_share, website, description } = req.body;
  if (!company_name || !market_id) return res.status(400).json({ error: 'Company name and market required' });
  const result = run(`INSERT INTO competitors (company_name, market_id, country_origin, founded_year, revenue_usd, market_share, website, description, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [company_name, market_id, country_origin || '', founded_year || null, revenue_usd || 0, market_share || 0, website || '', description || '', req.user.user_id]);
  const comp = get('SELECT * FROM competitors WHERE competitor_id = ?', [result.lastInsertRowid]);
  trackChange('competitors', comp.competitor_id, 'insert', comp, req.user.user_id);
  logNotification(req.user.user_id, 'info', `Competitor "${company_name}" added`, 'competitors', comp.competitor_id);
  req.app.get('io').emit('competitor:created', comp);
  res.status(201).json(comp);
});

router.put('/:id', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const old = get('SELECT * FROM competitors WHERE competitor_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Competitor not found' });
  const { company_name, market_id, country_origin, founded_year, revenue_usd, market_share, website, description } = req.body;
  run(`UPDATE competitors SET company_name=?, market_id=?, country_origin=?, founded_year=?, revenue_usd=?, market_share=?, website=?, description=? WHERE competitor_id=?`,
    [company_name || old.company_name, market_id || old.market_id,
     country_origin !== undefined ? country_origin : old.country_origin,
     founded_year !== undefined ? founded_year : old.founded_year,
     revenue_usd !== undefined ? revenue_usd : old.revenue_usd,
     market_share !== undefined ? market_share : old.market_share,
     website !== undefined ? website : old.website,
     description !== undefined ? description : old.description, req.params.id]);
  const updated = get('SELECT * FROM competitors WHERE competitor_id = ?', [req.params.id]);
  trackChange('competitors', updated.competitor_id, 'update', { before: old, after: updated }, req.user.user_id);
  req.app.get('io').emit('competitor:updated', updated);
  res.json(updated);
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = get('SELECT * FROM competitors WHERE competitor_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Competitor not found' });
  run('DELETE FROM competitors WHERE competitor_id = ?', [req.params.id]);
  trackChange('competitors', Number(req.params.id), 'delete', old, req.user.user_id);
  req.app.get('io').emit('competitor:deleted', { competitor_id: Number(req.params.id) });
  res.json({ success: true });
});

module.exports = router;
