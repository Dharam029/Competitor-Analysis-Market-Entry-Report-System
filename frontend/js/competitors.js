const CompetitorsPage = (() => {
  let competitors = [];

  async function init() {
    await loadData();
    SocketClient.on('competitor:created', () => loadData());
    SocketClient.on('competitor:updated', () => loadData());
    SocketClient.on('competitor:deleted', () => loadData());
  }

  async function loadData() {
    try {
      competitors = await API.Competitors.list();
      App.cache('competitors', competitors);
      render();
    } catch (err) {
      document.getElementById('page-competitors').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  async function render() {
    const container = document.getElementById('page-competitors');
    const markets = App.cache('markets') || await API.Markets.list();
    App.cache('markets', markets);

    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box"><span class="search-icon"><svg><use href="#icon-search"/></svg></span>
            <input type="text" class="form-input" id="comp-search" placeholder="Search competitors..." oninput="CompetitorsPage.filter()">
          </div>
          <select class="form-select" id="comp-market-filter" style="width:200px" onchange="CompetitorsPage.filter()">
            <option value="">All Markets</option>
            ${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" data-requires-edit onclick="CompetitorsPage.openForm()">+ Add Competitor</button>
        </div>
      </div>
      <div class="table-container">
        <table class="data-table">
          <thead><tr><th>Company</th><th>Market</th><th>Origin</th><th>Founded</th><th>Revenue</th><th>Share</th><th>Products</th><th>SWOT</th><th>Actions</th></tr></thead>
          <tbody id="comp-table-body">${renderRows(competitors, markets)}</tbody>
        </table>
      </div>
      ${competitors.length === 0 ? '<div class="empty-state mt-lg"><h3>No competitors yet</h3><p>Start tracking competitor data</p></div>' : ''}
      ${renderCompFormModal(markets)}
      ${renderPricingFormModal()}
    `;
    App.updatePermissionUI();
  }

  function renderCompFormModal(markets) {
    return `<div class="modal-overlay modal-wide" id="modal-comp-form">
      <div class="modal">
        <div class="modal-header"><h3 id="comp-form-title">Add Competitor</h3><button class="modal-close" onclick="App.closeModal('modal-comp-form')">&#10005;</button></div>
        <div class="modal-body">
          <form id="comp-form" onsubmit="CompetitorsPage.save(event)">
            <input type="hidden" id="cf-id">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Company Name *</label><input type="text" class="form-input" id="cf-name" required placeholder="e.g. Perfect Diary"></div>
              <div class="form-group"><label class="form-label">Market *</label><select class="form-select" id="cf-market" required><option value="">Select Market</option>${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}</select></div>
            </div>
            <div class="form-row-3">
              <div class="form-group"><label class="form-label">Country of Origin</label><input type="text" class="form-input" id="cf-origin" placeholder="e.g. China"></div>
              <div class="form-group"><label class="form-label">Founded Year</label><input type="number" class="form-input" id="cf-year" placeholder="e.g. 2017"></div>
              <div class="form-group"><label class="form-label">Revenue (USD)</label><input type="number" class="form-input" id="cf-revenue" placeholder="e.g. 780000000"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Market Share (%)</label><input type="number" step="0.01" class="form-input" id="cf-share" placeholder="e.g. 6.2"></div>
              <div class="form-group"><label class="form-label">Website</label><input type="url" class="form-input" id="cf-website" placeholder="https://..."></div>
            </div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="cf-desc" placeholder="Brief description..."></textarea></div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="App.closeModal('modal-comp-form')">Cancel</button>
          <button class="btn btn-primary" onclick="document.getElementById('comp-form').requestSubmit()">Save</button>
        </div>
      </div>
    </div>`;
  }

  function renderPricingFormModal() {
    return `<div class="modal-overlay" id="modal-pricing-form">
      <div class="modal">
        <div class="modal-header"><h3 id="pricing-form-title">Add Product Pricing</h3><button class="modal-close" onclick="App.closeModal('modal-pricing-form')">&#10005;</button></div>
        <div class="modal-body">
          <form id="pricing-form" onsubmit="CompetitorsPage.savePricing(event)">
            <input type="hidden" id="pf-id"><input type="hidden" id="pf-comp-id">
            <div class="form-row">
              <div class="form-group"><label class="form-label">Product Name *</label><input type="text" class="form-input" id="pf-product" required placeholder="e.g. Moisturizing Lip Glaze"></div>
              <div class="form-group"><label class="form-label">Price (USD) *</label><input type="number" step="0.01" class="form-input" id="pf-price" required placeholder="e.g. 15.99"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label class="form-label">Pricing Model</label><select class="form-select" id="pf-model"><option value="mid-range">Mid-range</option><option value="premium">Premium</option><option value="budget">Budget</option></select></div>
              <div class="form-group"><label class="form-label">Distribution</label><input type="text" class="form-input" id="pf-distribution" placeholder="e.g. Online + Offline"></div>
            </div>
            <div class="form-group"><label class="form-label">Discount Policy</label><textarea class="form-textarea" id="pf-discount" placeholder="Describe discount strategy..."></textarea></div>
            <div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" id="pf-notes" placeholder="Additional notes..."></textarea></div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="App.closeModal('modal-pricing-form')">Cancel</button>
          <button class="btn btn-primary" onclick="document.getElementById('pricing-form').requestSubmit()">Save</button>
        </div>
      </div>
    </div>`;
  }

  function renderRows(comps, markets) {
    return comps.map(c => {
      const market = markets.find(m => m.market_id === c.market_id);
      return `<tr>
        <td><strong>${App.escapeHtml(c.company_name)}</strong></td>
        <td><span class="badge badge-neutral">${market ? App.escapeHtml(market.market_name) : 'Unknown'}</span></td>
        <td>${App.escapeHtml(c.country_origin || '—')}</td>
        <td>${c.founded_year || '—'}</td>
        <td>${App.formatCurrency(c.revenue_usd)}</td>
        <td>${c.market_share || 0}%</td>
        <td><span class="badge badge-purple" id="pcount-${c.competitor_id}">0</span></td>
        <td><span class="badge badge-neutral" id="swot-${c.competitor_id}">—</span></td>
        <td>
          <div class="flex gap-sm">
            <button class="btn btn-ghost btn-sm" onclick="CompetitorsPage.view(${c.competitor_id})">View</button>
            <button class="btn btn-ghost btn-sm" data-requires-edit onclick="CompetitorsPage.openForm(${c.competitor_id})">Edit</button>
            <button class="btn btn-ghost btn-sm" data-requires-admin onclick="CompetitorsPage.remove(${c.competitor_id})">Delete</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  async function filter() {
    const q = document.getElementById('comp-search').value.toLowerCase();
    const mf = document.getElementById('comp-market-filter').value;
    let comps = competitors;
    if (mf) comps = comps.filter(c => c.market_id === Number(mf));
    if (q) comps = comps.filter(c => c.company_name.toLowerCase().includes(q) || (c.country_origin||'').toLowerCase().includes(q));
    const markets = App.cache('markets') || [];
    document.getElementById('comp-table-body').innerHTML = renderRows(comps, markets);

    comps.forEach(async c => {
      try {
        const [pricing, swot] = await Promise.all([API.Pricing.list(c.competitor_id), API.SWOT.get(c.competitor_id)]);
        const pc = document.getElementById(`pcount-${c.competitor_id}`);
        if (pc) { pc.textContent = pricing.length; pc.className = `badge badge-purple`; }
        const sc = document.getElementById(`swot-${c.competitor_id}`);
        if (sc) { sc.textContent = swot ? 'Done' : '—'; sc.className = `badge ${swot ? 'badge-success' : 'badge-neutral'}`; }
      } catch {}
    });
    App.updatePermissionUI();
  }

  function openForm(id = null) {
    document.getElementById('comp-form').reset();
    document.getElementById('cf-id').value = '';
    if (id) {
      const c = competitors.find(x => x.competitor_id === id);
      if (!c) return;
      document.getElementById('comp-form-title').textContent = 'Edit Competitor';
      document.getElementById('cf-id').value = c.competitor_id;
      document.getElementById('cf-name').value = c.company_name;
      document.getElementById('cf-market').value = c.market_id;
      document.getElementById('cf-origin').value = c.country_origin || '';
      document.getElementById('cf-year').value = c.founded_year || '';
      document.getElementById('cf-revenue').value = c.revenue_usd || '';
      document.getElementById('cf-share').value = c.market_share || '';
      document.getElementById('cf-website').value = c.website || '';
      document.getElementById('cf-desc').value = c.description || '';
    } else { document.getElementById('comp-form-title').textContent = 'Add Competitor'; }
    App.openModal('modal-comp-form');
  }

  async function save(e) {
    e.preventDefault();
    const id = document.getElementById('cf-id').value;
    const data = {
      company_name: document.getElementById('cf-name').value.trim(),
      market_id: Number(document.getElementById('cf-market').value),
      country_origin: document.getElementById('cf-origin').value.trim(),
      founded_year: Number(document.getElementById('cf-year').value) || null,
      revenue_usd: Number(document.getElementById('cf-revenue').value) || 0,
      market_share: Number(document.getElementById('cf-share').value) || 0,
      website: document.getElementById('cf-website').value.trim(),
      description: document.getElementById('cf-desc').value.trim(),
    };
    try {
      if (id) { await API.Competitors.update(Number(id), data); App.toast('Competitor updated', 'success'); }
      else { await API.Competitors.create(data); App.toast('Competitor added', 'success'); }
      App.closeModal('modal-comp-form');
      await loadData();
      App.updateNavBadges();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function remove(id) {
    if (!confirm('Delete this competitor and all related data?')) return;
    try { await API.Competitors.delete(id); App.toast('Competitor deleted', 'danger'); await loadData(); App.updateNavBadges(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  async function view(id) {
    try {
      const c = competitors.find(x => x.competitor_id === id);
      if (!c) return;
      const [pricing, swot, risks, markets] = await Promise.all([
        API.Pricing.list(id), API.SWOT.get(id),
        API.Risks.list({ market_id: c.market_id }),
        API.Markets.list(),
      ]);
      const compRisks = risks.filter(r => r.competitor_id === id);
      const container = document.getElementById('page-competitors');

      container.innerHTML = `
        <div class="toolbar">
          <button class="btn btn-secondary" onclick="CompetitorsPage.init()">← Back</button>
          <div class="toolbar-right">
            <button class="btn btn-secondary" data-requires-edit onclick="CompetitorsPage.openPricingForm(${c.competitor_id})">+ Add Product</button>
            <button class="btn btn-primary" data-requires-edit onclick="CompetitorsPage.openForm(${c.competitor_id})">Edit</button>
          </div>
        </div>
        <div class="card mb-lg">
          <div class="flex justify-between items-center" style="flex-wrap:wrap;gap:var(--sp-md)">
            <div>
              <h2 style="font-size:1.3rem">${App.escapeHtml(c.company_name)}</h2>
              <span class="badge badge-cyan mt-md">${App.getMarketName(c.market_id, markets)}</span>
            </div>
            <div style="text-align:right">
              <div class="kpi-value" style="font-size:1.4rem">${App.formatCurrency(c.revenue_usd)}</div>
              <div class="text-sm text-muted">Revenue</div>
            </div>
          </div>
          <hr class="section-divider">
          <div class="detail-grid">
            <div class="detail-field"><div class="field-label">Country of Origin</div><div class="field-value">${App.escapeHtml(c.country_origin || '—')}</div></div>
            <div class="detail-field"><div class="field-label">Founded</div><div class="field-value">${c.founded_year || '—'}</div></div>
            <div class="detail-field"><div class="field-label">Market Share</div><div class="field-value">${c.market_share || 0}%</div></div>
            <div class="detail-field"><div class="field-label">Website</div><div class="field-value">${c.website ? `<a href="${App.escapeHtml(c.website)}" target="_blank">${App.escapeHtml(c.website)}</a>` : '—'}</div></div>
          </div>
          ${c.description ? `<hr class="section-divider"><p class="text-sm text-secondary">${App.escapeHtml(c.description)}</p>` : ''}
        </div>

        <div class="card mb-lg">
          <div class="card-header"><h3>SWOT Analysis</h3></div>
          ${swot ? `<div class="swot-grid">
            <div class="swot-quadrant swot-strengths"><h4>Strengths</h4><ul>${(swot.strengths||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
            <div class="swot-quadrant swot-weaknesses"><h4>Weaknesses</h4><ul>${(swot.weaknesses||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
            <div class="swot-quadrant swot-opportunities"><h4>Opportunities</h4><ul>${(swot.opportunities||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
            <div class="swot-quadrant swot-threats"><h4>Threats</h4><ul>${(swot.threats||'').split('\n').filter(Boolean).map(s=>`<li>${App.escapeHtml(s)}</li>`).join('')}</ul></div>
          </div>` : '<div class="empty-state"><p>No SWOT analysis yet</p></div>'}
        </div>

        <div class="card mb-lg">
          <div class="card-header"><h3>Products (${pricing.length})</h3></div>
          ${pricing.length > 0 ? `<div class="table-container"><table class="data-table">
            <thead><tr><th>Product</th><th>Price</th><th>Model</th><th>Distribution</th><th>Actions</th></tr></thead>
            <tbody>${pricing.map(p => `<tr>
              <td><strong>${App.escapeHtml(p.product_name)}</strong></td>
              <td>$${(p.price_usd||0).toFixed(2)}</td>
              <td><span class="badge badge-${p.pricing_model==='premium'?'purple':p.pricing_model==='mid-range'?'cyan':'success'}">${p.pricing_model}</span></td>
              <td class="text-sm">${App.escapeHtml(p.distribution||'—')}</td>
              <td><div class="flex gap-sm">
                <button class="btn btn-ghost btn-sm" data-requires-edit onclick="CompetitorsPage.openPricingForm(${c.competitor_id},${p.pricing_id})">Edit</button>
                <button class="btn btn-ghost btn-sm" data-requires-admin onclick="CompetitorsPage.removePricing(${p.pricing_id},${c.competitor_id})">Delete</button>
              </div></td>
            </tr>`).join('')}</tbody>
          </table></div>` : '<div class="empty-state"><p>No products added yet</p></div>'}
        </div>

        <div class="card">
          <div class="card-header"><h3>Risks & Opportunities (${compRisks.length})</h3></div>
          <div class="tag-list">${compRisks.map(r => `<span class="tag-chip ${r.type==='risk'?'tag-risk':'tag-opportunity'}">${App.escapeHtml(r.title)} <span class="badge badge-${r.severity==='high'?'danger':r.severity==='medium'?'warning':'info'}" style="margin-left:4px">${r.severity}</span></span>`).join('') || '<div class="empty-state"><p>No tags yet</p></div>'}</div>
        </div>

        ${renderPricingFormModal()}
        ${renderCompFormModal(markets)}
      `;
      App.updatePermissionUI();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  function openPricingForm(compId, pricingId = null) {
    const form = document.getElementById('pricing-form');
    if (form) form.reset();
    document.getElementById('pf-id').value = '';
    document.getElementById('pf-comp-id').value = compId;
    if (pricingId) {
      API.Pricing.list(compId).then(pricing => {
        const p = pricing.find(x => x.pricing_id === pricingId);
        if (!p) return;
        document.getElementById('pricing-form-title').textContent = 'Edit Product Pricing';
        document.getElementById('pf-id').value = p.pricing_id;
        document.getElementById('pf-product').value = p.product_name;
        document.getElementById('pf-price').value = p.price_usd;
        document.getElementById('pf-model').value = p.pricing_model || 'mid-range';
        document.getElementById('pf-distribution').value = p.distribution || '';
        document.getElementById('pf-discount').value = p.discount_policy || '';
        document.getElementById('pf-notes').value = p.notes || '';
      });
    } else { document.getElementById('pricing-form-title').textContent = 'Add Product Pricing'; }
    App.openModal('modal-pricing-form');
  }

  async function savePricing(e) {
    e.preventDefault();
    const id = document.getElementById('pf-id').value;
    const compId = Number(document.getElementById('pf-comp-id').value);
    const data = {
      competitor_id: compId,
      product_name: document.getElementById('pf-product').value.trim(),
      price_usd: Number(document.getElementById('pf-price').value),
      pricing_model: document.getElementById('pf-model').value,
      distribution: document.getElementById('pf-distribution').value.trim(),
      discount_policy: document.getElementById('pf-discount').value.trim(),
      notes: document.getElementById('pf-notes').value.trim(),
    };
    try {
      if (id) { await API.Pricing.update(Number(id), data); App.toast('Pricing updated', 'success'); }
      else { await API.Pricing.create(data); App.toast('Product added', 'success'); }
      App.closeModal('modal-pricing-form'); view(compId);
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function removePricing(pricingId, compId) {
    if (!confirm('Delete this product pricing?')) return;
    try { await API.Pricing.delete(pricingId); App.toast('Pricing deleted', 'danger'); view(compId); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  return { init, filter, openForm, save, remove, view, openPricingForm, savePricing, removePricing };
})();
