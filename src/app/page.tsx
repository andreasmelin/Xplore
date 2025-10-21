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
  const [loginPassword, setLoginPassword] = useState("");
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [ttsProvider, setTtsProvider] = useState<"openai-realtime" | "openai-rest" | "elevenlabs" | "elevenlabs-stream" | "browser">(() => {
    if (typeof window !== "undefined") return (window.localStorage.getItem("ttsProvider") as any) || "openai-rest";
    return "openai-rest";
  });
  const [speakAsap, setSpeakAsap] = useState<boolean>(() => {
    if (typeof window !== "undefined") return (window.localStorage.getItem("ttsSpeakAsap") === "0" ? false : true);
    return true;
  });
  const [openAiVoice, setOpenAiVoice] = useState<string>(() => {
    if (typeof window !== "undefined") return window.localStorage.getItem("openAiVoice") || "alloy";
    return "alloy";
  });
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [browserVoiceName, setBrowserVoiceName] = useState<string>(() => {
    if (typeof window !== "undefined") return window.localStorage.getItem("browserVoiceName") || "";
    return "";
  });
  const [showOlder, setShowOlder] = useState(false);
  const [showMagic, setShowMagic] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const pointerDownAtRef = useRef<number>(0);
  const cancelRecordingRef = useRef(false);
  // Persistent Realtime connection primitives
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectingRef = useRef(false);
  const [audioStatus, setAudioStatus] = useState<string | null>(null);
  const realtimePlayingRef = useRef(false);
  const sentenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTokenRef = useRef(0);
  const displayTokenRef = useRef(0);
  const overlayClearedRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

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
        if (stored && list.some((p) => p.id === stored)) {
          setActiveProfileId(stored);
        } else if (me && list.length > 0) {
          // Auto-select first profile when logging in and none stored
          const first = list[0];
          setActiveProfileId(first.id);
          try { if (typeof window !== "undefined") window.localStorage.setItem("activeProfileId", first.id); } catch {}
        }
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

  // Sync realtime toggle with provider and close RTC if switching away
  useEffect(() => {
    const enable = ttsProvider === "openai-realtime";
    setRealtimeEnabled(enable);
    if (!enable) {
      try { dcRef.current?.close(); } catch {}
      try { pcRef.current?.close(); } catch {}
      dcRef.current = null;
      pcRef.current = null;
    }
  }, [ttsProvider]);

  // Load browser voices (no account needed)
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    function refreshVoices() {
      const list = window.speechSynthesis.getVoices();
      setBrowserVoices(list);
      if (!browserVoiceName && list.length) {
        const preferred = list.find(v => /sv|se|swedish/i.test(v.lang)) || list[0];
        setBrowserVoiceName(preferred.name);
        try { window.localStorage.setItem("browserVoiceName", preferred.name); } catch {}
      }
    }
    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
  }, []);

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
      const { session, model } = await tokenRes.json();
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
        try {
          audio.onplay = () => {
            if (!overlayClearedRef.current) { setShowMagic(false); overlayClearedRef.current = true; }
          };
          void audio.play();
        } catch {}
      };
      audio.onended = () => { setAudioStatus(null); };
      // Ensure we are set to receive audio
      try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch {}
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      // Wait for ICE gathering to complete for non-trickle flow
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') return resolve();
        const onStateChange = () => {
          if (pc.iceGatheringState === 'complete') {
            pc.removeEventListener('icegatheringstatechange', onStateChange);
            resolve();
          }
        };
        pc.addEventListener('icegatheringstatechange', onStateChange);
        setTimeout(() => { pc.removeEventListener('icegatheringstatechange', onStateChange); resolve(); }, 2000);
      });
      const localSdp = pc.localDescription?.sdp || offer.sdp;
      const apiModel = model || 'gpt-4o-realtime-preview-2024-12-17';
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(apiModel)}`, { method: 'POST', body: localSdp, headers: { 'Authorization': `Bearer ${session.client_secret.value}`, 'Content-Type': 'application/sdp', 'OpenAI-Beta': 'realtime=v1' } });
      if (!sdpRes.ok) {
        setAudioStatus('Realtime fel vid SDP-svar');
        return null;
      }
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

  async function testRealtime(): Promise<void> {
    try {
      setTtsOn(true);
      setTtsProvider("openai-realtime");
      console.log("[RT] Starting realtime test");
      const dc = await ensureRealtimeConnection();
      console.log("[RT] DC state:", dc?.readyState, "PC state:", pcRef.current?.connectionState, "ICE:", pcRef.current?.iceConnectionState);
      if (!dc) { setAudioStatus("Realtime: kunde inte koppla upp"); return; }
      const ok = await speakWithRealtime("Hej! Detta är ett test av realtime-ljud.");
      console.log("[RT] Sent test utterance, ok:", ok);
    } catch (e) {
      console.error("[RT] Test error:", e);
      setAudioStatus("Realtime test fel");
    }
  }

  function forceUnmute() {
    try {
      const audioEl = audioRef.current;
      if (audioEl) {
        audioEl.muted = false;
        audioEl.volume = 1;
        void audioEl.play().catch(() => {});
      }
      const sentenceEl = sentenceAudioRef.current;
      if (sentenceEl) {
        sentenceEl.muted = false;
        sentenceEl.volume = 1;
        void sentenceEl.play().catch(() => {});
      }
      setAudioStatus("Upplåst ljud");
      setTimeout(() => setAudioStatus(null), 1500);
    } catch {}
  }

  // Browser TTS (Web Speech API) – no account needed
  async function speakWithBrowserTts(sentences: string[], tokenAtStart: number): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    // cancel any ongoing speech
    try { window.speechSynthesis.cancel(); } catch {}
    setAudioStatus("Spelar…");
    const voice = browserVoices.find(v => v.name === browserVoiceName) || undefined;
    for (let i = 0; i < sentences.length; i++) {
      if (playbackTokenRef.current !== tokenAtStart) break;
      const u = new SpeechSynthesisUtterance(sentences[i]);
      if (voice) u.voice = voice;
      await new Promise<void>((resolve) => {
        u.onend = () => resolve();
        u.onerror = () => resolve();
        try {
          if (!overlayClearedRef.current) { setShowMagic(false); overlayClearedRef.current = true; }
          window.speechSynthesis.speak(u);
        } catch { resolve(); }
      });
    }
    if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
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

  // Prefetch one sentence's audio and return an object URL
  async function fetchTtsUrl(sentence: string, provider?: "openai" | "elevenlabs"): Promise<string | null> {
    try {
      const resp = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sentence, voice: openAiVoice || 'alloy', format: 'opus', provider }) });
      if (!resp.ok) {
        try {
          const err = await resp.json().catch(() => ({} as any));
          console.warn('[TTS] Error', provider, err?.error || resp.status);
          setAudioStatus(typeof err?.error === 'string' ? err.error : 'TTS fel');
        } catch {}
        return null;
      }
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  // Fetch with timeout helper (client-side)
  async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
    const { timeoutMs = 15000, ...rest } = init;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { ...rest, signal: controller.signal });
      return resp;
    } finally {
      clearTimeout(id);
    }
  }

  // Play an already-prefetched audio URL in order
  async function playAudioUrl(url: string): Promise<void> {
    const audio = new Audio(url);
    sentenceAudioRef.current?.pause?.();
    sentenceAudioRef.current = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onplay = () => {
        if (!overlayClearedRef.current) { setShowMagic(false); overlayClearedRef.current = true; }
      };
      void audio.play().catch(() => { URL.revokeObjectURL(url); resolve(); });
    });
  }

  // Fast, soft typewriter: reveal words quickly, independent of audio
  async function renderTextTypewriter(assistantId: string, fullText: string, token: number, baseDelayMs = 180) {
    const words = fullText.split(/\s+/).filter(Boolean);
    let accumulated = "";
    for (let i = 0; i < words.length; i++) {
      if (displayTokenRef.current !== token) break;
      const word = words[i];
      accumulated += (i ? " " : "") + word;
      setChat((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: accumulated } : m)));
      const isPunct = /[.!?…]$/.test(word);
      const delay = isPunct ? baseDelayMs * 8 : baseDelayMs;
      await new Promise((r) => setTimeout(r, delay));
    }
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
      const list: { id: string; name: string; age: number }[] = json?.profiles ?? [];
      setProfiles(list);
      // If profiles exist and none selected, auto-select the first
      if (!activeProfileId && list.length > 0) {
        const first = list[0];
        setActiveProfileId(first.id);
        try { if (typeof window !== "undefined") window.localStorage.setItem("activeProfileId", first.id); } catch {}
      }
    } catch {
      // ignore
    }
  }
  // --- STT helpers ---
  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordedChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunksRef.current.push(e.data); };
      rec.onstop = () => {
        try { stream.getTracks().forEach(t => t.stop()); } catch {}
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch {
      // Permission denied or unsupported
    }
  }

  async function stopAndTranscribe(sendIfAny = true) {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try { rec.stop(); } catch {}
    setIsRecording(false);
    await new Promise((r) => setTimeout(r, 50));
    const chunks = recordedChunksRef.current;
    if (!sendIfAny || !chunks.length) return;
    const blob = new Blob(chunks, { type: "audio/webm" });
    const form = new FormData();
    form.append("audio", blob, "audio.webm");
    form.append("language", "sv");
    const resp = await fetch('/api/stt', { method: 'POST', body: form });
    if (!resp.ok) return;
    const json = await resp.json().catch(() => ({}));
    const text: string = (json?.text || "").trim();
    if (text) {
      setInput(text);
      if (canSend) {
        setTimeout(() => { try { formRef.current?.requestSubmit(); } catch {} }, 0);
      }
    }
  }

  function armPressToTalk() {
    if (recordTimerRef.current) window.clearTimeout(recordTimerRef.current);
    cancelRecordingRef.current = false;
    pointerDownAtRef.current = Date.now();
    recordTimerRef.current = window.setTimeout(() => { void startRecording(); }, 350);
  }

  async function releasePressToTalk() {
    if (recordTimerRef.current) { window.clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    const heldMs = Date.now() - pointerDownAtRef.current;
    if (isRecording) {
      await stopAndTranscribe(!cancelRecordingRef.current);
    } else if (heldMs < 350 && !cancelRecordingRef.current) {
      // It was a quick tap: do nothing here, normal click handler will send
    }
  }

  function cancelPressToTalk() {
    cancelRecordingRef.current = true;
    if (recordTimerRef.current) { window.clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    if (isRecording) { void stopAndTranscribe(false); }
    setIsRecording(false);
  }

  // (legacy) inline register is no longer used

  async function onLoginSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoginError(null);
    const email = loginEmail.trim();
    const password = loginPassword.trim();
    if (!email) {
      setLoginError("Ange e‑post");
      return;
    }
    if (!password || password.length < 6) {
      setLoginError("Ange ett lösenord (minst 6 tecken)");
      return;
    }
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
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
    setLoginPassword("");
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
      // Cancel any ongoing playback and start a new token
      try { sentenceAudioRef.current?.pause?.(); } catch {}
      playbackTokenRef.current++;
      const tokenAtStart = playbackTokenRef.current;
      overlayClearedRef.current = false;
      // Show magic overlay immediately if audio is enabled; it will hide on first audio play
      if (ttsOn) setShowMagic(true);

      // Ensure we have a server session id
      const sid = await ensureSession(trimmed);

      // Persist user message (fire-and-forget)
      void persistMessage(sid, "user", trimmed);

      // If provider is Realtime, start speaking right away (audio-first)
      if (ttsOn && ttsProvider === "openai-realtime") {
        setShowMagic(true);
        realtimePlayingRef.current = false;
        const ok = await speakWithRealtime(finalPrompt);
        if (!ok) setAudioStatus("Kunde inte starta Realtime – försöker fallback…");
      }
      // Get assistant reply (text for UI) and include active profile id for server-side system message
      const reply = await complete(finalPrompt, { body: { profileId: activeProfile?.id ?? activeProfileId ?? null } as any });
      const assistantText = reply ?? "";

      // Prepare sentence list and assistant message shell
      const sentences = splitIntoSentences(assistantText);
      const localAssistantId = Math.random().toString(36).slice(2);
      setChat((prev) => [...prev, { id: localAssistantId, role: "assistant", text: "" }]);

      // Start fast typewriter display (independent of audio)
      if (assistantText) {
        displayTokenRef.current++;
        const displayToken = displayTokenRef.current;
        void renderTextTypewriter(localAssistantId, assistantText, displayToken);
      }

      // Audio: choose provider and play in background, preserving order
      if (assistantText && ttsOn) {
        try {
          if (ttsProvider === "openai-rest") {
            setShowMagic(true);
            const urlPromises = sentences.map((s) => fetchTtsUrl(s, "openai"));
            void (async () => {
              setAudioStatus("Spelar…");
              for (let i = 0; i < sentences.length; i++) {
                const url = await urlPromises[i];
                if (!url) continue;
                if (playbackTokenRef.current !== tokenAtStart) { URL.revokeObjectURL(url); break; }
                await playAudioUrl(url);
              }
              if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
            })();
          } else if (ttsProvider === "openai-realtime") {
            const urlPromises = sentences.map((s) => fetchTtsUrl(s, "openai"));
            void (async () => {
              setAudioStatus("Spelar…");
              for (let i = 0; i < sentences.length; i++) {
                if (realtimePlayingRef.current) { break; }
                const url = await urlPromises[i];
                if (!url) continue;
                if (playbackTokenRef.current !== tokenAtStart) { URL.revokeObjectURL(url); break; }
                await playAudioUrl(url);
              }
              // Clear status unless realtime took over; or if cancelled
              if (playbackTokenRef.current !== tokenAtStart) { setAudioStatus(null); return; }
              if (realtimePlayingRef.current) { setAudioStatus("Spelar (Realtime)…"); } else { setAudioStatus(null); }
            })();
          } else if (ttsProvider === "elevenlabs-stream" || (ttsProvider === "elevenlabs" && speakAsap)) {
            // Stream directly from ElevenLabs endpoint so audio starts ASAP
            void (async () => {
              try {
                setShowMagic(true);
                setAudioStatus("Spelar…");
                const qs = new URLSearchParams({ provider: "elevenlabs", text: assistantText });
                const url = `/api/tts?${qs.toString()}`;
                const audio = new Audio(url);
                sentenceAudioRef.current?.pause?.();
                sentenceAudioRef.current = audio;
                await new Promise<void>((resolve) => {
                  audio.onended = () => { resolve(); };
                  audio.onerror = () => { resolve(); };
                  audio.onplay = () => { if (!overlayClearedRef.current) { setShowMagic(false); overlayClearedRef.current = true; } };
                  void audio.play().catch(() => resolve());
                });
                if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
              } catch {
                // Fallback to buffered OpenAI REST if streaming fails
                setAudioStatus("ElevenLabs strömning misslyckades – faller tillbaka till OpenAI…");
                const urlPromises = sentences.map((s) => fetchTtsUrl(s, "openai"));
                for (let i = 0; i < sentences.length; i++) {
                  const url = await urlPromises[i];
                  if (!url) continue;
                  if (playbackTokenRef.current !== tokenAtStart) { URL.revokeObjectURL(url); break; }
                  await playAudioUrl(url);
                }
                if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
              }
            })();
          } else if (ttsProvider === "elevenlabs") {
            // Single request for entire assistant text to avoid concurrency limits; fallback to OpenAI on timeout/error
            void (async () => {
              try {
                setAudioStatus("Genererar ljud…");
                setShowMagic(true);
                const resp = await fetchWithTimeout('/api/tts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ text: assistantText, provider: 'elevenlabs', format: 'mp3' }),
                  timeoutMs: 15000,
                });
                if (!resp.ok) {
                  const err = await resp.json().catch(() => ({} as any));
                  setAudioStatus(typeof err?.error === 'string' ? err.error : 'TTS fel');
                  // Fallback to OpenAI REST if ElevenLabs is busy
                  setAudioStatus("ElevenLabs upptagen – faller tillbaka till OpenAI…");
                  const urlPromises = sentences.map((s) => fetchTtsUrl(s, "openai"));
                  for (let i = 0; i < sentences.length; i++) {
                    const url = await urlPromises[i];
                    if (!url) continue;
                    if (playbackTokenRef.current !== tokenAtStart) { URL.revokeObjectURL(url); break; }
                    await playAudioUrl(url);
                  }
                  if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
                  return;
                }
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                if (playbackTokenRef.current !== tokenAtStart) { URL.revokeObjectURL(url); return; }
                await playAudioUrl(url);
                if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
              } catch {
                // Timeout or fetch error: fallback to OpenAI REST
                setAudioStatus("ElevenLabs timeout – faller tillbaka till OpenAI…");
                const urlPromises = sentences.map((s) => fetchTtsUrl(s, "openai"));
                for (let i = 0; i < sentences.length; i++) {
                  const url = await urlPromises[i];
                  if (!url) continue;
                  if (playbackTokenRef.current !== tokenAtStart) { if (url) URL.revokeObjectURL(url); break; }
                  await playAudioUrl(url);
                }
                if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
              }
            })();
          } else if (ttsProvider === "browser") {
            setShowMagic(true);
            void speakWithBrowserTts(sentences, tokenAtStart);
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
    <main className="min-h-screen pb-10">
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-4">
          <div className="flex flex-col items-center justify-center text-indigo-100/90">
            <img
              src="/logos/sinus-logo-1024px.png"
              alt="Sinus"
              className="h-24 w-24 rounded-xl object-cover shadow"
            />
            <div className="mt-1 text-[21px] brand-title drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">Lär med Sinus</div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <div className="rounded-2xl bg-white/10 border border-white/10 p-4 shadow flex items-center justify-between text-indigo-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xl">{activeProfile ? "🧒" : "👤"}</div>
              <div>
                <div className="text-base font-semibold">{activeProfile ? `${activeProfile.name} (${activeProfile.age})` : (user ? "Ingen vald" : "Inte inloggad")}</div>
              </div>
            </div>
              <div className="flex items-center gap-2">
              <div className="w-40 sm:w-56">
                {quota ? (
                  <div className="flex items-center gap-0">
                    <div className="progress-rainbow flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={quota.limit} aria-valuenow={quota.remaining} aria-label="Kvar idag">
                      <div className="bar" style={{ width: `${Math.max(0, Math.min(100, Math.round((quota.remaining / Math.max(1, quota.limit)) * 100)))}%` }} />
                    </div>
                    <div className="text-[10px] tabular-nums text-indigo-100/80 w-8 text-right">{quota.remaining}/{quota.limit}</div>
                  </div>
                ) : (
                  <div className="text-[10px] text-indigo-100/80">Kvar idag: –</div>
                )}
              </div>
              {/* Controls moved to Setup floating panel */}
              {/* Realtime toggle not needed; tied to provider selection */}
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
                          className="text-xs bg-white border border-gray-300 text-gray-700 rounded-full px-2 py-1"
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

        <form ref={formRef} onSubmit={onSubmit} className="flex gap-2 mb-5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={canSend ? "Skriv ett meddelande… eller håll Send för att prata 🎤" : (!user ? "Logga in med e‑post för att börja" : "Välj eller skapa en profil för att börja")}
            className="flex-1 border border-white/20 focus:border-sky-400 rounded-full px-4 py-3 bg-white/5 placeholder:text-indigo-200/60 text-indigo-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            disabled={!canSend}
          />
          <button
            type="submit"
            disabled={isLoading || !canSend}
            className={isRecording ? "rounded-full px-5 py-3 shadow transition-opacity disabled:opacity-50 bg-red-600 text-white ring-1 ring-white/40" : "rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-5 py-3 shadow transition-opacity disabled:opacity-50 ring-1 ring-white/25 hover:ring-white/45"}
            onPointerDown={(e) => { if (!canSend) return; e.currentTarget.setPointerCapture?.(e.pointerId); armPressToTalk(); }}
            onPointerUp={(e) => { e.currentTarget.releasePointerCapture?.(e.pointerId); void releasePressToTalk(); }}
            onPointerCancel={() => cancelPressToTalk()}
            onPointerLeave={() => { /* slide to cancel */ cancelPressToTalk(); }}
            aria-pressed={isRecording}
            title={isRecording ? "Recording… release to stop" : "Click to send, hold to talk"}
            aria-label={isRecording ? "Recording. Release to stop and send transcription" : "Click to send text. Hold to record and auto-send"}
          >
            {isRecording ? "Recording… 🎤" : (isLoading ? "Sending… ✉️" : "Send ✉️ · Hold 🎤")}
          </button>
        </form>

        {/* Messages newest first */}
        <div className="space-y-3 mb-5">
          {audioStatus ? (
            <div className="text-[11px] text-indigo-100 bg-black/30 border border-white/10 rounded-full inline-block px-3 py-1 shadow">
              {audioStatus}
            </div>
          ) : null}
          {showMagic ? (
            <div className="magic-overlay">
              <div className="magic-orb-wrap" style={{ width: 560, height: 560 }}>
                <div className="magic-orb-halo" />
                <div className="magic-orb" />
                <div className="magic-orb-rays" />
                <div className="magic-orb-beam" />
              </div>
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
    {/* Floating Setup toggle */}
    <button
      type="button"
      onClick={() => setShowSetup((v) => !v)}
      className="fixed bottom-16 right-4 z-50 text-xs rounded-full px-4 py-2 bg-white/90 hover:bg-white text-gray-700 shadow"
    >
      {showSetup ? "Close Setup" : "Setup"} ⚙️
    </button>
    <button
      type="button"
      onClick={() => setShowDebug((v) => !v)}
      className="fixed bottom-4 right-4 z-50 text-xs rounded-full px-4 py-2 bg-white/90 hover:bg-white text-gray-700 shadow"
    >
      {showDebug ? "Hide Debug" : "Debug"} 🔎
    </button>

    {showSetup ? (
      <div className="fixed bottom-28 right-4 z-50 w-[320px] rounded-2xl bg-white p-4 shadow-xl border border-gray-200">
        <div className="text-sm font-semibold mb-2 text-gray-800">TTS Setup</div>
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <button
            type="button"
            onClick={() => setTtsOn((v) => !v)}
            className={ttsOn ? "text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-cyan-600 text-white" : "text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"}
            title="Ljud på/av"
          >
            {ttsOn ? "Ljud: På" : "Ljud: Av"}
          </button>
          <select
            className="text-xs bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2 py-1"
            value={ttsProvider}
            onChange={(e) => { const v = e.target.value as typeof ttsProvider; setTtsProvider(v); try { window.localStorage.setItem("ttsProvider", v); } catch {} }}
            title="TTS Provider"
          >
            <option value="openai-rest">OpenAI (REST)</option>
            <option value="openai-realtime">OpenAI (Realtime)</option>
            <option value="elevenlabs">ElevenLabs (REST)</option>
            <option value="elevenlabs-stream">ElevenLabs (Streaming)</option>
            <option value="browser">Browser TTS</option>
          </select>
          <button
            type="button"
            onClick={() => { const nv = !speakAsap; setSpeakAsap(nv); try { window.localStorage.setItem("ttsSpeakAsap", nv ? "1" : "0"); } catch {} }}
            className={speakAsap ? "text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-cyan-600 text-white" : "text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"}
            title="Börja prata direkt när ljud finns"
          >
            {speakAsap ? "Börja direkt" : "Vänta klart"}
          </button>
          <button
            type="button"
            onClick={() => { void testRealtime(); }}
            className="text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"
            title="Testa Realtime"
          >
            Test Realtime
          </button>
          <button
            type="button"
            onClick={() => forceUnmute()}
            className="text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"
            title="Tvinga uppspelning"
          >
            Force Unmute
          </button>
        </div>
        {ttsOn ? (
          ttsProvider === "openai-rest" || ttsProvider === "openai-realtime" ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-600">OpenAI-röst:</div>
              <select
                className="text-xs bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2 py-1"
                value={openAiVoice}
                onChange={(e) => { setOpenAiVoice(e.target.value); try { window.localStorage.setItem("openAiVoice", e.target.value); } catch {} }}
              >
                <option value="alloy">Alloy</option>
                <option value="verse">Verse</option>
                <option value="aria">Aria</option>
                <option value="sage">Sage</option>
              </select>
            </div>
          ) : ttsProvider === "browser" ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-600">Browser-röst:</div>
              <select
                className="text-xs bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2 py-1"
                value={browserVoiceName}
                onChange={(e) => { setBrowserVoiceName(e.target.value); try { window.localStorage.setItem("browserVoiceName", e.target.value); } catch {} }}
              >
                {browserVoices.map((v) => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
                {!browserVoices.length ? <option value="">(Inga röster hittades)</option> : null}
              </select>
            </div>
          ) : null
        ) : null}
      </div>
    ) : null}

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
            <input
              className="w-full rounded-xl border border-gray-300 px-3 py-2"
              type="password"
              placeholder="Lösenord"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
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



