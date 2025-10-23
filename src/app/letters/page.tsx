"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import LetterTracing from "@/components/letters/LetterTracing";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

export default function LettersPage() {
  const router = useRouter();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  
  // User and profile state
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);

  // Load user data and audio settings
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
        }

        const limitsJson = await limitsRes.json().catch(() => ({}));
        if (limitsJson?.status) setQuota(limitsJson.status);
      } catch {
        // ignore
      }
      
      // Load audio settings
      if (typeof window !== "undefined") {
        const savedEnabled = localStorage.getItem("globalAudioEnabled");
        const savedVolume = localStorage.getItem("globalAudioVolume");
        if (savedEnabled !== null) setIsSoundEnabled(savedEnabled === "true");
        if (savedVolume !== null) setVolume(parseFloat(savedVolume));
      }
    }
    void init();
  }, []);

  // Save active profile to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && activeProfileId) {
      window.localStorage.setItem("activeProfileId", activeProfileId);
    }
  }, [activeProfileId]);

  const handleTtsToggle = () => {
    const newEnabled = !isSoundEnabled;
    setIsSoundEnabled(newEnabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalAudioEnabled", String(newEnabled));
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalAudioVolume", String(newVolume));
    }
  };

  function handleLoginSuccess(newUser: User) {
    setUser(newUser);
  }

  function handleProfileCreated(profile: Profile) {
    setProfiles((prev) => [...prev, profile]);
    setActiveProfileId(profile.id);
  }

  if (selectedLetter) {
    return (
      <LetterTracing
        letter={selectedLetter}
        onBack={() => setSelectedLetter(null)}
        onNext={() => {
          const currentIndex = ALPHABET.indexOf(selectedLetter);
          if (currentIndex < ALPHABET.length - 1) {
            setSelectedLetter(ALPHABET[currentIndex + 1]);
          } else {
            setSelectedLetter(null);
          }
        }}
        initialSoundEnabled={isSoundEnabled}
        initialVolume={volume}
        onSoundSettingsChange={(enabled, vol) => {
          setIsSoundEnabled(enabled);
          setVolume(vol);
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col">
        <AppHeader
          user={user}
          profiles={profiles}
          activeProfileId={activeProfileId}
          quota={quota}
          onProfileChange={setActiveProfileId}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenAddProfile={() => setAddProfileOpen(true)}
          onOpenParentDashboard={() => router.push("/parent")}
          ttsEnabled={isSoundEnabled}
          ttsVolume={volume}
          onTtsToggle={handleTtsToggle}
          onVolumeChange={handleVolumeChange}
        />

        {/* Page Title Bar */}
        <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
            >
              <span className="text-2xl">←</span>
              <span className="text-lg font-semibold">Tillbaka</span>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              ✍️ Jobba med Bokstäver
            </h1>
            <div className="w-24"></div>
          </div>
        </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Lär dig skriva bokstäver! ✍️
          </h2>
          <p className="text-xl text-white/90 drop-shadow-md mb-12">
            Rita med regnbågsfärger och ha kul! 🌈
          </p>
          
          <button
            onClick={() => setSelectedLetter("A")}
            className="px-12 py-6 bg-white text-purple-600 rounded-full text-2xl font-bold
                       hover:bg-white/90 hover:scale-110 active:scale-95
                       transition-all duration-200 shadow-2xl
                       flex items-center gap-4 mx-auto"
          >
            <span className="text-4xl">▶</span>
            <span>Börja med A</span>
          </button>
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

