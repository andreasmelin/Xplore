"use client";

import { useState, useRef, useEffect } from "react";

type LessonAIModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "tell-more" | "ask-question";
  lessonContext: {
    topicTitle: string;
    lessonTitle: string;
    currentContent: string;
    contentType: string;
  };
  profileAge: number | null;
  ttsEnabled: boolean;
  ttsVolume: number;
};

export default function LessonAIModal({
  isOpen,
  onClose,
  mode,
  lessonContext,
  profileAge,
  ttsEnabled,
  ttsVolume,
}: LessonAIModalProps) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Auto-generate response for "tell more" mode
  useEffect(() => {
    if (isOpen && mode === "tell-more" && !response && !isLoading) {
      handleTellMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  // Clean up audio on close
  useEffect(() => {
    if (!isOpen) {
      stopAudio();
      setResponse("");
      setQuestion("");
      setAudioUrl(null);
    }
  }, [isOpen]);

  async function handleTellMore() {
    setIsLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/explore/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "tell-more",
          context: lessonContext,
          profileAge,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setResponse(data.response);

      // Generate audio if TTS enabled
      if (ttsEnabled && data.response) {
        await generateAudio(data.response);
      }
    } catch (error) {
      console.error("AI assist error:", error);
      setResponse("Oj! Något gick fel. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAskQuestion() {
    if (!question.trim()) return;

    setIsLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/explore/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ask-question",
          question: question.trim(),
          context: lessonContext,
          profileAge,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setResponse(data.response);

      // Generate audio if TTS enabled
      if (ttsEnabled && data.response) {
        await generateAudio(data.response);
      }
    } catch (error) {
      console.error("AI assist error:", error);
      setResponse("Oj! Något gick fel. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateAudio(text: string) {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          provider: "elevenlabs",
          format: "mp3",
        }),
      });

      if (res.ok) {
        // TTS API returns raw audio blob, not JSON
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Auto-play if enabled
        if (ttsEnabled) {
          playAudio(url);
        }
      }
    } catch (error) {
      console.error("TTS error:", error);
    }
  }

  function playAudio(url: string) {
    stopAudio();
    const audio = new Audio(url);
    audio.volume = ttsVolume;
    audioRef.current = audio;

    audio.onplay = () => setIsPlayingAudio(true);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);

    audio.play().catch((error) => {
      if (error.name !== 'AbortError') {
        console.error("Audio play error:", error);
      }
    });
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-white/20">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-sm px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {mode === "tell-more" ? "🤓" : "❓"}
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">
                {mode === "tell-more" ? "Berätta mer" : "Ställ en fråga"}
              </h2>
              <p className="text-sm text-indigo-200">
                {lessonContext.topicTitle} → {lessonContext.lessonTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
          {/* Question input for ask mode */}
          {mode === "ask-question" && !response && (
            <div className="mb-4">
              <label className="block text-white text-sm font-medium mb-2">
                Vad vill du veta?
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Skriv din fråga här..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAskQuestion();
                  }
                }}
              />
              <button
                onClick={handleAskQuestion}
                disabled={!question.trim() || isLoading}
                className="mt-3 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Tänker..." : "Skicka fråga"}
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin text-6xl mb-4">🤔</div>
              <p className="text-white text-lg">
                {mode === "tell-more" ? "Berättar mer..." : "Tänker på svaret..."}
              </p>
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="space-y-4">
              {mode === "ask-question" && question && (
                <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                  <p className="text-sm text-indigo-200 mb-1">Din fråga:</p>
                  <p className="text-white">{question}</p>
                </div>
              )}

              <div className="bg-gradient-to-br from-white/20 to-white/10 rounded-xl p-6 border border-white/20">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">🤖</span>
                  <div className="flex-1">
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {response}
                    </p>
                  </div>
                </div>

                {/* Audio controls */}
                {ttsEnabled && audioUrl && (
                  <div className="mt-4 flex items-center gap-2 pt-4 border-t border-white/10">
                    {isPlayingAudio ? (
                      <button
                        onClick={stopAudio}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors flex items-center gap-2"
                      >
                        <span>⏸️</span>
                        <span>Pausa</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => playAudio(audioUrl)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors flex items-center gap-2"
                      >
                        <span>▶️</span>
                        <span>Lyssna igen</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Ask another question */}
                {mode === "ask-question" && (
                  <button
                    onClick={() => {
                      setResponse("");
                      setQuestion("");
                      setAudioUrl(null);
                      stopAudio();
                    }}
                    className="mt-4 text-indigo-200 hover:text-white text-sm transition-colors"
                  >
                    ← Ställ en ny fråga
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white/5 backdrop-blur-sm px-6 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full py-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}

