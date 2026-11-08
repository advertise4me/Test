"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb, MessagesSquare, Settings, Sparkles } from "lucide-react";
import { dashboardIconStrokeWidth } from "@/lib/theme/dashboard";

const TABS = [
  { href: "/summary", label: "AI Summary", icon: Sparkles },
  { href: "/chat", label: "Recommendations", icon: MessagesSquare },
  { href: "/ideate", label: "Ideate", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex shrink-0 items-stretch justify-around border-t pb-[env(safe-area-inset-bottom)]"
      style={{
        borderColor: "var(--db-border)",
        background: "var(--db-surface)",
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-center"
            aria-current={active ? "page" : undefined}
          >
            <span
              className="flex items-center justify-center rounded-[var(--db-radius-pill)] px-4 py-1"
              style={{
                background: active ? "var(--db-accent-soft)" : "transparent",
              }}
            >
              <Icon
                size={22}
                strokeWidth={dashboardIconStrokeWidth}
                color={active ? "var(--db-accent)" : "var(--db-text-secondary)"}
              />
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: active ? "var(--db-accent)" : "var(--db-text-secondary)" }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
