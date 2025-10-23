"use client";

import { FormEvent, useState } from "react";

type Profile = { id: string; name: string; age: number };

type AddProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: Profile) => void;
};

export default function AddProfileModal({ isOpen, onClose, onSuccess }: AddProfileModalProps) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const trimmedName = name.trim();
    const numAge = typeof age === "number" ? age : parseInt(String(age || "0"), 10);

    if (!trimmedName) {
      setError("Ange ett namn");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(numAge) || numAge < 1 || numAge > 18) {
      setError("Ange en ålder mellan 1 och 18");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, age: numAge }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Kunde inte skapa profil");
        setLoading(false);
        return;
      }

      const json = await res.json().catch(() => ({}));
      const profile = json?.profile as Profile | undefined;

      if (profile) {
        setName("");
        setAge("");
        onSuccess(profile);
        onClose();
      } else {
        setError("Kunde inte skapa profil");
      }
    } catch {
      setError("Något gick fel");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="text-xl font-semibold mb-3 text-gray-900">Skapa Barnprofil</div>
        <p className="text-sm text-gray-600 mb-4">
          Skapa en profil för ditt barn så att Sinus kan anpassa innehållet efter ålder och intressen.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Namn
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
              placeholder="t.ex. Emma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ålder
            </label>
            <input
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
              placeholder="t.ex. 8"
              type="number"
              min="1"
              max="18"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value ? Number(e.target.value) : "")}
              disabled={loading}
            />
          </div>
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
              className="px-5 py-2.5 text-sm rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Skapar..." : "Skapa profil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


