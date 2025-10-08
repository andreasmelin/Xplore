"use client";

import { useChat } from "ai/react";

export default function Page() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({ api: "/api/chat" });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold mb-4">AI Chat</h1>

      <div className="space-y-3 mb-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
            <span className="text-sm text-gray-500 mr-2">{m.role}:</span>
            <span>{m.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Say something..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button disabled={isLoading} className="bg-black text-white px-4 py-2 rounded">
          Send
        </button>
      </form>
    </main>
  );
}
