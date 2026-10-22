import { ProfileService } from '../services/profileService';
import type { ChildProfile, SupportedLanguage } from '../types/auth';
import { i18n } from '../i18n';

const AVAILABLE_AVATARS = [
  '👧🏽', '👦🏻', '🦊', '🦁', '🐼',
  '🦄', '🚀', '🦉', '🐯', '🐬',
  '🌸', '⭐', '🦖', '🎨', '📚'
];

export class ChildModalView {
  private profileService: ProfileService;
  private onProfilesChanged: () => void;
  private selectedAvatar: string = '👧🏽';

  constructor(onProfilesChanged: () => void) {
    this.profileService = ProfileService.getInstance();
    this.onProfilesChanged = onProfilesChanged;
  }

  // -------------------------------------------------------------
  // Open Add Child Modal
  // -------------------------------------------------------------
  public openAddModal(parentId: string): void {
    this.selectedAvatar = '👧🏽';
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <div>
            <h2 id="modalTitle">${i18n.t('childModal.addTitle')}</h2>
            <p>${i18n.t('childModal.addSub')}</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseChildModal" aria-label="${i18n.t('common.close')}">×</button>
        </div>

        <form id="childProfileForm">
          <div class="form-group">
            <label class="form-label" for="childNameInput">${i18n.t('childModal.nameLabel')}</label>
            <input
              type="text"
              id="childNameInput"
              class="form-input"
              placeholder="e.g. Aanya"
              required
              maxlength="30"
            />
            <span id="childNameError" class="field-error-msg hidden"></span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="childGradeSelect">${i18n.t('childModal.gradeLabel')}</label>
              <select id="childGradeSelect" class="form-input">
                <option value="Class 1 · Early reader">Class 1</option>
                <option value="Class 2 · Early reader">Class 2</option>
                <option value="Class 3 · Growing reader">Class 3</option>
                <option value="Class 4 · Little reader" selected>Class 4</option>
                <option value="Class 5 · Confident reader">Class 5</option>
                <option value="Class 6 · Confident reader">Class 6</option>
                <option value="Class 7 · Confident reader">Class 7</option>
                <option value="Class 8 · Advanced reader">Class 8</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="childLangSelect">${i18n.t('childModal.langLabel')}</label>
              <select id="childLangSelect" class="form-input">
                <option value="English" selected>EG English</option>
                <option value="Hindi">HN हिन्दी</option>
                <option value="Odia">OD ଓଡ଼ିଆ</option>
                <option value="Punjabi">PB ਪੰਜਾਬੀ</option>
                <option value="Tamil">TM தமிழ்</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">${i18n.t('childModal.avatarLabel')}</label>
            <div class="avatar-selector-grid" id="avatarGrid">
              ${AVAILABLE_AVATARS.map(
                av => `
                <button
                  type="button"
                  class="avatar-opt ${av === this.selectedAvatar ? 'selected' : ''}"
                  data-avatar="${av}"
                  aria-label="Select avatar ${av}"
                >
                  ${av}
                </button>
              `
              ).join('')}
            </div>
          </div>

          <div style="background: #f7f9f7; border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 16px;">
            <strong style="font:800 12px Nunito; display:block; margin-bottom: 6px; color: var(--ink);">
              ${i18n.t('childModal.optionsTitle')}
            </strong>
            <label class="form-checkbox-label" style="margin: 6px 0;">
              <input type="checkbox" id="prefDyslexiaFont" />
              <span>${i18n.t('childModal.dyslexiaFont')}</span>
            </label>
            <label class="form-checkbox-label" style="margin: 6px 0;">
              <input type="checkbox" id="prefSoundEffects" checked />
              <span>${i18n.t('childModal.soundEffects')}</span>
            </label>
            <label class="form-checkbox-label" style="margin: 6px 0;">
              <input type="checkbox" id="prefAutoReadAloud" />
              <span>${i18n.t('childModal.autoRead')}</span>
            </label>
          </div>

          <div class="modal-controls">
            <button type="submit" id="btnSaveChild" style="min-width: 130px;">
              ${i18n.t('childModal.save')}
            </button>
            <button type="button" id="btnCancelChild" class="soft">
              ${i18n.t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    `;

    this.bindAvatarSelection(modalEl);

    document.getElementById('btnCloseChildModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelChild')?.addEventListener('click', () => this.closeModal());

    const form = document.getElementById('childProfileForm') as HTMLFormElement;
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const nameInput = document.getElementById('childNameInput') as HTMLInputElement;
      const nameError = document.getElementById('childNameError') as HTMLElement;
      const name = nameInput.value.trim();

      if (!name) {
        nameError.textContent = i18n.t('childModal.nameError');
        nameError.classList.remove('hidden');
        nameInput.classList.add('input-error');
        return;
      }

      const grade = (document.getElementById('childGradeSelect') as HTMLSelectElement).value;
      const preferredLanguage = (document.getElementById('childLangSelect') as HTMLSelectElement).value as SupportedLanguage;
      const dyslexiaFont = (document.getElementById('prefDyslexiaFont') as HTMLInputElement).checked;
      const soundEffects = (document.getElementById('prefSoundEffects') as HTMLInputElement).checked;
      const autoReadAloud = (document.getElementById('prefAutoReadAloud') as HTMLInputElement).checked;

      await this.profileService.createChild(parentId, {
        name,
        grade,
        preferredLanguage,
        avatar: this.selectedAvatar,
        preferences: {
          readingSpeed: 'normal',
          dyslexiaFont,
          highContrast: false,
          soundEffects,
          autoReadAloud,
        },
      });

      this.closeModal();
      this.onProfilesChanged();
    });

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // -------------------------------------------------------------
  // Open Edit Child Modal
  // -------------------------------------------------------------
  public openEditModal(child: ChildProfile): void {
    this.selectedAvatar = child.avatar || '👧🏽';
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <div>
            <h2 id="modalTitle">${i18n.t('childModal.editTitle', { name: child.name })}</h2>
            <p>${i18n.t('childModal.editSub')}</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseChildModal" aria-label="${i18n.t('common.close')}">×</button>
        </div>

        <form id="childProfileForm">
          <div class="form-group">
            <label class="form-label" for="childNameInput">${i18n.t('childModal.nameLabel')}</label>
            <input
              type="text"
              id="childNameInput"
              class="form-input"
              value="${child.name}"
              required
              maxlength="30"
            />
            <span id="childNameError" class="field-error-msg hidden"></span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label" for="childGradeSelect">${i18n.t('childModal.gradeLabel')}</label>
              <select id="childGradeSelect" class="form-input">
                <option value="Class 1 · Early reader" ${child.grade.includes('Class 1') ? 'selected' : ''}>Class 1</option>
                <option value="Class 2 · Early reader" ${child.grade.includes('Class 2') ? 'selected' : ''}>Class 2</option>
                <option value="Class 3 · Growing reader" ${child.grade.includes('Class 3') ? 'selected' : ''}>Class 3</option>
                <option value="Class 4 · Little reader" ${child.grade.includes('Class 4') ? 'selected' : ''}>Class 4</option>
                <option value="Class 5 · Confident reader" ${child.grade.includes('Class 5') ? 'selected' : ''}>Class 5</option>
                <option value="Class 6 · Confident reader" ${child.grade.includes('Class 6') ? 'selected' : ''}>Class 6</option>
                <option value="Class 7 · Confident reader" ${child.grade.includes('Class 7') ? 'selected' : ''}>Class 7</option>
                <option value="Class 8 · Advanced reader" ${child.grade.includes('Class 8') ? 'selected' : ''}>Class 8</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label" for="childLangSelect">${i18n.t('childModal.langLabel')}</label>
              <select id="childLangSelect" class="form-input">
                <option value="English" ${child.preferredLanguage === 'English' ? 'selected' : ''}>EG English</option>
                <option value="Hindi" ${child.preferredLanguage === 'Hindi' ? 'selected' : ''}>HN हिन्दी</option>
                <option value="Odia" ${child.preferredLanguage === 'Odia' ? 'selected' : ''}>OD ଓଡ଼ିଆ</option>
                <option value="Punjabi" ${child.preferredLanguage === 'Punjabi' ? 'selected' : ''}>PB ਪੰਜਾਬੀ</option>
                <option value="Tamil" ${child.preferredLanguage === 'Tamil' ? 'selected' : ''}>TM தமிழ்</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">${i18n.t('childModal.avatarLabel')}</label>
            <div class="avatar-selector-grid" id="avatarGrid">
              ${AVAILABLE_AVATARS.map(
                av => `
                <button
                  type="button"
                  class="avatar-opt ${av === this.selectedAvatar ? 'selected' : ''}"
                  data-avatar="${av}"
                  aria-label="Select avatar ${av}"
                >
                  ${av}
                </button>
              `
              ).join('')}
            </div>
          </div>

          <div style="background: #f7f9f7; border: 1px solid var(--line); border-radius: 14px; padding: 12px; margin-bottom: 16px;">
            <strong style="font:800 12px Nunito; display:block; margin-bottom: 6px; color: var(--ink);">
              ${i18n.t('childModal.optionsTitle')}
            </strong>
            <label class="form-checkbox-label" style="margin: 6px 0;">
              <input type="checkbox" id="prefDyslexiaFont" ${child.preferences?.dyslexiaFont ? 'checked' : ''} />
              <span>${i18n.t('childModal.dyslexiaFont')}</span>
            </label>
            <label class="form-checkbox-label" style="margin: 6px 0;">
              <input type="checkbox" id="prefSoundEffects" ${child.preferences?.soundEffects !== false ? 'checked' : ''} />
              <span>${i18n.t('childModal.soundEffects')}</span>
            </label>
            <label class="form-checkbox-label" style="margin: 6px 0;">
              <input type="checkbox" id="prefAutoReadAloud" ${child.preferences?.autoReadAloud ? 'checked' : ''} />
              <span>${i18n.t('childModal.autoRead')}</span>
            </label>
          </div>

          <div class="modal-controls">
            <button type="submit" id="btnSaveChild" style="min-width: 130px;">
              ${i18n.t('childModal.update')}
            </button>
            <button type="button" id="btnCancelChild" class="soft">
              ${i18n.t('common.cancel')}
            </button>
            <button
              type="button"
              id="btnDeleteFromEdit"
              style="margin-left: auto; background: #fff2ed; color: #c7563d; border: 1px solid #f7d2c8;"
            >
              ${i18n.t('childModal.remove')}
            </button>
          </div>
        </form>
      </div>
    `;

    this.bindAvatarSelection(modalEl);

    document.getElementById('btnCloseChildModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelChild')?.addEventListener('click', () => this.closeModal());

    document.getElementById('btnDeleteFromEdit')?.addEventListener('click', () => {
      this.closeModal();
      this.openDeleteConfirmModal(child);
    });

    const form = document.getElementById('childProfileForm') as HTMLFormElement;
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const nameInput = document.getElementById('childNameInput') as HTMLInputElement;
      const name = nameInput.value.trim();

      if (!name) return;

      const grade = (document.getElementById('childGradeSelect') as HTMLSelectElement).value;
      const preferredLanguage = (document.getElementById('childLangSelect') as HTMLSelectElement).value as SupportedLanguage;
      const dyslexiaFont = (document.getElementById('prefDyslexiaFont') as HTMLInputElement).checked;
      const soundEffects = (document.getElementById('prefSoundEffects') as HTMLInputElement).checked;
      const autoReadAloud = (document.getElementById('prefAutoReadAloud') as HTMLInputElement).checked;

      await this.profileService.updateChild(child.id, {
        name,
        grade,
        preferredLanguage,
        avatar: this.selectedAvatar,
        preferences: {
          readingSpeed: child.preferences?.readingSpeed || 'normal',
          dyslexiaFont,
          highContrast: child.preferences?.highContrast || false,
          soundEffects,
          autoReadAloud,
        },
      });

      this.closeModal();
      this.onProfilesChanged();
    });

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  // -------------------------------------------------------------
  // Open Delete Confirmation Modal
  // -------------------------------------------------------------
  public openDeleteConfirmModal(child: ChildProfile): void {
    const modalEl = this.ensureModalElement();

    modalEl.innerHTML = `
      <div class="modal" style="max-width: 440px;" role="dialog" aria-modal="true" aria-labelledby="delTitle">
        <div class="modal-head">
          <div>
            <h2 id="delTitle" style="color: #c04830;">${i18n.t('childModal.deleteTitle')}</h2>
            <p>${i18n.t('childModal.deleteSub')}</p>
          </div>
          <button type="button" class="modal-close" id="btnCloseDelModal" aria-label="${i18n.t('common.close')}">×</button>
        </div>

        <div class="modal-body">
          <div style="text-align: center; margin: 10px 0 16px;">
            <span style="font-size: 52px; display: inline-block;">${child.avatar}</span>
            <strong style="display:block; font:800 18px Nunito; margin-top: 6px;">${child.name}</strong>
            <small style="color: var(--muted);">${child.grade}</small>
          </div>

          <div class="form-alert alert-error" style="line-height: 1.5;">
            ${i18n.t('childModal.deleteConfirm', { name: child.name })}
          </div>

          <div class="modal-controls" style="justify-content: center; gap: 12px; margin-top: 20px;">
            <button
              type="button"
              id="btnConfirmDelete"
              style="background: #c04830; color: #fff; padding: 11px 18px;"
            >
              ${i18n.t('childModal.deleteAction')}
            </button>
            <button type="button" id="btnCancelDelete" class="soft" style="padding: 11px 18px;">
              ${i18n.t('childModal.keepAction')}
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCloseDelModal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelDelete')?.addEventListener('click', () => this.closeModal());

    document.getElementById('btnConfirmDelete')?.addEventListener('click', async () => {
      await this.profileService.deleteChild(child.id);
      this.closeModal();
      this.onProfilesChanged();
    });

    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  private bindAvatarSelection(modalEl: HTMLElement): void {
    const avatarBtns = modalEl.querySelectorAll('.avatar-opt');
    avatarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        avatarBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedAvatar = (btn as HTMLElement).dataset.avatar || '👧🏽';
      });
    });
  }

  private ensureModalElement(): HTMLElement {
    let el = document.getElementById('childActionModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'childActionModal';
      el.className = 'modal-backdrop hidden';
      el.addEventListener('click', e => {
        if (e.target === el) this.closeModal();
      });
      document.body.appendChild(el);
    }
    return el;
  }

  public closeModal(): void {
    const el = document.getElementById('childActionModal');
    if (el) el.classList.add('hidden');
    document.body.style.overflow = '';
  }
}
