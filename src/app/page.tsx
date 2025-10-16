"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [openAiVoice, setOpenAiVoice] = useState<string>(() => {
    if (typeof window !== "undefined") return window.localStorage.getItem("openAiVoice") || "alloy";
    return "alloy";
  });
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [showOlder, setShowOlder] = useState(false);
  // Persistent Realtime connection primitives
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectingRef = useRef(false);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);
  const realtimePlayingRef = useRef(false);
  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null);

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
      if (res.status === 401) {
        setLoginOpen(true);
      }
      const dbg = body?.debug ? ` debug=${JSON.stringify(body.debug)}` : "";
      throw new Error(`Create session failed: ${res.status} ${body?.error ?? ""}${dbg}`);
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
        const me = meJson?.user ?? null;
        setUser(me);
        const profilesJson = await profilesRes.json().catch(() => ({}));
        const list: { id: string; name: string; age: number }[] = profilesJson?.profiles ?? [];
        setProfiles(list);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("activeProfileId") : null;
        if (stored && list.some((p) => p.id === stored)) setActiveProfileId(stored);
        const limitsJson = await limitsRes.json().catch(() => ({}));
        if (limitsJson?.status) setQuota(limitsJson.status);
        if (!me) setLoginOpen(true);
        // Force HQ off (REST opus by default)
        try { if (typeof window !== "undefined") window.localStorage.setItem("ttsHQ", "0"); } catch {}
        setRealtimeEnabled(false);
      } catch {
        // ignore
      }
    }
    void init();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { dcRef.current?.close(); } catch {}
      try { pcRef.current?.close(); } catch {}
      dcRef.current = null;
      pcRef.current = null;
      audioRef.current = null;
    };
  }, []);

  // When selected OpenAI voice changes, reconnect next time
  useEffect(() => {
    try { dcRef.current?.close(); } catch {}
    try { pcRef.current?.close(); } catch {}
    dcRef.current = null;
    pcRef.current = null;
  }, [openAiVoice]);

  async function ensureRealtimeConnection(): Promise<RTCDataChannel | null> {
    if (!realtimeEnabled) return null;
    if (dcRef.current && dcRef.current.readyState === "open") return dcRef.current;
    if (connectingRef.current) {
      await new Promise((r) => setTimeout(r, 200));
      if (dcRef.current && dcRef.current.readyState === "open") return dcRef.current;
    }
    connectingRef.current = true;
    try {
      setAudioStatus("Kopplar upp ljud…");
      const tokenRes = await fetch('/api/realtime/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voice: openAiVoice }) });
      if (!tokenRes.ok) return null;
      const { session } = await tokenRes.json();
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      try {
        // Ensure audio element is attached (helps some autoplay policies)
        if (typeof document !== 'undefined' && !audio.isConnected) {
          audio.style.display = 'none';
          document.body.appendChild(audio);
        }
      } catch {}
      pc.ontrack = (e) => {
        try { audio.srcObject = e.streams[0]; } catch {}
        realtimePlayingRef.current = true;
        setAudioStatus("Spelar (Realtime)…");
        try { void audio.play(); } catch {}
      };
      audio.onended = () => { setAudioStatus(null); };
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', { method: 'POST', body: offer.sdp, headers: { 'Authorization': `Bearer ${session.client_secret.value}`, 'Content-Type': 'application/sdp', 'OpenAI-Beta': 'realtime=v1' } });
      const answer = { type: 'answer' as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);
      if (dc.readyState !== 'open') {
        await new Promise<void>((resolve) => {
          dc.onopen = () => { setAudioStatus("Ljud uppkopplat"); resolve(); };
          setTimeout(() => resolve(), 1500);
        });
      }
      setAudioStatus("Ljud uppkopplat");
      return dc;
    } finally {
      connectingRef.current = false;
    }
  }

  async function speakWithRealtime(text: string): Promise<boolean> {
    const dc = await ensureRealtimeConnection();
    if (!dc) return false;
    try {
      setAudioStatus("Sänder till Realtime…");
      const event = { type: 'response.create', response: { modalities: ['audio'], audio: { voice: openAiVoice, format: 'opus' }, instructions: text } };
      dc.send(JSON.stringify(event));
      return true;
    } catch {
      return false;
    }
  }

  function splitIntoSentences(text: string): string[] {
    const norm = text.replace(/\s+/g, " ").trim();
    if (!norm) return [];
    const parts: string[] = [];
    let buf = "";
    for (const ch of norm) {
      buf += ch;
      if (/[.!?…]/.test(ch)) {
        parts.push(buf.trim());
        buf = "";
      }
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts;
  }

  async function playSentenceWithTts(sentence: string): Promise<void> {
    setAudioStatus("Genererar ljud…");
    const resp = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sentence, voice: openAiVoice || 'alloy', format: 'opus' }) });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    sentenceAudioRef.current?.pause?.();
    sentenceAudioRef.current = audio;
    await new Promise<void>((resolve) => {
      audio.onplay = () => setAudioStatus("Spelar…");
      audio.onended = () => { setAudioStatus(null); resolve(); };
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });
  }

  // No browser TTS voice picker; fallback will use Swedish if available

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
  const canSend = !!user && !!activeProfile;

  async function reloadProfiles() {
    try {
      const res = await fetch("/api/profiles");
      const json = await res.json().catch(() => ({}));
      setProfiles(json?.profiles ?? []);
    } catch {
      // ignore
    }
  }

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
    void reloadProfiles();
  }

  async function onLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    const email = loginEmail.trim();
    if (!email) {
      setLoginError("Ange e‑post");
      return;
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setLoginError(body?.error ?? "Något gick fel");
      return;
    }
    const json = await res.json().catch(() => ({}));
    setUser(json?.user ?? null);
    setActiveProfileId(null);
    setLoginOpen(false);
    setLoginEmail("");
    void refreshQuota();
    void reloadProfiles();
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

      // If HQ streaming is enabled, start speaking right away (audio-first)
      if (ttsOn && realtimeEnabled) {
        realtimePlayingRef.current = false;
        const ok = await speakWithRealtime(finalPrompt);
        if (!ok) setAudioStatus("Kunde inte starta Realtime – försöker fallback…");
      }
      // Get assistant reply (text for UI)
      const reply = await complete(finalPrompt);
      const assistantText = reply ?? "";

      // Render assistant reply in synced chunks (sentence by sentence)
      const sentences = splitIntoSentences(assistantText);
      const localAssistantId = Math.random().toString(36).slice(2);
      setChat((prev) => [...prev, { id: localAssistantId, role: "assistant", text: "" }]);

      // Speak + write in lockstep
      if (assistantText && ttsOn) {
        try {
          // Use sentence-by-sentence playback for sync when HQ off
          if (!realtimeEnabled) {
            for (let i = 0; i < sentences.length; i++) {
              const s = sentences[i];
              // First render the sentence to the chat
              setChat((prev) => prev.map((m) => (m.id === localAssistantId ? { ...m, text: (prev.find((x) => x.id === localAssistantId)?.text ?? "") + (i ? " " : "") + s } : m)));
              // Then play its audio so voice follows text
              await playSentenceWithTts(s);
            }
          } else {
            // HQ on: we already sent realtime at the start; append text progressively
            for (let i = 0; i < sentences.length; i++) {
              const s = sentences[i];
              setChat((prev) => prev.map((m) => (m.id === localAssistantId ? { ...m, text: (prev.find((x) => x.id === localAssistantId)?.text ?? "") + (i ? " " : "") + s } : m)));
              // If realtime hasn't started, play the sentence via REST so voice follows text
              if (!realtimePlayingRef.current) await playSentenceWithTts(s);
            }
          }
        } catch {}
      }
      // Persist assistant message
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

  const messagesReversed = [...chat].slice().reverse();
  const RECENT_COUNT = 6;
  const olderCount = Math.max(0, messagesReversed.length - RECENT_COUNT);
  const visibleMessages = showOlder ? messagesReversed : messagesReversed.slice(0, RECENT_COUNT);

  return (<>
    <main className="min-h-screen py-10">
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-3xl p-[1px] bg-gradient-to-r from-indigo-700/50 via-cyan-600/40 to-blue-700/50 shadow-xl mb-6 backdrop-blur">
          <div className="rounded-3xl p-6 bg-white/10 backdrop-blur-xl border border-white/10">
            <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-indigo-200 to-blue-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">
              🤖 SpaceBot
            </h1>
            <p className="text-sm text-indigo-100/90">Utforska galaxen med en snäll robotguide.</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4 shadow flex items-center justify-between text-indigo-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xl">{activeProfile ? "🧒" : "👤"}</div>
              <div>
                <div className="text-sm text-gray-500">Aktiv profil</div>
                <div className="text-base font-semibold">{activeProfile ? `${activeProfile.name} (${activeProfile.age})` : (user ? "Ingen vald" : "Inte inloggad")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-indigo-100 bg-black/30 border border-white/10 rounded-full px-3 py-1 shadow">
                {quota ? (
                  <span>Kvar idag: <span className="font-semibold">{quota.remaining}</span> / {quota.limit}</span>
                ) : (
                  <span>Kvar idag: –</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTtsOn((v) => !v)}
                className={ttsOn ? "text-xs rounded-full px-3 py-1 border border-white/10 shadow bg-cyan-600 text-white" : "text-xs rounded-full px-3 py-1 border border-white/10 shadow bg-white/10 text-indigo-100"}
              >
                {ttsOn ? "Ljud: På" : "Ljud: Av"}
              </button>
              {ttsOn ? (
                <select
                  className="text-xs bg-white/10 text-indigo-100 border border-white/10 rounded-full px-2 py-1"
                  value={openAiVoice}
                  onChange={(e) => { setOpenAiVoice(e.target.value); try { window.localStorage.setItem("openAiVoice", e.target.value); } catch {} }}
                  title="OpenAI voice"
                >
                  <option value="alloy">Alloy</option>
                  <option value="verse">Verse</option>
                  <option value="aria">Aria</option>
                  <option value="sage">Sage</option>
                </select>
              ) : null}
              {ttsOn ? (
                <button
                  type="button"
                  onClick={() => { const nv = !realtimeEnabled; setRealtimeEnabled(nv); try { window.localStorage.setItem("ttsHQ", nv ? "1" : "0"); } catch {} }}
                  className={realtimeEnabled ? "text-xs rounded-full px-3 py-1 border border-white/10 shadow bg-indigo-600 text-white" : "text-xs rounded-full px-3 py-1 border border-white/10 shadow bg-white/10 text-indigo-100"}
                  title="HQ (Realtime streaming)"
                >
                  {realtimeEnabled ? "HQ: På" : "HQ: Av (REST opus)"}
                </button>
              ) : null}
              {/* Removed browser TTS voice dropdown */}
              <button
                type="button"
                onClick={() => setShowAccountPanel((v) => !v)}
                className="text-xs rounded-full px-3 py-1 bg-white/10 hover:bg-white/20 text-indigo-100 border border-white/10 shadow"
              >
                {showAccountPanel ? "Dölj konto" : "Konto"}
              </button>
              {/* Debug button moved to floating corner */}
            </div>
          </div>

          {showAccountPanel ? (
            <div className="rounded-2xl bg-white/80 p-3 shadow flex items-center justify-between gap-3">
              <div className="text-xs text-gray-700 flex items-center gap-2">
                {user ? (
                  <>
                    <span>E‑post: <span className="font-semibold">{user.email}</span></span>
                    {profiles.length ? (
                      <>
                        <span className="opacity-60">•</span>
                        <label className="hidden sm:block">Profil:</label>
                        <select
                          className="text-xs bg-white/0 border border-white/20 text-indigo-100 rounded-full px-2 py-1"
                          value={activeProfileId ?? ""}
                          onChange={(e) => setActiveProfileId(e.target.value || null)}
                        >
                          <option value="">Ingen</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} ({p.age})</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setAddProfileOpen(true)}
                          className="text-xs rounded-full px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white"
                        >
                          Ny profil
                        </button>
                      </>
                    ) : null}
                  </>
                ) : (
                  <button onClick={() => setLoginOpen(true)} className="text-xs rounded-full px-3 py-1 bg-pink-500 text-white">Logga in</button>
                )}
              </div>
              {user ? (
                <button
                  type="button"
                  className="text-xs rounded-full px-3 py-1 bg-black/30 border border-white/20 text-gray-800"
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    setUser(null);
                    setActiveProfileId(null);
                    setProfiles([]);
                    setQuota(null);
                    setLoginOpen(true);
                  }}
                >
                  Logga ut
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Profile creation form hidden; use modal via 'Ny profil' button */}

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

        {/* Composer at the top */}
        {!canSend ? (
          <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {!user ? (
              <span>Logga in med din e‑post för att börja. <button type="button" onClick={() => setLoginOpen(true)} className="underline">Öppna inloggning</button></span>
            ) : (
              <span>Välj eller skapa en profil innan du skickar meddelanden.</span>
            )}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="flex gap-2 mb-5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canSend ? "Skriv något...🌈" : (!user ? "Logga in med e‑post för att börja" : "Välj eller skapa en profil för att börja")}
            className="flex-1 border border-white/20 focus:border-sky-400 rounded-full px-4 py-3 bg-white/5 placeholder:text-indigo-200/60 text-indigo-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            disabled={!canSend}
          />
          <button
            disabled={isLoading || !canSend}
            className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-5 py-3 shadow transition-opacity disabled:opacity-50"
          >
            {isLoading ? "Sending… ✉️" : "Send ✨"}
          </button>
        </form>

        {/* Messages newest first */}
        <div className="space-y-3 mb-5">
          {audioStatus ? (
            <div className="text-[11px] text-indigo-100 bg-black/30 border border-white/10 rounded-full inline-block px-3 py-1 shadow">
              {audioStatus}
            </div>
          ) : null}
          {isLoading && completion ? (
            <div className="flex items-start gap-2 justify-start">
              <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-lg bg-indigo-500">🤖</div>
              <div className="max-w-[75%] px-4 py-2 rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_8px_20px_rgba(2,6,23,0.35)] bg-indigo-500/10 text-indigo-100 rounded-tl-none">{completion}</div>
            </div>
          ) : null}
          {visibleMessages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div key={m.id} className={`flex items-start gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-lg ${isUser ? "bg-fuchsia-500" : "bg-indigo-500"}`}>{isUser ? "🧒" : "🤖"}</div>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset,0_8px_20px_rgba(2,6,23,0.35)] ${isUser ? "bg-fuchsia-500/10 text-fuchsia-100 rounded-tr-none" : "bg-indigo-500/10 text-indigo-100 rounded-tl-none"}`}>{m.text}</div>
              </div>
            );
          })}
        </div>
        {olderCount > 0 ? (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowOlder((v) => !v)}
              className="text-xs rounded-full px-4 py-2 bg-white/10 hover:bg-white/20 text-indigo-100 border border-white/10 shadow"
            >
              {showOlder ? "Dölj äldre meddelanden" : `Visa äldre meddelanden (${olderCount})`}
            </button>
          </div>
        ) : null}
        <div className="mt-3 text-xs text-gray-500">{isLoading ? "Roboten tänker…" : ""}</div>
      </div>
    </main>
    {/* Floating Debug toggle */}
    <button
      type="button"
      onClick={() => setShowDebug((v) => !v)}
      className="fixed bottom-4 right-4 z-50 text-xs rounded-full px-4 py-2 bg-white/90 hover:bg-white text-gray-700 shadow"
    >
      {showDebug ? "Hide Debug" : "Debug"} 🔎
    </button>

    {loginOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <div className="text-lg font-semibold mb-2">Logga in</div>
          <p className="text-xs text-gray-600 mb-3">Ange din e‑post för att skapa/logga in på ditt konto.</p>
          <form onSubmit={onLoginSubmit} className="space-y-3">
            <input
              autoFocus
              className="w-full rounded-xl border border-gray-300 px-3 py-2"
              placeholder="din@epost.se"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
            />
            {loginError ? <div className="text-xs text-red-600">{loginError}</div> : null}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setLoginOpen(false)} className="px-4 py-2 text-sm rounded-xl bg-gray-100">Avbryt</button>
              <button className="px-4 py-2 text-sm rounded-xl bg-pink-500 text-white">Logga in</button>
            </div>
          </form>
        </div>
      </div>
    ) : null}

    {addProfileOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <div className="text-lg font-semibold mb-2">Ny profil</div>
          <form onSubmit={(e) => { onAddProfile(e); setAddProfileOpen(false); }} className="space-y-3">
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2"
              placeholder="Namn"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
            />
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2"
              placeholder="Ålder"
              inputMode="numeric"
              value={newProfileAge}
              onChange={(e) => setNewProfileAge(e.target.value ? Number(e.target.value) : "")}
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setAddProfileOpen(false)} className="px-4 py-2 text-sm rounded-xl bg-gray-100">Avbryt</button>
              <button className="px-4 py-2 text-sm rounded-xl bg-sky-500 text-white">Spara</button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
  </>);
}



