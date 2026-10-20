import { AuthService } from '../services/authService';
import { ProfileService } from '../services/profileService';
import type { SupportedLanguage } from '../types/auth';

export type AuthMode = 'entry' | 'login' | 'register';

export class AuthView {
  private container: HTMLElement;
  private authService: AuthService;
  private profileService: ProfileService;
  private onAuthenticated: () => void;
  private currentMode: AuthMode = 'entry';

  constructor(
    container: HTMLElement,
    onAuthenticated: () => void
  ) {
    this.container = container;
    this.authService = AuthService.getInstance();
    this.profileService = ProfileService.getInstance();
    this.onAuthenticated = onAuthenticated;
  }

  public setMode(mode: AuthMode): void {
    this.currentMode = mode;
    this.render();
  }

  public render(): void {
    if (this.currentMode === 'entry') {
      this.renderEntryScreen();
    } else if (this.currentMode === 'login') {
      this.renderLoginScreen();
    } else if (this.currentMode === 'register') {
      this.renderRegisterScreen();
    }
  }

  // -------------------------------------------------------------
  // 1. Account Entry Screen
  // -------------------------------------------------------------
  private renderEntryScreen(): void {
    this.container.innerHTML = `
      <div class="auth-overlay-container">
        <header class="auth-header">
          <div class="auth-brand">
            <div class="brand-mark" aria-hidden="true">✿</div>
            <div class="brand-name">Dyslexi<span>Mate</span></div>
          </div>
          <p>A gentle, voice-first reading companion for little learners with dyslexia.</p>
          <div style="margin-top: 8px;">
            ${
              this.authService.isLiveDatabaseConnected()
                ? '<span class="tag" style="background:#e6f8ee; color:#18794e; border:1px solid #b7ebc9; font-weight:700; font-size:11px;">🟢 Supabase Live Database & Auth Connected</span>'
                : '<span class="tag" style="background:#f4f6f4; color:#5c6b61; border:1px solid var(--line); font-weight:700; font-size:11px;">⚡ Local / Demo Engine Active</span>'
            }
          </div>
        </header>

        <section class="auth-card" aria-labelledby="entryTitle">
          <div class="entry-welcome-hero">
            <div class="entry-figure" aria-hidden="true">🦊</div>
            <div class="auth-card-title">
              <h2 id="entryTitle">Welcome to DyslexiMate!</h2>
              <p>Little steps, big reading wins for every child.</p>
            </div>
          </div>

          <div class="entry-actions">
            <button id="btnOpenLogin" class="btn-primary-big">
              <span>🔑</span> Log in to an existing account
            </button>
            <button id="btnOpenRegister" class="btn-secondary-big">
              <span>✨</span> Create a new parent account
            </button>
          </div>

          <div class="entry-info-box" role="note">
            <span aria-hidden="true">🛡️</span>
            <div>
              <strong>Parent-Managed Security:</strong>
              Parents set up and control all child profiles. Learning data is kept private and safe.
            </div>
          </div>

          <div class="demo-banner">
            <div><strong>Quick Review Demo:</strong> Test immediately with seeded profiles</div>
            <button id="btnQuickDemoLogin" class="btn-demo-quick">
              ⚡ Instant Demo Parent Login (Sunita Sharma · 2 children)
            </button>
          </div>
        </section>
      </div>
    `;

    document.getElementById('btnOpenLogin')?.addEventListener('click', () => {
      this.setMode('login');
    });

    document.getElementById('btnOpenRegister')?.addEventListener('click', () => {
      this.setMode('register');
    });

    document.getElementById('btnQuickDemoLogin')?.addEventListener('click', async () => {
      const res = await this.authService.login({
        email: 'parent@dysleximate.demo',
        password: 'Password123!',
      });
      if (res.success) {
        this.onAuthenticated();
      }
    });
  }

  // -------------------------------------------------------------
  // 2. Account Login Screen
  // -------------------------------------------------------------
  private renderLoginScreen(): void {
    this.container.innerHTML = `
      <div class="auth-overlay-container">
        <header class="auth-header">
          <div class="auth-brand">
            <div class="brand-mark" aria-hidden="true">✿</div>
            <div class="brand-name">Dyslexi<span>Mate</span></div>
          </div>
        </header>

        <section class="auth-card" aria-labelledby="loginTitle">
          <div class="auth-card-title">
            <h2 id="loginTitle">Parent Login</h2>
            <p>Access your children's personalized reading journeys</p>
          </div>

          <div id="loginAlert" class="hidden"></div>

          <form id="loginForm" novalidate>
            <div class="form-group">
              <label class="form-label" for="loginEmail">Parent Email Address</label>
              <div class="form-input-wrap">
                <input
                  type="email"
                  id="loginEmail"
                  name="email"
                  class="form-input"
                  placeholder="name@example.com"
                  autocomplete="email"
                  required
                />
              </div>
              <span id="loginEmailError" class="field-error-msg hidden"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="loginPassword">Password</label>
              <div class="form-input-wrap">
                <input
                  type="password"
                  id="loginPassword"
                  name="password"
                  class="form-input"
                  placeholder="Enter your password"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  id="togglePasswordBtn"
                  class="password-toggle-btn"
                  aria-label="Toggle password visibility"
                >
                  👁️
                </button>
              </div>
              <span id="loginPasswordError" class="field-error-msg hidden"></span>
            </div>

            <div class="form-footer-actions">
              <button type="button" id="btnForgotPassword" class="btn-link">
                Forgot password?
              </button>
              <button type="button" id="btnDemoAutofill" class="text-link" style="font-size:11px">
                Fill demo credentials
              </button>
            </div>

            <button type="submit" id="btnLoginSubmit" class="btn-submit">
              <span id="btnLoginText">Log In to DyslexiMate</span>
              <span id="btnLoginSpinner" class="hidden">⏳ Logging in…</span>
            </button>
          </form>

          <div style="text-align: center; margin-top: 18px; font-size: 12px; color: var(--muted);">
            Don't have a parent account?
            <button type="button" id="linkToRegister" class="btn-link" style="margin-left: 4px;">
              Create an account
            </button>
          </div>

          <div style="text-align: center; margin-top: 12px;">
            <button type="button" id="btnBackToEntry" class="text-link" style="font-size: 11px;">
              ← Back to welcome screen
            </button>
          </div>
        </section>
      </div>

      <!-- Forgot Password Modal -->
      <div id="forgotPasswordModal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="forgotTitle">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h2 id="forgotTitle">Reset Parent Password</h2>
              <p>We'll dispatch safe instructions to verify your parent identity.</p>
            </div>
            <button type="button" id="btnCloseForgot" class="modal-close" aria-label="Close modal">×</button>
          </div>
          <div class="modal-body">
            <div id="forgotAlert" class="hidden"></div>
            <p>Enter the email address registered with your DyslexiMate parent account.</p>
            <div class="form-group">
              <label class="form-label" for="forgotEmailInput">Registered Email</label>
              <input type="email" id="forgotEmailInput" class="form-input" placeholder="parent@example.com" />
            </div>
            <div class="modal-controls">
              <button type="button" id="btnSendReset">Send Reset Link</button>
              <button type="button" id="btnCancelForgot" class="soft">Cancel</button>
            </div>
            <p class="prototype-note">
              Demo Environment: Password resets do not alter local state. You can also log in using the demo account credentials.
            </p>
          </div>
        </div>
      </div>
    `;

    // Password show/hide toggle
    const pwdInput = document.getElementById('loginPassword') as HTMLInputElement;
    const toggleBtn = document.getElementById('togglePasswordBtn');
    toggleBtn?.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        toggleBtn.textContent = '🙈';
        toggleBtn.setAttribute('aria-label', 'Hide password');
      } else {
        pwdInput.type = 'password';
        toggleBtn.textContent = '👁️';
        toggleBtn.setAttribute('aria-label', 'Show password');
      }
    });

    // Demo autofill
    document.getElementById('btnDemoAutofill')?.addEventListener('click', () => {
      (document.getElementById('loginEmail') as HTMLInputElement).value = 'parent@dysleximate.demo';
      (document.getElementById('loginPassword') as HTMLInputElement).value = 'Password123!';
    });

    // Navigation links
    document.getElementById('linkToRegister')?.addEventListener('click', () => this.setMode('register'));
    document.getElementById('btnBackToEntry')?.addEventListener('click', () => this.setMode('entry'));

    // Forgot password flow
    const forgotModal = document.getElementById('forgotPasswordModal');
    document.getElementById('btnForgotPassword')?.addEventListener('click', () => {
      forgotModal?.classList.remove('hidden');
      const curEmail = (document.getElementById('loginEmail') as HTMLInputElement).value;
      if (curEmail) {
        (document.getElementById('forgotEmailInput') as HTMLInputElement).value = curEmail;
      }
    });
    document.getElementById('btnCloseForgot')?.addEventListener('click', () => {
      forgotModal?.classList.add('hidden');
    });
    document.getElementById('btnCancelForgot')?.addEventListener('click', () => {
      forgotModal?.classList.add('hidden');
    });
    document.getElementById('btnSendReset')?.addEventListener('click', async () => {
      const email = (document.getElementById('forgotEmailInput') as HTMLInputElement).value;
      const res = await this.authService.resetPassword(email);
      const alertEl = document.getElementById('forgotAlert');
      if (alertEl) {
        alertEl.className = 'form-alert ' + (res.success ? 'alert-success' : 'alert-error');
        alertEl.textContent = res.message;
        alertEl.classList.remove('hidden');
      }
    });

    // Form submission
    const loginForm = document.getElementById('loginForm') as HTMLFormElement;
    loginForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const emailInput = document.getElementById('loginEmail') as HTMLInputElement;
      const passwordInput = document.getElementById('loginPassword') as HTMLInputElement;
      const emailError = document.getElementById('loginEmailError') as HTMLElement;
      const passwordError = document.getElementById('loginPasswordError') as HTMLElement;
      const alertBox = document.getElementById('loginAlert') as HTMLElement;
      const submitBtn = document.getElementById('btnLoginSubmit') as HTMLButtonElement;
      const btnText = document.getElementById('btnLoginText') as HTMLElement;
      const btnSpinner = document.getElementById('btnLoginSpinner') as HTMLElement;

      // Clear previous errors
      emailError.classList.add('hidden');
      passwordError.classList.add('hidden');
      alertBox.classList.add('hidden');
      emailInput.classList.remove('input-error');
      passwordInput.classList.remove('input-error');

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      let hasError = false;
      if (!email) {
        emailError.textContent = 'Please enter your email address.';
        emailError.classList.remove('hidden');
        emailInput.classList.add('input-error');
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = 'Please enter a valid email format (e.g. parent@example.com).';
        emailError.classList.remove('hidden');
        emailInput.classList.add('input-error');
        hasError = true;
      }

      if (!password) {
        passwordError.textContent = 'Please enter your password.';
        passwordError.classList.remove('hidden');
        passwordInput.classList.add('input-error');
        hasError = true;
      }

      if (hasError) return;

      // Loading state
      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');

      const res = await this.authService.login({ email, password });

      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');

      if (!res.success) {
        alertBox.className = 'form-alert alert-error';
        alertBox.textContent = res.error || 'Login failed. Please check credentials.';
        alertBox.classList.remove('hidden');
      } else {
        alertBox.className = 'form-alert alert-success';
        alertBox.textContent = res.message || 'Login successful!';
        alertBox.classList.remove('hidden');
        setTimeout(() => {
          this.onAuthenticated();
        }, 300);
      }
    });
  }

  // -------------------------------------------------------------
  // 3. Account Creation Screen
  // -------------------------------------------------------------
  private renderRegisterScreen(): void {
    this.container.innerHTML = `
      <div class="auth-overlay-container">
        <header class="auth-header">
          <div class="auth-brand">
            <div class="brand-mark" aria-hidden="true">✿</div>
            <div class="brand-name">Dyslexi<span>Mate</span></div>
          </div>
        </header>

        <section class="auth-card" style="max-width: 520px;" aria-labelledby="registerTitle">
          <div class="auth-card-title">
            <h2 id="registerTitle">Create Parent Account</h2>
            <p>Start your family's guided reading companion</p>
          </div>

          <div id="registerAlert" class="hidden"></div>

          <form id="registerForm" novalidate>
            <div class="form-group">
              <label class="form-label" for="regFullName">Parent / Guardian Full Name</label>
              <input
                type="text"
                id="regFullName"
                name="fullName"
                class="form-input"
                placeholder="e.g. Priya Sharma"
                required
              />
              <span id="regFullNameError" class="field-error-msg hidden"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="regEmail">Parent Email Address</label>
              <input
                type="email"
                id="regEmail"
                name="email"
                class="form-input"
                placeholder="parent@example.com"
                required
              />
              <span id="regEmailError" class="field-error-msg hidden"></span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="regPassword">Password (6+ chars)</label>
                <div class="form-input-wrap">
                  <input
                    type="password"
                    id="regPassword"
                    name="password"
                    class="form-input"
                    placeholder="Create password"
                    required
                  />
                  <button type="button" id="toggleRegPasswordBtn" class="password-toggle-btn" aria-label="Toggle password">👁️</button>
                </div>
                <span id="regPasswordError" class="field-error-msg hidden"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="regConfirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="regConfirmPassword"
                  name="confirmPassword"
                  class="form-input"
                  placeholder="Repeat password"
                  required
                />
                <span id="regConfirmPasswordError" class="field-error-msg hidden"></span>
              </div>
            </div>

            <!-- Optional First Child Profile Setup -->
            <div style="background: #f4faf6; border: 1px solid #d3ede0; border-radius: 16px; padding: 14px; margin: 14px 0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                <strong style="font:800 13px Nunito; color:var(--teal)">First Child Profile</strong>
                <span class="tag" style="background:#d9f1e5; color:var(--teal)">Optional now</span>
              </div>
              <p style="font-size:11px; color:#5b6d65; margin:0 0 10px">
                You can add your child now or anytime from the profile selector.
              </p>

              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
                <div class="form-group" style="margin-bottom:6px">
                  <label class="form-label" for="regChildName" style="font-size:10px">Child's Name</label>
                  <input type="text" id="regChildName" class="form-input" placeholder="e.g. Aarav" />
                </div>
                <div class="form-group" style="margin-bottom:6px">
                  <label class="form-label" for="regChildGrade" style="font-size:10px">Class / Grade</label>
                  <select id="regChildGrade" class="form-input" style="padding:9px">
                    <option value="Class 1 · Early reader">Class 1</option>
                    <option value="Class 2 · Early reader">Class 2</option>
                    <option value="Class 3 · Growing reader">Class 3</option>
                    <option value="Class 4 · Little reader" selected>Class 4</option>
                    <option value="Class 5 · Confident reader">Class 5</option>
                    <option value="Class 6 · Confident reader">Class 6</option>
                  </select>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
                <div class="form-group" style="margin-bottom:0">
                  <label class="form-label" for="regChildLang" style="font-size:10px">Preferred Language</label>
                  <select id="regChildLang" class="form-input" style="padding:9px">
                    <option value="English">🇬🇧 English</option>
                    <option value="Hindi">🇮🇳 हिन्दी (Hindi)</option>
                    <option value="Punjabi">🇮🇳 ਪੰਜਾਬੀ (Punjabi)</option>
                    <option value="Bengali">🇮🇳 বাংলা (Bengali)</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <label class="form-label" for="regChildAvatar" style="font-size:10px">Child Avatar</label>
                  <select id="regChildAvatar" class="form-input" style="padding:9px">
                    <option value="👧🏽">👧🏽 Girl reader</option>
                    <option value="👦🏻">👦🏻 Boy reader</option>
                    <option value="🦊">🦊 Clever Fox</option>
                    <option value="🦁">🦁 Brave Lion</option>
                    <option value="🐼">🐼 Gentle Panda</option>
                  </select>
                </div>
              </div>
            </div>

            <label class="form-checkbox-label">
              <input type="checkbox" id="regTerms" required />
              <span>
                I agree to the <strong>Terms of Service</strong> and understand that child learning profiles are protected under parental consent.
              </span>
            </label>
            <span id="regTermsError" class="field-error-msg hidden" style="margin-top:-6px; margin-bottom:10px"></span>

            <button type="submit" id="btnRegisterSubmit" class="btn-submit">
              <span id="btnRegText">Create Parent Account</span>
              <span id="btnRegSpinner" class="hidden">⏳ Setting up account…</span>
            </button>
          </form>

          <div style="text-align: center; margin-top: 18px; font-size: 12px; color: var(--muted);">
            Already have an account?
            <button type="button" id="linkToLogin" class="btn-link" style="margin-left: 4px;">
              Log in
            </button>
          </div>

          <div style="text-align: center; margin-top: 12px;">
            <button type="button" id="btnBackToEntryFromReg" class="text-link" style="font-size: 11px;">
              ← Back to welcome screen
            </button>
          </div>
        </section>
      </div>
    `;

    // Password toggle
    const pwdInput = document.getElementById('regPassword') as HTMLInputElement;
    const toggleBtn = document.getElementById('toggleRegPasswordBtn');
    toggleBtn?.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        pwdInput.type = 'password';
        toggleBtn.textContent = '👁️';
      }
    });

    document.getElementById('linkToLogin')?.addEventListener('click', () => this.setMode('login'));
    document.getElementById('btnBackToEntryFromReg')?.addEventListener('click', () => this.setMode('entry'));

    // Register Form Submit
    const form = document.getElementById('registerForm') as HTMLFormElement;
    form?.addEventListener('submit', async e => {
      e.preventDefault();

      const fullName = (document.getElementById('regFullName') as HTMLInputElement).value.trim();
      const email = (document.getElementById('regEmail') as HTMLInputElement).value.trim();
      const password = (document.getElementById('regPassword') as HTMLInputElement).value;
      const confirmPassword = (document.getElementById('regConfirmPassword') as HTMLInputElement).value;
      const acceptTerms = (document.getElementById('regTerms') as HTMLInputElement).checked;

      const alertBox = document.getElementById('registerAlert') as HTMLElement;
      const nameError = document.getElementById('regFullNameError') as HTMLElement;
      const emailError = document.getElementById('regEmailError') as HTMLElement;
      const passwordError = document.getElementById('regPasswordError') as HTMLElement;
      const confirmError = document.getElementById('regConfirmPasswordError') as HTMLElement;
      const termsError = document.getElementById('regTermsError') as HTMLElement;

      nameError.classList.add('hidden');
      emailError.classList.add('hidden');
      passwordError.classList.add('hidden');
      confirmError.classList.add('hidden');
      termsError.classList.add('hidden');
      alertBox.classList.add('hidden');

      let hasError = false;
      if (!fullName) {
        nameError.textContent = 'Please enter your full parent or guardian name.';
        nameError.classList.remove('hidden');
        hasError = true;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = 'Please enter a valid email address.';
        emailError.classList.remove('hidden');
        hasError = true;
      }
      if (!password || password.length < 6) {
        passwordError.textContent = 'Password must be at least 6 characters.';
        passwordError.classList.remove('hidden');
        hasError = true;
      }
      if (password !== confirmPassword) {
        confirmError.textContent = 'Passwords do not match.';
        confirmError.classList.remove('hidden');
        hasError = true;
      }
      if (!acceptTerms) {
        termsError.textContent = 'Please accept the terms and parental consent to continue.';
        termsError.classList.remove('hidden');
        hasError = true;
      }

      if (hasError) return;

      const submitBtn = document.getElementById('btnRegisterSubmit') as HTMLButtonElement;
      const btnText = document.getElementById('btnRegText') as HTMLElement;
      const btnSpinner = document.getElementById('btnRegSpinner') as HTMLElement;

      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');

      const res = await this.authService.register({
        fullName,
        email,
        password,
        confirmPassword,
        acceptTerms,
      });

      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');

      if (!res.success || !res.user) {
        alertBox.className = 'form-alert alert-error';
        alertBox.textContent = res.error || 'Registration failed.';
        alertBox.classList.remove('hidden');
        return;
      }

      // If initial child was provided, create it under this parent
      const childName = (document.getElementById('regChildName') as HTMLInputElement).value.trim();
      if (childName) {
        const grade = (document.getElementById('regChildGrade') as HTMLSelectElement).value;
        const preferredLanguage = (document.getElementById('regChildLang') as HTMLSelectElement).value as SupportedLanguage;
        const avatar = (document.getElementById('regChildAvatar') as HTMLSelectElement).value;

        await this.profileService.createChild(res.user.id, {
          name: childName,
          grade,
          preferredLanguage,
          avatar,
          preferences: {
            readingSpeed: 'normal',
            dyslexiaFont: false,
            highContrast: false,
            soundEffects: true,
            autoReadAloud: false,
          },
        });
      }

      alertBox.className = 'form-alert alert-success';
      alertBox.textContent = 'Account created successfully! Taking you to profile selection…';
      alertBox.classList.remove('hidden');

      setTimeout(() => {
        this.onAuthenticated();
      }, 350);
    });
  }
}
