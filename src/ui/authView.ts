import { AuthService } from '../services/authService';
import { ProfileService } from '../services/profileService';
import type { SupportedLanguage, AppLanguageCode } from '../types/auth';
import { i18n, t } from '../i18n';

export type AuthMode = 'entry' | 'login' | 'register';

export class AuthView {
  private container: HTMLElement;
  private authService: AuthService;
  private profileService: ProfileService;
  private onAuthenticated: () => void;
  private currentMode: AuthMode = 'entry';

  // Cached form values so switching language doesn't lose user's typed data
  private formCache: Record<string, any> = {};

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

  private saveFormCache(): void {
    const ids = [
      'loginEmail',
      'loginPassword',
      'loginRemember',
      'regFullName',
      'regEmail',
      'regPassword',
      'regConfirmPassword',
      'regChildName',
      'regChildGrade',
      'regChildLang',
      'regChildAvatar',
      'regTerms',
      'forgotEmailInput',
    ];

    ids.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (el) {
        if ('checked' in el && el.type === 'checkbox') {
          this.formCache[id] = (el as HTMLInputElement).checked;
        } else {
          this.formCache[id] = el.value;
        }
      }
    });
  }

  private restoreFormCache(): void {
    Object.entries(this.formCache).forEach(([id, val]) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (el && val !== undefined) {
        if ('checked' in el && el.type === 'checkbox') {
          (el as HTMLInputElement).checked = Boolean(val);
        } else {
          el.value = String(val);
        }
      }
    });
  }

  private renderAuthTopNav(): string {
    return `
      <div class="auth-top-nav">
        <div class="auth-brand">
          <div class="brand-mark" aria-hidden="true">✿</div>
          <div class="brand-name">Dyslexi<span>Mate</span></div>
        </div>
        <div class="auth-lang-picker" title="Change Language / भाषा बदलें">
          ${i18n.renderLanguageSelect({ id: 'authLangSelect', current: i18n.getCurrentLanguage() })}
        </div>
      </div>
    `;
  }

  private bindLangSelectListener(): void {
    document.getElementById('authLangSelect')?.addEventListener('change', async e => {
      const newLang = (e.target as HTMLSelectElement).value as AppLanguageCode;
      this.saveFormCache();
      await i18n.setLanguage(newLang);
      this.render();
      this.restoreFormCache();
    });
  }

  // -------------------------------------------------------------
  // 1. Account Entry Screen
  // -------------------------------------------------------------
  private renderEntryScreen(): void {
    this.container.innerHTML = `
      <div class="auth-overlay-container">
        <header class="auth-header">
          ${this.renderAuthTopNav()}
          <p>${t('auth.entry.brandTagline')}</p>
          <div style="margin-top: 8px;">
            ${
              this.authService.isLiveDatabaseConnected()
                ? `<span class="tag" style="background:#e6f8ee; color:#18794e; border:1px solid #b7ebc9; font-weight:700; font-size:11px;">${t('auth.entry.liveDbConnected')}</span>`
                : `<span class="tag" style="background:#f4f6f4; color:#5c6b61; border:1px solid var(--line); font-weight:700; font-size:11px;">${t('auth.entry.localDbActive')}</span>`
            }
          </div>
        </header>

        <section class="auth-card" aria-labelledby="entryTitle">
          <div class="entry-welcome-hero">
            <div class="entry-figure" aria-hidden="true">🦊</div>
            <div class="auth-card-title">
              <h2 id="entryTitle">${t('auth.entry.welcomeTitle')}</h2>
              <p>${t('auth.entry.welcomeSubtitle')}</p>
            </div>
          </div>

          <div class="entry-actions">
            <button id="btnOpenLogin" class="btn-primary-big">
              <span>🔑</span> ${t('auth.entry.loginBtn')}
            </button>
            <button id="btnOpenRegister" class="btn-secondary-big">
              <span>✨</span> ${t('auth.entry.registerBtn')}
            </button>
          </div>

          <div class="entry-info-box" role="note">
            <span aria-hidden="true">🛡️</span>
            <div>
              <strong>${t('auth.entry.parentSecurityTitle')}</strong>
              ${t('auth.entry.parentSecurityDesc')}
            </div>
          </div>

          <div class="demo-banner">
            <div><strong>${t('auth.entry.quickDemoTitle')}</strong> ${t('auth.entry.quickDemoDesc')}</div>
            <button id="btnQuickDemoLogin" class="btn-demo-quick">
              ${t('auth.entry.quickDemoBtn')}
            </button>
          </div>
        </section>
      </div>
    `;

    this.bindLangSelectListener();

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
          ${this.renderAuthTopNav()}
        </header>

        <section class="auth-card" aria-labelledby="loginTitle">
          <div class="auth-card-title">
            <h2 id="loginTitle">${t('auth.login.title')}</h2>
            <p>${t('auth.login.subtitle')}</p>
          </div>

          <div id="loginAlert" class="hidden"></div>

          <form id="loginForm" novalidate>
            <div class="form-group">
              <label class="form-label" for="loginEmail">${t('auth.login.emailLabel')}</label>
              <div class="form-input-wrap">
                <input
                  type="email"
                  id="loginEmail"
                  name="email"
                  class="form-input"
                  placeholder="${t('auth.login.emailPlaceholder')}"
                  required
                  autocomplete="username"
                  autofocus
                />
              </div>
              <span id="loginEmailError" class="field-error-msg hidden"></span>
            </div>

            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <label class="form-label" for="loginPassword">${t('auth.login.passwordLabel')}</label>
                <button type="button" id="btnForgotPassword" class="btn-link" style="font-size: 11px;">
                  ${t('auth.login.forgotPasswordLink')}
                </button>
              </div>
              <div class="form-input-wrap">
                <input
                  type="password"
                  id="loginPassword"
                  name="password"
                  class="form-input"
                  placeholder="${t('auth.login.passwordPlaceholder')}"
                  required
                  autocomplete="current-password"
                />
                <button type="button" id="toggleLoginPasswordBtn" class="password-toggle-btn" aria-label="Toggle password visibility">👁️</button>
              </div>
              <span id="loginPasswordError" class="field-error-msg hidden"></span>
            </div>

            <label class="form-checkbox-label">
              <input type="checkbox" id="loginRemember" name="remember" checked />
              <span>${t('auth.login.rememberDevice')}</span>
            </label>

            <button type="submit" id="btnLoginSubmit" class="btn-submit">
              <span id="btnLoginText">${t('auth.login.submitBtn')}</span>
              <span id="btnLoginSpinner" class="hidden">⏳ Logging in…</span>
            </button>
          </form>

          <div class="demo-login-box">
            <div style="font-size: 11px; color: var(--muted); margin-bottom: 6px;">
              <strong>Demo Hint:</strong> ${t('auth.login.demoHint')}
            </div>
            <button type="button" id="btnDemoAutofill" class="btn-demo-quick">
              ${t('auth.login.demoFillBtn')}
            </button>
          </div>

          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: var(--muted);">
            Don't have a parent account yet?
            <button type="button" id="linkToRegister" class="btn-link" style="margin-left: 4px;">
              ${t('auth.entry.registerBtn')}
            </button>
          </div>

          <div style="text-align: center; margin-top: 14px;">
            <button type="button" id="btnBackToEntry" class="text-link" style="font-size: 11px;">
              ${t('auth.login.backBtn')}
            </button>
          </div>
        </section>

        <!-- Forgot Password Modal -->
        <div id="forgotPasswordModal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="forgotTitle">
          <div class="modal" style="max-width: 420px;">
            <div class="modal-head">
              <div>
                <h2 id="forgotTitle" style="font: 900 18px Nunito; margin: 0;">${t('auth.forgot.title')}</h2>
                <p style="font-size: 12px; color: var(--muted); margin: 4px 0 0;">
                  ${t('auth.forgot.subtitle')}
                </p>
              </div>
              <button type="button" class="modal-close" id="btnCloseForgot" aria-label="Close">×</button>
            </div>
            <div class="modal-body">
              <div id="forgotAlert" class="hidden"></div>
              <div class="form-group">
                <label class="form-label" for="forgotEmailInput">${t('auth.forgot.emailLabel')}</label>
                <input
                  type="email"
                  id="forgotEmailInput"
                  class="form-input"
                  placeholder="parent@example.com"
                />
              </div>
              <div class="modal-controls">
                <button type="button" id="btnSendReset">${t('auth.forgot.submitBtn')}</button>
                <button type="button" class="soft" id="btnCancelForgot">${t('auth.forgot.cancelBtn')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindLangSelectListener();
    this.restoreFormCache();

    // Password toggle
    const pwdInput = document.getElementById('loginPassword') as HTMLInputElement;
    const toggleBtn = document.getElementById('toggleLoginPasswordBtn');
    toggleBtn?.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        toggleBtn.textContent = '🙈';
      } else {
        pwdInput.type = 'password';
        toggleBtn.textContent = '👁️';
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
        alertEl.textContent = res.message || (res.success ? t('auth.forgot.successMsg') : t('auth.forgot.emailNotFound'));
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

      emailError.classList.add('hidden');
      passwordError.classList.add('hidden');
      alertBox.classList.add('hidden');
      emailInput.classList.remove('input-error');
      passwordInput.classList.remove('input-error');

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      let hasError = false;
      if (!email) {
        emailError.textContent = t('auth.login.errEmailRequired');
        emailError.classList.remove('hidden');
        emailInput.classList.add('input-error');
        hasError = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = t('auth.login.errEmailInvalid');
        emailError.classList.remove('hidden');
        emailInput.classList.add('input-error');
        hasError = true;
      }

      if (!password) {
        passwordError.textContent = t('auth.login.errPasswordRequired');
        passwordError.classList.remove('hidden');
        passwordInput.classList.add('input-error');
        hasError = true;
      }

      if (hasError) return;

      submitBtn.disabled = true;
      btnText.classList.add('hidden');
      btnSpinner.classList.remove('hidden');

      const res = await this.authService.login({ email, password });

      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');

      if (!res.success) {
        alertBox.className = 'form-alert alert-error';
        alertBox.textContent = res.error || t('auth.login.errAuthFailed');
        alertBox.classList.remove('hidden');
      } else {
        alertBox.className = 'form-alert alert-success';
        alertBox.textContent = res.message || t('auth.login.welcomeBack', { name: res.user?.fullName || '' });
        alertBox.classList.remove('hidden');
        setTimeout(() => {
          this.onAuthenticated();
        }, 300);
      }
    });
  }

  // -------------------------------------------------------------
  // 3. Account Registration Screen
  // -------------------------------------------------------------
  private renderRegisterScreen(): void {
    this.container.innerHTML = `
      <div class="auth-overlay-container">
        <header class="auth-header">
          ${this.renderAuthTopNav()}
        </header>

        <section class="auth-card" aria-labelledby="registerTitle">
          <div class="auth-card-title">
            <h2 id="registerTitle">${t('auth.register.title')}</h2>
            <p>${t('auth.register.subtitle')}</p>
          </div>

          <div id="registerAlert" class="hidden"></div>

          <form id="registerForm" novalidate>
            <div class="form-group">
              <label class="form-label" for="regFullName">${t('auth.register.fullNameLabel')}</label>
              <input
                type="text"
                id="regFullName"
                name="fullName"
                class="form-input"
                placeholder="${t('auth.register.fullNamePlaceholder')}"
                required
                autofocus
              />
              <span id="regFullNameError" class="field-error-msg hidden"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="regEmail">${t('auth.register.emailLabel')}</label>
              <input
                type="email"
                id="regEmail"
                name="email"
                class="form-input"
                placeholder="${t('auth.register.emailPlaceholder')}"
                required
              />
              <span id="regEmailError" class="field-error-msg hidden"></span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="regPassword">${t('auth.register.passwordLabel')}</label>
                <div class="form-input-wrap">
                  <input
                    type="password"
                    id="regPassword"
                    name="password"
                    class="form-input"
                    placeholder="${t('auth.register.passwordPlaceholder')}"
                    required
                  />
                  <button type="button" id="toggleRegPasswordBtn" class="password-toggle-btn" aria-label="Toggle password">👁️</button>
                </div>
                <span id="regPasswordError" class="field-error-msg hidden"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="regConfirmPassword">${t('auth.register.confirmPasswordLabel')}</label>
                <input
                  type="password"
                  id="regConfirmPassword"
                  name="confirmPassword"
                  class="form-input"
                  placeholder="${t('auth.register.confirmPasswordPlaceholder')}"
                  required
                />
                <span id="regConfirmPasswordError" class="field-error-msg hidden"></span>
              </div>
            </div>

            <!-- Optional First Child Profile Setup -->
            <div style="background: #f4faf6; border: 1px solid #d3ede0; border-radius: 16px; padding: 14px; margin: 14px 0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                <strong style="font:800 13px Nunito; color:var(--teal)">${t('auth.register.childSectionTitle')}</strong>
                <span class="tag" style="background:#d9f1e5; color:var(--teal)">Optional</span>
              </div>
              <p style="font-size:11px; color:#5b6d65; margin:0 0 10px">
                You can add your child now or anytime from the profile selector.
              </p>

              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
                <div class="form-group" style="margin-bottom:6px">
                  <label class="form-label" for="regChildName" style="font-size:10px">${t('auth.register.childNameLabel')}</label>
                  <input type="text" id="regChildName" class="form-input" placeholder="${t('auth.register.childNamePlaceholder')}" />
                </div>
                <div class="form-group" style="margin-bottom:6px">
                  <label class="form-label" for="regChildGrade" style="font-size:10px">${t('auth.register.gradeLabel')}</label>
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
                  <label class="form-label" for="regChildLang" style="font-size:10px">${t('auth.register.langLabel')}</label>
                  <select id="regChildLang" class="form-input" style="padding:9px">
                    <option value="English">EG English</option>
                    <option value="Hindi">HN हिन्दी</option>
                    <option value="Odia">OD ଓଡ଼ିଆ</option>
                    <option value="Punjabi">PB ਪੰਜਾਬੀ</option>
                    <option value="Tamil">TM தமிழ்</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <label class="form-label" for="regChildAvatar" style="font-size:10px">${t('auth.register.avatarLabel')}</label>
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
                ${t('auth.register.termsAgree')}
              </span>
            </label>
            <span id="regTermsError" class="field-error-msg hidden" style="margin-top:-6px; margin-bottom:10px"></span>

            <button type="submit" id="btnRegisterSubmit" class="btn-submit">
              <span id="btnRegText">${t('auth.register.submitBtn')}</span>
              <span id="btnRegSpinner" class="hidden">⏳ Setting up account…</span>
            </button>
          </form>

          <div style="text-align: center; margin-top: 18px; font-size: 12px; color: var(--muted);">
            Already have an account?
            <button type="button" id="linkToLogin" class="btn-link" style="margin-left: 4px;">
              ${t('auth.entry.loginBtn')}
            </button>
          </div>

          <div style="text-align: center; margin-top: 12px;">
            <button type="button" id="btnBackToEntryFromReg" class="text-link" style="font-size: 11px;">
              ${t('auth.register.backBtn')}
            </button>
          </div>
        </section>
      </div>
    `;

    this.bindLangSelectListener();
    this.restoreFormCache();

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
      if (!fullName || fullName.length < 2) {
        nameError.textContent = t('auth.register.errNameRequired');
        nameError.classList.remove('hidden');
        hasError = true;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailError.textContent = t('auth.login.errEmailInvalid');
        emailError.classList.remove('hidden');
        hasError = true;
      }

      if (!password || password.length < 6) {
        passwordError.textContent = t('auth.register.errPasswordShort');
        passwordError.classList.remove('hidden');
        hasError = true;
      }

      if (password !== confirmPassword) {
        confirmError.textContent = t('auth.register.errPasswordMismatch');
        confirmError.classList.remove('hidden');
        hasError = true;
      }

      if (!acceptTerms) {
        termsError.textContent = t('auth.register.errTermsRequired');
        termsError.classList.remove('hidden');
        hasError = true;
      }

      if (hasError) return;

      const childName = (document.getElementById('regChildName') as HTMLInputElement).value.trim();
      let initialChild: any = undefined;
      if (childName) {
        const grade = (document.getElementById('regChildGrade') as HTMLSelectElement).value;
        const preferredLanguage = (document.getElementById('regChildLang') as HTMLSelectElement).value as SupportedLanguage;
        const avatar = (document.getElementById('regChildAvatar') as HTMLSelectElement).value;
        initialChild = {
          name: childName,
          grade,
          preferredLanguage,
          avatar,
        };
      }

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
        interfaceLanguage: i18n.getCurrentLanguage(),
        initialChild,
      });

      submitBtn.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');

      if (!res.success) {
        alertBox.className = 'form-alert alert-error';
        alertBox.textContent = res.error || 'Registration failed.';
        alertBox.classList.remove('hidden');
      } else {
        alertBox.className = 'form-alert alert-success';
        alertBox.textContent = res.message || 'Account created successfully!';
        alertBox.classList.remove('hidden');

        if (initialChild && res.user) {
          try {
            await this.profileService.createChild(res.user.id, initialChild);
          } catch (e) {
            console.warn('Initial child profile creation error:', e);
          }
        }

        setTimeout(() => {
          this.onAuthenticated();
        }, 350);
      }
    });
  }
}
