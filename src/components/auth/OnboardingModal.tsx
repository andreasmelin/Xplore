"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type OnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

type Step = "account" | "profile" | "success";

export default function OnboardingModal({ isOpen, onClose, onSuccess }: OnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Account creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // Step 2: Profile creation
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");

  if (!isOpen) return null;

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Fyll i både e-post och lösenord");
      return;
    }

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kunde inte skapa konto");
        return;
      }

      // Account created successfully
      setUserId(data.user.id);
      setStep("profile");
      setError("");
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!childName.trim()) {
      setError("Ange barnets namn");
      return;
    }

    const age = parseInt(childAge, 10);
    if (isNaN(age) || age < 1 || age > 18) {
      setError("Ange en ålder mellan 1 och 18");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: childName.trim(), age }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Kunde inte skapa profil");
        return;
      }

      // Profile created successfully
      setStep("success");
      setError("");

      // Store active profile
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activeProfileId", data.id);
      }
    } catch {
      setError("Ett fel uppstod. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  function handleComplete() {
    if (onSuccess) {
      onSuccess();
    }
    // Redirect to home page
    router.push("/home");
    onClose();
  }

  function handleModalClick(e: React.MouseEvent) {
    // Prevent closing when clicking inside the modal
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-gray-800 animate-in zoom-in duration-200"
        onClick={handleModalClick}
      >
        {/* Progress Indicator */}
        {step !== "success" && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${step === "account" ? "bg-pink-500" : "bg-gray-300"}`} />
              <div className="h-0.5 w-12 bg-gray-300" />
              <div className={`h-2 w-2 rounded-full ${step === "profile" ? "bg-pink-500" : "bg-gray-300"}`} />
            </div>
            <p className="text-center text-sm text-gray-500">
              Steg {step === "account" ? "1" : "2"} av 2
            </p>
          </div>
        )}

        {/* Step 1: Account Creation */}
        {step === "account" && (
          <>
            <h2 className="text-2xl font-bold mb-2 text-center">Skapa ditt konto</h2>
            <p className="text-center text-gray-600 mb-6">
              Börja din resa med Lär med Sinus
            </p>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  E-postadress
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.com"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Lösenord
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minst 6 tecken"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all disabled:opacity-50"
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-pink-500 hover:bg-pink-600 px-5 py-3 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Skapar konto..." : "Fortsätt →"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Profile Creation */}
        {step === "profile" && (
          <>
            <h2 className="text-2xl font-bold mb-2 text-center">Skapa barnprofil</h2>
            <p className="text-center text-gray-600 mb-6">
              Vem ska lära sig idag?
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label htmlFor="childName" className="block text-sm font-medium mb-1">
                  Barnets namn
                </label>
                <input
                  id="childName"
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Anna"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div>
                <label htmlFor="childAge" className="block text-sm font-medium mb-1">
                  Ålder
                </label>
                <input
                  id="childAge"
                  type="number"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                  placeholder="7"
                  min="1"
                  max="18"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all disabled:opacity-50"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 px-5 py-3 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Skapar profil..." : "Börja lära! 🎉"}
              </button>
            </form>
          </>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="text-center py-6">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-2xl font-bold mb-3">Välkommen!</h2>
            <p className="text-gray-600 mb-6">
              Ditt konto är klart och {childName} kan börja lära sig!
            </p>
            <button
              onClick={handleComplete}
              className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-cyan-600 hover:from-pink-600 hover:to-cyan-700 px-6 py-3 text-white font-semibold transition-all shadow-lg"
            >
              Börja utforska →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
