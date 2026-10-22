import type { ChildProfile } from '../types/auth';
import type { LearningPath } from '../types/adaptive';
import { LearningPathService } from '../services/learningPathService';
import { ActivityRunnerModal } from './activityRunnerModal';
import { i18n } from '../i18n';
import {
  getLocalizedSkillTitle,
  getLocalizedSkillObjective,
  getLocalizedSkillDescription,
} from '../services/recommendationEngine';

export class LearningJourneyView {
  private container: HTMLElement;
  private learningPathService: LearningPathService;
  private runnerModal: ActivityRunnerModal;
  private currentPath: LearningPath | null = null;
  private activeChild: ChildProfile | null = null;
  private onPathUpdated?: () => void;

  constructor(container: HTMLElement, onPathUpdated?: () => void) {
    this.container = container;
    this.learningPathService = LearningPathService.getInstance();
    this.runnerModal = ActivityRunnerModal.getInstance();
    this.onPathUpdated = onPathUpdated;
  }

  public async render(child: ChildProfile): Promise<void> {
    this.activeChild = child;
    this.currentPath = await this.learningPathService.getOrGeneratePath(child);

    const path = this.currentPath;
    const topRec = path.recommendations[0];
    const displayLang = i18n.getCurrentLanguage() || child.preferredLanguage || 'English';

    this.container.innerHTML = `
      <div class="learning-journey-container">
        <!-- Adaptive Banner: Next Recommended Adventure -->
        <div class="card continue-learning-hero" style="background: linear-gradient(135deg, #eef9f4 0%, #ffffff 65%, #fffaf0 100%); border: 2px solid #b7ebc9; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
            <div style="flex: 1; min-width: 260px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span class="tag" style="background: var(--teal); color: #fff; font-weight: 800;">${i18n.t('journey.continueTitle')}</span>
                ${
                  path.isProvisional
                    ? `<span class="tag" style="background: #fff8e4; color: #8f6c12; border: 1px solid #f6e69d;">${i18n.t('journey.welcomeCalibration')}</span>`
                    : `<span class="tag" style="background: #f3edff; color: #6c5ce7; border: 1px solid #ddd7fc;">${i18n.t('journey.aiAdaptivePath')}</span>`
                }
              </div>

              <h2 style="font: 900 22px Nunito; margin: 0 0 6px; color: var(--ink);">
                ${topRec ? getLocalizedSkillTitle(topRec.targetSkillId, displayLang, topRec.title) : i18n.t('journey.readyNextWin')}
              </h2>

              <p style="font-size: 13px; color: #516269; margin: 0 0 12px; line-height: 1.5;">
                ${topRec ? getLocalizedSkillDescription(topRec.targetSkillId, displayLang, topRec.description) : i18n.t('journey.explorePhonics')}
              </p>

              <!-- Why this recommendation pill -->
              <div class="rf-disclaimer-box" style="background: #fbfdfc; border: 1.5px solid #d5ede1; color: #2d6b52; padding: 10px 14px; margin-bottom: 16px;">
                <span>💡</span>
                <span style="font-size: 12px; line-height: 1.4;">
                  <strong>${i18n.t('journey.whyThisStep')}</strong> ${topRec ? topRec.reason : path.explanation}
                </span>
              </div>

              <!-- Action button -->
              <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                ${
                  topRec
                    ? `
                    <button type="button" id="btnStartRecommendedAct" class="hero-cta" style="font-size: 14px; padding: 12px 24px;">
                      ${i18n.t('journey.playBtn', { title: getLocalizedSkillTitle(topRec.targetSkillId, displayLang, topRec.title), minutes: topRec.estimatedMinutes })}
                    </button>
                  `
                    : ''
                }
                <button type="button" id="btnRegeneratePath" class="btn-action-pill" style="font-size: 12px;">
                  ${i18n.t('journey.refreshPath')}
                </button>
              </div>
            </div>

            <!-- Visual Badge / Mascot -->
            <div style="text-align: center; padding: 10px 18px; background: #fff; border-radius: 20px; border: 1.5px solid #e1f0e8; box-shadow: var(--shadow);">
              <div style="font-size: 48px; line-height: 1; margin-bottom: 6px;">🦊</div>
              <strong style="font: 900 13px Nunito; color: var(--teal); display: block;">${i18n.t('journey.stepJourney', { version: path.version })}</strong>
              <small style="font-size: 10px; color: var(--muted);">${i18n.t('journey.skillsMastered', { count: path.demonstratedSkills.length })}</small>
            </div>
          </div>
        </div>

        <!-- Visual Step-by-Step Learning Journey Roadmap -->
        <div class="card" style="margin-top: 18px;">
          <div class="card-title">
            <div>
              <h3>${i18n.t('journey.roadmapTitle')}</h3>
              <p>${i18n.t('journey.roadmapSubtitle')}</p>
            </div>
            <span class="tag">${i18n.t('journey.roadmapTag')}</span>
          </div>

          <div class="journey-steps-track" style="display: flex; gap: 12px; margin-top: 18px; overflow-x: auto; padding-bottom: 8px;">
            ${path.recommendations
              .map((rec, index) => {
                const isCurrent = index === 0;
                return `
                <div
                  class="journey-step-card ${isCurrent ? 'active-step' : ''}"
                  style="
                    flex: 1;
                    min-width: 200px;
                    border: 1.5px solid ${isCurrent ? 'var(--teal)' : 'var(--line)'};
                    background: ${isCurrent ? '#f4fbf8' : '#fff'};
                    border-radius: 16px;
                    padding: 14px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: ${isCurrent ? '0 8px 24px rgba(8, 127, 120, 0.12)' : 'none'};
                  "
                >
                  <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                      <span style="font-size: 11px; font-weight: 800; color: ${isCurrent ? 'var(--teal)' : '#7f8f94'};">
                        ${i18n.t('journey.stepNumber', { num: index + 1 })} ${isCurrent ? `· ${i18n.t('journey.currentStep')}` : ''}
                      </span>
                      <span style="width: 24px; height: 24px; border-radius: 8px; background: ${rec.actionBg}; display: grid; place-items: center; font-size: 12px;">
                        ${rec.actionIcon}
                      </span>
                    </div>
                    <strong style="font: 900 14px Nunito; color: var(--ink); display: block; margin-bottom: 4px;">
                      ${getLocalizedSkillTitle(rec.targetSkillId, displayLang, rec.title)}
                    </strong>
                    <p style="font-size: 11px; color: var(--muted); margin: 0; line-height: 1.4;">
                      ${getLocalizedSkillObjective(rec.targetSkillId, displayLang, rec.learningObjective)}
                    </p>
                  </div>

                  <div style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed var(--line); display: flex; justify-content: space-between; align-items: center;">
                    <span class="tag" style="font-size: 9px; padding: 2px 6px;">${i18n.t(('journey.' + rec.difficulty) as any) || rec.difficulty.toUpperCase()}</span>
                    <button
                      type="button"
                      class="btn-action-pill btn-start-step"
                      data-step-idx="${index}"
                      style="font-size: 10px; padding: 4px 8px; ${isCurrent ? 'background: var(--teal); color: #fff; border-color: var(--teal);' : ''}"
                    >
                      ${isCurrent ? i18n.t('journey.startNow') : i18n.t('journey.preview')}
                    </button>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>

        <!-- Grid: Daily Milestones & Review Activities -->
        <div class="content-grid" style="margin-top: 18px;">
          <!-- Short-Term Milestones Card -->
          <div class="card">
            <div class="card-title">
              <div>
                <h3>${i18n.t('journey.milestonesTitle')}</h3>
                <p>${i18n.t('journey.milestonesSubtitle')}</p>
              </div>
            </div>

            <div style="display: grid; gap: 12px; margin-top: 14px;">
              ${path.milestones
                .map(
                  m => `
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #fafbf9; border-radius: 14px; border: 1px solid var(--line);">
                  <div style="font-size: 28px; width: 44px; height: 44px; border-radius: 12px; background: #fff; display: grid; place-items: center; border: 1px solid #e7ede8;">
                    ${m.badgeIcon}
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <strong style="font: 900 13px Nunito; color: var(--ink);">${m.title}</strong>
                      <span style="font-size: 11px; font-weight: 800; color: var(--teal);">${m.progressPercent}%</span>
                    </div>
                    <p style="font-size: 11px; color: var(--muted); margin: 2px 0 6px;">${m.description}</p>
                    <div class="bar" style="height: 6px;">
                      <i style="width: ${m.progressPercent}%; background: ${m.completed ? '#48bb78' : 'var(--teal)'};"></i>
                    </div>
                  </div>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          <!-- Spaced Review / Win Box -->
          <div class="card">
            <div class="card-title">
              <div>
                <h3>${i18n.t('journey.revisitWinsTitle')}</h3>
                <p>${i18n.t('journey.revisitWinsSubtitle')}</p>
              </div>
            </div>

            ${
              path.reviewQueue.length > 0
                ? `
                <div style="display: grid; gap: 10px; margin-top: 14px;">
                  ${path.reviewQueue
                    .map(
                      rev => `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #fdfcfe; border: 1px solid #ece8f9; border-radius: 12px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span>${rev.actionIcon}</span>
                        <div>
                          <strong style="font-size: 12px; display: block;">${rev.title}</strong>
                          <small style="color: #7b888c; font-size: 10px;">${i18n.t('journey.spacedReview')}</small>
                        </div>
                      </div>
                      <button type="button" class="btn-action-pill btn-start-review" data-act-id="${rev.activityId}" style="font-size: 10px; padding: 3px 8px;">
                        ${i18n.t('journey.replay')}
                      </button>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                : `
                <div style="text-align: center; padding: 24px 12px; background: #fafbf9; border-radius: 14px; border: 1px dashed var(--line); margin-top: 14px;">
                  <span style="font-size: 28px;">🌟</span>
                  <strong style="font: 800 13px Nunito; display: block; margin-top: 4px;">${i18n.t('journey.memoryBankFresh')}</strong>
                  <p style="font-size: 11px; color: var(--muted); margin: 4px 0 0;">
                    ${i18n.t('journey.memoryBankDesc', { name: child.name })}
                  </p>
                </div>
              `
            }
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.currentPath || !this.activeChild) return;
    const path = this.currentPath;
    const child = this.activeChild;

    // Start recommended activity
    this.container.querySelector('#btnStartRecommendedAct')?.addEventListener('click', () => {
      const topRec = path.recommendations[0];
      if (topRec) {
        this.runnerModal.startRecommendation(child, topRec, () => {
          this.render(child);
          if (this.onPathUpdated) this.onPathUpdated();
        });
      }
    });

    // Start step button
    this.container.querySelectorAll('.btn-start-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number((btn as HTMLElement).dataset.stepIdx || 0);
        const rec = path.recommendations[idx];
        if (rec) {
          this.runnerModal.startRecommendation(child, rec, () => {
            this.render(child);
            if (this.onPathUpdated) this.onPathUpdated();
          });
        }
      });
    });

    // Replay review button
    this.container.querySelectorAll('.btn-start-review').forEach(btn => {
      btn.addEventListener('click', () => {
        const topRec = path.reviewQueue[0] || path.recommendations[0];
        if (topRec) {
          this.runnerModal.startRecommendation(child, topRec, () => {
            this.render(child);
            if (this.onPathUpdated) this.onPathUpdated();
          });
        }
      });
    });

    // Regenerate path button
    this.container.querySelector('#btnRegeneratePath')?.addEventListener('click', async () => {
      const btn = this.container.querySelector('#btnRegeneratePath') as HTMLButtonElement;
      if (btn) btn.disabled = true;
      await this.learningPathService.generatePath(child);
      await this.render(child);
      if (this.onPathUpdated) this.onPathUpdated();
    });
  }
}
