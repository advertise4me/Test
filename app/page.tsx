"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SessionStatus {
  loggedIn: boolean;
  connected: boolean;
  adAccountId?: string;
  accountName?: string;
  currency?: string;
}

export default function ConnectPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: SessionStatus) => {
        if (!data.loggedIn) {
          router.replace("/login");
          return;
        }
        setStatus(data);
      })
      .catch(() => setStatus({ loggedIn: false, connected: false }))
      .finally(() => setCheckingStatus(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, adAccountId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not connect this ad account.");
        return;
      }
      router.push("/chat");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/disconnect", { method: "POST" });
    setStatus((prev) => (prev ? { ...prev, connected: false } : prev));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (checkingStatus) return null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ads Chat</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Connect a Meta ad account, then chat with Claude about its performance.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Log out
          </button>
        </div>

        {status?.connected && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-medium">
              Connected to {status.accountName ?? status.adAccountId}
              {status.currency ? ` (${status.currency})` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => router.push("/chat")}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Go to chat
              </button>
              <button
                onClick={handleDisconnect}
                className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium text-zinc-700">
              Meta access token
            </label>
            <input
              id="accessToken"
              type="password"
              required
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAG..."
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
            <p className="mt-1 text-xs text-zinc-500">
              A user or system-user access token with <code>ads_read</code> permission (add{" "}
              <code>ads_management</code> too if you want to create campaigns from the chat) on
              this account. A long-lived token is recommended so it doesn&apos;t expire
              mid-session.
            </p>
          </div>

          <div>
            <label htmlFor="adAccountId" className="block text-sm font-medium text-zinc-700">
              Ad account ID
            </label>
            <input
              id="adAccountId"
              type="text"
              required
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="act_1234567890 or 1234567890"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Connecting..." : "Connect"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-medium">How this works</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              Your account is stored in a database; your Meta access token is encrypted before
              it&apos;s saved and decrypted only when a request needs it.
            </li>
            <li>
              This MVP uses a manually pasted access token instead of a full Facebook Login/OAuth
              flow. Get one from{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Graph API Explorer
              </a>{" "}
              or your app&apos;s System User settings.
            </li>
            <li>Disconnect removes the Meta connection; Log out ends your session.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
