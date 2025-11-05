"use client";

import { useEffect, useState, useRef } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import Link from "next/link";
import { COMPARING_LESSON, ComparisonActivity } from "@/lib/math/comparing-data";
import { logMathActivity } from "@/lib/activity-logger";
import { usePageTracking, useFeatureTracking } from "@/lib/analytics/hooks";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

export default function ComparingPage() {
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);

  // Analytics tracking
  usePageTracking('math_comparing', 'learning');
  const { trackComplete } = useFeatureTracking('math_comparing_game', 'learning', false);

  // Lesson state
  const [currentView, setCurrentView] = useState<"intro" | "activity" | "celebration">("intro");
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  
  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  async function playAudio(text: string) {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider: "elevenlabs",
          voice: "Rachel",
        }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      
      await audio.play();
    } catch (error) {
      console.error("Failed to play audio:", error);
      setIsPlayingAudio(false);
    }
  }

  function handleAnswer(answer: "option1" | "option2" | "same") {
    const activity = COMPARING_LESSON.activities[currentActivityIndex];
    const correct = answer === activity.correctAnswer;
    
    setIsCorrect(correct);
    setShowFeedback(true);
    
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
      // Play explanation audio
      playAudio(activity.explanation);
    }
  }

  function handleNext() {
    setShowFeedback(false);
    
    if (currentActivityIndex < COMPARING_LESSON.activities.length - 1) {
      setCurrentActivityIndex(prev => prev + 1);
    } else {
      setCurrentView("celebration");
      playAudio(COMPARING_LESSON.celebration);
      
      // Log activity completion
      if (activeProfileId) {
        const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
        const score = Math.round((correctAnswers / COMPARING_LESSON.activities.length) * 100);
        logMathActivity(
          activeProfileId,
          'comparing_numbers',
          'Jämföra antal',
          score,
          durationSeconds
        ).catch(err => console.error('Failed to log math activity:', err));
      }
    }
  }

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
        />

        <main className="flex-1 px-4 py-8">
          <div className="mx-auto max-w-5xl">
            {/* Back link */}
            <Link
              href="/math"
              className="inline-flex items-center gap-2 text-indigo-100/80 hover:text-indigo-100 mb-6 transition-colors text-sm"
            >
              <span>←</span>
              <span>Tillbaka till Matematik</span>
            </Link>

            {currentView === "intro" && (
              <IntroView
                profileName={activeProfile?.name || "vän"}
                onStart={() => {
                  setCurrentView("activity");
                  playAudio(COMPARING_LESSON.activities[0].audioText);
                }}
                onPlayAudio={() => playAudio(COMPARING_LESSON.audioIntro)}
                isPlayingAudio={isPlayingAudio}
              />
            )}

            {currentView === "activity" && (
              <ActivityView
                activity={COMPARING_LESSON.activities[currentActivityIndex]}
                activityNumber={currentActivityIndex + 1}
                totalActivities={COMPARING_LESSON.activities.length}
                showFeedback={showFeedback}
                isCorrect={isCorrect}
                onAnswer={handleAnswer}
                onNext={handleNext}
                onPlayAudio={() => playAudio(COMPARING_LESSON.activities[currentActivityIndex].audioText)}
                isPlayingAudio={isPlayingAudio}
              />
            )}

            {currentView === "celebration" && (
              <CelebrationView
                correctAnswers={correctAnswers}
                totalActivities={COMPARING_LESSON.activities.length}
                onPlayAgain={() => {
                  setCurrentView("intro");
                  setCurrentActivityIndex(0);
                  setCorrectAnswers(0);
                  setShowFeedback(false);
                }}
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

function IntroView({ 
  profileName, 
  onStart, 
  onPlayAudio, 
  isPlayingAudio 
}: { 
  profileName: string; 
  onStart: () => void; 
  onPlayAudio: () => void;
  isPlayingAudio: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <div className="text-8xl mb-6 animate-bounce">⚖️</div>
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
          {COMPARING_LESSON.title}
        </h1>
        <p className="text-2xl text-green-200 font-medium">
          Hej {profileName}! Redo att lära dig jämföra? 🌟
        </p>
      </div>

      {/* Audio button */}
      <div className="text-center mb-8">
        <button
          onClick={onPlayAudio}
          className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-full font-bold text-lg shadow-lg transition-all transform hover:scale-105"
        >
          {isPlayingAudio ? (
            <span className="flex items-center gap-2">
              <span>⏸️</span>
              <span>Pausa</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>🔊</span>
              <span>Lyssna på introduktion</span>
            </span>
          )}
        </button>
      </div>

      {/* Introduction */}
      <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 border-2 border-green-400/40 rounded-3xl p-8 mb-8 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="text-6xl">🤖</div>
          <div className="flex-1">
            <div className="bg-white/20 rounded-2xl p-6 border border-white/30">
              <p className="text-xl text-white leading-relaxed">
                {COMPARING_LESSON.introduction}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-2 border-blue-400/40 rounded-2xl p-6 text-center backdrop-blur-sm">
          <div className="text-5xl mb-3">🍎🍎🍎 vs 🍎</div>
          <h3 className="text-xl font-bold text-white mb-2">MER</h3>
          <p className="text-white/90 text-sm">
            3 äpplen är mer än 1 äpple
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-400/40 rounded-2xl p-6 text-center backdrop-blur-sm">
          <div className="text-5xl mb-3">⭐⭐ vs ⭐⭐</div>
          <h3 className="text-xl font-bold text-white mb-2">LIKA</h3>
          <p className="text-white/90 text-sm">
            2 stjärnor är lika med 2 stjärnor
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500/30 to-amber-500/30 border-2 border-orange-400/40 rounded-2xl p-6 text-center backdrop-blur-sm">
          <div className="text-5xl mb-3">💚 vs 💚💚💚💚</div>
          <h3 className="text-xl font-bold text-white mb-2">MINDRE</h3>
          <p className="text-white/90 text-sm">
            1 hjärta är mindre än 4 hjärtan
          </p>
        </div>
      </div>

      {/* Start button */}
      <div className="text-center">
        <button
          onClick={onStart}
          className="group relative px-12 py-6 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-500 hover:from-green-300 hover:via-emerald-300 hover:to-teal-400 text-white text-2xl font-bold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          <span className="relative z-10 flex items-center gap-3">
            <span>Börja jämföra!</span>
            <span className="text-3xl group-hover:translate-x-2 transition-transform">🚀</span>
          </span>
          <div className="absolute inset-0 rounded-full bg-white/20 blur-xl group-hover:bg-white/30 transition-all"></div>
        </button>
      </div>
    </div>
  );
}

function ActivityView({
  activity,
  activityNumber,
  totalActivities,
  showFeedback,
  isCorrect,
  onAnswer,
  onNext,
  onPlayAudio,
  isPlayingAudio,
}: {
  activity: ComparisonActivity;
  activityNumber: number;
  totalActivities: number;
  showFeedback: boolean;
  isCorrect: boolean;
  onAnswer: (answer: "option1" | "option2" | "same") => void;
  onNext: () => void;
  onPlayAudio: () => void;
  isPlayingAudio: boolean;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-indigo-100/80 text-sm">
            Uppgift {activityNumber} av {totalActivities}
          </span>
          <span className="text-indigo-100/80 text-sm">
            {Math.round((activityNumber / totalActivities) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${(activityNumber / totalActivities) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-4">{activity.question}</h2>
        
        <button
          onClick={onPlayAudio}
          className="px-4 py-2 bg-green-500/30 hover:bg-green-500/50 text-white rounded-full font-medium transition-all text-sm"
        >
          {isPlayingAudio ? "⏸️ Pausa" : "🔊 Lyssna på instruktion"}
        </button>
      </div>

      {/* Comparison */}
      {!showFeedback && (
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Option 1 */}
          <button
            onClick={() => onAnswer("option1")}
            className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 border-3 border-blue-400/50 rounded-3xl p-12 text-center hover:scale-105 hover:border-blue-300 transition-all backdrop-blur-sm"
          >
            <div className="text-2xl font-bold text-white mb-6">{activity.option1.label}</div>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {Array.from({ length: activity.option1.count }).map((_, i) => (
                <span key={i} className="text-6xl">{activity.option1.emoji}</span>
              ))}
            </div>
            <div className="text-5xl font-bold text-white">{activity.option1.count}</div>
          </button>

          {/* Option 2 */}
          <button
            onClick={() => onAnswer("option2")}
            className="bg-gradient-to-br from-pink-500/30 to-rose-500/30 border-3 border-pink-400/50 rounded-3xl p-12 text-center hover:scale-105 hover:border-pink-300 transition-all backdrop-blur-sm"
          >
            <div className="text-2xl font-bold text-white mb-6">{activity.option2.label}</div>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              {Array.from({ length: activity.option2.count }).map((_, i) => (
                <span key={i} className="text-6xl">{activity.option2.emoji}</span>
              ))}
            </div>
            <div className="text-5xl font-bold text-white">{activity.option2.count}</div>
          </button>
        </div>
      )}

      {/* Same button for equal questions */}
      {!showFeedback && activity.question.includes("lika") && (
        <div className="text-center mb-8">
          <button
            onClick={() => onAnswer("same")}
            className="px-12 py-6 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-white text-2xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105"
          >
            ✓ De är lika många!
          </button>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && (
        <div className={`bg-gradient-to-br ${
          isCorrect 
            ? "from-green-500/30 to-emerald-500/30 border-green-400/50" 
            : "from-orange-500/30 to-amber-500/30 border-orange-400/50"
        } border-3 rounded-3xl p-12 text-center mb-8 backdrop-blur-sm`}>
          <div className="text-8xl mb-6">{isCorrect ? "🎉" : "🤔"}</div>
          <h3 className="text-4xl font-bold text-white mb-4">
            {isCorrect ? "Jättebra!" : "Nästan!"}
          </h3>
          <p className="text-2xl text-white/90 mb-8">
            {activity.explanation}
          </p>
          
          <button
            onClick={onNext}
            className="px-10 py-4 bg-white text-gray-900 rounded-full font-bold text-xl shadow-lg hover:scale-105 transition-transform"
          >
            {activityNumber < totalActivities ? "Nästa uppgift →" : "Se resultat! 🌟"}
          </button>
        </div>
      )}
    </div>
  );
}

function CelebrationView({
  correctAnswers,
  totalActivities,
  onPlayAgain,
}: {
  correctAnswers: number;
  totalActivities: number;
  onPlayAgain: () => void;
}) {
  const percentage = Math.round((correctAnswers / totalActivities) * 100);
  
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="text-9xl mb-8 animate-bounce">🏆</div>
      
      <h1 className="text-6xl font-bold text-white mb-4">
        Fantastiskt jobbat!
      </h1>
      
      <div className="bg-gradient-to-br from-yellow-500/30 to-amber-500/30 border-3 border-yellow-400/50 rounded-3xl p-12 mb-8 backdrop-blur-sm">
        <div className="text-8xl font-bold text-white mb-4">{correctAnswers}/{totalActivities}</div>
        <p className="text-3xl text-white mb-6">rätt svar!</p>
        <div className="text-6xl mb-4">{percentage >= 80 ? "⭐⭐⭐" : percentage >= 60 ? "⭐⭐" : "⭐"}</div>
      </div>

      <p className="text-2xl text-white/90 mb-8 leading-relaxed max-w-2xl mx-auto">
        {COMPARING_LESSON.celebration}
      </p>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onPlayAgain}
          className="px-8 py-4 bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-300 hover:to-emerald-400 text-white text-xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          🔄 Öva igen
        </button>
        
        <Link
          href="/math"
          className="px-8 py-4 bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-300 hover:to-pink-400 text-white text-xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105"
        >
          📚 Fler lektioner
        </Link>
      </div>
    </div>
  );
}





