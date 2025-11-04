"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import AddProfileModal from "@/components/profile/AddProfileModal";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

type ComingSoonPageProps = {
  title: string;
  icon: string;
  description: string;
  features?: string[];
};

export default function ComingSoonPage({ title, icon, description, features = [] }: ComingSoonPageProps) {
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

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 pt-24">
          <div className="max-w-2xl w-full text-center">
            {/* Coming Soon Badge */}
            <div className="inline-block bg-yellow-500 text-black text-sm font-bold px-4 py-2 rounded-full shadow-lg mb-6 animate-pulse">
              Kommer snart
            </div>

            {/* Icon */}
            <div className="text-9xl mb-6 animate-bounce">{icon}</div>

            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              {title}
            </h1>

            {/* Description */}
            <p className="text-xl text-indigo-100/90 mb-8 drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)]">
              {description}
            </p>

            {/* Features */}
            {features.length > 0 && (
              <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Vad kan du förvänta dig?</h2>
                <ul className="space-y-3 text-left">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-indigo-100/90">
                      <span className="text-green-400 text-lg flex-shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA */}
            <div className="bg-white/10 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">
                Vi arbetar hårt för att göra detta tillgängligt!
              </h3>
              <p className="text-sm text-indigo-100/80 mb-4">
                Under tiden kan du utforska våra andra lägen och fortsätta lära dig med Sinus.
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-semibold transition-colors shadow-lg"
              >
                Utforska andra lägen
              </Link>
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


