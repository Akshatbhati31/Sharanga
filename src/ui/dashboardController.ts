import { ProfileService } from '../services/profileService';
import { ActivityTrackerService } from '../services/activityTrackerService';
import { AuthService } from '../services/authService';
import { SpeechService } from '../services/speechService';
import type { ChildProfile, SupportedLanguage, AppLanguageCode } from '../types/auth';
import type { ParentDashboardView } from './parentDashboardView';
import { ResourceFinderView } from './resourceFinderView';
import { LearningJourneyView } from './learningJourneyView';
import { ActivityRunnerModal } from './activityRunnerModal';
import { LearningPathService } from '../services/learningPathService';
import { ReadingConfidenceChart } from './readingConfidenceChart';
import { LetterMirrorBDModal } from './letterMirrorBDModal';
import { ACTIVITY_CATALOG } from '../services/activityCatalog';
import { getLocalizedSkillTitle } from '../services/recommendationEngine';
import { ReadingChartService } from '../services/readingChartService';
import { i18n } from '../i18n';

export class DashboardController {
  private container: HTMLElement;
  private profileService: ProfileService;
  private activityTracker: ActivityTrackerService;
  private authService: AuthService;
  private speechService: SpeechService;
  private parentDashboardView: ParentDashboardView;
  private onSwitchProfileRequested: () => void;
  private activeChild: ChildProfile | null = null;
  private toastTimer: number | null = null;
  private resourceFinderView: ResourceFinderView | null = null;
  private learningJourneyView: LearningJourneyView | null = null;
  private learningPathService: LearningPathService;
  private homeReadingChart: ReadingConfidenceChart | null = null;
  private progressReadingChart: ReadingConfidenceChart | null = null;
  private currentPage: 'home' | 'learn' | 'progress' | 'stories' | 'resources' = 'home';

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
    Odia: {
      words: ['ଡଙ୍ଗା', 'ଘର', 'ଫଳ'],
      prompt: 'କେଉଁ ଚିତ୍ରଟି ଶବ୍ଦ ଦର୍ଶାଏ...',
      pictures: ['🚣', '🏠', '🍎'],
    },
    Punjabi: {
      words: ['ਕਿਸ਼ਤੀ', 'ਘਰ', 'ਫਲ'],
      prompt: 'ਕਿਹੜੀ ਤਸਵੀਰ ਇਹ ਸ਼ਬਦ ਦਿਖਾਉਂਦੀ ਹੈ...',
      pictures: ['🚣', '🏠', '🍎'],
    },
    Tamil: {
      words: ['படகு', 'வீடு', 'பழம்'],
      prompt: 'எந்த படம் இந்த சொல்லைக் காட்டுகிறது...',
      pictures: ['🚣', '🏠', '🍎'],
    },
    Bengali: {
      words: ['বই', 'फूल', 'घर'],
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
    this.authService = AuthService.getInstance();
    this.speechService = SpeechService.getInstance();
    this.parentDashboardView = parentDashboardView;
    this.onSwitchProfileRequested = onSwitchProfileRequested;
    this.learningPathService = LearningPathService.getInstance();
  }

  private formatCurrentDate(): string {
    try {
      const locale = i18n.getCurrentMeta().speechLocale || 'en-US';
      return new Date().toLocaleDateString(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    } catch {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
    }
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
          <div class="nav-label">${i18n.t('nav.learnAndGrow')}</div>
          <nav class="nav" aria-label="Main navigation">
            <button class="active" data-page="home"><span class="ico">⌂</span><span class="label">${i18n.t('nav.myHome')}</span></button>
            <button data-page="learn"><span class="ico">✦</span><span class="label">${i18n.t('nav.practice')}</span></button>
            <button data-page="progress"><span class="ico">▥</span><span class="label">${i18n.t('nav.myProgress')}</span></button>
            <button data-page="stories"><span class="ico">▤</span><span class="label">${i18n.t('nav.storyShelf')}</span></button>
            <button data-page="resources"><span class="ico">🌐</span><span class="label">${i18n.t('nav.resourceFinder')}</span></button>
          </nav>
          <div class="side-bottom">
            <div class="side-card">
              <div class="tiny">${i18n.t('nav.littleEveryDay')} 🌱</div>
              <strong id="streakText">${i18n.t('home.streak', { count: progress.streakDays })}</strong>
              <p>${i18n.t('nav.tenMinGrow')}</p>
              <button type="button" id="btnSideChallenge">${i18n.t('home.seeChallenge')}</button>
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
              ⇄ ${i18n.t('home.switchLearner')}
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main>
          <!-- Top Bar -->
          <div class="topbar">
            <div class="crumb">DyslexiMate <span>›</span> <b id="crumb">${i18n.t('nav.myHome')}</b></div>
            <div class="top-actions">
              ${i18n.renderLanguageSelect({ id: 'topLangSelect', className: 'lang-selector-dropdown top-lang-select' })}
              <button type="button" id="btnGrownupsTop" class="demo-action">
                🔒 ${i18n.t('home.grownUps')}
              </button>
              <button type="button" id="btnTopSwitchChild" class="switch-profile-btn" title="Switch child profile">
                <span>${child.avatar}</span> ${i18n.t('home.switchLearner')}
              </button>
              <div class="date-chip" id="topDateChip">${this.formatCurrentDate()}</div>
              <div class="streak" id="topStreak">🔥 ${progress.streakDays} ${i18n.t('home.streakDays')}</div>
            </div>
          </div>

          <!-- Section: Home Page -->
          <section id="homePage">
            <div class="hero">
              <div class="week-pill">${i18n.t('home.heroWeek')}</div>
              <div class="hero-copy">
                <div class="eyebrow" id="heroGreeting">${i18n.t('home.welcomeBack', { name: child.name })}</div>
                <h1>${i18n.t('home.heroTitle')}</h1>
                <p>${i18n.t('home.heroSub')}</p>
                <button class="hero-cta" id="btnStartChallenge">${i18n.t('home.startChallenge')} &nbsp; →</button>
              </div>
              <div class="hero-figure" aria-hidden="true">🦊</div>
            </div>

            <!-- Personalized Adaptive Learning Journey Area -->
            <div id="childLearningJourneyArea" style="margin-top: 18px; margin-bottom: 24px;"></div>

            <div class="section-head">
              <div>
                <h2>${i18n.t('home.snapshotTitle')}</h2>
                <p>${i18n.t('home.snapshotSub')}</p>
              </div>
              <button class="text-link" id="linkViewProgress">${i18n.t('home.viewFullReport')} →</button>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-top">${i18n.t('home.statPracticeTime')} <span class="stat-icon">⏱️</span></div>
                <strong id="statPracticeTime">${progress.practiceMinutes} <small>min</small></strong>
                <small><span class="positive">↑ 12 min</span> ${i18n.t('home.statPracticeTimeFromLastWeek')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('home.statWordsLearned')} <span class="stat-icon" style="background:#fff2d0">📚</span></div>
                <strong id="statWordsLearned">${progress.wordsLearned}</strong>
                <small><span class="positive">↑ 6 new</span> ${i18n.t('home.statWordsLearnedNew')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('home.statFluency')} <span class="stat-icon" style="background:#fce9e3">🌿</span></div>
                <strong id="statFluency">${progress.fluencyWpm} <small>wpm</small></strong>
                <small><span class="positive">↑ 4 wpm</span> ${i18n.t('home.statFluencyGrowing')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('home.statHappyPoints')} <span class="stat-icon" style="background:#f0edff">⭐</span></div>
                <strong id="points">${progress.happyPoints}</strong>
                <small>${i18n.t('home.statHappyPointsBadgeSoon')}</small>
              </div>
            </div>

            <div class="content-grid">
              <div id="homeReadingChartContainer"></div>

              <div class="card">
                <div class="card-title">
                  <div>
                    <h3>${i18n.t('home.wordsToPractice')}</h3>
                    <p>${i18n.t('home.wordsToPracticeSub')}</p>
                  </div>
                  <button class="text-link" id="linkPracticeMistakes">${i18n.t('home.practiceMistakes')} →</button>
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
                    <h3>${i18n.t('home.recommendedTitle')}</h3>
                    <p>${i18n.t('home.recommendedSubtitle')}</p>
                  </div>
                  <span class="tag">${i18n.t('home.madeForYouTag')}</span>
                </div>
                <div class="activity-list">
                  <div class="activity" id="actMirror" role="button" tabindex="0">
                    <div class="act-icon" style="background:#fff1d2">🔤</div>
                    <div class="act-copy">
                      <strong>${i18n.t('home.actMirrorTitle')}</strong>
                      <small>${i18n.t('home.actMirrorDesc')}</small>
                    </div>
                    <span class="tag">Easy</span>
                  </div>
                  <div class="activity" id="actStory" role="button" tabindex="0">
                    <div class="act-icon" style="background:#e8f3ff">🎧</div>
                    <div class="act-copy">
                      <strong>${i18n.t('home.actStoryTitle')}</strong>
                      <small>${i18n.t('home.actStoryDesc')}</small>
                    </div>
                    <span class="tag">Story</span>
                  </div>
                  <div class="activity" id="actVoice" role="button" tabindex="0">
                    <div class="act-icon" style="background:#f3edff">🗣️</div>
                    <div class="act-copy">
                      <strong>${i18n.t('home.actVoiceTitle')}</strong>
                      <small>${i18n.t('home.actVoiceDesc')}</small>
                    </div>
                    <span class="tag">Play</span>
                  </div>
                </div>
              </div>

              <div class="resource-card">
                <div class="resource-icon">📖</div>
                <div>
                  <strong>${i18n.t('home.storiesIndiaTitle')}</strong>
                  <p>${i18n.t('home.storiesIndiaDesc')}</p>
                </div>
                <button type="button" id="btnExploreStories">${i18n.t('home.exploreStoriesBtn')}</button>
              </div>
            </div>
          </section>

          <!-- Section: Learn / Practice Page -->
          <section id="learnPage" class="hidden">
            <div class="learn-heading">
              <div>
                <h1>${i18n.t('practice.heading')}</h1>
                <p>${i18n.t('practice.sub', { name: child.name })}</p>
              </div>
              <div class="lang-select">
                <label for="practiceLanguage">${i18n.t('practice.learningIn')}</label>
                <select id="practiceLanguage">
                  <option value="English" ${child.preferredLanguage === 'English' ? 'selected' : ''}>EG English</option>
                  <option value="Hindi" ${child.preferredLanguage === 'Hindi' ? 'selected' : ''}>HN हिन्दी</option>
                  <option value="Odia" ${child.preferredLanguage === 'Odia' ? 'selected' : ''}>OD ଓଡ଼ିଆ</option>
                  <option value="Punjabi" ${child.preferredLanguage === 'Punjabi' ? 'selected' : ''}>PB ਪੰਜਾਬੀ</option>
                  <option value="Tamil" ${child.preferredLanguage === 'Tamil' ? 'selected' : ''}>TM தமிழ்</option>
                </select>
              </div>
            </div>

            <div class="daily">
              <div class="daily-icon">🌞</div>
              <div class="daily-copy">
                <strong>${i18n.t('practice.dailyChallenge')}</strong>
                <p>${i18n.t('practice.dailyChallengeSub')}</p>
              </div>
              <div class="progress-small">
                <div>4 / 10 min</div>
                <div class="bar"><i></i></div>
              </div>
            </div>

            <!-- Picture Word Match Game -->
            <div class="game">
              <div class="game-top">
                <div class="game-type"><span>GAME 2 OF 3</span> ${i18n.t('practice.gameTitle')}</div>
                <div class="game-progress">Your challenge <div class="bar"><i></i></div></div>
              </div>
              <div class="prompt">
                <div class="instruction" id="instruction">${this.wordBanks[child.preferredLanguage]?.prompt || this.wordBanks.English.prompt}</div>
                <h2 id="targetWord">${this.wordBanks[child.preferredLanguage]?.words[0] || 'ship'}</h2>
                <p>${i18n.t('practice.tapPicture')}</p>
              </div>
              <div class="options" id="options">
                <button type="button" class="option" data-word="${this.wordBanks[child.preferredLanguage]?.words[0] || 'ship'}">
                  <div class="picture">${this.wordBanks[child.preferredLanguage]?.pictures[0] || '🚢'}</div>
                  <strong>${this.wordBanks[child.preferredLanguage]?.words[0] || 'ship'}</strong>
                  <small>${i18n.t('practice.tapToChoose')}</small>
                </button>
                <button type="button" class="option" data-word="${this.wordBanks[child.preferredLanguage]?.words[1] || 'shop'}">
                  <div class="picture">${this.wordBanks[child.preferredLanguage]?.pictures[1] || '🛍️'}</div>
                  <strong>${this.wordBanks[child.preferredLanguage]?.words[1] || 'shop'}</strong>
                  <small>${i18n.t('practice.tapToChoose')}</small>
                </button>
                <button type="button" class="option" data-word="${this.wordBanks[child.preferredLanguage]?.words[2] || 'sheep'}">
                  <div class="picture">${this.wordBanks[child.preferredLanguage]?.pictures[2] || '🐑'}</div>
                  <strong>${this.wordBanks[child.preferredLanguage]?.words[2] || 'sheep'}</strong>
                  <small>${i18n.t('practice.tapToChoose')}</small>
                </button>
              </div>
              <div class="game-bottom">
                <button type="button" class="secondary" id="btnHearWord">🔊&nbsp; ${i18n.t('practice.hearWord')}</button>
                <button type="button" class="primary" id="btnCheckAnswer">${i18n.t('practice.checkAnswer')}&nbsp; ✓</button>
              </div>
              <div class="feedback" id="feedback" aria-live="polite"></div>
            </div>

            <div class="below-grid">
              <div class="mini-card">
                <div class="mini-icon">🎙️</div>
                <div>
                  <strong>${i18n.t('practice.voiceSpelling')}</strong>
                  <p>${i18n.t('practice.voiceSpellingSub')}</p>
                </div>
                <button type="button" id="btnVoicePractice">${i18n.t('practice.tryIt')} →</button>
              </div>
              <div class="mini-card" id="cardBadge" role="button" tabindex="0">
                <div class="mini-icon" style="background:#fff2d0">🏅</div>
                <div>
                  <strong>${i18n.t('practice.badgeNote')}</strong>
                  <p>${i18n.t('practice.badgeSub')}</p>
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
                <h1>${i18n.t('progress.heading')}</h1>
                <p>${i18n.t('progress.subtitle', { name: child.name })}</p>
              </div>
              <div class="select-wrap">
                <select aria-label="${i18n.t('progress.heading')}">
                  <option>${i18n.t('progress.periodWeek')}</option>
                  <option>${i18n.t('progress.periodMonth')}</option>
                </select>
              </div>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-top">${i18n.t('progress.statPracticeTime')} <span class="stat-icon">⏱️</span></div>
                <strong>${progress.practiceMinutes} <small>min</small></strong>
                <small>${i18n.t('progress.statHappyDays', { count: progress.streakDays })}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('progress.statWordsLearned')} <span class="stat-icon">📚</span></div>
                <strong>${progress.wordsLearned}</strong>
                <small>${i18n.t('progress.statNewThisWeek')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('progress.statFluency')} <span class="stat-icon">🌿</span></div>
                <strong>${progress.fluencyWpm} <small>wpm</small></strong>
                <small>${i18n.t('progress.statWpmUp')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('progress.statAccuracy')} <span class="stat-icon">✨</span></div>
                <strong>${progress.accuracyPercent}<small>%</small></strong>
                <small>${i18n.t('progress.statCloserGoal')}</small>
              </div>
            </div>

            <div class="content-grid">
              <div id="progressReadingChartContainer"></div>

              <div class="card">
                <div class="card-title">
                  <div>
                    <h3>${i18n.t('progress.practiceNextTitle')}</h3>
                    <p>${i18n.t('progress.practiceNextDesc')}</p>
                  </div>
                </div>
                <div class="activity-list">
                  <div class="activity">
                    <div class="act-icon" style="background:#fff1d2">🔤</div>
                    <div class="act-copy">
                      <strong>${i18n.t('progress.actLetterMirrorTitle')}</strong>
                      <small>${i18n.t('progress.actLetterMirrorDesc')}</small>
                    </div>
                  </div>
                  <div class="activity">
                    <div class="act-icon" style="background:#e8f3ff">🎧</div>
                    <div class="act-copy">
                      <strong>${i18n.t('progress.actShTitle')}</strong>
                      <small>${i18n.t('progress.actShDesc')}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card" style="margin-top:16px">
              <div class="card-title">
                <div>
                  <h3>${i18n.t('progress.practicingTogetherTitle')}</h3>
                  <p>${i18n.t('progress.practicingTogetherDesc')}</p>
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
                      <small>${i18n.t('progress.triesThisWeek', { count: m.count })}</small>
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
                <h1>${i18n.t('stories.heading')}</h1>
                <p>${i18n.t('stories.sub', { name: child.name, grade: child.grade })}</p>
              </div>
              <div class="lang-select">
                <select id="storyLanguageSelect">
                  <option value="English" ${child.preferredLanguage === 'English' ? 'selected' : ''}>EG English</option>
                  <option value="Hindi" ${child.preferredLanguage === 'Hindi' ? 'selected' : ''}>HN हिन्दी</option>
                  <option value="Odia" ${child.preferredLanguage === 'Odia' ? 'selected' : ''}>OD ଓଡ଼ିଆ</option>
                  <option value="Punjabi" ${child.preferredLanguage === 'Punjabi' ? 'selected' : ''}>PB ਪੰਜਾਬੀ</option>
                  <option value="Tamil" ${child.preferredLanguage === 'Tamil' ? 'selected' : ''}>TM தமிழ்</option>
                </select>
              </div>
            </div>

            <div class="hero" style="background:#496a9a; min-height:150px">
              <div class="hero-copy">
                <div class="eyebrow" id="storyHeroGrade">${i18n.t('stories.storyOfDayTag')} · ${child.grade.toUpperCase()}</div>
                <h1>${i18n.t('stories.sunnyTitle')}</h1>
                <p>${i18n.t('stories.sunnyDesc')}</p>
                <button class="hero-cta" id="btnReadSunnyStory">${i18n.t('stories.readStoryBtn')}</button>
              </div>
              <div class="hero-figure" aria-hidden="true">🪁</div>
            </div>

            <div class="section-head">
              <div>
                <h2>${i18n.t('stories.moreStories')}</h2>
                <p>${i18n.t('stories.moreStoriesSub')}</p>
              </div>
              <span class="tag" id="storyTagLevel">${child.preferredLanguage.toUpperCase()} · ${child.grade.toUpperCase()}</span>
            </div>

            <div class="content-grid">
              <div class="card">
                <div style="font-size:34px">🐘</div>
                <h3 style="font:900 16px Nunito; margin:9px 0 4px">${i18n.t('stories.minaTitle')}</h3>
                <p style="font-size:11px; color:#829094; margin:0">${i18n.t('stories.minaDesc')}</p>
                <button class="text-link" style="padding:12px 0 0" id="btnReadMina">${i18n.t('stories.readStory')} →</button>
              </div>
              <div class="card">
                <div style="font-size:34px">🌻</div>
                <h3 style="font:900 16px Nunito; margin:9px 0 4px">${i18n.t('stories.sunflowerTitle')}</h3>
                <p style="font-size:11px; color:#829094; margin:0">${i18n.t('stories.sunflowerDesc')}</p>
                <button class="text-link" style="padding:12px 0 0" id="btnReadSunflower">${i18n.t('stories.readStory')} →</button>
              </div>
            </div>

            <div class="resource-card" style="margin-top:16px">
              <div class="resource-icon">🌐</div>
              <div>
                <strong>${i18n.t('resources.heading')}</strong>
                <p>${i18n.t('resources.subtitle')}</p>
              </div>
              <button type="button" id="btnFindTinyFishStories">${i18n.t('resources.findBtn')}</button>
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
    this.currentPage = name;
    const titles: Record<string, string> = {
      home: i18n.t('nav.myHome'),
      learn: i18n.t('nav.practice'),
      progress: i18n.t('nav.myProgress'),
      stories: i18n.t('nav.storyShelf'),
      resources: i18n.t('nav.resourceFinder'),
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
    // Scenario 2: Persistent Top Bar Language Dropdown
    const topLangSelect = this.container.querySelector('#topLangSelect') as HTMLSelectElement;
    topLangSelect?.addEventListener('change', async () => {
      const newLang = topLangSelect.value as AppLanguageCode;
      await i18n.setLanguage(newLang);
      await this.authService.updateInterfaceLanguage(newLang);
      if (this.activeChild) {
        this.render(this.activeChild);
        this.switchPage(this.currentPage);
      }
    });

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
      this.speechService.stop();
      this.updateLanguageGame(newLang);
      if (this.activeChild) {
        this.activeChild.preferredLanguage = newLang;
        await this.profileService.updateChild(this.activeChild.id, {
          preferredLanguage: newLang,
        });
        await this.learningPathService.getOrGeneratePath(this.activeChild);
        if (this.learningJourneyView) {
          await this.learningJourneyView.render(this.activeChild);
        }
      }
      const tag = this.container.querySelector('#storyTagLevel');
      if (tag && this.activeChild) {
        tag.textContent = `${newLang.toUpperCase()} · ${this.activeChild.grade.toUpperCase()}`;
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
        const localizedTitle = getLocalizedSkillTitle(
          skillId,
          this.activeChild.preferredLanguage,
          title || item?.title || 'Interactive Adventure'
        );
        ActivityRunnerModal.getInstance().startRecommendation(
          this.activeChild,
          {
            id: `rec_${actId}_${Date.now()}`,
            activityId: actId,
            targetSkillId: skillId,
            skillName: localizedTitle,
            category: 'syllable_decoding',
            title: localizedTitle,
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
    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || 'English');

    if (!selected || !feedback) {
      if (feedback) {
        feedback.style.color = '#b37b30';
        feedback.textContent = i18n.tForLang(childLangCode, 'practice.tapToChoose') || "Choose a picture first — you've got this!";
      }
      return;
    }

    if (selected.dataset.correct === 'true') {
      selected.classList.add('correct');
      feedback.style.color = '#3b9b75';
      feedback.textContent = `${i18n.tForLang(childLangCode, 'practice.correctFeedback')} (+10 ${i18n.tForLang(childLangCode, 'profileSelect.pointsUnit')})`;

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
          nextBtn.textContent = `${i18n.t('activity.nextAdventureBtn')}`;
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
      feedback.textContent = i18n.tForLang(childLangCode, 'practice.incorrectFeedback');

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
    const currentLang = this.activeChild?.preferredLanguage || 'English';
    const langBanks: Record<SupportedLanguage, string[][]> = {
      English: [
        ['fish', 'dish', 'wish', '🐟', '🍽️', '⭐'],
        ['tree', 'three', 'free', '🌳', '3️⃣', '🎉'],
        ['ship', 'shop', 'sheep', '🚢', '🛍️', '🐑'],
        ['star', 'car', 'jar', '⭐', '🚗', '🫙'],
      ],
      Hindi: [
        ['नाव', 'घर', 'फल', '🚣', '🏠', '🍎'],
        ['किताब', 'फूल', 'पेड़', '📖', '🌸', '🌳'],
        ['सूरज', 'तारा', 'चाँद', '☀️', '⭐', '🌙'],
      ],
      Odia: [
        ['ଡଙ୍ଗା', 'ଘର', 'ଫଳ', '🚣', '🏠', '🍎'],
        ['ବହି', 'ଫୁଲ', 'ଗଛ', '📖', '🌸', '🌳'],
        ['ସୂର୍ଯ୍ୟ', 'ତାରା', 'ଜହ୍ନ', '☀️', '⭐', '🌙'],
      ],
      Punjabi: [
        ['ਕਿਸ਼ਤੀ', 'ਘਰ', 'ਫਲ', '🚣', '🏠', '🍎'],
        ['ਕਿਤਾਬ', 'ਫੁੱਲ', 'ਰੁੱਖ', '📖', '🌸', '🌳'],
        ['ਸੂਰਜ', 'ਤਾਰਾ', 'ਚੰਨ', '☀️', '⭐', '🌙'],
      ],
      Tamil: [
        ['படகு', 'வீடு', 'பழம்', '🚣', '🏠', '🍎'],
        ['புத்தகம்', 'மலர்', 'மரம்', '📖', '🌸', '🌳'],
        ['சூரியன்', 'நட்சத்திரம்', 'நிலா', '☀️', '⭐', '🌙'],
      ],
      Bengali: [
        ['নৌকা', 'ঘর', 'ফল', '🚣', '🏠', '🍎'],
        ['বই', 'ফুল', 'গাছ', '📖', '🌸', '🌳'],
      ],
    };

    const bank = langBanks[currentLang] || langBanks.English;
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
    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || 'English');
    const res = this.speechService.speak(word, { langCode: childLangCode });
    if (!res.spoken && res.message) {
      this.showToast(res.message);
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

    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || i18n.getCurrentLanguage());
    const storiesMultilingual: Record<AppLanguageCode, Record<string, { title: string; paragraphs: string[] }>> = {
      en: {
        'Sunny and the little kite': {
          title: "Sunny and the little kite",
          paragraphs: [
            'One breezy afternoon, Sunny took her bright red kite to the hill. The kite tugged at its string, but it would not fly.',
            'Sunny took a breath. She ran a little faster, and the wind lifted the kite into the blue sky. “I kept trying!” she laughed. Her friends cheered below.',
          ],
        },
        'Mina and the river': {
          title: "Mina and the river",
          paragraphs: [
            'Mina the elephant heard a soft cry near the river. A little bird had dropped its nest beside the water.',
            'Mina used her strong trunk to lift a branch. Together, the friends made a safe new home. “Helping is better together,” said Mina.',
          ],
        },
        "The sunflower's wish": {
          title: "The sunflower's wish",
          paragraphs: [
            'A tiny seed dreamed of seeing the sun. Rain tapped the soil, and warm sunlight reached down. Slowly, the seed began to grow.',
            'One morning, a yellow flower opened its petals. The little sunflower smiled at the sky. Growing takes time, and every day matters.',
          ],
        },
      },
      hi: {
        'Sunny and the little kite': {
          title: 'सन्नी और छोटी पतंग',
          paragraphs: [
            'एक हवादार दोपहर में, सन्नी अपनी लाल पतंग लेकर पहाड़ी पर गई। पतंग हवा में उड़ने की कोशिश कर रही थी पर उड़ नहीं पा रही थी।',
            'सन्नी ने गहरी सांस ली। वह थोड़ी और तेज़ दौड़ी और हवा ने पतंग को नीले आसमान में उठा लिया। “मैंने कोशिश जारी रखी!” वह हंसी। उसके दोस्त नीचे खुशी से चिल्लाए।',
          ],
        },
        'Mina and the river': {
          title: 'मीना और नदी',
          paragraphs: [
            'मीना हथनी ने नदी किनारे एक धीमी आवाज़ सुनी। एक नन्ही चिड़िया का घोंसला पानी के पास गिर गया था।',
            'मीना ने अपनी मजबूत सूंड से एक डाली उठाई। दोनों ने मिलकर एक सुरक्षित नया घर बनाया। “साथ मिलकर मदद करना सबसे अच्छा है,” मीना ने कहा।',
          ],
        },
        "The sunflower's wish": {
          title: 'सूरजमुखी की इच्छा',
          paragraphs: [
            'एक छोटे बीज ने सूरज को देखने का सपना देखा। बारिश की बूंदों ने मिट्टी को छुआ और गुनगुनी धूप नीचे पहुंची। धीरे-धीरे बीज बड़ा होने लगा।',
            'एक सुबह, एक पीले फूल ने अपनी पंखुड़ियाँ खोलीं। छोटे सूरजमुखी ने आसमान की ओर देखकर मुस्कुराया। बढ़ने में समय लगता है और हर दिन महत्वपूर्ण है।',
          ],
        },
      },
      or: {
        'Sunny and the little kite': {
          title: 'ସନ୍ନି ଏବଂ ଛୋଟ ଗୁଡ଼ି',
          paragraphs: [
            'ଗୋଟିଏ ପବନିଆ ଅପରାହ୍ନରେ, ସନ୍ନି ନିଜର ଲାଲ ଗୁଡ଼ି ଧରି ପାହାଡ଼ ଉପରକୁ ଗଲା। ଗୁଡ଼ିଟି ଉଡ଼ିବାକୁ ଚେଷ୍ଟା କରୁଥିଲା କିନ୍ତୁ ଉଡ଼ିପାରୁନଥିଲା।',
            'ସନ୍ନି ଧୈର୍ଯ୍ୟ ଧରି ଆହୁରି ଜୋରରେ ଦୌଡ଼ିଲା, ଏବଂ ପବନ ଗୁଡ଼ିଟିକୁ ନୀଳ ଆକାଶକୁ ନେଇଗଲା। “ମୁଁ ଚେଷ୍ଟା ଛାଡ଼ିଲି ନାହିଁ!” ସେ ହସି କହିଲା। ସାଙ୍ଗମାନେ ତଳେ ଖୁସିରେ ତାଳି ବଜାଇଲେ।',
          ],
        },
        'Mina and the river': {
          title: 'ମିନା ଏବଂ ନଦୀ',
          paragraphs: [
            'ମିନା ହାତୀ ନଦୀ କୂଳରେ ଗୋଟିଏ କାନ୍ଦଣା ଶବ୍ଦ ଶୁଣିଲା। ଗୋଟିଏ ଛୋଟ ଚଢ଼େଇର ବସା ପାଣି ପାଖରେ ଖସିପଡ଼ିଥିଲା।',
            'ମିନା ନିଜର ଶକ୍ତ ଶୁଣ୍ଢରେ ଗୋଟିଏ ଡାଳ ଉଠାଇଲା। ସାଙ୍ଗମାନେ ମିଶି ଗୋଟିଏ ସୁରକ୍ଷିତ ନୂଆ ଘର ତିଆରି କଲେ। “ଏକାଠି ସାହାଯ୍ୟ କରିବା ସବୁଠାରୁ ଭଲ,” ମିନା କହିଲା।',
          ],
        },
        "The sunflower's wish": {
          title: 'ସୂର୍ଯ୍ୟମୁଖୀର ଇଚ୍ଛା',
          paragraphs: [
            'ଗୋଟିଏ ଛୋଟ ମଞ୍ଜି ସୂର୍ଯ୍ୟଙ୍କୁ ଦେଖିବା ପାଇଁ ସ୍ୱପ୍ନ ଦେଖୁଥିଲା। ବର୍ଷା ଟୋପା ମାଟିକୁ ଛୁଇଁଲା ଏବଂ ସୂର୍ଯ୍ୟ କିରଣ ତଳକୁ ଆସିଲା। ଧୀରେ ଧୀରେ ମଞ୍ଜିଟି ବଢ଼ିବାକୁ ଲାଗିଲା।',
            'ଗୋଟିଏ ସକାଳେ, ଗୋଟିଏ ହଳଦିଆ ଫୁଲ ନିଜର ପାଖୁଡ଼ା ମେଲାଇଲା। ଛୋଟ ସୂର୍ଯ୍ୟମୁଖୀ ଆକାଶକୁ ଚାହିଁ ହସିଲା। ବଢ଼ିବାକୁ ସମୟ ଲାଗେ ଏବଂ ପ୍ରତ୍ୟେକ ଦିନ ଗୁରୁତ୍ୱପୂର୍ଣ୍ଣ।',
          ],
        },
      },
      pa: {
        'Sunny and the little kite': {
          title: 'ਸੰਨੀ ਅਤੇ ਛੋਟੀ ਪਤੰਗ',
          paragraphs: [
            'ਇੱਕ ਹਵਾਦਾਰ ਦੁਪਹਿਰ ਨੂੰ, ਸੰਨੀ ਆਪਣੀ ਲਾਲ ਪਤੰਗ ਲੈ ਕੇ ਪਹਾੜੀ ਤੇ ਗਈ। ਪਤੰਗ ਉੱਡਣ ਦੀ ਕੋਸ਼ਿਸ਼ ਕਰ ਰਹੀ ਸੀ ਪਰ ਉੱਡ ਨਹੀਂ ਰਹੀ ਸੀ।',
            'ਸੰਨੀ ਨੇ ਲੰਮਾ ਸਾਹ ਲਿਆ ਅਤੇ ਥੋੜ੍ਹਾ ਤੇਜ਼ ਦੌੜੀ, ਅਤੇ ਹਵਾ ਨੇ ਪਤੰਗ ਨੂੰ ਨੀਲੇ ਅਸਮਾਨ ਵਿੱਚ ਉਡਾ ਦਿੱਤਾ। “ਮੈਂ ਕੋਸ਼ਿਸ਼ ਕਰਦੀ ਰਹੀ!” ਉਹ ਹੱਸੀ। ਉਸਦੇ ਦੋਸਤ ਹੇਠਾਂ ਖੁਸ਼ ਹੋਏ।',
          ],
        },
        'Mina and the river': {
          title: 'ਮੀਨਾ ਅਤੇ ਦਰਿਆ',
          paragraphs: [
            'ਮੀਨਾ ਹੱਥਣੀ ਨੇ ਦਰਿਆ ਕੋਲ ਇੱਕ ਹੌਲੀ ਆਵਾਜ਼ ਸੁਣੀ। ਇੱਕ ਨਿੱਕੀ ਚਿੜੀ ਦਾ ਆਲ੍ਹਣਾ ਪਾਣੀ ਕੋਲ ਡਿੱਗ ਗਿਆ ਸੀ।',
            'ਮੀਨਾ ਨੇ ਆਪਣੀ ਮਜ਼ਬੂਤ ਸੁੰਡ ਨਾਲ ਇੱਕ ਟਾਹਣੀ ਚੁੱਕੀ। ਦੋਵਾਂ ਨੇ ਮਿਲ ਕੇ ਇੱਕ ਸੁਰੱਖਿਅਤ ਨਵਾਂ ਘਰ ਬਣਾਇਆ। “ਇਕੱਠੇ ਮਦਦ ਕਰਨਾ ਬਹੁਤ ਵਧੀਆ ਹੈ,” ਮੀਨਾ ਨੇ ਕਿਹਾ।',
          ],
        },
        "The sunflower's wish": {
          title: 'ਸੂਰਜਮੁਖੀ ਦੀ ਇੱਛਾ',
          paragraphs: [
            'ਇੱਕ ਛੋਟੇ ਬੀਜ ਨੇ ਸੂਰਜ ਨੂੰ ਵੇਖਣ ਦਾ ਸੁਪਨਾ ਲਿਆ। ਮੀਂਹ ਦੀਆਂ ਬੂੰਦਾਂ ਮਿੱਟੀ ਨੂੰ ਛੂਹੀਆਂ ਅਤੇ ਨਿੱਘੀ ਧੁੱਪ ਹੇਠਾਂ ਆਈ। ਹੌਲੀ-ਹੌਲੀ ਬੀਜ ਵਧਣ ਲੱਗਾ।',
            'ਇੱਕ ਸਵੇਰ, ਇੱਕ ਪੀਲੇ ਫੁੱਲ ਨੇ ਆਪਣੀਆਂ ਪੱਤੀਆਂ ਖੋਲ੍ਹੀਆਂ। ਛੋਟੇ ਸੂਰਜਮੁਖੀ ਨੇ ਅਸਮਾਨ ਵੱਲ ਵੇਖ ਕੇ ਮੁਸਕੁਰਾਇਆ। ਵਧਣ ਵਿੱਚ ਸਮਾਂ ਲੱਗਦਾ ਹੈ ਅਤੇ ਹਰ ਦਿਨ ਮਹੱਤਵਪੂਰਨ ਹੈ।',
          ],
        },
      },
      ta: {
        'Sunny and the little kite': {
          title: 'சன்னியும் சிறிய பட்டமும்',
          paragraphs: [
            'ஒரு காற்று வீசும் பிற்பகலில், சன்னி தனது சிவப்புப் பட்டத்துடன் குன்றுக்குச் சென்றாள். பட்டம் பறக்க முயன்றது ஆனால் பறக்கவில்லை.',
            'சன்னி ஒரு பெருமூச்சு விட்டு இன்னும் வேகமாக ஓடினாள், காற்று பட்டத்தை நீல வானத்திற்கு உயர்த்தியது. “நான் தொடர்ந்து முயற்சித்தேன்!” என்று சிரித்தாள். அவளது நண்பர்கள் கீழே ஆரவாரம் செய்தனர்.',
          ],
        },
        'Mina and the river': {
          title: 'மீனாவும் ஆறும்',
          paragraphs: [
            'மீனா யானை ஆற்றின் அருகே ஒரு மெல்லிய அழுகை ஒலியைக் கேட்டது. ஒரு சிறிய பறவையின் கூடு தண்ணீரின் அருகில் விழுந்துவிட்டது.',
            'மீனா தனது பலமான தும்பிக்கையால் ஒரு கிளையைத் தூக்கியது. நண்பர்கள் ஒன்றிணைந்து ஒரு பாதுகாப்பான புதிய வீட்டைக் கட்டினர். “சேர்ந்து உதவுவதே சிறந்தது,” என்றாள் மீனா.',
          ],
        },
        "The sunflower's wish": {
          title: 'சூரியகாந்தியின் ஆசை',
          paragraphs: [
            'ஒரு சிறிய விதை சூரியனைக் காண கனவு கண்டது. மழைத்துளி மண்ணைத் தொட்டது, வெதுவெதுப்பான சூரிய ஒளி கீழே இறங்கியது. மெதுவாக விதை வளரத் தொடங்கியது.',
            'ஒரு காலை வேளையில், ஒரு மஞ்சள் பூ தன் இதழ்களைத் திறந்தது. சிறிய சூரியகாந்தி வானத்தைப் பார்த்து புன்னகைத்தது. வளர்ச்சிக்கு நேரம் எடுக்கும், ஒவ்வொரு நாளும் முக்கியமானது.',
          ],
        },
      },
    };

    const langStories = storiesMultilingual[childLangCode] || storiesMultilingual.en;
    const storyItem = langStories[title] || langStories['Sunny and the little kite'] || {
      title,
      paragraphs: ['Reading story...'],
    };

    this.openDashModal(
      storyItem.title,
      'Read at your own pace · listen along',
      `
      <div id="readerText" class="reader-text">
        ${storyItem.paragraphs.map(p => `<p>${p}</p>`).join('')}
      </div>
      <div class="modal-controls">
        <button type="button" id="btnModalReadAloud">🔊 ${i18n.t('voice.listenAloud')}</button>
        <button type="button" class="soft" id="btnResizeSmaller">A−</button>
        <button type="button" class="soft" id="btnResizeLarger">A+</button>
        <button type="button" class="soft" id="btnFinishStory">${i18n.t('stories.finishReading')} ✓</button>
      </div>
      <p class="prototype-note">
        Accessible Story Reader: Supports high-contrast, speech read-aloud, and dyslexia-adapted font size.
      </p>
    `
    );

    document.getElementById('btnModalReadAloud')?.addEventListener('click', () => {
      const el = document.getElementById('readerText');
      if (!el) return;
      const res = this.speechService.speak(el.innerText, { langCode: childLangCode });
      if (!res.spoken && res.message) {
        this.showToast(res.message);
      }
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
      const input = document.getElementById('pitchVoiceAnswer') as HTMLInputElement;
      const lang = i18n.getCurrentLanguage();
      const rec = this.speechService.startSpeechRecognition(lang, {
        onStart: () => {
          this.showToast('Listening… say the word now 🎙️');
        },
        onResult: (transcript) => {
          if (input) {
            input.value = transcript;
            document.getElementById('btnCheckVoice')?.click();
          }
        },
        onError: (errText) => {
          this.showToast(errText || 'Voice recognition error. Please type the word.');
        },
      });

      if (!rec) {
        input?.focus();
        this.showToast('Voice input is unavailable in this browser. Please type your spelling.');
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
    if (topStreak) topStreak.textContent = `🔥 ${progress.streakDays} ${i18n.t('home.streakDays')}`;
    if (streakText) streakText.textContent = i18n.t('home.streak', { count: progress.streakDays });
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
