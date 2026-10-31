import { ProfileService } from '../services/profileService';
import { ActivityTrackerService } from '../services/activityTrackerService';
import { AuthService } from '../services/authService';
import { SpeechService } from '../services/speechService';
import { StorageService } from '../services/storageService';
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
import { StoryShelfService } from '../services/storyShelfService';
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
  private storyShelfService: StoryShelfService = StoryShelfService.getInstance();
  private currentStoryLanguage: SupportedLanguage = 'English';
  private currentPage: 'home' | 'learn' | 'progress' | 'stories' | 'resources' = 'home';
  private currentSpellingWord = 'ship';
  private previousSpellingWord = '';

  // Language-specific spelling word banks for "Say it, spell it!"
  private readonly spellingWordBanks: Record<
    SupportedLanguage,
    { beginner: string[]; intermediate: string[]; advanced: string[] }
  > = {
    English: {
      beginner: ['ship', 'bell', 'fish', 'frog', 'star', 'nest', 'duck', 'tree', 'moon', 'pink'],
      intermediate: ['brush', 'cloud', 'train', 'plant', 'spoon', 'green', 'clock', 'smile'],
      advanced: ['bridge', 'splash', 'bright', 'stream', 'shadow', 'flight'],
    },
    Hindi: {
      beginner: ['घर', 'फल', 'जल', 'नाव', 'पेड़', 'तारा', 'फूल', 'किताब', 'सूरज', 'चाँद'],
      intermediate: ['कमल', 'मटर', 'सड़क', 'पहाड़', 'नदी', 'जंगल', 'बगीचा', 'चिड़िया'],
      advanced: ['मित्रता', 'प्रकाश', 'प्रकृति', 'आनंद', 'सुंदर', 'विश्वास'],
    },
    Odia: {
      beginner: ['ଘର', 'ଫଳ', 'ଜଳ', 'ଡଙ୍ଗା', 'ଗଛ', 'ତାରା', 'ଫୁଲ', 'ବହି', 'ସୂର୍ଯ୍ୟ', 'ଜହ୍ନ'],
      intermediate: ['କମଳ', 'ମଟର', 'ରାସ୍ତା', 'ପାହାଡ଼', 'ନଦୀ', 'ଜଙ୍ଗଲ', 'ବଗିଚା', 'ଚଢ଼େଇ'],
      advanced: ['ମିତ୍ରତା', 'ପ୍ରକାଶ', 'ପ୍ରକୃତି', 'ଆନନ୍ଦ', 'ସୁନ୍ଦର', 'ବିଶ୍ୱାସ'],
    },
    Punjabi: {
      beginner: ['ਘਰ', 'ਫਲ', 'ਜਲ', 'ਕਿਸ਼ਤੀ', 'ਰੁੱਖ', 'ਤਾਰਾ', 'ਫੁੱਲ', 'ਕਿਤਾਬ', 'ਸੂਰਜ', 'ਚੰਨ'],
      intermediate: ['ਕਮਲ', 'ਮਟਰ', 'ਸੜਕ', 'ਪਹਾੜ', 'ਦਰਿਆ', 'ਜੰਗਲ', 'ਬਗੀਚਾ', 'ਚਿੜੀ'],
      advanced: ['ਮਿੱਤਰਤਾ', 'ਰੌਸ਼ਨੀ', 'ਕੁਦਰਤ', 'ਆਨੰਦ', 'ਸੁੰਦਰ', 'ਵਿਸ਼ਵਾਸ'],
    },
    Tamil: {
      beginner: ['வீடு', 'பழம்', 'நீர்', 'படகு', 'மரம்', 'விண்மீன்', 'மலர்', 'நூல்', 'சூரியன்', 'நிலா'],
      intermediate: ['தாமரை', 'பச்சை', 'சாலை', 'மலை', 'ஆறு', 'காடு', 'தோட்டம்', 'பறவை'],
      advanced: ['நட்பு', 'ஒளி', 'இயற்கை', 'மகிழ்ச்சி', 'அழகு', 'நம்பிக்கை'],
    },
    Bengali: {
      beginner: ['ঘর', 'ফল', 'জল', 'নৌকা', 'গাছ', 'তারা', 'ফুল', 'বই', 'সূর্য', 'চাঁদ'],
      intermediate: ['কমল', 'মটর', 'রাস্তা', 'পাহাড়', 'নদী', 'জঙ্গল', 'বাগান', 'পাখি'],
      advanced: ['বন্ধুত্ব', 'আলো', 'প্রকৃতি', 'আনন্দ', 'সুন্দর', 'বিশ্বাস'],
    },
  };

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
    this.currentStoryLanguage = child.preferredLanguage || 'English';
    const progress = this.profileService.getChildProgress(child.id);
    const dailyAttempts = StorageService.getInstance().getDailyAttempts(child.id);
    const dailyGoal = 10;
    const dailyPct = Math.min(100, Math.round((dailyAttempts / dailyGoal) * 100));

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
                <small id="statPracticeTimeSub"><span class="${progress.practiceMinutes > 0 ? 'positive' : ''}">${progress.practiceMinutes > 0 ? `↑ ${progress.practiceMinutes} min` : '0 min'}</span> ${i18n.t('home.statPracticeTimeFromLastWeek')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('home.statWordsLearned')} <span class="stat-icon" style="background:#fff2d0">📚</span></div>
                <strong id="statWordsLearned">${progress.wordsLearned}</strong>
                <small id="statWordsLearnedSub"><span class="${progress.wordsLearned > 0 ? 'positive' : ''}">${progress.wordsLearned > 0 ? `↑ ${progress.wordsLearned} new` : '0 new'}</span> ${i18n.t('home.statWordsLearnedNew')}</small>
              </div>
              <div class="stat">
                <div class="stat-top">${i18n.t('home.statFluency')} <span class="stat-icon" style="background:#fce9e3">🌿</span></div>
                <strong id="statFluency">${progress.fluencyWpm} <small>wpm</small></strong>
                <small id="statFluencySub"><span class="${progress.fluencyWpm > 0 ? 'positive' : ''}">${progress.fluencyWpm > 0 ? `↑ ${progress.fluencyWpm} wpm` : 'Baseline'}</span> ${i18n.t('home.statFluencyGrowing')}</small>
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
              <div class="progress-small" id="dailyChallengeContainer">
                <div id="dailyChallengeAttemptLabel">Attempts: ${dailyAttempts} / ${dailyGoal}</div>
                <div class="bar" id="dailyChallengeBar" role="progressbar" aria-valuenow="${dailyAttempts}" aria-valuemin="0" aria-valuemax="${dailyGoal}" aria-label="Daily challenge attempts">
                  <i id="dailyChallengeProgressBar" style="width: ${dailyPct}%"></i>
                </div>
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
            <div id="storiesContainer"></div>

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
        if (this.learningJourneyView && this.activeChild) {
          this.learningJourneyView.render(this.activeChild);
        }
        this.homeReadingChart?.refresh(this.activeChild.id);
      } else if (name === 'learn') {
        this.updateDailyChallengeUI();
      } else if (name === 'progress') {
        this.progressReadingChart?.refresh(this.activeChild.id);
      } else if (name === 'stories') {
        this.renderStoryShelf(true);
      } else if (name === 'resources') {
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

    // Initialize Story Shelf
    this.renderStoryShelf(false);

    // Picture word match option selection
    this.bindGameOptions();

    // Game action buttons
    this.container.querySelector('#btnHearWord')?.addEventListener('click', () => this.speakCurrentWord());
    this.container.querySelector('#btnCheckAnswer')?.addEventListener('click', () => this.checkGameAnswer());

    // Activities
    this.container.querySelector('#actMirror')?.addEventListener('click', () => this.openLetterGame());
    this.container.querySelector('#actStory')?.addEventListener('click', () => {
      const { featured } = this.storyShelfService.getFeaturedAndShelfStories(
        this.currentStoryLanguage,
        this.activeChild?.grade
      );
      this.openStory(featured.id, this.currentStoryLanguage);
    });
    this.container.querySelector('#actVoice')?.addEventListener('click', () => this.openVoicePractice());
    this.container.querySelector('#btnVoicePractice')?.addEventListener('click', () => this.openVoicePractice());
    this.container.querySelector('#cardBadge')?.addEventListener('click', () => this.openBadgeModal());

    // Resource finder button
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
  }  // -------------------------------------------------------------
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
    const targetWord = data.words[0];
    if (targetWordEl) targetWordEl.textContent = targetWord;
    if (instructionEl) instructionEl.textContent = data.prompt;

    const choices = data.words.map((w, idx) => ({
      word: w,
      picture: data.pictures[idx] || '🌟',
      isCorrect: w === targetWord,
    }));

    // Fisher-Yates shuffle choices so correct option isn't always at index 0
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    const optButtons = this.container.querySelectorAll('.options .option');
    optButtons.forEach((btn, index) => {
      const choice = choices[index];
      if (!choice) return;
      const strong = btn.querySelector('strong');
      const pic = btn.querySelector('.picture');
      if (strong) strong.textContent = choice.word;
      if (pic) pic.textContent = choice.picture;
      (btn as HTMLElement).dataset.word = choice.word;
      (btn as HTMLElement).dataset.correct = choice.isCorrect ? 'true' : 'false';
      (btn as HTMLElement).dataset.rewarded = '';
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

    // Increment daily challenge attempt only when answer is actually submitted
    if (this.activeChild) {
      StorageService.getInstance().incrementDailyAttempt(this.activeChild.id);
      this.updateDailyChallengeUI();
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
          accuracy: 0.0,
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
        ['বই', 'फूल', 'গাছ', '📖', '🌸', '🌳'],
      ],
    };

    const bank = langBanks[currentLang] || langBanks.English;
    const currentWord = (this.container.querySelector('#targetWord')?.textContent || '').trim();
    const available = bank.filter(g => g[0] !== currentWord);
    const chosenList = available.length > 0 ? available : bank;
    const rand = chosenList[Math.floor(Math.random() * chosenList.length)];
    const targetWord = rand[0];

    const targetEl = this.container.querySelector('#targetWord');
    if (targetEl) targetEl.textContent = targetWord;

    const choices = [
      { word: rand[0], picture: rand[3], isCorrect: true },
      { word: rand[1], picture: rand[4], isCorrect: false },
      { word: rand[2], picture: rand[5], isCorrect: false },
    ];

    // Fisher-Yates shuffle choices so correct option isn't always at index 0
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    const optButtons = this.container.querySelectorAll('.options .option');
    optButtons.forEach((btn, i) => {
      const choice = choices[i];
      if (!choice) return;
      (btn as HTMLElement).dataset.word = choice.word;
      (btn as HTMLElement).dataset.correct = choice.isCorrect ? 'true' : 'false';
      (btn as HTMLElement).dataset.rewarded = '';
      const strong = btn.querySelector('strong');
      const pic = btn.querySelector('.picture');
      if (strong) strong.textContent = choice.word;
      if (pic) pic.textContent = choice.picture;
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
  // Story Shelf & Reading
  // -------------------------------------------------------------
  private renderStoryShelf(advance: boolean = false): void {
    const storiesContainer = this.container.querySelector('#storiesContainer');
    if (!storiesContainer) return;

    const childGrade = this.activeChild?.grade || 'Class 1';
    const { featured, shelf } = this.storyShelfService.getFeaturedAndShelfStories(
      this.currentStoryLanguage,
      childGrade,
      advance
    );

    storiesContainer.innerHTML = `
      <div class="learn-heading">
        <div>
          <h1>${i18n.t('stories.heading')}</h1>
          <p>${i18n.t('stories.sub', { name: this.activeChild?.name || 'Reader', grade: childGrade })}</p>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <button type="button" class="soft" id="btnShuffleStories" title="Shuffle stories">🔄 Shuffle</button>
          <div class="lang-select">
            <select id="storyLanguageSelect">
              <option value="English" ${this.currentStoryLanguage === 'English' ? 'selected' : ''}>EG English</option>
              <option value="Hindi" ${this.currentStoryLanguage === 'Hindi' ? 'selected' : ''}>HN हिन्दी</option>
              <option value="Odia" ${this.currentStoryLanguage === 'Odia' ? 'selected' : ''}>OD ଓଡ଼ିଆ</option>
              <option value="Punjabi" ${this.currentStoryLanguage === 'Punjabi' ? 'selected' : ''}>PB ਪੰਜਾਬੀ</option>
              <option value="Tamil" ${this.currentStoryLanguage === 'Tamil' ? 'selected' : ''}>TM தமிழ்</option>
            </select>
          </div>
        </div>
      </div>

      <div class="hero" style="background:#496a9a; min-height:150px">
        <div class="hero-copy">
          <div class="eyebrow" id="storyHeroGrade">
            ${i18n.t('stories.storyOfDayTag')} · ${featured.readingLevel.toUpperCase()} · ⏱️ ${featured.estimatedMinutes} min
          </div>
          <h1>${featured.title}</h1>
          <p>${featured.synopsis}</p>
          <button class="hero-cta" id="btnReadHeroStory" data-story-id="${featured.id}">${i18n.t('stories.readStoryBtn')}</button>
        </div>
        <div class="hero-figure" aria-hidden="true">${featured.emoji}</div>
      </div>

      <div class="section-head">
        <div>
          <h2>${i18n.t('stories.moreStories')}</h2>
          <p>${i18n.t('stories.moreStoriesSub')}</p>
        </div>
        <span class="tag" id="storyTagLevel">${this.currentStoryLanguage.toUpperCase()} · ${childGrade.toUpperCase()}</span>
      </div>

      <div class="content-grid">
        ${shelf.map(story => `
          <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-size:34px">${story.emoji}</div>
              <div style="display:flex; gap:6px; margin:6px 0 4px; align-items:center;">
                <span class="tag" style="font-size:10px; padding:2px 6px;">${story.readingLevel}</span>
                <span style="font-size:11px; color:#829094;">⏱️ ${story.estimatedMinutes}m</span>
              </div>
              <h3 style="font:900 16px Nunito; margin:4px 0 4px">${story.title}</h3>
              <p style="font-size:11px; color:#829094; margin:0">${story.synopsis}</p>
            </div>
            <button class="text-link btn-read-shelf-story" style="padding:12px 0 0; text-align:left;" data-story-id="${story.id}">${i18n.t('stories.readStory')} →</button>
          </div>
        `).join('')}
      </div>
    `;

    // Bind events for newly rendered shelf elements
    storiesContainer.querySelector('#btnShuffleStories')?.addEventListener('click', () => {
      this.renderStoryShelf(true);
      this.showToast('Story shelf rotated 🔄');
    });

    const langSelect = storiesContainer.querySelector('#storyLanguageSelect') as HTMLSelectElement;
    langSelect?.addEventListener('change', () => {
      this.currentStoryLanguage = langSelect.value as SupportedLanguage;
      this.renderStoryShelf(false);
      this.showToast(`Story shelf updated for ${this.currentStoryLanguage} 📚`);
    });

    storiesContainer.querySelector('#btnReadHeroStory')?.addEventListener('click', (e) => {
      const storyId = (e.currentTarget as HTMLElement).dataset.storyId || featured.id;
      this.openStory(storyId, this.currentStoryLanguage);
    });

    storiesContainer.querySelectorAll('.btn-read-shelf-story').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const storyId = (e.currentTarget as HTMLElement).dataset.storyId;
        if (storyId) this.openStory(storyId, this.currentStoryLanguage);
      });
    });
  }

  private openStory(storyIdOrTitle: string, lang?: SupportedLanguage): void {
    const storyLang = lang || this.currentStoryLanguage || this.activeChild?.preferredLanguage || 'English';
    const story = this.storyShelfService.getStoryById(storyIdOrTitle, storyLang);
    if (!story) return;

    if (this.activeChild) {
      this.activityTracker.startActivity(
        this.activeChild.parentId,
        this.activeChild.id,
        'story_reading',
        `Story: ${story.title}`
      );
    }

    const childLangCode = i18n.supportedLanguageToCode(storyLang);
    let comprehensionAnswered = 0;
    const totalQuestions = story.comprehensionQuestions.length;

    this.openDashModal(
      `${story.emoji} ${story.title}`,
      `${story.readingLevel.toUpperCase()} · ⏱️ ${story.estimatedMinutes} min read`,
      `
      <div id="readerText" class="reader-text">
        ${story.paragraphs.map(p => `<p>${p}</p>`).join('')}
      </div>
      <div class="modal-controls">
        <button type="button" id="btnModalReadAloud">🔊 ${i18n.t('voice.listenAloud')}</button>
        <button type="button" class="soft" id="btnResizeSmaller">A−</button>
        <button type="button" class="soft" id="btnResizeLarger">A+</button>
        <button type="button" class="soft" id="btnFinishStory">${i18n.t('stories.finishReading')} ✓</button>
      </div>

      ${totalQuestions > 0 ? `
        <div class="story-comprehension-section" style="margin-top:20px; padding-top:16px; border-top:2px dashed #cbd5e1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="font:900 16px Nunito; margin:0; color:#1e293b;">🧠 Comprehension Check</h3>
            <span id="compScoreTag" class="tag" style="background:#e0f2fe; color:#0369a1;">0 / ${totalQuestions} Answered</span>
          </div>
          <div class="questions-list" style="display:flex; flex-direction:column; gap:14px;">
            ${story.comprehensionQuestions.map((q, qIdx) => `
              <div class="question-card" data-qid="${q.id}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                <p style="font-weight:700; margin:0 0 10px; color:#1e293b;">${qIdx + 1}. ${q.question}</p>
                <div class="question-options" style="display:flex; flex-direction:column; gap:6px;">
                  ${q.options.map((opt, oIdx) => `
                    <button type="button" class="btn-comp-option" data-qid="${q.id}" data-opt-idx="${oIdx}" style="text-align:left; padding:8px 12px; border-radius:6px; border:1px solid #cbd5e1; background:white; font-size:13px; cursor:pointer; transition:all 0.15s ease;">
                      ${opt}
                    </button>
                  `).join('')}
                </div>
                <div class="comp-feedback" id="feedback_${q.id}" style="margin-top:8px; font-size:12px; font-weight:600; display:none;"></div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <p class="prototype-note" style="margin-top:16px;">
        Accessible Story Reader: Supports high-contrast, speech read-aloud in ${storyLang}, text resizing, and reading comprehension.
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

    // Wire comprehension question clicks
    const answeredMap = new Set<string>();
    const modalEl = this.container.querySelector('#dashModalContent');
    if (modalEl) {
      modalEl.querySelectorAll('.btn-comp-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.currentTarget as HTMLButtonElement;
          const qid = target.dataset.qid;
          const optIdx = parseInt(target.dataset.optIdx || '-1', 10);
          if (!qid || optIdx < 0) return;

          const question = story.comprehensionQuestions.find(q => q.id === qid);
          if (!question) return;

          const feedbackEl = modalEl.querySelector(`#feedback_${qid}`) as HTMLElement;
          const parentCard = target.closest('.question-card') as HTMLElement;

          if (optIdx === question.correctIndex) {
            target.style.background = '#dcfce7';
            target.style.borderColor = '#16a34a';
            target.style.color = '#15803d';
            target.style.fontWeight = '700';

            // Disable siblings for this question
            parentCard?.querySelectorAll('.btn-comp-option').forEach(b => {
              (b as HTMLButtonElement).disabled = true;
            });

            if (feedbackEl) {
              feedbackEl.style.display = 'block';
              feedbackEl.style.color = '#15803d';
              feedbackEl.textContent = `✓ Correct! ${question.explanation}`;
            }

            if (!answeredMap.has(qid)) {
              answeredMap.add(qid);
              comprehensionAnswered++;

              const scoreTag = modalEl.querySelector('#compScoreTag');
              if (scoreTag) {
                scoreTag.textContent = `${comprehensionAnswered} / ${totalQuestions} Correct ⭐`;
              }

              if (this.activeChild) {
                // Award happy points
                const prog = this.profileService.getChildProgress(this.activeChild.id);
                const updated = this.profileService.updateChildProgress(this.activeChild.id, {
                  happyPoints: prog.happyPoints + 5,
                });
                const pointsEl = this.container.querySelector('#points');
                if (pointsEl) pointsEl.textContent = String(updated.happyPoints);

                // Record attempt in learning path service
                this.learningPathService.recordAttempt({
                  id: `att_comp_${Date.now()}`,
                  childId: this.activeChild.id,
                  activityId: `act_story_${story.id}`,
                  skillId: 'skill_reading_comprehension',
                  activityType: 'story_comprehension',
                  score: 100,
                  accuracy: 1.0,
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

                // Increment daily challenge attempt counter
                const storage = StorageService.getInstance();
                storage.incrementDailyAttempt(this.activeChild.id);
                this.updateDailyChallengeUI();
              }
            }
          } else {
            target.style.background = '#fee2e2';
            target.style.borderColor = '#dc2626';
            target.style.color = '#991b1b';
            if (feedbackEl) {
              feedbackEl.style.display = 'block';
              feedbackEl.style.color = '#dc2626';
              feedbackEl.textContent = 'Not quite — take another look at the story!';
            }
          }
        });
      });
    }

    document.getElementById('btnFinishStory')?.addEventListener('click', () => {
      if (this.activeChild) {
        const prog = this.profileService.getChildProgress(this.activeChild.id);
        const updated = this.profileService.updateChildProgress(this.activeChild.id, {
          happyPoints: prog.happyPoints + 5,
          wordsLearned: prog.wordsLearned + 1,
        });
        const pointsEl = this.container.querySelector('#points');
        if (pointsEl) pointsEl.textContent = String(updated.happyPoints);

        const storage = StorageService.getInstance();
        storage.incrementDailyAttempt(this.activeChild.id);
        this.updateDailyChallengeUI();
      }
      this.showToast('Story complete — +5 happy points ⭐');
      this.closeDashModal();
    });
  }

  private selectNextSpellingWord(lang: SupportedLanguage, grade?: string): string {
    const bank = this.spellingWordBanks[lang] || this.spellingWordBanks.English;
    let pool = bank.beginner;
    const lowerGrade = (grade || '').toLowerCase();
    if (lowerGrade.includes('3') || lowerGrade.includes('4') || lowerGrade.includes('intermediate')) {
      pool = bank.intermediate;
    } else if (lowerGrade.includes('5') || lowerGrade.includes('6') || lowerGrade.includes('advanced')) {
      pool = bank.advanced;
    }

    const available = pool.filter(w => w !== this.currentSpellingWord && w !== this.previousSpellingWord);
    const chosenList = available.length > 0 ? available : pool;
    const next = chosenList[Math.floor(Math.random() * chosenList.length)];
    this.previousSpellingWord = this.currentSpellingWord;
    this.currentSpellingWord = next;
    return next;
  }

  private openVoicePractice(): void {
    const lang = this.activeChild?.preferredLanguage || 'English';
    const childLangCode = i18n.supportedLanguageToCode(lang);
    const target = this.selectNextSpellingWord(lang, this.activeChild?.grade);

    this.openDashModal(
      'Say it, spell it! 🎙️',
      'Listen to the word, then say or type what you heard.',
      `
      <div class="modal-callout">
        Word to spell: <strong id="spellingTargetWord">${target}</strong> &nbsp;
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
        <button type="button" class="primary" id="btnNextSpellingWord">Next word ❯</button>
      </div>
      <p id="pitchVoiceFeedback" class="feedback" style="margin-top:10px;"></p>
      <p class="prototype-note">Speech recognition uses browser Web Speech API with native ${lang} voice synthesis & recognition.</p>
    `
    );

    const playWordAudio = () => {
      const res = this.speechService.speak(this.currentSpellingWord, { langCode: childLangCode });
      if (!res.spoken && res.message) {
        this.showToast(res.message);
      }
    };

    document.getElementById('btnHearModalWord')?.addEventListener('click', playWordAudio);

    const handleNextWord = () => {
      const newWord = this.selectNextSpellingWord(lang, this.activeChild?.grade);
      const targetEl = document.getElementById('spellingTargetWord');
      if (targetEl) targetEl.textContent = newWord;
      const inputEl = document.getElementById('pitchVoiceAnswer') as HTMLInputElement;
      if (inputEl) {
        inputEl.value = '';
        inputEl.focus();
      }
      const fb = document.getElementById('pitchVoiceFeedback');
      if (fb) fb.textContent = '';
      submittedForWord = false;
      playWordAudio();
    };

    document.getElementById('btnNextSpellingWord')?.addEventListener('click', handleNextWord);

    let submittedForWord = false;

    document.getElementById('btnCheckVoice')?.addEventListener('click', () => {
      const input = document.getElementById('pitchVoiceAnswer') as HTMLInputElement;
      const fb = document.getElementById('pitchVoiceFeedback');
      if (!input || !fb) return;

      const userVal = input.value.trim().toLowerCase();
      if (!userVal) {
        fb.style.color = '#b37b30';
        fb.textContent = 'Please say or type the word first.';
        return;
      }

      if (this.activeChild && !submittedForWord) {
        submittedForWord = true;
        StorageService.getInstance().incrementDailyAttempt(this.activeChild.id);
        this.updateDailyChallengeUI();
      }

      const expected = this.currentSpellingWord.trim().toLowerCase();
      const isCorrect = userVal === expected;

      if (isCorrect) {
        fb.style.color = '#3b9b75';
        fb.textContent = 'That matches! Lovely spelling. +5 happy points ⭐';
        if (this.activeChild) {
          const prog = this.profileService.getChildProgress(this.activeChild.id);
          const updated = this.profileService.updateChildProgress(this.activeChild.id, {
            happyPoints: prog.happyPoints + 5,
            wordsLearned: prog.wordsLearned + 1,
          });
          const pointsEl = this.container.querySelector('#points');
          if (pointsEl) pointsEl.textContent = String(updated.happyPoints);

          this.learningPathService.recordAttempt({
            id: `att_spelling_${Date.now()}`,
            childId: this.activeChild.id,
            activityId: 'act_voice_spelling',
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
            durationSeconds: 15,
            missedItems: [],
            completedAt: new Date().toISOString(),
          }).then(() => {
            this.refreshCharts();
          });
        }
      } else {
        fb.style.color = '#c87961';
        fb.textContent = `Good try! Listen once more, then try again. (${this.currentSpellingWord})`;
        if (this.activeChild) {
          this.learningPathService.recordAttempt({
            id: `att_spelling_${Date.now()}`,
            childId: this.activeChild.id,
            activityId: 'act_voice_spelling',
            skillId: 'skill_letter_sounds_basic',
            activityType: 'word_match',
            score: 50,
            accuracy: 0.0,
            totalQuestions: 1,
            correctAnswers: 0,
            incorrectAnswers: 1,
            attemptsRequired: 2,
            hintsRequested: 0,
            correctedAfterHint: 0,
            durationSeconds: 15,
            missedItems: [this.currentSpellingWord],
            completedAt: new Date().toISOString(),
          }).then(() => {
            this.refreshCharts();
          });
        }
      }
    });

    document.getElementById('btnStartVoice')?.addEventListener('click', () => {
      const input = document.getElementById('pitchVoiceAnswer') as HTMLInputElement;
      const rec = this.speechService.startSpeechRecognition(childLangCode, {
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

    playWordAudio();
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
  }

  public updateDailyChallengeUI(): void {
    if (!this.activeChild) return;
    const dailyAttempts = StorageService.getInstance().getDailyAttempts(this.activeChild.id);
    const dailyGoal = 10;
    const dailyPct = Math.min(100, Math.round((dailyAttempts / dailyGoal) * 100));

    const label = this.container.querySelector('#dailyChallengeAttemptLabel');
    if (label) {
      label.textContent = `Attempts: ${dailyAttempts} / ${dailyGoal}`;
    }

    const barEl = this.container.querySelector('#dailyChallengeBar');
    if (barEl) {
      barEl.setAttribute('aria-valuenow', String(dailyAttempts));
      barEl.setAttribute('aria-valuemax', String(dailyGoal));
      barEl.setAttribute('aria-label', `Daily challenge: ${dailyAttempts} of ${dailyGoal} attempts completed`);
    }

    const fillEl = this.container.querySelector('#dailyChallengeProgressBar') as HTMLElement | null;
    if (fillEl) {
      fillEl.style.width = `${dailyPct}%`;
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
    this.updateDailyChallengeUI();
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
