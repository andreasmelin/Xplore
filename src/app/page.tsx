"use client";

import { useState, type FormEvent } from "react";
import { useCompletion } from "@ai-sdk/react";

export default function Page() {
  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/chat",
    streamProtocol: "text",
  });
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [chat, setChat] = useState<{ id: string; role: "user" | "assistant"; text: string }[]>([]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const id = Math.random().toString(36).slice(2);
    setChat((prev) => [...prev, { id, role: "user", text: trimmed }]);
    setInput("");
    const reply = await complete(trimmed);
    const rid = Math.random().toString(36).slice(2);
    setChat((prev) => [...prev, { id: rid, role: "assistant", text: reply ?? "" }]);
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

        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="text-xs rounded-full px-3 py-1 bg-white/70 hover:bg-white text-gray-700 shadow"
          >
            {showDebug ? "Hide Debug" : "Debug info"} 🔎
          </button>
        </div>

        {showDebug ? (
          <div className="mb-5 rounded-2xl bg-white/80 p-3 shadow-inner">
            <div className="text-xs text-gray-700">
              <div className="mb-1">Status: <span className="font-semibold">{isLoading ? "streaming" : "ready"}</span></div>
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



