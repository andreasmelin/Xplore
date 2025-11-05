"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Hero from "@/components/landing/Hero";
import FeatureHighlights from "@/components/landing/FeatureHighlights";
import BenefitsSection from "@/components/landing/BenefitsSection";
import OnboardingModal from "@/components/auth/OnboardingModal";
import { usePageTracking, useClickTracking } from "@/lib/analytics/hooks";

export default function LandingPage() {
  const router = useRouter();
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [showLoginLink, setShowLoginLink] = useState(false);

  // Analytics tracking
  usePageTracking('landing_page', 'navigation');
  const { trackClick } = useClickTracking();

  // Check if user is already logged in
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data?.user) {
          // User is already logged in, redirect to home
          router.push("/home");
        } else {
          // Not logged in, show login link in header
          setShowLoginLink(true);
        }
      } catch {
        setShowLoginLink(true);
      }
    }
    void checkAuth();
  }, [router]);

  function handleGetStarted() {
    trackClick('landing_get_started', 'interaction');
    setOnboardingOpen(true);
  }

  function handleLogin() {
    trackClick('landing_login_link', 'interaction');
    setOnboardingOpen(true);
  }

  function handleOnboardingSuccess() {
    // Analytics will track this in the modal
    // User will be redirected to /home by the modal
  }

  return (
    <div className="min-h-screen relative">
      {/* Minimal header with logo and login link */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/logos/sinus-logo-1024px.png"
              alt="Sinus"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <span className="text-xl font-bold text-white font-brand">
              Lär med Sinus
            </span>
          </div>

          {/* Login link */}
          {showLoginLink && (
            <button
              onClick={handleLogin}
              className="text-white hover:text-cyan-400 transition-colors font-semibold"
            >
              Logga in
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main>
        <Hero onGetStarted={handleGetStarted} />
        <FeatureHighlights />
        <BenefitsSection />

        {/* Final CTA */}
        <div className="py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Börja lära dig idag!
            </h2>
            <p className="text-xl text-indigo-100/80 mb-8 max-w-2xl mx-auto">
              Det tar bara 2 minuter att komma igång. Skapa ditt konto och ge ditt barn tillgång till framtidens lärande.
            </p>
            <button
              onClick={handleGetStarted}
              className="group relative px-8 py-4 text-lg font-semibold text-white rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              {/* Gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-300 group-hover:scale-110" />

              {/* Animated shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

              {/* Button text */}
              <span className="relative flex items-center gap-2">
                Skapa konto gratis
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-indigo-100/60">
              <div className="flex items-center gap-2">
                <Image
                  src="/logos/sinus-logo-1024px.png"
                  alt="Sinus"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span>© 2024 Lär med Sinus. Alla rättigheter förbehållna.</span>
              </div>
              <div className="flex gap-6">
                <a href="/pricing" className="hover:text-white transition-colors">
                  Priser
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Support
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Integritet
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onSuccess={handleOnboardingSuccess}
      />
    </div>
  );
}
