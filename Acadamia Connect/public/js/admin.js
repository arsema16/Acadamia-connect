// ===== ADMIN PORTAL =====
let adminData = {};
let adminActiveTab = 'dashboard';

async function renderAdminPortal() {
  const page = document.getElementById('page-admin');
  const data = await API.get('/api/admin/dashboard');
  if (!data.success) { showToast('Session expired', 'error'); showPage('auth','login'); return; }
  adminData = data;
  const u = data.admin;

  page.innerHTML = `
<div class="portal-layout">
  <div class="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="admin-sidebar">
    <div class="sidebar-logo"><h2>Academia Connect</h2><p>${t('portalAdmin')}</p></div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Overview</div>
      ${aNavItem('dashboard','home',t('dashboard'))}
      ${aNavItem('schools','school','All Schools')}
      ${aNavItem('allusers','students','All Users')}
      ${aNavItem('students','students',t('students'))}
      ${aNavItem('teachers','book',t('teachers'))}
      ${aNavItem('parents','user',t('parents'))}
      <div class="nav-section-title">Management</div>
      ${aNavItem('payments','payment',t('paymentManagement'))}
      ${aNavItem('subjects','notes',t('subjectManagement'))}
      ${aNavItem('announcements','bell',t('announcements'))}
      ${aNavItem('events','attendance','Events')}
      ${aNavItem('videos','videos',t('videos'))}
      ${aNavItem('leaderboard','leaderboard',t('leaderboard'))}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials(u.full_name)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${u.full_name}</div>
          <div class="sidebar-user-role">Administrator</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="showPage('landing')">${Icons.home} ${t('home')}</button>
        <button class="btn btn-danger btn-sm" style="flex:1;" onclick="handleLogout()">${Icons.logout} ${t('logout')}</button>
      </div>
    </div>
  </aside>
  <main class="main-content">
    <div class="topbar">
      <button class="hamburger" onclick="openSidebar('admin-sidebar')">${Icons.menu}</button>
      <span class="topbar-title" id="admin-page-title">${t('dashboard')}</span>
      <div class="topbar-actions">
        <div class="lang-toggle">
          <button class="lang-btn ${currentLang==='en'?'active':''}" data-lang="en" onclick="setLang('en');renderAdminPortal()">EN</button>
          <button class="lang-btn ${currentLang==='am'?'active':''}" data-lang="am" onclick="setLang('am');renderAdminPortal()">አማ</button>
        </div>
        <button class="btn btn-danger btn-sm" onclick="handleLogout()" title="${t('logout')}" style="padding:6px 10px;">${Icons.logout}</button>
      </div>
    </div>
    <div id="admin-content"></div>
  </main>
</div>`;

  switchAdminTab(adminActiveTab);
}

function aNavItem(tab, icon, label) {
  return `<div class="nav-item ${adminActiveTab===tab?'active':''}" onclick="switchAdminTab('${tab}')">${Icons[icon]||''} ${label}</div>`;
}

function switchAdminTab(tab) {
  adminActiveTab = tab;
  document.querySelectorAll('#admin-sidebar .nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${tab}'`));
  });
  const title = document.getElementById('admin-page-title');
  if (title) title.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  const content = document.getElementById('admin-content');
  if (!content) return;
  switch(tab) {
    case 'dashboard':     renderAdminDashboard(content); break;
    case 'schools':       renderAdminSchools(content); break;
    case 'allusers':      renderAdminAllUsers(content); break;
    case 'students':      renderAdminUsers(content,'student'); break;
    case 'teachers':      renderAdminUsers(content,'teacher'); break;
    case 'parents':       renderAdminUsers(content,'parent'); break;
    case 'payments':      renderAdminPayments(content); break;
    case 'subjects':      renderAdminSubjects(content); break;
    case 'announcements': renderAdminAnnouncements(content); break;
    case 'events':        renderAdminEvents(content); break;
    case 'videos':        renderAdminVideos(content); break;
    case 'leaderboard':   renderAdminLeaderboard(content); break;
    default: renderAdminDashboard(content);
  }
}

function renderAdminDashboard(el) {
  const stats = adminData.stats || {};
  const announcements = adminData.announcements || [];
  const payments = adminData.payments || [];
  const events = adminData.events || [];

  el.innerHTML = `
<div class="welcome-banner">
  <div class="welcome-text">
    <h2>${t('welcome')}, ${adminData.admin.full_name}!</h2>
    <p>School Administrator · Academia Connect</p>
    <p class="welcome-quote">"${getMotivationalQuote()}"</p>
  </div>
</div>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;">
  <div class="admin-stat-card">
    <div class="admin-stat-icon students">${Icons.students}</div>
    <div><div class="admin-stat-val">${stats.students||0}</div><div class="admin-stat-lbl">${t('students')}</div></div>
  </div>
  <div class="admin-stat-card">
    <div class="admin-stat-icon teachers">${Icons.book}</div>
    <div><div class="admin-stat-val">${stats.teachers||0}</div><div class="admin-stat-lbl">${t('teachers')}</div></div>
  </div>
  <div class="admin-stat-card">
    <div class="admin-stat-icon parents">${Icons.user}</div>
    <div><div class="admin-stat-val">${stats.parents||0}</div><div class="admin-stat-lbl">${t('parents')}</div></div>
  </div>
  <div class="admin-stat-card">
    <div class="admin-stat-icon payments">${Icons.payment}</div>
    <div><div class="admin-stat-val">${payments.filter(p=>p.status==='pending').length}</div><div class="admin-stat-lbl">Pending Payments</div></div>
  </div>
</div>
<div class="grid-2">
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.bell} Recent Announcements</h3>
    ${announcements.slice(0,3).map(a => `
    <div class="announcement-item">
      <div class="announcement-title">${a.title}</div>
      <div class="announcement-body">${a.content}</div>
      <div class="announcement-meta">By ${a.author_role} · ${formatDate(a.created_at)}</div>
    </div>`).join('') || `<div class="empty-state"><p>No announcements</p></div>`}
    <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="switchAdminTab('announcements')">${Icons.plus} New Announcement</button>
  </div>
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.attendance} Upcoming Events</h3>
    ${events.slice(0,3).map(e => `
    <div class="card-dark" style="margin-bottom:8px;padding:12px;">
      <div style="font-weight:700;color:var(--accent);">${e.title}</div>
      <div style="font-size:0.78rem;color:rgba(245,245,245,0.5);">${formatDate(e.event_date)} · ${e.event_type||'general'}</div>
    </div>`).join('') || `<div class="empty-state"><p>No events</p></div>`}
  </div>
</div>`;
}

async function renderAdminSchools(el) {
  const data = await API.get('/api/admin/schools');
  const schools = data.schools || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.school||'🏫'} All Schools (${schools.length})</h2>
</div>
<div class="table-card">
  <table>
    <thead><tr><th>School Name</th><th>Code</th><th>Students</th><th>Teachers</th><th>Parents</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>
      ${schools.length === 0
        ? `<tr><td colspan="7" style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">No schools found</td></tr>`
        : schools.map(s => `
      <tr>
        <td style="font-weight:600;color:var(--accent);">${s.name}</td>
        <td style="font-size:0.82rem;">${s.code||'—'}</td>
        <td><span class="badge badge-accent">${s.student_count||0}</span></td>
        <td><span class="badge badge-accent">${s.teacher_count||0}</span></td>
        <td><span class="badge badge-accent">${s.parent_count||0}</span></td>
        <td><span class="badge ${s.verified?'badge-success':'badge-warning'}">${s.verified?'Verified':'Unverified'}</span></td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="viewSchoolUsers(${s.id},'${s.name.replace(/'/g,"\\'")}')">${Icons.students} View Users</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

async function viewSchoolUsers(schoolId, schoolName) {
  const content = document.getElementById('admin-content');
  const data = await API.get('/api/admin/users?role=all&school_id=' + schoolId);
  const students = data.students || [];
  const teachers = data.teachers || [];
  const parents = data.parents || [];
  content.innerHTML = `
<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
  <button class="btn btn-secondary btn-sm" onclick="switchAdminTab('schools')">${Icons.chevronLeft} Back</button>
  <h2 class="text-accent">${Icons.school||'🏫'} ${schoolName}</h2>
</div>
<div class="tabs" style="margin-bottom:16px;">
  <button class="tab-btn active" onclick="showSchoolUserTab('students',this)">Students (${students.length})</button>
  <button class="tab-btn" onclick="showSchoolUserTab('teachers',this)">Teachers (${teachers.length})</button>
  <button class="tab-btn" onclick="showSchoolUserTab('parents',this)">Parents (${parents.length})</button>
</div>
<div id="school-users-students">
  ${renderUserTable(students, 'student')}
</div>
<div id="school-users-teachers" style="display:none;">
  ${renderUserTable(teachers, 'teacher')}
</div>
<div id="school-users-parents" style="display:none;">
  ${renderUserTable(parents, 'parent')}
</div>`;
}

function showSchoolUserTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['students','teachers','parents'].forEach(t => {
    const el = document.getElementById('school-users-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

function renderUserTable(users, role) {
  if (users.length === 0) return `<div class="empty-state"><p>No ${role}s registered</p></div>`;
  return `<div class="table-card"><table>
    <thead><tr><th>Name</th><th>Email</th>${role==='student'?'<th>Grade</th>':role==='teacher'?'<th>Employee ID</th>':''}<th>Joined</th></tr></thead>
    <tbody>
      ${users.map(u => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-row-avatar">${initials(u.full_name)}</div><span>${u.full_name}</span></div></td>
        <td style="font-size:0.82rem;color:rgba(245,245,245,0.6);">${u.email}</td>
        ${role==='student'?`<td>${u.grade||'—'}</td>`:role==='teacher'?`<td>${u.employee_id||'—'}</td>`:''}
        <td style="font-size:0.78rem;color:rgba(245,245,245,0.4);">${formatDate(u.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

async function renderAdminAllUsers(el) {
  const data = await API.get('/api/admin/users?role=all');
  const students = data.students || [];
  const teachers = data.teachers || [];
  const parents = data.parents || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.students} All Users (${students.length + teachers.length + parents.length})</h2>
<div class="tabs" style="margin-bottom:16px;">
  <button class="tab-btn active" onclick="showAllUserTab('students',this)">Students (${students.length})</button>
  <button class="tab-btn" onclick="showAllUserTab('teachers',this)">Teachers (${teachers.length})</button>
  <button class="tab-btn" onclick="showAllUserTab('parents',this)">Parents (${parents.length})</button>
</div>
<div id="allusers-students">
  ${renderAllUserTable(students, 'student')}
</div>
<div id="allusers-teachers" style="display:none;">
  ${renderAllUserTable(teachers, 'teacher')}
</div>
<div id="allusers-parents" style="display:none;">
  ${renderAllUserTable(parents, 'parent')}
</div>`;
}

function showAllUserTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['students','teachers','parents'].forEach(t => {
    const el = document.getElementById('allusers-' + t);
    if (el) el.style.display = t === tab ? '' : 'none';
  });
}

function renderAllUserTable(users, role) {
  if (users.length === 0) return `<div class="empty-state"><p>No ${role}s registered</p></div>`;
  return `<div class="table-card"><table>
    <thead><tr><th>Name</th><th>Email</th><th>School</th>${role==='student'?'<th>Grade</th>':role==='teacher'?'<th>Employee ID</th>':''}<th>Joined</th></tr></thead>
    <tbody>
      ${users.map(u => `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;"><div class="user-row-avatar">${initials(u.full_name)}</div><span>${u.full_name}</span></div></td>
        <td style="font-size:0.82rem;color:rgba(245,245,245,0.6);">${u.email}</td>
        <td style="font-size:0.82rem;color:var(--accent);">${u.school_name||'—'}</td>
        ${role==='student'?`<td>${u.grade||'—'}</td>`:role==='teacher'?`<td>${u.employee_id||'—'}</td>`:''}
        <td style="font-size:0.78rem;color:rgba(245,245,245,0.4);">${formatDate(u.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div>`;
}

async function renderAdminUsers(el, role) {
  const data = await API.get('/api/admin/users?role=' + role);
  const users = data.users || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.students} ${role.charAt(0).toUpperCase()+role.slice(1)}s (${users.length})</h2>
</div>
<div class="search-bar">
  ${Icons.search}
  <input type="text" placeholder="Search ${role}s..." oninput="filterAdminUsers(this.value)">
</div>
<div class="table-card" id="admin-users-table">
  <table>
    <thead><tr><th>Name</th><th>Email</th>${role==='student'?'<th>Grade</th>':role==='teacher'?'<th>Employee ID</th>':''}<th>Joined</th><th>Actions</th></tr></thead>
    <tbody>
      ${users.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">No ${role}s found</td></tr>`
        : users.map(u => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="user-row-avatar">${initials(u.full_name)}</div>
            <span>${u.full_name}</span>
          </div>
        </td>
        <td style="font-size:0.82rem;color:rgba(245,245,245,0.6);">${u.email}</td>
        ${role==='student'?`<td>${u.grade||'—'}</td>`:role==='teacher'?`<td>${u.employee_id||'—'}</td>`:''}
        <td style="font-size:0.78rem;color:rgba(245,245,245,0.4);">${formatDate(u.created_at)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteUser('${role}',${u.id},'${u.full_name}')">${Icons.trash}</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function filterAdminUsers(q) {
  document.querySelectorAll('#admin-users-table tbody tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(q.toLowerCase()) ? '' : 'none';
  });
}

async function deleteUser(role, id, name) {
  if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
  const res = await API.delete(`/api/admin/user/${role}/${id}`);
  if (res.success) { showToast('User deleted', 'success'); renderAdminUsers(document.getElementById('admin-content'), role); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderAdminPayments(el) {
  const data = await API.get('/api/admin/payments');
  const payments = data.payments || [];
  const stats = data.stats || {};

  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.payment} ${t('paymentManagement')}</h2>
  <button class="btn btn-primary" onclick="showAddPaymentModal()">${Icons.plus} Add Fee</button>
</div>
<div class="stats-grid" style="margin-bottom:24px;">
  <div class="stat-card"><div class="stat-value" style="color:#66BB6A;">${stats.collected||0} ETB</div><div class="stat-label">${t('totalCollected')}</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#FFA726;">${stats.pending||0} ETB</div><div class="stat-label">${t('totalPending')}</div></div>
</div>
<div class="table-card">
  <table>
    <thead><tr><th>Student</th><th>Parent</th><th>Fee Type</th><th>Amount</th><th>Status</th><th>Due Date</th><th>Actions</th></tr></thead>
    <tbody>
      ${payments.length === 0
        ? `<tr><td colspan="7" style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">No payments</td></tr>`
        : payments.map(p => `
      <tr>
        <td>${p.student_name||'—'}</td>
        <td>${p.parent_name||'—'}</td>
        <td>${p.fee_type}</td>
        <td style="font-weight:700;color:var(--accent);">${p.amount} ETB</td>
        <td><span class="badge ${p.status==='paid'?'badge-success':p.status==='overdue'?'badge-danger':'badge-warning'}">${p.status}</span></td>
        <td style="font-size:0.82rem;">${formatDate(p.due_date)||'—'}</td>
        <td>
          ${p.status!=='paid' ? `<button class="btn btn-success btn-sm" onclick="markPaymentPaid(${p.id})">Mark Paid</button>` : ''}
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

async function markPaymentPaid(id) {
  const res = await API.put('/api/admin/payment/' + id, { status: 'paid' });
  if (res.success) { showToast('Payment marked as paid', 'success'); renderAdminPayments(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

function showAddPaymentModal() {
  const students = [];
  openModal(`
<h3 class="modal-title">Add Fee / Payment</h3>
<form onsubmit="addAdminPayment(event)">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Student ID *</label>
      <input type="number" class="form-control form-control-dark" id="pay-student" placeholder="Student ID" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Parent ID *</label>
      <input type="number" class="form-control form-control-dark" id="pay-parent" placeholder="Parent ID" required>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Fee Type *</label>
      <select class="form-control form-control-dark" id="pay-type">
        ${['Tuition Fee','Activity Fee','Library Fee','Lab Fee','Exam Fee','Other'].map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Amount (ETB) *</label>
      <input type="number" class="form-control form-control-dark" id="pay-amount" placeholder="e.g. 5000" required>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Due Date</label>
    <input type="date" class="form-control form-control-dark" id="pay-due">
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Add Fee</button>
  </div>
</form>`);
}

async function addAdminPayment(e) {
  e.preventDefault();
  const res = await API.post('/api/admin/payment', {
    student_id: document.getElementById('pay-student').value,
    parent_id: document.getElementById('pay-parent').value,
    fee_type: document.getElementById('pay-type').value,
    amount: parseFloat(document.getElementById('pay-amount').value),
    due_date: document.getElementById('pay-due').value
  });
  if (res.success) { closeModal(); showToast('Fee added!', 'success'); renderAdminPayments(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderAdminSubjects(el) {
  const data = await API.get('/api/admin/subjects');
  const subjects = data.subjects || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.notes} ${t('subjectManagement')}</h2>
  <button class="btn btn-primary" onclick="showAdminAddSubjectModal()">${Icons.plus} ${t('addSubject')}</button>
</div>
<div class="table-card">
  <table>
    <thead><tr><th>Subject Name</th><th>Actions</th></tr></thead>
    <tbody>
      ${subjects.length === 0
        ? `<tr><td colspan="2" style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">${t('noSubjects')}</td></tr>`
        : subjects.map(s => `
      <tr>
        <td>${s.name}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteSubject(${s.id},'${s.name}')">${Icons.trash}</button></td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function showAdminAddSubjectModal() {
  openModal(`
<h3 class="modal-title">${t('addSubject')}</h3>
<form onsubmit="addAdminSubject(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Subject Name *</label>
    <input type="text" class="form-control form-control-dark" id="admin-subject-name" placeholder="e.g. Mathematics" required>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">${t('addSubject')}</button>
  </div>
</form>`);
}

async function addAdminSubject(e) {
  e.preventDefault();
  const res = await API.post('/api/admin/subjects', { name: document.getElementById('admin-subject-name').value });
  if (res.success) { closeModal(); showToast('Subject added!', 'success'); renderAdminSubjects(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function deleteSubject(id, name) {
  if (!confirm(`Delete subject "${name}"?`)) return;
  const res = await API.delete('/api/admin/subjects/' + id);
  if (res.success) { showToast('Subject deleted', 'success'); renderAdminSubjects(document.getElementById('admin-content')); }
}

async function renderAdminAnnouncements(el) {
  const data = await API.get('/api/admin/announcements');
  const announcements = data.announcements || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.bell} ${t('announcements')}</h2>
  <button class="btn btn-primary" onclick="showAdminAnnouncementModal()">${Icons.plus} New</button>
</div>
${announcements.length === 0
  ? `<div class="empty-state"><p>No announcements</p></div>`
  : announcements.map(a => `
<div class="announcement-item">
  <div class="announcement-header">
    <div>
      <div class="announcement-title">${a.title}</div>
      <div class="announcement-meta">By ${a.author_role} · ${formatDate(a.created_at)}</div>
    </div>
    <button class="btn btn-danger btn-sm" onclick="deleteAnnouncement(${a.id})">${Icons.trash}</button>
  </div>
  <div class="announcement-body">${a.content}</div>
</div>`).join('')}`;
}

function showAdminAnnouncementModal() {
  openModal(`
<h3 class="modal-title">New Announcement</h3>
<form onsubmit="postAdminAnnouncement(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="adm-ann-title" placeholder="Announcement title" required>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Content *</label>
    <textarea class="form-control form-control-dark" id="adm-ann-content" placeholder="Write your announcement..." required></textarea>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Target</label>
    <select class="form-control form-control-dark" id="adm-ann-target">
      <option value="all">Everyone</option>
      <option value="student">Students only</option>
      <option value="teacher">Teachers only</option>
      <option value="parent">Parents only</option>
    </select>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Post</button>
  </div>
</form>`);
}

async function postAdminAnnouncement(e) {
  e.preventDefault();
  const res = await API.post('/api/admin/announcement', {
    title: document.getElementById('adm-ann-title').value,
    content: document.getElementById('adm-ann-content').value,
    target_roles: document.getElementById('adm-ann-target').value
  });
  if (res.success) { closeModal(); showToast('Announcement posted!', 'success'); renderAdminAnnouncements(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  const res = await API.delete('/api/admin/announcement/' + id);
  if (res.success) { showToast('Deleted', 'success'); renderAdminAnnouncements(document.getElementById('admin-content')); }
}

async function renderAdminEvents(el) {
  const data = await API.get('/api/admin/events');
  const events = data.events || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.attendance} Events</h2>
  <button class="btn btn-primary" onclick="showAdminEventModal()">${Icons.plus} Add Event</button>
</div>
${events.length === 0
  ? `<div class="empty-state"><p>No events</p></div>`
  : events.map(e => `
<div class="card-dark" style="margin-bottom:12px;">
  <div style="display:flex;justify-content:space-between;">
    <div>
      <h4 style="color:var(--accent);">${e.title}</h4>
      <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);">${e.description||''}</p>
    </div>
    <div style="text-align:right;">
      <div style="font-weight:700;">${formatDate(e.event_date)}</div>
      <span class="badge badge-accent">${e.event_type||'general'}</span>
    </div>
  </div>
</div>`).join('')}`;
}

function showAdminEventModal() {
  openModal(`
<h3 class="modal-title">Add Event</h3>
<form onsubmit="addAdminEvent(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="adm-evt-title" placeholder="e.g. Annual Sports Day" required>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Date</label>
      <input type="date" class="form-control form-control-dark" id="adm-evt-date">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Type</label>
      <select class="form-control form-control-dark" id="adm-evt-type">
        ${['exam','sports','meeting','holiday','general'].map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Description</label>
    <textarea class="form-control form-control-dark" id="adm-evt-desc" placeholder="Event details..."></textarea>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Add Event</button>
  </div>
</form>`);
}

async function addAdminEvent(e) {
  e.preventDefault();
  const res = await API.post('/api/admin/event', {
    title: document.getElementById('adm-evt-title').value,
    event_date: document.getElementById('adm-evt-date').value,
    event_type: document.getElementById('adm-evt-type').value,
    description: document.getElementById('adm-evt-desc').value
  });
  if (res.success) { closeModal(); showToast('Event added!', 'success'); renderAdminEvents(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderAdminVideos(el) {
  const data = await API.get('/api/admin/videos');
  const videos = data.videos || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.videos} ${t('videos')}</h2>
<div class="table-card">
  <table>
    <thead><tr><th>Title</th><th>Uploader</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
    <tbody>
      ${videos.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">No videos</td></tr>`
        : videos.map(v => `
      <tr>
        <td>${v.title}</td>
        <td>${v.uploader_name||'—'}</td>
        <td><span class="badge ${v.approved?'badge-success':'badge-warning'}">${v.approved?'Published':'Pending'}</span></td>
        <td style="font-size:0.78rem;">${formatDate(v.created_at)}</td>
        <td style="display:flex;gap:6px;">
          ${!v.approved ? `<button class="btn btn-success btn-sm" onclick="approveVideo(${v.id})">Approve</button>` : ''}
          <button class="btn btn-danger btn-sm" onclick="deleteVideo(${v.id})">${Icons.trash}</button>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

async function approveVideo(id) {
  const res = await API.post('/api/admin/videos/' + id + '/approve', {});
  if (res.success) { showToast('Video approved!', 'success'); renderAdminVideos(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  const res = await API.post('/api/admin/videos/' + id + '/reject', {});
  if (res.success) { showToast('Video deleted', 'success'); renderAdminVideos(document.getElementById('admin-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderAdminLeaderboard(el) {
  const data = await API.get('/api/admin/leaderboard');
  const board = data.leaderboard || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.leaderboard} ${t('leaderboard')}</h2>
<div class="table-card">
  <table>
    <thead><tr><th>Rank</th><th>Student</th><th>Grade</th><th>Points</th><th>Streak</th></tr></thead>
    <tbody>
      ${board.map((s,i) => `
      <tr>
        <td><span class="leaderboard-rank ${i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-other'}">${i+1}</span></td>
        <td>${s.full_name}</td>
        <td>${s.grade||'—'}</td>
        <td style="font-weight:700;color:var(--accent);">${s.points}</td>
        <td>${s.streak||0} 🔥</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}
