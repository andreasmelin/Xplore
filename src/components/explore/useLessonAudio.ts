import { useEffect, useRef, useState } from "react";

type AudioState = "idle" | "loading" | "playing" | "paused" | "error";

// Global audio context unlock for iOS
let audioUnlocked = false;

// Try to unlock audio more aggressively
function tryUnlockAudio() {
  if (audioUnlocked) return Promise.resolve();
  
  return new Promise<void>((resolve) => {
    // Create and play a silent audio to unlock iOS audio
    const silentAudio = new Audio();
    silentAudio.src = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    silentAudio.volume = 0.01; // Very low volume
    
    const playPromise = silentAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          audioUnlocked = true;
          console.log('[Audio] ✅ Audio unlocked successfully');
          resolve();
        })
        .catch((err) => {
          console.log('[Audio] ⚠️ Failed to unlock audio:', err.name);
          resolve(); // Resolve anyway
        });
    } else {
      resolve();
    }
  });
}

export function useLessonAudio(enabled: boolean, volume: number) {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string>("");

  // Unlock audio on first user interaction (iOS requirement)
  useEffect(() => {
    const unlockAudio = () => {
      tryUnlockAudio();
    };
    
    // Listen for any user interaction - be more aggressive
    const events = ['touchstart', 'touchend', 'mousedown', 'click', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });
    
    // Also try immediately (might work on some browsers)
    tryUnlockAudio();
    
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
    console.log('[Audio] speak() called', { enabled, textLength: text?.length, audioUnlocked });
    
    if (!enabled || !text.trim()) {
      console.log('[Audio] ⏭️ Skipping - TTS disabled or empty text');
      return;
    }

    // Try to unlock audio if not already done
    await tryUnlockAudio();

    // Stop current audio if playing
    stop();

    currentTextRef.current = text;
    setState("loading");

    try {
      console.log('[Audio] 📡 Fetching TTS from API...');
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
        console.error('[Audio] ❌ TTS API failed:', response.status, response.statusText);
        throw new Error(`TTS failed: ${response.status}`);
      }

      // Check if response is JSON or audio file
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        // Response is JSON with audioUrl
        const data = await response.json() as { audioUrl?: string; cached?: boolean };
        console.log('[Audio] ✅ Got TTS JSON response:', { hasUrl: !!data.audioUrl, cached: data.cached });

        if (data.audioUrl) {
          console.log('[Audio] 🎵 Creating audio element with URL');
          const audio = new Audio(data.audioUrl);
          audio.volume = volume;
          audioRef.current = audio;

        audio.onplay = () => {
          console.log('[Audio] ▶️ Audio started playing');
          setState("playing");
        };
        audio.onpause = () => {
          console.log('[Audio] ⏸️ Audio paused');
          setState("paused");
        };
        audio.onended = () => {
          console.log('[Audio] ⏹️ Audio ended');
          setState("idle");
        };
        audio.onerror = (e) => {
          console.error("[Audio] ❌ Audio error:", e);
          setState("error");
        };

        // iOS-friendly play with proper error handling
        try {
          console.log('[Audio] 🎯 Attempting to play audio...');
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
      } else {
        // Response is direct audio file (MP3)
        console.log('[Audio] ✅ Got direct audio file response');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const audio = new Audio(url);
        audio.volume = volume;
        audioRef.current = audio;

        audio.onplay = () => {
          console.log('[Audio] ▶️ Direct audio started playing');
          setState("playing");
        };
        audio.onpause = () => {
          console.log('[Audio] ⏸️ Direct audio paused');
          setState("paused");
        };
        audio.onended = () => {
          console.log('[Audio] ⏹️ Direct audio ended');
          setState("idle");
          URL.revokeObjectURL(url);
        };
        audio.onerror = (e) => {
          console.error("[Audio] ❌ Direct audio error:", e);
          setState("error");
          URL.revokeObjectURL(url);
        };

        // iOS-friendly play with proper error handling
        try {
          console.log('[Audio] 🎯 Attempting to play direct audio...');
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            await playPromise.catch((error) => {
              if (error.name === 'NotAllowedError') {
                console.log("[Audio] Play blocked - user interaction required");
                setState("error");
              } else if (error.name !== 'AbortError') {
                console.error("[Audio] Play error:", error);
                setState("error");
              }
              URL.revokeObjectURL(url);
            });
          }
        } catch (error) {
          console.error("[Audio] Unexpected play error:", error);
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
