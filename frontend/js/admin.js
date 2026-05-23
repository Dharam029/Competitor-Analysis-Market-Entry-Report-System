const AdminPage = (() => {
  let users = [];

  async function init() {
    if (!Auth.canManageUsers()) {
      document.getElementById('page-admin').innerHTML = `
        <div class="empty-state"><h3>Access Denied</h3><p>Only administrators can access this page.</p></div>`;
      return;
    }
    await loadData();
  }

  async function loadData() {
    try {
      users = await API.Admin.users.list();
      render();
    } catch (err) {
      document.getElementById('page-admin').innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
    }
  }

  function render() {
    const container = document.getElementById('page-admin');
    container.innerHTML = `
      <div class="tab-bar">
        <div class="tab-item active" onclick="AdminPage.switchTab('users')">User Management</div>
        <div class="tab-item" onclick="AdminPage.switchTab('data')">Data Management</div>
        <div class="tab-item" onclick="AdminPage.switchTab('system')">System Info</div>
      </div>

      <div class="tab-content active" id="admin-tab-users">
        <div class="toolbar"><h3>Registered Users (${users.length})</h3><button class="btn btn-primary" onclick="AdminPage.openUserForm()">+ Add User</button></div>
        <div class="table-container"><table class="data-table">
          <thead><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>${users.map(u => `<tr>
            <td>${u.user_id}</td>
            <td><div class="flex items-center gap-sm"><div class="user-avatar" style="width:28px;height:28px;font-size:0.7rem">${u.username.substring(0, 2).toUpperCase()}</div><strong>${App.escapeHtml(u.username)}</strong></div></td>
            <td class="text-sm">${App.escapeHtml(u.email)}</td>
            <td><span class="badge badge-${u.role === 'admin' ? 'danger' : u.role === 'analyst' ? 'cyan' : 'neutral'}">${u.role}</span></td>
            <td class="text-sm">${App.formatDate(u.created_at)}</td>
            <td><div class="flex gap-sm">
              <button class="btn btn-ghost btn-sm" onclick="AdminPage.openUserForm(${u.user_id})">Edit</button>
              ${u.user_id !== Auth.getUserId() ? `<button class="btn btn-ghost btn-sm" onclick="AdminPage.removeUser(${u.user_id})">Delete</button>` : ''}
            </div></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>

      <div class="tab-content" id="admin-tab-data">
        <div class="charts-grid">
          <div class="card"><div class="card-header"><h3>Export Data</h3></div>
            <p class="text-sm text-secondary mb-lg">Download all system data as a JSON backup file.</p>
            <button class="btn btn-primary" onclick="AdminPage.exportData()">Download Backup</button></div>
          <div class="card"><div class="card-header"><h3>Import Data</h3></div>
            <p class="text-sm text-secondary mb-lg">Restore system data from a previously exported JSON backup.</p>
            <input type="file" id="import-file" accept=".json" style="display:none" onchange="AdminPage.importData(event)">
            <button class="btn btn-secondary" onclick="document.getElementById('import-file').click()">Upload Backup</button></div>
          <div class="card"><div class="card-header"><h3>Reset System</h3></div>
            <p class="text-sm text-secondary mb-lg">Clear all data and re-seed with demo data.</p>
            <button class="btn btn-danger" onclick="AdminPage.resetData()">Reset to Demo Data</button></div>
          <div class="card"><div class="card-header"><h3>Clear All Data</h3></div>
            <p class="text-sm text-secondary mb-lg">Remove all data permanently. Cannot be undone.</p>
            <button class="btn btn-danger" onclick="AdminPage.clearData()">Clear Everything</button></div>
        </div>
      </div>

      <div class="tab-content" id="admin-tab-system">
        <div class="card"><div class="card-header"><h3>System Statistics</h3></div>
          <div class="detail-grid" id="system-stats">Loading...</div>
        </div>
      </div>

      <div class="modal-overlay" id="modal-user-form">
        <div class="modal">
          <div class="modal-header"><h3 id="user-form-title">Add User</h3><button class="modal-close" onclick="App.closeModal('modal-user-form')">&#10005;</button></div>
          <div class="modal-body">
            <form id="user-form" onsubmit="AdminPage.saveUser(event)">
              <input type="hidden" id="uf-id">
              <div class="form-group"><label class="form-label">Username *</label><input type="text" class="form-input" id="uf-username" required placeholder="e.g. john_doe"></div>
              <div class="form-group"><label class="form-label">Email *</label><input type="email" class="form-input" id="uf-email" required placeholder="e.g. john@company.com"></div>
              <div class="form-group"><label class="form-label">Password *</label><input type="text" class="form-input" id="uf-password" required placeholder="Password"></div>
              <div class="form-group"><label class="form-label">Role *</label><select class="form-select" id="uf-role" required><option value="analyst">Analyst</option><option value="viewer">Viewer</option><option value="admin">Admin</option></select></div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('modal-user-form')">Cancel</button>
            <button class="btn btn-primary" onclick="document.getElementById('user-form').requestSubmit()">Save User</button>
          </div>
        </div>
      </div>
    `;
    loadSystemStats();
  }

  function switchTab(tab) {
    document.querySelectorAll('#page-admin .tab-item').forEach((t, i) => { t.classList.toggle('active', ['users', 'data', 'system'][i] === tab); });
    document.querySelectorAll('#page-admin .tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`admin-tab-${tab}`).classList.add('active');
    if (tab === 'system') loadSystemStats();
  }

  function openUserForm(id = null) {
    document.getElementById('user-form').reset();
    document.getElementById('uf-id').value = '';
    if (id) {
      const u = users.find(x => x.user_id === id);
      if (!u) return;
      document.getElementById('user-form-title').textContent = 'Edit User';
      document.getElementById('uf-id').value = u.user_id;
      document.getElementById('uf-username').value = u.username;
      document.getElementById('uf-email').value = u.email;
      document.getElementById('uf-password').value = '';
      document.getElementById('uf-role').value = u.role;
    } else { document.getElementById('user-form-title').textContent = 'Add User'; }
    App.openModal('modal-user-form');
  }

  async function saveUser(e) {
    e.preventDefault();
    const id = document.getElementById('uf-id').value;
    const data = {
      username: document.getElementById('uf-username').value.trim(),
      email: document.getElementById('uf-email').value.trim(),
      password_hash: document.getElementById('uf-password').value,
      role: document.getElementById('uf-role').value,
    };
    if (!id && !data.password_hash) { App.toast('Password required for new users', 'danger'); return; }
    try {
      if (id) {
        if (!data.password_hash) { const u = users.find(x => x.user_id === Number(id)); if (u) data.password_hash = u.password_hash; }
        await API.Admin.users.update(Number(id), data);
        App.toast('User updated', 'success');
      } else {
        await API.Admin.users.create(data);
        App.toast('User created', 'success');
      }
      App.closeModal('modal-user-form');
      await loadData();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function removeUser(id) {
    if (id === Auth.getUserId()) { App.toast('Cannot delete your own account', 'danger'); return; }
    if (!confirm('Delete this user?')) return;
    try { await API.Admin.users.delete(id); App.toast('User deleted', 'danger'); await loadData(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  async function exportData() {
    try {
      const data = await API.Admin.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `cas_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      App.toast('Data exported', 'success');
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        await API.Admin.import(data);
        App.toast('Data imported', 'success');
        await loadData();
      } catch (err) { App.toast('Invalid backup file: ' + err.message, 'danger'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function resetData() {
    if (!confirm('Reset all data to demo state? This cannot be undone.')) return;
    try { await API.Admin.reset(); App.toast('Data reset to demo state', 'warning'); await loadData(); App.updateNavBadges(); }
    catch (err) { App.toast(err.message, 'danger'); }
  }

  async function clearData() {
    if (!confirm('PERMANENTLY delete ALL data?')) return;
    if (!confirm('Are you really sure?')) return;
    try {
      const emptyExport = { markets: [], competitors: [], competitor_pricing: [], swot_analysis: [], market_entry_strategies: [], reports: [], risks_opportunities: [] };
      await API.Admin.import(emptyExport);
      App.toast('All data cleared', 'danger');
      await loadData();
      App.updateNavBadges();
    } catch (err) { App.toast(err.message, 'danger'); }
  }

  async function loadSystemStats() {
    const el = document.getElementById('system-stats');
    if (!el) return;
    try {
      const [stats, changes] = await Promise.all([API.Admin.stats(), API.Admin.changes()]);
      let storageStr = 'N/A';
      try {
        const exportData = await API.Admin.export();
        const size = new Blob([JSON.stringify(exportData)]).size;
        storageStr = size > 1024 * 1024 ? (size / (1024 * 1024)).toFixed(1) + ' MB' : size > 1024 ? (size / 1024).toFixed(1) + ' KB' : size + ' bytes';
      } catch {}
      el.innerHTML = `
        <div class="detail-field"><div class="field-label">Users</div><div class="field-value">${stats.users}</div></div>
        <div class="detail-field"><div class="field-label">Markets</div><div class="field-value">${stats.markets}</div></div>
        <div class="detail-field"><div class="field-label">Competitors</div><div class="field-value">${stats.competitors}</div></div>
        <div class="detail-field"><div class="field-label">Products Tracked</div><div class="field-value">${stats.competitor_pricing}</div></div>
        <div class="detail-field"><div class="field-label">SWOT Analyses</div><div class="field-value">${stats.swot_analysis}</div></div>
        <div class="detail-field"><div class="field-label">Strategies</div><div class="field-value">${stats.market_entry_strategies}</div></div>
        <div class="detail-field"><div class="field-label">Reports</div><div class="field-value">${stats.reports}</div></div>
        <div class="detail-field"><div class="field-label">Risk/Opp Tags</div><div class="field-value">${stats.risks_opportunities}</div></div>
        <hr class="section-divider">
        <div class="detail-field"><div class="field-label">Storage Size</div><div class="field-value">${storageStr}</div></div>
        <div class="detail-field"><div class="field-label">Changes Tracked</div><div class="field-value">${changes.length}</div></div>
        <div class="detail-field"><div class="field-label">Current User</div><div class="field-value">${Auth.getUsername()} (${Auth.getRole()})</div></div>
      `;
    } catch { el.innerHTML = '<p class="text-muted">Could not load stats</p>'; }
  }

  return { init, switchTab, openUserForm, saveUser, removeUser, exportData, importData, resetData, clearData };
})();
