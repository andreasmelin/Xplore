"use client";

import Image from "next/image";

type HeroProps = {
  onGetStarted: () => void;
};

export default function Hero({ onGetStarted }: HeroProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center animate-in zoom-in duration-500">
          <div className="relative">
            <Image
              src="/logos/sinus-logo-1024px.png"
              alt="Sinus Logo"
              width={160}
              height={160}
              className="rounded-3xl shadow-2xl"
              priority
            />
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-cyan-500 rounded-3xl blur-2xl opacity-30 -z-10" />
          </div>
        </div>

        {/* Tagline */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-in slide-in-from-bottom duration-700 delay-100">
          Lär dig på{" "}
          <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
            ditt sätt
          </span>
          {" "}med AI
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-indigo-100/90 mb-12 max-w-2xl mx-auto animate-in slide-in-from-bottom duration-700 delay-200">
          En personlig AI-lärare som anpassar sig efter ditt barn. Gör läxor roliga, utforska nya ämnen, och lär dig i din egen takt.
        </p>

        {/* CTA Button */}
        <button
          onClick={onGetStarted}
          className="group relative px-8 py-4 text-lg font-semibold text-white rounded-full overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-in zoom-in duration-700 delay-300"
        >
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-300 group-hover:scale-110" />

          {/* Animated shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />

          {/* Button text */}
          <span className="relative flex items-center gap-2">
            Kom igång gratis
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

        {/* Trust indicators */}
        <div className="mt-12 flex items-center justify-center gap-8 text-indigo-100/70 text-sm animate-in fade-in duration-700 delay-500">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Gratis att komma igång</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span>För barn 4-12 år</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            <span>AI-driven inlärning</span>
          </div>
        </div>
      </div>
    </div>
  );
}
