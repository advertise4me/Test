import type { StepsSpec } from "@/lib/parseAssistantContent";

export default function StepsWidget({ spec }: { spec: StepsSpec }) {
  return (
    <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-4">
      {spec.title && <p className="mb-3 text-sm font-semibold text-zinc-900">{spec.title}</p>}
      <ol className="space-y-0">
        {spec.steps.map((step, i) => {
          const isLast = i === spec.steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute left-[11px] top-6 w-px bg-zinc-200"
                  style={{ height: "calc(100% - 1.5rem)" }}
                />
              )}
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-medium text-white">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm text-zinc-800">{step}</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
