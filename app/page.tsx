import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";

// "/" is no longer a connect screen (Phase C of the Business-Manager-
// system-user-token migration - see AGENTS.md). There is nothing left for a
// client to do here: which ad account they see is assigned by the admin
// (AdAccountAssignment, Phase A/B), not chosen by pasting a token. This
// route just sends a logged-in user on to the dashboard, which itself
// handles the terms-acceptance gate (app/(dashboard)/layout.tsx) and the
// "no ad account assigned yet" waiting state (app/(dashboard)/summary and
// chat pages).
export default async function RootPage() {
  const userId = await getCurrentUserId();
  redirect(userId ? "/summary" : "/login");
}
