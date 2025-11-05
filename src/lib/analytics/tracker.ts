// Client-side analytics tracker
// Tracks user behavior, feature usage, and engagement

export type EventType =
  | 'page_view'
  | 'feature_start'
  | 'feature_complete'
  | 'feature_abandon'
  | 'click'
  | 'session_start'
  | 'session_end';

export type EventCategory =
  | 'navigation'
  | 'learning'
  | 'interaction'
  | 'system';

export interface AnalyticsEvent {
  profileId: string;
  sessionId: string;
  eventType: EventType;
  eventName: string;
  eventCategory?: EventCategory;
  properties?: Record<string, unknown>;
  durationMs?: number;
  referrer?: string;
}

class AnalyticsTracker {
  private sessionId: string;
  private profileId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isTracking = false;
  private sessionStartTime: number;
  private lastActivityTime: number;
  private currentPage: string = '';
  private pageStartTime: number = 0;
  private flushInterval: NodeJS.Timeout | null = null;

  // Session timeout: 30 minutes of inactivity
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  // Flush events every 10 seconds
  private readonly FLUSH_INTERVAL_MS = 10 * 1000;

  // Max queue size before forcing flush
  private readonly MAX_QUEUE_SIZE = 20;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();

    if (typeof window !== 'undefined') {
      this.setupListeners();
      this.startFlushTimer();
    }
  }

  // Initialize tracking for a profile
  init(profileId: string) {
    this.profileId = profileId;
    this.isTracking = true;

    // Track session start
    this.trackEvent({
      eventType: 'session_start',
      eventName: 'session_start',
      eventCategory: 'system',
      properties: {
        userAgent: navigator.userAgent,
      },
    });
  }

  // Stop tracking
  stop() {
    this.isTracking = false;
    this.trackSessionEnd();
    this.flush();

    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  // Track a custom event
  trackEvent(event: Omit<AnalyticsEvent, 'profileId' | 'sessionId'>) {
    if (!this.isTracking || !this.profileId) {
      return;
    }

    this.updateActivity();

    const fullEvent: AnalyticsEvent = {
      ...event,
      profileId: this.profileId,
      sessionId: this.sessionId,
      referrer: this.currentPage,
    };

    this.eventQueue.push(fullEvent);

    // Flush if queue is getting large
    if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
      this.flush();
    }
  }

  // Track page view (call this on route changes)
  trackPageView(pageName: string, category: EventCategory = 'navigation') {
    // Track time spent on previous page
    if (this.currentPage && this.pageStartTime > 0) {
      const timeSpent = Date.now() - this.pageStartTime;
      this.trackEvent({
        eventType: 'page_view',
        eventName: this.currentPage,
        eventCategory: 'navigation',
        durationMs: timeSpent,
      });
    }

    // Update current page
    this.currentPage = pageName;
    this.pageStartTime = Date.now();

    // Track new page view
    this.trackEvent({
      eventType: 'page_view',
      eventName: pageName,
      eventCategory: category,
    });
  }

  // Track feature start
  trackFeatureStart(featureName: string, category: EventCategory = 'learning', properties?: Record<string, unknown>) {
    this.trackEvent({
      eventType: 'feature_start',
      eventName: featureName,
      eventCategory: category,
      properties,
    });
  }

  // Track feature completion
  trackFeatureComplete(featureName: string, durationMs: number, category: EventCategory = 'learning', properties?: Record<string, unknown>) {
    this.trackEvent({
      eventType: 'feature_complete',
      eventName: featureName,
      eventCategory: category,
      durationMs,
      properties,
    });
  }

  // Track feature abandonment
  trackFeatureAbandon(featureName: string, durationMs: number, category: EventCategory = 'learning', properties?: Record<string, unknown>) {
    this.trackEvent({
      eventType: 'feature_abandon',
      eventName: featureName,
      eventCategory: category,
      durationMs,
      properties,
    });
  }

  // Track a click/interaction
  trackClick(elementName: string, category: EventCategory = 'interaction', properties?: Record<string, unknown>) {
    this.trackEvent({
      eventType: 'click',
      eventName: elementName,
      eventCategory: category,
      properties,
    });
  }

  // Update last activity time and check for session timeout
  private updateActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    // If inactive for too long, start a new session
    if (timeSinceLastActivity > this.SESSION_TIMEOUT_MS) {
      this.trackSessionEnd();
      this.flush();
      this.startNewSession();
    }

    this.lastActivityTime = now;
  }

  // Start a new session
  private startNewSession() {
    this.sessionId = crypto.randomUUID();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('analytics_session_id', this.sessionId);
    }

    // Track new session start
    if (this.profileId) {
      this.trackEvent({
        eventType: 'session_start',
        eventName: 'session_start',
        eventCategory: 'system',
        properties: {
          userAgent: navigator.userAgent,
        },
      });
    }
  }

  // Track session end
  private trackSessionEnd() {
    if (!this.profileId) return;

    const sessionDuration = Date.now() - this.sessionStartTime;

    this.trackEvent({
      eventType: 'session_end',
      eventName: 'session_end',
      eventCategory: 'system',
      durationMs: sessionDuration,
      properties: {
        totalEvents: this.eventQueue.length,
      },
    });
  }

  // Get or create session ID from sessionStorage
  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return crypto.randomUUID();
    }

    let sessionId = sessionStorage.getItem('analytics_session_id');

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('analytics_session_id', sessionId);
    }

    return sessionId;
  }

  // Setup browser event listeners
  private setupListeners() {
    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
      this.flush();
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      } else {
        this.updateActivity();
      }
    });

    // Track activity to reset timeout
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.updateActivity();
      }, { passive: true });
    });
  }

  // Start periodic flush timer
  private startFlushTimer() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  // Flush queued events to server
  private async flush() {
    if (this.eventQueue.length === 0) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        console.error('Failed to send analytics:', response.statusText);
        // Could implement retry logic here
      }
    } catch (error) {
      console.error('Failed to send analytics:', error);
      // Don't throw - analytics shouldn't break the app
    }
  }
}

// Singleton instance
let trackerInstance: AnalyticsTracker | null = null;

export function getAnalyticsTracker(): AnalyticsTracker {
  if (typeof window === 'undefined') {
    // Return a no-op tracker for SSR
    return {
      init: () => {},
      stop: () => {},
      trackEvent: () => {},
      trackPageView: () => {},
      trackFeatureStart: () => {},
      trackFeatureComplete: () => {},
      trackFeatureAbandon: () => {},
      trackClick: () => {},
    } as unknown as AnalyticsTracker;
  }

  if (!trackerInstance) {
    trackerInstance = new AnalyticsTracker();
  }

  return trackerInstance;
}

// Helper function to track feature usage
export function useFeatureTracker(featureName: string, category: EventCategory = 'learning') {
  const tracker = getAnalyticsTracker();
  const startTime = Date.now();

  const start = (properties?: Record<string, unknown>) => {
    tracker.trackFeatureStart(featureName, category, properties);
  };

  const complete = (properties?: Record<string, unknown>) => {
    const duration = Date.now() - startTime;
    tracker.trackFeatureComplete(featureName, duration, category, properties);
  };

  const abandon = (properties?: Record<string, unknown>) => {
    const duration = Date.now() - startTime;
    tracker.trackFeatureAbandon(featureName, duration, category, properties);
  };

  return { start, complete, abandon };
}

// Export convenience function
export const analytics = {
  init: (profileId: string) => getAnalyticsTracker().init(profileId),
  stop: () => getAnalyticsTracker().stop(),
  trackPageView: (pageName: string, category?: EventCategory) =>
    getAnalyticsTracker().trackPageView(pageName, category),
  trackFeatureStart: (name: string, category?: EventCategory, props?: Record<string, unknown>) =>
    getAnalyticsTracker().trackFeatureStart(name, category, props),
  trackFeatureComplete: (name: string, duration: number, category?: EventCategory, props?: Record<string, unknown>) =>
    getAnalyticsTracker().trackFeatureComplete(name, duration, category, props),
  trackFeatureAbandon: (name: string, duration: number, category?: EventCategory, props?: Record<string, unknown>) =>
    getAnalyticsTracker().trackFeatureAbandon(name, duration, category, props),
  trackClick: (element: string, category?: EventCategory, props?: Record<string, unknown>) =>
    getAnalyticsTracker().trackClick(element, category, props),
};
