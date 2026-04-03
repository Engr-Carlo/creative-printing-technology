import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardAnalysis } from "@/app/actions/queue-analysis";
import { QueueConstraintDashboard } from "@/components/QueueConstraintDashboard";
import { ProcessQueuePanel } from "@/components/analytics/ProcessQueuePanel";
import { QueueCenterTabBar } from "@/components/QueueCenterTabBar";

export default async function QueueAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "ENCODER") redirect("/dashboard/encoder");

  const { tab } = await searchParams;
  const isAdmin = role === "ADMIN";

  // Non-admins are always redirected to constraints tab
  const activeTab = tab === "live" && isAdmin ? "live" : "constraints";

  const data = activeTab === "constraints" ? await getDashboardAnalysis(7) : null;

  return (
    <div className="min-h-full">
      <QueueCenterTabBar activeTab={activeTab} isAdmin={isAdmin} />

      {activeTab === "constraints" && data && (
        <QueueConstraintDashboard initialData={data} initialWindowDays={7} />
      )}

      {activeTab === "live" && (
        <ProcessQueuePanel />
      )}
    </div>
  );
}
