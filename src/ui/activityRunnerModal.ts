import { AiActivityService } from '../services/aiActivityService';
import { LearningPathService } from '../services/learningPathService';
import { ProfileService } from '../services/profileService';
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
    onCompleted?: () => void
  ): Promise<void> {
    this.activeChild = child;
    this.currentRecommendation = rec;
    this.onActivityCompletedCallback = onCompleted;
    this.startTime = Date.now();
    this.hintsRequested = 0;
    this.attemptsRequired = 1;
    this.correctedAfterHint = 0;
    this.missedItems = [];

    const modalEl = this.ensureModalElement();
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Show loading state while fetching activity
    modalEl.innerHTML = `
      <div class="modal" style="max-width: 580px; text-align: center; padding: 40px 24px;" role="dialog" aria-modal="true">
        <div class="rf-loading-spinner" style="width: 42px; height: 42px; border-width: 4px; border-color: #dff3e9; border-top-color: var(--teal); margin: 0 auto 16px;"></div>
        <h3 style="font: 900 18px Nunito; margin: 0; color: var(--ink);">Preparing Your Reading Adventure...</h3>
        <p style="color: var(--muted); font-size: 13px; margin: 6px 0 0;">
          Customizing "${rec.title}" for ${child.name}.
        </p>
      </div>
    `;

    // Fetch generated or deterministic activity
    this.currentActivity = await this.aiService.generateActivity({
      skillId: rec.targetSkillId,
      difficulty: rec.difficulty,
      language: child.preferredLanguage || 'English',
      childName: child.name,
    });

    this.renderActivityView();
  }

  private renderActivityView(): void {
    if (!this.currentActivity || !this.currentRecommendation || !this.activeChild) return;

    const act = this.currentActivity;
    const rec = this.currentRecommendation;
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal activity-runner-modal" style="max-width: 620px;" role="dialog" aria-modal="true" aria-labelledby="actTitle">
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
              <p style="font-size: 11px; color: var(--muted); margin: 2px 0 0;">${rec.learningObjective}</p>
            </div>
          </div>
          <button type="button" class="modal-close" id="btnCloseActModal" aria-label="Close activity">×</button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body" style="padding-top: 14px;">
          <!-- Instruction Box -->
          <div style="background: #fafbf9; border: 1.5px solid var(--line); border-radius: 16px; padding: 14px 18px; margin-bottom: 18px;">
            <span style="font-size: 11px; font-weight: 800; color: #76868c; text-transform: uppercase; letter-spacing: 0.6px; display: block; margin-bottom: 4px;">
              Instructions
            </span>
            <p style="font: 700 15px Nunito; margin: 0; color: var(--ink);">
              ${act.instruction}
            </p>
          </div>

          <!-- Prompt Question -->
          <div style="text-align: center; padding: 10px 0 16px;">
            <span style="font: 900 22px Nunito; color: var(--ink); display: block;">
              ${act.prompt}
            </span>
            ${
              act.audioPrompt
                ? `
                <button type="button" id="btnPlayActAudio" class="btn-action-pill" style="margin-top: 8px; font-size: 12px; gap: 6px;">
                  🔊 Listen to Prompt
                </button>
              `
                : ''
            }
          </div>

          <!-- Interactive Choices Grid -->
          <div class="options" style="grid-template-columns: repeat(${act.items.length === 2 ? 2 : 3}, 1fr); gap: 12px; margin-bottom: 16px;">
            ${act.items
              .map(
                (item, idx) => `
              <div
                class="option act-item-btn"
                role="button"
                tabindex="0"
                data-item-id="${item.id}"
                data-is-correct="${item.isCorrect}"
                data-idx="${idx}"
                style="padding: 16px 10px; cursor: pointer;"
              >
                ${item.visual ? `<div class="picture" style="font-size: 36px; height: 60px;">${item.visual}</div>` : ''}
                <strong style="font: 900 18px Nunito; color: var(--ink); margin-top: 4px;">${item.text}</strong>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- Feedback Alert -->
          <div id="actFeedbackBox" class="hidden" style="border-radius: 14px; padding: 12px 16px; font-size: 13px; line-height: 1.5; margin-bottom: 14px;"></div>

          <!-- Action & Hint Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding-top: 10px; border-top: 1px solid var(--line);">
            <button type="button" id="btnRequestHint" class="btn-action-pill" style="font-size: 12px; color: #6b5cd4; border-color: #d8d3f7; background: #f6f4fe;">
              💡 Need a Hint?
            </button>

            ${
              act.workedExample
                ? `
                <button type="button" id="btnShowExample" class="btn-action-pill" style="font-size: 12px;">
                  👀 Show Example
                </button>
              `
                : ''
            }

            <button type="button" id="btnFinishAct" class="rf-btn-search hidden" style="margin-left: auto; background: var(--teal); padding: 8px 18px; font-size: 12px;">
              🌟 Continue Learning →
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindActivityEvents();
  }

  private bindActivityEvents(): void {
    const modalEl = this.ensureModalElement();
    const act = this.currentActivity!;

    // Close button
    modalEl.querySelector('#btnCloseActModal')?.addEventListener('click', () => this.close());

    // Play Audio Speech Synthesis if available
    modalEl.querySelector('#btnPlayActAudio')?.addEventListener('click', () => {
      if (act.audioPrompt && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(act.audioPrompt);
        utterance.rate = 0.85;
        window.speechSynthesis.speak(utterance);
      }
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
        fbBox.innerHTML = `💡 <strong>Helpful Hint:</strong> ${act.stepByStepHint}`;
        fbBox.classList.remove('hidden');
      }
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
          fbBox.innerHTML = `👀 <strong>Worked Example:</strong> ${act.workedExample.demonstration}<br><small style="color:#507998;">${act.workedExample.explanation}</small>`;
          fbBox.classList.remove('hidden');
        }
      }
    });

    // Option item selection
    const optionBtns = modalEl.querySelectorAll('.act-item-btn');
    const finishBtn = modalEl.querySelector('#btnFinishAct') as HTMLElement;

    optionBtns.forEach(btn => {
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

          if (fbBox) {
            fbBox.className = 'rf-status-banner';
            fbBox.style.background = '#e6f8ee';
            fbBox.style.borderColor = '#b7ebc9';
            fbBox.style.color = '#18794e';
            fbBox.innerHTML = `
              <span style="font-size:22px;">🎉</span>
              <div>
                <strong>Wonderful Reading Win!</strong>
                <p style="margin:2px 0 0; font-size:12px;">${itemObj?.feedbackHint || 'Spot on! You found the right match.'}</p>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }

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

          if (fbBox) {
            fbBox.className = 'rf-status-banner';
            fbBox.style.background = '#fff4f0';
            fbBox.style.borderColor = '#fad7cc';
            fbBox.style.color = '#a83c20';
            fbBox.innerHTML = `
              <span style="font-size:20px;">🌱</span>
              <div>
                <strong>Nice try! Let's look again:</strong>
                <p style="margin:2px 0 0; font-size:12px;">${itemObj?.feedbackHint || 'Check the shape and sound once more. You can do this!'}</p>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }
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
    const accuracy = this.attemptsRequired === 1 ? 1.0 : this.attemptsRequired === 2 ? 0.75 : 0.55;
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
      totalQuestions: 1,
      correctAnswers: 1,
      incorrectAnswers: this.attemptsRequired - 1,
      attemptsRequired: this.attemptsRequired,
      hintsRequested: this.hintsRequested,
      correctedAfterHint: this.correctedAfterHint,
      durationSeconds,
      missedItems: this.missedItems,
      completedAt: new Date().toISOString(),
    });

    // Award happy points and streak
    const progress = this.profileService.getChildProgress(this.activeChild.id);
    this.profileService.updateChildProgress(this.activeChild.id, {
      happyPoints: progress.happyPoints + 15,
      practiceMinutes: progress.practiceMinutes + Math.round(durationSeconds / 60),
      wordsLearned: progress.wordsLearned + 1,
    });

    this.close();

    if (this.onActivityCompletedCallback) {
      this.onActivityCompletedCallback();
    }
  }

  public close(): void {
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
