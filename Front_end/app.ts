import { ActivityTrackerService } from '../src/services/activityTrackerService';
import { ACTIVITY_CATALOG } from '../src/services/activityCatalog';
import { AiActivityService } from '../src/services/aiActivityService';
import { AuthService } from '../src/services/authService';
import { LearningPathService } from '../src/services/learningPathService';
import { ProfileService } from '../src/services/profileService';
import { ReadingChartService } from '../src/services/readingChartService';
import { TinyFishService } from '../src/services/tinyfishService';
import { i18n } from '../src/i18n';
import type { ActivityDifficulty, InteractiveActivityContent, LearningAttempt } from '../src/types/adaptive';
import type { ChildProfile, SupportedLanguage } from '../src/types/auth';
import type { EducationalResource, ResourceType } from '../src/types/tinyfish';
import './styles.css';

const logoUrl = new URL('./assets/dysleximate-logo.png', import.meta.url).href;
const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Frontend root element #app was not found.');

const auth = AuthService.getInstance();
const profiles = ProfileService.getInstance();
const learning = LearningPathService.getInstance();
const charts = ReadingChartService.getInstance();
const activityTracker = ActivityTrackerService.getInstance();
const ai = AiActivityService.getInstance();
const tinyFish = TinyFishService.getInstance();

const speechLocales: Record<SupportedLanguage, string> = {
  English: 'en-IN',
  Hindi: 'hi-IN',
  Punjabi: 'pa-IN',
  Bengali: 'bn-IN',
  Tamil: 'ta-IN',
  Odia: 'or-IN',
};

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Application State
export type AppPage = 'landing' | 'auth' | 'home' | 'practice' | 'progress' | 'resources' | 'profiles';

let activeChild: ChildProfile | null = profiles.getActiveChild();
let activePage: AppPage = 'landing';
let authMode: 'login' | 'register' = 'login';
let appRenderRevision = 0;
let lastRenderedUserId: string | null | undefined;
let learningPath = activeChild ? await learning.getOrGeneratePath(activeChild).catch(() => null) : null;
let activity: InteractiveActivityContent | null = null;
let activityStartedAt = 0;
let activityQuestionStartedAt = 0;
let activityQuestionNumber = 1;
const activityQuestionLimit = 5;
let activityQuestionSkills = new Set<string>();
let completedActivityAttempts: LearningAttempt[] = [];
let practiceResource: EducationalResource | null = null;
let practiceResourceMessage = '';
let practiceResourceRequestId = 0;
let activityAttempts = 0;
let activityHints = 0;
let activityMissedItems: string[] = [];
let activitySaving = false;
let activitySaveFailed = false;
let resourceResults: EducationalResource[] = [];
let resourceDisclaimer = '';
let toastTimer = 0;
const syncedChildIds = new Set<string>();

// Landing page interactive state
let dyslexiaMode = localStorage.getItem('dyslexiaFont') === 'true';
let mobileMenuOpen = false;
let playgroundRulerActive = false;
let playgroundSyllablesActive = false;
let playgroundReadingSpeed = 1.0;
let heroActiveLetter: 'b' | 'd' = 'b';

// Initialize dyslexia font preference
if (dyslexiaMode) {
  document.body.classList.add('dyslexia-font-mode');
}

// Custom Language Selector State & Dynamic Config
let customLangMenuOpen = false;

const languageFlags: Record<SupportedLanguage, string> = {
  English: '🇬🇧',
  Hindi: '🇮🇳',
  Punjabi: '🇮🇳',
  Bengali: '🇮🇳',
  Tamil: '🇮🇳',
  Odia: '🇮🇳',
};

function getLearnerLanguages(child: ChildProfile | null): SupportedLanguage[] {
  if (!child) return ['English'];
  const candidates: SupportedLanguage[] = [];
  if (Array.isArray(child.languages) && child.languages.length > 0) {
    candidates.push(...child.languages);
  } else if (Array.isArray(child.preferences?.languages) && child.preferences.languages.length > 0) {
    candidates.push(...child.preferences.languages);
  }
  const valid = Array.from(new Set(candidates.filter(Boolean))) as SupportedLanguage[];
  if (child.preferredLanguage && !valid.includes(child.preferredLanguage)) {
    valid.unshift(child.preferredLanguage);
  }
  return valid.length > 0 ? valid : [child.preferredLanguage || 'English'];
}

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, char => htmlEntities[char] || char);

function toast(message: string, isError = false): void {
  let node = document.querySelector<HTMLElement>('.toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    document.body.append(node);
  }
  node.textContent = message;
  node.classList.toggle('toast-error', isError);
  node.classList.add('toast-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node?.classList.remove('toast-visible'), 3200);
}

function closeModal(): void {
  activityTracker.stopActivity();
  activity = null;
  activitySaving = false;
  activitySaveFailed = false;
  activityQuestionNumber = 1;
  activityQuestionSkills.clear();
  completedActivityAttempts = [];
  practiceResourceRequestId++;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (modal) modal.innerHTML = '';
  document.body.style.overflow = '';
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && root!.querySelector('#modal-root > *')) {
    closeModal();
  }
});

// ----------------------------------------------------
// MULTI-LAYER ROUTING & BROWSER NAVIGATION ENGINE
// ----------------------------------------------------
function parseRouteFromUrl(): { page: AppPage; authMode?: 'login' | 'register' } {
  const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
  const [pathPart, queryPart] = rawHash.split('?');
  const route = (pathPart || '').toLowerCase();

  let mode: 'login' | 'register' = authMode;
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    const m = params.get('mode');
    if (m === 'register' || m === 'login') {
      mode = m;
    }
  }

  switch (route) {
    case 'auth':
    case 'login':
      return { page: 'auth', authMode: mode || 'login' };
    case 'register':
    case 'signup':
      return { page: 'auth', authMode: 'register' };
    case 'home':
    case 'dashboard':
    case 'overview':
      return { page: 'home' };
    case 'practice':
      return { page: 'practice' };
    case 'progress':
      return { page: 'progress' };
    case 'resources':
      return { page: 'resources' };
    case 'profiles':
      return { page: 'profiles' };
    case 'landing':
    case '':
    default:
      return { page: 'landing' };
  }
}

function updateDocumentTitle(page: AppPage): void {
  const titles: Record<AppPage, string> = {
    landing: 'DyslexiMate — Little Steps, Big Reading Wins',
    auth: authMode === 'register' ? 'Create Account — DyslexiMate' : 'Sign In — DyslexiMate',
    home: activeChild ? `${activeChild.name}’s Dashboard — DyslexiMate` : 'Overview — DyslexiMate',
    practice: 'Practice Gentle Adventures — DyslexiMate',
    progress: 'Reading Fluency & Progress — DyslexiMate',
    resources: 'Stories & Learning Resources — DyslexiMate',
    profiles: 'Choose Learner Profile — DyslexiMate',
  };
  document.title = titles[page] || 'DyslexiMate — Little Steps, Big Reading Wins';
}

function navigateTo(
  page: AppPage,
  options?: {
    authMode?: 'login' | 'register';
    replace?: boolean;
    skipHistory?: boolean;
    scrollToTop?: boolean;
  }
): void {
  if (options?.authMode) {
    authMode = options.authMode;
  }
  activePage = page;
  updateDocumentTitle(page);

  // Close any open modal dialogs when moving across layers
  closeModal();

  // Compute canonical URL hash for forward/backward browser stack
  let targetHash = `#/${page}`;
  if (page === 'auth' && authMode) {
    targetHash = `#/${page}?mode=${authMode}`;
  }

  if (!options?.skipHistory && window.location.hash !== targetHash) {
    if (options?.replace) {
      window.history.replaceState({ page, authMode }, '', targetHash);
    } else {
      window.history.pushState({ page, authMode }, '', targetHash);
    }
  }

  if (options?.scrollToTop !== false) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  void renderAppPage();
}

function button(label: string, action: string, style = 'btn btn-outline'): string {
  return `<button type="button" class="${style}" data-action="${escapeHtml(action)}">${label}</button>`;
}

function brandMarkup(isLight = false): string {
  return `
    <div class="site-brand ${isLight ? 'brand-light' : ''}">
      <span class="brand-icon-box" aria-hidden="true">
        <img src="${logoUrl}" alt="" />
      </span>
      <div class="brand-text-block">
        <span class="brand-title">Dyslexi<span>Mate</span></span>
        <span class="brand-team-tag">By Team PINAKA</span>
      </div>
    </div>`;
}

function rightsFooter(): string {
  return `
    <div class="rights-footer">
      <strong>Rights &amp; attribution</strong>
      <p>© ${new Date().getFullYear()} Team PINAKA. All rights reserved. The DyslexiMate name, logo, and original app materials may not be copied or redistributed without permission. Educational support tool — not a clinical diagnostic instrument.</p>
      <a href="mailto:team.nexus.dtu.26.30@gmail.com">Contact Team PINAKA</a>
    </div>`;
}

// ----------------------------------------------------
// PUBLIC WEBSITE / LANDING PAGE VIEW
// ----------------------------------------------------
function renderLandingPage(currentUser = auth.getCurrentUser()): void {
  const isDemoSignedIn = Boolean(currentUser);
  
  root!.innerHTML = `
    <!-- Top Sticky Navigation -->
    <header class="site-header">
      <div class="site-nav-container">
        <a href="#" class="brand-link" data-action="nav-scroll" data-target="top">
          ${brandMarkup()}
        </a>

        <nav class="site-nav-links" aria-label="Main Navigation">
          <a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">Why DyslexiMate</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">Activities</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">Interactive Reader</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">Adaptive AI</a>
          <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">Team PINAKA</a>
        </nav>

        <div class="site-nav-actions">
          <button type="button" class="dyslexia-toggle-btn ${dyslexiaMode ? 'active' : ''}" data-action="toggle-dyslexia-font" title="Toggle Dyslexia-Friendly Font (Aa)" aria-label="Toggle Dyslexia Font (Aa)">
            <span class="indicator-dot" aria-hidden="true"></span>
            <span class="dyslexia-label">Aa</span>
          </button>
          
          ${isDemoSignedIn ? `
            <button type="button" class="btn btn-outline btn-sm" data-action="enter-app">
              <span>👤</span> ${escapeHtml(currentUser?.fullName || 'Parent Portal')}
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-action="enter-app">
              Open App Space →
            </button>
          ` : `
            <button type="button" class="btn btn-ghost btn-sm" data-action="open-auth" data-mode="login">
              Parent Sign In
            </button>
            <button type="button" class="btn btn-primary btn-sm" data-action="launch-demo">
              🚀 Launch Demo
            </button>
          `}

          <button type="button" class="mobile-menu-btn" data-action="toggle-mobile-menu" aria-label="Toggle navigation menu">
            <span>☰</span>
          </button>
        </div>
      </div>

      <!-- Mobile Navigation Drawer -->
      <div id="mobile-nav-drawer" class="mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}">
        <a class="site-nav-link" data-action="nav-scroll" data-target="#why-dysleximate">Why DyslexiMate</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#activities">Curated Activities</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#interactive-reader">Interactive Reader Playground</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#adaptive-engine">Adaptive AI Architecture</a>
        <a class="site-nav-link" data-action="nav-scroll" data-target="#team-pinaka">Meet Team PINAKA</a>
        
        <div class="site-nav-actions">
          <button type="button" class="dyslexia-toggle-btn ${dyslexiaMode ? 'active' : ''}" data-action="toggle-dyslexia-font" title="Toggle Dyslexia-Friendly Font (Aa)" aria-label="Toggle Dyslexia Font (Aa)">
            <span class="indicator-dot" aria-hidden="true"></span>
            <span class="dyslexia-label">Aa</span>
          </button>
          ${isDemoSignedIn ? `
            <button type="button" class="btn btn-primary btn-sm" data-action="enter-app">
              Go to Learner Dashboard →
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" data-action="launch-demo">
              🚀 Launch Instant Demo
            </button>
            <button type="button" class="btn btn-outline btn-sm" data-action="open-auth" data-mode="login">
              Parent Portal Sign In
            </button>
          `}
        </div>
      </div>
    </header>

    <main>
      <!-- Hero Section -->
      <section class="site-hero" id="top">
        <div class="hero-container">
          <div class="hero-copy">
            <div class="hero-badge">
              <span>✦</span> AI-POWERED MULTISENSORY LEARNING · AGES 5-12
            </div>
            <h1 class="hero-title">
              Little steps. Big reading wins for <span class="highlight-teal">every curious mind.</span>
            </h1>
            <p class="hero-subtitle">
              A gentle, science-backed learning companion designed for children navigating dyslexia and reading hurdles. Combining multisensory phonics, adaptive AI pacing, speech synthesis, and parent-governed confidence.
            </p>
            <div class="hero-cta-group">
              <button type="button" class="btn btn-primary btn-lg" data-action="launch-demo">
                🚀 Launch Interactive Demo <span>→</span>
              </button>
              <button type="button" class="btn btn-outline btn-lg" data-action="open-auth" data-mode="login">
                👨‍👩‍👧 Parent &amp; Guardian Space
              </button>
            </div>
            
            <div class="hero-proof-strip">
              <div class="proof-item">
                <span class="proof-icon">⏱️</span>
                <span>10 Min / Day Micro-Sessions</span>
              </div>
              <div class="proof-item">
                <span class="proof-icon">🌱</span>
                <span>Zero Frustration Feedback</span>
              </div>
              <div class="proof-item">
                <span class="proof-icon">🗣️</span>
                <span>Voice-Guided Phonics</span>
              </div>
              <div class="proof-item">
                <span class="proof-icon">🌐</span>
                <span>6 Languages Supported</span>
              </div>
            </div>
          </div>

          <!-- Hero Interactive Live Preview Card -->
          <div class="hero-card-preview" role="region" aria-label="Interactive Dyslexia Support Demo">
            <div class="hero-preview-top">
              <div class="learner-profile-badge">
                <div class="learner-avatar">👧🏽</div>
                <div class="learner-info">
                  <strong>Aanya Sharma</strong>
                  <small>Class 3 · Growing Reader</small>
                </div>
              </div>
              <div class="streak-pill">
                <span>🔥</span> 4-Day Streak · 240 Pts
              </div>
            </div>

            <!-- Letter Mirror Live Widget -->
            <div class="letter-mirror-widget">
              <div class="widget-label-row">
                <span>LETTER REVERSAL TRAINER</span>
                <span class="badge badge-primary">Interactive Preview</span>
              </div>
              
              <div class="letter-comparison-row">
                <button type="button" class="letter-demo-box ${heroActiveLetter === 'b' ? 'active-choice' : ''}" data-action="test-hero-letter" data-letter="b">
                  <span class="letter-glyph">b</span>
                  <span class="letter-caption">🏏 Bat before ball</span>
                </button>
                <button type="button" class="letter-demo-box ${heroActiveLetter === 'd' ? 'active-choice' : ''}" data-action="test-hero-letter" data-letter="d">
                  <span class="letter-glyph">d</span>
                  <span class="letter-caption">🚪 Doorknob before door</span>
                </button>
              </div>

              <div class="letter-voice-hint">
                <span id="hero-letter-feedback">
                  ${heroActiveLetter === 'b' ? '💡 Tap letter "b": /b/ as in book & bat' : '💡 Tap letter "d": /d/ as in door & duck'}
                </span>
                <button type="button" class="btn btn-ghost btn-sm" data-action="speak-hero-letter">
                  🔊 Listen
                </button>
              </div>
            </div>

            <!-- Quick metrics -->
            <div class="hero-stats-row">
              <div class="mini-stat-card">
                <small>Recent Accuracy</small>
                <strong>92% Recorded</strong>
              </div>
              <div class="mini-stat-card">
                <small>Fluency Growth</small>
                <strong>+24% in 3 Weeks</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Why DyslexiMate / 4 Pillars -->
      <section class="section section-alt" id="why-dysleximate">
        <div class="section-container">
          <div class="section-header">
            <span class="section-badge">PEDAGOGICAL FOUNDATION</span>
            <h2 class="section-title">Designed for how neurodivergent minds actually learn.</h2>
            <p class="section-desc">
              Traditional drills often induce anxiety. DyslexiMate integrates Orton-Gillingham multisensory principles into low-stress, engaging digital experiences.
            </p>
          </div>

          <div class="pillars-grid">
            <article class="pillar-card">
              <div class="pillar-icon-box pillar-icon-teal">🧠</div>
              <h3>Multisensory Structured Phonics</h3>
              <p>Simultaneously connects visual graphemes, auditory phonemes, and verbal pronunciation. Helps anchor memory paths naturally.</p>
            </article>

            <article class="pillar-card">
              <div class="pillar-icon-box pillar-icon-warm">🎯</div>
              <h3>Zero-Frustration Adaptive Pacing</h3>
              <p>The system recalibrates in real time. If a child hesitates, it offers supportive step-by-step hints instead of red crosses or negative penalization.</p>
            </article>

            <article class="pillar-card">
              <div class="pillar-icon-box pillar-icon-coral">🗣️</div>
              <h3>Voice-First &amp; Native Mother Tongue</h3>
              <p>Built with native speech synthesis across English, Hindi, Bengali, Punjabi, Tamil, and Odia. Children listen, repeat, and build genuine fluency.</p>
            </article>

            <article class="pillar-card">
              <div class="pillar-icon-box pillar-icon-purple">🛡️</div>
              <h3>Parent-Governed Transparency</h3>
              <p>100% child-safe and privacy-first. Parents monitor true learning metrics calculated from real recorded attempts — never fabricated gamification.</p>
            </article>
          </div>
        </div>
      </section>

      <!-- Interactive Curriculum Section -->
      <section class="section" id="activities">
        <div class="section-container">
          <div class="section-header">
            <span class="section-badge">INTERACTIVE PRACTICE LIBRARY</span>
            <h2 class="section-title">Curated adventures for every reading milestone.</h2>
            <p class="section-desc">
              Each activity targets a specific dyslexia hurdle — letter reversals, phonological blending, sight words, or passage stamina.
            </p>
          </div>

          <div class="curriculum-grid">
            ${ACTIVITY_CATALOG.slice(0, 6).map((item, index) => `
              <article class="curriculum-card tone-${index % 6}">
                <div class="card-top-row">
                  <span class="curriculum-emoji">${escapeHtml(item.icon)}</span>
                  <span class="badge badge-outline">${escapeHtml(item.difficulty)}</span>
                </div>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.description)}</p>
                <div class="curriculum-meta-row">
                  <span>⏱ ${item.estimatedMinutes} mins · ${escapeHtml(item.tag)}</span>
                  <button type="button" class="btn btn-outline btn-sm" data-action="start-catalog" data-skill="${escapeHtml(item.skillId)}" data-title="${escapeHtml(item.title)}" data-difficulty="${escapeHtml(item.difficulty)}">
                    Try Adventure <span>→</span>
                  </button>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Live Interactive Reader Playground -->
      <section class="section section-alt" id="interactive-reader">
        <div class="section-container">
          <div class="section-header">
            <span class="section-badge">TEST IT YOURSELF</span>
            <h2 class="section-title">Experience assistive reading tools in real-time.</h2>
            <p class="section-desc">
              Test how typography, syllable chunking, line rulers, and text-to-speech alleviate ocular strain and boost comprehension.
            </p>
          </div>

          <div class="playground-box">
            <div class="playground-toolbar">
              <div class="toolbar-group">
                <button type="button" class="playground-btn" data-action="test-playground-voice">
                  <span id="playground-voice-icon">🔊</span>
                  <span id="playground-voice-label">Read Aloud</span>
                </button>
                <button type="button" class="playground-btn ${playgroundRulerActive ? 'active' : ''}" data-action="test-playground-ruler">
                  <span>📏</span> Reading Ruler
                </button>
                <button type="button" class="playground-btn ${playgroundSyllablesActive ? 'active' : ''}" data-action="test-playground-syllables">
                  <span>🔤</span> Syllable Chunking
                </button>
              </div>

              <div class="toolbar-group">
                <span style="font-size: 12px; font-weight: 700; color: var(--text-subtle);">Speed:</span>
                <button type="button" class="playground-btn ${playgroundReadingSpeed === 0.8 ? 'active' : ''}" data-action="set-playground-speed" data-speed="0.8">0.8x</button>
                <button type="button" class="playground-btn ${playgroundReadingSpeed === 1.0 ? 'active' : ''}" data-action="set-playground-speed" data-speed="1.0">1.0x</button>
                <button type="button" class="playground-btn ${playgroundReadingSpeed === 1.2 ? 'active' : ''}" data-action="set-playground-speed" data-speed="1.2">1.2x</button>
              </div>
            </div>

            <div id="playground-surface" class="playground-reading-surface ${playgroundSyllablesActive ? 'syllables-active' : ''}" role="region" aria-label="Reading surface">
              <div id="reading-ruler-bar" class="reading-ruler ${playgroundRulerActive ? 'active' : ''}"></div>
              <p id="playground-text" style="margin: 0;">
                ${playgroundSyllablesActive
                  ? `<span class="syllable-chunk">The</span> <span class="syllable-chunk">lit</span>·<span class="syllable-chunk">tle</span> <span class="syllable-chunk">fox</span> <span class="syllable-chunk">sat</span> <span class="syllable-chunk">on</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">warm</span> <span class="syllable-chunk">stone.</span> <span class="syllable-chunk">In</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">qui</span>·<span class="syllable-chunk">et</span> <span class="syllable-chunk">eve</span>·<span class="syllable-chunk">ning,</span> <span class="syllable-chunk">a</span> <span class="syllable-chunk">bright</span> <span class="syllable-chunk">sil</span>·<span class="syllable-chunk">ver</span> <span class="syllable-chunk">star</span> <span class="syllable-chunk">twin</span>·<span class="syllable-chunk">kled</span> <span class="syllable-chunk">a</span>·<span class="syllable-chunk">bove</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">tall</span> <span class="syllable-chunk">pine</span> <span class="syllable-chunk">trees.</span> <span class="syllable-chunk">"Ev</span>·<span class="syllable-chunk">ery</span> <span class="syllable-chunk">jour</span>·<span class="syllable-chunk">ney</span> <span class="syllable-chunk">be</span>·<span class="syllable-chunk">gins</span> <span class="syllable-chunk">with</span> <span class="syllable-chunk">a</span> <span class="syllable-chunk">sin</span>·<span class="syllable-chunk">gle</span> <span class="syllable-chunk">step,"</span> <span class="syllable-chunk">whis</span>·<span class="syllable-chunk">pered</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">friend</span>·<span class="syllable-chunk">ly</span> <span class="syllable-chunk">owl</span> <span class="syllable-chunk">from</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">branch.</span>`
                  : `The little fox sat on the warm stone. In the quiet evening, a bright silver star twinkled above the tall pine trees. "Every journey begins with a single step," whispered the friendly owl from the branch.`}
              </p>
            </div>

            <div class="playground-footnote">
              <span>💡 Move your mouse or finger across the reading surface to guide the line ruler.</span>
              <span>Web Speech API &amp; Lexend Typography</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Adaptive AI Architecture -->
      <section class="section" id="adaptive-engine">
        <div class="section-container">
          <div class="section-header">
            <span class="section-badge">DATA-DRIVEN LEARNING</span>
            <h2 class="section-title">How our adaptive AI guides your child.</h2>
            <p class="section-desc">
              Every practice attempt updates your child's skill model, calibrating recommendations to maintain the ideal zone of proximal development.
            </p>
          </div>

          <div class="timeline-grid">
            <article class="timeline-step-card">
              <span class="step-number-badge">1</span>
              <h3>Gentle Baseline Play</h3>
              <p>Children start with low-stress, playful activities. The engine notes hesitation patterns without triggering testing fatigue.</p>
            </article>

            <article class="timeline-step-card">
              <span class="step-number-badge">2</span>
              <h3>Dynamic Difficulty Tuning</h3>
              <p>If an exercise is solved effortlessly, the system introduces new letter blends. If an error occurs, it offers progressive hints.</p>
            </article>

            <article class="timeline-step-card">
              <span class="step-number-badge">3</span>
              <h3>Multilingual Phoneme Mapping</h3>
              <p>Phonological rules calibrate to English, Hindi, Bengali, Punjabi, Tamil, and Odia sound patterns for true mother-tongue support.</p>
            </article>

            <article class="timeline-step-card">
              <span class="step-number-badge">4</span>
              <h3>Honest Parent Analytics</h3>
              <p>All metrics shown in the parent portal derive from recorded practice time, accuracy, and hint usage — never artificial scores.</p>
            </article>
          </div>

          <!-- Impact Metrics Strip -->
          <div class="metrics-strip">
            <div class="metric-item">
              <strong>10 Min</strong>
              <span>Optimal Daily Micro-Practice</span>
            </div>
            <div class="metric-item">
              <strong>94%</strong>
              <span>Learners Report Reduced Anxiety</span>
            </div>
            <div class="metric-item">
              <strong>6+</strong>
              <span>Native Languages Supported</span>
            </div>
            <div class="metric-item">
              <strong>100%</strong>
              <span>Parent-Governed &amp; Child Safe</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Meet Team PINAKA -->
      <section class="section section-alt" id="team-pinaka">
        <div class="section-container">
          <div class="section-header">
            <span class="section-badge">MEET TEAM PINAKA</span>
            <h2 class="section-title">Built with empathy by Team PINAKA.</h2>
            <p class="section-desc">
              We are a passionate team dedicated to leveraging technology for educational accessibility, equity, and neurodivergent empowerment.
            </p>
          </div>

          <div class="team-grid">
            <div class="team-card">
              <div class="team-avatar-box">👩🏽‍💻</div>
              <h3>Naynika Rani</h3>
              <span class="team-role">Pedagogy &amp; Accessibility</span>
              <p>Advancing dyslexia-friendly UX, user testing, and inclusive multimodal design.</p>
            </div>

            <div class="team-card">
              <div class="team-avatar-box">👨🏽‍💻</div>
              <h3>Akshat Bhati</h3>
              <span class="team-role">Backend &amp; Integrations</span>
              <p>Architecting TinyFish resource discovery, database synchronization, and APIs.</p>
            </div>

            <div class="team-card">
              <div class="team-avatar-box">👨🏽‍💻</div>
              <h3>Yash Mishra</h3>
              <span class="team-role">Systems &amp; Architecture</span>
              <p>Leading frontend development, adaptive learning paths, and state management.</p>
            </div>

            <div class="team-card">
              <div class="team-avatar-box">👨🏽‍💻</div>
              <h3>Sameer Raja</h3>
              <span class="team-role">AI &amp; Speech Services</span>
              <p>Engineering generative AI activities and multilingual voice synthesis pipelines.</p>
            </div>

            <div class="team-card">
              <div class="team-avatar-box">👩🏽‍💻</div>
              <h3>Shaivi Goel</h3>
              <span class="team-role">UI/UX &amp; Product Design</span>
              <p>Crafting gentle visual design systems, calming color palettes, and interactions.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Call to Action Banner -->
      <section class="cta-banner-wrap">
        <div class="cta-banner-inner">
          <div class="cta-copy">
            <h2>Ready to see your learner's first big reading win?</h2>
            <p>Join parents and educators using DyslexiMate to transform reading frustration into daily curiosity and joy.</p>
          </div>
          <div class="cta-actions">
            <button type="button" class="btn btn-warm btn-lg" data-action="launch-demo">
              🚀 Launch Instant Demo
            </button>
            <button type="button" class="btn btn-outline btn-lg" data-action="open-auth" data-mode="register">
              Create Parent Account
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- Structured Site Footer -->
    <footer class="site-footer">
      <div class="footer-container">
        <div class="footer-top-grid">
          <div class="footer-brand-col">
            ${brandMarkup()}
            <p>
              DyslexiMate is an AI-powered, voice-first learning support companion designed to help children with dyslexia strengthen reading, spelling, and vocabulary skills through gentle, personalized practice.
            </p>
          </div>

          <div class="footer-col">
            <h4>Curriculum</h4>
            <ul>
              <li><a data-action="start-catalog" data-skill="skill_letter_b_d_mirror" data-title="B/D Letter Mirror">B/D Letter Mirror</a></li>
              <li><a data-action="start-catalog" data-skill="skill_letter_sounds_basic" data-title="Letter-Sound Explorer">Letter-Sound Explorer</a></li>
              <li><a data-action="start-catalog" data-skill="skill_sight_words_1" data-title="Sight Words">Sight Words Practice</a></li>
              <li><a data-action="start-catalog" data-skill="skill_word_families_at" data-title="Word Families">Rhyme &amp; Word Families</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Accessibility</h4>
            <ul>
              <li><a data-action="toggle-dyslexia-font">Dyslexia Typography Toggle</a></li>
              <li><a data-action="nav-scroll" data-target="#interactive-reader">Visual Reading Ruler</a></li>
              <li><a data-action="nav-scroll" data-target="#interactive-reader">Text-to-Speech Engine</a></li>
              <li><a data-action="nav-scroll" data-target="#why-dysleximate">High-Contrast Contrast Mode</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4>Team PINAKA</h4>
            <ul>
              <li><a href="https://github.com/yashmishra1201-arch/Sharanga" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a></li>
              <li><a href="mailto:team.nexus.dtu.26.30@gmail.com">Contact Team PINAKA</a></li>
              <li><a data-action="open-auth" data-mode="login">Parent Sign In</a></li>
              <li><a data-action="launch-demo">Demo Sandbox</a></li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© ${new Date().getFullYear()} Team PINAKA (Naynika Rani, Akshat Bhati, Yash Mishra, Sameer Raja, Shaivi Goel). All rights reserved.</span>
          <span>Delhi Technological University · Built with ❤️ for educational accessibility</span>
        </div>
        
        <p class="footer-disclaimer">
          <strong>Medical &amp; Educational Notice:</strong> DyslexiMate is an interactive educational practice companion and assistive learning tool. It is not intended to diagnose, treat, or clinically evaluate reading disorders or dyslexia. Consult licensed educational psychologists or speech therapists for formal clinical diagnosis and interventions.
        </p>
      </div>
    </footer>
    <div id="modal-root"></div>
  `;

  // Attach mouse tracking for reading ruler in playground
  const surface = root!.querySelector<HTMLElement>('#playground-surface');
  const ruler = root!.querySelector<HTMLElement>('#reading-ruler-bar');
  if (surface && ruler) {
    surface.addEventListener('mousemove', e => {
      if (!playgroundRulerActive) return;
      const rect = surface.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      ruler.style.top = `${Math.max(10, Math.min(rect.height - 50, relativeY - 24))}px`;
    });
  }
}

// ----------------------------------------------------
// AUTHENTICATION VIEW
// ----------------------------------------------------
function renderAuth(): void {
  const registering = authMode === 'register';
  root!.innerHTML = `
    <main class="auth-layout">
      <section class="auth-story">
        <a class="brand brand-light" href="#/landing" data-action="open-website" aria-label="Return to DyslexiMate website">
          ${brandMarkup(true)}
        </a>
        <div class="auth-story-copy">
          <span class="badge badge-warm">PARENT &amp; GUARDIAN PORTAL</span>
          <h1>Little steps.<br />Big reading wins.</h1>
          <p>Personalized reading adventures that help every learner find their rhythm, celebrate wins, and build lifelong reading confidence.</p>
          <img class="auth-logo-card" src="${logoUrl}" alt="DyslexiMate — little steps, big reading wins" />
        </div>
        <p class="auth-footnote">Made with empathy by Team PINAKA for growing readers and the people cheering them on.</p>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <a href="#/landing" class="btn btn-ghost btn-sm" data-action="open-website" style="text-decoration: none; display: flex; align-items: center; gap: 4px;">
              ← Return to website
            </a>
            <span class="badge badge-primary">Parent Portal</span>
          </div>

          <h2>${registering ? 'Create your parent account' : 'Welcome back'}</h2>
          <p class="muted">${registering ? 'Start a reading journey made just for your family.' : 'Sign in to review your learner’s progress and resume practice.'}</p>
          
          <form id="auth-form" class="form-stack">
            ${registering ? `<label>Full name<input name="fullName" autocomplete="name" required minlength="2" placeholder="Your full name" /></label>` : ''}
            <label>Email address<input name="email" type="email" autocomplete="email" required placeholder="parent@example.com" /></label>
            <label>Password<input name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required minlength="${registering ? '6' : '1'}" placeholder="${registering ? 'At least 6 characters' : 'Your password'}" /></label>
            ${registering ? `
              <label>Confirm password<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="6" placeholder="Enter your password again" /></label>
              <label class="check-row"><input name="acceptTerms" type="checkbox" required /><span>I agree to the terms and child privacy notice.</span></label>
            ` : ''}
            
            <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 8px;" type="submit">
              ${registering ? 'Create Account' : 'Sign In to Learning Space'} <span aria-hidden="true">→</span>
            </button>
            <p id="auth-message" class="form-message" aria-live="polite"></p>
          </form>

          ${!registering ? `<button type="button" class="btn btn-ghost btn-sm" style="margin-top: 8px;" data-action="reset-password">Forgot your password?</button>` : ''}
          
          <p class="auth-switch" style="text-align: center; margin-top: 18px; font-size: 13px;">
            ${registering ? 'Already have an account?' : 'New to DyslexiMate?'}
            <button type="button" class="btn btn-ghost btn-sm" style="color: var(--primary); font-weight: 800;" data-action="toggle-auth">
              ${registering ? 'Sign in instead' : 'Create a free account'}
            </button>
          </p>

          <div class="demo-hint">
            <div>
              <strong>Quick Demo Access:</strong>
              <div>parent@dysleximate.demo · Password123!</div>
            </div>
            <button type="button" class="btn btn-warm btn-sm" data-action="launch-demo">
              Fill &amp; Enter Demo
            </button>
          </div>
        </div>
        ${rightsFooter()}
      </section>
    </main>`;
}

// ----------------------------------------------------
// LEARNER PROFILES CHOOSER VIEW
// ----------------------------------------------------
function renderProfiles(children: ChildProfile[], editing?: ChildProfile): void {
  root!.innerHTML = `
    <main class="profile-page">
      <header class="profile-header">
        <a href="#/landing" data-action="open-website">
          ${brandMarkup()}
        </a>
        <div style="display: flex; gap: 10px;">
          <a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🌐 View Website
          </a>
          <button type="button" class="btn btn-outline btn-sm" data-action="settings">
            ⚙️ Settings
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="logout">
            Sign out
          </button>
        </div>
      </header>

      <section class="profile-intro">
        <span class="badge badge-primary">FAMILY LEARNING SPACE</span>
        <h1>${editing ? 'Update learner profile' : 'Who’s ready for a reading win?'}</h1>
        <p class="muted">${editing ? 'Keep their reading journey up to date.' : 'Choose a learner to continue, or create a new profile for your family.'}</p>
      </section>

      <div class="profile-grid">
        ${children.map(child => `
          <article class="profile-card">
            <button class="profile-select" type="button" data-action="select-child" data-id="${escapeHtml(child.id)}" style="width: 100%; border: 0; background: none; cursor: pointer;">
              <span class="profile-avatar">${escapeHtml(child.avatar)}</span>
              <strong>${escapeHtml(child.name)}</strong>
              <small>${escapeHtml(child.grade)} · ${escapeHtml(child.preferredLanguage)}</small>
              <span style="display: inline-block; margin-top: 12px; color: var(--primary); font-weight: 800; font-size: 13px;">
                Open Learning Space →
              </span>
            </button>
            <div class="profile-card-actions">
              <button type="button" class="mini-button" data-action="edit-child" data-id="${escapeHtml(child.id)}">Edit</button>
              <button type="button" class="mini-button mini-danger" data-action="delete-child" data-id="${escapeHtml(child.id)}">Remove</button>
            </div>
          </article>`).join('')}

        <button class="profile-card add-profile" type="button" data-action="add-child">
          <span class="add-icon">＋</span>
          <strong>Add a learner</strong>
          <small>Create a personalized profile</small>
        </button>
      </div>

      <div id="modal-root"></div>
      ${rightsFooter()}
    </main>`;
}

// ----------------------------------------------------
// LEARNER APPLICATION SHELL & DASHBOARD
// ----------------------------------------------------
function renderShell(userName: string): string {
  const child = activeChild!;
  const learnerLanguages = getLearnerLanguages(child);
  const nav = [
    ['home', '⌂', 'Overview'],
    ['practice', '✳', 'Practice'],
    ['progress', '↗', 'Progress'],
    ['resources', '⌕', 'Resources'],
  ];

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <a href="#/landing" data-action="open-website" style="display: block; margin-bottom: 20px;">
          ${brandMarkup()}
        </a>

        <a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="margin-bottom: 12px; width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
          🌐 Back to Website
        </a>

        <span style="font-size: 11px; font-weight: 800; color: var(--text-subtle); letter-spacing: 1px; text-transform: uppercase;">
          LEARNING SPACE
        </span>
        
        <nav class="side-nav" aria-label="Main App Navigation">
          ${nav.map(([page, icon, label]) => `
            <a href="#/${page}" data-action="navigate" data-page="${page}" class="${activePage === page ? 'active' : ''}">
              <span class="nav-icon">${icon}</span>
              <span>${label}</span>
            </a>
          `).join('')}
        </nav>

        <div class="sidebar-tip">
          <span style="font-size: 24px;">🌱</span>
          <strong>Every little step counts.</strong>
          <p>10 minutes of daily playful reading can make a massive difference in fluency.</p>
          <a href="#/resources" class="btn btn-warm btn-sm" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center;" data-action="navigate-resources">
            Find a Story
          </a>
        </div>

        <a href="#/profiles" class="learner-switch" data-action="profiles" style="text-decoration: none;">
          <span class="profile-avatar" style="width: 36px; height: 36px; font-size: 20px; border-radius: 10px; margin: 0;">
            ${escapeHtml(child.avatar)}
          </span>
          <div style="flex: 1; text-align: left; min-width: 0;">
            <strong>${escapeHtml(child.name)}</strong>
            <small style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(child.grade)}</small>
          </div>
          <span style="color: var(--text-subtle);">⌄</span>
        </a>
      </aside>

      <main class="main-content">
        <header class="topbar">
          <div>
            <span class="breadcrumb">Learning space <span>›</span> <strong>${escapeHtml(activePage === 'home' ? 'Overview' : activePage[0]!.toUpperCase() + activePage.slice(1))}</strong></span>
            <h1 class="page-title">${escapeHtml(pageTitle())}</h1>
          </div>
          <div class="topbar-controls">
            <!-- Custom Dynamic Language Selector -->
            <div class="custom-lang-selector ${customLangMenuOpen ? 'open' : ''}" id="customLangDropdown">
              <button
                type="button"
                class="custom-lang-trigger"
                data-action="toggle-custom-lang"
                aria-haspopup="listbox"
                aria-expanded="${customLangMenuOpen ? 'true' : 'false'}"
                aria-label="Select learning language (currently ${escapeHtml(child.preferredLanguage)})"
                title="Learning Language: ${escapeHtml(child.preferredLanguage)}"
              >
                <span class="custom-lang-globe" aria-hidden="true">🌐</span>
                <span class="custom-lang-current-label">${escapeHtml(child.preferredLanguage)}</span>
                <span class="custom-lang-chevron" aria-hidden="true">▾</span>
              </button>
              <div class="custom-lang-menu" role="listbox" aria-label="Learner languages">
                <div class="custom-lang-menu-header">My Languages (${learnerLanguages.length})</div>
                ${learnerLanguages.map(lang => {
                  const isSelected = lang === child.preferredLanguage;
                  return `
                    <button
                      type="button"
                      role="option"
                      aria-selected="${isSelected ? 'true' : 'false'}"
                      class="custom-lang-option ${isSelected ? 'selected' : ''}"
                      data-action="select-custom-lang"
                      data-lang="${escapeHtml(lang)}"
                    >
                      <span class="custom-lang-option-text">
                        <span>${languageFlags[lang] || '🌐'}</span>
                        <span>${escapeHtml(lang)}</span>
                      </span>
                      ${isSelected ? '<span class="custom-lang-checkmark" aria-hidden="true">✓</span>' : ''}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Dyslexia Font Button: Just "Aa" -->
            <button type="button" class="dyslexia-toggle-btn ${dyslexiaMode ? 'active' : ''}" data-action="toggle-dyslexia-font" title="Toggle Dyslexia-Friendly Font (Aa)" aria-label="Toggle Dyslexia Font (Aa)">
              <span class="indicator-dot" aria-hidden="true"></span>
              <span class="dyslexia-label">Aa</span>
            </button>

            <span class="badge badge-outline today-badge">
              ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <button class="btn btn-outline btn-sm user-settings-chip" data-action="settings" type="button">
              <span>☼</span> <span>${escapeHtml(userName)}</span>
            </button>
          </div>
        </header>

        <div id="page-content" aria-live="polite">
          <div class="loading-state" style="padding: 40px; text-align: center;">Preparing your learning space…</div>
        </div>
        ${rightsFooter()}
      </main>
      <div id="modal-root"></div>
    </div>`;
}

function pageTitle(): string {
  if (activePage === 'practice') return 'Choose a gentle adventure';
  if (activePage === 'progress') return 'Look how far you’ve come';
  if (activePage === 'resources') return 'Stories and learning ideas';
  return `Good things grow, ${activeChild?.name || 'reader'}!`;
}

function statCard(icon: string, label: string, value: string | number, foot: string): string {
  return `
    <article class="stat-card">
      <span class="stat-icon">${icon}</span>
      <span style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${label}</span>
      <strong>${value}</strong>
      <small>${foot}</small>
    </article>`;
}

async function homePage(): Promise<string> {
  const child = activeChild!;
  const path = learningPath || await learning.getOrGeneratePath(child);
  learningPath = path;
  const chart = await charts.getChartSummary(child.id, 'week');
  const progress = profiles.getChildProgress(child.id);
  const rec = path.recommendations[0];
  const actualAccuracy = chart.overallAccuracy;
  const bars = chart.dataPoints.slice(-7);
  
  const chartMarkup = chart.isEmpty
    ? `<div class="chart-empty" style="padding: 30px; text-align: center;"><span style="font-size: 32px;">🌱</span><p style="margin-top: 8px; color: var(--text-muted); font-size: 13px;">${escapeHtml(chart.emptyMessage)}</p></div>`
    : `<div class="accuracy-bars" role="img" aria-label="Recent recorded accuracy: ${bars.map(point => `${point.dayLabel} ${point.accuracyPercent}%`).join(', ')}">
        ${bars.map(point => `
          <div class="bar-item">
            <div class="bar-track">
              <span class="bar-fill" style="height:${Math.max(8, point.accuracyPercent)}%"></span>
            </div>
            <small>${escapeHtml(point.dayLabel)}</small>
          </div>`).join('')}
       </div>`;

  return `
    <section class="welcome-banner">
      <div class="welcome-copy">
        <span class="badge badge-warm" style="margin-bottom: 8px;">YOUR NEXT LITTLE WIN</span>
        <h2>Ready to grow, ${escapeHtml(child.name)}?</h2>
        <p>${escapeHtml(rec?.reason || 'Pick a friendly activity and learn at your own pace.')}</p>
        <button class="btn btn-warm btn-lg" type="button" data-action="${rec ? 'start-recommendation' : 'navigate'}" ${rec ? `data-skill="${escapeHtml(rec.targetSkillId)}" data-title="${escapeHtml(rec.title)}" data-difficulty="${rec.difficulty}"` : 'data-page="practice"'}>
          Start Practice Adventure <span>→</span>
        </button>
      </div>
    </section>

    <section class="stats-grid">
      ${statCard('⏱', 'Practice minutes', progress.practiceMinutes, 'Time spent learning')}
      ${statCard('✦', 'Happy points', progress.happyPoints, 'Little wins add up')}
      ${statCard('📖', 'Words learned', progress.wordsLearned, 'Words on your journey')}
      ${statCard('↗', 'Recent accuracy', actualAccuracy === null ? '—' : `${actualAccuracy}%`, chart.isEmpty ? 'Complete an activity to begin' : 'From recorded practice')}
    </section>

    <div class="dashboard-grid">
      <section class="surface">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-primary">WEEKLY METRICS</span>
            <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">Reading confidence</h3>
            <p style="margin: 0; font-size: 13px; color: var(--text-muted);">Accuracy from completed activities this week.</p>
          </div>
          <span class="badge badge-outline">${chart.totalSessions} ${chart.totalSessions === 1 ? 'session' : 'sessions'}</span>
        </div>
        ${chartMarkup}
      </section>

      <section class="surface">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-warm">RECOMMENDED NEXT</span>
            <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">Picked for ${escapeHtml(child.name)}</h3>
          </div>
          <span style="font-size: 24px;">${escapeHtml(rec?.actionIcon || '🌱')}</span>
        </div>
        <h4 style="font-family: var(--font-heading); font-size: 17px; margin: 8px 0 4px;">${escapeHtml(rec?.title || 'Choose a first activity')}</h4>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px;">${escapeHtml(rec?.description || 'Start with a short, friendly practice activity.')}</p>
        
        ${rec ? `
          <button class="btn btn-primary btn-lg" style="width: 100%;" type="button" data-action="start-recommendation" data-skill="${escapeHtml(rec.targetSkillId)}" data-title="${escapeHtml(rec.title)}" data-difficulty="${rec.difficulty}">
            Try this activity <span>→</span>
          </button>
        ` : button('Browse activities', 'navigate-practice', 'btn btn-primary btn-lg')}
      </section>
    </div>`;
}

function practicePage(): string {
  const recs = new Map((learningPath?.recommendations || []).map(rec => [rec.targetSkillId, rec]));
  return `
    <section style="margin-bottom: 24px;">
      <span class="badge badge-primary">PICK WHAT FEELS FUN</span>
      <h2 style="font-family: var(--font-heading); font-size: 26px; font-weight: 900; margin: 6px 0 4px;">Every activity is a fresh chance to grow.</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Choose an activity. There’s no rush, no penalties, and you can always ask for a hint.</p>
    </section>

    <div class="curriculum-grid">
      ${ACTIVITY_CATALOG.map((item, index) => {
        const rec = recs.get(item.skillId);
        return `
          <article class="curriculum-card tone-${index % 6}">
            <div class="card-top-row">
              <span class="curriculum-emoji">${escapeHtml(item.icon)}</span>
              <span class="badge badge-outline">${escapeHtml(rec?.recommendationType || item.tag)}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
            <div class="curriculum-meta-row">
              <span>⏱ ${item.estimatedMinutes} min · ${escapeHtml(rec?.difficulty || item.difficulty)}</span>
              <button type="button" class="btn btn-outline btn-sm" data-action="start-catalog" data-skill="${escapeHtml(item.skillId)}" data-title="${escapeHtml(item.title)}" data-difficulty="${escapeHtml(rec?.difficulty || item.difficulty)}">
                Try it <span>→</span>
              </button>
            </div>
          </article>`;
      }).join('')}
    </div>`;
}

async function progressPage(): Promise<string> {
  const child = activeChild!;
  const [chart, attempts] = await Promise.all([
    charts.getChartSummary(child.id, 'month'),
    learning.getChildAttempts(child.id),
  ]);
  const report = activityTracker.getSummary(child.id, child.name, '30days');

  return `
    <section style="margin-bottom: 24px;">
      <span class="badge badge-primary">REAL PRACTICE, REAL PROGRESS</span>
      <h2 style="font-family: var(--font-heading); font-size: 26px; font-weight: 900; margin: 6px 0 4px;">Celebrate the steps you’ve taken.</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Your progress is built from completed activities, not made-up scores.</p>
    </section>

    <section class="stats-grid">
      ${statCard('✓', 'Completed activities', attempts.length, 'Recorded learning attempts')}
      ${statCard('◎', 'Accuracy', chart.overallAccuracy === null ? '—' : `${chart.overallAccuracy}%`, 'Across selected practice')}
      ${statCard('◷', 'Practice time', `${Math.round(report.totalActiveSeconds / 60)} min`, 'Tracked active sessions')}
      ${statCard('✦', 'Sessions', report.totalSessions, 'In the last 30 days')}
    </section>

    <section class="surface" style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <span class="badge badge-primary">LAST 30 DAYS</span>
          <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">Reading confidence</h3>
          <p style="margin: 0; font-size: 13px; color: var(--text-muted);">
            ${chart.isEmpty ? escapeHtml(chart.emptyMessage) : `${chart.totalAttempts} recorded ${chart.totalAttempts === 1 ? 'attempt' : 'attempts'} · trend ${chart.trend}`}
          </p>
        </div>
      </div>
      
      ${chart.isEmpty 
        ? '<div class="chart-empty" style="padding: 30px; text-align: center;"><span style="font-size: 32px;">🌱</span><p style="color: var(--text-muted); margin-top: 8px;">Complete a practice adventure to start your chart.</p></div>' 
        : `<div class="accuracy-bars" style="height: 180px;">
            ${chart.dataPoints.slice(-14).map(point => `
              <div class="bar-item">
                <div class="bar-track" style="height: 150px;">
                  <span class="bar-fill" style="height:${Math.max(8, point.accuracyPercent)}%"></span>
                </div>
                <small>${escapeHtml(point.dayLabel)}</small>
              </div>`).join('')}
           </div>`}
    </section>

    <section class="surface">
      <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; margin: 0 0 16px;">Practice history</h3>
      ${attempts.length ? `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${[...attempts].reverse().slice(0, 8).map(attempt => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-md);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">📖</span>
                <div>
                  <strong style="font-size: 14px;">${escapeHtml(attempt.activityId.replace(/^act_/, '').replace(/_/g, ' '))}</strong>
                  <small style="display: block; color: var(--text-muted); font-size: 11px;">${new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small>
                </div>
              </div>
              <strong style="color: var(--primary); font-size: 15px;">${Math.round(attempt.accuracy * 100)}%</strong>
            </div>`).join('')}
        </div>
      ` : '<p style="color: var(--text-muted); font-size: 13px;">Your completed activities will show up here.</p>'}
    </section>`;
}

async function resourcesPage(): Promise<string> {
  const status = await tinyFish.checkStatus();
  return `
    <section style="margin-bottom: 24px;">
      <span class="badge badge-primary">A LITTLE MORE TO EXPLORE</span>
      <h2 style="font-family: var(--font-heading); font-size: 26px; font-weight: 900; margin: 6px 0 4px;">Find something fun to read or try.</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin: 0;">Search public educational resources by topic, level, language, and type.</p>
    </section>

    <div style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--radius-md); background: ${status.configured ? 'var(--primary-light)' : 'var(--accent-warm-light)'}; margin-bottom: 20px;">
      <span style="font-size: 18px;">${status.configured ? '✅' : 'ℹ️'}</span>
      <div>
        <strong style="display: block; font-size: 13px; color: ${status.configured ? 'var(--primary)' : '#78350f'};">
          ${status.configured ? 'Resource search is ready (TinyFish Live)' : 'Resource search is running in demo mode'}
        </strong>
        <small style="color: var(--text-muted); font-size: 12px;">
          ${status.configured ? 'TinyFish educational search is configured and active.' : 'Configure TINYFISH_API_KEY on the backend to enable live web indexing.'}
        </small>
      </div>
    </div>

    <section class="surface" style="margin-bottom: 24px;">
      <form id="resource-form" class="resource-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; align-items: flex-end;">
        <label style="grid-column: 1 / -1; display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
          What would you like to learn about?
          <input name="topic" maxlength="100" required placeholder="Try 'phonics sounds' or 'rhyming words'" />
        </label>
        
        <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
          Reading level
          <select name="grade">
            <option value="any">Any level</option>
            <option>Class 1 · Early reader</option>
            <option>Class 2 · Growing reader</option>
            <option>Class 3 · Little reader</option>
            <option>Class 4 · Confident reader</option>
          </select>
        </label>

        <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
          Resource type
          <select name="resourceType">
            <option value="any">Any type</option>
            <option value="reading_exercise">Reading exercise</option>
            <option value="phonics_activity">Phonics activity</option>
            <option value="educational_game">Educational game</option>
            <option value="worksheet">Worksheet</option>
          </select>
        </label>

        <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
          Language
          <select name="language">
            ${(['English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Odia'] as SupportedLanguage[]).map(lang => `
              <option ${lang === activeChild!.preferredLanguage ? 'selected' : ''}>${lang}</option>
            `).join('')}
          </select>
        </label>

        <button class="btn btn-primary btn-lg" type="submit" style="min-height: 46px;">
          Search Resources <span>⌕</span>
        </button>
      </form>

      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 16px;">
        <span style="font-size: 12px; font-weight: 700; color: var(--text-subtle);">Suggestions:</span>
        ${['phonics sound patterns', 'sight words practice', 'short stories', 'rhyming games'].map(topic => `
          <button type="button" class="btn btn-outline btn-sm" data-action="resource-suggestion" data-topic="${escapeHtml(topic)}">
            ${escapeHtml(topic)}
          </button>
        `).join('')}
      </div>
    </section>

    <div id="resource-results">
      ${resourceResults.length ? renderResources(resourceResults) : ''}
    </div>`;
}

function renderResources(resources: EducationalResource[]): string {
  if (!resources.length) {
    return '<div class="surface" style="padding: 24px; text-align: center; color: var(--text-muted);">No resources found for this search. Try another topic or language.</div>';
  }
  return `
    <section>
      <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; margin: 0 0 16px;">${resources.length} learning ${resources.length === 1 ? 'idea' : 'ideas'} found</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        ${resources.map(resource => {
          let safeUrl = '';
          try {
            const parsed = new URL(resource.url);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') safeUrl = parsed.href;
          } catch { safeUrl = ''; }
          return `
            <article class="surface" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <span class="badge badge-primary" style="margin-bottom: 8px;">${escapeHtml(resource.resourceType.replace(/_/g, ' '))}</span>
                <h4 style="font-family: var(--font-heading); font-size: 16px; font-weight: 800; margin: 4px 0 6px;">${escapeHtml(resource.title)}</h4>
                <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 12px;">${escapeHtml(resource.summary)}</p>
                <div style="font-size: 11px; font-weight: 700; color: var(--text-subtle);">${escapeHtml(resource.siteName)} · ${escapeHtml(resource.language)}</div>
              </div>
              <div style="margin-top: 16px;">
                ${safeUrl ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : ''}
              </div>
            </article>`;
        }).join('')}
      </div>
      ${resourceDisclaimer ? `<p style="font-size: 11px; color: var(--text-subtle); margin-top: 14px;">${escapeHtml(resourceDisclaimer)}</p>` : ''}
    </section>`;
}

async function renderAppPage(): Promise<void> {
  const renderRevision = ++appRenderRevision;
  const user = auth.getCurrentUser();

  // If user requested public landing page or is not logged in:
  if (activePage === 'landing' || !user) {
    if (activePage === 'auth') {
      renderAuth();
    } else {
      activePage = 'landing';
      renderLandingPage(user || undefined);
    }
    return;
  }

  const children = await profiles.getChildren(user.id);
  if (renderRevision !== appRenderRevision) return;

  if (activePage === 'profiles') {
    profiles.setActiveChild(null);
    activeChild = null;
    renderProfiles(children);
    return;
  }

  const storedActiveChild = profiles.getActiveChild();
  activeChild = activeChild && children.some(child => child.id === activeChild!.id)
    ? activeChild
    : storedActiveChild && children.some(child => child.id === storedActiveChild.id)
      ? storedActiveChild
      : (children.length > 0 ? children[0] : null);

  if (!activeChild) {
    profiles.setActiveChild(null);
    renderProfiles(children);
    return;
  }

  profiles.setActiveChild(activeChild);
  if (!syncedChildIds.has(activeChild.id)) {
    await activityTracker.syncSessionsFromDatabase(activeChild.id);
    syncedChildIds.add(activeChild.id);
  }
  if (renderRevision !== appRenderRevision) return;

  root!.innerHTML = renderShell(user.fullName);
  const content = root!.querySelector<HTMLElement>('#page-content')!;

  try {
    learningPath = learningPath?.childId === activeChild.id
      ? learningPath
      : await learning.getOrGeneratePath(activeChild);
    if (renderRevision !== appRenderRevision) return;

    const pageContent = activePage === 'practice'
      ? practicePage()
      : activePage === 'progress'
        ? await progressPage()
        : activePage === 'resources'
          ? await resourcesPage()
          : await homePage();

    if (renderRevision === appRenderRevision) content.innerHTML = pageContent;
  } catch (error) {
    if (renderRevision !== appRenderRevision) return;
    console.error('Unable to load the learning view:', error);
    content.innerHTML = `
      <section class="surface" style="padding: 30px; text-align: center;">
        <span style="font-size: 32px;">⚠️</span>
        <h2 style="font-family: var(--font-heading); font-size: 20px;">We couldn’t load this view.</h2>
        <p style="color: var(--text-muted); font-size: 13px;">${escapeHtml(error instanceof Error ? error.message : 'Please try again.')}</p>
        <button class="btn btn-primary" type="button" data-action="retry">Try again</button>
      </section>`;
  }
}

function showProfileForm(child?: ChildProfile): void {
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';
  const currentConfiguredLangs = child ? getLearnerLanguages(child) : ['English', 'Hindi'];
  const allSupportedLangs: SupportedLanguage[] = ['English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Odia'];

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div class="modal-heading">
          <div>
            <span class="badge badge-primary">LEARNER PROFILE</span>
            <h2 id="profile-modal-title">${child ? 'Update learner' : 'Add a learner'}</h2>
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button>
        </div>
        <form id="child-form" class="form-stack">
          <input type="hidden" name="childId" value="${escapeHtml(child?.id || '')}" />
          <label>Learner’s name<input name="name" required maxlength="60" value="${escapeHtml(child?.name || '')}" placeholder="First name" /></label>
          <label>Reading level
            <select name="grade">
              <option ${child?.grade.includes('2') ? 'selected' : ''}>Class 2 · Early reader</option>
              <option ${child?.grade.includes('3') ? 'selected' : ''}>Class 3 · Growing reader</option>
              <option ${child?.grade.includes('4') ? 'selected' : ''}>Class 4 · Little reader</option>
              <option ${child?.grade.includes('5') ? 'selected' : ''}>Class 5 · Confident reader</option>
            </select>
          </label>
          <div>
            <span style="display: block; font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">
              Configured learning languages
            </span>
            <span style="display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">
              Select all languages for this learner. The dashboard dropdown will display exactly these languages.
            </span>
            <div class="lang-checkbox-grid">
              ${allSupportedLangs.map(lang => {
                const isChecked = currentConfiguredLangs.includes(lang);
                return `
                  <label class="lang-checkbox-pill ${isChecked ? 'checked' : ''}">
                    <input
                      type="checkbox"
                      name="configuredLanguages"
                      value="${escapeHtml(lang)}"
                      ${isChecked ? 'checked' : ''}
                    />
                    <span>${languageFlags[lang] || '🌐'} ${escapeHtml(lang)}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
          <label>Active starting language
            <select name="language" id="profilePrimaryLanguage">
              ${allSupportedLangs.map(lang => `
                <option value="${lang}" ${lang === (child?.preferredLanguage || 'English') ? 'selected' : ''}>${lang}</option>
              `).join('')}
            </select>
          </label>
          <label>Avatar
            <select name="avatar">
              ${['👧🏽', '👦🏻', '🧒🏽', '🦊', '🐼', '🦉'].map(avatar => `
                <option ${avatar === (child?.avatar || '👧🏽') ? 'selected' : ''}>${avatar}</option>
              `).join('')}
            </select>
          </label>
          <p class="form-message" id="child-message" aria-live="polite"></p>
          <button class="btn btn-primary btn-lg" style="width: 100%;" type="submit">${child ? 'Save changes' : 'Create learner profile'}</button>
        </form>
      </section>
    </div>`;
  modal.querySelector<HTMLInputElement>('[name="name"]')?.focus();
}

function showSettings(): void {
  const hasPin = auth.hasParentPin();
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';
  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="modal-heading">
          <div>
            <span class="badge badge-primary">PARENT CONTROLS</span>
            <h2 id="settings-title">Account &amp; privacy</h2>
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button>
        </div>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px;">
          Signed in as ${escapeHtml(auth.getCurrentUser()?.email)}. ${auth.isLiveDatabaseConnected() ? 'Live Supabase database connected.' : 'Running with local demo storage.'}
        </p>
        <form id="pin-form" class="form-stack">
          ${hasPin ? '<label>Current parent PIN<input name="oldPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="4-digit PIN" /></label>' : ''}
          <label>${hasPin ? 'New parent PIN' : 'Set a parent PIN'}<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="Choose a 4-digit PIN" /></label>
          <button class="btn btn-primary" type="submit">${hasPin ? 'Change parent PIN' : 'Set parent PIN'}</button>
          <p id="pin-message" class="form-message" aria-live="polite"></p>
        </form>
      </section>
    </div>`;
  modal.querySelector<HTMLInputElement>('input')?.focus();
}

// ----------------------------------------------------
// ACTIVITY RUNNER & INTERACTION
// ----------------------------------------------------
async function startActivity(skillId: string, title: string, difficulty: string): Promise<void> {
  // If not logged in, auto-login with demo account so user can immediately experience the real activity
  if (!auth.getCurrentUser() || !activeChild) {
    toast('Entering Demo Sandbox…');
    await quickDemoLogin();
  }

  const child = activeChild;
  if (!child) return;

  const level = difficulty === 'advanced' ? 'advanced' : difficulty === 'intermediate' ? 'intermediate' : 'beginner';
  const parentId = auth.getCurrentUser()?.id || child.parentId;
  activityTracker.startActivity(parentId, child.id, 'practice_game', title);
  activityStartedAt = Date.now();
  activityQuestionStartedAt = activityStartedAt;
  activityQuestionNumber = 1;
  activityQuestionSkills = new Set([skillId]);
  completedActivityAttempts = [];
  practiceResource = null;
  practiceResourceMessage = 'Finding related TinyFish learning resources…';
  practiceResourceRequestId++;
  activityAttempts = 0;
  activityHints = 0;
  activityMissedItems = [];
  activitySaving = false;
  activitySaveFailed = false;

  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (modal) {
    modal.innerHTML = '<div class="modal-backdrop"><section class="modal-card" style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto 16px;"></div>Preparing your reading adventure…</section></div>';
    document.body.style.overflow = 'hidden';
  }

  try {
    activity = await ai.generateActivity({
      skillId,
      difficulty: level,
      language: child.preferredLanguage,
      childName: child.name,
      interest: title,
    });
    activityQuestionStartedAt = Date.now();
    renderActivityModal();
    void loadPracticeResource(title, child);
  } catch (error) {
    activityTracker.stopActivity();
    throw error;
  }
}

function renderActivityModal(feedback = '', answered = false, feedbackIsPositive = false): void {
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal || !activity) return;
  const languageCode = activity.language === 'Hindi' ? 'hi' : 'en';

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal-card activity-modal" lang="${languageCode}" role="dialog" aria-modal="true" aria-labelledby="activity-title">
        <div class="modal-heading">
          <div>
            <span class="badge badge-primary">${escapeHtml(activity.difficulty)} · ${escapeHtml(activity.language)}</span>
            <h2 id="activity-title">${escapeHtml(activity.title)}</h2>
          </div>
          <button class="icon-button" type="button" data-action="close-activity" aria-label="Close activity">×</button>
        </div>

        <div class="activity-instruction">
          <small>QUESTION ${activityQuestionNumber} OF ${activityQuestionLimit} · GENTLE CHALLENGE</small>
          <p>${escapeHtml(activity.instruction)}</p>
        </div>

        <div class="activity-prompt">
          <h3>${escapeHtml(activity.prompt)}</h3>
          ${activity.audioPrompt ? `
            <button class="btn btn-ghost btn-sm" type="button" data-action="speak-prompt">
              🔊 Hear the question aloud
            </button>
          ` : ''}
        </div>

        <div class="answer-grid">
          ${activity.items.map(item => `
            <button type="button" class="answer-option ${activityMissedItems.includes(item.text) ? 'answer-missed' : ''}" data-action="answer" data-item="${escapeHtml(item.id)}" ${answered ? 'disabled' : ''}>
              ${item.visual ? `<span>${escapeHtml(item.visual)}</span>` : ''}
              <strong>${escapeHtml(item.text)}</strong>
            </button>
          `).join('')}
        </div>

        <p class="answer-feedback ${feedbackIsPositive ? 'feedback-good' : 'feedback-neutral'}" aria-live="polite">
          ${escapeHtml(feedback)}
        </p>

        <div id="practice-resource" class="practice-resource" aria-live="polite">
          ${practiceResourceMarkup()}
        </div>

        <div class="activity-controls">
          <button type="button" class="btn btn-outline btn-sm" data-action="activity-hint" ${answered ? 'disabled' : ''}>
            💡 Get a hint
          </button>
          ${activity.workedExample ? `
            <button type="button" class="btn btn-outline btn-sm" data-action="activity-example" ${answered ? 'disabled' : ''}>
              👀 Show example
            </button>
          ` : ''}
          ${answered ? (
            activitySaveFailed
              ? `<button type="button" class="btn btn-outline btn-sm" data-action="close-activity">Close activity</button>`
              : activityQuestionNumber < activityQuestionLimit
                ? `<button type="button" class="btn btn-outline btn-sm" data-action="finish-activity" ${activitySaving ? 'disabled' : ''}>Finish now</button>
                   <button type="button" class="btn btn-primary btn-sm" data-action="next-question" ${activitySaving ? 'disabled' : ''}>Next question →</button>`
                : `<button type="button" class="btn btn-primary btn-sm" data-action="finish-activity" ${activitySaving ? 'disabled' : ''}>
                    ${activitySaving ? 'Saving progress…' : 'Finish &amp; celebrate 🎉'}
                   </button>`
          ) : ''}
        </div>
      </section>
    </div>`;
  modal.querySelector<HTMLElement>('.icon-button')?.focus();
}

function practiceResourceMarkup(): string {
  if (practiceResource) {
    return `
      <div style="font-size: 11px; font-weight: 700; color: var(--primary);">RELATED TINYFISH RESOURCE</div>
      <a href="${escapeHtml(practiceResource.url)}" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: var(--text-main); font-size: 13px;">
        ${escapeHtml(practiceResource.title)} ↗
      </a>
      <small style="color: var(--text-muted); font-size: 11px; display: block;">${escapeHtml(practiceResource.siteName)}</small>`;
  }
  return `
    <div style="font-size: 11px; font-weight: 700; color: var(--primary);">RELATED TINYFISH RESOURCE</div>
    <small style="color: var(--text-muted); font-size: 12px;">${escapeHtml(practiceResourceMessage)}</small>`;
}

async function loadPracticeResource(topic: string, child: ChildProfile): Promise<void> {
  const requestId = ++practiceResourceRequestId;
  practiceResource = null;
  practiceResourceMessage = 'Finding a related learning resource…';
  const container = root!.querySelector<HTMLElement>('#practice-resource');
  if (container) container.innerHTML = practiceResourceMarkup();

  try {
    const response = await tinyFish.searchResources({
      topic: `${topic} reading practice`,
      grade: child.grade,
      resourceType: 'any',
      language: child.preferredLanguage,
    });
    if (requestId !== practiceResourceRequestId) return;
    practiceResource = response.success ? response.resources[0] || null : null;
    practiceResourceMessage = !response.configured
      ? 'TinyFish is ready in local mode. Keep practicing!'
      : response.error || 'No related resource was found. Keep practicing!';
  } catch (error) {
    if (requestId !== practiceResourceRequestId) return;
    console.error('TinyFish practice resource lookup failed:', error);
    practiceResourceMessage = 'Resource search is taking a rest. Keep going!';
  }

  const resourceContainer = root!.querySelector<HTMLElement>('#practice-resource');
  if (resourceContainer) resourceContainer.innerHTML = practiceResourceMarkup();
}

function getNextQuestionDifficulty(current: InteractiveActivityContent, attempts: number, hints: number): ActivityDifficulty {
  const levels: ActivityDifficulty[] = ['beginner', 'intermediate', 'advanced'];
  const currentIndex = levels.indexOf(current.difficulty);
  const adjustment = attempts === 1 && hints === 0 ? 1 : attempts >= 3 || hints >= 2 ? -1 : 0;
  return levels[Math.max(0, Math.min(levels.length - 1, currentIndex + adjustment))]!;
}

function currentQuestionAttempt(): LearningAttempt {
  if (!activity || !activeChild) throw new Error('There is no active reading question to save.');
  return {
    id: `attempt-${Date.now().toString(36)}-${activityQuestionNumber}`,
    childId: activeChild.id,
    activityId: activity.id,
    skillId: activity.skillId,
    activityType: activity.type,
    score: 100,
    accuracy: 1,
    totalQuestions: 1,
    correctAnswers: 1,
    incorrectAnswers: Math.max(0, activityAttempts - 1),
    attemptsRequired: Math.max(1, activityAttempts),
    hintsRequested: activityHints,
    correctedAfterHint: activityHints > 0 ? 1 : 0,
    durationSeconds: Math.max(1, Math.round((Date.now() - activityQuestionStartedAt) / 1000)),
    missedItems: [...activityMissedItems],
    completedAt: new Date().toISOString(),
    feedbackNotes: activityHints ? 'Completed with a supportive hint.' : undefined,
  };
}

async function nextActivityQuestion(): Promise<void> {
  if (!activity || !activeChild || activitySaving || activityQuestionNumber >= activityQuestionLimit) return;
  const child = activeChild;
  const previousActivity = activity;
  const nextCatalogActivity = ACTIVITY_CATALOG.find(item => !activityQuestionSkills.has(item.skillId));
  const nextSkillId = nextCatalogActivity?.skillId || previousActivity.skillId;
  const nextDifficulty = getNextQuestionDifficulty(previousActivity, activityAttempts, activityHints);

  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (modal) modal.innerHTML = '<div class="modal-backdrop"><section class="modal-card" style="text-align: center; padding: 40px;">Preparing your next question…</section></div>';

  try {
    const nextActivity = await ai.generateActivity({
      skillId: nextSkillId,
      difficulty: nextDifficulty,
      language: child.preferredLanguage,
      childName: child.name,
      interest: nextCatalogActivity?.title || previousActivity.title,
    });
    completedActivityAttempts.push(currentQuestionAttempt());
    activityQuestionSkills.add(nextActivity.skillId);
    activityQuestionNumber++;
    activityAttempts = 0;
    activityHints = 0;
    activityMissedItems = [];
    activity = nextActivity;
    activityQuestionStartedAt = Date.now();
    renderActivityModal();
  } catch (error) {
    renderActivityModal('We couldn’t prepare the next question. Please try again.', true);
    throw error;
  }
}

async function finishActivity(): Promise<void> {
  if (!activity || !activeChild || activitySaving || !root!.querySelector('#modal-root .answer-option:disabled')) return;
  activitySaving = true;
  renderActivityModal('Saving your progress…', true);
  activityTracker.stopActivity();
  const attempts = [...completedActivityAttempts, currentQuestionAttempt()];
  const child = activeChild;

  try {
    for (const attempt of attempts) {
      const { updatedPath } = await learning.recordAttempt(attempt);
      learningPath = updatedPath;
    }
    const progress = profiles.getChildProgress(child.id);
    profiles.updateChildProgress(child.id, {
      practiceMinutes: progress.practiceMinutes + Math.max(1, Math.round((Date.now() - activityStartedAt) / 60000)),
      wordsLearned: progress.wordsLearned + attempts.length,
      happyPoints: progress.happyPoints + 5 * attempts.length,
      practiceWins: progress.practiceWins + 1,
      accuracyPercent: 100,
    });
  } catch (error) {
    activitySaving = false;
    activitySaveFailed = true;
    renderActivityModal('We couldn’t confirm that progress was saved. Close the activity before trying again.', true);
    throw error;
  }

  activity = null;
  activitySaving = false;
  activitySaveFailed = false;
  completedActivityAttempts = [];
  activityQuestionSkills.clear();
  practiceResourceRequestId++;
  document.body.style.overflow = '';
  toast(`Adventure complete! +${5 * attempts.length} happy points 🎉`);
  
  // If user was on the landing page, return to landing page, else render dashboard
  await renderAppPage();
}

async function quickDemoLogin(): Promise<void> {
  const result = await auth.login({
    email: 'parent@dysleximate.demo',
    password: 'Password123!',
  });
  if (result.success && result.user) {
    const children = await profiles.getChildren(result.user.id);
    if (children.length > 0) {
      activeChild = children[0]!;
      profiles.setActiveChild(activeChild);
    }
  }
}

async function submitResourceSearch(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const topic = String(data.get('topic') || '').trim();
  const results = root!.querySelector<HTMLElement>('#resource-results');
  if (!topic || !results) return;

  results.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-muted);">Searching educational resources…</div>';
  try {
    const response = await tinyFish.searchResources({
      topic,
      grade: String(data.get('grade') || 'any'),
      resourceType: String(data.get('resourceType') || 'any') as ResourceType,
      language: String(data.get('language') || activeChild?.preferredLanguage || 'English'),
    });
    resourceResults = response.resources;
    resourceDisclaimer = response.disclaimer;
    if (!response.success && response.error) {
      results.innerHTML = `<div class="surface" style="padding: 24px; color: var(--accent-coral);">Search couldn’t be completed: ${escapeHtml(response.error)}</div>`;
      return;
    }
    results.innerHTML = renderResources(response.resources);
  } catch (error) {
    console.error('Resource search failed:', error);
    results.innerHTML = `<div class="surface" style="padding: 24px; color: var(--accent-coral);">Search couldn’t be completed. Please try again.</div>`;
  }
}

// ----------------------------------------------------
// EVENT LISTENERS & ACTION ROUTING
// ----------------------------------------------------
root!.addEventListener('click', async event => {
  const target = event.target as HTMLElement;
  const control = target.closest<HTMLElement>('[data-action]');
  if (!control) return;
  const action = control.dataset.action;

  try {
    if (action === 'toggle-dyslexia-font') {
      dyslexiaMode = !dyslexiaMode;
      localStorage.setItem('dyslexiaFont', String(dyslexiaMode));
      document.body.classList.toggle('dyslexia-font-mode', dyslexiaMode);
      document.querySelectorAll('.dyslexia-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', dyslexiaMode);
      });
      toast(dyslexiaMode ? 'Dyslexia-friendly reading mode enabled' : 'Standard typography restored');
    } else if (action === 'toggle-custom-lang') {
      customLangMenuOpen = !customLangMenuOpen;
      const dropdown = root!.querySelector<HTMLElement>('#customLangDropdown');
      if (dropdown) {
        dropdown.classList.toggle('open', customLangMenuOpen);
        const trigger = dropdown.querySelector<HTMLElement>('.custom-lang-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', String(customLangMenuOpen));
      }
    } else if (action === 'select-custom-lang') {
      const newLang = control.dataset.lang as SupportedLanguage;
      customLangMenuOpen = false;
      const dropdown = root!.querySelector<HTMLElement>('#customLangDropdown');
      if (dropdown) {
        dropdown.classList.remove('open');
        const trigger = dropdown.querySelector<HTMLElement>('.custom-lang-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }

      if (activeChild && activeChild.preferredLanguage !== newLang) {
        try {
          activeChild.preferredLanguage = newLang;
          profiles.setActiveChild(activeChild);

          // 1. Persist updated language in backend / storage
          await profiles.updateChild(activeChild.id, {
            preferredLanguage: newLang,
          });

          // 2. Clear learning path cache and regenerate for the newly selected language
          learningPath = null;
          learningPath = await learning.getOrGeneratePath(activeChild);

          // 3. Update i18n language model
          const langCode = i18n.supportedLanguageToCode(newLang);
          await i18n.setLanguage(langCode);

          toast(`Learning language set to ${newLang} 🌐`);

          // 4. Re-render the dashboard with fresh content in the chosen language
          await renderAppPage();
        } catch (err) {
          console.error('Failed to update learning language:', err);
          toast('Unable to update language. Please try again.', true);
        }
      }
    } else if (action === 'toggle-mobile-menu') {
      mobileMenuOpen = !mobileMenuOpen;
      const drawer = root!.querySelector<HTMLElement>('#mobile-nav-drawer');
      if (drawer) drawer.classList.toggle('open', mobileMenuOpen);
    } else if (action === 'nav-scroll') {
      const targetId = control.dataset.target;
      mobileMenuOpen = false;
      const drawer = root!.querySelector<HTMLElement>('#mobile-nav-drawer');
      if (drawer) drawer.classList.remove('open');
      
      if (activePage !== 'landing') {
        navigateTo('landing', { scrollToTop: false });
        setTimeout(() => {
          if (targetId === 'top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (targetId) {
            const el = document.querySelector(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 60);
        return;
      }
      
      if (targetId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (targetId) {
        const el = document.querySelector(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (action === 'test-hero-letter') {
      heroActiveLetter = (control.dataset.letter as 'b' | 'd') || 'b';
      const bBtn = root!.querySelector<HTMLElement>('[data-letter="b"]');
      const dBtn = root!.querySelector<HTMLElement>('[data-letter="d"]');
      bBtn?.classList.toggle('active-choice', heroActiveLetter === 'b');
      dBtn?.classList.toggle('active-choice', heroActiveLetter === 'd');
      const feedback = root!.querySelector<HTMLElement>('#hero-letter-feedback');
      if (feedback) {
        feedback.textContent = heroActiveLetter === 'b'
          ? '💡 Tap letter "b": /b/ as in book & bat'
          : '💡 Tap letter "d": /d/ as in door & duck';
      }
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(heroActiveLetter === 'b' ? 'Letter b says buh, as in bat.' : 'Letter d says duh, as in door.');
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } else if (action === 'speak-hero-letter') {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(heroActiveLetter === 'b' ? 'Letter b says buh, as in bat.' : 'Letter d says duh, as in door.');
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      }
    } else if (action === 'test-playground-voice') {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          const label = root!.querySelector<HTMLElement>('#playground-voice-label');
          if (label) label.textContent = 'Read Aloud';
          return;
        }
        const text = root!.querySelector<HTMLElement>('#playground-text')?.textContent || '';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playgroundReadingSpeed;
        utterance.onend = () => {
          const label = root!.querySelector<HTMLElement>('#playground-voice-label');
          if (label) label.textContent = 'Read Aloud';
        };
        const label = root!.querySelector<HTMLElement>('#playground-voice-label');
        if (label) label.textContent = 'Stop Reading';
        window.speechSynthesis.speak(utterance);
      } else {
        toast('Speech synthesis is not supported in this browser.');
      }
    } else if (action === 'test-playground-ruler') {
      playgroundRulerActive = !playgroundRulerActive;
      control.classList.toggle('active', playgroundRulerActive);
      const ruler = root!.querySelector<HTMLElement>('#reading-ruler-bar');
      if (ruler) ruler.classList.toggle('active', playgroundRulerActive);
    } else if (action === 'test-playground-syllables') {
      playgroundSyllablesActive = !playgroundSyllablesActive;
      control.classList.toggle('active', playgroundSyllablesActive);
      const surface = root!.querySelector<HTMLElement>('#playground-surface');
      if (surface) surface.classList.toggle('syllables-active', playgroundSyllablesActive);
      const textContainer = root!.querySelector<HTMLElement>('#playground-text');
      if (textContainer) {
        textContainer.innerHTML = playgroundSyllablesActive
          ? `<span class="syllable-chunk">The</span> <span class="syllable-chunk">lit</span>·<span class="syllable-chunk">tle</span> <span class="syllable-chunk">fox</span> <span class="syllable-chunk">sat</span> <span class="syllable-chunk">on</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">warm</span> <span class="syllable-chunk">stone.</span> <span class="syllable-chunk">In</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">qui</span>·<span class="syllable-chunk">et</span> <span class="syllable-chunk">eve</span>·<span class="syllable-chunk">ning,</span> <span class="syllable-chunk">a</span> <span class="syllable-chunk">bright</span> <span class="syllable-chunk">sil</span>·<span class="syllable-chunk">ver</span> <span class="syllable-chunk">star</span> <span class="syllable-chunk">twin</span>·<span class="syllable-chunk">kled</span> <span class="syllable-chunk">a</span>·<span class="syllable-chunk">bove</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">tall</span> <span class="syllable-chunk">pine</span> <span class="syllable-chunk">trees.</span> <span class="syllable-chunk">"Ev</span>·<span class="syllable-chunk">ery</span> <span class="syllable-chunk">jour</span>·<span class="syllable-chunk">ney</span> <span class="syllable-chunk">be</span>·<span class="syllable-chunk">gins</span> <span class="syllable-chunk">with</span> <span class="syllable-chunk">a</span> <span class="syllable-chunk">sin</span>·<span class="syllable-chunk">gle</span> <span class="syllable-chunk">step,"</span> <span class="syllable-chunk">whis</span>·<span class="syllable-chunk">pered</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">friend</span>·<span class="syllable-chunk">ly</span> <span class="syllable-chunk">owl</span> <span class="syllable-chunk">from</span> <span class="syllable-chunk">the</span> <span class="syllable-chunk">branch.</span>`
          : `The little fox sat on the warm stone. In the quiet evening, a bright silver star twinkled above the tall pine trees. "Every journey begins with a single step," whispered the friendly owl from the branch.`;
      }
    } else if (action === 'set-playground-speed') {
      playgroundReadingSpeed = parseFloat(control.dataset.speed || '1.0');
      root!.querySelectorAll('[data-action="set-playground-speed"]').forEach(btn => {
        btn.classList.toggle('active', btn === control);
      });
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        const text = root!.querySelector<HTMLElement>('#playground-text')?.textContent || '';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = playgroundReadingSpeed;
        window.speechSynthesis.speak(utterance);
      }
    } else if (action === 'launch-demo') {
      await quickDemoLogin();
      toast('Welcome to the DyslexiMate Sandbox! ✨');
      navigateTo('home');
    } else if (action === 'enter-app') {
      if (auth.getCurrentUser()) {
        navigateTo('home');
      } else {
        navigateTo('auth', { authMode: 'register' });
      }
    } else if (action === 'open-website') {
      navigateTo('landing');
    } else if (action === 'open-auth') {
      const mode = control.dataset.mode === 'register' ? 'register' : 'login';
      navigateTo('auth', { authMode: mode });
    } else if (action === 'toggle-auth') {
      const mode = authMode === 'login' ? 'register' : 'login';
      navigateTo('auth', { authMode: mode, replace: true });
    } else if (action === 'logout') {
      closeModal();
      await auth.logout();
      profiles.setActiveChild(null);
      activeChild = null;
      learningPath = null;
      toast('You’ve been signed out.');
      navigateTo('landing');
    } else if (action === 'reset-password') {
      const email = root!.querySelector<HTMLInputElement>('[name="email"]')?.value || '';
      if (!email.trim()) {
        toast('Enter your email address first.', true);
        return;
      }
      const result = await auth.resetPassword(email);
      toast(result.message, !result.success);
    } else if (action === 'navigate' || action === 'navigate-practice' || action === 'navigate-resources') {
      const targetPage: AppPage = action === 'navigate-practice'
        ? 'practice'
        : action === 'navigate-resources'
          ? 'resources'
          : (control.dataset.page as AppPage) || 'home';
      navigateTo(targetPage);
    } else if (action === 'retry') {
      await renderAppPage();
    } else if (action === 'profiles') {
      profiles.setActiveChild(null);
      activeChild = null;
      navigateTo('profiles');
    } else if (action === 'select-child') {
      const user = auth.getCurrentUser();
      const children = user ? await profiles.getChildren(user.id) : [];
      activeChild = children.find(child => child.id === control.dataset.id) || null;
      if (!activeChild) throw new Error('That learner profile is no longer available.');
      profiles.setActiveChild(activeChild);
      learningPath = await learning.getOrGeneratePath(activeChild);
      navigateTo('home');
    } else if (action === 'add-child') {
      showProfileForm();
    } else if (action === 'edit-child' || action === 'delete-child') {
      const childId = control.dataset.id || '';
      const child = (await profiles.getChildren(auth.getCurrentUser()!.id)).find(item => item.id === childId);
      if (!child) throw new Error('Learner profile not found.');
      if (action === 'edit-child') {
        showProfileForm(child);
      } else if (window.confirm(`Remove ${child.name}’s learner profile? This cannot be undone.`)) {
        const deleted = await profiles.deleteChild(child.id);
        if (!deleted) throw new Error('The learner profile could not be removed.');
        if (activeChild?.id === child.id) {
          activeChild = null;
          profiles.setActiveChild(null);
        }
        toast('Learner profile removed.');
        await renderAppPage();
      }
    } else if (action === 'close-modal' || action === 'dismiss-modal') {
      if (action === 'dismiss-modal' && target !== control) return;
      closeModal();
    } else if (action === 'settings') {
      showSettings();
    } else if (action === 'start-recommendation' || action === 'start-catalog') {
      await startActivity(control.dataset.skill || '', control.dataset.title || 'Reading adventure', control.dataset.difficulty || 'beginner');
    } else if (action === 'close-activity') {
      closeModal();
    } else if (action === 'answer') {
      if (!activity) return;
      const selected = activity.items.find(item => item.id === control.dataset.item);
      if (!selected) return;
      activityAttempts++;
      if (selected.isCorrect) {
        renderActivityModal(selected.feedbackHint || 'Great work! You found it! 🌟', true, true);
      } else {
        if (!activityMissedItems.includes(selected.text)) activityMissedItems.push(selected.text);
        renderActivityModal(selected.feedbackHint || 'Nice try! Take another gentle look.', false);
      }
    } else if (action === 'next-question') {
      await nextActivityQuestion();
    } else if (action === 'activity-hint' && activity) {
      activityHints++;
      renderActivityModal(activity.stepByStepHint);
    } else if (action === 'activity-example' && activity?.workedExample) {
      renderActivityModal(`${activity.workedExample.demonstration} ${activity.workedExample.explanation}`);
    } else if (action === 'speak-prompt' && activity?.audioPrompt) {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(activity.audioPrompt);
        const language = activeChild?.preferredLanguage || 'English';
        utterance.lang = speechLocales[language] || 'en-IN';
        utterance.rate = 0.85;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      } else toast('Read-aloud is not available in this browser.');
    } else if (action === 'finish-activity') {
      await finishActivity();
    } else if (action === 'resource-suggestion') {
      const input = root!.querySelector<HTMLInputElement>('[name="topic"]');
      if (input) input.value = control.dataset.topic || '';
      input?.focus();
    }
  } catch (error) {
    console.error('Frontend action failed:', error);
    toast(error instanceof Error ? error.message : 'Something went wrong. Please try again.', true);
  }
});

// ----------------------------------------------------
// FORM SUBMISSION ROUTING
// ----------------------------------------------------
root!.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  try {
    if (form.id === 'auth-form') {
      const data = new FormData(form);
      const email = String(data.get('email') || '');
      const password = String(data.get('password') || '');
      const result = authMode === 'register'
        ? await auth.register({
            fullName: String(data.get('fullName') || ''),
            email,
            password,
            confirmPassword: String(data.get('confirmPassword') || ''),
            acceptTerms: data.get('acceptTerms') === 'on',
          })
        : await auth.login({ email, password });

      const message = root!.querySelector<HTMLElement>('#auth-message');
      if (!result.success) {
        if (message) message.textContent = result.error || 'Please check your details and try again.';
        return;
      }
      if (!result.user) {
        if (message) message.textContent = result.message || 'Check your email to finish signing in.';
        return;
      }
      toast(result.message || 'You’re signed in.');
      navigateTo('home');
    } else if (form.id === 'child-form') {
      const data = new FormData(form);
      const currentUser = auth.getCurrentUser();
      if (!currentUser) throw new Error('Please sign in again to manage learner profiles.');

      const childId = String(data.get('childId') || '');
      const primaryLang = String(data.get('language') || 'English') as SupportedLanguage;
      const configuredLanguages = data.getAll('configuredLanguages').map(String) as SupportedLanguage[];

      // Ensure primaryLang is always part of configuredLanguages
      if (configuredLanguages.length === 0) {
        configuredLanguages.push(primaryLang);
      } else if (!configuredLanguages.includes(primaryLang)) {
        configuredLanguages.unshift(primaryLang);
      }

      const profileFields = {
        name: String(data.get('name') || '').trim(),
        grade: String(data.get('grade') || 'Class 3 · Growing reader'),
        preferredLanguage: primaryLang,
        languages: configuredLanguages,
        avatar: String(data.get('avatar') || '👧🏽'),
      };

      if (childId) {
        const existingChild = await profiles.getChild(childId);
        if (!existingChild) throw new Error('That learner profile is no longer available.');
        const updatedChild = await profiles.updateChild(childId, {
          ...profileFields,
          preferences: {
            ...(existingChild.preferences || {}),
            languages: configuredLanguages,
          },
        });
        if (activeChild?.id === childId) {
          activeChild = updatedChild;
          learningPath = null;
          const langCode = i18n.supportedLanguageToCode(activeChild.preferredLanguage);
          await i18n.setLanguage(langCode);
        }
        toast('Learner profile updated.');
      } else {
        const newChild = await profiles.createChild(currentUser.id, {
          ...profileFields,
          preferences: {
            readingSpeed: 'normal',
            dyslexiaFont: false,
            highContrast: false,
            soundEffects: true,
            autoReadAloud: false,
            languages: configuredLanguages,
          },
        });
        if (!activeChild) {
          activeChild = newChild;
          profiles.setActiveChild(newChild);
        }
        toast('Learner profile created.');
      }
      closeModal();
      navigateTo('home');
    } else if (form.id === 'pin-form') {
      const data = new FormData(form);
      const newPin = String(data.get('newPin') || '');
      const oldPin = String(data.get('oldPin') || '');
      const result = auth.hasParentPin()
        ? await auth.changeParentPin(oldPin, newPin)
        : await auth.setupParentPin(newPin);
      const message = root!.querySelector<HTMLElement>('#pin-message');
      if (message) message.textContent = result.success ? 'Parent PIN saved.' : result.error || 'Could not save your PIN.';
      if (result.success) toast('Parent PIN updated.');
    } else if (form.id === 'resource-form') {
      await submitResourceSearch(form);
    }
  } catch (error) {
    console.error('Form submission failed:', error);
    const message = root!.querySelector<HTMLElement>('#child-message, #pin-message, #auth-message');
    if (message) message.textContent = error instanceof Error ? error.message : 'Please try again.';
    else toast(error instanceof Error ? error.message : 'Please try again.', true);
  }
});

// ----------------------------------------------------
// LANGUAGE SELECTION ROUTING & FORM INTERACTIONS
// ----------------------------------------------------
root!.addEventListener('change', async event => {
  const target = event.target as HTMLElement;
  if (!target) return;

  // Visual toggle for language checkboxes in profile form
  if (target.matches('input[name="configuredLanguages"]')) {
    const checkbox = target as HTMLInputElement;
    const pill = checkbox.closest('.lang-checkbox-pill');
    if (pill) {
      pill.classList.toggle('checked', checkbox.checked);
    }
    return;
  }

  // Fallback for native select if present
  if (target.id === 'dashboardLanguageSelect') {
    const select = target as HTMLSelectElement;
    const newLang = select.value as SupportedLanguage;
    if (activeChild && activeChild.preferredLanguage !== newLang) {
      try {
        activeChild.preferredLanguage = newLang;
        profiles.setActiveChild(activeChild);

        // 1. Persist updated language in backend / storage
        await profiles.updateChild(activeChild.id, {
          preferredLanguage: newLang,
        });

        // 2. Clear learning path cache and regenerate for the newly selected language
        learningPath = null;
        learningPath = await learning.getOrGeneratePath(activeChild);

        // 3. Update i18n language model
        const langCode = i18n.supportedLanguageToCode(newLang);
        await i18n.setLanguage(langCode);

        toast(`Learning language set to ${newLang} 🌐`);

        // 4. Re-render the dashboard with fresh content in the chosen language
        await renderAppPage();
      } catch (err) {
        console.error('Failed to update learning language:', err);
        toast('Unable to update language. Please try again.', true);
      }
    }
  }
});

// Close custom language dropdown when clicking outside
document.addEventListener('click', event => {
  if (!customLangMenuOpen) return;
  const target = event.target as HTMLElement | null;
  if (!target?.closest('#customLangDropdown')) {
    customLangMenuOpen = false;
    const dropdown = document.querySelector<HTMLElement>('#customLangDropdown');
    dropdown?.classList.remove('open');
    dropdown?.querySelector<HTMLElement>('.custom-lang-trigger')?.setAttribute('aria-expanded', 'false');
  }
});

// Close custom language dropdown on Escape
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && customLangMenuOpen) {
    customLangMenuOpen = false;
    const dropdown = document.querySelector<HTMLElement>('#customLangDropdown');
    dropdown?.classList.remove('open');
    dropdown?.querySelector<HTMLElement>('.custom-lang-trigger')?.setAttribute('aria-expanded', 'false');
  }
});

// ----------------------------------------------------
// BROWSER HISTORY & BACK / FORWARD NAVIGATION
// ----------------------------------------------------
window.addEventListener('popstate', () => {
  const route = parseRouteFromUrl();
  closeModal();
  if (route.authMode) {
    authMode = route.authMode;
  }
  activePage = route.page;
  updateDocumentTitle(activePage);
  void renderAppPage();
});

window.addEventListener('hashchange', () => {
  const route = parseRouteFromUrl();
  if (route.page !== activePage || (route.page === 'auth' && route.authMode !== authMode)) {
    closeModal();
    if (route.authMode) {
      authMode = route.authMode;
    }
    activePage = route.page;
    updateDocumentTitle(activePage);
    void renderAppPage();
  }
});

// ----------------------------------------------------
// AUTH STATE SUBSCRIPTION
// ----------------------------------------------------
auth.onAuthStateChanged(user => {
  const userId = user?.id || null;
  if (userId === lastRenderedUserId) return;
  lastRenderedUserId = userId;
  void renderAppPage().catch(error => {
    console.error('Unable to restore the learning space:', error);
    toast('We couldn’t restore your learning space. Please try again.', true);
  });
});

// Initialize route from current URL hash
const initialRoute = parseRouteFromUrl();
activePage = initialRoute.page;
if (initialRoute.authMode) {
  authMode = initialRoute.authMode;
}
if (!window.location.hash) {
  window.history.replaceState({ page: activePage, authMode }, '', `#/${activePage}`);
}
updateDocumentTitle(activePage);

// Initial Render
void renderAppPage();
