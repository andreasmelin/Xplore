// React hooks for analytics tracking
'use client';

import { useEffect, useRef } from 'react';
import { analytics, EventCategory } from './tracker';

/**
 * Hook to track page views automatically
 * Use in page components to track navigation
 */
export function usePageTracking(pageName: string, category: EventCategory = 'navigation') {
  useEffect(() => {
    analytics.trackPageView(pageName, category);
  }, [pageName, category]);
}

/**
 * Hook to track feature usage with automatic start/complete/abandon
 * Returns functions to manually trigger complete or abandon
 */
export function useFeatureTracking(
  featureName: string,
  category: EventCategory = 'learning',
  autoStart: boolean = true
) {
  const startTimeRef = useRef<number>(0);
  const hasStartedRef = useRef<boolean>(false);

  useEffect(() => {
    if (autoStart && !hasStartedRef.current) {
      analytics.trackFeatureStart(featureName, category);
      startTimeRef.current = Date.now();
      hasStartedRef.current = true;
    }

    // Track abandon on unmount if not completed
    return () => {
      if (hasStartedRef.current) {
        const duration = Date.now() - startTimeRef.current;
        analytics.trackFeatureAbandon(featureName, duration, category);
      }
    };
  }, [featureName, category, autoStart]);

  const trackComplete = (properties?: Record<string, any>) => {
    if (hasStartedRef.current) {
      const duration = Date.now() - startTimeRef.current;
      analytics.trackFeatureComplete(featureName, duration, category, properties);
      hasStartedRef.current = false; // Prevent abandon on unmount
    }
  };

  const trackStart = (properties?: Record<string, any>) => {
    if (!hasStartedRef.current) {
      analytics.trackFeatureStart(featureName, category, properties);
      startTimeRef.current = Date.now();
      hasStartedRef.current = true;
    }
  };

  const trackAbandon = (properties?: Record<string, any>) => {
    if (hasStartedRef.current) {
      const duration = Date.now() - startTimeRef.current;
      analytics.trackFeatureAbandon(featureName, duration, category, properties);
      hasStartedRef.current = false;
    }
  };

  return { trackComplete, trackStart, trackAbandon };
}

/**
 * Hook to track clicks on elements
 */
export function useClickTracking() {
  const trackClick = (elementName: string, category: EventCategory = 'interaction', properties?: Record<string, any>) => {
    analytics.trackClick(elementName, category, properties);
  };

  return { trackClick };
}

/**
 * Hook to initialize analytics tracking for a profile
 * Use this once in your root layout or app component
 */
export function useAnalyticsInit(profileId: string | null | undefined) {
  useEffect(() => {
    if (profileId) {
      analytics.init(profileId);
    }

    return () => {
      if (profileId) {
        analytics.stop();
      }
    };
  }, [profileId]);
}
