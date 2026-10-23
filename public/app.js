// AI Maktab — Client Application ES Module
// Fully functional frontend connecting to Node.js / PostgreSQL backend

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Application State
const state = {
  user: null,
  page: 'landing', // 'landing', 'dashboard', 'chat', 'exercises', 'quizzes', 'leaderboard', 'projects', 'profile', 'admin'
  sidebarOpen: false,
  quiz: {
    questions: [],
    currentIndex: 0,
    selectedCategory: null,
    answered: false,
    history: []
  }
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(message, duration = 3500) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}

function openModal(contentHtml) {
  const modal = $('#modal-container');
  modal.innerHTML = `
    <div class="modal-card">
      <button class="modal-close-btn" id="modal-close-btn" aria-label="Yopish">&times;</button>
      ${contentHtml}
    </div>
  `;
  modal.style.display = 'grid';
  $('#modal-close-btn').onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
}

function closeModal() {
  const modal = $('#modal-container');
  modal.style.display = 'none';
  modal.innerHTML = '';
}

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch('/api' + path, {
    credentials: 'same-origin',
    headers,
    ...options
  });

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    // Non-JSON response
  }

  if (!res.ok) {
    throw new Error(data.error || 'Xatolik yuz berdi (' + res.status + ')');
  }

  return data;
}

// Logo Component
function logoHtml() {
  return `
    <div class="logo" data-navigate="landing">
      <div class="logo-icon">⚡</div>
      <span>AI <span class="gradient-text">Maktab</span></span>
    </div>
  `;
}

// ==========================================
// ROUTER & NAVIGATION
// ==========================================

async function navigate(pageName) {
  state.page = pageName;
  state.sidebarOpen = false;

  if (pageName === 'landing' && !state.user) {
    await renderLanding();
    return;
  }

  if (!state.user && pageName !== 'landing') {
    renderAuthModal('login');
    return;
  }

  // Render App Shell with specific page content
  switch (pageName) {
    case 'landing':
    case 'dashboard':
      await renderDashboard();
      break;
    case 'chat':
      await renderChat();
      break;
    case 'exercises':
      await renderExercises();
      break;
    case 'quizzes':
      await renderQuizzes();
      break;
    case 'leaderboard':
      await renderLeaderboard();
      break;
    case 'projects':
      await renderProjects();
      break;
    case 'profile':
      await renderProfile();
      break;
    case 'admin':
      if (state.user?.role !== 'admin') {
        toast('Admin huquqi talab qilinadi.');
        await renderDashboard();
      } else {
        await renderAdmin();
      }
      break;
    default:
      await renderDashboard();
  }
}

// ==========================================
// 1. PUBLIC LANDING PAGE
// ==========================================

async function renderLanding() {
  let stats = { studentsCount: 0, questionsCount: 0, exercisesCount: 0, projectsCount: 0 };
  try {
    stats = await api('/public/stats');
  } catch (e) {
    // Fallback defaults
  }

  $('#app').innerHTML = `
    <!-- Public Navbar -->
    <header class="public-navbar">
      ${logoHtml()}
      <ul class="public-nav-links">
        <li><a href="#features">Imkoniyatlar</a></li>
        <li><a href="#about-ai">Mas’uliyatli AI</a></li>
        <li><a href="#projects">Loyihalar</a></li>
      </ul>
      <div style="display:flex; gap:0.8rem; align-items:center;">
        <button class="btn btn-secondary btn-sm" id="btn-nav-login">Tizimga kirish</button>
        <button class="btn btn-sm" id="btn-nav-register">Boshlash →</button>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <span class="eyebrow">✦ MAKTAB INNOVATSIYA PLATFORMASI</span>
        <h1>Kelajak bilimlari <span class="gradient-text">bugundan!</span></h1>
        <p class="lead">
          AI Maktab — o‘quvchilarga sun’iy intellektdan mas’uliyatli, xavfsiz va samarali foydalanishni o‘rgatuvchi zamonaviy interaktiv ta’lim platformasi. AI bilan savol-javob qiling, prompt yozishni mashq qiling va bilimingizni sinang!
        </p>
        <div class="hero-actions">
          <button class="btn" id="btn-hero-start">Boshlash — Hisob ochish ⚡</button>
          <button class="btn btn-secondary" id="btn-hero-explore">Platformani ko‘rish ↓</button>
        </div>
        <div class="hero-stats">
          <div class="hero-stat-item">
            <strong>${stats.studentsCount > 0 ? stats.studentsCount : 'Faol'}</strong>
            <span>O‘quvchilar</span>
          </div>
          <div class="hero-stat-item">
            <strong>${stats.questionsCount > 0 ? stats.questionsCount : '12+'}</strong>
            <span>Interaktiv savollar</span>
          </div>
          <div class="hero-stat-item">
            <strong>${stats.exercisesCount > 0 ? stats.exercisesCount : '5+'}</strong>
            <span>Prompt mashqlari</span>
          </div>
          <div class="hero-stat-item">
            <strong>${stats.projectsCount > 0 ? stats.projectsCount : '6+'}</strong>
            <span>AI Loyihalari</span>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="hero-card-preview">
          <div class="hero-robot-glow">🤖</div>
          <div style="text-align:center; margin-bottom:1.2rem;">
            <span class="badge badge-gold">AI Maktab Murabbiyi</span>
            <h3 style="margin-top:0.6rem;">Aqlli Ta’lim Muhiti</h3>
            <p class="small muted">Fanlarni o‘rganish, insho rejalari va dasturlashda sizga yordamga tayyor.</p>
          </div>
          <div style="background:rgba(6,21,47,0.7); border:1px solid var(--line); border-radius:12px; padding:1rem; font-size:0.88rem;">
            <div style="color:var(--cyan); font-weight:700; margin-bottom:0.3rem;">💬 O‘quvchi savoli:</div>
            <p style="color:white; margin-bottom:0.8rem;">"Fizika fanidan Nyutonning 2-qonunini hayotiy misol bilan tushuntirib bera olasizmi?"</p>
            <div style="color:var(--green); font-weight:700; margin-bottom:0.3rem;">✨ AI Javobi:</div>
            <p style="color:var(--text-dim); font-size:0.84rem;">"Albatta! Masalan, xarid aravachasini itarishni olaylik: agar aravacha bo‘sh bo‘lsa..."</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="landing-section" id="features">
      <div class="section-header">
        <span class="eyebrow">ASOSIY IMKONIYATLAR</span>
        <h2>Sun’iy intellekt orqali yangi ufqlarni oching</h2>
        <p>AI Maktab o‘quvchining mustaqil fikrlashi va bilim saviyasini oshirish uchun 4 ta asosiy yo‘nalishni taqdim etadi.</p>
      </div>

      <div class="grid grid-4">
        <div class="card card-interactive feature-box" data-action="auth-chat">
          <div class="feature-icon-wrapper">✧</div>
          <h3>AI Muloqot</h3>
          <p>Maktab fanlari bo‘yicha qiziqtirgan savollaringizni bering va tushunarli, pedagogik asoslangan javoblar oling.</p>
          <span style="color:var(--cyan); font-weight:700; font-size:0.9rem; margin-top:auto;">Suhbatlashish →</span>
        </div>

        <div class="card card-interactive feature-box" data-action="auth-prompt">
          <div class="feature-icon-wrapper">⌘</div>
          <h3>Prompt Lab</h3>
          <p>AI’ga to‘g‘ri va samarali so‘rovlar (prompt) yozish mahoratingizni amalda sinang va avtomat baho oling.</p>
          <span style="color:var(--cyan); font-weight:700; font-size:0.9rem; margin-top:auto;">Mashqlarni boshlash →</span>
        </div>

        <div class="card card-interactive feature-box" data-action="auth-quiz">
          <div class="feature-icon-wrapper">✓</div>
          <h3>Bilim Testlari</h3>
          <p>AI asoslari, axloq va so‘rovlar muhandisligi bo‘yicha testlarni yeching, ball to‘plang va yutuqlarni oching.</p>
          <span style="color:var(--cyan); font-weight:700; font-size:0.9rem; margin-top:auto;">Testni boshlash →</span>
        </div>

        <div class="card card-interactive feature-box" data-action="auth-leaderboard">
          <div class="feature-icon-wrapper">♜</div>
          <h3>Reyting Peshtaxtasi</h3>
          <p>To‘plagan ballaringiz bilan maktab peshqadamlari safiga kiring va sog‘lom intellektual musobaqada qatnashing.</p>
          <span style="color:var(--cyan); font-weight:700; font-size:0.9rem; margin-top:auto;">Reytingni ko‘rish →</span>
        </div>
      </div>
    </section>

    <!-- Responsible AI / Ethics Section -->
    <section class="landing-section" id="about-ai">
      <div class="ethics-banner">
        <div>
          <span class="eyebrow">XAVFSIZLIK VA MAS’ULIYAT</span>
          <h2 style="font-size:2rem; margin:0.6rem 0 1rem;">Sun’iy intellektdan to‘g‘ri foydalanish qoidalari</h2>
          <p style="margin-bottom:1.5rem;">
            Sun’iy intellekt — inson o‘rnini bosuvchi kuch emas, balki bilimlarni boyituvchi qudratli yordamchidir. Maktabda undan to‘g‘ri va mas’uliyatli foydalanish muhim.
          </p>
          <button class="btn btn-secondary" id="btn-ethics-join">Hamjamiyatga qo‘shiling →</button>
        </div>

        <div>
          <div class="ethics-item">
            <div class="ethics-icon">🛡️</div>
            <div>
              <strong style="display:block; color:#ffffff; font-size:1.05rem;">Faktlarni tekshirish</strong>
              <p class="small">AI ba’zan xato qilishi yoki faktlarni yanglish keltirishi mumkin. Muhim ma’lumotlarni doim darslikdan tekshiring.</p>
            </div>
          </div>
          <div class="ethics-item">
            <div class="ethics-icon">🔒</div>
            <div>
              <strong style="display:block; color:#ffffff; font-size:1.05rem;">Maxfiylikni saqlash</strong>
              <p class="small">Parollar, shaxsiy ma’lumotlar yoki oilaviy maxfiy axborotlarni hech qachon AI chatiga yubormang.</p>
            </div>
          </div>
          <div class="ethics-item">
            <div class="ethics-icon">💡</div>
            <div>
              <strong style="display:block; color:#ffffff; font-size:1.05rem;">Mustaqil fikrlash</strong>
              <p class="small">AI matnini shunchaki ko‘chirib olmang; uni tahlil qiling, o‘z fikrlaringiz va xulosalaringiz bilan boyiting.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Public Footer -->
    <footer class="public-footer">
      <div class="footer-inner">
        <div>
          ${logoHtml()}
          <p class="small muted" style="margin-top:1rem; max-width:320px;">
            AI Maktab — O‘zbekiston maktablarida sun’iy intellekt savodxonligi va innovatsion ko‘nikmalarni rivojlantirishga qaratilgan platforma.
          </p>
        </div>
        <div class="footer-col">
          <h4>Bo‘limlar</h4>
          <ul class="footer-links">
            <li><a href="javascript:void(0)" id="footer-link-chat">AI bilan muloqot</a></li>
            <li><a href="javascript:void(0)" id="footer-link-exercises">Prompt Lab</a></li>
            <li><a href="javascript:void(0)" id="footer-link-quizzes">Bilim testlari</a></li>
            <li><a href="javascript:void(0)" id="footer-link-leaderboard">Reyting peshtaxtasi</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Resurslar</h4>
          <ul class="footer-links">
            <li><a href="#about-ai">AI Mas’uliyati</a></li>
            <li><a href="javascript:void(0)" id="footer-link-projects">AI Loyihalar</a></li>
            <li><a href="javascript:void(0)" id="footer-link-help">Yordam & Qo‘llanma</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Bog‘lanish</h4>
          <p class="small muted">Maktab innovatsiya tashabbusi bo‘yicha takliflaringiz bo‘lsa, admin bilan bog‘laning.</p>
          <div style="margin-top:0.8rem; font-weight:700; color:var(--cyan);">support@aimaktab.uz</div>
        </div>
      </div>
      <div class="footer-bottom">
        <div>© 2026 AI Maktab. Barcha huquqlar himoyalangan.</div>
        <div>Kelajak bilimlari bugundan boshlanadi.</div>
      </div>
    </footer>
  `;

  // Attach event handlers
  $('#btn-nav-login').onclick = () => renderAuthModal('login');
  $('#btn-nav-register').onclick = () => renderAuthModal('register');
  $('#btn-hero-start').onclick = () => renderAuthModal('register');
  $('#btn-hero-explore').onclick = () => {
    $('#features').scrollIntoView({ behavior: 'smooth' });
  };
  $('#btn-ethics-join').onclick = () => renderAuthModal('register');

  $$('[data-action^="auth-"]').forEach(btn => {
    btn.onclick = () => renderAuthModal('register');
  });

  const footerLinks = [
    ['#footer-link-chat', 'chat'],
    ['#footer-link-exercises', 'exercises'],
    ['#footer-link-quizzes', 'quizzes'],
    ['#footer-link-leaderboard', 'leaderboard'],
    ['#footer-link-projects', 'projects']
  ];

  footerLinks.forEach(([selector, page]) => {
    const el = $(selector);
    if (el) el.onclick = () => (state.user ? navigate(page) : renderAuthModal('login'));
  });

  const helpLink = $('#footer-link-help');
  if (helpLink) {
    helpLink.onclick = () => {
      openModal(`
        <h3 style="margin-bottom:0.8rem;">AI Maktab Qo‘llanmasi</h3>
        <p class="small muted" style="margin-bottom:1rem;">
          Platformadan foydalanish juda oddiy:
        </p>
        <ol style="padding-left:1.2rem; display:grid; gap:0.6rem; font-size:0.9rem; color:var(--text-dim);">
          <li><b>Ro‘yxatdan o‘ting</b> — ismingiz va emailingizni kiriting (+25 ball olasiz).</li>
          <li><b>AI bilan suhbatlashing</b> — fanlar va topshiriqlar bo‘yicha savol bering.</li>
          <li><b>Prompt yozishni mashq qiling</b> — Prompt Lab'da har bir topshiriqdan 20 ballgacha yig‘ing.</li>
          <li><b>Testlarni yeching</b> — to‘g‘ri javoblar uchun qo‘shimcha ballar oling.</li>
          <li><b>Reytingda ko‘tariling</b> — eng faol o‘quvchilar ro‘yxatida birinchi o‘rinlarni zabt eting!</li>
        </ol>
      `);
    };
  }
}

// ==========================================
// 2. AUTHENTICATION MODAL
// ==========================================

function renderAuthModal(initialTab = 'login') {
  const content = `
    <div class="auth-tabs">
      <button class="auth-tab-btn ${initialTab === 'login' ? 'active' : ''}" id="tab-login">Tizimga kirish</button>
      <button class="auth-tab-btn ${initialTab === 'register' ? 'active' : ''}" id="tab-register">Ro‘yxatdan o‘tish</button>
    </div>

    <form id="auth-form">
      <div id="register-fields" style="${initialTab === 'register' ? 'display:block;' : 'display:none;'}">
        <div class="form-group">
          <label for="input-name">Ism va familiya *</label>
          <input type="text" id="input-name" class="form-control" placeholder="Masalan: Jasur Aliyev" autocomplete="name">
        </div>
        <div class="form-group">
          <label for="input-grade">Sinf / Maktab darajasi (ixtiyoriy)</label>
          <input type="text" id="input-grade" class="form-control" placeholder="Masalan: 9-A sinf">
        </div>
      </div>

      <div class="form-group">
        <label for="input-email">Email manzil *</label>
        <input type="email" id="input-email" class="form-control" placeholder="emailingiz@misol.uz" required autocomplete="email">
      </div>

      <div class="form-group">
        <label for="input-password">Parol *</label>
        <input type="password" id="input-password" class="form-control" placeholder="Kamida 8 ta belgi" required minlength="8" autocomplete="current-password">
      </div>

      <div id="auth-error" style="color:var(--red); font-size:0.85rem; margin-bottom:1rem; display:none;"></div>

      <button type="submit" class="btn btn-full" id="auth-submit-btn">
        ${initialTab === 'register' ? 'Hisob yaratish ⚡' : 'Kirish →'}
      </button>
    </form>

    <p class="small muted" style="text-align:center; margin-top:1.2rem;">
      Kirish orqali siz platformadan mas’uliyatli va halol foydalanishga rozilik bildirasiz.
    </p>
  `;

  openModal(content);

  let currentTab = initialTab;
  const tabLogin = $('#tab-login');
  const tabRegister = $('#tab-register');
  const regFields = $('#register-fields');
  const submitBtn = $('#auth-submit-btn');
  const errorBox = $('#auth-error');

  function setTab(tab) {
    currentTab = tab;
    tabLogin.classList.toggle('active', tab === 'login');
    tabRegister.classList.toggle('active', tab === 'register');
    regFields.style.display = tab === 'register' ? 'block' : 'none';
    submitBtn.textContent = tab === 'register' ? 'Hisob yaratish ⚡' : 'Kirish →';
    errorBox.style.display = 'none';
  }

  tabLogin.onclick = () => setTab('login');
  tabRegister.onclick = () => setTab('register');

  $('#auth-form').onsubmit = async (e) => {
    e.preventDefault();
    errorBox.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Yuklanmoqda...';

    const email = $('#input-email').value.trim();
    const password = $('#input-password').value;

    try {
      if (currentTab === 'register') {
        const name = $('#input-name').value.trim();
        const grade = $('#input-grade').value.trim();

        if (name.length < 2) {
          throw new Error('Ism kamida 2 ta belgidan iborat bo‘lishi lozim');
        }

        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, grade })
        });

        state.user = data.user;
        closeModal();
        toast(`Xush kelibsiz, ${state.user.name}! +25 ball mukofot berildi.`);
        await navigate('dashboard');
      } else {
        const data = await api('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });

        state.user = data.user;
        closeModal();
        toast(`Xush kelibsiz, ${state.user.name}!`);
        await navigate('dashboard');
      }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = currentTab === 'register' ? 'Hisob yaratish ⚡' : 'Kirish →';
    }
  };
}

// ==========================================
// 3. APPLICATION SHELL
// ==========================================

function renderShell(pageTitle, contentHtml) {
  const user = state.user;
  const initial = (user.name || 'A').charAt(0).toUpperCase();

  const navItems = [
    { id: 'dashboard', icon: '⌂', label: 'Bosh sahifa' },
    { id: 'chat', icon: '✧', label: 'AI Muloqot' },
    { id: 'exercises', icon: '⌘', label: 'Prompt Lab' },
    { id: 'quizzes', icon: '✓', label: 'Bilim Testlari' },
    { id: 'leaderboard', icon: '♜', label: 'Reyting' },
    { id: 'projects', icon: '🚀', label: 'AI Loyihalar' },
    { id: 'profile', icon: '♙', label: 'Profilim' }
  ];

  if (user.role === 'admin') {
    navItems.push({ id: 'admin', icon: '⚙', label: 'Admin Panel' });
  }

  $('#app').innerHTML = `
    <div class="app-container">
      <!-- Sidebar -->
      <aside class="app-sidebar ${state.sidebarOpen ? 'open' : ''}" id="app-sidebar">
        <div class="sidebar-header">
          ${logoHtml()}
        </div>

        <nav class="sidebar-nav">
          ${navItems.map(item => `
            <button class="nav-link-btn ${state.page === item.id ? 'active' : ''}" data-nav="${item.id}">
              <span class="nav-icon">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `).join('')}
        </nav>

        <div class="sidebar-footer">
          <button class="nav-link-btn" id="btn-sidebar-logout" style="color:var(--red);">
            <span class="nav-icon">↪</span>
            <span>Chiqish</span>
          </button>
          <div style="font-size:0.75rem; color:var(--muted); padding:0.8rem 1rem 0;">
            AI Maktab v1.0 · O‘quvchi
          </div>
        </div>
      </aside>

      <!-- Main Area -->
      <div class="app-main">
        <header class="app-topbar">
          <div class="topbar-left">
            <button class="mobile-toggle-btn" id="btn-mobile-toggle">☰</button>
            <h1 class="page-title">${pageTitle}</h1>
          </div>

          <div class="topbar-right">
            <div class="points-pill" title="To‘plagan ballaringiz">
              <span>⭐</span>
              <span id="topbar-points">${user.points || 0}</span>
              <span style="font-size:0.75rem; text-transform:uppercase;">ball</span>
            </div>

            <button class="user-profile-btn" data-nav="profile">
              <div class="user-avatar">${initial}</div>
              <div style="text-align:left; display:none; @media(min-width:600px){display:block;}">
                <div style="font-weight:700; font-size:0.88rem; color:#ffffff; line-height:1.2;">
                  ${esc(user.name.split(' ')[0])}
                </div>
                <div style="font-size:0.75rem; color:var(--muted); line-height:1;">
                  ${user.role === 'admin' ? 'Admin' : (user.grade || 'O‘quvchi')}
                </div>
              </div>
            </button>
          </div>
        </header>

        <main class="app-content" id="app-content">
          ${contentHtml}
        </main>
      </div>
    </div>
  `;

  // Attach navigation listeners
  $$('[data-nav]').forEach(btn => {
    btn.onclick = () => navigate(btn.dataset.nav);
  });

  const mobileToggle = $('#btn-mobile-toggle');
  if (mobileToggle) {
    mobileToggle.onclick = () => {
      state.sidebarOpen = !state.sidebarOpen;
      $('#app-sidebar').classList.toggle('open', state.sidebarOpen);
    };
  }

  const logoutBtn = $('#btn-sidebar-logout');
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch (e) {}
      state.user = null;
      toast('Tizimdan chiqildi.');
      await navigate('landing');
    };
  }
}

// ==========================================
// 4. STUDENT DASHBOARD
// ==========================================

async function renderDashboard() {
  const data = await api('/dashboard');
  const user = data.user;
  state.user = user;

  const html = `
    <!-- Welcome Banner -->
    <div class="welcome-banner">
      <div>
        <span class="eyebrow">Xush kelibsiz 👋</span>
        <h2>Salom, ${esc(user.name.split(' ')[0])}!</h2>
        <p>
          Bugun yangi AI ko‘nikmalarini egallash va o‘quv topshiriqlarini bajarish uchun ajoyib imkoniyat.
        </p>
        <div style="display:flex; gap:0.8rem; margin-top:1.4rem;">
          <button class="btn btn-sm" data-dash-nav="chat">AI bilan muloqot →</button>
          <button class="btn btn-secondary btn-sm" data-dash-nav="exercises">Prompt Lab topshirig‘i</button>
        </div>
      </div>
      <div style="font-size:4.5rem; filter:drop-shadow(0 0 25px var(--cyan-glow));">⚡</div>
    </div>

    <!-- 4 Stats Cards -->
    <div class="grid grid-4" style="margin-bottom:2rem;">
      <div class="card stat-card">
        <div class="stat-icon" style="color:var(--gold); border-color:rgba(246,190,60,0.3); background:rgba(246,190,60,0.1);">⭐</div>
        <div>
          <span class="small muted">Jami ball</span>
          <div class="stat-val">${data.stats.totalPoints}</div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="color:var(--cyan);">♜</div>
        <div>
          <span class="small muted">Reyting o‘rni</span>
          <div class="stat-val">#${data.rank || 1}</div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="color:var(--green); border-color:rgba(46,214,161,0.3); background:rgba(46,214,161,0.1);">✓</div>
        <div>
          <span class="small muted">Test aniqligi</span>
          <div class="stat-val">${data.stats.quizAccuracy}% <span class="small muted">(${data.stats.quizCorrect}/${data.stats.quizTotal})</span></div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="stat-icon" style="color:#bd86f5; border-color:rgba(189,134,245,0.3); background:rgba(189,134,245,0.1);">⌘</div>
        <div>
          <span class="small muted">Prompt mashqlari</span>
          <div class="stat-val">${data.stats.promptTotal} <span class="small muted">(${data.stats.promptBestScore} ball)</span></div>
        </div>
      </div>
    </div>

    <!-- Quick Sections Grid -->
    <div class="grid grid-2" style="margin-bottom:2rem;">
      <!-- Recommended Exercises -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;">
          <h3 style="font-size:1.15rem;">Tavsiya etilgan amaliy mashqlar</h3>
          <button class="btn btn-outline btn-sm" data-dash-nav="exercises">Barchasi</button>
        </div>
        <div style="display:grid; gap:0.9rem;">
          ${data.recommendedExercises.map(ex => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(6,21,47,0.6); padding:0.9rem 1.1rem; border-radius:12px; border:1px solid var(--line);">
              <div>
                <strong style="display:block; color:#ffffff; font-size:0.95rem;">${esc(ex.title)}</strong>
                <span class="small muted">${esc(ex.category)} · Maksimal ${ex.max_points} ball</span>
              </div>
              <button class="btn btn-sm btn-secondary" data-dash-ex="${ex.id}">Bajarish →</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Earned Achievements -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;">
          <h3 style="font-size:1.15rem;">Sizning yutuqlaringiz</h3>
          <button class="btn btn-outline btn-sm" data-dash-nav="profile">Barchasi</button>
        </div>
        <div style="display:grid; gap:0.9rem;">
          ${data.achievements.length > 0 ? data.achievements.map(a => `
            <div class="achievement-badge">
              <div class="achievement-icon">${a.icon}</div>
              <div>
                <strong style="display:block; color:#ffffff; font-size:0.95rem;">${esc(a.title)}</strong>
                <span class="small muted">Qo‘lga kiritildi</span>
              </div>
            </div>
          `).join('') : `
            <div class="small muted" style="padding:1.5rem; text-align:center;">
              Hali yangi yutuqlar ochilmadi. Test yeching va prompt yozib yutuqlarga ega bo‘ling!
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <h3 style="font-size:1.15rem; margin-bottom:1.2rem;">So‘nggi faoliyat</h3>
      ${data.recentActivity.length > 0 ? `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Harakat</th>
                <th>Tavsif</th>
                <th>Ball</th>
                <th>Vaqt</th>
              </tr>
            </thead>
            <tbody>
              ${data.recentActivity.map(act => `
                <tr>
                  <td><span class="badge">${esc(act.activity_type)}</span></td>
                  <td>${esc(act.description)}</td>
                  <td><strong style="color:${act.points_change >= 0 ? 'var(--green)' : 'var(--red)'};">${act.points_change > 0 ? '+' : ''}${act.points_change}</strong></td>
                  <td class="small muted">${new Date(act.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <p class="small muted">Hozircha faoliyat yozuvlari mavjud emas.</p>
      `}
    </div>
  `;

  renderShell('Boshqaruv paneli', html);

  $$('[data-dash-nav]').forEach(b => {
    b.onclick = () => navigate(b.dataset.dashNav);
  });

  $$('[data-dash-ex]').forEach(b => {
    b.onclick = () => navigate('exercises');
  });
}

// ==========================================
// 5. REAL AI ASSISTANT CHAT
// ==========================================

async function renderChat() {
  const data = await api('/chat/history');
  const messages = data.messages || [];

  const html = `
    <div class="chat-container">
      <div class="chat-header">
        <div>
          <h2 style="font-size:1.2rem; color:#ffffff;">AI Maktab Murabbiyi</h2>
          <span class="small muted">Fanlar bo‘yicha savol bering, mavzuni tushunib oling yoki insho rejasini tuzing.</span>
        </div>
        <div style="display:flex; gap:0.6rem; align-items:center;">
          <span class="badge ${data.aiConfigured ? 'badge-green' : 'badge-gold'}">
            ${data.aiConfigured ? '● Jonli AI Ulangan' : '○ Standart Rejim'}
          </span>
          <button class="btn btn-secondary btn-sm" id="btn-clear-chat">Tozalash</button>
        </div>
      </div>

      <div class="chat-warning-banner">
        <span>⚠️</span>
        <span>Eslatma: Sun’iy intellekt xato qilishi mumkin. Muhim faktlarni darslik va rasmiy manbalardan tekshiring. Maxfiy ma’lumotlarni yubormang!</span>
      </div>

      <div class="chat-messages" id="chat-messages">
        ${messages.length === 0 ? `
          <div style="text-align:center; padding:3rem 1rem; color:var(--muted); max-width:540px; margin:0 auto;">
            <div style="font-size:3rem; margin-bottom:0.8rem;">🤖</div>
            <h3 style="color:#ffffff; margin-bottom:0.5rem;">Salom! Men AI Maktab yordamchisiman.</h3>
            <p class="small">
              Menga matematika formulalari, tarixiy sanalar, ingliz tili qoidalari yoki dasturlash bo‘yicha istalgan savolingizni berishingiz mumkin.
            </p>
          </div>
        ` : messages.map(m => `
          <div class="chat-bubble ${m.role}">
            ${esc(m.content)}
          </div>
        `).join('')}
      </div>

      <form class="chat-input-bar" id="chat-form">
        <textarea id="chat-input" class="form-control" rows="1" placeholder="Savolingizni yozing... (Yuborish uchun Enter bosing)" style="max-height:120px;" required></textarea>
        <button type="submit" class="btn" id="btn-send-chat" style="padding:0.8rem 1.4rem;">Yuborish ↑</button>
      </form>
    </div>
  `;

  renderShell('AI bilan muloqot', html);

  const messagesBox = $('#chat-messages');
  messagesBox.scrollTop = messagesBox.scrollHeight;

  const chatInput = $('#chat-input');
  const chatForm = $('#chat-form');
  const sendBtn = $('#btn-send-chat');

  // Auto-resize textarea
  chatInput.oninput = () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
  };

  // Keyboard Enter to send
  chatInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  };

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Append user message immediately
    messagesBox.insertAdjacentHTML('beforeend', `
      <div class="chat-bubble user">${esc(message)}</div>
    `);

    // Thinking placeholder
    messagesBox.insertAdjacentHTML('beforeend', `
      <div class="chat-bubble assistant" id="chat-thinking">
        <span class="spinner" style="width:16px; height:16px; display:inline-block; vertical-align:middle; margin-right:8px;"></span>
        AI javob tayyorlamoqda...
      </div>
    `);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    sendBtn.disabled = true;

    try {
      const res = await api('/chat', {
        method: 'POST',
        body: JSON.stringify({ message })
      });

      const thinking = $('#chat-thinking');
      if (thinking) thinking.remove();

      messagesBox.insertAdjacentHTML('beforeend', `
        <div class="chat-bubble assistant">${esc(res.reply)}</div>
      `);

      if (res.newAchievements && res.newAchievements.length > 0) {
        res.newAchievements.forEach(a => {
          toast(`🏆 Yangi yutuq: "${a.title}" (+${a.bonus} ball)!`);
        });
        const me = await api('/me');
        state.user = me.user;
        $('#topbar-points').textContent = me.user.points;
      }
    } catch (err) {
      const thinking = $('#chat-thinking');
      if (thinking) {
        thinking.textContent = 'Xatolik: ' + err.message;
        thinking.style.borderColor = 'var(--red)';
      }
    } finally {
      sendBtn.disabled = false;
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }
  };

  $('#btn-clear-chat').onclick = async () => {
    if (!confirm('Rostdan ham barcha suhbat tarixini tozalamoqchimisiz?')) return;
    try {
      await api('/chat/history', { method: 'DELETE' });
      messagesBox.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:var(--muted);">
          Suhbat tarixi tozalandi.
        </div>
      `;
      toast('Suhbat tozalandi.');
    } catch (err) {
      toast(err.message);
    }
  };
}

// ==========================================
// 6. PROMPT LAB
// ==========================================

async function renderExercises() {
  const data = await api('/exercises');
  const exercises = data.exercises || [];

  const html = `
    <div class="welcome-banner" style="margin-bottom:2rem;">
      <div>
        <span class="eyebrow">AMALIY SO‘ROVLAR LABORATORIYASI</span>
        <h2>Prompt Lab — AI Bilan Samarali Muloqot</h2>
        <p>
          Sun’iy intellekt siz bergan so‘rov (prompt) sifatiga qarab javob beradi. Bu yerda siz rol, maqsad, auditoriya va formatni to‘g‘ri belgilash orqali kuchli promptlar yozishni o‘rganasiz.
        </p>
      </div>
      <div style="font-size:4rem;">⌘</div>
    </div>

    <div class="grid grid-3" id="exercises-list" style="margin-bottom:2.5rem;">
      ${exercises.map(ex => `
        <div class="card card-interactive" style="display:flex; flex-direction:column;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
            <span class="badge">${esc(ex.category)}</span>
            <span class="badge badge-gold">Max ${ex.max_points} ball</span>
          </div>
          <h3 style="font-size:1.15rem; margin-bottom:0.6rem;">${esc(ex.title)}</h3>
          <p class="small muted" style="margin-bottom:1.2rem; flex:1;">${esc(ex.description)}</p>
          <button class="btn btn-sm btn-secondary" data-open-exercise="${ex.id}">Mashqni boshlash →</button>
        </div>
      `).join('')}
    </div>

    <div id="exercise-workspace" style="display:none;"></div>
  `;

  renderShell('Prompt Lab', html);

  $$('[data-open-exercise]').forEach(btn => {
    btn.onclick = () => openExerciseWorkspace(btn.dataset.openExercise);
  });
}

async function openExerciseWorkspace(exerciseId) {
  const data = await api(`/exercises/${exerciseId}`);
  const ex = data.exercise;
  const submissions = data.submissions || [];

  const container = $('#exercise-workspace');
  container.style.display = 'block';

  container.innerHTML = `
    <div class="card" style="border-color:var(--cyan); box-shadow:var(--shadow-glow); margin-bottom:2rem;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
        <div>
          <span class="eyebrow">Topshiriq</span>
          <h2>${esc(ex.title)}</h2>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-close-workspace">✕ Yopish</button>
      </div>

      <div class="prompt-workspace">
        <!-- Guidelines and Input -->
        <div>
          <div style="background:rgba(6,21,47,0.7); border:1px solid var(--line); border-radius:12px; padding:1.2rem; margin-bottom:1.4rem;">
            <strong style="color:var(--cyan); display:block; margin-bottom:0.4rem;">Topshiriq maqsadi:</strong>
            <p style="color:#ffffff; margin-bottom:0.8rem;">${esc(ex.goal)}</p>
            <strong style="color:var(--muted); display:block; font-size:0.85rem; margin-bottom:0.2rem;">Namuna:</strong>
            <p class="small muted" style="font-style:italic;">"${esc(ex.example_input)}"</p>
          </div>

          <form id="prompt-form">
            <div class="form-group">
              <label for="prompt-input" style="display:flex; justify-content:space-between;">
                <span>AI uchun yozgan promptingiz:</span>
                <span class="small muted" id="char-count">0 belgi</span>
              </label>
              <textarea id="prompt-input" class="form-control" rows="6" placeholder="Sen tajribali... Menga... 8-sinf o‘quvchilari uchun... ro‘yxat shaklida..." required minlength="10"></textarea>
            </div>
            <button type="submit" class="btn" id="btn-submit-prompt">Promptni baholash va topshirish ⚡</button>
          </form>

          <div id="evaluation-result"></div>
        </div>

        <!-- Criteria & Past Submissions -->
        <div>
          <h3 style="font-size:1.1rem; margin-bottom:0.8rem;">Baholash mezonlari (20 ball)</h3>
          <ul class="criteria-list">
            <li class="criteria-item">
              <span>🎯 Rol va maqsad aniqligi</span>
              <strong style="color:var(--cyan);">5 ball</strong>
            </li>
            <li class="criteria-item">
              <span>👥 Auditoriya va kontekst</span>
              <strong style="color:var(--cyan);">5 ball</strong>
            </li>
            <li class="criteria-item">
              <span>📋 Natija formati va uslubi</span>
              <strong style="color:var(--cyan);">5 ball</strong>
            </li>
            <li class="criteria-item">
              <span>📏 Cheklovlar va talablar</span>
              <strong style="color:var(--cyan);">5 ball</strong>
            </li>
          </ul>

          <h3 style="font-size:1.1rem; margin:1.5rem 0 0.8rem;">Sizning avvalgi urinishlaringiz</h3>
          ${submissions.length > 0 ? submissions.map(s => `
            <div style="background:rgba(6,21,47,0.5); border:1px solid var(--line); border-radius:10px; padding:0.9rem; margin-bottom:0.6rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.3rem;">
                <span class="badge ${s.score >= 15 ? 'badge-green' : 'badge-gold'}">${s.score} / ${ex.max_points} ball</span>
                <span class="muted">${new Date(s.created_at).toLocaleDateString('uz-UZ')}</span>
              </div>
              <p class="muted" style="margin-bottom:0.4rem; font-style:italic;">"${esc(s.prompt_text.slice(0, 80))}..."</p>
              <div style="color:var(--text-dim);">${esc(s.feedback)}</div>
            </div>
          `).join('') : `
            <p class="small muted">Bu topshiriq bo‘yicha hali urinish qilmadingiz.</p>
          `}
        </div>
      </div>
    </div>
  `;

  container.scrollIntoView({ behavior: 'smooth' });

  $('#btn-close-workspace').onclick = () => {
    container.style.display = 'none';
  };

  const pInput = $('#prompt-input');
  const charCounter = $('#char-count');
  pInput.oninput = () => {
    charCounter.textContent = pInput.value.length + ' belgi';
  };

  $('#prompt-form').onsubmit = async (e) => {
    e.preventDefault();
    const prompt = pInput.value.trim();
    if (prompt.length < 10) {
      toast('Prompt kamida 10 ta belgidan iborat bo‘lishi lozim');
      return;
    }

    const subBtn = $('#btn-submit-prompt');
    subBtn.disabled = true;
    subBtn.textContent = 'Baholanmoqda...';

    const resultBox = $('#evaluation-result');
    resultBox.innerHTML = `
      <div style="padding:1rem; text-align:center; color:var(--cyan);">
        <span class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-right:8px;"></span>
        AI va pedagogik rubrika orqali baholanmoqda...
      </div>
    `;

    try {
      const res = await api(`/exercises/${ex.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      resultBox.innerHTML = `
        <div class="rubric-score-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem;">
            <div>
              <span class="eyebrow">Natija</span>
              <h3 style="font-size:1.4rem; color:#ffffff;">${res.score} / ${res.maxPoints} ball</h3>
            </div>
            <span class="badge ${res.score >= 15 ? 'badge-green' : 'badge-gold'}">
              ${res.score >= 17 ? 'A’lo natija' : res.score >= 12 ? 'Yaxshi' : 'Qoniqarli'}
            </span>
          </div>

          <p style="color:#ffffff; margin-bottom:1rem; line-height:1.6;">${esc(res.feedback)}</p>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.85rem; background:rgba(6,21,47,0.7); padding:0.8rem; border-radius:8px;">
            <div>Rol va maqsad: <b>${res.criteriaScores?.goal_and_role || 0}/5</b></div>
            <div>Auditoriya: <b>${res.criteriaScores?.audience_and_context || 0}/5</b></div>
            <div>Natija formati: <b>${res.criteriaScores?.format_and_style || 0}/5</b></div>
            <div>Cheklovlar: <b>${res.criteriaScores?.constraints || 0}/5</b></div>
          </div>
        </div>
      `;

      state.user.points = res.currentPoints;
      $('#topbar-points').textContent = res.currentPoints;
      toast(`+${res.score} ball hisobingizga qo‘shildi!`);

      if (res.newAchievements && res.newAchievements.length > 0) {
        res.newAchievements.forEach(a => {
          toast(`🏆 Yangi yutuq: "${a.title}" (+${a.bonus} ball)!`);
        });
      }
    } catch (err) {
      resultBox.innerHTML = `
        <div style="color:var(--red); padding:1rem; border:1px solid var(--red); border-radius:10px; margin-top:1rem;">
          Xatolik: ${esc(err.message)}
        </div>
      `;
    } finally {
      subBtn.disabled = false;
      subBtn.textContent = 'Promptni baholash va topshirish ⚡';
    }
  };
}

// ==========================================
// 7. TESTS AND QUIZZES
// ==========================================

async function renderQuizzes() {
  const [catData, qData] = await Promise.all([
    api('/quizzes/categories'),
    api('/quizzes' + (state.quiz.selectedCategory ? `?category=${encodeURIComponent(state.quiz.selectedCategory)}` : ''))
  ]);

  state.quiz.questions = qData.questions || [];
  state.quiz.currentIndex = 0;
  state.quiz.answered = false;

  const categories = catData.categories || [];

  const html = `
    <!-- Categories Filter -->
    <div style="display:flex; gap:0.6rem; overflow-x:auto; padding-bottom:0.8rem; margin-bottom:1.8rem;">
      <button class="btn btn-sm ${!state.quiz.selectedCategory ? '' : 'btn-secondary'}" data-quiz-cat="">
        Barchasi (${state.quiz.questions.length})
      </button>
      ${categories.map(c => `
        <button class="btn btn-sm ${state.quiz.selectedCategory === c.name ? '' : 'btn-secondary'}" data-quiz-cat="${esc(c.name)}">
          ${c.icon} ${esc(c.name)} (${c.questions_count})
        </button>
      `).join('')}
    </div>

    <!-- Interactive Quiz Player Area -->
    <div class="card quiz-player-card" id="quiz-player-area">
      ${state.quiz.questions.length === 0 ? `
        <div style="text-align:center; padding:3rem; color:var(--muted);">
          Ushbu toifada savollar mavjud emas.
        </div>
      ` : renderQuestionView(state.quiz.questions[0], 0, state.quiz.questions.length)}
    </div>
  `;

  renderShell('Bilim Testlari', html);

  $$('[data-quiz-cat]').forEach(b => {
    b.onclick = async () => {
      state.quiz.selectedCategory = b.dataset.quizCat || null;
      await renderQuizzes();
    };
  });

  attachQuestionEvents();
}

function renderQuestionView(question, index, total) {
  const progressPercent = Math.round(((index + 1) / total) * 100);

  return `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span class="badge">${esc(question.category)}</span>
      <div style="display:flex; gap:0.6rem; align-items:center;">
        <span class="small muted">Savol ${index + 1} / ${total}</span>
        <span class="badge badge-gold">+${question.points} ball</span>
      </div>
    </div>

    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width:${progressPercent}%;"></div>
    </div>

    <h2 style="font-size:1.35rem; margin:1.5rem 0 1.2rem; line-height:1.4;">
      ${esc(question.question)}
    </h2>

    <div class="quiz-options-list" id="quiz-options">
      ${(question.options || []).map((opt, i) => `
        <button class="quiz-option-btn" data-option-index="${i}">
          <div class="quiz-option-letter">${String.fromCharCode(65 + i)}</div>
          <span style="flex:1;">${esc(opt)}</span>
        </button>
      `).join('')}
    </div>

    <div id="quiz-feedback-container"></div>

    <div style="display:flex; justify-content:flex-end; margin-top:1.5rem;">
      <button class="btn" id="btn-next-question" style="display:none;">
        ${index + 1 === total ? 'Testni yakunlash 🏁' : 'Keyingi savol →'}
      </button>
    </div>
  `;
}

function attachQuestionEvents() {
  const q = state.quiz.questions[state.quiz.currentIndex];
  if (!q) return;

  $$('#quiz-options .quiz-option-btn').forEach(btn => {
    btn.onclick = async () => {
      if (state.quiz.answered) return;
      state.quiz.answered = true;

      const selectedIndex = Number(btn.dataset.optionIndex);

      // Disable all options
      $$('#quiz-options .quiz-option-btn').forEach(b => b.disabled = true);

      try {
        const res = await api(`/quizzes/${q.id}/answer`, {
          method: 'POST',
          body: JSON.stringify({ selectedIndex })
        });

        const feedbackBox = $('#quiz-feedback-container');

        if (res.correct) {
          btn.classList.add('selected-correct');
          feedbackBox.innerHTML = `
            <div class="quiz-feedback-box correct">
              <strong style="display:block; margin-bottom:0.3rem;">✓ Barakalla, to‘g‘ri javob! ${res.pointsAwarded > 0 ? `(+${res.pointsAwarded} ball)` : ''}</strong>
              <p class="small" style="color:var(--text-dim);">${esc(res.explanation)}</p>
            </div>
          `;
          if (res.pointsAwarded > 0) {
            toast(`+${res.pointsAwarded} ball hisobingizga qo‘shildi!`);
          }
        } else {
          btn.classList.add('selected-wrong');
          // Highlight correct answer
          const correctBtn = $(`#quiz-options [data-option-index="${res.correctIndex}"]`);
          if (correctBtn) correctBtn.classList.add('selected-correct');

          feedbackBox.innerHTML = `
            <div class="quiz-feedback-box wrong">
              <strong style="display:block; margin-bottom:0.3rem;">✕ Afsuski, noto‘g‘ri javob.</strong>
              <p class="small" style="color:var(--text-dim);">${esc(res.explanation)}</p>
            </div>
          `;
        }

        // Update topbar points
        state.user.points = res.currentPoints;
        $('#topbar-points').textContent = res.currentPoints;

        if (res.newAchievements && res.newAchievements.length > 0) {
          res.newAchievements.forEach(a => {
            toast(`🏆 Yangi yutuq: "${a.title}" (+${a.bonus} ball)!`);
          });
        }

        $('#btn-next-question').style.display = 'inline-flex';
      } catch (err) {
        toast(err.message);
        state.quiz.answered = false;
      }
    };
  });

  const nextBtn = $('#btn-next-question');
  if (nextBtn) {
    nextBtn.onclick = () => {
      if (state.quiz.currentIndex + 1 < state.quiz.questions.length) {
        state.quiz.currentIndex++;
        state.quiz.answered = false;
        $('#quiz-player-area').innerHTML = renderQuestionView(
          state.quiz.questions[state.quiz.currentIndex],
          state.quiz.currentIndex,
          state.quiz.questions.length
        );
        attachQuestionEvents();
      } else {
        // Finished all questions
        $('#quiz-player-area').innerHTML = `
          <div style="text-align:center; padding:3rem 1rem;">
            <div style="font-size:4rem; margin-bottom:1rem;">🏆</div>
            <h2 style="font-size:2rem; margin-bottom:0.6rem;">Ajoyib natija!</h2>
            <p class="lead muted" style="margin-bottom:1.8rem;">
              Siz ushbu bo‘limdagi test savollarini yakunladingiz. Reytingdagi o‘rningizni ko‘ring yoki boshqa mashqlarga o‘ting!
            </p>
            <div style="display:flex; justify-content:center; gap:1rem;">
              <button class="btn" id="btn-quiz-again">Qayta ishlash</button>
              <button class="btn btn-secondary" id="btn-quiz-to-lead">Reyting peshtaxtasi →</button>
            </div>
          </div>
        `;

        $('#btn-quiz-again').onclick = () => renderQuizzes();
        $('#btn-quiz-to-lead').onclick = () => navigate('leaderboard');
      }
    };
  }
}

// ==========================================
// 8. LEADERBOARD
// ==========================================

async function renderLeaderboard() {
  const data = await api('/leaderboard');
  const list = data.leaderboard || [];

  const top1 = list[0] || null;
  const top2 = list[1] || null;
  const top3 = list[2] || null;

  const html = `
    <!-- Top 3 Podium -->
    <div class="podium-container">
      <!-- 2nd place -->
      <div class="podium-card second">
        <div style="font-size:2rem; margin-bottom:0.4rem;">🥈</div>
        <div class="user-avatar" style="margin:0 auto 0.8rem; width:48px; height:48px; font-size:1.2rem;">
          ${top2 ? esc(top2.name.charAt(0)) : '-'}
        </div>
        <strong style="display:block; color:#ffffff; font-size:1rem;">${top2 ? esc(top2.name) : 'Kutilmoqda'}</strong>
        <span class="small muted">${top2?.grade || 'O‘quvchi'}</span>
        <div style="font-size:1.3rem; font-weight:800; color:var(--text); margin-top:0.6rem;">
          ${top2?.points || 0} ⭐
        </div>
      </div>

      <!-- 1st place -->
      <div class="podium-card first">
        <div style="font-size:2.6rem; margin-bottom:0.4rem;">🥇</div>
        <div class="user-avatar" style="margin:0 auto 0.8rem; width:58px; height:58px; font-size:1.5rem; background:linear-gradient(135deg, #f5b041, #f39c12);">
          ${top1 ? esc(top1.name.charAt(0)) : '-'}
        </div>
        <strong style="display:block; color:#ffffff; font-size:1.15rem;">${top1 ? esc(top1.name) : 'Kutilmoqda'}</strong>
        <span class="small muted">${top1?.grade || 'Chempion'}</span>
        <div style="font-size:1.6rem; font-weight:800; color:var(--gold); margin-top:0.6rem;">
          ${top1?.points || 0} ⭐
        </div>
      </div>

      <!-- 3rd place -->
      <div class="podium-card third">
        <div style="font-size:2rem; margin-bottom:0.4rem;">🥉</div>
        <div class="user-avatar" style="margin:0 auto 0.8rem; width:48px; height:48px; font-size:1.2rem;">
          ${top3 ? esc(top3.name.charAt(0)) : '-'}
        </div>
        <strong style="display:block; color:#ffffff; font-size:1rem;">${top3 ? esc(top3.name) : 'Kutilmoqda'}</strong>
        <span class="small muted">${top3?.grade || 'O‘quvchi'}</span>
        <div style="font-size:1.3rem; font-weight:800; color:var(--text); margin-top:0.6rem;">
          ${top3?.points || 0} ⭐
        </div>
      </div>
    </div>

    <!-- Full Leaderboard Table -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;">
        <div>
          <h3 style="font-size:1.2rem;">Maktabning eng faol o‘quvchilari</h3>
          <span class="small muted">Haqiqiy faoliyat natijalari asosida yangilanadi</span>
        </div>
        <span class="badge">Top 50</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:70px;">O‘rin</th>
              <th>O‘quvchi</th>
              <th>Sinf / Daraja</th>
              <th>Jami Ballar</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((u, i) => {
              const isMe = String(u.id) === String(state.user.id);
              const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${u.rank}`;
              return `
                <tr class="${isMe ? 'current-user-row' : ''}">
                  <td><strong style="font-size:1.1rem; color:var(--cyan);">${rankIcon}</strong></td>
                  <td>
                    <div style="display:flex; align-items:center; gap:0.6rem;">
                      <div class="user-avatar" style="width:30px; height:30px; font-size:0.8rem;">
                        ${esc(u.name.charAt(0))}
                      </div>
                      <strong style="color:#ffffff;">${esc(u.name)}</strong>
                      ${isMe ? '<span class="badge badge-green">Siz</span>' : ''}
                    </div>
                  </td>
                  <td class="small muted">${esc(u.grade || '—')}</td>
                  <td><strong style="font-size:1.05rem; color:var(--gold);">${u.points} ⭐</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderShell('Reyting peshtaxtasi', html);
}

// ==========================================
// 9. PROJECTS GALLERY
// ==========================================

async function renderProjects() {
  const data = await api('/projects');
  const projects = data.projects || [];

  const html = `
    <div class="welcome-banner" style="margin-bottom:2rem;">
      <div>
        <span class="eyebrow">INNOVATSIYALAR VA ISHLANMALAR</span>
        <h2>Maktab AI Loyihalari Ko‘rgazmasi</h2>
        <p>
          O‘quvchilar va o‘qituvchilar tomonidan yaratilgan hamda ta’limda keng qo‘llaniladigan sun’iy intellekt dasturlari va vositalari.
        </p>
      </div>
      <div style="font-size:4rem;">🚀</div>
    </div>

    <div class="grid grid-3">
      ${projects.map(p => `
        <div class="card card-interactive project-card">
          <div class="project-card-header">
            <div class="project-icon">${p.icon || '🚀'}</div>
            <span class="badge badge-purple">${esc(p.badge || 'Loyixa')}</span>
          </div>
          <h3 style="font-size:1.2rem; margin-bottom:0.4rem;">${esc(p.title)}</h3>
          <span class="badge" style="align-self:flex-start; margin-bottom:0.8rem;">${esc(p.category)}</span>
          <p class="small muted" style="margin-bottom:1.2rem; flex:1;">${esc(p.description)}</p>
          <div style="font-size:0.82rem; color:var(--text-dim); margin-bottom:1.4rem;">
            <b>Imkoniyatlar:</b> ${esc(p.features)}
          </div>
          <button class="btn btn-sm btn-secondary" data-view-project="${p.id}">Batafsil ko‘rish →</button>
        </div>
      `).join('')}
    </div>
  `;

  renderShell('AI Loyihalar', html);

  $$('[data-view-project]').forEach(btn => {
    btn.onclick = () => {
      const p = projects.find(x => String(x.id) === btn.dataset.viewProject);
      if (!p) return;
      openModal(`
        <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1.2rem;">
          <div class="project-icon" style="width:60px; height:60px; font-size:2rem;">${p.icon || '🚀'}</div>
          <div>
            <span class="badge">${esc(p.category)}</span>
            <h2 style="font-size:1.5rem; margin-top:0.3rem;">${esc(p.title)}</h2>
          </div>
        </div>

        <p style="margin-bottom:1.4rem; line-height:1.7;">${esc(p.description)}</p>

        <div style="background:rgba(6,21,47,0.7); border:1px solid var(--line); border-radius:12px; padding:1.2rem; margin-bottom:1.4rem;">
          <strong style="color:var(--cyan); display:block; margin-bottom:0.5rem;">Asosiy imkoniyatlar:</strong>
          <ul style="padding-left:1.2rem; font-size:0.9rem; color:var(--text-dim); display:grid; gap:0.4rem;">
            ${(p.features || '').split(',').map(f => `<li>${esc(f.trim())}</li>`).join('')}
          </ul>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; color:var(--muted); margin-bottom:1.4rem;">
          <span>Muallif: <b>${esc(p.author_name || 'AI Maktab')}</b></span>
          <span>Status: <b style="color:var(--green);">Faol loyiha</b></span>
        </div>

        ${p.external_url ? `
          <a href="${esc(p.external_url)}" target="_blank" rel="noopener" class="btn btn-full">
            Loyihani ochish ↗
          </a>
        ` : ''}
      `);
    };
  });
}

// ==========================================
// 10. USER PROFILE
// ==========================================

async function renderProfile() {
  const data = await api('/profile');
  const user = data.user;
  state.user = user;

  const html = `
    <div class="grid grid-2" style="margin-bottom:2rem;">
      <!-- Profile Card -->
      <div class="card">
        <div style="display:flex; align-items:center; gap:1.4rem; margin-bottom:1.6rem;">
          <div class="user-avatar user-avatar-lg">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style="font-size:1.5rem;">${esc(user.name)}</h2>
            <p class="muted small">${esc(user.email)}</p>
            <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
              <span class="badge ${user.role === 'admin' ? 'badge-gold' : ''}">${user.role === 'admin' ? 'Administrator' : 'O‘quvchi'}</span>
              <span class="badge">${esc(user.grade || 'Maktab o‘quvchisi')}</span>
            </div>
          </div>
        </div>

        <form id="edit-profile-form">
          <div class="form-group">
            <label for="edit-name">Ism va familiya</label>
            <input type="text" id="edit-name" class="form-control" value="${esc(user.name)}" required>
          </div>
          <div class="form-group">
            <label for="edit-grade">Sinf / Maktab darajasi</label>
            <input type="text" id="edit-grade" class="form-control" value="${esc(user.grade || '')}" placeholder="Masalan: 9-A sinf">
          </div>
          <div class="form-group">
            <label for="edit-bio">O‘zingiz haqingizda (bio)</label>
            <textarea id="edit-bio" class="form-control" rows="3" placeholder="Qiziqishlaringiz va maqsadlaringiz...">${esc(user.bio || '')}</textarea>
          </div>
          <button type="submit" class="btn" id="btn-save-profile">O‘zgarishlarni saqlash</button>
        </form>
      </div>

      <!-- Stats Summary -->
      <div class="card">
        <h3 style="font-size:1.2rem; margin-bottom:1.2rem;">O‘quv ko‘rsatkichlari</h3>
        <div style="display:grid; gap:0.9rem;">
          <div style="display:flex; justify-content:space-between; padding:0.9rem 1.1rem; background:rgba(6,21,47,0.6); border:1px solid var(--line); border-radius:12px;">
            <span>Jami to‘plangan ball:</span>
            <strong style="color:var(--gold); font-size:1.1rem;">${user.points} ⭐</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.9rem 1.1rem; background:rgba(6,21,47,0.6); border:1px solid var(--line); border-radius:12px;">
            <span>Maktab reytingidagi o‘rni:</span>
            <strong style="color:var(--cyan); font-size:1.1rem;">#${data.rank}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.9rem 1.1rem; background:rgba(6,21,47,0.6); border:1px solid var(--line); border-radius:12px;">
            <span>Testlarda to‘g‘ri javoblar:</span>
            <strong style="color:var(--green);">${data.stats.quizzes.correct} ta (${data.stats.quizzes.accuracy}%)</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:0.9rem 1.1rem; background:rgba(6,21,47,0.6); border:1px solid var(--line); border-radius:12px;">
            <span>Topshirilgan prompt mashqlari:</span>
            <strong>${data.stats.prompts.total} ta (eng yuqori: ${data.stats.prompts.bestScore} ball)</strong>
          </div>
        </div>

        <h3 style="font-size:1.2rem; margin:1.8rem 0 0.8rem;">Ochilgan yutuqlar (${data.achievements.length})</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.8rem;">
          ${data.achievements.map(a => `
            <div class="achievement-badge" style="padding:0.8rem;">
              <div class="achievement-icon" style="width:38px; height:38px; font-size:1.2rem;">${a.icon}</div>
              <div>
                <strong style="display:block; font-size:0.85rem; color:#ffffff;">${esc(a.title)}</strong>
                <span class="small muted">+${a.points_reward} ball</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  renderShell('Mening profilim', html);

  $('#edit-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#edit-name').value.trim();
    const grade = $('#edit-grade').value.trim();
    const bio = $('#edit-bio').value.trim();

    try {
      const res = await api('/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, grade, bio })
      });

      state.user = res.user;
      toast('Profil ma’lumotlari saqlandi!');
      await renderProfile();
    } catch (err) {
      toast(err.message);
    }
  };
}

// ==========================================
// 11. ADMINISTRATOR PANEL
// ==========================================

async function renderAdmin() {
  const [overview, usersData] = await Promise.all([
    api('/admin/overview'),
    api('/admin/users')
  ]);

  const users = usersData.users || [];

  const html = `
    <!-- Admin Stats -->
    <div class="grid grid-4" style="margin-bottom:2rem;">
      <div class="card stat-card">
        <div class="stat-icon">👥</div>
        <div>
          <span class="small muted">Jami o‘quvchilar</span>
          <div class="stat-val">${overview.usersCount}</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">✓</div>
        <div>
          <span class="small muted">Test urinishlari</span>
          <div class="stat-val">${overview.attemptsTotal}</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">⌘</div>
        <div>
          <span class="small muted">Prompt topshiriqlari</span>
          <div class="stat-val">${overview.submissionsTotal}</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">💬</div>
        <div>
          <span class="small muted">AI Xabarlari</span>
          <div class="stat-val">${overview.chatMessagesTotal}</div>
        </div>
      </div>
    </div>

    <!-- Management Action Buttons -->
    <div style="display:flex; gap:0.8rem; margin-bottom:2rem; flex-wrap:wrap;">
      <button class="btn btn-sm" id="btn-admin-add-quiz">+ Yangi test savoli qo‘shish</button>
      <button class="btn btn-sm btn-secondary" id="btn-admin-add-exercise">+ Yangi Prompt mashqi qo‘shish</button>
      <button class="btn btn-sm btn-secondary" id="btn-admin-add-project">+ Yangi AI loyiha qo‘shish</button>
    </div>

    <!-- Users Management Table -->
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.2rem;">
        <div>
          <h3 style="font-size:1.2rem;">Foydalanuvchilar va rollarni boshqarish</h3>
          <span class="small muted">O‘quvchi, o‘qituvchi va admin huquqlarini o‘zgartirish</span>
        </div>
        <span class="badge">${users.length} ta hisob</span>
      </div>

      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ism</th>
              <th>Email</th>
              <th>Sinf</th>
              <th>Ball</th>
              <th>Rol</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><strong style="color:#ffffff;">${esc(u.name)}</strong></td>
                <td class="small muted">${esc(u.email)}</td>
                <td class="small muted">${esc(u.grade || '—')}</td>
                <td><strong style="color:var(--gold);">${u.points}</strong></td>
                <td>
                  <select class="form-control" id="role-select-${u.id}" style="padding:0.4rem 0.6rem; font-size:0.85rem; width:130px;">
                    <option value="student" ${u.role === 'student' ? 'selected' : ''}>O‘quvchi</option>
                    <option value="teacher" ${u.role === 'teacher' ? 'selected' : ''}>O‘qituvchi</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
                <td>
                  <button class="btn btn-sm btn-secondary" data-save-role="${u.id}">Saqlash</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderShell('Administrator Paneli', html);

  // Role update handlers
  $$('[data-save-role]').forEach(btn => {
    btn.onclick = async () => {
      const userId = btn.dataset.saveRole;
      const select = $(`#role-select-${userId}`);
      const newRole = select.value;

      try {
        await api(`/admin/users/${userId}/role`, {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole })
        });
        toast('Foydalanuvchi roli yangilandi!');
      } catch (err) {
        toast(err.message);
      }
    };
  });

  // Add Question Modal
  $('#btn-admin-add-quiz').onclick = () => {
    openModal(`
      <h3 style="margin-bottom:1.2rem;">Yangi test savoli yaratish</h3>
      <form id="form-new-question">
        <div class="form-group">
          <label>Toifa</label>
          <select id="q-category" class="form-control" required>
            <option value="AI asoslari">AI asoslari</option>
            <option value="Prompt Engineering">Prompt Engineering</option>
            <option value="Axloq va xavfsizlik">Axloq va xavfsizlik</option>
            <option value="Ta’limda AI">Ta’limda AI</option>
          </select>
        </div>
        <div class="form-group">
          <label>Savol matni</label>
          <textarea id="q-text" class="form-control" rows="3" required></textarea>
        </div>
        <div class="form-group">
          <label>Variant A</label>
          <input type="text" id="q-opt-0" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Variant B</label>
          <input type="text" id="q-opt-1" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Variant C</label>
          <input type="text" id="q-opt-2" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Variant D</label>
          <input type="text" id="q-opt-3" class="form-control" required>
        </div>
        <div class="form-group">
          <label>To‘g‘ri javob varianti</label>
          <select id="q-correct" class="form-control">
            <option value="0">A</option>
            <option value="1">B</option>
            <option value="2">C</option>
            <option value="3">D</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tushuntirish / Izoh</label>
          <input type="text" id="q-exp" class="form-control" placeholder="To‘g‘ri javob sababi">
        </div>
        <div class="form-group">
          <label>Ball qiymati</label>
          <input type="number" id="q-pts" class="form-control" value="10" min="1" max="100">
        </div>
        <button type="submit" class="btn btn-full">Savolni saqlash ⚡</button>
      </form>
    `);

    $('#form-new-question').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/admin/questions', {
          method: 'POST',
          body: JSON.stringify({
            category: $('#q-category').value,
            question: $('#q-text').value.trim(),
            options: [
              $('#q-opt-0').value.trim(),
              $('#q-opt-1').value.trim(),
              $('#q-opt-2').value.trim(),
              $('#q-opt-3').value.trim()
            ],
            correct_index: Number($('#q-correct').value),
            explanation: $('#q-exp').value.trim(),
            points: Number($('#q-pts').value)
          })
        });
        closeModal();
        toast('Yangi savol qo‘shildi!');
      } catch (err) {
        toast(err.message);
      }
    };
  };

  // Add Exercise Modal
  $('#btn-admin-add-exercise').onclick = () => {
    openModal(`
      <h3 style="margin-bottom:1.2rem;">Yangi Prompt Lab mashqi qo‘shish</h3>
      <form id="form-new-ex">
        <div class="form-group">
          <label>Mashq nomi</label>
          <input type="text" id="ex-title" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Toifa</label>
          <input type="text" id="ex-cat" class="form-control" value="Prompt Engineering" required>
        </div>
        <div class="form-group">
          <label>Tavsif</label>
          <textarea id="ex-desc" class="form-control" rows="2" required></textarea>
        </div>
        <div class="form-group">
          <label>Topshiriq maqsadi</label>
          <textarea id="ex-goal" class="form-control" rows="2" required></textarea>
        </div>
        <div class="form-group">
          <label>Namunaviy kirish (misol)</label>
          <input type="text" id="ex-sample" class="form-control">
        </div>
        <button type="submit" class="btn btn-full">Mashqni saqlash ⚡</button>
      </form>
    `);

    $('#form-new-ex').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/admin/exercises', {
          method: 'POST',
          body: JSON.stringify({
            title: $('#ex-title').value.trim(),
            category: $('#ex-cat').value.trim(),
            description: $('#ex-desc').value.trim(),
            goal: $('#ex-goal').value.trim(),
            example_input: $('#ex-sample').value.trim()
          })
        });
        closeModal();
        toast('Yangi mashq qo‘shildi!');
      } catch (err) {
        toast(err.message);
      }
    };
  };

  // Add Project Modal
  $('#btn-admin-add-project').onclick = () => {
    openModal(`
      <h3 style="margin-bottom:1.2rem;">Yangi AI Loyiha qo‘shish</h3>
      <form id="form-new-project">
        <div class="form-group">
          <label>Loyiha nomi</label>
          <input type="text" id="proj-title" class="form-control" required>
        </div>
        <div class="form-group">
          <label>Toifa</label>
          <input type="text" id="proj-cat" class="form-control" placeholder="Masalan: Dasturlash, Ta’lim" required>
        </div>
        <div class="form-group">
          <label>Emoji / Belgi</label>
          <input type="text" id="proj-icon" class="form-control" value="🚀">
        </div>
        <div class="form-group">
          <label>Tavsif</label>
          <textarea id="proj-desc" class="form-control" rows="3" required></textarea>
        </div>
        <div class="form-group">
          <label>Imkoniyatlar (vergul bilan ajratilgan)</label>
          <input type="text" id="proj-feat" class="form-control" placeholder="Xatolar tahlili, Bosqichma-bosqich yo‘l">
        </div>
        <button type="submit" class="btn btn-full">Loyihani saqlash ⚡</button>
      </form>
    `);

    $('#form-new-project').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/admin/projects', {
          method: 'POST',
          body: JSON.stringify({
            title: $('#proj-title').value.trim(),
            category: $('#proj-cat').value.trim(),
            icon: $('#proj-icon').value.trim() || '🚀',
            description: $('#proj-desc').value.trim(),
            features: $('#proj-feat').value.trim()
          })
        });
        closeModal();
        toast('Yangi loyiha qo‘shildi!');
      } catch (err) {
        toast(err.message);
      }
    };
  };
}

// ==========================================
// APPLICATION INITIALIZATION
// ==========================================

async function init() {
  try {
    const data = await api('/me');
    state.user = data.user;
    if (state.user) {
      await navigate('dashboard');
    } else {
      await navigate('landing');
    }
  } catch (err) {
    state.user = null;
    await navigate('landing');
  }
}

// Start application on load
init();
