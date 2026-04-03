import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { ProcessQueuePanel } from "@/components/analytics/ProcessQueuePanel";

export default async function QueueAnalysisPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "ENCODER") redirect("/dashboard/encoder");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Activity className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-primary uppercase tracking-widest">Queue Center</p>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Queue Analysis</h1>
        </div>
      </div>
      <ProcessQueuePanel />
    </div>
  );
}
