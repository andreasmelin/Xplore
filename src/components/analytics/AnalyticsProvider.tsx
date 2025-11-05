'use client';

import { useEffect } from 'react';
import { useAnalyticsInit } from '@/lib/analytics/hooks';

interface AnalyticsProviderProps {
  profileId?: string | null;
  children: React.ReactNode;
}

/**
 * Analytics Provider component
 * Initialize once at the app level with the active profile ID
 */
export default function AnalyticsProvider({ profileId, children }: AnalyticsProviderProps) {
  useAnalyticsInit(profileId);

  return <>{children}</>;
}
