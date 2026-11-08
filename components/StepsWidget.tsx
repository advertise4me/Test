import type { StepsSpec } from "@/lib/parseAssistantContent";

export default function StepsWidget({ spec }: { spec: StepsSpec }) {
  return (
    <div
      className="mt-2 rounded-[var(--db-radius-card)] p-4"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      {spec.title && (
        <p className="mb-3 text-sm font-semibold" style={{ color: "var(--db-text-primary)" }}>
          {spec.title}
        </p>
      )}
      <ol className="space-y-0">
        {spec.steps.map((step, i) => {
          const isLast = i === spec.steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-6 w-px"
                  style={{ height: "calc(100% - 1.5rem)", background: "var(--db-border)" }}
                />
              )}
              <span
                className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ background: "var(--db-accent)" }}
              >
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm" style={{ color: "var(--db-text-primary)" }}>
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
