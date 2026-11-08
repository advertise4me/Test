import { ChevronRight } from "lucide-react";
import { dashboardIconStrokeWidth } from "@/lib/theme/dashboard";

/** A single tappable "menu row" - used by Legal (non-functional placeholders) and Billing. */
export function SettingsRow({
  label,
  onClick,
  disabled,
  trailing,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  trailing?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-[var(--db-radius-pill)] px-3 py-3 text-left disabled:opacity-50"
      style={{ background: "var(--db-surface-2)" }}
    >
      <span className="text-[15px]" style={{ color: "var(--db-text-primary)" }}>
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        {trailing && (
          <span className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
            {trailing}
          </span>
        )}
        <ChevronRight size={16} strokeWidth={dashboardIconStrokeWidth} color="var(--db-text-secondary)" />
      </span>
    </button>
  );
}

/** A labeled row with a toggle switch on the right - used throughout Notifications / Spending controls. */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
  lockedNote,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  lockedNote?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-[var(--db-radius-pill)] px-3 py-3" style={{ background: "var(--db-surface-2)" }}>
      <div className="min-w-0">
        <p className="text-[15px]" style={{ color: "var(--db-text-primary)" }}>
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
            {description}
          </p>
        )}
        {lockedNote && (
          <p className="mt-0.5 text-[12px]" style={{ color: "var(--db-warning-text)" }}>
            {lockedNote}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className="relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60"
        style={{ background: checked ? "var(--db-accent)" : "var(--db-border)" }}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
        />
      </button>
    </div>
  );
}
