// ===== AUTH PAGE =====
let authState = {
  mode: 'login', // 'login' | 'register'
  role: '',
  step: 1,
  data: {}
};

function showPage(page, mode, opts = {}) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  if (page === 'auth') {
    authState.mode = mode || 'login';
    authState.role = opts.role || '';
    authState.step = 1;
    authState.data = {};
    renderAuth();
  }
}

function renderAuth() {
  const page = document.getElementById('page-auth');
  page.innerHTML = `
<div class="auth-page">
  <div class="auth-back" onclick="showPage('landing')">
    ${Icons.chevronLeft} ${t('back')} to Home
  </div>
  <div class="auth-container" id="auth-container">
    ${authState.mode === 'login' ? renderLogin() : renderRegisterStep()}
  </div>
</div>`;
  
  // Setup real-time validation after rendering
  setTimeout(setupRealTimeValidation, 100);
}

function renderLogin() {
  return `
<div class="auth-header">
  <div class="auth-logo">${Icons.book}</div>
  <h2 class="auth-title">${t('signIn')}</h2>
  <p class="auth-subtitle">Welcome back to Academia Connect</p>
</div>
<div style="margin-bottom:16px;">
  <p style="font-size:0.85rem;color:rgba(245,245,245,0.6);margin-bottom:10px;">Select your role:</p>
  <div class="role-selector">
    ${['student','teacher','parent','admin'].map(r => `
    <div class="role-card ${authState.role===r?'selected':''}" onclick="authState.role='${r}';renderAuth()">
      <div class="role-card-icon">${r==='student'?Icons.students:r==='teacher'?Icons.book:r==='parent'?Icons.user:Icons.school}</div>
      <div class="role-card-name">${t(r)}</div>
    </div>`).join('')}
  </div>
</div>
<form onsubmit="handleLogin(event)">
  <div class="form-group">
    <label class="form-label form-label-light">${t('email')}</label>
    <input type="email" class="form-control form-control-dark" id="login-email" placeholder="your@email.com" required>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">${t('password')}</label>
    <div class="relative">
      <input type="password" class="form-control form-control-dark" id="login-password" placeholder="••••••••" required>
      <button type="button" onclick="togglePwVis('login-password',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(245,245,245,0.5);cursor:pointer;">${Icons.eye}</button>
    </div>
  </div>
  ${authState.role === 'teacher' ? `
  <div class="form-group">
    <label class="form-label form-label-light">Employee ID</label>
    <input type="text" class="form-control form-control-dark" id="login-employee-id" placeholder="e.g. TCH001" required>
  </div>` : ''}
  <button type="submit" class="btn btn-primary w-full" style="margin-top:8px;">${t('signIn')}</button>
</form>
<div class="auth-footer">
  ${t('dontHaveAccount')} <a onclick="authState.mode='register';authState.step=1;renderAuth()">${t('signUp')}</a>
</div>`;
}

function renderRegisterStep() {
  const steps = ['Role & Info', 'Details', 'Profile'];
  return `
<div class="auth-header">
  <div class="auth-logo">${Icons.book}</div>
  <h2 class="auth-title">${t('signUp')}</h2>
  <p class="auth-subtitle">Create your Academia Connect account</p>
</div>
<div class="auth-steps">
  ${steps.map((s, i) => `
  <div class="auth-step">
    <div class="step-circle ${authState.step > i+1 ? 'done' : authState.step === i+1 ? 'active' : ''}">${authState.step > i+1 ? Icons.check : i+1}</div>
    <span class="step-label ${authState.step === i+1 ? 'active' : ''}">${s}</span>
  </div>
  ${i < steps.length-1 ? `<div class="step-line ${authState.step > i+1 ? 'done' : ''}"></div>` : ''}`).join('')}
</div>
${authState.step === 1 ? renderRegStep1() : authState.step === 2 ? renderRegStep2() : renderRegStep3()}
<div class="auth-footer">
  ${t('alreadyHaveAccount')} <a onclick="authState.mode='login';renderAuth()">${t('signIn')}</a>
</div>`;
}

function renderRegStep1() {
  return `
<form onsubmit="regNext(event,1)">
  <p style="font-size:0.85rem;color:rgba(245,245,245,0.6);margin-bottom:10px;">${t('selectRole')}:</p>
  <div class="role-selector" style="margin-bottom:16px;">
    ${['student','teacher','parent','admin'].map(r => `
    <div class="role-card ${authState.role===r?'selected':''}" onclick="authState.role='${r}';document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('selected'));this.classList.add('selected')">
      <div class="role-card-icon">${r==='student'?Icons.students:r==='teacher'?Icons.book:r==='parent'?Icons.user:Icons.school}</div>
      <div class="role-card-name">${t(r)}</div>
      <div class="role-card-desc">${r==='student'?'Access learning tools':r==='teacher'?'Manage your class':r==='parent'?'Monitor your child':'Manage the school'}</div>
    </div>`).join('')}
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('fullName')} *</label>
      <input type="text" class="form-control form-control-dark" id="reg-name" value="${authState.data.full_name||''}" placeholder="Your full name" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">${t('email')} *</label>
      <input type="email" class="form-control form-control-dark" id="reg-email" value="${authState.data.email||''}" placeholder="your@email.com" required>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('phone')} *</label>
      <input type="tel" class="form-control form-control-dark" id="reg-phone" value="${authState.data.phone||''}" placeholder="+251911234567" required>
      <p class="form-hint">Ethiopian format: +251XXXXXXXXX</p>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">${t('schoolName')} *</label>
      <input type="text" class="form-control form-control-dark" id="reg-school" value="${authState.data.school_name||''}" placeholder="Your school name" required>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('password')} *</label>
      <div class="relative">
        <input type="password" class="form-control form-control-dark" id="reg-password" value="${authState.data.password||''}" placeholder="Min 8 characters" required oninput="updatePasswordStrengthUI(this.value)">
        <button type="button" onclick="togglePwVis('reg-password',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(245,245,245,0.5);cursor:pointer;">${Icons.eye}</button>
      </div>
      <div class="pw-strength" id="pw-strength-wrap" style="display:none;">
        <div class="pw-strength-bar"><div class="pw-strength-fill" id="pw-strength-fill"></div></div>
        <span class="pw-strength-text" id="pw-strength-text"></span>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">${t('confirmPassword')} *</label>
      <div class="relative">
        <input type="password" class="form-control form-control-dark" id="reg-confirm" value="${authState.data.confirm_password||''}" placeholder="Repeat password" required>
        <button type="button" onclick="togglePwVis('reg-confirm',this)" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(245,245,245,0.5);cursor:pointer;">${Icons.eye}</button>
      </div>
    </div>
  </div>
  <button type="submit" class="btn btn-primary w-full">${t('next')} ${Icons.chevronRight}</button>
</form>`;
}

function renderRegStep2() {
  const role = authState.role;
  if (role === 'student') return renderStudentStep2();
  if (role === 'teacher') return renderTeacherStep2();
  if (role === 'parent') return renderParentStep2();
  return renderAdminStep2();
}

function renderStudentStep2() {
  const grades = ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
  return `
<form onsubmit="regNext(event,2)">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Nickname</label>
      <input type="text" class="form-control form-control-dark" id="reg-nickname" value="${authState.data.nickname||''}" placeholder="Preferred name">
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Gender</label>
      <select class="form-control form-control-dark" id="reg-gender">
        <option value="">Select gender</option>
        ${['Male','Female','Other','Prefer not to say'].map(g=>`<option value="${g}" ${authState.data.gender===g?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('grade')} *</label>
      <select class="form-control form-control-dark" id="reg-grade" required>
        <option value="">Select grade</option>
        ${grades.map(g=>`<option value="${g}" ${authState.data.grade===g?'selected':''}>${g}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Section</label>
      <select class="form-control form-control-dark" id="reg-section">
        ${['A','B','C','D'].map(s=>`<option value="${s}" ${authState.data.section===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">Parent/Guardian Name *</label>
      <input type="text" class="form-control form-control-dark" id="reg-parent-name" value="${authState.data.parent_name||''}" placeholder="Parent full name" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">Parent Contact *</label>
      <input type="tel" class="form-control form-control-dark" id="reg-parent-contact" value="${authState.data.parent_contact||''}" placeholder="+251XXXXXXXXX" required>
    </div>
  </div>
  <div class="info-box" style="background:rgba(196,154,108,0.1);border:1px solid var(--accent);border-radius:8px;padding:14px;margin:16px 0;">
    <p style="font-size:0.85rem;color:rgba(245,245,245,0.8);margin:0;">
      <strong style="color:var(--accent);">📚 Subject Assignment</strong><br>
      Your subjects will be assigned by your teachers after registration. You don't need to select them now.
    </p>
  </div>
  <div style="display:flex;gap:10px;margin-top:8px;">
    <button type="button" class="btn btn-secondary" onclick="authState.step=1;renderAuth()">${Icons.chevronLeft} ${t('back')}</button>
    <button type="submit" class="btn btn-primary" style="flex:1;">${t('next')} ${Icons.chevronRight}</button>
  </div>
</form>`;
}

function renderTeacherStep2() {
  const subjects = ['Mathematics','English','Science','History','Geography','Art','Music','Physical Education','Computer Science','Biology','Chemistry','Physics','Amharic'];
  const grades = ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
  const classes = grades.flatMap(g => ['A','B','C'].map(s => g + s));
  return `
<form onsubmit="regNext(event,2)">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('employeeId')} *</label>
      <input type="text" class="form-control form-control-dark" id="reg-employee-id" value="${authState.data.employee_id||''}" placeholder="e.g. TCH001" required>
    </div>
    <div class="form-group">
      <label class="form-label form-label-light">${t('experience')}</label>
      <select class="form-control form-control-dark" id="reg-experience">
        ${['Less than 1 year','1-3 years','3-5 years','5-10 years','10+ years'].map(e=>`<option value="${e}" ${authState.data.experience===e?'selected':''}>${e}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">Subjects You Teach</label>
    <div class="subject-grid">
      ${subjects.map(s=>`
      <label class="subject-check">
        <input type="checkbox" name="t-subjects" value="${s}" ${(authState.data.subjects||[]).includes(s)?'checked':''}>
        <span>${s}</span>
      </label>`).join('')}
    </div>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">${t('qualifications')}</label>
    <textarea class="form-control form-control-dark" id="reg-qualifications" placeholder="Degrees, certifications...">${authState.data.qualifications||''}</textarea>
  </div>
  <div class="form-group">
    <label class="form-label form-label-light">${t('bio')}</label>
    <textarea class="form-control form-control-dark" id="reg-bio" placeholder="Brief professional bio...">${authState.data.bio||''}</textarea>
  </div>
  <div style="display:flex;gap:10px;margin-top:8px;">
    <button type="button" class="btn btn-secondary" onclick="authState.step=1;renderAuth()">${Icons.chevronLeft} ${t('back')}</button>
    <button type="submit" class="btn btn-primary" style="flex:1;">${t('next')} ${Icons.chevronRight}</button>
  </div>
</form>`;
}

function renderParentStep2() {
  const grades = ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
  return `
<form onsubmit="regNext(event,2)">
  <div class="form-row">
    <div class="form-group">
      <label class="form-label form-label-light">${t('parentalStatus')}</label>
      <select class="form-control form-control-dark" id="reg-parental-status">
        ${['Mother','Father','Aunt','Uncle','Grandmother','Grandfather','Legal Guardian','Other'].map(s=>`<option value="${s}" ${authState.data.parental_status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
  </div>
  <div id="children-list">
    <div class="form-group" id="child-0">
      <label class="form-label form-label-light">${t('childName')} *</label>
      <input type="text" class="form-control form-control-dark child-name" placeholder="Child's full name" required>
      <label class="form-label form-label-light" style="margin-top:8px;">Child's Grade</label>
      <select class="form-control form-control-dark child-grade">
        ${grades.map(g=>`<option value="${g}">${g}</option>`).join('')}
      </select>
    </div>
  </div>
  <button type="button" class="btn btn-secondary btn-sm" onclick="addChildField()" style="margin-bottom:16px;">+ ${t('addChild')}</button>
  <div style="display:flex;gap:10px;margin-top:8px;">
    <button type="button" class="btn btn-secondary" onclick="authState.step=1;renderAuth()">${Icons.chevronLeft} ${t('back')}</button>
    <button type="submit" class="btn btn-primary" style="flex:1;">${t('next')} ${Icons.chevronRight}</button>
  </div>
</form>`;
}

function renderAdminStep2() {
  return `
<form onsubmit="regNext(event,2)">
  <div class="form-group">
    <label class="form-label form-label-light">Admin Code (optional)</label>
    <input type="text" class="form-control form-control-dark" id="reg-admin-code" placeholder="School admin verification code">
    <p class="form-hint">Leave blank if you are the first admin for your school.</p>
  </div>
  <div style="display:flex;gap:10px;margin-top:8px;">
    <button type="button" class="btn btn-secondary" onclick="authState.step=1;renderAuth()">${Icons.chevronLeft} ${t('back')}</button>
    <button type="submit" class="btn btn-primary" style="flex:1;">${t('next')} ${Icons.chevronRight}</button>
  </div>
</form>`;
}

function renderRegStep3() {
  return `
<form onsubmit="handleRegister(event)">
  <div class="form-group">
    <label class="form-label form-label-light">Choose Your Avatar</label>
    <div class="avatar-grid">
      ${Object.entries(AVATARS).map(([key, emoji]) => `
      <div class="avatar-option ${(authState.data.avatar||'scholar')===key?'selected':''}" onclick="selectAvatar('${key}',this)" title="${key}">
        ${emoji}
      </div>`).join('')}
    </div>
  </div>
  ${authState.role === 'student' ? `
  <div class="form-group">
    <label class="form-label form-label-light">Upload Student ID (optional)</label>
    <input type="file" class="form-control form-control-dark" id="reg-id-photo" accept="image/*,.pdf">
  </div>` : ''}
  ${authState.role === 'teacher' ? `
  <div class="form-group">
    <label class="form-label form-label-light">Upload ID / Certificate (optional)</label>
    <input type="file" class="form-control form-control-dark" id="reg-id-upload" accept="image/*,.pdf">
  </div>` : ''}
  <div style="background:rgba(196,154,108,0.1);border:1px solid var(--accent);border-radius:8px;padding:14px;margin-bottom:16px;">
    <p style="font-size:0.85rem;color:rgba(245,245,245,0.8);">
      <strong style="color:var(--accent);">Review your details:</strong><br>
      Name: ${authState.data.full_name}<br>
      Email: ${authState.data.email}<br>
      Role: ${authState.role}<br>
      School: ${authState.data.school_name}
    </p>
  </div>
  <div style="display:flex;gap:10px;">
    <button type="button" class="btn btn-secondary" onclick="authState.step=2;renderAuth()">${Icons.chevronLeft} ${t('back')}</button>
    <button type="submit" class="btn btn-primary" style="flex:1;">Create Account ${Icons.chevronRight}</button>
  </div>
</form>`;
}

function addChildField() {
  const list = document.getElementById('children-list');
  const idx = list.children.length;
  const grades = ['Kindergarten','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
  const div = document.createElement('div');
  div.className = 'form-group';
  div.id = 'child-' + idx;
  div.innerHTML = `
    <label class="form-label form-label-light">Child ${idx+1} Name</label>
    <input type="text" class="form-control form-control-dark child-name" placeholder="Child's full name">
    <label class="form-label form-label-light" style="margin-top:8px;">Child's Grade</label>
    <select class="form-control form-control-dark child-grade">
      ${grades.map(g=>`<option value="${g}">${g}</option>`).join('')}
    </select>`;
  list.appendChild(div);
}

function selectAvatar(key, el) {
  document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  authState.data.avatar = key;
}

// Enhanced validation functions
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/\s/g, '');
  return /^\+251[79]\d{8}$/.test(cleaned);
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function checkPasswordStrength(password) {
  if (!password || typeof password !== 'string') return 'weak';
  if (password.length < 8) return 'weak';
  
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  
  if (hasLower && hasUpper && hasDigit && hasSpecial) return 'strong';
  if ((hasLower || hasUpper) && hasDigit) return 'good';
  if (hasLower || hasUpper) return 'fair';
  
  return 'weak';
}

function updatePasswordStrengthUI(pw) {
  const wrap = document.getElementById('pw-strength-wrap');
  const fill = document.getElementById('pw-strength-fill');
  const text = document.getElementById('pw-strength-text');
  if (!wrap) return;
  
  wrap.style.display = pw ? 'block' : 'none';
  if (!pw) return;
  
  const strength = checkPasswordStrength(pw);
  const levels = {
    weak: { w: '25%', c: '#ff4444', t: 'Weak', desc: 'Fewer than 8 characters' },
    fair: { w: '50%', c: '#ff8800', t: 'Fair', desc: '8+ characters, letters only' },
    good: { w: '75%', c: '#ffaa00', t: 'Good', desc: '8+ characters, mixed case or letters + digits' },
    strong: { w: '100%', c: '#00aa00', t: 'Strong', desc: '8+ characters, mixed case + digits + special character' }
  };
  
  const l = levels[strength];
  fill.style.width = l.w;
  fill.style.background = l.c;
  text.textContent = l.t;
  text.style.color = l.c;
  text.title = l.desc;
}

// Real-time validation for input fields
function setupRealTimeValidation() {
  // Phone validation
  const phoneInput = document.getElementById('reg-phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function() {
      const isValid = validatePhoneNumber(this.value);
      this.classList.toggle('invalid', this.value && !isValid);
      
      // Show/hide error message
      let errorMsg = this.parentNode.querySelector('.validation-error');
      if (this.value && !isValid) {
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.className = 'validation-error';
          errorMsg.style.cssText = 'color: #ff4444; font-size: 0.8rem; margin-top: 4px;';
          this.parentNode.appendChild(errorMsg);
        }
        errorMsg.textContent = 'Invalid phone number. Use format: +251XXXXXXXXX';
      } else if (errorMsg) {
        errorMsg.remove();
      }
    });
  }
  
  // Email validation
  const emailInput = document.getElementById('reg-email') || document.getElementById('login-email');
  if (emailInput) {
    emailInput.addEventListener('input', function() {
      const isValid = validateEmail(this.value);
      this.classList.toggle('invalid', this.value && !isValid);
      
      let errorMsg = this.parentNode.querySelector('.validation-error');
      if (this.value && !isValid) {
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.className = 'validation-error';
          errorMsg.style.cssText = 'color: #ff4444; font-size: 0.8rem; margin-top: 4px;';
          this.parentNode.appendChild(errorMsg);
        }
        errorMsg.textContent = 'Invalid email format';
      } else if (errorMsg) {
        errorMsg.remove();
      }
    });
  }
  
  // Password strength validation
  const passwordInput = document.getElementById('reg-password');
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      updatePasswordStrengthUI(this.value);
    });
  }
  
  // Confirm password validation
  const confirmInput = document.getElementById('reg-confirm');
  if (confirmInput && passwordInput) {
    confirmInput.addEventListener('input', function() {
      const matches = this.value === passwordInput.value;
      this.classList.toggle('invalid', this.value && !matches);
      
      let errorMsg = this.parentNode.querySelector('.validation-error');
      if (this.value && !matches) {
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.className = 'validation-error';
          errorMsg.style.cssText = 'color: #ff4444; font-size: 0.8rem; margin-top: 4px;';
          this.parentNode.appendChild(errorMsg);
        }
        errorMsg.textContent = 'Passwords do not match';
      } else if (errorMsg) {
        errorMsg.remove();
      }
    });
  }
}

function togglePwVis(id, btn) {
  const input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.innerHTML = input.type === 'password' ? Icons.eye : Icons.eyeOff;
}

function regNext(e, step) {
  e.preventDefault();
  if (step === 1) {
    if (!authState.role) { showToast('Please select a role', 'error'); return; }
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const pw = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;
    
    // Enhanced validation
    if (!name || !email || !phone || !school || !pw) { 
      showToast('All fields are required', 'error'); 
      return; 
    }
    
    if (!validateEmail(email)) { 
      showToast('Invalid email format. Email must contain @ and .', 'error'); 
      return; 
    }
    
    if (!validatePhoneNumber(phone)) { 
      showToast('Invalid phone number. Use Ethiopian format: +251XXXXXXXXX', 'error'); 
      return; 
    }
    
    if (pw.length < 8) { 
      showToast('Password must be at least 8 characters', 'error'); 
      return; 
    }
    
    if (pw !== confirm) { 
      showToast('Passwords do not match', 'error'); 
      return; 
    }
    
    // Check password strength
    const strength = checkPasswordStrength(pw);
    if (strength === 'weak') {
      showToast('Please choose a stronger password', 'error');
      return;
    }
    
    authState.data = { ...authState.data, full_name: name, email, phone, school_name: school, password: pw, confirm_password: confirm };
  } else if (step === 2) {
    if (authState.role === 'student') {
      const grade = document.getElementById('reg-grade').value;
      if (!grade) { showToast('Please select a grade', 'error'); return; }
      const parentName = document.getElementById('reg-parent-name').value.trim();
      const parentContact = document.getElementById('reg-parent-contact').value.trim();
      if (!parentName || !parentContact) { showToast('Parent information is required', 'error'); return; }
      
      // Validate parent contact phone number
      if (!validatePhoneNumber(parentContact)) {
        showToast('Invalid parent contact. Use Ethiopian format: +251XXXXXXXXX', 'error');
        return;
      }
      
      // No longer collect subjects during registration - they will be assigned by teachers
      authState.data = { ...authState.data,
        nickname: document.getElementById('reg-nickname').value,
        gender: document.getElementById('reg-gender').value,
        grade, section: document.getElementById('reg-section').value,
        parent_name: parentName, parent_contact: parentContact
      };
    } else if (authState.role === 'teacher') {
      const empId = document.getElementById('reg-employee-id').value.trim();
      if (!empId) { showToast('Employee ID is required for teacher registration', 'error'); return; }
      const subjects = [...document.querySelectorAll('input[name="t-subjects"]:checked')].map(c => c.value);
      authState.data = { ...authState.data,
        employee_id: empId,
        experience: document.getElementById('reg-experience').value,
        qualifications: document.getElementById('reg-qualifications').value,
        bio: document.getElementById('reg-bio').value,
        subjects
      };
    } else if (authState.role === 'parent') {
      authState.data.parental_status = document.getElementById('reg-parental-status').value;
      const names = [...document.querySelectorAll('.child-name')].map(i => i.value.trim()).filter(Boolean);
      if (names.length === 0) {
        showToast('Please add at least one child', 'error');
        return;
      }
      authState.data.children = names;
    }
  }
  authState.step++;
  renderAuth();
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Creating account...';
  const payload = { ...authState.data, role: authState.role };
  const res = await API.post('/api/auth/register', payload);
  if (res.success) {
    showToast('Account created! Please log in.', 'success');
    authState.mode = 'login';
    authState.step = 1;
    renderAuth();
  } else {
    showToast(res.message || 'Registration failed', 'error');
    btn.disabled = false; btn.textContent = 'Create Account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  if (!authState.role) { showToast('Please select your role', 'error'); return; }
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  
  // Enhanced validation
  if (!email || !password) {
    showToast('Email and password are required', 'error');
    return;
  }
  
  if (!validateEmail(email)) {
    showToast('Invalid email format', 'error');
    return;
  }
  
  // Teacher-specific validation
  if (authState.role === 'teacher') {
    const employeeIdInput = document.getElementById('login-employee-id');
    if (!employeeIdInput || !employeeIdInput.value.trim()) {
      showToast('Employee ID is required for teacher login', 'error');
      return;
    }
  }
  
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Signing in...';
  
  const payload = { email, password, role: authState.role };
  if (authState.role === 'teacher') {
    const employeeIdInput = document.getElementById('login-employee-id');
    if (employeeIdInput) {
      payload.employee_id = employeeIdInput.value.trim();
    }
  }
  
  const res = await API.post('/api/auth/login', payload);
  if (res.success) {
    AppState.user = res.user;
    AppState.role = res.role;
    showToast('Welcome back, ' + res.user.full_name + '!', 'success');
    navigateToDashboard(res.role);
  } else {
    showToast(res.message || 'Invalid credentials', 'error');
    btn.disabled = false; btn.textContent = t('signIn');
  }
}
