"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCompletion } from "@ai-sdk/react";
import Image from "next/image";

type Profile = { id: string; name: string; age: number };

type ChatInterfaceProps = {
  activeProfile: Profile | null;
  onNeedLogin: () => void;
};

export default function ChatInterface({ activeProfile, onNeedLogin }: ChatInterfaceProps) {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
  });

  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [chat, setChat] = useState<{ id: string; role: "user" | "assistant"; text: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  
  type TTSProvider = "openai-realtime" | "openai-rest" | "elevenlabs" | "elevenlabs-stream" | "browser";
  const [ttsProvider, setTtsProvider] = useState<TTSProvider>(() => {
    if (typeof window !== "undefined") return (window.localStorage.getItem("ttsProvider") as TTSProvider | null) || "elevenlabs-stream";
    return "elevenlabs-stream";
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
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const hasInteractedRef = useRef(false);
  const [didAttachTapUnlock, setDidAttachTapUnlock] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const pointerDownAtRef = useRef<number>(0);
  const cancelRecordingRef = useRef(false);
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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = !!activeProfile;

  // Auto-resize textarea
  function autoResizeTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set height to scrollHeight with min/max constraints
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 200); // Min 40px, max 200px
    textarea.style.height = `${newHeight}px`;
  }

  // Auto-resize when input changes
  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

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
        onNeedLogin();
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

  // Load browser voices
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
  }, [browserVoiceName]);

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
      const { session, model } = (await tokenRes.json().catch(() => ({}))) as { session?: { client_secret?: { value?: string } }; model?: string };
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;
      try {
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
          void audio.play().catch(() => { setNeedsAudioUnlock(true); setAudioStatus("Tryck 'Aktivera ljud'"); setShowMagic(false); overlayClearedRef.current = true; });
        } catch { setNeedsAudioUnlock(true); }
      };
      audio.onended = () => { setAudioStatus(null); };
      try { pc.addTransceiver('audio', { direction: 'recvonly' }); } catch {}
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
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
      const sessionToken = session?.client_secret?.value;
      if (!sessionToken) {
        setAudioStatus('Realtime: saknar sessionstoken');
        return null;
      }
      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(apiModel)}`, { method: 'POST', body: localSdp, headers: { 'Authorization': `Bearer ${sessionToken}`, 'Content-Type': 'application/sdp', 'OpenAI-Beta': 'realtime=v1' } });
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
      if (typeof window !== 'undefined') {
        if (!audioCtxRef.current) {
          try {
            const w = window as unknown as { webkitAudioContext?: typeof AudioContext };
            const Ctor = w.webkitAudioContext ?? window.AudioContext;
            if (Ctor) audioCtxRef.current = new Ctor();
          } catch {}
        }
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state !== 'running') {
          void ctx.resume().catch(() => {});
        }
        if (ctx) {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.02);
          } catch {}
        }
      }
      const audioEl = audioRef.current;
      if (audioEl) {
        audioEl.muted = false;
        audioEl.volume = 1;
        try { audioEl.setAttribute('playsinline', 'true'); } catch {}
        void audioEl.play().catch(() => {});
      }
      const sentenceEl = sentenceAudioRef.current;
      if (sentenceEl) {
        sentenceEl.muted = false;
        sentenceEl.volume = 1;
        try { sentenceEl.setAttribute('playsinline', 'true'); } catch {}
        void sentenceEl.play().catch(() => {});
      }
      setAudioStatus("Upplåst ljud");
      setTimeout(() => setAudioStatus(null), 1500);
    } catch {}
  }

  // iOS: On first user tap anywhere, try to unlock audio once automatically
  useEffect(() => {
    if (didAttachTapUnlock) return;
    if (typeof window === 'undefined') return;
    const handler = () => { try { forceUnmute(); setNeedsAudioUnlock(false); } catch {} };
    const opts: AddEventListenerOptions = { once: true, passive: true };
    window.addEventListener('pointerdown', handler as EventListener, opts);
    window.addEventListener('touchstart', handler as EventListener, opts);
    window.addEventListener('touchend', handler as EventListener, opts);
    window.addEventListener('click', handler as EventListener, opts);
    window.addEventListener('keydown', handler as EventListener, opts);
    setDidAttachTapUnlock(true);
    return () => {
      try {
        window.removeEventListener('pointerdown', handler as EventListener);
        window.removeEventListener('touchstart', handler as EventListener);
        window.removeEventListener('touchend', handler as EventListener);
        window.removeEventListener('click', handler as EventListener);
        window.removeEventListener('keydown', handler as EventListener);
      } catch {}
    };
  }, [didAttachTapUnlock]);

  // Browser TTS (Web Speech API)
  async function speakWithBrowserTts(sentences: string[], tokenAtStart: number): Promise<void> {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
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

  async function fetchTtsUrl(sentence: string, provider?: "openai" | "elevenlabs"): Promise<string | null> {
    try {
      const resp = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: sentence, voice: openAiVoice || 'alloy', format: 'opus', provider }) });
      if (!resp.ok) {
        try {
          const err = await resp.json().catch(() => ({} as unknown as { error?: string }));
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

  async function _fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
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
      void audio.play().catch(() => { setNeedsAudioUnlock(true); setAudioStatus("Tryck 'Aktivera ljud'"); setShowMagic(false); overlayClearedRef.current = true; URL.revokeObjectURL(url); resolve(); });
    });
  }

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

  // STT helpers
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
    } catch {}
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

  function _armPressToTalk() {
    if (recordTimerRef.current) window.clearTimeout(recordTimerRef.current);
    cancelRecordingRef.current = false;
    pointerDownAtRef.current = Date.now();
    recordTimerRef.current = window.setTimeout(() => { void startRecording(); }, 350);
  }

  async function _releasePressToTalk() {
    if (recordTimerRef.current) { window.clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    const heldMs = Date.now() - pointerDownAtRef.current;
    if (isRecording) {
      await stopAndTranscribe(!cancelRecordingRef.current);
    } else if (heldMs < 350 && !cancelRecordingRef.current) {
      // Quick tap: do nothing here, normal click handler will send
    }
  }

  function _cancelPressToTalk() {
    cancelRecordingRef.current = true;
    if (recordTimerRef.current) { window.clearTimeout(recordTimerRef.current); recordTimerRef.current = null; }
    if (isRecording) { void stopAndTranscribe(false); }
    setIsRecording(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !activeProfile) return;
    
    // Force unmute on first user input to unlock audio for entire session
    if (!hasInteractedRef.current) {
      forceUnmute();
      hasInteractedRef.current = true;
    }

    const prefix = `Du pratar med ett barn som heter ${activeProfile.name} som är ${activeProfile.age} år gammal. Svara enkelt, vänligt och på svenska, anpassat till åldern.\n\n`;
    const finalPrompt = `${prefix}${trimmed}`;

    const localUserId = Math.random().toString(36).slice(2);
    setChat((prev) => [...prev, { id: localUserId, role: "user", text: trimmed }]);
    setInput("");

    try {
      try { sentenceAudioRef.current?.pause?.(); } catch {}
      playbackTokenRef.current++;
      const tokenAtStart = playbackTokenRef.current;
      overlayClearedRef.current = false;
      if (ttsOn) setShowMagic(true);

      const sid = await ensureSession(trimmed);
      void persistMessage(sid, "user", trimmed);

      if (ttsOn && ttsProvider === "openai-realtime") {
        setShowMagic(true);
        realtimePlayingRef.current = false;
        const ok = await speakWithRealtime(finalPrompt);
        if (!ok) setAudioStatus("Kunde inte starta Realtime – försöker fallback…");
      }

      const lastFew = [...chat].slice(-6);
      const topics = lastFew.map(m => m.text).join(" \n ").slice(0, 400);
      const reply = await complete(finalPrompt, { body: { profileId: activeProfile?.id ?? null, recentContext: topics } as Record<string, unknown> });
      const assistantText = reply ?? "";

      const sentences = splitIntoSentences(assistantText);
      const localAssistantId = Math.random().toString(36).slice(2);
      setChat((prev) => [...prev, { id: localAssistantId, role: "assistant", text: "" }]);

      if (assistantText) {
        displayTokenRef.current++;
        const displayToken = displayTokenRef.current;
        void renderTextTypewriter(localAssistantId, assistantText, displayToken);
      }

      // Force unmute before audio playback
      if (assistantText && ttsOn) {
        forceUnmute();
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
          } else if (ttsProvider === "elevenlabs-stream" || (ttsProvider === "elevenlabs" && speakAsap)) {
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
                  audio.onended = () => {
                    addDebugLog('✅ Audio playback ended successfully');
                    resolve();
                  };
                  audio.onerror = () => {
                    addDebugLog('❌ Audio playback error');
                    resolve();
                  };
                  audio.onplay = () => {
                    addDebugLog('▶️ Audio started playing');
                    if (!overlayClearedRef.current) { setShowMagic(false); overlayClearedRef.current = true; }
                  };
                  void audio.play().then(() => {
                    addDebugLog('✅ Audio play promise resolved');
                  }).catch((err) => {
                    addDebugLog(`❌ Audio play failed: ${err}`);
                    // If audio fails, try one more time after a brief delay
                    setTimeout(() => {
                      addDebugLog('🔄 Retrying audio play...');
                      void audio.play().catch((retryErr) => {
                        addDebugLog(`❌ Audio retry also failed: ${retryErr}`);
                      });
                    }, 100);
                    setShowMagic(false);
                    overlayClearedRef.current = true;
                    resolve();
                  });
                });
                if (playbackTokenRef.current === tokenAtStart) setAudioStatus(null);
              } catch {
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
          } else if (ttsProvider === "browser") {
            setShowMagic(true);
            void speakWithBrowserTts(sentences, tokenAtStart);
          }
        } catch {}
      }

      if (assistantText) {
        void persistMessage(sid, "assistant", assistantText);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const localErrId = Math.random().toString(36).slice(2);
      setChat((prev) => [...prev, { id: localErrId, role: "assistant", text: `Fel: ${message}` }]);
    }
  }

  const messagesReversed = [...chat].slice().reverse();
  const RECENT_COUNT = 6;
  const olderCount = Math.max(0, messagesReversed.length - RECENT_COUNT);
  const visibleMessages = showOlder ? messagesReversed : messagesReversed.slice(0, RECENT_COUNT);

  return (
    <div className="mx-auto max-w-3xl p-6">
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

      {/* Composer */}
      {!canSend ? (
        <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span>Välj eller skapa en profil innan du skickar meddelanden.</span>
        </div>
      ) : null}

      <form ref={formRef} onSubmit={onSubmit} className="mb-5">
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-1">💬</span>
            <div className="flex-1">
              <p className="text-purple-200 text-sm font-medium mb-2">Ställ din fråga till Sinus</p>
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={canSend ? "Skriv din fråga här..." : "Välj eller skapa en profil för att börja"}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none overflow-y-auto min-h-[40px] max-h-[200px]"
                  disabled={!canSend}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (formRef.current) formRef.current.requestSubmit();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={isRecording ? () => stopAndTranscribe(true) : () => startRecording()}
                  disabled={!canSend}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-purple-500 hover:bg-purple-600"
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? "Stoppa inspelning" : "Klicka för att spela in"}
                >
                  {isRecording ? "⏹️" : "🎤"}
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  type="submit"
                  disabled={isLoading || !canSend || !input.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Skickar...</span>
                    </>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>Skicka fråga</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Audio Indicator - Clickable for Force Unmute */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => forceUnmute()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all cursor-pointer"
          aria-label="Aktivera ljud för Sinus"
          title="Klicka för att aktivera ljud om det inte fungerar"
        >
          <Image
            src="/logos/sinus-logo-1024px.png"
            alt="Sinus"
            width={24}
            height={24}
            className="rounded-lg"
          />
          <span className="text-xl">🔊</span>
          <span className="text-sm font-semibold">Spela upp</span>
        </button>
      </div>

      {/* Messages */}
      <div className="space-y-3 mb-5">
        {audioStatus ? (
          <div className="text-[11px] text-indigo-100 bg-black/30 border border-white/10 rounded-full inline-block px-3 py-1 shadow">
            {audioStatus}
          </div>
        ) : null}
        {needsAudioUnlock ? (
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => { 
                forceUnmute(); 
                setNeedsAudioUnlock(false); 
                hasInteractedRef.current = true;
                // Try to play any pending audio
                if (sentenceAudioRef.current) {
                  void sentenceAudioRef.current.play().catch(() => {});
                }
              }}
              className="text-xs rounded-full px-3 py-1 bg-white/90 hover:bg-white text-gray-700 shadow border border-gray-200"
            >
              Aktivera ljud
            </button>
            <span className="text-[11px] text-indigo-100/80">Klicka för att aktivera ljud (behövs bara en gång)</span>
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
        onClick={() => setShowDebugPanel((v) => !v)}
        className="fixed bottom-4 right-4 z-50 text-xs rounded-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white shadow-lg border-2 border-white"
      >
        {showDebugPanel ? "Hide Logs" : "Show Logs"} 📋
      </button>
      <button
        type="button"
        onClick={() => setShowDebug((v) => !v)}
        className="fixed bottom-16 right-4 z-50 text-xs rounded-full px-4 py-2 bg-white/90 hover:bg-white text-gray-700 shadow"
      >
        {showDebug ? "Hide Debug" : "Debug"} 🔎
      </button>

      {/* Debug Panel */}
      {showDebugPanel ? (
        <div className="fixed bottom-20 left-4 right-20 z-50 max-h-80 overflow-y-auto rounded-2xl bg-black/90 text-green-400 p-4 shadow-xl border border-gray-600 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold">🔊 Audio Debug Logs</span>
            <button
              onClick={() => setDebugLogs([])}
              className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500 italic">No logs yet. Send a message to generate audio logs.</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap break-words">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {showSetup ? (
        <div className="fixed bottom-28 right-4 z-50 w-[320px] rounded-2xl bg-white p-4 shadow-xl border border-gray-200">
          <div className="text-sm font-semibold mb-2 text-gray-800">TTS Setup</div>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <button
              type="button"
              onClick={() => setTtsOn((v) => !v)}
              className={ttsOn ? "text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-cyan-600 text-white" : "text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"}
            >
              {ttsOn ? "Ljud: På" : "Ljud: Av"}
            </button>
            <select
              className="text-xs bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2 py-1"
              value={ttsProvider}
              onChange={(e) => { const v = e.target.value as typeof ttsProvider; setTtsProvider(v); try { window.localStorage.setItem("ttsProvider", v); } catch {} }}
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
            >
              {speakAsap ? "Börja direkt" : "Vänta klart"}
            </button>
            <button
              type="button"
              onClick={() => { void testRealtime(); }}
              className="text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"
            >
              Test Realtime
            </button>
            <button
              type="button"
              onClick={() => forceUnmute()}
              className="text-xs rounded-full px-3 py-1 border border-gray-200 shadow bg-gray-100 text-gray-800"
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
    </div>
  );
}

