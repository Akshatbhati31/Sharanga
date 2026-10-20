import { LearningPathService } from './learningPathService';
import type { LearningAttempt } from '../types/adaptive';

export interface ChartDataPoint {
  date: string;
  displayDate: string;
  dayLabel: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercent: number;
  sessionCount: number;
  activityTitle: string;
}

export interface ReadingChartSummary {
  timeRange: 'week' | 'month' | 'all';
  dataPoints: ChartDataPoint[];
  overallAccuracy: number | null;
  totalSessions: number;
  totalAttempts: number;
  trend: 'flat' | 'improving' | 'declining' | 'none';
  goalPercent: number;
  isEmpty: boolean;
  emptyMessage: string;
  svgPathD: string;
  svgFillD: string;
  goalY: number;
  points: { cx: number; cy: number; point: ChartDataPoint }[];
  xLabels: string[];
}

export class ReadingChartService {
  private static instance: ReadingChartService;
  private learningPathService: LearningPathService;

  private constructor() {
    this.learningPathService = LearningPathService.getInstance();
  }

  public static getInstance(): ReadingChartService {
    if (!ReadingChartService.instance) {
      ReadingChartService.instance = new ReadingChartService();
    }
    return ReadingChartService.instance;
  }

  /**
   * Generates a data-driven reading accuracy chart summary.
   * Never fabricates upward curves or invent historical data points.
   */
  public async getChartSummary(
    childId: string,
    timeRange: 'week' | 'month' | 'all' = 'week'
  ): Promise<ReadingChartSummary> {
    const allAttempts = await this.learningPathService.getChildAttempts(childId);

    // 1. Filter by time range
    const now = Date.now();
    const filteredAttempts = allAttempts.filter(attempt => {
      const attemptTime = new Date(attempt.completedAt).getTime();
      if (isNaN(attemptTime)) return false;

      if (timeRange === 'week') {
        return attemptTime >= now - 7 * 24 * 60 * 60 * 1000;
      }
      if (timeRange === 'month') {
        return attemptTime >= now - 30 * 24 * 60 * 60 * 1000;
      }
      return true; // 'all'
    });

    const goalPercent = 80;
    const goalY = Math.round(156 - goalPercent * 1.32);

    // 2. Empty State: 0 attempts recorded
    if (filteredAttempts.length === 0) {
      return {
        timeRange,
        dataPoints: [],
        overallAccuracy: null, // Clearly null, never 0% as a fake score
        totalSessions: 0,
        totalAttempts: 0,
        trend: 'none',
        goalPercent,
        isEmpty: true,
        emptyMessage: 'Complete your first activity to start your learning journey. 🌱',
        svgPathD: 'M0 156 L600 156', // Flat baseline at the bottom
        svgFillD: 'M0 156 L600 156 L600 180 L0 180 Z',
        goalY,
        points: [],
        xLabels: timeRange === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      };
    }

    // 3. Build genuine data points from real recorded attempts
    // Sort chronologically
    const sorted = [...filteredAttempts].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    );

    // Group attempts into sessions / timestamps
    const dataPoints: ChartDataPoint[] = [];

    // If small number of attempts (<= 12), show per attempt
    // If more, group by calendar date (YYYY-MM-DD)
    if (sorted.length <= 12) {
      sorted.forEach((att, idx) => {
        const d = new Date(att.completedAt);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayLabel = dayNames[d.getDay()] || `A${idx + 1}`;
        const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const accuracyPercent = Math.max(0, Math.min(100, Math.round(att.accuracy * 100)));

        dataPoints.push({
          date: att.completedAt,
          displayDate,
          dayLabel,
          totalQuestions: att.totalQuestions || 1,
          correctAnswers: att.correctAnswers !== undefined ? att.correctAnswers : (accuracyPercent >= 70 ? 1 : 0),
          accuracyPercent,
          sessionCount: 1,
          activityTitle: att.activityId.replace('act_', '').replace(/_/g, ' ') || 'Practice',
        });
      });
    } else {
      // Group by calendar day
      const dayMap = new Map<string, LearningAttempt[]>();
      sorted.forEach(att => {
        const dateKey = att.completedAt.split('T')[0] || 'today';
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, []);
        }
        dayMap.get(dateKey)!.push(att);
      });

      dayMap.forEach((attempts, dateKey) => {
        const d = new Date(dateKey);
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayLabel = dayNames[d.getDay()] || dateKey.slice(-5);
        const displayDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        let totalQ = 0;
        let totalC = 0;
        attempts.forEach(a => {
          const q = a.totalQuestions || 1;
          const c = a.correctAnswers !== undefined ? a.correctAnswers : Math.round(a.accuracy * q);
          totalQ += q;
          totalC += c;
        });

        const accuracyPercent = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
        dataPoints.push({
          date: dateKey,
          displayDate,
          dayLabel,
          totalQuestions: totalQ,
          correctAnswers: totalC,
          accuracyPercent,
          sessionCount: attempts.length,
          activityTitle: `${attempts.length} practice session${attempts.length > 1 ? 's' : ''}`,
        });
      });
    }

    // 4. Calculate overall weighted accuracy: total correct / total attempted * 100
    let grandTotalQuestions = 0;
    let grandTotalCorrect = 0;
    dataPoints.forEach(p => {
      grandTotalQuestions += p.totalQuestions;
      grandTotalCorrect += p.correctAnswers;
    });

    const overallAccuracy = grandTotalQuestions > 0
      ? Math.round((grandTotalCorrect / grandTotalQuestions) * 100)
      : Math.round(dataPoints.reduce((acc, p) => acc + p.accuracyPercent, 0) / dataPoints.length);

    // 5. Calculate honest trend
    let trend: 'flat' | 'improving' | 'declining' | 'none' = 'flat';
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].accuracyPercent;
      const last = dataPoints[dataPoints.length - 1].accuracyPercent;
      if (last > first + 3) trend = 'improving';
      else if (last < first - 3) trend = 'declining';
      else trend = 'flat';
    }

    // 6. Map coordinates to SVG ViewBox (600 width, 180 height)
    // 0% accuracy maps to y = 156 (bottom gridline)
    // 100% accuracy maps to y = 24 (top gridline)
    // Formula: y = 156 - (accuracy / 100) * 132
    const N = dataPoints.length;
    const points: { cx: number; cy: number; point: ChartDataPoint }[] = [];
    const xLabels: string[] = [];

    if (N === 1) {
      // Exactly 1 real attempt: draw a clean horizontal baseline at this accuracy
      const y = Math.round(156 - (dataPoints[0].accuracyPercent / 100) * 132);
      points.push({ cx: 300, cy: y, point: dataPoints[0] });
      xLabels.push(dataPoints[0].dayLabel);

      return {
        timeRange,
        dataPoints,
        overallAccuracy,
        totalSessions: filteredAttempts.length,
        totalAttempts: filteredAttempts.length,
        trend,
        goalPercent,
        isEmpty: false,
        emptyMessage: '',
        svgPathD: `M0 ${y} L600 ${y}`,
        svgFillD: `M0 ${y} L600 ${y} L600 180 L0 180 Z`,
        goalY,
        points,
        xLabels,
      };
    }

    // Multiple points (N >= 2)
    // Spread evenly across width: margin 40px to 560px
    const startX = 40;
    const endX = 560;
    const stepX = (endX - startX) / (N - 1);

    for (let i = 0; i < N; i++) {
      const cx = Math.round(startX + i * stepX);
      const cy = Math.round(156 - (dataPoints[i].accuracyPercent / 100) * 132);
      points.push({ cx, cy, point: dataPoints[i] });
      xLabels.push(dataPoints[i].dayLabel);
    }

    // Build SVG path
    // If all points have identical accuracy, render a completely flat straight line!
    const allSame = points.every(p => p.cy === points[0].cy);
    let svgPathD = '';

    if (allSame) {
      const y = points[0].cy;
      svgPathD = `M0 ${y} L600 ${y}`;
    } else {
      svgPathD = `M${points[0].cx} ${points[0].cy}`;
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midX = Math.round((prev.cx + curr.cx) / 2);
        // Smooth cubic bezier through actual coordinates
        svgPathD += ` C${midX} ${prev.cy}, ${midX} ${curr.cy}, ${curr.cx} ${curr.cy}`;
      }
    }

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const svgFillD = `${svgPathD} L${lastPt.cx} 180 L${firstPt.cx} 180 Z`;

    return {
      timeRange,
      dataPoints,
      overallAccuracy,
      totalSessions: filteredAttempts.length,
      totalAttempts: filteredAttempts.length,
      trend,
      goalPercent,
      isEmpty: false,
      emptyMessage: '',
      svgPathD,
      svgFillD,
      goalY,
      points,
      xLabels,
    };
  }
}
