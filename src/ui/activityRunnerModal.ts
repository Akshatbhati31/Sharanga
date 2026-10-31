import { AiActivityService } from '../services/aiActivityService';
import { LearningPathService } from '../services/learningPathService';
import { ProfileService } from '../services/profileService';
import { SpeechService } from '../services/speechService';
import { StorageService } from '../services/storageService';
import { i18n } from '../i18n';
import type { AdaptiveRecommendation, InteractiveActivityContent } from '../types/adaptive';
import type { ChildProfile } from '../types/auth';

export class ActivityRunnerModal {
  private static instance: ActivityRunnerModal;
  private aiService: AiActivityService;
  private learningPathService: LearningPathService;
  private profileService: ProfileService;

  private activeChild: ChildProfile | null = null;
  private currentRecommendation: AdaptiveRecommendation | null = null;
  private currentActivity: InteractiveActivityContent | null = null;
  private startTime: number = 0;
  private hintsRequested: number = 0;
  private attemptsRequired: number = 1;
  private correctedAfterHint: number = 0;
  private missedItems: string[] = [];
  private onActivityCompletedCallback?: () => void;
  private variantIndex: number = 0;

  private constructor() {
    this.aiService = AiActivityService.getInstance();
    this.learningPathService = LearningPathService.getInstance();
    this.profileService = ProfileService.getInstance();
  }

  public static getInstance(): ActivityRunnerModal {
    if (!ActivityRunnerModal.instance) {
      ActivityRunnerModal.instance = new ActivityRunnerModal();
    }
    return ActivityRunnerModal.instance;
  }

  public async startRecommendation(
    child: ChildProfile,
    rec: AdaptiveRecommendation,
    onCompleted?: () => void,
    variant?: number
  ): Promise<void> {
    this.activeChild = child;
    this.currentRecommendation = rec;
    this.onActivityCompletedCallback = onCompleted;
    if (variant !== undefined) {
      this.variantIndex = variant;
    } else {
      this.variantIndex = (this.variantIndex + 1) % 4;
    }
    this.startTime = Date.now();
    this.hintsRequested = 0;
    this.attemptsRequired = 1;
    this.correctedAfterHint = 0;
    this.missedItems = [];

    const modalEl = this.ensureModalElement();
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Show loading state while fetching activity
    const prepTitle = i18n.t('activity.preparingTitle');
    const prepDesc = i18n.t('activity.preparingDesc')
      .replace('{title}', rec.title)
      .replace('{name}', child.name);

    modalEl.innerHTML = `
      <div class="modal" style="max-width: 580px; text-align: center; padding: 40px 24px;" role="dialog" aria-modal="true">
        <div class="rf-loading-spinner" style="width: 42px; height: 42px; border-width: 4px; border-color: #dff3e9; border-top-color: var(--teal); margin: 0 auto 16px;"></div>
        <h3 style="font: 900 18px Nunito; margin: 0; color: var(--ink);">${prepTitle}</h3>
        <p style="color: var(--muted); font-size: 13px; margin: 6px 0 0;">
          ${prepDesc}
        </p>
      </div>
    `;

    // Fetch generated or deterministic activity with variant to produce fresh content on replay
    this.currentActivity = await this.aiService.generateActivity({
      skillId: rec.targetSkillId,
      difficulty: rec.difficulty,
      language: child.preferredLanguage || 'English',
      childName: child.name,
      variant: this.variantIndex,
    });

    this.renderActivityView();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private renderActivityView(): void {
    if (!this.currentActivity || !this.currentRecommendation || !this.activeChild) return;

    const act = this.currentActivity;
    const rec = this.currentRecommendation;
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal activity-runner-modal" style="max-width: 620px;" role="dialog" aria-modal="true" aria-labelledby="actTitle">
        <!-- Accessible Screen Reader Live Announcement Region -->
        <div id="actSrLiveRegion" role="status" aria-live="polite" aria-atomic="true" style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; white-space: nowrap;"></div>

        <!-- Modal Head -->
        <div class="modal-head" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: ${rec.actionBg}; font-size: 20px; display: grid; place-items: center;">
              ${rec.actionIcon}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <h2 id="actTitle" style="font: 900 17px Nunito; margin: 0; color: var(--ink);">${act.title}</h2>
                <span class="tag" style="background:#eef8f4; color:var(--teal); font-size:10px;">${act.difficulty.toUpperCase()}</span>
              </div>
              <p style="font-size: 11px; color: var(--muted); margin: 2px 0 0;">${act.instruction || rec.learningObjective}</p>
            </div>
          </div>
          <button type="button" class="modal-close" id="btnCloseActModal" aria-label="${i18n.t('activity.closeModalAria') || 'Close activity'}">×</button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body" style="padding-top: 14px;">
          <!-- Instruction Box with Audio Read-Aloud -->
          <div style="background: #fafbf9; border: 1.5px solid var(--line); border-radius: 16px; padding: 14px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div>
              <span style="font-size: 11px; font-weight: 800; color: #76868c; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 4px;">
                ${i18n.t('practice.instructions')}
              </span>
              <p style="font: 700 15px Nunito; margin: 0; color: var(--ink);">
                ${act.instruction}
              </p>
            </div>
            <button type="button" id="btnPlayActInstruction" class="btn-action-pill" aria-label="${i18n.t('activity.listenInstructionBtn') || 'Listen to instructions'}" style="flex-shrink: 0; font-size: 12px; padding: 6px 12px; white-space: nowrap;">
              ${i18n.t('activity.listenInstructionBtn') || '🔊 Listen'}
            </button>
          </div>

          <!-- Prompt Question with Dedicated Speaker Button -->
          <div style="text-align: center; padding: 10px 0 16px;">
            <span style="font: 900 22px Nunito; color: var(--ink); display: block;">
              ${act.prompt}
            </span>
            <button type="button" id="btnPlayActAudio" class="btn-action-pill" aria-label="${i18n.t('activity.listenQuestionBtn')}" style="margin-top: 8px; font-size: 12px; gap: 6px;">
              ${i18n.t('activity.listenQuestionBtn')}
            </button>
          </div>

          <!-- Interactive Choices Grid with Shuffled Choices -->
          <div class="options" style="grid-template-columns: repeat(${act.items.length === 2 ? 2 : 3}, 1fr); gap: 12px; margin-bottom: 16px;">
            ${this.shuffleArray(act.items)
              .map(
                (item, idx) => `
              <div
                class="option act-item-btn"
                role="button"
                tabindex="0"
                aria-label="${item.text} - ${i18n.t('activity.audioListenOption') || 'Option'}"
                data-item-id="${item.id}"
                data-is-correct="${item.isCorrect}"
                data-item-text="${item.text.replace(/"/g, '&quot;')}"
                data-idx="${idx}"
                style="padding: 16px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;"
              >
                ${item.visual ? `<div class="picture" style="font-size: 36px; height: 60px;">${item.visual}</div>` : ''}
                <strong style="font: 900 18px Nunito; color: var(--ink); margin-top: 4px;">${item.text}</strong>
                <button
                  type="button"
                  class="act-choice-listen-btn"
                  data-text="${item.text.replace(/"/g, '&quot;')}"
                  aria-label="${i18n.t('activity.listenOptionAria', { text: item.text }) || `Listen: ${item.text}`}"
                  style="margin-top: 6px; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08); border-radius: 999px; padding: 2px 8px; font-size: 11px; color: var(--muted); cursor: pointer;"
                >
                  🔊
                </button>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Feedback Alert -->
          <div id="actFeedbackBox" role="status" aria-live="polite" class="hidden" style="border-radius: 14px; padding: 12px 16px; font-size: 13px; line-height: 1.5; margin-bottom: 14px;"></div>

          <!-- Action & Hint Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 10px; border-top: 1px solid var(--line);">
            <button type="button" id="btnRequestHint" class="btn-action-pill" style="font-size: 12px; color: #6b5cd4; border-color: #d8d3f7; background: #f6f4fe;">
              💡 ${i18n.t('activity.hintBtn')}
            </button>

            ${
              act.workedExample
                ? `
                <button type="button" id="btnShowExample" class="btn-action-pill" style="font-size: 12px;">
                  👀 ${i18n.t('activity.exampleBtn')}
                </button>
              `
                : ''
            }

            <button type="button" id="btnFinishAct" class="rf-btn-search hidden" style="margin-left: auto; background: var(--teal); padding: 8px 18px; font-size: 12px;">
              🌟 ${i18n.t('activity.nextAdventureBtn')}
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindActivityEvents();
  }

  private announceLiveRegion(message: string): void {
    const liveEl = document.getElementById('actSrLiveRegion');
    if (liveEl) {
      liveEl.textContent = message;
    }
  }

  private bindActivityEvents(): void {
    const modalEl = this.ensureModalElement();
    const act = this.currentActivity!;
    const childLangCode = i18n.supportedLanguageToCode(this.activeChild?.preferredLanguage || 'English');

    // Announce opening of activity to screen readers / TalkBack
    const openAnnouncement = i18n.t('activity.announcementOpened', { title: act.title, instruction: act.instruction }) || `${act.title}. ${act.instruction}`;
    this.announceLiveRegion(openAnnouncement);

    // Close button
    modalEl.querySelector('#btnCloseActModal')?.addEventListener('click', () => this.close());

    // Play Instruction Audio
    modalEl.querySelector('#btnPlayActInstruction')?.addEventListener('click', () => {
      if (act.instruction) {
        const res = SpeechService.getInstance().speak(act.instruction, { langCode: childLangCode, rate: 0.85 });
        if (!res.spoken && res.message) {
          const fbBox = modalEl.querySelector('#actFeedbackBox') as HTMLElement;
          if (fbBox) {
            fbBox.className = 'rf-disclaimer-box';
            fbBox.textContent = res.message;
            fbBox.classList.remove('hidden');
          }
        }
      }
    });

    // Play Question Audio Speech Synthesis
    modalEl.querySelector('#btnPlayActAudio')?.addEventListener('click', () => {
      const textToSpeak = act.audioPrompt || act.prompt;
      if (textToSpeak) {
        const res = SpeechService.getInstance().speak(textToSpeak, { langCode: childLangCode, rate: 0.85 });
        if (!res.spoken && res.message) {
          const fbBox = modalEl.querySelector('#actFeedbackBox') as HTMLElement;
          if (fbBox) {
            fbBox.className = 'rf-disclaimer-box';
            fbBox.textContent = res.message;
            fbBox.classList.remove('hidden');
          }
        }
      }
    });

    // Option Word Audio Read-Aloud
    modalEl.querySelectorAll('.act-choice-listen-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const text = (btn as HTMLElement).dataset.text || '';
        if (text) {
          SpeechService.getInstance().speak(text, { langCode: childLangCode, rate: 0.82 });
        }
      });
    });

    // Hint button
    const hintBtn = modalEl.querySelector('#btnRequestHint') as HTMLButtonElement;
    hintBtn?.addEventListener('click', () => {
      this.hintsRequested += 1;
      const fbBox = modalEl.querySelector('#actFeedbackBox') as HTMLElement;
      if (fbBox) {
        fbBox.className = 'rf-disclaimer-box';
        fbBox.style.background = '#fff8e6';
        fbBox.style.borderColor = '#f6e4a8';
        fbBox.style.color = '#7d6200';
        fbBox.innerHTML = `💡 <strong>${i18n.t('activity.helpfulHintTitle')}:</strong> ${act.stepByStepHint}`;
        fbBox.classList.remove('hidden');
      }

      // Read aloud hint in child's learning language
      SpeechService.getInstance().speak(act.stepByStepHint, { langCode: childLangCode, rate: 0.85 });
      this.announceLiveRegion(act.stepByStepHint);
    });

    // Show Example
    modalEl.querySelector('#btnShowExample')?.addEventListener('click', () => {
      if (act.workedExample) {
        const fbBox = modalEl.querySelector('#actFeedbackBox') as HTMLElement;
        if (fbBox) {
          fbBox.className = 'rf-disclaimer-box';
          fbBox.style.background = '#f2f8fc';
          fbBox.style.borderColor = '#cce3f5';
          fbBox.style.color = '#1f5782';
          fbBox.innerHTML = `👀 <strong>${i18n.t('activity.workedExampleTitle')}:</strong> ${act.workedExample.demonstration}<br><small style="color:#507998;">${act.workedExample.explanation}</small>`;
          fbBox.classList.remove('hidden');
        }

        const exampleText = `${act.workedExample.demonstration}. ${act.workedExample.explanation}`;
        SpeechService.getInstance().speak(exampleText, { langCode: childLangCode, rate: 0.85 });
        this.announceLiveRegion(exampleText);
      }
    });

    // Option item selection
    const optionBtns = modalEl.querySelectorAll('.act-item-btn');
    const finishBtn = modalEl.querySelector('#btnFinishAct') as HTMLElement;

    optionBtns.forEach(btn => {
      // Keyboard support for accessibility (Enter and Space)
      btn.addEventListener('keydown', (e: Event) => {
        const keyEvent = e as KeyboardEvent;
        if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
          keyEvent.preventDefault();
          (btn as HTMLElement).click();
        }
      });

      btn.addEventListener('click', async () => {
        const isCorrect = (btn as HTMLElement).dataset.isCorrect === 'true';
        const itemId = (btn as HTMLElement).dataset.itemId || '';
        const itemObj = act.items.find(i => i.id === itemId);

        optionBtns.forEach(b => b.classList.remove('selected', 'correct', 'wrong'));
        const fbBox = modalEl.querySelector('#actFeedbackBox') as HTMLElement;

        if (isCorrect) {
          btn.classList.add('correct');
          if (this.hintsRequested > 0) {
            this.correctedAfterHint = 1;
          }

          const winTitle = i18n.tForLang(childLangCode, 'activity.winTitle') || 'Wonderful Reading Win!';
          const defaultWinSubtitle = i18n.tForLang(childLangCode, 'activity.winSubtitle') || 'Spot on! You found the right match.';
          const feedbackMessage = itemObj?.feedbackHint || defaultWinSubtitle;
          const fullSpokenFeedback = `${winTitle}. ${feedbackMessage}`;

          if (fbBox) {
            fbBox.className = 'rf-status-banner';
            fbBox.style.background = '#e6f8ee';
            fbBox.style.borderColor = '#b7ebc9';
            fbBox.style.color = '#18794e';
            fbBox.innerHTML = `
              <span style="font-size:22px;">🎉</span>
              <div>
                <strong>${winTitle}</strong>
                <p style="margin:2px 0 0; font-size:12px;">${feedbackMessage}</p>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }

          // Voice narration of correct answer feedback in child's learning language
          SpeechService.getInstance().speak(fullSpokenFeedback, { langCode: childLangCode, rate: 0.88 });
          this.announceLiveRegion(fullSpokenFeedback);

          if (finishBtn) {
            finishBtn.classList.remove('hidden');
            finishBtn.focus();
          }

          // Disable further option clicks once correct
          optionBtns.forEach(b => ((b as HTMLElement).style.pointerEvents = 'none'));
        } else {
          btn.classList.add('wrong');
          this.attemptsRequired += 1;
          if (itemObj?.text) {
            this.missedItems.push(itemObj.text);
          }

          const tryAgainTitle = i18n.tForLang(childLangCode, 'activity.tryAgainTitle') || "Nice try! Let's look again:";
          const defaultTryAgainSubtitle = i18n.tForLang(childLangCode, 'activity.tryAgainSubtitle') || 'Check the shape and sound once more. You can do this!';
          const feedbackMessage = itemObj?.feedbackHint || defaultTryAgainSubtitle;
          const fullSpokenFeedback = `${tryAgainTitle}. ${feedbackMessage}`;

          if (fbBox) {
            fbBox.className = 'rf-status-banner';
            fbBox.style.background = '#fff4f0';
            fbBox.style.borderColor = '#fad7cc';
            fbBox.style.color = '#a83c20';
            fbBox.innerHTML = `
              <span style="font-size:20px;">🌱</span>
              <div>
                <strong>${tryAgainTitle}</strong>
                <p style="margin:2px 0 0; font-size:12px;">${feedbackMessage}</p>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }

          // Voice narration of retry feedback in child's learning language
          SpeechService.getInstance().speak(fullSpokenFeedback, { langCode: childLangCode, rate: 0.88 });
          this.announceLiveRegion(fullSpokenFeedback);
        }
      });
    });

    // Finish button
    finishBtn?.addEventListener('click', async () => {
      await this.completeActivity();
    });
  }

  private async completeActivity(): Promise<void> {
    if (!this.currentActivity || !this.currentRecommendation || !this.activeChild) return;

    const durationSeconds = Math.max(15, Math.round((Date.now() - this.startTime) / 1000));
    const totalAnswered = Math.max(1, this.attemptsRequired);
    const correctAnswers = 1;
    // Calculate honest accuracy: correct / answered attempts
    const accuracy = Number((correctAnswers / totalAnswered).toFixed(2));
    const score = Math.round(accuracy * 100);

    // Record the learning attempt and adapt the path
    await this.learningPathService.recordAttempt({
      id: `att_${Date.now()}`,
      childId: this.activeChild.id,
      activityId: this.currentRecommendation.activityId,
      skillId: this.currentRecommendation.targetSkillId,
      activityType: this.currentActivity.type,
      score,
      accuracy,
      totalQuestions: totalAnswered,
      correctAnswers: 1,
      incorrectAnswers: totalAnswered - 1,
      attemptsRequired: totalAnswered,
      hintsRequested: this.hintsRequested,
      correctedAfterHint: this.correctedAfterHint,
      durationSeconds,
      missedItems: this.missedItems,
      completedAt: new Date().toISOString(),
    });

    // Record attempt for the daily challenge counter
    StorageService.getInstance().incrementDailyAttempt(this.activeChild.id);

    // Award happy points and update progress
    const progress = this.profileService.getChildProgress(this.activeChild.id);
    this.profileService.updateChildProgress(this.activeChild.id, {
      happyPoints: progress.happyPoints + (totalAnswered === 1 ? 15 : totalAnswered === 2 ? 10 : 5),
      practiceMinutes: progress.practiceMinutes + Math.max(1, Math.round(durationSeconds / 60)),
      wordsLearned: progress.wordsLearned + 1,
      accuracyPercent: score,
    });

    // Render completion and replay screen allowing repeated replays without reload
    const modalEl = this.ensureModalElement();
    const childLangCode = i18n.supportedLanguageToCode(this.activeChild.preferredLanguage || 'English');
    const winTitle = i18n.tForLang(childLangCode, 'activity.winTitle') || 'Wonderful job! 🌟';
    const celebrationText = i18n.tForLang(childLangCode, 'activity.winSubtitle') || 'You completed this learning adventure!';

    modalEl.innerHTML = `
      <div class="modal" style="max-width: 500px; text-align: center; padding: 36px 24px;" role="dialog" aria-modal="true">
        <div style="font-size: 48px; margin-bottom: 12px;">🌟</div>
        <h2 style="font: 900 22px Nunito; color: var(--ink); margin: 0 0 6px;">${winTitle}</h2>
        <p style="color: var(--muted); font-size: 14px; margin: 0 0 24px;">${celebrationText}</p>
        
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button type="button" id="btnPlayAgainAct" class="hero-cta" style="min-height: 44px; padding: 10px 20px; font-size: 13px;">
            🔄 Play another question
          </button>
          <button type="button" id="btnDoneAct" class="soft" style="min-height: 44px; padding: 10px 20px; font-size: 13px;">
            ✓ Back to adventures
          </button>
        </div>
      </div>
    `;

    modalEl.querySelector('#btnPlayAgainAct')?.addEventListener('click', () => {
      this.variantIndex = (this.variantIndex + 1) % 4;
      this.startRecommendation(
        this.activeChild!,
        this.currentRecommendation!,
        this.onActivityCompletedCallback,
        this.variantIndex
      );
    });

    modalEl.querySelector('#btnDoneAct')?.addEventListener('click', () => {
      this.close();
      if (this.onActivityCompletedCallback) {
        this.onActivityCompletedCallback();
      }
    });
  }

  public close(): void {
    SpeechService.getInstance().stop();
    const modalEl = document.getElementById('actRunnerModalContainer');
    if (modalEl) {
      modalEl.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  private ensureModalElement(): HTMLElement {
    let el = document.getElementById('actRunnerModalContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'actRunnerModalContainer';
      el.className = 'modal-backdrop hidden';
      document.body.appendChild(el);
    }
    return el;
  }
}
