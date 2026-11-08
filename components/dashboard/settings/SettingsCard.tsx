import { dashboardType } from "@/lib/theme/dashboard";

export default function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[var(--db-radius-card)] p-[var(--db-card-padding)]"
      style={{ background: "var(--db-surface)", border: "var(--db-border-width) solid var(--db-border)" }}
    >
      <h2 className={dashboardType.cardTitle} style={{ color: "var(--db-text-primary)" }}>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
