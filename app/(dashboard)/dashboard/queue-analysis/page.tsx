import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardAnalysis } from "@/app/actions/queue-analysis";
import { QueueConstraintDashboard } from "@/components/QueueConstraintDashboard";

export default async function QueueAnalysisPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "ENCODER") redirect("/dashboard/encoder");

  const data = await getDashboardAnalysis(7);

  return <QueueConstraintDashboard initialData={data} initialWindowDays={7} />;
}
