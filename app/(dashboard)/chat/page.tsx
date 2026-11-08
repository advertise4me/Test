"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Paperclip, LogOut, Send } from "lucide-react";
import { parseAssistantContent } from "@/lib/parseAssistantContent";
import { AUTO_SUMMARY_PROMPT } from "@/lib/autoSummary";
import { dashboardIconStrokeWidth, dashboardType } from "@/lib/theme/dashboard";
import StepsWidget from "@/components/StepsWidget";
import AssistantMarkdown from "@/components/AssistantMarkdown";
import LoadingIndicator from "@/components/LoadingIndicator";
import ConfirmActionCard, { type ActionResolution } from "@/components/ConfirmActionCard";

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
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

// useSearchParams() (read below to seed a ?prefill= message) requires a
// Suspense boundary - the wrapper above provides it.
function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  // Seeded once from a ?prefill= param (e.g. tapping a recommendation on the
  // AI Summary tab) - read via the lazy initializer so this only happens on
  // the very first render, not sent automatically; the user still has to
  // hit Send.
  const [input, setInput] = useState(() => searchParams.get("prefill") ?? "");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoOpeningSent, setAutoOpeningSent] = useState(false);
  const [actionResolutions, setActionResolutions] = useState<Record<string, ActionResolution>>({});
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

  // Strips the ?prefill= param from the URL once it's been read into
  // `input` above, so a refresh doesn't re-seed it.
  useEffect(() => {
    if (searchParams.get("prefill")) router.replace("/chat");
  }, [searchParams, router]);

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
    // Only clear the visible input box when the message actually came from
    // it - the internal auto-opening summary (sent via messageOverride)
    // shouldn't wipe out a prefilled message (e.g. from the AI Summary tab)
    // that's waiting for the user to send.
    if (messageOverride === undefined) setInput("");
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

  function handleActionResolved(id: string, resolution: ActionResolution) {
    setActionResolutions((prev) => ({ ...prev, [id]: resolution }));
  }

  // While the latest assistant turn has a write action awaiting
  // confirmation, block further sending - the user can still read/scroll,
  // but must resolve it (Confirm or Cancel) in the card first.
  const lastTurn = history[history.length - 1];
  const lastConfirmActions =
    lastTurn?.role === "assistant" ? parseAssistantContent(lastTurn.content).confirmActions : undefined;
  const hasUnresolvedAction = (lastConfirmActions ?? []).some((a) => !actionResolutions[a.id]);
  const inputDisabled = sending || uploading || hasUnresolvedAction;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-[var(--db-gutter)] py-4"
        style={{ background: "var(--db-bg)", borderBottom: "var(--db-border-width) solid var(--db-border)" }}
      >
        <div>
          <h1 className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
            Recommendations
          </h1>
          {status?.connected && (
            <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
              {status.accountName ?? status.adAccountId}
              {status.currency ? ` · ${status.currency}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 rounded-[var(--db-radius-pill)] px-3 py-1.5 text-xs font-medium"
          style={{
            border: "var(--db-border-width) solid var(--db-border)",
            color: "var(--db-text-secondary)",
          }}
        >
          <LogOut size={14} strokeWidth={dashboardIconStrokeWidth} />
          Disconnect
        </button>
      </header>

      <div className="flex-1 space-y-4 px-[var(--db-gutter)] py-4">
        {history.length === 0 && (
          <div
            className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-sm"
            style={{
              border: "var(--db-border-width) dashed var(--db-border)",
              color: "var(--db-text-secondary)",
            }}
          >
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
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm text-white"
                  style={{ background: "var(--db-accent)" }}
                >
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
                <div
                  className="rounded-2xl px-4 py-2"
                  style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
                >
                  <AssistantMarkdown content={parsed.text} />
                </div>
                {parsed.steps && <StepsWidget spec={parsed.steps} />}
                {parsed.confirmActions?.map((action) => (
                  <ConfirmActionCard
                    key={action.id}
                    action={action}
                    resolution={actionResolutions[action.id]}
                    onResolve={handleActionResolved}
                  />
                ))}
                {isLastTurn &&
                  !sending &&
                  !hasUnresolvedAction &&
                  parsed.suggestions &&
                  parsed.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {parsed.suggestions.map((suggestion, j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => sendMessage(suggestion)}
                          className="rounded-[var(--db-radius-pill)] px-3 py-1 text-xs"
                          style={{
                            border: "var(--db-border-width) solid var(--db-border)",
                            color: "var(--db-text-primary)",
                          }}
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
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2 text-sm text-white"
              style={{ background: "var(--db-accent-strong)" }}
            >
              Uploading…
            </div>
          </div>
        )}
        {sending && (
          <div className="flex justify-start">
            <div
              className="max-w-[85%] rounded-2xl px-4 py-2 text-sm"
              style={{
                background: "var(--db-surface)",
                border: "var(--db-border-width) solid var(--db-border)",
                color: "var(--db-text-secondary)",
              }}
            >
              <LoadingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className="sticky bottom-0 z-10 px-[var(--db-gutter)] pt-3"
        style={{ background: "var(--db-bg)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {error && (
          <p className="mb-2 text-sm" style={{ color: "var(--db-danger-text)" }}>
            {error}
          </p>
        )}
        {hasUnresolvedAction && (
          <p className="mb-2 text-xs" style={{ color: "var(--db-warning-text)" }}>
            Confirm or cancel the pending action above to keep chatting.
          </p>
        )}

        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
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
            disabled={inputDisabled}
            title="Attach an image or video"
            className="flex shrink-0 items-center justify-center rounded-full p-2.5 disabled:opacity-50"
            style={{
              background: "var(--db-surface-2)",
              color: "var(--db-text-secondary)",
              border: "var(--db-border-width) solid var(--db-border)",
            }}
          >
            <Paperclip size={18} strokeWidth={dashboardIconStrokeWidth} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={inputDisabled}
            placeholder="Ask about campaigns, spend, CTR, ROAS..."
            className="flex-1 rounded-[var(--db-radius-pill)] px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50"
            style={{
              background: "var(--db-surface)",
              border: "var(--db-border-width) solid var(--db-border)",
              color: "var(--db-text-primary)",
            }}
          />
          <button
            type="submit"
            disabled={inputDisabled || !input.trim()}
            aria-label="Send"
            className="flex shrink-0 items-center justify-center rounded-full p-2.5 text-white disabled:opacity-50"
            style={{ background: "var(--db-accent)" }}
          >
            <Send size={18} strokeWidth={dashboardIconStrokeWidth} />
          </button>
        </form>
      </div>
    </main>
  );
}
