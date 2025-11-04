"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import ModeCard from "@/components/modes/ModeCard";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import { useRouter } from "next/navigation";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);

  // Load audio settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEnabled = localStorage.getItem("globalAudioEnabled");
      const savedVolume = localStorage.getItem("globalAudioVolume");
      if (savedEnabled !== null) setTtsEnabled(savedEnabled === "true");
      if (savedVolume !== null) setTtsVolume(parseFloat(savedVolume));
    }
  }, []);

  // Save audio settings to localStorage
  const handleTtsToggle = () => {
    const newEnabled = !ttsEnabled;
    setTtsEnabled(newEnabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalAudioEnabled", String(newEnabled));
    }
  };

  const handleVolumeChange = (volume: number) => {
    setTtsVolume(volume);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalAudioVolume", String(volume));
    }
  };

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

        if (!me) setLoginOpen(true);
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
    void init();
  }, []);

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
          onOpenAddProfile={() => setAddProfileOpen(true)}
          onOpenParentDashboard={() => router.push("/parent")}
          ttsEnabled={ttsEnabled}
          ttsVolume={ttsVolume}
          onTtsToggle={handleTtsToggle}
          onVolumeChange={handleVolumeChange}
          isLoading={isLoading}
        />

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 pt-24">
          {/* Mode Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
            <ModeCard
              title="Prata med Sinus"
              description="Ställ frågor och utforska ämnen genom samtal med din AI-lärare"
              icon="💬"
              href="/chat"
              gradient="bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600"
            />

            <ModeCard
              title="Jobba med Bokstäver"
              description="Lär dig skriva bokstäver korrekt med regnbågsfärger och roliga animationer"
              icon="✍️"
              href="/letters"
              gradient="bg-gradient-to-br from-red-500 via-yellow-500 to-pink-500"
            />

            <ModeCard
              title="Utforska Ämnen"
              description="Upptäck nya ämnen med interaktiva lektioner och visuella hjälpmedel"
              icon="🔍"
              href="/explore"
              gradient="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500"
            />

            <ModeCard
              title="Matematik med Sinus"
              description="Lär dig räkna och lösa problem på ett roligt och lekfullt sätt"
              icon="🔢"
              href="/math"
              gradient="bg-gradient-to-br from-amber-500 via-yellow-500 to-lime-500"
              comingSoon
            />

            <ModeCard
              title="Berättelser"
              description="Lyssna på personliga berättelser eller skapa egna med Sinus"
              icon="📚"
              href="/stories"
              gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500"
              comingSoon
            />

            <ModeCard
              title="Quiz & Test"
              description="Testa dina kunskaper med roliga quiz anpassade efter din ålder"
              icon="🎯"
              href="/quiz"
              gradient="bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500"
              comingSoon
            />
          </div>

          {/* Welcome Message for New Users */}
          {user && profiles.length === 0 && (
            <div className="mt-12 max-w-md bg-white/10 border border-white/20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <div className="text-4xl mb-3">👋</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Välkommen till Lär med Sinus!
              </h3>
              <p className="text-sm text-indigo-100/90 mb-4">
                Skapa en profil för ditt barn för att börja använda appen.
              </p>
              <button
                type="button"
                onClick={() => setAddProfileOpen(true)}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-colors shadow-lg"
              >
                Skapa första profilen
              </button>
            </div>
          )}

          {!user && (
            <div className="mt-12 max-w-md bg-white/10 border border-white/20 rounded-2xl p-6 text-center backdrop-blur-sm">
              <div className="text-4xl mb-3">🔐</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Logga in för att börja
              </h3>
              <p className="text-sm text-indigo-100/90 mb-4">
                Du behöver ett konto för att använda alla funktioner i appen.
              </p>
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold transition-colors shadow-lg"
              >
                Logga in eller skapa konto
              </button>
            </div>
          )}
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
    </>
  );
}
