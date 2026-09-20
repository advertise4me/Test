"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface SessionStatus {
  connected: boolean;
  adAccountId?: string;
  accountName?: string;
  currency?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: SessionStatus) => {
        setStatus(data);
        if (!data.connected) router.replace("/");
      })
      .catch(() => router.replace("/"));
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, sending]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setSending(true);
    setError(null);
    setInput("");
    setHistory((prev) => [...prev, { role: "user", content: message }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setHistory((prev) => prev.slice(0, -1));
        return;
      }
      setHistory(data.history as ChatTurn[]);
    } catch {
      setError("Network error - please try again.");
      setHistory((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/disconnect", { method: "POST" });
    router.replace("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-lg font-semibold">Ads Chat</h1>
          {status?.connected && (
            <p className="text-xs text-zinc-500">
              {status.accountName ?? status.adAccountId}
              {status.currency ? ` · ${status.currency}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleDisconnect}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Disconnect
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {history.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
            Ask things like &ldquo;How did spend and ROAS trend over the last 30 days?&rdquo; or
            &ldquo;Which campaigns are paused right now?&rdquo;
          </div>
        )}
        {history.map((turn, i) => (
          <div key={i} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm " +
                (turn.role === "user"
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white text-zinc-900")
              }
            >
              {turn.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-500">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={sendMessage} className="flex gap-2 border-t border-zinc-200 pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about campaigns, spend, CTR, ROAS..."
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
