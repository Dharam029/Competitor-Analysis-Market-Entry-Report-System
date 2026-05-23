const ComparePage = (() => {
  let competitors = [];
  let selectedIds = [];

  async function init() {
    await loadData();
    SocketClient.on('competitor:created', () => loadData());
    SocketClient.on('competitor:updated', () => { if (selectedIds.length) loadComparison(); });
    SocketClient.on('pricing:created', () => { if (selectedIds.length) loadComparison(); });
    SocketClient.on('pricing:updated', () => { if (selectedIds.length) loadComparison(); });
    SocketClient.on('pricing:deleted', () => { if (selectedIds.length) loadComparison(); });
  }

  async function loadData() {
    try {
      competitors = App.cache('competitors') || await API.Competitors.list();
      App.cache('competitors', competitors);
      render();
    } catch (err) {
      document.getElementById('page-compare').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const container = document.getElementById('page-compare');
    container.innerHTML = `
      <div class="card mb-lg">
        <div class="card-header">
          <h3>Select Competitors to Compare</h3>
          <span class="badge badge-cyan">${selectedIds.length} selected</span>
        </div>
        <div class="flex gap-sm items-center" style="flex-wrap:wrap">
          ${competitors.map(c => `
            <label class="chip-select ${selectedIds.includes(c.competitor_id) ? 'selected' : ''}" data-id="${c.competitor_id}" onclick="ComparePage.toggle(${c.competitor_id})">
              ${App.escapeHtml(c.company_name)}
            </label>
          `).join('')}
        </div>
        ${competitors.length === 0 ? '<div class="empty-state"><p>No competitors to compare</p></div>' : ''}
      </div>
      <div id="comparison-results">
        ${selectedIds.length >= 2 ? '' : '<div class="empty-state"><h3>Select at least 2 competitors</h3><p>Click competitor names above to select them for side-by-side comparison</p></div>'}
      </div>
    `;
    if (selectedIds.length >= 2) loadComparison();
    App.updatePermissionUI();
  }

  function toggle(id) {
    const idx = selectedIds.indexOf(id);
    if (idx >= 0) selectedIds.splice(idx, 1);
    else if (selectedIds.length < 6) selectedIds.push(id);
    else App.toast('Maximum 6 competitors for comparison', 'warning');
    render();
  }

  async function loadComparison() {
    const el = document.getElementById('comparison-results');
    if (!el) return;

    try {
      const [markets] = await Promise.all([API.Markets.list()]);
      const selectedComps = competitors.filter(c => selectedIds.includes(c.competitor_id));

      const pricingPromises = selectedComps.map(c => API.Pricing.list(c.competitor_id));
      const swotPromises = selectedComps.map(c => API.SWOT.get(c.competitor_id));
      const [pricingResults, swotResults] = await Promise.all([
        Promise.all(pricingPromises), Promise.all(swotPromises),
      ]);

      el.innerHTML = `
        <div class="comparison-scroll">
          <table class="data-table comparison-table">
            <thead>
              <tr>
                <th class="compare-label-col">Metric</th>
                ${selectedComps.map(c => `<th class="compare-comp-col">${App.escapeHtml(c.company_name)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr class="compare-section"><td colspan="${selectedComps.length + 1}">Company Info</td></tr>
              <tr><td class="compare-label-col">Market</td>${selectedComps.map(c => `<td>${App.getMarketName(c.market_id, markets)}</td>`).join('')}</tr>
              <tr><td class="compare-label-col">Country of Origin</td>${selectedComps.map(c => `<td>${App.escapeHtml(c.country_origin || '—')}</td>`).join('')}</tr>
              <tr><td class="compare-label-col">Founded</td>${selectedComps.map(c => `<td>${c.founded_year || '—'}</td>`).join('')}</tr>
              <tr><td class="compare-label-col">Revenue</td>${selectedComps.map(c => `<td class="fw-600">${App.formatCurrency(c.revenue_usd)}</td>`).join('')}</tr>
              <tr><td class="compare-label-col">Market Share</td>${selectedComps.map(c => `<td>${c.market_share || 0}%</td>`).join('')}</tr>

              <tr class="compare-section"><td colspan="${selectedComps.length + 1}">Products & Pricing</td></tr>
              ${renderPricingComparison(selectedComps, pricingResults)}

              <tr class="compare-section"><td colspan="${selectedComps.length + 1}">SWOT Analysis</td></tr>
              ${renderSwotComparison(selectedComps, swotResults)}
            </tbody>
          </table>
        </div>

        <div class="charts-grid mt-lg">
          <div class="card chart-card">
            <div class="card-header"><h3>Revenue Comparison</h3></div>
            <canvas id="compare-chart-revenue"></canvas>
          </div>
          <div class="card chart-card">
            <div class="card-header"><h3>Market Share Comparison</h3></div>
            <canvas id="compare-chart-share"></canvas>
          </div>
        </div>
      `;

      renderCompareCharts(selectedComps);
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><p>Error: ${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function renderPricingComparison(comps, pricingResults) {
    const allProducts = [];
    comps.forEach((c, i) => {
      pricingResults[i].forEach(p => {
        allProducts.push({ ...p, company_name: c.company_name });
      });
    });

    if (!allProducts.length) {
      return `<tr><td class="compare-label-col">Products</td>${comps.map(() => '<td class="text-muted">No products</td>').join('')}</tr>`;
    }

    let rows = '';
    const maxProducts = Math.max(...pricingResults.map(p => p.length));
    for (let i = 0; i < maxProducts; i++) {
      rows += '<tr>';
      rows += `<td class="compare-label-col">${i === 0 ? 'Products' : ''}</td>`;
      comps.forEach((c, ci) => {
        const p = pricingResults[ci][i];
        rows += p
          ? `<td><div class="fw-600">${App.escapeHtml(p.product_name)}</div><div class="text-sm text-muted">$${p.price_usd.toFixed(2)} <span class="badge badge-${p.pricing_model==='premium'?'purple':p.pricing_model==='mid-range'?'cyan':'success'}" style="margin-left:4px">${p.pricing_model}</span></div></td>`
          : '<td class="text-muted">—</td>';
      });
      rows += '</tr>';
    }

    let avgRow = '<tr><td class="compare-label-col">Avg Price</td>';
    comps.forEach((c, ci) => {
      const prices = pricingResults[ci].map(p => p.price_usd);
      const avg = prices.length ? (prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      avgRow += `<td class="fw-600">$${avg.toFixed(2)}</td>`;
    });
    avgRow += '</tr>';

    let rangeRow = '<tr><td class="compare-label-col">Price Range</td>';
    comps.forEach((c, ci) => {
      const prices = pricingResults[ci].map(p => p.price_usd);
      rangeRow += prices.length
        ? `<td>$${Math.min(...prices).toFixed(2)} — $${Math.max(...prices).toFixed(2)}</td>`
        : '<td class="text-muted">—</td>';
    });
    rangeRow += '</tr>';

    return rows + avgRow + rangeRow;
  }

  function renderSwotComparison(comps, swotResults) {
    const categories = [
      { key: 'strengths', label: 'Strengths', cls: 'swot-strengths' },
      { key: 'weaknesses', label: 'Weaknesses', cls: 'swot-weaknesses' },
      { key: 'opportunities', label: 'Opportunities', cls: 'swot-opportunities' },
      { key: 'threats', label: 'Threats', cls: 'swot-threats' },
    ];

    return categories.map(cat => `
      <tr><td class="compare-label-col compare-${cat.key}">${cat.label}</td>
      ${comps.map((c, i) => {
        const swot = swotResults[i];
        const lines = swot ? (swot[cat.key] || '').split('\n').filter(Boolean) : [];
        return `<td>${lines.length ? lines.map(l => `<div class="text-sm" style="padding:2px 0">· ${App.escapeHtml(l)}</div>`).join('') : '<span class="text-muted">—</span>'}</td>`;
      }).join('')}</tr>
    `).join('');
  }

  function renderCompareCharts(comps) {
    setTimeout(() => {
      const chartColors = [
        'rgba(79, 70, 229, 0.75)', 'rgba(5, 150, 105, 0.75)',
        'rgba(217, 119, 6, 0.75)', 'rgba(220, 38, 38, 0.75)',
        'rgba(37, 99, 235, 0.75)', 'rgba(109, 40, 217, 0.75)',
      ];

      const revCtx = document.getElementById('compare-chart-revenue');
      if (revCtx) {
        new Chart(revCtx, {
          type: 'bar',
          data: {
            labels: comps.map(c => c.company_name),
            datasets: [{ label: 'Revenue (USD)', data: comps.map(c => c.revenue_usd || 0), backgroundColor: chartColors.slice(0, comps.length), borderRadius: 4 }]
          },
          options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 }, callback: v => App.formatCurrency(v) }, grid: { color: '#F3F4F6' } } }
          }
        });
      }

      const shareCtx = document.getElementById('compare-chart-share');
      if (shareCtx) {
        new Chart(shareCtx, {
          type: 'bar',
          data: {
            labels: comps.map(c => c.company_name),
            datasets: [{ label: 'Market Share (%)', data: comps.map(c => c.market_share || 0), backgroundColor: chartColors.slice(0, comps.length), borderRadius: 4 }]
          },
          options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: { x: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } }, grid: { display: false } }, y: { ticks: { color: '#9CA3AF', font: { family: 'Inter', size: 10 } }, grid: { color: '#F3F4F6' } } }
          }
        });
      }
    }, 100);
  }

  return { init, toggle };
})();
