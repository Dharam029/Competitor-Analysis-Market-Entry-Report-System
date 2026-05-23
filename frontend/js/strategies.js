const StrategiesPage = (() => {
  let strategies = [];
  let markets = [];

  async function init() {
    await loadData();
    SocketClient.on('strategy:created', () => loadData());
    SocketClient.on('strategy:updated', () => loadData());
    SocketClient.on('strategy:deleted', () => loadData());
  }

  async function loadData() {
    try {
      [strategies, markets] = await Promise.all([API.Strategies.list(), API.Markets.list()]);
      App.cache('markets', markets);
      render();
    } catch (err) {
      document.getElementById('page-strategies').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const container = document.getElementById('page-strategies');
    container.innerHTML = `
      <div class="toolbar">
        <select class="form-select" id="strat-market-filter" style="width:220px" onchange="StrategiesPage.filter()">
          <option value="">All Markets</option>
          ${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}
        </select>
        <button class="btn btn-primary" data-requires-edit onclick="StrategiesPage.openForm()">+ Create Strategy</button>
      </div>
      <div class="strategy-grid stagger-in" id="strategies-grid">${renderCards(strategies)}</div>
      ${strategies.length === 0 ? '<div class="empty-state mt-lg"><h3>No strategies yet</h3><p>Create your first market entry strategy</p></div>' : ''}

      <div class="modal-overlay modal-wide" id="modal-strategy-form">
        <div class="modal">
          <div class="modal-header"><h3 id="strat-form-title">Create Strategy</h3><button class="modal-close" onclick="App.closeModal('modal-strategy-form')">&#10005;</button></div>
          <div class="modal-body">
            <form id="strategy-form" onsubmit="StrategiesPage.save(event)">
              <input type="hidden" id="stf-id">
              <div class="form-group"><label class="form-label">Strategy Title *</label><input type="text" class="form-input" id="stf-title" required placeholder="e.g. India-to-China Skincare Entry via JV"></div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Target Market *</label><select class="form-select" id="stf-market" required><option value="">Select</option>${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">Entry Mode *</label><select class="form-select" id="stf-mode" required><option value="joint venture">Joint Venture</option><option value="direct export">Direct Export</option><option value="acquisition">Acquisition</option><option value="franchise">Franchise</option><option value="greenfield">Greenfield</option></select></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Target Segment</label><input type="text" class="form-input" id="stf-segment" placeholder="e.g. Urban Youth 18-30"></div>
                <div class="form-group"><label class="form-label">Estimated Cost (USD)</label><input type="number" class="form-input" id="stf-cost" placeholder="e.g. 5000000"></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Timeline (months)</label><input type="number" class="form-input" id="stf-timeline" placeholder="e.g. 18"></div>
                <div class="form-group"><label class="form-label">Expected ROI (%)</label><input type="number" step="0.01" class="form-input" id="stf-roi" placeholder="e.g. 22.5"></div>
              </div>
              <div class="form-group"><label class="form-label">Key Risks</label><textarea class="form-textarea" id="stf-risks" rows="4" placeholder="One risk per line..."></textarea></div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('modal-strategy-form')">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('strategy-form').requestSubmit()">Save Strategy</button>
          </div>
        </div>
      </div>
    `;
    App.updatePermissionUI();
  }

  function renderCards(strats) {
    return strats.map(s => {
      const modeClass = (s.entry_mode || '').replace(/\s+/g, '-');
      const riskLines = (s.key_risks || '').split('\n').filter(Boolean);
      return `<div class="card strategy-card">
        <span class="entry-mode-tag ${modeClass}">${s.entry_mode}</span>
        <h3 style="font-size:0.95rem;margin-bottom:var(--sp-sm);padding-right:100px">${App.escapeHtml(s.strategy_title)}</h3>
        <span class="badge badge-neutral">${App.getMarketName(s.market_id, markets)}</span>
        <div class="strategy-meta">
          <div class="strategy-meta-item"><div class="meta-label">Investment</div><div class="meta-value">${App.formatCurrency(s.estimated_cost)}</div></div>
          <div class="strategy-meta-item"><div class="meta-label">Timeline</div><div class="meta-value">${s.timeline_months||'—'} months</div></div>
          <div class="strategy-meta-item"><div class="meta-label">Expected ROI</div><div class="meta-value" style="color:var(--color-success)">${s.expected_roi||0}%</div></div>
          <div class="strategy-meta-item"><div class="meta-label">Target</div><div class="meta-value">${App.escapeHtml(s.target_segment||'—')}</div></div>
        </div>
        ${riskLines.length ? `<hr class="section-divider"><div class="text-sm"><div class="field-label" style="margin-bottom:4px">Key Risks</div>${riskLines.slice(0,3).map(r=>`<div class="text-secondary" style="padding:2px 0">· ${App.escapeHtml(r)}</div>`).join('')}${riskLines.length>3?`<div class="text-muted">+${riskLines.length-3} more</div>`:''}</div>` : ''}
        <hr class="section-divider">
        <div class="flex gap-sm">
          <button class="btn btn-ghost btn-sm" data-requires-edit onclick="StrategiesPage.openForm(${s.strategy_id})">Edit</button>
          <button class="btn btn-ghost btn-sm" data-requires-admin onclick="StrategiesPage.remove(${s.strategy_id})">Delete</button>
        </div>
      </div>`;
    }).join('');
  }

  function filter() {
    const mf = document.getElementById('strat-market-filter').value;
    let strats = strategies;
    if (mf) strats = strats.filter(s => s.market_id === Number(mf));
    document.getElementById('strategies-grid').innerHTML = renderCards(strats);
    App.updatePermissionUI();
  }

  function openForm(id = null) {
    document.getElementById('strategy-form').reset();
    document.getElementById('stf-id').value = '';
    if (id) {
      const s = strategies.find(x => x.strategy_id === id);
      if (!s) return;
      document.getElementById('strat-form-title').textContent = 'Edit Strategy';
      document.getElementById('stf-id').value = s.strategy_id;
      document.getElementById('stf-title').value = s.strategy_title;
      document.getElementById('stf-market').value = s.market_id;
      document.getElementById('stf-mode').value = s.entry_mode;
      document.getElementById('stf-segment').value = s.target_segment || '';
      document.getElementById('stf-cost').value = s.estimated_cost || '';
      document.getElementById('stf-timeline').value = s.timeline_months || '';
      document.getElementById('stf-roi').value = s.expected_roi || '';
      document.getElementById('stf-risks').value = s.key_risks || '';
    } else { document.getElementById('strat-form-title').textContent = 'Create Strategy'; }
    App.openModal('modal-strategy-form');
  }

  async function save(e) {
    e.preventDefault();
    const id = document.getElementById('stf-id').value;
    const data = {
      strategy_title: document.getElementById('stf-title').value.trim(),
      market_id: Number(document.getElementById('stf-market').value),
      entry_mode: document.getElementById('stf-mode').value,
      target_segment: document.getElementById('stf-segment').value.trim(),
      estimated_cost: Number(document.getElementById('stf-cost').value) || 0,
      timeline_months: Number(document.getElementById('stf-timeline').value) || 0,
      expected_roi: Number(document.getElementById('stf-roi').value) || 0,
      key_risks: document.getElementById('stf-risks').value.trim(),
    };
    try {
      if (id) { await API.Strategies.update(Number(id), data); App.toast('Strategy updated', 'success'); }
      else { await API.Strategies.create(data); App.toast('Strategy created', 'success'); }
      App.closeModal('modal-strategy-form');
      await loadData();
      App.updateNavBadges();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function remove(id) {
    if (!confirm('Delete this strategy?')) return;
    try { await API.Strategies.delete(id); App.toast('Strategy deleted', 'danger'); await loadData(); App.updateNavBadges(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  return { init, filter, openForm, save, remove };
})();
