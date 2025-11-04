"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

type AppHeaderProps = {
  user: User;
  profiles: Profile[];
  activeProfileId: string | null;
  quota: Quota;
  onProfileChange: (profileId: string | null) => void;
  onOpenLogin: () => void;
  onOpenAddProfile: () => void;
  onOpenParentDashboard: () => void;
  // TTS controls
  ttsEnabled?: boolean;
  ttsVolume?: number;
  onTtsToggle?: () => void;
  onVolumeChange?: (volume: number) => void;
  // Loading state
  isLoading?: boolean;
};

export default function AppHeader({
  user,
  profiles,
  activeProfileId,
  quota,
  onProfileChange,
  onOpenLogin,
  onOpenAddProfile,
  onOpenParentDashboard,
  ttsEnabled = false,
  ttsVolume = 0.8,
  onTtsToggle,
  onVolumeChange,
  isLoading = false,
}: AppHeaderProps) {
  const router = useRouter();
  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo & Brand & Home Button */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/logos/sinus-logo-1024px.png"
                alt="Sinus"
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl object-cover shadow-lg"
              />
              <div className="hidden sm:block">
                <div className="text-lg brand-title drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                  Lär med Sinus
                </div>
              </div>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg transition-colors"
              aria-label="Hem"
              title="Tillbaka till startsidan"
            >
              <span className="text-3xl">🏠</span>
            </Link>
          </div>

          {/* Center - Profile & Quota */}
          <div className="flex flex-1 items-center justify-center gap-3 max-w-md">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse"></div>
              </div>
            ) : user ? (
              <>
                {/* Profile Selector */}
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 border border-white/10 shadow">
                  <div className="h-7 w-7 rounded-full bg-cyan-600 text-white flex items-center justify-center text-sm">
                    {activeProfile ? "🧒" : "👤"}
                  </div>
                  <select
                    className="text-xs bg-transparent border-none text-indigo-100 pr-6 cursor-pointer focus:outline-none"
                    value={activeProfileId ?? ""}
                    onChange={(e) => onProfileChange(e.target.value || null)}
                  >
                    <option value="" className="bg-gray-800">Ingen profil</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id} className="bg-gray-800">
                        {p.name} ({p.age})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quota Bar */}
                {quota && (
                  <div className="hidden md:flex items-center gap-2">
                    <div className="progress-rainbow w-32" role="progressbar" aria-valuemin={0} aria-valuemax={quota.limit} aria-valuenow={quota.remaining}>
                      <div className="bar" style={{ width: `${Math.max(0, Math.min(100, Math.round((quota.remaining / Math.max(1, quota.limit)) * 100)))}%` }} />
                    </div>
                    <div className="text-[10px] tabular-nums text-indigo-100/80 whitespace-nowrap">
                      {quota.remaining}/{quota.limit}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2 relative z-50">
            {/* TTS Controls - Always visible when callbacks provided */}
            {isLoading ? (
              <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse"></div>
            ) : onTtsToggle ? (
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 border border-white/10 shadow">
                <button
                  type="button"
                  onClick={onTtsToggle}
                  className={`transition-colors ${ttsEnabled ? 'text-green-400' : 'text-gray-400'}`}
                  title={ttsEnabled ? 'Ljud på' : 'Ljud av'}
                >
                  {ttsEnabled ? '🔊' : '🔇'}
                </button>
                {ttsEnabled && onVolumeChange && (
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(ttsVolume * 100)}
                    onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                    className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-400"
                    title="Volym"
                  />
                )}
              </div>
            ) : null}
            
            {!isLoading && user ? (
              <>
                <button
                  type="button"
                  onClick={onOpenAddProfile}
                  className="hidden sm:block text-xs rounded-full px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white shadow transition-colors"
                  title="Skapa ny profil"
                >
                  + Profil
                </button>
                <button
                  type="button"
                  onClick={onOpenParentDashboard}
                  className="text-xs rounded-full px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors"
                  title="Föräldrakontroll"
                >
                  👨‍👩‍👧 Förälder
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs rounded-full px-3 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-100 border border-white/10 shadow transition-colors"
                >
                  Logga ut
                </button>
              </>
            ) : !isLoading ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-xs rounded-full px-3 py-1.5 bg-pink-500 hover:bg-pink-600 text-white shadow transition-colors"
              >
                Logga in
              </button>
            ) : null}
          </div>
        </div>

        {/* Mobile quota bar */}
        {!isLoading && user && quota && (
          <div className="md:hidden mt-2 flex items-center gap-2">
            <div className="progress-rainbow flex-1" role="progressbar">
              <div className="bar" style={{ width: `${Math.max(0, Math.min(100, Math.round((quota.remaining / Math.max(1, quota.limit)) * 100)))}%` }} />
            </div>
            <div className="text-[10px] tabular-nums text-indigo-100/80">
              Kvar idag: {quota.remaining}/{quota.limit}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

