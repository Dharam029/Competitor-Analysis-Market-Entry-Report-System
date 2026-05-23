const express = require('express');
const { get, all, run, trackChange } = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/competitor/:compId', authenticate, (req, res) => {
  res.json(all('SELECT * FROM competitor_pricing WHERE competitor_id = ?', [req.params.compId]));
});

router.post('/', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const { competitor_id, product_name, price_usd, pricing_model, discount_policy, distribution, notes } = req.body;
  if (!competitor_id || !product_name || price_usd === undefined) return res.status(400).json({ error: 'Competitor, product name, and price required' });
  const result = run(`INSERT INTO competitor_pricing (competitor_id, product_name, price_usd, pricing_model, discount_policy, distribution, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [competitor_id, product_name, price_usd, pricing_model || 'mid-range', discount_policy || '', distribution || '', notes || '']);
  const pricing = get('SELECT * FROM competitor_pricing WHERE pricing_id = ?', [result.lastInsertRowid]);
  trackChange('competitor_pricing', pricing.pricing_id, 'insert', pricing, req.user.user_id);
  req.app.get('io').emit('pricing:created', pricing);
  res.status(201).json(pricing);
});

router.put('/:id', authenticate, requireRole('admin', 'analyst'), (req, res) => {
  const old = get('SELECT * FROM competitor_pricing WHERE pricing_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Pricing not found' });
  const { product_name, price_usd, pricing_model, discount_policy, distribution, notes } = req.body;
  run(`UPDATE competitor_pricing SET product_name=?, price_usd=?, pricing_model=?, discount_policy=?, distribution=?, notes=? WHERE pricing_id=?`,
    [product_name || old.product_name, price_usd !== undefined ? price_usd : old.price_usd,
     pricing_model || old.pricing_model, discount_policy !== undefined ? discount_policy : old.discount_policy,
     distribution !== undefined ? distribution : old.distribution, notes !== undefined ? notes : old.notes, req.params.id]);
  const updated = get('SELECT * FROM competitor_pricing WHERE pricing_id = ?', [req.params.id]);
  trackChange('competitor_pricing', updated.pricing_id, 'update', { before: old, after: updated }, req.user.user_id);
  req.app.get('io').emit('pricing:updated', updated);
  res.json(updated);
});

router.delete('/:id', authenticate, requireRole('admin'), (req, res) => {
  const old = get('SELECT * FROM competitor_pricing WHERE pricing_id = ?', [req.params.id]);
  if (!old) return res.status(404).json({ error: 'Pricing not found' });
  run('DELETE FROM competitor_pricing WHERE pricing_id = ?', [req.params.id]);
  trackChange('competitor_pricing', Number(req.params.id), 'delete', old, req.user.user_id);
  req.app.get('io').emit('pricing:deleted', { pricing_id: Number(req.params.id), competitor_id: old.competitor_id });
  res.json({ success: true });
});

module.exports = router;
