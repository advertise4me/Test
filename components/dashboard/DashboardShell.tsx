"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import SummaryHeader from "@/components/dashboard/SummaryHeader";
import TabBar from "@/components/dashboard/TabBar";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => res.json())
      .then((data: { email?: string }) => setEmail(data.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  const onSummaryTab = pathname === "/summary" || pathname.startsWith("/summary/");

  return (
    <div className="dashboard-shell flex min-h-dvh flex-col">
      {onSummaryTab && <SummaryHeader email={email} />}
      <div className="flex-1 overflow-y-auto">{children}</div>
      <TabBar />
    </div>
  );
}
