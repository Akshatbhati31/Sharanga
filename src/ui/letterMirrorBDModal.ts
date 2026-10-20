import { LearningPathService } from '../services/learningPathService';
import { ProfileService } from '../services/profileService';
import type { ChildProfile } from '../types/auth';

interface BDRound {
  id: string;
  type: 'spot_b' | 'spot_d' | 'word_completion' | 'feature_check';
  prompt: string;
  targetLetter: 'b' | 'd';
  contextWord?: string;
  contextHint?: string;
  visualIcon: string;
  audioPrompt: string;
  options: {
    letter: 'b' | 'd';
    display: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

export class LetterMirrorBDModal {
  private static instance: LetterMirrorBDModal;
  private learningPathService: LearningPathService;
  private profileService: ProfileService;

  private activeChild: ChildProfile | null = null;
  private currentRoundIndex: number = 0;
  private rounds: BDRound[] = [];
  private totalRounds: number = 5;
  private correctCount: number = 0;
  private incorrectCount: number = 0;
  private hintsRequested: number = 0;
  private startTime: number = 0;
  private missedPatterns: string[] = [];
  private onCompletedCallback?: () => void;

  private constructor() {
    this.learningPathService = LearningPathService.getInstance();
    this.profileService = ProfileService.getInstance();
  }

  public static getInstance(): LetterMirrorBDModal {
    if (!LetterMirrorBDModal.instance) {
      LetterMirrorBDModal.instance = new LetterMirrorBDModal();
    }
    return LetterMirrorBDModal.instance;
  }

  public start(child: ChildProfile, onCompleted?: () => void): void {
    this.activeChild = child;
    this.onCompletedCallback = onCompleted;
    this.currentRoundIndex = 0;
    this.correctCount = 0;
    this.incorrectCount = 0;
    this.hintsRequested = 0;
    this.missedPatterns = [];
    this.startTime = Date.now();

    this.rounds = this.generateRandomizedRounds();

    const modalEl = this.ensureModalElement();
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    this.renderCurrentRound();
  }

  private generateRandomizedRounds(): BDRound[] {
    const questionPool: BDRound[] = [
      {
        id: 'round_spot_b',
        type: 'spot_b',
        prompt: 'Spot the lowercase letter <b>b</b> (Bat then Ball):',
        targetLetter: 'b',
        visualIcon: '🏏',
        audioPrompt: 'Touch the lowercase letter b',
        options: [
          {
            letter: 'b',
            display: 'b',
            isCorrect: true,
            explanation: "That's it! Tall bat on the left, round belly bouncing right! 🏏",
          },
          {
            letter: 'd',
            display: 'd',
            isCorrect: false,
            explanation: "This is 'd'. Look at its round tummy on the left. 'b' has the tall bat first!",
          },
        ],
      },
      {
        id: 'round_spot_d',
        type: 'spot_d',
        prompt: 'Spot the lowercase letter <b>d</b> (Donut then Stick):',
        targetLetter: 'd',
        visualIcon: '🍩',
        audioPrompt: 'Touch the lowercase letter d',
        options: [
          {
            letter: 'd',
            display: 'd',
            isCorrect: true,
            explanation: "Great job! Round donut first on the left, tall stick on the right! 🍩",
          },
          {
            letter: 'b',
            display: 'b',
            isCorrect: false,
            explanation: "This is 'b'. 'b' starts with the bat on the left. 'd' has the round donut first!",
          },
        ],
      },
      {
        id: 'round_word_ball',
        type: 'word_completion',
        prompt: 'Which letter completes <b>_all</b> (a bouncy ball)?',
        targetLetter: 'b',
        contextWord: '_all',
        contextHint: 'ball starts with the /b/ sound',
        visualIcon: '⚽',
        audioPrompt: 'Which letter starts the word ball?',
        options: [
          {
            letter: 'b',
            display: 'b',
            isCorrect: true,
            explanation: "Yes! 'b' for ball: bat then ball creates 'ball' ⚽!",
          },
          {
            letter: 'd',
            display: 'd',
            isCorrect: false,
            explanation: "With 'd', that spells 'dall'. We want 'ball' with the bat on the left!",
          },
        ],
      },
      {
        id: 'round_word_dog',
        type: 'word_completion',
        prompt: 'Which letter completes <b>_og</b> (a wagging puppy)?',
        targetLetter: 'd',
        contextWord: '_og',
        contextHint: 'dog starts with the /d/ sound',
        visualIcon: '🐶',
        audioPrompt: 'Which letter starts the word dog?',
        options: [
          {
            letter: 'd',
            display: 'd',
            isCorrect: true,
            explanation: "Spot on! 'd' for dog: round donut first, then tall stick 🐶!",
          },
          {
            letter: 'b',
            display: 'b',
            isCorrect: false,
            explanation: "With 'b', that spells 'bog'. We want 'dog' with the round donut on the left!",
          },
        ],
      },
      {
        id: 'round_word_duck',
        type: 'word_completion',
        prompt: 'Which letter completes <b>_uck</b> (quacking duck)?',
        targetLetter: 'd',
        contextWord: '_uck',
        contextHint: 'duck starts with the /d/ sound',
        visualIcon: '🦆',
        audioPrompt: 'Which letter starts the word duck?',
        options: [
          {
            letter: 'd',
            display: 'd',
            isCorrect: true,
            explanation: "Quack! You got it! 'd' has its round tummy first, then stick 🦆!",
          },
          {
            letter: 'b',
            display: 'b',
            isCorrect: false,
            explanation: "With 'b', that spells 'buck'. For 'duck', pick 'd' with the donut on the left!",
          },
        ],
      },
      {
        id: 'round_word_bed',
        type: 'word_completion',
        prompt: 'Which letter begins <b>_ed</b> (where we sleep)?',
        targetLetter: 'b',
        contextWord: '_ed',
        contextHint: 'bed begins with the left hand b',
        visualIcon: '🛏️',
        audioPrompt: 'Which letter starts the word bed?',
        options: [
          {
            letter: 'b',
            display: 'b',
            isCorrect: true,
            explanation: "Super! The word 'bed' starts with 'b' (left hand) and ends with 'd' (right hand) 🛏️!",
          },
          {
            letter: 'd',
            display: 'd',
            isCorrect: false,
            explanation: "Remember the bed trick: left hand is 'b', right hand is 'd'!",
          },
        ],
      },
      {
        id: 'round_belly_right',
        type: 'feature_check',
        prompt: 'Which letter has its round tummy facing <b>RIGHT</b>?',
        targetLetter: 'b',
        visualIcon: '👉',
        audioPrompt: 'Which letter has its belly facing right?',
        options: [
          {
            letter: 'b',
            display: 'b',
            isCorrect: true,
            explanation: "Exactly! 'b' sticks its tummy forward to the right (like a full belly) 🎈!",
          },
          {
            letter: 'd',
            display: 'd',
            isCorrect: false,
            explanation: "'d' has its belly facing left. 'b' has its belly bouncing right!",
          },
        ],
      },
    ];

    // Shuffle and pick totalRounds
    const shuffled = [...questionPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, this.totalRounds);
  }

  private renderCurrentRound(): void {
    const modalEl = this.ensureModalElement();
    const round = this.rounds[this.currentRoundIndex];
    if (!round) {
      this.renderSummary();
      return;
    }

    // Randomize option order for this round
    const randomizedOptions = [...round.options].sort(() => Math.random() - 0.5);

    modalEl.innerHTML = `
      <div class="modal activity-runner-modal" style="max-width: 620px;" role="dialog" aria-modal="true" aria-labelledby="bdModalTitle">
        <!-- Head -->
        <div class="modal-head" style="align-items: center; border-bottom: 1.5px solid var(--line); padding-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 42px; height: 42px; border-radius: 12px; background: #fff1d2; font-size: 22px; display: grid; place-items: center;">
              🔤
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <h2 id="bdModalTitle" style="font: 900 18px Nunito; margin: 0; color: var(--ink);">
                  Letter Mirror: b and d Detective 🔍
                </h2>
                <span class="tag" style="background:#eef8f4; color:var(--teal); font-size:11px;">
                  ROUND ${this.currentRoundIndex + 1} OF ${this.totalRounds}
                </span>
              </div>
              <p style="font-size: 12px; color: var(--muted); margin: 2px 0 0;">
                Learn to tell lowercase <strong>b</strong> and <strong>d</strong> apart with easy visual tricks.
              </p>
            </div>
          </div>
          <button type="button" class="modal-close" id="btnCloseBDModal" aria-label="Close activity">×</button>
        </div>

        <!-- Body -->
        <div class="modal-body" style="padding-top: 14px;">
          <!-- Visual Helper Mnemonic Cards (The Bat & Ball vs Donut & Stick) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
            <div style="background: #eef6fc; border: 2px solid #bce0fd; border-radius: 16px; padding: 12px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="font: 900 36px 'Comic Sans MS', Nunito, sans-serif; color: #1971c2; line-height: 1;">b</span>
                <span style="font-size: 24px;">🏏</span>
              </div>
              <strong style="font: 800 13px Nunito; color: #1971c2; display: block; margin-top: 4px;">Bat then Ball</strong>
              <small style="font-size: 11px; color: #495057;">Tall stick on the LEFT, belly on the RIGHT</small>
            </div>

            <div style="background: #fbf2ea; border: 2px solid #ffd8a8; border-radius: 16px; padding: 12px; text-align: center;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span style="font: 900 36px 'Comic Sans MS', Nunito, sans-serif; color: #d9480f; line-height: 1;">d</span>
                <span style="font-size: 24px;">🍩</span>
              </div>
              <strong style="font: 800 13px Nunito; color: #d9480f; display: block; margin-top: 4px;">Donut then Stick</strong>
              <small style="font-size: 11px; color: #495057;">Round donut on the LEFT, tall stick on RIGHT</small>
            </div>
          </div>

          <!-- Prompt Box -->
          <div style="background: #fff; border: 2px dashed #b7ebc9; border-radius: 18px; padding: 18px; text-align: center; margin-bottom: 18px;">
            <div style="font-size: 32px; margin-bottom: 6px;">${round.visualIcon}</div>
            <h3 style="font: 900 20px Nunito; margin: 0 0 6px; color: var(--ink);">
              ${round.prompt}
            </h3>
            ${
              round.contextHint
                ? `<p style="font-size: 13px; color: #5c7078; margin: 0;">💡 Hint: ${round.contextHint}</p>`
                : ''
            }
            <button type="button" id="btnHearBDLetter" class="btn-action-pill" style="margin-top: 10px; font-size: 12px; padding: 6px 14px; background: #f3f6f8;">
              🔊 Listen to prompt
            </button>
          </div>

          <!-- Choice Options -->
          <div class="bd-choice-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            ${randomizedOptions
              .map(
                opt => `
              <button
                type="button"
                class="bd-option-btn"
                data-letter="${opt.letter}"
                data-is-correct="${opt.isCorrect}"
                data-explanation="${opt.explanation.replace(/"/g, '&quot;')}"
                style="
                  min-height: 90px;
                  border-radius: 20px;
                  border: 2.5px solid var(--line);
                  background: #fff;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  cursor: pointer;
                  transition: all 0.16s ease;
                  font: 900 48px 'Comic Sans MS', Nunito, sans-serif;
                  color: var(--ink);
                  box-shadow: var(--shadow);
                "
              >
                <span>${opt.display}</span>
              </button>
            `
              )
              .join('')}
          </div>

          <!-- Feedback Box -->
          <div id="bdFeedbackBox" class="hidden" style="margin-bottom: 16px; border-radius: 14px; padding: 12px 16px;"></div>

          <!-- The "Bed Trick" Reminder -->
          <div style="background: #fbfcfb; border: 1px solid #e1e9e4; border-radius: 12px; padding: 8px 14px; font-size: 11px; color: #5a6e65; display: flex; align-items: center; gap: 8px;">
            <span>🛏️</span>
            <span><strong>The Bed Trick:</strong> Make two fists with thumbs up. Left hand is <b>b</b>, right hand is <b>d</b>. Together they spell <b>b - e - d</b>!</span>
          </div>

          <!-- Controls -->
          <div class="modal-controls" style="margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" id="btnNextBDRound" class="primary hidden" style="min-height: 44px; padding: 10px 24px; font-size: 14px;">
              ${this.currentRoundIndex < this.totalRounds - 1 ? 'Next Round →' : 'Complete Challenge 🎉'}
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindRoundEvents(round);
  }

  private bindRoundEvents(round: BDRound): void {
    const modalEl = this.ensureModalElement();

    modalEl.querySelector('#btnCloseBDModal')?.addEventListener('click', () => {
      this.close();
    });

    // Audio text to speech
    modalEl.querySelector('#btnHearBDLetter')?.addEventListener('click', () => {
      this.speakText(round.audioPrompt);
    });

    const optButtons = modalEl.querySelectorAll('.bd-option-btn');
    const fbBox = modalEl.querySelector('#bdFeedbackBox') as HTMLElement;
    const nextBtn = modalEl.querySelector('#btnNextBDRound') as HTMLElement;

    optButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const isCorrect = (btn as HTMLElement).dataset.isCorrect === 'true';
        const explanation = (btn as HTMLElement).dataset.explanation || '';

        optButtons.forEach(b => {
          (b as HTMLElement).style.pointerEvents = 'none';
        });

        if (isCorrect) {
          (btn as HTMLElement).style.borderColor = '#3b9b75';
          (btn as HTMLElement).style.background = '#eefbf4';
          (btn as HTMLElement).style.color = '#18794e';
          this.correctCount += 1;

          if (fbBox) {
            fbBox.className = '';
            fbBox.style.background = '#e6f8ee';
            fbBox.style.border = '1.5px solid #b7ebc9';
            fbBox.style.color = '#18794e';
            fbBox.innerHTML = `
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🎉</span>
                <div>
                  <strong>Spot on!</strong>
                  <p style="margin: 2px 0 0; font-size: 13px;">${explanation}</p>
                </div>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }
        } else {
          (btn as HTMLElement).style.borderColor = '#e03131';
          (btn as HTMLElement).style.background = '#fff5f5';
          (btn as HTMLElement).style.color = '#c92a2a';
          this.incorrectCount += 1;
          this.missedPatterns.push('b_vs_d');

          // Highlight the correct one
          optButtons.forEach(b => {
            if ((b as HTMLElement).dataset.isCorrect === 'true') {
              (b as HTMLElement).style.borderColor = '#3b9b75';
              (b as HTMLElement).style.background = '#eefbf4';
            }
          });

          if (fbBox) {
            fbBox.className = '';
            fbBox.style.background = '#fff9db';
            fbBox.style.border = '1.5px solid #ffe066';
            fbBox.style.color = '#7d6200';
            fbBox.innerHTML = `
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🌱</span>
                <div>
                  <strong>Let's check the bat and donut trick:</strong>
                  <p style="margin: 2px 0 0; font-size: 13px;">${explanation}</p>
                </div>
              </div>
            `;
            fbBox.classList.remove('hidden');
          }
        }

        if (nextBtn) {
          nextBtn.classList.remove('hidden');
          nextBtn.focus();
        }
      });
    });

    nextBtn?.addEventListener('click', () => {
      this.currentRoundIndex += 1;
      this.renderCurrentRound();
    });
  }

  private async renderSummary(): Promise<void> {
    if (!this.activeChild) return;

    const modalEl = this.ensureModalElement();
    const durationSeconds = Math.max(20, Math.round((Date.now() - this.startTime) / 1000));
    const accuracy = this.correctCount / this.totalRounds;
    const score = Math.round(accuracy * 100);

    // Record the learning attempt to persist and update adaptive path
    await this.learningPathService.recordAttempt({
      id: `att_bd_${Date.now()}`,
      childId: this.activeChild.id,
      activityId: 'act_mirror_bd',
      skillId: 'skill_confused_letters_bd',
      activityType: 'letter_distinction',
      score,
      accuracy,
      totalQuestions: this.totalRounds,
      correctAnswers: this.correctCount,
      incorrectAnswers: this.incorrectCount,
      attemptsRequired: this.totalRounds + this.incorrectCount,
      hintsRequested: this.hintsRequested,
      correctedAfterHint: 0,
      durationSeconds,
      missedItems: this.missedPatterns,
      completedAt: new Date().toISOString(),
    });

    // Award happy points
    const pointsAwarded = Math.round(this.correctCount * 5) + 10;
    const currentProgress = this.profileService.getChildProgress(this.activeChild.id);
    this.profileService.updateChildProgress(this.activeChild.id, {
      happyPoints: currentProgress.happyPoints + pointsAwarded,
      practiceMinutes: currentProgress.practiceMinutes + Math.round(durationSeconds / 60),
      practiceWins: currentProgress.practiceWins + 1,
    });

    modalEl.innerHTML = `
      <div class="modal activity-runner-modal" style="max-width: 520px; text-align: center; padding: 36px 24px;" role="dialog" aria-modal="true">
        <div style="font-size: 56px; margin-bottom: 10px;">🌟</div>
        <h2 style="font: 900 24px Nunito; margin: 0 0 8px; color: var(--ink);">
          Letter Mirror Detective Win!
        </h2>
        <p style="font-size: 14px; color: #516269; margin: 0 0 20px;">
          You practiced distinguishing <strong>b</strong> and <strong>d</strong>!
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;">
          <div style="background: #f4fbf8; border: 1.5px solid #c8ecd9; border-radius: 14px; padding: 12px 6px;">
            <strong style="font: 900 22px Nunito; color: var(--teal); display: block;">${this.correctCount}/${this.totalRounds}</strong>
            <small style="font-size: 11px; color: var(--muted);">Correct Answers</small>
          </div>
          <div style="background: #fff8e8; border: 1.5px solid #f6e69d; border-radius: 14px; padding: 12px 6px;">
            <strong style="font: 900 22px Nunito; color: #9c6c06; display: block;">${score}%</strong>
            <small style="font-size: 11px; color: var(--muted);">Accuracy</small>
          </div>
          <div style="background: #f3edff; border: 1.5px solid #ded5fa; border-radius: 14px; padding: 12px 6px;">
            <strong style="font: 900 22px Nunito; color: #6c5ce7; display: block;">+${pointsAwarded} ⭐</strong>
            <small style="font-size: 11px; color: var(--muted);">Happy Points</small>
          </div>
        </div>

        <button type="button" id="btnFinishBDModal" class="primary hero-cta" style="font-size: 14px; padding: 12px 30px; width: 100%;">
          Back to Dashboard →
        </button>
      </div>
    `;

    modalEl.querySelector('#btnFinishBDModal')?.addEventListener('click', () => {
      this.close();
      if (this.onCompletedCallback) {
        this.onCompletedCallback();
      }
    });
  }

  public close(): void {
    const modalEl = document.getElementById('bdRunnerModalContainer');
    if (modalEl) {
      modalEl.classList.add('hidden');
    }
    document.body.style.overflow = '';
  }

  private speakText(text: string): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  }

  private ensureModalElement(): HTMLElement {
    let el = document.getElementById('bdRunnerModalContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'bdRunnerModalContainer';
      el.className = 'modal-backdrop hidden';
      document.body.appendChild(el);
    }
    return el;
  }
}
