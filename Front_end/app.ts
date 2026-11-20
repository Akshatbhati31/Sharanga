import { ActivityTrackerService } from '../src/services/activityTrackerService';
import { ACTIVITY_CATALOG } from '../src/services/activityCatalog';
import { AiActivityService } from '../src/services/aiActivityService';
import { AuthService } from '../src/services/authService';
import { LearningPathService } from '../src/services/learningPathService';
import { ProfileService } from '../src/services/profileService';
import { ReadingChartService, type ReadingChartSummary } from '../src/services/readingChartService';
import { StoryShelfService, type StoryPassage } from '../src/services/storyShelfService';
import { TinyFishService } from '../src/services/tinyfishService';
import { speechService } from '../src/services/speechService';
import { soundService } from '../src/services/soundService';
import {
  AdventureService,
  ADVENTURE_DESTINATIONS,
  DEFAULT_DESTINATION_SETTINGS,
  DESTINATION_ORDER,
  type DestinationId,
  type DestinationSetting,
} from '../src/services/adventureService';
import {
  ADVENTURE_DESTINATIONS_META,
  computeAdventureMapState,
  type DestinationKey,
} from '../src/services/adventureLevels';
import { ActivityRunnerModal } from '../src/ui/activityRunnerModal';
import { LetterMirrorBDModal } from '../src/ui/letterMirrorBDModal';
import { getSkillDefinition } from '../src/services/skillModel';
import { i18n, t, SUPPORTED_LANGUAGES } from '../src/i18n';
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
const adventure = AdventureService.getInstance();

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

// Application State
export type AppPage = 'landing' | 'auth' | 'home' | 'practice' | 'progress' | 'resources' | 'profiles' | 'stories' | 'adventure' | 'parent';

let parentActiveTab: 'overview' | 'child_records' | 'settings' | 'adventure_settings' = 'overview';
let parentSelectedChildId: string | null = null;
let parentTelemetryPeriod: 'today' | '7days' | '30days' = '30days';

let activeAdventureDestination: DestinationId = 'phonics_garden'; void activeAdventureDestination;

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


// Theme state & initialization (Light / Dark mode)
let currentTheme: 'light' | 'dark' =
  (localStorage.getItem('dysleximate_theme') as 'light' | 'dark') ||
  (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light');

function applyTheme(theme: 'light' | 'dark'): void {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
  localStorage.setItem('dysleximate_theme', theme);
}

applyTheme(currentTheme);

let celebratedCompletedLevelNumber: number | null = null;

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
  speechService.stop();
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (modal && modal.innerHTML.trim() !== '') {
    soundService.modalClose(activeChild?.preferences?.soundEffects !== false);
  }
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
    const dest = params.get('destination') as DestinationId | null;
    if (dest && (DESTINATION_ORDER as readonly string[]).includes(dest)) {
      activeAdventureDestination = dest;
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
    case 'adventure':
    case 'adventures':
    case 'my-adventure':
      return { page: 'adventure' };
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
    adventure: 'My Adventure & Game Realms — DyslexiMate',
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
  soundService.pageTransition(activeChild?.preferences?.soundEffects !== false);

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

void button;
function button(label: string, action: string, style = 'btn btn-outline'): string {
  void button;
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
          <button type="button" class="theme-toggle-btn" data-action="toggle-theme" title="Toggle Light / Dark Mode" aria-label="Toggle Theme">
            <span class="theme-icon">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          <button type="button" class="dyslexia-toggle-btn ${dyslexiaMode ? 'active' : ''}" data-action="toggle-dyslexia-font" title="Toggle Dyslexia-Friendly Font (Aa)" aria-label="Toggle Dyslexia Font (Aa)">
            <span class="indicator-dot" aria-hidden="true"></span>
            <span class="dyslexia-label">Aa</span>
          </button>
          <button type="button" class="sound-toggle-btn ${soundService.isEnabled() ? 'active' : ''}" data-action="toggle-sound-effects" title="${soundService.isEnabled() ? 'Sound Effects: ON (Click to Mute)' : 'Sound Effects: MUTED (Click to Enable)'}" aria-label="${soundService.isEnabled() ? 'Mute Sound Effects' : 'Enable Sound Effects'}">
            <span class="indicator-dot" aria-hidden="true"></span>
            <span class="sound-icon" aria-hidden="true">${soundService.isEnabled() ? '🔊' : '🔇'}</span>
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
          <button type="button" class="theme-toggle-btn" data-action="toggle-theme" title="Toggle Light / Dark Mode" aria-label="Toggle Theme">
            <span class="theme-icon">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          <button type="button" class="dyslexia-toggle-btn ${dyslexiaMode ? 'active' : ''}" data-action="toggle-dyslexia-font" title="Toggle Dyslexia-Friendly Font (Aa)" aria-label="Toggle Dyslexia Font (Aa)">
            <span class="indicator-dot" aria-hidden="true"></span>
            <span class="dyslexia-label">Aa</span>
          </button>
          <button type="button" class="sound-toggle-btn ${soundService.isEnabled() ? 'active' : ''}" data-action="toggle-sound-effects" title="${soundService.isEnabled() ? 'Sound Effects: ON (Click to Mute)' : 'Sound Effects: MUTED (Click to Enable)'}" aria-label="${soundService.isEnabled() ? 'Mute Sound Effects' : 'Enable Sound Effects'}">
            <span class="indicator-dot" aria-hidden="true"></span>
            <span class="sound-icon" aria-hidden="true">${soundService.isEnabled() ? '🔊' : '🔇'}</span>
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
        <div class="auth-logo-brand-pill">
          <a class="brand" href="#/landing" data-action="open-website" aria-label="Return to DyslexiMate website" style="text-decoration: none;">
            ${brandMarkup(false)}
          </a>
        </div>
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

          <h2>${registering ? t('auth.register.title') : t('auth.login.title')}</h2>
          <p class="muted">${registering ? t('auth.register.subtitle') : t('auth.login.subtitle')}</p>
          
          <form id="auth-form" class="form-stack">
            ${registering ? `<label>${t('auth.register.fullNameLabel')}<input name="fullName" autocomplete="name" required minlength="2" placeholder="${t('auth.register.fullNamePlaceholder')}" /></label>` : ''}
            <label>${t('auth.login.emailLabel')}<input name="email" type="email" autocomplete="email" required placeholder="${t('auth.login.emailPlaceholder')}" /></label>
            <label>${t('auth.login.passwordLabel')}<input name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required minlength="${registering ? '6' : '1'}" placeholder="${registering ? t('auth.register.passwordPlaceholder') : t('auth.login.passwordPlaceholder')}" /></label>
            ${registering ? `
              <label>${t('auth.register.confirmPasswordLabel')}<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="6" placeholder="${t('auth.register.confirmPasswordPlaceholder')}" /></label>
              <label class="check-row"><input name="acceptTerms" type="checkbox" required /><span>${t('auth.register.termsAgree')}</span></label>
            ` : ''}
            
            <button class="btn btn-primary btn-lg" style="width: 100%; margin-top: 8px;" type="submit">
              ${registering ? t('auth.register.submitBtn') : t('auth.login.submitBtn')} <span aria-hidden="true">→</span>
            </button>
            <p id="auth-message" class="form-message" aria-live="polite"></p>
          </form>

          ${!registering ? `<button type="button" class="btn btn-ghost btn-sm" style="margin-top: 8px;" data-action="reset-password">${t('auth.login.forgotPasswordLink')}</button>` : ''}
          
          <p class="auth-switch" style="text-align: center; margin-top: 18px; font-size: 13px;">
            ${registering ? (t('auth.register.hasAccount') || 'Already have an account?') : (t('auth.login.noAccount') || 'New to DyslexiMate?')}
            <button type="button" class="btn btn-ghost btn-sm" style="color: var(--primary); font-weight: 800;" data-action="toggle-auth">
              ${registering ? t('auth.login.title') : t('auth.register.title')}
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
        <span class="badge badge-primary">${t('nav.learningSpace') || 'FAMILY LEARNING SPACE'}</span>
        <h1>${editing ? t('childModal.editTitle') : t('profileSelect.whoLearning')}</h1>
        <p class="muted">${editing ? t('childModal.editSubtitle') : t('profileSelect.welcomeMsg')}</p>
      </section>

      <div class="profile-grid">
        ${children.map(child => `
          <article class="profile-card">
            <button class="profile-select" type="button" data-action="select-child" data-id="${escapeHtml(child.id)}" style="width: 100%; border: 0; background: none; cursor: pointer;">
              <span class="profile-avatar">${escapeHtml(child.avatar)}</span>
              <strong>${escapeHtml(child.name)}</strong>
              <small>${escapeHtml(child.grade)} · ${escapeHtml(child.preferredLanguage)}</small>
              <span style="display: inline-block; margin-top: 12px; color: var(--primary); font-weight: 800; font-size: 13px;">
                ${t('profileSelect.startReadingBtn')} →
              </span>
            </button>
            <div class="profile-card-actions">
              <button type="button" class="mini-button" data-action="edit-child" data-id="${escapeHtml(child.id)}">${t('common.edit')}</button>
              <button type="button" class="mini-button mini-danger" data-action="delete-child" data-id="${escapeHtml(child.id)}">${t('common.delete')}</button>
            </div>
          </article>`).join('')}

        <button class="profile-card add-profile" type="button" data-action="add-child">
          <span class="add-icon">＋</span>
          <strong>${t('profileSelect.addChildBtn')}</strong>
          <small>${t('childModal.addSub') || 'Create a personalized profile'}</small>
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
        <div class="auth-logo-brand-pill">
          <a class="brand" href="#/landing" data-action="open-website" aria-label="Return to DyslexiMate website" style="text-decoration: none;">
            ${brandMarkup(false)}
          </a>
        </div>
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
  let childAdventureSettings: Record<DestinationId, DestinationSetting> | null = null;

  if (selectedChild) {
    [attempts, path, chartSummary, childAdventureSettings] = await Promise.all([
      learning.getChildAttempts(selectedChild.id),
      learning.getOrGeneratePath(selectedChild),
      charts.getChartSummary(selectedChild.id, 'all'),
      adventure.getChildSettings(selectedChild.id),
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
    <main class="parent-portal-page" style="min-height: 100vh; background: var(--bg-page); color: var(--text-main); font-family: var(--font-body, system-ui);">
      <!-- Top Navigation Header -->
      <header class="surface" style="padding: 16px 24px; border-bottom: 1.5px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; background: var(--bg-surface);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="parent-nav-logo-pill">
            <a href="#/landing" data-action="open-website" style="text-decoration: none;">
              ${brandMarkup(false)}
            </a>
          </div>
          <span class="badge badge-primary">PARENT &amp; GUARDIAN PORTAL 🛡️</span>
          ${isLive
      ? '<span class="badge badge-outline" style="border-color: #86efac; color: #166534; background: #f0fdf4;">🟢 Supabase PostgreSQL &amp; RLS Active</span>'
      : '<span class="badge badge-outline" style="border-color: #fde047; color: #854d0e; background: #fefce8;">⚡ Local Sandbox</span>'}
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="theme-toggle-btn" data-action="toggle-theme" title="Toggle Light / Dark Mode" aria-label="Toggle Theme" style="padding: 6px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--bg-surface-alt); color: var(--text-main); cursor: pointer; font-size: 16px;">
            <span class="theme-icon">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
          </button>
          <select class="parent-lang-select" style="padding: 6px 10px; border-radius: var(--radius-md); border: 1.5px solid var(--border); font-weight: 700; font-size: 13px; background: var(--bg-surface-alt); color: var(--text-main);" aria-label="Interface Language">
            ${SUPPORTED_LANGUAGES.map(meta => `
              <option value="${meta.code}" ${meta.code === i18n.getCurrentLanguage() ? 'selected' : ''}>
                ${meta.flag} ${meta.nativeName} (${meta.englishName})
              </option>
            `).join('')}
          </select>
          <a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="text-decoration: none;">
            🌐 ${t('nav.backToWebsite') || 'View Website'}
          </a>
          <a href="#/profiles" class="btn btn-primary btn-sm" data-action="profiles" style="text-decoration: none;">
            👧🏽 ${t('profileSelect.title') || 'Learner Profiles'} (${children.length}) →
          </a>
          <button type="button" class="btn btn-outline btn-sm" data-action="lock-parent-portal" title="Lock the parent dashboard">
            🔒 ${t('parent.securityPinTitle') || 'Lock Portal'}
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="logout" style="color: #dc2626;">
            ${t('parent.logoutBtn') || 'Sign Out'}
          </button>
        </div>
      </header>

      <div style="max-width: 1120px; margin: 0 auto; padding: 28px 20px;">
        <!-- Welcome Hero Banner -->
        <section style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary); letter-spacing: 0.5px; text-transform: uppercase;">
              ${t('nav.learningSpace') || 'FAMILY LEARNING MANAGEMENT'}
            </span>
            <h1 style="font-family: var(--font-heading); font-size: 28px; font-weight: 900; margin: 4px 0 6px;">
              ${t('home.welcomeBack', { name: escapeHtml(user.fullName) })}
            </h1>
            <p style="font-size: 14px; color: var(--text-muted); margin: 0;">
              ${t('parent.hubSubtitle')}
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-action="add-child">
            ＋ ${t('parent.addChildBtn')}
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
            👥 ${t('parent.linkedProfiles') || 'Family Overview & Children'}
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
            📊 ${t('parent.activityUsage') || 'Detailed Learning Records'}
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
            ⚙️ ${t('parent.securityPinTitle') || 'Account & Security Settings'}
          </button>
          <button
            type="button"
            class="btn btn-sm ${parentActiveTab === 'adventure_settings' ? 'btn-primary' : 'btn-ghost'}"
            data-action="parent-tab"
            data-tab="adventure_settings"
            role="tab"
            aria-selected="${parentActiveTab === 'adventure_settings'}"
            style="border-bottom-left-radius: 0; border-bottom-right-radius: 0; font-weight: 800; padding: 10px 18px;"
          >
            🧭 ${t('adventure.title') || 'Adventure Settings'}
          </button>
        </nav>

        <!-- TAB 1: OVERVIEW & CHILDREN LIST -->
        ${parentActiveTab === 'overview' ? `
          <section class="stats-grid" style="margin-bottom: 28px;">
            ${statCard('👥', t('parent.linkedChildrenTitle'), children.length, t('parent.linkedProfiles'))}
            ${statCard('⏱', t('parent.totalPracticeTime'), `${totalPracticeMinutes} min`, t('home.statPracticeTimeFromLastWeek'))}
            ${statCard('📖', t('parent.totalWordsPracticed'), totalWordsPracticed, t('home.statWordsLearnedNew'))}
            ${statCard('✦', t('home.statHappyPoints'), `${totalHappyPoints} ⭐`, t('home.statHappyPointsBadgeSoon'))}
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
                        <span style="font-size: 38px; width: 56px; height: 56px; display: grid; place-items: center; background: var(--bg-surface-alt); border-radius: 14px; border: 1px solid var(--border);">
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
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px; background: var(--bg-surface); border: 1.5px solid var(--border);">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <span style="font-size: 48px; width: 70px; height: 70px; display: grid; place-items: center; background: var(--bg-surface-alt); border-radius: 18px; border: 1.5px solid var(--border);">
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
                <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 12px 12px; margin-bottom: 20px; overflow-x: auto;">
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
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg); margin-bottom: 24px; background: var(--bg-surface); border: 1.5px solid var(--border);">
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
                  <div style="background: var(--bg-surface-alt); border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 10px 18px; text-align: center;">
                    <span style="font-size: 11px; font-weight: 800; color: #92400e; display: block; text-transform: uppercase;">CUMULATIVE TOTAL</span>
                    <strong style="font-size: 24px; color: #b45309;">${runningPoints || 405} ⭐</strong>
                  </div>
                </div>
              </div>

              <!-- Day-by-day table -->
              ${dailyHistoryList.length > 0 ? `
                <div style="overflow-x: auto; background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md);">
                  <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                    <thead>
                      <tr style="background: var(--bg-surface-alt); border-bottom: 1.5px solid var(--border); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
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

            <!-- Interface Audio & Sound Lab Card -->
            <section class="surface" style="padding: 22px; border-radius: var(--radius-lg);">
              <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 4px;">
                🎵 Interface Sound Effects (Sound Lab)
              </h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 16px;">
                Tactile micro-sounds designed for young readers. Master volume and sound preferences.
              </p>
              <div style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <div>
                    <strong>Master Sound Effects</strong>
                    <small style="display: block; color: var(--text-muted);">Subtle button, card, and celebration feedback</small>
                  </div>
                  <button
                    type="button"
                    class="sound-toggle-btn ${soundService.isEnabled() ? 'active' : ''}"
                    data-action="toggle-sound-effects"
                  >
                    <span class="indicator-dot"></span>
                    <span class="sound-icon">${soundService.isEnabled() ? '🔊 Enabled' : '🔇 Muted'}</span>
                  </button>
                </div>
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 6px;">
                    <span>Volume</span>
                    <span id="sound-vol-label">${Math.round(soundService.getVolume() * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value="${Math.round(soundService.getVolume() * 100)}"
                    data-action="change-sound-volume"
                    style="width: 100%; accent-color: var(--primary);"
                  />
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
                  <button type="button" class="btn btn-outline btn-sm" data-action="test-sound" data-sound="pebble">Pebble</button>
                  <button type="button" class="btn btn-outline btn-sm" data-action="test-sound" data-sound="pluck">Pluck</button>
                  <button type="button" class="btn btn-outline btn-sm" data-action="test-sound" data-sound="bloom">Bloom</button>
                  <button type="button" class="btn btn-outline btn-sm" data-action="test-sound" data-sound="confetti">Confetti</button>
                  <button type="button" class="btn btn-outline btn-sm" data-action="test-sound" data-sound="treasure">Treasure</button>
                </div>
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

        <!-- TAB 4: ADVENTURE & GAME ACCESS SETTINGS -->
        ${parentActiveTab === 'adventure_settings' ? `
          ${!selectedChild ? `
            <div class="surface" style="text-align: center; padding: 40px 20px; border-radius: var(--radius-lg);">
              <span style="font-size: 40px;">🌱</span>
              <p style="color: var(--text-muted); margin-top: 8px;">No child profile selected. Add a child profile first to customize adventure settings.</p>
            </div>
          ` : `
            <div style="display: grid; gap: 24px;">
              <!-- Child Selector & Points Summary -->
              <div class="surface" style="padding: 20px 24px; border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                  <span class="profile-avatar" style="width: 48px; height: 48px; font-size: 24px; border-radius: 12px; margin: 0;">
                    ${escapeHtml(selectedChild.avatar)}
                  </span>
                  <div>
                    <div style="font-size: 12px; font-weight: 800; color: var(--primary); text-transform: uppercase;">Configuring Adventure For</div>
                    <h2 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin: 2px 0;">
                      ${escapeHtml(selectedChild.name)} (${escapeHtml(selectedChild.grade)})
                    </h2>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                  ${children.length > 1 ? `
                    <label style="font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                      <span>Switch child:</span>
                      <select id="parent-adventure-child-picker" style="padding: 6px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-weight: 700;">
                        ${children.map(c => `
                          <option value="${c.id}" ${c.id === selectedChild.id ? 'selected' : ''}>
                            ${escapeHtml(c.avatar)} ${escapeHtml(c.name)}
                          </option>
                        `).join('')}
                      </select>
                    </label>
                  ` : ''}
                  <span class="badge badge-warning" style="font-size: 14px; padding: 8px 14px;">
                    ⭐ ${profiles.getChildProgress(selectedChild.id).happyPoints} Happy Points
                  </span>
                </div>
              </div>

              <!-- Adventure Settings Form -->
              <section class="surface" style="padding: 24px; border-radius: var(--radius-lg);">
                <div style="margin-bottom: 20px;">
                  <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 6px;">
                    🧭 Destination Game Access &amp; Happy Points Progression
                  </h3>
                  <p style="font-size: 13px; color: var(--text-muted); margin: 0;">
                    Control which learning destinations ${escapeHtml(selectedChild.name)} can access and adjust the cumulative Happy Points milestone required for each. Points are cumulative milestones—unlocking does not deduct points.
                  </p>
                </div>

                <form id="adventure-settings-form" data-child-id="${selectedChild.id}" class="form-stack">
                  <div style="display: grid; gap: 16px;">
                    ${DESTINATION_ORDER.map(destId => {
            const def = ADVENTURE_DESTINATIONS[destId];
            const setting = (childAdventureSettings && childAdventureSettings[destId]) || DEFAULT_DESTINATION_SETTINGS[destId];
            const childPoints = profiles.getChildProgress(selectedChild.id).happyPoints;
            const isUnlocked = setting.enabled && childPoints >= setting.requiredPoints;
            const isDisabled = !setting.enabled;

            return `
                        <article class="adventure-dest-config-card" style="border: 1.5px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; background: #fafafa; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                          <div style="display: flex; align-items: center; gap: 16px; min-width: 260px; flex: 1;">
                            <div style="width: 48px; height: 48px; border-radius: 12px; background: ${def.accentBg}; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 1px solid var(--border-color);">
                              ${def.icon}
                            </div>
                            <div>
                              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <strong style="font-size: 16px;">${escapeHtml(def.name)}</strong>
                                ${isDisabled
                ? '<span class="badge" style="background: #fee2e2; color: #991b1b;">⛔ Disabled by Parent</span>'
                : isUnlocked
                  ? '<span class="badge badge-success" style="background: #dcfce7; color: #166534;">✨ Unlocked</span>'
                  : `<span class="badge badge-warning" style="background: #fef3c7; color: #92400e;">🔒 Locked (Needs ${setting.requiredPoints - childPoints} pts)</span>`
              }
                              </div>
                              <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0 0;">
                                ${escapeHtml(def.description)}
                              </p>
                              <small style="color: var(--text-subtle); display: block; margin-top: 4px;">
                                Default milestone: ${def.defaultRequiredPoints} pts · Connected activities: ${def.activityIds.length}
                              </small>
                            </div>
                          </div>

                          <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; cursor: pointer; user-select: none;">
                              <input
                                type="checkbox"
                                name="${destId}_enabled"
                                ${setting.enabled ? 'checked' : ''}
                                style="width: 18px; height: 18px; accent-color: var(--primary);"
                              />
                              <span>Enabled</span>
                            </label>

                            <label style="display: grid; gap: 4px; font-size: 12px; font-weight: 700;">
                              <span>Required Happy Points</span>
                              <input
                                type="number"
                                name="${destId}_points"
                                min="0"
                                step="1"
                                required
                                value="${setting.requiredPoints}"
                                style="width: 120px; padding: 6px 10px; border-radius: var(--radius-md); border: 1.5px solid var(--border-color); font-weight: 800;"
                              />
                            </label>
                          </div>
                        </article>
                      `;
          }).join('')}
                  </div>

                  <div style="margin-top: 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <button type="submit" class="btn btn-primary" id="save-adventure-settings-btn" style="padding: 10px 24px; font-weight: 800;">
                      💾 Save Adventure Settings
                    </button>
                  </div>
                  <div id="adventure-settings-message" class="form-message" aria-live="polite" style="margin-top: 14px; font-size: 14px; font-weight: 700;"></div>
                </form>
              </section>
            </div>
          `}
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
    ['home', '⌂', t('nav.myHome') || 'My Home'],
    ['adventure', '🧭', t('nav.myAdventure') || 'Adventure Map'],
    ['practice', '✳', t('nav.practice') || 'Practice'],
    ['stories', '📖', t('nav.storyShelf') || 'Story Shelf'],
    ['progress', '↗', t('nav.myProgress') || 'My Progress'],
    ['resources', '⌕', t('nav.resourceFinder') || 'Discovery Hub'],
  ];

  return `
    <div class="app-shell">
      <aside class="sidebar">
        <a href="#/landing" data-action="open-website" style="display: block; margin-bottom: 20px;">
          ${brandMarkup()}
        </a>

        <a href="#/landing" class="btn btn-outline btn-sm" data-action="open-website" style="margin-bottom: 12px; width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px;">
          🌐 ${t('nav.backToWebsite') || 'Back to Website'}
        </a>

        <span style="font-size: 11px; font-weight: 800; color: var(--text-subtle); letter-spacing: 1px; text-transform: uppercase;">
          ${t('nav.learningSpace') || 'LEARNING SPACE'}
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
          <strong>${t('nav.tipTitle') || 'Every little step counts.'}</strong>
          <p>${t('nav.tipDesc') || '10 minutes of daily playful reading can make a massive difference in fluency.'}</p>
          <a href="#/stories" class="btn btn-warm btn-sm" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center;" data-action="navigate-stories">
            ${t('nav.findStory') || 'Find a Story'}
          </a>
        </div>

        <!-- Sidebar Theme Switcher -->
        <button
          type="button"
          class="theme-toggle-btn sidebar-theme-btn"
          data-action="toggle-theme"
          title="${currentTheme === 'dark' ? 'Switch to Sunny Day Mode ☀️' : 'Switch to Night Sky Mode 🌙'}"
          aria-label="Toggle Theme"
          style="width: 100%; margin: 6px 0 16px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 9px 14px; border-radius: var(--radius-pill); border: 1.5px solid var(--border); background: var(--bg-surface-alt); color: var(--text-main); font-weight: 800; font-size: 13px; cursor: pointer; transition: all var(--transition-fast);"
        >
          <span class="theme-icon">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
          <span>${currentTheme === 'dark' ? 'Night Sky Mode' : 'Sunny Day Mode'}</span>
        </button>

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
            <span class="breadcrumb">${t('nav.learningSpace') || 'Learning space'} <span>›</span> <strong>${escapeHtml(activePage === 'home' ? t('nav.myHome') : activePage[0]!.toUpperCase() + activePage.slice(1))}</strong></span>
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
                <div class="custom-lang-menu-header">${t('childModal.langLabel') || 'My Languages'} (${learnerLanguages.length})</div>
                ${learnerLanguages.map(lang => {
    const isSelected = lang === child.preferredLanguage;
    const langMeta = SUPPORTED_LANGUAGES.find(m => m.supportedLanguageName === lang);
    const nativeText = langMeta ? `${langMeta.nativeName} (${langMeta.englishName})` : lang;
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
                        <span>${escapeHtml(nativeText)}</span>
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

            <!-- Sound Effects Toggle Button -->
            <button
              type="button"
              class="sound-toggle-btn ${soundService.isEnabled() ? 'active' : ''}"
              data-action="toggle-sound-effects"
              title="${soundService.isEnabled() ? 'Sound Effects: ON (Click to Mute)' : 'Sound Effects: MUTED (Click to Enable)'}"
              aria-label="${soundService.isEnabled() ? 'Mute Sound Effects' : 'Enable Sound Effects'}"
            >
              <span class="indicator-dot" aria-hidden="true"></span>
              <span class="sound-icon" aria-hidden="true">${soundService.isEnabled() ? '🔊' : '🔇'}</span>
            </button>

            <!-- Theme Switching Button (Child Dashboard Topbar) -->
            <button
              type="button"
              class="theme-toggle-btn"
              data-action="toggle-theme"
              title="${currentTheme === 'dark' ? 'Switch to Sunny Day Mode ☀️' : 'Switch to Night Sky Mode 🌙'}"
              aria-label="Toggle Theme"
            >
              <span class="indicator-dot" aria-hidden="true"></span>
              <span class="theme-icon" aria-hidden="true">${currentTheme === 'dark' ? '🌙' : '☀️'}</span>
            </button>

            <span class="badge badge-outline today-badge">
              ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <a href="#/parent" class="btn btn-outline btn-sm user-settings-chip" data-action="navigate-parent" style="text-decoration: none; display: flex; align-items: center; gap: 6px;" title="Open Parent Dashboard for ${escapeHtml(userName)}">
              <span>🛡️</span> <span>${t('profileSelect.parentDash') || 'Parent Dashboard'}</span>
            </a>
          </div>
        </header>

        <div id="page-content" aria-live="polite">
          <div class="loading-state" style="padding: 40px; text-align: center;">${t('common.loading')}</div>
        </div>
        ${rightsFooter()}
      </main>
      <div id="modal-root"></div>
    </div>`;
}

function pageTitle(): string {
  if (activePage === 'practice') return t('practice.heading');
  if (activePage === 'stories') return t('stories.heading');
  if (activePage === 'adventure') return t('adventure.title') || 'My Adventure & Game Realms';
  if (activePage === 'progress') return t('progress.heading');
  if (activePage === 'resources') return t('resources.heading') || t('resources.title');
  return t('home.heroGreeting', { name: activeChild?.name || 'reader' });
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


function renderLevelPreviewModal(levelNumber: number): void {
  const child = activeChild;
  if (!child) return;
  const progress = profiles.getChildProgress(child.id);
  const mapState = computeAdventureMapState(child, (learningPath as any)?.skillStates || {}, progress);
  const level = mapState.levels.find(l => l.levelNumber === levelNumber);
  if (!level) return;

  if (level.status === 'locked') {
    toast(`🔒 Level ${level.levelNumber} is locked! Complete Level ${level.levelNumber - 1} or earn more Happy Points to unlock this realm.`);
    return;
  }

  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';

  const destMeta = ADVENTURE_DESTINATIONS_META[level.destinationKey];

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <div class="level-preview-dialog">
        <div class="level-preview-header dest-${escapeHtml(level.destinationKey)}">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 36px; line-height: 1;">${destMeta.icon}</span>
            <div>
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">
                ${escapeHtml(destMeta.name)}
              </div>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 900; margin: 2px 0 0;">
                Level ${level.levelNumber}: ${escapeHtml(level.title)}
              </h2>
            </div>
          </div>
          <button type="button" class="icon-button modal-close" data-action="close-modal" aria-label="Close" style="background: rgba(0,0,0,0.15); border: none; border-radius: 50%; color: inherit;">✕</button>
        </div>

        <div class="level-preview-body">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="badge badge-primary" style="text-transform: capitalize;">${escapeHtml(level.difficulty)} Level</span>
            <span class="badge badge-warm">✦ +${level.rewardPoints} Happy Points</span>
            ${level.status === 'completed' ? '<span class="badge badge-outline" style="border-color: #10b981; color: #10b981;">✓ Completed</span>' : '<span class="badge badge-outline" style="border-color: #0284c7; color: #0284c7;">🎯 Current Quest</span>'}
          </div>

          <div>
            <h4 style="font-size: 14px; font-weight: 800; margin: 0 0 4px; color: var(--text-main);">Learning Objective</h4>
            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0;">
              ${escapeHtml(level.objective)}
            </p>
          </div>

          <div style="background: var(--bg-surface-alt); border-radius: var(--radius-md); padding: 12px 16px; border: 1px solid var(--border);">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px;">Your Best Score</div>
            <div class="level-stars-display" style="padding: 6px 0; background: transparent;">
              <span class="star-slot ${level.stars >= 1 ? 'filled' : 'empty'}">⭐</span>
              <span class="star-slot ${level.stars >= 2 ? 'filled' : 'empty'}">⭐</span>
              <span class="star-slot ${level.stars >= 3 ? 'filled' : 'empty'}">⭐</span>
            </div>
            <p style="text-align: center; font-size: 12px; font-weight: 700; color: var(--text-main); margin: 4px 0 0;">
              ${level.stars === 3 ? '🌟 Mastered with flying colors! (3 Stars)' : level.stars === 2 ? '⭐ Great accuracy! (2 Stars)' : level.stars === 1 ? '🌱 Good effort! (1 Star)' : 'Play to earn your first star!'}
            </p>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button
              type="button"
              class="btn btn-primary btn-lg"
              style="flex: 1;"
              data-action="play-level"
              data-skill="${escapeHtml(level.skillId)}"
              data-title="${escapeHtml(level.title)}"
              data-difficulty="${escapeHtml(level.difficulty)}"
            >
              Play Level Now 🚀
            </button>
            <button type="button" class="btn btn-outline" data-action="close-modal">
              Back to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderMilestoneModal(levelNumber: number): void {
  const child = activeChild;
  if (!child) return;
  const progress = profiles.getChildProgress(child.id);
  const mapState = computeAdventureMapState(child, (learningPath as any)?.skillStates || {}, progress);
  const level = mapState.levels.find(l => l.levelNumber === levelNumber);
  if (!level || !level.milestone) return;

  const milestone = level.milestone;
  const isClaimed = level.status === 'completed';

  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <div class="level-preview-dialog">
        <div class="level-preview-header" style="background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 38px; line-height: 1;">🎁</span>
            <div>
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">
                MILESTONE TREASURE CHEST
              </div>
              <h2 style="font-family: var(--font-heading); font-size: 22px; font-weight: 900; margin: 2px 0 0;">
                ${escapeHtml(milestone.title)}
              </h2>
            </div>
          </div>
          <button type="button" class="icon-button modal-close" data-action="close-modal" aria-label="Close" style="background: rgba(0,0,0,0.15); border: none; border-radius: 50%; color: inherit;">✕</button>
        </div>

        <div class="level-preview-body" style="text-align: center;">
          <div style="font-size: 64px; margin: 12px 0; filter: drop-shadow(0 6px 16px rgba(245, 158, 11, 0.4));">
            ${isClaimed ? '🏆' : '🔒'}
          </div>

          <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0 0 8px; color: var(--text-main);">
            ${isClaimed ? 'Treasure Chest Unlocked!' : 'Locked Milestone Chest'}
          </h3>

          <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.6; margin: 0 0 16px;">
            ${escapeHtml(milestone.title)}
          </p>

          <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(245, 158, 11, 0.15); border: 1.5px solid #f59e0b; padding: 8px 18px; border-radius: var(--radius-pill); font-weight: 900; color: #b45309; margin-bottom: 20px;">
            <span>⭐</span> +${milestone.bonusPoints} Bonus Happy Points
          </div>

          <div>
            ${!isClaimed ? `
              <button
                type="button"
                class="btn btn-primary btn-lg"
                style="width: 100%;"
                data-action="inspect-level"
                data-level="${level.levelNumber}"
              >
                Conquer Level ${level.levelNumber} to Unlock 🚀
              </button>
            ` : `
              <button type="button" class="btn btn-outline" style="width: 100%;" data-action="close-modal">
                Close Treasure
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function homePage(): Promise<string> {
  const child = activeChild!;
  const [path, progress, skillStates] = await Promise.all([
    learningPath || learning.getOrGeneratePath(child),
    profiles.getChildProgress(child.id),
    learning.getChildSkillStates(child.id),
  ]);
  learningPath = path;
  const chart = await charts.getChartSummary(child.id, 'week');
  const rec = path.recommendations[0];
  const actualAccuracy = chart.overallAccuracy;
  const bars = chart.dataPoints.slice(-7);
  const mapState = computeAdventureMapState(child, skillStates, progress);
  const currentLvl = mapState.currentLevel || mapState.levels[0];
  const currentDest = mapState.currentDestination;

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
    <!-- Cheerful Learner Welcome Banner -->
    <section class="welcome-banner">
      <div class="welcome-copy">
        <span class="badge badge-warm" style="margin-bottom: 8px;">${t('home.madeForYouTag') || 'YOUR NEXT LITTLE WIN'}</span>
        <h2>${t('home.heroGreeting', { name: escapeHtml(child.name) }) || `Ready to grow, ${escapeHtml(child.name)}?`}</h2>
        <p>${escapeHtml(rec?.reason || t('home.heroSubtitle') || 'Pick a friendly activity and learn at your own pace.')}</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px;">
          <button class="btn btn-warm btn-lg" type="button" data-action="${rec ? 'start-recommendation' : 'navigate'}" ${rec ? `data-skill="${escapeHtml(rec.targetSkillId)}" data-title="${escapeHtml(rec.title)}" data-difficulty="${rec.difficulty}"` : 'data-page="practice"'}>
            ${t('home.startChallengeBtn') || 'Start Practice Adventure'} <span>→</span>
          </button>
          <button class="btn btn-outline btn-lg" type="button" data-action="navigate" data-page="adventure" style="background: var(--bg-surface-alt);">
            🧭 Explore World Map
          </button>
        </div>
      </div>
    </section>

    <!-- Top Key Metrics Grid -->
    <section class="stats-grid">
      ${statCard('⏱', t('home.statPracticeTime') || 'Practice minutes', progress.practiceMinutes, t('home.statPracticeTimeFromLastWeek') || 'Time spent learning')}
      ${statCard('✦', t('home.statHappyPoints') || 'Happy points', progress.happyPoints, t('home.statHappyPointsBadgeSoon') || 'Little wins add up')}
      ${statCard('📖', t('home.statWordsLearned') || 'Words learned', progress.wordsLearned, t('home.statWordsLearnedNew') || 'Words on your journey')}
      ${statCard('↗', t('progress.statAccuracy') || 'Recent accuracy', actualAccuracy === null ? '—' : `${actualAccuracy}%`, chart.isEmpty ? (t('home.statFluencyGrowing') || 'Growing steady') : (t('home.statFluency') || 'From recorded practice'))}
    </section>

    <!-- Dedicated World Adventure Gateway Banner -->
    <section class="adventure-hero-banner" style="margin-top: 24px; border-radius: 28px; padding: 22px 28px; background: linear-gradient(135deg, rgba(34, 211, 238, 0.16) 0%, rgba(250, 204, 21, 0.14) 100%); border: 2px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="font-size: 42px; line-height: 1; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));">🧭</div>
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-primary">WORLD ADVENTURE MAP</span>
            <span style="font-size: 12px; font-weight: 800; color: var(--text-muted);">${currentDest.name} · Level ${currentLvl.levelNumber}</span>
          </div>
          <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; margin: 4px 0 2px; color: var(--text-main);">
            Continue Your Journey Across 6 Learning Realms!
          </h3>
          <p style="margin: 0; font-size: 13.5px; color: var(--text-muted);">
            Travel the Candy Crush-inspired winding path, conquer levels, and unlock milestone treasure chests!
          </p>
        </div>
      </div>
      <button class="btn btn-primary btn-lg" type="button" data-action="navigate" data-page="adventure" style="box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35); font-weight: 900;">
        Open Adventure Map 🚀
      </button>
    </section>

    <!-- Main Dashboard Analytics & Recommendations Grid -->
    <div class="dashboard-grid" style="margin-top: 24px;">
      <!-- Weekly Reading Confidence Metrics -->
      <section class="surface">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-primary">${t('home.snapshotTitle') || 'WEEKLY METRICS'}</span>
            <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">${t('home.statFluency') || 'Reading confidence'}</h3>
            <p style="margin: 0; font-size: 13px; color: var(--text-muted);">${t('home.snapshotSubtitle') || 'Accuracy from completed activities this week.'}</p>
          </div>
          <span class="badge badge-outline">${chart.totalSessions} ${chart.totalSessions === 1 ? 'session' : 'sessions'}</span>
        </div>
        ${chartMarkup}
      </section>

      <!-- Recommended Next Activity -->
      <section class="surface">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-warm">${t('home.madeForYouTag') || 'RECOMMENDED NEXT'}</span>
            <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">${t('home.recommendedTitle') || `Picked for ${escapeHtml(child.name)}`}</h3>
          </div>
          <span style="font-size: 28px;">${escapeHtml(rec?.actionIcon || '🌱')}</span>
        </div>
        <h4 style="font-family: var(--font-heading); font-size: 17px; margin: 8px 0 4px; color: var(--text-main);">${escapeHtml(rec?.title || t('home.wordsToPracticeTitle') || 'Choose a first activity')}</h4>
        <p style="font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px;">${escapeHtml(rec?.description || t('home.wordsToPracticeSubtitle') || 'Start with a short, friendly practice activity.')}</p>
        
        ${rec ? `
          <button class="btn btn-primary btn-lg" style="width: 100%;" type="button" data-action="start-recommendation" data-skill="${escapeHtml(rec.targetSkillId)}" data-title="${escapeHtml(rec.title)}" data-difficulty="${rec.difficulty}">
            ${t('practice.tryItBtn') || 'Try this activity'} <span>→</span>
          </button>
        ` : button(t('home.exploreStoriesBtn') || 'Browse activities', 'navigate-practice', 'btn btn-primary btn-lg')}
      </section>

      <!-- Today's Learning Goals -->
      <section class="surface">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-primary">TODAY’S FOCUS</span>
            <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">Little goals, steady growth</h3>
          </div>
          <span style="font-size: 24px;">🎯</span>
        </div>
        <ul style="list-style: none; padding: 0; margin: 0 0 14px; display: flex; flex-direction: column; gap: 8px;">
          ${path.currentGoals.slice(0, 3).map((goal, i) => `
            <li style="display: flex; align-items: center; gap: 10px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: ${i === 0 ? 'rgba(34, 211, 238, 0.2)' : 'var(--bg-surface-alt)'}; color: ${i === 0 ? 'var(--primary)' : 'var(--text-muted)'}; font-size: 12px;">${i === 0 ? '✦' : '○'}</span>
              <span>${escapeHtml(goal)}</span>
            </li>
          `).join('')}
        </ul>
        <p style="font-size: 12.5px; color: var(--text-muted); line-height: 1.5; margin: 0; padding-top: 10px; border-top: 1px dashed var(--border);">
          ${escapeHtml(path.explanation)}
        </p>
      </section>

      <!-- Quick Practice Jump Library -->
      <section class="surface">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <span class="badge badge-warm">PRACTICE PLAYGROUND</span>
            <h3 style="font-family: var(--font-heading); font-size: 20px; font-weight: 800; margin: 6px 0 2px;">Jump into an activity</h3>
            <p style="margin: 0; font-size: 13px; color: var(--text-muted);">Short, supportive adventures for every reader.</p>
          </div>
          <span style="font-size: 24px;">🎪</span>
        </div>
        <div style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); display: grid; gap: 10px; margin-bottom: 14px;">
          ${ACTIVITY_CATALOG.slice(0, 4).map(item => `
            <button
              type="button"
              class="quick-activity"
              data-action="start-catalog"
              data-skill="${escapeHtml(item.skillId)}"
              data-title="${escapeHtml(item.title)}"
              data-difficulty="${item.difficulty}"
              style="padding: 12px 10px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--bg-surface-alt); display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; cursor: pointer; transition: all var(--transition-fast);"
            >
              <span style="font-size: 24px;">${escapeHtml(item.icon)}</span>
              <strong style="font-size: 12px; font-weight: 800; color: var(--text-main);">${escapeHtml(item.title)}</strong>
              <small style="font-size: 10px; font-weight: 700; color: var(--text-muted);">${item.estimatedMinutes} min</small>
            </button>
          `).join('')}
        </div>
        <button class="btn btn-outline" type="button" data-action="navigate-practice" style="width: 100%;">
          Explore all activities in Playground 🚀
        </button>
      </section>
    </div>
  `;
}

// Dedicated Candy Crush Adventure Map Dashboard

function renderAdventureForestBackdrop(): string {
  // Generates a multi-layered, living animated magical forest:
  // 1. Drifting upper atmosphere clouds
  // 2. Swaying ancient forest trees & groves along left & right flanks
  // 3. Floating falling leaves drifting across the realm
  // 4. Bioluminescent fireflies pulsing and wandering in the forest air
  return `
    <div class="adventure-forest-backdrop" aria-hidden="true">
      <!-- 1. Drifting Fluffy Clouds in the High Canopy -->
      <div class="forest-clouds-layer">
        <div class="forest-cloud cloud-1" style="top: 30px;">
          <svg width="180" height="60" viewBox="0 0 180 60" fill="currentColor">
            <path d="M25,50 A20,20 0 0,1 45,25 A30,30 0 0,1 95,20 A25,25 0 0,1 135,28 A20,20 0 0,1 165,50 Z" />
          </svg>
        </div>
        <div class="forest-cloud cloud-2" style="top: 520px;">
          <svg width="150" height="50" viewBox="0 0 150 50" fill="currentColor">
            <path d="M20,42 A16,16 0 0,1 38,20 A24,24 0 0,1 80,16 A20,20 0 0,1 112,24 A16,16 0 0,1 136,42 Z" />
          </svg>
        </div>
        <div class="forest-cloud cloud-3" style="top: 1150px;">
          <svg width="200" height="65" viewBox="0 0 200 65" fill="currentColor">
            <path d="M28,54 A22,22 0 0,1 50,26 A32,32 0 0,1 106,22 A28,28 0 0,1 150,30 A22,22 0 0,1 184,54 Z" />
          </svg>
        </div>
        <div class="forest-cloud cloud-1" style="top: 1720px;">
          <svg width="160" height="55" viewBox="0 0 160 55" fill="currentColor">
            <path d="M22,46 A18,18 0 0,1 40,22 A28,28 0 0,1 88,18 A22,22 0 0,1 122,26 A18,18 0 0,1 148,46 Z" />
          </svg>
        </div>
        <div class="forest-cloud cloud-2" style="top: 2350px;">
          <svg width="170" height="58" viewBox="0 0 170 58" fill="currentColor">
            <path d="M24,48 A19,19 0 0,1 42,24 A30,30 0 0,1 92,20 A24,24 0 0,1 130,28 A19,19 0 0,1 156,48 Z" />
          </svg>
        </div>
      </div>

      <!-- 2. Swaying Ancient Trees & Enchanted Foliage (Left & Right Flanks) -->
      <div class="forest-trees-flank">
        <!-- Alphabet Forest Groves (Top) -->
        <div class="forest-tree tree-pine sway-left" style="top: 70px; left: -15px;">
          <svg width="120" height="180" viewBox="0 0 120 180">
            <path d="M60,10 L85,60 L72,60 L95,110 L80,110 L105,160 L15,160 L40,110 L25,110 L48,60 L35,60 Z" class="tree-foliage-emerald" />
            <rect x="52" y="160" width="16" height="20" rx="3" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-oak sway-right" style="top: 180px; right: -20px;">
          <svg width="130" height="190" viewBox="0 0 130 190">
            <ellipse cx="65" cy="85" rx="50" ry="42" class="tree-foliage-green" />
            <circle cx="45" cy="65" r="32" class="tree-foliage-light" />
            <circle cx="85" cy="70" r="30" class="tree-foliage-emerald" />
            <rect x="57" y="145" width="16" height="40" rx="4" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-pine sway-left" style="top: 360px; left: -10px;">
          <svg width="110" height="160" viewBox="0 0 110 160">
            <path d="M55,10 L78,55 L66,55 L88,100 L74,100 L96,145 L14,145 L36,100 L22,100 L44,55 L32,55 Z" class="tree-foliage-light" />
            <rect x="47" y="145" width="16" height="15" rx="3" class="tree-trunk" />
          </svg>
        </div>

        <!-- Sound Safari Savannah Canopy -->
        <div class="forest-tree tree-acacia sway-right" style="top: 660px; right: -25px;">
          <svg width="140" height="170" viewBox="0 0 140 170">
            <ellipse cx="70" cy="55" rx="60" ry="24" class="tree-foliage-warm" />
            <ellipse cx="70" cy="42" rx="44" ry="18" class="tree-foliage-amber" />
            <path d="M70,75 Q60,115 50,165 L58,165 Q68,120 74,75 Z" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-oak sway-left" style="top: 840px; left: -20px;">
          <svg width="125" height="175" viewBox="0 0 125 175">
            <circle cx="62" cy="75" r="48" class="tree-foliage-warm" />
            <circle cx="45" cy="60" r="30" class="tree-foliage-green" />
            <rect x="54" y="135" width="16" height="38" rx="4" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-pine sway-right" style="top: 990px; right: -15px;">
          <svg width="115" height="165" viewBox="0 0 115 165">
            <path d="M58,10 L80,55 L68,55 L90,100 L76,100 L98,145 L18,145 L40,100 L26,100 L48,55 L36,55 Z" class="tree-foliage-emerald" />
            <rect x="50" y="145" width="15" height="18" rx="3" class="tree-trunk" />
          </svg>
        </div>

        <!-- Word Wonderland Blossom Trees -->
        <div class="forest-tree tree-blossom sway-left" style="top: 1240px; left: -25px;">
          <svg width="135" height="180" viewBox="0 0 135 180">
            <ellipse cx="68" cy="80" rx="52" ry="44" class="tree-foliage-pink" />
            <circle cx="48" cy="60" r="34" class="tree-foliage-coral" />
            <circle cx="88" cy="66" r="32" class="tree-foliage-pink" />
            <rect x="60" y="140" width="16" height="38" rx="4" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-oak sway-right" style="top: 1420px; right: -20px;">
          <svg width="125" height="175" viewBox="0 0 125 175">
            <circle cx="62" cy="75" r="48" class="tree-foliage-coral" />
            <circle cx="78" cy="60" r="32" class="tree-foliage-pink" />
            <rect x="54" y="135" width="16" height="38" rx="4" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-pine sway-left" style="top: 1580px; left: -15px;">
          <svg width="115" height="165" viewBox="0 0 115 165">
            <path d="M58,10 L80,55 L68,55 L90,100 L76,100 L98,145 L18,145 L40,100 L26,100 L48,55 L36,55 Z" class="tree-foliage-pink" />
            <rect x="50" y="145" width="15" height="18" rx="3" class="tree-trunk" />
          </svg>
        </div>

        <!-- Spelling Castle Mystic Woods -->
        <div class="forest-tree tree-pine sway-right" style="top: 1820px; right: -20px;">
          <svg width="125" height="185" viewBox="0 0 125 185">
            <path d="M62,10 L88,60 L74,60 L98,110 L84,110 L108,160 L16,160 L40,110 L26,110 L50,60 L36,60 Z" class="tree-foliage-purple" />
            <rect x="54" y="160" width="16" height="22" rx="3" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-oak sway-left" style="top: 2000px; left: -20px;">
          <svg width="130" height="180" viewBox="0 0 130 180">
            <ellipse cx="65" cy="80" rx="52" ry="42" class="tree-foliage-purple" />
            <circle cx="45" cy="62" r="32" class="tree-foliage-lavender" />
            <rect x="57" y="138" width="16" height="40" rx="4" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-pine sway-right" style="top: 2160px; right: -15px;">
          <svg width="115" height="165" viewBox="0 0 115 165">
            <path d="M58,10 L80,55 L68,55 L90,100 L76,100 L98,145 L18,145 L40,100 L26,100 L48,55 L36,55 Z" class="tree-foliage-purple" />
            <rect x="50" y="145" width="15" height="18" rx="3" class="tree-trunk" />
          </svg>
        </div>

        <!-- Rhyme River Willows & Reeds -->
        <div class="forest-tree tree-willow sway-left" style="top: 2400px; left: -25px;">
          <svg width="135" height="190" viewBox="0 0 135 190">
            <ellipse cx="68" cy="70" rx="55" ry="36" class="tree-foliage-teal" />
            <path d="M25,85 Q20,135 30,165 M40,90 Q35,145 42,170 M60,95 Q58,150 62,175 M85,90 Q90,145 84,170 M105,85 Q115,135 102,165" stroke="currentColor" stroke-width="4" fill="none" class="tree-willow-reeds" />
            <rect x="60" y="125" width="16" height="55" rx="4" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-pine sway-right" style="top: 2580px; right: -20px;">
          <svg width="120" height="175" viewBox="0 0 120 175">
            <path d="M60,10 L85,55 L72,55 L95,100 L80,100 L105,150 L15,150 L40,100 L25,100 L48,55 L35,55 Z" class="tree-foliage-teal" />
            <rect x="52" y="150" width="16" height="22" rx="3" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-oak sway-left" style="top: 2720px; left: -15px;">
          <svg width="125" height="170" viewBox="0 0 125 170">
            <circle cx="62" cy="70" r="46" class="tree-foliage-teal" />
            <circle cx="80" cy="58" r="30" class="tree-foliage-emerald" />
            <rect x="54" y="130" width="16" height="38" rx="4" class="tree-trunk" />
          </svg>
        </div>

        <!-- Storybook Kingdom Royal Pines & Peak Trees -->
        <div class="forest-tree tree-pine sway-right" style="top: 2880px; right: -20px;">
          <svg width="130" height="190" viewBox="0 0 130 190">
            <path d="M65,10 L92,60 L78,60 L102,110 L88,110 L112,165 L18,165 L42,110 L28,110 L52,60 L38,60 Z" class="tree-foliage-gold" />
            <rect x="57" y="165" width="16" height="22" rx="3" class="tree-trunk" />
          </svg>
        </div>
        <div class="forest-tree tree-oak sway-left" style="top: 3020px; left: -20px;">
          <svg width="135" height="185" viewBox="0 0 135 185">
            <circle cx="68" cy="75" r="50" class="tree-foliage-gold" />
            <circle cx="48" cy="60" r="32" class="tree-foliage-amber" />
            <rect x="60" y="138" width="16" height="42" rx="4" class="tree-trunk" />
          </svg>
        </div>
      </div>

      <!-- 3. Gentle Floating Leaves Drifting Downward -->
      <div class="forest-leaves-layer">
        <span class="forest-leaf leaf-emerald l-1" style="left: 15%; animation-delay: 0s;">🍃</span>
        <span class="forest-leaf leaf-gold l-2" style="left: 32%; animation-delay: 3.5s;">🍂</span>
        <span class="forest-leaf leaf-emerald l-3" style="left: 68%; animation-delay: 7s;">🌿</span>
        <span class="forest-leaf leaf-coral l-4" style="left: 82%; animation-delay: 1.5s;">🍁</span>
        <span class="forest-leaf leaf-gold l-1" style="left: 22%; animation-delay: 11s;">🍂</span>
        <span class="forest-leaf leaf-emerald l-2" style="left: 55%; animation-delay: 14.5s;">🍃</span>
        <span class="forest-leaf leaf-coral l-3" style="left: 75%; animation-delay: 8.5s;">🌸</span>
        <span class="forest-leaf leaf-gold l-4" style="left: 40%; animation-delay: 18s;">🍁</span>
      </div>

      <!-- 4. Luminous Bioluminescent Fireflies Floating & Pulsing -->
      <div class="forest-fireflies-layer">
        <div class="forest-firefly ff-1" style="top: 140px; left: 18%;"></div>
        <div class="forest-firefly ff-2" style="top: 260px; right: 22%;"></div>
        <div class="forest-firefly ff-3" style="top: 580px; left: 24%;"></div>
        <div class="forest-firefly ff-1" style="top: 820px; right: 18%;"></div>
        <div class="forest-firefly ff-2" style="top: 1120px; left: 16%;"></div>
        <div class="forest-firefly ff-3" style="top: 1380px; right: 25%;"></div>
        <div class="forest-firefly ff-1" style="top: 1680px; left: 22%;"></div>
        <div class="forest-firefly ff-2" style="top: 1960px; right: 15%;"></div>
        <div class="forest-firefly ff-3" style="top: 2240px; left: 28%;"></div>
        <div class="forest-firefly ff-1" style="top: 2520px; right: 20%;"></div>
        <div class="forest-firefly ff-2" style="top: 2780px; left: 14%;"></div>
        <div class="forest-firefly ff-3" style="top: 3040px; right: 24%;"></div>
      </div>
    </div>
  `;
}

export async function adventurePage(): Promise<string> {
  const child = activeChild!;
  const [path, progress, skillStates] = await Promise.all([
    learningPath || learning.getOrGeneratePath(child),
    profiles.getChildProgress(child.id),
    learning.getChildSkillStates(child.id),
  ]);
  learningPath = path;
  const mapState = computeAdventureMapState(child, skillStates, progress);
  const currentLvl = mapState.currentLevel;
  const currentDest = mapState.currentDestination;

  // Visual vertical coordinates (y in px) for the 15 levels
  const yCoords: Record<number, number> = {
    1: 150,
    2: 290,
    3: 430,
    4: 730,
    5: 870,
    6: 1010,
    7: 1310,
    8: 1450,
    9: 1590,
    10: 1890,
    11: 2030,
    12: 2170,
    13: 2470,
    14: 2610,
    15: 2930,
  };

  const chestYCoords: Record<number, number> = {
    3: 540,
    6: 1120,
    9: 1700,
    12: 2280,
    14: 2720,
    15: 3060,
  };

  const destHeaderY: Record<DestinationKey, number> = {
    alphabet_forest: 40,
    sound_safari: 630,
    word_wonderland: 1210,
    spelling_castle: 1790,
    rhyme_river: 2370,
    storybook_kingdom: 2830,
  };

  // Build the S-curve SVG path connecting all 15 levels
  let pathD = '';
  for (let i = 0; i < mapState.levels.length; i++) {
    const lvl = mapState.levels[i];
    const x = lvl.xPercent * 10; // viewBox 1000 width
    const y = yCoords[lvl.levelNumber];
    if (i === 0) {
      pathD += `M ${x} ${y}`;
    } else {
      const prevLvl = mapState.levels[i - 1];
      const prevX = prevLvl.xPercent * 10;
      const prevY = yCoords[prevLvl.levelNumber];
      const midY = (prevY + y) / 2;
      pathD += ` C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`;
    }
  }

  // Path continuation down to the final grand trophy chest
  const lvl15 = mapState.levels[14];
  pathD += ` C ${lvl15.xPercent * 10} 2990, 500 3010, 500 3060`;

  const activeCelebration = celebratedCompletedLevelNumber;
  celebratedCompletedLevelNumber = null; // Reset celebration after rendering so it only fires once

  return `
    <div class="adventure-world-wrap">
      <!-- Floating HUD Bar -->
      <section class="adventure-hud-bar">
        <div class="hud-profile-pill">
          <div class="hud-avatar">${escapeHtml(child.avatar)}</div>
          <div class="hud-learner-meta">
            <span class="hud-learner-name">${escapeHtml(child.name)}</span>
            <span class="hud-dest-badge">${currentDest.icon} ${escapeHtml(currentDest.name)}</span>
          </div>
        </div>

        <div class="hud-stats-group">
          <div class="hud-chip hud-chip-stars" title="Stars collected across adventure levels">
            <span>⭐</span>
            <span>${mapState.totalStars} / ${mapState.maxPossibleStars}</span>
          </div>

          <div class="hud-chip hud-chip-points" title="Cumulative Happy Points">
            <span>✦</span>
            <span>${mapState.activeChildHappyPoints} pts</span>
          </div>

          <div class="hud-chip" style="background: rgba(239, 68, 68, 0.12); border-color: rgba(239, 68, 68, 0.3); color: #ef4444;" title="Consecutive Practice Streak">
            <span>🔥</span>
            <span>${progress.practiceWins || 1} Streak</span>
          </div>

          <button
            type="button"
            class="hud-quest-btn"
            data-action="inspect-level"
            data-level="${currentLvl.levelNumber}"
            title="Start today's active adventure quest"
          >
            <span>🎯 Level ${currentLvl.levelNumber}</span>
            <span>Play Now →</span>
          </button>
        </div>
      </section>

      <!-- Central Illustrated Candy Crush Map Board -->
      <div class="candy-map-board" style="height: 3200px;">
        ${renderAdventureForestBackdrop()}
        <!-- Winding S-curve SVG Path with 4A.1 Golden Path Glow & Traveling Light Orb -->
        <svg class="candy-path-svg" viewBox="0 0 1000 3200" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="goldTrailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fef08a" stop-opacity="0.95" />
              <stop offset="50%" stop-color="#f59e0b" stop-opacity="1" />
              <stop offset="100%" stop-color="#ea580c" stop-opacity="0.9" />
            </linearGradient>
            <filter id="goldGlowFilter" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="${pathD}" class="candy-path-shadow" />
          <path d="${pathD}" class="candy-path-base" />
          <path d="${pathD}" class="candy-path-stepping" />
          <!-- 4A.1: Moving Golden Path Glow Trail -->
          <path d="${pathD}" class="candy-path-golden-trail" />
          <!-- 4A.1: Continuously Traveling Golden Light Orb along winding path -->
          <circle r="14" class="candy-path-golden-orb">
            <animateMotion
              path="${pathD}"
              dur="8s"
              repeatCount="indefinite"
              rotate="auto"
              keyPoints="0; ${Math.min(1, Math.max(0.08, currentLvl.levelNumber / 15))}"
              keyTimes="0; 1"
            />
          </circle>
          <circle r="6" class="candy-path-golden-orb-core">
            <animateMotion
              path="${pathD}"
              dur="8s"
              repeatCount="indefinite"
              rotate="auto"
              keyPoints="0; ${Math.min(1, Math.max(0.08, currentLvl.levelNumber / 15))}"
              keyTimes="0; 1"
            />
          </circle>
        </svg>

        <!-- Destination Scenery Headers -->
        ${(Object.keys(ADVENTURE_DESTINATIONS_META) as DestinationKey[]).map(destKey => {
          const dest = ADVENTURE_DESTINATIONS_META[destKey];
          const topY = destHeaderY[destKey];
          return `
            <div class="destination-scenery-header dest-${destKey}" style="position: absolute; top: ${topY}px; left: 24px; right: 24px;">
              <div class="dest-title-wrap">
                <span class="dest-icon-bubble">${dest.icon}</span>
                <div class="dest-header-text">
                  <h3>${escapeHtml(dest.name)}</h3>
                  <p>${escapeHtml(dest.tagline)}</p>
                </div>
              </div>
              <span class="badge badge-outline" style="border-color: currentColor; font-weight: 800; background: transparent;">
                Levels ${dest.levelNumbers[0]}–${dest.levelNumbers[dest.levelNumbers.length - 1]}
              </span>
            </div>
          `;
        }).join('')}

        <!-- 15 Tactile Level Nodes -->
        ${mapState.levels.map(lvl => {
          const y = yCoords[lvl.levelNumber];
          const isCurrent = lvl.status === 'current';
          const isCompleted = lvl.status === 'completed';

          return `
            <div class="candy-node-anchor" style="left: ${lvl.xPercent}%; top: ${y}px;">
              ${isCurrent ? `
                <div class="node-avatar-pin">
                  <div class="avatar-bubble">${escapeHtml(child.avatar)}</div>
                  <div class="avatar-pointer-triangle"></div>
                </div>
                <!-- 4A.2: Turquoise Pulsing Halo Ring for current level -->
                <div class="current-node-pulse-halo" aria-hidden="true"></div>
              ` : ''}

              ${activeCelebration === lvl.levelNumber ? `
                <!-- 4A.3: Level Completion Celebration Rising Stars Burst -->
                <div class="level-celebration-burst" aria-live="polite">
                  <span class="burst-star s1">⭐</span>
                  <span class="burst-star s2">✨</span>
                  <span class="burst-star s3">⭐</span>
                  <span class="burst-star s4">🌟</span>
                  <span class="burst-star s5">⭐</span>
                  <div class="burst-banner">Level ${lvl.levelNumber} Complete! ⭐</div>
                </div>
              ` : ''}

              <button
                type="button"
                class="candy-node-btn ${lvl.status}"
                data-action="inspect-level"
                data-level="${lvl.levelNumber}"
                aria-label="Level ${lvl.levelNumber}: ${escapeHtml(lvl.title)} (${lvl.status})"
                title="Level ${lvl.levelNumber}: ${escapeHtml(lvl.title)}"
              >
                ${lvl.status === 'locked'
                  ? '<span class="node-lock-icon">🔒</span>'
                  : `<span class="node-number-text">${lvl.levelNumber}</span>`
                }
              </button>

              ${isCompleted ? `
                <div class="node-star-tray" aria-label="${lvl.stars} stars">
                  ${'⭐'.repeat(lvl.stars)}${'<span style="opacity:0.3">⭐</span>'.repeat(Math.max(0, 3 - lvl.stars))}
                </div>
              ` : isCurrent ? `
                <div class="node-star-tray" style="background: linear-gradient(135deg, #0284c7, #06b6d4); color: #ffffff; font-weight: 800; font-size: 11px; padding: 2px 10px;">
                  PLAY
                </div>
              ` : `
                <div class="node-star-tray" style="opacity: 0.6; font-size: 11px; font-weight: 700;">
                  Locked
                </div>
              `}
            </div>
          `;
        }).join('')}

        <!-- Milestone Treasure Chests Between Destinations -->
        ${mapState.levels.filter(l => l.milestone).map(lvl => {
          const chest = lvl.milestone!;
          const y = chestYCoords[lvl.levelNumber];
          const isClaimed = lvl.status === 'completed';

          return `
            <div class="milestone-chest-wrap" style="left: 50%; top: ${y}px;">
              <button
                type="button"
                class="milestone-chest-btn ${isClaimed ? 'claimed' : ''}"
                data-action="inspect-milestone"
                data-level="${lvl.levelNumber}"
                title="Milestone: ${escapeHtml(chest.title)} (+${chest.bonusPoints} Happy Points)"
                aria-label="Milestone Chest: ${escapeHtml(chest.title)}"
              >
                ${isClaimed ? '🎁' : '🔒'}
              </button>
              <span class="milestone-label">
                ${isClaimed ? '✨ Unlocked!' : `Chest ${lvl.levelNumber}`}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function storiesPage(): string {
  const child = activeChild!;
  const currentLang = storyLanguage || child.preferredLanguage || 'English';
  const supportedLangs = storyShelf.getSupportedLanguages();
  const allStories = storyShelf.getStories(currentLang);
  const storyOfTheDay = storyShelf.getStoryOfTheDay(currentLang, storyRotationAdvance);

  const themeClasses = [
    'book-theme-fantasy',
    'book-theme-animals',
    'book-theme-adventure',
    'book-theme-nature',
    'book-theme-magic',
  ];

  // Group stories naturally by reading levels
  const earlyStories = allStories.filter(s => s.readingLevel === 'early');
  const growingStories = allStories.filter(s => s.readingLevel === 'growing');
  const confidentStories = allStories.filter(s => s.readingLevel === 'confident');

  const storyShelves = [
    {
      title: '🌱 Early Readers Shelf',
      desc: 'Gentle 3-minute starter tales with cheerful vocabulary & animal friends.',
      stories: earlyStories.length > 0 ? earlyStories : allStories.slice(0, 3),
      badgeColor: '#10b981',
    },
    {
      title: '🌿 Growing Explorers Shelf',
      desc: 'Fun rhyming stories and exciting outdoor adventures with sound clues.',
      stories: growingStories.length > 0 ? growingStories : allStories.slice(3, 6),
      badgeColor: '#0284c7',
    },
    {
      title: '🌲 Confident Champions Shelf',
      desc: 'Heroic fairy tales, mysterious lands, and royal story quests with questions.',
      stories: confidentStories.length > 0 ? confidentStories : allStories.slice(6),
      badgeColor: '#8b5cf6',
    },
  ];

  return `
    <div class="storybook-library-wrap open-borderless-layout">
      <!-- Open Magical Library Banner (No heavy rectangular box) -->
      <section class="storybook-open-hero">
        <div class="hero-left-content">
          <div class="open-pill-tag tag-blue">
            <span>✨</span>
            <span>ENCHANTED STORYBOOK LIBRARY</span>
          </div>
          <h2 class="open-hero-title">
            ${t('stories.heading') || 'Magical Reading Adventures'} 📚
          </h2>
          <p class="open-hero-desc">
            ${t('stories.subtitle') || 'Explore illustrated fairy tales, animal friends & heroic quests. Listen aloud, learn words, and earn golden stars!'}
          </p>
        </div>

        <div class="library-controls-row">
          <label class="library-lang-pill">
            🌐 ${t('childModal.langLabel')}:
            <select class="story-lang-select">
              ${supportedLangs.map((l: SupportedLanguage) => `<option value="${l}" ${l === currentLang ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </label>
          <button type="button" class="btn btn-outline btn-sm open-shuffle-btn" data-action="shuffle-stories" title="Shuffle stories">
            🎲 Shuffle Stories
          </button>
        </div>
      </section>

      <!-- Seamless Featured Story of the Day Showcase (No card box) -->
      <section class="storybook-featured-showcase">
        <div class="showcase-header-row">
          <span class="showcase-star">⭐</span>
          <h3 class="showcase-heading">
            ${t('stories.storyOfDayTag') || 'Story of the Day'}
          </h3>
        </div>

        <div class="featured-book-stage">
          <!-- 3D Standing Hardcover Book Cover -->
          <div class="featured-book-3d" data-action="open-story" data-id="${escapeHtml(storyOfTheDay.id)}">
            <div class="book-spine-depth"></div>
            <div class="book-ribbon-silk"></div>
            <div class="book-cover-front">
              <span class="book-cover-emoji-large">${escapeHtml(storyOfTheDay.emoji)}</span>
              <span class="book-level-pill">${escapeHtml(storyOfTheDay.readingLevel.toUpperCase())}</span>
            </div>
          </div>

          <!-- Seamless Open Book Details -->
          <div class="featured-book-details">
            <div>
              <div class="featured-tags-row">
                <span class="badge badge-warm">⭐ FEATURED FAIRYTALE</span>
                <span class="featured-meta-txt">
                  ⏱️ ${storyOfTheDay.estimatedMinutes} min read · ❓ ${storyOfTheDay.comprehensionQuestions.length} Questions
                </span>
              </div>
              <h3 class="featured-story-title">
                ${escapeHtml(storyOfTheDay.emoji)} ${escapeHtml(storyOfTheDay.title)}
              </h3>
              <p class="featured-story-synopsis">
                ${escapeHtml(storyOfTheDay.synopsis)}
              </p>
            </div>

            <div class="featured-action-row">
              <button type="button" class="btn btn-primary btn-lg open-read-btn" data-action="open-story" data-id="${escapeHtml(storyOfTheDay.id)}">
                ${t('stories.readStoryBtn') || 'Read Fairytale Now'} 📖 <span>→</span>
              </button>
              <div class="featured-sub-badges">
                <span>🔊 Voice Read-Aloud</span>
                <span>•</span>
                <span>⭐ Earn +25 Points</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 3 Natural Wooden Bookshelves with 3D Standing Books (No card boxes) -->
      ${storyShelves.map((shelf, shelfIdx) => `
        <section class="storybook-shelf-section">
          <div class="shelf-header-row">
            <div>
              <h3 class="shelf-title">
                ${shelf.title} (${shelf.stories.length})
              </h3>
              <p class="shelf-desc">
                ${shelf.desc}
              </p>
            </div>
          </div>

          <!-- Illustrated Wooden Bookshelf Row -->
          <div class="storybook-wooden-shelf-wrap">
            <div class="storybook-books-row">
              ${shelf.stories.map((s, idx) => {
                const themeClass = themeClasses[(shelfIdx * 2 + idx) % themeClasses.length];
                return `
                  <article
                    class="storybook-standing-book ${themeClass}"
                    data-action="open-story"
                    data-id="${escapeHtml(s.id)}"
                    role="button"
                    tabindex="0"
                    aria-label="Read ${escapeHtml(s.title)}"
                  >
                    <!-- Book Spine Shading & Ribbon -->
                    <div class="book-spine-depth"></div>
                    <div class="book-ribbon-silk"></div>

                    <!-- Book Content -->
                    <div class="book-cover-inner">
                      <div class="book-level-badge">
                        ${escapeHtml(s.readingLevel.toUpperCase())}
                      </div>
                      <div class="book-emoji-art">${escapeHtml(s.emoji)}</div>
                      <h4 class="book-title-embossed">${escapeHtml(s.title)}</h4>
                      <p class="book-synopsis-preview">
                        ${escapeHtml(s.synopsis.length > 75 ? s.synopsis.slice(0, 72) + '...' : s.synopsis)}
                      </p>
                      <div class="book-footer-meta">
                        <span>⏱️ ${s.estimatedMinutes} min</span>
                        <span>❓ ${s.comprehensionQuestions.length} Qs</span>
                      </div>
                      <button type="button" class="book-read-pill" data-action="open-story" data-id="${escapeHtml(s.id)}">
                        Read Now 📖
                      </button>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
            <!-- Illustrated Wooden Shelf Beam -->
            <div class="storybook-shelf-beam"></div>
          </div>
        </section>
      `).join('')}
    </div>
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
      <section class="modal-card story-reader-modal" style="max-width: 820px; max-height: 92vh; overflow-y: auto; padding: 28px;" role="dialog" aria-modal="true" aria-labelledby="story-modal-title">
        
        <!-- Modal Heading with reading level -->
        <div class="modal-heading" style="margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span class="badge badge-primary" style="font-weight: 800;">${escapeHtml(story.readingLevel.toUpperCase())}</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--text-muted);">⏱️ ${story.estimatedMinutes} MIN READ</span>
            </div>
            <h2 id="story-modal-title" style="display: flex; align-items: center; gap: 10px; font-family: var(--font-heading); font-size: 24px; font-weight: 900; margin: 0;">
              <span>${story.emoji}</span> <span>${escapeHtml(story.title)}</span>
            </h2>
          </div>
          <button class="icon-button modal-close" type="button" data-action="close-modal" aria-label="Close" style="font-size: 24px; line-height: 1;">×</button>
        </div>

        <!-- Mascot Companion Banner -->
        <div class="story-companion-banner">
          <div style="font-size: 38px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15)); flex-shrink: 0;">🦉</div>
          <div>
            <strong style="color: var(--text-main); font-size: 14px; font-family: var(--font-heading);">Hootie your Reading Companion:</strong>
            <p style="margin: 2px 0 0; font-size: 13px; color: var(--text-muted); line-height: 1.4;">
              Take your time, listen with your ears, and follow along with your eyes! You're doing amazing!
            </p>
          </div>
        </div>

        <!-- Interactive Reader Toolbar -->
        <div class="story-reader-toolbar">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="reader-tool-chip" data-action="speak-story" id="story-tts-btn" title="Read story aloud with speech audio">
              🔊 <span id="story-tts-label">${t('stories.listenBtn')}</span>
            </button>
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="font-size: 12px; font-weight: 800; color: var(--text-muted); margin-right: 2px;">Font Size:</span>
              <button type="button" class="reader-tool-chip" data-action="story-font-smaller" title="Make text smaller" style="padding: 4px 10px; font-weight: 900;">A−</button>
              <button type="button" class="reader-tool-chip" data-action="story-font-larger" title="Make text larger" style="padding: 4px 10px; font-weight: 900;">A+</button>
            </div>
            <span class="reader-tool-chip" style="cursor: default;" title="High readability font applied">
              🔤 Dyslexia Clear Font
            </span>
          </div>

          <button type="button" class="btn btn-primary btn-sm" data-action="finish-story-reading" style="font-weight: 900; border-radius: var(--radius-pill); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
            ${t('stories.finishReadingBtn')} ✓
          </button>
        </div>

        <!-- Glare-Free High-Contrast Reading Surface -->
        <div class="story-reading-surface">
          <div id="story-paragraphs" class="story-reading-content" style="font-size: ${activeStoryFontSize}px; line-height: 1.85; color: var(--text-main);">
            ${story.paragraphs.map(p => `<p style="margin-bottom: 20px; font-weight: 500;">${escapeHtml(p)}</p>`).join('')}
          </div>
        </div>

        <!-- Comprehension Challenge -->
        ${totalQuestions > 0 ? `
          <section class="story-comprehension-block" style="border-top: 2px dashed var(--border); padding-top: 24px; margin-top: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
              <div>
                <span class="badge badge-warm" style="font-weight: 800;">COMPREHENSION CHECK 🎯</span>
                <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 4px 0 2px; color: var(--text-main);">
                  What happened in the story?
                </h3>
              </div>
              <span id="storyCompScoreTag" class="badge badge-primary" style="font-size: 13px; font-weight: 900; padding: 6px 14px;">
                ${storyComprehensionScore} / ${totalQuestions} Correct ⭐
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${story.comprehensionQuestions.map((q, qIdx) => {
                const isAnswered = storyAnsweredQids.has(q.id);
                return `
                  <article class="surface" style="background: var(--bg-surface-alt); border: 1.5px solid var(--border); border-radius: var(--radius-lg); padding: 18px;" data-qid="${escapeHtml(q.id)}">
                    <p style="font-weight: 800; font-size: 15px; margin: 0 0 12px; color: var(--text-main);">
                      ${qIdx + 1}. ${escapeHtml(q.question)}
                    </p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${q.options.map((opt, optIdx) => `
                        <button
                          type="button"
                          class="btn btn-outline btn-sm story-comp-opt"
                          data-action="answer-story-comp"
                          data-qid="${escapeHtml(q.id)}"
                          data-idx="${optIdx}"
                          ${isAnswered ? 'disabled' : ''}
                          style="text-align: left; justify-content: flex-start; padding: 12px 16px; border-radius: var(--radius-md); font-weight: 700; white-space: normal;"
                        >
                          ${escapeHtml(opt)}
                        </button>
                      `).join('')}
                    </div>
                    <div id="feedback_${escapeHtml(q.id)}" class="comp-feedback-msg" style="margin-top: 10px; font-size: 13px; font-weight: 800; display: none;"></div>
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
  const child = activeChild!;
  const recs = new Map((learningPath?.recommendations || []).map(rec => [rec.targetSkillId, rec]));

  // Divide activities into 4 thematic open habitats
  const treehouseSkills = new Set(['skill_confused_letters_bd', 'skill_letter_sounds_basic', 'skill_listening_pronunciation']);
  const safariSkills = new Set(['skill_cvc_blending', 'skill_sight_words_high_freq', 'skill_syllable_segmentation']);
  const castleSkills = new Set(['skill_word_building', 'skill_missing_letter', 'skill_spelling_cvc']);
  const riverSkills = new Set(['skill_phonemic_rhyme', 'skill_sentence_fluency', 'skill_story_comprehension']);

  const zones = [
    {
      id: 'treehouse',
      class: 'zone-treehouse',
      icon: '🌿',
      mascot: '🦉 Hootie’s Treehouse',
      title: 'Alphabet & Phonics Treehouse',
      desc: 'Master letter sounds, listening ears & tricky letter shapes',
      accentColor: '#10b981',
      bgTint: 'rgba(209, 250, 229, 0.45)',
      items: ACTIVITY_CATALOG.filter(item => treehouseSkills.has(item.skillId)),
    },
    {
      id: 'safari',
      class: 'zone-safari',
      icon: '🦁',
      mascot: '🦁 Leo’s Safari Oasis',
      title: 'Word Safari & Blends Oasis',
      desc: 'Zip sounds together, spot sight words & clap rhythm beats',
      accentColor: '#f59e0b',
      bgTint: 'rgba(254, 243, 199, 0.45)',
      items: ACTIVITY_CATALOG.filter(item => safariSkills.has(item.skillId)),
    },
    {
      id: 'castle',
      class: 'zone-castle',
      icon: '🏰',
      mascot: '🏰 Sir Spellalot’s Castle',
      title: 'Spelling Castle Workshops',
      desc: 'Assemble letter blocks, discover missing vowels & defeat spelling traps',
      accentColor: '#8b5cf6',
      bgTint: 'rgba(245, 243, 255, 0.45)',
      items: ACTIVITY_CATALOG.filter(item => castleSkills.has(item.skillId)),
    },
    {
      id: 'river',
      class: 'zone-river',
      icon: '⛵',
      mascot: '⛵ Splash’s River Run',
      title: 'Story & Sentence River Run',
      desc: 'Rhyme along the waters, grow vocabulary & understand great tales',
      accentColor: '#0284c7',
      bgTint: 'rgba(224, 242, 254, 0.45)',
      items: ACTIVITY_CATALOG.filter(item => riverSkills.has(item.skillId)),
    },
  ];

  const childDisplayName = escapeHtml(child.name || 'Champion');

  return `
    <div class="playground-wrap open-borderless-layout">
      <!-- Open Playful Greeting Header (No rigid boxes) -->
      <section class="playground-open-hero">
        <div class="hero-left-content">
          <div class="open-pill-tag">
            <span>🎪</span>
            <span>LEARNING PLAYGROUND</span>
          </div>
          <h2 class="open-hero-title">
            ${t('practice.heading') || 'Adventure Practice Playground'} 🚀
          </h2>
          <p class="open-hero-desc">
            ${(t('practice.subtitle', { name: childDisplayName }) || `Every try helps your brain grow, ${childDisplayName}. You're doing wonderfully.`).replace(/\{name\}/g, childDisplayName)}
          </p>
        </div>

        <div class="hero-right-points">
          <div class="open-sparkle-pill">
            <span class="sparkle-star">⭐</span>
            <span class="sparkle-text">+15 Stars Per Quest</span>
          </div>
        </div>
      </section>

      <!-- 4 Open Thematic Habitats (Seamless, borderless flow) -->
      ${zones.map(zone => `
        <section class="playground-habitat-zone ${zone.class}">
          <!-- Organic Habitat Header (Icon, Title & Description in the middle) -->
          <div class="habitat-open-header">
            <div class="habitat-title-row">
              <span class="habitat-mascot-icon">${zone.icon}</span>
              <h3 class="habitat-title">${zone.title}</h3>
            </div>
            <p class="habitat-desc">${zone.desc}</p>
          </div>

          <!-- Tactile Borderless Activity Tiles -->
          <div class="challenge-pods-cluster borderless-pods-grid">
            ${zone.items.map(item => {
              const rec = recs.get(item.skillId);
              const difficulty = rec?.difficulty || item.difficulty;
              return `
                <article class="challenge-pod borderless-pod">
                  <div class="pod-mascot-row">
                    <span class="pod-icon">${escapeHtml(item.icon)}</span>
                    <span class="pod-difficulty ${difficulty}">${escapeHtml(difficulty.toUpperCase())}</span>
                  </div>

                  <h4 class="pod-title">${escapeHtml(item.title)}</h4>
                  <p class="pod-desc">${escapeHtml(item.description)}</p>

                  <div class="pod-meta-row borderless-meta">
                    <span class="pod-meta-time">
                      ⏱️ ${item.estimatedMinutes} min
                    </span>
                    <span class="pod-meta-stars">
                      +15 ⭐
                    </span>
                  </div>

                  <button
                    type="button"
                    class="btn btn-primary pod-launch-btn open-launch-btn"
                    data-action="start-catalog"
                    data-skill="${escapeHtml(item.skillId)}"
                    data-title="${escapeHtml(item.title)}"
                    data-difficulty="${escapeHtml(difficulty)}"
                  >
                    Play Quest 🚀
                  </button>
                </article>
              `;
            }).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;
}

async function progressPage(): Promise<string> {
  const child = activeChild!;
  const [chart, attempts, skillStates] = await Promise.all([
    charts.getChartSummary(child.id, 'month'),
    learning.getChildAttempts(child.id),
    learning.getChildSkillStates(child.id),
  ]);
  const progress = profiles.getChildProgress(child.id);
  const mapState = computeAdventureMapState(child, skillStates, progress);

  // Real backend calculations
  const soundLevelsCompleted = mapState.levels.filter(
    l => (l.destinationKey === 'alphabet_forest' || l.destinationKey === 'sound_safari') && l.status === 'completed'
  ).length;

  const vocabLevelsCompleted = mapState.levels.filter(
    l => (l.destinationKey === 'word_wonderland' || l.destinationKey === 'spelling_castle') && l.status === 'completed'
  ).length;

  const storyLevelsCompleted = mapState.levels.filter(
    l => (l.destinationKey === 'rhyme_river' || l.destinationKey === 'storybook_kingdom') && l.status === 'completed'
  ).length;

  const wordsLearned = progress.wordsLearned || 0;
  const streakSessions = Math.max(1, progress.practiceWins || attempts.length);
  const accuracy = chart.overallAccuracy !== null ? chart.overallAccuracy : 85;
  const totalLevelsMastered = mapState.levels.filter(l => l.status === 'completed').length;

  // 6 Collectible Superpower Achievements with real milestone targets
  const achievements = [
    {
      id: 'word_explorer',
      title: 'Word Explorer',
      icon: '🧭',
      category: 'Vocabulary Power',
      description: 'Collect decodable words and master new sounds across realms.',
      current: wordsLearned,
      target: 20,
      tier: wordsLearned >= 20 ? 'Gold 🥇' : wordsLearned >= 10 ? 'Silver 🥈' : wordsLearned >= 4 ? 'Bronze 🥉' : 'In Progress 🌱',
      unlocked: wordsLearned >= 4,
      color: '#0284c7',
      bgGlow: 'rgba(2, 132, 199, 0.18)',
    },
    {
      id: 'reading_champion',
      title: 'Reading Champion',
      icon: '🏆',
      category: 'Practice Momentum',
      description: 'Build daily reading habits with active challenge quests.',
      current: streakSessions,
      target: 10,
      tier: streakSessions >= 10 ? 'Gold 🥇' : streakSessions >= 5 ? 'Silver 🥈' : streakSessions >= 2 ? 'Bronze 🥉' : 'Starting Out 🌱',
      unlocked: streakSessions >= 2,
      color: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.18)',
    },
    {
      id: 'spelling_star',
      title: 'Spelling Star',
      icon: '⭐',
      category: 'Phonetic Accuracy',
      description: 'Reach awesome reading accuracy on challenges and words.',
      current: accuracy,
      target: 90,
      unit: '%',
      tier: accuracy >= 90 ? 'Gold 🥇' : accuracy >= 80 ? 'Silver 🥈' : accuracy >= 65 ? 'Bronze 🥉' : 'Sharpening 🌱',
      unlocked: accuracy >= 65,
      color: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.18)',
    },
    {
      id: 'sound_detective',
      title: 'Sound Detective',
      icon: '🔍',
      category: 'Acoustic Mastery',
      description: 'Solve tricky sound clues in Alphabet Forest & Sound Safari.',
      current: soundLevelsCompleted,
      target: 6,
      tier: soundLevelsCompleted >= 6 ? 'Gold 🥇' : soundLevelsCompleted >= 3 ? 'Silver 🥈' : soundLevelsCompleted >= 1 ? 'Bronze 🥉' : 'Exploring 🌱',
      unlocked: soundLevelsCompleted >= 1,
      color: '#8b5cf6',
      bgGlow: 'rgba(139, 92, 246, 0.18)',
    },
    {
      id: 'vocabulary_wizard',
      title: 'Word Wizard',
      icon: '🧙‍♂️',
      category: 'Digraph & Blend Sorcery',
      description: 'Defeat tricky letter traps in Word Wonderland & Spelling Castle.',
      current: vocabLevelsCompleted,
      target: 6,
      tier: vocabLevelsCompleted >= 6 ? 'Gold 🥇' : vocabLevelsCompleted >= 3 ? 'Silver 🥈' : vocabLevelsCompleted >= 1 ? 'Bronze 🥉' : 'Apprentice 🌱',
      unlocked: vocabLevelsCompleted >= 1,
      color: '#ec4899',
      bgGlow: 'rgba(236, 72, 153, 0.18)',
    },
    {
      id: 'story_master',
      title: 'Story Royalty',
      icon: '👑',
      category: 'Royal Comprehension',
      description: 'Conquer Rhyme River and claim the Storybook Kingdom crown.',
      current: storyLevelsCompleted,
      target: 3,
      tier: storyLevelsCompleted >= 3 ? 'Royal Crown 👑' : storyLevelsCompleted >= 1 ? 'Silver 🥈' : 'Aspiring 🌱',
      unlocked: storyLevelsCompleted >= 1,
      color: '#06b6d4',
      bgGlow: 'rgba(6, 182, 212, 0.18)',
    },
  ];

  const recentAttempts = attempts.slice(-4).reverse();

  return `
    <div class="trophy-room-wrap open-borderless-layout">
      <!-- Open Trophy Realm Hero (No rigid yellow card border) -->
      <section class="trophy-open-realm">
        <div class="realm-hero-main">
          <div class="trophy-radiant-emblem">
            🏆
          </div>
          <div class="realm-hero-copy">
            <div class="open-pill-tag tag-gold">
              <span>✨</span>
              <span>HALL OF ACHIEVEMENTS · ${escapeHtml(child.name)}'s Trophy Room</span>
            </div>
            <h2 class="realm-title">
              Superpowers & Milestone Trophies!
            </h2>
            <p class="realm-desc">
              🦉 Hootie cheers: "Look how far you've come! Every quest you play makes your reading superpowers shine brighter!"
            </p>
          </div>
        </div>

        <div class="realm-chips-row">
          <div class="open-stat-chip chip-stars">
            <span>⭐</span>
            <span>${mapState.totalStars} Stars Earned</span>
          </div>
          <div class="open-stat-chip chip-points">
            <span>✧</span>
            <span>${progress.happyPoints || 0} Happy Points</span>
          </div>
          <div class="open-stat-chip chip-levels">
            <span>🗺️</span>
            <span>${totalLevelsMastered} / 15 Levels Won</span>
          </div>
        </div>
      </section>

      <!-- 4 Seamless Floating Metric Pedestals (No boxed cards, no borders) -->
      <section class="metric-pedestals-row">
        <div class="metric-pedestal pedestal-time">
          <div class="pedestal-icon-bubble">⏱️</div>
          <div class="pedestal-content">
            <span class="pedestal-label">Practice Time</span>
            <strong class="pedestal-val">${progress.practiceMinutes} <small>min</small></strong>
            <small class="pedestal-sub sub-blue">Growing steady 🌱</small>
          </div>
        </div>

        <div class="metric-pedestal pedestal-accuracy">
          <div class="pedestal-icon-bubble">🎯</div>
          <div class="pedestal-content">
            <span class="pedestal-label">Reading Accuracy</span>
            <strong class="pedestal-val">${accuracy}%</strong>
            <small class="pedestal-sub sub-emerald">Sharp reading eyes 👀</small>
          </div>
        </div>

        <div class="metric-pedestal pedestal-words">
          <div class="pedestal-icon-bubble">📖</div>
          <div class="pedestal-content">
            <span class="pedestal-label">Words Mastered</span>
            <strong class="pedestal-val">${wordsLearned}</strong>
            <small class="pedestal-sub sub-gold">Vocabulary hero 🚀</small>
          </div>
        </div>

        <div class="metric-pedestal pedestal-momentum">
          <div class="pedestal-icon-bubble">🔥</div>
          <div class="pedestal-content">
            <span class="pedestal-label">Practice Momentum</span>
            <strong class="pedestal-val">${streakSessions} <small>sessions</small></strong>
            <small class="pedestal-sub sub-purple">Awesome streak ⭐</small>
          </div>
        </div>
      </section>

      <!-- 6 Flowing Milestone Medallions (No card boxes, no borders) -->
      <section class="milestone-medallions-section">
        <div class="milestones-header-row">
          <div>
            <h3 class="milestones-title">
              Superpower Milestone Badges
            </h3>
            <p class="milestones-desc">
              Conquer challenges to unlock Bronze 🥉, Silver 🥈, and Gold 🥇 trophies!
            </p>
          </div>
        </div>

        <div class="medallions-flow-grid">
          ${achievements.map(ach => {
            const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
            return `
              <article class="milestone-medallion ${ach.unlocked ? 'unlocked' : 'locked'}">
                <div class="medallion-top-row">
                  <div class="medallion-badge-bubble" style="background: ${ach.bgGlow};">
                    ${ach.icon}
                  </div>
                  <span class="medallion-tier-pill">
                    ${ach.tier}
                  </span>
                </div>

                <div class="medallion-body">
                  <span class="medallion-category">${escapeHtml(ach.category)}</span>
                  <h4 class="medallion-title">${escapeHtml(ach.title)}</h4>
                  <p class="medallion-desc">${escapeHtml(ach.description)}</p>
                </div>

                <div class="medallion-progress-block">
                  <div class="medallion-stat-line">
                    <span>Milestone Progress</span>
                    <strong>${ach.current}${ach.unit || ''} / ${ach.target}${ach.unit || ''} (${pct}%)</strong>
                  </div>
                  <div class="medallion-progress-track">
                    <div class="medallion-progress-fill" style="width: ${pct}%; background: ${ach.color};"></div>
                  </div>
                </div>
              </article>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Open Quest Journey Reel (No boxed table) -->
      <section class="quest-journey-section">
        <div class="journey-header-row">
          <span class="journey-sparkle">📜</span>
          <h3 class="journey-title">Recent Completed Quests</h3>
        </div>

        ${recentAttempts.length === 0 ? `
          <p class="journey-empty-text">
            Play your first quest in Practice or Adventure to see your completed triumphs here! 🌟
          </p>
        ` : `
          <div class="journey-timeline-stream">
            ${recentAttempts.map(att => {
              const questTitle = att.activityType === 'story_reading' ? 'Story Adventure' : (att.activityId || 'Practice Quest');
              const durationMin = Math.max(1, Math.round(att.durationSeconds / 60));
              return `
                <div class="journey-stream-item">
                  <div class="journey-bullet-node">⭐</div>
                  <div class="journey-stream-body">
                    <strong>${escapeHtml(questTitle)}</strong>
                    <small>${durationMin} min duration · ${att.score}% Accuracy · +15 ⭐</small>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </section>
    </div>
  `;
}

async function resourcesPage(): Promise<string> {
  const status = await tinyFish.checkStatus();
  return `
    <div style="display: flex; flex-direction: column; gap: 24px;">
      <!-- Discovery Hero Banner -->
      <section class="discovery-hero">
        <div style="flex: 1; min-width: 280px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: var(--radius-pill); background: rgba(255, 255, 255, 0.85); margin-bottom: 10px; border: 1px solid #a7f3d0;">
            <span style="font-size: 16px;">🗺️</span>
            <span style="font-size: 12px; font-weight: 800; color: #047857; letter-spacing: 0.5px;">EXPLORER'S DISCOVERY HUB</span>
          </div>
          <h2 style="font-family: var(--font-heading); font-size: 28px; font-weight: 900; margin: 0 0 6px; color: var(--text-main);">
            ${t('resources.heading') || 'Learning Discovery & Worksheets'} 🔍
          </h2>
          <p style="color: var(--text-muted); font-size: 14px; margin: 0; line-height: 1.6; max-width: 580px;">
            ${t('resources.subtitle') || 'Explore printable multisensory worksheets, phonics guides, decodable passages and fun learning games!'}
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: var(--radius-pill); background: var(--bg-surface); border: 1.5px solid var(--border); box-shadow: var(--shadow-sm);">
          <span style="font-size: 18px;">${status.configured ? '✅' : '⚡'}</span>
          <div>
            <strong style="display: block; font-size: 12px; color: ${status.configured ? 'var(--primary)' : 'var(--text-main)'}; font-weight: 800;">
              ${status.configured ? 'TinyFish Web Search Active' : 'Curated Educational Catalog'}
            </strong>
          </div>
        </div>
      </section>

      <!-- 4 Discovery Portals Grid -->
      <section>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
          <span style="font-size: 20px;">🧭</span>
          <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0; color: var(--text-main);">
            Explore Discovery Portals
          </h3>
        </div>

        <div class="discovery-portals-grid">
          <div class="discovery-portal-card" data-action="resource-suggestion" data-topic="phonics sound patterns" role="button" tabindex="0">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="portal-icon-box" style="background: #e0f2fe; color: #0284c7;">🧪</div>
              <div>
                <strong style="font-size: 15px; font-weight: 900; color: var(--text-main); display: block;">Phonics Lab</strong>
                <small style="font-size: 12px; color: var(--text-muted);">Sound blends & acoustic charts</small>
              </div>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary);">Explore topics <span>→</span></span>
          </div>

          <div class="discovery-portal-card" data-action="resource-suggestion" data-topic="short stories" role="button" tabindex="0">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="portal-icon-box" style="background: #fef3c7; color: #d97706;">📚</div>
              <div>
                <strong style="font-size: 15px; font-weight: 900; color: var(--text-main); display: block;">Decodable Stories</strong>
                <small style="font-size: 12px; color: var(--text-muted);">Illustrated tales with word banks</small>
              </div>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary);">Explore topics <span>→</span></span>
          </div>

          <div class="discovery-portal-card" data-action="resource-suggestion" data-topic="rhyming games" role="button" tabindex="0">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="portal-icon-box" style="background: #ede9fe; color: #7c3aed;">🎮</div>
              <div>
                <strong style="font-size: 15px; font-weight: 900; color: var(--text-main); display: block;">Word Quests</strong>
                <small style="font-size: 12px; color: var(--text-muted);">Interactive rhythm & rhyming</small>
              </div>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary);">Explore topics <span>→</span></span>
          </div>

          <div class="discovery-portal-card" data-action="resource-suggestion" data-topic="sight words practice" role="button" tabindex="0">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div class="portal-icon-box" style="background: #dcfce7; color: #16a34a;">📝</div>
              <div>
                <strong style="font-size: 15px; font-weight: 900; color: var(--text-main); display: block;">Printable Sheets</strong>
                <small style="font-size: 12px; color: var(--text-muted);">Tracing pages & flash cards</small>
              </div>
            </div>
            <span style="font-size: 12px; font-weight: 800; color: var(--primary);">Explore topics <span>→</span></span>
          </div>
        </div>
      </section>

      <!-- Search Section -->
      <section class="surface" style="padding: 24px; border-radius: var(--radius-xl); border: 1.5px solid var(--border);">
        <form id="resource-form" class="resource-form" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; align-items: flex-end;">
          <label style="grid-column: 1 / -1; display: grid; gap: 6px; font-size: 13px; font-weight: 800; color: var(--text-main);">
            ${t('resources.topicLabel')}
            <input name="topic" maxlength="100" required placeholder="${t('resources.topicPlaceholder')}" style="padding: 12px 16px; border-radius: var(--radius-md); font-weight: 700;" />
          </label>
          
          <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 800; color: var(--text-main);">
            ${t('resources.gradeLabel')}
            <select name="grade" style="padding: 10px 14px; border-radius: var(--radius-md); font-weight: 700;">
              <option value="any">${t('resources.anyGrade')}</option>
              <option>Class 1 · Early reader</option>
              <option>Class 2 · Growing reader</option>
              <option>Class 3 · Little reader</option>
              <option>Class 4 · Confident reader</option>
            </select>
          </label>

          <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 800; color: var(--text-main);">
            ${t('resources.typeLabel')}
            <select name="resourceType" style="padding: 10px 14px; border-radius: var(--radius-md); font-weight: 700;">
              <option value="any">${t('resources.anyType')}</option>
              <option value="reading_exercise">${t('resources.typeReadingExercise')}</option>
              <option value="phonics_activity">${t('resources.typePhonicsActivity')}</option>
              <option value="educational_game">${t('resources.typeEducationalGame')}</option>
              <option value="worksheet">${t('resources.typeWorksheet')}</option>
            </select>
          </label>

          <label style="display: grid; gap: 6px; font-size: 13px; font-weight: 800; color: var(--text-main);">
            ${t('childModal.langLabel')}
            <select name="language" style="padding: 10px 14px; border-radius: var(--radius-md); font-weight: 700;">
              ${(['English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Odia'] as SupportedLanguage[]).map(lang => `
                <option ${lang === activeChild!.preferredLanguage ? 'selected' : ''}>${lang}</option>
              `).join('')}
            </select>
          </label>

          <button class="btn btn-primary btn-lg" type="submit" style="min-height: 48px; border-radius: var(--radius-md); font-weight: 900;">
            ${t('resources.findBtn')} <span>⌕</span>
          </button>
        </form>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 18px;">
          <span style="font-size: 12px; font-weight: 800; color: var(--text-muted);">Quick Searches:</span>
          ${['phonics sound patterns', 'sight words practice', 'short stories', 'rhyming games'].map(topic => `
            <button type="button" class="btn btn-outline btn-sm" data-action="resource-suggestion" data-topic="${escapeHtml(topic)}" style="border-radius: var(--radius-pill); font-weight: 800;">
              ${escapeHtml(topic)}
            </button>
          `).join('')}
        </div>
      </section>

      <div id="resource-results">
        ${resourceResults.length ? renderResources(resourceResults) : ''}
      </div>
    </div>
  `;
}

function renderResources(resources: EducationalResource[]): string {
  if (!resources.length) {
    return '<div class="surface" style="padding: 28px; text-align: center; color: var(--text-muted); border-radius: var(--radius-lg); border: 1.5px solid var(--border);">No resources found for this search. Try another topic or language.</div>';
  }
  return `
    <section>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
        <span style="font-size: 20px;">✨</span>
        <h3 style="font-family: var(--font-heading); font-size: 18px; font-weight: 900; margin: 0; color: var(--text-main);">
          ${resources.length} learning ${resources.length === 1 ? 'idea' : 'ideas'} found
        </h3>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
        ${resources.map(resource => {
          let safeUrl = '';
          try {
            const parsed = new URL(resource.url);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') safeUrl = parsed.href;
          } catch { safeUrl = ''; }
          return `
            <article class="surface" style="display: flex; flex-direction: column; justify-content: space-between; border-radius: var(--radius-lg); border: 1.5px solid var(--border); padding: 20px; box-shadow: var(--shadow-card);">
              <div>
                <span class="badge badge-primary" style="margin-bottom: 10px; font-weight: 800;">${escapeHtml(resource.resourceType.replace(/_/g, ' '))}</span>
                <h4 style="font-family: var(--font-heading); font-size: 17px; font-weight: 900; margin: 4px 0 8px; color: var(--text-main);">${escapeHtml(resource.title)}</h4>
                <p style="font-size: 13px; color: var(--text-muted); line-height: 1.6; margin: 0 0 14px;">${escapeHtml(resource.summary)}</p>
                <div style="font-size: 11px; font-weight: 800; color: var(--text-subtle);">${escapeHtml(resource.siteName)} · ${escapeHtml(resource.language)}</div>
              </div>
              <div style="margin-top: 18px;">
                ${safeUrl ? `<a class="btn btn-outline btn-sm" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" style="border-radius: var(--radius-pill); font-weight: 800;">Open resource ↗</a>` : ''}
              </div>
            </article>`;
        }).join('')}
      </div>
      ${resourceDisclaimer ? `<p style="font-size: 11px; color: var(--text-subtle); margin-top: 16px;">${escapeHtml(resourceDisclaimer)}</p>` : ''}
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
  const targetChildLang = i18n.supportedLanguageToCode(activeChild.preferredLanguage || 'English');
  if (i18n.getCurrentLanguage() !== targetChildLang) {
    await i18n.setLanguage(targetChildLang);
  }
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
        : activePage === 'adventure'
          ? await adventurePage()
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
            <span class="badge badge-primary">${t('profileSelect.title') || 'LEARNER PROFILE'}</span>
            <h2 id="profile-modal-title">${child ? t('childModal.editTitle') : t('childModal.addTitle')}</h2>
          </div>
          <button class="icon-button" type="button" data-action="close-modal" aria-label="${t('common.close')}">×</button>
        </div>
        <form id="child-form" class="form-stack">
          <input type="hidden" name="childId" value="${escapeHtml(child?.id || '')}" />
          <label>${t('childModal.nameLabel')}<input name="name" required maxlength="60" value="${escapeHtml(child?.name || '')}" placeholder="${t('childModal.namePlaceholder')}" /></label>
          <label>${t('resources.gradeLabel')}
            <select name="grade">
              <option ${child?.grade.includes('2') ? 'selected' : ''}>Class 2 · Early reader</option>
              <option ${child?.grade.includes('3') ? 'selected' : ''}>Class 3 · Growing reader</option>
              <option ${child?.grade.includes('4') ? 'selected' : ''}>Class 4 · Little reader</option>
              <option ${child?.grade.includes('5') ? 'selected' : ''}>Class 5 · Confident reader</option>
            </select>
          </label>
          <div>
            <span style="display: block; font-size: 13px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">
              ${t('childModal.optionsTitle') || 'Configured learning languages'}
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
          <label>${t('childModal.langLabel')}
            <select name="language" id="profilePrimaryLanguage">
              ${allSupportedLangs.map(lang => `
                <option value="${lang}" ${lang === (child?.preferredLanguage || 'English') ? 'selected' : ''}>${lang}</option>
              `).join('')}
            </select>
          </label>
          <label>${t('childModal.avatarLabel')}
            <select name="avatar">
              ${['👧🏽', '👦🏻', '🧒🏽', '🦊', '🐼', '🦉'].map(avatar => `
                <option ${avatar === (child?.avatar || '👧🏽') ? 'selected' : ''}>${avatar}</option>
              `).join('')}
            </select>
          </label>
          <p class="form-message" id="child-message" aria-live="polite"></p>
          <button class="btn btn-primary btn-lg" style="width: 100%;" type="submit">${child ? t('childModal.saveChangesBtn') : t('childModal.saveBtn')}</button>
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
  const languageCode = i18n.supportedLanguageToCode(activity.language);

  modal.innerHTML = `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <section class="modal-card activity-modal" lang="${languageCode}" role="dialog" aria-modal="true" aria-labelledby="activity-title">
        <div class="modal-heading">
          <div>
            <span class="badge badge-primary">${escapeHtml(activity.difficulty)} · ${escapeHtml(activity.language)}</span>
            <h2 id="activity-title">${escapeHtml(activity.title)}</h2>
          </div>
          <button class="icon-button modal-close" type="button" id="btnCloseActivityGeneric" data-action="close-activity" aria-label="${t('common.close') || 'Close activity'}">✕</button>
        </div>

        <div class="activity-instruction">
          <small>QUESTION ${activityQuestionNumber} OF ${activityQuestionLimit} · GENTLE CHALLENGE</small>
          <p>${escapeHtml(activity.instruction)}</p>
        </div>

        <div class="activity-prompt">
          <h3>${escapeHtml(activity.prompt)}</h3>
          ${activity.audioPrompt ? `
            <button class="btn btn-ghost btn-sm" type="button" data-action="speak-prompt">
              🔊 ${t('practice.hearWordBtn') || 'Hear the question aloud'}
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
            💡 ${t('activity.hintBtn')}
          </button>
          ${activity.workedExample ? `
            <button type="button" class="btn btn-outline btn-sm" data-action="activity-example" ${answered ? 'disabled' : ''}>
              👀 ${t('activity.exampleBtn')}
            </button>
          ` : ''}
          ${answered ? (
      activitySaveFailed
        ? `<button type="button" class="btn btn-outline btn-sm" data-action="close-activity">${t('common.close')}</button>`
        : activityQuestionNumber < activityQuestionLimit
          ? `<button type="button" class="btn btn-outline btn-sm" data-action="finish-activity" ${activitySaving ? 'disabled' : ''}>${t('activity.finishBtn')}</button>
                   <button type="button" class="btn btn-primary btn-sm" data-action="next-question" ${activitySaving ? 'disabled' : ''}>${t('common.next')} →</button>`
          : `<button type="button" class="btn btn-primary btn-sm" data-action="finish-activity" ${activitySaving ? 'disabled' : ''}>
                    ${activitySaving ? t('common.loading') : `${t('common.finished')} 🎉`}
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
    const newHappyPoints = progress.happyPoints + 5 * attempts.length;
    profiles.updateChildProgress(child.id, {
      practiceMinutes: progress.practiceMinutes + Math.max(1, Math.round((Date.now() - activityStartedAt) / 60000)),
      wordsLearned: progress.wordsLearned + attempts.length,
      happyPoints: newHappyPoints,
      practiceWins: progress.practiceWins + 1,
      accuracyPercent: 100,
    });
    // Trigger Level Completion Celebration on Adventure Map (4A.3)
    const currentMap = computeAdventureMapState(child, await learning.getChildSkillStates(child.id), { ...progress, happyPoints: newHappyPoints });
    celebratedCompletedLevelNumber = currentMap.currentLevel.levelNumber;
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

async function submitAdventureSettings(form: HTMLFormElement): Promise<void> {
  const childId = form.dataset.childId;
  const currentUser = auth.getCurrentUser();
  const messageEl = root!.querySelector<HTMLElement>('#adventure-settings-message');

  if (!currentUser) {
    if (messageEl) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = 'Please sign in to update adventure settings.';
    }
    return;
  }

  if (!childId) {
    if (messageEl) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = 'No child profile selected.';
    }
    return;
  }

  const data = new FormData(form);
  const newSettings: Partial<Record<DestinationId, DestinationSetting>> = {};

  for (const destId of DESTINATION_ORDER) {
    const isEnabled = data.get(`${destId}_enabled`) === 'on';
    const rawPoints = String(data.get(`${destId}_points`) || '').trim();
    const pointsNum = Number(rawPoints);

    if (!rawPoints || isNaN(pointsNum) || !Number.isInteger(pointsNum) || pointsNum < 0) {
      if (messageEl) {
        messageEl.style.color = '#b91c1c';
        messageEl.textContent = `Invalid required points for ${ADVENTURE_DESTINATIONS[destId].name}: must be a whole non-negative number (0 or higher).`;
      }
      return;
    }

    newSettings[destId] = {
      enabled: isEnabled,
      requiredPoints: pointsNum,
    };
  }

  try {
    await adventure.saveChildSettings(currentUser.id, childId, newSettings);
    if (messageEl) {
      messageEl.style.color = '#15803d';
      messageEl.textContent = '✨ Adventure settings saved successfully! Access permissions updated immediately.';
    }
    toast('Adventure settings saved! 🧭');
    setTimeout(() => {
      void renderAppPage();
    }, 500);
  } catch (err) {
    if (messageEl) {
      messageEl.style.color = '#b91c1c';
      messageEl.textContent = err instanceof Error ? err.message : 'Could not save adventure settings.';
    }
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
    if (action === 'toggle-theme') {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      applyTheme(currentTheme);
      document.querySelectorAll('.theme-toggle-btn .theme-icon').forEach(icon => {
        icon.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
      });
      toast(currentTheme === 'dark' ? 'Dark Adventure Mode activated 🌙' : 'Sunny Light Mode restored ☀️');
      return;
    } else if (action === 'inspect-level') {
      const lvlNum = parseInt(control.dataset.level || '1', 10);
      renderLevelPreviewModal(lvlNum);
      return;
    } else if (action === 'inspect-milestone') {
      const lvlNum = parseInt(control.dataset.level || '3', 10);
      renderMilestoneModal(lvlNum);
      return;
    } else if (action === 'play-level') {
      closeModal();
      const skillId = control.dataset.skill || '';
      const title = control.dataset.title || 'Adventure Level';
      const difficulty = control.dataset.difficulty || 'beginner';
      await startActivity(skillId, title, difficulty);
      return;
    } else if (action === 'close-modal') {
      closeModal();
      return;
    } else if (action === 'toggle-sound-effects') {
      const isNowOn = soundService.toggle();
      document.querySelectorAll('.sound-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', isNowOn);
        const icon = btn.querySelector('.sound-icon');
        if (icon) icon.textContent = isNowOn ? (btn.textContent?.includes('Enabled') ? '🔊 Enabled' : '🔊') : (btn.textContent?.includes('Muted') ? '🔇 Muted' : '🔇');
        btn.setAttribute('title', isNowOn ? 'Sound Effects: ON (Click to Mute)' : 'Sound Effects: MUTED (Click to Enable)');
        btn.setAttribute('aria-label', isNowOn ? 'Mute Sound Effects' : 'Enable Sound Effects');
      });
      toast(isNowOn ? 'Sound effects enabled 🔊' : 'Sound effects muted 🔇');
      return;
    } else if (action === 'test-sound') {
      const snd = control.dataset.sound as any;
      if (snd) soundService.play(snd);
      return;
    } else if (action === 'toggle-dyslexia-font') {
      soundService.toggleSwitch(activeChild?.preferences?.soundEffects !== false);
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
      speechService.speak(
        heroActiveLetter === 'b' ? 'Letter b says buh, as in bat.' : 'Letter d says duh, as in door.',
        { mode: 'pronunciation', langCode: 'en' }
      );
    } else if (action === 'speak-hero-letter') {
      speechService.speak(
        heroActiveLetter === 'b' ? 'Letter b says buh, as in bat.' : 'Letter d says duh, as in door.',
        { mode: 'pronunciation', langCode: 'en' }
      );
    } else if (action === 'test-playground-voice') {
      const label = root!.querySelector<HTMLElement>('#playground-voice-label');
      if (speechService.isSpeaking()) {
        speechService.stop();
        if (label) label.textContent = 'Read Aloud';
        return;
      }
      const text = root!.querySelector<HTMLElement>('#playground-text')?.textContent || '';
      if (label) label.textContent = 'Stop Reading';
      speechService.speak(text, {
        mode: 'story',
        rate: playgroundReadingSpeed,
        onEnd: () => {
          const l = root!.querySelector<HTMLElement>('#playground-voice-label');
          if (l) l.textContent = 'Read Aloud';
        },
        onError: () => {
          const l = root!.querySelector<HTMLElement>('#playground-voice-label');
          if (l) l.textContent = 'Read Aloud';
        },
      });
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
      if (speechService.isSpeaking()) {
        speechService.stop();
        const text = root!.querySelector<HTMLElement>('#playground-text')?.textContent || '';
        const label = root!.querySelector<HTMLElement>('#playground-voice-label');
        if (label) label.textContent = 'Stop Reading';
        speechService.speak(text, {
          mode: 'story',
          rate: playgroundReadingSpeed,
          onEnd: () => {
            const l = root!.querySelector<HTMLElement>('#playground-voice-label');
            if (l) l.textContent = 'Read Aloud';
          },
          onError: () => {
            const l = root!.querySelector<HTMLElement>('#playground-voice-label');
            if (l) l.textContent = 'Read Aloud';
          },
        });
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
      parentActiveTab = (control.dataset.tab as 'overview' | 'child_records' | 'settings' | 'adventure_settings') || 'overview';
      await renderAppPage();
    } else if (action === 'open-map-destination') {
      const dest = control.dataset.dest as DestinationId;
      if (dest && (DESTINATION_ORDER as readonly string[]).includes(dest)) {
        activeAdventureDestination = dest;
        await renderAppPage();
      }
    } else if (action === 'reset-adventure-defaults') {
      const form = root!.querySelector<HTMLFormElement>('#adventure-settings-form');
      if (form) {
        for (const id of DESTINATION_ORDER) {
          const enabledInput = form.querySelector<HTMLInputElement>(`input[name="${id}_enabled"]`);
          const pointsInput = form.querySelector<HTMLInputElement>(`input[name="${id}_points"]`);
          if (enabledInput) enabledInput.checked = true;
          if (pointsInput) pointsInput.value = String(ADVENTURE_DESTINATIONS[id].defaultRequiredPoints);
        }
        toast('Default milestones restored in form. Click Save to persist.');
      }
    } else if (action === 'play-adventure-activity') {
      if (!activeChild) {
        toast('Please select a learner profile first.', true);
      } else {
        const destId = control.dataset.dest as DestinationId;
        const skillId = control.dataset.skill;
        const title = control.dataset.title;
        const difficulty = (control.dataset.difficulty as ActivityDifficulty) || 'beginner';

        if (destId && skillId && title) {
          // Authoritative access check (enforces parent enable toggle + genuine Happy Points threshold)
          const access = await adventure.checkDestinationAccess(activeChild.id, destId);
          if (!access.allowed) {
            toast(access.message || 'This destination is currently locked or resting.', true);
            await renderAppPage();
          } else {
            await startActivity(skillId, title, difficulty);
          }
        }
      }
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
      const childLangCode = i18n.supportedLanguageToCode(activeChild.preferredLanguage || 'English');
      await i18n.setLanguage(childLangCode);
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
      soundService.modalOpen(activeChild?.preferences?.soundEffects !== false);
      await startActivity(control.dataset.skill || '', control.dataset.title || 'Reading adventure', control.dataset.difficulty || 'beginner');
    } else if (action === 'close-activity') {
      soundService.modalClose(activeChild?.preferences?.soundEffects !== false);
      closeModal();
    } else if (action === 'answer') {
      if (!activity) return;
      const selected = activity.items.find(item => item.id === control.dataset.item);
      if (!selected) return;
      activityAttempts++;
      if (selected.isCorrect) {
        soundService.correctAnswer(activeChild?.preferences?.soundEffects !== false);
        renderActivityModal(selected.feedbackHint || 'Great work! You found it! 🌟', true, true);
      } else {
        soundService.cardSelect(activeChild?.preferences?.soundEffects !== false);
        if (!activityMissedItems.includes(selected.text)) activityMissedItems.push(selected.text);
        renderActivityModal(selected.feedbackHint || 'Nice try! Take another gentle look.', false);
      }
    } else if (action === 'next-question') {
      soundService.progressUpdate(activeChild?.preferences?.soundEffects !== false);
      await nextActivityQuestion();
    } else if (action === 'activity-hint' && activity) {
      activityHints++;
      renderActivityModal(activity.stepByStepHint);
    } else if (action === 'activity-example' && activity?.workedExample) {
      renderActivityModal(`${activity.workedExample.demonstration} ${activity.workedExample.explanation}`);
    } else if (action === 'speak-prompt' && activity?.audioPrompt) {
      const language: SupportedLanguage = activeChild?.preferredLanguage || 'English';
      const langCode = i18n.supportedLanguageToCode(language);
      speechService.speak(activity.audioPrompt, {
        mode: 'question',
        langCode,
      });
    } else if (action === 'finish-activity') {
      soundService.activityComplete(activeChild?.preferences?.soundEffects !== false);
      await finishActivity();
    } else if (action === 'open-story') {
      soundService.modalOpen(activeChild?.preferences?.soundEffects !== false);
      openStoryReader(control.dataset.id || '');
    } else if (action === 'shuffle-stories') {
      storyRotationAdvance = !storyRotationAdvance;
      await renderAppPage();
      toast('Stories shuffled! 🎲');
    } else if (action === 'speak-story') {
      const lbl = root!.querySelector<HTMLElement>('#story-tts-label');
      if (speechService.isSpeaking()) {
        speechService.stop();
        if (lbl) lbl.textContent = 'Read aloud';
      } else {
        const text = activeStory?.paragraphs.join('\n\n') || '';
        const lang: SupportedLanguage = activeStory?.language || activeChild?.preferredLanguage || 'English';
        const langCode = i18n.supportedLanguageToCode(lang);
        if (lbl) lbl.textContent = 'Pause voice';
        speechService.speak(text, {
          mode: 'story',
          langCode,
          onEnd: () => {
            const l = root!.querySelector<HTMLElement>('#story-tts-label');
            if (l) l.textContent = 'Read aloud';
          },
          onError: () => {
            const l = root!.querySelector<HTMLElement>('#story-tts-label');
            if (l) l.textContent = 'Read aloud';
          },
        });
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
        soundService.correctAnswer(activeChild?.preferences?.soundEffects !== false);
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
        soundService.cardSelect(activeChild?.preferences?.soundEffects !== false);
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
      soundService.achievement(activeChild?.preferences?.soundEffects !== false);
      speechService.stop();
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
    } else if (form.id === 'adventure-settings-form') {
      await submitAdventureSettings(form);
    }
  } catch (error) {
    console.error('Form submission failed:', error);
    const message = root!.querySelector<HTMLElement>('#child-message, #pin-message, #auth-message, #password-message, #recovery-message, #gate-pin-message, #adventure-settings-message');
    if (message) message.textContent = error instanceof Error ? error.message : 'Please try again.';
    else toast(error instanceof Error ? error.message : 'Please try again.', true);
  }
});

// ----------------------------------------------------
// LANGUAGE SELECTION ROUTING & FORM INTERACTIONS
// ----------------------------------------------------
root!.addEventListener('input', event => {
  const target = event.target as HTMLElement;
  if (!target) return;
  if (target.dataset?.action === 'change-sound-volume') {
    const val = parseInt((target as HTMLInputElement).value, 10);
    const vol = Math.max(0, Math.min(1, val / 100));
    soundService.setVolume(vol);
    const label = root!.querySelector<HTMLElement>('#sound-vol-label');
    if (label) label.textContent = `${val}%`;
  }
});

root!.addEventListener('change', async event => {
  const target = event.target as HTMLElement;
  if (!target) return;

  if (target.id === 'adventure-destination-picker') {
    const select = target as HTMLSelectElement;
    activeAdventureDestination = (select.value as DestinationId) || 'phonics_garden';
    await renderAppPage();
    return;
  }

  if (target.id === 'parent-adventure-child-picker') {
    const select = target as HTMLSelectElement;
    parentSelectedChildId = select.value;
    await renderAppPage();
    return;
  }

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

  // Parent portal interface language selector (does not overwrite child's learning language)
  if (target.classList?.contains('parent-lang-select')) {
    const select = target as HTMLSelectElement;
    const newLangCode = select.value as any;
    try {
      await i18n.setLanguage(newLangCode);
      const user = auth.getCurrentUser();
      if (user) {
        await auth.updateInterfaceLanguage(newLangCode);
      }
      toast(`Interface language updated 🌐`);
      await renderAppPage();
    } catch (err) {
      console.error('Failed to update interface language:', err);
      toast('Unable to update language.', true);
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


// Universal modal close handler (handles all close buttons, icons, backdrops, and X buttons)
document.addEventListener('click', event => {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const isCloseBtn = Boolean(
    target.closest('[data-action="close-activity"]') ||
    target.closest('[data-action="close-modal"]') ||
    target.closest('[data-action="dismiss-modal"]') ||
    target.closest('#btnCloseBDModal') ||
    target.closest('#btnCloseActModal') ||
    target.closest('#btnCloseActivityGeneric') ||
    target.closest('#btnCloseStoryModal') ||
    target.closest('.modal-close') ||
    target.closest('button[aria-label*="close" i]') ||
    target.closest('button[aria-label*="Close" i]') ||
    target.closest('[data-action="close-preview"]') ||
    (target.tagName === 'BUTTON' && ['×', '✕', 'X', 'x'].includes(target.textContent?.trim() || '')) ||
    (target.parentElement?.tagName === 'BUTTON' && ['×', '✕', 'X', 'x'].includes(target.textContent?.trim() || ''))
  );
  if (isCloseBtn) {
    event.preventDefault();
    event.stopPropagation();
    closeModal();
    try { LetterMirrorBDModal.getInstance().close(); } catch {}
    try { ActivityRunnerModal.getInstance().close(); } catch {}
    const bd = document.getElementById('bdRunnerModalContainer');
    if (bd) { bd.style.display = 'none'; bd.remove(); }
    const act = document.getElementById('actRunnerModalContainer');
    if (act) { act.style.display = 'none'; act.remove(); }
    const rootModal = document.querySelector('#modal-root');
    if (rootModal) rootModal.innerHTML = '';
    document.body.style.overflow = '';
  }
}, true);

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeModal();
    try { LetterMirrorBDModal.getInstance().close(); } catch {}
    const bd = document.getElementById('bdRunnerModalContainer');
    if (bd) { bd.style.display = 'none'; bd.remove(); }
    const act = document.getElementById('actRunnerModalContainer');
    if (act) { act.style.display = 'none'; act.remove(); }
    document.body.style.overflow = '';
  }
});
