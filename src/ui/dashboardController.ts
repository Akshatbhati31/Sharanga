import { ProfileService } from '../services/profileService';
import { ActivityTrackerService } from '../services/activityTrackerService';
import type { ChildProfile, SupportedLanguage } from '../types/auth';
import type { ParentDashboardView } from './parentDashboardView';
import { ResourceFinderView } from './resourceFinderView';
import { LearningJourneyView } from './learningJourneyView';
import { ActivityRunnerModal } from './activityRunnerModal';
import { LearningPathService } from '../services/learningPathService';
import { ReadingConfidenceChart } from './readingConfidenceChart';
import { LetterMirrorBDModal } from './letterMirrorBDModal';
import { ACTIVITY_CATALOG } from '../services/activityCatalog';
import { ReadingChartService } from '../services/readingChartService';

export class DashboardController {
  private container: HTMLElement;
  private profileService: ProfileService;
  private activityTracker: ActivityTrackerService;
  private parentDashboardView: ParentDashboardView;
  private onSwitchProfileRequested: () => void;
  private activeChild: ChildProfile | null = null;
  private toastTimer: number | null = null;
  private resourceFinderView: ResourceFinderView | null = null;
  private learningJourneyView: LearningJourneyView | null = null;
  private learningPathService: LearningPathService;
  private homeReadingChart: ReadingConfidenceChart | null = null;
  private progressReadingChart: ReadingConfidenceChart | null = null;


  // Language word banks for Picture Word Match
  private readonly wordBanks: Record<
    SupportedLanguage,
    { words: string[]; prompt: string; pictures: string[] }
  > = {
    English: {
      words: ['ship', 'shop', 'sheep'],
      prompt: 'Which picture shows the word...',
      pictures: ['🚢', '🛍️', '🐑'],
    },
    Hindi: {
      words: ['नाव', 'घर', 'फल'],
      prompt: 'कौन-सी तस्वीर शब्द दिखाती है...',
      pictures: ['🚣', '🏠', '🍎'],
    },
    Punjabi: {
      words: ['ਕਿਤਾਬ', 'ਫੁੱਲ', 'ਘਰ'],
      prompt: 'ਕਿਹੜੀ ਤਸਵੀਰ ਇਹ ਸ਼ਬਦ ਦਿਖਾਉਂਦੀ ਹੈ...',
      pictures: ['📖', '🌸', '🏠'],
    },
    Bengali: {
      words: ['বই', 'ফুল', 'ঘর'],
      prompt: 'কোন ছবিতে এই শব্দটি আছে...',
      pictures: ['📖', '🌸', '🏠'],
    },
  };

  constructor(
    container: HTMLElement,
    parentDashboardView: ParentDashboardView,
    onSwitchProfileRequested: () => void
  ) {
    this.container = container;
    this.profileService = ProfileService.getInstance();
    this.activityTracker = ActivityTrackerService.getInstance();
    this.parentDashboardView = parentDashboardView;
    this.onSwitchProfileRequested = onSwitchProfileRequested;
    this.learningPathService = LearningPathService.getInstance();
  }

  public render(child: ChildProfile): void {
    this.activeChild = child;
    const progress = this.profileService.getChildProgress(child.id);

    // Start tracking active learning session
    this.activityTracker.startActivity(
      child.parentId,
      child.id,
      'general_learning',
      'Home Learning Dashboard'
    );

    // Apply dyslexia font mode if preferred
    document.body.classList.toggle('dyslexia-font-mode', Boolean(child.preferences?.dyslexiaFont));

    this.container.innerHTML = `
      <div class="app">
        <!-- Sidebar Navigation -->
        <aside>
          <div class="brand">
            <div class="brand-mark" aria-hidden="true">✿</div>
            <div class="brand-name">Dyslexi<span>Mate</span></div>
          </div>
          <div class="nav-label">LEARN & GROW</div>
          <nav class="nav" aria-label="Main navigation">
            <button class="active" data-page="home"><span class="ico">⌂</span><span class="label">My home</span></button>
            <button data-page="learn"><span class="ico">✦</span><span class="label">Practice</span></button>
            <button data-page="progress"><span class="ico">▥</span><span class="label">My progress</span></button>
            <button data-page="stories"><span class="ico">▤</span><span class="label">Story shelf</span></button>
            <button data-page="resources"><span class="ico">🌐</span><span class="label">Resource Finder</span></button>
          </nav>
          <div class="side-bottom">
            <div class="side-card">
              <div class="tiny">A little every day 🌱</div>
              <strong id="streakText">You're on a ${progress.streakDays}-day streak!</strong>
              <p>Just 10 minutes a day can grow your reading skills.</p>
              <button type="button" id="btnSideChallenge">See today's challenge</button>
            </div>

            <!-- Active Child Profile Widget -->
            <div class="profile" id="sidebarProfileWidget" style="cursor: pointer;" title="Click to switch profile">
              <div class="avatar" id="sidebarAvatar" aria-hidden="true">${child.avatar}</div>
              <div class="profile-text">
                <strong id="sidebarChildName">${child.name}</strong>
                <small id="sidebarChildGrade">${child.grade}</small>
              </div>
              <span class="dots" aria-hidden="true">⇄</span>
            </div>
            <button type="button" id="btnSidebarSwitchProfile" class="profile-switch-action">
              ⇄ Switch Learner
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main>
          <!-- Top Bar -->
          <div class="topbar">
            <div class="crumb">DyslexiMate <span>›</span> <b id="crumb">My home</b></div>
            <div class="top-actions">
              <button type="button" id="btnGrownupsTop" class="demo-action">
                🔒 Grown-ups
              </button>
              <button type="button" id="btnTopSwitchChild" class="switch-profile-btn" title="Switch child profile">
                <span>${child.avatar}</span> Switch Learner
              </button>
              <div class="date-chip" id="topDateChip">Monday, 20 October</div>
              <div class="streak" id="topStreak">🔥 ${progress.streakDays} day streak</div>
            </div>
          </div>

          <!-- Section: Home Page -->
          <section id="homePage">
            <div class="hero">
              <div class="week-pill">WEEK 2 · LITTLE STEPS</div>
              <div class="hero-copy">
                <div class="eyebrow" id="heroGreeting">You're doing great, ${child.name}!</div>
                <h1>Ready for today's<br>reading adventure?</h1>
                <p>Small practice, big progress. Let's play and learn together.</p>
                <button class="hero-cta" id="btnStartChallenge">Start today's 10 min challenge&nbsp; →</button>
              </div>
              <div class="hero-figure" aria-hidden="true">🦊</div>
            </div>

            <!-- Personalized Adaptive Learning Journey Area -->
            <div id="childLearningJourneyArea" style="margin-top: 18px; margin-bottom: 24px;"></div>

            <div class="section-head">
              <div>
                <h2>Your learning snapshot</h2>
                <p>Look how far you've come this week.</p>
              </div>
              <button class="text-link" id="linkViewProgress">View full report →</button>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-top">Practice time <span class="stat-icon">⏱️</span></div>
                <strong id="statPracticeTime">${progress.practiceMinutes} <small>min</small></strong>
                <small><span class="positive">↑ 12 min</span> from last week</small>
              </div>
              <div class="stat">
                <div class="stat-top">Words learned <span class="stat-icon" style="background:#fff2d0">📚</span></div>
                <strong id="statWordsLearned">${progress.wordsLearned}</strong>
                <small><span class="positive">↑ 6 new</span> words this week</small>
              </div>
              <div class="stat">
                <div class="stat-top">Reading fluency <span class="stat-icon" style="background:#fce9e3">🌿</span></div>
                <strong id="statFluency">${progress.fluencyWpm} <small>wpm</small></strong>
                <small><span class="positive">↑ 4 wpm</span> growing steadily</small>
              </div>
              <div class="stat">
                <div class="stat-top">Happy points <span class="stat-icon" style="background:#f0edff">⭐</span></div>
                <strong id="points">${progress.happyPoints}</strong>
                <small>You're close to your next badge!</small>
              </div>
            </div>

            <div class="content-grid">
              <div id="homeReadingChartContainer"></div>

              <div class="card">
                <div class="card-title">
                  <div>
                    <h3>Words to practice</h3>
                    <p>Let's give these another try.</p>
                  </div>
                  <button class="text-link" id="linkPracticeMistakes">Practice →</button>
                </div>
                <div class="mistake-list" id="homeMistakeList">
                  ${progress.mistakes
                    .map(
                      m => `
                    <div class="mistake">
                      <div class="word-bubble">${m.word}</div>
                      <div class="mistake-copy">
                        <strong>${m.note.split('(')[0]}</strong>
                        <small>${m.note.includes('(') ? m.note.split('(')[1].replace(')', '') : 'Practice with coach'}</small>
                      </div>
                      <span class="mistake-count">${m.count} times</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>

            <div class="content-grid" style="margin-top:16px">
              <div class="card">
                <div class="card-title">
                  <div>
                    <h3>Today's recommended activities</h3>
                    <p>Picked just for your learning journey.</p>
                  </div>
                  <span class="tag">MADE FOR YOU</span>
                </div>
                <div class="activity-list">
                  <div class="activity" id="actMirror" role="button" tabindex="0">
                    <div class="act-icon" style="background:#fff1d2">🔤</div>
                    <div class="act-copy">
                      <strong>Letter mirror: b and d</strong>
                      <small>Spot the difference · 3 min</small>
                    </div>
                    <span class="tag">Easy</span>
                  </div>
                  <div class="activity" id="actStory" role="button" tabindex="0">
                    <div class="act-icon" style="background:#e8f3ff">🎧</div>
                    <div class="act-copy">
                      <strong>Listen & read: Sunny's kite</strong>
                      <small>Read-aloud story · 5 min</small>
                    </div>
                    <span class="tag">Story</span>
                  </div>
                  <div class="activity" id="actVoice" role="button" tabindex="0">
                    <div class="act-icon" style="background:#f3edff">🗣️</div>
                    <div class="act-copy">
                      <strong>Say it, spell it!</strong>
                      <small>Voice spelling · 2 min</small>
                    </div>
                    <span class="tag">Play</span>
                  </div>
                </div>
              </div>

              <div class="resource-card">
                <div class="resource-icon">📖</div>
                <div>
                  <strong>Stories from around India</strong>
                  <p>Discover a new story for your reading level (${child.preferredLanguage}).</p>
                </div>
                <button type="button" id="btnExploreStories">Explore stories</button>
              </div>
            </div>
          </section>

          <!-- Section: Learn / Practice Page -->
          <section id="learnPage" class="hidden">
            <div class="learn-heading">
              <div>
                <h1>Let's learn by playing! 🎈</h1>
                <p>Every try helps your brain grow, ${child.name}. You're doing wonderfully.</p>
              </div>
              <div class="lang-select">
                <label for="practiceLanguage">Learning in</label>
                <select id="practiceLanguage">
                  <option value="English" ${child.preferredLanguage === 'English' ? 'selected' : ''}>🇬🇧 English</option>
                  <option value="Hindi" ${child.preferredLanguage === 'Hindi' ? 'selected' : ''}>🇮🇳 हिन्दी · Hindi</option>
                  <option value="Punjabi" ${child.preferredLanguage === 'Punjabi' ? 'selected' : ''}>🇮🇳 ਪੰਜਾਬੀ · Punjabi</option>
                  <option value="Bengali" ${child.preferredLanguage === 'Bengali' ? 'selected' : ''}>🇮🇳 বাংলা · Bengali</option>
                </select>
              </div>
            </div>

            <div class="daily">
              <div class="daily-icon">🌞</div>
              <div class="daily-copy">
                <strong>Today's 10-minute challenge</strong>
                <p>Three little games, one big high-five. You're 4 minutes in!</p>
              </div>
              <div class="progress-small">
                <div>4 / 10 min</div>
                <div class="bar"><i></i></div>
              </div>
            </div>

            <!-- Picture Word Match Game -->
            <div class="game">
              <div class="game-top">
                <div class="game-type"><span>GAME 2 OF 3</span> Picture word match</div>
                <div class="game-progress">Your challenge <div class="bar"><i></i></div></div>
              </div>
              <div class="prompt">
                <div class="instruction" id="instruction">Which picture shows the word...</div>
                <h2 id="targetWord">ship</h2>
                <p>Tap a picture, then check your answer.</p>
              </div>
              <div class="options" id="options">
                <button type="button" class="option" data-word="ship">
                  <div class="picture">🚢</div>
                  <strong>ship</strong>
                  <small>tap to choose</small>
                </button>
                <button type="button" class="option" data-word="shop">
                  <div class="picture">🛍️</div>
                  <strong>shop</strong>
                  <small>tap to choose</small>
                </button>
                <button type="button" class="option" data-word="sheep">
                  <div class="picture">🐑</div>
                  <strong>sheep</strong>
                  <small>tap to choose</small>
                </button>
              </div>
              <div class="game-bottom">
                <button type="button" class="secondary" id="btnHearWord">🔊&nbsp; Hear the word</button>
                <button type="button" class="primary" id="btnCheckAnswer">Check my answer&nbsp; ✓</button>
              </div>
              <div class="feedback" id="feedback" aria-live="polite"></div>
            </div>

            <div class="below-grid">
              <div class="mini-card">
                <div class="mini-icon">🎙️</div>
                <div>
                  <strong>Voice spelling</strong>
                  <p>Say a word and watch it appear.</p>
                </div>
                <button type="button" id="btnVoicePractice">Try it →</button>
              </div>
              <div class="mini-card" id="cardBadge" role="button" tabindex="0">
                <div class="mini-icon" style="background:#fff2d0">🏅</div>
                <div>
                  <strong>You're earning your sound explorer badge!</strong>
                  <p>2 more games to unlock it.</p>
                </div>
              </div>
            </div>

            <!-- Interactive Activity Center (12 Prioritized Learning Activities) -->
            <div class="card" style="margin-top: 24px;">
              <div class="card-title" style="flex-wrap: wrap; gap: 8px;">
                <div>
                  <h3 style="font: 900 19px Nunito; margin: 0 0 4px; color: var(--ink);">Interactive Learning Adventures 🚀</h3>
                  <p style="font-size: 13px; color: var(--muted); margin: 0;">Explore phonics, letter discrimination, spelling, and reading comprehension games.</p>
                </div>
                <span class="tag" style="background: var(--teal); color: #fff;">12 ADVENTURES</span>
              </div>

              <div class="activity-catalog-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-top: 16px;">
                ${ACTIVITY_CATALOG.map(item => `
                  <div class="activity-catalog-card" style="background: #fff; border: 1.5px solid var(--line); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: var(--shadow-sm); transition: transform 0.15s ease, border-color 0.15s ease;">
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <div style="width: 42px; height: 42px; border-radius: 12px; background: ${item.colorBg}; font-size: 22px; display: grid; place-items: center;">
                          ${item.icon}
                        </div>
                        <span class="tag" style="font-size: 10px; background: #f3f6f8; color: #516269;">${item.tag}</span>
                      </div>
                      <strong style="font: 800 15px Nunito; color: var(--ink); display: block; margin-bottom: 4px;">${item.title}</strong>
                      <p style="font-size: 12px; color: var(--muted); margin: 0 0 12px; line-height: 1.45;">${item.description}</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #f2f4f0;">
                      <small style="font-size: 11px; color: #7f8b8f; font-weight: 700;">⏱️ ~${item.estimatedMinutes} min</small>
                      <button type="button" class="btn-play-catalog-act hero-cta" data-act-id="${item.id}" data-skill-id="${item.skillId}" data-title="${item.title}" style="padding: 9px 18px; font-size: 12px; min-height: 44px;">
                        Play →
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </section>

          <!-- Section: My Progress Page -->
          <section id="progressPage" class="hidden">
            <div class="learn-heading">
              <div>
                <h1>Your progress is growing 🌱</h1>
                <p>Every practice session is a win for ${child.name}. Here's what you've achieved.</p>
              </div>
              <div class="select-wrap">
                <select aria-label="Report time period">
                  <option>This week</option>
                  <option>This month</option>
                </select>
              </div>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-top">Practice time <span class="stat-icon">⏱️</span></div>
                <strong>${progress.practiceMinutes} <small>min</small></strong>
                <small>${progress.streakDays} happy learning days</small>
              </div>
              <div class="stat">
                <div class="stat-top">Words learned <span class="stat-icon">📚</span></div>
                <strong>${progress.wordsLearned}</strong>
                <small>6 new this week</small>
              </div>
              <div class="stat">
                <div class="stat-top">Reading fluency <span class="stat-icon">🌿</span></div>
                <strong>${progress.fluencyWpm} <small>wpm</small></strong>
                <small>Up 4 words per minute</small>
              </div>
              <div class="stat">
                <div class="stat-top">Accuracy <span class="stat-icon">✨</span></div>
                <strong>${progress.accuracyPercent}<small>%</small></strong>
                <small>Getting closer to your goal!</small>
              </div>
            </div>

            <div class="content-grid">
              <div id="progressReadingChartContainer"></div>

              <div class="card">
                <div class="card-title">
                  <div>
                    <h3>Practice next</h3>
                    <p>Helpful ideas from your learning coach.</p>
                  </div>
                </div>
                <div class="activity-list">
                  <div class="activity">
                    <div class="act-icon" style="background:#fff1d2">🔤</div>
                    <div class="act-copy">
                      <strong>Letter mirror: b and d</strong>
                      <small>Build letter confidence</small>
                    </div>
                  </div>
                  <div class="activity">
                    <div class="act-icon" style="background:#e8f3ff">🎧</div>
                    <div class="act-copy">
                      <strong>Words with “sh”</strong>
                      <small>Listen and read aloud</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card" style="margin-top:16px">
              <div class="card-title">
                <div>
                  <h3>Words we're practicing together</h3>
                  <p>We'll keep these in your game rotation.</p>
                </div>
              </div>
              <div class="mistake-list" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr))">
                ${progress.mistakes
                  .map(
                    m => `
                  <div class="mistake">
                    <div class="word-bubble">${m.word}</div>
                    <div class="mistake-copy">
                      <strong>${m.note}</strong>
                      <small>${m.count} tries this week</small>
                    </div>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
          </section>

          <!-- Section: Story Shelf Page -->
          <section id="storiesPage" class="hidden">
            <div class="learn-heading">
              <div>
                <h1>A story shelf just for you 📚</h1>
                <p>Little adventures picked for ${child.name}'s reading level (${child.grade}).</p>
              </div>
              <div class="lang-select">
                <select id="storyLanguageSelect">
                  <option value="English" ${child.preferredLanguage === 'English' ? 'selected' : ''}>🇬🇧 English</option>
                  <option value="Hindi" ${child.preferredLanguage === 'Hindi' ? 'selected' : ''}>🇮🇳 Hindi</option>
                  <option value="Punjabi" ${child.preferredLanguage === 'Punjabi' ? 'selected' : ''}>🇮🇳 Punjabi</option>
                  <option value="Bengali" ${child.preferredLanguage === 'Bengali' ? 'selected' : ''}>🇮🇳 Bengali</option>
                </select>
              </div>
            </div>

            <div class="hero" style="background:#496a9a; min-height:150px">
              <div class="hero-copy">
                <div class="eyebrow" id="storyHeroGrade">YOUR STORY OF THE DAY · ${child.grade.toUpperCase()}</div>
                <h1>Sunny and the little kite</h1>
                <p>A joyful story about trying again when the wind says no.</p>
                <button class="hero-cta" id="btnReadSunnyStory">Read this story →</button>
              </div>
              <div class="hero-figure" aria-hidden="true">🪁</div>
            </div>

            <div class="section-head">
              <div>
                <h2>More stories to explore</h2>
                <p>Stories with clear words and friendly read-aloud.</p>
              </div>
              <span class="tag" id="storyTagLevel">${child.preferredLanguage.toUpperCase()} · ${child.grade.toUpperCase()}</span>
            </div>

            <div class="content-grid">
              <div class="card">
                <div style="font-size:34px">🐘</div>
                <h3 style="font:900 16px Nunito; margin:9px 0 4px">Mina and the river</h3>
                <p style="font-size:11px; color:#829094; margin:0">A kind elephant finds a way to help her friends.</p>
                <button class="text-link" style="padding:12px 0 0" id="btnReadMina">Read story →</button>
              </div>
              <div class="card">
                <div style="font-size:34px">🌻</div>
                <h3 style="font:900 16px Nunito; margin:9px 0 4px">The sunflower's wish</h3>
                <p style="font-size:11px; color:#829094; margin:0">A little seed discovers how tall it can grow.</p>
                <button class="text-link" style="padding:12px 0 0" id="btnReadSunflower">Read story →</button>
              </div>
            </div>

            <div class="resource-card" style="margin-top:16px">
              <div class="resource-icon">🌐</div>
              <div>
                <strong>Educational Resource Finder · TinyFish Web Agent</strong>
                <p>Find age-appropriate public worksheets, phonics activities, and games in ${child.preferredLanguage} across verified educational sites.</p>
              </div>
              <button type="button" id="btnFindTinyFishStories">Find resources</button>
            </div>
          </section>

          <!-- Section: Educational Resource Finder Page -->
          <section id="resourcesPage" class="hidden"></section>
        </main>
      </div>

      <!-- Toast Notification Container -->
      <div class="toast" id="toast" role="status"></div>

      <!-- Generic Pitch / Story Modal Backdrop -->
      <div id="dashboardModal" class="modal-backdrop hidden" role="dialog" aria-modal="true">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h2 id="dashModalTitle"></h2>
              <p id="dashModalSubtitle"></p>
            </div>
            <button type="button" class="modal-close" id="btnCloseDashModal" aria-label="Close">×</button>
          </div>
          <div id="dashModalContent" class="modal-body"></div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.updateLanguageGame(child.preferredLanguage);

    // Initialize & render Adaptive Learning Journey
    const journeyContainer = this.container.querySelector('#childLearningJourneyArea') as HTMLElement;
    if (journeyContainer) {
      this.learningJourneyView = new LearningJourneyView(journeyContainer, () => {
        this.refreshDashboardAfterActivity();
      });
      this.learningJourneyView.render(child);
    }

    // Initialize & render Data-Driven Reading Accuracy Charts
    const homeChartEl = this.container.querySelector('#homeReadingChartContainer') as HTMLElement;
    if (homeChartEl) {
      this.homeReadingChart = new ReadingConfidenceChart(homeChartEl, child.id);
      this.homeReadingChart.render('week');
    }

    const progChartEl = this.container.querySelector('#progressReadingChartContainer') as HTMLElement;
    if (progChartEl) {
      this.progressReadingChart = new ReadingConfidenceChart(progChartEl, child.id);
      this.progressReadingChart.render('week');
    }
  }

  // -------------------------------------------------------------
  // Navigation & Page Switching
  // -------------------------------------------------------------
  private switchPage(name: 'home' | 'learn' | 'progress' | 'stories' | 'resources'): void {
    const titles: Record<string, string> = {
      home: 'My home',
      learn: 'Practice',
      progress: 'My progress',
      stories: 'Story shelf',
      resources: 'Educational Resource Finder',
    };

    if (this.activeChild) {
      if (name === 'home') {
        this.activityTracker.startActivity(this.activeChild.parentId, this.activeChild.id, 'general_learning', 'Home Learning Dashboard');
        if (this.learningJourneyView && this.activeChild) {
          this.learningJourneyView.render(this.activeChild);
        }
        this.homeReadingChart?.refresh(this.activeChild.id);
      } else if (name === 'learn') {
        this.activityTracker.startActivity(this.activeChild.parentId, this.activeChild.id, 'practice_game', 'Picture Word Match Game');
      } else if (name === 'progress') {
        this.activityTracker.startActivity(this.activeChild.parentId, this.activeChild.id, 'general_learning', 'Progress View');
        this.progressReadingChart?.refresh(this.activeChild.id);
      } else if (name === 'stories') {
        this.activityTracker.startActivity(this.activeChild.parentId, this.activeChild.id, 'story_reading', 'Story Shelf Exploration');
      } else if (name === 'resources') {
        this.activityTracker.startActivity(this.activeChild.parentId, this.activeChild.id, 'general_learning', 'Educational Resource Finder');
        const resourcesContainer = this.container.querySelector('#resourcesPage') as HTMLElement;
        if (resourcesContainer) {
          if (!this.resourceFinderView) {
            this.resourceFinderView = new ResourceFinderView(resourcesContainer);
          }
          this.resourceFinderView.setDefaults(
            this.activeChild.preferredLanguage,
            this.activeChild.grade
          );
          this.resourceFinderView.render();
        }
      }
    }

    const sections = this.container.querySelectorAll('main section[id$="Page"]');
    sections.forEach(s => s.classList.add('hidden'));

    const target = this.container.querySelector(`#${name}Page`);
    if (target) target.classList.remove('hidden');

    this.container.querySelectorAll('.nav button').forEach(b => {
      b.classList.toggle('active', (b as HTMLElement).dataset.page === name);
    });

    const crumb = this.container.querySelector('#crumb');
    if (crumb) crumb.textContent = titles[name];

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // -------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------
  private bindEvents(): void {
    // Navigation buttons
    this.container.querySelectorAll('.nav button').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = (btn as HTMLElement).dataset.page as 'home' | 'learn' | 'progress' | 'stories' | 'resources';
        if (page) this.switchPage(page);
      });
    });

    // Profile Switch triggers (stop activity to avoid bleeding into another child)
    const handleSwitchChild = () => {
      this.activityTracker.stopActivity();
      this.onSwitchProfileRequested();
    };

    this.container.querySelector('#btnSidebarSwitchProfile')?.addEventListener('click', handleSwitchChild);
    this.container.querySelector('#sidebarProfileWidget')?.addEventListener('click', handleSwitchChild);
    this.container.querySelector('#btnTopSwitchChild')?.addEventListener('click', handleSwitchChild);

    // Grown-ups / Parent Dashboard
    this.container.querySelector('#btnGrownupsTop')?.addEventListener('click', () => {
      this.parentDashboardView.requestParentAccess(() => {
        this.parentDashboardView.openDashboard();
      });
    });

    // CTA links
    this.container.querySelector('#btnStartChallenge')?.addEventListener('click', async () => {
      if (this.activeChild) {
        const path = await this.learningPathService.getOrGeneratePath(this.activeChild);
        const topRec = path.recommendations[0];
        if (topRec) {
          ActivityRunnerModal.getInstance().startRecommendation(this.activeChild, topRec, () => {
            this.refreshStats();
            this.learningJourneyView?.render(this.activeChild!);
          });
          return;
        }
      }
      this.switchPage('learn');
      this.showToast('Today’s 10-minute challenge is ready 🌞');
    });
    this.container.querySelector('#btnSideChallenge')?.addEventListener('click', () => {
      this.switchPage('learn');
      this.showToast('Your daily challenge is ready! ✨');
    });
    this.container.querySelector('#linkViewProgress')?.addEventListener('click', () => {
      this.switchPage('progress');
    });
    this.container.querySelector('#linkPracticeMistakes')?.addEventListener('click', () => {
      this.switchPage('learn');
    });
    this.container.querySelector('#btnExploreStories')?.addEventListener('click', () => {
      this.switchPage('stories');
    });

    // Language Change on Practice page
    const langSelect = this.container.querySelector('#practiceLanguage') as HTMLSelectElement;
    langSelect?.addEventListener('change', async () => {
      const newLang = langSelect.value as SupportedLanguage;
      this.updateLanguageGame(newLang);
      if (this.activeChild) {
        await this.profileService.updateChild(this.activeChild.id, {
          preferredLanguage: newLang,
        });
        this.activeChild.preferredLanguage = newLang;
      }
      this.showToast(`Practice language set to ${newLang}! 🌈`);
    });

    // Language Change on Stories page
    const storyLangSelect = this.container.querySelector('#storyLanguageSelect') as HTMLSelectElement;
    storyLangSelect?.addEventListener('change', () => {
      const val = storyLangSelect.value;
      const tag = this.container.querySelector('#storyTagLevel');
      if (tag && this.activeChild) {
        tag.textContent = `${val.toUpperCase()} · ${this.activeChild.grade.toUpperCase()}`;
      }
      this.showToast(`Story shelf updated for ${val} 📚`);
    });

    // Picture word match option selection
    this.bindGameOptions();

    // Game action buttons
    this.container.querySelector('#btnHearWord')?.addEventListener('click', () => this.speakCurrentWord());
    this.container.querySelector('#btnCheckAnswer')?.addEventListener('click', () => this.checkGameAnswer());

    // Activities
    this.container.querySelector('#actMirror')?.addEventListener('click', () => this.openLetterGame());
    this.container.querySelector('#actStory')?.addEventListener('click', () => this.openStory('Sunny and the little kite'));
    this.container.querySelector('#actVoice')?.addEventListener('click', () => this.openVoicePractice());
    this.container.querySelector('#btnVoicePractice')?.addEventListener('click', () => this.openVoicePractice());
    this.container.querySelector('#cardBadge')?.addEventListener('click', () => this.openBadgeModal());

    // Story buttons
    this.container.querySelector('#btnReadSunnyStory')?.addEventListener('click', () => this.openStory('Sunny and the little kite'));
    this.container.querySelector('#btnReadMina')?.addEventListener('click', () => this.openStory('Mina and the river'));
    this.container.querySelector('#btnReadSunflower')?.addEventListener('click', () => this.openStory("The sunflower's wish"));
    this.container.querySelector('#btnFindTinyFishStories')?.addEventListener('click', () => this.openTinyFishFinder());

    // Modal close
    this.container.querySelector('#btnCloseDashModal')?.addEventListener('click', () => this.closeDashModal());

    // Interactive Activity Catalog (12 Activities)
    this.container.querySelectorAll('.btn-play-catalog-act').forEach(btn => {
      btn.addEventListener('click', () => {
        const actId = (btn as HTMLElement).dataset.actId || '';
        const skillId = (btn as HTMLElement).dataset.skillId || '';
        const title = (btn as HTMLElement).dataset.title || '';

        if (!this.activeChild) return;

        if (actId === 'act_bd_mirror' || skillId === 'skill_confused_letters_bd') {
          this.openLetterGame();
          return;
        }

        const item = ACTIVITY_CATALOG.find(a => a.id === actId);
        ActivityRunnerModal.getInstance().startRecommendation(
          this.activeChild,
          {
            id: `rec_${actId}_${Date.now()}`,
            activityId: actId,
            targetSkillId: skillId,
            skillName: item?.title || 'Interactive Learning',
            category: 'syllable_decoding',
            title: title || item?.title || 'Interactive Adventure',
            description: item?.description || 'Build your reading confidence.',
            difficulty: item?.difficulty || 'beginner',
            learningObjective: item?.description || 'Phonics and reading mastery.',
            estimatedMinutes: item?.estimatedMinutes || 3,
            recommendationType: 'new',
            reason: 'Selected from your interactive adventure catalog.',
            pedagogicalRationale: 'Active practice strengthens orthographic mapping.',
            prerequisites: [],
            actionIcon: item?.icon || '🎮',
            actionBg: item?.colorBg || '#eef8f4',
          },
          () => {
            this.refreshDashboardAfterActivity();
          }
        );
      });
    });
  }

  // -------------------------------------------------------------
  // Game Logic (Picture Word Match)
  // -------------------------------------------------------------
  private bindGameOptions(): void {
    const opts = this.container.querySelectorAll('.options .option');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        opts.forEach(o => o.classList.remove('selected', 'correct', 'wrong'));
        opt.classList.add('selected');
        const feedback = this.container.querySelector('#feedback');
        if (feedback) feedback.textContent = '';
      });
    });
  }

  private updateLanguageGame(lang: SupportedLanguage): void {
    const data = this.wordBanks[lang] || this.wordBanks.English;
    const targetWordEl = this.container.querySelector('#targetWord');
    const instructionEl = this.container.querySelector('#instruction');
    if (targetWordEl) targetWordEl.textContent = data.words[0];
    if (instructionEl) instructionEl.textContent = data.prompt;

    const optButtons = this.container.querySelectorAll('.options .option');
    optButtons.forEach((btn, index) => {
      const strong = btn.querySelector('strong');
      const pic = btn.querySelector('.picture');
      if (strong) strong.textContent = data.words[index] || '';
      if (pic) pic.textContent = data.pictures[index] || '🌟';
      (btn as HTMLElement).dataset.word = data.words[index];
      (btn as HTMLElement).dataset.correct = index === 0 ? 'true' : 'false';
      btn.classList.remove('selected', 'correct', 'wrong');
    });

    const fb = this.container.querySelector('#feedback');
    if (fb) fb.textContent = '';
  }

  private checkGameAnswer(): void {
    const selected = this.container.querySelector('.option.selected') as HTMLElement | null;
    const feedback = this.container.querySelector('#feedback') as HTMLElement | null;
    if (!selected || !feedback) {
      if (feedback) {
        feedback.style.color = '#b37b30';
        feedback.textContent = "Choose a picture first — you've got this!";
      }
      return;
    }

    if (selected.dataset.correct === 'true') {
      selected.classList.add('correct');
      feedback.style.color = '#3b9b75';
      feedback.textContent = 'Wonderful! You found it! +10 happy points ⭐';

      if (this.activeChild && selected.dataset.rewarded !== 'yes') {
        selected.dataset.rewarded = 'yes';
        const prog = this.profileService.getChildProgress(this.activeChild.id);
        const updated = this.profileService.updateChildProgress(this.activeChild.id, {
          happyPoints: prog.happyPoints + 10,
          practiceWins: prog.practiceWins + 1,
          practiceMinutes: prog.practiceMinutes + 1,
        });

        const pointsEl = this.container.querySelector('#points');
        if (pointsEl) pointsEl.textContent = String(updated.happyPoints);

        const statPractice = this.container.querySelector('#statPracticeTime');
        if (statPractice) statPractice.innerHTML = `${updated.practiceMinutes} <small>min</small>`;

        // Record genuine learning attempt to update charts and adaptive engine
        this.learningPathService.recordAttempt({
          id: `att_pwm_${Date.now()}`,
          childId: this.activeChild.id,
          activityId: 'act_picture_word_match',
          skillId: 'skill_letter_sounds_basic',
          activityType: 'word_match',
          score: 100,
          accuracy: 1.0,
          totalQuestions: 1,
          correctAnswers: 1,
          incorrectAnswers: 0,
          attemptsRequired: 1,
          hintsRequested: 0,
          correctedAfterHint: 0,
          durationSeconds: 20,
          missedItems: [],
          completedAt: new Date().toISOString(),
        }).then(() => {
          this.refreshCharts();
        });

        // Add "Next little game" button
        if (!this.container.querySelector('#btnNextGame')) {
          const nextBtn = document.createElement('button');
          nextBtn.id = 'btnNextGame';
          nextBtn.className = 'primary';
          nextBtn.textContent = 'Next little game →';
          nextBtn.onclick = () => {
            this.loadNextRandomGame();
            nextBtn.remove();
          };
          this.container.querySelector('.game-bottom')?.appendChild(nextBtn);
        }
      }
    } else {
      selected.classList.add('wrong');
      feedback.style.color = '#cc745d';
      feedback.textContent = 'Nice try! Listen to the first sound and try again.';

      if (this.activeChild) {
        const targetWord = (this.container.querySelector('#targetWord')?.textContent || '').trim();
        this.learningPathService.recordAttempt({
          id: `att_pwm_${Date.now()}`,
          childId: this.activeChild.id,
          activityId: 'act_picture_word_match',
          skillId: 'skill_letter_sounds_basic',
          activityType: 'word_match',
          score: 50,
          accuracy: 0.5,
          totalQuestions: 1,
          correctAnswers: 0,
          incorrectAnswers: 1,
          attemptsRequired: 2,
          hintsRequested: 0,
          correctedAfterHint: 0,
          durationSeconds: 25,
          missedItems: targetWord ? [targetWord] : [],
          completedAt: new Date().toISOString(),
        }).then(() => {
          this.refreshCharts();
        });
      }
    }
  }

  private loadNextRandomGame(): void {
    const bank = [
      ['fish', 'dish', 'wish', '🐟', '🍽️', '⭐'],
      ['tree', 'three', 'free', '🌳', '3️⃣', '🎉'],
      ['ship', 'shop', 'sheep', '🚢', '🛍️', '🐑'],
      ['star', 'car', 'jar', '⭐', '🚗', '🫙'],
    ];
    const rand = bank[Math.floor(Math.random() * bank.length)];
    const targetEl = this.container.querySelector('#targetWord');
    if (targetEl) targetEl.textContent = rand[0];

    const optButtons = this.container.querySelectorAll('.options .option');
    optButtons.forEach((btn, i) => {
      (btn as HTMLElement).dataset.word = rand[i];
      (btn as HTMLElement).dataset.correct = i === 0 ? 'true' : 'false';
      (btn as HTMLElement).dataset.rewarded = '';
      const strong = btn.querySelector('strong');
      const pic = btn.querySelector('.picture');
      if (strong) strong.textContent = rand[i];
      if (pic) pic.textContent = rand[i + 3];
      btn.classList.remove('selected', 'correct', 'wrong');
    });

    const fb = this.container.querySelector('#feedback');
    if (fb) fb.textContent = '';
  }

  private speakCurrentWord(): void {
    const word = this.container.querySelector('#targetWord')?.textContent || 'ship';
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(word);
      u.rate = 0.78;
      const lang = this.activeChild?.preferredLanguage || 'English';
      const langCodeMap: Record<string, string> = {
        English: 'en-IN',
        Hindi: 'hi-IN',
        Punjabi: 'pa-IN',
        Bengali: 'bn-IN',
      };
      u.lang = langCodeMap[lang] || 'en-IN';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } else {
      this.showToast('Word: ' + word);
    }
  }

  // -------------------------------------------------------------
  // Modals & Stories
  // -------------------------------------------------------------
  private openStory(title: string): void {
    if (this.activeChild) {
      this.activityTracker.startActivity(
        this.activeChild.parentId,
        this.activeChild.id,
        'story_reading',
        `Story: ${title}`
      );
    }

    const storiesContent: Record<string, string[]> = {
      'Sunny and the little kite': [
        'One breezy afternoon, Sunny took her bright red kite to the hill. The kite tugged at its string, but it would not fly.',
        'Sunny took a breath. She ran a little faster, and the wind lifted the kite into the blue sky. “I kept trying!” she laughed. Her friends cheered below.',
      ],
      'Mina and the river': [
        'Mina the elephant heard a soft cry near the river. A little bird had dropped its nest beside the water.',
        'Mina used her strong trunk to lift a branch. Together, the friends made a safe new home. “Helping is better together,” said Mina.',
      ],
      "The sunflower's wish": [
        'A tiny seed dreamed of seeing the sun. Rain tapped the soil, and warm sunlight reached down. Slowly, the seed began to grow.',
        'One morning, a yellow flower opened its petals. The little sunflower smiled at the sky. Growing takes time, and every day matters.',
      ],
    };

    const paragraphs = storiesContent[title] || storiesContent['Sunny and the little kite'];

    this.openDashModal(
      title,
      'Read at your own pace · listen along',
      `
      <div id="readerText" class="reader-text">
        ${paragraphs.map(p => `<p>${p}</p>`).join('')}
      </div>
      <div class="modal-controls">
        <button type="button" id="btnModalReadAloud">🔊 Listen</button>
        <button type="button" class="soft" id="btnResizeSmaller">A−</button>
        <button type="button" class="soft" id="btnResizeLarger">A+</button>
        <button type="button" class="soft" id="btnFinishStory">Finished reading ✓</button>
      </div>
      <p class="prototype-note">
        Accessible Story Reader: Supports high-contrast, speech read-aloud, and dyslexia-adapted font size.
      </p>
    `
    );

    document.getElementById('btnModalReadAloud')?.addEventListener('click', () => {
      const el = document.getElementById('readerText');
      if (!el || !('speechSynthesis' in window)) {
        this.showToast('Speech read-aloud unavailable in this environment.');
        return;
      }
      const u = new SpeechSynthesisUtterance(el.innerText);
      u.rate = 0.82;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    });

    document.getElementById('btnResizeSmaller')?.addEventListener('click', () => {
      const el = document.getElementById('readerText');
      if (el) {
        const cur = parseInt(window.getComputedStyle(el).fontSize) || 20;
        el.style.fontSize = `${Math.max(16, cur - 2)}px`;
      }
    });

    document.getElementById('btnResizeLarger')?.addEventListener('click', () => {
      const el = document.getElementById('readerText');
      if (el) {
        const cur = parseInt(window.getComputedStyle(el).fontSize) || 20;
        el.style.fontSize = `${Math.min(32, cur + 2)}px`;
      }
    });

    document.getElementById('btnFinishStory')?.addEventListener('click', () => {
      if (this.activeChild) {
        const prog = this.profileService.getChildProgress(this.activeChild.id);
        const updated = this.profileService.updateChildProgress(this.activeChild.id, {
          happyPoints: prog.happyPoints + 5,
          wordsLearned: prog.wordsLearned + 1,
        });
        const pointsEl = this.container.querySelector('#points');
        if (pointsEl) pointsEl.textContent = String(updated.happyPoints);
      }
      this.showToast('Story complete — +5 happy points ⭐');
      this.closeDashModal();
    });
  }

  private openVoicePractice(): void {
    if (this.activeChild) {
      this.activityTracker.startActivity(
        this.activeChild.parentId,
        this.activeChild.id,
        'voice_spelling',
        'Say it, spell it! (Voice practice)'
      );
    }
    const target = this.container.querySelector('#targetWord')?.textContent || 'ship';
    this.openDashModal(
      'Say it, spell it! 🎙️',
      'Listen to the word, then say or type what you heard.',
      `
      <div class="modal-callout">
        Word to spell: <strong>${target}</strong> &nbsp;
        <button type="button" class="demo-action" id="btnHearModalWord">🔊 Hear it</button>
      </div>
      <input
        class="voice-input"
        id="pitchVoiceAnswer"
        placeholder="Type or speak your answer here…"
        aria-label="Spelling answer"
      />
      <div class="modal-controls">
        <button type="button" id="btnStartVoice">🎙️ Start voice input</button>
        <button type="button" class="soft" id="btnCheckVoice">Check spelling</button>
      </div>
      <p id="pitchVoiceFeedback" class="feedback" style="margin-top:10px;"></p>
      <p class="prototype-note">Speech recognition uses browser Web Speech API with keyboard fallback.</p>
    `
    );

    document.getElementById('btnHearModalWord')?.addEventListener('click', () => this.speakCurrentWord());

    document.getElementById('btnCheckVoice')?.addEventListener('click', () => {
      const input = document.getElementById('pitchVoiceAnswer') as HTMLInputElement;
      const fb = document.getElementById('pitchVoiceFeedback');
      if (!input || !fb) return;

      if (input.value.trim().toLowerCase() === target.trim().toLowerCase()) {
        fb.style.color = '#3b9b75';
        fb.textContent = 'That matches! Lovely spelling. +5 happy points ⭐';
        if (this.activeChild) {
          const prog = this.profileService.getChildProgress(this.activeChild.id);
          const updated = this.profileService.updateChildProgress(this.activeChild.id, {
            happyPoints: prog.happyPoints + 5,
          });
          const pointsEl = this.container.querySelector('#points');
          if (pointsEl) pointsEl.textContent = String(updated.happyPoints);
        }
      } else {
        fb.style.color = '#c87961';
        fb.textContent = 'Good try! Listen once more, then try again.';
      }
    });

    document.getElementById('btnStartVoice')?.addEventListener('click', () => {
      const SR = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                 (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;
      const input = document.getElementById('pitchVoiceAnswer') as HTMLInputElement;
      if (!SR) {
        input?.focus();
        this.showToast('Voice input is unavailable in this browser. Please type your spelling.');
        return;
      }
      try {
        const r = new SR();
        r.lang = 'en-IN';
        r.onresult = (e: any) => {
          if (input) {
            input.value = e.results[0][0].transcript;
            document.getElementById('btnCheckVoice')?.click();
          }
        };
        r.onerror = () => this.showToast('Could not hear clearly. Try typing the word!');
        r.start();
        this.showToast('Listening… say the word now 🎙️');
      } catch {
        this.showToast('Voice recognition failed to start. Please type the word.');
      }
    });
  }

  private openLetterGame(): void {
    if (this.activeChild) {
      this.activityTracker.startActivity(
        this.activeChild.parentId,
        this.activeChild.id,
        'letter_mirror',
        'Letter mirror: b and d'
      );
      LetterMirrorBDModal.getInstance().start(this.activeChild, () => {
        this.refreshDashboardAfterActivity();
      });
    }
  }

  private openBadgeModal(): void {
    this.openDashModal(
      'Your sound explorer badge 🏅',
      'Celebrate effort and steady practice.',
      `
      <div class="modal-callout">
        Complete two more learning games to unlock this badge. Badges celebrate effort, not a test score.
      </div>
      <div class="modal-controls">
        <button type="button" id="btnBadgePlayMore">Play another game</button>
      </div>
    `
    );
    document.getElementById('btnBadgePlayMore')?.addEventListener('click', () => {
      this.closeDashModal();
      this.switchPage('learn');
    });
  }

  private openTinyFishFinder(): void {
    this.switchPage('resources');
  }

  // -------------------------------------------------------------
  // Modal Helpers
  // -------------------------------------------------------------
  private openDashModal(title: string, subtitle: string, htmlContent: string): void {
    const modal = this.container.querySelector('#dashboardModal') as HTMLElement;
    const titleEl = this.container.querySelector('#dashModalTitle');
    const subtitleEl = this.container.querySelector('#dashModalSubtitle');
    const contentEl = this.container.querySelector('#dashModalContent');

    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
    if (contentEl) contentEl.innerHTML = htmlContent;

    modal?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  private closeDashModal(): void {
    const modal = this.container.querySelector('#dashboardModal') as HTMLElement;
    modal?.classList.add('hidden');
    document.body.style.overflow = '';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.activeChild) {
      this.activityTracker.startActivity(
        this.activeChild.parentId,
        this.activeChild.id,
        'general_learning',
        'Dashboard Navigation'
      );
    }
  }

  private refreshStats(): void {
    if (!this.activeChild) return;
    const progress = this.profileService.getChildProgress(this.activeChild.id);
    const statPracticeTime = this.container.querySelector('#statPracticeTime');
    const statWordsLearned = this.container.querySelector('#statWordsLearned');
    const statFluency = this.container.querySelector('#statFluency');
    const statHappyPoints = this.container.querySelector('#statHappyPoints');
    const topStreak = this.container.querySelector('#topStreak');
    const streakText = this.container.querySelector('#streakText');

    if (statPracticeTime) statPracticeTime.innerHTML = `${progress.practiceMinutes} <small>min</small>`;
    if (statWordsLearned) statWordsLearned.textContent = `${progress.wordsLearned}`;
    if (statFluency) statFluency.innerHTML = `${progress.fluencyWpm} <small>wpm</small>`;
    if (statHappyPoints) statHappyPoints.innerHTML = `${progress.happyPoints} <small>pts</small>`;
    if (topStreak) topStreak.textContent = `🔥 ${progress.streakDays} day streak`;
    if (streakText) streakText.textContent = `You're on a ${progress.streakDays}-day streak!`;
  }

  public async refreshCharts(): Promise<void> {
    if (!this.activeChild) return;
    await Promise.all([
      this.homeReadingChart?.refresh(this.activeChild.id),
      this.progressReadingChart?.refresh(this.activeChild.id),
    ]);

    const summary = await ReadingChartService.getInstance().getChartSummary(this.activeChild.id, 'week');
    const accDisplay = summary.overallAccuracy !== null ? `${summary.overallAccuracy}%` : '—';
    const statAccuracy = this.container.querySelector('#statAccuracy');
    if (statAccuracy) {
      statAccuracy.innerHTML = `${accDisplay.replace('%', '')}<small>%</small>`;
    }
  }

  public async refreshDashboardAfterActivity(): Promise<void> {
    if (!this.activeChild) return;
    this.refreshStats();
    await this.refreshCharts();
    if (this.learningJourneyView) {
      await this.learningJourneyView.render(this.activeChild);
    }
  }

  public showToast(msg: string): void {

    const toast = this.container.querySelector('#toast') as HTMLElement;
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }
}
