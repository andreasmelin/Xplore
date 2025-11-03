"use client";

import { useState, useRef } from "react";

type SentenceInputProps = {
  onSentenceSubmit: (sentence: string) => void;
  onBack: () => void;
};

export default function SentenceInput({ onSentenceSubmit, onBack }: SentenceInputProps) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert("Din webbläsare stöder inte mikrofoninspelning.");
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recordedChunksRef.current = [];
      
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      rec.onstop = () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch {}
      };
      
      mediaRecorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
      alert("Kunde inte starta inspelning. Kontrollera att du har gett åtkomst till mikrofonen.");
    }
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    try {
      mediaRecorderRef.current.stop();
    } catch {}
    
    setIsRecording(false);
    
    // Wait for recording to stop
    await new Promise((r) => setTimeout(r, 100));
    
    const chunks = recordedChunksRef.current;
    if (chunks.length === 0) return;
    
    // Transcribe audio
    try {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      form.append("language", "sv");
      
      const resp = await fetch("/api/stt", { method: "POST", body: form });
      if (!resp.ok) {
        throw new Error("Speech recognition failed");
      }
      
      const json = await resp.json().catch(() => ({}));
      const transcribedText: string = (json?.text || "").trim();
      
      if (transcribedText) {
        setText(transcribedText);
      }
    } catch (error) {
      console.error("STT error:", error);
      alert("Kunde inte transkribera ljudet. Försök igen.");
    }
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) {
      alert("Skriv eller säg en mening först!");
      return;
    }
    
    // Filter to only allow letters, spaces, and basic punctuation
    const filtered = trimmed
      .split("")
      .filter((char) => {
        // Allow Swedish letters (including å, ä, ö), spaces, dots, commas, question marks, exclamation marks
        return /[a-zA-ZåäöÅÄÖ0-9\s.,!?\-]/.test(char);
      })
      .join("")
      .trim();
    
    if (!filtered) {
      alert("Meningen måste innehålla bokstäver!");
      return;
    }
    
    onSentenceSubmit(filtered);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-500 to-blue-500 flex flex-col">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors"
          >
            ← Tillbaka
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
            ✍️ Träna på en egen mening
          </h1>
          <div className="w-24"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Skriv eller säg en mening
            </h2>
            
            <p className="text-gray-600 mb-6 text-center">
              Skriv en mening eller tryck på mikrofonknappen för att säga den högt
            </p>

            {/* Text Input */}
            <div className="mb-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Till exempel: Jag heter Lisa"
                className="w-full px-4 py-3 text-lg rounded-lg border-2 border-gray-300 focus:border-teal-500 focus:outline-none resize-none"
                rows={3}
                maxLength={100}
              />
            </div>

            {/* Microphone Button */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <button
                onClick={() => {
                  if (isRecording) {
                    stopRecording();
                  } else {
                    startRecording();
                  }
                }}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all transform hover:scale-110 ${
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-teal-500 hover:bg-teal-600"
                } text-white shadow-lg`}
                title={isRecording ? "Sluta spela in" : "Börja spela in"}
              >
                {isRecording ? "⏹️" : "🎤"}
              </button>
              {isRecording && (
                <p className="text-red-600 font-semibold animate-pulse">
                  Spelar in...
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`w-full px-8 py-4 bg-green-500 hover:bg-green-600 text-white text-xl font-bold rounded-full shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              Börja träna på denna mening →
            </button>

            {/* Help Text */}
            <div className="mt-6 text-sm text-gray-500 text-center">
              <p>Tips: Meningen kan innehålla:</p>
              <p>• Bokstäver (A-Z, å, ä, ö)</p>
              <p>• Siffror (0-9)</p>
              <p>• Punkt (.), komma (,), utropstecken (!), frågetecken (?)</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}



