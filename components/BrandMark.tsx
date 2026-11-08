import { Sparkles } from "lucide-react";

// A4M logo + wordmark, matching components/dashboard/SummaryHeader.tsx's
// icon treatment. Used on pages outside the dashboard shell (auth, Meta
// connect) that want the same branding without the rest of the header.
export default function BrandMark({ align = "left" }: { align?: "left" | "center" }) {
  return (
    <div className={`flex items-center gap-3 ${align === "center" ? "flex-col" : ""}`}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "linear-gradient(135deg, var(--db-accent), var(--db-accent-strong))" }}
      >
        <Sparkles size={20} strokeWidth={1.75} color="#ffffff" />
      </div>
      <div className={align === "center" ? "text-center" : ""}>
        <p className="text-[15px] font-bold" style={{ color: "var(--db-text-primary)" }}>
          A4M
        </p>
        <p className="text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
          Advertise For Me
        </p>
      </div>
    </div>
  );
}
