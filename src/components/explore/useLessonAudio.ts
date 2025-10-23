import { useEffect, useRef, useState } from "react";

type AudioState = "idle" | "loading" | "playing" | "paused" | "error";

export function useLessonAudio(enabled: boolean, volume: number) {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>("");

  useEffect(() => {
    // Update volume when it changes
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function speak(text: string, cacheParams?: { topicId: string; lessonId: string; contentIndex: number }) {
    if (!enabled || !text.trim()) {
      return;
    }

    // Stop current audio if playing
    stop();

    currentTextRef.current = text;
    setState("loading");

    try {
      // Call cached TTS API
      const response = await fetch("/api/tts-cached", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          provider: "elevenlabs",
          format: "mp3",
          ...(cacheParams || {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const data = await response.json() as { audioUrl?: string; cached?: boolean };
      
      // If we got a URL directly (from cache), use it
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.volume = volume;
        audioRef.current = audio;

        audio.onplay = () => setState("playing");
        audio.onpause = () => setState("paused");
        audio.onended = () => setState("idle");
        audio.onerror = () => setState("error");

        // Handle play promise to avoid interruption errors
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Ignore AbortError - happens when navigating quickly
            if (error.name !== 'AbortError') {
              console.error("[TTS] Play error:", error);
              setState("error");
            }
          });
        }
      } else {
        // Fallback: blob response (shouldn't happen with new API)
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.volume = volume;
        audioRef.current = audio;

        audio.onplay = () => setState("playing");
        audio.onpause = () => setState("paused");
        audio.onended = () => {
          setState("idle");
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setState("error");
          URL.revokeObjectURL(url);
        };

        // Handle play promise to avoid interruption errors
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Ignore AbortError - happens when navigating quickly
            if (error.name !== 'AbortError') {
              console.error("[TTS] Play error:", error);
              setState("error");
            }
            URL.revokeObjectURL(url);
          });
        }
      }
    } catch (error) {
      console.error("[TTS] Error:", error);
      setState("error");
    }
  }

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState("idle");
  }

  function pause() {
    if (audioRef.current && state === "playing") {
      audioRef.current.pause();
      setState("paused");
    }
  }

  function resume() {
    if (audioRef.current && state === "paused") {
      audioRef.current.play().catch(() => setState("error"));
    }
  }

  return {
    speak,
    stop,
    pause,
    resume,
    state,
    isPlaying: state === "playing",
    isLoading: state === "loading",
  };
}

