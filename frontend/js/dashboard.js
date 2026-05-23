const DashboardPage = (() => {
  let charts = {};

  async function init() {
    await render();
    App.updateNavBadges();
    SocketClient.on('market:created', () => render());
    SocketClient.on('market:updated', () => render());
    SocketClient.on('competitor:created', () => render());
    SocketClient.on('competitor:updated', () => render());
    SocketClient.on('strategy:created', () => render());
    SocketClient.on('strategy:updated', () => render());
    SocketClient.on('report:created', () => render());
    SocketClient.on('report:updated', () => render());
  }

  async function render() {
    const container = document.getElementById('page-dashboard');
    try {
      const [markets, competitors, strategies, reports, stats, activities] = await Promise.all([
        API.Markets.list(),
        API.Competitors.list(),
        API.Strategies.list(),
        API.Reports.list(),
        API.Dashboard.stats(),
        API.Dashboard.activity(),
      ]);

      App.cache('markets', markets);
      App.cache('competitors', competitors);

      const totalRevenue = competitors.reduce((s, c) => s + (c.revenue_usd || 0), 0);
      App.cache('stats', stats);

      container.innerHTML = `
        <div class="kpi-grid stagger-in">
          <div class="card kpi-card">
            <div class="kpi-label">Total Markets</div>
            <div class="kpi-value">${markets.length}</div>
            <div class="kpi-change positive">${stats.countryCount} countries tracked</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-label">Competitors</div>
            <div class="kpi-value">${competitors.length}</div>
            <div class="kpi-change">${stats.pricingCount} products analyzed</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-label">Active Strategies</div>
            <div class="kpi-value">${strategies.length}</div>
            <div class="kpi-change">${App.formatCurrency(strategies.reduce((s, st) => s + (st.estimated_cost || 0), 0))} invested</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi-label">Reports</div>
            <div class="kpi-value">${reports.length}</div>
            <div class="kpi-change">${stats.finalReports} finalized</div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card chart-card">
            <div class="card-header"><h3>Market Share Distribution</h3></div>
            <canvas id="chart-market-share"></canvas>
          </div>
          <div class="card chart-card">
            <div class="card-header"><h3>Revenue Comparison</h3><span class="badge badge-neutral">${App.formatCurrency(totalRevenue)} total</span></div>
            <canvas id="chart-revenue"></canvas>
          </div>
        </div>

        <div class="charts-grid">
          <div class="card chart-card">
            <div class="card-header"><h3>Risk vs Opportunity</h3><span class="badge badge-neutral">${stats.riskCount + stats.oppCount} tags</span></div>
            <canvas id="chart-risk-opp"></canvas>
          </div>
          <div class="card">
            <div class="card-header"><h3>Recent Activity</h3></div>
            <ul class="activity-list" id="activity-feed"></ul>
          </div>
        </div>

        <div class="card mt-lg">
          <div class="card-header"><h3>Markets Overview</h3></div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr><th>Market</th><th>Country</th><th>Industry</th><th>Size (USD)</th><th>Growth</th><th>Competitors</th><th>Strategies</th></tr>
              </thead>
              <tbody>
                ${markets.map(m => {
                  const compCount = competitors.filter(c => c.market_id === m.market_id).length;
                  const stratCount = strategies.filter(s => s.market_id === m.market_id).length;
                  return `<tr>
                    <td><strong>${App.escapeHtml(m.market_name)}</strong></td>
                    <td>${App.escapeHtml(m.country)}</td>
                    <td><span class="badge badge-neutral">${App.escapeHtml(m.industry || '—')}</span></td>
                    <td>${App.formatCurrency(m.market_size_usd)}</td>
                    <td><span class="kpi-change positive">${m.growth_rate || 0}%</span></td>
                    <td>${compCount}</td>
                    <td>${stratCount}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      renderCharts(competitors, stats);
      renderActivityFeed(activities);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Error loading dashboard</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function renderCharts(competitors, stats) {
    Object.values(charts).forEach(c => c.destroy && c.destroy());
    charts = {};

    const chartColors = [
      'rgba(79, 70, 229, 0.75)', 'rgba(5, 150, 105, 0.75)',
      'rgba(217, 119, 6, 0.75)', 'rgba(220, 38, 38, 0.75)',
      'rgba(37, 99, 235, 0.75)', 'rgba(109, 40, 217, 0.75)',
    ];

    const defaultOptions = {
      responsive: true, maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#4B5563', font: { family: 'Inter', size: 11 }, padding: 14 } } }
    };

    const msCtx = document.getElementById('chart-market-share');
    if (msCtx && competitors.length > 0) {
      charts.marketShare = new Chart(msCtx, {
        type: 'doughnut',
        data: {
          labels: competitors.map(c => c.company_name),
          datasets: [{ data: competitors.map(c => c.market_share || 0), backgroundColor: chartColors.slice(0, competitors.length), borderColor: '#FFFFFF', borderWidth: 2 }]
        },
        options: { ...defaultOptions, cutout: '65%', plugins: { ...defaultOptions.plugins, legend: { ...defaultOptions.plugins.legend, position: 'bottom' } } }
      });
    }

    const revCtx = document.getElementById('chart-revenue');
    if (revCtx && competitors.length > 0) {
      charts.revenue = new Chart(revCtx, {
        type: 'bar',
        data: {
          labels: competitors.map(c => c.company_name),
          datasets: [{ label: 'Revenue (USD)', data: competitors.map(c => c.revenue_usd || 0), backgroundColor: chartColors.slice(0, competitors.length), borderRadius: 4 }]
        },
        options: { ...defaultOptions, scales: { x: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 }, callback: v => App.formatCurrency(v) }, grid: { color: '#F3F4F6' } } } }
      });
    }

    const roCtx = document.getElementById('chart-risk-opp');
    if (roCtx) {
      const riskHigh = Math.round(stats.riskCount * 0.4);
      const riskMed = Math.round(stats.riskCount * 0.35);
      const riskLow = stats.riskCount - riskHigh - riskMed;
      const oppHigh = Math.round(stats.oppCount * 0.5);
      const oppMed = Math.round(stats.oppCount * 0.3);
      const oppLow = stats.oppCount - oppHigh - oppMed;

      charts.riskOpp = new Chart(roCtx, {
        type: 'bar',
        data: {
          labels: ['High', 'Medium', 'Low'],
          datasets: [
            { label: 'Risks', data: [riskHigh, riskMed, riskLow], backgroundColor: 'rgba(220, 38, 38, 0.6)', borderRadius: 4 },
            { label: 'Opportunities', data: [oppHigh, oppMed, oppLow], backgroundColor: 'rgba(5, 150, 105, 0.6)', borderRadius: 4 }
          ]
        },
        options: { ...defaultOptions, scales: { x: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 11 } }, grid: { display: false } }, y: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 }, stepSize: 1 }, grid: { color: '#F3F4F6' } } } }
      });
    }
  }

  function renderActivityFeed(activities) {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    feed.innerHTML = (activities || []).slice(0, 8).map(a => `
      <li class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${App.formatDate(a.time)}</div>
        </div>
      </li>
    `).join('') || '<li class="empty-state"><p>No activity yet</p></li>';
  }

  return { init };
})();
