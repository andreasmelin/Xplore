"use client";

import { useState, useEffect, useRef } from "react";
import { Lesson, LessonContent, Topic } from "@/lib/explore/topics-data";
import Image from "next/image";
import { useLessonAudio } from "./useLessonAudio";

type LessonViewerProps = {
  topic: Topic;
  lesson: Lesson;
  onBack: () => void;
  onComplete: () => void;
  ttsEnabled: boolean;
  ttsVolume: number;
  profileAge: number | null;
};

export default function LessonViewer({ topic, lesson, onBack, onComplete, ttsEnabled, ttsVolume, profileAge }: LessonViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [generatedImages, setGeneratedImages] = useState<Map<number, string>>(new Map());
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  
  
  // Inline "tell more" state - now supports multiple levels
  const [expandedContent, setExpandedContent] = useState<Map<number, string[]>>(new Map());
  const [loadingExpansion, setLoadingExpansion] = useState<Set<number>>(new Set());
  const [expansionAudioUrl, setExpansionAudioUrl] = useState<string | null>(null);
  const [isPlayingExpansion, setIsPlayingExpansion] = useState(false);
  const expansionAudioRef = useRef<HTMLAudioElement | null>(null);

  // Inline question state
  const [showQuestionInput, setShowQuestionInput] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Map<number, { question: string; answer: string }>>(new Map());
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [questionAudioUrl, setQuestionAudioUrl] = useState<string | null>(null);
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const currentContent = lesson.content[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === lesson.content.length - 1;

  const progress = ((currentIndex + 1) / lesson.content.length) * 100;

  // TTS audio hook
  const audio = useLessonAudio(ttsEnabled, ttsVolume);

  // Auto-read content when navigating
  useEffect(() => {
    if (ttsEnabled && currentContent) {
      let textToRead = "";
      
      if (currentContent.type === "heading") {
        textToRead = currentContent.content;
      } else if (currentContent.type === "text") {
        textToRead = currentContent.content;
      } else if (currentContent.type === "fact") {
        textToRead = "Visste du att... " + currentContent.content;
      } else if (currentContent.type === "question") {
        textToRead = currentContent.question;
      } else if (currentContent.type === "activity") {
        textToRead = "Aktivitet: " + currentContent.title + ". " + currentContent.description;
      }

      if (textToRead) {
        // Small delay to let the UI render
        const timer = setTimeout(() => {
          audio.speak(textToRead, {
            topicId: topic.id,
            lessonId: lesson.id,
            contentIndex: currentIndex,
          });
        }, 300);
        return () => {
          clearTimeout(timer);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, ttsEnabled]);

  function handleNext() {
    audio.stop();
    if (!isLast) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  }

  function handlePrevious() {
    audio.stop();
    if (!isFirst) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function toggleAnswer(index: number) {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function getContentText(content: LessonContent): string {
    if (content.type === "heading") return content.content;
    if (content.type === "text") return content.content;
    if (content.type === "fact") return "Visste du att... " + content.content;
    if (content.type === "question") return content.question + " " + content.answer;
    if (content.type === "activity") return content.title + ": " + content.description;
    if (content.type === "image") return "Bild: " + content.prompt;
    return "";
  }

  async function handleTellMore(index: number) {
    if (loadingExpansion.has(index)) return;

    setLoadingExpansion((prev) => new Set(prev).add(index));

    try {
      const existingExpansions = expandedContent.get(index) || [];
      const expansionLevel = existingExpansions.length + 1;
      
      // Build context including previous expansions
      let contextText = getContentText(currentContent);
      if (existingExpansions.length > 0) {
        contextText += "\n\nPrevious expansions:\n" + existingExpansions.join("\n\n");
      }

      const res = await fetch("/api/explore/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "tell-more",
          context: {
            topicTitle: topic.title,
            lessonTitle: lesson.title,
            currentContent: contextText,
            contentType: currentContent.type,
            expansionLevel: expansionLevel,
          },
          profileAge,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      
      // Add new expansion to the array
      setExpandedContent((prev) => {
        const current = prev.get(index) || [];
        return new Map(prev).set(index, [...current, data.response]);
      });

      // Generate and play audio if TTS enabled
      if (ttsEnabled && data.response) {
        await generateExpansionAudio(data.response);
      }
    } catch (error) {
      console.error("AI assist error:", error);
      setExpandedContent((prev) => {
        const current = prev.get(index) || [];
        return new Map(prev).set(index, [...current, "Oj! Något gick fel. Försök igen."]);
      });
    } finally {
      setLoadingExpansion((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  async function generateExpansionAudio(text: string) {
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
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setExpansionAudioUrl(url);
        
        // Auto-play
        playExpansionAudio(url);
      }
    } catch (error) {
      console.error("TTS error:", error);
    }
  }

  function playExpansionAudio(url: string) {
    stopExpansionAudio();
    const audio = new Audio(url);
    audio.volume = ttsVolume;
    expansionAudioRef.current = audio;

    audio.onplay = () => setIsPlayingExpansion(true);
    audio.onended = () => setIsPlayingExpansion(false);
    audio.onerror = () => setIsPlayingExpansion(false);

    audio.play().catch((error) => {
      if (error.name !== 'AbortError') {
        console.error("Audio play error:", error);
      }
    });
  }

  function stopExpansionAudio() {
    if (expansionAudioRef.current) {
      expansionAudioRef.current.pause();
      expansionAudioRef.current = null;
    }
    setIsPlayingExpansion(false);
  }

  // Question handling functions
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        await sendAudioToSTT(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Kunde inte starta inspelning. Kontrollera att du har gett åtkomst till mikrofonen.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  async function sendAudioToSTT(audioBlob: Blob) {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const res = await fetch("/api/stt", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setQuestionText(data.text || "");
      } else {
        console.error("STT failed:", res.status);
      }
    } catch (error) {
      console.error("STT error:", error);
    }
  }

  async function handleAskQuestion(index: number) {
    if (!questionText.trim() || loadingQuestion) return;

    setLoadingQuestion(true);

    try {
      const res = await fetch("/api/explore/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ask-question",
          question: questionText.trim(),
          context: {
            topicTitle: topic.title,
            lessonTitle: lesson.title,
            currentContent: getContentText(currentContent),
            contentType: currentContent.type,
          },
          profileAge,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      
      setQuestionAnswers((prev) => 
        new Map(prev).set(index, { 
          question: questionText.trim(), 
          answer: data.response 
        })
      );

      // Generate and play audio if TTS enabled
      if (ttsEnabled && data.response) {
        await generateQuestionAudio(data.response);
      }

      // Clear input and hide question box
      setQuestionText("");
      setShowQuestionInput(null);
    } catch (error) {
      console.error("AI assist error:", error);
    } finally {
      setLoadingQuestion(false);
    }
  }

  async function generateQuestionAudio(text: string) {
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
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setQuestionAudioUrl(url);
        playQuestionAudio(url);
      }
    } catch (error) {
      console.error("TTS error:", error);
    }
  }

  function playQuestionAudio(url: string) {
    stopQuestionAudio();
    const audio = new Audio(url);
    audio.volume = ttsVolume;
    questionAudioRef.current = audio;

    audio.onplay = () => setIsPlayingQuestion(true);
    audio.onended = () => setIsPlayingQuestion(false);
    audio.onerror = () => setIsPlayingQuestion(false);

    audio.play().catch((error) => {
      if (error.name !== 'AbortError') {
        console.error("Audio play error:", error);
      }
    });
  }

  function stopQuestionAudio() {
    if (questionAudioRef.current) {
      questionAudioRef.current.pause();
      questionAudioRef.current = null;
    }
    setIsPlayingQuestion(false);
  }

  async function generateImage(index: number, prompt: string) {
    if (generatedImages.has(index) || loadingImages.has(index)) return;

    setLoadingImages((prev) => new Set(prev).add(index));

    try {
      const res = await fetch("/api/explore/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt,
          topicId: topic.id,
          lessonId: lesson.id,
          contentIndex: index,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { imageUrl?: string; cached?: boolean };
        if (data.imageUrl) {
          setGeneratedImages((prev) => new Map(prev).set(index, data.imageUrl));
          if (data.cached) {
            console.log(`[Image] Used cached image for index ${index}`);
          }
        }
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setLoadingImages((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  }

  function renderQuestionUI(index: number) {
    return (
      <>
        {/* Question Input */}
        {showQuestionInput === index && (
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">❓</span>
              <div className="flex-1">
                <p className="text-purple-200 text-sm font-medium mb-2">Vad vill du veta?</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Skriv din fråga här..."
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleAskQuestion(index);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-600 animate-pulse"
                        : "bg-purple-500 hover:bg-purple-600"
                    } text-white`}
                    title={isRecording ? "Stoppa inspelning" : "Klicka för att spela in"}
                  >
                    {isRecording ? "⏹️" : "🎤"}
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAskQuestion(index)}
                    disabled={!questionText.trim() || loadingQuestion}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {loadingQuestion ? "Tänker..." : "Skicka fråga"}
                  </button>
                  <button
                    onClick={() => {
                      setShowQuestionInput(null);
                      setQuestionText("");
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-all text-sm"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question & Answer */}
        {questionAnswers.has(index) && (
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
            <div className="mb-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">❓</span>
                <p className="text-purple-200 text-sm font-medium">Din fråga:</p>
              </div>
              <p className="text-white/90 ml-7">{questionAnswers.get(index)?.question}</p>
            </div>
            <div>
              <div className="flex items-start gap-2 mb-2">
                <span className="text-lg">💡</span>
                <p className="text-green-200 text-sm font-medium">Svar:</p>
              </div>
              <p className="text-white/90 leading-relaxed ml-7">{questionAnswers.get(index)?.answer}</p>
            </div>
            <div className="flex gap-2 mt-3 ml-7">
              {isPlayingQuestion && questionAudioUrl && (
                <button
                  onClick={stopQuestionAudio}
                  className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                >
                  ⏸️ Pausa
                </button>
              )}
              <button
                onClick={() => {
                  setQuestionAnswers((prev) => {
                    const next = new Map(prev);
                    next.delete(index);
                    return next;
                  });
                }}
                className="text-xs px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-full transition-colors"
              >
                Dölj svar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderContent(content: LessonContent, index: number) {
    switch (content.type) {
      case "heading":
        return (
          <div>
            <h2 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              {content.content}
            </h2>
            {expandedContent.has(index) && expandedContent.get(index)!.map((expansion, expansionIndex) => (
              <div key={expansionIndex} className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">🤓</span>
                  <div className="flex-1">
                    {expansionIndex > 0 && (
                      <div className="text-xs text-blue-200 mb-1 font-medium">
                        Nivå {expansionIndex + 1} - Djupare kunskap
                      </div>
                    )}
                    <p className="text-white/90 leading-relaxed">{expansion}</p>
                  </div>
                </div>
                {isPlayingExpansion && expansionAudioUrl && expansionIndex === expandedContent.get(index)!.length - 1 && (
                  <button
                    onClick={stopExpansionAudio}
                    className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors mt-2"
                  >
                    ⏸️ Pausa
                  </button>
                )}
              </div>
            ))}
            {renderQuestionUI(index)}
          </div>
        );

      case "text":
        return (
          <div>
            <p className="text-lg text-indigo-100/90 leading-relaxed mb-4">
              {content.content}
            </p>
            {expandedContent.has(index) && expandedContent.get(index)!.map((expansion, expansionIndex) => (
              <div key={expansionIndex} className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">🤓</span>
                  <div className="flex-1">
                    {expansionIndex > 0 && (
                      <div className="text-xs text-blue-200 mb-1 font-medium">
                        Nivå {expansionIndex + 1} - Djupare kunskap
                      </div>
                    )}
                    <p className="text-white/90 leading-relaxed">{expansion}</p>
                  </div>
                </div>
                {isPlayingExpansion && expansionAudioUrl && expansionIndex === expandedContent.get(index)!.length - 1 && (
                  <button
                    onClick={stopExpansionAudio}
                    className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors mt-2"
                  >
                    ⏸️ Pausa
                  </button>
                )}
              </div>
            ))}
            {renderQuestionUI(index)}
          </div>
        );

      case "fact":
        return (
          <div>
            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-4 mb-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">💡</span>
                <div>
                  <div className="text-yellow-300 font-semibold text-sm mb-1">VISSTE DU ATT...</div>
                  <p className="text-white/90">{content.content}</p>
                </div>
              </div>
            </div>
            {expandedContent.has(index) && (
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">🤓</span>
                  <p className="text-white/90 leading-relaxed">{expandedContent.get(index)}</p>
                </div>
                {isPlayingExpansion && expansionAudioUrl && (
                  <button
                    onClick={stopExpansionAudio}
                    className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors mt-2"
                  >
                    ⏸️ Pausa
                  </button>
                )}
              </div>
            )}
            {renderQuestionUI(index)}
          </div>
        );

      case "question":
        return (
          <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl flex-shrink-0">❓</span>
              <div>
                <div className="text-blue-300 font-semibold text-sm mb-2">FRÅGA</div>
                <p className="text-white/90 font-medium">{content.question}</p>
              </div>
            </div>
            {revealedAnswers.has(index) ? (
              <div className="ml-12 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="text-green-300 font-semibold text-xs mb-1">SVAR:</div>
                <p className="text-white/90 text-sm">{content.answer}</p>
              </div>
            ) : (
              <button
                onClick={() => toggleAnswer(index)}
                className="ml-12 text-sm px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Visa svar
              </button>
            )}
          </div>
        );

      case "activity":
        return (
          <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🎨</span>
              <div>
                <div className="text-purple-300 font-semibold text-sm mb-2">AKTIVITET</div>
                <h4 className="text-white font-semibold mb-2">{content.title}</h4>
                <p className="text-white/90">{content.description}</p>
              </div>
            </div>
          </div>
        );

      case "image":
        const imageUrl = generatedImages.get(index);
        const isLoading = loadingImages.has(index);

        return (
          <div className="mb-6">
            {imageUrl ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <Image
                  src={imageUrl}
                  alt={content.altText}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="bg-white/5 border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                <div className="text-5xl mb-3">🖼️</div>
                <p className="text-white/70 mb-4 text-sm">{content.altText}</p>
                <button
                  onClick={() => generateImage(index, content.prompt)}
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      <span>Skapar bild...</span>
                    </span>
                  ) : (
                    "🎨 Skapa bild"
                  )}
                </button>
                <p className="text-xs text-white/50 mt-2">Använder AI för att skapa en illustration</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-indigo-100/80 hover:text-indigo-100 mb-4 transition-colors text-sm"
        >
          <span>←</span>
          <span>Tillbaka till lektioner</span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{topic.icon}</span>
          <div>
            <div className="text-sm text-indigo-100/60">{topic.title}</div>
            <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white/10 rounded-full h-2 overflow-hidden mt-4">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-indigo-100/60">
            Del {currentIndex + 1} av {lesson.content.length}
          </div>
          
          {/* Audio Controls */}
          {ttsEnabled && (
            <div className="flex items-center gap-2">
              {audio.isLoading && (
                <span className="text-xs text-indigo-100/60 flex items-center gap-1">
                  <span className="animate-spin">⏳</span>
                  <span>Laddar ljud...</span>
                </span>
              )}
              {audio.isPlaying && (
                <button
                  onClick={() => audio.pause()}
                  className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-1"
                  title="Pausa"
                >
                  <span>⏸️</span>
                  <span>Pausa</span>
                </button>
              )}
              {audio.state === "paused" && (
                <button
                  onClick={() => audio.resume()}
                  className="text-xs px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors flex items-center gap-1"
                  title="Fortsätt"
                >
                  <span>▶️</span>
                  <span>Fortsätt</span>
                </button>
              )}
              {(audio.isPlaying || audio.state === "paused") && (
                <button
                  onClick={() => audio.stop()}
                  className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-full transition-colors"
                  title="Stoppa"
                >
                  ⏹️
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-xl min-h-[400px]">
        {renderContent(currentContent, currentIndex)}
      </div>

      {/* AI Interaction Buttons */}
      {(currentContent.type === "text" || currentContent.type === "heading" || currentContent.type === "fact") && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          {!expandedContent.has(currentIndex) ? (
            <button
              onClick={() => handleTellMore(currentIndex)}
              disabled={loadingExpansion.has(currentIndex)}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingExpansion.has(currentIndex) ? (
                <>
                  <span className="animate-spin">🤔</span>
                  <span>Tänker...</span>
                </>
              ) : (
                <>
                  <span className="text-xl">🤓</span>
                  <span>Berätta mer</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => setExpandedContent((prev) => {
                const next = new Map(prev);
                next.delete(currentIndex);
                return next;
              })}
              className="px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <span className="text-xl">✕</span>
              <span>Dölj</span>
            </button>
          )}
          <button
            onClick={() => setShowQuestionInput(showQuestionInput === currentIndex ? null : currentIndex)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <span className="text-xl">❓</span>
            <span>{showQuestionInput === currentIndex ? "Dölj fråga" : "Ställ en fråga"}</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handlePrevious}
          disabled={isFirst}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
        >
          ← Föregående
        </button>

        <div className="text-sm text-indigo-100/60">
          {currentIndex + 1} / {lesson.content.length}
        </div>

        <button
          onClick={handleNext}
          className={`px-6 py-3 rounded-full font-medium transition-all ${
            isLast
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
              : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          }`}
        >
          {isLast ? "Slutför lektion ✓" : "Nästa →"}
        </button>
      </div>

    </div>
  );
}

