// Single source of truth for the mobile dashboard redesign's type scale.
// Pairs with the --db-* color/spacing tokens in app/globals.css - components
// should compose these instead of hardcoding font sizes/weights ad hoc.

export const dashboardType = {
  screenTitle: "text-[32px] font-bold leading-tight",
  cardTitle: "text-[19px] font-semibold leading-snug",
  kpiNumber: "text-[34px] font-bold leading-none tracking-tight",
  body: "text-[16px] font-normal leading-normal",
  label: "text-[14px] font-normal leading-normal",
} as const;

// Outlined, ~1.75px stroke icons throughout the redesign (lucide-react).
export const dashboardIconStrokeWidth = 1.75;

// Status pill colors, keyed by lib/kpiConfig.ts's StatusLevel. Pairs with
// the --db-success/warning/danger tokens in app/globals.css.
export const statusTokens = {
  on_track: { bg: "var(--db-success-bg)", text: "var(--db-success-text)" },
  watch: { bg: "var(--db-warning-bg)", text: "var(--db-warning-text)" },
  attention: { bg: "var(--db-danger-bg)", text: "var(--db-danger-text)" },
} as const;
