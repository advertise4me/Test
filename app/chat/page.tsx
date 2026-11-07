"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseAssistantContent } from "@/lib/parseAssistantContent";
import { AUTO_SUMMARY_PROMPT } from "@/lib/autoSummary";
import StepsWidget from "@/components/StepsWidget";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import LoadingIndicator from "@/components/LoadingIndicator";

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoOpeningSent, setAutoOpeningSent] = useState(false);
  const autoOpeningTriggeredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: SessionStatus) => {
        setStatus(data);
        if (!data.connected) router.replace("/");
      })
      .catch(() => router.replace("/"));
  }, [router]);

  // Fire the opening account summary automatically the moment a fresh,
  // empty conversation loads - the user shouldn't have to type or click
  // anything to get it. Only ever fires once per page load.
  useEffect(() => {
    if (!status?.connected || history.length > 0 || autoOpeningTriggeredRef.current) return;
    autoOpeningTriggeredRef.current = true;
    setAutoOpeningSent(true);
    sendMessage(AUTO_SUMMARY_PROMPT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, sending, uploading]);

  async function sendMessage(messageOverride?: string) {
    const message = (messageOverride ?? input).trim();
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

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not upload this file.");
        return;
      }
      const kindLabel = data.kind === "video" ? "video" : "image";
      const refLabel = data.kind === "video" ? "video_id" : "image_hash";
      setHistory((prev) => [
        ...prev,
        {
          role: "user",
          content: `Uploaded a ${kindLabel} file "${data.filename}". Meta ${refLabel} reference: ${data.ref}`,
        },
      ]);
    } catch {
      setError("Network error - please try again.");
    } finally {
      setUploading(false);
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
            &ldquo;Build me a new ad for my spring sale&rdquo; - attach an image or video with the
            paperclip button when asked.
          </div>
        )}
        {history.map((turn, i) => {
          if (turn.role === "user") {
            // The opening summary's trigger message is an internal prompt,
            // not something the user actually typed - don't show it as a
            // chat bubble.
            if (i === 0 && autoOpeningSent && turn.content === AUTO_SUMMARY_PROMPT) {
              return null;
            }
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-900 px-4 py-2 text-sm text-white">
                  {turn.content}
                </div>
              </div>
            );
          }

          const parsed = parseAssistantContent(turn.content);
          const isLastTurn = i === history.length - 1;

          return (
            <div key={i} className="flex justify-start">
              <div className="max-w-[85%] space-y-2">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-2">
                  <AssistantMarkdown content={parsed.text} />
                </div>
                {parsed.steps && <StepsWidget spec={parsed.steps} />}
                {isLastTurn && !sending && parsed.suggestions && parsed.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {parsed.suggestions.map((suggestion, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => sendMessage(suggestion)}
                        className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {uploading && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl bg-zinc-700 px-4 py-2 text-sm text-white">
              Uploading…
            </div>
          </div>
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-500">
              <LoadingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleFormSubmit} className="flex gap-2 border-t border-zinc-200 pt-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelected}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
          title="Attach an image or video"
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          📎
        </button>
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
