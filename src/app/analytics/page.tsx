"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };

interface AnalyticsData {
  period: { days: number };
  totals: { events: number; sessions: number };
  top_features: Array<{
    event_name: string;
    total_uses: number;
    unique_users: number;
    avg_duration_seconds: number;
    completion_rate: number;
  }>;
  top_flows: Array<{
    from_feature: string;
    to_feature: string;
    transition_count: number;
    avg_time_between_seconds: number;
  }>;
  high_abandonment: Array<{
    event_name: string;
    started: number;
    completed: number;
    abandoned: number;
    abandonment_rate: number;
  }>;
  daily_trend: Array<{
    date: string;
    events: number;
    unique_features: number;
  }>;
}

export default function AnalyticsPage() {
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    async function init() {
      try {
        const [meRes, profilesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/profiles"),
        ]);

        const meJson = await meRes.json().catch(() => ({}));
        const me = meJson?.user ?? null;
        setUser(me);

        const profilesJson = await profilesRes.json().catch(() => ({}));
        const list: Profile[] = profilesJson?.profiles ?? [];
        setProfiles(list);

        if (!me) {
          setLoginOpen(true);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch(`/api/analytics/insights?days=${days}&format=summary`);
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    }

    if (user) {
      loadAnalytics();
    }
  }, [user, days]);

  function handleLoginSuccess(newUser: User) {
    setUser(newUser);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <p className="text-xl text-white/80">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
              <div className="text-6xl mb-4">🔐</div>
              <h3 className="text-2xl font-semibold text-white mb-3">
                Login Required
              </h3>
              <p className="text-indigo-100/80 mb-6">
                You need to be logged in to view analytics.
              </p>
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold transition-colors shadow-lg"
              >
                Login
              </button>
            </div>
          </div>
        </div>
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        user={user}
        profiles={profiles}
        activeProfileId={null}
        quota={null}
        onProfileChange={() => {}}
        onOpenLogin={() => setLoginOpen(true)}
        onOpenAddProfile={() => {}}
        onOpenParentDashboard={() => {}}
        ttsEnabled={false}
        ttsVolume={0}
        onTtsToggle={() => {}}
        onVolumeChange={() => {}}
        isLoading={false}
      />

      <main className="flex-1 px-4 py-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">📊 Analytics Dashboard</h1>
            <p className="text-indigo-100/80">
              Understand how users interact with your app
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="mb-6 flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  days === d
                    ? "bg-cyan-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          {!analytics ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-white/70">Loading analytics data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl mb-2">📝</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {analytics.totals.events.toLocaleString()}
                  </div>
                  <div className="text-indigo-100/80">Total Events</div>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl mb-2">👥</div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {analytics.totals.sessions.toLocaleString()}
                  </div>
                  <div className="text-indigo-100/80">User Sessions</div>
                </div>
              </div>

              {/* Top Features */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4">
                  🌟 Most Popular Features
                </h2>
                <div className="space-y-3">
                  {analytics.top_features.slice(0, 10).map((feature, idx) => (
                    <div
                      key={feature.event_name}
                      className="bg-white/5 rounded-lg p-4 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-bold text-cyan-400">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {feature.event_name.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm text-indigo-100/60">
                              {feature.unique_users} users • {feature.total_uses} uses
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-green-400">
                            {Math.round(feature.completion_rate || 0)}%
                          </div>
                          <div className="text-xs text-indigo-100/60">
                            completion
                          </div>
                        </div>
                      </div>
                      {feature.avg_duration_seconds > 0 && (
                        <div className="text-sm text-indigo-100/70">
                          ⏱️ Avg. {Math.round(feature.avg_duration_seconds)}s per session
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* User Flows */}
              {analytics.top_flows.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    🔀 Common User Flows
                  </h2>
                  <div className="space-y-3">
                    {analytics.top_flows.slice(0, 5).map((flow) => (
                      <div
                        key={`${flow.from_feature}-${flow.to_feature}`}
                        className="bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-white/70 font-mono text-sm">
                            {flow.from_feature.replace(/_/g, " ")}
                          </div>
                          <div className="text-2xl">→</div>
                          <div className="text-white font-mono text-sm">
                            {flow.to_feature.replace(/_/g, " ")}
                          </div>
                          <div className="ml-auto text-cyan-400 font-bold">
                            {flow.transition_count}×
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High Abandonment */}
              {analytics.high_abandonment.length > 0 && (
                <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    ⚠️ High Abandonment Features
                  </h2>
                  <p className="text-red-100/70 mb-4 text-sm">
                    These features have high abandonment rates. Consider investigating why users leave without completing.
                  </p>
                  <div className="space-y-3">
                    {analytics.high_abandonment.map((feature) => (
                      <div
                        key={feature.event_name}
                        className="bg-white/5 rounded-lg p-4 border border-red-500/20"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">
                              {feature.event_name.replace(/_/g, " ")}
                            </div>
                            <div className="text-sm text-indigo-100/60">
                              {feature.started} started • {feature.completed} completed • {feature.abandoned} abandoned
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-400">
                              {Math.round(feature.abandonment_rate)}%
                            </div>
                            <div className="text-xs text-red-300/60">
                              abandonment
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Trend */}
              {analytics.daily_trend.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    📈 Daily Activity Trend
                  </h2>
                  <div className="space-y-2">
                    {analytics.daily_trend.slice(-14).map((day) => (
                      <div
                        key={day.date}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className="text-indigo-100/70 w-24 font-mono">
                          {new Date(day.date).toLocaleDateString("sv-SE", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="flex-1 bg-white/5 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full flex items-center justify-end px-2"
                            style={{
                              width: `${Math.min(
                                100,
                                (day.events / Math.max(...analytics.daily_trend.map((d) => d.events))) * 100
                              )}%`,
                            }}
                          >
                            <span className="text-xs font-bold text-white">
                              {day.events}
                            </span>
                          </div>
                        </div>
                        <div className="text-indigo-100/60 w-32 text-right">
                          {day.unique_features} features used
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export Data */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-2xl font-bold text-white mb-4">
                  💾 Export Data for Analysis
                </h2>
                <p className="text-indigo-100/70 mb-4">
                  Export analytics data in a format optimized for AI analysis. Share the JSON with Claude to get recommendations.
                </p>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/analytics/insights?days=${days}&format=export`);
                    const data = await res.json();
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `analytics-${days}days-${new Date().toISOString().split("T")[0]}.json`;
                    a.click();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-full font-semibold transition-colors shadow-lg"
                >
                  📥 Download Analytics JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
