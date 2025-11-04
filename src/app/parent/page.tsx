"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

type DashboardData = {
  profile: Profile;
  summary: {
    totalTime: number;
    totalActivities: number;
    uniqueLetters: number;
    uniqueTopics: number;
    totalMath: number;
    totalChat: number;
    averageScore: number | null;
    daysActive: number;
    averageTimePerDay: number;
    currentStreak: number;
  };
  dailyStats: Array<{
    date: string;
    total_time_seconds: number;
    activities_completed: number;
    letters_practiced: string[];
    topics_explored: string[];
  }>;
  recentActivities: Array<{
    id: string;
    activity_type: string;
    activity_name: string;
    created_at: string;
    duration_seconds: number;
    completed: boolean;
    score: number | null;
  }>;
};

export default function ParentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [timeRange, setTimeRange] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const [meRes, profilesRes, limitsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/profiles"),
          fetch("/api/limits/daily"),
        ]);

        const meJson = await meRes.json().catch(() => ({}));
        const me = meJson?.user ?? null;
        setUser(me);

        if (!me) {
          setLoginOpen(true);
          setLoading(false);
          return;
        }

        const profilesJson = await profilesRes.json().catch(() => ({}));
        const list: Profile[] = profilesJson?.profiles ?? [];
        setProfiles(list);

        const stored = typeof window !== "undefined" ? window.localStorage.getItem("activeProfileId") : null;
        const selectedProfile = stored && list.some((p) => p.id === stored) ? stored : list[0]?.id;
        
        if (selectedProfile) {
          setActiveProfileId(selectedProfile);
        }

        const limitsJson = await limitsRes.json().catch(() => ({}));
        if (limitsJson?.status) setQuota(limitsJson.status);
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    if (activeProfileId) {
      loadDashboardData();
    }
  }, [activeProfileId, timeRange]);

  async function loadDashboardData() {
    if (!activeProfileId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/parent/dashboard?profileId=${activeProfileId}&days=${timeRange}`
      );

      if (!response.ok) {
        throw new Error("Failed to load dashboard");
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleLoginSuccess(newUser: User) {
    setUser(newUser);
    setLoginOpen(false);
    window.location.reload();
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds} sek`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getActivityIcon(type: string): string {
    switch (type) {
      case 'letter': return '✍️';
      case 'math': return '🔢';
      case 'explore': return '🔍';
      case 'chat': return '💬';
      default: return '📚';
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <p className="text-xl text-white">Laddar statistik...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex flex-col relative">
        <AppHeader
          user={user}
          profiles={profiles}
          activeProfileId={activeProfileId}
          quota={quota}
          onProfileChange={setActiveProfileId}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenAddProfile={() => {}}
          onOpenParentDashboard={() => {}}
          isLoading={isLoading}
        />

        <main className="flex-1 px-4 py-8 pt-24">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-4xl font-bold text-white">
                  📊 Framstegsrapport
                </h1>

                {/* Time range selector */}
                <div className="flex gap-2">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setTimeRange(days)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        timeRange === days
                          ? "bg-white text-indigo-600 shadow-lg"
                          : "bg-white/10 text-white hover:bg-white/20"
                      }`}
                    >
                      {days} dagar
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Profile selector */}
            {profiles.length === 0 ? (
              <div className="mb-8 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
                <div className="text-6xl mb-4">👶</div>
                <h2 className="text-2xl font-bold text-white mb-2">Ingen barnprofil ännu</h2>
                <p className="text-white/80 mb-6">
                  Skapa en profil för ditt barn för att börja följa deras framsteg
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Gå till startsidan och skapa profil
                </button>
              </div>
            ) : (
              <div className="mb-8">
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Välj barnprofil:
                </label>
                <div className="flex gap-3 flex-wrap">
                  {profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setActiveProfileId(profile.id)}
                      className={`px-6 py-3 rounded-xl font-medium transition-all ${
                        activeProfileId === profile.id
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                          : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
                      }`}
                    >
                      {profile.name} ({profile.age} år)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dashboardData ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-4xl mb-2">⏱️</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {formatDuration(dashboardData.summary.totalTime)}
                    </div>
                    <div className="text-sm text-indigo-100/70">Total tid</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {dashboardData.summary.totalActivities}
                    </div>
                    <div className="text-sm text-indigo-100/70">Aktiviteter</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-4xl mb-2">🔥</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {dashboardData.summary.currentStreak}
                    </div>
                    <div className="text-sm text-indigo-100/70">Dagars streak</div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="text-4xl mb-2">📈</div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {dashboardData.summary.daysActive}/{timeRange}
                    </div>
                    <div className="text-sm text-indigo-100/70">Aktiva dagar</div>
                  </div>
                </div>

                {/* Skills progress */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">✍️</span>
                        <div>
                          <div className="font-bold text-white">Bokstäver</div>
                          <div className="text-sm text-indigo-100/70">
                            {dashboardData.summary.uniqueLetters}/29 tränade
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-red-500 h-full rounded-full transition-all"
                        style={{ width: `${(dashboardData.summary.uniqueLetters / 29) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🔢</span>
                        <div>
                          <div className="font-bold text-white">Matematik</div>
                          <div className="text-sm text-indigo-100/70">
                            {dashboardData.summary.totalMath} aktiviteter
                          </div>
                        </div>
                      </div>
                    </div>
                    {dashboardData.summary.averageScore && (
                      <div className="text-2xl font-bold text-white">
                        {Math.round(dashboardData.summary.averageScore)}% rätt
                      </div>
                    )}
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🔍</span>
                        <div>
                          <div className="font-bold text-white">Utforskande</div>
                          <div className="text-sm text-indigo-100/70">
                            {dashboardData.summary.uniqueTopics} ämnen
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      {dashboardData.summary.totalChat} meddelanden till Sinus
                    </div>
                  </div>
                </div>

                {/* Activity chart */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
                  <h3 className="text-xl font-bold text-white mb-6">Aktivitet över tid</h3>
                  
                  <div className="h-48 flex items-end justify-between gap-2">
                    {dashboardData.dailyStats.map((day, i) => {
                      const maxTime = Math.max(...dashboardData.dailyStats.map(d => d.total_time_seconds));
                      const height = maxTime > 0 ? (day.total_time_seconds / maxTime) * 100 : 0;
                      
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div
                            className="w-full bg-gradient-to-t from-cyan-500 to-blue-600 rounded-t-lg transition-all hover:from-cyan-400 hover:to-blue-500 cursor-pointer relative group"
                            style={{ height: `${Math.max(height, 2)}%` }}
                          >
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              {formatDuration(day.total_time_seconds)}
                              <br />
                              {day.activities_completed} aktiviteter
                            </div>
                          </div>
                          <div className="text-xs text-indigo-100/70">
                            {formatDate(day.date)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent activities */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-6">Senaste aktiviteter</h3>
                  
                  <div className="space-y-3">
                    {dashboardData.recentActivities.length > 0 ? (
                      dashboardData.recentActivities.slice(0, 10).map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{getActivityIcon(activity.activity_type)}</span>
                            <div>
                              <div className="font-medium text-white">
                                {activity.activity_name || 'Aktivitet'}
                              </div>
                              <div className="text-sm text-indigo-100/60">
                                {formatDateTime(activity.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {activity.duration_seconds > 0 && (
                              <div className="text-sm text-indigo-100/70">
                                {formatDuration(activity.duration_seconds)}
                              </div>
                            )}
                            {activity.completed && (
                              <span className="text-green-400 text-sm">✓ Klar</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-indigo-100/60">
                        <div className="text-6xl mb-4">📚</div>
                        <p>Inga aktiviteter ännu. Börja lära!</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : profiles.length > 0 && activeProfileId ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-2xl font-bold text-white mb-2">Inga aktiviteter ännu</h2>
                <p className="text-white/80 mb-6">
                  {profiles.find(p => p.id === activeProfileId)?.name} har inte gjort några aktiviteter än.
                  <br />
                  Låt barnet börja med att öva på bokstäver, matematik eller utforska nya ämnen!
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Börja lära
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
