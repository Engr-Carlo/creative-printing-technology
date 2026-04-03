import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardAnalysis } from "@/app/actions/queue-analysis";
import { QueueConstraintDashboard } from "@/components/QueueConstraintDashboard";
import { BarChart2 } from "lucide-react";

export default async function ConstraintAnalysisPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const data = await getDashboardAnalysis(7);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Queue Center</p>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Constraint Analysis</h1>
        </div>
      </div>
      <QueueConstraintDashboard initialData={data} initialWindowDays={7} />
    </div>
  );
}
