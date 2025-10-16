"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCompletion } from "@ai-sdk/react";

export default function Page() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
  });
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [chat, setChat] = useState<{ id: string; role: "user" | "assistant"; text: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [profiles, setProfiles] = useState<{ id: string; name: string; age: number }[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileAge, setNewProfileAge] = useState<number | "">("");
  const [quota, setQuota] = useState<{ remaining: number; limit: number; resetAt: string } | null>(null);

  async function ensureSession(initialTitle: string): Promise<string> {
    if (sessionId) return sessionId;
    const title = initialTitle.slice(0, 60);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Create session failed: ${res.status} ${body?.error ?? ""}`);
    }
    const json = await res.json();
    const id = json?.session?.id as string;
    if (!id) throw new Error("No session id returned");
    setSessionId(id);
    return id;
  }

  async function persistMessage(id: string, role: "user" | "assistant", content: string) {
    await fetch(`/api/sessions/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content }),
    });
  }

  useEffect(() => {
    async function init() {
      try {
        const [meRes, profilesRes, limitsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/profiles"),
          fetch("/api/limits/daily"),
        ]);
        const meJson = await meRes.json().catch(() => ({}));
        setUser(meJson?.user ?? null);
        const profilesJson = await profilesRes.json().catch(() => ({}));
        const list: { id: string; name: string; age: number }[] = profilesJson?.profiles ?? [];
        setProfiles(list);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("activeProfileId") : null;
        if (stored && list.some((p) => p.id === stored)) setActiveProfileId(stored);
        const limitsJson = await limitsRes.json().catch(() => ({}));
        if (limitsJson?.status) setQuota(limitsJson.status);
      } catch {
        // ignore
      }
    }
    void init();
  }, []);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeProfileId) {
      window.localStorage.setItem("activeProfileId", activeProfileId);
    }
  }, [activeProfileId]);

  const activeProfile = useMemo(() => profiles.find((p) => p.id === activeProfileId) ?? null, [profiles, activeProfileId]);

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return; // simple UX
    const json = await res.json().catch(() => ({}));
    setUser(json?.user ?? null);
    void refreshQuota();
  }

  async function onAddProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newProfileName.trim();
    const age = typeof newProfileAge === "number" ? newProfileAge : parseInt(String(newProfileAge || "0"), 10);
    if (!name || !Number.isFinite(age)) return;
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, age }),
    });
    if (!res.ok) return;
    const json = await res.json().catch(() => ({}));
    const created = json?.profile as { id: string; name: string; age: number } | undefined;
    if (created) {
      setProfiles((prev) => [...prev, created]);
      setActiveProfileId(created.id);
      setNewProfileName("");
      setNewProfileAge("");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const prefix = activeProfile
      ? `Du pratar med ett barn som heter ${activeProfile.name} som är ${activeProfile.age} år gammal. Svara enkelt, vänligt och på svenska, anpassat till åldern.\n\n`
      : "";
    const finalPrompt = `${prefix}${trimmed}`;

    // Optimistically render user message
    const localUserId = Math.random().toString(36).slice(2);
    setChat((prev) => [...prev, { id: localUserId, role: "user", text: trimmed }]);
    setInput("");

    try {
      // Ensure we have a server session id
      const sid = await ensureSession(trimmed);

      // Persist user message (fire-and-forget)
      void persistMessage(sid, "user", trimmed);

      // Get assistant reply
      const reply = await complete(finalPrompt);
      const assistantText = reply ?? "";

      // Render assistant reply
      const localAssistantId = Math.random().toString(36).slice(2);
      setChat((prev) => [...prev, { id: localAssistantId, role: "assistant", text: assistantText }]);

      // Persist assistant message (fire-and-forget)
      if (assistantText) {
        void persistMessage(sid, "assistant", assistantText);
      }
      void refreshQuota();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const localErrId = Math.random().toString(36).slice(2);
      setChat((prev) => [...prev, { id: localErrId, role: "assistant", text: `Fel: ${message}` }]);
      void refreshQuota();
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-100 via-yellow-100 to-sky-100 py-8">
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-3xl p-1 bg-gradient-to-r from-pink-400 to-sky-400 shadow-lg mb-6">
          <div className="rounded-3xl p-6 bg-white/80 backdrop-blur">
            <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-sky-600">
              🎈 Ottos app
            </h1>
            <p className="text-sm text-gray-600">Prata med en robot! ✨</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 gap-3 flex-wrap">
          <div className="text-xs text-gray-700 bg-white/70 rounded-full px-3 py-1 shadow flex items-center gap-2">
            {user ? (
              <>
                <span>Inloggad: <span className="font-semibold">{user.email}</span></span>
                {profiles.length ? (
                  <>
                    <span className="opacity-60">•</span>
                    <label className="hidden sm:block">Profil:</label>
                    <select
                      className="text-xs bg-white/0 border border-gray-300 rounded-full px-2 py-1"
                      value={activeProfileId ?? ""}
                      onChange={(e) => setActiveProfileId(e.target.value || null)}
                    >
                      <option value="">Ingen</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.age})</option>
                      ))}
                    </select>
                  </>
                ) : null}
              </>
            ) : (
              <form onSubmit={onRegister} className="flex items-center gap-1">
                <input
                  className="text-xs rounded-full px-2 py-1 border border-gray-300 bg-white/80"
                  placeholder="Din e-post"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <button className="text-xs rounded-full px-3 py-1 bg-pink-500 text-white">Registrera</button>
              </form>
            )}
          </div>
          <div className="text-xs text-gray-700 bg-white/70 rounded-full px-3 py-1 shadow">
            {quota ? (
              <span>Kvar idag: <span className="font-semibold">{quota.remaining}</span> / {quota.limit}</span>
            ) : (
              <span>Kvar idag: –</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="text-xs rounded-full px-3 py-1 bg-white/70 hover:bg-white text-gray-700 shadow"
          >
            {showDebug ? "Hide Debug" : "Debug info"} 🔎
          </button>
        </div>

        {user ? (
          <div className="mb-4 rounded-2xl bg-white/80 p-3 shadow-inner">
            <div className="text-sm font-semibold mb-2">Profiler</div>
            {profiles.length === 0 ? (
              <div className="text-xs text-gray-600 mb-2">Lägg till en profil för att anpassa svar efter ålder.</div>
            ) : null}
            <form onSubmit={onAddProfile} className="flex items-center gap-2 flex-wrap">
              <input
                className="text-sm rounded-full px-3 py-2 border border-gray-300 bg-white/90"
                placeholder="Namn"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
              />
              <input
                className="text-sm rounded-full px-3 py-2 border border-gray-300 bg-white/90 w-24"
                placeholder="Ålder"
                inputMode="numeric"
                value={newProfileAge}
                onChange={(e) => setNewProfileAge(e.target.value ? Number(e.target.value) : "")}
              />
              <button className="text-sm rounded-full px-4 py-2 bg-sky-500 text-white">Lägg till</button>
            </form>
          </div>
        ) : null}

        {showDebug ? (
          <div className="mb-5 rounded-2xl bg-white/80 p-3 shadow-inner">
            <div className="text-xs text-gray-700">
              <div className="mb-1">Status: <span className="font-semibold">{isLoading ? "streaming" : "ready"}</span></div>
              <div className="mb-1">SessionId: <span className="font-mono break-all">{sessionId ?? "(none)"}</span></div>
              {error ? (
                <div className="mb-2 text-red-600">Error: {error.message}</div>
              ) : null}
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug">
                {JSON.stringify({ chat, completion, isLoading }, null, 2)}
              </pre>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-3 text-sm text-red-600">{error.message}</div>
        ) : null}

        <div className="space-y-3 mb-5">
          {chat.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-lg ${isUser ? "bg-pink-400" : "bg-sky-400"}`}>
                  {isUser ? "🧒" : "🤖"}
                </div>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm ${isUser ? "bg-pink-100 text-pink-950 rounded-tr-none" : "bg-sky-100 text-sky-950 rounded-tl-none"}`}>
                  {m.text}
                </div>
              </div>
            );
          })}

          {isLoading && completion ? (
            <div className="flex items-start gap-2 justify-start">
              <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-lg bg-sky-400">🤖</div>
              <div className="max-w-[75%] px-4 py-2 rounded-2xl shadow-sm bg-sky-100 text-sky-950 rounded-tl-none">
                {completion}
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv något...🌈"
            className="flex-1 border-2 border-transparent focus:border-sky-400 rounded-full px-4 py-3 bg-white/90 placeholder:text-gray-400 shadow-sm"
          />
          <button
            disabled={isLoading}
            className="rounded-full bg-gradient-to-r from-pink-500 to-sky-500 text-white px-5 py-3 shadow transition-opacity disabled:opacity-50"
          >
            {isLoading ? "Sending… ✉️" : "Send ✨"}
          </button>
        </form>

        <div className="mt-3 text-xs text-gray-500">
          {isLoading ? "Roboten tänker…" : ""}
        </div>
      </div>
    </main>
  );
}



