const API = (() => {
  const BASE = '/api';
  let token = sessionStorage.getItem('cas_token');

  function setToken(t) {
    token = t;
    if (t) sessionStorage.setItem('cas_token', t);
    else sessionStorage.removeItem('cas_token');
  }

  function getToken() { return token; }

  async function request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  const get = (path) => request('GET', path);
  const post = (path, body) => request('POST', path, body);
  const put = (path, body) => request('PUT', path, body);
  const del = (path) => request('DELETE', path);

  const Auth = {
    login: (username, password) => post('/auth/login', { username, password }),
    session: () => get('/auth/session'),
  };

  const Markets = {
    list: () => get('/markets'),
    get: (id) => get(`/markets/${id}`),
    create: (data) => post('/markets', data),
    update: (id, data) => put(`/markets/${id}`, data),
    delete: (id) => del(`/markets/${id}`),
  };

  const Competitors = {
    list: (marketId) => get(`/competitors${marketId ? `?market_id=${marketId}` : ''}`),
    get: (id) => get(`/competitors/${id}`),
    create: (data) => post('/competitors', data),
    update: (id, data) => put(`/competitors/${id}`, data),
    delete: (id) => del(`/competitors/${id}`),
  };

  const Pricing = {
    list: (compId) => get(`/pricing/competitor/${compId}`),
    create: (data) => post('/pricing', data),
    update: (id, data) => put(`/pricing/${id}`, data),
    delete: (id) => del(`/pricing/${id}`),
  };

  const SWOT = {
    get: (compId) => get(`/analysis/swot/competitor/${compId}`),
    save: (data) => post('/analysis/swot', data),
  };

  const Risks = {
    list: (params) => {
      const q = new URLSearchParams();
      if (params?.market_id) q.set('market_id', params.market_id);
      if (params?.type) q.set('type', params.type);
      const qs = q.toString();
      return get(`/analysis/risks${qs ? '?' + qs : ''}`);
    },
    get: (id) => get(`/analysis/risks/${id}`),
    create: (data) => post('/analysis/risks', data),
    update: (id, data) => put(`/analysis/risks/${id}`, data),
    delete: (id) => del(`/analysis/risks/${id}`),
  };

  const Strategies = {
    list: (marketId) => get(`/strategies${marketId ? `?market_id=${marketId}` : ''}`),
    get: (id) => get(`/strategies/${id}`),
    create: (data) => post('/strategies', data),
    update: (id, data) => put(`/strategies/${id}`, data),
    delete: (id) => del(`/strategies/${id}`),
  };

  const Reports = {
    list: (status) => get(`/reports${status ? `?status=${status}` : ''}`),
    get: (id) => get(`/reports/${id}`),
    create: (data) => post('/reports', data),
    update: (id, data) => put(`/reports/${id}`, data),
    delete: (id) => del(`/reports/${id}`),
  };

  const Admin = {
    users: {
      list: () => get('/admin/users'),
      create: (data) => post('/admin/users', data),
      update: (id, data) => put(`/admin/users/${id}`, data),
      delete: (id) => del(`/admin/users/${id}`),
    },
    export: () => get('/admin/export'),
    import: (data) => post('/admin/import', data),
    reset: () => post('/admin/reset'),
    stats: () => get('/admin/stats'),
    changes: () => get('/admin/changes'),
    notifications: {
      list: () => get('/admin/notifications'),
      read: () => post('/admin/notifications/read'),
    },
  };

  const Dashboard = {
    stats: () => get('/dashboard/stats'),
    activity: () => get('/dashboard/activity'),
  };

  return {
    setToken, getToken,
    Auth, Markets, Competitors, Pricing, SWOT,
    Risks, Strategies, Reports, Admin, Dashboard,
    get, post, put, del
  };
})();
