const MarketsPage = (() => {
  let markets = [];

  async function init() {
    await loadData();
    SocketClient.on('market:created', () => loadData());
    SocketClient.on('market:updated', () => loadData());
    SocketClient.on('market:deleted', () => loadData());
  }

  async function loadData() {
    try {
      markets = await API.Markets.list();
      App.cache('markets', markets);
      render();
    } catch (err) {
      document.getElementById('page-markets').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const container = document.getElementById('page-markets');
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box">
            <span class="search-icon"><svg><use href="#icon-search"/></svg></span>
            <input type="text" class="form-input" id="market-search" placeholder="Search markets..." oninput="MarketsPage.filter()">
          </div>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" data-requires-edit onclick="MarketsPage.openForm()">+ Add Market</button>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Market Name</th><th>Country</th><th>Industry</th><th>Market Size</th><th>Growth</th><th>Segment</th><th>Competitors</th><th>Actions</th></tr></thead>
          <tbody id="markets-table-body">${renderRows(markets)}</tbody>
        </table>
      </div>
      ${markets.length === 0 ? '<div class="empty-state mt-lg"><div class="empty-icon">—</div><h3>No markets yet</h3><p>Add your first market to get started</p></div>' : ''}

      <div class="modal-overlay" id="modal-market-form">
        <div class="modal">
          <div class="modal-header"><h3 id="market-form-title">Add Market</h3><button class="modal-close" onclick="App.closeModal('modal-market-form')">&#10005;</button></div>
          <div class="modal-body">
            <form id="market-form" onsubmit="MarketsPage.save(event)">
              <input type="hidden" id="mf-id">
              <div class="form-row">
                <div class="form-group"><label class="form-label">Market Name *</label><input type="text" class="form-input" id="mf-name" required placeholder="e.g. China - Skincare"></div>
                <div class="form-group"><label class="form-label">Country *</label><input type="text" class="form-input" id="mf-country" required placeholder="e.g. China"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Industry</label><input type="text" class="form-input" id="mf-industry" placeholder="e.g. FMCG"></div>
                <div class="form-group"><label class="form-label">Market Size (USD)</label><input type="number" class="form-input" id="mf-size" placeholder="e.g. 52000000000"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Growth Rate (%)</label><input type="number" step="0.01" class="form-input" id="mf-growth" placeholder="e.g. 8.5"></div>
                <div class="form-group"><label class="form-label">Target Segment</label><input type="text" class="form-input" id="mf-segment" placeholder="e.g. Urban Youth 18-30"></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('modal-market-form')">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('market-form').requestSubmit()">Save Market</button>
          </div>
        </div>
      </div>
    `;
    App.updatePermissionUI();
  }

  function renderRows(rows) {
    const competitors = App.cache('competitors') || [];
    return rows.map(m => {
      const compCount = competitors.filter(c => c.market_id === m.market_id).length;
      return `<tr>
        <td><strong>${App.escapeHtml(m.market_name)}</strong></td>
        <td>${App.escapeHtml(m.country)}</td>
        <td><span class="badge badge-neutral">${App.escapeHtml(m.industry || '—')}</span></td>
        <td>${App.formatCurrency(m.market_size_usd)}</td>
        <td><span class="kpi-change ${(m.growth_rate || 0) >= 0 ? 'positive' : 'negative'}">${m.growth_rate || 0}%</span></td>
        <td class="text-sm">${App.escapeHtml(m.target_segment || '—')}</td>
        <td><span class="badge badge-cyan">${compCount}</span></td>
        <td>
          <div class="flex gap-sm">
            <button class="btn btn-ghost btn-sm" onclick="MarketsPage.view(${m.market_id})">View</button>
            <button class="btn btn-ghost btn-sm" data-requires-edit onclick="MarketsPage.openForm(${m.market_id})">Edit</button>
            <button class="btn btn-ghost btn-sm" data-requires-admin onclick="MarketsPage.remove(${m.market_id})">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  function filter() {
    const q = document.getElementById('market-search').value.toLowerCase();
    const filtered = markets.filter(m =>
      m.market_name.toLowerCase().includes(q) || m.country.toLowerCase().includes(q) || (m.industry || '').toLowerCase().includes(q)
    );
    document.getElementById('markets-table-body').innerHTML = renderRows(filtered);
    App.updatePermissionUI();
  }

  function openForm(id = null) {
    document.getElementById('market-form').reset();
    document.getElementById('mf-id').value = '';
    if (id) {
      const m = markets.find(x => x.market_id === id);
      if (!m) return;
      document.getElementById('market-form-title').textContent = 'Edit Market';
      document.getElementById('mf-id').value = m.market_id;
      document.getElementById('mf-name').value = m.market_name;
      document.getElementById('mf-country').value = m.country;
      document.getElementById('mf-industry').value = m.industry || '';
      document.getElementById('mf-size').value = m.market_size_usd || '';
      document.getElementById('mf-growth').value = m.growth_rate || '';
      document.getElementById('mf-segment').value = m.target_segment || '';
    } else {
      document.getElementById('market-form-title').textContent = 'Add Market';
    }
    App.openModal('modal-market-form');
  }

  async function save(e) {
    e.preventDefault();
    const id = document.getElementById('mf-id').value;
    const data = {
      market_name: document.getElementById('mf-name').value.trim(),
      country: document.getElementById('mf-country').value.trim(),
      industry: document.getElementById('mf-industry').value.trim(),
      market_size_usd: Number(document.getElementById('mf-size').value) || 0,
      growth_rate: Number(document.getElementById('mf-growth').value) || 0,
      target_segment: document.getElementById('mf-segment').value.trim(),
    };
    try {
      if (id) { await API.Markets.update(Number(id), data); App.toast('Market updated', 'success'); }
      else { await API.Markets.create(data); App.toast('Market added', 'success'); }
      App.closeModal('modal-market-form');
      await loadData();
      App.updateNavBadges();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function remove(id) {
    if (!confirm('Delete this market?')) return;
    try { await API.Markets.delete(id); App.toast('Market deleted', 'danger'); await loadData(); App.updateNavBadges(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  async function view(id) {
    try {
      const m = markets.find(x => x.market_id === id);
      if (!m) return;
      const [competitors, strategies, risks] = await Promise.all([
        API.Competitors.list(id),
        API.Strategies.list(id),
        API.Risks.list({ market_id: id }),
      ]);
      const container = document.getElementById('page-markets');

      container.innerHTML = `
        <div class="toolbar">
          <button class="btn btn-secondary" onclick="MarketsPage.init()">← Back</button>
          <button class="btn btn-primary" data-requires-edit onclick="MarketsPage.openForm(${m.market_id})">Edit Market</button>
        </div>
        <div class="card mb-lg">
          <h2 style="font-size:1.2rem; margin-bottom:var(--sp-md)">${App.escapeHtml(m.market_name)}</h2>
          <div class="detail-grid">
            <div class="detail-field"><div class="field-label">Country</div><div class="field-value">${App.escapeHtml(m.country)}</div></div>
            <div class="detail-field"><div class="field-label">Industry</div><div class="field-value">${App.escapeHtml(m.industry || '—')}</div></div>
            <div class="detail-field"><div class="field-label">Market Size</div><div class="field-value">${App.formatCurrency(m.market_size_usd)}</div></div>
            <div class="detail-field"><div class="field-label">Growth Rate</div><div class="field-value">${m.growth_rate || 0}% YoY</div></div>
            <div class="detail-field"><div class="field-label">Target Segment</div><div class="field-value">${App.escapeHtml(m.target_segment || '—')}</div></div>
            <div class="detail-field"><div class="field-label">Created</div><div class="field-value">${App.formatDate(m.created_at)}</div></div>
          </div>
        </div>
        <div class="card mb-lg">
          <div class="card-header"><h3>Competitors (${competitors.length})</h3></div>
          ${competitors.length > 0 ? `<div class="table-container"><table class="data-table"><thead><tr><th>Company</th><th>Origin</th><th>Revenue</th><th>Share</th></tr></thead>
            <tbody>${competitors.map(c => `<tr><td><strong>${App.escapeHtml(c.company_name)}</strong></td><td>${App.escapeHtml(c.country_origin || '—')}</td><td>${App.formatCurrency(c.revenue_usd)}</td><td>${c.market_share || 0}%</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><p>No competitors yet</p></div>'}
        </div>
        <div class="card mb-lg">
          <div class="card-header"><h3>Strategies (${strategies.length})</h3></div>
          ${strategies.length > 0 ? strategies.map(s => `<div style="padding:var(--sp-sm) 0;border-bottom:1px solid var(--border-light)"><strong>${App.escapeHtml(s.strategy_title)}</strong> <span class="badge badge-cyan" style="margin-left:6px">${s.entry_mode}</span><div class="text-sm text-secondary mt-md">${App.formatCurrency(s.estimated_cost)} · ${s.timeline_months || 0}mo · ${s.expected_roi || 0}% ROI</div></div>`).join('') : '<div class="empty-state"><p>No strategies yet</p></div>'}
        </div>
        <div class="card">
          <div class="card-header"><h3>Risks & Opportunities (${risks.length})</h3></div>
          <div class="tag-list">${risks.map(r => `<span class="tag-chip ${r.type === 'risk' ? 'tag-risk' : 'tag-opportunity'}">${App.escapeHtml(r.title)} <span class="badge badge-${r.severity === 'high' ? 'danger' : r.severity === 'medium' ? 'warning' : 'info'}" style="margin-left:4px">${r.severity}</span></span>`).join('') || '<div class="empty-state"><p>No tags yet</p></div>'}</div>
        </div>
      `;
      App.updatePermissionUI();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  return { init, filter, openForm, save, remove, view };
})();
