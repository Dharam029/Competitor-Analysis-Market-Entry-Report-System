const express = require('express');
const { get, all } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, (req, res) => {
  const marketCount = get('SELECT COUNT(*) as c FROM markets').c;
  const compCount = get('SELECT COUNT(*) as c FROM competitors').c;
  const pricingCount = get('SELECT COUNT(*) as c FROM competitor_pricing').c;
  const strategyCount = get('SELECT COUNT(*) as c FROM market_entry_strategies').c;
  const reportCount = get('SELECT COUNT(*) as c FROM reports').c;
  const finalReports = get("SELECT COUNT(*) as c FROM reports WHERE status='final'").c;
  const riskCount = get("SELECT COUNT(*) as c FROM risks_opportunities WHERE type='risk'").c;
  const oppCount = get("SELECT COUNT(*) as c FROM risks_opportunities WHERE type='opportunity'").c;
  const totalRevenue = get('SELECT COALESCE(SUM(revenue_usd),0) as total FROM competitors').total;
  const totalInvestment = get('SELECT COALESCE(SUM(estimated_cost),0) as total FROM market_entry_strategies').total;
  const markets = all('SELECT * FROM markets');
  const countries = [...new Set(markets.map(m => m.country))];

  res.json({
    marketCount, compCount, pricingCount, strategyCount,
    reportCount, finalReports, riskCount, oppCount,
    totalRevenue, totalInvestment, countryCount: countries.length
  });
});

router.get('/activity', authenticate, (req, res) => {
  const activities = [];
  all('SELECT * FROM competitors ORDER BY created_at DESC LIMIT 5').forEach(c => activities.push({ text: `<strong>${c.company_name}</strong> added as competitor`, time: c.created_at, type: 'competitor' }));
  all('SELECT * FROM markets ORDER BY created_at DESC LIMIT 5').forEach(m => activities.push({ text: `Market <strong>${m.market_name}</strong> created`, time: m.created_at, type: 'market' }));
  all('SELECT * FROM market_entry_strategies ORDER BY created_at DESC LIMIT 5').forEach(s => activities.push({ text: `Strategy <strong>${s.strategy_title}</strong> planned`, time: s.created_at, type: 'strategy' }));
  all('SELECT * FROM reports ORDER BY created_at DESC LIMIT 5').forEach(r => activities.push({ text: `Report <strong>${r.report_title}</strong> &mdash; ${r.status}`, time: r.created_at, type: 'report' }));
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(activities.slice(0, 10));
});

module.exports = router;
