"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import { PLANS } from "@/lib/stripe/client";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

type SubscriptionStatus = {
  hasSubscription: boolean;
  plan: string;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
};

export default function SubscriptionPage() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [meRes, profilesRes, limitsRes, subRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/profiles"),
          fetch("/api/limits/daily"),
          fetch("/api/subscription/status"),
        ]);

        const meJson = await meRes.json().catch(() => ({}));
        const me = meJson?.user ?? null;
        setUser(me);

        if (!me) {
          setLoginOpen(true);
          setLoading(false);
          return;
        }

        const profilesJson = await profilesRes.json().catch(() => ({}));
        const list: Profile[] = profilesJson?.profiles ?? [];
        setProfiles(list);

        const stored = typeof window !== "undefined" ? window.localStorage.getItem("activeProfileId") : null;
        if (stored && list.some((p) => p.id === stored)) {
          setActiveProfileId(stored);
        }

        const limitsJson = await limitsRes.json().catch(() => ({}));
        if (limitsJson?.status) setQuota(limitsJson.status);

        const subJson = await subRes.json().catch(() => ({}));
        setSubscription(subJson);
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    }
    void init();
  }, []);

  async function handleManageBilling() {
    setManagingBilling(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error:", error);
      alert("Något gick fel. Försök igen.");
      setManagingBilling(false);
    }
  }

  function handleLoginSuccess(newUser: User) {
    setUser(newUser);
    setLoginOpen(false);
    window.location.reload();
  }

  const currentPlan = subscription?.plan ? PLANS[subscription.plan as keyof typeof PLANS] : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-spin">⏳</div>
          <p className="text-xl text-white">Laddar...</p>
        </div>
      </div>
    );
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
          onOpenAddProfile={() => {}}
          onOpenParentDashboard={() => router.push("/parent")}
          isLoading={isLoading}
        />

        <main className="flex-1 px-4 py-12 pt-24">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-8">
              Din Prenumeration
            </h1>

            {subscription?.hasSubscription ? (
              <div className="space-y-6">
                {/* Current plan card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        {currentPlan?.name || subscription.plan}
                      </h2>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          subscription.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          subscription.status === 'trialing' ? 'bg-blue-500/20 text-blue-300' :
                          subscription.status === 'past_due' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {subscription.status === 'active' ? '✓ Aktiv' :
                           subscription.status === 'trialing' ? '🎁 Provperiod' :
                           subscription.status === 'past_due' ? '⚠️ Förfallen betalning' :
                           subscription.status}
                        </span>
                        {subscription.cancelAtPeriodEnd && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-300">
                            Avslutas snart
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">
                        {currentPlan?.price || 0} SEK
                      </div>
                      <div className="text-sm text-indigo-100/70">per månad</div>
                    </div>
                  </div>

                  {currentPlan && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-indigo-100/70 mb-3">
                        Inkluderade funktioner:
                      </h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {currentPlan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-indigo-100/90">
                            <span className="text-green-400">✓</span>
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-6 space-y-3">
                    {subscription.trialEnd && new Date(subscription.trialEnd) > new Date() && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-blue-300">
                          <span>🎁</span>
                          <div>
                            <div className="font-medium">Provperiod aktiv</div>
                            <div className="text-sm text-blue-300/80">
                              Slutar {new Date(subscription.trialEnd).toLocaleDateString('sv-SE', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {subscription.currentPeriodEnd && (
                      <div className="text-sm text-indigo-100/70">
                        {subscription.cancelAtPeriodEnd ? (
                          <p>Din prenumeration avslutas {new Date(subscription.currentPeriodEnd).toLocaleDateString('sv-SE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                        ) : (
                          <p>Nästa faktura: {new Date(subscription.currentPeriodEnd).toLocaleDateString('sv-SE', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <h3 className="text-xl font-bold text-white mb-4">Hantera prenumeration</h3>
                  
                  <div className="space-y-3">
                    <button
                      onClick={handleManageBilling}
                      disabled={managingBilling}
                      className="w-full px-6 py-4 bg-white text-indigo-600 rounded-xl font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {managingBilling ? (
                        <>
                          <span className="animate-spin">⏳</span>
                          <span>Öppnar...</span>
                        </>
                      ) : (
                        <>
                          <span>⚙️</span>
                          <span>Hantera betalning & prenumeration</span>
                        </>
                      )}
                    </button>

                    <p className="text-sm text-indigo-100/60 text-center">
                      Du kan uppdatera betalmetod, ändra plan eller avsluta prenumeration
                    </p>
                  </div>
                </div>

                {/* Upgrade options */}
                {subscription.plan !== 'premium' && (
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/20">
                    <h3 className="text-xl font-bold text-white mb-2">
                      Uppgradera till {subscription.plan === 'starter' ? 'Familj' : 'Premium'}
                    </h3>
                    <p className="text-indigo-100/80 mb-4">
                      Få tillgång till fler funktioner och stöd för fler barn
                    </p>
                    <Link
                      href="/pricing"
                      className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                      Se alla planer →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-12 border border-white/20 text-center">
                <div className="text-6xl mb-4">💳</div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Ingen aktiv prenumeration
                </h2>
                <p className="text-indigo-100/80 mb-6 max-w-md mx-auto">
                  Börja din 7-dagars gratis provperiod idag och ge ditt barn tillgång till
                  Sveriges första AI-lärare!
                </p>
                <Link
                  href="/pricing"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all"
                >
                  Se priser och starta gratis provperiod →
                </Link>
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
    </>
  );
}






