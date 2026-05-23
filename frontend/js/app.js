const App = (() => {
  const routes = {
    dashboard: { title: 'Dashboard', subtitle: 'Overview & Analytics', module: null },
    markets: { title: 'Markets', subtitle: 'Market Data Management', module: null },
    competitors: { title: 'Competitors', subtitle: 'Competitor Profiles', module: null },
    analysis: { title: 'Analysis', subtitle: 'SWOT & Pricing Analysis', module: null },
    strategies: { title: 'Strategies', subtitle: 'Market Entry Planning', module: null },
    reports: { title: 'Reports', subtitle: 'Report Generation & Export', module: null },
    compare: { title: 'Live Compare', subtitle: 'Real-Time Competitor Comparison', module: null },
    admin: { title: 'Admin', subtitle: 'User & System Management', module: null },
  };

  let currentPage = null;
  let _cache = {};

  function init() {
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    if (Auth.isLoggedIn()) {
      showApp();
    }

    window.addEventListener('hashchange', handleRoute);
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', () => {
        window.location.hash = item.dataset.page;
      });
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    const result = await Auth.login(username, password);
    if (result.success) {
      errorEl.classList.remove('show');
      showApp();
    } else {
      errorEl.textContent = result.message;
      errorEl.classList.add('show');
    }
  }

  function handleLogout() {
    Auth.logout();
    hideApp();
  }

  function showApp() {
    document.getElementById('login-overlay').classList.add('hidden');
    document.getElementById('app-container').classList.add('active');

    const session = Auth.getSession();
    document.getElementById('user-display-name').textContent = session.username;
    document.getElementById('user-display-role').textContent = session.role;
    document.getElementById('user-avatar-text').textContent = Auth.getInitials();

    const adminNav = document.querySelector('.nav-item[data-page="admin"]');
    if (adminNav) adminNav.style.display = Auth.canManageUsers() ? 'flex' : 'none';

    SocketClient.connect();
    updatePermissionUI();

    if (!window.location.hash || window.location.hash === '#') {
      window.location.hash = 'dashboard';
    } else {
      handleRoute();
    }
  }

  function hideApp() {
    document.getElementById('login-overlay').classList.remove('hidden');
    document.getElementById('app-container').classList.remove('active');
    document.getElementById('login-form').reset();
    SocketClient.disconnect();
  }

  function updatePermissionUI() {
    document.querySelectorAll('[data-requires-edit]').forEach(el => {
      el.style.display = Auth.canEdit() ? '' : 'none';
    });
    document.querySelectorAll('[data-requires-admin]').forEach(el => {
      el.style.display = Auth.isAdmin() ? '' : 'none';
    });
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const page = hash.split('/')[0];

    if (!routes[page]) {
      window.location.hash = 'dashboard';
      return;
    }

    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    document.getElementById('page-title').textContent = routes[page].title;
    document.getElementById('page-subtitle').textContent = routes[page].subtitle;

    document.querySelectorAll('.page-view').forEach(view => view.classList.remove('active'));
    const pageView = document.getElementById(`page-${page}`);
    if (pageView) pageView.classList.add('active');

    currentPage = page;
    switch(page) {
      case 'dashboard': DashboardPage.init(); break;
      case 'markets': MarketsPage.init(); break;
      case 'competitors': CompetitorsPage.init(); break;
      case 'analysis': AnalysisPage.init(); break;
      case 'strategies': StrategiesPage.init(); break;
      case 'reports': ReportsPage.init(); break;
      case 'compare': ComparePage.init(); break;
      case 'admin': AdminPage.init(); break;
    }

    updatePermissionUI();
  }

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300)">✕</button>
    `;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentElement) {
        el.classList.add('removing');
        setTimeout(() => el.remove(), 300);
      }
    }, 4000);
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('open');
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modalId);
      });
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  function formatCurrency(amount) {
    if (amount === null || amount === undefined || amount === '') return '—';
    const num = Number(amount);
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(2);
  }

  function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    return Number(num).toLocaleString();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getMarketName(marketId, markets) {
    if (!markets) return 'Unknown';
    const m = markets.find(x => x.market_id === marketId);
    return m ? m.market_name : 'Unknown';
  }

  function getCompetitorName(compId, competitors) {
    if (!competitors) return 'Unknown';
    const c = competitors.find(x => x.competitor_id === compId);
    return c ? c.company_name : 'Unknown';
  }

  function getUserName(userId, users) {
    if (!users) return 'Unknown';
    const u = users.find(x => x.user_id === userId);
    return u ? u.username : 'Unknown';
  }

  async function updateNavBadges() {
    try {
      const stats = await API.Dashboard.stats();
      const badgeMap = {
        markets: stats.marketCount,
        competitors: stats.compCount,
        strategies: stats.strategyCount,
        reports: stats.reportCount,
      };
      Object.keys(badgeMap).forEach(page => {
        const badge = document.querySelector(`.nav-item[data-page="${page}"] .nav-badge`);
        if (badge) badge.textContent = badgeMap[page];
      });
    } catch {}
  }

  function cache(key, value) {
    if (value !== undefined) { _cache[key] = value; return value; }
    return _cache[key];
  }

  return {
    init, toast, openModal, closeModal,
    formatCurrency, formatNumber, formatDate, formatDateTime,
    escapeHtml, getMarketName, getCompetitorName, getUserName,
    updateNavBadges, updatePermissionUI, handleRoute,
    cache
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
