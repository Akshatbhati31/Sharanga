import { TinyFishService } from '../services/tinyfishService';
import type {
  EducationalResource,
  ResourceSearchParams,
  ResourceType,
} from '../types/tinyfish';

export class ResourceFinderView {
  private container: HTMLElement;
  private tinyFishService: TinyFishService;
  private isSearching: boolean = false;
  private isConfigured: boolean = true;
  private defaultLanguage: string = 'English';
  private defaultGrade: string = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.tinyFishService = TinyFishService.getInstance();
  }

  public setDefaults(language: string, grade: string): void {
    this.defaultLanguage = language || 'English';
    this.defaultGrade = grade || '';
  }

  /**
   * Initializes and renders the Educational Resource Finder view.
   */
  public async render(): Promise<void> {
    const status = await this.tinyFishService.checkStatus();
    this.isConfigured = status.configured;

    this.container.innerHTML = `
      <div class="resource-finder-container">
        <!-- Header Banner -->
        <div class="section-head" style="margin-bottom: 0;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h2 style="margin:0;">Educational Resource Finder 🌐</h2>
              <span class="tag" style="background:#eaf2fd; color:#2c62a8">Public Web Agent</span>
              ${
                this.isConfigured
                  ? '<span class="tag" style="background:#e6f8ee; color:#18794e; border:1px solid #b7ebc9; font-weight:700;">🟢 TinyFish Ready</span>'
                  : '<span class="tag" style="background:#fffbe6; color:#7d6a26; border:1px solid #f6e69d; font-weight:700;">⚠️ Key Required</span>'
              }
            </div>
            <p style="margin:4px 0 0; color:var(--muted); font-size:13px;">
              Retrieve real-world educational worksheets, phonics games, and reading activities from public educational sites.
            </p>
          </div>
        </div>

        ${
          !this.isConfigured
            ? `
            <div class="rf-status-banner rf-status-unconfigured" id="rfConfigWarning">
              <span style="font-size:22px; line-height:1;">⚙️</span>
              <div>
                <strong>TinyFish API Key Setup Required:</strong>
                <p style="margin:4px 0 0; font-size:12px;">
                  The backend TinyFish integration is ready. To enable live web agent searches, configure <code>TINYFISH_API_KEY</code> in your Vercel Project Settings (Environment Variables) or in your local <code>.env</code> file.
                </p>
              </div>
            </div>
          `
            : ''
        }

        <!-- Medical & Accessibility Disclaimer -->
        <div class="rf-disclaimer-box" role="note" aria-label="Educational Disclaimer">
          <span style="font-size:18px; line-height:1;">ℹ️</span>
          <div>
            <strong>Educational Suggestion Notice:</strong>
            Resources are retrieved from publicly accessible educational sources for learning practice. Accessibility or dyslexia adaptation has not been clinically evaluated by DyslexiMate. Review materials to ensure suitability for your learner.
          </div>
        </div>

        <!-- Search Form Card -->
        <div class="resource-search-card">
          <form id="rfSearchForm" novalidate>
            <div class="rf-search-grid">
              <!-- Topic Input -->
              <div class="rf-field-group">
                <label for="rfTopicInput">Learning Topic or Subject *</label>
                <input
                  type="text"
                  id="rfTopicInput"
                  class="rf-input"
                  placeholder="e.g., phonics blending, sight words, short vowels"
                  maxlength="100"
                  required
                  aria-describedby="rfTopicError"
                />
                <span id="rfTopicError" style="color:#c85542; font-size:11px; font-weight:700;" class="hidden"></span>
              </div>

              <!-- Grade / Age Range -->
              <div class="rf-field-group">
                <label for="rfGradeSelect">Grade / Level</label>
                <select id="rfGradeSelect" class="rf-select">
                  <option value="any">Any Level</option>
                  <option value="Kindergarten · Early Reader" ${this.defaultGrade.toLowerCase().includes('early') || this.defaultGrade.toLowerCase().includes('kinder') ? 'selected' : ''}>Kindergarten · Early</option>
                  <option value="Class 1-2 · Growing Reader" ${this.defaultGrade.toLowerCase().includes('2') || this.defaultGrade.toLowerCase().includes('grow') ? 'selected' : ''}>Class 1–2 · Growing</option>
                  <option value="Class 3-4 · Fluent Reader" ${this.defaultGrade.toLowerCase().includes('4') ? 'selected' : ''}>Class 3–4 · Fluent</option>
                  <option value="Class 5-6 · Confident Reader" ${this.defaultGrade.toLowerCase().includes('6') ? 'selected' : ''}>Class 5–6 · Confident</option>
                </select>
              </div>

              <!-- Resource Type -->
              <div class="rf-field-group">
                <label for="rfTypeSelect">Resource Type</label>
                <select id="rfTypeSelect" class="rf-select">
                  <option value="any">Any Resource Type</option>
                  <option value="reading_exercise">Reading Exercise</option>
                  <option value="phonics_activity">Phonics Activity</option>
                  <option value="educational_game">Educational Game</option>
                  <option value="worksheet">Practice Worksheet</option>
                </select>
              </div>

              <!-- Language -->
              <div class="rf-field-group">
                <label for="rfLangSelect">Language</label>
                <select id="rfLangSelect" class="rf-select">
                  <option value="English" ${this.defaultLanguage === 'English' ? 'selected' : ''}>English</option>
                  <option value="Hindi" ${this.defaultLanguage === 'Hindi' ? 'selected' : ''}>Hindi</option>
                  <option value="Punjabi" ${this.defaultLanguage === 'Punjabi' ? 'selected' : ''}>Punjabi</option>
                  <option value="Bengali" ${this.defaultLanguage === 'Bengali' ? 'selected' : ''}>Bengali</option>
                  <option value="Spanish" ${this.defaultLanguage === 'Spanish' ? 'selected' : ''}>Spanish</option>
                </select>
              </div>

              <!-- Submit Button -->
              <div>
                <button type="submit" id="rfSubmitBtn" class="rf-btn-search">
                  <span id="rfBtnSpinner" class="rf-loading-spinner hidden" aria-hidden="true"></span>
                  <span id="rfBtnLabel">🔎 Find Resources</span>
                </button>
              </div>
            </div>
          </form>

          <!-- Quick Topic Suggestions -->
          <div style="display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap;">
            <span style="font-size:11px; font-weight:700; color:#78878d;">Suggestions:</span>
            <button type="button" class="btn-action-pill rf-pill" data-topic="phonics sound patterns" style="font-size:11px; padding:4px 9px;">
              🔤 Phonics Sounds
            </button>
            <button type="button" class="btn-action-pill rf-pill" data-topic="sight words practice" style="font-size:11px; padding:4px 9px;">
              👁️ Sight Words
            </button>
            <button type="button" class="btn-action-pill rf-pill" data-topic="reading comprehension short stories" style="font-size:11px; padding:4px 9px;">
              📖 Short Stories
            </button>
            <button type="button" class="btn-action-pill rf-pill" data-topic="rhyming words games" style="font-size:11px; padding:4px 9px;">
              🎵 Rhyming Games
            </button>
          </div>
        </div>

        <!-- Dynamic Content Output Area -->
        <div id="rfResultsArea">
          <div style="text-align:center; padding: 42px 18px; background:#fff; border-radius:18px; border:1px dashed var(--line);">
            <span style="font-size:42px; display:inline-block; margin-bottom:8px;">🔍</span>
            <h3 style="font:900 17px Nunito; margin:0; color:var(--ink);">Search Public Educational Resources</h3>
            <p style="margin:6px auto 0; max-width:440px; color:var(--muted); font-size:12px; line-height:1.5;">
              Enter a learning topic above to discover free, public reading exercises, phonics activities, and worksheets from verified educational repositories.
            </p>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    const form = this.container.querySelector('#rfSearchForm') as HTMLFormElement;
    const topicInput = this.container.querySelector('#rfTopicInput') as HTMLInputElement;
    const topicError = this.container.querySelector('#rfTopicError') as HTMLElement;

    // Suggestion pills
    this.container.querySelectorAll('.rf-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = (btn as HTMLElement).dataset.topic;
        if (t && topicInput) {
          topicInput.value = t;
          topicInput.focus();
          if (topicError) topicError.classList.add('hidden');
        }
      });
    });

    // Clear error on input
    topicInput?.addEventListener('input', () => {
      if (topicError && !topicError.classList.contains('hidden')) {
        topicError.classList.add('hidden');
        topicError.textContent = '';
      }
    });

    // Form submit
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      await this.executeSearch();
    });
  }

  public async executeSearch(customTopic?: string): Promise<void> {
    if (this.isSearching) return;

    const topicInput = this.container.querySelector('#rfTopicInput') as HTMLInputElement;
    const gradeSelect = this.container.querySelector('#rfGradeSelect') as HTMLSelectElement;
    const typeSelect = this.container.querySelector('#rfTypeSelect') as HTMLSelectElement;
    const langSelect = this.container.querySelector('#rfLangSelect') as HTMLSelectElement;
    const topicError = this.container.querySelector('#rfTopicError') as HTMLElement;
    const submitBtn = this.container.querySelector('#rfSubmitBtn') as HTMLButtonElement;
    const btnSpinner = this.container.querySelector('#rfBtnSpinner') as HTMLElement;
    const btnLabel = this.container.querySelector('#rfBtnLabel') as HTMLElement;
    const resultsArea = this.container.querySelector('#rfResultsArea') as HTMLElement;

    if (customTopic && topicInput) {
      topicInput.value = customTopic;
    }

    const topic = topicInput?.value.trim() || '';

    // Validate input
    if (!topic || topic.length < 2) {
      if (topicError) {
        topicError.textContent = 'Please enter a topic with at least 2 characters.';
        topicError.classList.remove('hidden');
      }
      topicInput?.focus();
      return;
    }

    if (topic.length > 100) {
      if (topicError) {
        topicError.textContent = 'Learning topic is too long (max 100 characters).';
        topicError.classList.remove('hidden');
      }
      return;
    }

    if (topicError) topicError.classList.add('hidden');

    const params: ResourceSearchParams = {
      topic,
      grade: gradeSelect?.value !== 'any' ? gradeSelect?.value : undefined,
      resourceType: (typeSelect?.value as ResourceType) || 'any',
      language: langSelect?.value || 'English',
    };

    // Set UI to loading state
    this.isSearching = true;
    if (submitBtn) submitBtn.disabled = true;
    if (btnSpinner) btnSpinner.classList.remove('hidden');
    if (btnLabel) btnLabel.textContent = 'Searching...';

    if (resultsArea) {
      resultsArea.innerHTML = `
        <div style="text-align:center; padding: 48px 20px; background:#fff; border-radius:18px; border:1px solid var(--line);">
          <div class="rf-loading-spinner" style="width:36px; height:36px; border-width:3.5px; border-top-color:var(--teal); border-color:#e0ece8; border-top-color:var(--teal); margin: 0 auto 14px;" role="status" aria-label="Loading"></div>
          <strong style="font:900 16px Nunito; display:block; color:var(--ink);">Connecting to TinyFish Web Agent...</strong>
          <p style="margin:6px auto 0; max-width:400px; color:var(--muted); font-size:12px; line-height:1.5;">
            Navigating publicly accessible educational repositories for <em>"${this.escapeHtml(topic)}"</em>.
          </p>
          <div style="display:flex; justify-content:center; gap:8px; margin-top:16px;">
            <span class="tag" style="background:#e8f5ef; color:var(--teal);">🔎 Safe Public Search</span>
            <span class="tag" style="background:#eaf2fd; color:#2c62a8">🛡️ No Clinical Claim</span>
          </div>
        </div>
      `;
    }

    try {
      const response = await this.tinyFishService.searchResources(params);

      // Reset loading state
      this.isSearching = false;
      if (submitBtn) submitBtn.disabled = false;
      if (btnSpinner) btnSpinner.classList.add('hidden');
      if (btnLabel) btnLabel.textContent = '🔎 Find Resources';

      if (!resultsArea) return;

      // Unconfigured or error returned
      if (!response.success) {
        if (!response.configured) {
          resultsArea.innerHTML = `
            <div class="rf-status-banner rf-status-unconfigured" style="margin-top: 10px;">
              <span style="font-size:26px; line-height:1;">⚙️</span>
              <div>
                <strong style="font-size:15px;">TinyFish API Key Required</strong>
                <p style="margin:4px 0 10px; font-size:12px; line-height:1.5;">
                  ${this.escapeHtml(response.error || 'TinyFish API key is not configured on the server.')}
                </p>
                <div style="background:#fff; border-radius:10px; padding:10px 14px; border:1px solid #f6d2b3; font-size:12px; font-family:monospace; color:#333;">
                  Vercel Project Settings &gt; Environment Variables &gt; TINYFISH_API_KEY
                </div>
              </div>
            </div>
          `;
          return;
        }

        // Generic error
        resultsArea.innerHTML = `
          <div class="rf-status-banner rf-status-error" style="margin-top: 10px;">
            <span style="font-size:26px; line-height:1;">⚠️</span>
            <div>
              <strong style="font-size:15px;">Search Could Not Be Completed</strong>
              <p style="margin:4px 0 12px; font-size:12px; line-height:1.5;">
                ${this.escapeHtml(response.error || 'An error occurred while retrieving educational resources.')}
              </p>
              <button type="button" id="rfRetryBtn" class="btn-action-pill" style="font-size:12px;">
                ↻ Try Again
              </button>
            </div>
          </div>
        `;
        resultsArea.querySelector('#rfRetryBtn')?.addEventListener('click', () => {
          this.executeSearch();
        });
        return;
      }

      // Empty results
      if (!response.resources || response.resources.length === 0) {
        resultsArea.innerHTML = `
          <div style="text-align:center; padding: 48px 18px; background:#fff; border-radius:18px; border:1px dashed var(--line);">
            <span style="font-size:38px; display:inline-block; margin-bottom:8px;">🌱</span>
            <strong style="font:900 16px Nunito; display:block; color:var(--ink);">No public resources found</strong>
            <p style="margin:6px auto 14px; max-width:440px; color:var(--muted); font-size:12px; line-height:1.5;">
              We couldn't locate matching public materials for <em>"${this.escapeHtml(topic)}"</em>. Try broadening your topic keywords or changing the grade filter.
            </p>
            <button type="button" id="rfTryBroaderBtn" class="btn-action-pill pill-teal" style="font-size:12px;">
              Try "phonics reading practice"
            </button>
          </div>
        `;
        resultsArea.querySelector('#rfTryBroaderBtn')?.addEventListener('click', () => {
          this.executeSearch('phonics reading practice');
        });
        return;
      }

      // Success: Render resource cards
      resultsArea.innerHTML = `
        <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <strong style="font:800 14px Nunito; color:#49585e;">
            Found ${response.resources.length} educational resource${response.resources.length === 1 ? '' : 's'} for <em>"${this.escapeHtml(topic)}"</em>
          </strong>
          <span style="font-size:11px; color:var(--muted);">Retrieved via TinyFish Web Agent</span>
        </div>

        <div class="rf-results-list">
          ${response.resources.map(r => this.renderResourceCard(r)).join('')}
        </div>
      `;
    } catch (err: unknown) {
      this.isSearching = false;
      if (submitBtn) submitBtn.disabled = false;
      if (btnSpinner) btnSpinner.classList.add('hidden');
      if (btnLabel) btnLabel.textContent = '🔎 Find Resources';

      if (resultsArea) {
        const msg = err instanceof Error ? err.message : 'Failed to query TinyFish service.';
        resultsArea.innerHTML = `
          <div class="rf-status-banner rf-status-error">
            <span style="font-size:24px;">⚠️</span>
            <div>
              <strong>Service Error:</strong>
              <p style="margin:4px 0 0; font-size:12px;">${this.escapeHtml(msg)}</p>
            </div>
          </div>
        `;
      }
    }
  }

  private renderResourceCard(resource: EducationalResource): string {
    const typeLabelMap: Record<ResourceType, string> = {
      reading_exercise: '📖 Reading Exercise',
      phonics_activity: '🔤 Phonics Activity',
      educational_game: '🎮 Educational Game',
      worksheet: '📄 Practice Worksheet',
      any: '📚 Educational Resource',
      unspecified: '📚 Resource Type Unspecified',
    };

    const typeDisplay = typeLabelMap[resource.resourceType] || '📚 Resource';

    return `
      <div class="rf-resource-card" data-resource-id="${this.escapeHtml(resource.id)}">
        <div class="rf-card-header">
          <div>
            <h3 class="rf-card-title">
              <a href="${this.escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer">
                ${this.escapeHtml(resource.title)} ↗
              </a>
            </h3>
            <div class="rf-badges">
              <span class="rf-badge rf-badge-site">🌐 ${this.escapeHtml(resource.siteName)}</span>
              <span class="rf-badge rf-badge-type">${this.escapeHtml(typeDisplay)}</span>
              ${
                resource.gradeLevel
                  ? `<span class="rf-badge rf-badge-grade">🎯 ${this.escapeHtml(resource.gradeLevel)}</span>`
                  : `<span class="rf-badge rf-badge-unverified">🎯 Grade: Unspecified</span>`
              }
              <span class="rf-badge rf-badge-lang">🗣️ ${this.escapeHtml(resource.language)}</span>
              ${
                resource.verified
                  ? `<span class="rf-badge" style="background:#eaf8ef; color:#1b7d52; border:1px solid #bce6cd;">✓ Verified Source Link</span>`
                  : `<span class="rf-badge rf-badge-unverified">⚠️ Unverified Link</span>`
              }
            </div>
          </div>
          <a
            href="${this.escapeHtml(resource.url)}"
            target="_blank"
            rel="noopener noreferrer"
            class="rf-open-link"
            aria-label="Open ${this.escapeHtml(resource.title)} in new tab"
          >
            Open ↗
          </a>
        </div>

        <p class="rf-summary">${this.escapeHtml(resource.summary)}</p>

        <div class="rf-card-footer">
          <span>Source: <a href="${this.escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--teal); text-decoration:none;">${this.escapeHtml(resource.siteName)}</a></span>
          <span>⚠️ Not clinically evaluated for dyslexia adaptation</span>
        </div>
      </div>
    `;
  }

  private escapeHtml(val: unknown): string {
    if (val === null || val === undefined) return '';
    let str: string;
    if (typeof val === 'string') {
      str = val;
    } else if (typeof val === 'object' && val !== null && 'message' in (val as any) && typeof (val as any).message === 'string') {
      str = (val as any).message;
    } else {
      str = String(val);
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
