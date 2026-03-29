import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ListOrdered } from "lucide-react";
import { JobQueueTable } from "@/components/analytics/JobQueueTable";

export const metadata = { title: "Job Queue" };

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = (session.user as any).role as string;
  if (role !== "ADMIN" && role !== "EMPLOYEE") redirect("/dashboard");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 flex items-center gap-3 shrink-0">
        <ListOrdered className="w-5 h-5" />
        <div>
          <h1 className="text-sm font-bold leading-tight">SJF Job Queue</h1>
          <p className="text-[10px] opacity-80">
            Shortest Job First with Aging — priority-ordered production schedule
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <JobQueueTable />
      </div>
    </div>
  );
}
