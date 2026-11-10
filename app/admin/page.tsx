import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/session";
import AdminAssignmentsView from "@/components/admin/AdminAssignmentsView";

// Admin-only, reached as a direct URL (not one of the four bottom tabs) -
// see Settings' "Admin" row, which only renders a link here when the
// logged-in user's isAdmin flag is set. The gate below is the real check:
// it runs server-side on every request to this route, so visiting /admin
// directly without being an admin still gets redirected rather than ever
// rendering the page.
export default async function AdminPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  if (!user?.isAdmin) redirect("/summary");

  return <AdminAssignmentsView />;
}
