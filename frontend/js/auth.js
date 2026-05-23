const Auth = (() => {
  let currentUser = null;

  function initSession() {
    const stored = sessionStorage.getItem('cas_user');
    if (stored) {
      try { currentUser = JSON.parse(stored); } catch {}
    }
  }

  async function login(username, password) {
    try {
      const result = await API.Auth.login(username, password);
      API.setToken(result.token);
      currentUser = result.user;
      sessionStorage.setItem('cas_user', JSON.stringify(result.user));
      return { success: true, user: result.user };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  function logout() {
    API.setToken(null);
    sessionStorage.removeItem('cas_user');
    currentUser = null;
  }

  function getSession() { return currentUser; }
  function isLoggedIn() { return currentUser !== null; }
  function getRole() { return currentUser ? currentUser.role : null; }
  function getUserId() { return currentUser ? currentUser.user_id : null; }
  function getUsername() { return currentUser ? currentUser.username : null; }
  function getInitials() { return currentUser ? currentUser.username.substring(0, 2).toUpperCase() : '?'; }

  function canEdit() { const r = getRole(); return r === 'admin' || r === 'analyst'; }
  function canDelete() { return getRole() === 'admin'; }
  function canManageUsers() { return getRole() === 'admin'; }
  function isViewer() { return getRole() === 'viewer'; }
  function isAdmin() { return getRole() === 'admin'; }
  function isAnalyst() { return getRole() === 'analyst'; }

  initSession();

  return {
    login, logout, getSession, isLoggedIn,
    getRole, getUserId, getUsername, getInitials,
    canEdit, canDelete, canManageUsers,
    isViewer, isAdmin, isAnalyst
  };
})();
