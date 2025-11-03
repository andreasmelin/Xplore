"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import LoginModal from "@/components/auth/LoginModal";
import { PLANS, calculateYearlySavings, formatPrice } from "@/lib/stripe/client";

type User = { id: string; email: string } | null;
type Profile = { id: string; name: string; age: number };
type Quota = { remaining: number; limit: number; resetAt: string } | null;

export default function PricingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [quota, setQuota] = useState<Quota>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

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

  async function handleSubscribe(planId: string, priceId: string) {
    if (!user) {
      setLoginOpen(true);
      return;
    }

    setLoading(planId);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          planName: planId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error:", error);
      alert("Något gick fel. Försök igen.");
      setLoading(null);
    }
  }

  function handleLoginSuccess(newUser: User) {
    setUser(newUser);
    setLoginOpen(false);
  }

  const yearlySavings = calculateYearlySavings(PLANS.family.price, PLANS.family.yearlyPrice);

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
          onOpenAddProfile={() => {}}
          onOpenParentDashboard={() => router.push("/parent")}
        />

        <main className="flex-1 px-4 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 drop-shadow-lg">
                Välj din plan
              </h1>
              <p className="text-xl text-indigo-100/90 mb-8">
                7 dagars gratis provperiod. Avsluta när som helst.
              </p>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-6 py-2 rounded-full transition-all font-medium ${
                    !isYearly
                      ? "bg-white text-indigo-600 shadow-lg"
                      : "text-white hover:text-white/80"
                  }`}
                >
                  Månadsvis
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-6 py-2 rounded-full transition-all font-medium flex items-center gap-2 ${
                    isYearly
                      ? "bg-white text-indigo-600 shadow-lg"
                      : "text-white hover:text-white/80"
                  }`}
                >
                  Årsvis
                  <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                    Spara {yearlySavings}%
                  </span>
                </button>
              </div>
            </div>

            {/* Pricing cards */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {Object.values(PLANS).map((plan) => {
                const price = isYearly ? plan.yearlyPrice : plan.price;
                const priceId = isYearly ? plan.yearlyPriceId : plan.priceId;
                const monthlyEquivalent = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.price;

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border-2 transition-all hover:scale-105 hover:shadow-2xl ${
                      'popular' in plan && plan.popular
                        ? "border-yellow-400 shadow-xl shadow-yellow-500/20"
                        : "border-white/20"
                    }`}
                  >
                    {'popular' in plan && plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold rounded-full shadow-lg">
                        ⭐ Mest populär
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                      <p className="text-indigo-100/80 text-sm mb-4">{plan.description}</p>

                      <div className="mb-2">
                        <span className="text-5xl font-bold text-white">
                          {monthlyEquivalent}
                        </span>
                        <span className="text-xl text-indigo-100/80 ml-2">SEK/mån</span>
                      </div>

                      {isYearly && (
                        <p className="text-sm text-indigo-100/70">
                          Betala {formatPrice(price)} årsvis
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleSubscribe(plan.id, priceId)}
                      disabled={loading === plan.id}
                      className={`w-full py-4 rounded-xl font-bold text-lg transition-all mb-6 ${
                        plan.popular
                          ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-lg hover:shadow-yellow-500/50"
                          : "bg-white text-indigo-600 hover:bg-indigo-50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {loading === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⏳</span>
                          Laddar...
                        </span>
                      ) : (
                        "Börja gratis →"
                      )}
                    </button>

                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-indigo-100/90">
                          <span className="text-green-400 text-xl flex-shrink-0">✓</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Trust indicators */}
            <div className="mt-16 text-center">
              <div className="flex flex-wrap items-center justify-center gap-8 text-indigo-100/70">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <span>Säkra betalningar</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✓</span>
                  <span>7 dagars gratis provperiod</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">↻</span>
                  <span>Avsluta när som helst</span>
                </div>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="mt-20 max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-white text-center mb-8">
                Vanliga frågor
              </h2>

              <div className="space-y-4">
                <details className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <summary className="font-semibold text-white cursor-pointer">
                    Vad ingår i gratis provperioden?
                  </summary>
                  <p className="mt-3 text-indigo-100/80">
                    Du får tillgång till alla funktioner i din valda plan i 7 dagar helt gratis. 
                    Inget kreditkort krävs förrän provperioden är slut. Du kan avsluta när som helst.
                  </p>
                </details>

                <details className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <summary className="font-semibold text-white cursor-pointer">
                    Kan jag byta plan senare?
                  </summary>
                  <p className="mt-3 text-indigo-100/80">
                    Ja, du kan uppgradera eller nedgradera din plan när som helst. Ändringar träder i kraft omedelbart.
                  </p>
                </details>

                <details className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <summary className="font-semibold text-white cursor-pointer">
                    Vad händer om jag avbryter?
                  </summary>
                  <p className="mt-3 text-indigo-100/80">
                    Du har tillgång till alla funktioner till slutet av din betalperiod. 
                    Därefter återgår ditt konto till den kostnadsfria versionen.
                  </p>
                </details>

                <details className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <summary className="font-semibold text-white cursor-pointer">
                    Är det säkert att betala online?
                  </summary>
                  <p className="mt-3 text-indigo-100/80">
                    Ja, alla betalningar hanteras säkert av Stripe, en ledande betaltjänst som används av 
                    miljontals företag. Vi sparar aldrig dina kortuppgifter.
                  </p>
                </details>
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
    </>
  );
}





