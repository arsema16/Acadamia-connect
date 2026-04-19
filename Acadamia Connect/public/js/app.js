// ===== MAIN APP CONTROLLER =====
const AppState = {
  user: null,
  role: null
};

async function init() {
  // Check existing session
  const res = await API.get('/api/auth/me');
  if (res.success && res.user) {
    AppState.user = res.user;
    AppState.role = res.role;
    navigateToDashboard(res.role);
  } else {
    renderLanding();
    showPage('landing');
  }
}

function navigateToDashboard(role) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + role).classList.add('active');
  switch(role) {
    case 'student': renderStudentPortal(); break;
    case 'teacher': renderTeacherPortal(); break;
    case 'parent':  renderParentPortal(); break;
    case 'admin':   renderAdminPortal(); break;
  }
  // Connect socket
  connectSocket();
}

function connectSocket() {
  if (!AppState.user) return;
  try {
    if (typeof io !== 'undefined') {
      window.socketIO = io();
      window.socketIO.emit('join', {
        userId: AppState.user.id,
        role: AppState.role,
        schoolId: AppState.user.school_id
      });
      
      // Initialize Chat module with socket
      if (typeof Chat !== 'undefined') {
        Chat.initSocket(window.socketIO, AppState.user.id, AppState.role);
      }
      
      window.socketIO.on('new_message', (data) => {
        // Update unread badge
        if (typeof Chat !== 'undefined') {
          Chat.updateUnreadBadge();
        }
        // Show toast if not in chat view
        const activeTab = document.querySelector('.nav-item.active');
        if (!activeTab || !activeTab.dataset.tab?.includes('chat')) {
          showToast('New message received', 'info');
        }
      });
      
      window.socketIO.on('new_announcement', (data) => {
        showToast('New announcement: ' + data.title, 'info');
      });
      
      window.socketIO.on('notification', (data) => {
        showToast(data.title + ': ' + data.body, 'info');
        // Update notification badge
        const badge = document.querySelector('.notif-badge');
        if (badge) {
          badge.textContent = parseInt(badge.textContent || '0') + 1;
        }
      });
    }
  } catch(e) {
    // Socket not available, continue without real-time
  }
}

async function handleLogout() {
  await API.post('/api/auth/logout', {});
  AppState.user = null;
  AppState.role = null;
  if (window.socketIO) { window.socketIO.disconnect(); window.socketIO = null; }
  renderLanding();
  showPage('landing');
  showToast('Logged out successfully', 'info');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme before rendering
  applyTheme(localStorage.getItem('theme') || 'dark-academia');
  renderLanding();
  init();
});

// ===== THEME CUSTOMIZATION SYSTEM =====
const THEMES = {
  'dark-academia': {
    '--bg-primary': '#2C1810',
    '--bg-secondary': '#3D2319',
    '--accent': '#C49A6C',
    '--border': '#8B5E3C',
    '--text-light': 'rgba(245,245,245,0.85)',
    '--text-dark': '#1a0a00',
    '--success': '#4CAF50',
    '--danger': '#f44336',
    '--warning': '#FF9800'
  },
  'ocean-blue': {
    '--bg-primary': '#0D1B2A',
    '--bg-secondary': '#1B2A3B',
    '--accent': '#4FC3F7',
    '--border': '#2A4A6B',
    '--text-light': 'rgba(245,245,245,0.85)',
    '--text-dark': '#0a1520',
    '--success': '#4CAF50',
    '--danger': '#f44336',
    '--warning': '#FF9800'
  },
  'forest-green': {
    '--bg-primary': '#0D1F0D',
    '--bg-secondary': '#1A2E1A',
    '--accent': '#66BB6A',
    '--border': '#2E5E2E',
    '--text-light': 'rgba(245,245,245,0.85)',
    '--text-dark': '#0a150a',
    '--success': '#4CAF50',
    '--danger': '#f44336',
    '--warning': '#FF9800'
  },
  'sunset-orange': {
    '--bg-primary': '#1A0D00',
    '--bg-secondary': '#2E1A00',
    '--accent': '#FF7043',
    '--border': '#6B3A1A',
    '--text-light': 'rgba(245,245,245,0.85)',
    '--text-dark': '#150800',
    '--success': '#4CAF50',
    '--danger': '#f44336',
    '--warning': '#FF9800'
  }
};

function applyTheme(themeName) {
  const theme = THEMES[themeName] || THEMES['dark-academia'];
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  localStorage.setItem('theme', themeName);
  document.body.setAttribute('data-theme', themeName);
}

function setTheme(themeName) {
  applyTheme(themeName);
  // Persist to server if logged in
  if (AppState.user && AppState.role === 'student') {
    API.put('/api/student/profile', { theme: themeName }).catch(() => {});
  }
}
