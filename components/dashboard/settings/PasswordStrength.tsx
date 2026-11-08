/** Simple length/variety heuristic - no external library. 0-4 bars. */
export function passwordStrength(password: string): { score: number; label: string } {
  if (password.length === 0) return { score: 0, label: "" };

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  const clamped = Math.min(score, 4);
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
  return { score: clamped, label: labels[clamped] };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  if (password.length === 0) return null;

  const colors = ["var(--db-danger-text)", "var(--db-danger-text)", "var(--db-warning-text)", "var(--db-accent)", "var(--db-success-text)"];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: i < score ? colors[score] : "var(--db-border)" }}
          />
        ))}
      </div>
      <p className="mt-1 text-[12px]" style={{ color: "var(--db-text-secondary)" }}>
        {label}
      </p>
    </div>
  );
}
