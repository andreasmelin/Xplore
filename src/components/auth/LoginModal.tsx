"use client";

import { FormEvent, useState } from "react";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: { id: string; email: string }) => void;
};

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError("Ange e‑post");
      setLoading(false);
      return;
    }
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError("Ange ett lösenord (minst 6 tecken)");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Något gick fel");
        setLoading(false);
        return;
      }

      const json = await res.json().catch(() => ({}));
      const user = json?.user ?? null;
      
      setEmail("");
      setPassword("");
      onSuccess(user);
      onClose();
    } catch {
      setError("Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-gray-800 animate-in fade-in zoom-in duration-200">
        <div className="text-xl font-semibold mb-3 text-gray-900">Logga in</div>
        <p className="text-sm text-gray-600 mb-4">
          Ange din e‑post och lösenord för att skapa eller logga in på ditt konto.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            autoFocus
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
            placeholder="din@epost.se"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all"
            type="password"
            placeholder="Lösenord (minst 6 tecken)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {error && <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm rounded-xl bg-pink-500 hover:bg-pink-600 text-white transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Loggar in..." : "Logga in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


