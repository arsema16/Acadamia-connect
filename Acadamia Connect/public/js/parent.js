// ===== PARENT PORTAL =====
let parentData = {};
let parentActiveTab = 'dashboard';
let selectedChildId = null;

async function renderParentPortal() {
  const page = document.getElementById('page-parent');
  const data = await API.get('/api/parent/dashboard');
  if (!data.success) { showToast('Session expired', 'error'); showPage('auth','login'); return; }
  parentData = data;
  const u = data.parent;
  const children = data.children || [];
  if (!selectedChildId && children.length > 0) selectedChildId = children[0].id;

  page.innerHTML = `
<div class="portal-layout">
  <div class="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="parent-sidebar">
    <div class="sidebar-logo"><h2>Academia Connect</h2><p>${t('portalParent')}</p></div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Main</div>
      ${pNavItem('dashboard','home',t('dashboard'))}
      ${pNavItem('progress','results',"Child's Progress")}
      ${pNavItem('attendance','attendance',t('attendance'))}
      ${pNavItem('payments','payment',t('payment'))}
      <div class="nav-section-title">Communication</div>
      ${pNavItem('chat','messages',t('messages'))}
      ${pNavItem('groups','students','Parent Groups')}
      ${pNavItem('videos','videos',t('videos'))}
      ${pNavItem('announcements','bell',t('announcements'))}
      ${pNavItem('events','attendance','Events')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials(u.full_name)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${u.full_name}</div>
          <div class="sidebar-user-role">${u.parental_status || 'Parent'}</div>
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
      <button class="hamburger" onclick="openSidebar('parent-sidebar')">${Icons.menu}</button>
      <span class="topbar-title" id="parent-page-title">${t('dashboard')}</span>
      <div class="topbar-actions">
        <div class="lang-toggle">
          <button class="lang-btn ${currentLang==='en'?'active':''}" data-lang="en" onclick="setLang('en');renderParentPortal()">EN</button>
          <button class="lang-btn ${currentLang==='am'?'active':''}" data-lang="am" onclick="setLang('am');renderParentPortal()">አማ</button>
        </div>
        <div class="notif-btn" onclick="toggleNotifPanel()">
          ${Icons.bell}
          ${(data.notifications||[]).filter(n=>!n.read_status).length > 0 ? `<span class="notif-badge">${data.notifications.filter(n=>!n.read_status).length}</span>` : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="handleLogout()" title="${t('logout')}" style="padding:6px 10px;">${Icons.logout}</button>
      </div>
    </div>
    <div id="parent-content"></div>
  </main>
  <div class="notif-panel" id="notif-panel">
    <div class="notif-panel-header">
      <span style="font-weight:700;color:var(--accent);">${t('notifications')}</span>
      <button onclick="markAllRead();toggleNotifPanel()" class="btn btn-sm btn-secondary">${t('markAllRead')}</button>
    </div>
    <div class="notif-list">${renderNotifList(data.notifications||[])}</div>
  </div>
</div>`;

  switchParentTab(parentActiveTab);
}

function pNavItem(tab, icon, label) {
  return `<div class="nav-item ${parentActiveTab===tab?'active':''}" onclick="switchParentTab('${tab}')">${Icons[icon]||''} ${label}</div>`;
}

function switchParentTab(tab) {
  parentActiveTab = tab;
  document.querySelectorAll('#parent-sidebar .nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${tab}'`));
  });
  const title = document.getElementById('parent-page-title');
  if (title) title.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  const content = document.getElementById('parent-content');
  if (!content) return;
  switch(tab) {
    case 'dashboard':     renderParentDashboard(content); break;
    case 'progress':      renderParentProgress(content); break;
    case 'attendance':    renderParentAttendance(content); break;
    case 'payments':      renderParentPayments(content); break;
    case 'chat':          renderParentChat(content); break;
    case 'groups':        renderParentGroups(content); break;
    case 'videos':        renderParentVideos(content); break;
    case 'announcements': renderParentAnnouncements(content); break;
    case 'events':        renderParentEvents(content); break;
    default: renderParentDashboard(content);
  }
}

function renderChildSelector() {
  const children = parentData.children || [];
  if (children.length <= 1) return '';
  return `
<div class="child-selector">
  ${children.map(c => `
  <div class="child-tab ${selectedChildId===c.id?'active':''}" onclick="selectedChildId=${c.id};switchParentTab(parentActiveTab)">
    <div class="child-tab-avatar">${initials(c.full_name)}</div>
    ${c.full_name.split(' ')[0]}
  </div>`).join('')}
</div>`;
}

function renderParentDashboard(el) {
  const children = parentData.children || [];
  const notifications = parentData.notifications || [];
  const announcements = parentData.announcements || [];
  const payments = parentData.payments || [];
  const child = children.find(c => c.id === selectedChildId) || children[0];

  el.innerHTML = `
<div class="welcome-banner">
  <div class="welcome-text">
    <h2>${t('welcome')}, ${parentData.parent.full_name.split(' ')[0]}!</h2>
    <p>${parentData.parent.parental_status || 'Parent'} · ${children.length} ${children.length===1?'child':'children'} registered</p>
    <p class="welcome-quote">"${getMotivationalQuote()}"</p>
  </div>
</div>

${renderChildSelector()}

${children.length === 0 ? `
<div style="background:rgba(196,154,108,0.12);border:1px solid var(--accent);border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
  <div style="font-size:2rem;margin-bottom:8px;">👶</div>
  <h3 style="color:var(--accent);margin-bottom:8px;">No children linked yet</h3>
  <p style="color:rgba(245,245,245,0.7);font-size:0.9rem;">To see your child's progress, ask them to register on Academia Connect using your phone number (<strong>${parentData.parent.phone}</strong>) as their parent contact. Once they register, they'll appear here automatically.</p>
</div>` : ''}

${child ? `
<div class="stats-grid" style="margin-bottom:24px;">
  <div class="stat-card">
    <div class="stat-value">${getAvatarEmoji(child.avatar)}</div>
    <div class="stat-label">${child.full_name}</div>
  </div>
  <div class="stat-card"><div class="stat-value">${child.grade||'—'}</div><div class="stat-label">Grade</div></div>
  <div class="stat-card"><div class="stat-value">${child.points||0}</div><div class="stat-label">${t('points')}</div></div>
  <div class="stat-card"><div class="stat-value">${child.streak||0}🔥</div><div class="stat-label">${t('streak')}</div></div>
</div>` : ''}

<div class="grid-2">
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.bell} Recent Notifications</h3>
    ${notifications.length === 0
      ? `<div class="empty-state"><p>No notifications</p></div>`
      : notifications.slice(0,5).map(n => `
    <div class="notif-item ${!n.read_status?'unread':''}">
      <div class="notif-item-title">${n.title}</div>
      <div class="notif-item-body">${n.body}</div>
      <div class="notif-item-time">${timeAgo(n.created_at)}</div>
    </div>`).join('')}
  </div>
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.payment} Payments</h3>
    ${payments.length === 0
      ? `<div class="empty-state"><p>No payment records</p></div>`
      : payments.slice(0,3).map(p => `
    <div class="payment-card">
      <div class="payment-header">
        <div>
          <div style="font-weight:700;">${p.fee_type}</div>
          <div style="font-size:0.78rem;color:rgba(245,245,245,0.5);">${formatDate(p.due_date)||'—'}</div>
        </div>
        <div class="payment-amount">${p.amount} ETB</div>
      </div>
      <span class="badge ${p.status==='paid'?'badge-success':p.status==='overdue'?'badge-danger':'badge-warning'}">${p.status}</span>
    </div>`).join('')}
    <button class="btn btn-secondary btn-sm w-full" style="margin-top:8px;" onclick="switchParentTab('payments')">${t('viewAll')}</button>
  </div>
</div>

<div style="margin-top:24px;">
  <h3 class="text-accent" style="margin-bottom:12px;">${Icons.bell} Announcements</h3>
  ${announcements.slice(0,3).map(a => `
  <div class="announcement-item">
    <div class="announcement-title">${a.title}</div>
    <div class="announcement-body">${a.content}</div>
    <div class="announcement-meta">${formatDate(a.created_at)}</div>
  </div>`).join('') || `<div class="empty-state"><p>No announcements</p></div>`}
</div>`;
}

async function renderParentProgress(el) {
  if (!selectedChildId) { el.innerHTML = `<div class="empty-state"><p>No child selected</p></div>`; return; }
  const data = await API.get('/api/parent/child/' + selectedChildId);
  if (!data.success) { el.innerHTML = `<div class="empty-state"><p>Could not load data</p></div>`; return; }
  const { student, results, tasks, badges } = data;
  const bySubject = {};
  results.forEach(r => { if (!bySubject[r.subject]) bySubject[r.subject] = []; bySubject[r.subject].push(r); });

  el.innerHTML = `
${renderChildSelector()}
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.results} ${student.full_name}'s Progress</h2>
<div class="stats-grid" style="margin-bottom:24px;">
  <div class="stat-card"><div class="stat-value">${results.length}</div><div class="stat-label">Assessments</div></div>
  <div class="stat-card"><div class="stat-value">${tasks.filter(t=>t.completed).length}/${tasks.length}</div><div class="stat-label">Tasks Done</div></div>
  <div class="stat-card"><div class="stat-value">${student.points||0}</div><div class="stat-label">${t('points')}</div></div>
  <div class="stat-card"><div class="stat-value">${badges.length}</div><div class="stat-label">${t('badges')}</div></div>
</div>

${Object.keys(bySubject).length > 0 ? `
<h3 class="text-accent" style="margin-bottom:12px;">Academic Results</h3>
${Object.entries(bySubject).map(([subject, recs]) => {
  const avg = Math.round(recs.reduce((s,r) => s+(r.percentage||0),0)/recs.length);
  return `
<div style="margin-bottom:20px;">
  <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
    <h4 style="color:var(--accent);">${subject}</h4>
    <span class="badge badge-accent">Avg: ${avg}%</span>
  </div>
  <div class="table-card">
    <table>
      <thead><tr><th>Assessment</th><th>Date</th><th>Marks</th><th>Grade</th><th>Teacher</th><th>Feedback</th></tr></thead>
      <tbody>
        ${recs.map(r => `
        <tr>
          <td>${r.assessment_type}</td>
          <td>${formatDate(r.date)}</td>
          <td>${r.marks_obtained}/${r.max_marks} (${r.percentage}%)</td>
          <td><span class="result-grade ${gradeColor(r.grade)}" style="width:28px;height:28px;font-size:0.75rem;display:inline-flex;align-items:center;justify-content:center;">${r.grade}</span></td>
          <td>${r.teacher_name||'—'}</td>
          <td style="font-size:0.78rem;font-style:italic;color:rgba(245,245,245,0.6);">${r.comments||'—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
}).join('')}` : `<div class="empty-state"><p>No results yet</p></div>`}

${badges.length > 0 ? `
<h3 class="text-accent" style="margin-bottom:12px;margin-top:24px;">${Icons.award} Badges Earned</h3>
<div class="badge-grid">
  ${badges.map(b => `
  <div class="badge-item">
    <div class="badge-icon">${getBadgeEmoji(b.badge_type)}</div>
    <div class="badge-name">${b.badge_name}</div>
  </div>`).join('')}
</div>` : ''}`;
}

async function renderParentAttendance(el) {
  if (!selectedChildId) { el.innerHTML = `<div class="empty-state"><p>No child selected</p></div>`; return; }
  const data = await API.get('/api/parent/child/' + selectedChildId);
  const records = data.attendance || [];
  const present = records.filter(r=>r.status==='Present').length;
  const absent  = records.filter(r=>r.status==='Absent').length;
  const late    = records.filter(r=>r.status==='Late').length;
  const total   = records.length;
  const pct     = total > 0 ? Math.round((present/total)*100) : 0;

  el.innerHTML = `
${renderChildSelector()}
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.attendance} Attendance</h2>
<div class="stats-grid" style="margin-bottom:20px;">
  <div class="stat-card"><div class="stat-value" style="color:#66BB6A;">${present}</div><div class="stat-label">Present</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#EF5350;">${absent}</div><div class="stat-label">Absent</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#FFA726;">${late}</div><div class="stat-label">Late</div></div>
  <div class="stat-card"><div class="stat-value">${pct}%</div><div class="stat-label">Rate</div></div>
</div>
<div class="progress-bar" style="margin-bottom:24px;height:12px;">
  <div class="progress-fill" style="width:${pct}%;background:${pct>=80?'#66BB6A':pct>=60?'#FFA726':'#EF5350'};"></div>
</div>
<div class="table-card">
  <table>
    <thead><tr><th>Date</th><th>Status</th><th>Notes</th></tr></thead>
    <tbody>
      ${records.length === 0
        ? `<tr><td colspan="3" style="text-align:center;color:rgba(245,245,245,0.4);">No records</td></tr>`
        : records.map(r => `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td><span class="badge ${r.status==='Present'?'badge-success':r.status==='Absent'?'badge-danger':r.status==='Late'?'badge-warning':'badge-info'}">${r.status}</span></td>
        <td style="font-size:0.82rem;color:rgba(245,245,245,0.5);">${r.notes||'—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

async function renderParentPayments(el) {
  const data = await API.get('/api/parent/payments');
  const payments = data.payments || [];
  const paid    = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
  const pending = payments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0);

  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.payment} ${t('payment')}</h2>
  <div style="display:flex;gap:8px;align-items:center;">
    <label style="font-size:0.82rem;color:rgba(245,245,245,0.6);">${t('enableReminders')}</label>
    <input type="checkbox" ${parentData.parent.payment_reminders?'checked':''} onchange="togglePaymentReminders(this.checked)" style="accent-color:var(--accent);width:16px;height:16px;">
  </div>
</div>
<div class="stats-grid" style="margin-bottom:24px;">
  <div class="stat-card"><div class="stat-value" style="color:#66BB6A;">${paid} ETB</div><div class="stat-label">${t('totalCollected')}</div></div>
  <div class="stat-card"><div class="stat-value" style="color:#FFA726;">${pending} ETB</div><div class="stat-label">${t('totalPending')}</div></div>
</div>
${payments.length === 0
  ? `<div class="empty-state"><p>No payment records</p></div>`
  : payments.map(p => `
<div class="payment-card">
  <div class="payment-header">
    <div>
      <div style="font-weight:700;">${p.fee_type}</div>
      <div style="font-size:0.78rem;color:rgba(245,245,245,0.5);">Student: ${p.student_name||'—'} · Due: ${formatDate(p.due_date)||'—'}</div>
      ${p.receipt_no ? `<div style="font-size:0.72rem;color:rgba(245,245,245,0.35);">Receipt: ${p.receipt_no}</div>` : ''}
    </div>
    <div class="payment-amount">${p.amount} ETB</div>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <span class="badge ${p.status==='paid'?'badge-success':p.status==='overdue'?'badge-danger':'badge-warning'}">${p.status}</span>
    ${p.status==='pending' ? `<button class="btn btn-primary btn-sm" onclick="makePayment(${p.id},${p.student_id},${p.amount},'${p.fee_type}')">${t('payNow')}</button>` : ''}
  </div>
</div>`).join('')}`;
}

async function makePayment(paymentId, studentId, amount, feeType) {
  openModal(`
<h3 class="modal-title">Confirm Payment</h3>
<div style="text-align:center;padding:20px;">
  <div style="font-size:2rem;margin-bottom:12px;">💳</div>
  <p style="font-size:1.1rem;color:var(--accent);font-weight:700;">${amount} ETB</p>
  <p style="color:rgba(245,245,245,0.7);margin:8px 0;">${feeType}</p>
  <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);">This will mark the payment as paid and generate a receipt.</p>
</div>
<div class="modal-actions">
  <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
  <button class="btn btn-primary" onclick="confirmPayment(${studentId},${amount},'${feeType}')">Confirm Payment</button>
</div>`);
}

async function confirmPayment(studentId, amount, feeType) {
  const res = await API.post('/api/parent/payment', { student_id: studentId, amount, fee_type: feeType });
  if (res.success) {
    closeModal();
    showToast(`Payment confirmed! Receipt: ${res.receipt_no}`, 'success');
    renderParentPayments(document.getElementById('parent-content'));
  } else showToast(res.message || 'Payment failed', 'error');
}

async function togglePaymentReminders(enabled) {
  await API.put('/api/parent/payment-reminders', { enabled });
  showToast(enabled ? 'Payment reminders enabled' : 'Payment reminders disabled', 'info');
}

async function renderParentChat(el) {
  const data = await API.get('/api/parent/teachers');
  const teachers = data.teachers || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:16px;">${Icons.messages} ${t('messages')}</h2>
<div class="chat-layout">
  <div class="chat-sidebar">
    <div class="chat-sidebar-header">Teachers</div>
    <div class="chat-list">
      ${teachers.length === 0
        ? `<div style="padding:20px;text-align:center;color:rgba(245,245,245,0.4);font-size:0.85rem;">No teachers found</div>`
        : teachers.map(t => `
      <div class="chat-list-item" onclick="openParentChat(${t.id},'${t.full_name}')">
        <div class="chat-list-avatar">${initials(t.full_name)}</div>
        <div class="chat-list-info">
          <div class="chat-list-name">${t.full_name}</div>
          <div class="chat-list-preview">${JSON.parse(t.subjects||'[]').slice(0,2).join(', ')||'Teacher'}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="chat-main" id="parent-chat-main">
    <div class="chat-empty">${Icons.messages}<p>Select a teacher to start chatting</p></div>
  </div>
</div>`;
}

async function openParentChat(teacherId, teacherName) {
  const main = document.getElementById('parent-chat-main');
  if (!main) return;
  main.innerHTML = `
<div class="chat-header">
  <div class="chat-header-avatar">${initials(teacherName)}</div>
  <div><div class="chat-header-name">${teacherName}</div><div class="chat-header-status">Teacher</div></div>
</div>
<div class="chat-messages" id="pchat-msgs-${teacherId}">
  <div style="text-align:center;color:rgba(245,245,245,0.3);padding:20px;">Loading...</div>
</div>
<div class="chat-input-area">
  <div class="chat-input-wrap">
    <textarea class="chat-input" id="pchat-input-${teacherId}" placeholder="${t('typeMessage')}" rows="1"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendParentMsg(${teacherId},'teacher')}"></textarea>
  </div>
  <button class="chat-send-btn" onclick="sendParentMsg(${teacherId},'teacher')">${Icons.send}</button>
</div>`;
  const data = await API.get(`/api/parent/messages?with_id=${teacherId}&with_role=teacher`);
  const msgs = data.messages || [];
  const container = document.getElementById('pchat-msgs-' + teacherId);
  if (!container) return;
  container.innerHTML = msgs.length === 0
    ? `<div class="chat-empty"><p>${t('noMessages')}</p></div>`
    : msgs.map(m => `
  <div class="chat-msg ${m.sender_role==='parent'?'sent':'received'}">
    <div class="chat-msg-avatar">${initials(m.sender_name||'?')}</div>
    <div><div class="chat-msg-bubble">${m.content}</div><div class="chat-msg-time">${timeAgo(m.created_at)}</div></div>
  </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendParentMsg(receiverId, receiverRole) {
  const input = document.getElementById('pchat-input-' + receiverId);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  await API.post('/api/parent/messages', { receiver_id: receiverId, receiver_role: receiverRole, content });
  openParentChat(receiverId, '');
}

async function renderParentGroups(el) {
  const children = parentData.children || [];
  const grades = [...new Set(children.map(c => c.grade).filter(Boolean))];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:16px;">${Icons.students} ${t('parentGroup')}</h2>
<div class="group-selector" id="grade-group-selector">
  ${grades.map(g => `<button class="group-btn" onclick="openParentGroup('${g}',this)">${g} Parents</button>`).join('')}
  ${grades.length === 0 ? `<p style="color:rgba(245,245,245,0.4);">No grade groups available</p>` : ''}
</div>
<div id="group-chat-area">
  <div class="empty-state"><p>Select a grade group to join the conversation</p></div>
</div>`;
}

async function openParentGroup(grade, btn) {
  document.querySelectorAll('.group-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const data = await API.get('/api/parent/group-messages/' + encodeURIComponent(grade));
  const msgs = data.messages || [];
  const el = document.getElementById('group-chat-area');
  el.innerHTML = `
<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;overflow:hidden;height:400px;display:flex;flex-direction:column;">
  <div style="padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;color:var(--accent);">${grade} Parents Group</div>
  <div style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;" id="group-msgs">
    ${msgs.length === 0
      ? `<div class="chat-empty"><p>No messages yet. Start the conversation!</p></div>`
      : msgs.map(m => `
    <div class="chat-msg ${m.sender_id===AppState.user?.id?'sent':'received'}">
      <div class="chat-msg-avatar">${initials(m.sender_name||'?')}</div>
      <div>
        <div style="font-size:0.72rem;color:rgba(245,245,245,0.4);margin-bottom:2px;">${m.sender_name||'Parent'}</div>
        <div class="chat-msg-bubble">${m.content}</div>
        <div class="chat-msg-time">${timeAgo(m.created_at)}</div>
      </div>
    </div>`).join('')}
  </div>
  <div class="chat-input-area">
    <div class="chat-input-wrap">
      <textarea class="chat-input" id="group-input" placeholder="Message the group..." rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendGroupMsg('${grade}')}"></textarea>
    </div>
    <button class="chat-send-btn" onclick="sendGroupMsg('${grade}')">${Icons.send}</button>
  </div>
</div>`;
  const msgs_el = document.getElementById('group-msgs');
  if (msgs_el) msgs_el.scrollTop = msgs_el.scrollHeight;
}

async function sendGroupMsg(grade) {
  const input = document.getElementById('group-input');
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  await API.post('/api/parent/group-messages/' + encodeURIComponent(grade), { content });
  openParentGroup(grade, document.querySelector('.group-btn.active') || document.createElement('button'));
}

async function renderParentVideos(el) {
  const data = await API.get('/api/parent/videos');
  const videos = data.videos || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.videos} ${t('videos')}</h2>
<div class="video-feed">
  ${videos.length === 0
    ? `<div class="empty-state"><p>No videos yet</p></div>`
    : videos.map(v => `
  <div class="video-card">
    <div class="video-thumb">
      ${v.file_url ? `<video controls src="${v.file_url}" style="width:100%;height:100%;object-fit:cover;"></video>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:rgba(255,255,255,0.3);font-size:3rem;">▶</div>`}
    </div>
    <div class="video-info">
      <div class="video-title">${v.title}</div>
      <div class="video-meta">
        <span class="video-author">${v.uploader_name||'Teacher'} · ${timeAgo(v.created_at)}</span>
      </div>
    </div>
  </div>`).join('')}
</div>`;
}

async function renderParentAnnouncements(el) {
  const data = await API.get('/api/common/announcements');
  const announcements = data.announcements || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.bell} ${t('announcements')}</h2>
${announcements.length === 0
  ? `<div class="empty-state"><p>No announcements</p></div>`
  : announcements.map(a => `
<div class="announcement-item">
  <div class="announcement-title">${a.title}</div>
  <div class="announcement-body">${a.content}</div>
  <div class="announcement-meta">By ${a.author_role} · ${formatDate(a.created_at)}</div>
</div>`).join('')}`;
}

async function renderParentEvents(el) {
  const data = await API.get('/api/parent/events');
  const events = data.events || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.attendance} Events</h2>
${events.length === 0
  ? `<div class="empty-state"><p>No upcoming events</p></div>`
  : events.map(e => `
<div class="card-dark" style="margin-bottom:12px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h4 style="color:var(--accent);">${e.title}</h4>
      <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);margin-top:4px;">${e.description||''}</p>
    </div>
    <div style="text-align:right;">
      <div style="font-size:0.88rem;font-weight:700;">${formatDate(e.event_date)}</div>
      <span class="badge badge-accent" style="font-size:0.7rem;">${e.event_type||'general'}</span>
    </div>
  </div>
</div>`).join('')}`;
}
