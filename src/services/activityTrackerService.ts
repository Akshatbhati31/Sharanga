import type {
  ActivityCategory,
  ActivityLogRecord,
  ActivitySummaryReport,
} from '../types/auth';
import { StorageService } from './storageService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ActiveSession {
  parentId: string;
  childId: string;
  category: ActivityCategory;
  activityTitle: string;
  startTime: number; // ms
  lastActiveTime: number; // ms
  accumulatedSeconds: number;
  isPaused: boolean;
}

export class ActivityTrackerService {
  private static instance: ActivityTrackerService;
  private storage: StorageService;
  private currentSession: ActiveSession | null = null;
  private timerInterval: number | null = null;
  private readonly IDLE_TIMEOUT_MS = 60000; // 60s idle threshold

  private constructor() {
    this.storage = StorageService.getInstance();
    this.initBrowserListeners();
  }

  public static getInstance(): ActivityTrackerService {
    if (!ActivityTrackerService.instance) {
      ActivityTrackerService.instance = new ActivityTrackerService();
    }
    return ActivityTrackerService.instance;
  }

  private initBrowserListeners(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 1. User interaction tracking for idle detection
    const onUserActivity = () => {
      if (this.currentSession) {
        this.currentSession.lastActiveTime = Date.now();
        if (this.currentSession.isPaused && !document.hidden) {
          this.currentSession.isPaused = false;
        }
      }
    };

    window.addEventListener('mousemove', onUserActivity, { passive: true });
    window.addEventListener('keydown', onUserActivity, { passive: true });
    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('click', onUserActivity, { passive: true });

    // 2. Tab visibility changes (pause on background tabs)
    document.addEventListener('visibilitychange', () => {
      if (!this.currentSession) return;
      if (document.hidden) {
        this.currentSession.isPaused = true;
      } else {
        this.currentSession.lastActiveTime = Date.now();
        this.currentSession.isPaused = false;
      }
    });

    // 3. Page unload flush
    window.addEventListener('beforeunload', () => {
      this.stopActivity();
    });
    window.addEventListener('pagehide', () => {
      this.stopActivity();
    });

    // 4. Heartbeat timer (1s interval)
    this.timerInterval = window.setInterval(() => {
      if (!this.currentSession) return;

      const now = Date.now();
      const isIdle = now - this.currentSession.lastActiveTime > this.IDLE_TIMEOUT_MS;

      if (!this.currentSession.isPaused && !isIdle && !document.hidden) {
        this.currentSession.accumulatedSeconds += 1;
      }
    }, 1000);
  }

  public destroy(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // -------------------------------------------------------------
  // Session Start / Stop
  // -------------------------------------------------------------
  public startActivity(
    parentId: string,
    childId: string,
    category: ActivityCategory,
    activityTitle: string
  ): void {
    // If an activity was already active, save it first to avoid double-counting
    if (this.currentSession) {
      if (
        this.currentSession.childId === childId &&
        this.currentSession.activityTitle === activityTitle
      ) {
        // Same activity already running
        return;
      }
      this.stopActivity();
    }

    const now = Date.now();
    this.currentSession = {
      parentId,
      childId,
      category,
      activityTitle,
      startTime: now,
      lastActiveTime: now,
      accumulatedSeconds: 0,
      isPaused: false,
    };
  }

  public stopActivity(): void {
    if (!this.currentSession) return;

    const { parentId, childId, category, activityTitle, startTime, accumulatedSeconds } =
      this.currentSession;
    this.currentSession = null;

    // Only record sessions that lasted at least 3 seconds
    if (accumulatedSeconds >= 3) {
      const now = new Date();
      const startDate = new Date(startTime);

      const record: ActivityLogRecord = {
        id: 'act-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
        parentId,
        childId,
        category,
        activityTitle,
        startTime: startDate.toISOString(),
        endTime: now.toISOString(),
        durationSeconds: accumulatedSeconds,
      };

      this.storage.saveActivity(record);

      // Persist practice session to Supabase if live
      const sb = supabase;
      if (
        isSupabaseConfigured() &&
        sb &&
        !parentId.startsWith('parent-demo-') &&
        !childId.startsWith('child-demo-')
      ) {
        Promise.resolve(
          sb.from('practice_sessions').insert({
            child_id: childId,
            parent_id: parentId,
            session_name: activityTitle,
            started_at: startDate.toISOString(),
            ended_at: now.toISOString(),
            duration_seconds: accumulatedSeconds,
            outcome: {
              category,
              recordedAt: now.toISOString(),
            },
          })
        )
          .then(res => {
            if (res.error) {
              console.warn('Failed to persist practice session to Supabase:', res.error.message);
            }
          })
          .catch((err: unknown) => {
            console.warn('Exception persisting practice session to Supabase:', err);
          });
      }
    }
  }

  public getActiveSession(): ActiveSession | null {
    return this.currentSession;
  }

  public async syncSessionsFromDatabase(childId: string): Promise<void> {
    const sb = supabase;
    if (
      !isSupabaseConfigured() ||
      !sb ||
      childId.startsWith('child-demo-') ||
      childId.startsWith('child-aanya') ||
      childId.startsWith('child-kabir')
    ) {
      return;
    }

    try {
      const { data, error } = await sb
        .from('practice_sessions')
        .select('*')
        .eq('child_id', childId)
        .order('started_at', { ascending: false });

      if (error || !data) return;

      data.forEach(row => {
        const outcome = row.outcome || {};
        const record: ActivityLogRecord = {
          id: row.id,
          parentId: row.parent_id,
          childId: row.child_id,
          category: (outcome.category as ActivityCategory) || 'practice_game',
          activityTitle: row.session_name,
          startTime: row.started_at,
          endTime: row.ended_at || row.started_at,
          durationSeconds: row.duration_seconds || 0,
        };
        this.storage.saveActivity(record);
      });
    } catch (err) {
      console.warn('Failed to sync practice sessions from database:', err);
    }
  }

  // -------------------------------------------------------------
  // Activity Analytics & Summaries
  // -------------------------------------------------------------
  public getSummary(
    childId: string,
    childName: string,
    period: 'today' | '7days' | '30days'
  ): ActivitySummaryReport {
    const allRecords = this.storage.getActivitiesForChild(childId);
    const now = new Date();

    // Determine start boundary for filter
    let startThresholdMs: number;
    if (period === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startThresholdMs = startOfToday.getTime();
    } else if (period === '7days') {
      startThresholdMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else {
      // 30 days
      startThresholdMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    const filtered = allRecords.filter(r => {
      const recordTime = new Date(r.startTime).getTime();
      return recordTime >= startThresholdMs && recordTime <= now.getTime();
    });

    const categoryBreakdown: Record<ActivityCategory, { seconds: number; sessions: number }> = {
      practice_game: { seconds: 0, sessions: 0 },
      voice_spelling: { seconds: 0, sessions: 0 },
      story_reading: { seconds: 0, sessions: 0 },
      letter_mirror: { seconds: 0, sessions: 0 },
      general_learning: { seconds: 0, sessions: 0 },
    };

    let totalActiveSeconds = 0;
    const activityCountMap: Record<string, number> = {};
    let lastActivityTime: string | null = null;

    filtered.forEach(record => {
      totalActiveSeconds += record.durationSeconds;

      if (!categoryBreakdown[record.category]) {
        categoryBreakdown[record.category] = { seconds: 0, sessions: 0 };
      }
      categoryBreakdown[record.category].seconds += record.durationSeconds;
      categoryBreakdown[record.category].sessions += 1;

      activityCountMap[record.activityTitle] =
        (activityCountMap[record.activityTitle] || 0) + record.durationSeconds;

      if (!lastActivityTime || new Date(record.endTime) > new Date(lastActivityTime)) {
        lastActivityTime = record.endTime;
      }
    });

    // Determine most used activity
    let mostUsedActivity = 'None yet';
    let maxSeconds = 0;
    for (const [title, secs] of Object.entries(activityCountMap)) {
      if (secs > maxSeconds) {
        maxSeconds = secs;
        mostUsedActivity = title;
      }
    }

    const totalSessions = filtered.length;
    const averageSessionSeconds =
      totalSessions > 0 ? Math.round(totalActiveSeconds / totalSessions) : 0;

    // Daily breakdown for the past 7 days (or days in period)
    const dailyBreakdown: Array<{ date: string; dayLabel: string; seconds: number }> = [];
    const numDays = period === 'today' ? 1 : period === '7days' ? 7 : 14;

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel =
        period === 'today'
          ? 'Today'
          : d.toLocaleDateString('en-US', { weekday: 'short' });

      const daySeconds = filtered
        .filter(r => r.startTime.startsWith(dateStr))
        .reduce((sum, r) => sum + r.durationSeconds, 0);

      dailyBreakdown.push({
        date: dateStr,
        dayLabel,
        seconds: daySeconds,
      });
    }

    return {
      childId,
      childName,
      period,
      totalActiveSeconds,
      totalSessions,
      averageSessionSeconds,
      mostUsedActivity,
      lastActivityTime,
      categoryBreakdown,
      dailyBreakdown,
    };
  }
}
