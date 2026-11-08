"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PERIOD_GROUPS, type PeriodKey } from "@/lib/period";
import { dashboardIconStrokeWidth } from "@/lib/theme/dashboard";

export default function PeriodSelector({ value, onChange }: { value: PeriodKey; onChange: (period: PeriodKey) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = PERIOD_GROUPS.flat().find((opt) => opt.key === value);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(key: PeriodKey) {
    onChange(key);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Time period"
        className="relative inline-flex items-center rounded-[var(--db-radius-pill)] py-2 pl-4 pr-9 text-[14px] font-medium"
        style={{ background: "var(--db-surface-2)", color: "var(--db-text-primary)", border: "var(--db-border-width) solid var(--db-border)" }}
      >
        {selected?.label ?? "Select period"}
        <ChevronDown
          size={16}
          strokeWidth={dashboardIconStrokeWidth}
          className="pointer-events-none absolute right-3"
          color="var(--db-text-secondary)"
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Time period"
          className="absolute left-0 top-[calc(100%+4px)] z-10 min-w-full overflow-hidden rounded-[var(--db-radius-card)]"
          style={{ background: "var(--db-surface-2)", border: "var(--db-border-width) solid var(--db-border)" }}
        >
          {PERIOD_GROUPS.map((group, i) => (
            <div key={i} style={i > 0 ? { borderTop: "var(--db-border-width) solid var(--db-border)" } : undefined}>
              {group.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  role="option"
                  aria-selected={opt.key === value}
                  onClick={() => handleSelect(opt.key)}
                  className="block w-full whitespace-nowrap px-4 py-2 text-left text-[14px] font-medium"
                  style={{ color: opt.key === value ? "var(--db-accent)" : "var(--db-text-primary)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
