import { AuthService } from '../services/authService';
import { ProfileService } from '../services/profileService';
import { ActivityTrackerService } from '../services/activityTrackerService';
import type { ChildProfile } from '../types/auth';
import type { ChildModalView } from './childModalView';
import { LearningPathService } from '../services/learningPathService';
import { getSkillDefinition } from '../services/skillModel';

export class ParentDashboardView {
  private authService: AuthService;
  private profileService: ProfileService;
  private activityService: ActivityTrackerService;
  private childModalView: ChildModalView;
  private learningPathService: LearningPathService;
  private onReturnToProfiles: () => void;
  private onLogout: () => void;
  private onInspectChild: (child: ChildProfile) => void;

  private selectedReportChildId: string | null = null;
  private selectedPeriod: 'today' | '7days' | '30days' = 'today';
  private lockoutTimer: number | null = null;

  constructor(
    childModalView: ChildModalView,
    onReturnToProfiles: () => void,
    onLogout: () => void,
    onInspectChild: (child: ChildProfile) => void
  ) {
    this.authService = AuthService.getInstance();
    this.profileService = ProfileService.getInstance();
    this.activityService = ActivityTrackerService.getInstance();
    this.learningPathService = LearningPathService.getInstance();
    this.childModalView = childModalView;
    this.onReturnToProfiles = onReturnToProfiles;
    this.onLogout = onLogout;
    this.onInspectChild = onInspectChild;
  }

  // -------------------------------------------------------------
  // Parental Access Gate (Create PIN or Verify PIN)
  // -------------------------------------------------------------
  public requestParentAccess(onSuccess: () => void): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      alert('Please log in as a parent first.');
      return;
    }

    if (!this.authService.hasParentPin()) {
      // First-time PIN setup required
      this.openCreatePinModal(onSuccess);
    } else {
      // Existing PIN verification
      this.openVerifyPinModal(onSuccess);
    }
  }

  // -------------------------------------------------------------
  // 1. First-Time PIN Setup Modal
  // -------------------------------------------------------------
  public openCreatePinModal(onSuccess: () => void): void {
    const modalEl = this.ensureModalElement();
    modalEl.innerHTML = `
      <div class="modal" style="max-width: 440px;" role="dialog" aria-modal="true" aria-labelledby="createPinTitle">
        <div class="modal-head">
          <div>
            <h2 id="createPinTitle">Create Parent PIN 🔒</h2>
            <p>Set a 4-digit PIN to safeguard parent settings and activity records.</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseCreatePin" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          <div class="parent-pin-box">
            <div style="width:48px; height:48px; border-radius:50%; background:#e8f5ef; color:var(--teal); font-size:24px; display:grid; place-items:center; margin: 0 auto 10px;">
              🛡️
            </div>

            <div class="form-group" style="text-align:left;">
              <label class="form-label" for="newPinInput1">Enter 4-Digit Parent PIN</label>
              <input
                type="password"
                inputmode="numeric"
                maxlength="4"
                id="newPinInput1"
                class="parent-pin-input"
                placeholder="••••"
                style="letter-spacing: 10px; width: 100%;"
                autofocus
              />
            </div>

            <div class="form-group" style="text-align:left; margin-top: 10px;">
              <label class="form-label" for="newPinInput2">Confirm 4-Digit Parent PIN</label>
              <input
                type="password"
                inputmode="numeric"
                maxlength="4"
                id="newPinInput2"
                class="parent-pin-input"
                placeholder="••••"
                style="letter-spacing: 10px; width: 100%;"
              />
            </div>

            <div id="createPinErrorMsg" class="field-error-msg hidden" style="margin-top: 8px;"></div>
          </div>

          <div class="modal-callout" style="margin-top: 10px;">
            <strong>Parent Security:</strong> This PIN will be required to access adult settings, edit child profiles, and view usage times.
          </div>

          <div class="modal-controls" style="justify-content: center; margin-top: 18px;">
            <button type="button" id="btnSaveCreatedPin" style="min-width: 150px;">
              Save Parent PIN
            </button>
            <button type="button" id="btnCancelCreatePin" class="soft">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    const pin1 = document.getElementById('newPinInput1') as HTMLInputElement;
    const pin2 = document.getElementById('newPinInput2') as HTMLInputElement;
    const errorEl = document.getElementById('createPinErrorMsg') as HTMLElement;

    const doSave = async () => {
      errorEl.classList.add('hidden');
      const val1 = pin1.value.trim();
      const val2 = pin2.value.trim();

      if (!/^\d{4}$/.test(val1)) {
        errorEl.textContent = 'PIN must be exactly 4 numeric digits (0-9).';
        errorEl.classList.remove('hidden');
        pin1.focus();
        return;
      }

      if (val1 !== val2) {
        errorEl.textContent = 'PIN confirmation does not match. Please verify.';
        errorEl.classList.remove('hidden');
        pin2.value = '';
        pin2.focus();
        return;
      }

      const res = await this.authService.setupParentPin(val1);
      if (res.success) {
        this.closeModal();
        onSuccess();
      } else {
        errorEl.textContent = res.error || 'Failed to save PIN.';
        errorEl.classList.remove('hidden');
      }
    };

    pin1?.addEventListener('keydown', e => { if (e.key === 'Enter') pin2?.focus(); });
    pin2?.addEventListener('keydown', e => { if (e.key === 'Enter') doSave(); });

    document.getElementById('btnSaveCreatedPin')?.addEventListener('click', doSave);
    document.getElementById('btnCloseCreatePin')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelCreatePin')?.addEventListener('click', () => this.closeModal());

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => pin1?.focus(), 60);
  }

  // -------------------------------------------------------------
  // 2. Existing PIN Verification Modal (Matches Visual Reference)
  // -------------------------------------------------------------
  public openVerifyPinModal(onSuccess: () => void): void {
    const user = this.authService.getCurrentUser();
    const isDemo = user?.email === 'parent@dysleximate.demo';
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal" style="max-width: 440px;" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
        <div class="modal-head">
          <div>
            <h2 id="gateTitle">Grown-Ups Only 🔒</h2>
            <p>Please enter your 4-digit Parent PIN to continue.</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseGate" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          <div class="parent-pin-box">
            <div style="width:52px; height:52px; border-radius:50%; background:#e8f5ef; color:var(--teal); font-size:28px; display:grid; place-items:center; margin: 0 auto 10px;">
              🛡️
            </div>
            <label class="form-label" for="parentPinInput" style="font-size:12px; margin-bottom:8px;">
              Enter 4-Digit Parent PIN
            </label>
            <input
              type="password"
              inputmode="numeric"
              maxlength="4"
              id="parentPinInput"
              class="parent-pin-input"
              placeholder="••••"
              autocomplete="off"
              autofocus
            />
            <div id="pinErrorMsg" class="field-error-msg hidden" style="margin-top: 8px;"></div>
            <div id="pinLockoutBanner" class="form-alert alert-error hidden" style="margin-top: 10px; font-size: 11px;"></div>
          </div>

          <div class="modal-callout" style="margin-top: 10px;">
            ${
              isDemo
                ? `<strong>Demo Parent Note:</strong> Default PIN is <strong>1234</strong>. In production, this gate prevents young readers from altering settings or viewing private family data.`
                : `<strong>Parent Security:</strong> This gate ensures little readers stay in their learning space and cannot change account or privacy settings.`
            }
          </div>

          <div class="modal-controls" style="justify-content: center; margin-top: 18px;">
            <button type="button" id="btnVerifyPin" style="min-width: 140px;">
              Verify & Enter
            </button>
            <button type="button" id="btnCancelGate" class="soft">
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    const pinInput = document.getElementById('parentPinInput') as HTMLInputElement;
    const pinError = document.getElementById('pinErrorMsg') as HTMLElement;
    const lockoutBanner = document.getElementById('pinLockoutBanner') as HTMLElement;
    const verifyBtn = document.getElementById('btnVerifyPin') as HTMLButtonElement;

    // Check if lockout is active on open
    const checkLockout = () => {
      const remainingSec = this.authService.getPinLockoutRemainingSeconds();
      if (remainingSec > 0) {
        verifyBtn.disabled = true;
        pinInput.disabled = true;
        lockoutBanner.textContent = `Security cooldown active. Please wait ${remainingSec}s before retrying.`;
        lockoutBanner.classList.remove('hidden');
        pinError.classList.add('hidden');

        if (this.lockoutTimer) clearInterval(this.lockoutTimer);
        this.lockoutTimer = window.setInterval(() => {
          const sec = this.authService.getPinLockoutRemainingSeconds();
          if (sec <= 0) {
            clearInterval(this.lockoutTimer!);
            this.lockoutTimer = null;
            verifyBtn.disabled = false;
            pinInput.disabled = false;
            lockoutBanner.classList.add('hidden');
            pinInput.focus();
          } else {
            lockoutBanner.textContent = `Security cooldown active. Please wait ${sec}s before retrying.`;
          }
        }, 1000);
      } else {
        verifyBtn.disabled = false;
        pinInput.disabled = false;
        lockoutBanner.classList.add('hidden');
      }
    };

    checkLockout();

    const doVerify = async () => {
      const pin = pinInput.value.trim();
      if (pin.length !== 4) {
        pinError.textContent = 'Please enter a complete 4-digit PIN.';
        pinError.classList.remove('hidden');
        return;
      }

      verifyBtn.disabled = true;
      const res = await this.authService.verifyParentPin(pin);
      verifyBtn.disabled = false;

      if (res.success) {
        if (this.lockoutTimer) clearInterval(this.lockoutTimer);
        this.closeModal();
        onSuccess();
      } else {
        // Clear input after failed attempt
        pinInput.value = '';
        pinInput.focus();

        if (res.lockoutSeconds && res.lockoutSeconds > 0) {
          checkLockout();
        } else {
          pinError.textContent = res.error || 'Incorrect PIN. Please try again.';
          pinError.classList.remove('hidden');
        }
      }
    };

    pinInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doVerify();
      if (e.key === 'Escape') this.closeModal();
    });

    document.getElementById('btnVerifyPin')?.addEventListener('click', doVerify);
    document.getElementById('btnCloseGate')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelGate')?.addEventListener('click', () => this.closeModal());

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(() => pinInput?.focus(), 60);
  }

  // -------------------------------------------------------------
  // 3. Open Full Parent Dashboard
  // -------------------------------------------------------------
  public async openDashboard(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    const children = await this.profileService.getChildren(user.id);
    if (!this.selectedReportChildId && children.length > 0) {
      this.selectedReportChildId = children[0].id;
    }

    const modalEl = this.ensureModalElement();

    let totalPracticeMinutes = 0;
    let totalWordsPracticed = 0;

    children.forEach(c => {
      const prog = this.profileService.getChildProgress(c.id);
      totalPracticeMinutes += prog.practiceMinutes;
      totalWordsPracticed += prog.wordsLearned;
    });

    const activeChildObj = children.find(c => c.id === this.selectedReportChildId) || children[0];
    const summary = activeChildObj
      ? this.activityService.getSummary(activeChildObj.id, activeChildObj.name, this.selectedPeriod)
      : null;

    const childPath = activeChildObj ? await this.learningPathService.getOrGeneratePath(activeChildObj) : null;

    modalEl.innerHTML = `
      <div class="modal" style="max-width: 720px;" role="dialog" aria-modal="true" aria-labelledby="parentDashTitle">
        <div class="modal-head">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 id="parentDashTitle">Parent Dashboard</h2>
              <span class="tag" style="background:#eaf2fd; color:#2c62a8">Parent Account</span>
              ${
                this.authService.isLiveDatabaseConnected()
                  ? '<span class="tag" style="background:#e6f8ee; color:#18794e; border:1px solid #b7ebc9; font-weight:700;">🟢 Supabase PostgreSQL & RLS</span>'
                  : '<span class="tag" style="background:#fffbe6; color:#7d6a26; border:1px solid #f6e69d; font-weight:700;">⚡ Demo Mode</span>'
              }
            </div>
            <p>Family management and reading telemetry for ${user.fullName} (${user.email})</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseParentDash" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          ${
            this.authService.isLiveDatabaseConnected()
              ? `<div class="modal-callout" style="background:#e6f8ee; border:1px solid #b7ebc9; color:#18794e; margin-bottom: 16px;">
                  🛡️ <strong>Production Row Level Security Active:</strong> Child usage data, PIN credentials, and learning progress are secured via PostgreSQL Row Level Security (RLS) linked to your parent account.
                </div>`
              : `<div class="modal-callout" style="background:#fffbe6; border:1px solid #f6e69d; color:#7d6a26; margin-bottom: 16px;">
                  ⚠️ <strong>Parent Privacy & Security:</strong> In production, child usage data and parent PIN verifiers are safeguarded via Supabase PostgreSQL + RLS. Currently operating in local/demo mode.
                </div>`
          }

          <!-- Aggregate Family Snapshot -->
          <div class="parent-stats">
            <div class="parent-stat">
              <small>Linked Child Profiles</small>
              <strong>${children.length}</strong>
            </div>
            <div class="parent-stat">
              <small>Combined Practice Time</small>
              <strong>${totalPracticeMinutes} min</strong>
            </div>
            <div class="parent-stat">
              <small>Total Words Practiced</small>
              <strong>${totalWordsPracticed}</strong>
            </div>
          </div>

          <!-- Section: Activity Time & Usage Telemetry -->
          <div style="background:#fff; border:1.5px solid var(--line); border-radius:18px; padding:20px; margin: 20px 0;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
              <div>
                <h3 style="font:900 17px Nunito; margin:0; display:flex; align-items:center; gap:6px;">
                  <span>⏱️</span> Activity Time & Usage
                </h3>
                <p style="font-size:11px; color:var(--muted); margin:3px 0 0;">
                  Accurate active time tracking (idle periods & background tabs excluded)
                </p>
              </div>

              <!-- Time Period Filter -->
              <div style="display:flex; gap:6px; background:#f4f6f4; padding:3px; border-radius:10px;">
                <button type="button" class="btn-action-pill ${this.selectedPeriod === 'today' ? 'pill-teal' : ''}" data-period="today" style="font-size:11px; padding:5px 10px;">
                  Today
                </button>
                <button type="button" class="btn-action-pill ${this.selectedPeriod === '7days' ? 'pill-teal' : ''}" data-period="7days" style="font-size:11px; padding:5px 10px;">
                  Last 7 Days
                </button>
                <button type="button" class="btn-action-pill ${this.selectedPeriod === '30days' ? 'pill-teal' : ''}" data-period="30days" style="font-size:11px; padding:5px 10px;">
                  Last 30 Days
                </button>
              </div>
            </div>

            <!-- Child Selector (when multiple children exist) -->
            ${
              children.length > 1
                ? `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
                  <span style="font-size:11px; font-weight:700; color:#5e7078;">Select Child:</span>
                  ${children
                    .map(
                      c => `
                    <button
                      type="button"
                      class="btn-action-pill ${c.id === this.selectedReportChildId ? 'active' : ''}"
                      data-select-report-child="${c.id}"
                      style="font-size:11px; padding:5px 11px;"
                    >
                      <span>${c.avatar}</span> ${c.name}
                    </button>
                  `
                    )
                    .join('')}
                </div>
              `
                : ''
            }

            ${
              !summary || summary.totalSessions === 0
                ? `
                <div style="text-align:center; padding: 26px 16px; background:#fafbf8; border-radius:14px; border:1px dashed var(--line);">
                  <span style="font-size:36px; display:inline-block; margin-bottom:6px;">🌱</span>
                  <strong style="font:800 14px Nunito; display:block; color:var(--ink);">No learning sessions recorded for this period</strong>
                  <p style="margin:4px 0 0; color:var(--muted); font-size:11px; line-height:1.5;">
                    As ${activeChildObj?.name || 'your child'} plays practice games, reads stories, and explores sound games, active time will appear here automatically.
                  </p>
                </div>
              `
                : `
                <!-- Telemetry Metrics Grid -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:18px;">
                  <div style="background:#f9faf7; border:1px solid var(--line); border-radius:12px; padding:12px;">
                    <small style="color:var(--muted); font-size:10px; display:block;">Active Learning</small>
                    <strong style="font:900 17px Nunito; color:var(--teal); display:block; margin-top:2px;">
                      ${this.formatSeconds(summary.totalActiveSeconds)}
                    </strong>
                  </div>
                  <div style="background:#f9faf7; border:1px solid var(--line); border-radius:12px; padding:12px;">
                    <small style="color:var(--muted); font-size:10px; display:block;">Sessions</small>
                    <strong style="font:900 17px Nunito; color:var(--ink); display:block; margin-top:2px;">
                      ${summary.totalSessions} sessions
                    </strong>
                  </div>
                  <div style="background:#f9faf7; border:1px solid var(--line); border-radius:12px; padding:12px;">
                    <small style="color:var(--muted); font-size:10px; display:block;">Avg Session</small>
                    <strong style="font:900 17px Nunito; color:var(--ink); display:block; margin-top:2px;">
                      ${this.formatSeconds(summary.averageSessionSeconds)}
                    </strong>
                  </div>
                  <div style="background:#f9faf7; border:1px solid var(--line); border-radius:12px; padding:12px;">
                    <small style="color:var(--muted); font-size:10px; display:block;">Top Activity</small>
                    <strong style="font:800 12px Nunito; color:#2c62a8; display:block; margin-top:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      ${summary.mostUsedActivity}
                    </strong>
                  </div>
                </div>

                <!-- Activity Category Breakdown -->
                <div style="margin-top:14px;">
                  <strong style="font:800 12px Nunito; color:#51626a; display:block; margin-bottom:8px;">
                    Activity Category Breakdown
                  </strong>
                  <div style="display:grid; gap:8px;">
                    ${this.renderCategoryRow('🎮 Picture Word Match & Games', summary.categoryBreakdown.practice_game, summary.totalActiveSeconds)}
                    ${this.renderCategoryRow('🎙️ Voice Spelling & Pronunciation', summary.categoryBreakdown.voice_spelling, summary.totalActiveSeconds)}
                    ${this.renderCategoryRow('📖 Story Shelf & Reading', summary.categoryBreakdown.story_reading, summary.totalActiveSeconds)}
                    ${this.renderCategoryRow('🔤 Letter Mirror & Sound Practice', summary.categoryBreakdown.letter_mirror, summary.totalActiveSeconds)}
                    ${this.renderCategoryRow('🌿 General Learning & Exploration', summary.categoryBreakdown.general_learning, summary.totalActiveSeconds)}
                  </div>
                </div>

                <!-- Daily Breakdown -->
                <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--line);">
                  <strong style="font:800 12px Nunito; color:#51626a; display:block; margin-bottom:8px;">
                    ${this.selectedPeriod === 'today' ? 'Today Timeline' : 'Daily Practice Time'}
                  </strong>
                  <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:6px; height:80px; padding:6px 0;">
                    ${summary.dailyBreakdown
                      .map(d => {
                        const maxDaily = Math.max(...summary.dailyBreakdown.map(x => x.seconds), 60);
                        const pct = Math.max(8, Math.min(100, Math.round((d.seconds / maxDaily) * 100)));
                        const mins = Math.round(d.seconds / 60);
                        return `
                        <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end;">
                          <div style="width:100%; max-width:24px; height:${pct}%; background:${d.seconds > 0 ? 'var(--teal)' : '#e2e7e4'}; border-radius:6px; transition:height 0.2s;" title="${d.dayLabel} (${d.date}): ${mins} min"></div>
                          <span style="font-size:9px; color:var(--muted);">${d.dayLabel}</span>
                        </div>
                      `;
                      })
                      .join('')}
                  </div>
                </div>
              `
            }
          </div>

          <!-- Section: Adaptive AI Learning Path for Selected Child -->
          ${activeChildObj && childPath ? `
            <div style="background:#fff; border:1.5px solid var(--line); border-radius:18px; padding:20px; margin: 20px 0;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                <div>
                  <h3 style="font:900 17px Nunito; margin:0; display:flex; align-items:center; gap:6px;">
                    <span>⚡</span> Adaptive AI Learning Path for ${activeChildObj.name}
                  </h3>
                  <p style="font-size:11px; color:var(--muted); margin:3px 0 0;">
                    Dynamic skill mastery, error pattern remediation, and individualized learning path
                  </p>
                </div>
                <button type="button" id="btnParentRegeneratePath" class="btn-action-pill" style="font-size:11px; padding:5px 10px;">
                  ↻ Regenerate Path
                </button>
              </div>

              <!-- Plain language explanation of path -->
              <div class="rf-disclaimer-box" style="background:#f0f8f5; border:1px solid #bce6d2; color:#1f6348; margin-bottom:14px; font-size:12px; line-height:1.5;">
                <span>💡</span>
                <div>
                  <strong>Why this learning path?</strong>
                  <p style="margin:2px 0 0; font-size:12px;">${childPath.explanation}</p>
                </div>
              </div>

              <!-- Skills Breakdown Cards -->
              <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:14px;">
                <div style="background:#f4fbf8; border:1px solid #c9ebd8; border-radius:12px; padding:12px;">
                  <span style="font-size:11px; font-weight:800; color:#1b7d52; display:block; margin-bottom:4px;">
                    ✓ Demonstrated Skills (${childPath.demonstratedSkills.length})
                  </span>
                  <div style="display:flex; flex-wrap:wrap; gap:4px;">
                    ${childPath.demonstratedSkills.length > 0
                      ? childPath.demonstratedSkills.map(sid => {
                          const def = getSkillDefinition(sid);
                          return `<span class="tag" style="background:#eaf8ef; color:#18794e; font-size:10px;">${def?.name || sid}</span>`;
                        }).join('')
                      : '<span style="font-size:11px; color:#78878d;">Initial skills being developed</span>'}
                  </div>
                </div>

                <div style="background:#fefbf5; border:1px solid #fbe7b5; border-radius:12px; padding:12px;">
                  <span style="font-size:11px; font-weight:800; color:#9c5000; display:block; margin-bottom:4px;">
                    🎯 Priority Support Skills (${childPath.prioritySkills.length})
                  </span>
                  <div style="display:flex; flex-wrap:wrap; gap:4px;">
                    ${childPath.prioritySkills.length > 0
                      ? childPath.prioritySkills.map(sid => {
                          const def = getSkillDefinition(sid);
                          return `<span class="tag" style="background:#fff3e0; color:#b25e00; font-size:10px;">${def?.name || sid}</span>`;
                        }).join('')
                      : '<span style="font-size:11px; color:#78878d;">No struggle patterns detected</span>'}
                  </div>
                </div>
              </div>

              <!-- Active Goals & Next Recommendations -->
              <div style="background:#fafbf8; border:1px solid var(--line); border-radius:12px; padding:14px;">
                <span style="font-size:11px; font-weight:800; color:#50656a; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:8px;">
                  Current Goals & Next Recommended Activity
                </span>
                <ul style="margin:0 0 10px; padding-left:18px; font-size:12px; color:#49585e; line-height:1.6;">
                  ${childPath.currentGoals.map(g => `<li>${g}</li>`).join('')}
                </ul>
                ${childPath.recommendations[0] ? `
                  <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px 12px; flex-wrap:wrap; gap:8px;">
                    <div>
                      <strong style="font-size:13px; color:var(--ink);">${childPath.recommendations[0].title}</strong>
                      <p style="margin:2px 0 0; font-size:11px; color:var(--muted);">${childPath.recommendations[0].learningObjective}</p>
                    </div>
                    <span class="tag" style="background:#eaf2fd; color:#2c62a8;">${childPath.recommendations[0].recommendationType.toUpperCase()}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Medical / Clinical Disclaimer -->
              <div style="margin-top:12px; font-size:10px; color:#859397; line-height:1.4;">
                ℹ️ <em>Educational Disclaimer: DyslexiMate's adaptive model provides individualized practice pacing based on observed activity performance. It is an educational tool and does not replace diagnostic or clinical reading assessment.</em>
              </div>
            </div>
          ` : ''}

          <!-- Children Management List -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin: 20px 0 10px;">
            <h3 style="font:900 16px Nunito; margin:0">Linked Child Profiles</h3>
            <button type="button" id="btnDashAddChild" class="btn-action-pill pill-teal" style="font-size:11px; padding:6px 12px;">
              + Add Another Child
            </button>
          </div>

          ${
            children.length === 0
              ? `
              <div style="text-align:center; padding: 24px; background:#f9faf7; border-radius:14px; border:1px dashed var(--line);">
                <span style="font-size:32px">🌱</span>
                <p style="margin:6px 0 0; color:var(--muted); font-size:12px">No children added yet. Add your first child profile to begin.</p>
              </div>
            `
              : `
              <table class="parent-children-table">
                <tbody>
                  ${children
                    .map(c => {
                      const prog = this.profileService.getChildProgress(c.id);
                      return `
                      <tr>
                        <td>
                          <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:24px;">${c.avatar}</span>
                            <div>
                              <strong style="display:block; font:800 13px Nunito;">${c.name}</strong>
                              <small style="color:var(--muted);">${c.grade} · <b>${c.preferredLanguage}</b></small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style="font-size:11px; color:#49796b; background:#e8f5ef; padding:4px 8px; border-radius:8px; font-weight:800;">
                            ${prog.happyPoints} pts · ${prog.practiceMinutes} min
                          </span>
                        </td>
                        <td>
                          <button type="button" class="btn-manage-edit" data-edit-child="${c.id}" style="margin-right:4px;">
                            Edit
                          </button>
                          <button type="button" class="btn-manage-edit" data-inspect-child="${c.id}" style="background:#eaf2fd; color:#2c62a8; border-color:#c8dcf7; margin-right:4px;">
                            Inspect
                          </button>
                          <button type="button" class="btn-manage-delete" data-csv-child="${c.id}" style="background:#f4f6f8; color:#4a5960; border-color:#d4dcde;" title="Download progress CSV">
                            📥 CSV
                          </button>
                        </td>
                      </tr>
                    `;
                    })
                    .join('')}
                </tbody>
              </table>
            `
          }

          <!-- Parent Controls & Security -->
          <div style="background:#f9faf7; border:1px solid var(--line); border-radius:14px; padding:14px; margin-top:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
              <div>
                <strong style="font:800 13px Nunito; display:block; color:var(--ink);">Parent Security PIN</strong>
                <span style="font-size:11px; color:var(--muted);">Current PIN status: <b>•••• (Active & Hashed)</b></span>
              </div>
              <button type="button" id="btnOpenChangePinDialog" class="btn-action-pill" style="font-size:11px; padding:6px 12px;">
                🔑 Change Parent PIN
              </button>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="modal-controls" style="margin-top: 24px;">
            <button type="button" id="btnReturnToProfiles" class="soft">
              ← Return to Profile Selection
            </button>
            <button
              type="button"
              id="btnLogoutFromDash"
              style="margin-left: auto; background: #fff2ed; color: #c04830; border: 1px solid #f9d5cd;"
            >
              Log Out of Parent Account
            </button>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    document.getElementById('btnCloseParentDash')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnReturnToProfiles')?.addEventListener('click', () => {
      this.closeModal();
      this.onReturnToProfiles();
    });
    document.getElementById('btnLogoutFromDash')?.addEventListener('click', () => {
      this.closeModal();
      this.onLogout();
    });

    // Time period filter buttons
    modalEl.querySelectorAll('[data-period]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedPeriod = (btn as HTMLElement).dataset.period as 'today' | '7days' | '30days';
        this.openDashboard();
      });
    });

    // Child report selector buttons
    modalEl.querySelectorAll('[data-select-report-child]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedReportChildId = (btn as HTMLElement).dataset.selectReportChild || null;
        this.openDashboard();
      });
    });

    // Regenerate child path button
    document.getElementById('btnParentRegeneratePath')?.addEventListener('click', async () => {
      if (activeChildObj) {
        await this.learningPathService.generatePath(activeChildObj);
        this.openDashboard();
      }
    });

    // Add Child button
    document.getElementById('btnDashAddChild')?.addEventListener('click', () => {
      this.closeModal();
      this.childModalView.openAddModal(user.id);
    });

    // Change PIN Dialog trigger
    document.getElementById('btnOpenChangePinDialog')?.addEventListener('click', () => {
      this.openChangePinModal();
    });

    // Table edit / inspect / CSV handlers
    modalEl.querySelectorAll('[data-edit-child]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.editChild;
        const child = children.find(c => c.id === id);
        if (child) {
          this.closeModal();
          this.childModalView.openEditModal(child);
        }
      });
    });

    modalEl.querySelectorAll('[data-inspect-child]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.inspectChild;
        const child = children.find(c => c.id === id);
        if (child) {
          this.closeModal();
          this.onInspectChild(child);
        }
      });
    });

    modalEl.querySelectorAll('[data-csv-child]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.csvChild;
        const child = children.find(c => c.id === id);
        if (child) {
          this.downloadChildCsv(child);
        }
      });
    });

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // -------------------------------------------------------------
  // 4. Change Parent PIN Modal
  // -------------------------------------------------------------
  public openChangePinModal(): void {
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal" style="max-width: 440px;" role="dialog" aria-modal="true" aria-labelledby="changePinTitle">
        <div class="modal-head">
          <div>
            <h2 id="changePinTitle">Change Parent PIN 🔑</h2>
            <p>Verify your current PIN before creating a new one.</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseChangePin" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          <form id="changePinFormModal" novalidate>
            <div class="form-group">
              <label class="form-label" for="currentPinInput">Current 4-Digit PIN *</label>
              <input
                type="password"
                inputmode="numeric"
                maxlength="4"
                id="currentPinInput"
                class="form-input"
                placeholder="••••"
                style="letter-spacing:6px; font-size:16px;"
                required
                autofocus
              />
            </div>

            <div class="form-group" style="margin-top:10px;">
              <label class="form-label" for="newPinInput">New 4-Digit PIN *</label>
              <input
                type="password"
                inputmode="numeric"
                maxlength="4"
                id="newPinInput"
                class="form-input"
                placeholder="••••"
                style="letter-spacing:6px; font-size:16px;"
                required
              />
            </div>

            <div class="form-group" style="margin-top:10px;">
              <label class="form-label" for="confirmNewPinInput">Confirm New 4-Digit PIN *</label>
              <input
                type="password"
                inputmode="numeric"
                maxlength="4"
                id="confirmNewPinInput"
                class="form-input"
                placeholder="••••"
                style="letter-spacing:6px; font-size:16px;"
                required
              />
            </div>

            <div id="changePinModalAlert" class="field-error-msg hidden" style="margin-top:8px;"></div>
            <div id="changePinSuccessAlert" class="form-alert alert-success hidden" style="margin-top:8px;"></div>

            <div class="modal-controls" style="margin-top:18px;">
              <button type="submit" id="btnSubmitChangePin" style="min-width:140px;">
                Update PIN ✓
              </button>
              <button type="button" id="btnCancelChangePin" class="soft">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('btnCloseChangePin')?.addEventListener('click', () => this.openDashboard());
    document.getElementById('btnCancelChangePin')?.addEventListener('click', () => this.openDashboard());

    const form = document.getElementById('changePinFormModal') as HTMLFormElement;
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const currentPin = (document.getElementById('currentPinInput') as HTMLInputElement).value.trim();
      const newPin = (document.getElementById('newPinInput') as HTMLInputElement).value.trim();
      const confirmPin = (document.getElementById('confirmNewPinInput') as HTMLInputElement).value.trim();
      const errBox = document.getElementById('changePinModalAlert') as HTMLElement;
      const successBox = document.getElementById('changePinSuccessAlert') as HTMLElement;

      errBox.classList.add('hidden');
      successBox.classList.add('hidden');

      if (!/^\d{4}$/.test(currentPin)) {
        errBox.textContent = 'Please enter your current 4-digit PIN.';
        errBox.classList.remove('hidden');
        return;
      }
      if (!/^\d{4}$/.test(newPin)) {
        errBox.textContent = 'New PIN must be exactly 4 numeric digits (0-9).';
        errBox.classList.remove('hidden');
        return;
      }
      if (newPin !== confirmPin) {
        errBox.textContent = 'New PIN and confirmation do not match.';
        errBox.classList.remove('hidden');
        return;
      }
      if (currentPin === newPin) {
        errBox.textContent = 'New PIN must be different from your current PIN.';
        errBox.classList.remove('hidden');
        return;
      }

      const res = await this.authService.changeParentPin(currentPin, newPin);
      if (res.success) {
        successBox.textContent = 'Parent PIN updated successfully! Previous PIN is no longer valid.';
        successBox.classList.remove('hidden');
        setTimeout(() => {
          this.openDashboard();
        }, 1200);
      } else {
        errBox.textContent = res.error || 'Failed to update PIN.';
        errBox.classList.remove('hidden');
      }
    });

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  private renderCategoryRow(
    label: string,
    data: { seconds: number; sessions: number } | undefined,
    totalSeconds: number
  ): string {
    const secs = data ? data.seconds : 0;
    const sess = data ? data.sessions : 0;
    const pct = totalSeconds > 0 ? Math.round((secs / totalSeconds) * 100) : 0;

    return `
      <div style="background:#f9faf7; border:1px solid var(--line); border-radius:10px; padding:10px 12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
          <strong style="font:800 12px Nunito; color:var(--ink);">${label}</strong>
          <span style="font-size:11px; font-weight:700; color:var(--teal);">${this.formatSeconds(secs)} (${sess} ses)</span>
        </div>
        <div style="width:100%; height:6px; background:#e8ebe8; border-radius:6px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:var(--teal); border-radius:6px;"></div>
        </div>
      </div>
    `;
  }

  private formatSeconds(totalSecs: number): string {
    if (totalSecs <= 0) return '0 min';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins} min`;
    return `${mins}m ${secs}s`;
  }

  private downloadChildCsv(child: ChildProfile): void {
    const prog = this.profileService.getChildProgress(child.id);
    const summary = this.activityService.getSummary(child.id, child.name, '30days');

    const rows = [
      ['DyslexiMate Learner Progress & Activity Report (Demo Mode)'],
      ['Child Name', child.name],
      ['Class / Grade', child.grade],
      ['Preferred Language', child.preferredLanguage],
      ['Date Exported', new Date().toLocaleDateString()],
      [''],
      ['Learning Metrics', 'Value'],
      ['Practice Minutes Recorded', prog.practiceMinutes],
      ['Active Learning Seconds (Last 30 Days)', summary.totalActiveSeconds],
      ['Active Learning Minutes (Last 30 Days)', Math.round(summary.totalActiveSeconds / 60)],
      ['Total Active Sessions', summary.totalSessions],
      ['Most Used Activity', summary.mostUsedActivity],
      ['Happy Points', prog.happyPoints],
      ['Reading Fluency (WPM)', prog.fluencyWpm],
      ['Reading Accuracy (%)', prog.accuracyPercent],
      ['Current Streak (Days)', prog.streakDays],
    ];

    const csvContent = rows
      .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dysleximate-${child.name.toLowerCase().replace(/\s+/g, '_')}-activity-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private ensureModalElement(): HTMLElement {
    let el = document.getElementById('parentDashboardModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'parentDashboardModal';
      el.className = 'modal-backdrop hidden';
      el.addEventListener('click', e => {
        if (e.target === el) this.closeModal();
      });
      document.body.appendChild(el);
    }
    return el;
  }

  public closeModal(): void {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }
    const el = document.getElementById('parentDashboardModal');
    if (el) el.classList.add('hidden');
    document.body.style.overflow = '';
  }
}
