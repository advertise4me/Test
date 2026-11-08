import DashboardShell from "@/components/dashboard/DashboardShell";

// Layout-level shell (tab bar + the AI Summary header) shared by all four
// tabs: /summary, /chat, /ideate, /settings. Keeping it a route group means
// the existing /chat URL doesn't change.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
