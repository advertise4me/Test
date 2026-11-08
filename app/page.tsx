"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TermsClickwrap from "@/components/legal/TermsClickwrap";
import BrandMark from "@/components/BrandMark";
import { Field, inputClassName, inputStyle } from "@/components/dashboard/settings/Field";

interface SessionStatus {
  loggedIn: boolean;
  connected: boolean;
  adAccountId?: string;
  accountName?: string;
  currency?: string;
  facebookPageId?: string | null;
  facebookPageName?: string | null;
}

interface PageChoice {
  id: string;
  name: string;
}

export default function ConnectPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [pageChoices, setPageChoices] = useState<PageChoice[] | null>(null);
  const [savingPage, setSavingPage] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);

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

    fetch("/api/legal/status")
      .then((res) => res.json())
      .then((data: { accepted: boolean }) => setTermsAccepted(data.accepted))
      .catch(() => setTermsAccepted(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!termsAccepted) {
      setError("Please agree to the Terms of Service and Ad Spend & Media Buying Disclaimer first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setPageChoices(null);
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
      if (Array.isArray(data.pageChoices) && data.pageChoices.length > 1) {
        // More than one linked Page - ask which one to post ads as before moving on.
        setPageChoices(data.pageChoices);
        setStatus((prev) => ({
          loggedIn: true,
          connected: true,
          accountName: data.accountName,
          currency: data.currency,
          ...prev,
        }));
        return;
      }
      router.push("/chat");
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChoosePage(page: PageChoice) {
    setSavingPage(true);
    try {
      await fetch("/api/connect/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: page.id, pageName: page.name }),
      });
      router.push("/chat");
    } finally {
      setSavingPage(false);
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
    <main className="dashboard-shell flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <BrandMark />
            <h1 className="mt-3 text-[22px] font-bold" style={{ color: "var(--db-text-primary)" }}>
              Ads Chat
            </h1>
            <p className="mt-1 text-[14px]" style={{ color: "var(--db-text-secondary)" }}>
              Connect a Meta ad account, then chat with Claude about its performance.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 rounded-[var(--db-radius-pill)] px-3 py-1.5 text-[12px] font-medium"
            style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-primary)" }}
          >
            Log out
          </button>
        </div>

        {pageChoices && (
          <div
            className="mb-6 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-[14px]"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
          >
            <p className="font-medium" style={{ color: "var(--db-text-primary)" }}>
              Which Facebook Page should ads be posted as?
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
              Your token manages more than one Page - pick the one tied to this ad account.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {pageChoices.map((page) => (
                <button
                  key={page.id}
                  onClick={() => handleChoosePage(page)}
                  disabled={savingPage}
                  className="rounded-[var(--db-radius-pill)] px-3 py-2 text-left text-[14px] disabled:opacity-50"
                  style={{ background: "var(--db-surface-2)", color: "var(--db-text-primary)" }}
                >
                  {page.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!pageChoices && status?.connected && (
          <div
            className="mb-6 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-[14px]"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-success-text)" }}
          >
            <p className="font-medium" style={{ color: "var(--db-text-primary)" }}>
              Connected to {status.accountName ?? status.adAccountId}
              {status.currency ? ` (${status.currency})` : ""}
            </p>
            {status.facebookPageName ? (
              <p className="mt-1 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
                Posting ads as Page: {status.facebookPageName}
              </p>
            ) : (
              <p className="mt-1 text-[12px]" style={{ color: "var(--db-warning-text)" }}>
                No Facebook Page linked yet - ad creatives can&apos;t be created until one is. Make
                sure your token has the <code>pages_show_list</code> permission and reconnect.
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => router.push("/chat")}
                className="rounded-[var(--db-radius-pill)] px-3 py-1.5 text-[12px] font-medium text-white"
                style={{ background: "var(--db-accent)" }}
              >
                Go to chat
              </button>
              <button
                onClick={handleDisconnect}
                className="rounded-[var(--db-radius-pill)] px-3 py-1.5 text-[12px] font-medium"
                style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-primary)" }}
              >
                Disconnect
              </button>
            </div>
          </div>
        )}

        {termsAccepted === null && (
          <div
            className="mb-6 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-[14px]"
            style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-secondary)" }}
          >
            Loading…
          </div>
        )}

        {termsAccepted === false && (
          <div className="mb-6">
            <TermsClickwrap onAccepted={() => setTermsAccepted(true)} />
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
          style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
        >
          <Field label="Meta access token">
            <input
              id="accessToken"
              type="password"
              required
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAG..."
              className={inputClassName}
              style={inputStyle}
            />
            <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--db-text-secondary)" }}>
              A user or system-user access token with <code>ads_read</code>,{" "}
              <code>ads_management</code> (to create or edit campaigns), and{" "}
              <code>pages_show_list</code> (to post ads as your Page) permissions on this
              account. A long-lived token is recommended so it doesn&apos;t expire mid-session.
            </p>
          </Field>

          <Field label="Ad account ID">
            <input
              id="adAccountId"
              type="text"
              required
              value={adAccountId}
              onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="act_1234567890 or 1234567890"
              className={inputClassName}
              style={inputStyle}
            />
          </Field>

          {error && (
            <p className="text-[13px]" style={{ color: "var(--db-danger-text)" }}>
              {error}
            </p>
          )}

          {!termsAccepted && (
            <p className="text-[12px]" style={{ color: "var(--db-warning-text)" }}>
              Agree to the Terms of Service and Ad Spend & Media Buying Disclaimer above before connecting.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !termsAccepted}
            className="w-full rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--db-accent)" }}
          >
            {submitting ? "Connecting..." : "Connect"}
          </button>
        </form>

        <div
          className="mt-6 rounded-[var(--db-radius-card)] p-[var(--db-card-padding)] text-[12px]"
          style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-secondary)" }}
        >
          <p className="font-medium" style={{ color: "var(--db-text-primary)" }}>
            How this works
          </p>
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
                style={{ color: "var(--db-accent)" }}
              >
                Graph API Explorer
              </a>{" "}
              or your app&apos;s System User settings.
            </li>
            <li>
              The Facebook Page used to post ads is detected automatically from your token - if it
              manages more than one, you&apos;ll be asked which to use.
            </li>
            <li>Disconnect removes the Meta connection; Log out ends your session.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
