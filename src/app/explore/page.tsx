"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import TopicBrowser from "@/components/explore/TopicBrowser";
import LessonList from "@/components/explore/LessonList";
import LessonViewer from "@/components/explore/LessonViewer";
import { EXPLORE_TOPICS, Topic, Lesson } from "@/lib/explore/topics-data";
import { usePageTracking, useClickTracking } from "@/lib/analytics/hooks";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import { analytics } from "@/lib/analytics/tracker";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

type ViewState =
  | { type: "topics" }
  | { type: "lessons"; topic: Topic }
  | { type: "lesson"; topic: Topic; lesson: Lesson };

export default function ExplorePage() {
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: "topics" });
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Analytics tracking
  usePageTracking('explore_mode', 'navigation');
  const { trackClick } = useClickTracking();
  
  // TTS state - using global audio settings
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("globalAudioEnabled");
      return saved === null ? true : saved === "true";
    }
    return true;
  });
  const [ttsVolume, setTtsVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("globalAudioVolume");
      return saved ? parseFloat(saved) : 0.7;
    }
    return 0.7;
  });

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

        const profilesJson = await profilesRes.json().catch(() => ({}));
        const list: Profile[] = profilesJson?.profiles ?? [];
        setProfiles(list);

        const stored = typeof window !== "undefined" ? window.localStorage.getItem("activeProfileId") : null;
        if (stored && list.some((p) => p.id === stored)) {
          setActiveProfileId(stored);
        } else if (me && list.length > 0) {
          setActiveProfileId(list[0].id);
          try {
            if (typeof window !== "undefined") window.localStorage.setItem("activeProfileId", list[0].id);
          } catch {}
        }

        const limitsJson = await limitsRes.json().catch(() => ({}));
        if (limitsJson?.status) setQuota(limitsJson.status);

        // Load completed lessons from localStorage
        if (typeof window !== "undefined") {
          const saved = window.localStorage.getItem("completedLessons");
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setCompletedLessons(new Set(parsed));
            } catch {}
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoadingAuth(false);
        setIsLoading(false);
      }
    }
    void init();
  }, []);

  // Only show login modal after loading is complete and user is not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLoginOpen(true);
    }
  }, [isLoading, user]);

  useEffect(() => {
    if (typeof window !== "undefined" && activeProfileId) {
      window.localStorage.setItem("activeProfileId", activeProfileId);
    }
  }, [activeProfileId]);

  async function refreshProfiles() {
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json().catch(() => ({}));
      const list: Profile[] = json?.profiles ?? [];
      setProfiles(list);

      if (!activeProfileId && list.length > 0) {
        setActiveProfileId(list[0].id);
        try {
          if (typeof window !== "undefined") window.localStorage.setItem("activeProfileId", list[0].id);
        } catch {}
      }
    } catch {
      // ignore
    }
  }

  async function refreshQuota() {
    try {
      const res = await fetch("/api/limits/daily");
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json?.status) setQuota(json.status);
      }
    } catch {
      // ignore
    }
  }

  function handleLoginSuccess(newUser: User) {
    setUser(newUser);
    void refreshProfiles();
    void refreshQuota();
  }

  function handleProfileCreated(profile: Profile) {
    setProfiles((prev) => [...prev, profile]);
    setActiveProfileId(profile.id);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem("activeProfileId", profile.id);
    } catch {}
  }

  function handleSelectTopic(topic: Topic) {
    setViewState({ type: "lessons", topic });
    trackClick(`explore_topic_${topic.id}`, 'navigation', { topic_name: topic.title });
  }

  function handleSelectLesson(lesson: Lesson) {
    if (viewState.type === "lessons") {
      setViewState({ type: "lesson", topic: viewState.topic, lesson });
      analytics.trackFeatureStart(`explore_lesson_${lesson.id}`, 'learning', {
        topic_id: viewState.topic.id,
        lesson_title: lesson.title,
      });
    }
  }

  function handleBackToTopics() {
    setViewState({ type: "topics" });
  }

  function handleBackToLessons() {
    if (viewState.type === "lesson") {
      setViewState({ type: "lessons", topic: viewState.topic });
    }
  }

  function handleCompleteLesson() {
    if (viewState.type === "lesson") {
      const lessonKey = `${viewState.topic.id}:${viewState.lesson.id}`;
      const newCompleted = new Set(completedLessons);
      newCompleted.add(lessonKey);
      setCompletedLessons(newCompleted);

      // Save to localStorage
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("completedLessons", JSON.stringify(Array.from(newCompleted)));
        }
      } catch {}

      // Show success message and go back to lessons
      setViewState({ type: "lessons", topic: viewState.topic });

      // Optional: Show a celebration toast
      if (typeof window !== "undefined") {
        alert(`🎉 Grattis! Du har slutfört "${viewState.lesson.title}"!`);
      }
    }
  }

  function handleTtsToggle() {
    setTtsEnabled((prev) => {
      const newValue = !prev;
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem("globalAudioEnabled", String(newValue));
        }
      } catch {}
      return newValue;
    });
  }

  function handleVolumeChange(newVolume: number) {
    setTtsVolume(newVolume);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("globalAudioVolume", String(newVolume));
      }
    } catch {}
  }

  return (
    <AnalyticsProvider profileId={activeProfileId}>
      <div className="min-h-screen flex flex-col relative">
        <AppHeader
          user={user}
          profiles={profiles}
          activeProfileId={activeProfileId}
          quota={quota}
          onProfileChange={setActiveProfileId}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenAddProfile={() => setAddProfileOpen(true)}
          onOpenParentDashboard={() => {}}
          ttsEnabled={ttsEnabled}
          ttsVolume={ttsVolume}
          onTtsToggle={handleTtsToggle}
          onVolumeChange={handleVolumeChange}
          isLoading={isLoadingAuth}
        />

        <main className="flex-1 px-4 py-8 pt-24 relative z-0">
          <div className="mx-auto max-w-7xl">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-bounce">🔍</div>
                  <p className="text-xl text-white/80">Laddar...</p>
                </div>
              </div>
            ) : (
              <>
            {/* Conditional Content */}
            {!user ? (
              <div className="text-center py-16 max-w-md mx-auto">
                <div className="bg-white/10 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="text-6xl mb-4">🔐</div>
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    Logga in för att utforska
                  </h3>
                  <p className="text-indigo-100/80 mb-6">
                    Du behöver ett konto för att komma åt lektionerna.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold transition-colors shadow-lg"
                  >
                    Logga in
                  </button>
                </div>
              </div>
            ) : !activeProfileId ? (
              <div className="text-center py-16 max-w-md mx-auto">
                <div className="bg-white/10 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
                  <div className="text-6xl mb-4">👤</div>
                  <h3 className="text-2xl font-semibold text-white mb-3">
                    Välj eller skapa en profil
                  </h3>
                  <p className="text-indigo-100/80 mb-6">
                    Du behöver välja en barnprofil för att börja utforska.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddProfileOpen(true)}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-colors shadow-lg"
                  >
                    Skapa profil
                  </button>
                </div>
              </div>
            ) : (
              <>
                {viewState.type === "topics" && (
                  <TopicBrowser topics={EXPLORE_TOPICS} onSelectTopic={handleSelectTopic} />
                )}

                {viewState.type === "lessons" && (
                  <LessonList
                    topic={viewState.topic}
                    onSelectLesson={handleSelectLesson}
                    onBack={handleBackToTopics}
                  />
                )}

                {viewState.type === "lesson" && (
                  <LessonViewer
                    topic={viewState.topic}
                    lesson={viewState.lesson}
                    onBack={handleBackToLessons}
                    onComplete={handleCompleteLesson}
                    ttsEnabled={ttsEnabled}
                    ttsVolume={ttsVolume}
                    profileAge={
                      activeProfileId
                        ? profiles.find((p) => p.id === activeProfileId)?.age ?? null
                        : null
                    }
                    profileId={activeProfileId}
                  />
                )}
              </>
            )}
            </>
            )}
          </div>
        </main>
      </div>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <AddProfileModal
        isOpen={addProfileOpen}
        onClose={() => setAddProfileOpen(false)}
        onSuccess={handleProfileCreated}
      />
    </AnalyticsProvider>
  );
}
