import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProcessQueuePanel } from "@/components/analytics/ProcessQueuePanel";

export default async function ProcessQueuePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="bg-white border-b -mx-4 -mt-4 px-5 py-5 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live Monitoring</p>
        <h1 className="text-xl font-black mt-0.5 text-gray-900">Process Queue Monitor</h1>
        <p className="text-xs text-gray-500 mt-0.5">Real-time arrival & service rates per process step</p>
      </div>

      <ProcessQueuePanel />
    </div>
  );
}
