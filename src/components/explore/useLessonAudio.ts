import { useEffect, useRef, useState } from "react";

type AudioState = "idle" | "loading" | "playing" | "paused" | "error";

// Global audio context unlock for iOS
let audioUnlocked = false;

export function useLessonAudio(enabled: boolean, volume: number) {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>("");

  // Unlock audio on first user interaction (iOS requirement)
  useEffect(() => {
    if (audioUnlocked) return;
    
    const unlockAudio = () => {
      if (audioUnlocked) return;
      
      // Create and play a silent audio to unlock iOS audio
      const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAAnEbtTUYAAAAAAD/+xDEAAPAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
      silentAudio.play().then(() => {
        audioUnlocked = true;
        console.log('[Audio] iOS audio context unlocked');
      }).catch(() => {
        // Ignore - will try again on next interaction
      });
    };
    
    // Listen for any user interaction
    const events = ['touchstart', 'touchend', 'click'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

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
        audio.onerror = (e) => {
          console.error("[TTS] Audio error:", e);
          setState("error");
        };

        // iOS-friendly play with proper error handling
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise.catch((error) => {
              // DOMException: play() failed because the user didn't interact with the document first
              if (error.name === 'NotAllowedError') {
                console.log("[TTS] Play blocked - user interaction required");
                setState("error");
              } else if (error.name !== 'AbortError') {
                console.error("[TTS] Play error:", error);
                setState("error");
              }
            });
          }
        } catch (error) {
          console.error("[TTS] Unexpected play error:", error);
          setState("error");
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
        audio.onerror = (e) => {
          console.error("[TTS] Audio error:", e);
          setState("error");
          URL.revokeObjectURL(url);
        };

        // iOS-friendly play with proper error handling
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise.catch((error) => {
              if (error.name === 'NotAllowedError') {
                console.log("[TTS] Play blocked - user interaction required");
                setState("error");
              } else if (error.name !== 'AbortError') {
                console.error("[TTS] Play error:", error);
                setState("error");
              }
              URL.revokeObjectURL(url);
            });
          }
        } catch (error) {
          console.error("[TTS] Unexpected play error:", error);
          setState("error");
          URL.revokeObjectURL(url);
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
      // iOS-friendly resume with proper promise handling
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("[TTS] Resume error:", error);
          setState("error");
        });
      }
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
