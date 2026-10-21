import { ActivityTrackerService } from '../src/services/activityTrackerService';
import { ACTIVITY_CATALOG } from '../src/services/activityCatalog';
import { AiActivityService } from '../src/services/aiActivityService';
import { AuthService } from '../src/services/authService';
import { LearningPathService } from '../src/services/learningPathService';
import { ProfileService } from '../src/services/profileService';
import { ReadingChartService } from '../src/services/readingChartService';
import { TinyFishService } from '../src/services/tinyfishService';
import type { ActivityDifficulty, InteractiveActivityContent, LearningAttempt } from '../src/types/adaptive';
import type { ChildProfile, SupportedLanguage } from '../src/types/auth';
import type { EducationalResource, ResourceType } from '../src/types/tinyfish';
import './styles.css';

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
};
const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

let activeChild: ChildProfile | null = profiles.getActiveChild();
let activePage = 'home';
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

function button(label: string, action: string, style = 'button button-quiet'): string {
  return `<button type="button" class="${style}" data-action="${escapeHtml(action)}">${label}</button>`;
}

function brandMarkup(): string {
  return `<span class="brand-mark"><img src="./assets/dysleximate-logo.png" alt="" /></span><span class="brand-word">Dyslexi<span>Mate</span></span>`;
}

function brandTextMarkup(): string {
  return `<span class="brand-word">Dyslexi<span>Mate</span></span>`;
}

function rightsFooter(): string {
  return `<footer class="rights-footer">
    <strong>Rights &amp; attribution</strong>
    <p>© ${new Date().getFullYear()} Team Pinaka. All rights reserved. The DyslexiMate name, logo, and original app materials may not be copied or redistributed without permission. Third-party materials remain the property of their respective owners.</p>
    <a href="mailto:team.nexus.dtu.26.30@gmail.com">Contact Team Pinaka</a>
  </footer>`;
}

function renderAuth(): void {
  const registering = authMode === 'register';
  root!.innerHTML = `
    <main class="auth-layout">
      <section class="auth-story">
        <a class="brand brand-light" href="#" aria-label="DyslexiMate home">${brandTextMarkup()}</a>
        <div class="auth-story-copy">
          <span class="eyebrow">A kinder way to learn</span>
          <h1>Little steps.<br />Big reading wins.</h1>
          <p>Personalized reading adventures that help every learner find their rhythm.</p>
          <img class="auth-logo-card" src="./assets/dysleximate-logo.png" alt="DyslexiMate — little steps, big reading wins" />
        </div>
        <p class="auth-footnote">Made for growing readers and the people cheering them on.</p>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <div class="mobile-brand brand">${brandTextMarkup()}</div>
          <span class="eyebrow">Parent &amp; guardian space</span>
          <h2>${registering ? 'Create your account' : 'Welcome back'}</h2>
          <p class="muted">${registering ? 'Start a reading journey made just for your family.' : 'Sign in to pick up where your learner left off.'}</p>
          <form id="auth-form" class="form-stack">
            ${registering ? `<label>Full name<input name="fullName" autocomplete="name" required minlength="2" placeholder="Your name" /></label>` : ''}
            <label>Email address<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label>
            <label>Password<input name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" required minlength="${registering ? '6' : '1'}" placeholder="${registering ? 'At least 6 characters' : 'Your password'}" /></label>
            ${registering ? `<label>Confirm password<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="6" placeholder="Enter your password again" /></label>
              <label class="check-row"><input name="acceptTerms" type="checkbox" required /><span>I agree to the terms and child privacy notice.</span></label>` : ''}
            <button class="button button-primary button-wide" type="submit">${registering ? 'Create account' : 'Sign in'} <span aria-hidden="true">→</span></button>
            <p id="auth-message" class="form-message" aria-live="polite"></p>
          </form>
          ${!registering ? `<button type="button" class="text-button" data-action="reset-password">Forgot your password?</button>` : ''}
          <p class="auth-switch">${registering ? 'Already have an account?' : 'New to DyslexiMate?'}
            <button type="button" class="text-button" data-action="toggle-auth">${registering ? 'Sign in' : 'Create an account'}</button>
          </p>
          <div class="demo-hint"><strong>Want to explore?</strong><span>Demo: parent@dysleximate.demo · Password123!</span></div>
        </div>
        ${rightsFooter()}
      </section>
    </main>`;
}

function renderProfiles(children: ChildProfile[], editing?: ChildProfile): void {
  root!.innerHTML = `
    <main class="profile-page">
      <header class="profile-header">
        <a class="brand" href="#">${brandMarkup()}</a>
        <div class="profile-header-actions">${button('Parent settings', 'settings', 'button button-quiet')}${button('Sign out', 'logout', 'button button-quiet')}</div>
      </header>
      <section class="profile-intro">
        <span class="eyebrow">Your family learning space</span>
        <h1>${editing ? 'Update learner profile' : 'Who’s ready for a reading win?'}</h1>
        <p class="muted">${editing ? 'Keep their reading journey up to date.' : 'Choose a learner to continue, or add a new profile.'}</p>
      </section>
      <div class="profile-grid">
        ${children.map(child => `
          <article class="profile-card">
            <button class="profile-select" type="button" data-action="select-child" data-id="${escapeHtml(child.id)}">
              <span class="profile-avatar">${escapeHtml(child.avatar)}</span>
              <strong>${escapeHtml(child.name)}</strong><small>${escapeHtml(child.grade)} · ${escapeHtml(child.preferredLanguage)}</small>
              <span class="profile-card-cta">Open learning space <span aria-hidden="true">→</span></span>
            </button>
            <div class="profile-card-actions">
              <button type="button" class="mini-button" data-action="edit-child" data-id="${escapeHtml(child.id)}">Edit</button>
              <button type="button" class="mini-button mini-danger" data-action="delete-child" data-id="${escapeHtml(child.id)}">Remove</button>
            </div>
          </article>`).join('')}
        <button class="profile-card add-profile" type="button" data-action="add-child">
          <span class="add-icon">＋</span><strong>Add a learner</strong><small>Create a new reading profile</small>
        </button>
      </div>
      <div id="modal-root"></div>
      ${rightsFooter()}
    </main>`;
}

function renderShell(userName: string): string {
  const child = activeChild!;
  const nav = [
    ['home', '⌂', 'Overview'],
    ['practice', '✳', 'Practice'],
    ['progress', '↗', 'Progress'],
    ['resources', '⌕', 'Resources'],
  ];
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#" data-action="navigate" data-page="home">${brandMarkup()}</a>
        <span class="nav-caption">LEARNING SPACE</span>
        <nav class="side-nav" aria-label="Main navigation">
          ${nav.map(([page, icon, label]) => `<button type="button" data-action="navigate" data-page="${page}" class="${activePage === page ? 'active' : ''}"><span class="nav-icon">${icon}</span>${label}</button>`).join('')}
        </nav>
        <div class="sidebar-tip"><span>🌱</span><strong>Every little step counts.</strong><p>A few minutes of practice can make a big difference.</p>${button('Find a story', 'navigate-resources', 'button button-warm')}</div>
        <button class="learner-switch" type="button" data-action="profiles"><span class="profile-avatar small">${escapeHtml(child.avatar)}</span><span><strong>${escapeHtml(child.name)}</strong><small>${escapeHtml(child.grade)}</small></span><span class="switch-arrow">⌄</span></button>
      </aside>
      <main class="main-content">
        <header class="topbar">
          <div><span class="breadcrumb">Learning space <span>›</span> <strong>${escapeHtml(activePage === 'home' ? 'Overview' : activePage[0]!.toUpperCase() + activePage.slice(1))}</strong></span><h1 class="page-title">${escapeHtml(pageTitle())}</h1></div>
          <div class="topbar-right"><span class="today-chip">${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><button class="parent-chip" data-action="settings" type="button"><span class="parent-avatar">☼</span><span>${escapeHtml(userName)}</span></button></div>
        </header>
        <div id="page-content" aria-live="polite"><div class="loading-state"><span class="spinner"></span>Preparing your learning space…</div></div>
        ${rightsFooter()}
      </main>
      <div id="modal-root"></div>
    </div>`;
}

function pageTitle(): string {
  if (activePage === 'practice') return 'Choose a little adventure';
  if (activePage === 'progress') return 'Look how far you’ve come';
  if (activePage === 'resources') return 'Stories and learning ideas';
  return `Good things grow, ${activeChild?.name || 'reader'}.`;
}

function statCard(icon: string, label: string, value: string | number, foot: string): string {
  return `<article class="stat-card"><span class="stat-icon">${icon}</span><span class="stat-label">${label}</span><strong>${value}</strong><small>${foot}</small></article>`;
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
    ? `<div class="chart-empty"><span>🌱</span><p>${escapeHtml(chart.emptyMessage)}</p></div>`
    : `<div class="accuracy-bars" role="img" aria-label="Recent recorded accuracy: ${bars.map(point => `${point.dayLabel} ${point.accuracyPercent}%`).join(', ')}">${bars.map(point => `<div class="bar-item"><div class="bar-track"><span class="bar-fill" style="height:${Math.max(8, point.accuracyPercent)}%"></span></div><small>${escapeHtml(point.dayLabel)}</small></div>`).join('')}</div>`;
  return `
    <section class="welcome-banner">
      <div class="welcome-copy"><span class="eyebrow">YOUR NEXT LITTLE WIN</span><h2>Ready to grow, ${escapeHtml(child.name)}?</h2><p>${escapeHtml(rec?.reason || 'Pick a friendly activity and learn at your own pace.')}</p><button class="button button-warm" type="button" data-action="${rec ? 'start-recommendation' : 'navigate'}" ${rec ? `data-skill="${escapeHtml(rec.targetSkillId)}" data-title="${escapeHtml(rec.title)}" data-difficulty="${rec.difficulty}"` : 'data-page="practice"'}>Start a practice adventure <span>→</span></button></div>
      <div class="welcome-illustration" aria-hidden="true"><span class="sun">☀</span><span class="book-stack">📚</span><span class="sparkle">✦</span></div>
      <span class="banner-label">${path.isProvisional ? 'A fresh start' : 'Your learning path'}</span>
    </section>
    <section class="stats-grid">
      ${statCard('⏱', 'Practice minutes', progress.practiceMinutes, 'Time spent learning')}
      ${statCard('✦', 'Happy points', progress.happyPoints, 'Little wins add up')}
      ${statCard('📖', 'Words learned', progress.wordsLearned, 'Words on your journey')}
      ${statCard('↗', 'Recent accuracy', actualAccuracy === null ? '—' : `${actualAccuracy}%`, chart.isEmpty ? 'Complete an activity to begin' : 'From recorded practice')}
    </section>
    <div class="dashboard-grid">
      <section class="surface chart-card"><div class="section-heading"><div><span class="eyebrow">A LOOK BACK</span><h2>Reading confidence</h2><p>Accuracy from completed activities this week.</p></div><span class="soft-pill">${chart.totalSessions} ${chart.totalSessions === 1 ? 'session' : 'sessions'}</span></div>${chartMarkup}</section>
      <section class="surface next-card"><div class="section-heading"><div><span class="eyebrow">A GOOD NEXT STEP</span><h2>Picked for ${escapeHtml(child.name)}</h2></div><span class="next-icon">${escapeHtml(rec?.actionIcon || '🌱')}</span></div><h3>${escapeHtml(rec?.title || 'Choose a first activity')}</h3><p>${escapeHtml(rec?.description || 'Start with a short, friendly practice activity.')}</p><div class="next-meta"><span>${escapeHtml(rec?.difficulty || 'beginner')}</span><span>·</span><span>${rec?.estimatedMinutes || 4} min</span></div>${rec ? `<button class="button button-primary button-wide" type="button" data-action="start-recommendation" data-skill="${escapeHtml(rec.targetSkillId)}" data-title="${escapeHtml(rec.title)}" data-difficulty="${rec.difficulty}">Try this activity <span>→</span></button>` : button('Browse activities', 'navigate-practice', 'button button-primary button-wide')}</section>
      <section class="surface goal-card"><div class="section-heading"><div><span class="eyebrow">TODAY’S FOCUS</span><h2>Little goals, steady growth</h2></div><span class="goal-icon">🎯</span></div><ul class="goal-list">${path.currentGoals.slice(0, 3).map((goal, i) => `<li><span class="goal-check">${i === 0 ? '✦' : '○'}</span>${escapeHtml(goal)}</li>`).join('')}</ul><p class="provisional-note">${escapeHtml(path.explanation)}</p></section>
      <section class="surface activity-mini"><div class="section-heading"><div><span class="eyebrow">PRACTICE LIBRARY</span><h2>Find a fun activity</h2><p>Short, supportive adventures for every reader.</p></div></div><div class="quick-activity-row">${ACTIVITY_CATALOG.slice(0, 3).map(item => `<button class="quick-activity" type="button" data-action="start-catalog" data-skill="${escapeHtml(item.skillId)}" data-title="${escapeHtml(item.title)}" data-difficulty="${item.difficulty}"><span>${escapeHtml(item.icon)}</span><strong>${escapeHtml(item.title)}</strong><small>${item.estimatedMinutes} min</small></button>`).join('')}</div>${button('Explore all activities', 'navigate-practice', 'text-button')}</section>
    </div>`;
}

function practicePage(): string {
  const recs = new Map((learningPath?.recommendations || []).map(rec => [rec.targetSkillId, rec]));
  return `<section class="page-intro"><span class="eyebrow">PICK WHAT FEELS FUN</span><h2>Every activity is a fresh chance to grow.</h2><p>Choose an activity. There’s no rush, and you can always ask for a hint.</p></section><div class="activity-grid">${ACTIVITY_CATALOG.map((item, index) => {
    const rec = recs.get(item.skillId);
    return `<article class="activity-card activity-tone-${index % 5}"><span class="activity-emoji">${escapeHtml(item.icon)}</span><span class="activity-tag">${escapeHtml(rec?.recommendationType || item.tag)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p><div class="activity-card-bottom"><span>${item.estimatedMinutes} min · ${escapeHtml(rec?.difficulty || item.difficulty)}</span><button type="button" aria-label="Start ${escapeHtml(item.title)}" data-action="start-catalog" data-skill="${escapeHtml(item.skillId)}" data-title="${escapeHtml(item.title)}" data-difficulty="${escapeHtml(rec?.difficulty || item.difficulty)}">Try it <span>→</span></button></div></article>`;
  }).join('')}</div>`;
}

async function progressPage(): Promise<string> {
  const child = activeChild!;
  const [chart, attempts] = await Promise.all([
    charts.getChartSummary(child.id, 'month'),
    learning.getChildAttempts(child.id),
  ]);
  const report = activityTracker.getSummary(child.id, child.name, '30days');
  return `<section class="page-intro"><span class="eyebrow">REAL PRACTICE, REAL PROGRESS</span><h2>Celebrate the steps you’ve taken.</h2><p>Your progress is built from completed activities, not made-up scores.</p></section>
    <section class="stats-grid progress-stats">${statCard('✓', 'Completed activities', attempts.length, 'Recorded learning attempts')}${statCard('◎', 'Accuracy', chart.overallAccuracy === null ? '—' : `${chart.overallAccuracy}%`, 'Across selected practice')}${statCard('◷', 'Practice time', `${Math.round(report.totalActiveSeconds / 60)} min`, 'Tracked active sessions')}${statCard('✦', 'Sessions', report.totalSessions, 'In the last 30 days')}</section>
    <section class="surface progress-panel"><div class="section-heading"><div><span class="eyebrow">LAST 30 DAYS</span><h2>Reading confidence</h2><p>${chart.isEmpty ? escapeHtml(chart.emptyMessage) : `${chart.totalAttempts} recorded ${chart.totalAttempts === 1 ? 'attempt' : 'attempts'} · ${chart.trend === 'none' ? 'not enough data for a trend yet' : `trend ${chart.trend}`}`}</p></div></div>
      ${chart.isEmpty ? '<div class="chart-empty"><span>🌱</span><p>Complete a practice adventure to start your chart.</p></div>' : `<div class="accuracy-bars progress-bars">${chart.dataPoints.slice(-14).map(point => `<div class="bar-item"><div class="bar-track"><span class="bar-fill" style="height:${Math.max(8, point.accuracyPercent)}%"></span></div><small>${escapeHtml(point.dayLabel)}</small></div>`).join('')}</div>`}
    </section>
    <section class="surface progress-panel"><div class="section-heading"><div><span class="eyebrow">RECENT LEARNING</span><h2>Practice history</h2></div></div>${attempts.length ? `<div class="history-list">${[...attempts].reverse().slice(0, 8).map(attempt => `<div class="history-row"><span class="history-icon">📖</span><span><strong>${escapeHtml(attempt.activityId.replace(/^act_/, '').replace(/_/g, ' '))}</strong><small>${new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></span><b>${Math.round(attempt.accuracy * 100)}%</b></div>`).join('')}</div>` : '<p class="empty-note">Your completed activities will show up here.</p>'}</section>`;
}

async function resourcesPage(): Promise<string> {
  const status = await tinyFish.checkStatus();
  return `<section class="page-intro"><span class="eyebrow">A LITTLE MORE TO EXPLORE</span><h2>Find something fun to read or try.</h2><p>Search public educational resources by topic, level, language, and type.</p></section>
    <div class="resource-status ${status.configured ? 'status-ready' : 'status-off'}"><span class="status-dot"></span><span><strong>${status.configured ? 'Resource search is ready' : 'Resource search needs setup'}</strong><small>${status.configured ? 'TinyFish is configured on the backend.' : 'Configure TINYFISH_API_KEY on the backend to enable live search.'}</small></span></div>
    <section class="surface resource-panel"><form id="resource-form" class="resource-form">
      <label class="resource-topic">What would you like to learn about?<input name="topic" maxlength="100" required placeholder="Try “phonics sounds” or “short stories”" /></label>
      <label>Reading level<select name="grade"><option value="any">Any level</option><option>Kindergarten · Early reader</option><option>Class 1-2 · Growing reader</option><option>Class 3-4 · Fluent reader</option><option>Class 5-6 · Confident reader</option><option>${escapeHtml(activeChild!.grade)}</option></select></label>
      <label>Resource type<select name="resourceType"><option value="any">Any type</option><option value="reading_exercise">Reading exercise</option><option value="phonics_activity">Phonics activity</option><option value="educational_game">Educational game</option><option value="worksheet">Worksheet</option></select></label>
      <label>Language<select name="language">${(['English', 'Hindi', 'Punjabi', 'Bengali'] as SupportedLanguage[]).map(lang => `<option ${lang === activeChild!.preferredLanguage ? 'selected' : ''}>${lang}</option>`).join('')}</select></label>
      <button class="button button-primary resource-submit" type="submit">Search resources <span>⌕</span></button>
    </form><div class="suggestion-row"><span>Try:</span>${['phonics sound patterns', 'sight words practice', 'reading comprehension stories', 'rhyming word games'].map(topic => `<button type="button" class="suggestion-chip" data-action="resource-suggestion" data-topic="${escapeHtml(topic)}">${escapeHtml(topic)}</button>`).join('')}</div></section>
    <p class="disclaimer">ℹ️ Educational suggestions are retrieved from public sources. Review each resource for suitability; accessibility or dyslexia adaptation has not been clinically evaluated.</p>
    <div id="resource-results">${resourceResults.length ? renderResources(resourceResults) : ''}</div>`;
}

function renderResources(resources: EducationalResource[]): string {
  if (!resources.length) return '<div class="surface empty-note">No resources found for this search. Try another topic or language.</div>';
  return `<section class="resource-results"><div class="section-heading"><div><span class="eyebrow">SEARCH RESULTS</span><h2>${resources.length} learning ${resources.length === 1 ? 'idea' : 'ideas'}</h2></div></div><div class="resource-result-grid">${resources.map(resource => {
    let safeUrl = '';
    try {
      const parsed = new URL(resource.url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') safeUrl = parsed.href;
    } catch { safeUrl = ''; }
    return `<article class="surface resource-result-card"><span class="resource-result-icon">📘</span><span class="activity-tag">${escapeHtml(resource.resourceType.replace(/_/g, ' '))}</span><h3>${escapeHtml(resource.title)}</h3><p>${escapeHtml(resource.summary)}</p><div class="resource-source">${escapeHtml(resource.siteName)} · ${escapeHtml(resource.language)}${resource.gradeLevel ? ` · ${escapeHtml(resource.gradeLevel)}` : ''}</div>${resource.accessibilityNotes ? `<p class="accessibility-note">${escapeHtml(resource.accessibilityNotes)}</p>` : ''}${safeUrl ? `<a class="button button-quiet external-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">Open resource ↗</a>` : '<span class="muted">No safe external link available</span>'}</article>`;
  }).join('')}</div>${resourceDisclaimer ? `<p class="disclaimer">${escapeHtml(resourceDisclaimer)}</p>` : ''}</section>`;
}

async function renderAppPage(): Promise<void> {
  const renderRevision = ++appRenderRevision;
  const user = auth.getCurrentUser();
  if (!user) {
    renderAuth();
    return;
  }

  const children = await profiles.getChildren(user.id);
  if (renderRevision !== appRenderRevision) return;
  const storedActiveChild = profiles.getActiveChild();
  activeChild = activeChild && children.some(child => child.id === activeChild!.id)
    ? activeChild
    : storedActiveChild && children.some(child => child.id === storedActiveChild.id)
      ? storedActiveChild
      : null;
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
    content.innerHTML = `<section class="surface error-panel"><span>⚠️</span><h2>We couldn’t load this view.</h2><p>${escapeHtml(error instanceof Error ? error.message : 'Please try again.')}</p><button class="button button-primary" type="button" data-action="retry">Try again</button></section>`;
  }
}

function showProfileForm(child?: ChildProfile): void {
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';
  modal.innerHTML = `<div class="modal-backdrop" data-action="dismiss-modal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
    <div class="modal-heading"><div><span class="eyebrow">LEARNER PROFILE</span><h2 id="profile-modal-title">${child ? 'Update learner' : 'Add a learner'}</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button></div>
    <form id="child-form" class="form-stack">
      <input type="hidden" name="childId" value="${escapeHtml(child?.id || '')}" />
      <label>Learner’s name<input name="name" required maxlength="60" value="${escapeHtml(child?.name || '')}" placeholder="First name" /></label>
      <label>Reading level<select name="grade"><option ${child?.grade.includes('2') ? 'selected' : ''}>Class 2 · Early reader</option><option ${child?.grade.includes('3') ? 'selected' : ''}>Class 3 · Growing reader</option><option ${child?.grade.includes('4') ? 'selected' : ''}>Class 4 · Little reader</option><option ${child?.grade.includes('5') ? 'selected' : ''}>Class 5 · Confident reader</option></select></label>
      <label>Preferred language<select name="language">${(['English', 'Hindi', 'Punjabi', 'Bengali'] as SupportedLanguage[]).map(lang => `<option ${lang === (child?.preferredLanguage || 'English') ? 'selected' : ''}>${lang}</option>`).join('')}</select></label>
      <label>Avatar<select name="avatar">${['👧🏽', '👦🏻', '🧒🏽', '🦊', '🐼', '🦉'].map(avatar => `<option ${avatar === (child?.avatar || '👧🏽') ? 'selected' : ''}>${avatar}</option>`).join('')}</select></label>
      <p class="form-message" id="child-message" aria-live="polite"></p>
      <button class="button button-primary button-wide" type="submit">${child ? 'Save changes' : 'Create learner profile'}</button>
    </form>
  </section></div>`;
  modal.querySelector<HTMLInputElement>('[name="name"]')?.focus();
}

function showSettings(): void {
  const hasPin = auth.hasParentPin();
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (!modal) return;
  document.body.style.overflow = 'hidden';
  modal.innerHTML = `<div class="modal-backdrop" data-action="dismiss-modal"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div class="modal-heading"><div><span class="eyebrow">PARENT CONTROLS</span><h2 id="settings-title">Account &amp; privacy</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Close">×</button></div>
    <p class="muted">Signed in as ${escapeHtml(auth.getCurrentUser()?.email)}. ${auth.isLiveDatabaseConnected() ? 'Live database connected.' : 'Using local demo storage.'}</p>
    ${hasPin ? `<form id="verify-pin-form" class="form-stack settings-form">
      <label>Verify parent PIN<input name="verifyPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="4-digit PIN" /></label>
      <button class="button button-quiet button-wide" type="submit">Verify PIN</button>
      <p id="verify-pin-message" class="form-message" aria-live="polite"></p>
    </form>` : ''}
    <form id="pin-form" class="form-stack settings-form">
      ${hasPin ? '<label>Current parent PIN<input name="oldPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="4-digit PIN" /></label>' : ''}
      <label>${hasPin ? 'New parent PIN' : 'Set a parent PIN'}<input name="newPin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="Choose a 4-digit PIN" /></label>
      <button class="button button-primary button-wide" type="submit">${hasPin ? 'Change parent PIN' : 'Set parent PIN'}</button>
      <p id="pin-message" class="form-message" aria-live="polite"></p>
    </form>
  </section></div>`;
  modal.querySelector<HTMLInputElement>('input')?.focus();
}

async function startActivity(skillId: string, title: string, difficulty: string): Promise<void> {
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
  practiceResourceMessage = 'Finding a related TinyFish learning resource…';
  practiceResourceRequestId++;
  activityAttempts = 0;
  activityHints = 0;
  activityMissedItems = [];
  activitySaving = false;
  activitySaveFailed = false;
  const modal = root!.querySelector<HTMLElement>('#modal-root');
  if (modal) {
    modal.innerHTML = '<div class="modal-backdrop"><section class="modal-card loading-state" role="status"><span class="spinner"></span>Preparing your reading adventure…</section></div>';
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
  modal.innerHTML = `<div class="modal-backdrop" data-action="dismiss-modal"><section class="modal-card activity-modal" lang="${languageCode}" role="dialog" aria-modal="true" aria-labelledby="activity-title">
    <div class="modal-heading"><div><span class="eyebrow">${escapeHtml(activity.difficulty)} · ${escapeHtml(activity.language)}</span><h2 id="activity-title">${escapeHtml(activity.title)}</h2></div><button class="icon-button" type="button" data-action="close-activity" aria-label="Close activity">×</button></div>
    <div class="activity-instruction"><small>QUESTION ${activityQuestionNumber} OF ${activityQuestionLimit} · YOUR CHALLENGE</small><p>${escapeHtml(activity.instruction)}</p></div>
    <div class="activity-prompt"><h3>${escapeHtml(activity.prompt)}</h3>${activity.audioPrompt ? `<button class="text-button" type="button" data-action="speak-prompt" aria-label="Hear the question aloud">🔊 Hear the question aloud</button>` : ''}</div>
    <div class="answer-grid">${activity.items.map(item => `<button type="button" class="answer-option${activityMissedItems.includes(item.text) ? ' answer-missed' : ''}" data-action="answer" data-item="${escapeHtml(item.id)}" ${answered ? 'disabled' : ''}>${item.visual ? `<span>${escapeHtml(item.visual)}</span>` : ''}<strong>${escapeHtml(item.text)}</strong></button>`).join('')}</div>
    <p class="answer-feedback ${feedbackIsPositive ? 'feedback-good' : 'feedback-neutral'}" aria-live="polite">${escapeHtml(feedback)}</p>
    <div id="practice-resource" class="practice-resource" aria-live="polite">${practiceResourceMarkup()}</div>
    <div class="activity-controls"><button type="button" class="button button-quiet" data-action="activity-hint" ${answered ? 'disabled' : ''}>💡 Get a hint</button>${activity.workedExample ? `<button type="button" class="button button-quiet" data-action="activity-example" ${answered ? 'disabled' : ''}>👀 Show an example</button>` : ''}${answered ? activitySaveFailed ? `<button type="button" class="button button-quiet" data-action="close-activity">Close activity</button>` : activityQuestionNumber < activityQuestionLimit ? `<button type="button" class="button button-quiet" data-action="finish-activity" ${activitySaving ? 'disabled' : ''}>Finish adventure</button><button type="button" class="button button-primary" data-action="next-question" ${activitySaving ? 'disabled' : ''}>Next question →</button>` : `<button type="button" class="button button-primary" data-action="finish-activity" ${activitySaving ? 'disabled' : ''}>${activitySaving ? 'Saving…' : 'Finish and save'}</button>` : ''}</div>
  </section></div>`;
  modal.querySelector<HTMLElement>('.icon-button')?.focus();
}

function practiceResourceMarkup(): string {
  if (practiceResource) {
    return `<span class="practice-resource-label">Related TinyFish resource</span><a href="${escapeHtml(practiceResource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(practiceResource.title)} <span aria-hidden="true">↗</span></a><small>${escapeHtml(practiceResource.siteName)}</small>`;
  }
  return `<span class="practice-resource-label">Related TinyFish resource</span><small>${escapeHtml(practiceResourceMessage)}</small>`;
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
      ? 'TinyFish is not configured yet. You can keep practicing.'
      : response.error || 'No related resource was found. You can keep practicing.';
  } catch (error) {
    if (requestId !== practiceResourceRequestId) return;
    console.error('TinyFish practice resource lookup failed:', error);
    practiceResourceMessage = 'TinyFish could not find a resource right now. You can keep practicing.';
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
  if (modal) modal.innerHTML = '<div class="modal-backdrop"><section class="modal-card loading-state" role="status"><span class="spinner"></span>Preparing your next question…</section></div>';

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
  toast(`Adventure complete — +${5 * attempts.length} happy points!`);
  await renderAppPage();
}

async function submitResourceSearch(form: HTMLFormElement): Promise<void> {
  const data = new FormData(form);
  const topic = String(data.get('topic') || '').trim();
  const results = root!.querySelector<HTMLElement>('#resource-results');
  if (!topic || !results) return;
  results.innerHTML = '<div class="loading-state"><span class="spinner"></span>Searching for learning resources…</div>';
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
      results.innerHTML = `<div class="surface error-panel"><span>⚠️</span><h2>Search couldn’t be completed.</h2><p>${escapeHtml(response.error)}</p></div>`;
      return;
    }
    results.innerHTML = renderResources(response.resources);
  } catch (error) {
    console.error('Resource search failed:', error);
    results.innerHTML = `<div class="surface error-panel"><span>⚠️</span><h2>Search couldn’t be completed.</h2><p>${escapeHtml(error instanceof Error ? error.message : 'Please try again.')}</p></div>`;
  }
}

root!.addEventListener('click', async event => {
  const target = event.target as HTMLElement;
  const control = target.closest<HTMLElement>('[data-action]');
  if (!control) return;
  const action = control.dataset.action;

  try {
    if (action === 'toggle-auth') {
      authMode = authMode === 'login' ? 'register' : 'login';
      renderAuth();
    } else if (action === 'logout') {
      closeModal();
      await auth.logout();
      profiles.setActiveChild(null);
      activeChild = null;
      learningPath = null;
      activePage = 'home';
      renderAuth();
    } else if (action === 'reset-password') {
      const email = root!.querySelector<HTMLInputElement>('[name="email"]')?.value || '';
      if (!email.trim()) {
        toast('Enter your email address first.', true);
        return;
      }
      const result = await auth.resetPassword(email);
      toast(result.message, !result.success);
    } else if (action === 'navigate' || action === 'navigate-practice' || action === 'navigate-resources') {
      activePage = action === 'navigate-practice' ? 'practice' : action === 'navigate-resources' ? 'resources' : control.dataset.page || 'home';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await renderAppPage();
    } else if (action === 'retry') {
      await renderAppPage();
    } else if (action === 'profiles') {
      profiles.setActiveChild(null);
      activeChild = null;
      await renderAppPage();
    } else if (action === 'select-child') {
      const user = auth.getCurrentUser();
      const children = user ? await profiles.getChildren(user.id) : [];
      activeChild = children.find(child => child.id === control.dataset.id) || null;
      if (!activeChild) throw new Error('That learner profile is no longer available.');
      profiles.setActiveChild(activeChild);
      learningPath = await learning.getOrGeneratePath(activeChild);
      activePage = 'home';
      await renderAppPage();
    } else if (action === 'add-child') {
      showProfileForm();
    } else if (action === 'edit-child' || action === 'delete-child') {
      const childId = control.dataset.id || '';
      const child = (await profiles.getChildren(auth.getCurrentUser()!.id)).find(item => item.id === childId);
      if (!child) throw new Error('Learner profile not found.');
      if (action === 'edit-child') showProfileForm(child);
      else if (window.confirm(`Remove ${child.name}’s learner profile? This cannot be undone.`)) {
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
        renderActivityModal(selected.feedbackHint || 'Great work! You found it. 🌟', true, true);
      } else {
        if (!activityMissedItems.includes(selected.text)) activityMissedItems.push(selected.text);
        renderActivityModal(selected.feedbackHint || 'Nice try. Take another look and try again.', false);
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
        utterance.lang = speechLocales[language];
        utterance.rate = 0.85;
        const matchingVoice = window.speechSynthesis.getVoices().find(voice =>
          voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase())
        );
        if (matchingVoice) utterance.voice = matchingVoice;
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
      await renderAppPage();
    } else if (form.id === 'child-form') {
      const data = new FormData(form);
      const currentUser = auth.getCurrentUser();
      if (!currentUser) throw new Error('Please sign in again to manage learner profiles.');
      const childId = String(data.get('childId') || '');
      const profileFields = {
        name: String(data.get('name') || '').trim(),
        grade: String(data.get('grade') || 'Class 3 · Growing reader'),
        preferredLanguage: String(data.get('language') || 'English') as SupportedLanguage,
        avatar: String(data.get('avatar') || '👧🏽'),
      };
      if (childId) {
        const existingChild = await profiles.getChild(childId);
        if (!existingChild) throw new Error('That learner profile is no longer available.');
        const updatedChild = await profiles.updateChild(childId, {
          ...profileFields,
          preferences: existingChild.preferences,
        });
        if (activeChild?.id === childId) {
          activeChild = updatedChild;
          learningPath = null;
        }
        toast('Learner profile updated.');
      } else {
        await profiles.createChild(currentUser.id, {
          ...profileFields,
          preferences: {
            readingSpeed: 'normal',
            dyslexiaFont: false,
            highContrast: false,
            soundEffects: true,
            autoReadAloud: false,
          },
        });
        toast('Learner profile created.');
      }
      closeModal();
      await renderAppPage();
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
    } else if (form.id === 'verify-pin-form') {
      const data = new FormData(form);
      const result = await auth.verifyParentPin(String(data.get('verifyPin') || ''));
      const message = root!.querySelector<HTMLElement>('#verify-pin-message');
      if (message) {
        message.textContent = result.success
          ? 'PIN verified.'
          : result.lockoutSeconds
            ? `Too many tries. Try again in ${result.lockoutSeconds} seconds.`
            : result.error || 'PIN could not be verified.';
      }
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

auth.onAuthStateChanged(user => {
  const userId = user?.id || null;
  if (userId === lastRenderedUserId) return;
  lastRenderedUserId = userId;
  void renderAppPage().catch(error => {
    console.error('Unable to restore the learning space:', error);
    toast('We couldn’t restore your learning space. Please try again.', true);
  });
});
