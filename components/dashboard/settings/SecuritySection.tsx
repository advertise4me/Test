"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsCard from "./SettingsCard";
import { Field, inputClassName, inputStyle } from "./Field";
import { PasswordStrengthBar } from "./PasswordStrength";

export default function SecuritySection({ email }: { email: string }) {
  const router = useRouter();

  // --- Change email ---
  const [newEmail, setNewEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function sendEmailVerification() {
    setEmailSending(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const res = await fetch("/api/settings/email/request-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Could not start the email change.");
        return;
      }
      setEmailMessage(`Verification link sent to ${newEmail}. Your email won't change until you click it.`);
      setNewEmail("");
    } catch {
      setEmailError("Network error - please try again.");
    } finally {
      setEmailSending(false);
    }
  }

  // --- Change password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function changePassword() {
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation don't match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "Could not change your password.");
        return;
      }
      setPasswordMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Network error - please try again.");
    } finally {
      setPasswordSaving(false);
    }
  }

  // --- Sign out ---
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  // --- Delete account (two-step: type DELETE, then press the button) ---
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteEnabled = deleteConfirmText.trim().toUpperCase() === "DELETE";

  async function deleteAccount() {
    if (!deleteEnabled || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/settings/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Could not delete your account.");
        return;
      }
      router.replace("/login");
    } catch {
      setDeleteError("Network error - please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsCard title="Login & security">
      <div>
        <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--db-text-primary)" }}>
          Change email
        </p>
        <Field label="New email address">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            type="email"
            className={inputClassName}
            style={inputStyle}
            placeholder="new@example.com"
          />
        </Field>
        <button
          type="button"
          onClick={sendEmailVerification}
          disabled={emailSending || !newEmail}
          className="mt-2 rounded-[var(--db-radius-pill)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
          style={{ background: "var(--db-accent)" }}
        >
          {emailSending ? "Sending…" : "Send verification"}
        </button>
        {emailMessage && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--db-success-text)" }}>
            {emailMessage}
          </p>
        )}
        {emailError && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--db-danger-text)" }}>
            {emailError}
          </p>
        )}
      </div>

      <div className="pt-2" style={{ borderTop: "var(--db-border-width) solid var(--db-border)" }}>
        <p className="mb-2 text-[13px] font-semibold" style={{ color: "var(--db-text-primary)" }}>
          Change password
        </p>
        <div className="space-y-3">
          <Field label="Current password">
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              className={inputClassName}
              style={inputStyle}
            />
          </Field>
          <Field label="New password">
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={inputClassName}
              style={inputStyle}
            />
            <PasswordStrengthBar password={newPassword} />
          </Field>
          <Field label="Confirm new password">
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={8}
              className={inputClassName}
              style={inputStyle}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={changePassword}
          disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
          className="mt-3 rounded-[var(--db-radius-pill)] px-4 py-2 text-[14px] font-medium text-white disabled:opacity-50"
          style={{ background: "var(--db-accent)" }}
        >
          {passwordSaving ? "Saving…" : "Change password"}
        </button>
        {passwordMessage && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--db-success-text)" }}>
            {passwordMessage}
          </p>
        )}
        {passwordError && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--db-danger-text)" }}>
            {passwordError}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2" style={{ borderTop: "var(--db-border-width) solid var(--db-border)" }}>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--db-text-primary)" }}>
            Sign-in method
          </p>
          <p className="text-[13px]" style={{ color: "var(--db-text-secondary)" }}>
            Email and password ({email})
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="w-full rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[14px] font-medium"
        style={{ border: "var(--db-border-width) solid var(--db-border)", color: "var(--db-text-primary)" }}
      >
        Sign out
      </button>

      <div className="rounded-[var(--db-radius-card)] p-4" style={{ border: "var(--db-border-width) solid var(--db-danger-text)" }}>
        <p className="text-[13px] font-semibold" style={{ color: "var(--db-danger-text)" }}>
          Delete account
        </p>
        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--db-text-secondary)" }}>
          This disconnects our access to your Meta ad account and deletes your Advertise4Me data. It does{" "}
          <strong>not</strong> stop or delete any campaigns already running in Meta - you must pause those
          yourself in Meta Ads Manager.
        </p>
        <Field label='Type "DELETE" to confirm'>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className={inputClassName}
            style={inputStyle}
            placeholder="DELETE"
          />
        </Field>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={!deleteEnabled || deleting}
          className="mt-2 w-full rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-50"
          style={{ background: "var(--db-danger-text)" }}
        >
          {deleting ? "Deleting…" : "Permanently delete my account"}
        </button>
        {deleteError && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--db-danger-text)" }}>
            {deleteError}
          </p>
        )}
      </div>
    </SettingsCard>
  );
}
