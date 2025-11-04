"use client";

import { useEffect, useState, useMemo } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import ChatInterface from "@/components/chat/ChatInterface";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

export default function ChatPage() {
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(true);

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
      
      // Load global audio settings
      if (typeof window !== "undefined") {
        const savedEnabled = localStorage.getItem("globalAudioEnabled");
        const savedVolume = localStorage.getItem("globalAudioVolume");
        if (savedEnabled !== null) setTtsEnabled(savedEnabled === "true");
        if (savedVolume !== null) setTtsVolume(parseFloat(savedVolume));
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

  const handleTtsToggle = () => {
    const newEnabled = !ttsEnabled;
    setTtsEnabled(newEnabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalAudioEnabled", String(newEnabled));
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setTtsVolume(newVolume);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalAudioVolume", String(newVolume));
    }
  };

  const activeProfile = useMemo(() => profiles.find((p) => p.id === activeProfileId) ?? null, [profiles, activeProfileId]);

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
          onOpenParentDashboard={() => {}}
          ttsEnabled={ttsEnabled}
          ttsVolume={ttsVolume}
          onTtsToggle={handleTtsToggle}
          onVolumeChange={handleVolumeChange}
          isLoading={isLoading}
        />

        <main className="flex-1 pb-10 pt-24">
          <div className="mx-auto max-w-3xl p-6">
            {/* Chat Interface */}
            {user && activeProfile ? (
              <ChatInterface
                activeProfile={activeProfile}
                onNeedLogin={() => setLoginOpen(true)}
              />
            ) : user && !activeProfile ? (
              <div className="text-center py-12 bg-white/10 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="text-5xl mb-4">👤</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Välj eller skapa en profil
                </h3>
                <p className="text-sm text-indigo-100/80 mb-4">
                  Du behöver välja en barnprofil för att börja chatta.
                </p>
                <button
                  type="button"
                  onClick={() => setAddProfileOpen(true)}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-colors shadow-lg"
                >
                  Skapa profil
                </button>
              </div>
            ) : (
              <div className="text-center py-12 bg-white/10 border border-white/10 rounded-2xl backdrop-blur-sm">
                <div className="text-5xl mb-4">🔐</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Logga in för att börja
                </h3>
                <p className="text-sm text-indigo-100/80 mb-4">
                  Du behöver ett konto för att chatta med Sinus.
                </p>
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold transition-colors shadow-lg"
                >
                  Logga in
                </button>
              </div>
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
    </>
  );
}

