
// ===== TEACHER PORTAL =====
let teacherData = {};
let teacherActiveTab = 'dashboard';
let selectedStudent = null;

async function renderTeacherPortal() {
  const page = document.getElementById('page-teacher');
  const data = await API.get('/api/teacher/dashboard');
  if (!data.success) { showToast('Session expired', 'error'); showPage('auth','login'); return; }
  teacherData = data;
  const u = data.teacher;

  page.innerHTML = `
<div class="portal-layout">
  <div class="sidebar-overlay" onclick="closeSidebar()"></div>
  <aside class="sidebar" id="teacher-sidebar">
    <div class="sidebar-logo"><h2>Academia Connect</h2><p>${t('portalTeacher')}</p></div>
    <nav class="sidebar-nav">
      <div class="nav-section-title">Main</div>
      ${tNavItem('dashboard','home',t('dashboard'))}
      ${tNavItem('students','students',t('students'))}
      ${tNavItem('assessment','results','Assessment')}
      ${tNavItem('attendance','attendance',t('attendance'))}
      <div class="nav-section-title">Content</div>
      ${tNavItem('quizzes','quiz',t('quiz'))}
      ${tNavItem('videos','videos',t('videos'))}
      ${tNavItem('materials','notes','Materials')}
      ${tNavItem('competitions','challenges','Competitions')}
      <div class="nav-section-title">Communication</div>
      ${tNavItem('chat','messages',t('messages'))}
      ${tNavItem('announcements','bell','Announcements')}
      ${tNavItem('events','attendance','Events')}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${initials(u.full_name)}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${u.full_name}</div>
          <div class="sidebar-user-role">Teacher · ${u.employee_id}</div>
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
      <button class="hamburger" onclick="openSidebar('teacher-sidebar')">${Icons.menu}</button>
      <span class="topbar-title" id="teacher-page-title">${t('dashboard')}</span>
      <div class="topbar-actions">
        <div class="lang-toggle">
          <button class="lang-btn ${currentLang==='en'?'active':''}" data-lang="en" onclick="setLang('en');renderTeacherPortal()">EN</button>
          <button class="lang-btn ${currentLang==='am'?'active':''}" data-lang="am" onclick="setLang('am');renderTeacherPortal()">አማ</button>
        </div>
        <div class="notif-btn" onclick="toggleNotifPanel()">
          ${Icons.bell}
          ${(data.notifications||[]).filter(n=>!n.read_status).length > 0 ? `<span class="notif-badge">${data.notifications.filter(n=>!n.read_status).length}</span>` : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="handleLogout()" title="${t('logout')}" style="padding:6px 10px;">${Icons.logout}</button>
      </div>
    </div>
    <div id="teacher-content"></div>
  </main>
  <div class="notif-panel" id="notif-panel">
    <div class="notif-panel-header">
      <span style="font-weight:700;color:var(--accent);">${t('notifications')}</span>
      <button onclick="markAllRead();toggleNotifPanel()" class="btn btn-sm btn-secondary">${t('markAllRead')}</button>
    </div>
    <div class="notif-list">${renderNotifList(data.notifications||[])}</div>
  </div>
</div>`;

  switchTeacherTab(teacherActiveTab);
}

function tNavItem(tab, icon, label) {
  return `<div class="nav-item ${teacherActiveTab===tab?'active':''}" onclick="switchTeacherTab('${tab}')">${Icons[icon]||''} ${label}</div>`;
}

function switchTeacherTab(tab) {
  teacherActiveTab = tab;
  document.querySelectorAll('#teacher-sidebar .nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('onclick')?.includes(`'${tab}'`));
  });
  const title = document.getElementById('teacher-page-title');
  if (title) title.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
  const content = document.getElementById('teacher-content');
  if (!content) return;
  switch(tab) {
    case 'dashboard':     renderTeacherDashboard(content); break;
    case 'students':      renderTeacherStudents(content); break;
    case 'assessment':    renderTeacherAssessment(content); break;
    case 'attendance':    renderTeacherAttendance(content); break;
    case 'quizzes':       renderTeacherQuizzes(content); break;
    case 'videos':        renderTeacherVideos(content); break;
    case 'materials':     renderTeacherMaterials(content); break;
    case 'competitions':  renderTeacherCompetitions(content); break;
    case 'chat':          renderTeacherChat(content); break;
    case 'announcements': renderTeacherAnnouncements(content); break;
    case 'events':        renderTeacherEvents(content); break;
    default: renderTeacherDashboard(content);
  }
}

function renderTeacherDashboard(el) {
  const u = teacherData.teacher;
  const students = teacherData.students || [];
  const announcements = teacherData.announcements || [];
  const subjects = JSON.parse(u.subjects || '[]');

  el.innerHTML = `
<div class="welcome-banner">
  <div class="welcome-text">
    <h2>${t('welcome')}, ${u.full_name}!</h2>
    <p>Employee ID: ${u.employee_id} &nbsp;|&nbsp; ${subjects.join(', ') || 'No subjects set'}</p>
    <p class="welcome-quote">"${getMotivationalQuote()}"</p>
  </div>
  <div class="welcome-stats">
    <div class="welcome-stat"><div class="welcome-stat-val">${students.length}</div><div class="welcome-stat-lbl">${t('students')}</div></div>
  </div>
</div>
<div class="grid-2" style="margin-bottom:24px;">
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.students} Quick Student Search</h3>
    <div class="search-bar">
      ${Icons.search}
      <input type="text" id="quick-search" placeholder="Search students..." oninput="quickSearchStudents(this.value)">
    </div>
    <div id="quick-search-results">
      ${students.slice(0,5).map(s => renderStudentRow(s)).join('')}
    </div>
  </div>
  <div>
    <h3 class="text-accent" style="margin-bottom:12px;">${Icons.bell} ${t('announcements')}</h3>
    ${announcements.slice(0,3).map(a => `
    <div class="announcement-item">
      <div class="announcement-title">${a.title}</div>
      <div class="announcement-body">${a.content}</div>
      <div class="announcement-meta">${formatDate(a.created_at)}</div>
    </div>`).join('') || `<div class="empty-state"><p>No announcements</p></div>`}
  </div>
</div>`;
}

function renderStudentRow(s) {
  return `
<div class="student-search-result" onclick="selectStudentForAssessment(${JSON.stringify(s).replace(/"/g,'&quot;')})">
  <div class="student-avatar-sm">${initials(s.full_name)}</div>
  <div class="student-info-sm">
    <div class="student-name-sm">${s.full_name}</div>
    <div class="student-grade-sm">${s.grade || ''} ${s.section || ''} · Parent: ${s.parent_name || '—'}</div>
  </div>
  <div>${Icons.chevronRight}</div>
</div>`;
}

function quickSearchStudents(q) {
  const students = teacherData.students || [];
  const filtered = q ? students.filter(s => s.full_name.toLowerCase().includes(q.toLowerCase()) || (s.grade||'').toLowerCase().includes(q.toLowerCase())) : students.slice(0,5);
  const el = document.getElementById('quick-search-results');
  if (el) el.innerHTML = filtered.length === 0 ? `<div class="empty-state"><p>No students found</p></div>` : filtered.map(s => renderStudentRow(s)).join('');
}

function selectStudentForAssessment(student) {
  selectedStudent = student;
  switchTeacherTab('assessment');
}

async function renderTeacherStudents(el) {
  const data = await API.get('/api/teacher/students');
  const students = data.students || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.students} ${t('students')}</h2>
  <span class="badge badge-accent">${students.length} students</span>
</div>
<div class="search-bar">
  ${Icons.search}
  <input type="text" id="student-search-input" placeholder="${t('search')} students..." oninput="filterStudentList(this.value)">
</div>
<div id="student-list">
  ${students.length === 0
    ? `<div class="empty-state"><p>No students in your school yet</p></div>`
    : students.map(s => `
  <div class="student-search-result">
    <div class="student-avatar-sm">${getAvatarEmoji(s.avatar)||initials(s.full_name)}</div>
    <div class="student-info-sm" style="flex:1;">
      <div class="student-name-sm">${s.full_name}</div>
      <div class="student-grade-sm">${s.grade||''} ${s.section||''} · ${s.email}</div>
      <div class="student-grade-sm">Parent: ${s.parent_name||'—'} · ${s.parent_contact||'—'}</div>
    </div>
    <div style="display:flex;gap:6px;">
      <button class="btn btn-primary btn-sm" onclick="selectStudentForAssessment(${JSON.stringify(s).replace(/"/g,'&quot;')})">Assess</button>
      <button class="btn btn-secondary btn-sm" onclick="openTeacherChatWith(${s.id},'${s.full_name}','student')">Chat</button>
    </div>
  </div>`).join('')}
</div>`;
}

function filterStudentList(q) {
  document.querySelectorAll('#student-list .student-search-result').forEach(el => {
    const name = el.querySelector('.student-name-sm')?.textContent || '';
    el.style.display = name.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

async function renderTeacherAssessment(el) {
  const subjectsData = await API.get('/api/teacher/subjects');
  const subjects = subjectsData.subjects || [];

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:20px;">${Icons.results} Assessment</h2>
${selectedStudent ? `
<div style="background:rgba(196,154,108,0.1);border:1px solid var(--accent);border-radius:8px;padding:14px;margin-bottom:20px;display:flex;align-items:center;gap:12px;">
  <div class="student-avatar-sm">${initials(selectedStudent.full_name)}</div>
  <div style="flex:1;">
    <div style="font-weight:700;color:var(--accent);">${selectedStudent.full_name}</div>
    <div style="font-size:0.78rem;color:rgba(245,245,245,0.5);">${selectedStudent.grade||''} ${selectedStudent.section||''}</div>
  </div>
  <button class="btn btn-secondary btn-sm" onclick="selectedStudent=null;renderTeacherAssessment(document.getElementById('teacher-content'))">Change Student</button>
</div>` : `
<div style="background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:20px;">
  <p style="color:rgba(245,245,245,0.6);margin-bottom:10px;">Select a student first:</p>
  <div class="search-bar">
    ${Icons.search}
    <input type="text" id="assess-search" placeholder="Search student..." oninput="searchForAssessment(this.value)">
  </div>
  <div id="assess-search-results"></div>
</div>`}

<div class="assessment-form">
  <h3 style="color:var(--accent);margin-bottom:16px;">New Assessment</h3>
  <form onsubmit="submitAssessment(event)">
    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label-light">${t('subject')} *</label>
        <div style="display:flex;gap:8px;">
          <select class="form-control form-control-dark" id="assess-subject" style="flex:1;" required>
            <option value="">Select subject</option>
            ${subjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('')}
          </select>
          <button type="button" class="btn btn-secondary btn-sm" onclick="showAddSubjectModal()">${Icons.plus}</button>
        </div>
        ${subjects.length === 0 ? `<p class="form-hint" style="color:var(--warning);">${t('noSubjects')}</p>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label form-label-light">Assessment Type *</label>
        <select class="form-control form-control-dark" id="assess-type" required>
          ${['Test 1 / Quiz','Test 2','Test 3','Midterm Exam','Final Exam','Assignment 1','Assignment 2','Project','Class Participation'].map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label-light">Date</label>
        <input type="date" class="form-control form-control-dark" id="assess-date" value="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="form-group">
        <label class="form-label form-label-light">Max Marks *</label>
        <input type="number" class="form-control form-control-dark" id="assess-max" placeholder="e.g. 100" min="1" required oninput="calcGrade()">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label form-label-light">Marks Obtained *</label>
        <input type="number" class="form-control form-control-dark" id="assess-marks" placeholder="e.g. 85" min="0" required oninput="calcGrade()">
      </div>
      <div class="form-group">
        <label class="form-label form-label-light">Auto-calculated</label>
        <div class="marks-display" id="marks-display" style="display:none;">
          <div class="marks-pct" id="marks-pct">—</div>
          <div class="marks-grade ${gradeColor('')}" id="marks-grade">—</div>
        </div>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Comments / Feedback</label>
      <textarea class="form-control form-control-dark" id="assess-comments" placeholder="Feedback for student and parent..."></textarea>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Topics Covered</label>
      <input type="text" class="form-control form-control-dark" id="assess-topics" placeholder="e.g. Chapter 3, Algebra">
    </div>
    <div style="display:flex;gap:10px;margin-top:8px;">
      <button type="submit" class="btn btn-primary" style="flex:1;">Submit Assessment</button>
      <button type="submit" class="btn btn-secondary" id="send-parent-btn" onclick="document.getElementById('send-to-parent').value='1'">Submit & Notify Parent</button>
    </div>
    <input type="hidden" id="send-to-parent" value="0">
  </form>
</div>

${selectedStudent ? `
<div style="margin-top:24px;">
  <h3 class="text-accent" style="margin-bottom:12px;">Previous Assessments</h3>
  <div id="prev-assessments"><div style="text-align:center;color:rgba(245,245,245,0.4);padding:20px;">Loading...</div></div>
</div>` : ''}`;

  if (selectedStudent) loadPrevAssessments(selectedStudent.id);
}

async function loadPrevAssessments(studentId) {
  const data = await API.get('/api/teacher/assessments/' + studentId);
  const el = document.getElementById('prev-assessments');
  if (!el) return;
  const results = data.results || [];
  el.innerHTML = results.length === 0
    ? `<div class="empty-state"><p>No assessments yet for this student</p></div>`
    : `<div class="table-card"><table>
        <thead><tr><th>Subject</th><th>Type</th><th>Date</th><th>Marks</th><th>Grade</th><th>Comments</th></tr></thead>
        <tbody>
          ${results.map(r => `
          <tr>
            <td>${r.subject}</td><td>${r.assessment_type}</td><td>${formatDate(r.date)}</td>
            <td>${r.marks_obtained}/${r.max_marks} (${r.percentage}%)</td>
            <td><span class="result-grade ${gradeColor(r.grade)}" style="width:28px;height:28px;font-size:0.75rem;display:inline-flex;align-items:center;justify-content:center;">${r.grade}</span></td>
            <td style="font-size:0.78rem;color:rgba(245,245,245,0.5);">${r.comments||'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>`;
}

function calcGrade() {
  const max = parseFloat(document.getElementById('assess-max')?.value);
  const marks = parseFloat(document.getElementById('assess-marks')?.value);
  if (!max || !marks) return;
  const pct = Math.round((marks / max) * 100);
  const grade = pct>=90?'A+':pct>=80?'A':pct>=70?'B+':pct>=60?'B':pct>=50?'C':pct>=40?'D':'F';
  const display = document.getElementById('marks-display');
  const pctEl = document.getElementById('marks-pct');
  const gradeEl = document.getElementById('marks-grade');
  if (display) display.style.display = 'flex';
  if (pctEl) pctEl.textContent = pct + '%';
  if (gradeEl) { gradeEl.textContent = grade; gradeEl.className = `marks-grade ${gradeColor(grade)}`; }
}

function searchForAssessment(q) {
  const students = teacherData.students || [];
  const filtered = q ? students.filter(s => s.full_name.toLowerCase().includes(q.toLowerCase())) : [];
  const el = document.getElementById('assess-search-results');
  if (!el) return;
  el.innerHTML = filtered.slice(0,5).map(s => `
  <div class="student-search-result" style="margin-top:6px;" onclick="selectedStudent=${JSON.stringify(s).replace(/"/g,'&quot;')};renderTeacherAssessment(document.getElementById('teacher-content'))">
    <div class="student-avatar-sm">${initials(s.full_name)}</div>
    <div class="student-info-sm"><div class="student-name-sm">${s.full_name}</div><div class="student-grade-sm">${s.grade||''}</div></div>
  </div>`).join('');
}

async function submitAssessment(e) {
  e.preventDefault();
  if (!selectedStudent) { showToast('Please select a student first', 'error'); return; }
  const payload = {
    student_id: selectedStudent.id,
    subject: document.getElementById('assess-subject').value,
    assessment_type: document.getElementById('assess-type').value,
    date: document.getElementById('assess-date').value,
    max_marks: parseFloat(document.getElementById('assess-max').value),
    marks_obtained: parseFloat(document.getElementById('assess-marks').value),
    comments: document.getElementById('assess-comments').value,
    topics: document.getElementById('assess-topics').value
  };
  if (!payload.subject) { showToast('Please select a subject', 'error'); return; }
  const res = await API.post('/api/teacher/assessment', payload);
  if (res.success) {
    showToast(`Assessment saved! Grade: ${res.grade} (${res.percentage}%)`, 'success');
    e.target.reset();
    document.getElementById('marks-display').style.display = 'none';
    document.getElementById('send-to-parent').value = '0';
    loadPrevAssessments(selectedStudent.id);
  } else showToast(res.message || 'Failed', 'error');
}

function showAddSubjectModal() {
  openModal(`
<h3 class="modal-title">${t('addSubject')}</h3>
<form onsubmit="addSubject(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Subject Name *</label>
    <input type="text" class="form-control form-control-dark" id="new-subject-name" placeholder="e.g. Mathematics" required>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">${t('addSubject')}</button>
  </div>
</form>`);
}

async function addSubject(e) {
  e.preventDefault();
  const name = document.getElementById('new-subject-name').value.trim();
  const res = await API.post('/api/teacher/subjects', { name });
  if (res.success) { closeModal(); showToast('Subject added!', 'success'); renderTeacherAssessment(document.getElementById('teacher-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderTeacherAttendance(el) {
  const students = teacherData.students || [];
  const today = new Date().toISOString().split('T')[0];
  const attendance = {};
  students.forEach(s => { attendance[s.id] = 'Present'; });

  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.attendance} ${t('attendance')}</h2>
  <div style="display:flex;gap:8px;align-items:center;">
    <input type="date" class="form-control form-control-dark" id="att-date" value="${today}" style="width:160px;">
    <button class="btn btn-primary" onclick="markAllAttendance('Present')">All Present</button>
    <button class="btn btn-danger btn-sm" onclick="markAllAttendance('Absent')">All Absent</button>
  </div>
</div>
<div class="attendance-grid" id="att-grid">
  ${students.length === 0
    ? `<div class="empty-state"><p>No students found</p></div>`
    : students.map(s => `
  <div class="attendance-row" id="att-row-${s.id}">
    <div class="student-avatar-sm" style="width:32px;height:32px;font-size:0.78rem;">${initials(s.full_name)}</div>
    <div class="attendance-name">${s.full_name} <span style="font-size:0.72rem;color:rgba(245,245,245,0.4);">${s.grade||''}</span></div>
    <div class="attendance-btns">
      ${['Present','Absent','Late','Excused'].map(status => `
      <button class="att-btn ${status==='Present'?'selected-present':''}" id="att-${s.id}-${status.toLowerCase()}"
        onclick="setAttendance(${s.id},'${status}')">${status}</button>`).join('')}
    </div>
  </div>`).join('')}
</div>
<div style="margin-top:20px;display:flex;gap:10px;">
  <button class="btn btn-primary" onclick="submitAttendance()">${t('markAttendance')}</button>
</div>`;
}

function setAttendance(studentId, status) {
  ['present','absent','late','excused'].forEach(s => {
    const btn = document.getElementById(`att-${studentId}-${s}`);
    if (btn) btn.className = `att-btn ${s === status.toLowerCase() ? 'selected-' + s : ''}`;
  });
}

function markAllAttendance(status) {
  const students = teacherData.students || [];
  students.forEach(s => setAttendance(s.id, status));
}

async function submitAttendance() {
  const students = teacherData.students || [];
  const date = document.getElementById('att-date')?.value || new Date().toISOString().split('T')[0];
  const records = students.map(s => {
    const statuses = ['Present','Absent','Late','Excused'];
    const status = statuses.find(st => document.getElementById(`att-${s.id}-${st.toLowerCase()}`)?.classList.contains('selected-' + st.toLowerCase())) || 'Present';
    return { student_id: s.id, date, status };
  });
  const res = await API.post('/api/teacher/attendance', { records });
  if (res.success) showToast('Attendance saved!', 'success');
  else showToast(res.message || 'Failed', 'error');
}

async function renderTeacherQuizzes(el) {
  const data = await API.get('/api/teacher/quizzes');
  const quizzes = data.quizzes || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.star} ${t('quiz')}</h2>
  <button class="btn btn-primary" onclick="showCreateQuizModal()">${Icons.plus} ${t('createQuiz')}</button>
</div>
<div class="grid-auto">
  ${quizzes.length === 0
    ? `<div class="empty-state"><p>No quizzes yet. Create your first quiz!</p></div>`
    : quizzes.map(q => {
        let questions = [];
        try { questions = JSON.parse(q.questions); } catch(e) {}
        return `
  <div class="card-dark">
    <h4 style="color:var(--accent);margin-bottom:6px;">${q.title}</h4>
    <p style="font-size:0.82rem;color:rgba(245,245,245,0.5);margin-bottom:8px;">${q.subject||'General'} · ${questions.length} questions · ${q.time_limit} min</p>
    <p style="font-size:0.78rem;color:rgba(245,245,245,0.4);">Reward: ${q.reward_minutes} min · ${formatDate(q.created_at)}</p>
  </div>`;
      }).join('')}
</div>`;
}

function showCreateQuizModal() {
  let questions = [{ question:'', options:['','','',''], correct:0 }];

  function renderQs() {
    return questions.map((q, qi) => `
<div class="quiz-question">
  <div class="quiz-question-header">
    <span style="color:var(--accent);font-weight:700;">Q${qi+1}</span>
    ${questions.length > 1 ? `<button type="button" class="btn btn-danger btn-sm" onclick="removeQ(${qi})">${Icons.trash}</button>` : ''}
  </div>
  <div class="form-group">
    <input type="text" class="form-control form-control-dark" placeholder="Question text" value="${q.question}"
      oninput="questions[${qi}].question=this.value">
  </div>
  <div class="quiz-options">
    ${q.options.map((o, oi) => `
    <div class="quiz-option-row">
      <input type="radio" name="correct-${qi}" ${q.correct===oi?'checked':''} onchange="questions[${qi}].correct=${oi}">
      <input type="text" class="form-control form-control-dark" placeholder="Option ${oi+1}" value="${o}"
        oninput="questions[${qi}].options[${oi}]=this.value" style="flex:1;">
    </div>`).join('')}
  </div>
</div>`).join('');
  }

  openModal(`
<h3 class="modal-title">${t('createQuiz')}</h3>
<form onsubmit="submitQuiz(event)">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Quiz Title *</label>
      <input type="text" class="form-control form-control-dark" id="quiz-title" placeholder="e.g. Chapter 3 Quiz" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Subject</label>
      <input type="text" class="form-control form-control-dark" id="quiz-subject" placeholder="e.g. Mathematics">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Time Limit (min)</label>
      <input type="number" class="form-control form-control-dark" id="quiz-time" value="30" min="5">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Reward Minutes</label>
      <input type="number" class="form-control form-control-dark" id="quiz-reward" value="30" min="5">
    </div>
  </div>
  <div id="quiz-questions-wrap">${renderQs()}</div>
  <button type="button" class="add-question-btn" onclick="addQuestion()">${Icons.plus} Add Question</button>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Create Quiz</button>
  </div>
</form>`);

  window.addQuestion = function() {
    questions.push({ question:'', options:['','','',''], correct:0 });
    document.getElementById('quiz-questions-wrap').innerHTML = renderQs();
  };
  window.removeQ = function(idx) {
    questions.splice(idx, 1);
    document.getElementById('quiz-questions-wrap').innerHTML = renderQs();
  };
}

async function submitQuiz(e) {
  e.preventDefault();
  const payload = {
    title: document.getElementById('quiz-title').value,
    subject: document.getElementById('quiz-subject').value,
    time_limit: parseInt(document.getElementById('quiz-time').value),
    reward_minutes: parseInt(document.getElementById('quiz-reward').value),
    questions: window.questions || []
  };
  if (!payload.questions.length) { showToast('Add at least one question', 'error'); return; }
  const res = await API.post('/api/teacher/quiz', payload);
  if (res.success) { closeModal(); showToast('Quiz created!', 'success'); renderTeacherQuizzes(document.getElementById('teacher-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderTeacherVideos(el) {
  const data = await API.get('/api/common/videos');
  const videos = data.videos || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.videos} ${t('videos')}</h2>
  <button class="btn btn-primary" onclick="showUploadVideoModal()">${Icons.upload} ${t('uploadVideo')}</button>
</div>
<div class="video-feed">
  ${videos.length === 0
    ? `<div class="empty-state"><p>No videos yet. Upload your first video!</p></div>`
    : videos.map(v => `
  <div class="video-card">
    <div class="video-thumb">
      ${v.file_url ? `<video controls src="${v.file_url}" style="width:100%;height:100%;object-fit:cover;"></video>` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#111;color:rgba(255,255,255,0.3);font-size:3rem;">▶</div>`}
    </div>
    <div class="video-info">
      <div class="video-title">${v.title}</div>
      <div class="video-meta">
        <span class="video-author">${v.uploader_name||'Teacher'} · ${timeAgo(v.created_at)}</span>
        <span class="badge ${v.approved?'badge-success':'badge-warning'}">${v.approved?'Published':'Pending'}</span>
      </div>
      ${v.description ? `<p style="font-size:0.82rem;color:rgba(245,245,245,0.5);margin-top:6px;">${v.description}</p>` : ''}
    </div>
  </div>`).join('')}
</div>`;
}

function showUploadVideoModal() {
  openModal(`
<h3 class="modal-title">${t('uploadVideo')}</h3>
<form onsubmit="uploadVideo(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="vid-title" placeholder="Video title" required>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Description</label>
    <textarea class="form-control form-control-dark" id="vid-desc" placeholder="What is this video about?"></textarea>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Video File *</label>
    <div class="upload-zone" onclick="document.getElementById('vid-file').click()">
      <div class="upload-icon">${Icons.upload}</div>
      <div class="upload-text">Click to select video</div>
      <div class="upload-hint">MP4, MOV, AVI · Max 100MB</div>
    </div>
    <input type="file" id="vid-file" accept="video/*" style="display:none;" onchange="document.querySelector('.upload-text').textContent=this.files[0]?.name||'Click to select video'">
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">${t('upload')}</button>
  </div>
</form>`);
}

async function uploadVideo(e) {
  e.preventDefault();
  const file = document.getElementById('vid-file').files[0];
  if (!file) { showToast('Please select a video file', 'error'); return; }
  const fd = new FormData();
  fd.append('video', file);
  fd.append('title', document.getElementById('vid-title').value);
  fd.append('description', document.getElementById('vid-desc').value);
  showToast('Uploading...', 'info');
  const res = await API.upload('/api/teacher/upload-video', fd);
  if (res.success) { closeModal(); showToast('Video uploaded!', 'success'); renderTeacherVideos(document.getElementById('teacher-content')); }
  else showToast(res.message || 'Upload failed', 'error');
}

async function renderTeacherMaterials(el) {
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.notes} Materials</h2>
  <button class="btn btn-primary" onclick="showUploadMaterialModal()">${Icons.upload} Upload Material</button>
</div>
<div class="empty-state"><p>Upload notes, PDFs, and documents for your students.</p></div>`;
}

function showUploadMaterialModal() {
  openModal(`
<h3 class="modal-title">Upload Material</h3>
<form onsubmit="uploadMaterial(event)">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Title *</label>
      <input type="text" class="form-control form-control-dark" id="mat-title" placeholder="Material title" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Subject</label>
      <input type="text" class="form-control form-control-dark" id="mat-subject" placeholder="e.g. Mathematics">
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">File *</label>
    <input type="file" class="form-control form-control-dark" id="mat-file" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" required>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">${t('upload')}</button>
  </div>
</form>`);
}

async function uploadMaterial(e) {
  e.preventDefault();
  const file = document.getElementById('mat-file').files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('title', document.getElementById('mat-title').value);
  fd.append('subject', document.getElementById('mat-subject').value);
  const res = await API.upload('/api/teacher/upload-material', fd);
  if (res.success) { closeModal(); showToast('Material uploaded!', 'success'); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderTeacherCompetitions(el) {
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.trophy} Competitions</h2>
  <button class="btn btn-primary" onclick="showCreateCompetitionModal()">${Icons.plus} Create Competition</button>
</div>
<div class="empty-state"><p>Create competitions to engage your students and reward top performers.</p></div>`;
}

function showCreateCompetitionModal() {
  openModal(`
<h3 class="modal-title">Create Competition</h3>
<form onsubmit="createCompetition(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="comp-title" placeholder="e.g. Math Olympiad" required>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Subject</label>
      <input type="text" class="form-control form-control-dark" id="comp-subject" placeholder="e.g. Mathematics">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Reward Points</label>
      <input type="number" class="form-control form-control-dark" id="comp-points" value="100" min="10">
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Start Date</label>
      <input type="date" class="form-control form-control-dark" id="comp-start">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">End Date</label>
      <input type="date" class="form-control form-control-dark" id="comp-end">
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Description</label>
    <textarea class="form-control form-control-dark" id="comp-desc" placeholder="Describe the competition..."></textarea>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Create</button>
  </div>
</form>`);
}

async function createCompetition(e) {
  e.preventDefault();
  const res = await API.post('/api/teacher/competition', {
    title: document.getElementById('comp-title').value,
    subject: document.getElementById('comp-subject').value,
    reward_points: parseInt(document.getElementById('comp-points').value),
    start_date: document.getElementById('comp-start').value,
    end_date: document.getElementById('comp-end').value,
    description: document.getElementById('comp-desc').value
  });
  if (res.success) { closeModal(); showToast('Competition created!', 'success'); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderTeacherChat(el) {
  const studentsData = await API.get('/api/teacher/students');
  const parentsData = await API.get('/api/teacher/parents');
  const students = studentsData.students || [];
  const parents = parentsData.parents || [];

  el.innerHTML = `
<h2 class="text-accent" style="margin-bottom:16px;">${Icons.messages} ${t('messages')}</h2>
<div class="chat-layout">
  <div class="chat-sidebar">
    <div class="chat-sidebar-header">Contacts</div>
    <div class="chat-list" id="teacher-chat-list">
      <div style="padding:8px 12px;font-size:0.72rem;text-transform:uppercase;color:rgba(245,245,245,0.35);">Students</div>
      ${students.slice(0,10).map(s => `
      <div class="chat-list-item" onclick="openTeacherChatWith(${s.id},'${s.full_name}','student')">
        <div class="chat-list-avatar">${initials(s.full_name)}</div>
        <div class="chat-list-info">
          <div class="chat-list-name">${s.full_name}</div>
          <div class="chat-list-preview">${s.grade||'Student'}</div>
        </div>
      </div>`).join('')}
      <div style="padding:8px 12px;font-size:0.72px;text-transform:uppercase;color:rgba(245,245,245,0.35);">Parents</div>
      ${parents.slice(0,10).map(p => `
      <div class="chat-list-item" onclick="openTeacherChatWith(${p.id},'${p.full_name}','parent')">
        <div class="chat-list-avatar" style="background:rgba(196,154,108,0.3);color:var(--accent);">${initials(p.full_name)}</div>
        <div class="chat-list-info">
          <div class="chat-list-name">${p.full_name}</div>
          <div class="chat-list-preview">Parent</div>
        </div>
      </div>`).join('')}
    </div>
  </div>
  <div class="chat-main" id="teacher-chat-main">
    <div class="chat-empty">${Icons.messages}<p>Select a contact to start chatting</p></div>
  </div>
</div>`;
}

async function openTeacherChatWith(contactId, contactName, contactRole) {
  const main = document.getElementById('teacher-chat-main');
  if (!main) return;
  main.innerHTML = `
<div class="chat-header">
  <div class="chat-header-avatar">${initials(contactName)}</div>
  <div><div class="chat-header-name">${contactName}</div><div class="chat-header-status">${contactRole}</div></div>
</div>
<div class="chat-messages" id="tchat-msgs-${contactId}">
  <div style="text-align:center;color:rgba(245,245,245,0.3);padding:20px;">Loading...</div>
</div>
<div class="chat-input-area">
  <div class="chat-input-wrap">
    <textarea class="chat-input" id="tchat-input-${contactId}" placeholder="${t('typeMessage')}" rows="1"
      onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendTeacherMsg(${contactId},'${contactRole}')}"></textarea>
  </div>
  <button class="chat-send-btn" onclick="sendTeacherMsg(${contactId},'${contactRole}')">${Icons.send}</button>
</div>`;
  const data = await API.get(`/api/teacher/messages?with_id=${contactId}&with_role=${contactRole}`);
  const msgs = data.messages || [];
  const container = document.getElementById('tchat-msgs-' + contactId);
  if (!container) return;
  container.innerHTML = msgs.length === 0
    ? `<div class="chat-empty"><p>${t('noMessages')}</p></div>`
    : msgs.map(m => `
  <div class="chat-msg ${m.sender_role==='teacher'?'sent':'received'}">
    <div class="chat-msg-avatar">${initials(m.sender_name||'?')}</div>
    <div><div class="chat-msg-bubble">${m.content}</div><div class="chat-msg-time">${timeAgo(m.created_at)}</div></div>
  </div>`).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendTeacherMsg(receiverId, receiverRole) {
  const input = document.getElementById('tchat-input-' + receiverId);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  await API.post('/api/teacher/messages', { receiver_id: receiverId, receiver_role: receiverRole, content });
  openTeacherChatWith(receiverId, '', receiverRole);
}

async function renderTeacherAnnouncements(el) {
  const data = await API.get('/api/common/announcements');
  const announcements = data.announcements || [];
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.bell} Announcements</h2>
  <button class="btn btn-primary" onclick="showAnnouncementModal()">${Icons.plus} New Announcement</button>
</div>
${announcements.length === 0
  ? `<div class="empty-state"><p>No announcements yet</p></div>`
  : announcements.map(a => `
<div class="announcement-item">
  <div class="announcement-header">
    <div>
      <div class="announcement-title">${a.title}</div>
      <div class="announcement-meta">By ${a.author_role} · ${formatDate(a.created_at)}</div>
    </div>
  </div>
  <div class="announcement-body">${a.content}</div>
</div>`).join('')}`;
}

function showAnnouncementModal() {
  openModal(`
<h3 class="modal-title">New Announcement</h3>
<form onsubmit="postAnnouncement(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="ann-title" placeholder="Announcement title" required>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Content *</label>
    <textarea class="form-control form-control-dark" id="ann-content" placeholder="Write your announcement..." required></textarea>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Post</button>
  </div>
</form>`);
}

async function postAnnouncement(e) {
  e.preventDefault();
  const res = await API.post('/api/teacher/announcement', {
    title: document.getElementById('ann-title').value,
    content: document.getElementById('ann-content').value
  });
  if (res.success) { closeModal(); showToast('Announcement posted!', 'success'); renderTeacherAnnouncements(document.getElementById('teacher-content')); }
  else showToast(res.message || 'Failed', 'error');
}

async function renderTeacherEvents(el) {
  el.innerHTML = `
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
  <h2 class="text-accent">${Icons.attendance} Events</h2>
  <button class="btn btn-primary" onclick="showCreateEventModal()">${Icons.plus} Add Event</button>
</div>
<div class="empty-state"><p>No events yet. Add school events for students and parents.</p></div>`;
}

function showCreateEventModal() {
  openModal(`
<h3 class="modal-title">Add Event</h3>
<form onsubmit="createEvent(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Title *</label>
    <input type="text" class="form-control form-control-dark" id="evt-title" placeholder="e.g. Sports Day" required>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Date</label>
      <input type="date" class="form-control form-control-dark" id="evt-date">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Type</label>
      <select class="form-control form-control-dark" id="evt-type">
        ${['exam','sports','meeting','holiday','general'].map(t => `<option value="${t}">${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Description</label>
    <textarea class="form-control form-control-dark" id="evt-desc" placeholder="Event details..."></textarea>
  </div>
  <div class="modal-actions">
    <button type="button" class="btn btn-secondary" onclick="closeModal()">${t('cancel')}</button>
    <button type="submit" class="btn btn-primary">Add Event</button>
  </div>
</form>`);
}

async function createEvent(e) {
  e.preventDefault();
  const res = await API.post('/api/teacher/event', {
    title: document.getElementById('evt-title').value,
    event_date: document.getElementById('evt-date').value,
    event_type: document.getElementById('evt-type').value,
    description: document.getElementById('evt-desc').value
  });
  if (res.success) { closeModal(); showToast('Event added!', 'success'); }
  else showToast(res.message || 'Failed', 'error');
}
