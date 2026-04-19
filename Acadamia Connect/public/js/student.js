

// ===== STUDENT PORTAL =====
let studentData = {};
let studentActiveTab = 'dashboard';
let pomodoroInterval = null;
let pomodoroSeconds = 25 * 60;
let pomodoroMode = 'study';
let pomodoroRunning = false;

async function renderStudentPortal() {
  const page = document.getElementById('page-student');
  const data = await API.get('/api/student/dashboard');
  if (!data.success) { showToast('Session expired. Please log in.', 'error'); showPage('auth','login'); return; }
  studentData = data;
  const u = data.student;

  page.innerHTML = `
<div class="portal-layout">
  <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="student-sidebar">
    <div class="sidebar-logo">
      <h2>Academia Connect</h2>
      <p>${t('portalStudent')}</p>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Main</div>
      ${navItem('dashboard','home',t('dashboard'))}
      ${navItem('tasks','tasks',t('tasks'))}
      ${navItem('results','results',t('results'))}
      ${navItem('attendance','attendance',t('attendance'))}
      ${navItem('notes','notes',t('notes'))}
      <div class="nav-section-title">Learn</div>
      ${navItem('videos','videos',t('videos'))}
      ${navItem('challenges','challenges',t('challenges'))}
      ${navItem('quizzes','quiz',t('quiz'))}
      ${navItem('movies','film',t('movies'))}
      <div class="nav-section-title">Social</div>
      ${navItem('chat','messages',t('messages'))}
      ${navItem('leaderboard','leaderboard',t('leaderboard'))}
      ${navItem('games','games',t('games'))}
      ${navItem('portfolio','portfolio',t('portfolio'))}
      <div class="nav-section-title">Tools</div>
      ${navItem('timer','timer',t('studyTimer'))}
      ${navItem('analytics','analytics',t('analytics'))}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${getAvatarEmoji(u.avatar)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${u.nickname || u.full_name.split(' ')[0]}</div>
          <div class="sidebar-user-role">${u.grade || 'Student'}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="showPage('landing')">${Icons.home} ${t('home')}</button>
        <button class="btn btn-danger btn-sm" style="flex:1;" onclick="handleLogout()">${Icons.logout} ${t('logout')}</button>
      </div>
    </div>
  </aside>
  <main class="main-content" id="student-main">
    <div class="topbar">
      <button class="hamburger" onclick="openSidebar('student-sidebar')">${Icons.menu}</button>
      <span class="topbar-title" id="student-page-title">${t('dashboard')}</span>
      <div class="topbar-actions">
        <div class="lang-toggle">
          <button class="lang-btn ${currentLang==='en'?'active':''}" data-lang="en" onclick="setLang('en');renderStudentPortal()">EN</button>
          <button class="lang-btn ${currentLang==='am'?'active':''}" data-lang="am" onclick="setLang('am');renderStudentPortal()">አማ</button>
        </div>
        <button class="focus-mode-btn" id="focus-mode-btn" onclick="toggleFocusMode()" title="Focus Mode">🎯</button>
        <div class="notif-btn" id="notif-btn-wrap" onclick="toggleNotifPanel()">
          ${Icons.bell}
          ${data.notifications.filter(n=>!n.read_status).length > 0 ? `<span class="notif-badge">${data.notifications.filter(n=>!n.read_status).length}</span>` : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="handleLogout()" title="${t('logout')}" style="padding:6px 10px;">${Icons.logout}</button>
      </div>
    </div>
    <div id="student-content"></div>
  </main>
  <div class="notif-panel" id="notif-panel">
    <div class="notif-panel-header">
      <span style="font-weight:700;color:var(--accent);">${t('notifications')}</span>
      <button onclick="markAllRead();toggleNotifPanel()" class="btn btn-sm btn-secondary">${t('markAllRead')}</button>
    </div>
    <div class="notif-list" id="notif-list">
      ${renderNotifList(data.notifications)}
    </div>
  </div>
</div>`;

  switchStudentTab(studentActiveTab);
}

function navItem(tab, icon, label) {
  return `<div class="nav-item ${studentActiveTab===tab?'active':''}" onclick="switchStudentTab('${tab}')">${Icons[icon]||''} ${label}</div>`;
}

function switchStudentTab(tab) {
  studentActiveTab = tab;
  document.querySelectorAll('#student-sidebar .nav-item').forEach(el => {
    el.classList.toggle('active', el.textContent.trim().toLowerCase().includes(tab.toLowerCase()) || el.getAttribute('onclick')?.includes(`'${tab}'`));
  });
  const title = document.getElementById('student-page-title');
  if (title) title.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  const content = document.getElementById('student-content');
  if (!content) return;
  switch(tab) {
    case 'dashboard': renderStudentDashboard(content); break;
    case 'tasks': renderStudentTasks(content); break;
    case 'results': renderStudentResults(content); break;
    case 'attendance': renderStudentAttendance(content); break;
    case 'notes': renderStudentNotes(content); break;
    case 'videos': renderStudentVideos(content); break;
    case 'challenges': renderStudentChallenges(content); break;
    case 'quizzes': renderStudentQuizzes(content); break;
    case 'movies': renderStudentMovies(content); break;
    case 'chat': renderStudentChat(content); break;
    case 'leaderboard': renderStudentLeaderboard(content); break;
    case 'games': renderStudentGames(content); break;
    case 'portfolio': renderStudentPortfolio(content); break;
    case 'timer': renderStudentTimer(content); break;
    case 'analytics': renderStudentAnalytics(content); break;
    default: renderStudentDashboard(content);
  }
}

function renderStudentDashboard(el) {
  const u = studentData.student;
  const tasks = studentData.tasks || [];
  const announcements = studentData.announcements || [];
  const badges = studentData.badges || [];
  const rewardActive = u.reward_expires && new Date(u.reward_expires) > new Date();
  const minsLeft = rewardActive ? Math.round((new Date(u.reward_expires) - new Date()) / 60000) : 0;

  el.innerHTML = `
<div class="welcome-banner">
  <div class="welcome-text">
    <h2>${t('welcome')}, ${u.nickname || u.full_name.split(' ')[0]}! ${getAvatarEmoji(u.avatar)}</h2>
    <p>${u.grade} ${u.section ? '— Section ' + u.section : ''} &nbsp;|&nbsp; ${u.school_id ? 'Academia Connect' : ''}</p>
    <p class="welcome-quote">"${getMotivationalQuote()}"</p>
    ${u.streak > 0 ? `<div class="streak-badge" style="margin-top:8px;">${Icons.flame} ${u.streak} ${t('days')} ${t('studyStreak')}</div>` : ''}
  </div>
  <div class="welcome-stats">
    <div class="welcome-stat"><div class="welcome-stat-val">${u.points||0}</div><div class="welcome-stat-lbl">${t('points')}</div></div>
    <div class="welcome-stat"><div class="welcome-stat-val">${badges.length}</div><div class="welcome-stat-lbl">${t('badges')}</div></div>
    <div class="welcome-stat"><div class="welcome-stat-val">${tasks.filter(t=>!t.completed).length}</div><div class="welcome-stat-lbl">Pending</div></div>
  </div>
</div>

${rewardActive ? `
<div class="reward-timer">
  <h3>${Icons.unlock} ${t('rewardUnlocked')}</h3>
  <div class="reward-time-left">${minsLeft} min left</div>
  <p style="font-size:0.82rem;color:rgba(245,245,245,0.6);margin-top:6px;">Games and movies are unlocked!</p>
  <div style="display:flex;gap:10px;justify-content:center;margin-top:12px;">
    <button class="btn btn-primary btn-sm" onclick="switchStudentTab('games')">${Icons.games||'🎮'} ${t('playGame')}</button>
    <button class="btn btn-secondary btn-sm" onclick="switchStudentTab('movies')">${Icons.film} ${t('watchMovie')}</button>
  </div>
</div>` : ''}

<div class="grid-2" style="margin-bottom:24px;">
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <h3 class="text-accent">${Icons.tasks} ${t('tasks')}</h3>
      <button class="btn btn-primary btn-sm" onclick="showAddTaskModal()">${Icons.plus} ${t('addTask')}</button>
    </div>
    ${tasks.length === 0 ? `<div class="empty-state"><p>No tasks yet. Add your first task!</p></div>` :
      tasks.slice(0,4).map(task => renderTaskItem(task)).join('')}
    ${tasks.length > 4 ? `<button class="btn btn-secondary btn-sm w-full" onclick="switchStudentTab('tasks')">${t('viewAll')}</button>` : ''}
  </div>
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.bell} ${t('announcements')}</h3>
    ${announcements.length === 0 ? `<div class="empty-state"><p>No announcements</p></div>` :
      announcements.slice(0,3).map(a => `
      <div class="announcement-item">
        <div class="announcement-title">${a.title}</div>
        <div class="announcement-body">${a.content}</div>
        <div class="announcement-meta">${formatDate(a.created_at)}</div>
      </div>`).join('')}
  </div>
</div>

${badges.length > 0 ? `
<div style="margin-bottom:24px;">
  <h3 class="text-accent" style="margin-bottom:12px;">${Icons.award} ${t('badges')}</h3>
  <div class="badge-grid">
    ${badges.map(b => `
    <div class="badge-item">
      <div class="badge-icon">${getBadgeEmoji(b.badge_type)}</div>
      <div class="badge-name">${b.badge_name}</div>
    </div>`).join('')}
  </div>
</div>` : ''}

<div>
  <h3 class="text-accent" style="margin-bottom:12px;">${Icons.results} Recent Results</h3>
  ${(studentData.assessments||[]).length === 0 ? `<div class="empty-state"><p>No results yet</p></div>` :
    (studentData.assessments||[]).slice(0,3).map(a => `
    <div class="result-card">
      <div class="result-header">
        <div>
          <div class="result-subject">${a.subject} — ${a.assessment_type}</div>
          <div style="font-size:0.78rem;color:rgba(245,245,245,0.5);">${formatDate(a.date)} &nbsp;|&nbsp; ${a.teacher_name||'Teacher'}</div>
        </div>
        <div class="result-grade ${gradeColor(a.grade)}">${a.grade}</div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${a.percentage}%"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:0.78rem;color:rgba(245,245,245,0.6);">
        <span>${a.marks_obtained}/${a.max_marks}</span><span>${a.percentage}%</span>
      </div>
      ${a.comments ? `<p style="font-size:0.78rem;color:rgba(245,245,245,0.5);margin-top:6px;font-style:italic;">"${a.comments}"</p>` : ''}
    </div>`).join('')}
</div>`;
}

function getBadgeEmoji(type) {
  const map = { academic:'🏆', consistency:'🔥', participation:'⭐', attendance:'📅', quiz:'🧠', competition:'🥇' };
  return map[type] || '🎖️';
}

function renderTaskItem(task) {
  return `
<div class="task-item ${task.completed?'completed':''}" id="task-${task.id}">
  <div class="task-check ${task.completed?'checked':''}" onclick="toggleTask(${task.id},${task.completed?0:1})">
    ${task.completed ? Icons.check : ''}
  </div>
  <div class="task-info">
    <div class="task-title">${task.title}</div>
    <div class="task-meta">
      ${task.subject ? `<span>${task.subject}</span>` : ''}
      ${task.due_date ? `<span>${Icons.attendance} ${formatDate(task.due_date)}</span>` : ''}
      <span class="task-priority priority-${(task.priority||'medium').toLowerCase()}">${task.priority||'Medium'}</span>
    </div>
  </div>
  <div class="task-actions">
    <button class="task-action-btn" onclick="editTask(${task.id})" title="Edit">${Icons.edit}</button>
    <button class="task-action-btn" onclick="deleteTask(${task.id})" title="Delete" style="color:var(--danger);">${Icons.trash}</button>
  </div>
</div>`;
}

async function renderStudentTasks(el) {
  const data = await API.get('/api/student/tasks');
  const tasks = data.tasks || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.tasks} ${t('tasks')}</h2>
  <button class="btn btn-primary" onclick="showAddTaskModal()">${Icons.plus} ${t('addTask')}</button>
</div>
<div class="tabs">
  <button class="tab-btn active" onclick="filterTasks('all',this)">All (${tasks.length})</button>
  <button class="tab-btn" onclick="filterTasks('pending',this)">Pending (${tasks.filter(x=>!x.completed).length})</button>
  <button class="tab-btn" onclick="filterTasks('completed',this)">Completed (${tasks.filter(x=>x.completed).length})</button>
</div>
<div id="tasks-list">
  ${tasks.length === 0
    ? `<div class="empty-state">${Icons.tasks}<p>No tasks yet. Add your first task!</p></div>`
    : tasks.map(task => renderTaskItem(task)).join('')}
</div>`;
}

function filterTasks(filter, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.task-item').forEach(el => {
    const done = el.classList.contains('completed');
    el.style.display = filter === 'all' ? '' : filter === 'completed' ? (done ? '' : 'none') : (!done ? '' : 'none');
  });
}

function showAddTaskModal(task) {
  const subjects = ['Mathematics','English','Science','History','Geography','Art','Music','Physical Education','Computer Science','Biology','Chemistry','Physics','Amharic','General'];
  openModal(`
<h3 class="modal-title">${task ? 'Edit Task' : t('addTask')}</h3>
<form onsubmit="saveTask(event,${task ? task.id : 'null'})">
  <div class="form-group">
    <label class="form-label form-label-light">${t('taskTitle')} *</label>
    <input type="text" class="form-control form-control-dark" id="task-title" value="${task ? task.title : ''}" placeholder="e.g. Complete Math Homework" required>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('subject')}</label>
      <select class="form-control form-control-dark" id="task-subject">
        <option value="">Select subject</option>
        ${subjects.map(s => `<option value="${s}" ${task && task.subject === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">${t('priority')}</label>
      <select class="form-control form-control-dark" id="task-priority">
        ${['High','Medium','Low'].map(p => `<option value="${p}" ${task && task.priority === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('dueDate')}</label>
      <input type="date" class="form-control form-control-dark" id="task-due-date" value="${task ? task.due_date : ''}">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Due Time</label>
      <input type="time" class="form-control form-control-dark" id="task-due-time" value="${task ? task.due_time : ''}">
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Notes</label>
    <textarea class="form-control form-control-dark" id="task-notes" placeholder="Additional notes...">${task ? task.notes : ''}</textarea>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Recurring</label>
    <select class="form-control form-control-dark" id="task-recurring">
      ${['none','daily','weekly'].map(r => `<option value="${r}" ${task && task.recurring === r ? 'selected' : ''}>${r.charAt(0).toUpperCase()+r.slice(1)}</option>`).join('')}
    </select>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">${task ? t('save') : t('addTask')}</button>
  </div>
</form>`);
}

async function saveTask(e, id) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('task-title').value,
    subject: document.getElementById('task-subject').value,
    priority: document.getElementById('task-priority').value,
    due_date: document.getElementById('task-due-date').value,
    due_time: document.getElementById('task-due-time').value,
    notes: document.getElementById('task-notes').value,
    recurring: document.getElementById('task-recurring').value
  };
  const res = id ? await API.put('/api/student/tasks/' + id, payload) : await API.post('/api/student/tasks', payload);
  if (res.success) {
    closeModal();
    showToast(id ? 'Task updated!' : 'Task added! +10 pts when completed.', 'success');
    renderStudentTasks(document.getElementById('student-content'));
  } else showToast(res.message || 'Failed', 'error');
}

async function toggleTask(id, completed) {
  const res = await API.put('/api/student/tasks/' + id, { completed });
  if (res.success) {
    if (completed) showToast('Task completed! +10 points & 30 min reward unlocked!', 'success');
    renderStudentTasks(document.getElementById('student-content'));
  }
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await API.delete('/api/student/tasks/' + id);
  showToast('Task deleted', 'info');
  renderStudentTasks(document.getElementById('student-content'));
}

async function editTask(id) {
  const data = await API.get('/api/student/tasks');
  const task = (data.tasks || []).find(x => x.id === id);
  if (task) showAddTaskModal(task);
}

async function renderStudentResults(el) {
  const data = await API.get('/api/student/results');
  const results = data.results || [];
  const bySubject = {};
  results.forEach(r => { if (!bySubject[r.subject]) bySubject[r.subject] = []; bySubject[r.subject].push(r); });

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.results} ${t('results')}</h2>
${Object.keys(bySubject).length === 0
  ? `<div class="empty-state"><p>No results yet</p></div>`
  : Object.entries(bySubject).map(([subject, recs]) => {
      const avg = Math.round(recs.reduce((s, r) => s + (r.percentage || 0), 0) / recs.length);
      return `
<div style="margin-bottom:24px;">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <h3 style="color:var(--accent);">${subject}</h3>
    <span class="badge badge-accent">Avg: ${avg}%</span>
  </div>
  <div class="table-card">
    <table>
      <thead><tr><th>Assessment</th><th>Date</th><th>Marks</th><th>%</th><th>Grade</th><th>Teacher</th><th>Feedback</th></tr></thead>
      <tbody>
        ${recs.map(r => `
        <tr>
          <td>${r.assessment_type}</td>
          <td>${formatDate(r.date)}</td>
          <td>${r.marks_obtained}/${r.max_marks}</td>
          <td>${r.percentage}%</td>
          <td><span class="result-grade ${gradeColor(r.grade)}" style="width:32px;height:32px;font-size:0.82rem;display:inline-flex;align-items:center;justify-content:center;">${r.grade}</span></td>
          <td>${r.teacher_name || '—'}</td>
          <td style="font-size:0.78rem;font-style:italic;color:rgba(245,245,245,0.6);">${r.comments || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;
    }).join('')}`;
}

async function renderStudentAttendance(el) {
  const data = await API.get('/api/student/attendance');
  const records = data.records || [];
  const present = records.filter(r => r.status === 'Present').length;
  const absent  = records.filter(r => r.status === 'Absent').length;
  const late    = records.filter(r => r.status === 'Late').length;
  const total   = records.length;
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.attendance} ${t('attendance')}</h2>
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
        <td style="font-size:0.82rem;color:rgba(245,245,245,0.5);">${r.notes || '—'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

async function renderStudentNotes(el) {
  const data = await API.get('/api/student/notes');
  const notes = data.notes || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.notes} ${t('notes')}</h2>
  <button class="btn btn-primary" onclick="showNoteEditor()">${Icons.plus} New Note</button>
</div>
<div class="grid-auto" id="notes-grid">
  ${notes.length === 0
    ? `<div class="empty-state"><p>No notes yet. Create your first note!</p></div>`
    : notes.map(n => `
  <div class="card-dark" style="cursor:pointer;" onclick="showNoteEditor(${JSON.stringify(n).replace(/"/g,'&quot;')})">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <span class="badge badge-accent">${n.subject}</span>
      <button onclick="event.stopPropagation();deleteNote(${n.id})" class="task-action-btn" style="color:var(--danger);">${Icons.trash}</button>
    </div>
    <h4 style="color:var(--text-light);margin-bottom:6px;">${n.title}</h4>
    <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">${(n.content||'').replace(/<[^>]*>/g,'')}</p>
    <p style="font-size:0.72rem;color:rgba(245,245,245,0.3);margin-top:8px;">${formatDate(n.updated_at)}</p>
  </div>`).join('')}
</div>`;
}

function showNoteEditor(note) {
  const subjects = ['Mathematics','English','Science','History','Geography','Art','Music','Computer Science','Biology','Chemistry','Physics','Amharic','General'];
  openModal(`
<h3 class="modal-title">${note ? 'Edit Note' : 'New Note'}</h3>
<form onsubmit="saveNote(event,${note ? note.id : 'null'})">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Title *</label>
      <input type="text" class="form-control form-control-dark" id="note-title" value="${note ? note.title : ''}" placeholder="Note title" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Subject</label>
      <select class="form-control form-control-dark" id="note-subject">
        ${subjects.map(s => `<option value="${s}" ${note && note.subject === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Content</label>
    <div class="notebook-toolbar">
      <button type="button" class="toolbar-btn" onclick="fmtNote('bold')"><b>B</b></button>
      <button type="button" class="toolbar-btn" onclick="fmtNote('italic')"><i>I</i></button>
      <button type="button" class="toolbar-btn" onclick="fmtNote('underline')"><u>U</u></button>
      <button type="button" class="toolbar-btn" onclick="fmtNote('insertUnorderedList')">• List</button>
      <button type="button" class="toolbar-btn" onclick="fmtNote('insertOrderedList')">1. List</button>
    </div>
    <div class="notebook-editor" id="note-content" contenteditable="true">${note ? note.content : ''}</div>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">${t('save')}</button>
  </div>
</form>`);
}

function fmtNote(cmd) { document.execCommand(cmd, false, null); }

async function saveNote(e, id) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('note-title').value,
    subject: document.getElementById('note-subject').value,
    content: document.getElementById('note-content').innerHTML
  };
  const res = id ? await API.put('/api/student/notes/' + id, payload) : await API.post('/api/student/notes', payload);
  if (res.success) { closeModal(); showToast('Note saved!', 'success'); renderStudentNotes(document.getElementById('student-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function deleteNote(id) {
  if (!confirm('Delete this note?')) return;
  await API.delete('/api/student/notes/' + id);
  showToast('Note deleted', 'info');
  renderStudentNotes(document.getElementById('student-content'));
}

async function renderStudentVideos(el) {
  const data = await API.get('/api/student/videos');
  const videos = data.videos || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.videos} ${t('videos')}</h2>
<div class="video-feed">
  ${videos.length === 0
    ? `<div class="empty-state"><p>No videos yet. Check back later!</p></div>`
    : videos.map(v => `
  <div class="video-card">
    <div class="video-thumb">
      ${v.file_url
        ? `<video controls src="${v.file_url}" style="width:100%;height:100%;object-fit:cover;"></video>`
        : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:rgba(255,255,255,0.3);font-size:3rem;">▶</div>`}
    </div>
    <div class="video-info">
      <div class="video-title">${v.title}</div>
      <div class="video-meta">
        <span class="video-author">${v.uploader_name || 'Teacher'} · ${timeAgo(v.created_at)}</span>
        <div class="video-actions">
          <button class="video-action" onclick="likeVideo(${v.id},this)">${Icons.heart} ${v.likes || 0}</button>
          <button class="video-action" onclick="showVideoComments(${v.id})">${Icons.comment} Comments</button>
        </div>
      </div>
      ${v.description ? `<p style="font-size:0.82rem;color:rgba(245,245,245,0.5);margin-top:6px;">${v.description}</p>` : ''}
    </div>
  </div>`).join('')}
</div>`;
}

async function likeVideo(id, btn) {
  const res = await API.post('/api/common/video-like', { video_id: id });
  if (res.success) {
    const countEl = btn.querySelector('span') || btn;
    btn.classList.toggle('liked', res.liked);
    showToast(res.liked ? 'Liked!' : 'Unliked', 'info');
    renderStudentVideos(document.getElementById('student-content'));
  }
}

async function showVideoComments(videoId) {
  const data = await API.get('/api/common/video-comments/' + videoId);
  const comments = data.comments || [];
  openModal(`
<h3 class="modal-title">Comments</h3>
<div style="max-height:300px;overflow-y:auto;margin-bottom:16px;">
  ${comments.length === 0
    ? `<p style="color:rgba(245,245,245,0.4);text-align:center;padding:20px;">No comments yet</p>`
    : comments.map(c => `
  <div style="padding:10px 0;border-bottom:1px solid rgba(139,94,60,0.2);">
    <div style="font-size:0.82rem;font-weight:600;color:var(--accent);">${c.author_name || 'User'}</div>
    <div style="font-size:0.88rem;margin-top:3px;">${c.content}</div>
    <div style="font-size:0.72rem;color:rgba(245,245,245,0.35);margin-top:3px;">${timeAgo(c.created_at)}</div>
  </div>`).join('')}
</div>
<form onsubmit="postComment(event,${videoId})">
  <div style="display:flex;gap:8px;">
    <input type="text" class="form-control form-control-dark" id="comment-text" placeholder="Write a comment..." required style="flex:1;">
    <button type="submit" class="btn btn-primary btn-sm">${Icons.send}</button>
  </div>
</form>`);
}

async function postComment(e, videoId) {
  e.preventDefault();
  const content = document.getElementById('comment-text').value.trim();
  if (!content) return;
  await API.post('/api/common/video-comment', { video_id: videoId, content });
  showToast('Comment posted!', 'success');
  showVideoComments(videoId);
}

async function renderStudentQuizzes(el) {
  const data = await API.get('/api/student/quizzes');
  const quizzes = data.quizzes || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.quiz||Icons.star} ${t('quiz')}</h2>
<div class="grid-auto">
  ${quizzes.length === 0
    ? `<div class="empty-state"><p>No quizzes available yet</p></div>`
    : quizzes.map(q => `
  <div class="card-dark">
    <h4 style="color:var(--accent);margin-bottom:6px;">${q.title}</h4>
    <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);margin-bottom:10px;">${q.subject || 'General'} · ${q.time_limit} min · +${q.reward_minutes} min reward</p>
    <p style="font-size:0.78rem;color:rgba(245,245,245,0.4);margin-bottom:12px;">By ${q.teacher_name || 'Teacher'} · ${formatDate(q.created_at)}</p>
    <button class="btn btn-primary btn-sm w-full" onclick="startQuiz(${q.id})">${t('startQuiz')}</button>
  </div>`).join('')}
</div>`;
}

async function startQuiz(quizId) {
  const data = await API.get('/api/student/quizzes');
  const quiz = (data.quizzes || []).find(q => q.id === quizId);
  if (!quiz) return;
  let questions;
  try { questions = JSON.parse(quiz.questions); } catch(e) { questions = []; }
  if (!questions.length) { showToast('No questions in this quiz', 'error'); return; }

  let current = 0, score = 0, answers = [], timeLeft = (quiz.time_limit || 30) * 60;
  let timerInterval;

  function renderQ() {
    const q = questions[current];
    const opts = q.options || [];
    document.getElementById('modal-content').innerHTML = `
<div class="game-container" style="max-width:100%;">
  <div class="game-header">
    <span class="game-score">Q ${current+1}/${questions.length} · Score: ${score}</span>
    <span class="game-timer" id="quiz-timer">${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}</span>
  </div>
  <div class="quiz-game-question">${q.question || q.text || 'Question'}</div>
  <div class="quiz-game-options">
    ${opts.map((o, i) => `<button class="quiz-option" onclick="answerQuiz(${i},${q.correct||0},'${quizId}')">${o}</button>`).join('')}
  </div>
  <div style="margin-top:16px;">
    <div class="progress-bar"><div class="progress-fill" style="width:${((current)/questions.length)*100}%"></div></div>
  </div>
</div>`;
  }

  window.answerQuiz = async function(chosen, correct, qid) {
    document.querySelectorAll('.quiz-option').forEach((b, i) => {
      b.disabled = true;
      if (i === correct) b.classList.add('correct');
      else if (i === chosen) b.classList.add('wrong');
    });
    answers.push(chosen);
    if (chosen === correct) score++;
    await new Promise(r => setTimeout(r, 900));
    current++;
    if (current < questions.length) { renderQ(); }
    else {
      clearInterval(timerInterval);
      const res = await API.post('/api/student/quiz-attempt', { quiz_id: quizId, answers, score, total: questions.length });
      document.getElementById('modal-content').innerHTML = `
<div class="game-result">
  <div class="game-result-score">${score}/${questions.length}</div>
  <div class="game-result-msg">${score === questions.length ? 'Perfect score!' : score >= questions.length*0.7 ? 'Great job!' : 'Keep practising!'}</div>
  ${res.success ? `<div class="game-xp-earned">+${res.points_earned} pts · ${res.reward_minutes} min reward unlocked</div>` : ''}
  <button class="btn btn-primary" onclick="closeModal();renderStudentQuizzes(document.getElementById('student-content'))">Done</button>
</div>`;
    }
  };

  openModal('');
  renderQ();
  timerInterval = setInterval(() => {
    timeLeft--;
    const el = document.getElementById('quiz-timer');
    if (el) el.textContent = `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`;
    if (timeLeft <= 0) { clearInterval(timerInterval); window.answerQuiz(-1, -2, quizId); }
  }, 1000);
}

async function renderStudentMovies(el) {
  const rewardData = await API.get('/api/student/reward-status');
  const unlocked = rewardData.active;
  const minsLeft = rewardData.minutesLeft || 0;

  const movies = [
    { id:1, title:'The Theory of Everything', genre:'Science/Biography', emoji:'🔭', url:'https://www.youtube.com/watch?v=Salz7uGp72c' },
    { id:2, title:'Hidden Figures', genre:'Mathematics/History', emoji:'🚀', url:'https://www.youtube.com/watch?v=RK8xHq6dfAo' },
    { id:3, title:'A Beautiful Mind', genre:'Mathematics', emoji:'🧠', url:'https://www.youtube.com/watch?v=aS_d0Ayjw4o' },
    { id:4, title:'The Imitation Game', genre:'Computer Science', emoji:'💻', url:'https://www.youtube.com/watch?v=nuPZUUED5uk' },
    { id:5, title:'October Sky', genre:'Science/Engineering', emoji:'🌌', url:'https://www.youtube.com/watch?v=Gy8wnFMJNKg' },
    { id:6, title:'Good Will Hunting', genre:'Mathematics', emoji:'📐', url:'https://www.youtube.com/watch?v=dMnFMGkoMKY' },
    { id:7, title:'Erin Brockovich', genre:'Environmental Science', emoji:'🌿', url:'https://www.youtube.com/watch?v=k9Gu0IQKFQY' },
    { id:8, title:'The Social Network', genre:'Computer Science', emoji:'🌐', url:'https://www.youtube.com/watch?v=lB95KLmpLR4' },
    { id:9, title:'Interstellar', genre:'Physics/Space', emoji:'🪐', url:'https://www.youtube.com/watch?v=zSWdZVtXT7E' },
    { id:10, title:'Spare Parts', genre:'Engineering/Robotics', emoji:'🤖', url:'https://www.youtube.com/watch?v=Gy8wnFMJNKg' },
    { id:11, title:'Gifted', genre:'Mathematics', emoji:'🎓', url:'https://www.youtube.com/watch?v=HFpHFJFHsAo' },
    { id:12, title:'The Man Who Knew Infinity', genre:'Mathematics', emoji:'∞', url:'https://www.youtube.com/watch?v=oXGm9Vlfx4w' }
  ];

  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
  <h2 class="text-accent">${Icons.film} ${t('movies')}</h2>
  ${unlocked
    ? `<span class="badge badge-success">${Icons.unlock} ${minsLeft} min left</span>`
    : `<span class="badge badge-warning">${Icons.lock} Complete tasks to unlock</span>`}
</div>
${!unlocked ? `
<div style="background:rgba(196,154,108,0.1);border:1px solid var(--accent);border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
  <p style="color:var(--accent);font-weight:700;margin-bottom:6px;">Movies are locked</p>
  <p style="font-size:0.85rem;color:rgba(245,245,245,0.6);">Complete tasks or quizzes to earn reward time and unlock movies.</p>
  <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="switchStudentTab('tasks')">Go to Tasks</button>
</div>` : ''}
<div class="movie-grid">
  ${movies.map(m => `
  <div class="movie-card ${!unlocked ? 'locked' : ''}" onclick="${unlocked ? `watchMovie('${m.url}','${m.title}')` : 'showToast(\"Complete tasks to unlock movies!\",\"warning\")'}">
    <div class="movie-thumb">
      <span style="font-size:3rem;">${m.emoji}</span>
      ${!unlocked ? `<div class="movie-lock-overlay">${Icons.lock}</div>` : ''}
    </div>
    <div class="movie-info">
      <div class="movie-title">${m.title}</div>
      <div class="movie-genre">${m.genre}</div>
    </div>
  </div>`).join('')}
</div>`;
}

function watchMovie(url, title) {
  const embedUrl = url.replace('watch?v=', 'embed/');
  openModal(`
<h3 class="modal-title">${title}</h3>
<div style="aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;margin-bottom:16px;">
  <iframe width="100%" height="100%" src="${embedUrl}" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>
</div>
<div class="modal-actions">
  <button class="btn btn-secondary" onclick="closeModal()">Close</button>
  <a href="${url}" target="_blank" class="btn btn-primary">Open in YouTube</a>
</div>`);
}

async function renderStudentLeaderboard(el) {
  const data = await API.get('/api/student/leaderboard');
  const board = data.leaderboard || [];
  const me = AppState.user;

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.leaderboard} ${t('leaderboard')}</h2>
<div style="margin-bottom:20px;">
  ${board.slice(0,3).map((s, i) => `
  <div style="display:flex;align-items:center;gap:16px;padding:16px;background:${i===0?'rgba(255,215,0,0.1)':i===1?'rgba(192,192,192,0.1)':'rgba(205,127,50,0.1)'};border:1px solid ${i===0?'#FFD700':i===1?'#C0C0C0':'#CD7F32'};border-radius:12px;margin-bottom:10px;">
    <div style="font-size:2rem;">${i===0?'🥇':i===1?'🥈':'🥉'}</div>
    <div style="font-size:2rem;">${getAvatarEmoji(s.avatar)}</div>
    <div style="flex:1;">
      <div style="font-weight:700;font-size:1rem;${me && s.id===me.id?'color:var(--accent);':''}">${s.full_name} ${me && s.id===me.id?'(You)':''}</div>
      <div style="font-size:0.78rem;color:rgba(245,245,245,0.5);">${s.grade || 'Student'}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:1.3rem;font-weight:700;color:var(--accent);">${s.points}</div>
      <div style="font-size:0.72rem;color:rgba(245,245,245,0.4);">points</div>
    </div>
  </div>`).join('')}
</div>
<div>
  ${board.slice(3).map((s, i) => `
  <div class="leaderboard-item">
    <div class="leaderboard-rank rank-other">${i + 4}</div>
    <div style="font-size:1.3rem;">${getAvatarEmoji(s.avatar)}</div>
    <div class="leaderboard-name ${me && s.id===me.id?'text-accent':''}">${s.full_name} ${me && s.id===me.id?'(You)':''}<br><span style="font-size:0.72rem;color:rgba(245,245,245,0.4);">${s.grade||''}</span></div>
    <div class="leaderboard-pts">${s.points} pts</div>
    ${s.streak > 0 ? `<div class="streak-badge" style="font-size:0.72rem;">${Icons.flame} ${s.streak}</div>` : ''}
  </div>`).join('')}
</div>`;
}

async function renderStudentChallenges(el) {
  const progData = await API.get('/api/student/challenge-progress');
  const progress = progData.progress || [];

  const interests = [
    { key:'science', label:'Science', emoji:'🔬', desc:'Explore physics, chemistry, biology and the natural world.' },
    { key:'math', label:'Mathematics', emoji:'📐', desc:'Master numbers, algebra, geometry and problem solving.' },
    { key:'technology', label:'Technology', emoji:'💻', desc:'Learn coding, AI, robotics and digital skills.' },
    { key:'art', label:'Art & Creativity', emoji:'🎨', desc:'Develop artistic skills, design thinking and creativity.' },
    { key:'language', label:'Languages', emoji:'🌍', desc:'Learn English, Amharic and other world languages.' },
    { key:'history', label:'History', emoji:'📜', desc:'Discover civilizations, events and the story of humanity.' }
  ];

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.challenges} ${t('challenges')}</h2>
<div class="grid-auto">
  ${interests.map(interest => {
    const prog = progress.find(p => p.interest === interest.key);
    const level = prog ? prog.level : 1;
    const xp = prog ? prog.xp : 0;
    const xpToNext = level * 100;
    const pct = Math.min(100, Math.round((xp % 100) / 100 * 100));
    return `
<div class="card-dark" style="cursor:pointer;" onclick="openChallenge('${interest.key}','${interest.label}','${interest.emoji}')">
  <div style="font-size:2.5rem;margin-bottom:10px;">${interest.emoji}</div>
  <h4 style="color:var(--accent);margin-bottom:6px;">${interest.label}</h4>
  <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);margin-bottom:12px;">${interest.desc}</p>
  <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:6px;">
    <span style="color:rgba(245,245,245,0.5);">Level ${level}</span>
    <span style="color:var(--accent);">${xp} XP</span>
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
</div>`;
  }).join('')}
</div>`;
}

function openChallenge(key, label, emoji) {
  const lessons = {
    science: [
      { id:'s1', title:'What is Science?', text:'Science is the systematic study of the natural world through observation and experiment. It helps us understand everything from atoms to galaxies.', video:'https://www.youtube.com/embed/gy7Wr3fSo7o' },
      { id:'s2', title:'The Scientific Method', text:'The scientific method is a process: Observe → Question → Hypothesis → Experiment → Analyze → Conclude. Every great discovery follows this path.', video:'https://www.youtube.com/embed/N6IAzlugWw0' },
      { id:'s3', title:'Cells: The Building Blocks of Life', text:'All living things are made of cells. The cell is the smallest unit of life. Cells have a nucleus, membrane, and cytoplasm.', video:'https://www.youtube.com/embed/URUJD5NEXC8' }
    ],
    math: [
      { id:'m1', title:'The Beauty of Numbers', text:'Mathematics is the language of the universe. Numbers describe patterns in nature, from the spiral of a shell to the orbit of planets.', video:'https://www.youtube.com/embed/YsA4LHnNvds' },
      { id:'m2', title:'Algebra Basics', text:'Algebra uses letters to represent unknown values. Solving equations means finding what value makes both sides equal.', video:'https://www.youtube.com/embed/NybHckSEQBI' },
      { id:'m3', title:'Geometry in Real Life', text:'Geometry is everywhere — in architecture, art, and nature. Understanding shapes and angles helps us design and build the world.', video:'https://www.youtube.com/embed/302eJ3TzJQU' }
    ],
    technology: [
      { id:'t1', title:'What is Programming?', text:'Programming is giving instructions to a computer. Every app, website, and game is built with code. You can learn to create them too!', video:'https://www.youtube.com/embed/FCMxA3m_Imc' },
      { id:'t2', title:'How the Internet Works', text:'The internet is a global network of computers. When you visit a website, your device sends a request to a server which sends back the page.', video:'https://www.youtube.com/embed/x3c1ih2NJEg' },
      { id:'t3', title:'Introduction to AI', text:'Artificial Intelligence is teaching computers to think and learn. AI powers voice assistants, recommendation systems, and self-driving cars.', video:'https://www.youtube.com/embed/mJeNghZXtMo' }
    ],
    art: [
      { id:'a1', title:'Elements of Art', text:'The elements of art are line, shape, form, space, texture, value, and color. Every artwork uses these building blocks.', video:'https://www.youtube.com/embed/HZPIbqDFLI8' },
      { id:'a2', title:'Color Theory', text:'Colors have relationships. Primary colors mix to make secondary colors. Warm colors feel energetic; cool colors feel calm.', video:'https://www.youtube.com/embed/AvgCkHrcj8w' },
      { id:'a3', title:'Design Thinking', text:'Design thinking is a creative problem-solving process: Empathize → Define → Ideate → Prototype → Test. It is used in every field.', video:'https://www.youtube.com/embed/a7sEoEvT8l8' }
    ],
    language: [
      { id:'l1', title:'Why Learn Languages?', text:'Learning a new language opens doors to new cultures, opportunities, and ways of thinking. Bilingual people have stronger memory and focus.', video:'https://www.youtube.com/embed/MMmOLN5zBLY' },
      { id:'l2', title:'English Grammar Basics', text:'Every sentence needs a subject and a verb. Nouns name things; verbs describe actions; adjectives describe nouns.', video:'https://www.youtube.com/embed/Ys2bkBFBMDo' },
      { id:'l3', title:'Amharic: Ethiopia\'s Language', text:'Amharic is the official language of Ethiopia, spoken by over 25 million people. It uses the Ge\'ez script, one of the oldest writing systems.', video:'https://www.youtube.com/embed/d7L8ygh7YkA' }
    ],
    history: [
      { id:'h1', title:'Why Study History?', text:'History teaches us where we came from, how societies evolved, and what mistakes to avoid. Those who ignore history are doomed to repeat it.', video:'https://www.youtube.com/embed/Yocja_N5s1I' },
      { id:'h2', title:'Ancient Civilizations', text:'The first civilizations arose in Mesopotamia, Egypt, India, and China. They built cities, developed writing, and created laws.', video:'https://www.youtube.com/embed/HlIbvgrW-S0' },
      { id:'h3', title:'Ethiopia\'s Rich History', text:'Ethiopia is one of the oldest nations in the world. It was never colonized and is home to ancient kingdoms like Aksum and the birthplace of coffee.', video:'https://www.youtube.com/embed/Yocja_N5s1I' }
    ]
  };

  const lessonList = lessons[key] || [];
  let currentLesson = 0;

  function renderLesson() {
    const lesson = lessonList[currentLesson];
    document.getElementById('modal-content').innerHTML = `
<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
  <span style="font-size:1.8rem;">${emoji}</span>
  <div>
    <h3 class="modal-title" style="margin-bottom:2px;">${label} — Level ${currentLesson+1}</h3>
    <div class="progress-bar" style="width:200px;"><div class="progress-fill" style="width:${((currentLesson)/lessonList.length)*100}%"></div></div>
  </div>
</div>
<h4 style="color:var(--accent);margin-bottom:10px;">${lesson.title}</h4>
<p style="color:rgba(245,245,245,0.8);line-height:1.7;margin-bottom:16px;">${lesson.text}</p>
<div style="aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden;margin-bottom:16px;">
  <iframe width="100%" height="100%" src="${lesson.video}" frameborder="0" allowfullscreen></iframe>
</div>
<div style="display:flex;gap:10px;justify-content:space-between;">
  <button class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
  <button class="btn btn-primary" onclick="completeLesson('${key}','${lesson.id}',${currentLesson},${lessonList.length})">
    ${currentLesson < lessonList.length-1 ? 'Complete & Next' : 'Complete Challenge'} +10 XP
  </button>
</div>`;
  }

  window.completeLesson = async function(interest, lessonId, idx, total) {
    const res = await API.post('/api/student/challenge-progress', { interest, lesson_id: lessonId, xp_earned: 10 });
    if (res.success) {
      showToast(`+10 XP! Level ${res.level}`, 'success');
      if (idx < total - 1) { currentLesson++; renderLesson(); }
      else { closeModal(); showToast('Challenge completed! Great work!', 'success'); renderStudentChallenges(document.getElementById('student-content')); }
    }
  };

  openModal('');
  renderLesson();
}

async function renderStudentChat(el) {
  const teachersData = await API.get('/api/student/teachers');
  const teachers = teachersData.teachers || [];
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:16px;">${Icons.messages} ${t('messages')}</h2>
<div class="chat-layout">
  <div class="chat-sidebar">
    <div class="chat-sidebar-header">Teachers</div>
    <div class="chat-list" id="student-chat-list">
      ${teachers.length === 0
        ? `<div style="padding:20px;text-align:center;color:rgba(245,245,245,0.4);font-size:0.85rem;">No teachers found</div>`
        : teachers.map(t => `
      <div class="chat-list-item" onclick="openStudentChat(${t.id},'${t.full_name}')">
        <div class="chat-list-avatar">${initials(t.full_name)}</div>
        <div class="chat-list-info">
          <div class="chat-list-name">${t.full_name}</div>
          <div class="chat-list-preview">${JSON.parse(t.subjects||'[]').slice(0,2).join(', ') || 'Teacher'}</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="chat-main" id="student-chat-main">
    <div class="chat-empty">
      ${Icons.messages}
      <p>Select a teacher to start chatting</p>
    </div>
  </div>
</div>`;
}

async function openStudentChat(teacherId, teacherName) {
  document.querySelectorAll('#student-chat-list .chat-list-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(teacherId));
  });
  const main = document.getElementById('student-chat-main');
  main.innerHTML = `
<div class="chat-header">
  <div class="chat-header-avatar">${initials(teacherName)}</div>
  <div>
    <div class="chat-header-name">${teacherName}</div>
    <div class="chat-header-status">Teacher</div>
  </div>
</div>
<div class="chat-messages" id="chat-msgs-${teacherId}">
  <div style="text-align:center;color:rgba(245,245,245,0.3);font-size:0.82rem;padding:20px;">Loading messages...</div>
</div>
<div class="chat-input-area">
  <div class="chat-input-wrap">
    <textarea class="chat-input" id="chat-input-${teacherId}" placeholder="${t('typeMessage')}" rows="1"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendStudentMsg(${teacherId},'teacher')}"></textarea>
  </div>
  <button class="chat-send-btn" onclick="sendStudentMsg(${teacherId},'teacher')">${Icons.send}</button>
</div>`;
  loadStudentMessages(teacherId, 'teacher');
}

async function loadStudentMessages(withId, withRole) {
  const data = await API.get(`/api/student/messages?with_id=${withId}&with_role=${withRole}`);
  const msgs = data.messages || [];
  const container = document.getElementById('chat-msgs-' + withId);
  if (!container) return;
  container.innerHTML = msgs.length === 0
    ? `<div class="chat-empty"><p>${t('noMessages')}</p></div>`
    : msgs.map(m => `
  <div class="chat-msg ${m.sender_role === 'student' ? 'sent' : 'received'}">
    <div class="chat-msg-avatar">${initials(m.sender_name || '?')}</div>
    <div>
      <div class="chat-msg-bubble">${m.content}</div>
      <div class="chat-msg-time">${timeAgo(m.created_at)}</div>
    </div>
  </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendStudentMsg(receiverId, receiverRole) {
  const input = document.getElementById('chat-input-' + receiverId);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  const res = await API.post('/api/student/messages', { receiver_id: receiverId, receiver_role: receiverRole, content });
  if (res.success) {
    loadStudentMessages(receiverId, receiverRole);
    if (window.socketIO) window.socketIO.emit('send_message', { receiverId, receiverRole, content, senderId: AppState.user.id, senderRole: 'student' });
  }
}

async function renderStudentPortfolio(el) {
  const data = await API.get('/api/student/portfolio');
  const items = data.portfolio || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.portfolio} ${t('portfolio')}</h2>
  <button class="btn btn-primary" onclick="showPortfolioModal()">${Icons.plus} ${t('addProject')}</button>
</div>
<div class="portfolio-grid">
  ${items.length === 0
    ? `<div class="empty-state"><p>No portfolio items yet. Showcase your work!</p></div>`
    : items.map(item => `
  <div class="portfolio-item">
    <div class="portfolio-thumb">
      ${item.file_url
        ? `<img src="${item.file_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
        : `<span style="font-size:2rem;">📁</span>`}
    </div>
    <div class="portfolio-info">
      <div class="portfolio-title">${item.title}</div>
      <div class="portfolio-type">${item.type || 'Project'} · ${formatDate(item.created_at)}</div>
      ${item.description ? `<p style="font-size:0.75rem;color:rgba(245,245,245,0.5);margin-top:4px;">${item.description}</p>` : ''}
    </div>
  </div>`).join('')}
</div>`;
}

function showPortfolioModal() {
  openModal(`
<h3 class="modal-title">${t('addProject')}</h3>
<form onsubmit="savePortfolio(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="port-title" placeholder="Project title" required>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Type</label>
    <select class="form-control form-control-dark" id="port-type">
      ${['project','essay','artwork','presentation','certificate','other'].map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Description</label>
    <textarea class="form-control form-control-dark" id="port-desc" placeholder="Describe your work..."></textarea>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Upload File (optional)</label>
    <input type="file" class="form-control form-control-dark" id="port-file" accept="image/*,.pdf,.doc,.docx">
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Add to Portfolio</button>
  </div>
</form>`);
}

async function savePortfolio(e) {
  e.preventDefault();
  const fd = new FormData();
  fd.append('title', document.getElementById('port-title').value);
  fd.append('type', document.getElementById('port-type').value);
  fd.append('description', document.getElementById('port-desc').value);
  const file = document.getElementById('port-file').files[0];
  if (file) fd.append('file', file);
  const res = await API.upload('/api/student/portfolio', fd);
  if (res.success) { closeModal(); showToast('Added to portfolio!', 'success'); renderStudentPortfolio(document.getElementById('student-content')); }
  else showToast(res.message || 'Failed', 'error');
}

function renderStudentTimer(el) {
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.timer} ${t('studyTimer')}</h2>
<div class="grid-2">
  <div class="pomodoro-wrap">
    <h3 style="color:var(--accent);margin-bottom:16px;">${t('pomodoroMode')}</h3>
    <div class="pomodoro-circle" id="pomo-circle">
      <div>
        <div class="pomodoro-time" id="pomo-time">25:00</div>
        <div class="pomodoro-label" id="pomo-label">Study Time</div>
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <div class="progress-bar" style="height:6px;">
        <div class="progress-fill" id="pomo-progress" style="width:0%;"></div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Subject</label>
      <select class="form-control form-control-dark" id="pomo-subject">
        ${['Mathematics','English','Science','History','Geography','Art','Music','Computer Science','Biology','Chemistry','Physics','Amharic','General'].map(s => `<option value="${s}">${s}</option>`).join('')}
      </select>
    </div>
    <div class="pomodoro-controls">
      <button class="btn btn-primary" id="pomo-btn" onclick="togglePomodoro()">${t('startTimer')}</button>
      <button class="btn btn-secondary" onclick="resetPomodoro()">Reset</button>
    </div>
    <div style="margin-top:16px;text-align:center;">
      <span class="badge badge-accent" id="pomo-sessions">Sessions: 0</span>
    </div>
  </div>
  <div class="card-dark">
    <h3 style="color:var(--accent);margin-bottom:16px;">Today's Study Log</h3>
    <div id="study-log-list">
      <div style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">Start a session to track your study time</div>
    </div>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;font-size:0.88rem;">
        <span style="color:rgba(245,245,245,0.6);">Total today:</span>
        <span style="color:var(--accent);font-weight:700;" id="total-study-time">0 min</span>
      </div>
    </div>
  </div>
</div>`;

  pomodoroSeconds = 25 * 60;
  pomodoroMode = 'study';
  pomodoroRunning = false;
  updatePomodoroDisplay();
}

let pomodoroSessions = 0;
let studyLog = [];

function togglePomodoro() {
  if (pomodoroRunning) {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
    document.getElementById('pomo-btn').textContent = t('startTimer');
  } else {
    pomodoroRunning = true;
    document.getElementById('pomo-btn').textContent = t('stopTimer');
    pomodoroInterval = setInterval(async () => {
      pomodoroSeconds--;
      updatePomodoroDisplay();
      if (pomodoroSeconds <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        if (pomodoroMode === 'study') {
          pomodoroSessions++;
          const subject = document.getElementById('pomo-subject')?.value || 'General';
          const duration = 25;
          studyLog.push({ subject, duration, time: new Date().toLocaleTimeString() });
          await API.post('/api/student/study-session', { subject, duration });
          showToast('Study session complete! Take a 5-min break.', 'success');
          pomodoroMode = 'break';
          pomodoroSeconds = 5 * 60;
          updateStudyLog();
        } else {
          showToast('Break over! Ready to study again?', 'info');
          pomodoroMode = 'study';
          pomodoroSeconds = 25 * 60;
        }
        document.getElementById('pomo-btn').textContent = t('startTimer');
        updatePomodoroDisplay();
      }
    }, 1000);
  }
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  pomodoroSeconds = 25 * 60;
  pomodoroMode = 'study';
  updatePomodoroDisplay();
  const btn = document.getElementById('pomo-btn');
  if (btn) btn.textContent = t('startTimer');
}

function updatePomodoroDisplay() {
  const mins = Math.floor(pomodoroSeconds / 60);
  const secs = pomodoroSeconds % 60;
  const timeEl = document.getElementById('pomo-time');
  const labelEl = document.getElementById('pomo-label');
  const progressEl = document.getElementById('pomo-progress');
  const sessEl = document.getElementById('pomo-sessions');
  const circleEl = document.getElementById('pomo-circle');
  if (timeEl) timeEl.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  if (labelEl) labelEl.textContent = pomodoroMode === 'study' ? 'Study Time' : 'Break Time';
  if (progressEl) {
    const total = pomodoroMode === 'study' ? 25*60 : 5*60;
    progressEl.style.width = `${((total - pomodoroSeconds) / total) * 100}%`;
    progressEl.style.background = pomodoroMode === 'study' ? 'var(--accent)' : '#66BB6A';
  }
  if (circleEl) circleEl.style.borderColor = pomodoroMode === 'study' ? 'var(--accent)' : '#66BB6A';
  if (sessEl) sessEl.textContent = `Sessions: ${pomodoroSessions}`;
}

function updateStudyLog() {
  const el = document.getElementById('study-log-list');
  if (!el) return;
  const total = studyLog.reduce((s, x) => s + x.duration, 0);
  el.innerHTML = studyLog.map(s => `
<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(139,94,60,0.2);font-size:0.85rem;">
  <span>${s.subject}</span>
  <span style="color:var(--accent);">${s.duration} min · ${s.time}</span>
</div>`).join('');
  const totalEl = document.getElementById('total-study-time');
  if (totalEl) totalEl.textContent = total + ' min';
}

async function renderStudentAnalytics(el) {
  const data = await API.get('/api/student/analytics');
  const sessions = data.sessions || [];
  const results = data.results || [];
  const student = data.student || {};

  const subjectMap = {};
  sessions.forEach(s => { subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.total; });
  const topSubjects = Object.entries(subjectMap).sort((a,b) => b[1]-a[1]).slice(0,6);
  const maxTime = topSubjects.length ? Math.max(...topSubjects.map(x=>x[1])) : 1;

  const weakSubjects = results.filter(r => r.avg_score < 60).map(r => r.subject);
  const strongSubjects = results.filter(r => r.avg_score >= 80).map(r => r.subject);

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.analytics} ${t('analytics')}</h2>
<div class="stats-grid" style="margin-bottom:24px;">
  <div class="stat-card"><div class="stat-value">${student.points||0}</div><div class="stat-label">${t('points')}</div></div>
  <div class="stat-card"><div class="stat-value">${student.streak||0}</div><div class="stat-label">${t('streak')} 🔥</div></div>
  <div class="stat-card"><div class="stat-value">${student.reward_minutes||0}</div><div class="stat-label">Reward Mins</div></div>
  <div class="stat-card"><div class="stat-value">${results.length}</div><div class="stat-label">Subjects Tracked</div></div>
</div>

<div class="chart-wrap">
  <h4 style="color:var(--accent);margin-bottom:14px;">Study Time by Subject (minutes)</h4>
  ${topSubjects.length === 0
    ? `<p style="color:rgba(245,245,245,0.4);text-align:center;padding:20px;">No study sessions recorded yet. Use the Study Timer!</p>`
    : `<div class="chart-bars">
        ${topSubjects.map(([subj, mins]) => `
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="height:${Math.round((mins/maxTime)*100)}px;" title="${mins} min"></div>
          <div class="chart-bar-label">${subj.slice(0,4)}</div>
        </div>`).join('')}
      </div>`}
</div>

<div class="grid-2" style="margin-top:20px;">
  <div class="card-dark">
    <h4 style="color:#66BB6A;margin-bottom:12px;">Strong Subjects</h4>
    ${strongSubjects.length === 0
      ? `<p style="color:rgba(245,245,245,0.4);font-size:0.85rem;">No data yet</p>`
      : strongSubjects.map(s => `<div style="padding:6px 0;border-bottom:1px solid rgba(139,94,60,0.2);font-size:0.88rem;">✓ ${s}</div>`).join('')}
  </div>
  <div class="card-dark">
    <h4 style="color:#EF5350;margin-bottom:12px;">Needs Improvement</h4>
    ${weakSubjects.length === 0
      ? `<p style="color:rgba(245,245,245,0.4);font-size:0.85rem;">All subjects looking good!</p>`
      : weakSubjects.map(s => `
      <div style="padding:6px 0;border-bottom:1px solid rgba(139,94,60,0.2);font-size:0.88rem;">
        ⚠ ${s}
        <button class="btn btn-sm btn-secondary" style="float:right;font-size:0.7rem;" onclick="switchStudentTab('challenges')">Practice</button>
      </div>`).join('')}
  </div>
</div>

${weakSubjects.length > 0 ? `
<div style="background:rgba(196,154,108,0.1);border:1px solid var(--accent);border-radius:8px;padding:16px;margin-top:20px;">
  <h4 style="color:var(--accent);margin-bottom:8px;">AI Study Coach Suggestion</h4>
  <p style="font-size:0.88rem;color:rgba(245,245,245,0.7);">You need more practice in <strong>${weakSubjects.join(', ')}</strong>. Try the Challenges section for targeted learning, or ask Athena for study tips!</p>
  <div style="display:flex;gap:10px;margin-top:10px;">
    <button class="btn btn-primary btn-sm" onclick="switchStudentTab('challenges')">Go to Challenges</button>
    <button class="btn btn-secondary btn-sm" onclick="toggleAI()">Ask Athena</button>
  </div>
</div>` : ''}`;
}

async function renderStudentGames(el) {
  const rewardData = await API.get('/api/student/reward-status');
  const unlocked = rewardData.active;
  const minsLeft = rewardData.minutesLeft || 0;

  const games = [
    { id:'quiz', name:'Subject Quiz', desc:'Test your knowledge across subjects', emoji:'🧠', subject:'All' },
    { id:'scramble', name:'Word Scramble', desc:'Unscramble academic vocabulary', emoji:'🔤', subject:'English' },
    { id:'memory', name:'Memory Match', desc:'Match pairs of science concepts', emoji:'🃏', subject:'Science' },
    { id:'flashcard', name:'Flashcards', desc:'Review key terms and definitions', emoji:'📇', subject:'All' },
    { id:'math', name:'Math Challenge', desc:'Solve arithmetic problems fast', emoji:'➕', subject:'Mathematics' },
    { id:'colorsort', name:'Color Sort', desc:'Sort colored liquids into tubes', emoji:'🎨', subject:'Art' },
    { id:'spelling', name:'Spelling Bee', desc:'Spell words correctly under time pressure', emoji:'🐝', subject:'English' },
    { id:'trivia', name:'Science Trivia', desc:'Answer science questions to earn points', emoji:'🔬', subject:'Science' }
  ];

  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
  <h2 class="text-accent">${Icons.games||'🎮'} ${t('games')}</h2>
  ${unlocked
    ? `<span class="badge badge-success">${Icons.unlock} ${minsLeft} min left</span>`
    : `<span class="badge badge-warning">${Icons.lock} Complete tasks to unlock</span>`}
</div>
${!unlocked ? `
<div style="background:rgba(196,154,108,0.1);border:1px solid var(--accent);border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
  <p style="color:var(--accent);font-weight:700;margin-bottom:6px;">Games are locked</p>
  <p style="font-size:0.85rem;color:rgba(245,245,245,0.6);">Complete tasks or quizzes to earn reward time and unlock games.</p>
  <button class="btn btn-primary btn-sm" style="margin-top:10px;" onclick="switchStudentTab('tasks')">Go to Tasks</button>
</div>` : ''}
<div class="games-grid">
  ${games.map(g => `
  <div class="game-card ${!unlocked ? 'locked' : ''}" onclick="${unlocked ? `launchGame('${g.id}')` : 'showToast(\"Complete tasks to unlock games!\",\"warning\")'}">
    ${!unlocked ? `<div class="game-lock">${Icons.lock}</div>` : ''}
    <div class="game-icon">${g.emoji}</div>
    <div class="game-name">${g.name}</div>
    <div class="game-desc">${g.desc}</div>
    <div style="margin-top:8px;"><span class="badge badge-accent" style="font-size:0.7rem;">${g.subject}</span></div>
  </div>`).join('')}
</div>`;
}


// ===== FOCUS MODE =====
let focusModeActive = false;
let suppressedNotifications = [];

function toggleFocusMode() {
  focusModeActive = !focusModeActive;
  
  const sidebar = document.getElementById('student-sidebar');
  const notifWrap = document.getElementById('notif-btn-wrap');
  const langToggle = document.querySelector('.lang-toggle');
  const focusBtn = document.getElementById('focus-mode-btn');
  const topbarTitle = document.querySelector('.topbar-title');
  
  if (focusModeActive) {
    // Enter focus mode
    if (sidebar) sidebar.style.display = 'none';
    if (notifWrap) notifWrap.style.display = 'none';
    if (langToggle) langToggle.style.display = 'none';
    if (focusBtn) {
      focusBtn.textContent = '🎯';
      focusBtn.title = 'Exit Focus Mode';
      focusBtn.style.background = 'var(--accent)';
      focusBtn.style.color = 'var(--text-dark)';
      focusBtn.style.borderRadius = '8px';
      focusBtn.style.padding = '4px 10px';
    }
    
    // Add exit focus mode button to topbar
    const topbar = document.querySelector('.topbar');
    if (topbar && !document.getElementById('exit-focus-btn')) {
      const exitBtn = document.createElement('button');
      exitBtn.id = 'exit-focus-btn';
      exitBtn.className = 'btn btn-secondary btn-sm';
      exitBtn.textContent = 'Exit Focus Mode';
      exitBtn.onclick = toggleFocusMode;
      exitBtn.style.marginLeft = '8px';
      topbar.appendChild(exitBtn);
    }
    
    // Switch to timer tab for focus mode
    switchStudentTab('timer');
    
    showToast('Focus Mode activated. Notifications suppressed.', 'info');
  } else {
    // Exit focus mode
    if (sidebar) sidebar.style.display = '';
    if (notifWrap) notifWrap.style.display = '';
    if (langToggle) langToggle.style.display = '';
    if (focusBtn) {
      focusBtn.textContent = '🎯';
      focusBtn.title = 'Focus Mode';
      focusBtn.style.background = '';
      focusBtn.style.color = '';
      focusBtn.style.borderRadius = '';
      focusBtn.style.padding = '';
    }
    
    document.getElementById('exit-focus-btn')?.remove();
    
    // Show any suppressed notifications
    if (suppressedNotifications.length > 0) {
      showToast(`${suppressedNotifications.length} notification(s) received while in Focus Mode`, 'info');
      suppressedNotifications = [];
    }
    
    showToast('Focus Mode deactivated.', 'success');
  }
}

// Override showToast to suppress notifications in focus mode
const _originalShowToast = typeof showToast === 'function' ? showToast : null;
function showNotificationInFocusMode(title, body) {
  if (focusModeActive) {
    suppressedNotifications.push({ title, body, time: new Date() });
    return; // Suppress popup
  }
  // Normal notification display
}


// ===== GRADE LEVEL DIFFERENTIATION =====
function getGradeLevel(grade) {
  if (!grade) return 'secondary';
  const num = parseInt(grade.replace(/\D/g, '')) || 0;
  return num <= 6 ? 'primary' : 'secondary';
}

function isPrimaryStudent() {
  return getGradeLevel(AppState?.user?.grade) === 'primary';
}

// ===== MOVIE SECTION =====
async function renderStudentMovies(el) {
  const data = await API.get('/api/student/movies');
  const movies = data.movies || [];
  
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.film} ${t('movies')}</h2>
${movies.length === 0 ? `
<div class="empty-state">
  <div style="font-size:3rem;margin-bottom:12px;">${Icons.film}</div>
  <p>No movies available yet. Check back later!</p>
</div>` : `
<div class="movies-grid">
  ${movies.map(m => `
  <div class="movie-card" onclick="playMovie('${m.file_url}', '${m.title.replace(/'/g, "\\'")}')">
    <div class="movie-thumbnail">
      ${m.thumbnail ? `<img src="${m.thumbnail}" alt="${m.title}" />` : `<div class="movie-thumb-placeholder">${Icons.play}</div>`}
      <div class="movie-play-overlay">${Icons.play}</div>
    </div>
    <div class="movie-info">
      <div class="movie-title">${m.title}</div>
      <div class="movie-genre">${m.genre || 'Educational'}</div>
    </div>
  </div>`).join('')}
</div>`}`;
}

function playMovie(url, title) {
  openModal(`
<div style="text-align:center;">
  <h3 class="modal-title">${title}</h3>
  <video controls autoplay style="width:100%;max-height:400px;border-radius:8px;background:#000;" src="${url}">
    Your browser does not support video playback.
  </video>
  <div class="modal-actions" style="margin-top:12px;">
    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
  </div>
</div>`);
}

// ===== DUOLINGO-STYLE CHALLENGE SECTION =====
async function renderStudentChallenges(el) {
  const data = await API.get('/api/student/learning-paths');
  const paths = data.paths || [];
  
  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.challenges} ${t('challengeSection')}</h2>
<div class="challenge-paths">
  ${paths.length === 0 ? `
  <div class="empty-state">
    <p>No learning paths available. Set your interests in your profile to see personalized paths!</p>
    <button class="btn btn-primary" onclick="switchStudentTab('profile')">Set Interests</button>
  </div>` : paths.map(p => `
  <div class="challenge-path-card" onclick="openLearningPath(${p.id}, '${p.title.replace(/'/g, "\\'")}')">
    <div class="path-header">
      <div class="path-icon">${Icons.challenges}</div>
      <div class="path-info">
        <div class="path-title">${p.title}</div>
        <div class="path-interest">${p.interest} · Level ${p.level}</div>
      </div>
      <div class="path-progress-circle">
        <span>${p.progressPct}%</span>
      </div>
    </div>
    <div class="path-progress-bar">
      <div class="path-progress-fill" style="width:${p.progressPct}%"></div>
    </div>
    <div class="path-meta">
      <span>${p.completedLessons}/${p.totalLessons} lessons</span>
      <span>${p.progressPct === 100 ? '✓ Complete' : 'In Progress'}</span>
    </div>
  </div>`).join('')}
</div>`;
}

async function openLearningPath(pathId, title) {
  const data = await API.get(`/api/student/learning-paths/${pathId}/lessons`);
  const lessons = data.lessons || [];
  
  openModal(`
<div>
  <h3 class="modal-title">${title}</h3>
  <div class="lessons-list">
    ${lessons.map((l, i) => `
    <div class="lesson-item ${l.completed ? 'completed' : ''}" onclick="${l.completed ? '' : `startLesson(${l.id}, ${pathId}, '${l.title.replace(/'/g, "\\'")}', '${l.content?.replace(/'/g, "\\'").substring(0, 100) || ''}', '${l.video_url || ''}')`}">
      <div class="lesson-num">${l.completed ? Icons.check : i + 1}</div>
      <div class="lesson-info">
        <div class="lesson-title">${l.title}</div>
        <div class="lesson-xp">+${l.xp_reward || 10} XP</div>
      </div>
      ${l.completed ? '<div class="lesson-done">Done</div>' : '<div class="lesson-start">Start</div>'}
    </div>`).join('')}
  </div>
  <div class="modal-actions">
    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
  </div>
</div>`);
}

async function startLesson(lessonId, pathId, title, content, videoUrl) {
  closeModal();
  openModal(`
<div>
  <h3 class="modal-title">${title}</h3>
  ${videoUrl ? `<video controls style="width:100%;max-height:300px;border-radius:8px;background:#000;margin-bottom:16px;" src="${videoUrl}"></video>` : ''}
  ${content ? `<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;margin-bottom:16px;font-size:0.9rem;line-height:1.6;color:rgba(245,245,245,0.85);">${content}</div>` : ''}
  <div class="modal-actions">
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="completeLesson(${lessonId}, ${pathId})">Mark Complete & Earn XP</button>
  </div>
</div>`);
}

async function completeLesson(lessonId, pathId) {
  const res = await API.post('/api/student/lesson-complete', { lessonId, pathId });
  if (res.success) {
    closeModal();
    showToast(`Lesson complete! +${res.xpEarned} XP earned`, 'success');
    renderStudentChallenges(document.getElementById('student-content'));
  } else {
    showToast('Failed to complete lesson', 'error');
  }
}
