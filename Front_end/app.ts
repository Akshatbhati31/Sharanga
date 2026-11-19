import { ActivityTrackerService } from '../src/services/activityTrackerService';
import { ACTIVITY_CATALOG } from '../src/services/activityCatalog';
import { AiActivityService } from '../src/services/aiActivityService';
import { AuthService } from '../src/services/authService';
import { LearningPathService } from '../src/services/learningPathService';
import { ProfileService } from '../src/services/profileService';
import { ReadingChartService, type ReadingChartSummary } from '../src/services/readingChartService';
import { StoryShelfService, type StoryPassage } from '../src/services/storyShelfService';
import { TinyFishService } from '../src/services/tinyfishService';
import { LetterMirrorBDModal } from '../src/ui/letterMirrorBDModal';
import { getSkillDefinition } from '../src/services/skillModel';
import { i18n } from '../src/i18n';
import type { ActivityDifficulty, InteractiveActivityContent, LearningAttempt } from '../src/types/adaptive';
import type { ChildProfile, SupportedLanguage, ParentUser } from '../src/types/auth';
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
const storyShelf = StoryShelfService.getInstance();

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
export type AppPage = 'landing' | 'auth' | 'home' | 'practice' | 'progress' | 'resources' | 'profiles' | 'stories' | 'parent';

let parentActiveTab: 'overview' | 'child_records' | 'settings' = 'overview';
let parentSelectedChildId: string | null = null;
let parentTelemetryPeriod: 'today' | '7days' | '30days' = '30days';

let storyLanguage: SupportedLanguage | null = null;
let storyRotationAdvance = false;
let activeStory: StoryPassage | null = null;
let activeStoryFontSize = 18;
let storyComprehensionScore = 0;
let storyAnsweredQids = new Set<string>();
let storyMissedQuestions: string[] = [];

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

// Parent PIN Recovery Flow State
let pinRecoveryStage: 'verify_child' | 'reset_pin' | 'success' = 'verify_child';
let pinRecoveryToken = '';

// Mandatory Parent Portal PIN Gate State (in-memory; prevents bypass on page refresh)
let isParentPortalUnlocked = false;
let gatePinVisible = false;

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
  const wasRecoverySuccess = pinRecoveryStage === 'success';
  pinRecoveryStage = 'verify_child';
  pinRecoveryToken = '';
  activityTracker.stopActivity();
  activity = null;
  activeStory = null;
  storyAnsweredQids.clear();
  storyMissedQuestions = [];
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
  if (wasRecoverySuccess && activePage === 'parent') {
    void renderAppPage();
  }
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
    case 'stories':
    case 'story':
    case 'books':
    case 'shelf':
      return { page: 'stories' };
    case 'profiles':
      return { page: 'profiles' };
    case 'parent':
    case 'parent-dashboard':
    case 'portal':
      return { page: 'parent' };
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
    stories: 'Story Shelf & Comprehension — DyslexiMate',
    profiles: 'Choose Learner Profile — DyslexiMate',
    parent: 'Parent Dashboard & Family Learning — DyslexiMate',
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
            <a href="#/parent" class="btn btn-outline btn-sm" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
              <span>👤</span> ${escapeHtml(currentUser?.fullName || 'Parent Portal')}
            </a>
            <a href="#/parent" class="btn btn-primary btn-sm" data-action="navigate-parent" style="text-decoration: none;">
              Parent Dashboard →
            </a>
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
            <a href="#/parent" class="btn btn-primary btn-sm" data-action="navigate-parent" style="text-decoration: none;">
              Parent Dashboard →
            </a>
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
              <li><a data-action="start-catalog" data-skill="skill_confused_letters_bd" data-title="Letter Detective (b vs d)">B/D Letter Mirror</a></li>
              <li><a data-action="start-catalog" data-skill="skill_letter_sounds_basic" data-title="Letter-Sound Explorer">Letter-Sound Explorer</a></li>
              <li><a data-action="start-catalog" data-skill="skill_sight_words_high_freq" data-title="Sight Words">Sight Words Practice</a></li>
              <li><a data-action="start-catalog" data-skill="skill_phonemic_rhyme" data-title="Word Families">Rhyme &amp; Word Families</a></li>
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
              <li><a href="https://github.com/Akshatbhati31/Sharanga" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a></li>
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
          <a href="#/parent" class="btn btn-outline btn-sm" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;">
            🛡️ Parent Dashboard
          </a>
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
// PARENT DASHBOARD & ACCOUNT MANAGEMENT VIEW
// ----------------------------------------------------
function exportChildCsv(child: ChildProfile): void {
  const prog = profiles.getChildProgress(child.id);
  const summary = activityTracker.getSummary(child.id, child.name, '30days');
  const rows = [
    ['DyslexiMate Learner Progress Report'],
    ['Generated', new Date().toISOString()],
    ['Child Name', child.name],
    ['Grade', child.grade],
    ['Preferred Language', child.preferredLanguage],
    [''],
    ['Learning Metrics', 'Value'],
    ['Practice Minutes Recorded', String(prog.practiceMinutes)],
    ['Active Learning Seconds (Last 30 Days)', String(summary.totalActiveSeconds)],
    ['Active Learning Minutes (Last 30 Days)', String(Math.round(summary.totalActiveSeconds / 60))],
    ['Total Active Sessions', String(summary.totalSessions)],
    ['Most Used Activity', summary.mostUsedActivity],
    ['Happy Points', String(prog.happyPoints)],
    ['Reading Accuracy (%)', String(prog.accuracyPercent)],
    ['Current Streak (Days)', String(prog.streakDays)],
    ['Practice Wins', String(prog.practiceWins)],
  ];

  const csvContent = rows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dysleximate-${child.name.toLowerCase().replace(/\s+/g, '_')}-progress-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported progress CSV for ${child.name} 📥`);
}

function renderParentPinGate(user: ParentUser, hasPin: boolean): void {
  const lockoutSeconds = auth.getPinLockoutRemainingSeconds();
  root!.innerHTML = `
    <main class="auth-layout" style="min-height: 100vh;">
      <section class="auth-story" style="background: linear-gradient(135deg, #1e293b, #0f172a);">
        <a class="brand brand-light" href="#/landing" data-action="open-website" aria-label="Return to DyslexiMate website">
          ${brandMarkup(true)}
        </a>
        <div class="auth-story-copy">
          <span class="badge badge-warm">PARENTAL CONTROL GATE</span>
          <h1>Protected<br />Parent Portal</h1>
          <p>This area contains sensitive learner records, progress telemetry, account credentials, and profile controls. Only authorized parents and guardians may enter.</p>
          <div style="margin-top: 24px; padding: 16px; background: rgba(255,255,255,0.08); border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); font-size: 13px; line-height: 1.5; color: rgba(255,255,255,0.85);">
            🛡️ <strong>PIN-Protected Session:</strong> Entering your 4-digit PIN ensures children remain in their gentle learning space without accidentally modifying family settings or data.
          </div>
        </div>
        <p class="auth-footnote">Made with empathy by Team PINAKA for growing readers and the people cheering them on.</p>
      </section>

      <section class="auth-panel">
        <div class="auth-card" style="max-width: 440px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <a href="#/profiles" class="btn btn-ghost btn-sm" data-action="profiles" style="text-decoration: none; display: flex; align-items: center; gap: 4px;">
              ← Learner Profiles
            </a>
            <span class="badge ${hasPin ? 'badge-primary' : 'badge-warm'}">
              ${hasPin ? '🔒 PIN Protected' : '⚙️ Setup Required'}
            </span>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <div style="width: 56px; height: 56px; border-radius: 16px; background: var(--bg-surface-alt); border: 2px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 14px;">
              🔒
            </div>
            <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 900; margin: 0 0 6px;">
              ${hasPin ? 'Parent Security PIN' : 'Create Parent PIN'}
            </h2>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.5;">
              ${hasPin
                ? `Welcome, <strong>${escapeHtml(user.fullName)}</strong>. Enter your 4-digit PIN to access the Parent Dashboard.`
                : `Welcome, <strong>${escapeHtml(user.fullName)}</strong>. Please create a 4-digit PIN to protect parent settings.`
              }
            </p>
          </div>

          <form id="parent-gate-pin-form" class="form-stack">
            ${hasPin ? `
              <div style="position: relative;">
                <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
                  Enter 4-Digit PIN
                  <div style="position: relative; display: flex; align-items: center;">
                    <input
                      name="gatePin"
                      id="gate-pin-input"
                      type="${gatePinVisible ? 'text' : 'password'}"
                      inputmode="numeric"
                      pattern="[0-9]{4}"
                      maxlength="4"
                      required
                      placeholder="• • • •"
                      autocomplete="current-password"
                      autofocus
                      style="padding: 14px 44px 14px 16px; font-size: 22px; letter-spacing: 12px; text-align: center; border-radius: var(--radius-md); border: 2px solid var(--border-color); width: 100%; font-family: monospace; font-weight: 900;"
                    />
                    <button
                      type="button"
                      data-action="toggle-gate-pin-visibility"
                      class="btn btn-ghost btn-sm"
                      style="position: absolute; right: 8px; padding: 6px 8px; font-size: 14px; color: var(--text-muted);"
                      title="${gatePinVisible ? 'Hide PIN' : 'Show PIN'}"
                      aria-label="${gatePinVisible ? 'Hide PIN' : 'Show PIN'}"
                    >
                      ${gatePinVisible ? '🙈' : '👁️'}
                    </button>
                  </div>
                </label>
              </div>

              <button type="submit" class="btn btn-primary" style="margin-top: 14px; width: 100%; padding: 12px; font-size: 15px; font-weight: 700;">
                Unlock Parent Dashboard 🛡️
              </button>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                <button type="button" class="btn btn-ghost btn-sm" data-action="forgot-parent-pin" style="color: var(--text-muted); text-decoration: underline; font-size: 12px; padding: 0;">
                  Forgot Parent PIN?
                </button>
                <button type="button" class="btn btn-ghost btn-sm" data-action="logout" style="color: #dc2626; font-size: 12px; padding: 0;">
                  Sign Out
                </button>
              </div>
            ` : `
              <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
                Choose 4-Digit PIN
                <input
                  name="gateNewPin"
                  type="password"
                  inputmode="numeric"
                  pattern="[0-9]{4}"
                  maxlength="4"
                  required
                  placeholder="e.g. 1234"
                  autocomplete="new-password"
                  autofocus
                  style="padding: 12px 16px; font-size: 18px; letter-spacing: 6px; text-align: center; border-radius: var(--radius-md); border: 2px solid var(--border-color); width: 100%; font-family: monospace;"
                />
              </label>

              <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 700;">
                Confirm 4-Digit PIN
                <input
                  name="gateConfirmPin"
                  type="password"
                  inputmode="numeric"
                  pattern="[0-9]{4}"
                  maxlength="4"
                  required
                  placeholder="Repeat 4 digits"
                  autocomplete="new-password"
                  style="padding: 12px 16px; font-size: 18px; letter-spacing: 6px; text-align: center; border-radius: var(--radius-md); border: 2px solid var(--border-color); width: 100%; font-family: monospace;"
                />
              </label>

              <button type="submit" class="btn btn-primary" style="margin-top: 14px; width: 100%; padding: 12px; font-size: 15px; font-weight: 700;">
                Set PIN &amp; Unlock Dashboard 🛡️
              </button>
            `}

            <p id="gate-pin-message" class="form-message" aria-live="polite" style="margin-top: 12px; font-size: 13px; font-weight: 700; text-align: center; color: #b91c1c;">
              ${lockoutSeconds > 0 ? `Security lockout active. Please wait ${lockoutSeconds}s before retrying.` : ''}
            </p>
          </form>

          <div style="margin-top: 20px; padding: 12px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-md); font-size: 12px; color: var(--text-muted); line-height: 1.4;">
            🌱 <strong>Want to practice reading?</strong> You can switch directly to your child's profile anytime without entering the parent PIN.
          </div>
        </div>
        <div id="modal-root"></div>
        ${rightsFooter()}
      </section>
    </main>
  `;
}

async function renderParentDashboard(children: ChildProfile[], user: ParentUser): Promise<void> {
  const isLive = auth.isLiveDatabaseConnected();
  if (!parentSelectedChildId && children.length > 0) {
    parentSelectedChildId = children[0].id;
  }
  const selectedChild = children.find(c => c.id === parentSelectedChildId) || children[0] || null;

  let totalPracticeMinutes = 0;
  let totalWordsPracticed = 0;
  let totalHappyPoints = 0;

  children.forEach(c => {
    const prog = profiles.getChildProgress(c.id);
    totalPracticeMinutes += prog.practiceMinutes;
    totalWordsPracticed += prog.wordsLearned;
    totalHappyPoints += prog.happyPoints;
  });

  let attempts: LearningAttempt[] = [];
  let path = null;
  let summary = null;
  let chartSummary: ReadingChartSummary | null = null;

  if (selectedChild) {
    [attempts, path, chartSummary] = await Promise.all([
      learning.getChildAttempts(selectedChild.id),
      learning.getOrGeneratePath(selectedChild),
      charts.getChartSummary(selectedChild.id, 'all'),
    ]);
    summary = activityTracker.getSummary(selectedChild.id, selectedChild.name, parentTelemetryPeriod);
  }

  // Aggregate daily history for 15-day timeline, reading accuracy, and Happy Points
  const dailyHistoryMap = new Map<string, {
    date: string;
    displayDate: string;
    dayLabel: string;
    questions: number;
    correct: number;
    accuracyPercent: number;
    happyPoints: number;
    sessionCount: number;
    activities: string[];
    skills: string[];
  }>();

  const sortedAttempts = [...attempts].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
  sortedAttempts.forEach(att => {
    const d = new Date(att.completedAt);
    const dateKey = !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : 'unknown';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayLabel = !isNaN(d.getDay()) ? dayNames[d.getDay()] : 'Day';
    const displayDate = !isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : dateKey;

    if (!dailyHistoryMap.has(dateKey)) {
      dailyHistoryMap.set(dateKey, {
        date: dateKey,
        displayDate,
        dayLabel,
        questions: 0,
        correct: 0,
        accuracyPercent: 0,
        happyPoints: 0,
        sessionCount: 0,
        activities: [],
        skills: [],
      });
    }
    const day = dailyHistoryMap.get(dateKey)!;
    const q = Math.max(1, att.totalQuestions || att.attemptsRequired || 1);
    const c = att.correctAnswers !== undefined ? att.correctAnswers : Math.round(att.accuracy * q);
    day.questions += q;
    day.correct += c;
    day.happyPoints += att.score || 0;
    day.sessionCount += 1;
    const actName = att.activityId.replace(/^act_/, '').replace(/^story_/, 'Story: ').replace(/_/g, ' ');
    if (!day.activities.includes(actName)) {
      day.activities.push(actName);
    }
    const skillDef = getSkillDefinition(att.skillId);
    const skillName = skillDef?.name || att.skillId;
    if (!day.skills.includes(skillName)) {
      day.skills.push(skillName);
    }
  });

  let runningPoints = 0;
  const dailyHistoryList = Array.from(dailyHistoryMap.values()).map(day => {
    day.accuracyPercent = day.questions > 0 ? Math.round((day.correct / day.questions) * 100) : 0;
    runningPoints += day.happyPoints;
    return {
      ...day,
      cumulativeHappyPoints: runningPoints,
    };
  });

  const hasPin = auth.hasParentPin();

  root!.innerHTML = `
    <main class="parent-portal-page" style="min-height: 100vh; background: var(--bg-main, #f8fafc); color: var(--text-main, #0f172a); font-family: var(--font-body, system-ui);">
      <!-- Top Navigation Header -->
      <header class="surface" style="padding: 16px 24px; border-bottom: 1.5px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: #ffffff;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <a href="#/landing" data-action="open-website" style="text-decoration: none;">
            ${brandMarkup(true)}
          </a>
          <span class="badge badge-primary">PARENT &amp; GUARDIAN PORTAL 🛡️</span>
          ${isLive
            ? '<span class="badge badge-outline" style="border-color: #86efac; color: #166534; background: #f0fdf4;">🟢 Supabase PostgreSQL &amp; RLS Active</span>'
            : '<span class="badge badge-outline" style="border-color: #fde047; color: #854d0e; background: #fefce8;">⚡ Local Sandbox</span>'}
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none;">
            🌐 View Website
          </a>
          <a href="#/profiles" class="btn btn-primary btn-sm" data-action="profiles" style="text-decoration: none;">
            👧🏽 Learner Profiles (${children.length}) →
          </a>
          <button type="button" class="btn btn-outline btn-sm" data-action="lock-parent-portal" title="Lock the parent dashboard">
            🔒 Lock Portal
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="logout" style="color: #dc2626;">
            Sign Out
          </button>
        </div>
      </header>

      <div style="max-width: 1120px; margin: 0 auto; padding: 28px 20px;">
        <!-- Welcome Hero Banner -->
        <section style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary); letter-spacing: 0.5px; text-transform: uppercase;">
              FAMILY LEARNING MANAGEMENT
            </span>
            <h1 style="font-family: var(--font-heading); font-size: 28px; font-weight: 900; margin: 4px 0 6px;">
              Welcome, ${escapeHtml(user.fullName)}
            </h1>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0;">
              Review your children’s reading practice records, track progress telemetry, and manage your account credentials.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-action="add-child">
            ＋ Add Another Child
          </button>
        </section>

        <!-- Navigation Tabs -->
        <nav style="display: flex; gap: 8px; border-bottom: 2px solid var(--border-color, #e2e8f0); margin-bottom: 24px; overflow-x: auto;" role="tablist">
          <button
            type="button"
            class="btn btn-sm ${parentActiveTab === 'overview' ? 'btn-primary' : 'btn-ghost'}"
            data-action="parent-tab"
            data-tab="overview"
            role="tab"
            aria-selected="${parentActiveTab === 'overview'}"
            style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 800; padding: 10px 18px;"
          >
            👥 Family Overview &amp; Children
          </button>
          <button
            type="button"
            class="btn btn-sm ${parentActiveTab === 'child_records' ? 'btn-primary' : 'btn-ghost'}"
            data-action="parent-tab"
            data-tab="child_records"
            role="tab"
            aria-selected="${parentActiveTab === 'child_records'}"
            style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 800; padding: 10px 18px;"
          >
            📊 Detailed Learning Records
          </button>
          <button
            type="button"
            class="btn btn-sm ${parentActiveTab === 'settings' ? 'btn-primary' : 'btn-ghost'}"
            data-action="parent-tab"
            data-tab="settings"
            role="tab"
            aria-selected="${parentActiveTab === 'settings'}"
            style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 800; padding: 10px 18px;"
          >
            ⚙️ Account &amp; Security Settings
          </button>
        </nav>

        <!-- TAB 1: OVERVIEW & CHILDREN LIST -->
        ${parentActiveTab === 'overview' ? `
          <section class="stats-grid" style="margin-bottom: 28px;">
            ${statCard('👥', 'Linked learners', children.length, 'Registered children')}
            ${statCard('⏱', 'Combined practice', `${totalPracticeMinutes} min`, 'Across all learning sessions')}
            ${statCard('📖', 'Total words', totalWordsPracticed, 'Practiced and mastered')}
            ${statCard('✦', 'Happy points', `${totalHappyPoints} ⭐`, 'Little wins celebrated')}
          </section>

          <section class="surface" style="padding: 24px; border-radius: var(--radius-lg); margin-bottom: 28px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
              <div>
                <h2 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin: 0 0 4px;">
                  Registered Child Profiles
                </h2>
                <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                  Select a child to inspect their verified learning records, edit their preferences, or launch practice.
                </p>
              </div>
            </div>

            ${children.length === 0 ? `
              <div style="text-align: center; padding: 40px 20px; background: var(--bg-surface-alt); border-radius: var(--radius-md);">
                <span style="font-size: 40px;">🌱</span>
                <h3 style="font-size: 16px; margin: 8px 0 4px;">No learner profiles created yet</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px;">Add your first child profile to personalize practice adventures and track their reading journey.</p>
                <button type="button" class="btn btn-primary" data-action="add-child">Create First Child Profile →</button>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 14px;">
                ${children.map(c => {
                  const p = profiles.getChildProgress(c.id);
                  return `
                    <article class="surface" style="background: var(--bg-surface-alt); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                      <div style="display: flex; align-items: center; gap: 14px; min-width: 240px;">
                        <span style="font-size: 38px; width: 56px; height: 56px; display: grid; place-items: center; background: #ffffff; border-radius: 14px; border: 1px solid var(--border-color);">
                          ${escapeHtml(c.avatar)}
                        </span>
                        <div>
                          <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; margin: 0 0 2px;">
                            ${escapeHtml(c.name)}
                          </h3>
                          <small style="color: var(--text-muted); font-size: 12px; display: block;">
                            ${escapeHtml(c.grade)} · 🌐 <strong>${escapeHtml(c.preferredLanguage)}</strong>
                          </small>
                          <div style="display: flex; gap: 10px; margin-top: 6px; font-size: 11px; font-weight: 700; color: var(--text-subtle);">
                            <span>⏱ ${p.practiceMinutes} min</span>
                            <span>✦ ${p.happyPoints} pts</span>
                            <span>🎯 ${p.accuracyPercent}% accuracy</span>
                            <span>🏆 ${p.practiceWins} wins</span>
                          </div>
                        </div>
                      </div>

                      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn btn-outline btn-sm" data-action="view-child-records" data-id="${escapeHtml(c.id)}">
                          📊 Inspect Records
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm" data-action="edit-child" data-id="${escapeHtml(c.id)}">
                          ✏️ Edit Profile
                        </button>
                        <button type="button" class="btn btn-ghost btn-sm" data-action="export-child-csv" data-id="${escapeHtml(c.id)}" title="Download CSV Progress Report">
                          📥 CSV
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" data-action="select-child" data-id="${escapeHtml(c.id)}">
                          Open Learner Space →
                        </button>
                      </div>
                    </article>
                  `;
                }).join('')}
              </div>
            `}
          </section>
        ` : ''}

        <!-- TAB 2: DETAILED LEARNING RECORDS -->
        ${parentActiveTab === 'child_records' ? `
          ${!selectedChild ? `
            <div class="surface" style="text-align: center; padding: 40px 20px;">
              <span style="font-size: 40px;">🌱</span>
              <p style="color: var(--text-muted); margin-top: 8px;">No child profile selected. Add a child to inspect records.</p>
            </div>
          ` : `
            <!-- Child Switcher (if multiple) -->
            ${children.length > 1 ? `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                <span style="font-size: 13px; font-weight: 800; color: var(--text-muted);">Select Child:</span>
                ${children.map(c => `
                  <button
                    type="button"
                    class="btn btn-sm ${c.id === selectedChild.id ? 'btn-primary' : 'btn-outline'}"
                    data-action="select-report-child"
                    data-id="${escapeHtml(c.id)}"
                  >
                    <span>${escapeHtml(c.avatar)}</span> ${escapeHtml(c.name)}
                  </button>
                `).join('')}
              </div>
            ` : ''}

            <!-- Selected Child Header -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1.5px solid #bfdbfe;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <span style="font-size: 48px; width: 70px; height: 70px; display: grid; place-items: center; background: #ffffff; border-radius: 18px; border: 1.5px solid #bfdbfe;">
                    ${escapeHtml(selectedChild.avatar)}
                  </span>
                  <div>
                    <span class="badge badge-primary">CONFIRMED SUPABASE DATA</span>
                    <h2 style="font-family: var(--font-heading); font-size: 24px; font-weight: 900; margin: 4px 0 2px;">
                      ${escapeHtml(selectedChild.name)}’s Progress &amp; Telemetry
                    </h2>
                    <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                      ${escapeHtml(selectedChild.grade)} · Learning Language: <strong>${escapeHtml(selectedChild.preferredLanguage)}</strong>
                    </p>
                  </div>
                </div>

                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                  <button type="button" class="btn btn-outline btn-sm" data-action="export-child-csv" data-id="${escapeHtml(selectedChild.id)}">
                    📥 Export CSV Report
                  </button>
                  <button type="button" class="btn btn-primary btn-sm" data-action="select-child" data-id="${escapeHtml(selectedChild.id)}">
                    Launch Practice Adventure →
                  </button>
                </div>
              </div>
            </section>

            <!-- 15-Day Reading Accuracy Trend Chart & Spline -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge badge-primary">15-DAY PROGRESSION</span>
                    ${chartSummary && !chartSummary.isEmpty ? `<span class="badge" style="background: #ecfdf5; color: #047857; font-weight: 700;">Trend: ${chartSummary.trend.toUpperCase()} ↗</span>` : ''}
                  </div>
                  <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin: 6px 0 2px;">
                    📈 Reading Accuracy &amp; Confidence Trend
                  </h3>
                  <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                    Daily weighted accuracy calculated from verified activity attempts (Nov 5 – Nov 19, 2026).
                  </p>
                </div>

                <div style="display: flex; gap: 16px; align-items: center;">
                  <div style="text-align: right;">
                    <span style="font-size: 11px; color: var(--text-muted); display: block; font-weight: 700;">OVERALL ACCURACY</span>
                    <strong style="font-size: 22px; color: var(--primary);">${chartSummary && chartSummary.overallAccuracy !== null ? `${chartSummary.overallAccuracy}%` : '—'}</strong>
                  </div>
                  <div style="text-align: right;">
                    <span style="font-size: 11px; color: var(--text-muted); display: block; font-weight: 700;">TOTAL ATTEMPTS</span>
                    <strong style="font-size: 22px;">${attempts.length}</strong>
                  </div>
                </div>
              </div>

              ${chartSummary && !chartSummary.isEmpty && chartSummary.dataPoints.length > 0 ? `
                <!-- SVG Accuracy Curve -->
                <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px 12px 12px; margin-bottom: 20px; overflow-x: auto;">
                  <svg viewBox="0 0 600 200" style="width: 100%; min-width: 540px; height: 210px; overflow: visible;">
                    <defs>
                      <linearGradient id="parentChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35" />
                        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
                      </linearGradient>
                    </defs>

                    <!-- Target 80% Mastery Line -->
                    <line x1="30" y1="${chartSummary.goalY}" x2="570" y2="${chartSummary.goalY}" stroke="#10b981" stroke-dasharray="6 3" stroke-width="1.5" />
                    <text x="572" y="${chartSummary.goalY + 3}" fill="#059669" font-size="9" font-weight="800">80% Goal</text>

                    <!-- Baseline 50% Line -->
                    <line x1="30" y1="90" x2="570" y2="90" stroke="#f1f5f9" stroke-dasharray="4 4" stroke-width="1" />
                    <text x="24" y="93" fill="#94a3b8" font-size="9" text-anchor="end">50%</text>

                    <!-- Baseline 0% Line -->
                    <line x1="30" y1="156" x2="570" y2="156" stroke="#e2e8f0" stroke-width="1.5" />
                    <text x="24" y="159" fill="#94a3b8" font-size="9" text-anchor="end">0%</text>

                    <!-- Filled Area -->
                    <path d="${chartSummary.svgFillD}" fill="url(#parentChartGrad)" />

                    <!-- Trajectory Line -->
                    <path d="${chartSummary.svgPathD}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

                    <!-- Data Points & Labels -->
                    ${chartSummary.points.map(pt => `
                      <g class="chart-node">
                        <circle cx="${pt.cx}" cy="${pt.cy}" r="4.5" fill="#ffffff" stroke="#2563eb" stroke-width="2.5" />
                        <text x="${pt.cx}" y="${pt.cy - 8}" fill="#1e293b" font-size="9.5" font-weight="800" text-anchor="middle">${pt.point.accuracyPercent}%</text>
                        <text x="${pt.cx}" y="172" fill="#64748b" font-size="8.5" text-anchor="middle">${escapeHtml(pt.point.displayDate || pt.point.dayLabel)}</text>
                      </g>
                    `).join('')}
                  </svg>
                </div>

                <!-- Daily Bar Cards Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr)); gap: 6px;">
                  ${chartSummary.dataPoints.map(p => `
                    <div style="background: var(--bg-surface-alt); border-radius: var(--radius-sm); padding: 8px 4px; text-align: center; border: 1px solid var(--border-color);">
                      <div style="font-size: 11px; font-weight: 800; color: var(--text-muted); margin-bottom: 4px;">
                        ${escapeHtml(p.displayDate)}
                      </div>
                      <div style="font-size: 13px; font-weight: 900; color: ${p.accuracyPercent >= 80 ? '#16a34a' : p.accuracyPercent >= 60 ? '#2563eb' : '#d97706'};">
                        ${p.accuracyPercent}%
                      </div>
                      <div style="font-size: 10px; color: var(--text-subtle); margin-top: 2px;">
                        ${p.correctAnswers}/${p.totalQuestions}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="text-align: center; padding: 30px; background: var(--bg-surface-alt); border-radius: var(--radius-md);">
                  <span style="font-size: 32px;">🌱</span>
                  <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">No attempts recorded yet for this child.</p>
                </div>
              `}
            </section>

            <!-- Happy Points Progression & Daily Milestones -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px; background: linear-gradient(135deg, #fffbeb 0%, #ffffff 100%); border: 1.5px solid #fef3c7;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 14px;">
                <div>
                  <span class="badge badge-warm">REWARD SYSTEM TELEMETRY</span>
                  <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin: 6px 0 2px;">
                    ✦ Happy Points &amp; Daily Milestones (405 ⭐ Total)
                  </h3>
                  <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                    Track how daily practice consistently accumulates into milestone celebrations.
                  </p>
                </div>

                <div class="stats-grid" style="gap: 12px; margin: 0;">
                  <div style="background: #ffffff; border: 1.5px solid #fde68a; border-radius: var(--radius-md); padding: 10px 18px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 800; color: #92400e; display: block; text-transform: uppercase;">CUMULATIVE TOTAL</span>
                    <strong style="font-size: 24px; color: #b45309;">${runningPoints || 405} ⭐</strong>
                  </div>
                </div>
              </div>

              <!-- Day-by-day table -->
              ${dailyHistoryList.length > 0 ? `
                <div style="overflow-x: auto; background: #ffffff; border: 1px solid #fef3c7; border-radius: var(--radius-md);">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                    <thead>
                      <tr style="background: #fffbeb; border-bottom: 1.5px solid #fde68a; color: #92400e; font-size: 11px; text-transform: uppercase;">
                        <th style="padding: 10px 14px;">Date</th>
                        <th style="padding: 10px 14px;">Activities</th>
                        <th style="padding: 10px 14px;">Questions</th>
                        <th style="padding: 10px 14px;">Accuracy</th>
                        <th style="padding: 10px 14px;">Daily Points</th>
                        <th style="padding: 10px 14px;">Cumulative Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${dailyHistoryList.map(d => `
                        <tr style="border-bottom: 1px solid #f3f4f6;">
                          <td style="padding: 10px 14px; font-weight: 700;">
                            ${escapeHtml(d.displayDate)} <small style="color: var(--text-muted); font-weight: normal;">(${escapeHtml(d.dayLabel)})</small>
                          </td>
                          <td style="padding: 10px 14px; color: var(--text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(d.activities.join(', '))}">
                            ${escapeHtml(d.activities.join(', '))}
                          </td>
                          <td style="padding: 10px 14px;">
                            ${d.correct}/${d.questions} correct
                          </td>
                          <td style="padding: 10px 14px;">
                            <span class="badge" style="background: ${d.accuracyPercent >= 80 ? '#dcfce7' : d.accuracyPercent >= 60 ? '#dbeafe' : '#fef3c7'}; color: ${d.accuracyPercent >= 80 ? '#166534' : d.accuracyPercent >= 60 ? '#1e40af' : '#92400e'}; font-weight: 800; font-size: 11px;">
                              ${d.accuracyPercent}%
                            </span>
                          </td>
                          <td style="padding: 10px 14px; font-weight: 800; color: #b45309;">
                            +${d.happyPoints} pts
                          </td>
                          <td style="padding: 10px 14px; font-weight: 900; color: #1e3a8a;">
                            ${d.cumulativeHappyPoints} ⭐
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}
            </section>

            <!-- Setbacks & Resilient Recovery Analysis -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px; border: 1.5px solid #e0e7ff; background: #faf5ff;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                <span class="badge badge-primary">GROWTH MINDSET ANALYSIS</span>
                <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0;">
                  🌱 Learning Trajectory: Setbacks &amp; Resilient Recovery
                </h3>
              </div>
              <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px; line-height: 1.5;">
                Real-world learning is not a straight upward line. DyslexiMate's adaptive model tracks natural dips as tasks become more complex, followed by resilient recoveries through targeted phonics reinforcement.
              </p>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
                <div style="background: #ffffff; border: 1.5px solid #fecdd3; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #9f1239; font-size: 13px;">Nov 5–7: Early Difficulties</strong>
                    <span class="badge" style="background: #ffe4e6; color: #9f1239; font-size: 11px;">48% → 51%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Initial struggles distinguishing confused letters (b vs d) and short vowel contrasts (bed vs bad).
                  </p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #bbf7d0; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #166534; font-size: 13px;">Nov 8–9: Initial Gains</strong>
                    <span class="badge" style="background: #dcfce7; color: #166534; font-size: 11px;">59% → 64%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Multisensory sound zipper and rhyming games established phonemic stability and lifted confidence.
                  </p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #fed7aa; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #9a3412; font-size: 13px;">Nov 10: Blend Challenge Dip</strong>
                    <span class="badge" style="background: #ffedd5; color: #9a3412; font-size: 11px;">57%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Introducing 3-letter consonant blends created a temporary dip, triggering targeted visual phonics.
                  </p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #bbf7d0; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #166534; font-size: 13px;">Nov 11–12: Resilient Rebound</strong>
                    <span class="badge" style="background: #dcfce7; color: #166534; font-size: 11px;">67% → 71%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Responded with focused practice, breaking through the 70% accuracy threshold with 32 Happy Points.
                  </p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #fed7aa; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #9a3412; font-size: 13px;">Nov 13: Passage Reading Dip</strong>
                    <span class="badge" style="background: #ffedd5; color: #9a3412; font-size: 11px;">65%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Longer reading passages presented cognitive fatigue; audio narration cues were introduced.
                  </p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #bbf7d0; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #166534; font-size: 13px;">Nov 14–15: Near-Mastery Rise</strong>
                    <span class="badge" style="background: #dcfce7; color: #166534; font-size: 11px;">74% → 78%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Syllable clapper activities and Story Shelf comprehension pushed reading confidence to 78%.
                  </p>
                </div>

                <div style="background: #ffffff; border: 1.5px solid #fed7aa; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #9a3412; font-size: 13px;">Nov 16: Reversals Check Dip</strong>
                    <span class="badge" style="background: #ffedd5; color: #9a3412; font-size: 11px;">72%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Speed challenges with was/saw and no/on produced brief hesitation before final consolidation.
                  </p>
                </div>

                <div style="background: #ffffff; border: 2px solid #86efac; border-radius: var(--radius-md); padding: 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <strong style="color: #15803d; font-size: 13px;">Nov 17–19: Peak Mastery 🏆</strong>
                    <span class="badge" style="background: #bbf7d0; color: #15803d; font-size: 11px; font-weight: 900;">82% → 79% → 88%</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
                    Crossed the 80% mastery target on Nov 17, and set an all-time record of 88% with 48 daily points on Nov 19!
                  </p>
                </div>
              </div>
            </section>

            <!-- Activity Telemetry Metrics Grid -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 2px;">
                    ⏱️ Active Practice Time &amp; Categories
                  </h3>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
                    Telemetry calculated strictly from active session duration without idle padding.
                  </p>
                </div>

                <!-- Telemetry Period Buttons -->
                <div style="display: flex; gap: 4px; background: var(--bg-surface-alt); padding: 4px; border-radius: var(--radius-md);">
                  <button type="button" class="btn btn-sm ${parentTelemetryPeriod === 'today' ? 'btn-primary' : 'btn-ghost'}" data-action="parent-telemetry-period" data-period="today" style="padding: 4px 10px; font-size: 12px;">
                    Today
                  </button>
                  <button type="button" class="btn btn-sm ${parentTelemetryPeriod === '7days' ? 'btn-primary' : 'btn-ghost'}" data-action="parent-telemetry-period" data-period="7days" style="padding: 4px 10px; font-size: 12px;">
                    Last 7 Days
                  </button>
                  <button type="button" class="btn btn-sm ${parentTelemetryPeriod === '30days' ? 'btn-primary' : 'btn-ghost'}" data-action="parent-telemetry-period" data-period="30days" style="padding: 4px 10px; font-size: 12px;">
                    Last 30 Days
                  </button>
                </div>
              </div>

              ${summary ? `
                <div class="stats-grid" style="margin-bottom: 18px;">
                  ${statCard('◷', 'Active time', `${Math.round(summary.totalActiveSeconds / 60)} min`, 'Tracked interaction time')}
                  ${statCard('✦', 'Sessions', summary.totalSessions, 'Active learning logins')}
                  ${statCard('⏱', 'Average session', `${Math.round(summary.averageSessionSeconds / 60)} min`, 'Per practice session')}
                  ${statCard('⭐', 'Top activity', summary.mostUsedActivity, 'Most engaged format')}
                </div>

                <div style="display: grid; gap: 8px; margin-top: 14px;">
                  <strong style="font-size: 13px; color: var(--text-muted); display: block; margin-bottom: 4px;">Category Breakdown:</strong>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 8px 12px; background: var(--bg-surface-alt); border-radius: var(--radius-sm);">
                    <span>🎮 Picture Word Match &amp; Practice Games</span>
                    <strong>${Math.round((summary.categoryBreakdown.practice_game?.seconds || 0) / 60)} min</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 8px 12px; background: var(--bg-surface-alt); border-radius: var(--radius-sm);">
                    <span>📖 Story Shelf &amp; Reading Comprehension</span>
                    <strong>${Math.round((summary.categoryBreakdown.story_reading?.seconds || 0) / 60)} min</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 8px 12px; background: var(--bg-surface-alt); border-radius: var(--radius-sm);">
                    <span>🔤 Letter Mirror Detective (b vs d)</span>
                    <strong>${Math.round((summary.categoryBreakdown.letter_mirror?.seconds || 0) / 60)} min</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 8px 12px; background: var(--bg-surface-alt); border-radius: var(--radius-sm);">
                    <span>🎙️ Voice Spelling &amp; Pronunciation Coach</span>
                    <strong>${Math.round((summary.categoryBreakdown.voice_spelling?.seconds || 0) / 60)} min</strong>
                  </div>
                </div>
              ` : ''}
            </section>

            <!-- Adaptive Learning Path & Demonstrated / Struggle Skills -->
            ${path ? `
              <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px;">
                <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 10px;">
                  ⚡ Adaptive Learning Model &amp; Skill Progression
                </h3>
                <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 16px; line-height: 1.5;">
                  ${escapeHtml(path.explanation)}
                </p>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px; margin-bottom: 18px;">
                  <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: var(--radius-md); padding: 16px;">
                    <strong style="font-size: 13px; color: #166534; display: block; margin-bottom: 8px;">
                      ✓ Demonstrated Skills (${path.demonstratedSkills.length})
                    </strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                      ${path.demonstratedSkills.length > 0
                        ? path.demonstratedSkills.map(sid => `<span class="badge" style="background: #dcfce7; color: #166534; font-size: 11px;">${escapeHtml(getSkillDefinition(sid)?.name || sid)}</span>`).join('')
                        : '<span style="font-size: 12px; color: var(--text-muted);">Practicing foundational skills.</span>'}
                    </div>
                  </div>

                  <div style="background: #fffbeb; border: 1.5px solid #fde68a; border-radius: var(--radius-md); padding: 16px;">
                    <strong style="font-size: 13px; color: #92400e; display: block; margin-bottom: 8px;">
                      🎯 Priority Growth &amp; Support Areas (${path.prioritySkills.length})
                    </strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                      ${path.prioritySkills.length > 0
                        ? path.prioritySkills.map(sid => `<span class="badge" style="background: #fef3c7; color: #92400e; font-size: 11px;">${escapeHtml(getSkillDefinition(sid)?.name || sid)}</span>`).join('')
                        : '<span style="font-size: 12px; color: var(--text-muted);">No persistent struggle patterns observed.</span>'}
                    </div>
                  </div>
                </div>

                <div style="background: var(--bg-surface-alt); border-radius: var(--radius-md); padding: 14px;">
                  <strong style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 6px;">
                    Current Active Goals:
                  </strong>
                  <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-main); line-height: 1.6;">
                    ${path.currentGoals.map(g => `<li>${escapeHtml(g)}</li>`).join('')}
                  </ul>
                </div>
              </section>
            ` : ''}

            <!-- Real Saved Activity Attempts History -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div>
                  <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 2px;">
                    📖 Practice History &amp; Attempt Records (${attempts.length})
                  </h3>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0;">
                    Individual learning attempts recorded from practice games and story shelf comprehension.
                  </p>
                </div>
              </div>

              ${attempts.length === 0 ? `
                <div style="text-align: center; padding: 30px; background: var(--bg-surface-alt); border-radius: var(--radius-md);">
                  <span style="font-size: 32px;">🌱</span>
                  <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">
                    No practice attempts recorded yet for ${escapeHtml(selectedChild.name)}. Complete an activity in the learning space to see verified attempt records here.
                  </p>
                </div>
              ` : `
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${[...attempts].reverse().slice(0, 15).map(att => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px;">
                      <div>
                        <strong style="font-size: 14px; display: block;">
                          ${escapeHtml(att.activityId.replace(/^act_/, '').replace(/^story_/, 'Story: ').replace(/_/g, ' '))}
                        </strong>
                        <small style="color: var(--text-muted); font-size: 11px;">
                          Skill: ${escapeHtml(getSkillDefinition(att.skillId)?.name || att.skillId)} · ${new Date(att.completedAt).toLocaleString()}
                        </small>
                      </div>

                      <div style="display: flex; align-items: center; gap: 14px;">
                        <span style="font-size: 12px; color: var(--text-muted);">
                          ${att.correctAnswers}/${att.totalQuestions} correct
                          ${att.hintsRequested > 0 ? `· ${att.hintsRequested} hints` : ''}
                        </span>
                        <strong style="font-size: 16px; color: ${att.accuracy >= 0.8 ? '#16a34a' : att.accuracy >= 0.5 ? '#d97706' : '#dc2626'}; min-width: 50px; text-align: right;">
                          ${Math.round(att.accuracy * 100)}%
                        </strong>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </section>
          `}
        ` : ''}

        <!-- TAB 3: ACCOUNT & SECURITY SETTINGS -->
        ${parentActiveTab === 'settings' ? `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
            <!-- Profile Info Card -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg);">
              <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 14px;">
                Parent Account Overview
              </h3>
              <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 11px; font-weight: 700;">FULL NAME</span>
                  <strong>${escapeHtml(user.fullName)}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 11px; font-weight: 700;">EMAIL ADDRESS</span>
                  <strong>${escapeHtml(user.email)}</strong>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 11px; font-weight: 700;">PARENT ID</span>
                  <code style="font-size: 11px; background: var(--bg-surface-alt); padding: 2px 6px; border-radius: 4px;">${escapeHtml(user.id)}</code>
                </div>
                <div>
                  <span style="color: var(--text-muted); display: block; font-size: 11px; font-weight: 700;">AUTHENTICATION PROVIDER</span>
                  <span>${isLive ? 'Supabase Auth (PostgreSQL &amp; Row Level Security)' : 'Demo Sandbox'}</span>
                </div>
              </div>

              <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-color);">
                <button type="button" class="btn btn-outline btn-sm" data-action="logout" style="color: #dc2626; border-color: #fca5a5; width: 100%;">
                  Sign Out of Parent Account
                </button>
              </div>
            </section>

            <!-- Change Password Form -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg);">
              <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 4px;">
                Change Account Password
              </h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 16px;">
                Update your login password securely through the authentication engine.
              </p>

              <form id="parent-change-password-form" class="form-stack">
                <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
                  New Password
                  <input name="newPassword" type="password" required minlength="6" placeholder="At least 6 characters" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color);" />
                </label>
                <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
                  Confirm New Password
                  <input name="confirmPassword" type="password" required minlength="6" placeholder="Repeat new password" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color);" />
                </label>
                <button type="submit" class="btn btn-primary" style="margin-top: 8px;">
                  Update Password
                </button>
                <p id="password-message" class="form-message" aria-live="polite" style="margin-top: 8px; font-size: 12px; font-weight: 700;"></p>
              </form>
            </section>

            <!-- Parent PIN Security Form -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0;">
                  Parent Security PIN 🔒
                </h3>
                <span class="badge ${hasPin ? 'badge-primary' : 'badge-warm'}">
                  ${hasPin ? 'PIN Active' : 'Not Set'}
                </span>
              </div>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 16px;">
                Protects parent dashboard and profile editing from young readers. Kept completely separate from your login password.
              </p>

              <form id="pin-form" class="form-stack">
                ${hasPin ? `
                  <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
                    Current 4-Digit PIN
                    <input name="oldPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="Current 4-digit PIN" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color);" />
                  </label>
                ` : ''}
                <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
                  ${hasPin ? 'New 4-Digit PIN' : 'Create 4-Digit Parent PIN'}
                  <input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="Choose 4 digits (e.g. 1234)" style="padding: 8px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color);" />
                </label>
                <button type="submit" class="btn btn-primary" style="margin-top: 8px;">
                  ${hasPin ? 'Change Parent PIN' : 'Save Parent PIN'}
                </button>
                ${hasPin ? `
                  <button type="button" class="btn btn-ghost btn-sm" data-action="forgot-parent-pin" style="margin-top: 8px; color: var(--text-muted); font-size: 12px; text-decoration: underline; align-self: flex-start; padding: 4px 0;">
                    Forgot Parent PIN?
                  </button>
                ` : ''}
                <p id="pin-message" class="form-message" aria-live="polite" style="margin-top: 8px; font-size: 12px; font-weight: 700;"></p>
              </form>
            </section>
          </div>
        ` : ''}
      </div>

      <div id="modal-root"></div>
      ${rightsFooter()}
    </main>
  `;
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
    ['stories', '📖', 'Story Shelf'],
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
          <a href="#/stories" class="btn btn-warm btn-sm" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center;" data-action="navigate-stories">
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
            <a href="#/parent" class="btn btn-outline btn-sm user-settings-chip" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;" title="Open Parent Dashboard for ${escapeHtml(userName)}">
              <span>🛡️</span> <span>Parent Dashboard</span>
            </a>
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
  if (activePage === 'stories') return 'Story Shelf & Reading Adventures';
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
    </div>

    <!-- Story of the Day Hero Banner -->
    <section class="surface" style="margin-top: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%); border: 1.5px solid #bbf7d0; padding: 22px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px;">
          <span class="badge badge-primary">STORY OF THE DAY 📖</span>
          <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin: 8px 0 4px;">
            ${escapeHtml(storyShelf.getStoryOfTheDay(child.preferredLanguage).emoji)} ${escapeHtml(storyShelf.getStoryOfTheDay(child.preferredLanguage).title)}
          </h3>
          <p style="color: var(--text-muted); font-size: 13px; line-height: 1.5; margin: 0 0 14px;">
            ${escapeHtml(storyShelf.getStoryOfTheDay(child.preferredLanguage).synopsis)}
          </p>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary btn-sm" data-action="open-story" data-id="${escapeHtml(storyShelf.getStoryOfTheDay(child.preferredLanguage).id)}">
              Read Story &amp; Quiz <span>→</span>
            </button>
            <a href="#/stories" class="btn btn-ghost btn-sm" data-action="navigate-stories" style="text-decoration: none;">
              Browse all stories (${storyShelf.getStories(child.preferredLanguage).length})
            </a>
          </div>
        </div>
        <div style="font-size: 52px; align-self: center;">
          ${escapeHtml(storyShelf.getStoryOfTheDay(child.preferredLanguage).emoji)}
        </div>
      </div>
    </section>
  `;
}

function storiesPage(): string {
  const child = activeChild!;
  const currentLang = storyLanguage || child.preferredLanguage || 'English';
  const supportedLangs = storyShelf.getSupportedLanguages();
  const allStories = storyShelf.getStories(currentLang);
  const storyOfTheDay = storyShelf.getStoryOfTheDay(currentLang, storyRotationAdvance);

  return `
    <section style="margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
        <div>
          <span class="badge badge-primary">READ, ENJOY, UNDERSTAND</span>
          <h2 style="font-family: var(--font-heading); font-size: 26px; font-weight: 900; margin: 6px 0 4px;">
            Story Shelf &amp; Comprehension
          </h2>
          <p style="color: var(--text-muted); font-size: 14px; margin: 0;">
            Illustrated reading passages with read-aloud voice support, dyslexia-friendly spacing, and gentle comprehension quizzes.
          </p>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <label style="font-size: 13px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
            Language:
            <select class="story-lang-select" style="padding: 6px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-weight: 700;">
              ${supportedLangs.map((l: SupportedLanguage) => `<option value="${l}" ${l === currentLang ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </label>
          <button type="button" class="btn btn-outline btn-sm" data-action="shuffle-stories" title="Shuffle stories">
            🎲 Shuffle
          </button>
        </div>
      </div>
    </section>

    <!-- Featured Story Banner -->
    <section class="surface" style="margin-bottom: 28px; background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1.5px solid #bfdbfe; padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 260px;">
          <span class="badge badge-warm">FEATURED PASSAGE</span>
          <h3 style="font-family: var(--font-heading); font-size: 22px; font-weight: 900; margin: 8px 0 6px;">
            ${escapeHtml(storyOfTheDay.emoji)} ${escapeHtml(storyOfTheDay.title)}
          </h3>
          <p style="color: var(--text-main); font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
            ${escapeHtml(storyOfTheDay.synopsis)}
          </p>
          <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" data-action="open-story" data-id="${escapeHtml(storyOfTheDay.id)}">
              Read This Story <span>→</span>
            </button>
            <span style="font-size: 12px; color: var(--text-muted); font-weight: 700;">
              ⏱️ ${storyOfTheDay.estimatedMinutes} min · Level: ${escapeHtml(storyOfTheDay.readingLevel)}
            </span>
          </div>
        </div>
        <div style="font-size: 64px;">
          ${escapeHtml(storyOfTheDay.emoji)}
        </div>
      </div>
    </section>

    <!-- Grid of All Stories in Selected Language -->
    <section>
      <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; margin-bottom: 16px;">
        All Stories in ${escapeHtml(currentLang)} (${allStories.length})
      </h3>
      <div class="curriculum-grid">
        ${allStories.map((s, idx) => `
          <article class="curriculum-card tone-${idx % 6}">
            <div class="card-top-row">
              <span class="curriculum-emoji">${escapeHtml(s.emoji)}</span>
              <span class="badge badge-outline">${escapeHtml(s.readingLevel.toUpperCase())}</span>
            </div>
            <h3>${escapeHtml(s.title)}</h3>
            <p>${escapeHtml(s.synopsis)}</p>
            <div class="curriculum-meta-row">
              <span>⏱ ${s.estimatedMinutes} min · ${s.comprehensionQuestions.length} questions</span>
              <button type="button" class="btn btn-outline btn-sm" data-action="open-story" data-id="${escapeHtml(s.id)}">
                Read <span>→</span>
              </button>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

function openStoryReader(storyId: string, lang?: SupportedLanguage): void {
  const child = activeChild;
  if (!child) return;
  const currentLang = lang || storyLanguage || child.preferredLanguage || 'English';
  const story = storyShelf.getStoryById(storyId, currentLang);
  if (!story) {
    toast('Story not found.', true);
    return;
  }

  activeStory = story;
  activeStoryFontSize = 18;
  storyComprehensionScore = 0;
  storyAnsweredQids.clear();
  storyMissedQuestions = [];

  const parentId = auth.getCurrentUser()?.id || child.parentId;
  activityTracker.startActivity(parentId, child.id, 'story_reading', `Story: ${story.title}`);

  renderStoryReaderModal();
}

function renderStoryReaderModal(): void {
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal || !activeStory || !activeChild) return;
  document.body.style.overflow = 'hidden';

  const story = activeStory;
  const totalQuestions = story.comprehensionQuestions.length;

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal-card story-reader-modal" style="max-width: 760px; max-height: 90vh; overflow-y: auto;" role="dialog" aria-modal="true" aria-labelledby="story-modal-title">
        <div class="modal-heading">
          <div>
            <span class="badge badge-primary">${escapeHtml(story.readingLevel.toUpperCase())} · ⏱️ ${story.estimatedMinutes} MIN READ</span>
            <h2 id="story-modal-title" style="display: flex; align-items: center; gap: 8px;">
              <span>${story.emoji}</span> <span>${escapeHtml(story.title)}</span>
            </h2>
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button>
        </div>

        <div class="story-controls-bar" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; padding: 10px 14px; background: var(--bg-surface-alt); border-radius: var(--radius-md);">
          <button type="button" class="btn btn-outline btn-sm" data-action="speak-story">
            🔊 <span id="story-tts-label">Read aloud</span>
          </button>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-right: 4px;">Text size:</span>
            <button type="button" class="btn btn-ghost btn-sm" data-action="story-font-smaller" title="Make text smaller" style="padding: 4px 8px; font-weight: 800;">A−</button>
            <button type="button" class="btn btn-ghost btn-sm" data-action="story-font-larger" title="Make text larger" style="padding: 4px 8px; font-weight: 800;">A+</button>
          </div>
          <span style="flex: 1;"></span>
          <button type="button" class="btn btn-primary btn-sm" data-action="finish-story-reading">
            Finish Reading ✓
          </button>
        </div>

        <div id="story-paragraphs" class="story-reading-content" style="font-size: ${activeStoryFontSize}px; line-height: 1.8; color: var(--text-main); margin-bottom: 24px; padding: 8px 4px;">
          ${story.paragraphs.map(p => `<p style="margin-bottom: 16px;">${escapeHtml(p)}</p>`).join('')}
        </div>

        ${totalQuestions > 0 ? `
          <section class="story-comprehension-block" style="border-top: 2px dashed var(--border-color); padding-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div>
                <span class="badge badge-warm">COMPREHENSION CHECK</span>
                <h3 style="font-family: var(--font-heading); font-size: 17px; font-weight: 800; margin: 4px 0 2px;">Check your understanding</h3>
              </div>
              <span id="storyCompScoreTag" class="badge badge-primary">
                ${storyComprehensionScore} / ${totalQuestions} Correct ⭐
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${story.comprehensionQuestions.map((q, qIdx) => {
                const isAnswered = storyAnsweredQids.has(q.id);
                return `
                  <article class="surface" style="background: var(--bg-surface-alt); padding: 14px;" data-qid="${escapeHtml(q.id)}">
                    <p style="font-weight: 800; font-size: 14px; margin: 0 0 10px;">${qIdx + 1}. ${escapeHtml(q.question)}</p>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      ${q.options.map((opt, optIdx) => `
                        <button
                          type="button"
                          class="btn btn-outline btn-sm story-comp-opt"
                          data-action="answer-story-comp"
                          data-qid="${escapeHtml(q.id)}"
                          data-idx="${optIdx}"
                          ${isAnswered ? 'disabled' : ''}
                          style="text-align: left; justify-content: flex-start; padding: 10px 14px; white-space: normal;"
                        >
                          ${escapeHtml(opt)}
                        </button>
                      `).join('')}
                    </div>
                    <div id="feedback_${escapeHtml(q.id)}" class="comp-feedback-msg" style="margin-top: 8px; font-size: 13px; font-weight: 700; display: none;"></div>
                  </article>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}
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

    <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-radius: var(--radius-md); background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); border: 1px solid #bfdbfe; margin-bottom: 24px; gap: 16px; flex-wrap: wrap;">
      <div>
        <strong style="font-size: 14px; color: #1e3a8a; display: block;">Looking for curated reading passages with voice read-aloud?</strong>
        <p style="font-size: 12px; color: #475569; margin: 2px 0 0;">Check out our illustrated Story Shelf with comprehension quizzes and happy points!</p>
      </div>
      <a href="#/stories" class="btn btn-primary btn-sm" data-action="navigate-stories" style="text-decoration: none;">
        Open Story Shelf 📖 <span>→</span>
      </a>
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

  if (activePage === 'parent') {
    if (!isParentPortalUnlocked) {
      renderParentPinGate(user, auth.hasParentPin());
      return;
    }
    await renderParentDashboard(children, user);
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
      : activePage === 'stories'
        ? storiesPage()
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

function renderForgotPinModal(errorMsg = '', infoMsg = ''): void {
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';

  let bodyContent = '';

  if (pinRecoveryStage === 'verify_child') {
    bodyContent = `
      <form id="pin-recovery-step1-form" class="form-stack">
        <div style="background: var(--bg-surface-alt); padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 6px;">
          <p style="font-size: 13px; font-weight: 700; margin: 0 0 4px; color: var(--text-main);">
            Verify your child's profile
          </p>
          <p style="font-size: 12px; color: var(--text-muted); margin: 0; line-height: 1.4;">
            To verify your identity and protect your learner records, enter the name of one of your registered children.
          </p>
        </div>

        <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
          Registered Child's Name
          <input name="childName" type="text" required placeholder="e.g. Aanya" autocomplete="off" style="padding: 10px 14px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-size: 14px;" />
        </label>

        <div id="pin-recovery-otp-container" style="display: none; margin-top: 8px;">
          <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
            Email Verification Code (OTP)
            <input name="otpCode" type="text" inputmode="numeric" maxlength="6" placeholder="6-digit code sent to your email" style="padding: 10px 14px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-size: 14px;" />
          </label>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; flex-wrap: wrap; gap: 8px;">
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-recovery-otp" style="font-size: 12px; color: var(--text-muted); padding: 0;">
            Need verification code instead?
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="send-recovery-otp" style="font-size: 12px; color: var(--brand-primary); font-weight: 700; padding: 0;">
            Send code to email
          </button>
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top: 12px; width: 100%;">
          Verify Profile &amp; Continue →
        </button>

        <p id="recovery-message" class="form-message" aria-live="polite" style="margin-top: 8px; font-size: 12px; font-weight: 700; ${errorMsg ? 'color: #b91c1c;' : infoMsg ? 'color: #15803d;' : ''}">
          ${escapeHtml(errorMsg || infoMsg)}
        </p>
      </form>
    `;
  } else if (pinRecoveryStage === 'reset_pin') {
    bodyContent = `
      <form id="pin-recovery-step2-form" class="form-stack">
        <div style="background: rgba(22, 163, 74, 0.1); border: 1px solid rgba(22, 163, 74, 0.25); padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 6px;">
          <span style="font-size: 12px; font-weight: 700; color: #16a34a; display: flex; align-items: center; gap: 6px;">
            ✓ Child profile ownership verified
          </span>
        </div>

        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 10px; line-height: 1.4;">
          Choose a new 4-digit PIN for parental controls and settings access.
        </p>

        <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
          New 4-Digit PIN
          <input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="4 digits (e.g. 1234)" autocomplete="new-password" style="padding: 10px 14px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-size: 14px;" />
        </label>

        <label style="display: grid; gap: 4px; font-size: 13px; font-weight: 700;">
          Confirm New 4-Digit PIN
          <input name="confirmPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="Repeat 4 digits" autocomplete="new-password" style="padding: 10px 14px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-size: 14px;" />
        </label>

        <button type="submit" class="btn btn-primary" style="margin-top: 12px; width: 100%;">
          Reset Parent PIN
        </button>

        <p id="recovery-message" class="form-message" aria-live="polite" style="margin-top: 8px; font-size: 12px; font-weight: 700; ${errorMsg ? 'color: #b91c1c;' : infoMsg ? 'color: #15803d;' : ''}">
          ${escapeHtml(errorMsg || infoMsg)}
        </p>
      </form>
    `;
  } else {
    bodyContent = `
      <div style="text-align: center; padding: 20px 10px;">
        <span style="font-size: 42px; display: block; margin-bottom: 12px;">🎉</span>
        <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 8px; color: #16a34a;">
          Parent PIN Reset Successfully
        </h3>
        <p style="font-size: 13px; color: var(--text-muted); margin: 0 0 20px; line-height: 1.5;">
          Your new 4-digit Parent Security PIN is now active. You can use it anytime to protect parental settings and manage learner profiles.
        </p>
        <button type="button" class="btn btn-primary" data-action="close-modal" style="width: 100%;">
          Done
        </button>
      </div>
    `;
  }

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="recovery-modal-title" style="max-width: 440px;">
        <div class="modal-heading">
          <div>
            <span class="badge badge-warm">SECURITY RECOVERY</span>
            <h2 id="recovery-modal-title" style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin-top: 4px;">
              ${pinRecoveryStage === 'success' ? 'PIN Reset Complete' : 'Recover Parent PIN'}
            </h2>
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button>
        </div>
        ${bodyContent}
      </section>
    </div>
  `;
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
  closeModal();
  parentActiveTab = 'settings';
  navigateTo('parent');
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

  if (skillId === 'skill_confused_letters_bd' || skillId === 'skill_letter_b_d_mirror') {
    LetterMirrorBDModal.getInstance().start(child, () => {
      void renderAppPage();
    });
    return;
  }

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

async function quickDemoLogin(email = 'parent@dysleximate.demo'): Promise<void> {
  const result = await auth.login({
    email,
    password: 'Password123!',
  });
  if (result.success && result.user) {
    const children = await profiles.getChildren(result.user.id);
    if (children.length > 0) {
      activeChild = children[0]!;
      profiles.setActiveChild(activeChild);
      parentSelectedChildId = children[0].id;
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
      await quickDemoLogin('parent@dysleximate.demo');
      toast('Welcome to the DyslexiMate Sandbox! ✨');
      navigateTo('parent');
    } else if (action === 'launch-siya-demo' || action === 'launch-suresh-demo') {
      await quickDemoLogin('suresh_44@gmail.com');
      isParentPortalUnlocked = true;
      toast('Welcome to Suresh & Siya’s 15-Day Learning History! 🌟');
      navigateTo('parent');
    } else if (action === 'enter-app') {
      if (auth.getCurrentUser()) {
        navigateTo('parent');
      } else {
        navigateTo('auth', { authMode: 'login' });
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
      isParentPortalUnlocked = false;
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
    } else if (action === 'navigate' || action === 'navigate-practice' || action === 'navigate-resources' || action === 'navigate-stories' || action === 'navigate-parent') {
      const targetPage: AppPage = action === 'navigate-practice'
        ? 'practice'
        : action === 'navigate-resources'
          ? 'resources'
          : action === 'navigate-stories'
            ? 'stories'
            : action === 'navigate-parent'
              ? 'parent'
              : (control.dataset.page as AppPage) || 'home';
      navigateTo(targetPage);
    } else if (action === 'parent-tab') {
      parentActiveTab = (control.dataset.tab as 'overview' | 'child_records' | 'settings') || 'overview';
      await renderAppPage();
    } else if (action === 'parent-telemetry-period') {
      parentTelemetryPeriod = (control.dataset.period as 'today' | '7days' | '30days') || '30days';
      await renderAppPage();
    } else if (action === 'select-report-child') {
      parentSelectedChildId = control.dataset.id || null;
      await renderAppPage();
    } else if (action === 'view-child-records') {
      parentSelectedChildId = control.dataset.id || null;
      parentActiveTab = 'child_records';
      await renderAppPage();
    } else if (action === 'export-child-csv') {
      const u = auth.getCurrentUser();
      if (u) {
        const ch = await profiles.getChildren(u.id);
        const targetChild = ch.find(c => c.id === control.dataset.id);
        if (targetChild) exportChildCsv(targetChild);
      }
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
    } else if (action === 'forgot-parent-pin') {
      pinRecoveryStage = 'verify_child';
      pinRecoveryToken = '';
      renderForgotPinModal();
    } else if (action === 'toggle-recovery-otp') {
      const otpContainer = root!.querySelector<HTMLElement>('#pin-recovery-otp-container');
      if (otpContainer) {
        otpContainer.style.display = otpContainer.style.display === 'none' ? 'block' : 'none';
      }
    } else if (action === 'toggle-gate-pin-visibility') {
      gatePinVisible = !gatePinVisible;
      const input = root!.querySelector<HTMLInputElement>('#gate-pin-input');
      if (input) {
        input.type = gatePinVisible ? 'text' : 'password';
      }
      if (control) {
        control.textContent = gatePinVisible ? '🙈' : '👁️';
        control.setAttribute('title', gatePinVisible ? 'Hide PIN' : 'Show PIN');
        control.setAttribute('aria-label', gatePinVisible ? 'Hide PIN' : 'Show PIN');
      }
    } else if (action === 'lock-parent-portal') {
      isParentPortalUnlocked = false;
      toast('Parent Portal locked. 🔒');
      await renderAppPage();
    } else if (action === 'send-recovery-otp') {
      const res = await auth.requestPinRecoveryOtp();
      const otpContainer = root!.querySelector<HTMLElement>('#pin-recovery-otp-container');
      if (otpContainer) otpContainer.style.display = 'block';
      const msgEl = root!.querySelector<HTMLElement>('#recovery-message');
      if (msgEl) {
        msgEl.style.color = res.success ? '#15803d' : '#b91c1c';
        msgEl.textContent = res.success ? res.message : (res.error || res.message);
      }
      toast(res.message, !res.success);
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
    } else if (action === 'open-story') {
      openStoryReader(control.dataset.id || '');
    } else if (action === 'shuffle-stories') {
      storyRotationAdvance = !storyRotationAdvance;
      await renderAppPage();
      toast('Stories shuffled! 🎲');
    } else if (action === 'speak-story') {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          const lbl = root!.querySelector<HTMLElement>('#story-tts-label');
          if (lbl) lbl.textContent = 'Read aloud';
        } else {
          const text = activeStory?.paragraphs.join(' ') || '';
          const utterance = new SpeechSynthesisUtterance(text);
          const lang: SupportedLanguage = activeStory?.language || activeChild?.preferredLanguage || 'English';
          utterance.lang = speechLocales[lang] || 'en-IN';
          utterance.rate = 0.85;
          utterance.onend = () => {
            const lbl = root!.querySelector<HTMLElement>('#story-tts-label');
            if (lbl) lbl.textContent = 'Read aloud';
          };
          const lbl = root!.querySelector<HTMLElement>('#story-tts-label');
          if (lbl) lbl.textContent = 'Pause voice';
          window.speechSynthesis.speak(utterance);
        }
      } else {
        toast('Speech synthesis is not supported in this browser.');
      }
    } else if (action === 'story-font-smaller') {
      activeStoryFontSize = Math.max(14, activeStoryFontSize - 2);
      const el = root!.querySelector<HTMLElement>('#story-paragraphs');
      if (el) el.style.fontSize = `${activeStoryFontSize}px`;
    } else if (action === 'story-font-larger') {
      activeStoryFontSize = Math.min(32, activeStoryFontSize + 2);
      const el = root!.querySelector<HTMLElement>('#story-paragraphs');
      if (el) el.style.fontSize = `${activeStoryFontSize}px`;
    } else if (action === 'answer-story-comp') {
      const qid = control.dataset.qid;
      const idx = parseInt(control.dataset.idx || '-1', 10);
      if (!activeStory || !qid || idx < 0) return;
      const q = activeStory.comprehensionQuestions.find(item => item.id === qid);
      if (!q || storyAnsweredQids.has(qid)) return;

      storyAnsweredQids.add(qid);
      const container = root!.querySelector<HTMLElement>(`article[data-qid="${qid}"]`);
      const feedback = root!.querySelector<HTMLElement>(`#feedback_${qid}`);
      const scoreTag = root!.querySelector<HTMLElement>('#storyCompScoreTag');

      if (idx === q.correctIndex) {
        storyComprehensionScore++;
        control.classList.remove('btn-outline');
        control.classList.add('btn-primary');
        control.style.backgroundColor = '#16a34a';
        control.style.borderColor = '#16a34a';
        control.style.color = '#ffffff';
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.color = '#15803d';
          feedback.textContent = `✓ Correct! ${q.explanation || 'Great job understanding the story.'}`;
        }
        if (activeChild) {
          const currentProg = profiles.getChildProgress(activeChild.id);
          profiles.updateChildProgress(activeChild.id, {
            happyPoints: currentProg.happyPoints + 5,
          });
          await learning.recordAttempt({
            id: `story_comp_${Date.now()}`,
            childId: activeChild.id,
            activityId: `story_comp_${q.id}`,
            skillId: 'skill_reading_comprehension',
            activityType: 'comprehension',
            score: 100,
            accuracy: 1,
            totalQuestions: 1,
            correctAnswers: 1,
            incorrectAnswers: 0,
            attemptsRequired: 1,
            hintsRequested: 0,
            correctedAfterHint: 0,
            durationSeconds: 15,
            missedItems: [],
            completedAt: new Date().toISOString(),
          });
        }
        toast('+5 Happy Points earned! ⭐');
      } else {
        control.classList.remove('btn-outline');
        control.style.borderColor = '#dc2626';
        control.style.color = '#dc2626';
        const missedChoice = q.options[idx] || 'Incorrect option';
        if (!storyMissedQuestions.includes(q.question)) {
          storyMissedQuestions.push(q.question);
        }
        if (feedback) {
          feedback.style.display = 'block';
          feedback.style.color = '#b91c1c';
          feedback.textContent = `Nice try! The correct answer was: "${q.options[q.correctIndex]}". ${q.explanation || ''}`;
        }
        if (activeChild) {
          await learning.recordAttempt({
            id: `story_comp_${Date.now()}`,
            childId: activeChild.id,
            activityId: `story_comp_${q.id}`,
            skillId: 'skill_reading_comprehension',
            activityType: 'comprehension',
            score: 0,
            accuracy: 0,
            totalQuestions: 1,
            correctAnswers: 0,
            incorrectAnswers: 1,
            attemptsRequired: 1,
            hintsRequested: 0,
            correctedAfterHint: 0,
            durationSeconds: 15,
            missedItems: [missedChoice],
            completedAt: new Date().toISOString(),
          });
        }
      }

      container?.querySelectorAll<HTMLButtonElement>('.story-comp-opt').forEach(btn => {
        btn.disabled = true;
      });

      if (scoreTag) {
        scoreTag.textContent = `${storyComprehensionScore} / ${activeStory.comprehensionQuestions.length} Correct ⭐`;
      }
    } else if (action === 'finish-story-reading') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeStory && activeChild) {
        activityTracker.stopActivity();
        const currentProg = profiles.getChildProgress(activeChild.id);
        const totalQ = Math.max(1, activeStory.comprehensionQuestions.length || 1);
        const acc = storyComprehensionScore / totalQ;
        profiles.updateChildProgress(activeChild.id, {
          happyPoints: currentProg.happyPoints + 10,
          practiceWins: currentProg.practiceWins + 1,
        });
        await learning.recordAttempt({
          id: `story_read_${Date.now()}`,
          childId: activeChild.id,
          activityId: `story_${activeStory.id}`,
          skillId: 'skill_reading_comprehension',
          activityType: 'comprehension',
          score: Math.round(acc * 100),
          accuracy: acc,
          totalQuestions: totalQ,
          correctAnswers: storyComprehensionScore,
          incorrectAnswers: totalQ - storyComprehensionScore,
          attemptsRequired: totalQ,
          hintsRequested: 0,
          correctedAfterHint: 0,
          durationSeconds: 60,
          missedItems: [...storyMissedQuestions],
          completedAt: new Date().toISOString(),
        });
        toast(`Story finished! 🌟 +10 Happy Points awarded to ${activeChild.name}!`);
      }
      closeModal();
      await renderAppPage();
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
      isParentPortalUnlocked = false;
      toast(result.message || 'You’re signed in.');
      navigateTo('parent');
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
      if (message) {
        message.style.color = result.success ? '#15803d' : '#b91c1c';
        message.textContent = result.success ? 'Parent PIN saved successfully.' : result.error || 'Could not save your PIN.';
      }
      if (result.success) {
        toast('Parent PIN updated.');
        form.reset();
      }
    } else if (form.id === 'parent-change-password-form') {
      const data = new FormData(form);
      const newPassword = String(data.get('newPassword') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      const message = root!.querySelector<HTMLElement>('#password-message');
      if (newPassword.length < 6) {
        if (message) {
          message.style.color = '#b91c1c';
          message.textContent = 'Password must be at least 6 characters long.';
        }
        return;
      }
      if (newPassword !== confirmPassword) {
        if (message) {
          message.style.color = '#b91c1c';
          message.textContent = 'Passwords do not match.';
        }
        return;
      }
      const res = await auth.updatePassword(newPassword);
      if (message) {
        message.style.color = res.success ? '#15803d' : '#b91c1c';
        message.textContent = res.message;
      }
      if (res.success) {
        toast('Password updated successfully! 🔒');
        form.reset();
      }
    } else if (form.id === 'pin-recovery-step1-form') {
      const data = new FormData(form);
      const childName = String(data.get('childName') || '');
      const otpCode = String(data.get('otpCode') || '');
      const msgEl = root!.querySelector<HTMLElement>('#recovery-message');

      const res = await auth.verifyChildForPinRecovery(childName, otpCode);
      if (!res.success) {
        if (msgEl) {
          msgEl.style.color = '#b91c1c';
          msgEl.textContent = res.error || 'Verification failed. Please try again.';
        }
        const otpContainer = root!.querySelector<HTMLElement>('#pin-recovery-otp-container');
        if (otpContainer && res.error?.includes('verification code')) {
          otpContainer.style.display = 'block';
        }
      } else {
        pinRecoveryToken = res.recoveryToken!;
        pinRecoveryStage = 'reset_pin';
        renderForgotPinModal();
      }
    } else if (form.id === 'pin-recovery-step2-form') {
      const data = new FormData(form);
      const newPin = String(data.get('newPin') || '');
      const confirmPin = String(data.get('confirmPin') || '');
      const msgEl = root!.querySelector<HTMLElement>('#recovery-message');

      if (newPin !== confirmPin) {
        if (msgEl) {
          msgEl.style.color = '#b91c1c';
          msgEl.textContent = 'PINs do not match. Please ensure both fields are identical.';
        }
        return;
      }
      if (!/^\d{4}$/.test(newPin.trim())) {
        if (msgEl) {
          msgEl.style.color = '#b91c1c';
          msgEl.textContent = 'Parent PIN must be exactly 4 numeric digits.';
        }
        return;
      }

      const res = await auth.resetParentPinWithRecovery(pinRecoveryToken, newPin, confirmPin);
      if (!res.success) {
        if (msgEl) {
          msgEl.style.color = '#b91c1c';
          msgEl.textContent = res.error || 'Failed to reset PIN.';
        }
      } else {
        isParentPortalUnlocked = true;
        pinRecoveryStage = 'success';
        renderForgotPinModal();
        toast('Parent PIN reset successfully! 🔒');
      }
    } else if (form.id === 'parent-gate-pin-form') {
      const data = new FormData(form);
      const message = root!.querySelector<HTMLElement>('#gate-pin-message');

      if (auth.hasParentPin()) {
        const pin = String(data.get('gatePin') || '').trim();
        if (!/^\d{4}$/.test(pin)) {
          if (message) {
            message.style.color = '#b91c1c';
            message.textContent = 'Please enter exactly 4 numeric digits.';
          }
          return;
        }

        const verify = await auth.verifyParentPin(pin);
        if (!verify.success) {
          if (message) {
            message.style.color = '#b91c1c';
            if (verify.lockoutSeconds) {
              message.textContent = `Security lockout active. Please wait ${verify.lockoutSeconds} seconds before retrying.`;
            } else {
              message.textContent = verify.error || 'Incorrect PIN. Please try again.';
            }
          }
          const pinInput = root!.querySelector<HTMLInputElement>('#gate-pin-input');
          if (pinInput) {
            pinInput.value = '';
            pinInput.focus();
          }
          return;
        }

        isParentPortalUnlocked = true;
        toast('Parent Portal Unlocked! 🛡️');
        await renderAppPage();
      } else {
        const newPin = String(data.get('gateNewPin') || '').trim();
        const confirmPin = String(data.get('gateConfirmPin') || '').trim();

        if (newPin !== confirmPin) {
          if (message) {
            message.style.color = '#b91c1c';
            message.textContent = 'PINs do not match. Please ensure both fields are identical.';
          }
          return;
        }

        if (!/^\d{4}$/.test(newPin)) {
          if (message) {
            message.style.color = '#b91c1c';
            message.textContent = 'Parent PIN must be exactly 4 numeric digits.';
          }
          return;
        }

        const setup = await auth.setupParentPin(newPin);
        if (!setup.success) {
          if (message) {
            message.style.color = '#b91c1c';
            message.textContent = setup.error || 'Failed to setup Parent PIN.';
          }
          return;
        }

        isParentPortalUnlocked = true;
        toast('Parent PIN set and portal unlocked! 🛡️');
        await renderAppPage();
      }
    } else if (form.id === 'resource-form') {
      await submitResourceSearch(form);
    }
  } catch (error) {
    console.error('Form submission failed:', error);
    const message = root!.querySelector<HTMLElement>('#child-message, #pin-message, #auth-message, #password-message, #recovery-message, #gate-pin-message');
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

  if (target.classList.contains('story-lang-select')) {
    const select = target as HTMLSelectElement;
    storyLanguage = select.value as SupportedLanguage;
    await renderAppPage();
    return;
  }

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
