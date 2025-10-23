"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import Link from "next/link";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

export default function MathPage() {
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"intro" | "topics">("intro");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsVolume, setTtsVolume] = useState(0.7);

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

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <>
      <div className="min-h-screen flex flex-col">
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
        />

        <main className="flex-1 px-4 py-8">
          <div className="mx-auto max-w-6xl">
            {/* Back to home link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-indigo-100/80 hover:text-indigo-100 mb-6 transition-colors text-sm"
            >
              <span>←</span>
              <span>Tillbaka till startsidan</span>
            </Link>

            {currentView === "intro" ? (
              <MathIntro 
                profileName={activeProfile?.name || "vän"}
                onStart={() => setCurrentView("topics")}
              />
            ) : (
              <MathTopics 
                profileAge={activeProfile?.age || 5}
                onBack={() => setCurrentView("intro")}
              />
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

function MathIntro({ profileName, onStart }: { profileName: string; onStart: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];

  // Introduction text to be read aloud
  const introText = `Välkommen till Matematik-landet! Hej ${profileName}! Är du redo för ett matematikäventyr? 
  
  Hej! Jag heter Sinus, och jag älskar siffror och matte! Visste du att matematik finns överallt omkring oss?
  
  När du räknar dina leksaker, när du delar godis med dina kompisar, eller när du bygger torn med klossar - då använder du matematik!
  
  Jag ska visa dig hur roligt det kan vara att räkna, jämföra och upptäcka mönster. Är du redo? Låt oss börja vårt äventyr!`;

  async function playIntroduction() {
    if (isPlaying && audioRef) {
      audioRef.pause();
      setIsPlaying(false);
      return;
    }

    try {
      setIsPlaying(true);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: introText,
          provider: "elevenlabs",
          voice: "Rachel",
        }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      
      await audio.play();
      // Store ref for pause functionality
      if (!audioRef) {
        audioRef = audio as any;
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
      setIsPlaying(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Header */}
      <div className="text-center mb-12">
        <div className="text-8xl mb-6 animate-bounce">🔢</div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Välkommen till Matematik-landet!
        </h1>
        <p className="text-2xl text-yellow-200 font-medium">
          Hej {profileName}! Är du redo för ett matematikäventyr? 🌟
        </p>
      </div>

      {/* Audio Control */}
      <div className="text-center mb-8">
        <button
          onClick={playIntroduction}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105"
        >
          {isPlaying ? (
            <span className="flex items-center gap-2">
              <span>⏸️</span>
              <span>Pausa berättelsen</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>🔊</span>
              <span>Lyssna på berättelsen</span>
            </span>
          )}
        </button>
      </div>

      {/* Story Introduction */}
      <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400/40 rounded-3xl p-8 mb-8 backdrop-blur-sm">
        <div className="flex items-start gap-4 mb-6">
          <div className="text-6xl">🤖</div>
          <div className="flex-1">
            <div className="bg-white/20 rounded-2xl p-6 border border-white/30">
              <p className="text-xl text-white leading-relaxed mb-4">
                "Hej! Jag heter <span className="font-bold text-yellow-300">Sinus</span>, och jag älskar siffror och matte! 
                Visste du att matematik finns överallt omkring oss?"
              </p>
              <p className="text-xl text-white leading-relaxed mb-4">
                "När du räknar dina leksaker, när du delar godis med dina kompisar, 
                eller när du bygger torn med klossar - då använder du <span className="font-bold text-yellow-300">matematik</span>! ✨"
              </p>
              <p className="text-xl text-white leading-relaxed">
                "Jag ska visa dig hur roligt det kan vara att räkna, jämföra och upptäcka mönster. 
                Är du redo? Låt oss börja vårt äventyr!"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fun Facts Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-red-500/30 to-pink-500/30 border-2 border-red-400/40 rounded-2xl p-6 text-center backdrop-blur-sm">
          <div className="text-5xl mb-3">🍎🍎🍎</div>
          <h3 className="text-2xl font-bold text-white mb-2">Räkna saker</h3>
          <p className="text-white/90">
            Hur många äpplen ser du? 1, 2, 3!
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-2 border-blue-400/40 rounded-2xl p-6 text-center backdrop-blur-sm">
          <div className="text-5xl mb-3">🔵🟢🔴</div>
          <h3 className="text-2xl font-bold text-white mb-2">Former & Färger</h3>
          <p className="text-white/90">
            Cirklar, trianglar och fyrkanter!
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500/30 to-emerald-500/30 border-2 border-green-400/40 rounded-2xl p-6 text-center backdrop-blur-sm">
          <div className="text-5xl mb-3">➕➖</div>
          <h3 className="text-2xl font-bold text-white mb-2">Plus & Minus</h3>
          <p className="text-white/90">
            Lär dig att lägga till och ta bort!
          </p>
        </div>
      </div>

      {/* What You'll Learn */}
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-400/40 rounded-3xl p-8 mb-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          Vad ska vi lära oss? 🎯
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">1️⃣</span>
            <div>
              <h4 className="font-bold text-yellow-300 text-lg">Räkna till 20</h4>
              <p className="text-white/90">Lär dig siffrorna och räkna sakerna omkring dig!</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-3xl">2️⃣</span>
            <div>
              <h4 className="font-bold text-yellow-300 text-lg">Jämföra storlekar</h4>
              <p className="text-white/90">Vad är mer? Vad är mindre? Vad är lika?</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-3xl">3️⃣</span>
            <div>
              <h4 className="font-bold text-yellow-300 text-lg">Former och mönster</h4>
              <p className="text-white/90">Upptäck cirklar, fyrkanter och roliga mönster!</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-3xl">4️⃣</span>
            <div>
              <h4 className="font-bold text-yellow-300 text-lg">Enkel addition</h4>
              <p className="text-white/90">Lägg ihop saker och se vad du får!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={onStart}
          className="group relative px-12 py-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 hover:from-yellow-300 hover:via-orange-300 hover:to-pink-400 text-white text-2xl font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          <span className="relative z-10 flex items-center gap-3">
            <span>Börja matteäventyret!</span>
            <span className="text-3xl group-hover:translate-x-2 transition-transform">🚀</span>
          </span>
          <div className="absolute inset-0 rounded-full bg-white/20 blur-xl group-hover:bg-white/30 transition-all"></div>
        </button>
        
        <p className="text-yellow-200 mt-4 text-lg">
          Klicka här så börjar vi! 👆
        </p>
      </div>
    </div>
  );
}

function MathTopics({ profileAge, onBack }: { profileAge: number; onBack: () => void }) {
  const topics = [
    {
      id: "counting",
      title: "Räkna 1-20",
      icon: "🔢",
      href: "/math/counting",
      color: "from-blue-500 to-cyan-500",
      comingSoon: true,
    },
    {
      id: "shapes",
      title: "Former",
      icon: "⭐",
      href: "/math/shapes",
      color: "from-pink-500 to-rose-500",
      comingSoon: true,
    },
    {
      id: "comparing",
      title: "Mer eller Mindre",
      icon: "⚖️",
      href: "/math/comparing",
      color: "from-green-500 to-emerald-500",
      comingSoon: false, // NOW AVAILABLE!
    },
    {
      id: "addition",
      title: "Lägg ihop",
      icon: "➕",
      href: "/math/addition",
      color: "from-purple-500 to-violet-500",
      comingSoon: true,
    },
    {
      id: "patterns",
      title: "Mönster",
      icon: "🎨",
      href: "/math/patterns",
      color: "from-orange-500 to-amber-500",
      comingSoon: true,
    },
    {
      id: "subtraction",
      title: "Ta bort",
      icon: "➖",
      href: "/math/subtraction",
      color: "from-indigo-500 to-blue-500",
      comingSoon: true,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-indigo-100/80 hover:text-indigo-100 mb-6 transition-colors text-sm"
      >
        <span>←</span>
        <span>Tillbaka till introduktion</span>
      </button>

      {/* Visual Topic Grid - No text descriptions, just icons */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {topics.map((topic) => {
          const card = (
            <div
              className={`relative bg-gradient-to-br ${topic.color}/30 border-2 border-white/30 rounded-3xl p-12 text-center transition-transform backdrop-blur-sm ${
                topic.comingSoon 
                  ? "opacity-60 cursor-not-allowed" 
                  : "hover:scale-105 hover:border-white/50 cursor-pointer"
              }`}
            >
              {/* Large icon - self-explanatory */}
              <div className="text-8xl mb-6">{topic.icon}</div>
              
              {/* Title only - will be read aloud */}
              <h3 className="text-3xl font-bold text-white">{topic.title}</h3>
              
              {topic.comingSoon && (
                <div className="absolute top-4 right-4 bg-yellow-500/80 text-white px-3 py-1 rounded-full text-xs font-bold">
                  Snart
                </div>
              )}

              {!topic.comingSoon && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white/60 text-sm">
                  Klicka för att börja →
                </div>
              )}
            </div>
          );

          if (topic.comingSoon) {
            return <div key={topic.id}>{card}</div>;
          }

          return (
            <Link key={topic.id} href={topic.href}>
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

