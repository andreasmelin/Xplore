"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import LetterTracing from "@/components/letters/LetterTracing";
import DualLetterTracing from "@/components/letters/DualLetterTracing";
import SentenceInput from "@/components/letters/SentenceInput";
import SentenceTracing from "@/components/letters/SentenceTracing";
import ModeCard from "@/components/modes/ModeCard";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

const ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "Å", "Ä", "Ö"
];

export default function LettersPage() {
  const router = useRouter();
  const [showModeSelection, setShowModeSelection] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [isDualMode, setIsDualMode] = useState(false); // Track if dual letter mode is active
  const [sentence, setSentence] = useState<string | null>(null); // Track custom sentence
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);
  
  // User and profile state
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
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

  // Show sentence input interface
  if (sentence === "" && showModeSelection === false && !selectedLetter) {
    return (
      <SentenceInput
        onSentenceSubmit={(s) => {
          setSentence(s);
        }}
        onBack={() => {
          setShowModeSelection(true);
          setSentence(null);
        }}
      />
    );
  }

  // Show sentence tracing interface
  if (sentence !== null && sentence !== "") {
    return (
      <SentenceTracing
        sentence={sentence}
        onBack={() => {
          setSentence(null);
        }}
        onComplete={() => {
          setSentence(null);
          setShowModeSelection(true);
        }}
        initialSoundEnabled={isSoundEnabled}
        initialVolume={volume}
        onSoundSettingsChange={(enabled, vol) => {
          setIsSoundEnabled(enabled);
          setVolume(vol);
        }}
        profileId={activeProfileId || undefined}
      />
    );
  }

  // Show letter tracing interface
  if (selectedLetter) {
    if (isDualMode) {
      return (
        <DualLetterTracing
          letter={selectedLetter}
          onBack={() => {
            setSelectedLetter(null);
            setIsDualMode(false);
            setShowModeSelection(true); // Go back to mode selection
          }}
          onNext={() => {
            const currentIndex = ALPHABET.indexOf(selectedLetter);
            if (currentIndex < ALPHABET.length - 1) {
              setSelectedLetter(ALPHABET[currentIndex + 1]);
            } else {
              // All letters completed! Return to mode selection
              setSelectedLetter(null);
              setIsDualMode(false);
              setShowModeSelection(true);
            }
          }}
          initialSoundEnabled={isSoundEnabled}
          initialVolume={volume}
          onSoundSettingsChange={(enabled, vol) => {
            setIsSoundEnabled(enabled);
            setVolume(vol);
          }}
          profileId={activeProfileId || undefined}
        />
      );
    } else {
      return (
        <LetterTracing
          letter={selectedLetter}
          onBack={() => {
            setSelectedLetter(null);
            setShowModeSelection(false); // Go back to alphabet selection, not mode selection
          }}
          onNext={() => {
            const currentIndex = ALPHABET.indexOf(selectedLetter);
            if (currentIndex < ALPHABET.length - 1) {
              setSelectedLetter(ALPHABET[currentIndex + 1]);
            } else {
              // All letters completed! Return to mode selection
              setSelectedLetter(null);
              setShowModeSelection(true);
            }
          }}
          initialSoundEnabled={isSoundEnabled}
          initialVolume={volume}
          onSoundSettingsChange={(enabled, vol) => {
            setIsSoundEnabled(enabled);
            setVolume(vol);
          }}
          profileId={activeProfileId || undefined}
        />
      );
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex flex-col relative">
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
          isLoading={isLoading}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col p-6 pt-24">
          {!showModeSelection && (
            <div className="mb-8">
              <button
                onClick={() => {
                  setShowModeSelection(true);
                  setSelectedLetter(null);
                  setIsDualMode(false);
                  setSentence(null);
                }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white shadow-lg transition-colors"
                aria-label="Tillbaka"
                title="Tillbaka till valet"
              >
                <span className="text-4xl">←</span>
              </button>
            </div>
          )}

          {showModeSelection ? (
            // Mode Selection Screen
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div onClick={() => {
                setShowModeSelection(false);
                setIsDualMode(false);
                setSelectedLetter("A"); // Start directly with letter A
              }} className="cursor-pointer">
                <ModeCard
                  title="Träna på stora bokstäver"
                  description="Öva på alla bokstäver från A till Ö med stora bokstäver"
                  icon={<span>🔤</span>}
                  href="#"
                  gradient="bg-gradient-to-br from-purple-500 to-pink-500"
                />
              </div>
              <div onClick={() => {
                setShowModeSelection(false);
                setIsDualMode(true);
                setSelectedLetter("A"); // Start directly with letter A
              }} className="cursor-pointer">
                <ModeCard
                  title="Träna på små och stora bokstäver"
                  description="Öva på både stora och små bokstäver med vägledningslinjer"
                  icon={<span>✏️</span>}
                  href="#"
                  gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                />
              </div>
              <div onClick={() => {
                setShowModeSelection(false);
                setSentence(""); // Trigger sentence input mode
              }} className="cursor-pointer">
                <ModeCard
                  title="Träna på en egen mening"
                  description="Skriv eller säg en mening och träna på alla bokstäver i den"
                  icon={<span>📝</span>}
                  href="#"
                  gradient="bg-gradient-to-br from-green-500 to-teal-500"
                />
              </div>
            </div>
            </div>
          ) : (
            // Alphabet Selection Screen
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
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

