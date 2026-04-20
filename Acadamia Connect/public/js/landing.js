// ===== LANDING PAGE =====
function renderLanding() {
  const page = document.getElementById('page-landing');
  page.innerHTML = `
<div class="landing-page">
  <!-- NAV -->
  <nav class="landing-nav">
    <div class="nav-brand">
      <div class="nav-brand-icon">${Icons.book}</div>
      <span class="nav-brand-text" style="font-family:Georgia,'Times New Roman',serif;font-style:italic;">Academia Connect</span>
    </div>
    <div class="nav-actions">
      <div class="lang-toggle">
        <button class="lang-btn ${currentLang==='en'?'active':''}" data-lang="en" onclick="setLang('en');renderLanding()">EN</button>
        <button class="lang-btn ${currentLang==='am'?'active':''}" data-lang="am" onclick="setLang('am');renderLanding()">አማ</button>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="showPage('auth','login')">${t('login')}</button>
      <button class="btn btn-primary btn-sm" onclick="showPage('auth','register')">${t('register')}</button>
    </div>
  </nav>

  <!-- HERO -->
  <section class="hero">
    <div class="hero-eyebrow">
      <span class="hero-line"></span>
      ☆
      <span class="hero-eyebrow-text">THE PATH TO KNOWLEDGE</span>
      ☆
      <span class="hero-line"></span>
    </div>
    <h1 class="hero-title-serif">Academia Connect</h1>
    <p class="hero-sub">Uniting scholars, educators, and families in the pursuit of knowledge. Elevate the academic experience.</p>
    <div class="hero-cta">
      <button class="btn btn-primary btn-lg" onclick="showPage('auth','register')">${t('getStarted')} ›</button>
      <button class="btn btn-secondary btn-lg" onclick="showPage('auth','login')">${t('login')}</button>
    </div>
  </section>

  <!-- PORTAL FLIP CARDS -->
  <section class="portals-section" id="portals-section">
    <h2>${t('selectRole')}</h2>
    <div class="portals-grid">
      ${renderPortalCard('student', Icons.students, t('portalStudent'), 'Access your academic journey, tasks, results, and AI coaching.', ['Task management & calendar','AI study coach Athena','Games & movie rewards','Leaderboard & challenges','Notes & learning materials'])}
      ${renderPortalCard('teacher', Icons.book, t('portalTeacher'), 'Manage students, assessments, attendance, and communication.', ['Student assessment system','Attendance tracking','Quiz & competition creator','Video & material sharing','Parent communication'])}
      ${renderPortalCard('parent', Icons.user, t('portalParent'), "Monitor your child's progress and stay connected with teachers.", ["Child's results & attendance",'Teacher communication','Payment management','Parent group chats','School announcements'])}
      ${renderPortalCard('admin', Icons.school, t('portalAdmin'), 'Oversee the entire school system and manage all users.', ['User management','Teacher attendance monitoring','Payment oversight','Announcement system','School analytics'])}
    </div>
  </section>

  <!-- FEATURES -->
  <section class="features-section">
    <h2>${t('featuresTitle')}</h2>
    <div class="features-grid">
      ${renderFeature(Icons.timer, 'Smart Study Timer', 'Pomodoro timer with streak tracking and daily study analytics.')}
      ${renderFeature(Icons.trophy, 'Gamification', 'Earn points, badges, and unlock games & movies by completing tasks.')}
      ${renderFeature(Icons.messages, 'Real-time Chat', 'Telegram-style messaging between students, teachers, and parents.')}
      ${renderFeature(Icons.videos, 'TikTok-style Videos', 'Short educational videos in a vertical scrollable feed.')}
      ${renderFeature(Icons.challenges, 'Duolingo Challenges', 'Interest-based learning paths with levels and achievements.')}
      ${renderFeature(Icons.analytics, 'AI Analytics', 'Personalized study plans and performance insights powered by AI.')}
      ${renderFeature(Icons.payment, 'Payment System', 'School fee management with reminders and receipt generation.')}
      ${renderFeature(Icons.globe, 'Bilingual', 'Full English and Amharic language support throughout the app.')}
    </div>
  </section>

  <!-- GUIDE FOR PARENTS -->
  <section class="guide-section">
    <h2>${t('guidanceTitle')}</h2>
    <div class="guide-steps">
      <div class="guide-step">
        <div class="guide-step-num">1</div>
        <div class="guide-step-content">
          <h4>${t('step1')}</h4>
          <p>On the home page, you will see four cards: Student, Teacher, Parent, and Admin. Click on "Parent" to begin your registration as a parent.</p>
        </div>
      </div>
      <div class="guide-step">
        <div class="guide-step-num">2</div>
        <div class="guide-step-content">
          <h4>${t('step2')}</h4>
          <p>Fill in your full name, phone number, email address, and create a password. Enter your child's name and grade level. Make sure to use the Ethiopian phone format: +251XXXXXXXXX.</p>
        </div>
      </div>
      <div class="guide-step">
        <div class="guide-step-num">3</div>
        <div class="guide-step-content">
          <h4>${t('step3')}</h4>
          <p>After registering, log in with your email and password. You will be taken to your personal dashboard where you can see your child's information.</p>
        </div>
      </div>
      <div class="guide-step">
        <div class="guide-step-num">4</div>
        <div class="guide-step-content">
          <h4>${t('step4')}</h4>
          <p>From your dashboard, you can view your child's grades, attendance, and messages from teachers. You can also chat directly with teachers and receive school announcements.</p>
        </div>
      </div>
      <div class="guide-step">
        <div class="guide-step-num">5</div>
        <div class="guide-step-content">
          <h4>${t('step5')}</h4>
          <p>Enable payment reminders to receive alerts about school fees. Join parent group chats to connect with other parents in your child's grade level.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- DEMO VIDEO -->
  <section class="demo-section">
    <h2>${t('demoTitle')}</h2>
    <div class="demo-video-wrap">
      <div class="demo-placeholder">
        <div class="demo-play-btn" onclick="showDemoVideo()">${Icons.play}</div>
        <p style="color:rgba(245,245,245,0.7);font-size:0.95rem;">Click to watch the tutorial</p>
        <p style="color:rgba(245,245,245,0.4);font-size:0.8rem;margin-top:6px;">Learn how to use Academia Connect in 5 minutes</p>
      </div>
    </div>
    <div style="max-width:700px;margin:20px auto 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
      <div class="feature-item" style="padding:14px;">
        <div style="font-size:1.5rem;margin-bottom:6px;">📱</div>
        <p style="font-size:0.78rem;color:rgba(245,245,245,0.6);">Install as app on your phone</p>
      </div>
      <div class="feature-item" style="padding:14px;">
        <div style="font-size:1.5rem;margin-bottom:6px;">🔒</div>
        <p style="font-size:0.78rem;color:rgba(245,245,245,0.6);">Secure role-based access</p>
      </div>
      <div class="feature-item" style="padding:14px;">
        <div style="font-size:1.5rem;margin-bottom:6px;">📶</div>
        <p style="font-size:0.78rem;color:rgba(245,245,245,0.6);">Works offline too</p>
      </div>
      <div class="feature-item" style="padding:14px;">
        <div style="font-size:1.5rem;margin-bottom:6px;">🇪🇹</div>
        <p style="font-size:0.78rem;color:rgba(245,245,245,0.6);">Amharic language support</p>
      </div>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="landing-footer">
    <p>${t('footerText')}</p>
    <p style="margin-top:6px;">Demo accounts: abebe@student.com | almaz@teacher.com | kebede@parent.com | admin@academia.com (password: password123)</p>
  </footer>
</div>`;
}

function renderPortalCard(role, icon, name, desc, features) {
  return `
<div class="portal-flip-card" onclick="showPage('auth','login',{role:'${role}'})">
  <div class="portal-flip-inner">
    <div class="portal-flip-front">
      <div class="portal-icon">${icon}</div>
      <h3 class="portal-name">${name}</h3>
      <p class="portal-desc">${desc}</p>
    </div>
    <div class="portal-flip-back">
      <div class="portal-icon">${icon}</div>
      <h3 class="portal-name">${name}</h3>
      <ul class="portal-features">
        ${features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <button class="btn btn-secondary btn-sm" style="margin-top:12px;border-color:#1A1A1A;color:#1A1A1A;">Enter Portal</button>
    </div>
  </div>
</div>`;
}

function renderFeature(icon, title, desc) {
  return `
<div class="feature-item">
  <div class="feature-icon">${icon}</div>
  <h4>${title}</h4>
  <p>${desc}</p>
</div>`;
}

function showDemoVideo() {
  openModal(`
<div style="text-align:center;">
  <h3 class="modal-title">Academia Connect — Tutorial</h3>
  <div style="background:#000;border-radius:8px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;margin-bottom:16px;">
    <div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px;">
      <div style="font-size:3rem;margin-bottom:12px;">🎬</div>
      <p style="font-size:0.95rem;">Tutorial Video</p>
      <p style="font-size:0.8rem;margin-top:6px;opacity:0.6;">In a production environment, this would play a step-by-step video guide showing how to register, navigate dashboards, and use all features of Academia Connect.</p>
    </div>
  </div>
  <div style="text-align:left;background:rgba(255,255,255,0.05);border-radius:8px;padding:16px;">
    <h4 style="color:var(--accent);margin-bottom:12px;">Quick Start Guide</h4>
    <ol style="padding-left:20px;color:rgba(245,245,245,0.8);font-size:0.88rem;line-height:2;">
      <li>Visit the homepage and select your role (Student/Teacher/Parent/Admin)</li>
      <li>Click "Register" and fill in your details with your school name</li>
      <li>Log in with your email and password</li>
      <li>Explore your personalized dashboard</li>
      <li>Students: Complete tasks to earn points and unlock games/movies</li>
      <li>Teachers: Search students, add assessments, and track attendance</li>
      <li>Parents: View your child's progress and chat with teachers</li>
      <li>Install the app on your phone for offline access</li>
    </ol>
  </div>
  <div class="modal-actions">
    <button class="btn btn-primary" onclick="closeModal()">Got it!</button>
  </div>
</div>`);
}
