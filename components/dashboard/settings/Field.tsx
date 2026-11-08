export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium" style={{ color: "var(--db-text-secondary)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  background: "var(--db-surface-2)",
  border: "var(--db-border-width) solid var(--db-border)",
  color: "var(--db-text-primary)",
};

export const inputClassName =
  "w-full rounded-[var(--db-radius-pill)] px-4 py-2.5 text-[15px] focus:outline-none";
