import { AuthService } from '../services/authService';
import { ProfileService } from '../services/profileService';
import type { ChildProfile } from '../types/auth';
import type { ChildModalView } from './childModalView';
import type { ParentDashboardView } from './parentDashboardView';

export class ProfileSelectView {
  private container: HTMLElement;
  private authService: AuthService;
  private profileService: ProfileService;
  private childModalView: ChildModalView;
  private parentDashboardView: ParentDashboardView;
  private onSelectChild: (child: ChildProfile) => void;
  private onLogout: () => void;
  private isManageMode: boolean = false;

  constructor(
    container: HTMLElement,
    childModalView: ChildModalView,
    parentDashboardView: ParentDashboardView,
    onSelectChild: (child: ChildProfile) => void,
    onLogout: () => void
  ) {
    this.container = container;
    this.authService = AuthService.getInstance();
    this.profileService = ProfileService.getInstance();
    this.childModalView = childModalView;
    this.parentDashboardView = parentDashboardView;
    this.onSelectChild = onSelectChild;
    this.onLogout = onLogout;
  }

  public async render(): Promise<void> {
    const parentUser = this.authService.getCurrentUser();
    if (!parentUser) {
      this.onLogout();
      return;
    }

    const children = await this.profileService.getChildren(parentUser.id);

    const langFlags: Record<string, string> = {
      English: '🇬🇧',
      Hindi: '🇮🇳',
      Punjabi: '🇮🇳',
      Bengali: '🇮🇳',
    };

    this.container.innerHTML = `
      <div class="auth-overlay-container">
        <div class="profile-select-view">
          <header class="profile-select-header">
            <div class="auth-brand" style="margin-bottom:16px;">
              <div class="brand-mark" aria-hidden="true">✿</div>
              <div class="brand-name">Dyslexi<span>Mate</span></div>
            </div>
            <div>
              <span class="eyebrow-tag">Family Reading Hub</span>
              <h1>Who's learning today?</h1>
              <p>Welcome, ${parentUser.fullName}! Pick a profile to begin today's reading practice.</p>
            </div>
          </header>

          <!-- Action Controls Bar -->
          <div class="profile-action-bar">
            <div class="profile-action-group">
              <button type="button" id="btnAddChildTop" class="btn-action-pill pill-teal">
                <span>+</span> Add Child Profile
              </button>
              <button
                type="button"
                id="btnToggleManage"
                class="btn-action-pill ${this.isManageMode ? 'active' : ''}"
                aria-pressed="${this.isManageMode}"
              >
                <span>⚙️</span> ${this.isManageMode ? 'Done Managing' : 'Manage Profiles'}
              </button>
            </div>

            <div class="profile-action-group">
              <button type="button" id="btnOpenParentDash" class="btn-action-pill">
                <span>🔒</span> Parent Dashboard
              </button>
              <button
                type="button"
                id="btnLogoutTop"
                class="btn-action-pill"
                style="color: #ba472f; border-color: #fbd6ce;"
              >
                <span>🚪</span> Log Out
              </button>
            </div>
          </div>

          <!-- Empty State or Cards Grid -->
          ${
            children.length === 0
              ? `
              <div class="empty-profiles-card" role="region" aria-labelledby="emptyTitle">
                <div class="empty-icon" aria-hidden="true">🌱</div>
                <h3 id="emptyTitle">No child profiles yet!</h3>
                <p>
                  Create a profile for your child to unlock personalized games, stories,
                  and friendly voice-guided reading.
                </p>
                <button type="button" id="btnCreateFirstChild" class="btn-primary-big" style="margin: 0 auto;">
                  <span>✨</span> Create Your First Child Profile
                </button>
              </div>
            `
              : `
              <div class="profiles-grid" role="list">
                ${children
                  .map(child => {
                    const prog = this.profileService.getChildProgress(child.id);
                    const flag = langFlags[child.preferredLanguage] || '🌍';
                    return `
                    <div class="child-card" role="listitem" data-child-id="${child.id}">
                      <div class="child-avatar-wrap" aria-hidden="true">
                        ${child.avatar}
                      </div>
                      <h3 class="child-card-name">${child.name}</h3>
                      <div class="child-card-grade">${child.grade}</div>

                      <div class="child-card-tags">
                        <span class="child-tag-lang">${flag} ${child.preferredLanguage}</span>
                        <span class="child-tag-points">⭐ ${prog.happyPoints} pts</span>
                      </div>

                      ${
                        this.isManageMode
                          ? `
                          <div class="child-manage-actions">
                            <button
                              type="button"
                              class="btn-manage-edit"
                              data-edit-id="${child.id}"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              type="button"
                              class="btn-manage-delete"
                              data-delete-id="${child.id}"
                              title="Delete profile"
                            >
                              🗑️
                            </button>
                          </div>
                        `
                          : `
                          <button
                            type="button"
                            class="btn-enter-child"
                            data-select-id="${child.id}"
                          >
                            Start Learning →
                          </button>
                        `
                      }
                    </div>
                  `;
                  })
                  .join('')}

                <!-- Add Another Card Tile -->
                <div class="add-child-card" id="btnAddChildCard" role="button" tabindex="0" aria-label="Add another child profile">
                  <div class="add-child-icon" aria-hidden="true">+</div>
                  <strong>Add Child Profile</strong>
                  <p>Support another child's personalized reading growth</p>
                </div>
              </div>
            `
          }

          <div style="text-align: center; margin-top: 24px; font-size: 11px; color: var(--muted);">
            DyslexiMate Parent Mode · Profile selection keeps each child's learning private.
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    document.getElementById('btnAddChildTop')?.addEventListener('click', () => {
      this.childModalView.openAddModal(parentUser.id);
    });

    document.getElementById('btnCreateFirstChild')?.addEventListener('click', () => {
      this.childModalView.openAddModal(parentUser.id);
    });

    document.getElementById('btnAddChildCard')?.addEventListener('click', () => {
      this.childModalView.openAddModal(parentUser.id);
    });

    document.getElementById('btnToggleManage')?.addEventListener('click', () => {
      this.isManageMode = !this.isManageMode;
      this.render();
    });

    document.getElementById('btnOpenParentDash')?.addEventListener('click', () => {
      this.parentDashboardView.requestParentAccess(() => {
        this.parentDashboardView.openDashboard();
      });
    });

    document.getElementById('btnLogoutTop')?.addEventListener('click', () => {
      if (confirm('Log out of DyslexiMate parent account?')) {
        this.onLogout();
      }
    });

    // Select child to learn
    this.container.querySelectorAll('[data-select-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.selectId;
        const child = children.find(c => c.id === id);
        if (child) {
          this.profileService.setActiveChild(child);
          this.onSelectChild(child);
        }
      });
    });

    // Edit child
    this.container.querySelectorAll('[data-edit-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.editId;
        const child = children.find(c => c.id === id);
        if (child) {
          this.childModalView.openEditModal(child);
        }
      });
    });

    // Delete child
    this.container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.deleteId;
        const child = children.find(c => c.id === id);
        if (child) {
          this.childModalView.openDeleteConfirmModal(child);
        }
      });
    });
  }
}
