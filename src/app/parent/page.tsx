"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

export default function ParentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);

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

  async function refreshProfiles() {
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json().catch(() => ({}));
      const list: Profile[] = json?.profiles ?? [];
      setProfiles(list);
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
  }

  if (!user) {
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
          <main className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">🔒</div>
              <h1 className="text-3xl font-bold text-white mb-4">
                Föräldrakontroll
              </h1>
              <p className="text-indigo-100/90 mb-6">
                Du måste logga in för att komma åt föräldrapanelen.
              </p>
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-semibold transition-colors shadow-lg"
              >
                Logga in
              </button>
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
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="mb-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-indigo-100/80 hover:text-indigo-100 mb-4 transition-colors"
              >
                <span>←</span>
                <span className="text-sm">Tillbaka till startsidan</span>
              </Link>
              <h1 className="text-4xl font-bold text-white mb-2">
                Föräldrakontroll 👨‍👩‍👧
              </h1>
              <p className="text-indigo-100/80">
                Hantera profiler, sätt gränser och se hur ditt barn lär sig
              </p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-3xl mb-2">👥</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {profiles.length}
                </div>
                <div className="text-sm text-indigo-100/80">Barnprofiler</div>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-3xl mb-2">💬</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {quota ? quota.limit - quota.remaining : 0}
                </div>
                <div className="text-sm text-indigo-100/80">Meddelanden idag</div>
              </div>

              <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                <div className="text-3xl mb-2">⏰</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {quota?.remaining ?? 0}
                </div>
                <div className="text-sm text-indigo-100/80">Kvar idag (av {quota?.limit ?? 50})</div>
              </div>
            </div>

            {/* Profiles Section */}
            <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">Barnprofiler</h2>
                <button
                  type="button"
                  onClick={() => setAddProfileOpen(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-colors shadow text-sm"
                >
                  + Lägg till profil
                </button>
              </div>

              {profiles.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">👶</div>
                  <p className="text-indigo-100/80 mb-4">
                    Inga profiler ännu. Skapa en för att börja!
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddProfileOpen(true)}
                    className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-colors shadow"
                  >
                    Skapa första profilen
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-cyan-600 text-white flex items-center justify-center text-2xl">
                          🧒
                        </div>
                        <div>
                          <div className="font-semibold text-white">{profile.name}</div>
                          <div className="text-sm text-indigo-100/70">{profile.age} år</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveProfileId(profile.id);
                            if (typeof window !== "undefined") {
                              window.localStorage.setItem("activeProfileId", profile.id);
                            }
                          }}
                          className="flex-1 text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                        >
                          Välj profil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Section */}
            <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-white mb-6">Inställningar</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white mb-1">Dalig gräns för meddelanden</div>
                      <div className="text-sm text-indigo-100/70">
                        Nuvarande: {quota?.limit ?? 50} meddelanden per dag
                      </div>
                    </div>
                    <div className="text-indigo-100/50 text-sm">(Kommer snart)</div>
                  </label>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white mb-1">Innehållsfilter</div>
                      <div className="text-sm text-indigo-100/70">
                        Blockera olämpligt innehåll automatiskt
                      </div>
                    </div>
                    <div className="text-green-400 font-semibold">Aktiverat</div>
                  </label>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white mb-1">Aktivitetsrapporter</div>
                      <div className="text-sm text-indigo-100/70">
                        Få veckosammanfattning via e-post
                      </div>
                    </div>
                    <div className="text-indigo-100/50 text-sm">(Kommer snart)</div>
                  </label>
                </div>
              </div>
            </div>
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


