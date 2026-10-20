import { ReadingChartService, type ReadingChartSummary } from '../services/readingChartService';

export class ReadingConfidenceChart {
  private container: HTMLElement;
  private childId: string;
  private currentRange: 'week' | 'month' | 'all' = 'week';
  private chartService: ReadingChartService;
  private isRendering: boolean = false;

  constructor(container: HTMLElement, childId: string) {
    this.container = container;
    this.childId = childId;
    this.chartService = ReadingChartService.getInstance();
  }

  public async render(timeRange?: 'week' | 'month' | 'all'): Promise<void> {
    if (timeRange) {
      this.currentRange = timeRange;
    }
    if (this.isRendering) return;
    this.isRendering = true;

    try {
      const summary = await this.chartService.getChartSummary(this.childId, this.currentRange);
      this.renderHTML(summary);
      this.bindEvents();
    } catch (err) {
      console.warn('Could not render reading accuracy chart:', err);
    } finally {
      this.isRendering = false;
    }
  }

  public async refresh(newChildId?: string): Promise<void> {
    if (newChildId) {
      this.childId = newChildId;
    }
    await this.render();
  }

  private renderHTML(summary: ReadingChartSummary): void {
    const subtitle = summary.isEmpty
      ? 'Complete your first activity to start your learning journey. 🌱'
      : summary.trend === 'improving'
      ? 'Accuracy is growing with steady practice! 🌟'
      : summary.trend === 'declining'
      ? 'Honest practice builds real skill. We are here to help!'
      : 'Steady practice building solid foundation.';

    const accuracyBadge = summary.overallAccuracy !== null
      ? `${summary.overallAccuracy}%`
      : '—';

    this.container.innerHTML = `
      <div class="card reading-chart-card">
        <div class="card-title" style="flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font: 900 18px Nunito; margin: 0 0 4px; color: var(--ink);">Reading accuracy</h3>
            <p style="font-size: 13px; color: var(--muted); margin: 0;">${subtitle}</p>
          </div>
          <div class="select-wrap">
            <select aria-label="Chart time range" class="chart-time-select" style="min-height: 40px; font-weight: 700;">
              <option value="week" ${this.currentRange === 'week' ? 'selected' : ''}>This week</option>
              <option value="month" ${this.currentRange === 'month' ? 'selected' : ''}>This month</option>
              <option value="all" ${this.currentRange === 'all' ? 'selected' : ''}>All time</option>
            </select>
          </div>
        </div>

        <div class="chart-area" style="position: relative; margin-top: 14px;">
          <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Real Reading Accuracy Chart">
            <defs>
              <linearGradient id="chartGradientFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stop-color="#45ad88" stop-opacity="${summary.isEmpty ? '0.05' : '0.28'}"/>
                <stop offset="1" stop-color="#45ad88" stop-opacity="0"/>
              </linearGradient>
            </defs>

            <!-- Background Dashed Gridlines -->
            <g stroke="#eef0ec" stroke-dasharray="3 5">
              <path d="M0 30H600"/>
              <path d="M0 72H600"/>
              <path d="M0 114H600"/>
              <path d="M0 156H600"/>
            </g>

            <!-- Goal Line (80%) -->
            <path d="M0 ${summary.goalY} H600" stroke="#f6c85f" stroke-dasharray="4 4" stroke-width="1.5" opacity="0.85"/>

            <!-- Gradient Area Fill under Curve -->
            <path d="${summary.svgFillD}" fill="url(#chartGradientFill)"/>

            <!-- Real Data Line (Green) -->
            <path
              d="${summary.svgPathD}"
              fill="none"
              stroke="#168b78"
              stroke-width="${summary.isEmpty ? '2' : '3.5'}"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-dasharray="${summary.isEmpty ? '5 5' : 'none'}"
              opacity="${summary.isEmpty ? '0.6' : '1'}"
            />

            <!-- Plotted Circles with Interactive Attributes -->
            ${summary.points
              .map(
                (p, idx) => `
              <circle
                cx="${p.cx}"
                cy="${p.cy}"
                r="6"
                fill="#ffffff"
                stroke="#168b78"
                stroke-width="3"
                class="chart-point-circle"
                data-idx="${idx}"
                data-date="${p.point.displayDate}"
                data-accuracy="${p.point.accuracyPercent}"
                data-questions="${p.point.correctAnswers}/${p.point.totalQuestions}"
                data-title="${p.point.activityTitle}"
                style="cursor: pointer; transition: transform 0.15s ease;"
              />
            `
              )
              .join('')}
          </svg>

          <!-- Empty State Overlay Banner -->
          ${
            summary.isEmpty
              ? `
            <div
              class="chart-empty-state-overlay"
              style="
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.72);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
              "
            >
              <div style="font-size: 26px; margin-bottom: 4px;">🌱</div>
              <strong style="font: 800 14px Nunito; color: var(--ink);">
                ${summary.emptyMessage}
              </strong>
              <small style="font-size: 11px; color: var(--muted); margin-top: 2px;">
                Play your recommended game above to see your real reading accuracy plotted here!
              </small>
            </div>
          `
              : ''
          }

          <!-- Floating Interactive Tooltip -->
          <div
            id="chartPointTooltip"
            class="hidden"
            style="
              position: absolute;
              background: #1e293b;
              color: #ffffff;
              padding: 6px 10px;
              border-radius: 8px;
              font-size: 11px;
              pointer-events: none;
              box-shadow: 0 4px 12px rgba(0,0,0,0.18);
              z-index: 10;
              white-space: nowrap;
            "
          ></div>
        </div>

        <!-- X-Axis Labels -->
        <div class="chart-labels" style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: #7f8b8f;">
          ${summary.xLabels.map(l => `<span>${l}</span>`).join('')}
        </div>

        <!-- Legend and Summary Stats -->
        <div class="legend" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--line);">
          <div style="display: flex; gap: 14px; flex-wrap: wrap;">
            <span><i style="background: #168b78;"></i> Reading accuracy (${accuracyBadge})</span>
            <span><i style="background: #f6c85f; border-radius: 2px;"></i> Target goal: 80%</span>
          </div>
          <div style="font-size: 11px; color: var(--muted); font-weight: 700;">
            ${summary.totalSessions > 0 ? `${summary.totalSessions} session${summary.totalSessions > 1 ? 's' : ''} recorded` : '0 sessions'}
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const select = this.container.querySelector('.chart-time-select') as HTMLSelectElement | null;
    select?.addEventListener('change', async () => {
      const val = select.value as 'week' | 'month' | 'all';
      await this.render(val);
    });

    const tooltip = this.container.querySelector('#chartPointTooltip') as HTMLElement | null;
    const circles = this.container.querySelectorAll('.chart-point-circle');

    circles.forEach(circle => {
      const showTooltip = () => {
        if (!tooltip) return;
        const target = circle as HTMLElement;
        const date = target.dataset.date || '';
        const acc = target.dataset.accuracy || '';
        const q = target.dataset.questions || '';
        const title = target.dataset.title || '';

        tooltip.innerHTML = `
          <strong>${acc}% Accuracy</strong> (${q} correct)<br>
          <span style="color:#94a3b8;">${title} · ${date}</span>
        `;
        tooltip.classList.remove('hidden');

        const rect = target.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        tooltip.style.left = `${rect.left - containerRect.left - 20}px`;
        tooltip.style.top = `${rect.top - containerRect.top - 40}px`;
      };

      circle.addEventListener('mouseenter', showTooltip as EventListener);
      circle.addEventListener('touchstart', showTooltip as EventListener);

      circle.addEventListener('mouseleave', () => {
        tooltip?.classList.add('hidden');
      });
    });
  }
}
