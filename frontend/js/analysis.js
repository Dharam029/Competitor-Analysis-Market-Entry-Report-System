const AnalysisPage = (() => {
  let markets = [];

  async function init() {
    markets = App.cache('markets') || await API.Markets.list();
    App.cache('markets', markets);
    render();
    SocketClient.on('swot:created', () => renderSwotList());
    SocketClient.on('swot:updated', () => renderSwotList());
    SocketClient.on('risk:created', () => renderRisks());
    SocketClient.on('risk:updated', () => renderRisks());
    SocketClient.on('risk:deleted', () => renderRisks());
    SocketClient.on('pricing:created', () => { if (document.getElementById('tab-pricing')?.classList.contains('active')) renderPricingComparison(); });
    SocketClient.on('pricing:updated', () => { if (document.getElementById('tab-pricing')?.classList.contains('active')) renderPricingComparison(); });
    SocketClient.on('pricing:deleted', () => { if (document.getElementById('tab-pricing')?.classList.contains('active')) renderPricingComparison(); });
  }

  function render() {
    const container = document.getElementById('page-analysis');
    container.innerHTML = `
      <div class="tab-bar">
        <div class="tab-item active" onclick="AnalysisPage.switchTab('swot')">SWOT Analysis</div>
        <div class="tab-item" onclick="AnalysisPage.switchTab('pricing')">Pricing Comparison</div>
        <div class="tab-item" onclick="AnalysisPage.switchTab('risks')">Risks & Opportunities</div>
      </div>
      <div class="tab-content active" id="tab-swot">
        <div class="toolbar">
          <select class="form-select" id="swot-market-filter" style="width:220px" onchange="AnalysisPage.renderSwotList()">
            <option value="">All Markets</option>
            ${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}
          </select>
        </div>
        <div id="swot-list"></div>
      </div>
      <div class="tab-content" id="tab-pricing">
        <div class="toolbar">
          <select class="form-select" id="pricing-market-filter" style="width:220px" onchange="AnalysisPage.renderPricingComparison()">
            <option value="">Select Market</option>
            ${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}
          </select>
        </div>
        <div id="pricing-comparison"></div>
      </div>
      <div class="tab-content" id="tab-risks">
        <div class="toolbar">
          <div class="toolbar-left">
            <select class="form-select" id="risk-market-filter" style="width:220px" onchange="AnalysisPage.renderRisks()">
              <option value="">All Markets</option>
              ${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}
            </select>
            <select class="form-select" id="risk-type-filter" style="width:160px" onchange="AnalysisPage.renderRisks()">
              <option value="">All Types</option>
              <option value="risk">Risks Only</option>
              <option value="opportunity">Opportunities Only</option>
            </select>
          </div>
          <button class="btn btn-primary" data-requires-edit onclick="AnalysisPage.openRiskForm()">+ Add Tag</button>
        </div>
        <div id="risks-list"></div>
      </div>
      ${renderModals()}
    `;
    renderSwotList();
    App.updatePermissionUI();
  }

  function renderModals() {
    return `
      <div class="modal-overlay modal-wide" id="modal-swot-form">
        <div class="modal">
          <div class="modal-header"><h3 id="swot-form-title">SWOT Analysis</h3><button class="modal-close" onclick="App.closeModal('modal-swot-form')">&#10005;</button></div>
          <div class="modal-body">
            <form id="swot-form" onsubmit="AnalysisPage.saveSwot(event)">
              <input type="hidden" id="sf-id"><input type="hidden" id="sf-comp-id">
              <div class="form-group mb-lg"><label class="form-label">Competitor</label><div id="sf-comp-name" class="text-primary fw-600"></div></div>
              <div class="form-row">
                <div class="form-group"><label class="form-label" style="color:var(--color-success)">Strengths</label><textarea class="form-textarea" id="sf-strengths" rows="5" placeholder="One per line..."></textarea></div>
                <div class="form-group"><label class="form-label" style="color:var(--color-danger)">Weaknesses</label><textarea class="form-textarea" id="sf-weaknesses" rows="5" placeholder="One per line..."></textarea></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label" style="color:var(--color-info)">Opportunities</label><textarea class="form-textarea" id="sf-opportunities" rows="5" placeholder="One per line..."></textarea></div>
                <div class="form-group"><label class="form-label" style="color:var(--color-warning)">Threats</label><textarea class="form-textarea" id="sf-threats" rows="5" placeholder="One per line..."></textarea></div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('modal-swot-form')">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('swot-form').requestSubmit()">Save SWOT</button>
          </div>
        </div>
      </div>
      <div class="modal-overlay" id="modal-risk-form">
        <div class="modal">
          <div class="modal-header"><h3 id="risk-form-title">Tag Risk / Opportunity</h3><button class="modal-close" onclick="App.closeModal('modal-risk-form')">&#10005;</button></div>
          <div class="modal-body">
            <form id="risk-form" onsubmit="AnalysisPage.saveRisk(event)">
              <input type="hidden" id="rf-id">
              <div class="form-row">
                <div class="form-group"><label class="form-label">Type *</label><select class="form-select" id="rf-type" required><option value="risk">Risk</option><option value="opportunity">Opportunity</option></select></div>
                <div class="form-group"><label class="form-label">Severity *</label><select class="form-select" id="rf-severity" required><option value="medium">Medium</option><option value="high">High</option><option value="low">Low</option></select></div>
              </div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Market *</label><select class="form-select" id="rf-market" required onchange="AnalysisPage.updateRiskCompetitors()"><option value="">Select Market</option>${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">Competitor (optional)</label><select class="form-select" id="rf-competitor"><option value="">Market-wide</option></select></div>
              </div>
              <div class="form-group"><label class="form-label">Title *</label><input type="text" class="form-input" id="rf-title" required placeholder="e.g. Price War Escalation"></div>
              <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="rf-desc" placeholder="Details..."></textarea></div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('modal-risk-form')">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('risk-form').requestSubmit()">Save</button>
          </div>
        </div>
      </div>`;
  }

  function switchTab(tab) {
    document.querySelectorAll('#page-analysis .tab-item').forEach((t, i) => { t.classList.toggle('active', ['swot','pricing','risks'][i] === tab); });
    document.querySelectorAll('#page-analysis .tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'swot') renderSwotList();
    if (tab === 'pricing') renderPricingComparison();
    if (tab === 'risks') renderRisks();
  }

  async function renderSwotList() {
    const mf = document.getElementById('swot-market-filter')?.value;
    let competitors = App.cache('competitors') || [];
    if (!competitors.length) competitors = await API.Competitors.list();
    if (mf) competitors = competitors.filter(c => c.market_id === Number(mf));
    const el = document.getElementById('swot-list');
    if (!competitors.length) { el.innerHTML = '<div class="empty-state"><h3>No competitors found</h3><p>Add competitors first</p></div>'; return; }

    const swotPromises = competitors.map(c => API.SWOT.get(c.competitor_id));
    const swots = await Promise.all(swotPromises);

    el.innerHTML = competitors.map((c, i) => {
      const swot = swots[i];
      return `<div class="card mb-lg">
        <div class="card-header">
          <div><h3>${App.escapeHtml(c.company_name)}</h3><span class="badge badge-neutral text-sm">${App.getMarketName(c.market_id, markets)}</span></div>
          <button class="btn btn-sm ${swot ? 'btn-secondary' : 'btn-primary'}" data-requires-edit onclick="AnalysisPage.openSwotForm(${c.competitor_id})">${swot ? 'Edit SWOT' : '+ Add SWOT'}</button>
        </div>
        ${swot ? `<div class="swot-grid">
          <div class="swot-quadrant swot-strengths"><h4>Strengths</h4><ul>${(swot.strengths||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
          <div class="swot-quadrant swot-weaknesses"><h4>Weaknesses</h4><ul>${(swot.weaknesses||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
          <div class="swot-quadrant swot-opportunities"><h4>Opportunities</h4><ul>${(swot.opportunities||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
          <div class="swot-quadrant swot-threats"><h4>Threats</h4><ul>${(swot.threats||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
        </div>` : '<div class="empty-state"><p>No SWOT analysis yet</p></div>'}
      </div>`;
    }).join('');
    App.updatePermissionUI();
  }

  async function openSwotForm(compId) {
    const competitors = App.cache('competitors') || [];
    const c = competitors.find(x => x.competitor_id === compId);
    if (!c) return;
    const swot = await API.SWOT.get(compId);
    document.getElementById('sf-comp-id').value = compId;
    document.getElementById('sf-comp-name').textContent = c.company_name;
    if (swot) {
      document.getElementById('swot-form-title').textContent = 'Edit SWOT Analysis';
      document.getElementById('sf-id').value = swot.swot_id;
      document.getElementById('sf-strengths').value = swot.strengths || '';
      document.getElementById('sf-weaknesses').value = swot.weaknesses || '';
      document.getElementById('sf-opportunities').value = swot.opportunities || '';
      document.getElementById('sf-threats').value = swot.threats || '';
    } else {
      document.getElementById('swot-form-title').textContent = 'New SWOT Analysis';
      ['sf-id','sf-strengths','sf-weaknesses','sf-opportunities','sf-threats'].forEach(id => document.getElementById(id).value = '');
    }
    App.openModal('modal-swot-form');
  }

  async function saveSwot(e) {
    e.preventDefault();
    const data = {
      competitor_id: Number(document.getElementById('sf-comp-id').value),
      strengths: document.getElementById('sf-strengths').value.trim(),
      weaknesses: document.getElementById('sf-weaknesses').value.trim(),
      opportunities: document.getElementById('sf-opportunities').value.trim(),
      threats: document.getElementById('sf-threats').value.trim(),
    };
    try { await API.SWOT.save(data); App.toast('SWOT saved', 'success'); App.closeModal('modal-swot-form'); renderSwotList(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  async function renderPricingComparison() {
    const marketId = document.getElementById('pricing-market-filter')?.value;
    const el = document.getElementById('pricing-comparison');
    if (!marketId) { el.innerHTML = '<div class="empty-state"><h3>Select a Market</h3><p>Choose a market to compare pricing</p></div>'; return; }

    try {
      const [competitors, markets] = await Promise.all([API.Competitors.list(marketId), API.Markets.list()]);
      const pricingPromises = competitors.map(c => API.Pricing.list(c.competitor_id));
      const pricingResults = await Promise.all(pricingPromises);
      const allPricing = [];
      competitors.forEach((c, i) => {
        pricingResults[i].forEach(p => allPricing.push({ ...p, company_name: c.company_name }));
      });

      if (!allPricing.length) { el.innerHTML = '<div class="empty-state"><p>No pricing data for this market</p></div>'; return; }

      const premium = allPricing.filter(p => p.pricing_model === 'premium');
      const midRange = allPricing.filter(p => p.pricing_model === 'mid-range');
      const budget = allPricing.filter(p => p.pricing_model === 'budget');

      el.innerHTML = `
        <div class="card mb-lg">
          <div class="card-header"><h3>All Products — ${App.getMarketName(Number(marketId), markets)}</h3><span class="badge badge-neutral">${allPricing.length} products</span></div>
          <div class="table-container"><table class="data-table">
            <thead><tr><th>Company</th><th>Product</th><th>Price</th><th>Model</th><th>Distribution</th><th>Discount Policy</th></tr></thead>
            <tbody>${allPricing.sort((a,b) => a.price_usd - b.price_usd).map(p => `<tr>
              <td><strong>${App.escapeHtml(p.company_name)}</strong></td>
              <td>${App.escapeHtml(p.product_name)}</td>
              <td class="fw-600">$${(p.price_usd||0).toFixed(2)}</td>
              <td><span class="badge badge-${p.pricing_model==='premium'?'purple':p.pricing_model==='mid-range'?'cyan':'success'}">${p.pricing_model}</span></td>
              <td class="text-sm">${App.escapeHtml(p.distribution||'—')}</td>
              <td class="text-sm">${App.escapeHtml(p.discount_policy||'—')}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>
        <div class="charts-grid">
          <div class="card">
            <div class="card-header"><h3>By Model</h3></div>
            <div style="padding:var(--sp-md)">
              <div class="mb-md"><span class="badge badge-purple">Premium</span> <span class="text-sm text-secondary" style="margin-left:8px">${premium.length} products · Avg $${premium.length?(premium.reduce((s,p)=>s+p.price_usd,0)/premium.length).toFixed(2):'0'}</span></div>
              <div class="mb-md"><span class="badge badge-cyan">Mid-range</span> <span class="text-sm text-secondary" style="margin-left:8px">${midRange.length} products · Avg $${midRange.length?(midRange.reduce((s,p)=>s+p.price_usd,0)/midRange.length).toFixed(2):'0'}</span></div>
              <div><span class="badge badge-success">Budget</span> <span class="text-sm text-secondary" style="margin-left:8px">${budget.length} products · Avg $${budget.length?(budget.reduce((s,p)=>s+p.price_usd,0)/budget.length).toFixed(2):'0'}</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3>Price Ranges</h3></div>
            <div style="padding:var(--sp-md)">${competitors.map(c => {
              const cp = allPricing.filter(p => p.company_name === c.company_name);
              if (!cp.length) return '';
              return `<div class="mb-md"><div class="fw-600 text-sm">${App.escapeHtml(c.company_name)}</div><div class="text-sm text-secondary">$${Math.min(...cp.map(p=>p.price_usd)).toFixed(2)} — $${Math.max(...cp.map(p=>p.price_usd)).toFixed(2)}</div></div>`;
            }).join('')}</div>
          </div>
        </div>
      `;
    } catch (err) { el.innerHTML = `<div class="empty-state"><p>Error: ${App.escapeHtml(err.message)}</p></div>`; }
  }

  async function renderRisks() {
    const mf = document.getElementById('risk-market-filter')?.value;
    const tf = document.getElementById('risk-type-filter')?.value;
    const el = document.getElementById('risks-list');

    try {
      let items = await API.Risks.list({ market_id: mf || undefined, type: tf || undefined });
      const competitors = App.cache('competitors') || [];
      const users = await API.Admin.users.list().catch(() => []);

      if (!items.length) { el.innerHTML = '<div class="empty-state mt-lg"><h3>No tags found</h3><p>Start tagging risks and opportunities</p></div>'; return; }
      const so = { high: 0, medium: 1, low: 2 };
      items.sort((a,b) => (so[a.severity]||2) - (so[b.severity]||2));

      el.innerHTML = `<div class="table-container"><table class="data-table">
        <thead><tr><th>Type</th><th>Title</th><th>Market</th><th>Competitor</th><th>Severity</th><th>Description</th><th>By</th><th>Actions</th></tr></thead>
        <tbody>${items.map(r => `<tr>
          <td><span class="badge ${r.type==='risk'?'badge-danger':'badge-success'}">${r.type==='risk'?'Risk':'Opp'}</span></td>
          <td><strong>${App.escapeHtml(r.title)}</strong></td>
          <td>${App.getMarketName(r.market_id, markets)}</td>
          <td>${r.competitor_id ? App.getCompetitorName(r.competitor_id, competitors) : '<span class="text-muted">Market-wide</span>'}</td>
          <td><span class="badge badge-${r.severity==='high'?'danger':r.severity==='medium'?'warning':'info'}">${r.severity}</span></td>
          <td class="text-sm" style="max-width:220px">${App.escapeHtml(r.description||'—')}</td>
          <td class="text-sm">${App.getUserName(r.tagged_by, users)}</td>
          <td><div class="flex gap-sm">
            <button class="btn btn-ghost btn-sm" data-requires-edit onclick="AnalysisPage.openRiskForm(${r.tag_id})">Edit</button>
            <button class="btn btn-ghost btn-sm" data-requires-admin onclick="AnalysisPage.removeRisk(${r.tag_id})">Delete</button>
          </div></td>
        </tr>`).join('')}</tbody>
      </table></div>`;
      App.updatePermissionUI();
    } catch (err) { el.innerHTML = `<div class="empty-state"><p>Error: ${App.escapeHtml(err.message)}</p></div>`; }
  }

  async function openRiskForm(id = null) {
    document.getElementById('risk-form').reset();
    document.getElementById('rf-id').value = '';
    if (id) {
      try {
        const r = await API.Risks.get(id);
        document.getElementById('risk-form-title').textContent = 'Edit Tag';
        document.getElementById('rf-id').value = r.tag_id;
        document.getElementById('rf-type').value = r.type;
        document.getElementById('rf-severity').value = r.severity;
        document.getElementById('rf-market').value = r.market_id;
        await updateRiskCompetitors();
        document.getElementById('rf-competitor').value = r.competitor_id || '';
        document.getElementById('rf-title').value = r.title;
        document.getElementById('rf-desc').value = r.description || '';
      } catch {}
    } else { document.getElementById('risk-form-title').textContent = 'Tag Risk / Opportunity'; updateRiskCompetitors(); }
    App.openModal('modal-risk-form');
  }

  async function updateRiskCompetitors() {
    const mid = document.getElementById('rf-market').value;
    const sel = document.getElementById('rf-competitor');
    sel.innerHTML = '<option value="">Market-wide</option>';
    if (mid) {
      try {
        const comps = await API.Competitors.list(mid);
        comps.forEach(c => { sel.innerHTML += `<option value="${c.competitor_id}">${App.escapeHtml(c.company_name)}</option>`; });
      } catch {}
    }
  }

  async function saveRisk(e) {
    e.preventDefault();
    const id = document.getElementById('rf-id').value;
    const data = {
      type: document.getElementById('rf-type').value,
      severity: document.getElementById('rf-severity').value,
      market_id: Number(document.getElementById('rf-market').value),
      competitor_id: document.getElementById('rf-competitor').value ? Number(document.getElementById('rf-competitor').value) : null,
      title: document.getElementById('rf-title').value.trim(),
      description: document.getElementById('rf-desc').value.trim(),
    };
    try {
      if (id) { await API.Risks.update(Number(id), data); App.toast('Tag updated', 'success'); }
      else { await API.Risks.create(data); App.toast('Tag created', 'success'); }
      App.closeModal('modal-risk-form'); renderRisks();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function removeRisk(id) {
    if (!confirm('Delete this tag?')) return;
    try { await API.Risks.delete(id); App.toast('Tag deleted', 'danger'); renderRisks(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  return { init, switchTab, renderSwotList, openSwotForm, saveSwot, renderPricingComparison, renderRisks, openRiskForm, updateRiskCompetitors, saveRisk, removeRisk };
})();
