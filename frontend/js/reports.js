const ReportsPage = (() => {
  let reports = [];
  let markets = [];
  let strategies = [];

  async function init() {
    await loadData();
    SocketClient.on('report:created', () => loadData());
    SocketClient.on('report:updated', () => loadData());
    SocketClient.on('report:deleted', () => loadData());
  }

  async function loadData() {
    try {
      [reports, markets, strategies] = await Promise.all([
        API.Reports.list(), API.Markets.list(), API.Strategies.list()
      ]);
      App.cache('markets', markets);
      render();
    } catch (err) {
      document.getElementById('page-reports').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const container = document.getElementById('page-reports');
    container.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="search-box"><span class="search-icon"><svg><use href="#icon-search"/></svg></span>
            <input type="text" class="form-input" id="report-search" placeholder="Search reports..." oninput="ReportsPage.filter()">
          </div>
          <select class="form-select" id="report-status-filter" style="width:150px" onchange="ReportsPage.filter()">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="btn btn-primary" data-requires-edit onclick="ReportsPage.openForm()">+ Create Report</button>
        </div>
      </div>
      <div class="report-grid stagger-in" id="reports-grid">${renderCards(reports)}</div>
      ${reports.length === 0 ? '<div class="empty-state mt-lg"><h3>No reports yet</h3><p>Generate your first analysis report</p></div>' : ''}

      <div class="modal-overlay modal-wide" id="modal-report-form">
        <div class="modal">
          <div class="modal-header"><h3 id="report-form-title">Create Report</h3><button class="modal-close" onclick="App.closeModal('modal-report-form')">&#10005;</button></div>
          <div class="modal-body">
            <form id="report-form" onsubmit="ReportsPage.save(event)">
              <input type="hidden" id="rpf-id"><input type="hidden" id="rpf-version" value="1">
              <div class="form-group"><label class="form-label">Report Title *</label><input type="text" class="form-input" id="rpf-title" required placeholder="e.g. China Skincare Market Entry Assessment Q1 2026"></div>
              <div class="form-row">
                <div class="form-group"><label class="form-label">Market *</label><select class="form-select" id="rpf-market" required onchange="ReportsPage.updateStrategies()"><option value="">Select Market</option>${markets.map(m => `<option value="${m.market_id}">${App.escapeHtml(m.market_name)}</option>`).join('')}</select></div>
                <div class="form-group"><label class="form-label">Strategy</label><select class="form-select" id="rpf-strategy"><option value="">No linked strategy</option>${strategies.map(s => `<option value="${s.strategy_id}">${App.escapeHtml(s.strategy_title)}</option>`).join('')}</select></div>
              </div>
              <div class="form-group"><label class="form-label">Status</label><select class="form-select" id="rpf-status"><option value="draft">Draft</option><option value="final">Final</option><option value="archived">Archived</option></select></div>
              <div class="form-group"><label class="form-label">Summary *</label><textarea class="form-textarea" id="rpf-summary" rows="6" required placeholder="Executive summary of the analysis report..."></textarea></div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('modal-report-form')">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('report-form').requestSubmit()">Save Report</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay modal-wide" id="modal-report-detail">
        <div class="modal" style="max-height:90vh">
          <div class="modal-header"><h3 id="report-detail-title">Report Detail</h3><button class="modal-close" onclick="App.closeModal('modal-report-detail')">&#10005;</button></div>
          <div class="modal-body" id="report-detail-body"></div>
          <div class="modal-footer" id="report-detail-footer"></div>
        </div>
      </div>
    `;
    App.updatePermissionUI();
  }

  function renderCards(rpts) {
    const statusColors = { draft: 'warning', final: 'success', archived: 'neutral' };
    return rpts.map(r => `
      <div class="card report-card">
        <div class="report-status">
          <span class="badge badge-${statusColors[r.status] || 'neutral'}">${r.status}</span>
          <span class="badge badge-neutral" style="margin-left:6px">v${r.version}</span>
        </div>
        <h3 style="font-size:1rem; margin-bottom:var(--sp-xs)">${App.escapeHtml(r.report_title)}</h3>
        <div class="text-sm text-muted mb-md">${App.getMarketName(r.market_id, markets)} · ${App.formatDate(r.created_at)}</div>
        <p class="report-summary">${App.escapeHtml((r.summary || '').substring(0, 180))}${(r.summary || '').length > 180 ? '...' : ''}</p>
        <div class="report-actions">
          <button class="btn btn-ghost btn-sm" onclick="ReportsPage.viewDetail(${r.report_id})">View</button>
          <button class="btn btn-ghost btn-sm" data-requires-edit onclick="ReportsPage.openForm(${r.report_id})">Edit</button>
          <button class="btn btn-ghost btn-sm" onclick="ReportsPage.exportPDF(${r.report_id})">PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="ReportsPage.exportExcel(${r.report_id})">Excel</button>
          <button class="btn btn-ghost btn-sm" data-requires-admin onclick="ReportsPage.remove(${r.report_id})">Delete</button>
        </div>
      </div>
    `).join('');
  }

  function filter() {
    const q = (document.getElementById('report-search')?.value || '').toLowerCase();
    const status = document.getElementById('report-status-filter')?.value;
    let rpts = reports;
    if (q) rpts = rpts.filter(r => r.report_title.toLowerCase().includes(q) || (r.summary || '').toLowerCase().includes(q));
    if (status) rpts = rpts.filter(r => r.status === status);
    document.getElementById('reports-grid').innerHTML = renderCards(rpts);
    App.updatePermissionUI();
  }

  function updateStrategies() {
    const marketId = document.getElementById('rpf-market')?.value;
    const select = document.getElementById('rpf-strategy');
    select.innerHTML = '<option value="">No linked strategy</option>';
    if (marketId) {
      strategies.filter(s => s.market_id === Number(marketId)).forEach(s => {
        select.innerHTML += `<option value="${s.strategy_id}">${App.escapeHtml(s.strategy_title)}</option>`;
      });
    }
  }

  function openForm(id = null) {
    document.getElementById('report-form').reset();
    document.getElementById('rpf-id').value = '';
    document.getElementById('rpf-version').value = '1';
    if (id) {
      const r = reports.find(x => x.report_id === id);
      if (!r) return;
      document.getElementById('report-form-title').textContent = 'Edit Report';
      document.getElementById('rpf-id').value = r.report_id;
      document.getElementById('rpf-version').value = r.version || 1;
      document.getElementById('rpf-title').value = r.report_title;
      document.getElementById('rpf-market').value = r.market_id;
      updateStrategies();
      setTimeout(() => { document.getElementById('rpf-strategy').value = r.strategy_id || ''; }, 50);
      document.getElementById('rpf-status').value = r.status;
      document.getElementById('rpf-summary').value = r.summary || '';
    } else { document.getElementById('report-form-title').textContent = 'Create Report'; }
    App.openModal('modal-report-form');
  }

  async function save(e) {
    e.preventDefault();
    const id = document.getElementById('rpf-id').value;
    const currentVersion = Number(document.getElementById('rpf-version').value) || 1;
    const data = {
      report_title: document.getElementById('rpf-title').value.trim(),
      market_id: Number(document.getElementById('rpf-market').value),
      strategy_id: document.getElementById('rpf-strategy').value ? Number(document.getElementById('rpf-strategy').value) : null,
      status: document.getElementById('rpf-status').value,
      summary: document.getElementById('rpf-summary').value.trim(),
    };
    try {
      if (id) {
        data.version = currentVersion + 1;
        await API.Reports.update(Number(id), data);
        App.toast(`Report updated to v${data.version}`, 'success');
      } else {
        data.version = 1;
        await API.Reports.create(data);
        App.toast('Report created', 'success');
      }
      App.closeModal('modal-report-form');
      await loadData();
      App.updateNavBadges();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function remove(id) {
    if (!confirm('Delete this report?')) return;
    try { await API.Reports.delete(id); App.toast('Report deleted', 'danger'); await loadData(); App.updateNavBadges(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  async function viewDetail(id) {
    try {
      const r = reports.find(x => x.report_id === id);
      if (!r) return;
      const [m, competitors, risks] = await Promise.all([
        API.Markets.get(r.market_id),
        API.Competitors.list(r.market_id),
        API.Risks.list({ market_id: r.market_id }),
      ]);
      const strategy = r.strategy_id ? strategies.find(s => s.strategy_id === r.strategy_id) : null;

      document.getElementById('report-detail-title').textContent = r.report_title;
      document.getElementById('report-detail-body').innerHTML = `
        <div class="flex gap-md items-center mb-lg" style="flex-wrap:wrap">
          <span class="badge badge-${r.status === 'final' ? 'success' : r.status === 'draft' ? 'warning' : 'neutral'}">${r.status}</span>
          <span class="badge badge-neutral">Version ${r.version}</span>
          <span class="text-sm text-muted">Created ${App.formatDateTime(r.created_at)}</span>
        </div>
        <div class="card mb-lg"><h4 style="margin-bottom:var(--sp-sm)">Executive Summary</h4><p class="text-sm text-secondary" style="line-height:1.7; white-space:pre-wrap">${App.escapeHtml(r.summary)}</p></div>
        ${m ? `<div class="card mb-lg"><h4 style="margin-bottom:var(--sp-md)">Market Overview</h4>
          <div class="detail-grid">
            <div class="detail-field"><div class="field-label">Market</div><div class="field-value">${App.escapeHtml(m.market_name)}</div></div>
            <div class="detail-field"><div class="field-label">Country</div><div class="field-value">${App.escapeHtml(m.country)}</div></div>
            <div class="detail-field"><div class="field-label">Market Size</div><div class="field-value">${App.formatCurrency(m.market_size_usd)}</div></div>
            <div class="detail-field"><div class="field-label">Growth Rate</div><div class="field-value">${m.growth_rate}%</div></div>
          </div></div>` : ''}
        ${competitors.length > 0 ? `<div class="card mb-lg"><h4 style="margin-bottom:var(--sp-md)">Competitor Landscape (${competitors.length})</h4>
          <div class="table-container"><table class="data-table"><thead><tr><th>Company</th><th>Revenue</th><th>Market Share</th><th>Origin</th></tr></thead>
          <tbody>${competitors.map(c => `<tr><td><strong>${App.escapeHtml(c.company_name)}</strong></td><td>${App.formatCurrency(c.revenue_usd)}</td><td>${c.market_share || 0}%</td><td>${App.escapeHtml(c.country_origin || '—')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
        ${strategy ? `<div class="card mb-lg"><h4 style="margin-bottom:var(--sp-md)">Linked Strategy</h4>
          <div class="detail-grid">
            <div class="detail-field"><div class="field-label">Strategy</div><div class="field-value">${App.escapeHtml(strategy.strategy_title)}</div></div>
            <div class="detail-field"><div class="field-label">Entry Mode</div><div class="field-value">${strategy.entry_mode}</div></div>
            <div class="detail-field"><div class="field-label">Investment</div><div class="field-value">${App.formatCurrency(strategy.estimated_cost)}</div></div>
            <div class="detail-field"><div class="field-label">Expected ROI</div><div class="field-value">${strategy.expected_roi || 0}%</div></div>
          </div></div>` : ''}
        ${risks.length > 0 ? `<div class="card"><h4 style="margin-bottom:var(--sp-md)">Risks & Opportunities</h4>
          <div class="tag-list">${risks.map(r => `<span class="tag-chip ${r.type === 'risk' ? 'tag-risk' : 'tag-opportunity'}">${App.escapeHtml(r.title)}</span>`).join('')}</div></div>` : ''}
      `;
      document.getElementById('report-detail-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="ReportsPage.exportPDF(${r.report_id})">Export PDF</button>
        <button class="btn btn-secondary" onclick="ReportsPage.exportExcel(${r.report_id})">Export Excel</button>
        <button class="btn btn-primary" onclick="App.closeModal('modal-report-detail')">Close</button>
      `;
      App.openModal('modal-report-detail');
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  function exportPDF(id) {
    const r = reports.find(x => x.report_id === id);
    if (!r) return;
    if (typeof window.jspdf === 'undefined') { App.toast('PDF library loading...', 'warning'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(r.report_title, margin, y); y += 10;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(120);
    doc.text(`Status: ${r.status.toUpperCase()} | Version: ${r.version} | Created: ${App.formatDate(r.created_at)}`, margin, y); y += 10;
    doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 10;

    doc.setTextColor(0); doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, y); y += 8;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(r.summary || '', pageWidth - margin * 2);
    doc.text(summaryLines, margin, y);
    doc.save(`${r.report_title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    App.toast('PDF exported', 'success');
  }

  function exportExcel(id) {
    const r = reports.find(x => x.report_id === id);
    if (!r) return;
    if (typeof XLSX === 'undefined') { App.toast('Excel library loading...', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    const summaryData = [
      ['Report Title', r.report_title], ['Status', r.status], ['Version', r.version],
      ['Created', App.formatDate(r.created_at)], [''],
      ['Market', App.getMarketName(r.market_id, markets)],
      ['Summary', r.summary || ''],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 20 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Report Summary');
    XLSX.writeFile(wb, `${r.report_title.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
    App.toast('Excel exported', 'success');
  }

  return { init, filter, updateStrategies, openForm, save, remove, viewDetail, exportPDF, exportExcel };
})();
